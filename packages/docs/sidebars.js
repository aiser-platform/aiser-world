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
      ]
    },

    // Features
    {
      type: 'category',
      label: '🤖 Features',
      items: [
        'features/features',
        'features/ai-overview',
        'features/charts-overview',
        'features/data-sources-overview',
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
      ]
    },

    // Community
    {
      type: 'category',
      label: '🌍 Community',
      collapsed: true,
      items: [
        'community/community-index',
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
