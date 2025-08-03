#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Setup script for shared package
 */
function setupShared() {
  console.log('🔧 Setting up shared package...');
  
  // Build shared package
  const sharedDir = path.join(__dirname, '..', 'packages', 'shared');
  
  if (fs.existsSync(sharedDir)) {
    console.log('✅ Shared package directory exists');
    
    // Check if TypeScript is available
    try {
      require.resolve('typescript');
      console.log('✅ TypeScript is available');
    } catch (error) {
      console.log('⚠️  TypeScript not found, skipping build');
      return;
    }
    
    // Build the shared package
    const { execSync } = require('child_process');
    try {
      console.log('🏗️  Building shared package...');
      execSync('npm run build', { 
        cwd: sharedDir, 
        stdio: 'inherit' 
      });
      console.log('✅ Shared package built successfully');
    } catch (error) {
      console.log('⚠️  Failed to build shared package:', error.message);
    }
  } else {
    console.log('⚠️  Shared package directory not found');
  }
}

if (require.main === module) {
  setupShared();
}

module.exports = { setupShared };