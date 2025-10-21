#!/bin/bash

# Script to migrate hardcoded colors in HistoryPanel/styles.css to design system tokens

FILE="/home/sv/project/aiser-world/packages/chat2chart/client/src/app/(dashboard)/chat/components/HistoryPanel/styles.css"

echo "🔄 Migrating hardcoded colors in HistoryPanel/styles.css..."

# Replace hardcoded colors with design system tokens
sed -i 's/#edf2ff/var(--color-brand-primary-light)/g' "$FILE"
sed -i 's/#e6f4ff/var(--color-brand-primary-light)/g' "$FILE"
sed -i 's/#ffffff/var(--color-surface-base)/g' "$FILE"
sed -i 's/#f0f0f0/var(--color-border-primary)/g' "$FILE"
sed -i 's/#141414/var(--color-text-primary)/g' "$FILE"
sed -i 's/#e8e8e8/var(--color-text-secondary)/g' "$FILE"
sed -i 's/#1f1f1f/var(--layout-background)/g' "$FILE"
sed -i 's/#303030/var(--color-border-secondary)/g' "$FILE"

echo "✅ HistoryPanel/styles.css color migration completed!"
