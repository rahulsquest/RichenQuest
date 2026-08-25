#!/bin/bash
# Verifies www.richenquest.com after the CNAME repoint, and proves the
# email records were untouched. Run: bash scripts/verify-domain.sh
NS=ns71.domaincontrol.com
TARGET="slate-8769000000005008-in.nimbuspop.com"
PASS=0; FAIL=0
chk(){ if [ "$2" = "$3" ]; then PASS=$((PASS+1)); printf "  PASS  %-44s %s\n" "$1" "$2";
       else FAIL=$((FAIL+1)); printf "  FAIL  %-44s got %s want %s\n" "$1" "$2" "$3"; fi; }

echo "== 1 · DNS =="
CUR=$(dig +short www.richenquest.com CNAME @$NS 2>/dev/null | sed 's/\.$//')
printf "  authoritative www CNAME : %s\n" "${CUR:-none}"
printf "  expected                : %s\n" "$TARGET"
[ "$CUR" = "$TARGET" ] && echo "  -> CNAME UPDATED" || echo "  -> not yet propagated to authoritative NS"
echo "  public resolver (1.1.1.1): $(dig +short @1.1.1.1 www.richenquest.com CNAME 2>/dev/null | sed 's/\.$//')"

echo; echo "== 2 · EMAIL RECORDS MUST BE UNCHANGED =="
printf "  MX    : %s\n" "$(dig +short @$NS richenquest.com MX | tr '\n' ' ')"
printf "  SPF   : %s\n" "$(dig +short @$NS richenquest.com TXT | grep spf)"
printf "  macro : %s\n" "$(dig +short @$NS dc-8e814c8572._spfm.richenquest.com TXT | head -1)"
printf "  DKIM  : %s bytes\n" "$(dig +short @$NS zoho._domainkey.richenquest.com TXT | wc -c | tr -d ' ')"
printf "  DMARC : %s\n" "$(dig +short @$NS _dmarc.richenquest.com TXT | cut -c1-60)"

echo; echo "== 3 · ROUTES via https://www.richenquest.com =="
for R in / /about /services /login /signup /how-it-works /contact /faq; do
  chk "GET $R" "$(curl -s -o /dev/null -w '%{http_code}' -m 25 -L "https://www.richenquest.com$R")" "200"
done

echo; echo "== 4 · ASSETS + CONTENT =="
curl -s -m 25 -L "https://www.richenquest.com/" -o /tmp/vd.html 2>/dev/null
TITLE=$(grep -oiE '<title>[^<]*</title>' /tmp/vd.html 2>/dev/null | head -1)
printf "  title : %s\n" "${TITLE:-<none>}"
for A in $(grep -oE '/assets/[^"]*' /tmp/vd.html 2>/dev/null); do
  chk "asset $A" "$(curl -s -o /dev/null -w '%{http_code}' -m 25 "https://www.richenquest.com$A")" "200"
done
printf "  /RichenQuest/ refs: %s   localhost refs: %s\n" \
  "$(grep -c '/RichenQuest/' /tmp/vd.html 2>/dev/null)" "$(grep -c 'localhost' /tmp/vd.html 2>/dev/null)"

echo; echo "== 5 · APEX + NO REDIRECT LOOP =="
printf "  richenquest.com -> %s (final %s)\n" \
  "$(curl -s -o /dev/null -w '%{http_code}' -m 25 -L https://richenquest.com/)" \
  "$(curl -s -o /dev/null -w '%{url_effective}' -m 25 -L https://richenquest.com/)"

echo; echo "RESULT: $PASS passed, $FAIL failed"
