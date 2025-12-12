# 🔍 Diagnosing index.html Issues

## Problem: New index.html Still Not Working

After deleting `static/index.html`, Docusaurus should generate the correct `index.html`, but the site still shows 404.

## 🔍 Check 1: What Does the New index.html Contain?

**Go to:** https://github.com/aiser-platform/aiser-world/blob/gh-pages/index.html

**Check the content:**

### ✅ Correct index.html Should:
- Start with `<!DOCTYPE html>`
- Contain `<html lang="en">` or similar
- Have a `<head>` section with meta tags
- Have a `<body>` section
- Contain React/Docusaurus content (not just a redirect)
- Reference assets like `/assets/css/main.css`

### ❌ Wrong index.html Might:
- Still redirect to `/docs/` (old static file cached)
- Be empty or minimal
- Have broken asset paths
- Not contain Docusaurus React app

## 🔍 Check 2: Browser Console Errors

1. Open `https://docs.aicser.com/` in browser
2. Press **F12** (Developer Tools)
3. Go to **Console** tab
4. Look for errors:
   - `Failed to load resource: 404` → Asset path issue
   - `Cannot GET /` → Server/routing issue
   - `React is not defined` → JavaScript not loading
   - `Uncaught Error` → App initialization failed

## 🔍 Check 3: Network Tab

1. Open **Network** tab in Developer Tools
2. Refresh the page
3. Check which files return 404:
   - `index.html` → File missing
   - `/assets/css/main.css` → Asset path wrong
   - `/assets/js/main.js` → JavaScript not loading

## 🔍 Check 4: Workflow Build Output

**Go to:** https://github.com/aiser-platform/aiser-world/actions

1. Find latest workflow run
2. Check "Verify build output" step
3. Look for:
   - ✅ `index.html exists at root`
   - ✅ `index.html does NOT redirect to /docs/`
   - ✅ `index.html contains Docusaurus content`
   - ✅ `assets/ directory exists`

## 🔧 Possible Issues & Fixes

### Issue 1: index.html Still Redirects

**Symptom:** index.html contains `url=/docs/` or redirect script

**Fix:**
1. Verify `static/index.html` is deleted (check in repository)
2. Clear Docusaurus build cache: `npm run clear`
3. Rebuild: `npm run build`
4. Check generated `build/index.html` doesn't redirect

### Issue 2: Assets Not Loading

**Symptom:** Console shows 404 for CSS/JS files

**Fix:**
- Check `baseUrl: '/'` in `docusaurus.config.js`
- Verify asset paths in index.html are absolute (`/assets/...`)
- Check `.nojekyll` file exists in gh-pages

### Issue 3: React App Not Loading

**Symptom:** Page loads but is blank or shows error

**Fix:**
- Check JavaScript files are loading (Network tab)
- Verify React/ReactDOM are included
- Check for JavaScript errors in Console

### Issue 4: Build Cache Issue

**Symptom:** Old index.html still being used

**Fix:**
1. In workflow, add cache clearing:
   ```yaml
   - name: Clear build cache
     run: |
       cd packages/docs
       npm run clear
   ```
2. Re-run workflow

## 🔧 Quick Test

**Check the actual deployed index.html:**

```bash
# View the deployed index.html
curl https://docs.aicser.com/ | head -50
```

**Should see:**
- HTML structure
- Docusaurus meta tags
- React app initialization
- Asset references

**Should NOT see:**
- Redirect to `/docs/`
- Empty or minimal content
- Broken asset paths

## 📋 Diagnostic Checklist

- [ ] `static/index.html` is deleted (check in repository)
- [ ] New `index.html` in gh-pages doesn't redirect to `/docs/`
- [ ] New `index.html` contains Docusaurus/React content
- [ ] Assets directory exists in gh-pages
- [ ] `.nojekyll` file exists in gh-pages
- [ ] Browser console shows no 404 errors
- [ ] Network tab shows assets loading (200 status)
- [ ] Workflow "Verify build output" shows correct index.html

## 🆘 Still Not Working?

**Share these details:**

1. **Content of new index.html** (first 500 characters)
2. **Browser console errors** (screenshot or copy)
3. **Network tab** - which files return 404
4. **Workflow logs** - "Verify build output" step output

This will help identify the exact issue.

