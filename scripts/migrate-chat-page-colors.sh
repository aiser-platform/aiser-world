#!/bin/bash

# Script to migrate remaining hardcoded colors in chat/page.tsx to design system tokens

FILE="/home/sv/project/aiser-world/packages/chat2chart/client/src/app/(dashboard)/chat/page.tsx"

echo "🔄 Migrating remaining hardcoded colors in chat/page.tsx..."

# Replace hardcoded colors with design system tokens
sed -i 's/#fa8c16/var(--color-functional-warning)/g' "$FILE"
sed -i 's/#d9d9d9/var(--color-border-primary)/g' "$FILE"
sed -i 's/#f5f5f5/var(--color-surface-raised)/g' "$FILE"

echo "✅ chat/page.tsx color migration completed!"
