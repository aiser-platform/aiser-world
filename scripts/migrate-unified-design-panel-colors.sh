#!/bin/bash

# Script to migrate hardcoded colors in UnifiedDesignPanel.tsx to design system tokens

FILE="/home/sv/project/aiser-world/packages/chat2chart/client/src/app/(dashboard)/dash-studio/components/UnifiedDesignPanel.tsx"

echo "Migrating hardcoded colors in UnifiedDesignPanel.tsx..."

# Replace common hardcoded colors with design system tokens
sed -i 's/#141414/var(--layout-background)/g' "$FILE"
sed -i 's/#ffffff/var(--color-surface-base)/g' "$FILE"
sed -i 's/#303030/var(--color-border-primary)/g' "$FILE"
sed -i 's/#d9d9d9/var(--color-border-primary)/g' "$FILE"
sed -i 's/#1f1f1f/var(--color-surface-raised)/g' "$FILE"
sed -i 's/#f5f5f5/var(--color-surface-raised)/g' "$FILE"
sed -i 's/#000000/var(--color-text-primary)/g' "$FILE"
sed -i 's/#666/var(--color-text-secondary)/g' "$FILE"
sed -i 's/#999/var(--color-text-tertiary)/g' "$FILE"
sed -i 's/#eb2f96/var(--color-brand-primary)/g' "$FILE"

echo "Migration completed!"
