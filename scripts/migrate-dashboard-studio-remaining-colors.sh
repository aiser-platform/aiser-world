#!/bin/bash

# Script to migrate remaining hardcoded colors in DashboardStudio.tsx to design system tokens

FILE="/home/sv/project/aiser-world/packages/chat2chart/client/src/app/(dashboard)/dash-studio/components/DashboardStudio.tsx"

echo "🔄 Migrating remaining hardcoded colors in DashboardStudio.tsx..."

# Replace hardcoded colors with design system tokens
sed -i 's/#eb2f96/var(--color-functional-danger)/g' "$FILE"
sed -i 's/#5470c6/var(--color-brand-primary)/g' "$FILE"
sed -i 's/#91cc75/var(--color-functional-success)/g' "$FILE"
sed -i 's/#fac858/var(--color-functional-warning)/g' "$FILE"
sed -i 's/#ee6666/var(--color-functional-danger)/g' "$FILE"
sed -i 's/#73c0de/var(--color-functional-info)/g' "$FILE"
sed -i 's/#333333/var(--color-text-primary)/g' "$FILE"
sed -i 's/#888/var(--color-text-tertiary)/g' "$FILE"
sed -i 's/#777/var(--color-text-tertiary)/g' "$FILE"
sed -i 's/#ffffff/var(--color-text-primary)/g' "$FILE"
sed -i 's/#000000/var(--color-text-primary)/g' "$FILE"
sed -i 's/#f5222d/var(--color-functional-danger)/g' "$FILE"
sed -i 's/#e8e8e8/var(--color-border-primary)/g' "$FILE"
sed -i 's/#141414/var(--color-text-primary)/g' "$FILE"
sed -i 's/#666/var(--color-text-secondary)/g' "$FILE"
sed -i 's/#e8e8e8/var(--color-text-secondary)/g' "$FILE"
sed -i 's/#303030/var(--color-border-secondary)/g' "$FILE"
sed -i 's/#d9d9d9/var(--color-border-primary)/g' "$FILE"
sed -i 's/#999/var(--color-text-tertiary)/g' "$FILE"
sed -i 's/#ccc/var(--color-text-tertiary)/g' "$FILE"

echo "✅ DashboardStudio.tsx color migration completed!"
