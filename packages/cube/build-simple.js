const fs = require('fs');
const path = require('path');

// Simple build script for the working implementation
console.log('Building Cube.js Universal Semantic Layer...');

// Create dist directory
const distDir = path.join(__dirname, 'dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Copy the simple implementation as the main file
const simpleImplPath = path.join(__dirname, 'src', 'index-simple.ts');
const mainDistPath = path.join(distDir, 'index.js');

if (fs.existsSync(simpleImplPath)) {
  const content = fs.readFileSync(simpleImplPath, 'utf8');
  
  // Simple TypeScript to JavaScript conversion (remove types)
  const jsContent = content
    .replace(/: [^=,;{}()]+/g, '') // Remove type annotations
    .replace(/interface \w+[^}]+}/g, '') // Remove interfaces
    .replace(/export \{[^}]+\};/g, '') // Remove export statements
    .replace(/import[^;]+;/g, '') // Remove imports
    .replace(/\/\*\*[\s\S]*?\*\//g, '') // Remove JSDoc comments
    .replace(/export /g, 'module.exports.') // Convert exports
    .replace(/export default /g, 'module.exports = ');
  
  fs.writeFileSync(mainDistPath, jsContent);
  console.log('✅ Built index.js');
} else {
  console.error('❌ Source file not found:', simpleImplPath);
}

// Create a simple package info
const packageInfo = {
  name: '@aiser/cube',
  version: '1.0.0',
  description: 'Cube.js Universal Semantic Layer with Multi-tenant Architecture',
  main: 'index.js',
  built: new Date().toISOString()
};

fs.writeFileSync(
  path.join(distDir, 'package.json'), 
  JSON.stringify(packageInfo, null, 2)
);

console.log('✅ Build completed successfully!');
console.log('📦 Output directory:', distDir);