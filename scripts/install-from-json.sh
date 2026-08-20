#!/bin/bash

# install-from-json.sh
# Installs a template from a zip file using the installFromJson endpoint
# The zip file should contain a template.json file with the template structure

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Load configuration from .env if it exists
if [ -f "$SCRIPT_DIR/.env" ]; then
    source "$SCRIPT_DIR/.env"
fi

# Default values (can be overridden by .env or command line)
BASE_URL="${BASE_URL:-http://localhost:3002}"
ORG_ID="${ORG_ID:-}"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to display usage
usage() {
    cat << EOF
${BLUE}Usage:${NC}
    $0 -z <zip_file> -o <org_id> [-u <base_url>] [-d] [-c]

${BLUE}Description:${NC}
    Installs a template from a zip file using the installFromJson endpoint.
    The zip file should contain a 'template.json' file with the template structure.

${BLUE}Options:${NC}
    -z <zip_file>       Path to the zip file containing template.json (required)
    -o <org_id>         Organization ID (required if not in .env)
    -u <base_url>       Base URL of the API (default: from .env or http://localhost:3002)
    -d                  Disable ID generation (use original IDs from template)
    -c                  Clone board items during installation
    -h                  Display this help message

${BLUE}Environment:${NC}
    You can set defaults in ${SCRIPT_DIR}/.env:
        BASE_URL=http://localhost:3002
        ORG_ID=your-org-id

${BLUE}Examples:${NC}
    # Basic usage (using .env for BASE_URL and ORG_ID)
    $0 -z template-export.zip

    # With explicit org ID
    $0 -z template-export.zip -o '507f1f77bcf86cd799439011'

    # Install with original IDs preserved
    $0 -z template-export.zip -o '507f1f77bcf86cd799439011' -d

    # Install with board items cloned
    $0 -z template-export.zip -o '507f1f77bcf86cd799439011' -c

    # Full example with all options
    $0 -z template-export.zip -u 'https://api.example.com' -o '507f1f77bcf86cd799439011' -d -c

${BLUE}Notes:${NC}
    - The zip file must contain a 'template.json' file at the root level
    - The template.json should have the structure: { "graph": {...}, "deps": {...} }
    - Use single quotes for arguments containing special characters
    - For production environments, set BASE_URL and ORG_ID in .env

EOF
    exit 1
}

# Function to print colored messages
print_error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Parse command line arguments
ZIP_FILE=""
IS_DISABLED_ID_GENERATED=false
IS_CLONE_BOARD_ITEMS=false

while getopts "z:o:u:dch" opt; do
    case $opt in
        z)
            ZIP_FILE="$OPTARG"
            ;;
        o)
            ORG_ID="$OPTARG"
            ;;
        u)
            BASE_URL="$OPTARG"
            ;;
        d)
            IS_DISABLED_ID_GENERATED=true
            ;;
        c)
            IS_CLONE_BOARD_ITEMS=true
            ;;
        h)
            usage
            ;;
        \?)
            print_error "Invalid option: -$OPTARG"
            usage
            ;;
        :)
            print_error "Option -$OPTARG requires an argument."
            usage
            ;;
    esac
done

# Validate required parameters
if [ -z "$ZIP_FILE" ]; then
    print_error "Zip file is required (-z)"
    usage
fi

if [ -z "$ORG_ID" ]; then
    print_error "Organization ID is required (-o or in .env)"
    usage
fi

# Check if zip file exists
if [ ! -f "$ZIP_FILE" ]; then
    print_error "Zip file not found: $ZIP_FILE"
    exit 1
fi

# Check if unzip is available
if ! command -v unzip &> /dev/null; then
    print_error "unzip command not found. Please install unzip to use this script."
    exit 1
fi

# Create temporary directory for extraction
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

print_info "Extracting zip file: $ZIP_FILE"
if ! unzip -q "$ZIP_FILE" -d "$TEMP_DIR"; then
    print_error "Failed to extract zip file"
    exit 1
fi

# Look for template.json in the extracted files
TEMPLATE_JSON="$TEMP_DIR/template.json"
if [ ! -f "$TEMPLATE_JSON" ]; then
    # Try to find template.json in subdirectories
    FOUND_JSON=$(find "$TEMP_DIR" -name "template.json" -type f | head -n 1)
    if [ -z "$FOUND_JSON" ]; then
        print_error "template.json not found in zip file"
        print_info "Zip file contents:"
        unzip -l "$ZIP_FILE"
        exit 1
    fi
    TEMPLATE_JSON="$FOUND_JSON"
    print_info "Found template.json at: $TEMPLATE_JSON"
fi

# Validate JSON structure
if ! jq empty "$TEMPLATE_JSON" 2>/dev/null; then
    print_error "Invalid JSON in template.json"
    exit 1
fi

# Check if template has required structure
if ! jq -e '.graph' "$TEMPLATE_JSON" > /dev/null 2>&1; then
    print_error "template.json must contain a 'graph' property"
    exit 1
fi

print_info "Template JSON validated successfully"

# Build the request payload
PAYLOAD=$(jq -n \
    --argjson template "$(cat "$TEMPLATE_JSON")" \
    --argjson is_disabled_id_generated "$IS_DISABLED_ID_GENERATED" \
    --argjson is_clone_board_items "$IS_CLONE_BOARD_ITEMS" \
    '{
        template: $template,
        is_disabled_id_generated: $is_disabled_id_generated,
        is_clone_board_items: $is_clone_board_items
    }')

# Display installation summary
print_info "Installation Summary:"
echo "  Base URL: $BASE_URL"
echo "  Org ID: $ORG_ID"
echo "  Zip File: $ZIP_FILE"
echo "  Disable ID Generation: $IS_DISABLED_ID_GENERATED"
echo "  Clone Board Items: $IS_CLONE_BOARD_ITEMS"
echo ""

# Make API request
print_info "Installing template from JSON..."
RESPONSE=$(curl -s -w "\n%{http_code}" \
    -X POST \
    "$BASE_URL/v1/template/install-from-json" \
    -H "Content-Type: application/json" \
    -H "x-org-id: $ORG_ID" \
    -d "$PAYLOAD")

# Extract HTTP status code and response body
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
RESPONSE_BODY=$(echo "$RESPONSE" | sed '$d')

# Check response
if [ "$HTTP_CODE" -ge 200 ] && [ "$HTTP_CODE" -lt 300 ]; then
    print_success "Template installed successfully!"
    echo ""
    print_info "Response:"
    echo "$RESPONSE_BODY" | jq -C '.' 2>/dev/null || echo "$RESPONSE_BODY"
    exit 0
else
    print_error "Installation failed with HTTP status: $HTTP_CODE"
    echo ""
    print_info "Response:"
    echo "$RESPONSE_BODY" | jq -C '.' 2>/dev/null || echo "$RESPONSE_BODY"
    exit 1
fi
