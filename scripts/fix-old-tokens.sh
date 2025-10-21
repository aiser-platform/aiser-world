#!/bin/bash

# Fix Old Design Token Names
# This script updates all old --brand-* tokens to new design system tokens

set -e

echo "🔧 Fixing old design token names..."

# Function to update tokens in a file
fix_tokens() {
    local file=$1
    echo "  Updating: $file"
    
    # Background tokens
    sed -i 's/--brand-bg-sidebar/--layout-sidebar-background/g' "$file"
    sed -i 's/--brand-bg-elevated/--layout-header-background/g' "$file"
    sed -i 's/--brand-bg-panel/--layout-panel-background/g' "$file"
    sed -i 's/--brand-bg-muted/--color-surface-raised/g' "$file"
    sed -i 's/--brand-bg\b/--layout-background/g' "$file"
    
    # Text tokens
    sed -i 's/--brand-text-secondary/--color-text-secondary/g' "$file"
    sed -i 's/--brand-text-tertiary/--color-text-tertiary/g' "$file"
    sed -i 's/--brand-text\b/--color-text-primary/g' "$file"
    
    # Border tokens
    sed -i 's/--brand-border-light/--color-border-secondary/g' "$file"
    sed -i 's/--brand-border\b/--color-border-primary/g' "$file"
    
    # Shadow tokens
    sed -i 's/--brand-shadow-xs/--shadow-xs/g' "$file"
    sed -i 's/--brand-shadow-sm/--shadow-sm/g' "$file"
    sed -i 's/--brand-shadow-md/--shadow-md/g' "$file"
    sed -i 's/--brand-shadow-lg/--shadow-lg/g' "$file"
    
    # Color tokens
    sed -i 's/--brand-primary-foreground/--color-brand-primary-foreground/g' "$file"
    sed -i 's/--brand-primary\b/--color-brand-primary/g' "$file"
    
    # Success/Error/Warning
    sed -i 's/--color-success\b/--color-functional-success/g' "$file"
    sed -i 's/--color-error\b/--color-functional-danger/g' "$file"
    sed -i 's/--color-warning\b/--color-functional-warning/g' "$file"
    sed -i 's/--color-info\b/--color-functional-info/g' "$file"
}

# Find all files with old tokens
echo "📁 Finding files with old tokens..."

# CSS files
for file in $(find packages/chat2chart/client/src -name "*.css" -type f); do
    if grep -q "\-\-brand-\|--color-success\|--color-error\|--color-warning" "$file" 2>/dev/null; then
        fix_tokens "$file"
    fi
done

# TypeScript/TSX files
for file in $(find packages/chat2chart/client/src/app -name "*.tsx" -type f); do
    if grep -q "\-\-brand-\|--color-success\|--color-error\|--color-warning" "$file" 2>/dev/null; then
        fix_tokens "$file"
    fi
done

# Layout files
for file in $(find packages/chat2chart/client/src/layouts -name "*.tsx" -type f); do
    if grep -q "\-\-brand-\|--color-success\|--color-error\|--color-warning" "$file" 2>/dev/null; then
        fix_tokens "$file"
    fi
done

echo "✅ Token migration complete!"
echo ""
echo "📊 Summary:"
echo "  - Updated all --brand-* tokens to new design system"
echo "  - Updated functional color tokens (success, error, warning, info)"
echo "  - Updated shadow tokens"
echo ""
echo "⚠️  Please verify changes and test in both light and dark modes!"
