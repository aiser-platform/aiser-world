import React from 'react';
import ComponentCreator from '@docusaurus/ComponentCreator';

export default [
  {
    path: '/search',
    component: ComponentCreator('/search', '4d6'),
    exact: true
  },
  {
    path: '/docs',
    component: ComponentCreator('/docs', '1a9'),
    routes: [
      {
        path: '/docs',
        component: ComponentCreator('/docs', '0e0'),
        routes: [
          {
            path: '/docs',
            component: ComponentCreator('/docs', '79c'),
            routes: [
              {
                path: '/docs/community/',
                component: ComponentCreator('/docs/community/', '63e'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/community/ambassador-program',
                component: ComponentCreator('/docs/community/ambassador-program', 'b2a'),
                exact: true
              },
              {
                path: '/docs/community/bi-weekly-calls',
                component: ComponentCreator('/docs/community/bi-weekly-calls', 'f1e'),
                exact: true
              },
              {
                path: '/docs/community/code-of-conduct',
                component: ComponentCreator('/docs/community/code-of-conduct', 'bbc'),
                exact: true
              },
              {
                path: '/docs/community/contributing',
                component: ComponentCreator('/docs/community/contributing', '0bb'),
                exact: true
              },
              {
                path: '/docs/community/roadmap',
                component: ComponentCreator('/docs/community/roadmap', '3c2'),
                exact: true
              },
              {
                path: '/docs/developer/',
                component: ComponentCreator('/docs/developer/', '880'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/developer/architecture',
                component: ComponentCreator('/docs/developer/architecture', '21f'),
                exact: true
              },
              {
                path: '/docs/developer/local-dev',
                component: ComponentCreator('/docs/developer/local-dev', 'bd3'),
                exact: true
              },
              {
                path: '/docs/developer/plugin-architecture',
                component: ComponentCreator('/docs/developer/plugin-architecture', '37f'),
                exact: true
              },
              {
                path: '/docs/developer/release-process',
                component: ComponentCreator('/docs/developer/release-process', 'e35'),
                exact: true
              },
              {
                path: '/docs/developer/writing-tests',
                component: ComponentCreator('/docs/developer/writing-tests', 'e20'),
                exact: true
              },
              {
                path: '/docs/features/agents',
                component: ComponentCreator('/docs/features/agents', 'ffb'),
                exact: true
              },
              {
                path: '/docs/features/ai-overview',
                component: ComponentCreator('/docs/features/ai-overview', 'c3d'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/features/bar-charts',
                component: ComponentCreator('/docs/features/bar-charts', '5cd'),
                exact: true
              },
              {
                path: '/docs/features/charts-overview',
                component: ComponentCreator('/docs/features/charts-overview', 'b5c'),
                exact: true
              },
              {
                path: '/docs/features/conversation-memory',
                component: ComponentCreator('/docs/features/conversation-memory', '5ec'),
                exact: true
              },
              {
                path: '/docs/features/csv-excel',
                component: ComponentCreator('/docs/features/csv-excel', 'aac'),
                exact: true
              },
              {
                path: '/docs/features/custom-prompts',
                component: ComponentCreator('/docs/features/custom-prompts', '63f'),
                exact: true
              },
              {
                path: '/docs/features/data-sources-overview',
                component: ComponentCreator('/docs/features/data-sources-overview', '9ec'),
                exact: true
              },
              {
                path: '/docs/features/databases',
                component: ComponentCreator('/docs/features/databases', '71a'),
                exact: true
              },
              {
                path: '/docs/features/deep-analysis',
                component: ComponentCreator('/docs/features/deep-analysis', 'a68'),
                exact: true
              },
              {
                path: '/docs/features/echarts-integration',
                component: ComponentCreator('/docs/features/echarts-integration', 'd27'),
                exact: true
              },
              {
                path: '/docs/features/heatmaps',
                component: ComponentCreator('/docs/features/heatmaps', 'a70'),
                exact: true
              },
              {
                path: '/docs/features/line-charts',
                component: ComponentCreator('/docs/features/line-charts', '337'),
                exact: true
              },
              {
                path: '/docs/features/natural-language-queries',
                component: ComponentCreator('/docs/features/natural-language-queries', 'd8d'),
                exact: true
              },
              {
                path: '/docs/features/real-time-streams',
                component: ComponentCreator('/docs/features/real-time-streams', '0c5'),
                exact: true
              },
              {
                path: '/docs/features/warehouses',
                component: ComponentCreator('/docs/features/warehouses', 'cf8'),
                exact: true
              },
              {
                path: '/docs/features/what-if-simulations',
                component: ComponentCreator('/docs/features/what-if-simulations', '37b'),
                exact: true
              },
              {
                path: '/docs/getting-started/',
                component: ComponentCreator('/docs/getting-started/', '7a1'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/getting-started/demo-walkthrough',
                component: ComponentCreator('/docs/getting-started/demo-walkthrough', '959'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/getting-started/faq',
                component: ComponentCreator('/docs/getting-started/faq', 'a99'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/getting-started/first-chart',
                component: ComponentCreator('/docs/getting-started/first-chart', '22a'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/getting-started/quick-start-docker',
                component: ComponentCreator('/docs/getting-started/quick-start-docker', '202'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/performance/',
                component: ComponentCreator('/docs/performance/', 'c59'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/reference/api-reference',
                component: ComponentCreator('/docs/reference/api-reference', 'b41'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/reference/config-reference',
                component: ComponentCreator('/docs/reference/config-reference', '864'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/security/',
                component: ComponentCreator('/docs/security/', '6c4'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/self-host/',
                component: ComponentCreator('/docs/self-host/', '3ea'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/self-host/backups',
                component: ComponentCreator('/docs/self-host/backups', '4c7'),
                exact: true
              },
              {
                path: '/docs/self-host/config-reference',
                component: ComponentCreator('/docs/self-host/config-reference', '21a'),
                exact: true
              },
              {
                path: '/docs/self-host/docker-compose',
                component: ComponentCreator('/docs/self-host/docker-compose', 'a6c'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/self-host/ssl-certificates',
                component: ComponentCreator('/docs/self-host/ssl-certificates', '97c'),
                exact: true
              },
              {
                path: '/docs/troubleshooting/',
                component: ComponentCreator('/docs/troubleshooting/', 'ecd'),
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
