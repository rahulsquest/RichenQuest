#!/bin/bash
# Student isolation regression. Run against a live backend:
#   bash scripts/security-regression.sh http://localhost:5055
# Exits non-zero on any failure so it can gate a deploy.
B="${1:-http://localhost:5055}"
PASS=0; FAIL=0
chk(){ if [ "$2" = "$3" ]; then PASS=$((PASS+1)); printf "PASS  %-48s %s\n" "$1" "$2";
       else FAIL=$((FAIL+1)); printf "FAIL  %-48s got %s want %s\n" "$1" "$2" "$3"; fi; }
mk(){ curl -s -m 20 -X POST "$B/api/auth/signup" -H 'Content-Type: application/json' \
  -d "{\"fullName\":\"ZZ Regression $1\",\"email\":\"zz-reg-$1-$$@example.invalid\",\"password\":\"TestPass!2345\",\"phone\":\"9000000000\"}"; }
A=$(mk A); Bb=$(mk B)
UA=$(echo "$A"  | python3 -c "import sys,json;print(((json.load(sys.stdin).get('data') or {}).get('user') or {}).get('userId',''))")
TA=$(echo "$A"  | python3 -c "import sys,json;print((json.load(sys.stdin).get('data') or {}).get('token',''))")
UB=$(echo "$Bb" | python3 -c "import sys,json;print(((json.load(sys.stdin).get('data') or {}).get('user') or {}).get('userId',''))")
for R in "students/$UA" cases/X documents notifications payments bookings \
         home profile opportunities roadmap report mentor; do
  chk "unauth /api/$R" "$(curl -s -o /dev/null -w '%{http_code}' -m 15 "$B/api/$R")" "401"
done
chk "cross-student A->B" "$(curl -s -o /dev/null -w '%{http_code}' -m 15 -H "Authorization: Bearer $TA" "$B/api/students/$UB")" "403"
chk "own record A->A"    "$(curl -s -o /dev/null -w '%{http_code}' -m 15 -H "Authorization: Bearer $TA" "$B/api/students/$UA")" "200"
chk "CORS evil blocked"  "$(curl -s -o /dev/null -D - -m 15 -H 'Origin: https://evil.example.com' "$B/api/health" | grep -ci 'access-control-allow-origin')" "0"
echo; echo "RESULT: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ] || exit 1
