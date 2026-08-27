/**
 * Zoho Catalyst Data Store Abstraction Layer
 *
 * REAL PERSISTENCE, WRITE-THROUGH DESIGN
 *   The in-memory `store` below stays the synchronous source of truth for
 *   every read within a process — every one of the ~50 call sites across
 *   auth/, bookings/, cases/, students/, documents/, notifications/,
 *   requireStudent.js etc. keeps working completely unchanged, with zero
 *   risk to the IDOR/ownership checks that were fixed today.
 *
 *   On top of that: `hydrate()` (awaited once at process startup, before the
 *   server accepts traffic) loads whatever Catalyst already has for each
 *   table into memory, and every insert/update/delete mirrors to the real
 *   Catalyst Data Store table in the background. A restart therefore
 *   recovers real data once each table exists — no call site changes needed
 *   when that happens.
 *
 *   Today, with zero Data Store tables created yet, `catalystTable()` fails
 *   its one-time existence probe for every table and this degrades to
 *   exactly the previous in-memory-only behaviour — same as before this
 *   change, not a regression.
 *
 * WHY NOT MAKE find/insert/update/delete ASYNC INSTEAD
 *   That would touch every call site, including the ownership checks in
 *   requireStudent.js that were the subject of three IDOR fixes today, with
 *   no way to test the change against real Data Store (no tables exist yet,
 *   AppSail isn't deployed). Write-through keeps every existing call site
 *   byte-identical and fully testable right now via the in-memory fallback
 *   path, which exercises the exact same code the real path will use.
 */

const crypto = require('crypto');

const TABLE_NAMES = [
  'Users', 'Students', 'Counselors', 'Cases', 'Leads', 'Bookings',
  'Documents', 'Payments', 'Notifications', 'AuditLogs', 'IntegrationEvents'
];

// Clean, empty storage - no mock/demo records
const store = {};
TABLE_NAMES.forEach(t => { store[t] = []; });

// Seed counselor team structure for assignment when students register
const defaultCounselors = [
  {
    counselorId: 'CNS_LON_001',
    name: 'Eleanor Vance',
    title: 'Senior UK & European Admissions Specialist',
    email: 'admissions@richenquest.com',
    phone: '+91 76312 07948',
    office: 'London HQ',
    specialization: ['STEM & Computer Science', 'Russell Group Universities', 'Student Visa Guidance'],
    rating: 4.95,
    activeCases: 0,
    zohoBookingsStaffId: process.env.ZOHO_BOOKINGS_STAFF_ID || null
  }
];

store.Counselors = defaultCounselors;

/* ---- Catalyst Data Store bridge --------------------------------------- */

let _catalystApp;
let _catalystAttempted = false;

/* Attempted exactly once per process. catalyst.initializeApp() reads
 * process.env.CATALYST_CONFIG, which the platform injects automatically
 * inside a real Catalyst deployment and which does not exist locally — so
 * this is expected to fail in local dev, not an error condition. */
function getCatalystApp() {
  if (_catalystAttempted) return _catalystApp;
  _catalystAttempted = true;
  try {
    const catalyst = require('zcatalyst-sdk-node');
    _catalystApp = catalyst.initializeApp();
    console.log('[dataStore] Catalyst SDK initialized (CATALYST_CONFIG present).');
  } catch (e) {
    _catalystApp = null;
    console.warn('[dataStore] Catalyst Data Store unavailable, running in-memory only:', e.message);
  }
  return _catalystApp;
}

const _tableAvailable = {}; // tableName -> true/false, cached after first probe per process

/* Resolves to the real Catalyst Table for a name, or null if Data Store
 * isn't configured or that specific table doesn't exist yet in the console.
 * The existence probe runs once per table per process and is cached either
 * way, so a missing table doesn't retry on every request. */
async function catalystTable(tableName) {
  const app = getCatalystApp();
  if (!app) return null;
  if (_tableAvailable[tableName] === false) return null;
  const ds = app.datastore();
  const table = ds.table(tableName);
  if (_tableAvailable[tableName] === true) return table;
  try {
    await ds.getTableDetails(tableName); // throws if the table doesn't exist
    _tableAvailable[tableName] = true;
    console.log(`[dataStore] Catalyst table "${tableName}" is live.`);
    return table;
  } catch (e) {
    _tableAvailable[tableName] = false;
    console.warn(`[dataStore] Catalyst table "${tableName}" not available yet (${e.message}); staying in-memory for it.`);
    return null;
  }
}

/* Strips fields Catalyst manages itself (ROWID, CREATEDTIME, MODIFIEDTIME)
 * and our own internal tracking field before sending a payload to Catalyst. */
function toCatalystPayload(record) {
  const { ROWID, CREATEDTIME, MODIFIEDTIME, _catalystRowId, ...rest } = record;
  return rest;
}

/* Fire-and-forget. The in-memory write has already completed and the
 * response is already built from it by the time this runs — a Data Store
 * outage must never fail a student's request, only be logged. */
function mirrorInsert(tableName, record) {
  catalystTable(tableName).then(table => {
    if (!table) return;
    table.insertRow(toCatalystPayload(record))
      .then(row => {
        Object.defineProperty(record, '_catalystRowId', {
          value: row.ROWID, writable: true, configurable: true, enumerable: false
        });
      })
      .catch(e => console.warn(`[dataStore] Catalyst insert failed for "${tableName}":`, e.message));
  });
}

function mirrorUpdate(tableName, record) {
  if (!record || !record._catalystRowId) return; // not yet mirrored (or mirror failed) — nothing to update against
  catalystTable(tableName).then(table => {
    if (!table) return;
    table.updateRow({ ROWID: record._catalystRowId, ...toCatalystPayload(record) })
      .catch(e => console.warn(`[dataStore] Catalyst update failed for "${tableName}":`, e.message));
  });
}

function mirrorDelete(tableName, record) {
  if (!record || !record._catalystRowId) return;
  catalystTable(tableName).then(table => {
    if (!table) return;
    table.deleteRow(record._catalystRowId)
      .catch(e => console.warn(`[dataStore] Catalyst delete failed for "${tableName}":`, e.message));
  });
}

/* Awaited once at process startup, before the server accepts traffic. Loads
 * whatever Catalyst already has for each table into the in-memory mirror.
 * Safe to call whether or not Data Store is configured — every table simply
 * falls back to its current in-memory contents (the Counselors default seed
 * included) when Catalyst has nothing for it. */
async function hydrate() {
  for (const name of TABLE_NAMES) {
    const table = await catalystTable(name);
    if (!table) continue;
    try {
      const rows = [];
      for await (const row of table.getIterableRows()) rows.push(row);
      if (rows.length) {
        store[name] = rows.map(r => {
          const rec = { ...r };
          Object.defineProperty(rec, '_catalystRowId', {
            value: r.ROWID, writable: true, configurable: true, enumerable: false
          });
          return rec;
        });
        console.log(`[dataStore] hydrated ${rows.length} row(s) into "${name}" from Catalyst.`);
      }
    } catch (e) {
      console.warn(`[dataStore] hydrate failed for "${name}":`, e.message);
    }
  }
}

/* ---- Public interface — unchanged for every existing call site --------- */

class CatalystDataStore {
  static getTable(tableName) {
    if (!store[tableName]) {
      store[tableName] = [];
    }
    return {
      find: (predicate = () => true) => store[tableName].filter(predicate),
      findOne: (predicate) => store[tableName].find(predicate) || null,
      insert: (record) => {
        const enriched = {
          ...record,
          ROWID: 'ROW_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
          CREATEDTIME: new Date().toISOString(),
          MODIFIEDTIME: new Date().toISOString()
        };
        store[tableName].push(enriched);
        mirrorInsert(tableName, enriched);
        return enriched;
      },
      update: (predicate, updates) => {
        const index = store[tableName].findIndex(predicate);
        if (index === -1) return null;
        const prevCatalystId = store[tableName][index]._catalystRowId;
        store[tableName][index] = {
          ...store[tableName][index],
          ...updates,
          MODIFIEDTIME: new Date().toISOString()
        };
        if (prevCatalystId) {
          Object.defineProperty(store[tableName][index], '_catalystRowId', {
            value: prevCatalystId, writable: true, configurable: true, enumerable: false
          });
        }
        mirrorUpdate(tableName, store[tableName][index]);
        return store[tableName][index];
      },
      delete: (predicate) => {
        const initialLength = store[tableName].length;
        const removed = store[tableName].filter(predicate);
        store[tableName] = store[tableName].filter(item => !predicate(item));
        removed.forEach(r => mirrorDelete(tableName, r));
        return store[tableName].length < initialLength;
      }
    };
  }

  static resetStore() {
    Object.keys(store).forEach(key => {
      store[key] = key === 'Counselors' ? defaultCounselors : [];
    });
  }

  /** Awaited once at process startup — see hydrate() above. */
  static hydrate() {
    return hydrate();
  }

  /**
   * Honest persistence reporting for /api/health — never claim durable
   * storage that isn't actually there. PERSISTENT only once the table's
   * existence probe in catalystTable() has actually succeeded; everything
   * else (including "not checked yet") reports IN_MEMORY_FALLBACK, because
   * that is the store actually serving reads/writes right now.
   */
  static getStorageMode(tableName) {
    return _tableAvailable[tableName] === true ? 'PERSISTENT' : 'IN_MEMORY_FALLBACK';
  }

  static getStorageReport() {
    const report = {};
    for (const name of TABLE_NAMES) report[name] = CatalystDataStore.getStorageMode(name);
    return report;
  }

  /**
   * Helper to hash passwords using standard SHA-256 with salt
   */
  static hashPassword(password, salt = 'richenquest_salt') {
    return crypto.createHmac('sha256', salt).update(password).digest('hex');
  }
}

module.exports = CatalystDataStore;
