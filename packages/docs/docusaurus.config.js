const config = {
  title: 'Aiser Platform Documentation',
  tagline: 'AI-Powered Analytics Platform',
  favicon: 'img/favicon.ico',
  
  // Set the production url of your site here
  url: 'https://docs.aiser.dataticon.com',
  // Set the /<baseUrl>/ pathname under which your site is served
  baseUrl: '/',
  
  // GitHub Pages deployment
  deploymentBranch: 'gh-pages',
  
  // Organization and project names
  organizationName: 'Aiser',
  projectName: 'aiser-world',
  
  // Custom domain
  customFields: {
    domain: 'docs.aiser.dataticon.com'
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
          sidebarPath: require.resolve('./sidebars.js'),
          // Remove this to remove the "edit this page" links.
          editUrl: 'https://github.com/aiser-platform/aiser-world/edit/main/packages/docs/',
          // Show last update time
          showLastUpdateTime: true,
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
  
  // Theme configuration
  themeConfig: {
    // Replace with project's social card
    image: 'img/aiser-docs-social-card.jpg',
    navbar: {
      title: 'Aiser Docs',
      logo: {
        alt: 'Aiser Logo',
        src: 'img/logo.svg',
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
          href: 'https://aiser.com',
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
              to: '/docs/getting-started',
            },
            {
              label: 'Self-Host',
              to: '/docs/self-host',
            },
            {
              label: 'API Reference',
              to: '/docs/reference/api-reference',
            },
          ],
        },
        {
          title: 'Community',
          items: [
            {
              label: 'GitHub',
              href: 'https://github.com/bigstack-analytics/aiser-world',
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
    port: 3001  // Use port 3001 for docs
  },
};

module.exports = config;