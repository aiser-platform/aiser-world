// sidebars.js — Clean version with only existing content
// Only includes files that actually exist in the src/docs directory

const sidebars = {
  docs: [
    // Main Homepage
    'index',

    // Getting Started
    {
      type: 'category',
      label: '🚀 Getting Started',
      collapsed: false,
      items: [
        'getting-started/getting-started',
        'getting-started/quick-start-docker',
        'getting-started/first-chart',
        'getting-started/demo-walkthrough',
        'getting-started/faq'
      ]
    },

    // Self-Host
    {
      type: 'category',
      label: '🏠 Self-Host & Enterprise',
      items: [
        'self-host/self-host-index',
        'self-host/docker-compose',
        'self-host/backups',
        'self-host/config-reference',
        'self-host/ssl-certificates'
      ]
    },

    // Features
    {
      type: 'category',
      label: '🤖 Features',
      items: [
        'features/ai-overview',
        'features/agents',
        'features/bar-charts',
        'features/charts-overview',
        'features/conversation-memory',
        'features/csv-excel',
        'features/custom-prompts',
        'features/data-sources-overview',
        'features/databases',
        'features/deep-analysis',
        'features/echarts-integration',
        'features/heatmaps',
        'features/line-charts',
        'features/natural-language-queries',
        'features/real-time-streams',
        'features/warehouses',
        'features/what-if-simulations'
      ]
    },

    // Security
    {
      type: 'category',
      label: '🔒 Security',
      collapsed: true,
      items: [
        'security/security-overview'
      ]
    },

    // Performance
    {
      type: 'category',
      label: '⚡ Performance',
      collapsed: true,
      items: [
        'performance/performance-overview'
      ]
    },

    // Developer
    {
      type: 'category',
      label: '🛠️ Developer',
      collapsed: true,
      items: [
        'developer/developer-index',
        'developer/architecture',
        'developer/local-dev',
        'developer/plugin-architecture',
        'developer/release-process',
        'developer/writing-tests'
      ]
    },

    // Community
    {
      type: 'category',
      label: '🌍 Community',
      collapsed: true,
      items: [
        'community/community-index',
        'community/ambassador-program',
        'community/bi-weekly-calls',
        'community/code-of-conduct',
        'community/contributing',
        'community/roadmap'
      ]
    },

    // Reference
    {
      type: 'category',
      label: '📖 Reference',
      collapsed: true,
      items: [
        'reference/api-reference',
        'reference/config-reference'
      ]
    },

    // Troubleshooting
    {
      type: 'category',
      label: '🛠️ Troubleshooting',
      collapsed: true,
      items: [
        'troubleshooting/troubleshooting-overview'
      ]
    }
  ]
};

module.exports = sidebars;
