#!/bin/bash

# Script to migrate hardcoded colors in EChartsOptionGenerator.tsx to design system tokens

FILE="/home/sv/project/aiser-world/packages/chat2chart/client/src/app/(dashboard)/dash-studio/components/EChartsConfiguration/EChartsOptionGenerator.tsx"

echo "🔄 Migrating hardcoded colors in EChartsOptionGenerator.tsx..."

# Replace hardcoded colors with design system tokens
sed -i 's/#54555a/var(--color-text-secondary)/g' "$FILE"
sed -i 's/#dbdee4/var(--color-border-primary)/g' "$FILE"
sed -i 's/#67e0e3/var(--color-functional-info)/g' "$FILE"
sed -i 's/#37a2da/var(--color-brand-primary)/g' "$FILE"
sed -i 's/#fd666d/var(--color-functional-danger)/g' "$FILE"

echo "✅ EChartsOptionGenerator.tsx color migration completed!"
