# Local Testing Guide for Documentation

## Prerequisites

**Docusaurus 3.1.1 requires Node.js >= 20.0**

Check your Node.js version:
```bash
node --version
```

If you have Node.js < 20, you need to upgrade:
- Using nvm: `nvm install 20 && nvm use 20`
- Or install Node.js 20+ from nodejs.org

## Local Build Test

### 1. Install Dependencies

**For workspace setup (monorepo):**
```bash
# Install from root to properly resolve workspace dependencies
cd /home/sv/project/aicser-world
npm install
```

**Or install directly in docs package:**
```bash
cd packages/docs
npm install
```

**Note:** In a workspace setup, dependencies may be hoisted to the root `node_modules`. If you encounter module resolution errors, install from the root.

### 2. Build Documentation
```bash
npm run build
```

**Expected output:**
- Should complete without errors
- Creates `build/` directory with all files
- `build/index.html` should exist
- `build/CNAME` should contain `docs.aicser.com`

### 3. Verify Build Output
```bash
# Check if index.html exists
test -f build/index.html && echo "✅ index.html exists" || echo "❌ Missing"

# Check CNAME file
cat build/CNAME
# Should show: docs.aicser.com

# List build contents
ls -la build/ | head -20
```

### 4. Test Local Server
```bash
npm run serve
# Or
npx docusaurus serve --port 3005
```

Then visit: `http://localhost:3005`

**Expected:**
- Homepage loads
- All navigation works
- No 404 errors
- Assets load correctly

## Troubleshooting Local Build

### Issue: "Minimum Node.js version not met"

**Error:**
```
[ERROR] Minimum Node.js version not met :(
[INFO] You are using Node.js v18.19.1, Requirement: Node.js >=20.0.
```

**Fix:**
```bash
# Using nvm (recommended)
nvm install 20
nvm use 20

# Verify
node --version  # Should show v20.x.x

# Then rebuild
npm run build
```

### Issue: Build Fails with TypeScript Errors

**Fix:**
```bash
# Clear cache and rebuild
npm run clear
npm install
npm run build
```

### Issue: Old CNAME in Build

If `build/CNAME` shows old domain:
```bash
# Delete old build
rm -rf build/

# Rebuild
npm run build

# Verify CNAME
cat build/CNAME
# Should show: docs.aicser.com
```

## Testing Deployment Locally

### Option 1: Test with Docusaurus Serve
```bash
npm run serve
# Visit http://localhost:3005
```

### Option 2: Test with Static Server
```bash
# After building
cd build
python3 -m http.server 3005
# Or
npx serve -p 3005
```

## Pre-Deployment Checklist

Before pushing to trigger GitHub Actions:

- [ ] Node.js version >= 20 (check with `node --version`)
- [ ] `npm install` completes without errors
- [ ] `npm run build` completes successfully
- [ ] `build/index.html` exists
- [ ] `build/CNAME` contains `docs.aicser.com` (not old domain)
- [ ] `build/` directory has all expected files
- [ ] Local server test works (`npm run serve`)
- [ ] No console errors in browser
- [ ] All navigation links work

## Quick Test Script

```bash
#!/bin/bash
cd packages/docs

echo "Checking Node.js version..."
node --version | grep -q "v2[0-9]" && echo "✅ Node.js >= 20" || echo "❌ Need Node.js >= 20"

echo "Installing dependencies..."
npm install

echo "Building..."
npm run build

echo "Verifying build..."
test -f build/index.html && echo "✅ index.html exists" || echo "❌ index.html missing"
test -f build/CNAME && echo "✅ CNAME exists" || echo "❌ CNAME missing"
grep -q "docs.aicser.com" build/CNAME && echo "✅ CNAME correct" || echo "❌ CNAME wrong domain"

echo "Build complete! Test with: npm run serve"
```

## Common Issues

### 1. Node.js Version Mismatch

**Local:** Node.js 18  
**Required:** Node.js >= 20  
**Workflow:** Now uses Node.js 20 ✅

**Solution:** Upgrade local Node.js or use nvm

### 2. Old Build Artifacts

**Issue:** Old CNAME or missing files

**Solution:**
```bash
rm -rf build/
npm run build
```

### 3. Dependency Issues

**Issue:** npm install fails

**Solution:**
```bash
rm -rf node_modules package-lock.json
npm install
```

### 4. Port Already in Use

**Issue:** Port 3005 already in use

**Solution:**
```bash
# Use different port
npx docusaurus serve --port 3006
```

## Next Steps After Local Test

1. **If local build works:**
   - Push changes to trigger GitHub Actions
   - Verify GitHub Pages source is "GitHub Actions"
   - Wait for deployment (5-10 minutes)
   - Test: `https://docs.aicser.com`

2. **If local build fails:**
   - Fix the errors locally first
   - Don't push until local build works
   - Check Node.js version requirement

---

**Note:** The GitHub Actions workflow now uses Node.js 20, matching the Docusaurus requirement.

