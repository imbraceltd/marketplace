#!/bin/bash

# Batch script to create multiple templates from a config file
# Usage: ./batch-create-templates.sh <config_file> [org_id] [base_url]

set -e

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Load environment variables from .env file if it exists
if [ -f "$SCRIPT_DIR/.env" ]; then
    set -a
    source "$SCRIPT_DIR/.env"
    set +a
fi

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_header() {
    echo -e "${BLUE}[BATCH]${NC} $1"
}

# Check if config file is provided
if [ $# -lt 1 ]; then
    print_error "Missing config file"
    echo "Usage: $0 <config_file> [org_id] [base_url]"
    echo ""
    echo "Config file format (JSON):"
    cat <<'EOF'
{
  "templates": [
    {
      "name": "Template Name",
      "id": "resource_id",
      "type": "data_board",
      "description": "Optional description"
    }
  ]
}
EOF
    exit 1
fi

CONFIG_FILE="$1"
ORG_ID="${2:-${MARKETPLACE_ORG_ID:-org_imbrace}}"
BASE_URL="${3:-${MARKETPLACE_BASE_URL:-http://localhost:9982}}"

# Check if config file exists
if [ ! -f "$CONFIG_FILE" ]; then
    print_error "Config file not found: ${CONFIG_FILE}"
    exit 1
fi

# Validate JSON format
if ! jq empty "$CONFIG_FILE" 2>/dev/null; then
    print_error "Invalid JSON format in config file"
    exit 1
fi

# Extract templates array
TEMPLATES=$(jq -c '.templates[]' "$CONFIG_FILE")
TEMPLATE_COUNT=$(echo "$TEMPLATES" | wc -l | tr -d ' ')

print_header "Starting batch template creation"
print_info "Total templates to create: ${TEMPLATE_COUNT}"
print_info "Organization: ${ORG_ID}"
print_info "Base URL: ${BASE_URL}"
echo ""

# Create output directory
OUTPUT_DIR="./templates-output/batch_$(date +"%Y%m%d_%H%M%S")"
mkdir -p "$OUTPUT_DIR"

# Initialize counters
SUCCESS_COUNT=0
FAILED_COUNT=0
FAILED_TEMPLATES=()

# Process each template
INDEX=1
echo "$TEMPLATES" | while IFS= read -r template; do
    TEMPLATE_NAME=$(echo "$template" | jq -r '.name')
    RESOURCE_ID=$(echo "$template" | jq -r '.id')
    TEMPLATE_TYPE=$(echo "$template" | jq -r '.type')
    DESCRIPTION=$(echo "$template" | jq -r '.description // ""')
    
    print_header "Processing template ${INDEX}/${TEMPLATE_COUNT}"
    print_info "Name: ${TEMPLATE_NAME}"
    print_info "ID: ${RESOURCE_ID}"
    print_info "Type: ${TEMPLATE_TYPE}"
    
    # Build JSON payload
    JSON_PAYLOAD=$(cat <<EOF
{
  "name": "${TEMPLATE_NAME}",
  "id": "${RESOURCE_ID}",
  "type": "${TEMPLATE_TYPE}"$([ -n "$DESCRIPTION" ] && echo ",
  \"description\": \"${DESCRIPTION}\"")
}
EOF
)
    
    # Make API request
    HTTP_RESPONSE=$(curl --silent --write-out "HTTPSTATUS:%{http_code}" \
      --request POST \
      --url "${BASE_URL}/v1/market-places/templates" \
      --header "content-type: application/json" \
      --header "x-organization-id: ${ORG_ID}" \
      --data "$JSON_PAYLOAD")
    
    HTTP_BODY=$(echo "$HTTP_RESPONSE" | sed -e 's/HTTPSTATUS\:.*//g')
    HTTP_STATUS=$(echo "$HTTP_RESPONSE" | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
    
    # Check status and save result
    SAFE_NAME=$(echo "$TEMPLATE_NAME" | tr ' ' '_' | tr -cd '[:alnum:]_-')
    RESULT_FILE="${OUTPUT_DIR}/${INDEX}_${SAFE_NAME}.json"
    
    if [ "$HTTP_STATUS" -eq 200 ] || [ "$HTTP_STATUS" -eq 201 ]; then
        echo "$HTTP_BODY" | jq '.' > "$RESULT_FILE" 2>/dev/null || echo "$HTTP_BODY" > "$RESULT_FILE"
        print_info "✓ Success - Saved to: ${RESULT_FILE}"
        SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
    else
        echo "$HTTP_BODY" | jq '.' > "${RESULT_FILE}.error" 2>/dev/null || echo "$HTTP_BODY" > "${RESULT_FILE}.error"
        print_error "✗ Failed (HTTP ${HTTP_STATUS}) - Error saved to: ${RESULT_FILE}.error"
        FAILED_COUNT=$((FAILED_COUNT + 1))
        FAILED_TEMPLATES+=("${TEMPLATE_NAME}")
    fi
    
    echo ""
    INDEX=$((INDEX + 1))
done

# Create summary report
SUMMARY_FILE="${OUTPUT_DIR}/summary.txt"
cat > "$SUMMARY_FILE" <<EOF
Batch Template Creation Summary
================================
Date: $(date)
Organization: ${ORG_ID}
Base URL: ${BASE_URL}

Results:
--------
Total: ${TEMPLATE_COUNT}
Success: ${SUCCESS_COUNT}
Failed: ${FAILED_COUNT}

EOF

if [ ${FAILED_COUNT} -gt 0 ]; then
    echo "Failed Templates:" >> "$SUMMARY_FILE"
    printf '%s\n' "${FAILED_TEMPLATES[@]}" >> "$SUMMARY_FILE"
fi

# Create zip archive
print_header "Creating archive..."
ARCHIVE_NAME="templates_batch_$(date +"%Y%m%d_%H%M%S").zip"
cd "$(dirname "$OUTPUT_DIR")"
zip -r "$ARCHIVE_NAME" "$(basename "$OUTPUT_DIR")" > /dev/null
cd - > /dev/null

ARCHIVE_PATH="$(dirname "$OUTPUT_DIR")/${ARCHIVE_NAME}"

# Display final summary
echo ""
echo "======================================"
echo "Batch Creation Complete"
echo "======================================"
echo "Total Templates: ${TEMPLATE_COUNT}"
echo "Successful: ${SUCCESS_COUNT}"
echo "Failed: ${FAILED_COUNT}"
echo "Output Directory: ${OUTPUT_DIR}"
echo "Archive: ${ARCHIVE_PATH}"
echo "======================================"

if [ ${FAILED_COUNT} -gt 0 ]; then
    print_warning "Some templates failed to create. Check error files in output directory."
    exit 1
fi

exit 0
