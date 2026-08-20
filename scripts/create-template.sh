#!/bin/bash

# Script to create a template and save it as a zip file with JSON
# Usage: ./create-template.sh <name> <id> <type> [description] [org_id] [base_url]

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
NC='\033[0m' # No Color

# Function to print colored messages
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check if required arguments are provided
if [ $# -lt 3 ]; then
    print_error "Missing required arguments"
    echo "Usage: $0 <name> <id> <type> [description] [org_id] [base_url]"
    echo ""
    echo "Required arguments:"
    echo "  name        - Template name"
    echo "  id          - Resource ID (e.g., board ID, workflow ID, etc.)"
    echo "  type        - Template type (data_board, workflow, ai_assistant, channel, use_case, organization)"
    echo ""
    echo "Optional arguments:"
    echo "  description - Template description (default: empty)"
    echo "  org_id      - Organization ID (default: org_imbrace)"
    echo "  base_url    - Base URL (default: http://localhost:9982)"
    echo ""
    echo "Examples:"
    echo "  $0 \"My Board Template\" \"brd_123\" \"data_board\""
    echo "  $0 \"My Workflow\" \"wf_456\" \"workflow\" \"A workflow description\" \"org_custom\""
    exit 1
fi

# Parse arguments
TEMPLATE_NAME="$1"
RESOURCE_ID="$2"
TEMPLATE_TYPE="$3"
DESCRIPTION="${4:-}"
ORG_ID="${5:-${MARKETPLACE_ORG_ID:-org_imbrace}}"
BASE_URL="${6:-${MARKETPLACE_BASE_URL:-http://localhost:9982}}"

# Validate template type
VALID_TYPES=("data_board" "workflow" "ai_assistant" "channel" "use_case" "organization")
if [[ ! " ${VALID_TYPES[@]} " =~ " ${TEMPLATE_TYPE} " ]]; then
    print_error "Invalid template type: ${TEMPLATE_TYPE}"
    echo "Valid types: ${VALID_TYPES[*]}"
    exit 1
fi

# Create output directory if it doesn't exist
OUTPUT_DIR="./templates-output"
mkdir -p "$OUTPUT_DIR"

# Generate timestamp for unique filename
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
SAFE_NAME=$(echo "$TEMPLATE_NAME" | tr ' ' '_' | tr -cd '[:alnum:]_-')
OUTPUT_BASE="${OUTPUT_DIR}/${SAFE_NAME}_${TIMESTAMP}"
JSON_FILE="${OUTPUT_BASE}.json"
ZIP_FILE="${OUTPUT_BASE}.zip"

print_info "Creating template: ${TEMPLATE_NAME}"
print_info "Resource ID: ${RESOURCE_ID}"
print_info "Type: ${TEMPLATE_TYPE}"
print_info "Organization: ${ORG_ID}"

# Build the JSON payload
JSON_PAYLOAD=$(cat <<EOF
{
  "name": "${TEMPLATE_NAME}",
  "id": "${RESOURCE_ID}",
  "type": "${TEMPLATE_TYPE}"$([ -n "$DESCRIPTION" ] && echo ",
  \"description\": \"${DESCRIPTION}\"")
}
EOF
)

print_info "Request payload:"
echo "$JSON_PAYLOAD" | jq '.' 2>/dev/null || echo "$JSON_PAYLOAD"

# Make the API request
print_info "Sending request to ${BASE_URL}/v1/market-places/templates..."

HTTP_RESPONSE=$(curl --silent --write-out "HTTPSTATUS:%{http_code}" \
  --request POST \
  --url "${BASE_URL}/v1/market-places/templates" \
  --header "content-type: application/json" \
  --header "x-organization-id: ${ORG_ID}" \
  --data "$JSON_PAYLOAD")

# Extract response body and status
HTTP_BODY=$(echo "$HTTP_RESPONSE" | sed -e 's/HTTPSTATUS\:.*//g')
HTTP_STATUS=$(echo "$HTTP_RESPONSE" | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')

# Check if request was successful
if [ "$HTTP_STATUS" -eq 200 ] || [ "$HTTP_STATUS" -eq 201 ]; then
    print_info "Template created successfully! (HTTP ${HTTP_STATUS})"
    
    # Save JSON response
    echo "$HTTP_BODY" | jq '.' > "$JSON_FILE" 2>/dev/null || echo "$HTTP_BODY" > "$JSON_FILE"
    print_info "JSON saved to: ${JSON_FILE}"
    
    # Create metadata file
    METADATA_FILE="${OUTPUT_BASE}_metadata.txt"
    cat > "$METADATA_FILE" <<EOF
Template Creation Details
========================
Name: ${TEMPLATE_NAME}
Resource ID: ${RESOURCE_ID}
Type: ${TEMPLATE_TYPE}
Description: ${DESCRIPTION}
Organization: ${ORG_ID}
Created: $(date)
HTTP Status: ${HTTP_STATUS}
========================
EOF
    
    # Create zip file
    print_info "Creating zip archive..."
    cd "$OUTPUT_DIR"
    BASENAME=$(basename "$OUTPUT_BASE")
    zip -q "${BASENAME}.zip" "${BASENAME}.json" "${BASENAME}_metadata.txt"
    cd - > /dev/null
    
    # Remove temporary files
    rm -f "$JSON_FILE" "$METADATA_FILE"
    
    print_info "✓ Zip file created: ${ZIP_FILE}"
    
    # Display summary
    echo ""
    echo "=============================="
    echo "Template Creation Summary"
    echo "=============================="
    echo "Template Name: ${TEMPLATE_NAME}"
    echo "Template Type: ${TEMPLATE_TYPE}"
    echo "Output File: ${ZIP_FILE}"
    echo "=============================="
    
    # Extract and display template ID if available
    TEMPLATE_ID=$(echo "$HTTP_BODY" | jq -r '.data._id // .data.id // "N/A"' 2>/dev/null)
    if [ "$TEMPLATE_ID" != "N/A" ]; then
        print_info "Template ID: ${TEMPLATE_ID}"
    fi
    
else
    print_error "Failed to create template (HTTP ${HTTP_STATUS})"
    echo "Response:"
    echo "$HTTP_BODY" | jq '.' 2>/dev/null || echo "$HTTP_BODY"
    exit 1
fi

exit 0
