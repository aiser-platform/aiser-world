# Custom Domain Setup for docs.aicser.com

## Current Status
✅ GitHub Pages deployment is working (redirects from `aiser-platform.github.io/aiser-world/` to `docs.aicser.com`)
❌ Custom domain `https://docs.aicser.com/` returns 404

## Required Steps

### 1. Verify DNS Configuration

The DNS record for `docs.aicser.com` must point to GitHub Pages. Check your DNS provider (where `aicser.com` is managed):

**For Organization GitHub Pages:**
```dns
docs.aicser.com.  CNAME  aiser-platform.github.io.
```

**OR if CNAME doesn't work, use A records:**
```dns
docs.aicser.com.  A      185.199.108.153
docs.aicser.com.  A      185.199.109.153
docs.aicser.com.  A      185.199.110.153
docs.aicser.com.  A      185.199.111.153
```

### 2. Verify GitHub Pages Settings

1. Go to: https://github.com/aiser-platform/aiser-world/settings/pages
2. Under **Custom domain**, verify:
   - Domain is set to: `docs.aicser.com`
   - **Enforce HTTPS** is checked (after SSL certificate is provisioned)
3. Under **Source**, ensure it's set to **"GitHub Actions"** (not "Deploy from a branch")

### 3. Wait for SSL Certificate

GitHub Pages automatically provisions SSL certificates for custom domains, but this can take:
- **24-48 hours** for initial setup
- **A few minutes** for subsequent changes

### 4. Verify CNAME File in gh-pages Branch

The `CNAME` file should be in the root of the `gh-pages` branch:
- File: `CNAME`
- Content: `docs.aicser.com`

This is automatically created by the GitHub Actions workflow.

### 5. Troubleshooting

**If DNS is correct but site still doesn't work:**

1. **Check DNS propagation:**
   ```bash
   dig docs.aicser.com
   nslookup docs.aicser.com
   ```
   Should resolve to GitHub Pages IPs or `aiser-platform.github.io`

2. **Check GitHub Pages status:**
   - Go to repository Settings → Pages
   - Look for any error messages
   - Check if custom domain shows as "Verified"

3. **Clear DNS cache:**
   ```bash
   # On macOS/Linux
   sudo dscacheutil -flushcache
   sudo killall -HUP mDNSResponder
   
   # On Windows
   ipconfig /flushdns
   ```

4. **Check SSL certificate:**
   - Visit: https://www.ssllabs.com/ssltest/analyze.html?d=docs.aicser.com
   - Wait for certificate to be provisioned (can take 24-48 hours)

5. **Verify CNAME file exists in gh-pages:**
   ```bash
   git fetch origin gh-pages
   git checkout gh-pages
   cat CNAME
   # Should output: docs.aicser.com
   ```

### 6. Common Issues

**Issue: DNS not resolving**
- **Solution**: Verify DNS records at your DNS provider
- **Check**: DNS propagation with `dig` or `nslookup`

**Issue: SSL certificate not provisioned**
- **Solution**: Wait 24-48 hours, or remove and re-add custom domain in GitHub settings
- **Check**: GitHub Pages settings should show domain as "Verified"

**Issue: CNAME file missing**
- **Solution**: The workflow should create it automatically. Check `gh-pages` branch.
- **Manual fix**: Create `CNAME` file in `packages/docs/static/` with content `docs.aicser.com`

**Issue: Domain shows as "Unverified"**
- **Solution**: 
  1. Remove custom domain from GitHub Pages settings
  2. Wait 5 minutes
  3. Re-add `docs.aicser.com`
  4. Wait for verification (can take up to 24 hours)

## Verification Commands

```bash
# Check DNS resolution
dig docs.aicser.com +short
nslookup docs.aicser.com

# Check HTTP response
curl -I https://docs.aicser.com/

# Check if GitHub Pages redirects correctly
curl -I https://aiser-platform.github.io/aiser-world/
# Should show: location: https://docs.aicser.com/
```

## Next Steps

1. ✅ Verify DNS records are correct
2. ✅ Check GitHub Pages settings show custom domain
3. ⏳ Wait for SSL certificate (24-48 hours)
4. ✅ Verify CNAME file exists in gh-pages branch
5. ✅ Test after DNS propagation completes

