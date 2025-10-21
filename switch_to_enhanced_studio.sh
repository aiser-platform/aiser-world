#!/bin/bash

# Script to switch to the Enhanced Dashboard Studio
echo "🚀 Switching to Enhanced Dashboard Studio..."

# Backup the current page.tsx
cp packages/chat2chart/client/src/app/\(dashboard\)/dash-studio/page.tsx packages/chat2chart/client/src/app/\(dashboard\)/dash-studio/page.tsx.backup

# Create the enhanced version
cat > packages/chat2chart/client/src/app/\(dashboard\)/dash-studio/page.tsx << 'EOF'
'use client';

import nextDynamic from 'next/dynamic';

// Use the Enhanced Simplified Dashboard Studio
const SimplifiedDashboardStudioWrapper = nextDynamic(() => import('./components/SimplifiedDashboardStudio'), {
  ssr: false,
  loading: () => (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      fontSize: '18px'
    }}>
      Loading Enhanced Dashboard Studio...
    </div>
  )
});

export const dynamic = 'force-dynamic';

export default function DashStudioPage() {
  return <SimplifiedDashboardStudioWrapper />;
}
EOF

echo "✅ Enhanced Dashboard Studio activated!"
echo ""
echo "🌐 Access the enhanced version at:"
echo "   http://localhost:3000/dash-studio"
echo ""
echo "🔑 Sign in with:"
echo "   Email: admin@aiser.app"
echo "   Password: password123"
echo ""
echo "📋 Features available:"
echo "   ✅ Single source of truth architecture"
echo "   ✅ Real-time property updates"
echo "   ✅ Smooth widget movement and resize"
echo "   ✅ Professional UI with all enterprise features"
echo "   ✅ Export, publish, share, embed functionality"
echo "   ✅ SQL editor and settings panel"
echo "   ✅ Undo/redo and collaboration"
echo ""
echo "🎯 Ready to use! Enjoy the enhanced dashboard studio!"
