// sidebars.js — Complete version with all custom sections
// Includes our comprehensive security, performance, and troubleshooting guides

const sidebars = {
  docs: [
    // Getting Started
    {
      type: 'category',
      label: '🚀 Getting Started',
      collapsed: false,
      items: [
        'getting-started/getting-started-index',
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
        'self-host/docker-compose'
      ]
    },

    // Security & Performance (Our custom comprehensive guides)
    {
      type: 'category',
      label: '🔒 Security & Performance',
      collapsed: true,
      items: [
        'security/security-overview',
        'performance/performance-overview'
      ]
    },

    // Troubleshooting (Our custom comprehensive guide)
    {
      type: 'category',
      label: '🛠️ Troubleshooting',
      collapsed: true,
      items: [
        'troubleshooting/troubleshooting-overview'
      ]
    },

    // Features
    {
      type: 'category',
      label: '🤖 Features',
      items: [
        'features/ai-overview'
      ]
    },

    // Developer
    {
      type: 'category',
      label: '🛠️ Developer',
      items: [
        'developer/developer-index'
      ]
    },

    // Community
    {
      type: 'category',
      label: '🌍 Community',
      items: [
        'community/community-index'
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
    }
  ]
};

module.exports = sidebars;
