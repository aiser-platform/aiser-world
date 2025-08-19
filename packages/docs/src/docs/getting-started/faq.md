---
id: faq
title: Frequently Asked Questions
sidebar_label: FAQ
description: Find answers to common questions about Aiser Platform - from getting started to enterprise deployment
---

# ❓ Frequently Asked Questions

**Quick answers to the most common questions about Aiser Platform.**

Can't find what you're looking for? Check our [GitHub Discussions](https://github.com/aiser-platform/aiser-world/discussions) or [contact support](mailto:support@dataticon.com).

## 🚀 Getting Started

### **Q: How quickly can I get Aiser running?**
**A:** With Docker, you can have Aiser running in **5 minutes**:
```bash
git clone https://github.com/aiser-platform/aiser-world
cd aiser-world
docker-compose up -d
```
Then visit [http://localhost:3000](http://localhost:3000) to start using it.

### **Q: What are the system requirements?**
**A:** **Minimum**: 2 CPU cores, 4GB RAM, 20GB storage. **Recommended**: 4+ CPU cores, 8GB+ RAM, 100GB+ storage. Aiser runs on Linux, macOS, and Windows.

### **Q: Do I need to be technical to use Aiser?**
**A:** **No!** Aiser is designed for everyone. The natural language interface means you can ask questions like "Show me sales by month" without any technical knowledge.

### **Q: What data formats does Aiser support?**
**A:** Aiser supports CSV, Excel (.xlsx, .xls), JSON, and direct database connections (PostgreSQL, MySQL, SQL Server, etc.).

## 🤖 AI & Analytics

### **Q: How does the AI understand my questions?**
**A:** Aiser uses advanced natural language processing (NLP) to understand your intent, context, and data structure. It automatically converts questions like "Show me top products by revenue" into optimized database queries.

### **Q: Which AI models does Aiser use?**
**A:** Aiser supports multiple AI providers:
- **OpenAI GPT-4.1-mini** (default)
- **Google Gemini 2.5**
- **Azure OpenAI**
- **Local models** (self-hosted)

### **Q: Can I train the AI on my specific domain?**
**A:** **Yes!** Aiser supports custom AI model training for domain-specific terminology, business rules, and industry knowledge. Contact us for enterprise customization.

### **Q: How accurate are the AI-generated insights?**
**A:** Aiser achieves **98%+ accuracy** through:
- Multi-model validation
- Business context understanding
- Automated quality checks
- Human-in-the-loop review options

## 📊 Charts & Visualizations

### **Q: What chart types does Aiser support?**
**A:** Aiser supports 20+ chart types including:
- **Basic**: Line, bar, pie, scatter plots
- **Advanced**: Heatmaps, treemaps, radar charts
- **Interactive**: 3D visualizations, drill-downs
- **Custom**: Domain-specific visualizations

### **Q: Can I customize the appearance of charts?**
**A:** **Absolutely!** Customize colors, fonts, layouts, annotations, and branding. Aiser provides professional templates and custom design options.

### **Q: How do I export charts for presentations?**
**A:** Export in multiple formats:
- **Images**: PNG, JPEG (high-resolution)
- **Documents**: PDF reports
- **Data**: CSV, Excel for further analysis
- **Interactive**: HTML for web embedding

### **Q: Can I create dashboards with multiple charts?**
**A:** **Yes!** Aiser supports multi-chart dashboards with:
- Real-time updates
- Interactive filtering
- Responsive layouts
- Mobile optimization

## 🔐 Authentication & Security

### **Q: Is Aiser secure for enterprise use?**
**A:** **Absolutely!** Aiser provides enterprise-grade security:
- **Authentication**: JWT, OAuth, SAML, SSO
- **Authorization**: Role-based access control (RBAC)
- **Encryption**: Data at-rest and in-transit
- **Compliance**: SOC 2, GDPR, HIPAA ready

### **Q: Can I integrate with my existing SSO system?**
**A:** **Yes!** Aiser supports:
- **SAML 2.0** for enterprise SSO
- **OAuth 2.0** for modern authentication
- **LDAP/Active Directory** integration
- **Custom authentication** providers

### **Q: How does Aiser handle data privacy?**
**A:** Aiser is **privacy-first**:
- **Self-hosted** option for full data control
- **No data sent** to external services (optional)
- **GDPR compliance** with data export/deletion
- **Audit logging** for compliance tracking

## 🏠 Self-Hosting & Deployment

### **Q: Can I self-host Aiser?**
**A:** **Yes!** Aiser is open-source and designed for self-hosting:
- **Docker**: Simple containerized deployment
- **Kubernetes**: Production-scale orchestration
- **Cloud**: AWS, Azure, GCP deployment guides
- **On-premises**: Traditional server deployment

### **Q: What databases does Aiser support?**
**A:** Aiser supports multiple databases:
- **Primary**: PostgreSQL (recommended)
- **Alternative**: MySQL, SQL Server
- **NoSQL**: MongoDB, Redis (caching)
- **Cloud**: Amazon RDS, Azure SQL, Google Cloud SQL

### **Q: How do I scale Aiser for my team?**
**A:** Scale Aiser with:
- **Horizontal scaling**: Multiple server instances
- **Load balancing**: Nginx, HAProxy
- **Caching**: Redis, Memcached
- **CDN**: Static asset optimization

### **Q: What's the performance like with large datasets?**
**A:** Aiser handles **millions of records** efficiently:
- **Query optimization**: AI-powered query planning
- **Caching**: Intelligent result caching
- **Parallel processing**: Multi-threaded analysis
- **Database optimization**: Index optimization, query tuning

## 💼 Enterprise Features

### **Q: What's the difference between open source and enterprise?**
**A:** **Open Source** (MIT License):
- Core AI analytics engine
- Basic authentication
- Community support

**Enterprise** (Commercial License):
- Advanced collaboration features
- Enterprise SSO and RBAC
- Advanced AI models
- Professional support and SLA

### **Q: Can I evaluate enterprise features?**
**A:** **Yes!** Enterprise features are available for **30-day evaluation**:
- Full feature access
- Sample data included
- Technical support
- No credit card required

### **Q: What compliance certifications does Aiser have?**
**A:** Aiser provides:
- **SOC 2 Type II** compliance
- **GDPR** data protection
- **HIPAA** healthcare compliance
- **ISO 27001** security standards

### **Q: Do you provide professional services?**
**A:** **Yes!** We offer:
- **Implementation consulting**
- **Custom development**
- **Training and certification**
- **24/7 support** with SLA

## 🔌 API & Integration

### **Q: Does Aiser provide APIs?**
**A:** **Yes!** Aiser offers comprehensive APIs:
- **REST API**: Full platform functionality
- **GraphQL**: Flexible data queries
- **Webhooks**: Real-time notifications
- **SDKs**: Python, JavaScript, Java

### **Q: Can I integrate Aiser with my existing BI tools?**
**A:** **Absolutely!** Aiser integrates with:
- **Tableau**: Data source integration
- **Power BI**: Custom connectors
- **Looker**: API integration
- **Custom tools**: REST API access

### **Q: How do I embed Aiser charts in my application?**
**A:** Embed charts easily:
```html
<iframe src="https://your-aiser-instance.com/embed/chart/123" 
        width="800" height="600"></iframe>
```
Or use the JavaScript SDK for full control.

## 🌍 Community & Support

### **Q: How can I contribute to Aiser?**
**A:** Join our community:
- **GitHub**: Code contributions, bug reports
- **Discussions**: Feature requests, questions
- **Documentation**: Help improve docs
- **Ambassador Program**: Community leadership

### **Q: What support options are available?**
**A:** Multiple support levels:
- **Community**: GitHub Discussions, Discord
- **Documentation**: Comprehensive guides
- **Enterprise**: Professional support with SLA
- **Training**: Workshops and certification

### **Q: How often do you release updates?**
**A:** Aiser follows a **monthly release cycle**:
- **Patch releases**: Weekly bug fixes
- **Feature releases**: Monthly new features
- **Major releases**: Quarterly major updates
- **LTS versions**: Long-term support releases

### **Q: Can I get help with custom development?**
**A:** **Yes!** We provide:
- **Custom development** services
- **Architecture consulting**
- **Performance optimization**
- **Integration assistance**

## 💰 Pricing & Licensing

### **Q: How much does Aiser cost?**
**A:** **Open source core is completely free!** Enterprise features have flexible pricing:
- **Starter**: $99/month (up to 10 users)
- **Professional**: $299/month (up to 50 users)
- **Enterprise**: Custom pricing (unlimited users)
- **Self-hosted**: One-time license fee

### **Q: What's included in the free version?**
**A:** Free version includes:
- **Full AI analytics engine**
- **Unlimited charts and dashboards**
- **Basic authentication**
- **Community support**
- **Self-hosting capability**

### **Q: Do you offer discounts for nonprofits/education?**
**A:** **Yes!** We provide:
- **Educational discounts**: 50% off for schools/universities
- **Nonprofit pricing**: Special rates for registered nonprofits
- **Open source projects**: Free enterprise licenses
- **Startup programs**: Discounted pricing for early-stage companies

## 🐛 Troubleshooting

### **Q: My charts aren't generating - what should I check?**
**A:** Common issues and solutions:
1. **AI service**: Check if AI models are configured
2. **Data format**: Verify CSV/Excel structure
3. **Permissions**: Check file upload permissions
4. **Logs**: Review service logs for errors

### **Q: Performance is slow with large datasets**
**A:** Optimize performance:
1. **Database indexing**: Add proper database indexes
2. **Caching**: Enable Redis caching
3. **Query optimization**: Use AI-suggested optimizations
4. **Hardware**: Increase CPU/RAM allocation

### **Q: Can't connect to external databases**
**A:** Check connectivity:
1. **Network**: Verify firewall and network access
2. **Credentials**: Check database username/password
3. **SSL**: Verify SSL certificate requirements
4. **Ports**: Ensure correct database ports are open

---

## 🆘 Still Need Help?

- **📖 [Documentation](../)** - Comprehensive guides
- **🐛 [GitHub Issues](https://github.com/aiser-platform/aiser-world/issues)** - Report bugs
- **💬 [Discussions](https://github.com/aiser-platform/aiser-world/discussions)** - Community help
- **📧 [Email Support](mailto:support@dataticon.com)** - Direct assistance
- **📞 [Phone Support](tel:+1-555-0123)** - Enterprise customers

---

**Can't find your answer?** [Ask the community →](https://github.com/aiser-platform/aiser-world/discussions)
