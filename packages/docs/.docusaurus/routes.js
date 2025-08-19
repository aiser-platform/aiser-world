import React from 'react';
import ComponentCreator from '@docusaurus/ComponentCreator';

export default [
  {
    path: '/__docusaurus/debug',
    component: ComponentCreator('/__docusaurus/debug', '107'),
    exact: true
  },
  {
    path: '/__docusaurus/debug/config',
    component: ComponentCreator('/__docusaurus/debug/config', 'c27'),
    exact: true
  },
  {
    path: '/__docusaurus/debug/content',
    component: ComponentCreator('/__docusaurus/debug/content', 'ac9'),
    exact: true
  },
  {
    path: '/__docusaurus/debug/globalData',
    component: ComponentCreator('/__docusaurus/debug/globalData', 'e4c'),
    exact: true
  },
  {
    path: '/__docusaurus/debug/metadata',
    component: ComponentCreator('/__docusaurus/debug/metadata', '96d'),
    exact: true
  },
  {
    path: '/__docusaurus/debug/registry',
    component: ComponentCreator('/__docusaurus/debug/registry', '5ba'),
    exact: true
  },
  {
    path: '/__docusaurus/debug/routes',
    component: ComponentCreator('/__docusaurus/debug/routes', '379'),
    exact: true
  },
  {
    path: '/search',
    component: ComponentCreator('/search', '4d6'),
    exact: true
  },
  {
    path: '/docs',
    component: ComponentCreator('/docs', 'dc6'),
    routes: [
      {
        path: '/docs',
        component: ComponentCreator('/docs', '5d2'),
        routes: [
          {
            path: '/docs',
            component: ComponentCreator('/docs', 'f6c'),
            routes: [
              {
                path: '/docs/community/',
                component: ComponentCreator('/docs/community/', '2ea'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/community/ambassador-program',
                component: ComponentCreator('/docs/community/ambassador-program', 'b72'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/community/bi-weekly-calls',
                component: ComponentCreator('/docs/community/bi-weekly-calls', '4aa'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/community/code-of-conduct',
                component: ComponentCreator('/docs/community/code-of-conduct', '7b2'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/community/contributing',
                component: ComponentCreator('/docs/community/contributing', '734'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/community/roadmap',
                component: ComponentCreator('/docs/community/roadmap', '8cf'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/developer/',
                component: ComponentCreator('/docs/developer/', 'b88'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/developer/architecture',
                component: ComponentCreator('/docs/developer/architecture', 'c48'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/developer/local-dev',
                component: ComponentCreator('/docs/developer/local-dev', '06e'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/developer/plugin-architecture',
                component: ComponentCreator('/docs/developer/plugin-architecture', '16f'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/developer/release-process',
                component: ComponentCreator('/docs/developer/release-process', 'a0a'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/developer/writing-tests',
                component: ComponentCreator('/docs/developer/writing-tests', 'f74'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/features/agents',
                component: ComponentCreator('/docs/features/agents', 'f2a'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/features/ai-overview',
                component: ComponentCreator('/docs/features/ai-overview', '417'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/features/bar-charts',
                component: ComponentCreator('/docs/features/bar-charts', '475'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/features/charts-overview',
                component: ComponentCreator('/docs/features/charts-overview', '8da'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/features/conversation-memory',
                component: ComponentCreator('/docs/features/conversation-memory', '5d6'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/features/csv-excel',
                component: ComponentCreator('/docs/features/csv-excel', 'f29'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/features/custom-prompts',
                component: ComponentCreator('/docs/features/custom-prompts', '76e'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/features/data-sources-overview',
                component: ComponentCreator('/docs/features/data-sources-overview', '4bb'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/features/databases',
                component: ComponentCreator('/docs/features/databases', '704'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/features/deep-analysis',
                component: ComponentCreator('/docs/features/deep-analysis', 'de9'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/features/echarts-integration',
                component: ComponentCreator('/docs/features/echarts-integration', '984'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/features/heatmaps',
                component: ComponentCreator('/docs/features/heatmaps', '71a'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/features/line-charts',
                component: ComponentCreator('/docs/features/line-charts', 'c48'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/features/natural-language-queries',
                component: ComponentCreator('/docs/features/natural-language-queries', '02c'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/features/real-time-streams',
                component: ComponentCreator('/docs/features/real-time-streams', 'bf0'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/features/warehouses',
                component: ComponentCreator('/docs/features/warehouses', '3c2'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/features/what-if-simulations',
                component: ComponentCreator('/docs/features/what-if-simulations', '522'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/getting-started/',
                component: ComponentCreator('/docs/getting-started/', '3c7'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/getting-started/demo-walkthrough',
                component: ComponentCreator('/docs/getting-started/demo-walkthrough', 'd41'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/getting-started/faq',
                component: ComponentCreator('/docs/getting-started/faq', 'c23'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/getting-started/first-chart',
                component: ComponentCreator('/docs/getting-started/first-chart', '25e'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/getting-started/quick-start-docker',
                component: ComponentCreator('/docs/getting-started/quick-start-docker', '609'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/reference/api-reference',
                component: ComponentCreator('/docs/reference/api-reference', '879'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/reference/config-reference',
                component: ComponentCreator('/docs/reference/config-reference', '722'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/self-host/',
                component: ComponentCreator('/docs/self-host/', 'bb9'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/self-host/backups',
                component: ComponentCreator('/docs/self-host/backups', 'b55'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/self-host/config-reference',
                component: ComponentCreator('/docs/self-host/config-reference', 'd88'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/self-host/docker-compose',
                component: ComponentCreator('/docs/self-host/docker-compose', 'f84'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/self-host/ssl-certificates',
                component: ComponentCreator('/docs/self-host/ssl-certificates', '327'),
                exact: true,
                sidebar: "docs"
              }
            ]
          }
        ]
      }
    ]
  },
  {
    path: '*',
    component: ComponentCreator('*'),
  },
];
