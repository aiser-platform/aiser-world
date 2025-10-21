#!/bin/bash

# Color Migration Script for Aiser Design System
# This script migrates hardcoded colors to design tokens

set -e

echo "🎨 Starting Design System Color Migration..."

# Function to migrate colors in a file
migrate_file() {
    local file=$1
    echo "  Migrating: $file"
    
    # Brand Colors
    sed -i "s/#1890ff/var(--color-brand-primary)/g" "$file"
    sed -i "s/#1677ff/var(--color-brand-primary)/g" "$file"
    sed -i "s/#4096ff/var(--color-brand-primary-hover)/g" "$file"
    sed -i "s/'#1890ff'/'var(--color-brand-primary)'/g" "$file"
    sed -i "s/\"#1890ff\"/\"var(--color-brand-primary)\"/g" "$file"
    
    # Functional Colors - Success
    sed -i "s/#52c41a/var(--color-functional-success)/g" "$file"
    sed -i "s/#3f8600/var(--color-functional-success)/g" "$file"
    sed -i "s/'#52c41a'/'var(--color-functional-success)'/g" "$file"
    
    # Functional Colors - Danger
    sed -i "s/#ff4d4f/var(--color-functional-danger)/g" "$file"
    sed -i "s/#cf1322/var(--color-functional-danger)/g" "$file"
    sed -i "s/'#ff4d4f'/'var(--color-functional-danger)'/g" "$file"
    
    # Functional Colors - Warning
    sed -i "s/#faad14/var(--color-functional-warning)/g" "$file"
    sed -i "s/#fa8c16/var(--color-functional-warning)/g" "$file"
    sed -i "s/'#faad14'/'var(--color-functional-warning)'/g" "$file"
    
    # Functional Colors - Info
    sed -i "s/#722ed1/var(--color-functional-info)/g" "$file"
    sed -i "s/#13c2c2/var(--color-functional-info)/g" "$file"
    sed -i "s/#2f54eb/var(--color-brand-primary)/g" "$file"
    sed -i "s/'#722ed1'/'var(--color-functional-info)'/g" "$file"
    
    # Backgrounds
    sed -i "s/backgroundColor: '#f0f0f0'/backgroundColor: 'var(--color-surface-raised)'/g" "$file"
    sed -i "s/background: '#f0f0f0'/background: 'var(--color-surface-raised)'/g" "$file"
    sed -i "s/backgroundColor: '#fafafa'/backgroundColor: 'var(--color-surface-raised)'/g" "$file"
    
    # Text Colors
    sed -i "s/color: '#666666'/color: 'var(--color-text-secondary)'/g" "$file"
    sed -i "s/color: '#999999'/color: 'var(--color-text-tertiary)'/g" "$file"
    
    # Font Sizes
    sed -i "s/fontSize: '12px'/fontSize: 'var(--font-size-sm)'/g" "$file"
    sed -i "s/fontSize: '14px'/fontSize: 'var(--font-size-base)'/g" "$file"
    sed -i "s/fontSize: '16px'/fontSize: 'var(--font-size-md)'/g" "$file"
}

# Find and migrate all dashboard files
echo "📁 Finding files to migrate..."

# Dashboard Studio components
for file in packages/chat2chart/client/src/app/\(dashboard\)/dash-studio/components/*.tsx; do
    if [ -f "$file" ] && grep -q "#[0-9a-f]\{6\}" "$file" 2>/dev/null; then
        migrate_file "$file"
    fi
done

# Chat components
for file in packages/chat2chart/client/src/app/\(dashboard\)/chat/components/**/*.tsx; do
    if [ -f "$file" ] && grep -q "#[0-9a-f]\{6\}" "$file" 2>/dev/null; then
        migrate_file "$file"
    fi
done

# Other pages
for file in packages/chat2chart/client/src/app/\(dashboard\)/{team,billing,ai-analytics,projects}/page.tsx; do
    if [ -f "$file" ] && grep -q "#[0-9a-f]\{6\}" "$file" 2>/dev/null; then
        migrate_file "$file"
    fi
done

echo "✅ Migration complete!"
echo ""
echo "📊 Summary:"
echo "  - Brand colors migrated"
echo "  - Functional colors migrated"
echo "  - Background colors migrated"
echo "  - Font sizes migrated"
echo ""
echo "⚠️  Please review changes and test in both light and dark modes!"
