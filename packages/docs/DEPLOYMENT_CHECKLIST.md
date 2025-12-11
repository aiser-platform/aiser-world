# 📋 Documentation Deployment Checklist

## ✅ Quick Answer: Other CI/CD Failures

**No, other CI/CD job failures will NOT impact documentation deployment.**

The `deploy-docs.yml` workflow is completely independent:
- ✅ Separate workflow file
- ✅ No dependencies on other jobs
- ✅ Triggers only on `packages/docs/**` changes
- ✅ Runs independently even if CI/CD Pipeline fails

## 🚨 Most Common Issue: GitHub Pages Source

**90% of deployment failures are due to this setting:**

### ⚠️ CRITICAL: Check GitHub Pages Source

1. Go to: `https://github.com/aiser-platform/aiser-world/settings/pages`
2. **Source** must be: **"GitHub Actions"** (NOT "Deploy from a branch")
3. **Custom domain** should show: `docs.aicser.com`
4. Click **Save**

**If Source is wrong:**
- Change it to "GitHub Actions"
- Wait 1-2 minutes
- Site should become accessible

## 🔍 Verification Steps

### 1. Check Workflow Status
- Go to: `https://github.com/aiser-platform/aiser-world/actions`
- Find "Deploy Documentation to GitHub Pages"
- Verify it completed successfully (green ✅)

### 2. Check gh-pages Branch
- Go to: `https://github.com/aiser-platform/aiser-world/tree/gh-pages`
- Should see:
  - ✅ `index.html` at root
  - ✅ `CNAME` file with `docs.aicser.com`
  - ✅ `.nojekyll` file
  - ✅ `assets/` directory

### 3. Check DNS
```bash
# Check CNAME record
nslookup docs.aicser.com

# Should show:
# docs.aicser.com canonical name = aiser-platform.github.io.
```

**Required DNS Record:**
```
Type: CNAME
Name: docs
Value: aiser-platform.github.io.
TTL: 3600
```

### 4. Check GitHub Pages Status
- Go to: Repository Settings → Pages
- Should show:
  - ✅ Source: "GitHub Actions"
  - ✅ Custom domain: `docs.aicser.com`
  - ✅ SSL certificate: Enabled (may take 24-48 hours)

## 🐛 Troubleshooting

### Site Returns 404

**Check:**
1. ✅ GitHub Pages source is "GitHub Actions"
2. ✅ Workflow completed successfully
3. ✅ `gh-pages` branch has files
4. ✅ DNS is configured correctly

**Fix:**
- Change GitHub Pages source to "GitHub Actions"
- Wait 5-10 minutes
- Clear browser cache

### Site Shows "Not Secure"

**Cause:** SSL certificate not issued yet

**Fix:**
- Wait 24-48 hours for GitHub to issue SSL certificate
- Verify DNS is fully propagated
- In Pages settings, remove and re-add custom domain to trigger SSL

### Workflow Fails

**Check workflow logs:**
- Go to Actions → Failed workflow → Click on job
- Look for error messages
- Common issues:
  - Build errors (check "Build documentation" step)
  - Missing files (check "Verify build output" step)
  - Permission errors (check repository settings)

## 📞 Still Not Working?

1. **Check GitHub Actions logs** for specific errors
2. **Verify DNS** is fully propagated (can take up to 48 hours)
3. **Wait for SSL** certificate (24-48 hours after DNS is correct)
4. **Contact support:**
   - [Telegram Community](https://t.me/+XyM6Y-8MnWU2NTM1)
   - [GitHub Issues](https://github.com/aiser-platform/aiser-world/issues)

---

**Remember:** The #1 fix is changing GitHub Pages source to "GitHub Actions"!

