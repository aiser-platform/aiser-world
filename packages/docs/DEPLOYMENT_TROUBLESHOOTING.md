# 🚨 Deployment Troubleshooting: 404 "Site not found"

## Problem: GitHub Pages Returns 404

**Error:** "There isn't a GitHub Pages site here."

This means **the deployment isn't working** - the gh-pages branch either doesn't exist or GitHub Pages isn't configured to serve it.

## ✅ Step-by-Step Fix

### 1. Verify gh-pages Branch Exists

**Check:** https://github.com/aiser-platform/aiser-world/tree/gh-pages

**If branch doesn't exist:**
- ❌ Deployment action failed
- Check workflow logs for errors
- See steps below

**If branch exists but is empty:**
- ❌ Deployment didn't push files
- Check workflow logs
- Verify build directory exists

### 2. Check Organization Pages Settings

**Go to:** https://github.com/organizations/aiser-platform/settings/pages

**Required:**
- ✅ Pages must be **enabled** for the organization
- ✅ Organization owners must enable this

**If disabled:**
1. Enable Pages
2. Save
3. Re-run workflow

### 3. Check Repository Pages Settings

**Go to:** https://github.com/aiser-platform/aiser-world/settings/pages

**Required:**
- ✅ Source: **"GitHub Actions"** (NOT "Deploy from a branch")
- ✅ No error messages
- ✅ Pages is enabled

**If wrong:**
1. Set Source to "GitHub Actions"
2. Save
3. Re-run workflow

### 4. Check Workflow Permissions

**Go to:** https://github.com/aiser-platform/aiser-world/settings/actions

**Required:**
- ✅ "Read and write permissions" enabled
- ✅ "Allow GitHub Actions to create and approve pull requests" checked

**If wrong:**
1. Change to "Read and write permissions"
2. Save
3. Re-run workflow

### 5. Verify Domain Verification (for aicser.com)

**Go to:** https://github.com/organizations/aiser-platform/settings/pages

**To add verified domain:**
1. Scroll to "Custom domains" section
2. Click "Add domain"
3. Enter: `aicser.com`
4. Follow DNS verification steps
5. Add TXT record to your DNS provider
6. Wait for verification

**Note:** Domain verification is separate from Pages deployment. Pages can work without verified domain, but custom domain requires verification.

### 6. Check Workflow Logs

**Go to:** https://github.com/aiser-platform/aiser-world/actions

1. Find latest "Deploy Documentation to GitHub Pages" run
2. Click on it
3. Check "Deploy to GitHub Pages" step
4. Look for errors

**Common errors:**
- `Permission denied` → Fix workflow permissions
- `Branch not found` → Check if gh-pages exists
- `Path not found` → Check build directory
- `Token invalid` → Check GITHUB_TOKEN permissions

### 7. Verify Build Output

**In workflow logs, check "Verify build output" step:**

Should show:
- ✅ `index.html exists`
- ✅ `CNAME exists: docs.aicser.com`
- ✅ `.nojekyll exists`

**If missing:**
- Build failed
- Check "Build documentation" step

## 🔧 Quick Fix Checklist

- [ ] Organization Pages enabled: https://github.com/organizations/aiser-platform/settings/pages
- [ ] Repository Pages enabled: https://github.com/aiser-platform/aiser-world/settings/pages
- [ ] Source = "GitHub Actions"
- [ ] Workflow permissions = "Read and write"
- [ ] gh-pages branch exists: https://github.com/aiser-platform/aiser-world/tree/gh-pages
- [ ] gh-pages branch has files (index.html, CNAME, .nojekyll)
- [ ] Build step completed successfully
- [ ] Deployment step completed without errors
- [ ] Domain verified (if using custom domain): https://github.com/organizations/aiser-platform/settings/pages

## 🆘 Still Not Working?

### Check These in Order:

1. **Organization Pages:**
   - Must be enabled at org level
   - Only org owners can enable

2. **Repository Pages:**
   - Source must be "GitHub Actions"
   - No errors displayed

3. **Workflow Permissions:**
   - Must be "Read and write"
   - Check Actions → General settings

4. **gh-pages Branch:**
   - Must exist
   - Must have files
   - Check commit history

5. **Workflow Logs:**
   - Check for errors in deployment step
   - Verify build succeeded

### Manual Test:

1. **Re-run workflow manually:**
   - Go to Actions
   - Click "Deploy Documentation to GitHub Pages"
   - Click "Run workflow" → "Run workflow"

2. **Wait 5-10 minutes** after workflow completes

3. **Check gh-pages branch:**
   - Should see new commit
   - Should see files

4. **Try accessing:**
   - https://aiser-platform.github.io/aiser-world/
   - Should work if deployment succeeded

## 📞 Need Help?

- [Telegram Community](https://t.me/+XyM6Y-8MnWU2NTM1)
- [GitHub Issues](https://github.com/aiser-platform/aiser-world/issues)

---

**Most Common Fix:** Enable Organization Pages and set Repository Pages Source to "GitHub Actions"

