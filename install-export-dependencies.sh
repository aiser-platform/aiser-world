#!/bin/bash

# Install missing dependencies for ExportService
echo "Installing missing dependencies for ExportService..."

# Navigate to the client directory
cd /home/sv/project/aiser-world/packages/chat2chart/client

# Install xlsx package
echo "Installing xlsx package..."
npm install xlsx

# Verify installation
echo "Verifying installation..."
npm list xlsx

echo "Dependencies installation complete!"
echo ""
echo "ExportService now supports:"
echo "✅ PNG Export (html2canvas)"
echo "✅ PDF Export (jsPDF)"  
echo "✅ CSV Export (built-in)"
echo "✅ Excel Export (xlsx)"


