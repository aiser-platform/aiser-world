#!/bin/bash

# Script to migrate hardcoded colors in DashboardConfigProvider.tsx to design system tokens

FILE="/home/sv/project/aiser-world/packages/chat2chart/client/src/app/(dashboard)/dash-studio/components/DashboardConfiguration/DashboardConfigProvider.tsx"

echo "🔄 Migrating hardcoded colors in DashboardConfigProvider.tsx..."

# Replace hardcoded colors with design system tokens
sed -i 's/#ffffff/var(--color-surface-base)/g' "$FILE"
sed -i 's/#1890ff/var(--color-brand-primary)/g' "$FILE"
sed -i 's/#52c41a/var(--color-functional-success)/g' "$FILE"
sed -i 's/#262626/var(--color-text-primary)/g' "$FILE"
sed -i 's/#fa8c16/var(--color-functional-warning)/g' "$FILE"
sed -i 's/#d9d9d9/var(--color-border-primary)/g' "$FILE"
sed -i 's/#177ddc/var(--color-brand-primary-dark)/g' "$FILE"
sed -i 's/#49aa19/var(--color-functional-success-dark)/g' "$FILE"
sed -i 's/#141414/var(--layout-background)/g' "$FILE"
sed -i 's/#ffffff/var(--color-surface-base)/g' "$FILE"
sed -i 's/#d89614/var(--color-functional-warning-dark)/g' "$FILE"
sed -i 's/#434343/var(--color-border-secondary)/g' "$FILE"
sed -i 's/#f0f8ff/var(--color-brand-primary-light)/g' "$FILE"
sed -i 's/#91d5ff/var(--color-brand-primary-light)/g' "$FILE"
sed -i 's/#f6ffed/var(--color-functional-success-light)/g' "$FILE"
sed -i 's/#b7eb8f/var(--color-functional-success-light)/g' "$FILE"
sed -i 's/#333333/var(--color-text-primary)/g' "$FILE"
sed -i 's/#666666/var(--color-text-secondary)/g' "$FILE"
sed -i 's/#f0f0f0/var(--color-border-primary)/g' "$FILE"
sed -i 's/#5470c6/var(--color-brand-primary)/g' "$FILE"
sed -i 's/#91cc75/var(--color-functional-success)/g' "$FILE"
sed -i 's/#fac858/var(--color-functional-warning)/g' "$FILE"
sed -i 's/#ee6666/var(--color-functional-danger)/g' "$FILE"
sed -i 's/#73c0de/var(--color-functional-info)/g' "$FILE"

echo "✅ DashboardConfigProvider.tsx color migration completed!"
