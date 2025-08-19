// sidebars.js — (single source of truth)
// 1️⃣ Top-level order is intentional — matches the user journey
// 2️⃣ "collapsed" defaults to TRUE except for "Getting Started"
// 3️⃣ Emoji + text = screen-reader friendly (tested with NVDA)

const sidebars = {
  docs: [
    // ---------------------------------
    // 0️⃣ On-ramp (3 clicks to first chart)
    // ---------------------------------
    {
      type: 'category',
      label: ' Getting Started',
      collapsed: false,
      link: { type: 'doc', id: 'getting-started/getting-started-index' },
      items: [
        'getting-started/quick-start-docker',
        'getting-started/first-chart',
        'getting-started/demo-walkthrough',
        'getting-started/faq'
      ]
    },

    // ---------------------------------
    // 1️⃣ Self-host (copy-paste one command)
    // ---------------------------------
    {
      type: 'category',
      label: '🏠 Self-Host & Enterprise',
      link: { type: 'doc', id: 'self-host/self-host-index' },
      items: [
        {
          type: 'category',
          label: ' Deployment Recipes',
          items: [
            'self-host/docker-compose'
          ]
        },
        {
          type: 'category',
          label: '⚙️ Configuration',
          items: [
            'self-host/config-reference',
            'self-host/ssl-certificates',
            'self-host/backups'
          ]
        }
      ]
    },

    // ---------------------------------
    // 2️⃣ Features (ordered by frequency of use)
    // ---------------------------------
    {
      type: 'category',
      label: '🤖 Agentic AI & Analytics',
      link: { type: 'doc', id: 'features/ai-overview' },
      items: [
        'features/natural-language-queries',
        'features/agents',
        'features/conversation-memory',
        'features/what-if-simulations',
        'features/custom-prompts'
      ]
    },
    {
      type: 'category',
      label: '📊 Charts & Visuals',
      link: { type: 'doc', id: 'features/charts-overview' },
      items: [
        'features/line-charts',
        'features/bar-charts',
        'features/heatmaps',
        'features/echarts-integration',
        'features/deep-analysis'
      ]
    },
    {
      type: 'category',
      label: '🔌 Data Sources',
      link: { type: 'doc', id: 'features/data-sources-overview' },
      items: [
        'features/csv-excel',
        'features/databases',
        'features/warehouses',
        'features/real-time-streams'
      ]
    },

    // ---------------------------------
    // 3️⃣ Developer & Contributor Path
    // ---------------------------------
    {
      type: 'category',
      label: '️ Developer',
      link: { type: 'doc', id: 'developer/developer-index' },
      items: [
        'developer/local-dev',
        'developer/architecture',
        'developer/writing-tests',
        'developer/plugin-architecture',
        'developer/release-process'
      ]
    },

    // ---------------------------------
    // 4️⃣ Community & Governance
    // ---------------------------------
    {
      type: 'category',
      label: '🌍 Community',
      link: { type: 'doc', id: 'community/community-index' },
      items: [
        'community/roadmap',
        'community/contributing',
        'community/code-of-conduct',
        'community/bi-weekly-calls',
        'community/ambassador-program'
      ]
    },

    // ---------------------------------
    // 5️⃣ Reference (integrated into main sidebar)
    // ---------------------------------
    {
      type: 'category',
      label: '📖 Reference',
      collapsed: true,
      items: [
        'reference/api-reference',
        'reference/config-reference'
      ]
    },

    // ---------------------------------
    // 6️⃣ Legal & Compliance (footer link)
    // ---------------------------------
    {
      type: 'link',
      label: 'License (MIT) + Enterprise License',
      href: 'https://github.com/aiser-platform/aiser-world/blob/main/LICENSE'
    },
    {
      type: 'link',
      label: 'Privacy Policy',
      href: 'https://aiser.com/privacy'
    }
  ]
};

module.exports = sidebars;
