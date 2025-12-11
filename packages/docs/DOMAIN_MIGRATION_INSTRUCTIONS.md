# Domain Migration Instructions: aiser-docs.dataticon.com → docs.aicser.com

**Migration Date:** December 9, 2025  
**Old Domain:** `aiser-docs.dataticon.com`  
**New Domain:** `docs.aicser.com`

---

## 📋 Pre-Migration Checklist

Before starting the migration, ensure you have:

- [ ] Access to DNS provider for `aicser.com` domain
- [ ] GitHub repository admin access
- [ ] Backup of current documentation
- [ ] Understanding of current DNS configuration
- [ ] 1-2 hours for the migration process
- [ ] 24-48 hours for DNS propagation and SSL certificate

---

## 🔧 Step 1: Update Code Configuration

### 1.1 Update Docusaurus Configuration

**File:** `packages/docs/docusaurus.config.js`

**Changes Required:**
- Update `url` field (line ~7)
- Update `customFields.domain` (line ~24)
- Remove duplicate `customFields` if present

**Before:**
```javascript
url: 'https://aiser-docs.dataticon.com',
customFields: {
  domain: 'aiser-docs.dataticon.com'
},
```

**After:**
```javascript
url: 'https://docs.aicser.com',
customFields: {
  domain: 'docs.aicser.com'
},
```

### 1.2 Update GitHub Actions Workflow

**File:** `.github/workflows/deploy-docs.yml`

**Changes Required:**
- Update `cname` field in deployment step (line ~51)

**Before:**
```yaml
cname: aiser-docs.dataticon.com
```

**After:**
```yaml
cname: docs.aicser.com
```

### 1.3 Update Deployment Documentation

**File:** `packages/docs/DEPLOYMENT.md`

**Changes Required:**
- Replace all instances of `aiser-docs.dataticon.com` with `docs.aicser.com`
- Update DNS configuration examples
- Update verification URLs

---

## 🌐 Step 2: DNS Configuration

### 2.1 Add CNAME Record

**For Subdomain (docs.aicser.com):**

1. Log in to your DNS provider (where `aicser.com` is managed)
2. Add a new CNAME record:
   ```
   Type: CNAME
   Name: docs
   Value: your-username.github.io
   TTL: 3600 (or default)
   ```

**Alternative: If using GitHub Pages with custom domain for organization:**

```
Type: CNAME
Name: docs
Value: aiser-platform.github.io
TTL: 3600
```

### 2.2 Verify DNS Propagation

After adding the DNS record, verify it's propagating:

```bash
# Check CNAME record
dig docs.aicser.com CNAME

# Or use online tools
# https://dnschecker.org
# https://www.whatsmydns.net
```

**Expected Result:**
```
docs.aicser.com.    CNAME    your-username.github.io.
```

**Note:** DNS propagation can take 5 minutes to 48 hours, typically 1-4 hours.

---

## 🔐 Step 3: GitHub Pages Configuration

### 3.1 Update Repository Settings

1. Go to your GitHub repository: `https://github.com/aiser-platform/aiser-world`
2. Navigate to **Settings** → **Pages**
3. Under **Custom domain**, enter: `docs.aicser.com`
4. Check **Enforce HTTPS** (after SSL certificate is issued)
5. Click **Save**

### 3.2 Verify GitHub Pages Source

Ensure the source is set to:
- **Source:** GitHub Actions (recommended)
- Or: Deploy from a branch → `gh-pages` branch

---

## 🚀 Step 4: Deploy Updated Configuration

### 4.1 Commit and Push Changes

```bash
cd /home/sv/project/aiser-world

# Stage configuration changes
git add packages/docs/docusaurus.config.js
git add .github/workflows/deploy-docs.yml
git add packages/docs/DEPLOYMENT.md

# Commit
git commit -m "docs: migrate domain from aiser-docs.dataticon.com to docs.aicser.com"

# Push to trigger deployment
git push origin main
```

### 4.2 Monitor Deployment

1. Go to GitHub Actions: `https://github.com/aiser-platform/aiser-world/actions`
2. Monitor the `Deploy Documentation to GitHub Pages` workflow
3. Wait for successful completion (usually 3-5 minutes)

---

## ✅ Step 5: Verification & Testing

### 5.1 Verify DNS Resolution

```bash
# Check if DNS is resolving
nslookup docs.aicser.com

# Check if it points to GitHub Pages
curl -I https://docs.aicser.com
```

### 5.2 Test Website Functionality

- [ ] Homepage loads correctly
- [ ] All navigation links work
- [ ] Search functionality works
- [ ] All internal links resolve
- [ ] Images and assets load
- [ ] SSL certificate is valid (after 24-48 hours)

### 5.3 Check GitHub Pages Status

1. Go to repository Settings → Pages
2. Verify custom domain shows: `docs.aicser.com`
3. Check for any warnings or errors
4. SSL certificate status should show "Certificate is ready" (after 24-48 hours)

---

## 🔄 Step 6: Update External References

### 6.1 Update Documentation Links

Search and update any references to the old domain:

- [ ] README files
- [ ] Other documentation files
- [ ] Code comments
- [ ] Configuration files

### 6.2 Update External Services

- [ ] Update website links
- [ ] Update marketing materials
- [ ] Update social media profiles
- [ ] Update email signatures
- [ ] Update bookmarks/favorites

### 6.3 Set Up Redirects (Optional)

If you want to redirect old domain to new domain:

1. Keep old domain DNS active
2. Set up redirect at DNS/hosting level
3. Or use Docusaurus redirect plugin

**Docusaurus Redirect Plugin:**
```javascript
// In docusaurus.config.js
plugins: [
  [
    '@docusaurus/plugin-client-redirects',
    {
      redirects: [
        {
          from: ['/old-path'],
          to: '/new-path',
        },
      ],
    },
  ],
],
```

---

## ⏱️ Timeline

| Step | Duration | Notes |
|------|----------|-------|
| Code Updates | 15 min | Update config files |
| DNS Configuration | 5 min | Add CNAME record |
| GitHub Pages Setup | 5 min | Update repository settings |
| Deployment | 5-10 min | Wait for GitHub Actions |
| DNS Propagation | 1-48 hours | Typically 1-4 hours |
| SSL Certificate | 24-48 hours | Automatic by GitHub |
| **Total Active Time** | **~30 minutes** | |
| **Total Wait Time** | **24-48 hours** | For full SSL |

---

## 🚨 Troubleshooting

### Issue: DNS Not Resolving

**Symptoms:** `docs.aicser.com` doesn't resolve

**Solutions:**
1. Verify CNAME record is correct
2. Check DNS propagation: https://dnschecker.org
3. Wait longer (can take up to 48 hours)
4. Verify DNS provider settings

### Issue: SSL Certificate Not Issued

**Symptoms:** HTTPS shows certificate error

**Solutions:**
1. Wait 24-48 hours (GitHub needs time)
2. Verify DNS is correctly pointing to GitHub
3. Check GitHub Pages settings
4. Ensure "Enforce HTTPS" is enabled after certificate is ready

### Issue: Old Domain Still Showing

**Symptoms:** Old domain content still appears

**Solutions:**
1. Clear browser cache
2. Check DNS cache: `ipconfig /flushdns` (Windows) or `sudo dscacheutil -flushcache` (Mac)
3. Verify GitHub Actions deployment succeeded
4. Check if old domain DNS is still active

### Issue: Broken Links After Migration

**Symptoms:** Internal links return 404

**Solutions:**
1. Verify `baseUrl` is set to `/` in `docusaurus.config.js`
2. Check if `routeBasePath` is correct
3. Rebuild documentation locally and test
4. Check GitHub Pages build logs

### Issue: GitHub Actions Deployment Fails

**Symptoms:** Workflow fails in Actions

**Solutions:**
1. Check workflow logs for errors
2. Verify Node.js version compatibility
3. Check for build errors in logs
4. Verify file paths in workflow are correct
5. Check GitHub Pages permissions

---

## 📞 Support

If you encounter issues:

1. **Check GitHub Actions logs:** `https://github.com/aiser-platform/aiser-world/actions`
2. **Check GitHub Pages status:** Repository Settings → Pages
3. **DNS Checker:** https://dnschecker.org
4. **GitHub Support:** https://support.github.com
5. **Documentation Issues:** Create issue in repository

---

## ✅ Post-Migration Checklist

After 48 hours, verify:

- [ ] DNS fully propagated
- [ ] SSL certificate issued and valid
- [ ] Website accessible via HTTPS
- [ ] All links working
- [ ] Search functionality working
- [ ] No broken assets
- [ ] Old domain redirects (if configured)
- [ ] External references updated
- [ ] Team notified of new domain

---

## 📝 Notes

- **DNS Propagation:** Can take 1-48 hours, typically 1-4 hours
- **SSL Certificate:** GitHub automatically issues, takes 24-48 hours
- **Old Domain:** Can be kept for redirects or removed after migration
- **Backup:** Always keep backup of configuration before changes
- **Testing:** Test locally before deploying to production

---

**Migration Status:** ⏳ Ready to Begin  
**Last Updated:** December 9, 2025

