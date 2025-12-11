# Aicser Platform Documentation Deployment Guide

This guide covers deploying the Aicser Platform documentation to GitHub Pages with a custom domain.

## 🚀 Quick Deployment

### Automatic Deployment (Recommended)

The documentation automatically deploys when you push to the `main` branch. The GitHub Actions workflow will:

1. **Build** the documentation
2. **Deploy** to GitHub Pages
3. **Configure** the custom domain `docs.aicser.com`

### Manual Deployment

```bash
# Build for production
cd packages/docs
NODE_ENV=production npm run build

# Deploy using Docusaurus deploy command
npm run deploy
```

## 🌐 Custom Domain Setup

### 1. DNS Configuration

Configure your DNS provider (`aicser.com`) with these records:

```dns
# CNAME record (recommended for subdomain)
docs.aicser.com.  CNAME  your-username.github.io.

# Or for organization GitHub Pages
docs.aicser.com.  CNAME  aicser-platform.github.io.

# Or A records (if using apex domain - not recommended for subdomain)
docs.aicser.com.  A      185.199.108.153
docs.aicser.com.  A      185.199.109.153
docs.aicser.com.  A      185.199.110.153
docs.aicser.com.  A      185.199.111.153
```

### 2. GitHub Repository Settings

1. Go to your repository settings
2. Navigate to **Pages**
3. Set **Source** to **GitHub Actions**
4. The custom domain will be automatically configured

### 3. SSL Certificate

GitHub Pages automatically provides SSL certificates for custom domains. Wait 24-48 hours for the certificate to be issued.

## 🔧 Configuration

### Environment Variables

The build automatically detects the environment:

- **Development**: `baseUrl: '/'` (localhost:3005)
- **Production**: `baseUrl: '/'` (docs.aicser.com)

### Build Output

The production build creates:
- `packages/docs/build/` - Static files for deployment
- `packages/docs/build/CNAME` - Custom domain configuration

## 📱 Preview Deployments

Pull requests automatically create preview deployments at:
`https://your-username.github.io/aicser-world/preview/PR-NUMBER/`

## 🚨 Troubleshooting

### Common Issues

1. **Custom domain not working**
   - Check DNS propagation (can take up to 48 hours)
   - Verify CNAME record is correct
   - Ensure SSL certificate is issued

2. **Build failures**
   - Check for broken links (currently set to warn only)
   - Verify all dependencies are installed
   - Check Node.js version (requires 18+)

3. **Deployment not triggered**
   - Ensure changes are in `packages/docs/`
   - Check GitHub Actions permissions
   - Verify workflow file is in `.github/workflows/`

### Manual Verification

```bash
# Test local build
cd packages/docs
npm run build

# Test local server
npm start

# Check for broken links
npm run build 2>&1 | grep -i "broken\|error"
```

## 🔄 Update Process

### Making Changes

1. **Edit documentation** in `packages/docs/src/docs/`
2. **Commit and push** to `main` branch
3. **Automatic deployment** occurs within 5-10 minutes
4. **Verify changes** at `https://docs.aicser.com`

### Rollback

If you need to rollback:

1. **Revert the commit** in GitHub
2. **Push the revert** to trigger redeployment
3. **Previous version** will be restored automatically

## 📊 Monitoring

### GitHub Actions

Monitor deployment status in:
`https://github.com/your-username/aicser-world/actions`

### GitHub Pages

Check deployment status in:
`https://github.com/your-username/aicser-world/settings/pages`

## 🎯 Next Steps

1. **Push to main branch** to trigger first deployment
2. **Configure DNS** with your domain provider
3. **Wait for SSL certificate** (24-48 hours)
4. **Test the live site** at `https://docs.aicser.com`

---

**Need help?** Check the [GitHub Pages documentation](https://docs.github.com/en/pages) or create an issue in the repository.
