#!/bin/bash

# Script to create a Workflow template
# Usage: ./create-workflow-template.sh <name> <workflow_id> [description] [org_id] [base_url]

set -e

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Color codes for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_info() {
    echo -e "${GREEN}[WORKFLOW TEMPLATE]${NC} $1"
}

# Check arguments
if [ $# -lt 2 ]; then
    echo "Usage: $0 <name> <workflow_id> [description] [org_id] [base_url]"
    echo ""
    echo "Creates a Workflow template from an existing workflow"
    echo ""
    echo "Arguments:"
    echo "  name        - Template name (e.g., 'Sales Pipeline Workflow')"
    echo "  workflow_id - Workflow ID (numeric or string, e.g., '12345' or 'wf_abc123')"
    echo "  description - Template description (optional)"
    echo "  org_id      - Organization ID (default: org_imbrace)"
    echo "  base_url    - Base URL (default: http://localhost:9982)"
    echo ""
    echo "Examples:"
    echo "  $0 \"Sales Pipeline\" \"12345\" \"Automated sales pipeline workflow\""
    echo "  $0 \"Lead Qualification\" \"wf_abc123\" \"Qualify and route leads\""
    exit 1
fi

# Load environment variables from .env file if it exists
if [ -f "$SCRIPT_DIR/.env" ]; then
    set -a
    source "$SCRIPT_DIR/.env"
    set +a
fi

TEMPLATE_NAME="$1"
WORKFLOW_ID="$2"
DESCRIPTION="${3:-Workflow template for ${TEMPLATE_NAME}}"
ORG_ID="${4:-${MARKETPLACE_ORG_ID:-org_imbrace}}"
BASE_URL="${5:-${MARKETPLACE_BASE_URL:-http://localhost:9982}}"

print_info "Creating Workflow template..."
print_info "Name: ${TEMPLATE_NAME}"
print_info "Workflow ID: ${WORKFLOW_ID}"

# Call the generic create-template script
"${SCRIPT_DIR}/create-template.sh" \
    "$TEMPLATE_NAME" \
    "$WORKFLOW_ID" \
    "workflow" \
    "$DESCRIPTION" \
    "$ORG_ID" \
    "$BASE_URL"
