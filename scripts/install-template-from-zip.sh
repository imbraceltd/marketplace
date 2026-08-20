#!/bin/bash

# Script to install a template from a zip file
# Usage: ./install-template-from-zip.sh <zip_file> [org_id] [base_url]

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

print_header() {
    echo -e "${BLUE}[INSTALL]${NC} $1"
}

# Check if required arguments are provided
if [ $# -lt 1 ]; then
    print_error "Missing required arguments"
    echo "Usage: $0 <zip_file> [org_id] [base_url] [options]"
    echo ""
    echo "Required arguments:"
    echo "  zip_file    - Path to the template zip file"
    echo ""
    echo "Optional arguments:"
    echo "  org_id      - Organization ID (default from .env or org_imbrace)"
    echo "  base_url    - Base URL (default from .env or http://localhost:9982)"
    echo ""
    echo "Options (add after base_url):"
    echo "  --disable-id-generation    - Keep original IDs instead of generating new ones"
    echo "  --clone-board-items        - Clone board items (data rows)"
    echo ""
    echo "Examples:"
    echo "  $0 templates-output/MyTemplate_20231224_143022.zip"
    echo "  $0 MyTemplate.zip org_custom https://api.example.com"
    echo "  $0 MyTemplate.zip org_imbrace http://localhost:9982 --disable-id-generation"
    echo "  $0 MyTemplate.zip org_imbrace http://localhost:9982 --clone-board-items"
    exit 1
fi

# Parse arguments
ZIP_FILE="$1"
ORG_ID="${2:-${MARKETPLACE_ORG_ID:-org_imbrace}}"
BASE_URL="${3:-${MARKETPLACE_BASE_URL:-http://localhost:9982}}"

# Parse options
DISABLE_ID_GEN="false"
CLONE_BOARD_ITEMS="false"

shift 3 2>/dev/null || shift $# 2>/dev/null

while [[ $# -gt 0 ]]; do
    case $1 in
        --disable-id-generation)
            DISABLE_ID_GEN="true"
            shift
            ;;
        --clone-board-items)
            CLONE_BOARD_ITEMS="true"
            shift
            ;;
        *)
            print_warning "Unknown option: $1"
            shift
            ;;
    esac
done

# Validate zip file exists
if [ ! -f "$ZIP_FILE" ]; then
    print_error "Zip file not found: ${ZIP_FILE}"
    exit 1
fi

# Check if unzip is available
if ! command -v unzip &> /dev/null; then
    print_error "unzip command not found. Please install unzip."
    exit 1
fi

print_header "Installing template from zip file"
print_info "Zip file: ${ZIP_FILE}"
print_info "Organization: ${ORG_ID}"
print_info "Base URL: ${BASE_URL}"
print_info "Disable ID generation: ${DISABLE_ID_GEN}"
print_info "Clone board items: ${CLONE_BOARD_ITEMS}"
echo ""

# Create temporary directory
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

# Extract zip file
print_info "Extracting zip file..."
unzip -q "$ZIP_FILE" -d "$TEMP_DIR"

# Find the JSON file
JSON_FILE=$(find "$TEMP_DIR" -name "*.json" -type f | head -1)

if [ -z "$JSON_FILE" ]; then
    print_error "No JSON file found in zip archive"
    exit 1
fi

print_info "Found template JSON: $(basename $JSON_FILE)"

# Read the JSON file and extract template data
TEMPLATE_JSON=$(cat "$JSON_FILE")

# Check if it's already in the correct format or needs wrapping
if echo "$TEMPLATE_JSON" | jq -e '.data' > /dev/null 2>&1; then
    # Response format from API - extract the data field
    print_info "Detected API response format, extracting template data..."
    TEMPLATE_DATA=$(echo "$TEMPLATE_JSON" | jq '.data')
else
    # Direct template format
    print_info "Detected direct template format"
    TEMPLATE_DATA="$TEMPLATE_JSON"
fi

# Validate that we have graph data
if ! echo "$TEMPLATE_DATA" | jq -e '.graph' > /dev/null 2>&1; then
    print_error "Invalid template data: 'graph' field not found"
    echo "Template structure:"
    echo "$TEMPLATE_DATA" | jq '.' 2>/dev/null || echo "$TEMPLATE_DATA"
    exit 1
fi

# Build the request payload
REQUEST_PAYLOAD=$(cat <<EOF
{
  "template": $TEMPLATE_DATA,
  "is_disabled_id_generated": $DISABLE_ID_GEN,
  "is_clone_board_items": $CLONE_BOARD_ITEMS
}
EOF
)

print_info "Request payload prepared"
echo "Payload summary:"
echo "$REQUEST_PAYLOAD" | jq '{template: {graph: "...", deps: .template.deps}, is_disabled_id_generated, is_clone_board_items}' 2>/dev/null || echo "- Template data loaded"
echo ""

# Make the API request
print_info "Sending installation request to ${BASE_URL}/v1/market-places/templates/install-from-json..."

HTTP_RESPONSE=$(curl --silent --write-out "HTTPSTATUS:%{http_code}" \
  --request POST \
  --url "${BASE_URL}/v1/market-places/templates/install-from-json" \
  --header "content-type: application/json" \
  --header "x-organization-id: ${ORG_ID}" \
  --data "$REQUEST_PAYLOAD")

# Extract response body and status
HTTP_BODY=$(echo "$HTTP_RESPONSE" | sed -e 's/HTTPSTATUS\:.*//g')
HTTP_STATUS=$(echo "$HTTP_RESPONSE" | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')

# Check if request was successful
if [ "$HTTP_STATUS" -eq 200 ] || [ "$HTTP_STATUS" -eq 201 ]; then
    print_info "✓ Template installed successfully! (HTTP ${HTTP_STATUS})"
    
    # Display response
    echo ""
    echo "=============================="
    echo "Installation Response"
    echo "=============================="
    echo "$HTTP_BODY" | jq '.' 2>/dev/null || echo "$HTTP_BODY"
    echo "=============================="
    echo ""
    
    print_info "Template has been installed to organization: ${ORG_ID}"
    
    exit 0
else
    print_error "Failed to install template (HTTP ${HTTP_STATUS})"
    echo ""
    echo "Error response:"
    echo "$HTTP_BODY" | jq '.' 2>/dev/null || echo "$HTTP_BODY"
    echo ""
    
    exit 1
fi
