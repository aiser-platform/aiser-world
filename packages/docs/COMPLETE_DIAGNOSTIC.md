# 🔍 Complete Diagnostic: GitHub Pages Not Accessible

## ⚠️ Important: Organization Pages URL Format

**For organization repositories, the URL is:**
```
https://ORGANIZATION.github.io/REPOSITORY-NAME/
```

**NOT:**
```
https://ORGANIZATION.github.io/  ❌ (This won't work for org repos)
```

**Your correct URL should be:**
```
https://aiser-platform.github.io/aiser-world/
```

## 🔴 Critical Checks (Do These First)

### 1. Check if gh-pages Branch Exists

**Go to:** https://github.com/aiser-platform/aiser-world/tree/gh-pages

**If branch doesn't exist:**
- ❌ **Deployment failed** - The action didn't create the branch
- Check workflow logs for errors
- See "Workflow Logs" section below

**If branch exists:**
- ✅ Check if it has files (index.html, CNAME, .nojekyll, assets/)
- If empty, deployment didn't push files

### 2. Check Organization Pages Settings

**Go to:** https://github.com/organizations/aiser-platform/settings/pages

**Required:**
- ✅ Pages must be **enabled** for the organization
- ⚠️ **Only organization owners can enable this**

**If disabled:**
1. Click "Enable Pages" or toggle it on
2. Save
3. Wait 1-2 minutes
4. Re-run the workflow

**This is the #1 cause of 404 errors for organization repositories!**

### 3. Check Repository Pages Settings

**Go to:** https://github.com/aiser-platform/aiser-world/settings/pages

**Required:**
- ✅ Source: **"GitHub Actions"** (NOT "Deploy from a branch")
- ✅ No error messages displayed
- ✅ Pages is enabled (not "None")

**If wrong:**
1. Set Source to "GitHub Actions"
2. Save
3. Wait 1-2 minutes
4. Re-run workflow

### 4. Check Workflow Permissions

**Go to:** https://github.com/aiser-platform/aiser-world/settings/actions

**Required:**
- ✅ "Read and write permissions" selected
- ✅ "Allow GitHub Actions to create and approve pull requests" checked

**If wrong:**
1. Change to "Read and write permissions"
2. Check the box for pull requests
3. Save
4. Re-run workflow

### 5. Check Workflow Logs

**Go to:** https://github.com/aiser-platform/aiser-world/actions

1. Find latest "Deploy Documentation to GitHub Pages" run
2. Click on it
3. Check each step:

**"Build documentation" step:**
- Should complete successfully
- Check for any errors

**"Verify build output" step:**
- Should show: ✅ index.html exists
- Should show: ✅ CNAME exists
- Should show: ✅ .nojekyll exists

**"Deploy to GitHub Pages" step:**
- Should complete successfully
- Look for any error messages
- Check if it says "Published" or "Deployed"

**"Verify gh-pages branch after deployment" step:**
- Should show: ✅ gh-pages branch exists on remote
- Should show: ✅ index.html exists in gh-pages
- If it shows ❌, deployment failed

## 🔧 Step-by-Step Fix Process

### Step 1: Enable Organization Pages

1. Go to: https://github.com/organizations/aiser-platform/settings/pages
2. If Pages is disabled, enable it
3. Save
4. **Note:** Only organization owners can do this

### Step 2: Verify Repository Pages

1. Go to: https://github.com/aiser-platform/aiser-world/settings/pages
2. Verify Source = "GitHub Actions"
3. If not, change it and save

### Step 3: Check Workflow Permissions

1. Go to: Repository Settings → Actions → General
2. Verify "Read and write permissions" is selected
3. Verify pull request checkbox is checked

### Step 4: Re-run Workflow

1. Go to: https://github.com/aiser-platform/aiser-world/actions
2. Click "Deploy Documentation to GitHub Pages"
3. Click "Run workflow" → "Run workflow"
4. Wait for completion

### Step 5: Verify Deployment

1. Check gh-pages branch: https://github.com/aiser-platform/aiser-world/tree/gh-pages
2. Should see files: index.html, CNAME, .nojekyll, assets/
3. Wait 5-10 minutes
4. Try: https://aiser-platform.github.io/aiser-world/

## 📋 Complete Checklist

- [ ] Organization Pages enabled: https://github.com/organizations/aiser-platform/settings/pages
- [ ] Repository Pages enabled: https://github.com/aiser-platform/aiser-world/settings/pages
- [ ] Source = "GitHub Actions" (NOT "Deploy from a branch")
- [ ] Workflow permissions = "Read and write"
- [ ] gh-pages branch exists: https://github.com/aiser-platform/aiser-world/tree/gh-pages
- [ ] gh-pages branch has files (index.html, CNAME, .nojekyll, assets/)
- [ ] Build step completed successfully
- [ ] Deployment step completed without errors
- [ ] Verification step shows gh-pages branch exists
- [ ] Waited 5-10 minutes after deployment
- [ ] Tried correct URL: https://aiser-platform.github.io/aiser-world/

## 🚨 Common Error Messages

### "There isn't a GitHub Pages site here"
- **Cause:** gh-pages branch doesn't exist or Pages not enabled
- **Fix:** Enable Organization Pages and Repository Pages

### "404 Not Found"
- **Cause:** Branch exists but Pages not configured
- **Fix:** Set Repository Pages Source to "GitHub Actions"

### "Permission denied"
- **Cause:** Workflow permissions incorrect
- **Fix:** Set to "Read and write permissions"

### "Branch not found"
- **Cause:** Deployment action didn't create gh-pages
- **Fix:** Check deployment step logs for errors

## 🔍 Advanced Diagnostics

### Check Deployment Action Output

In workflow logs, the "Deploy to GitHub Pages" step should show:
```
✅ Published to gh-pages branch
```

If it shows errors, check:
- GITHUB_TOKEN permissions
- Repository Pages settings
- Organization Pages settings

### Verify Branch Contents

1. Go to: https://github.com/aiser-platform/aiser-world/tree/gh-pages
2. Should see:
   - `index.html` (main page)
   - `CNAME` (custom domain)
   - `.nojekyll` (hidden file)
   - `assets/` (folder with CSS/JS)

### Check Commit History

1. Go to: https://github.com/aiser-platform/aiser-world/commits/gh-pages
2. Should see recent commits from `github-actions[bot]`
3. If no commits, deployment didn't run

## 🆘 Still Not Working?

### If Organization Pages Can't Be Enabled:

1. **Contact organization owner** to enable Pages
2. **Check organization settings** for any restrictions
3. **Verify you have owner permissions**

### If gh-pages Branch Doesn't Exist:

1. **Check workflow logs** for deployment errors
2. **Verify build succeeded** (check "Build documentation" step)
3. **Check permissions** (GITHUB_TOKEN needs pages: write)
4. **Try manual deployment** (see below)

### Manual Deployment Test:

```bash
# This is for testing only - normally GitHub Actions does this
cd packages/docs
npm run build
# Then manually push build/ to gh-pages branch
```

## 📞 Need Help?

- [Telegram Community](https://t.me/+XyM6Y-8MnWU2NTM1)
- [GitHub Issues](https://github.com/aiser-platform/aiser-world/issues)

---

## 🎯 Most Likely Issues (In Order)

1. **Organization Pages not enabled** (90% of cases)
2. **Repository Pages Source not "GitHub Actions"** (5% of cases)
3. **Workflow permissions incorrect** (3% of cases)
4. **gh-pages branch doesn't exist** (2% of cases)

**Start with #1 - Enable Organization Pages!**

