# CRITICAL: docs.aicser.com 404 Fix

## Problem
Both URLs return 404:
- ❌ `https://docs.aicser.com/` → 404
- ❌ `https://aiser-platform.github.io/aiser-world/` → 404

## Root Cause
This indicates **GitHub Pages is not serving the site**, likely because:
1. **GitHub Pages source is wrong** - Must be "GitHub Actions", not "Deploy from a branch"
2. **gh-pages branch is empty or missing files**
3. **Organization pages configuration issue**

## IMMEDIATE FIX REQUIRED

### Step 1: Verify GitHub Pages Settings

**Go to:** https://github.com/aiser-platform/aiser-world/settings/pages

**CRITICAL SETTINGS:**
1. **Source**: Must be **"GitHub Actions"** (NOT "Deploy from a branch")
2. **Branch**: Should be grayed out (not selectable when using GitHub Actions)
3. **Custom domain**: Should show `docs.aicser.com`
4. **Enforce HTTPS**: Check this box (after SSL is provisioned)

**If Source shows "Deploy from a branch":**
- Click "GitHub Actions" option
- Save changes
- Wait 1-2 minutes
- Check if site works

### Step 2: Verify gh-pages Branch

**Go to:** https://github.com/aiser-platform/aiser-world/tree/gh-pages

**Required files in root:**
- ✅ `index.html` (must exist)
- ✅ `CNAME` (content: `docs.aicser.com`)
- ✅ `.nojekyll` (empty file)
- ✅ `assets/` directory (with CSS/JS files)

**If files are missing:**
- The deployment workflow may have failed
- Check workflow logs: https://github.com/aiser-platform/aiser-world/actions
- Re-run the workflow if needed

### Step 3: Verify DNS (for custom domain)

**For docs.aicser.com to work, DNS must be configured:**

**At your DNS provider (where aicser.com is managed):**

**Option A: CNAME (Recommended)**
```
Type: CNAME
Name: docs
Value: aiser-platform.github.io
TTL: 3600
```

**Option B: A Records**
```
Type: A
Name: docs
Value: 185.199.108.153

Type: A
Name: docs
Value: 185.199.109.153

Type: A
Name: docs
Value: 185.199.110.153

Type: A
Name: docs
Value: 185.199.111.153
```

### Step 4: Wait for Propagation

- **DNS changes**: 1-24 hours
- **GitHub Pages activation**: 1-5 minutes after source change
- **SSL certificate**: 24-48 hours (first time)

## Verification Steps

### 1. Check GitHub Pages Source
```bash
# Go to: https://github.com/aiser-platform/aiser-world/settings/pages
# Verify: Source = "GitHub Actions"
```

### 2. Check gh-pages Branch
```bash
# Go to: https://github.com/aiser-platform/aiser-world/tree/gh-pages
# Verify: index.html, CNAME, .nojekyll exist
```

### 3. Test URLs
```bash
# Test GitHub Pages URL (should work first)
curl -I https://aiser-platform.github.io/aiser-world/

# Test custom domain (after DNS is configured)
curl -I https://docs.aicser.com/
```

## Expected Behavior After Fix

1. **GitHub Pages URL works first:**
   - `https://aiser-platform.github.io/aiser-world/` → Shows site ✅
   - This should work within 1-5 minutes of setting source to "GitHub Actions"

2. **Custom domain works after DNS:**
   - `https://docs.aicser.com/` → Shows site ✅
   - This works after DNS propagates (1-24 hours)

## If Still Not Working

### Check Workflow Logs
1. Go to: https://github.com/aiser-platform/aiser-world/actions
2. Find latest "Deploy Documentation" workflow run
3. Check for errors in "Deploy to GitHub Pages" step
4. Verify "Verify gh-pages branch" step shows files

### Manual Verification
1. **Check gh-pages branch exists:**
   - https://github.com/aiser-platform/aiser-world/branches
   - Should see `gh-pages` branch

2. **Check branch contents:**
   - https://github.com/aiser-platform/aiser-world/tree/gh-pages
   - Should see `index.html`, `CNAME`, `.nojekyll`

3. **Check GitHub Pages status:**
   - https://github.com/aiser-platform/aiser-world/settings/pages
   - Should show "Your site is live at..." message
   - Should NOT show "There isn't a GitHub Pages site here"

## Most Common Issue

**99% of the time, the issue is:**
- GitHub Pages source is set to **"Deploy from a branch"** instead of **"GitHub Actions"**

**Fix:**
1. Go to repository Settings → Pages
2. Change Source from "Deploy from a branch" to "GitHub Actions"
3. Save
4. Wait 1-2 minutes
5. Test: https://aiser-platform.github.io/aiser-world/

## Next Steps

1. ✅ **Verify GitHub Pages source = "GitHub Actions"**
2. ✅ **Verify gh-pages branch has files**
3. ✅ **Configure DNS for custom domain**
4. ⏳ **Wait for DNS propagation (1-24 hours)**
5. ⏳ **Wait for SSL certificate (24-48 hours)**

