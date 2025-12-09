# Open Source Release Preparation Checklist

**Date**: November 7, 2025  
**Target Release**: Q1 2026  
**License**: MIT (Core) + Commercial (Enterprise)

---

## Phase 1: Security Audit ✅

### A. Remove Hardcoded Secrets

#### Checked Locations:
- [ ] `.env` files (should be `.env.example` only)
- [ ] Configuration files (`config.py`, `settings.ts`)
- [ ] Database connection strings
- [ ] API keys and tokens
- [ ] Docker compose files

#### Action Items:
```bash
# Search for potential secrets
grep -r "password\|secret\|api_key\|token" packages/ --include="*.py" --include="*.ts" --include="*.js" | \
  grep -v "\.example" | \
  grep -v "test" | \
  grep -v "# "
```

### B. Environment Variables

Create comprehensive `.env.example` files:

**Root `.env.example`**:
```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/aiser_world
REDIS_URL=redis://localhost:6379

# AI Services
OPENAI_API_KEY=your_openai_key_here
AZURE_OPENAI_KEY=your_azure_key_here
AZURE_OPENAI_ENDPOINT=https://your-endpoint.openai.azure.com

# Authentication
JWT_SECRET=your_jwt_secret_here
JWT_ALGORITHM=HS256

# External Services (Optional)
CUBE_API_SECRET=your_cube_secret_here
```

---

## Phase 2: License Headers

### MIT License Header (OSS Core)

```python
# Copyright (c) 2025 BigStack Analytics
# 
# Permission is hereby granted, free of charge, to any person obtaining a copy
# of this software and associated documentation files (the "Software"), to deal
# in the Software without restriction, including without limitation the rights
# to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
# copies of the Software, and to permit persons to whom the Software is
# furnished to do so, subject to the following conditions:
# 
# The above copyright notice and this permission notice shall be included in all
# copies or substantial portions of the Software.
# 
# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
# IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
# FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
# AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
# LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
# OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
# SOFTWARE.
```

### Commercial License Header (Enterprise)

```python
# Copyright (c) 2025 BigStack Analytics
# 
# This file is part of Aiser Platform Enterprise Edition.
# 
# Aiser Platform Enterprise Edition is proprietary software.
# Unauthorized copying, modification, distribution, or use of this software
# is strictly prohibited without explicit written permission from BigStack Analytics.
# 
# For licensing inquiries, contact: license@bigstack-analytics.com
```

### Files Requiring Headers:

**Open Source (MIT)**:
- `packages/chat2chart/**/*.py`
- `packages/chat2chart/**/*.ts`
- `packages/chat2chart/**/*.tsx`
- `packages/shared/**/*`
- `packages/docs/**/*`

**Enterprise (Commercial)**:
- `packages/auth/**/*.py`
- `packages/monitoring-service/**/*`
- `packages/billing-service/**/*`
- `packages/rate-limiting-service/**/*`

---

## Phase 3: Documentation

### A. Main README.md ✅

**Structure**:
1. Project Overview
2. Features (OSS Core)
3. Enterprise Features (brief mention)
4. Quick Start
5. Architecture
6. Contributing
7. License

### B. CONTRIBUTING.md

```markdown
# Contributing to Aiser Platform

We love your input! We want to make contributing as easy and transparent as possible.

## Open Source Core

The following packages are open source (MIT):
- `packages/chat2chart/` - AI-powered chart generation
- `packages/shared/` - Shared utilities
- `packages/docs/` - Documentation

## Development Process

1. Fork the repo
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## Code Style

- Python: Follow PEP 8, use Black formatter
- TypeScript: Follow Airbnb style guide, use Prettier
- Add tests for new features
- Update documentation as needed

## Testing

```bash
# Run all tests
npm test

# Run Python tests
cd packages/chat2chart/server
poetry run pytest

# Run TypeScript tests
cd packages/chat2chart/client
npm test
```

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
```

### C. CODE_OF_CONDUCT.md

Use standard Contributor Covenant.

### D. SECURITY.md

```markdown
# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

**Do not** report security vulnerabilities through public GitHub issues.

Instead, please email security@bigstack-analytics.com

You should receive a response within 48 hours.
```

---

## Phase 4: Repository Setup

### A. Branch Strategy

```
main (production)
├── develop (integration)
├── feature/* (new features)
├── bugfix/* (bug fixes)
└── release/* (release candidates)
```

### B. GitHub Settings

- [ ] Enable branch protection for `main`
- [ ] Require PR reviews (min 1)
- [ ] Require status checks to pass
- [ ] Enable automatic security updates
- [ ] Configure Dependabot
- [ ] Add issue templates
- [ ] Add PR template

### C. Issue Templates

Create `.github/ISSUE_TEMPLATE/`:
- `bug_report.md`
- `feature_request.md`
- `question.md`

---

## Phase 5: CI/CD Setup

### A. GitHub Actions Workflows

#### `.github/workflows/test.yml`

```yaml
name: Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  test-python:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      - name: Install dependencies
        run: |
          pip install poetry
          cd packages/chat2chart/server
          poetry install
      - name: Run tests
        run: |
          cd packages/chat2chart/server
          poetry run pytest

  test-typescript:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm ci
      - name: Run tests
        run: npm test
```

#### `.github/workflows/security.yml`

```yaml
name: Security Scan

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]
  schedule:
    - cron: '0 0 * * 0'  # Weekly

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'
          scan-ref: '.'
          format: 'sarif'
          output: 'trivy-results.sarif'
      
      - name: Upload Trivy results to GitHub Security tab
        uses: github/codeql-action/upload-sarif@v2
        with:
          sarif_file: 'trivy-results.sarif'
```

### B. Dependabot Configuration

`.github/dependabot.yml`:

```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 10

  - package-ecosystem: "pip"
    directory: "/packages/chat2chart/server"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 10

  - package-ecosystem: "docker"
    directory: "/"
    schedule:
      interval: "weekly"
```

---

## Phase 6: Security Scanning

### A. SAST (Static Application Security Testing)

Tools to integrate:
- **Bandit** (Python) - security linter
- **ESLint Security Plugin** (TypeScript)
- **Snyk** - dependency vulnerability scanning
- **CodeQL** - GitHub's security scanner

### B. Dependency Scanning

```bash
# Python
pip install safety
safety check

# Node.js
npm audit
```

### C. Secret Scanning

```bash
# Use git-secrets or trufflehog
pip install trufflehog
trufflehog filesystem . --only-verified
```

---

## Phase 7: Marketing & Community

### A. Landing Page Content

- Product description
- Live demo
- Documentation links
- GitHub stars badge
- License badges (MIT + Commercial)

### B. Social Media Presence

- [ ] Twitter/X account
- [ ] LinkedIn company page
- [ ] Discord/Slack community
- [ ] Dev.to blog

### C. Launch Checklist

- [ ] Product Hunt submission
- [ ] Hacker News Show HN
- [ ] Reddit r/programming
- [ ] Dev.to article
- [ ] Medium blog post
- [ ] LinkedIn announcement

---

## Phase 8: Legal & Compliance

### A. Terms of Service

For enterprise customers.

### B. Privacy Policy

GDPR compliance for EU users.

### C. CLA (Contributor License Agreement)

Optional but recommended for larger projects.

---

## Timeline

| Phase | Duration | Status |
|-------|----------|--------|
| Security Audit | 1 week | In Progress |
| License Headers | 2 days | Pending |
| Documentation | 1 week | Pending |
| Repository Setup | 2 days | Pending |
| CI/CD Setup | 3 days | Pending |
| Security Scanning | 1 week | Pending |
| Marketing Prep | 2 weeks | Pending |
| Legal Review | 1 week | Pending |

**Total**: ~6-8 weeks

---

## Success Criteria

- [ ] No hardcoded secrets in codebase
- [ ] All files have appropriate license headers
- [ ] Comprehensive documentation (README, CONTRIBUTING, etc.)
- [ ] CI/CD pipelines passing
- [ ] Security scans show no critical vulnerabilities
- [ ] Legal review completed
- [ ] Community channels set up
- [ ] Launch materials ready

---

## Resources

- [GitHub Open Source Guides](https://opensource.guide/)
- [Choosing an OSS License](https://choosealicense.com/)
- [First Timers Only](https://www.firsttimersonly.com/)
- [How to Open Source](https://github.com/readme/guides/open-source-startup)

---

**Status**: Preparation Phase  
**Target**: Q1 2026 Launch

