#!/bin/bash
#  Production readiness harness for the public lead flow.
#
#  Repeatable, deterministic, no credentials required. Run it before and after
#  any change to the inquiry path, and again the moment CRM credentials exist.
#
#    bash scripts/production-readiness.sh [base_url]
#
#  Default base is a local backend this script starts and stops itself.
#  Pass a URL to run against a deployed backend instead.
#
#  Consent tests run against a temporary copy with the gate activated, so they
#  work while the real gate is still off awaiting legal wording. That copy is
#  created outside git and deleted at the end — nothing it contains is ever
#  committed or deployed.
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PASS=0; FAIL=0; TMP=""; OWN_SERVER=""

ok(){ printf '  PASS  %s\n' "$1"; PASS=$((PASS+1)); }
no(){ printf '  FAIL  %s\n        expected: %s\n        actual:   %s\n' "$1" "$2" "$3"; FAIL=$((FAIL+1)); }
chk(){ [ "$2" = "$3" ] && ok "$1" || no "$1" "$2" "$3"; }

cleanup(){
  [ -n "$OWN_SERVER" ] && kill "$OWN_SERVER" 2>/dev/null
  [ -n "$TMP" ] && rm -rf "$TMP"
}
trap cleanup EXIT

BASE="${1:-}"
if [ -z "$BASE" ]; then
  BASE="http://localhost:5077"
  ( cd "$ROOT/backend" && PORT=5077 SESSION_SECRET="$(openssl rand -hex 32)" node server.js >/tmp/rq-readiness.log 2>&1 ) &
  OWN_SERVER=$!
  sleep 2
fi
echo "base: $BASE"
echo

json(){ node -pe "try{JSON.parse(require('fs').readFileSync(0,'utf8'))$1}catch(e){'PARSE_ERROR'}"; }
uniq_email(){ echo "rq-readiness-$(date +%s)-$RANDOM@example.invalid"; }

# ── 1. Lead durability gate ──────────────────────────────────────────────────
#  This harness runs with no Catalyst Data Store and no CRM credentials, so
#  nothing durable can hold a lead. The endpoint must therefore REFUSE rather
#  than return the 201 it used to — a success there meant the student was told
#  their inquiry reached the team while the only copy lived in process memory
#  and died on the next restart.
#
#  The 201 path is exercised where it can actually be proven: the durability
#  unit tests in scripts/datastore-schema-regression.sh.
echo "1. Lead durability gate (no Data Store, no CRM)"
E=$(uniq_email)
CODE=$(curl -s -o /tmp/rq-lead1.json -w '%{http_code}' -X POST "$BASE/api/leads" -H "Content-Type: application/json" \
  -d "{\"name\":\"RQ Readiness\",\"email\":\"$E\",\"phone\":\"9000000000\",\"country\":\"Germany\",\"program\":\"Postgraduate\"}")
R=$(cat /tmp/rq-lead1.json)
chk "no success without a durable write" "false" "$(echo "$R" | json '.success')"
chk "refused with 503"                   "503"   "$CODE"
chk "SUBMISSION_NOT_STORED"  "SUBMISSION_NOT_STORED" "$(echo "$R" | json '.error.code')"
#  The student must be given a route that actually works, not a dead end.
case "$(echo "$R" | json '.error.message')" in
  *support@richenquest.com*) ok "failure names a working contact route";;
  *) no "failure names a working contact route" "an email fallback" "absent";;
esac

# ── 2. Invalid lead ──────────────────────────────────────────────────────────
echo "2. Invalid lead"
R=$(curl -s -X POST "$BASE/api/leads" -H "Content-Type: application/json" -d '{"phone":"123"}')
chk "rejected" "false" "$(echo "$R" | json '.success')"
chk "VALIDATION_ERROR" "VALIDATION_ERROR" "$(echo "$R" | json '.error.code')"

# ── 3. Consent enforcement (gate temporarily activated in a throwaway copy) ──
echo "3. Consent enforcement (gate ON, disposable copy)"
TMP=$(mktemp -d); cp -R "$ROOT/backend" "$TMP/backend"
sed -i '' \
  -e "s/const READY = false;/const READY = true;/" \
  -e "s/const VERSION = null;/const VERSION = 'harness-test';/" \
  -e "s/const TEXT = null;/const TEXT = 'HARNESS TEST WORDING';/" \
  "$TMP/backend/functions/shared/consent.js" 2>/dev/null
( cd "$TMP/backend" && PORT=5078 SESSION_SECRET="$(openssl rand -hex 32)" node server.js >/tmp/rq-readiness-consent.log 2>&1 ) &
CPID=$!; sleep 2; CB="http://localhost:5078"
#  Payloads are built into variables first. Inlining them inside the command
#  substitution below eats the backslash escapes and posts malformed JSON,
#  which the server then rejects for the wrong reason and the test reads as a
#  pass-shaped failure.
P_MISSING="{\"name\":\"A\",\"email\":\"$(uniq_email)\"}"
P_FALSE="{\"name\":\"B\",\"email\":\"$(uniq_email)\",\"consentGiven\":false}"
P_TRUE="{\"name\":\"C\",\"email\":\"$(uniq_email)\",\"consentGiven\":true}"
R_MISSING=$(curl -s -X POST "$CB/api/leads" -H 'Content-Type: application/json' -d "$P_MISSING")
R_FALSE=$(curl -s -X POST "$CB/api/leads" -H 'Content-Type: application/json' -d "$P_FALSE")
R_TRUE=$(curl -s -X POST "$CB/api/leads" -H 'Content-Type: application/json' -d "$P_TRUE")
chk "missing consent rejected"   "CONSENT_REQUIRED" "$(echo "$R_MISSING" | json '.error.code')"
chk "consentGiven:false rejected" "CONSENT_REQUIRED" "$(echo "$R_FALSE" | json '.error.code')"
#  With consent given, the request must clear the CONSENT gate. It then still
#  meets the durability gate in this harness (no Data Store, no CRM), so the
#  correct assertion is that it is no longer rejected FOR CONSENT — asserting
#  success here would be asserting the false 201 this release removed.
case "$(echo "$R_TRUE" | json '.error.code')" in
  CONSENT_REQUIRED) no "consentGiven:true clears the consent gate" "not CONSENT_REQUIRED" "CONSENT_REQUIRED";;
  *) ok "consentGiven:true clears the consent gate";;
esac
kill $CPID 2>/dev/null

# ── 4 & 5. Picklist mapping and country normalisation ────────────────────────
#  Unit-level against the real mapper, so every frontend source string is
#  checked against the actual live picklist membership.
echo "4/5. CRM picklist mapping and country normalisation"
node - "$ROOT" <<'NODE'
const root = process.argv[2];
const svc = require(root + '/backend/functions/shared/zoho/crm.js');
const C = svc.constructor;
const SOURCE = new Set(['-None-','Advertisement','Cold Call','Employee Referral','External Referral','OnlineStore','Partner','Public Relations','Sales Mail Alias','Seminar Partner','Seminar-Internal','Trade Show','Web Download','Web Research','Chat','Twitter','Facebook']);
const DETAIL = new Set(['-None-','Website Form','WhatsApp','Instagram','Facebook','LinkedIn','YouTube','TikTok','Google Ads','Walk-in','Referral','Education Fair','Other']);
let bad = 0;
// Every source string the frontend actually sends, plus unmapped/absent.
for (const s of ['Website Inquiry Form','Website Study Abroad Inquiry Form','Contact Page Direct Message','Referral','WhatsApp',undefined,'not a known source']) {
  const r = C.leadSourceFor(s);
  if (!SOURCE.has(r.Lead_Source) || !DETAIL.has(r.Lead_Source_Detail)) { bad++; console.log('  FAIL  source', JSON.stringify(s), '->', r); }
}
console.log(bad ? `  FAIL  ${bad} source(s) mapped outside the picklist` : '  PASS  all frontend sources map to valid picklist values');
const cases = [['Dubai (UAE)','United Arab Emirates'],['United Kingdom','United Kingdom'],['',null],[undefined,null],['   ',null]];
let cbad = 0;
for (const [inp, want] of cases) {
  const got = C.countryFor(inp);
  if (got !== want) { cbad++; console.log('  FAIL  country', JSON.stringify(inp), 'expected', JSON.stringify(want), 'got', JSON.stringify(got)); }
}
console.log(cbad ? `  FAIL  ${cbad} country case(s)` : '  PASS  country normalisation and omission correct');
process.exit(bad + cbad ? 1 : 0);
NODE
[ $? -eq 0 ] && PASS=$((PASS+2)) || FAIL=$((FAIL+1))

# ── 6. Double submit ─────────────────────────────────────────────────────────
#  Same email twice. The CRM upsert dedupes by email, so what matters here is
#  that the second call is handled and does not error or fabricate.
echo "6. Double submit"
E=$(uniq_email)
P="{\"name\":\"Dup Check\",\"email\":\"$E\",\"phone\":\"9000000001\"}"
A1=$(curl -s -X POST "$BASE/api/leads" -H 'Content-Type: application/json' -d "$P" | json '.error.code')
A2=$(curl -s -X POST "$BASE/api/leads" -H 'Content-Type: application/json' -d "$P" | json '.error.code')
#  Both are refused for the same honest reason. What matters is that the second
#  call is handled deterministically — no crash, no PARSE_ERROR, and no
#  fabricated success on a retry.
chk "first submit handled deterministically"  "SUBMISSION_NOT_STORED" "$A1"
chk "second submit handled deterministically" "SUBMISSION_NOT_STORED" "$A2"

# ── 7. CRM unavailable ───────────────────────────────────────────────────────
echo "7. CRM unavailable"
R=$(curl -s -X POST "$BASE/api/leads" -H 'Content-Type: application/json' -d "{\"name\":\"No CRM\",\"email\":\"$(uniq_email)\"}")
#  With CRM down and no Data Store the request is refused outright, so there is
#  no zohoSync block to inspect. The property under test is unchanged: the
#  response must never imply the lead reached CRM.
case "$(echo "$R" | json '.success')" in
  true) no "no fabricated CRM success" "not a success while CRM is down" "success:true";;
  *) ok "no fabricated CRM success (refused honestly)";;
esac
# The whole response must never carry a credential.
LEAK=$(echo "$R" | grep -ciE 'client_secret|refresh_token|1000\.[0-9a-f]{8}|SESSION_SECRET' || true)
chk "no secret in response" "0" "$LEAK"

echo
echo "RESULT: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ] || exit 1
