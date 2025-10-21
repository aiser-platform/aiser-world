#!/bin/bash

# Script to migrate hardcoded colors in ConfigurationPanels.tsx to design system tokens

FILE="/home/sv/project/aiser-world/packages/chat2chart/client/src/app/(dashboard)/dash-studio/components/EChartsConfiguration/ConfigurationPanels.tsx"

echo "🔄 Migrating hardcoded colors in ConfigurationPanels.tsx..."

# Replace hardcoded colors with design system tokens
sed -i 's/#1890ff/var(--color-brand-primary)/g' "$FILE"
sed -i 's/#52c41a/var(--color-functional-success)/g' "$FILE"
sed -i 's/#fa8c16/var(--color-functional-warning)/g' "$FILE"
sed -i 's/#eb2f96/var(--color-functional-danger)/g' "$FILE"
sed -i 's/#f0f0f0/var(--color-surface-raised)/g' "$FILE"
sed -i 's/#5470c6/var(--color-brand-primary)/g' "$FILE"
sed -i 's/#91cc75/var(--color-functional-success)/g' "$FILE"
sed -i 's/#fac858/var(--color-functional-warning)/g' "$FILE"
sed -i 's/#ee6666/var(--color-functional-danger)/g' "$FILE"
sed -i 's/#73c0de/var(--color-functional-info)/g' "$FILE"
sed -i 's/#000000/var(--color-text-primary)/g' "$FILE"
sed -i 's/#54555a/var(--color-text-secondary)/g' "$FILE"
sed -i 's/#333/var(--color-border-secondary)/g' "$FILE"
sed -i 's/#fff/var(--color-text-primary)/g' "$FILE"

echo "✅ ConfigurationPanels.tsx color migration completed!"
