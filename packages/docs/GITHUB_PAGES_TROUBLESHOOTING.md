# GitHub Pages Deployment Troubleshooting

## 🔴 Common Issues & Solutions

### Issue 1: Site Shows 404 or Not Accessible

**Symptoms:**
- `https://docs.aicser.com` returns 404
- `https://docs.aicser.com/docs` returns 404
- GitHub Actions workflow completes but site doesn't load

**Solutions:**

#### 1. Check GitHub Pages Source Setting (CRITICAL!)

**Go to:** `https://github.com/aiser-platform/aiser-world/settings/pages`

**Required Settings:**
- **Source:** Must be **"GitHub Actions"** (NOT "Deploy from a branch")
- **Custom domain:** `docs.aicser.com`
- **Enforce HTTPS:** Checked (after SSL is ready)

**If Source is wrong:**
1. Change Source to **"GitHub Actions"**
2. Save
3. Wait 1-2 minutes
4. Check if site loads

#### 2. Verify DNS Configuration

**Check DNS records:**
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
TTL: 3600 (or auto)
```

**If DNS is wrong:**
1. Go to your DNS provider (where aicser.com is hosted)
2. Add/update CNAME record: `docs` → `aiser-platform.github.io.`
3. Wait 1-48 hours for DNS propagation

#### 3. Check GitHub Actions Workflow

**Verify workflow ran:**
- Go to: `https://github.com/aiser-platform/aiser-world/actions`
- Find "Deploy Documentation to GitHub Pages"
- Check if it completed successfully (green checkmark)

**If workflow failed:**
- Check the error logs
- Common issues:
  - Build errors (check "Build documentation" step)
  - Missing files (check "Verify build output" step)
  - Permission errors (check repository settings)

#### 4. Verify gh-pages Branch

**Check branch contents:**
- Go to: `https://github.com/aiser-platform/aiser-world/tree/gh-pages`

**Required files:**
- ✅ `index.html` at root
- ✅ `CNAME` file with `docs.aicser.com`
- ✅ `.nojekyll` file
- ✅ `assets/` directory

**If files are missing:**
- The deployment step might have failed
- Check GitHub Actions logs
- Re-run the workflow manually

### Issue 2: Site Loads but Shows Wrong Content

**Symptoms:**
- Site loads but shows old content
- Changes not reflected after deployment

**Solutions:**

1. **Clear browser cache:**
   - Hard refresh: `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)
   - Or use incognito/private window

2. **Check deployment timestamp:**
   - GitHub Actions shows when last deployment ran
   - Verify it's recent

3. **Force redeploy:**
   - Go to Actions tab
   - Click "Deploy Documentation to GitHub Pages"
   - Click "Run workflow" → "Run workflow"

### Issue 3: SSL Certificate Issues

**Symptoms:**
- Site loads but shows "Not Secure"
- SSL certificate errors

**Solutions:**

1. **Wait for SSL certificate:**
   - GitHub automatically issues SSL certificates
   - Takes 24-48 hours after DNS is configured
   - Check in: Repository Settings → Pages → Custom domain

2. **Verify DNS propagation:**
   - DNS must be fully propagated before SSL can be issued
   - Use: `nslookup docs.aicser.com` to check

3. **Re-verify domain:**
   - In GitHub Pages settings, remove and re-add custom domain
   - This triggers SSL certificate re-issuance

## ✅ Verification Checklist

After deployment, verify:

- [ ] GitHub Actions workflow completed successfully
- [ ] GitHub Pages source is set to "GitHub Actions"
- [ ] Custom domain shows `docs.aicser.com` in Pages settings
- [ ] `gh-pages` branch has `index.html` at root
- [ ] `gh-pages` branch has `CNAME` file with `docs.aicser.com`
- [ ] DNS CNAME record points to `aiser-platform.github.io.`
- [ ] Site loads at `https://docs.aicser.com` (not HTTP)
- [ ] No 404 errors
- [ ] All assets load correctly

## 🔧 Manual Verification Steps

### 1. Check GitHub Pages Status

```bash
# Via GitHub API (if you have token)
curl -H "Authorization: token YOUR_TOKEN" \
  https://api.github.com/repos/aiser-platform/aiser-world/pages
```

### 2. Check DNS

```bash
# Check CNAME record
dig docs.aicser.com CNAME

# Should show:
# docs.aicser.com. IN CNAME aiser-platform.github.io.
```

### 3. Check SSL Certificate

```bash
# Check SSL certificate
openssl s_client -connect docs.aicser.com:443 -servername docs.aicser.com
```

## 🆘 Still Not Working?

### Contact Points:

1. **GitHub Support:**
   - [GitHub Support](https://support.github.com/)
   - Report Pages deployment issues

2. **DNS Provider:**
   - Contact your DNS provider if CNAME record isn't working

3. **Community:**
   - [Telegram Community](https://t.me/+XyM6Y-8MnWU2NTM1)
   - [GitHub Issues](https://github.com/aiser-platform/aiser-world/issues)

---

**Most Common Fix:** Change GitHub Pages source to "GitHub Actions" in repository settings!

