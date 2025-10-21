#!/bin/bash

# Script to migrate hardcoded colors in ChatPanel/styles.css to design system tokens

FILE="/home/sv/project/aiser-world/packages/chat2chart/client/src/app/(dashboard)/chat/components/ChatPanel/styles.css"

echo "🔄 Migrating hardcoded colors in ChatPanel/styles.css..."

# Replace hardcoded colors with design system tokens
sed -i 's/#007bff/var(--color-brand-primary)/g' "$FILE"
sed -i 's/#6c757d/var(--color-text-secondary)/g' "$FILE"
sed -i 's/#ff4d4f/var(--color-functional-danger)/g' "$FILE"
sed -i 's/#e6f7ff/var(--color-brand-primary-light)/g' "$FILE"
sed -i 's/#f6ffed/var(--color-functional-success-light)/g' "$FILE"
sed -i 's/#52c41a/var(--color-functional-success)/g' "$FILE"
sed -i 's/#389e0d/var(--color-functional-success-dark)/g' "$FILE"
sed -i 's/#ccc/var(--color-border-primary)/g' "$FILE"
sed -i 's/#fff3cd/var(--color-functional-warning-light)/g' "$FILE"
sed -i 's/#856404/var(--color-functional-warning-dark)/g' "$FILE"
sed -i 's/#ffeaa7/var(--color-functional-warning-light)/g' "$FILE"
sed -i 's/#2d1b0e/var(--color-functional-warning-dark)/g' "$FILE"
sed -i 's/#ffd666/var(--color-functional-warning)/g' "$FILE"
sed -i 's/#8b6a0f/var(--color-functional-warning-dark)/g' "$FILE"
sed -i 's/#1890ff/var(--color-brand-primary)/g' "$FILE"
sed -i 's/#91d5ff/var(--color-brand-primary-light)/g' "$FILE"
sed -i 's/#b7eb8f/var(--color-functional-success-light)/g' "$FILE"
sed -i 's/#fff7e6/var(--color-functional-warning-light)/g' "$FILE"
sed -i 's/#fa8c16/var(--color-functional-warning)/g' "$FILE"
sed -i 's/#ffd591/var(--color-functional-warning-light)/g' "$FILE"
sed -i 's/#f9f0ff/var(--color-brand-primary-light)/g' "$FILE"
sed -i 's/#722ed1/var(--color-brand-primary-dark)/g' "$FILE"
sed -i 's/#d3adf7/var(--color-brand-primary-light)/g' "$FILE"
sed -i 's/#fff2e8/var(--color-functional-warning-light)/g' "$FILE"
sed -i 's/#fa541c/var(--color-functional-warning)/g' "$FILE"
sed -i 's/#ffbb96/var(--color-functional-warning-light)/g' "$FILE"

echo "✅ ChatPanel/styles.css color migration completed!"
