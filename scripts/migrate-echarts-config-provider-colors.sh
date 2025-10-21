#!/bin/bash

# Script to migrate hardcoded colors in EChartsConfigProvider.tsx to design system tokens

FILE="/home/sv/project/aiser-world/packages/chat2chart/client/src/app/(dashboard)/dash-studio/components/EChartsConfiguration/EChartsConfigProvider.tsx"

echo "🔄 Migrating hardcoded colors in EChartsConfigProvider.tsx..."

# Replace hardcoded colors with design system tokens
sed -i 's/#ffffff/var(--color-text-primary)/g' "$FILE"
sed -i 's/#cccccc/var(--color-text-secondary)/g' "$FILE"
sed -i 's/#d9d9d9/var(--color-border-primary)/g' "$FILE"
sed -i 's/#5470c6/var(--color-brand-primary)/g' "$FILE"
sed -i 's/#91cc75/var(--color-functional-success)/g' "$FILE"
sed -i 's/#fac858/var(--color-functional-warning)/g' "$FILE"
sed -i 's/#ee6666/var(--color-functional-danger)/g' "$FILE"
sed -i 's/#73c0de/var(--color-functional-info)/g' "$FILE"
sed -i 's/#1f1f1f/var(--layout-background)/g' "$FILE"
sed -i 's/#333333/var(--color-border-secondary)/g' "$FILE"
sed -i 's/#5070dd/var(--color-brand-primary)/g' "$FILE"
sed -i 's/#b6d634/var(--color-functional-success)/g' "$FILE"
sed -i 's/#505372/var(--color-text-tertiary)/g' "$FILE"
sed -i 's/#ff994d/var(--color-functional-warning)/g' "$FILE"
sed -i 's/#0ca8df/var(--color-functional-info)/g' "$FILE"
sed -i 's/#666/var(--color-text-tertiary)/g' "$FILE"
sed -i 's/#333/var(--color-border-secondary)/g' "$FILE"
sed -i 's/#54555a/var(--color-text-secondary)/g' "$FILE"

echo "✅ EChartsConfigProvider.tsx color migration completed!"
