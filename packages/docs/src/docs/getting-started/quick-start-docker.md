---
id: quick-start-docker
title: Quick Start with Docker
sidebar_label: Docker Quick Start
description: Get Aicser Platform running in 5 minutes with Docker - the fastest way to experience AI-powered analytics
---

# 🐳 Quick Start with Docker

**Get Aicser Platform running in 5 minutes with Docker - the fastest way to experience AI-powered analytics.**

## ⚡ What You'll Get

In just a few minutes, you'll have:
- ✅ **AI-powered chart generation** running locally
- ✅ **Sample data** to explore and visualize
- ✅ **Web interface** accessible in your browser
- ✅ **API endpoints** ready for integration
- ✅ **Authentication service** for user management

## 🎯 Prerequisites

- **Docker Desktop** installed and running
- **Git** for cloning the repository
- **4GB+ RAM** available for containers
- **Modern web browser** (Chrome, Firefox, Safari, Edge)

## 🚀 Step-by-Step Setup

### 1. Clone the Repository

```bash
git clone https://github.com/aicser-platform/aicser-world
cd aicser-world
```

### 2. Start All Services

```bash
docker-compose up -d
```

This command will:
- Pull all required Docker images
- Start all services in the background
- Set up networking between services
- Initialize databases with sample data

### 3. Wait for Services to Start

```bash
# Check service status
docker-compose ps

# View logs (optional)
docker-compose logs -f
```

**⏱️ Expected startup time:** 2-3 minutes for first run

### 4. Access Your Aicser Platform

Once all services show "Up" status, open your browser:

| Service | URL | Purpose |
|---------|-----|---------|
| **🎨 Chat2Chart Frontend** | http://localhost:3000 | Main AI analytics interface |
| **🔌 Chat2Chart API** | http://localhost:8000 | Backend API endpoints |
| **🔐 Auth Service** | http://localhost:5000 | Authentication API |
| **📊 Cube.js Analytics** | http://localhost:4000 | High-performance analytics engine |

## 🧪 Test Your Installation

### Create Your First Chart

1. **Open** [http://localhost:3000](http://localhost:3000)
2. **Upload** the sample data file: `demo_sales_data.csv`
3. **Ask a question** like: "Show me sales by month"
4. **Watch** AI generate a beautiful chart instantly!

### Sample Questions to Try

- "What are the top 5 products by revenue?"
- "Show me sales trends over time"
- "Create a pie chart of sales by region"
- "What's the correlation between price and quantity sold?"

## 🔧 Configuration Options

### Environment Variables

Create a `.env` file in the root directory for customization:

```bash
# Copy example environment file
cp env.example .env

# Edit with your preferences
nano .env
```

**Key Configuration Options:**

```bash
# AI Model Configuration
OPENAI_API_KEY=your_openai_key_here
AZURE_OPENAI_API_KEY=your_azure_key_here
GOOGLE_AI_API_KEY=your_google_key_here

# Database Configuration
POSTGRES_DB=aicser_platform
POSTGRES_USER=aicser_user
POSTGRES_PASSWORD=secure_password

# Security
JWT_SECRET=your_jwt_secret_here
ENCRYPTION_KEY=your_encryption_key_here
```

### Port Customization

If you need different ports, modify `docker-compose.yml`:

```yaml
services:
  chat2chart-client:
    ports:
      - "3001:3000"  # Change 3001 to your preferred port
  chat2chart-server:
    ports:
      - "8001:8000"  # Change 8001 to your preferred port
```

## 🐛 Troubleshooting

### Common Issues & Solutions

#### 1. **Port Already in Use**
```bash
# Check what's using the port
lsof -i :3000

# Kill the process or change ports in docker-compose.yml
```

#### 2. **Services Not Starting**
```bash
# Check service logs
docker-compose logs chat2chart-server
docker-compose logs auth-service

# Restart specific service
docker-compose restart chat2chart-server
```

#### 3. **Database Connection Issues**
```bash
# Check database status
docker-compose exec postgres psql -U aicser_user -d aicser_platform

# Reset database (⚠️ destroys data)
docker-compose down -v
docker-compose up -d
```

#### 4. **AI Services Not Working**
```bash
# Check API keys are set
docker-compose exec chat2chart-server env | grep API_KEY

# Test AI endpoint
curl http://localhost:8000/health
```

### Performance Optimization

For better performance on development machines:

```bash
# Increase Docker resources
# Docker Desktop → Settings → Resources → Advanced
# Memory: 8GB+ | CPUs: 4+ | Swap: 2GB+

# Use host networking (Linux/macOS)
docker-compose --profile performance up -d
```

## 🚀 Next Steps

Now that you have Aicser running locally:

1. **📊 [Create Your First Chart](./first-chart)** - Experience AI analytics
2. **🎬 [Watch the Demo](./demo-walkthrough)** - Learn the interface
3. **🏠 [Deploy to Production](../self-host/self-host-index)** - Self-host for your team
4. **🔌 [Explore the API](../reference/api-reference)** - Integrate with your systems
5. **🤖 [Learn AI Features](../features/ai-overview)** - Master AI-powered analytics

## 🆘 Still Having Issues?

- **📖 [FAQ](./faq)** - Common solutions
- **🐛 [GitHub Issues](https://github.com/aicser-platform/aicser-world/issues)** - Report bugs
- **💬 [Discussions](https://github.com/aicser-platform/aicser-world/discussions)** - Community help
- **📧 [Email Support](mailto:support@dataticon.com)** - Direct support

## 🔄 Development Workflow

For developers who want to modify the code:

```bash
# Stop services
docker-compose down

# Make code changes
# ... edit files ...

# Rebuild and restart
docker-compose up -d --build

# Or run in development mode
docker-compose -f docker-compose.dev.yml up -d
```

---

**🎉 Congratulations!** You now have Aicser Platform running locally. [Create your first chart →](./first-chart) to experience the power of AI-powered analytics.
