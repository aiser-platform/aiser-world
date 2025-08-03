#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * License checker for Aiser components
 */

const OPEN_SOURCE_PACKAGES = [
  'packages/chat2chart',
  'packages/shared'
];

const ENTERPRISE_PACKAGES = [
  'packages/client',
  'packages/auth'
];

function checkLicense(packagePath) {
  const licensePath = path.join(packagePath, 'LICENSE');
  const packageJsonPath = path.join(packagePath, 'package.json');
  
  let licenseType = 'Unknown';
  let licenseText = '';
  
  if (fs.existsSync(licensePath)) {
    licenseText = fs.readFileSync(licensePath, 'utf8');
    if (licenseText.includes('MIT License')) {
      licenseType = 'MIT (Open Source)';
    } else if (licenseText.includes('ENTERPRISE LICENSE')) {
      licenseType = 'Commercial (Enterprise)';
    }
  }
  
  let packageName = path.basename(packagePath);
  if (fs.existsSync(packageJsonPath)) {
    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      packageName = packageJson.name || packageName;
    } catch (error) {
      // Ignore JSON parse errors
    }
  }
  
  return {
    package: packageName,
    path: packagePath,
    license: licenseType,
    licenseText: licenseText.substring(0, 200) + '...'
  };
}

function main() {
  console.log('🔍 Aiser World License Checker\n');
  
  console.log('📖 OPEN SOURCE COMPONENTS (MIT License)');
  console.log('✅ Free to use, modify, and distribute\n');
  
  OPEN_SOURCE_PACKAGES.forEach(pkg => {
    if (fs.existsSync(pkg)) {
      const info = checkLicense(pkg);
      console.log(`  📦 ${info.package}`);
      console.log(`     License: ${info.license}`);
      console.log(`     Path: ${info.path}\n`);
    }
  });
  
  console.log('💼 ENTERPRISE COMPONENTS (Commercial License)');
  console.log('⚠️  Requires commercial license for production use\n');
  
  ENTERPRISE_PACKAGES.forEach(pkg => {
    if (fs.existsSync(pkg)) {
      const info = checkLicense(pkg);
      console.log(`  📦 ${info.package}`);
      console.log(`     License: ${info.license}`);
      console.log(`     Path: ${info.path}\n`);
    }
  });
  
  console.log('📋 LICENSING SUMMARY');
  console.log('');
  console.log('🆓 Open Source (MIT):');
  console.log('   • Core AI chart generation');
  console.log('   • Basic authentication');
  console.log('   • Shared utilities');
  console.log('   • File-based data sources');
  console.log('');
  console.log('💰 Enterprise (Commercial):');
  console.log('   • Advanced UI/UX');
  console.log('   • SSO/SAML integration');
  console.log('   • Real-time collaboration');
  console.log('   • Database connectors');
  console.log('   • Predictive analytics');
  console.log('');
  console.log('📞 For enterprise licensing:');
  console.log('   Email: licensing@bigstack-analytics.com');
  console.log('   30-day evaluation available');
}

if (require.main === module) {
  main();
}

module.exports = { checkLicense };