# 🔴 CRITICAL: GitHub Pages Source Configuration

## The Problem

**Your deployment is successful, but the site shows 404.**

This means:
- ✅ GitHub Actions is building and deploying correctly
- ✅ Files are being pushed to `gh-pages` branch
- ❌ **GitHub Pages is NOT reading from GitHub Actions**

## The Root Cause

**GitHub Pages Source is set to "Deploy from a branch" instead of "GitHub Actions"**

When this happens:
- GitHub Actions deploys to `gh-pages` branch ✅
- But GitHub Pages serves from a different branch or location ❌
- Result: 404 error

## 🔧 THE FIX (Do This Now!)

### Step 1: Go to Repository Settings

1. Go to: `https://github.com/aiser-platform/aiser-world/settings/pages`

### Step 2: Change Source to GitHub Actions

**Current (WRONG):**
```
Source: Deploy from a branch
Branch: gh-pages (or main/docs)
```

**Change to (CORRECT):**
```
Source: GitHub Actions
```

### Step 3: Save

Click **Save** - GitHub will automatically detect the workflow.

### Step 4: Verify

After saving, you should see:
- ✅ "Your site is live at docs.aicser.com"
- ✅ Source shows "GitHub Actions"
- ✅ A green checkmark next to the deployment

## ⚠️ Important Notes

1. **Don't set a branch** - When using GitHub Actions, you should NOT select a branch
2. **Wait 1-2 minutes** - After changing, wait for GitHub to reconfigure
3. **Check Actions tab** - Verify the workflow ran after the change

## Verification Checklist

After changing the source:

- [ ] Repository Settings → Pages → Source = **"GitHub Actions"**
- [ ] No branch selected (should be grayed out or not visible)
- [ ] Custom domain shows: `docs.aicser.com`
- [ ] Status shows: "Your site is live at docs.aicser.com"
- [ ] Go to Actions tab and see recent workflow runs
- [ ] Visit `https://docs.aicser.com` - should load (not 404)

## Why This Happens

GitHub Pages has two deployment methods:

1. **Deploy from a branch** (old method)
   - GitHub serves files directly from a branch
   - No GitHub Actions needed
   - Limited customization

2. **GitHub Actions** (new method, what we're using)
   - GitHub Actions builds and deploys
   - More control and customization
   - Can use custom build processes

**You can't use both at the same time!**

If Pages is set to "Deploy from a branch" while GitHub Actions is also deploying:
- Actions deploys to `gh-pages` ✅
- Pages serves from the configured branch ❌
- Files don't match → 404 error

## Still Not Working?

### Check 1: Verify gh-pages Branch

Go to: `https://github.com/aiser-platform/aiser-world/tree/gh-pages`

Should see:
- ✅ `index.html` at root
- ✅ `CNAME` file with `docs.aicser.com`
- ✅ `.nojekyll` file
- ✅ `assets/` directory

### Check 2: Verify Workflow Ran

Go to: `https://github.com/aiser-platform/aiser-world/actions`

Find "Deploy Documentation to GitHub Pages" workflow:
- ✅ Should show green checkmark
- ✅ Should have recent runs
- ✅ Check logs to verify files were deployed

### Check 3: Clear Browser Cache

- Hard refresh: `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)
- Or use incognito/private window

### Check 4: DNS Propagation

If DNS was recently changed:
- Can take 1-48 hours to fully propagate
- Check with: `nslookup docs.aicser.com`
- Should show CNAME pointing to GitHub

## Summary

**The fix is simple but critical:**

1. Go to Settings → Pages
2. Change Source from "Deploy from a branch" to **"GitHub Actions"**
3. Save
4. Wait 1-2 minutes
5. Test site

**This is 99% likely to be your issue!**

---

**Status:** ⚠️ Action Required - Change GitHub Pages Source Setting

