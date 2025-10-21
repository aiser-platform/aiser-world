#!/bin/bash

# Script to migrate hardcoded colors in DataPanel/styles.css to design system tokens

FILE="/home/sv/project/aiser-world/packages/chat2chart/client/src/app/(dashboard)/chat/components/DataPanel/styles.css"

echo "🔄 Migrating hardcoded colors in DataPanel/styles.css..."

# Replace hardcoded colors with design system tokens
sed -i 's/#f5f5f5/var(--color-surface-raised)/g' "$FILE"
sed -i 's/#e6f7ff/var(--color-brand-primary-light)/g' "$FILE"
sed -i 's/#1677ff/var(--color-brand-primary)/g' "$FILE"
sed -i 's/#f0f8ff/var(--color-brand-primary-light)/g' "$FILE"
sed -i 's/#d6e4ff/var(--color-brand-primary-light)/g' "$FILE"
sed -i 's/#f6ffed/var(--color-functional-success-light)/g' "$FILE"
sed -i 's/#b7eb8f/var(--color-functional-success-light)/g' "$FILE"
sed -i 's/#1f1f1f/var(--layout-background)/g' "$FILE"
sed -i 's/#e8e8e8/var(--color-text-secondary)/g' "$FILE"
sed -i 's/#262626/var(--color-surface-raised)/g' "$FILE"
sed -i 's/#434343/var(--color-border-secondary)/g' "$FILE"
sed -i 's/#ffffff/var(--color-text-primary)/g' "$FILE"
sed -i 's/#177ddc/var(--color-brand-primary-dark)/g' "$FILE"
sed -i 's/#a6a6a6/var(--color-text-tertiary)/g' "$FILE"
sed -i 's/#8c8c8c/var(--color-text-tertiary)/g' "$FILE"
sed -i 's/#1890ff/var(--color-brand-primary)/g' "$FILE"
sed -i 's/#52c41a/var(--color-functional-success)/g' "$FILE"
sed -i 's/#f0f0f0/var(--color-border-primary)/g' "$FILE"
sed -i 's/#d9d9d9/var(--color-border-primary)/g' "$FILE"
sed -i 's/#fafafa/var(--color-surface-raised)/g' "$FILE"

echo "✅ DataPanel/styles.css color migration completed!"
