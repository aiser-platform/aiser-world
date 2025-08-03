# Repository Setup Instructions for `aiser-world`

## 🎯 **Unified Monorepo Strategy Implementation**

Following the recommendation, we're creating `bigstack-analytics/aiser-world` as the single source of truth for all Aiser World development.

## 📋 **Step-by-Step Setup**

### **Step 1: Create New Main Repository**

1. **Create Repository on GitHub:**
   ```
   Repository Name: aiser-world
   Organization: bigstack-analytics
   Description: AI-powered alternative to PowerBI with open source core
   Visibility: Public
   ```

2. **Initialize Repository:**
   ```bash
   # On GitHub, create the repository
   # Don't initialize with README (we'll push our existing content)
   ```

### **Step 2: Push Current Monorepo**

```bash
# In current directory (~/project/aiser)
git remote add origin https://github.com/bigstack-analytics/aiser-world.git

# Add all files
git add .

# Initial commit
git commit -m "Initial commit: Unified Aiser World monorepo

- Integrated Chat2Chart (open source AI engine)
- Integrated Enterprise Client (commercial features)
- Integrated Authentication service (enterprise auth)
- Added shared utilities package
- Implemented dual licensing (MIT + Commercial)
- Set up monorepo tooling (TypeScript, ESLint, Prettier, Jest)
- Added development scripts and documentation"

# Push to main branch
git branch -M main
git push -u origin main
```

### **Step 3: Update Existing Repositories**

#### **3.1 Update Aiser-Chat2Chart Repository**

```bash
# Clone the original repository
git clone https://github.com/bigstack-analytics/Aiser-Chat2Chart.git temp-chat2chart
cd temp-chat2chart

# Create migration notice
cat > README.md << 'EOF'
# 🚀 This Project Has Moved!

**Aiser Chat2Chart** is now part of the unified **Aiser World** platform.

## 📍 New Location
**Repository:** https://github.com/bigstack-analytics/aiser-world  
**Package:** `packages/chat2chart/`  
**License:** MIT (Open Source)

## 🔄 Migration Guide

### For Users
```bash
# Old way
git clone https://github.com/bigstack-analytics/Aiser-Chat2Chart.git

# New way
git clone https://github.com/bigstack-analytics/aiser-world.git
cd aiser-world
# Chat2Chart is in packages/chat2chart/
```

### For Contributors
All development now happens in the main repository:
- **Issues:** https://github.com/bigstack-analytics/aiser-world/issues
- **Pull Requests:** https://github.com/bigstack-analytics/aiser-world/pulls
- **Discussions:** https://github.com/bigstack-analytics/aiser-world/discussions

## ✨ Benefits of the Move
- 🔧 **Unified Development:** Single repo for all components
- 🚀 **Better Integration:** Seamless cross-component development
- 📚 **Centralized Docs:** All documentation in one place
- 🤝 **Community:** Single place for issues and contributions
- 🎯 **Clear Licensing:** Open source core + enterprise features

## 🆓 Open Source Components
- **Chat2Chart Core:** AI-powered chart generation (MIT License)
- **Shared Utilities:** Common types and utilities (MIT License)

## 💼 Enterprise Components
- **Advanced Client:** Professional UI/UX and collaboration
- **Enterprise Auth:** SSO, SAML, MFA, advanced RBAC

---
**Questions?** Open an issue in the [main repository](https://github.com/bigstack-analytics/aiser-world/issues)
EOF

# Create detailed migration instructions
cat > MIGRATION.md << 'EOF'
# Migration from Aiser-Chat2Chart to Aiser World

## Overview
This repository has been integrated into the unified Aiser World platform for better development experience and feature integration.

## What Changed
- **Location:** Now in `packages/chat2chart/` of the main repository
- **Development:** All development happens in the monorepo
- **Features:** Enhanced with shared utilities and better integration
- **License:** Still MIT (open source)

## For Existing Users

### If you were using the standalone version:
```bash
# Your existing setup still works, but consider migrating
cd your-project
npm install @aiser-world/shared  # New shared utilities
```

### If you were contributing:
```bash
# Clone the new repository
git clone https://github.com/bigstack-analytics/aiser-world.git
cd aiser-world

# Install dependencies
npm install

# Start Chat2Chart development
npm run dev:chat2chart
```

## Benefits of Migration
1. **Shared Utilities:** Access to `@aiser-world/shared` package
2. **Better Testing:** Unified testing framework
3. **Cross-Integration:** Easy integration with other components
4. **Single Setup:** One repository, one development environment

## Support
- **Issues:** https://github.com/bigstack-analytics/aiser-world/issues
- **Documentation:** https://github.com/bigstack-analytics/aiser-world/tree/main/docs
- **Community:** https://github.com/bigstack-analytics/aiser-world/discussions
EOF

# Commit and push the migration notice
git add .
git commit -m "Repository moved to aiser-world monorepo

This repository is now part of the unified Aiser World platform.
All development continues in: https://github.com/bigstack-analytics/aiser-world

The Chat2Chart component is available in packages/chat2chart/ with the same MIT license."

git push origin main

# Archive the repository (do this on GitHub UI)
# Go to Settings > General > Archive this repository
```

#### **3.2 Update Aiser-Client Repository**

```bash
# Similar process for client repository
git clone https://github.com/bigstack-analytics/Aiser-Client.git temp-client
cd temp-client

# Create migration notice (similar to above but for enterprise client)
# Update README.md and create MIGRATION.md
# Commit and push
# Archive the repository
```

#### **3.3 Update Authentication Repository**

```bash
# Similar process for authentication repository
git clone https://github.com/bigstack-analytics/authentication.git temp-auth
cd temp-auth

# Create migration notice (similar to above but for auth service)
# Update README.md and create MIGRATION.md
# Commit and push
# Archive the repository
```

### **Step 4: Set Up CI/CD for New Repository**

Create `.github/workflows/ci.yml` in the main repository:

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run linting
      run: npm run lint
    
    - name: Run type checking
      run: npm run typecheck
    
    - name: Run tests
      run: npm run test
    
    - name: Build packages
      run: npm run build

  license-check:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Check licenses
      run: npm run license:check
```

### **Step 5: Update Documentation**

1. **Update all documentation** to reference `aiser-world` repository
2. **Update package imports** to use `@aiser-world/shared`
3. **Update CI/CD references** to point to new repository
4. **Update issue templates** and contribution guidelines

## 🎉 **Expected Outcomes**

After completing these steps:

1. ✅ **Single Source of Truth:** `bigstack-analytics/aiser-world`
2. ✅ **Clear Migration Path:** Users know where to find the code
3. ✅ **Preserved History:** All commit history maintained
4. ✅ **Community Continuity:** Issues and discussions in one place
5. ✅ **Development Efficiency:** Unified tooling and processes

## 📊 **Repository Structure**

```
bigstack-analytics/aiser-world/
├── packages/
│   ├── chat2chart/     # 🆓 Open Source (MIT)
│   ├── client/         # 💼 Enterprise (Commercial)
│   ├── auth/           # 💼 Enterprise (Commercial)
│   └── shared/         # 🆓 Open Source (MIT)
├── docs/               # 📚 Documentation
├── scripts/            # 🛠️ Development scripts
├── tools/              # 🔧 Build tools
├── .github/            # 🤖 CI/CD workflows
└── README.md           # 📖 Main documentation
```

This setup provides the optimal balance of development efficiency, community building, and business model support.