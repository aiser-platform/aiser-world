---
id: developer-index
title: Developer Guide
sidebar_label: Developer Guide
description: Contribute to Aicser Platform development, understand the architecture, and build custom extensions
---

# 🛠️ Developer Guide

**Welcome to Aicser Platform development! Build, extend, and contribute to the world's most advanced AI-powered analytics platform.**

## 🎯 Quick Start

### **Development Environment**
```bash
# Prerequisites
- Node.js 20+ and npm 9+ (required for Docusaurus 3.1.1)
- Python 3.11+ with pip
- PostgreSQL 15+ and Redis 7+
- Docker and Docker Compose

# Setup
git clone https://github.com/aiser-platform/aiser-world
cd aiser-world
npm install
npm run build:shared
./scripts/dev.sh docker
```

### **Architecture Overview**
- **Frontend**: Next.js 14 + React 18 + TypeScript
- **Backend**: FastAPI + Python 3.11+ + SQLAlchemy
- **Database**: PostgreSQL 15+ + Redis 7+
- **AI/ML**: LiteLLM + Custom Models + AI Agents
- **Analytics**: Cube.js for high-performance queries

## 🏗️ Platform Architecture

### **Core Packages**

| Package | Purpose | License | Technology |
|---------|---------|---------|------------|
| **chat2chart** | AI-powered chart generation (Open Source Core) | MIT | Next.js 14 + FastAPI |
| **auth** | Authentication & authorization | Enterprise | FastAPI + JWT |
| **shared** | Common utilities and types | MIT | TypeScript + Python |
| **cube** | Analytics semantic layer | MIT | Cube.js |
| **docs** | Documentation | MIT | Docusaurus |

### **Enterprise Services**

| Service | Purpose | Port | Technology |
|---------|---------|------|------------|
| **Chat2Chart Client** | User interface | 3000 | Next.js + React |
| **Chat2Chart Server** | AI analytics API | 8000 | FastAPI + Python |
| **Auth Service** | Authentication | 5000 | FastAPI + JWT |
| **Cube.js** | Analytics engine | 4000 | Node.js |
| **Monitoring Service** | Observability & metrics | - | FastAPI |
| **Billing Service** | Subscription management | - | FastAPI |
| **Rate Limiting Service** | API rate limiting | - | FastAPI |
| **Backup Service** | Data backup & restore | - | FastAPI |
| **PostgreSQL** | Primary database | 5432 | Database |
| **Redis** | Caching | 6379 | Cache |

## 🔧 Development Workflow

### **1. Feature Development**
```bash
git checkout -b feature/amazing-feature
# Make changes and test
npm run test
npm run lint
npm run typecheck
git commit -m "feat: add amazing new feature"
git push origin feature/amazing-feature
```

### **2. Testing Strategy**
```bash
npm run test:unit      # Unit tests
npm run test:integration  # Integration tests
npm run test:e2e       # End-to-end tests
npm run lint:fix       # Fix linting issues
npm run format         # Format code
```

### **3. Code Quality**
- **ESLint** + **Prettier** for JavaScript/TypeScript
- **Black** + **isort** for Python
- **Pre-commit hooks** for automated checks
- **TypeScript** for type safety

## 🚀 Key Development Areas

### **Frontend Development**
- **React components** with TypeScript
- **Custom chart types** using ECharts/AntV
- **State management** with React Query
- **Styling** with Tailwind CSS

### **Backend Development**
- **FastAPI endpoints** with Pydantic validation
- **Database models** with SQLAlchemy
- **AI service integration** with LiteLLM
- **Background tasks** with Celery

### **AI/ML Development**
- **Custom AI models** and algorithms
- **AI agent development** for specialized analysis
- **Model training** and optimization
- **Multi-provider** AI orchestration

### **Plugin Development**
- **Chart plugins** for custom visualizations
- **Data source plugins** for custom connectors
- **Analytics plugins** for custom functions
- **Integration plugins** for third-party services

## 🔌 Plugin System

### **Plugin Architecture**
```
plugins/
├── chart_types/           # Custom chart visualizations
├── data_sources/          # Custom data connectors
├── ai_models/            # Custom AI models
├── analytics/             # Custom analytics functions
└── integrations/          # Third-party integrations
```

### **Example Chart Plugin**
```python
class CustomRadarChart(ChartPlugin):
    """Custom radar chart visualization."""
    
    @property
    def name(self) -> str:
        return "custom_radar_chart"
    
    def render(self, data: Dict[str, Any], options: Dict[str, Any]) -> str:
        """Generate ECharts radar chart."""
        # Implementation here
        pass
    
    def validate_data(self, data: Dict[str, Any]) -> bool:
        """Validate input data."""
        required_keys = ["categories", "values"]
        return all(key in data for key in required_keys)
```

## 🧪 Testing & Quality

### **Testing Strategy**
- **Unit tests** for individual components
- **Integration tests** for service communication
- **End-to-end tests** for user workflows
- **Performance tests** for scalability

### **Code Quality Tools**
- **Pre-commit hooks** for automated checks
- **ESLint** + **Prettier** for JavaScript
- **Black** + **isort** for Python
- **TypeScript** for type safety

## 🔒 Security Development

### **Best Practices**
- **Input validation** with Pydantic models
- **JWT authentication** with proper validation
- **SQL injection prevention** with SQLAlchemy
- **Rate limiting** and DDoS protection
- **CORS configuration** for web security

### **Example Security Implementation**
```python
class ChartRequest(BaseModel):
    query: str
    chart_type: str
    
    @validator('query')
    def validate_query(cls, v):
        if not v.strip():
            raise ValueError('Query cannot be empty')
        if len(v) > 1000:
            raise ValueError('Query too long')
        return v.strip()
```

## 📚 Documentation Standards

### **Code Documentation**
- **Python docstrings** with examples
- **TypeScript JSDoc** for functions
- **API documentation** with OpenAPI/Swagger
- **Architecture diagrams** with Mermaid

### **Example Documentation**
```python
def analyze_market_trends(data: pd.DataFrame, window_size: int = 30) -> Dict[str, Any]:
    """
    Analyze market trends using moving averages.
    
    Args:
        data: Input DataFrame with time series data
        window_size: Size of moving average window (default: 30)
    
    Returns:
        Dictionary with trend analysis results
    
    Example:
        >>> result = analyze_market_trends(sales_data)
        >>> print(result['trend_direction'])
        'upward'
    """
    pass
```

## 🌍 Community & Contribution

### **Contribution Process**
1. **Fork** the repository
2. **Create** feature branch
3. **Make changes** following standards
4. **Add tests** for new functionality
5. **Update documentation**
6. **Create Pull Request**

### **Getting Help**
- **📖 [Documentation](../)** - Comprehensive guides
- **🐛 [GitHub Issues](https://github.com/aiser-platform/aiser-world/issues)** - Bug reports
- **💬 [Telegram Community](https://t.me/+XyM6Y-8MnWU2NTM1)** - Community support
- **📧 [Developer Support](mailto:support@aicser.com)** - Direct help

## 📚 Next Steps

1. **🔧 [Local Development](./local-dev)** - Set up development environment
2. **🏗️ [Architecture Guide](./architecture)** - Understand system design
3. **🧪 [Testing Guide](./writing-tests)** - Learn testing best practices
4. **🔌 [Plugin Development](./plugin-architecture)** - Build custom extensions

---

**Ready to contribute?** [Start with local development →](./local-dev)
