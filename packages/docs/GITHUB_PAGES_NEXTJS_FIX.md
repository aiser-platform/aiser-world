# Fix: GitHub Pages Showing "Next.js" Instead of Docusaurus

## Problem
GitHub Pages settings shows:
- **"Next.js By GitHub Actions"** 
- **"Package a Next.js site"**

But this is a **Docusaurus** site, not Next.js!

## Root Cause
GitHub is auto-detecting Next.js files in the repository:
- `packages/chat2chart/client/next.config.js` (this is for the main app, not docs)
- GitHub's auto-detection is picking up these files and suggesting Next.js deployment

## Solution

### Step 1: Verify Workflow Selection

1. Go to: **https://github.com/aiser-platform/aiser-world/settings/pages**
2. Under **"Build and deployment"**, you should see:
   - **Source**: GitHub Actions
   - **Workflow**: Should show **"Deploy Documentation to GitHub Pages"** (not Next.js)

**If it shows "Next.js":**
- Click the dropdown next to the workflow name
- Select **"Deploy Documentation to GitHub Pages"**
- Save

### Step 2: Verify gh-pages Branch

The correct workflow deploys to the `gh-pages` branch with static files.

1. Go to: **https://github.com/aiser-platform/aiser-world/tree/gh-pages**
2. Check for these files in the root:
   - ✅ `index.html` (Docusaurus-generated)
   - ✅ `CNAME` (content: `docs.aicser.com`)
   - ✅ `.nojekyll` (empty file)
   - ✅ `assets/` directory

**If gh-pages branch doesn't exist or is empty:**
- The workflow hasn't run successfully
- Check workflow logs: https://github.com/aiser-platform/aiser-world/actions
- Look for "Deploy Documentation to GitHub Pages" workflow

### Step 3: Manual Workflow Selection

If GitHub keeps defaulting to Next.js:

1. **Go to Pages settings**: https://github.com/aiser-platform/aiser-world/settings/pages
2. **Under "Build and deployment"**:
   - Source: **GitHub Actions**
   - **Workflow**: Click dropdown, select **"Deploy Documentation to GitHub Pages"**
3. **Save**

### Step 4: Verify Deployment

After selecting the correct workflow:

1. **Wait 1-2 minutes** for GitHub to process
2. **Test URLs**:
   - `https://aiser-platform.github.io/aiser-world/` (should work first)
   - `https://docs.aicser.com/` (after DNS propagates)

## Why This Happens

GitHub's auto-detection scans the entire repository for framework files:
- Found: `packages/chat2chart/client/next.config.js` → Suggests Next.js
- Should use: `packages/docs/docusaurus.config.js` → Should suggest Docusaurus

But since Next.js files are at the root level of packages, GitHub detects them first.

## Correct Configuration

**Workflow Name**: `Deploy Documentation to GitHub Pages`
**Job Name**: `build-and-deploy`
**Deployment Target**: `gh-pages` branch
**Build Output**: `packages/docs/build/` (static Docusaurus files)

## Verification Checklist

- [ ] GitHub Pages source = "GitHub Actions"
- [ ] Selected workflow = "Deploy Documentation to GitHub Pages" (NOT Next.js)
- [ ] gh-pages branch exists with files
- [ ] `index.html` exists in gh-pages root
- [ ] `CNAME` file exists with `docs.aicser.com`
- [ ] DNS for docs.aicser.com is configured (you confirmed this works)

## If Still Not Working

1. **Check workflow runs**: https://github.com/aiser-platform/aiser-world/actions
   - Find "Deploy Documentation to GitHub Pages"
   - Verify it completed successfully
   - Check "Deploy to GitHub Pages" step

2. **Manually trigger workflow**:
   - Go to Actions tab
   - Select "Deploy Documentation to GitHub Pages"
   - Click "Run workflow"
   - Wait for completion

3. **Verify gh-pages branch**:
   - https://github.com/aiser-platform/aiser-world/tree/gh-pages
   - Should have files from latest deployment

## Expected Result

After selecting the correct workflow:
- GitHub Pages will serve static files from `gh-pages` branch
- Site will be accessible at both URLs
- No Next.js build process (it's just static files)

