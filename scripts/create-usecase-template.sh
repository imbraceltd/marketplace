#!/bin/bash

# Script to create a Use Case template
# Usage: ./create-usecase-template.sh <name> <usecase_id> [description] [org_id] [base_url]

set -e

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Color codes for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_info() {
    echo -e "${GREEN}[USE CASE TEMPLATE]${NC} $1"
}

# Check arguments
if [ $# -lt 2 ]; then
    echo "Usage: $0 <name> <usecase_id> [description] [org_id] [base_url]"
    echo ""
    echo "Creates a Use Case template from an existing use case"
    echo ""
    echo "Arguments:"
    echo "  name        - Template name (e.g., 'Lead Generation Use Case')"
    echo "  usecase_id  - Use Case ID (e.g., 'uc_d353cf30-97da-4a9c-91e6-43a388349f30')"
    echo "  description - Template description (optional)"
    echo "  org_id      - Organization ID (default: org_imbrace)"
    echo "  base_url    - Base URL (default: http://localhost:9982)"
    echo ""
    echo "Example:"
    echo "  $0 \"Lead Generation\" \"uc_d353cf30-97da-4a9c-91e6-43a388349f30\" \"Complete lead generation solution\""
    exit 1
fi

# Load environment variables from .env file if it exists
if [ -f "$SCRIPT_DIR/.env" ]; then
    set -a
    source "$SCRIPT_DIR/.env"
    set +a
fi

TEMPLATE_NAME="$1"
USECASE_ID="$2"
DESCRIPTION="${3:-Use Case template for ${TEMPLATE_NAME}}"
ORG_ID="${4:-${MARKETPLACE_ORG_ID:-org_imbrace}}"
BASE_URL="${5:-${MARKETPLACE_BASE_URL:-http://localhost:9982}}"

print_info "Creating Use Case template..."
print_info "Name: ${TEMPLATE_NAME}"
print_info "Use Case ID: ${USECASE_ID}"

# Call the generic create-template script
"${SCRIPT_DIR}/create-template.sh" \
    "$TEMPLATE_NAME" \
    "$USECASE_ID" \
    "use_case" \
    "$DESCRIPTION" \
    "$ORG_ID" \
    "$BASE_URL"
