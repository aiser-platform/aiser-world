import React from 'react';
import ComponentCreator from '@docusaurus/ComponentCreator';

export default [
  {
    path: '/docs/search',
    component: ComponentCreator('/docs/search', 'a95'),
    exact: true
  },
  {
    path: '/docs/',
    component: ComponentCreator('/docs/', 'd09'),
    routes: [
      {
        path: '/docs/',
        component: ComponentCreator('/docs/', 'e64'),
        routes: [
          {
            path: '/docs/',
            component: ComponentCreator('/docs/', '51a'),
            routes: [
              {
                path: '/docs/community/',
                component: ComponentCreator('/docs/community/', '63e'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/community/ambassador-program',
                component: ComponentCreator('/docs/community/ambassador-program', '240'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/community/bi-weekly-calls',
                component: ComponentCreator('/docs/community/bi-weekly-calls', 'fa6'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/community/code-of-conduct',
                component: ComponentCreator('/docs/community/code-of-conduct', '7f6'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/community/contributing',
                component: ComponentCreator('/docs/community/contributing', '5e3'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/community/roadmap',
                component: ComponentCreator('/docs/community/roadmap', 'eea'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/developer/',
                component: ComponentCreator('/docs/developer/', '880'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/developer/architecture',
                component: ComponentCreator('/docs/developer/architecture', '289'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/developer/local-dev',
                component: ComponentCreator('/docs/developer/local-dev', '7af'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/developer/plugin-architecture',
                component: ComponentCreator('/docs/developer/plugin-architecture', '16b'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/developer/release-process',
                component: ComponentCreator('/docs/developer/release-process', 'a54'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/developer/writing-tests',
                component: ComponentCreator('/docs/developer/writing-tests', 'f18'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/features/agents',
                component: ComponentCreator('/docs/features/agents', '53b'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/features/ai-overview',
                component: ComponentCreator('/docs/features/ai-overview', 'c3d'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/features/bar-charts',
                component: ComponentCreator('/docs/features/bar-charts', '285'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/features/charts-overview',
                component: ComponentCreator('/docs/features/charts-overview', '851'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/features/conversation-memory',
                component: ComponentCreator('/docs/features/conversation-memory', '365'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/features/csv-excel',
                component: ComponentCreator('/docs/features/csv-excel', '1b6'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/features/custom-prompts',
                component: ComponentCreator('/docs/features/custom-prompts', '68b'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/features/data-sources-overview',
                component: ComponentCreator('/docs/features/data-sources-overview', '878'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/features/databases',
                component: ComponentCreator('/docs/features/databases', 'd04'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/features/deep-analysis',
                component: ComponentCreator('/docs/features/deep-analysis', '033'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/features/echarts-integration',
                component: ComponentCreator('/docs/features/echarts-integration', '61c'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/features/heatmaps',
                component: ComponentCreator('/docs/features/heatmaps', '16a'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/features/line-charts',
                component: ComponentCreator('/docs/features/line-charts', '23c'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/features/natural-language-queries',
                component: ComponentCreator('/docs/features/natural-language-queries', '6ec'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/features/real-time-streams',
                component: ComponentCreator('/docs/features/real-time-streams', '92a'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/features/warehouses',
                component: ComponentCreator('/docs/features/warehouses', '34a'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/features/what-if-simulations',
                component: ComponentCreator('/docs/features/what-if-simulations', 'f88'),
                exact: true,
                sidebar: "docs"
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
                component: ComponentCreator('/docs/self-host/backups', '5a6'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/self-host/config-reference',
                component: ComponentCreator('/docs/self-host/config-reference', '103'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/self-host/docker-compose',
                component: ComponentCreator('/docs/self-host/docker-compose', 'a6c'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/self-host/ssl-certificates',
                component: ComponentCreator('/docs/self-host/ssl-certificates', '0ec'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/troubleshooting/',
                component: ComponentCreator('/docs/troubleshooting/', 'ecd'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/',
                component: ComponentCreator('/docs/', '668'),
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
