# Aiser Platform Documentation

Comprehensive documentation for the Aiser Platform - the next-generation AI-first business intelligence and visualization tool.

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
- Node.js 18+
- npm 8+
- Python 3.8+ (for documentation generation)

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
- **Production**: https://aiser-docs.dataticon.com/
- **Development**: http://localhost:3005

## 🚀 Deployment Scripts

### Automated Deployment
```bash
# Deploy to all targets (GitHub Pages, custom domain, Docker)
./scripts/deploy-docs.sh

# Deploy to specific target
./scripts/deploy-docs.sh github    # GitHub Pages only
./scripts/deploy-docs.sh custom    # Custom domain only
./scripts/deploy-docs.sh docker    # Docker only

# Deploy to staging environment
DEPLOY_ENV=staging ./scripts/deploy-docs.sh
```

### Manual Deployment
```bash
# GitHub Pages
npm run deploy

# Custom domain
# 1. Build documentation: npm run build
# 2. Upload build/ directory to your web server
# 3. Configure DNS for aiser-docs.dataticon.com

# Docker
docker-compose -f docker-compose.docs.yml up -d --build
```

## 🔧 Configuration

### Environment Variables
```bash
# Documentation configuration
NODE_ENV=production
PORT=3005
BASE_URL=/
CUSTOM_DOMAIN=aiser-docs.dataticon.com

# AI service configuration
OPENAI_API_KEY=your_openai_key
AZURE_OPENAI_KEY=your_azure_key
GOOGLE_AI_KEY=your_google_key

# Database configuration
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=aiser_db
POSTGRES_USER=aiser_user
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
1. **Port already in use**: Change port in `package.json` or kill existing process
2. **Build failures**: Clear cache with `npm run clear` and reinstall dependencies
3. **Docker issues**: Check Docker service and container logs
4. **Performance issues**: Review caching configuration and resource limits

### Debug Commands
```bash
# Check system status
docker-compose -f docker-compose.docs.yml ps
docker-compose -f docker-compose.docs.yml logs --tail=50

# Debug build process
npm run build --verbose

# Check file permissions
ls -la scripts/
chmod +x scripts/*.sh
```

### Getting Help
- **Documentation**: [Troubleshooting Guide](troubleshooting/)
- **Community**: [GitHub Issues](https://github.com/aiser-platform/aiser-world/issues)
- **Support**: support@aiser.com

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

This documentation is part of the Aiser Platform and is licensed under the [MIT License](../../LICENSE) along with the [Enterprise License](../../ENTERPRISE-LICENSE-AGREEMENT.md).

## 🆘 Support

### Community Support
- **GitHub Issues**: [Report bugs and request features](https://github.com/aiser-platform/aiser-world/issues)
- **GitHub Discussions**: [Community Q&A](https://github.com/aiser-platform/aiser-world/discussions)
- **Community Forum**: [Join the conversation](https://community.aiser.com)

### Professional Support
- **Email**: support@aiser.com
- **Documentation**: [Complete documentation](.)
- **Training**: [Custom training programs](mailto:training@aiser.com)

---

**Ready to get started?** Run `./quick-start.sh` to launch the documentation locally!
