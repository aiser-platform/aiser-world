# Aicser Platform Documentation

Comprehensive documentation for the Aicser Platform - the next-generation AI-first business intelligence and visualization tool.

## 🚀 Quick Start

### Option 1: Quick Start Script (Recommended)
```bash
cd packages/docs
./quick-start.sh
```

### Option 2: Manual Start
```bash
cd packages/docs
npm ci
npm start
```

The documentation will be available at **http://localhost:3005**

## 📚 Documentation Structure

### Core Sections
- **Getting Started** - Quick start guides, first chart, demo walkthrough
- **Self-Host & Enterprise** - Deployment, configuration, enterprise features
- **Security & Performance** - Security features, compliance, optimization
- **Agentic AI & Analytics** - AI capabilities, natural language queries
- **Charts & Visuals** - Chart types, customization, ECharts integration
- **Data Sources** - CSV, databases, warehouses, real-time streams
- **Developer** - Development setup, architecture, contribution guide
- **Community** - Community programs, contribution guidelines
- **Reference & Help** - API reference, configuration, troubleshooting

### Target Audiences
- **Executives** - Business value, ROI, strategic insights
- **Analysts** - Technical capabilities, data integration, workflows
- **Developers** - API integration, customization, contribution
- **IT Administrators** - Deployment, security, maintenance
- **Open Source Contributors** - Development setup, contribution process

## 🛠️ Development

### Prerequisites
- **Node.js 20+** (required for Docusaurus 3.1.1)
- npm 9+
- Python 3.8+ (for documentation generation)

**Note:** Docusaurus 3.1.1 requires Node.js >= 20.0. Check your version with `node --version`. If you have Node.js < 20, upgrade using `nvm install 20 && nvm use 20`.

### Development Commands
```bash
# Install dependencies
npm ci

# Start development server
npm start

# Build for production
npm run build

# Serve built documentation
npm run serve

# Generate documentation from codebase
npm run generate-docs

# Type checking
npm run typecheck

# Clear build cache
npm run clear
```

### File Structure
```
packages/docs/
├── src/
│   ├── docs/           # Documentation markdown files
│   ├── css/            # Custom styles
│   └── pages/          # Additional pages
├── static/              # Static assets (images, files)
├── scripts/             # Build and deployment scripts
├── docusaurus.config.js # Docusaurus configuration
├── sidebars.js         # Navigation structure
└── package.json        # Dependencies and scripts
```

## 🐳 Docker Deployment

### Production Deployment
```bash
# Build and start documentation service
docker-compose -f docker-compose.docs.yml up -d

# Check status
docker-compose -f docker-compose.docs.yml ps

# View logs
docker-compose -f docker-compose.docs.yml logs -f docs
```

### Development Deployment
```bash
# Start development environment
docker-compose -f docker-compose.docs.yml --profile dev up -d docs-dev

# Access at http://localhost:3006
```

### Custom Domain Deployment
The documentation is configured for deployment at:
- **Production**: https://docs.aicser.com
- **Development**: http://localhost:3005

## 🚀 GitHub Pages Deployment

### Automatic Deployment
The documentation automatically deploys when you push to the `main` branch. The GitHub Actions workflow will:
1. Build the documentation (using Node.js 20)
2. Deploy to GitHub Pages
3. Configure the custom domain `docs.aicser.com`

### GitHub Pages Configuration
**Critical:** Ensure GitHub Pages source is set to **"GitHub Actions"** (not "Deploy from a branch"):
1. Go to: Repository Settings → Pages
2. Set **Source** to **"GitHub Actions"**
3. Custom domain: `docs.aicser.com`
4. Save

### Manual Deployment
```bash
# Build for production
cd packages/docs
npm install
npm run build

# Deploy using Docusaurus deploy command
npm run deploy
```

### Docker Deployment
```bash
# Build and start
docker-compose -f docker-compose.docs.yml up -d --build
```

## 🔧 Configuration

### Environment Variables
```bash
# Documentation configuration
NODE_ENV=production
PORT=3005
BASE_URL=/
CUSTOM_DOMAIN=aicser-docs.dataticon.com

# AI service configuration
OPENAI_API_KEY=your_openai_key
AZURE_OPENAI_KEY=your_azure_key
GOOGLE_AI_KEY=your_google_key

# Database configuration
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=aicser_db
POSTGRES_USER=aicser_user
POSTGRES_PASSWORD=your_password
```

### NGINX Configuration
The documentation includes optimized NGINX configuration with:
- Security headers
- Gzip compression
- Caching strategies
- Rate limiting
- Health checks

## 📊 Monitoring & Health Checks

### Health Endpoints
- **Documentation**: http://localhost:3005/health
- **Development**: http://localhost:3006/health

### Monitoring Commands
```bash
# Check service status
docker-compose -f docker-compose.docs.yml ps

# View logs
docker-compose -f docker-compose.docs.yml logs -f docs

# Health check
curl -f http://localhost:3005/health

# Performance test
npm run serve &
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:3005/
```

## 🔒 Security Features

### Built-in Security
- **HTTPS enforcement** for production
- **Security headers** (XSS protection, CSRF prevention)
- **Rate limiting** for API endpoints
- **Input validation** and sanitization
- **Access control** and authentication

### Compliance
- **GDPR compliance** with data processing agreements
- **SOC 2 Type II** certification
- **ISO 27001** information security management
- **Industry-specific** compliance (HIPAA, PCI DSS)

## 🚨 Troubleshooting

### Common Issues

1. **Node.js Version Error**
   - **Error**: "Minimum Node.js version not met" or "Unsupported engine"
   - **Fix**: Docusaurus 3.1.1 requires Node.js >= 20.0
   ```bash
   node --version  # Check current version
   nvm install 20 && nvm use 20  # Upgrade if needed
   ```

2. **Build Fails with Module Not Found**
   - **Error**: "Can't resolve '@docsearch/css'"
   - **Fix**: Dependencies may be missing. Run:
   ```bash
   cd packages/docs
   rm -rf node_modules package-lock.json
   npm install
   ```

3. **Port Already in Use**
   - **Fix**: Change port in `package.json` or kill existing process
   ```bash
   # Use different port
   npx docusaurus serve --port 3006
   ```

4. **GitHub Pages Shows 404**
   - **Fix**: Ensure GitHub Pages source is set to **"GitHub Actions"** (not "Deploy from a branch")
   - Go to: Repository Settings → Pages → Source = "GitHub Actions"

5. **Build Failures**
   - **Fix**: Clear cache and reinstall dependencies
   ```bash
   npm run clear
   rm -rf node_modules
   npm install
   npm run build
   ```

### Debug Commands
```bash
# Check system status
docker-compose -f docker-compose.docs.yml ps
docker-compose -f docker-compose.docs.yml logs --tail=50

# Debug build process
npm run build --verbose

# Verify build output
test -f build/index.html && echo "✅ Success" || echo "❌ Failed"
cat build/CNAME  # Should show: docs.aicser.com

# Check file permissions
ls -la scripts/
chmod +x scripts/*.sh
```

### Getting Help
- **Documentation**: [Troubleshooting Guide](troubleshooting/)
- **Community**: [GitHub Issues](https://github.com/aicser-platform/aicser-world/issues)
- **Support**: support@aicser.com

## 🔮 Roadmap

### Upcoming Features
- **Multi-language support** (internationalization)
- **Interactive tutorials** with embedded examples
- **Video content** for complex workflows
- **Advanced search** with AI-powered suggestions
- **Mobile-optimized** documentation

### Long-term Vision
- **AI-powered documentation** generation
- **Personalized content** based on user role
- **Integration with** development workflows
- **Community-driven** content creation
- **Global accessibility** standards

## 🤝 Contributing

### How to Contribute
1. **Fork the repository**
2. **Create a feature branch**
3. **Make your changes**
4. **Test locally** with `npm start`
5. **Submit a pull request**

### Documentation Standards
- **Clear structure** with logical flow
- **Code examples** for all features
- **Screenshots and diagrams** for complex concepts
- **Regular updates** to reflect platform changes
- **Accessibility compliance** (WCAG 2.1 AA)

### Content Guidelines
- **Professional tone** suitable for enterprise users
- **Actionable content** with clear next steps
- **Multiple skill levels** from beginner to expert
- **Real-world examples** and use cases
- **Consistent formatting** and style

## 📄 License

This documentation is part of the Aicser Platform and is licensed under the [MIT License](../../LICENSE) along with the [Enterprise License](../../ENTERPRISE-LICENSE-AGREEMENT.md).

## 🆘 Support

### Community Support
- **GitHub Issues**: [Report bugs and request features](https://github.com/aicser-platform/aicser-world/issues)
- **GitHub Discussions**: [Community Q&A](https://github.com/aicser-platform/aicser-world/discussions)
- **Community Forum**: [Join the conversation](https://community.aicser.com)

### Professional Support
- **Email**: support@aicser.com
- **Documentation**: [Complete documentation](.)
- **Training**: [Custom training programs](mailto:training@aicser.com)

---

**Ready to get started?** Run `./quick-start.sh` to launch the documentation locally!
