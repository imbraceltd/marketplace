#!/bin/bash

# Script to create a Data Board template
# Usage: ./create-board-template.sh <name> <board_id> [description] [org_id] [base_url]

set -e

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Color codes for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_info() {
    echo -e "${GREEN}[BOARD TEMPLATE]${NC} $1"
}

# Check arguments
if [ $# -lt 2 ]; then
    echo "Usage: $0 <name> <board_id> [description] [org_id] [base_url]"
    echo ""
    echo "Creates a Data Board template from an existing board"
    echo ""
    echo "Arguments:"
    echo "  name        - Template name (e.g., 'Customer Support Board')"
    echo "  board_id    - Board ID (e.g., 'brd_3e9af11a-be05-49aa-b29d-78d900d6a351')"
    echo "  description - Template description (optional)"
    echo "  org_id      - Organization ID (default: org_imbrace)"
    echo "  base_url    - Base URL (default: http://localhost:9982)"
    echo ""
    echo "Example:"
    echo "  $0 \"Customer Support Board\" \"brd_3e9af11a-be05-49aa-b29d-78d900d6a351\" \"Track customer support tickets\""
    exit 1
fi

# Load environment variables from .env file if it exists
if [ -f "$SCRIPT_DIR/.env" ]; then
    set -a
    source "$SCRIPT_DIR/.env"
    set +a
fi

TEMPLATE_NAME="$1"
BOARD_ID="$2"
DESCRIPTION="${3:-Board template for ${TEMPLATE_NAME}}"
ORG_ID="${4:-${MARKETPLACE_ORG_ID:-org_imbrace}}"
BASE_URL="${5:-${MARKETPLACE_BASE_URL:-http://localhost:9982}}"

print_info "Creating Data Board template..."
print_info "Name: ${TEMPLATE_NAME}"
print_info "Board ID: ${BOARD_ID}"

# Call the generic create-template script
"${SCRIPT_DIR}/create-template.sh" \
    "$TEMPLATE_NAME" \
    "$BOARD_ID" \
    "data_board" \
    "$DESCRIPTION" \
    "$ORG_ID" \
    "$BASE_URL"
