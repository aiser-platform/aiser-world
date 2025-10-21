#!/bin/bash

# Script to migrate remaining hardcoded colors in WidgetRenderer.tsx to design system tokens

FILE="/home/sv/project/aiser-world/packages/chat2chart/client/src/app/(dashboard)/dash-studio/components/WidgetSystem/WidgetRenderer.tsx"

echo "🔄 Migrating remaining hardcoded colors in WidgetRenderer.tsx..."

# Replace hardcoded colors with design system tokens
sed -i 's/#333/var(--color-text-primary)/g' "$FILE"
sed -i 's/#f5f5f5/var(--color-surface-raised)/g' "$FILE"
sed -i 's/#666/var(--color-text-secondary)/g' "$FILE"

echo "✅ WidgetRenderer.tsx color migration completed!"
