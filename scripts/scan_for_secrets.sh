#!/bin/bash
# Scan codebase for potential hardcoded secrets
# Usage: ./scripts/scan_for_secrets.sh

set -e

echo "═══════════════════════════════════════════════════════════"
echo "  Aiser Platform - Security Secret Scanner"
echo "═══════════════════════════════════════════════════════════"
echo ""

RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m'

ISSUES_FOUND=0

echo "Scanning for potential hardcoded secrets..."
echo "-----------------------------------------------------------"
echo ""

# Patterns to search for
PATTERNS=(
    "password\s*=\s*['\"][^'\"]+['\"]"
    "api_key\s*=\s*['\"][^'\"]+['\"]"
    "secret\s*=\s*['\"][^'\"]+['\"]"
    "token\s*=\s*['\"][^'\"]+['\"]"
    "AWS_ACCESS_KEY"
    "AZURE_.*_KEY"
    "OPENAI_API_KEY\s*=\s*['\"]sk-"
    "mongodb://.*:.*@"
    "postgresql://.*:.*@"
)

# Directories to scan
DIRS=("packages/chat2chart" "packages/auth" "packages/shared")

for DIR in "${DIRS[@]}"; do
    if [ ! -d "$DIR" ]; then
        continue
    fi
    
    echo "Scanning: $DIR"
    echo "-----------------------------------------------------------"
    
    for PATTERN in "${PATTERNS[@]}"; do
        RESULTS=$(grep -r -E "$PATTERN" "$DIR" \
            --include="*.py" \
            --include="*.ts" \
            --include="*.tsx" \
            --include="*.js" \
            --include="*.jsx" \
            --include="*.json" \
            --exclude="*.test.*" \
            --exclude="*.spec.*" \
            --exclude="package-lock.json" \
            --exclude="yarn.lock" \
            2>/dev/null || true)
        
        if [ -n "$RESULTS" ]; then
            echo -e "${YELLOW}⚠ Potential secret found (pattern: $PATTERN):${NC}"
            echo "$RESULTS" | head -5
            echo ""
            ((ISSUES_FOUND++))
        fi
    done
done

echo ""
echo "Checking for .env files (should only have .env.example)..."
echo "-----------------------------------------------------------"

ENV_FILES=$(find . -name ".env" -not -path "*/node_modules/*" -not -path "*/.git/*" 2>/dev/null)
if [ -n "$ENV_FILES" ]; then
    echo -e "${RED}❌ Found .env files (should be .env.example only):${NC}"
    echo "$ENV_FILES"
    echo ""
    ((ISSUES_FOUND++))
else
    echo -e "${GREEN}✓${NC} No .env files found (good!)"
fi

echo ""
echo "═══════════════════════════════════════════════════════════"

if [ $ISSUES_FOUND -eq 0 ]; then
    echo -e "${GREEN}✅ No hardcoded secrets detected!${NC}"
    echo "═══════════════════════════════════════════════════════════"
    exit 0
else
    echo -e "${RED}❌ Found $ISSUES_FOUND potential security issues${NC}"
    echo "═══════════════════════════════════════════════════════════"
    echo ""
    echo "Please review the findings above and:"
    echo "  1. Remove hardcoded secrets"
    echo "  2. Use environment variables instead"
    echo "  3. Update .env.example with placeholder values"
    echo ""
    exit 1
fi

