#!/bin/bash

# Aiser Design System Token Migration Script
# Replaces old design tokens with new Aiser Design System tokens

echo "🔄 Migrating ChatPanel styles to Aiser Design System..."

# Define token mappings
declare -A token_map=(
    ["--header-background"]="--layout-header-background"
    ["--border-color-light"]="--color-border-primary"
    ["--heading-color"]="--color-text-primary"
    ["--background"]="--layout-background-container"
    ["--text-color-secondary"]="--color-text-secondary"
    ["--primary-color"]="--color-brand-primary"
    ["--radius-lg"]="--ant-border-radius-lg"
    ["--brand-shadow"]="--shadow-sm"
    ["--font-sans"]="-apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif"
    ["--font-size-base"]="14px"
    ["--line-height-normal"]="1.5"
    ["--transition-base"]="0.3s ease"
)

# File to update
FILE="/home/sv/project/aiser-world/packages/chat2chart/client/src/app/(dashboard)/chat/components/ChatPanel/styles.css"

# Create backup
cp "$FILE" "$FILE.backup"

# Apply token replacements
for old_token in "${!token_map[@]}"; do
    new_token="${token_map[$old_token]}"
    echo "  Replacing $old_token with $new_token"
    sed -i "s|$old_token|$new_token|g" "$FILE"
done

echo "✅ ChatPanel styles migration completed!"
echo "📁 Backup saved as: $FILE.backup"
