#!/bin/bash

# Script to migrate remaining hardcoded colors in ChartWidget.tsx to design system tokens

FILE="/home/sv/project/aiser-world/packages/chat2chart/client/src/app/(dashboard)/dash-studio/components/ChartWidget.tsx"

echo "🔄 Migrating remaining hardcoded colors in ChartWidget.tsx..."

# Replace hardcoded colors with design system tokens
sed -i 's/#000000/var(--color-text-primary)/g' "$FILE"
sed -i 's/#000/var(--color-text-primary)/g' "$FILE"

echo "✅ ChartWidget.tsx color migration completed!"
