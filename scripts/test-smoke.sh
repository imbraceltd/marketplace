#!/usr/bin/env bash
# marketplace smoke test for migration validation.
#
# Usage:
#   ./scripts/test-smoke.sh <BASE_URL> <ORG_ID> <BEARER_TOKEN> [--verbose]
#
# Exits 0 if every check passes, non-zero on any FAIL. One line per check:
#   [PASS]/[FAIL] <label>: <reason>   or [SKIP] <label>
#
# Coverage: every v3 list endpoint that maps to a migrated PG table, plus
# JSON-shape and minimum-count assertions for the populated ones (so a
# silently broken query that returns 200 + empty body still fails).
#
# All paths use the gateway-prefixed form `/api/v3/marketplaces/...`. The
# gateway rewrite drops `/marketplaces/` and forwards to the service's
# `/v3/...` route. See app-gateway/src/server/public/routers/marketplace.ts.

set -u
set -o pipefail

if [[ $# -lt 3 ]]; then
  echo "Usage: $0 <BASE_URL> <ORG_ID> <BEARER_TOKEN> [--verbose]" >&2
  exit 2
fi

BASE_URL="${1%/}"
ORG_ID="$2"
TOKEN="$3"
VERBOSE=0
[[ "${4:-}" == "--verbose" ]] && VERBOSE=1

PASS=0
FAIL=0
FAILED_TESTS=()

# Run a labeled HTTP check. Args:
#   $1 label, $2 expected status (e.g. "200" or "200|404"), $3+ curl args
check_http() {
  local label="$1" expected="$2"; shift 2
  local resp status body
  resp="$(curl -sS -o /tmp/_smoke_body -w '%{http_code}' --max-time 30 "$@" 2>/tmp/_smoke_err || echo 000)"
  status="$resp"
  body="$(cat /tmp/_smoke_body 2>/dev/null || true)"
  if [[ "|$expected|" == *"|$status|"* ]]; then
    printf '[PASS] %s\n' "$label"
    PASS=$((PASS+1))
    [[ $VERBOSE -eq 1 ]] && printf '       status=%s body=%s\n' "$status" "${body:0:120}"
    return 0
  else
    local err; err="$(cat /tmp/_smoke_err 2>/dev/null || true)"
    printf '[FAIL] %s: expected %s, got %s%s\n' "$label" "$expected" "$status" \
      "$([[ -n "$body" ]] && printf ' — %s' "${body:0:200}")"
    [[ -n "$err" ]] && printf '       curl: %s\n' "$err"
    FAIL=$((FAIL+1))
    FAILED_TESTS+=("$label")
    return 1
  fi
}

# List-endpoint check: HTTP 200 + body has `data` field that's an array.
# If $4 (min_count) is provided, also assert array length >= min_count.
# Args: $1 label, $2 url, $3 min_count (optional, default 0)
check_list() {
  local label="$1" url="$2" min_count="${3:-0}"
  local resp status body count
  resp="$(curl -sS -o /tmp/_smoke_body -w '%{http_code}' --max-time 30 \
    -H "authorization: Bearer $TOKEN" \
    -H "x-organization-id: $ORG_ID" \
    -H "content-type: application/json" \
    "$url" 2>/tmp/_smoke_err || echo 000)"
  status="$resp"
  body="$(cat /tmp/_smoke_body 2>/dev/null || true)"
  if [[ "$status" != "200" ]]; then
    printf '[FAIL] %s: expected 200, got %s — %s\n' "$label" "$status" "${body:0:200}"
    FAIL=$((FAIL+1))
    FAILED_TESTS+=("$label")
    return 1
  fi
  count="$(python3 -c "
import json, sys
try: d = json.loads(open('/tmp/_smoke_body').read())
except Exception as e: print('NOT_JSON', e); sys.exit(0)
items = d if isinstance(d, list) else d.get('data') or d.get('items') or []
if not isinstance(items, list): print('NOT_ARRAY'); sys.exit(0)
print(len(items))
" 2>/dev/null)"
  if [[ "$count" == "NOT_JSON"* ]] || [[ "$count" == "NOT_ARRAY" ]]; then
    printf '[FAIL] %s: response not a JSON list (body shape unexpected)\n' "$label"
    FAIL=$((FAIL+1))
    FAILED_TESTS+=("$label")
    return 1
  fi
  if [[ "$count" -lt "$min_count" ]]; then
    printf '[FAIL] %s: expected ≥ %s items, got %s\n' "$label" "$min_count" "$count"
    FAIL=$((FAIL+1))
    FAILED_TESTS+=("$label")
    return 1
  fi
  printf '[PASS] %s (%s items)\n' "$label" "$count"
  PASS=$((PASS+1))
  return 0
}

auth=(
  -H "authorization: Bearer $TOKEN"
  -H "x-organization-id: $ORG_ID"
  -H "content-type: application/json"
)

echo "marketplace smoke test against $BASE_URL (org=$ORG_ID)"
echo "----------------------------------------"

# ─── adjacent service sanity (gateway + JWT propagation) ──────────────────────
check_http "platform:user/_me" "200" "${auth[@]}" \
  "$BASE_URL/api/v1/platform/user/_me"

# ─── core list endpoints — every migrated table that has a v3 GET ─────────────
# usecases: typically populated, assert ≥ 1.
check_list "marketplace:list-usecases" \
  "$BASE_URL/api/v3/marketplaces/usecases" 1

# templates: lives at /v3/market-places/templates → gateway-path inserts the hyphen.
check_list "marketplace:list-templates" \
  "$BASE_URL/api/v3/marketplaces/market-places/templates" 1

# apps: may be empty per env; just assert 200 + array shape.
check_list "marketplace:list-apps" \
  "$BASE_URL/api/v3/marketplaces/apps" 0

# email-templates: served from /v3/email-templates (alias also at /v3/apps/email-templates).
check_list "marketplace:list-email-templates" \
  "$BASE_URL/api/v3/marketplaces/email-templates" 0

# email-senders: only under /v3/apps/email-senders.
check_list "marketplace:list-email-senders" \
  "$BASE_URL/api/v3/marketplaces/apps/email-senders" 0

# forms: only under /v3/apps/forms.
check_list "marketplace:list-forms" \
  "$BASE_URL/api/v3/marketplaces/apps/forms" 0

# files: served from /v3/files.
check_list "marketplace:list-files" \
  "$BASE_URL/api/v3/marketplaces/files" 0

# ─── search/filter params — proves the SQL WHERE clauses build correctly ──────
check_list "marketplace:usecases-search-by-type" \
  "$BASE_URL/api/v3/marketplaces/usecases?type=custom" 0

check_list "marketplace:email-templates-search" \
  "$BASE_URL/api/v3/marketplaces/email-templates/search?keyword=invoice" 0

# ─── get-by-id (dependent on list having ≥1 row) ──────────────────────────────
usecase_id="$(curl -sS --max-time 15 "${auth[@]}" \
  "$BASE_URL/api/v3/marketplaces/usecases" 2>/dev/null \
  | grep -oE '"id":"uc_[a-zA-Z0-9-]+"' | head -1 | cut -d'"' -f4 || true)"

if [[ -n "$usecase_id" ]]; then
  check_http "marketplace:get-usecase" "200" "${auth[@]}" \
    "$BASE_URL/api/v3/marketplaces/usecases/$usecase_id"
else
  printf '[SKIP] marketplace:get-usecase (no usecases visible)\n'
fi

template_id="$(curl -sS --max-time 15 "${auth[@]}" \
  "$BASE_URL/api/v3/marketplaces/market-places/templates" 2>/dev/null \
  | grep -oE '"id":"template_[a-zA-Z0-9-]+"' | head -1 | cut -d'"' -f4 || true)"
if [[ -n "$template_id" ]]; then
  check_http "marketplace:get-template" "200" "${auth[@]}" \
    "$BASE_URL/api/v3/marketplaces/market-places/templates/$template_id"
else
  printf '[SKIP] marketplace:get-template (no templates visible)\n'
fi

# ─── tenant isolation — request as a clearly-fake org returns no rows from the real org ──
# 401/403/200 with empty list are all acceptable; what we check is that we
# don't get the populated org's data back. Useful as a regression check
# against accidentally widening org-scope on the SQL side.
fake_org="org_smoke_test_does_not_exist"
status_other=$(curl -sS -o /tmp/_smoke_other -w "%{http_code}" --max-time 30 \
  -H "authorization: Bearer $TOKEN" \
  -H "x-organization-id: $fake_org" \
  "$BASE_URL/api/v3/marketplaces/usecases")
if [[ "$status_other" == "401" || "$status_other" == "403" ]]; then
  printf '[PASS] marketplace:tenant-isolation (auth blocks fake org with %s)\n' "$status_other"
  PASS=$((PASS+1))
elif [[ "$status_other" == "200" ]]; then
  other_count="$(python3 -c "
import json
d = json.loads(open('/tmp/_smoke_other').read())
items = d if isinstance(d, list) else d.get('data') or d.get('items') or []
print(len(items))
" 2>/dev/null || echo "?")"
  if [[ "$other_count" == "0" ]]; then
    printf '[PASS] marketplace:tenant-isolation (fake org sees 0 items)\n'
    PASS=$((PASS+1))
  else
    printf '[FAIL] marketplace:tenant-isolation: fake org returned %s items — possible cross-tenant leak\n' "$other_count"
    FAIL=$((FAIL+1))
    FAILED_TESTS+=("marketplace:tenant-isolation")
  fi
else
  printf '[FAIL] marketplace:tenant-isolation: unexpected status %s for fake-org request\n' "$status_other"
  FAIL=$((FAIL+1))
  FAILED_TESTS+=("marketplace:tenant-isolation")
fi

# Note: not asserting on missing-id behavior (e.g. /usecases/uc_does_not_exist).
# The service returns 500 for unknown IDs (pre-existing v3 controller quirk
# in UseCaseController.getById). The list endpoints already prove the PG
# query path works; chasing that 500 belongs in a separate fix, not in the
# migration smoke.

# ─── summary ──────────────────────────────────────────────────────────────────
echo "----------------------------------------"
printf 'Result: %d passed, %d failed\n' "$PASS" "$FAIL"
if [[ $FAIL -gt 0 ]]; then
  printf 'Failed tests:\n'
  for t in "${FAILED_TESTS[@]}"; do printf '  - %s\n' "$t"; done
  exit 1
fi
exit 0
