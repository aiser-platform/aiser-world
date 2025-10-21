#!/bin/bash

# Script to migrate remaining hardcoded colors in ChatPanel.tsx to design system tokens

FILE="/home/sv/project/aiser-world/packages/chat2chart/client/src/app/(dashboard)/chat/components/ChatPanel/ChatPanel.tsx"

echo "🔄 Migrating remaining hardcoded colors in ChatPanel.tsx..."

# Replace hardcoded colors with design system tokens
sed -i 's/#91cc75/var(--color-functional-success)/g' "$FILE"
sed -i 's/#ffffff/var(--color-surface-base)/g' "$FILE"
sed -i 's/#141414/var(--color-text-primary)/g' "$FILE"
sed -i 's/#ffc107/var(--color-functional-warning)/g' "$FILE"

echo "✅ ChatPanel.tsx color migration completed!"
