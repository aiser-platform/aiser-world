#!/usr/bin/env python3
"""
AI-Powered Documentation Generator for Aiser Platform
Automatically generates comprehensive documentation from codebase
"""

import asyncio
import json
import os
import re
from pathlib import Path
from typing import Dict, List, Optional
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class DocumentationGenerator:
    def __init__(self):
        self.project_root = Path(__file__).parent.parent.parent.parent
        # FIXED: Create docs in the correct location for Docusaurus
        self.docs_path = Path(__file__).parent.parent / "docs"
        self.templates_path = Path(__file__).parent / "templates"
        
        # Ensure docs directory exists
        self.docs_path.mkdir(parents=True, exist_ok=True)
        
    async def generate_all_documentation(self):
        """Generate complete documentation suite"""
        logger.info("🚀 Starting AI-powered documentation generation...")
        
        try:
            # Generate getting started docs
            await self._generate_getting_started()
            
            # Generate feature documentation
            await self._generate_features()
            
            # Generate self-host guides
            await self._generate_self_host()
            
            # Generate auth documentation (NEW)
            await self._generate_auth()
            
            # Generate developer docs
            await self._generate_developer()
            
            # Generate community docs
            await self._generate_community()
            
            # Generate reference docs
            await self._generate_reference()
            
            logger.info("✅ Documentation generation completed successfully!")
            
        except Exception as e:
            logger.error(f"❌ Error generating documentation: {e}")
            raise
    
    async def _generate_getting_started(self):
        """Generate getting started documentation"""
        logger.info(" Generating getting started documentation...")
        
        # Create getting started directory
        getting_started_path = self.docs_path / "getting-started"
        getting_started_path.mkdir(exist_ok=True)
        
        # Generate index (FIXED: use correct filename)
        index_content = self._get_template("getting-started-index.md")
        (getting_started_path / "index.md").write_text(index_content)
        
        # Generate quick start docker
        docker_content = self._get_template("quick-start-docker.md")
        (getting_started_path / "quick-start-docker.md").write_text(docker_content)
        
        # Generate first chart
        first_chart_content = self._get_template("first-chart.md")
        (getting_started_path / "first-chart.md").write_text(first_chart_content)
        
        # Generate demo walkthrough
        demo_content = self._get_template("demo-walkthrough.md")
        (getting_started_path / "demo-walkthrough.md").write_text(demo_content)
        
        # Generate FAQ
        faq_content = self._get_template("faq.md")
        (getting_started_path / "faq.md").write_text(faq_content)
    
    async def _generate_features(self):
        """Generate feature documentation"""
        logger.info(" Generating feature documentation...")
        
        features_path = self.docs_path / "features"
        features_path.mkdir(exist_ok=True)
        
        # Generate AI overview
        ai_overview = self._get_template("ai-overview.md")
        (features_path / "ai-overview.md").write_text(ai_overview)
        
        # Generate charts overview
        charts_overview = self._get_template("charts-overview.md")
        (features_path / "charts-overview.md").write_text(charts_overview)
        
        # Generate data sources overview
        data_sources = self._get_template("data-sources-overview.md")
        (features_path / "data-sources-overview.md").write_text(data_sources)
        
        # Generate individual feature docs
        feature_files = [
            "natural-language-queries.md",
            "agents.md",
            "conversation-memory.md",
            "what-if-simulations.md",
            "custom-prompts.md",
            "line-charts.md",
            "bar-charts.md",
            "heatmaps.md",
            "echarts-integration.md",
            "deep-analysis.md",
            "csv-excel.md",
            "databases.md",
            "warehouses.md",
            "real-time-streams.md"
        ]
        
        for feature_file in feature_files:
            content = self._get_template(f"features/{feature_file}")
            (features_path / feature_file).write_text(content)
    
    async def _generate_self_host(self):
        """Generate self-host documentation"""
        logger.info("🏠 Generating self-host documentation...")
        
        self_host_path = self.docs_path / "self-host"
        self_host_path.mkdir(exist_ok=True)
        
        # Generate index (FIXED: use correct filename)
        index_content = self._get_template("self-host-index.md")
        (self_host_path / "index.md").write_text(index_content)
        
        # Generate deployment recipes
        docker_compose = self._get_template("docker-compose.md")
        (self_host_path / "docker-compose.md").write_text(docker_compose)
        
        # Generate configuration docs
        config_files = [
            "config-reference.md",
            "ssl-certificates.md",
            "backups.md"
        ]
        
        for config_file in config_files:
            content = self._get_template(f"self-host/{config_file}")
            (self_host_path / config_file).write_text(content)
    
    async def _generate_auth(self):
        """Generate authentication documentation"""
        logger.info("🔐 Generating authentication documentation...")
        
        auth_path = self.docs_path / "auth"
        auth_path.mkdir(exist_ok=True)
        
        # Generate auth index
        auth_index = self._get_template("auth-index.md")
        (auth_path / "index.md").write_text(auth_index)
        
        # Generate auth files
        auth_files = [
            "jwt-setup.md",
            "saml-integration.md",
            "rbac.md",
            "audit-logging.md"
        ]
        
        for auth_file in auth_files:
            content = self._get_template(f"auth/{auth_file}")
            (auth_path / auth_file).write_text(content)
    
    async def _generate_developer(self):
        """Generate developer documentation"""
        logger.info("🛠️ Generating developer documentation...")
        
        developer_path = self.docs_path / "developer"
        developer_path.mkdir(exist_ok=True)
        
        # Generate index (FIXED: use correct filename)
        index_content = self._get_template("developer-index.md")
        (developer_path / "index.md").write_text(index_content)
        
        # Generate developer guides
        dev_files = [
            "local-dev.md",
            "architecture.md",
            "writing-tests.md",
            "plugin-architecture.md",
            "release-process.md"
        ]
        
        for dev_file in dev_files:
            content = self._get_template(f"developer/{dev_file}")
            (developer_path / dev_file).write_text(content)
    
    async def _generate_community(self):
        """Generate community documentation"""
        logger.info("🌍 Generating community documentation...")
        
        community_path = self.docs_path / "community"
        community_path.mkdir(exist_ok=True)
        
        # Generate index (FIXED: use correct filename)
        index_content = self._get_template("community-index.md")
        (community_path / "index.md").write_text(index_content)
        
        # Generate community guides
        community_files = [
            "roadmap.md",
            "contributing.md",
            "code-of-conduct.md",
            "bi-weekly-calls.md",
            "ambassador-program.md"
        ]
        
        for community_file in community_files:
            content = self._get_template(f"community/{community_file}")
            (community_path / community_file).write_text(content)
    
    async def _generate_reference(self):
        """Generate reference documentation"""
        logger.info("📖 Generating reference documentation...")
        
        reference_path = self.docs_path / "reference"
        reference_path.mkdir(exist_ok=True)
        
        # Generate API reference
        api_ref = self._get_template("api-reference.md")
        (reference_path / "api-reference.md").write_text(api_ref)
        
        # Generate configuration reference
        config_ref = self._get_template("config-reference.md")
        (reference_path / "config-reference.md").write_text(config_ref)
    
    def _get_template(self, template_name: str) -> str:
        """Get template content or return default content"""
        template_path = self.templates_path / template_name
        
        if template_path.exists():
            return template_path.read_text()
        
        # Return default content if template doesn't exist
        return self._get_default_content(template_name)
    
    def _get_default_content(self, template_name: str) -> str:
        """Generate default content for missing templates"""
        base_name = Path(template_name).stem
        
        if "index" in base_name:
            return f"""---
id: {base_name}
title: {base_name.replace('-', ' ').title()}
sidebar_label: {base_name.replace('-', ' ').title()}
---

# {base_name.replace('-', ' ').title()}

Welcome to the {base_name.replace('-', ' ').title()} section of Aiser Platform documentation.

## Overview

This section provides comprehensive information about {base_name.replace('-', ' ').lower()}.

## Quick Links

- [Getting Started](/docs/getting-started)
- [Features](/docs/features)
- [API Reference](/reference)

## Need Help?

If you can't find what you're looking for, please:
- Check our [FAQ](/docs/getting-started/faq)
- Search the documentation
- Open an issue on [GitHub](https://github.com/aiser-platform/aiser-world/issues)
"""
        
        return f"""---
id: {base_name}
title: {base_name.replace('-', ' ').title()}
sidebar_label: {base_name.replace('-', ' ').title()}
---

# {base_name.replace('-', ' ').title()}

## Overview

This page covers {base_name.replace('-', ' ').lower()} in detail.

## Content

Documentation content will be generated here.

## Related

- [Getting Started](/docs/getting-started)
- [Features](/docs/features)
"""

async def main():
    """Main function"""
    generator = DocumentationGenerator()
    await generator.generate_all_documentation()

if __name__ == "__main__":
    asyncio.run(main())
