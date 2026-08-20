#!/bin/bash

# Script to create a Channel template
# Usage: ./create-channel-template.sh <name> <channel_id> [description] [org_id] [base_url]

set -e

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Color codes for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_info() {
    echo -e "${GREEN}[CHANNEL TEMPLATE]${NC} $1"
}

# Check arguments
if [ $# -lt 2 ]; then
    echo "Usage: $0 <name> <channel_id> [description] [org_id] [base_url]"
    echo ""
    echo "Creates a Channel template from an existing channel"
    echo ""
    echo "Arguments:"
    echo "  name        - Template name (e.g., 'Web Chat Channel')"
    echo "  channel_id  - Channel ID (e.g., 'ch_1bb3ae23-fa5b-47aa-b127-c09f43d915d7')"
    echo "  description - Template description (optional)"
    echo "  org_id      - Organization ID (default: org_imbrace)"
    echo "  base_url    - Base URL (default: http://localhost:9982)"
    echo ""
    echo "Example:"
    echo "  $0 \"Web Chat\" \"ch_1bb3ae23-fa5b-47aa-b127-c09f43d915d7\" \"Web chat channel configuration\""
    exit 1
fi

# Load environment variables from .env file if it exists
if [ -f "$SCRIPT_DIR/.env" ]; then
    set -a
    source "$SCRIPT_DIR/.env"
    set +a
fi

TEMPLATE_NAME="$1"
CHANNEL_ID="$2"
DESCRIPTION="${3:-Channel template for ${TEMPLATE_NAME}}"
ORG_ID="${4:-${MARKETPLACE_ORG_ID:-org_imbrace}}"
BASE_URL="${5:-${MARKETPLACE_BASE_URL:-http://localhost:9982}}"

print_info "Creating Channel template..."
print_info "Name: ${TEMPLATE_NAME}"
print_info "Channel ID: ${CHANNEL_ID}"

# Call the generic create-template script
"${SCRIPT_DIR}/create-template.sh" \
    "$TEMPLATE_NAME" \
    "$CHANNEL_ID" \
    "channel" \
    "$DESCRIPTION" \
    "$ORG_ID" \
    "$BASE_URL"
