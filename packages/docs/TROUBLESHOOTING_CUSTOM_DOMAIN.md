# Troubleshooting: docs.aicser.com Not Working

## Current Status
✅ **GitHub Pages deployment**: Working (deploy workflow succeeds)
✅ **GitHub Pages URL**: `https://aiser-platform.github.io/aiser-world/` redirects to `docs.aicser.com`
❌ **Custom domain**: `https://docs.aicser.com/` returns 404

## Root Cause
The 404 on the custom domain indicates one of these issues:
1. **DNS not configured** - `docs.aicser.com` doesn't point to GitHub Pages
2. **SSL certificate not provisioned** - GitHub hasn't issued the certificate yet (takes 24-48 hours)
3. **Domain not verified** - GitHub Pages hasn't verified the custom domain
4. **CNAME file missing** - The CNAME file isn't in the gh-pages branch

## Immediate Actions Required

### Step 1: Verify DNS Configuration

Go to your DNS provider (where `aicser.com` domain is managed) and ensure you have:

**Option A: CNAME Record (Recommended)**
```
Type: CNAME
Name: docs
Value: aiser-platform.github.io
TTL: 3600 (or auto)
```

**Option B: A Records (If CNAME doesn't work)**
```
Type: A
Name: docs
Value: 185.199.108.153
TTL: 3600

Type: A
Name: docs
Value: 185.199.109.153
TTL: 3600

Type: A
Name: docs
Value: 185.199.110.153
TTL: 3600

Type: A
Name: docs
Value: 185.199.111.153
TTL: 3600
```

### Step 2: Verify GitHub Pages Settings

1. Go to: **https://github.com/aiser-platform/aiser-world/settings/pages**
2. Check:
   - **Source**: Should be **"GitHub Actions"** (not "Deploy from a branch")
   - **Custom domain**: Should show `docs.aicser.com`
   - **Status**: Should show "Verified" (if DNS is correct) or "Unverified" (if DNS is wrong or pending)

### Step 3: Verify CNAME File

The workflow automatically creates `CNAME` file in the `gh-pages` branch. To verify:

1. Go to: **https://github.com/aiser-platform/aiser-world/tree/gh-pages**
2. Check if `CNAME` file exists in the root
3. Content should be: `docs.aicser.com`

### Step 4: Wait for SSL Certificate

GitHub Pages automatically provisions SSL certificates, but this takes:
- **First time**: 24-48 hours
- **After DNS changes**: A few minutes to a few hours

You can check SSL status at: https://www.ssllabs.com/ssltest/analyze.html?d=docs.aicser.com

## Quick Diagnostic Commands

```bash
# Check if GitHub Pages URL works
curl -I https://aiser-platform.github.io/aiser-world/
# Should show: location: https://docs.aicser.com/

# Check custom domain response
curl -I https://docs.aicser.com/
# Currently shows: HTTP/2 404

# Check DNS (if dig/nslookup available)
dig docs.aicser.com
nslookup docs.aicser.com
```

## Common Solutions

### Solution 1: DNS Not Configured
**Symptom**: Domain returns 404, GitHub Pages shows "Unverified"
**Fix**: Add CNAME or A records at your DNS provider (see Step 1)

### Solution 2: DNS Propagation Delay
**Symptom**: DNS records are correct but domain still doesn't work
**Fix**: Wait 1-24 hours for DNS propagation. Check with: `dig docs.aicser.com`

### Solution 3: SSL Certificate Pending
**Symptom**: HTTP works but HTTPS doesn't, or GitHub shows "Certificate pending"
**Fix**: Wait 24-48 hours for GitHub to provision SSL certificate

### Solution 4: Domain Not Verified in GitHub
**Symptom**: GitHub Pages shows domain as "Unverified"
**Fix**:
1. Remove custom domain from GitHub Pages settings
2. Wait 5 minutes
3. Re-add `docs.aicser.com`
4. Wait for verification (up to 24 hours)

### Solution 5: CNAME File Missing
**Symptom**: DNS works but GitHub doesn't recognize the domain
**Fix**: The workflow should create it automatically. If missing:
1. Check `packages/docs/static/CNAME` exists (it does: `docs.aicser.com`)
2. Verify workflow creates it in `gh-pages` branch
3. Manually verify: https://github.com/aiser-platform/aiser-world/tree/gh-pages

## Verification Checklist

- [ ] DNS records configured (CNAME or A records)
- [ ] DNS propagation complete (check with `dig` or online DNS checker)
- [ ] GitHub Pages source set to "GitHub Actions"
- [ ] Custom domain added in GitHub Pages settings
- [ ] CNAME file exists in `gh-pages` branch
- [ ] SSL certificate provisioned (check SSL Labs)
- [ ] Domain shows as "Verified" in GitHub Pages settings

## Expected Timeline

1. **DNS Configuration**: Immediate (once you add records)
2. **DNS Propagation**: 1-24 hours
3. **GitHub Domain Verification**: 5 minutes to 24 hours
4. **SSL Certificate**: 24-48 hours (first time)

## Still Not Working?

If after 48 hours the domain still doesn't work:

1. **Double-check DNS**: Use online tools like https://dnschecker.org/
2. **Check GitHub Pages logs**: Repository Settings → Pages → Check for error messages
3. **Verify CNAME file**: Ensure it's in the root of `gh-pages` branch
4. **Try removing and re-adding domain**: In GitHub Pages settings, remove domain, wait 5 min, re-add
5. **Check for typos**: Ensure domain is exactly `docs.aicser.com` (no trailing slash, no www)

## Support Resources

- GitHub Pages Docs: https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site
- DNS Troubleshooting: https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/troubleshooting-custom-domains-and-github-pages

