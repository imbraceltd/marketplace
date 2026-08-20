#!/bin/bash

# Script to create an AI Assistant template
# Usage: ./create-assistant-template.sh <name> <assistant_id> [description] [org_id] [base_url]

set -e

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Color codes for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_info() {
    echo -e "${GREEN}[ASSISTANT TEMPLATE]${NC} $1"
}

# Check arguments
if [ $# -lt 2 ]; then
    echo "Usage: $0 <name> <assistant_id> [description] [org_id] [base_url]"
    echo ""
    echo "Creates an AI Assistant template from an existing assistant"
    echo ""
    echo "Arguments:"
    echo "  name         - Template name (e.g., 'Customer Support Assistant')"
    echo "  assistant_id - Assistant ID (e.g., 'assistant_789abc')"
    echo "  description  - Template description (optional)"
    echo "  org_id       - Organization ID (default: org_imbrace)"
    echo "  base_url     - Base URL (default: http://localhost:9982)"
    echo ""
    echo "Example:"
    echo "  $0 \"Support Assistant\" \"assistant_789abc\" \"AI assistant for customer support\""
    exit 1
fi

# Load environment variables from .env file if it exists
if [ -f "$SCRIPT_DIR/.env" ]; then
    set -a
    source "$SCRIPT_DIR/.env"
    set +a
fi

TEMPLATE_NAME="$1"
ASSISTANT_ID="$2"
DESCRIPTION="${3:-AI Assistant template for ${TEMPLATE_NAME}}"
ORG_ID="${4:-${MARKETPLACE_ORG_ID:-org_imbrace}}"
BASE_URL="${5:-${MARKETPLACE_BASE_URL:-http://localhost:9982}}"

print_info "Creating AI Assistant template..."
print_info "Name: ${TEMPLATE_NAME}"
print_info "Assistant ID: ${ASSISTANT_ID}"

# Call the generic create-template script
"${SCRIPT_DIR}/create-template.sh" \
    "$TEMPLATE_NAME" \
    "$ASSISTANT_ID" \
    "ai_assistant" \
    "$DESCRIPTION" \
    "$ORG_ID" \
    "$BASE_URL"
