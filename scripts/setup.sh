#!/bin/bash

# Setup script for marketplace template creation
# Run this once to configure your environment

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}==================================${NC}"
echo -e "${BLUE}Template Scripts Setup${NC}"
echo -e "${BLUE}==================================${NC}"
echo ""

# 1. Check if .env exists
if [ -f "$SCRIPT_DIR/.env" ]; then
    echo -e "${YELLOW}⚠ .env file already exists${NC}"
    read -p "Do you want to overwrite it? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Keeping existing .env file"
    else
        cp "$SCRIPT_DIR/.env.example" "$SCRIPT_DIR/.env"
        echo -e "${GREEN}✓ .env file created from .env.example${NC}"
    fi
else
    cp "$SCRIPT_DIR/.env.example" "$SCRIPT_DIR/.env"
    echo -e "${GREEN}✓ .env file created from .env.example${NC}"
fi

echo ""

# 2. Make scripts executable
echo "Making scripts executable..."
chmod +x "$SCRIPT_DIR"/*.sh
echo -e "${GREEN}✓ All scripts are now executable${NC}"

echo ""

# 3. Check for jq
if ! command -v jq &> /dev/null; then
    echo -e "${YELLOW}⚠ jq is not installed${NC}"
    echo "jq is required for JSON processing"
    echo ""
    echo "Install jq:"
    echo "  macOS:        brew install jq"
    echo "  Ubuntu/Debian: sudo apt-get install jq"
    echo "  CentOS/RHEL:   sudo yum install jq"
    echo ""
else
    echo -e "${GREEN}✓ jq is installed${NC}"
fi

echo ""

# 4. Create output directory
mkdir -p "$SCRIPT_DIR/templates-output"
echo -e "${GREEN}✓ Output directory created: templates-output/${NC}"

echo ""

# 5. Prompt for configuration
echo -e "${BLUE}Configuration${NC}"
echo "Please edit the .env file with your values:"
echo ""
read -p "Enter Marketplace Base URL [http://localhost:9982]: " base_url
base_url=${base_url:-http://localhost:9982}

read -p "Enter Organization ID [org_imbrace]: " org_id
org_id=${org_id:-org_imbrace}

# Update .env file
cat > "$SCRIPT_DIR/.env" <<EOF
# Marketplace Template Creation Scripts Configuration
# Copy this file to .env and update with your values

# Base URL for the marketplace API
MARKETPLACE_BASE_URL=${base_url}

# Default organization ID
MARKETPLACE_ORG_ID=${org_id}
EOF

echo ""
echo -e "${GREEN}✓ Configuration saved to .env${NC}"

echo ""
echo -e "${BLUE}==================================${NC}"
echo -e "${GREEN}Setup Complete!${NC}"
echo -e "${BLUE}==================================${NC}"
echo ""
echo "Next steps:"
echo "  1. Review/edit .env file if needed"
echo "  2. Test with: ./create-board-template.sh \"Test\" \"brd_123\" \"Test template\""
echo "  3. For batch processing: cp templates-config.example.json my-config.json"
echo ""
