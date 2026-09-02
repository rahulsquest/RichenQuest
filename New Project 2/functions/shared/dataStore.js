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

/*  No counsellor is seeded, deliberately.
 *
 *  This previously held one fabricated person — "Eleanor Vance", title
 *  "Senior UK & European Admissions Specialist", office "London HQ",
 *  rating 4.95 — and auth/index.js assigns Counselors[0] to every student
 *  at signup and returns it in the login/signup response. Confirmed live:
 *  a new account was told, by name, that this person was their assigned
 *  counsellor. Support.jsx and Consultation.jsx render that name, email
 *  and phone to the student.
 *
 *  So it was a fabricated human being, an invented 4.95 rating, and the
 *  same "London HQ" office that was removed from the public website for
 *  being untrue — all presented to a real family as fact. Prior claim
 *  sweeps missed it because they only ever scanned client/src; this is
 *  server-side seed data.
 *
 *  Every consumer already degrades honestly: counselor?.name falls back to
 *  "Admissions Counselor", and email/phone fall back to the real support
 *  address and number in config/environment.js. A generic desk label that
 *  is true beats a named specialist who does not exist.
 *
 *  Add real counsellors here only when real people hold the role — same
 *  standard the Vendors/mentor module is held to. */
const defaultCounselors = [];

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

/*  Columns whose value is an object or an array in application code.
 *
 *  Catalyst Data Store is relational: a column holds a scalar (Text, Int,
 *  BigInt, Double, Boolean, DateTime). There is no JSON column type. Passing
 *  an object or array to insertRow is rejected by the API, and mirrorInsert
 *  logs that at warn level and moves on — so with the tables created but this
 *  unhandled, Students and Cases rows would still never persist, silently,
 *  and the failure would look exactly like the in-memory fallback it was
 *  supposed to replace.
 *
 *  These are therefore stored as JSON in Text columns and parsed back on
 *  hydrate. Listed explicitly rather than sniffed, so the schema the founder
 *  creates and the code stay provably in step — see DATASTORE-SCHEMA.md. */
/*  The hard ceiling on any Catalyst `text` column.
 *
 *  PROVEN, not assumed. Values of 9,000 / 10,000 / 12,000 / 16,000 / 32,000
 *  characters were written to a Development table and read back through the
 *  Catalyst REST API. 9,000 and 10,000 returned byte-identical (SHA-256
 *  match). 12,000, 16,000 and 32,000 all came back at exactly 10,000
 *  characters, and each one's hash matched the hash of its own first 10,000
 *  characters — clean prefix truncation. Two independent read paths agreed,
 *  and a single flipped character was correctly detected by the comparison,
 *  so the test could tell a real difference from a false match.
 *
 *  The write reports SUCCESS. Nothing errors. That is what makes it dangerous:
 *  without this limit a student's enquiry is cut in half and everyone —
 *  student, counsellor, logs — is told it worked.
 *
 *  9,000 rather than 10,000 leaves margin, because the boundary was measured
 *  in characters and a multi-byte character may well be counted in bytes by
 *  the platform. Anything at or below this is verified safe. */
const CATALYST_TEXT_SAFE_MAX = 9000;

const JSON_COLUMNS = {
  Students: ['targetCountries', 'targetUniversities', 'academicHistory', 'nextAction', 'zohoCrmSyncStatus'],
  Cases: ['milestones'],
  Users: ['invoices'],
  IntegrationEvents: ['payload', 'data']
};

/* Strips fields Catalyst manages itself (ROWID, CREATEDTIME, MODIFIEDTIME)
 * and our own internal tracking field before sending a payload to Catalyst,
 * then serialises the non-scalar columns for that table. */
function toCatalystPayload(tableName, record) {
  const { ROWID, CREATEDTIME, MODIFIEDTIME, _catalystRowId, ...rest } = record;
  for (const col of JSON_COLUMNS[tableName] || []) {
    if (rest[col] !== undefined && rest[col] !== null && typeof rest[col] === 'object') {
      rest[col] = JSON.stringify(rest[col]);
    }
  }
  /*  A value that is still an object here means a column was added in code
   *  without being declared above. Fail loudly rather than let Catalyst
   *  reject the row into a warn log that nobody reads. */
  for (const [k, v] of Object.entries(rest)) {
    if (v !== null && typeof v === 'object') {
      throw new Error(
        `[dataStore] "${tableName}.${k}" is a ${Array.isArray(v) ? 'array' : 'object'} but is not ` +
        'declared in JSON_COLUMNS. Declare it and add a Text column, or store a scalar.');
    }
  }
  return rest;
}

/* Inverse of the above, applied to rows read back from Catalyst. */
function fromCatalystRow(tableName, row) {
  const rec = { ...row };
  for (const col of JSON_COLUMNS[tableName] || []) {
    if (typeof rec[col] === 'string' && rec[col] !== '') {
      try {
        rec[col] = JSON.parse(rec[col]);
      } catch {
        /*  Leave the raw string. A column that cannot be parsed is a data
         *  problem worth seeing, not worth crashing startup over. */
        console.warn(`[dataStore] could not parse JSON column "${tableName}.${col}"`);
      }
    }
  }
  return rec;
}

/* Fire-and-forget. The in-memory write has already completed and the
 * response is already built from it by the time this runs — a Data Store
 * outage must never fail a student's request, only be logged. */
function mirrorInsert(tableName, record) {
  /*  Returns a promise resolving to whether the row is now durably stored in
   *  Catalyst. Callers that must not report success before a durable write —
   *  lead submission — await it via insertDurable below. Every existing call
   *  site ignores it and keeps the original fire-and-forget behaviour. */
  return catalystTable(tableName).then(table => {
    if (!table) return false;
    return table.insertRow(toCatalystPayload(tableName, record))
      .then(row => {
        Object.defineProperty(record, '_catalystRowId', {
          value: row.ROWID, writable: true, configurable: true, enumerable: false
        });
        return true;
      })
      .catch(e => {
        console.warn(`[dataStore] Catalyst insert failed for "${tableName}":`, e.message);
        return false;
      });
  }).catch(e => {
    console.warn(`[dataStore] Catalyst insert error for "${tableName}":`, e.message);
    return false;
  });
}

function mirrorUpdate(tableName, record) {
  if (!record || !record._catalystRowId) return; // not yet mirrored (or mirror failed) — nothing to update against
  catalystTable(tableName).then(table => {
    if (!table) return;
    table.updateRow({ ROWID: record._catalystRowId, ...toCatalystPayload(tableName, record) })
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
          const rec = fromCatalystRow(name, r);
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
      /*  Same write, but awaits the Catalyst round-trip and reports whether
       *  the row is actually durable.
       *
       *  For a flow that tells a student their request was received, "we put
       *  it in memory" is not a durable write — the process restarts on every
       *  deploy and on scale-down, and the record is gone. A caller that makes
       *  a promise to a student uses this and decides honestly from the
       *  result; everything else keeps using insert() unchanged, so no
       *  existing call site — including the ownership checks — is touched.
       *
       *  { record, durable } — durable is false when Data Store is
       *  unconfigured, the table does not exist, or the write was rejected. */
      insertDurable: async (record) => {
        const enriched = {
          ...record,
          ROWID: 'ROW_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
          CREATEDTIME: new Date().toISOString(),
          MODIFIEDTIME: new Date().toISOString()
        };
        store[tableName].push(enriched);
        let durable = false;
        try {
          durable = await mirrorInsert(tableName, enriched);
        } catch (e) {
          console.warn(`[dataStore] durable insert failed for "${tableName}":`, e.message);
        }
        return { record: enriched, durable: Boolean(durable) };
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

  /*  Exposed for scripts/datastore-schema-regression.sh.
   *
   *  The serialisation these wrap only executes when Catalyst is actually
   *  reachable, which it is not locally and not while AppSail is down — so
   *  without a seam it would ship to production never having run once. That
   *  is precisely the code that must not be taken on trust: if it is wrong,
   *  every Students and Cases row fails to persist and the symptom is an
   *  in-memory fallback that looks normal. */
  static _serializeForCatalyst(tableName, record) {
    return toCatalystPayload(tableName, record);
  }

  static _deserializeFromCatalyst(tableName, row) {
    return fromCatalystRow(tableName, row);
  }

  /** The proven-safe ceiling for any Catalyst text column. */
  static get TEXT_SAFE_MAX() {
    return CATALYST_TEXT_SAFE_MAX;
  }

  /*  Bound a value destined for an AUDIT column so Catalyst can never
   *  silently cut it.
   *
   *  Only for IntegrationEvents.payload / .data, which are a debug log: the
   *  code reads them as "the last 10 events" and never reconstructs anything
   *  from them, so the full body is not required for the app to work. That is
   *  what makes replacing an oversized body acceptable here — and is exactly
   *  why the same treatment is NOT applied to a student's enquiry, which is
   *  the record itself and is rejected at the door instead.
   *
   *  An oversized value is replaced by a marker that is itself valid JSON,
   *  fits the limit, and says plainly what happened and how big the original
   *  was. Silent truncation becomes a visible, queryable fact. No extra
   *  Catalyst columns are needed to record it. */
  static boundAuditValue(value, label) {
    if (value === null || value === undefined) return value;
    const serialised = typeof value === 'string' ? value : JSON.stringify(value);
    if (serialised === undefined) return null;
    if (serialised.length <= CATALYST_TEXT_SAFE_MAX) return value;

    console.warn(
      `[dataStore] ${label} is ${serialised.length} chars, above the ${CATALYST_TEXT_SAFE_MAX} ` +
      'safe limit for a Catalyst text column; storing a truncation marker instead of the body.');

    return {
      _truncated: true,
      _reason: 'exceeded CATALYST_TEXT_SAFE_MAX for a Catalyst text column',
      _originalLength: serialised.length,
      _limit: CATALYST_TEXT_SAFE_MAX,
      /*  A prefix small enough that the marker as a whole stays well inside
       *  the limit, so the marker itself can never be the thing truncated. */
      _preview: serialised.slice(0, 2000)
    };
  }

  static getStorageReport() {
    const report = {};
    for (const name of TABLE_NAMES) report[name] = CatalystDataStore.getStorageMode(name);
    return report;
  }

  /*  Password hashing.
   *
   *  WHAT WAS WRONG
   *    This was HMAC-SHA256 with a single hardcoded salt — 'richenquest_salt'
   *    — shared by every user. Three separate problems:
   *      1. One static salt means identical passwords produce identical
   *         hashes, so a stolen table shows at a glance which accounts share
   *         a password, and one rainbow table covers every user at once.
   *      2. SHA-256 is a FAST hash. It is built to be fast. Commodity
   *         hardware tries it billions of times per second, so a leaked
   *         table is effectively plaintext for any common password.
   *      3. No work factor, so it could not be tuned as hardware improved.
   *
   *  WHAT IT IS NOW
   *    scrypt — a memory-hard KDF from Node's own crypto module, so no new
   *    dependency — with 16 random bytes of salt per user. Stored as
   *    "scrypt$<salt-hex>$<hash-hex>" so the salt travels with the hash and
   *    the format is self-describing for any future migration.
   *
   *  LEGACY VERIFICATION
   *    verifyPassword still accepts an old bare-hex hash so no existing
   *    account is locked out, and reports needsRehash so the caller can
   *    silently upgrade the stored hash on next successful login. */
  static hashPassword(password) {
    const salt = crypto.randomBytes(16);
    const hash = crypto.scryptSync(String(password), salt, 64);
    return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
  }

  /** Legacy format only — kept so old hashes can still be verified. */
  static legacyHashPassword(password, salt = 'richenquest_salt') {
    return crypto.createHmac('sha256', salt).update(String(password)).digest('hex');
  }

  /**
   * Verify a password against either format.
   * @returns {{ok: boolean, needsRehash: boolean}}
   */
  static verifyPassword(password, stored) {
    if (!stored) return { ok: false, needsRehash: false };

    if (String(stored).startsWith('scrypt$')) {
      const [, saltHex, hashHex] = String(stored).split('$');
      if (!saltHex || !hashHex) return { ok: false, needsRehash: false };
      const expected = Buffer.from(hashHex, 'hex');
      const actual = crypto.scryptSync(String(password), Buffer.from(saltHex, 'hex'), expected.length);
      /* Constant-time: a byte-by-byte early exit leaks how much of the hash
       * matched, which is exactly what an attacker wants to iterate on. */
      const ok = expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
      return { ok, needsRehash: false };
    }

    const legacy = Buffer.from(CatalystDataStore.legacyHashPassword(password), 'utf8');
    const storedBuf = Buffer.from(String(stored), 'utf8');
    const ok = legacy.length === storedBuf.length && crypto.timingSafeEqual(legacy, storedBuf);
    // A correct password against a legacy hash is the moment to upgrade it.
    return { ok, needsRehash: ok };
  }
}

module.exports = CatalystDataStore;
