const config = {
  title: 'Aicser Documentation',
  tagline: 'AI-Powered Analytics Platform',
  favicon: '/favicon.ico',
  
  // Production URL - custom domain
  url: 'https://docs.aicser.com',
  // Base URL - use '/' for custom domain (root deployment)
  baseUrl: '/',
  
  // GitHub Pages deployment configuration
  deploymentBranch: 'gh-pages',
  
  // GitHub organization and repository (for edit links)
  organizationName: 'aiser-platform',
  projectName: 'aiser-world',
  
  // Trailing slash configuration - important for GitHub Pages
  trailingSlash: false,
  
  // Custom fields (domain and port configuration)
  customFields: {
    domain: 'docs.aicser.com',
    port: 3005  // Use port 3005 for docs
  },
  
  // Even if you don't use internalization, you can use this field to set useful
  // metadata like html lang. For example, if the site is Chinese, we can replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },
  
  // Docusaurus presets
  presets: [
    [
      'classic',
      {
        docs: {
          path: 'src/docs',
          sidebarPath: require.resolve('./sidebars.js'),
          // Remove this to remove the "edit this page" links.
          editUrl: 'https://github.com/aiser-platform/aiser-world/edit/main/packages/docs/src/docs/',
          // Show last update time
          showLastUpdateTime: true,
          // Serve docs from root of baseUrl to avoid double /docs/docs/ paths
          routeBasePath: '/',
        },
        blog: false,
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
        // Search configuration - using local search (no Algolia required)
        // To enable Algolia search, uncomment algolia config below and set environment variables
        sitemap: {
          changefreq: 'weekly',
          priority: 0.5,
        },
      },
    ],
  ],
  
  // Global configuration
  onBrokenLinks: 'warn',
  onBrokenMarkdownLinks: 'warn',
  
  // Theme configuration
  themeConfig: {
    // Replace with project's social card
    image: 'img/aicser-docs-social-card.jpg',
    navbar: {
      logo: {
        alt: 'Aicser Platform',
        src: 'img/logo.jpg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docs',
          position: 'left',
          label: 'Documentation',
        },
        // REMOVED: Reference sidebar that doesn't exist
        {
          href: 'https://aicser.com',
          label: 'Website',
          position: 'right',
        },
        {
          href: 'https://app.aicser.com',
          label: 'App',
          position: 'right',
        },
        {
          href: 'https://github.com/aiser-platform/aiser-world',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark', 
      links: [
        {
          title: 'Docs',
          items: [
            {
              label: 'Getting Started',
              to: '/getting-started',
            },
            {
              label: 'Self-Host',
              to: '/self-host',
            },
            {
              label: 'Features',
              to: '/features',
            },
            {
              label: 'Troubleshooting',
              to: '/troubleshooting/troubleshooting-overview',
            },
          ],
        },
        {
          title: 'Community',
          items: [
            {
              label: 'Telegram Community',
              href: 'https://t.me/+XyM6Y-8MnWU2NTM1',
            },
            {
              label: 'GitHub',
              href: 'https://github.com/aiser-platform/aiser-world',
            },
            {
              label: 'X.com (@Aicsertics)',
              href: 'https://x.com/Aicsertics',
            },
            {
              label: 'LinkedIn (@Aicser)',
              href: 'https://www.linkedin.com/company/aicser',
            },
            {
              label: 'Facebook (@Aicsertics)',
              href: 'https://www.facebook.com/Aicsertics',
            },
          ],
        },
        {
          title: 'Resources',
          items: [
            {
              label: 'Application',
              href: 'https://app.aicser.com',
            },
            {
              label: 'Feedback',
              href: 'https://feedback.aicser.com',
            },
            {
              label: 'Website',
              href: 'https://aicser.com',
            },
          ],
        },
        {
          title: 'Legal',
          items: [
            {
              label: 'Privacy Policy',
              href: 'https://aicser.com/privacy',
            },
            {
              label: 'Terms of Service',
              href: 'https://aicser.com/terms',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Aicser. All rights reserved.`,
    },
    // Search configuration
    // Algolia search is disabled - Docusaurus will use local search instead
    // To enable Algolia search in the future:
    // 1. Create Algolia account at https://www.algolia.com/
    // 2. Create a new application and index
    // 3. Set environment variables: ALGOLIA_APP_ID, ALGOLIA_API_KEY, ALGOLIA_INDEX_NAME
    // 4. Uncomment the algolia config below
    // 5. Run: npm run write-heading-ids
    // 6. Run: npm run docusaurus algolia (to index content)
    // algolia: {
    //   appId: process.env.ALGOLIA_APP_ID,
    //   apiKey: process.env.ALGOLIA_API_KEY,
    //   indexName: process.env.ALGOLIA_INDEX_NAME,
    //   contextualSearch: true,
    //   searchParameters: {},
    // },
    // Color mode
    colorMode: {
      defaultMode: 'light',
      disableSwitch: false,
      respectPrefersColorScheme: true,
    },
  },
};

module.exports = config;