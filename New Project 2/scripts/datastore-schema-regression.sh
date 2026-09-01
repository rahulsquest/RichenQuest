#!/usr/bin/env bash
#
# Data Store schema + durability regression.
#
# Guards the two failure modes that would otherwise only appear in production,
# after the founder creates the tables, and would look like "it silently
# didn't persist" rather than like an error:
#
#   1. Non-scalar columns. Catalyst Data Store has no JSON column type, so an
#      object or array must be serialised before insertRow. If it is not, the
#      row is rejected and mirrorInsert logs a warning nobody reads.
#   2. Success reported before a durable write. A student must never be told
#      their inquiry reached the team when nothing durable holds it.
#
# Neither path executes locally (no Catalyst, no tables), so both are tested
# through the exported seams rather than assumed correct.

set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PASS=0; FAIL=0
ok()   { echo "PASS  $1"; PASS=$((PASS+1)); }
bad()  { echo "FAIL  $1"; FAIL=$((FAIL+1)); }

node - "$ROOT" <<'NODE'
const path = require('path');
const root = process.argv[2];
const DS = require(path.join(root, 'backend/functions/shared/dataStore.js'));

let pass = 0, fail = 0;
const ok  = m => { console.log('PASS  ' + m); pass++; };
const bad = m => { console.log('FAIL  ' + m); fail++; };

/* ---- 1. every non-scalar column is serialised ------------------------- */
const student = {
  studentId: 'STU_TEST', userId: 'USR_TEST',
  targetCountries: ['United Kingdom', 'Hungary'],
  targetUniversities: [],
  academicHistory: { cgpa: '3.9', englishProficiency: { test: 'IELTS', overallBand: '7.5' } },
  nextAction: { id: 'ACT_PROFILE_01', targetRoute: '/profile' },
  zohoCrmSyncStatus: { synced: false, crmContactId: null },
  ROWID: 'ROW_1', CREATEDTIME: 'x', MODIFIEDTIME: 'y'
};
const payload = DS._serializeForCatalyst('Students', student);

for (const col of ['targetCountries', 'targetUniversities', 'academicHistory', 'nextAction', 'zohoCrmSyncStatus']) {
  typeof payload[col] === 'string'
    ? ok(`Students.${col} serialised to a string`)
    : bad(`Students.${col} is ${typeof payload[col]} — Catalyst would reject the row`);
}

/* Catalyst-managed and internal fields must not be sent back */
['ROWID', 'CREATEDTIME', 'MODIFIEDTIME'].every(k => !(k in payload))
  ? ok('Catalyst-managed fields stripped from payload')
  : bad('Catalyst-managed fields leaked into payload');

/* ---- 2. round-trip preserves the exact value -------------------------- */
const back = DS._deserializeFromCatalyst('Students', payload);
JSON.stringify(back.academicHistory) === JSON.stringify(student.academicHistory)
  ? ok('nested academicHistory survives the round trip')
  : bad('academicHistory changed across the round trip');
Array.isArray(back.targetCountries) && back.targetCountries[1] === 'Hungary'
  ? ok('targetCountries returns as a real array')
  : bad('targetCountries did not deserialise to an array');

/* ---- 3. an undeclared object column fails loudly ---------------------- */
try {
  DS._serializeForCatalyst('Leads', { leadId: 'L1', somethingNew: { a: 1 } });
  bad('undeclared object column was accepted silently');
} catch (e) {
  /^\[dataStore\]/.test(e.message)
    ? ok('undeclared object column throws instead of silently failing')
    : bad('undeclared object threw an unexpected error: ' + e.message);
}

/* Scalars and null must still pass untouched */
try {
  const p = DS._serializeForCatalyst('Leads', { leadId: 'L1', country: null, status: 'NEW_LEAD' });
  p.country === null && p.status === 'NEW_LEAD'
    ? ok('scalars and null pass through unchanged')
    : bad('scalar passthrough altered a value');
} catch (e) {
  bad('scalar payload threw: ' + e.message);
}

/* ---- 4. insertDurable reports honestly with no Data Store ------------- */
(async () => {
  const t = DS.getTable('Leads');
  const { record, durable } = await t.insertDurable({ leadId: 'L_DUR', email: 'x@example.invalid' });
  durable === false
    ? ok('insertDurable reports durable:false when Data Store is unavailable')
    : bad('insertDurable claimed durability with no Data Store — the exact false claim being guarded');
  record && record.ROWID
    ? ok('insertDurable still returns the in-memory record for the response')
    : bad('insertDurable did not return a usable record');

  /* ---- 5. the 201 path, with durability stubbed present ---------------- */
  /*  The refusal path is covered by the readiness harness, which genuinely
   *  has no durable store. The accept path cannot be reached there, so it is
   *  proven here by making insertDurable report a durable write — otherwise
   *  a change that refused EVERY lead would pass every test we have. */
  const realGetTable = DS.getTable.bind(DS);
  DS.getTable = (name) => {
    const t = realGetTable(name);
    if (name !== 'Leads') return t;
    return { ...t, insertDurable: async (rec) => ({ record: t.insert(rec), durable: true }) };
  };

  const handleLeads = require(path.join(root, 'backend/functions/leads/index.js'));

  const runLead = (body) => new Promise(resolve => {
    const res = {
      statusCode: 200,
      status(c) { this.statusCode = c; return this; },
      json(payload) { resolve({ status: this.statusCode, body: payload }); return this; },
      setHeader() { return this; }
    };
    handleLeads({ method: 'POST', path: '', body }, res).catch(e => resolve({ error: e.message }));
  });

  const r = await runLead({ name: 'Durable Path', email: 'durable@example.invalid', phone: '9000000009' });

  r.status === 201 && r.body && r.body.success === true
    ? ok('durable write returns 201 success')
    : bad(`durable write did not return 201 success (got ${r.status} ${JSON.stringify(r.body && r.body.error)})`);

  /*  CRM is unconfigured in this harness, so even with a durable local row the
   *  student must NOT be told a counsellor has their file — only that it was
   *  received. This is the exact sentence the audit was about. */
  const msg = (r.body && r.body.message) || '';
  !/counselor will review/i.test(msg) && /received/i.test(msg)
    ? ok('durable-but-unsynced does not promise a counsellor')
    : bad(`wrong message for durable-but-unsynced: "${msg}"`);

  DS.getTable = realGetTable;

  console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
NODE
