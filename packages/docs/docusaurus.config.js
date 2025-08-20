const config = {
  title: 'Aiser Platform Documentation',
  tagline: 'AI-Powered Analytics Platform',
  favicon: 'img/favicon.ico',
  
  // Set the production url of your site here
  url: 'https://aiser-docs.dataticon.com',
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub Pages deployment, use '/docs/'
  baseUrl: '/docs/',
  
  // GitHub Pages deployment
  deploymentBranch: 'gh-pages',
  
  // Organization and project names
  organizationName: 'Aiser',
  projectName: 'aiser-world',
  
  // Custom domain
  customFields: {
    domain: 'aiser-docs.dataticon.com'
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
          editUrl: 'https://github.com/aiser-platform/aiser-world/edit/main/packages/docs/',
          // Show last update time
          showLastUpdateTime: true,
          // Serve docs from root of baseUrl to avoid double /docs/docs/ paths
          routeBasePath: '/',
        },
        blog: false,
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
        sitemap: {
          changefreq: 'weekly',
          priority: 0.5,
        },
      },
    ],
  ],
  
  // Global configuration
  onBrokenLinks: 'warn',
  
  // Theme configuration
  themeConfig: {
    // Replace with project's social card
    image: 'img/aiser-docs-social-card.jpg',
    navbar: {
      logo: {
        alt: 'Aiser Platform',
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
          href: 'https://github.com/aiser-platform/aiser-world',
          label: 'GitHub',
          position: 'right',
        },
        {
          href: 'https://aiser-platform.vercel.app/',
          label: 'Website',
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
              label: 'API Reference',
              to: '/reference/api-reference',
            },
          ],
        },
        {
          title: 'Community',
          items: [
            {
              label: 'GitHub',
              href: 'https://github.com/aiser-platform/aiser-world',
            },
            {
              label: 'Telegram (Aisertics)',
              href: 'https://t.me/dataticon_ai',
            },
            {
              label: 'Discussions',
              href: 'https://github.com/bigstack-analytics/aiser-world/discussions',
            },
            {
              label: 'Issues',
              href: 'https://github.com/bigstack-analytics/aiser-world/issues',
            },
          ],
        },
        {
          title: 'Legal',
          items: [
            {
              label: 'License (MIT) + Enterprise License',
              href: 'https://github.com/aiser-platform/aiser-world/blob/main/LICENSE',
            },
            {
              label: 'Privacy Policy',
              href: 'https://aiser.com/privacy',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Aiser Platform.`,
    },
    // Algolia search configuration
    algolia: {
      appId: process.env.ALGOLIA_APP_ID || 'test',
      apiKey: process.env.ALGOLIA_API_KEY || 'test',
      indexName: process.env.ALGOLIA_INDEX_NAME || 'test',
      contextualSearch: true,
      searchParameters: {},
    },
    // Color mode
    colorMode: {
      defaultMode: 'light',
      disableSwitch: false,
      respectPrefersColorScheme: true,
    },
  },
  
  // Custom port configuration
  customFields: {
    port: 3005  // Use port 3005 for docs
  },
  
  // Trigger deployment - GitHub Actions will run on push
  // This comment ensures the workflow triggers for docs changes
};

module.exports = config;