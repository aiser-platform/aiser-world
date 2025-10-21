#!/bin/bash

# Script to migrate hardcoded colors in ChartWidget.tsx to design system tokens

FILE="/home/sv/project/aiser-world/packages/chat2chart/client/src/app/(dashboard)/dash-studio/components/ChartWidget.tsx"

echo "Migrating hardcoded colors in ChartWidget.tsx..."

# Replace common hardcoded colors with design system tokens
sed -i 's/#0f1419/var(--layout-background)/g' "$FILE"
sed -i 's/#ffffff/var(--color-surface-base)/g' "$FILE"
sed -i 's/#404040/var(--color-border-primary)/g' "$FILE"
sed -i 's/#d9d9d9/var(--color-border-primary)/g' "$FILE"
sed -i 's/#333333/var(--color-border-primary)/g' "$FILE"
sed -i 's/#cccccc/var(--color-text-tertiary)/g' "$FILE"
sed -i 's/#666666/var(--color-text-secondary)/g' "$FILE"
sed -s 's/#000000/var(--color-text-primary)/g' "$FILE"
sed -i 's/#fff/var(--color-text-primary)/g' "$FILE"
sed -i 's/#ccc/var(--color-text-tertiary)/g' "$FILE"
sed -i 's/#666/var(--color-text-secondary)/g' "$FILE"
sed -i 's/#0f172a/var(--layout-background)/g' "$FILE"
sed -i 's/#e2e8f0/var(--color-text-primary)/g' "$FILE"

echo "Migration completed!"
