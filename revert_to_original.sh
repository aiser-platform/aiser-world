#!/bin/bash

# Script to revert back to the original MigratedDashboardStudio
echo "🔄 Reverting to Original Dashboard Studio..."

# Restore the backup
if [ -f packages/chat2chart/client/src/app/\(dashboard\)/dash-studio/page.tsx.backup ]; then
    cp packages/chat2chart/client/src/app/\(dashboard\)/dash-studio/page.tsx.backup packages/chat2chart/client/src/app/\(dashboard\)/dash-studio/page.tsx
    echo "✅ Reverted to original MigratedDashboardStudio"
    echo ""
    echo "🌐 Access the original version at:"
    echo "   http://localhost:3000/dash-studio"
    echo ""
    echo "🔄 To switch back to enhanced version, run:"
    echo "   ./switch_to_enhanced_studio.sh"
else
    echo "❌ Backup file not found. Creating original version..."
    
    cat > packages/chat2chart/client/src/app/\(dashboard\)/dash-studio/page.tsx << 'EOF'
'use client';

import nextDynamic from 'next/dynamic';

// Force dynamic rendering to avoid React context issues

const MigratedDashboardStudioWrapper = nextDynamic(() => import('./components/MigratedDashboardStudio'), {
  ssr: false,
  loading: () => (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      fontSize: '18px'
    }}>
      Loading Dashboard Studio...
    </div>
  )
});

export const dynamic = 'force-dynamic';

export default function DashStudioPage() {
  return <MigratedDashboardStudioWrapper />;
}
EOF
    
    echo "✅ Created original MigratedDashboardStudio"
fi
