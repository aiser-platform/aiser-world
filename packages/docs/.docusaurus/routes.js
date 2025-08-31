import React from 'react';
import ComponentCreator from '@docusaurus/ComponentCreator';

export default [
  {
    path: '/search',
    component: ComponentCreator('/search', '4d6'),
    exact: true
  },
  {
    path: '/',
    component: ComponentCreator('/', 'd4b'),
    routes: [
      {
        path: '/',
        component: ComponentCreator('/', '99c'),
        routes: [
          {
            path: '/',
            component: ComponentCreator('/', '8f0'),
            routes: [
              {
                path: '/community/',
                component: ComponentCreator('/community/', 'c62'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/community/ambassador-program',
                component: ComponentCreator('/community/ambassador-program', '683'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/community/bi-weekly-calls',
                component: ComponentCreator('/community/bi-weekly-calls', 'd4e'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/community/code-of-conduct',
                component: ComponentCreator('/community/code-of-conduct', 'd23'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/community/contributing',
                component: ComponentCreator('/community/contributing', 'a25'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/community/roadmap',
                component: ComponentCreator('/community/roadmap', '7fc'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/developer/',
                component: ComponentCreator('/developer/', '161'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/developer/architecture',
                component: ComponentCreator('/developer/architecture', 'a8f'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/developer/local-dev',
                component: ComponentCreator('/developer/local-dev', '669'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/developer/plugin-architecture',
                component: ComponentCreator('/developer/plugin-architecture', 'f45'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/developer/release-process',
                component: ComponentCreator('/developer/release-process', '1f5'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/developer/writing-tests',
                component: ComponentCreator('/developer/writing-tests', 'b3b'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/features/',
                component: ComponentCreator('/features/', '2e0'),
                exact: true
              },
              {
                path: '/features/agents',
                component: ComponentCreator('/features/agents', '2c2'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/features/ai-overview',
                component: ComponentCreator('/features/ai-overview', '029'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/features/bar-charts',
                component: ComponentCreator('/features/bar-charts', 'ecb'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/features/charts-overview',
                component: ComponentCreator('/features/charts-overview', 'c0d'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/features/conversation-memory',
                component: ComponentCreator('/features/conversation-memory', 'cdf'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/features/csv-excel',
                component: ComponentCreator('/features/csv-excel', '11d'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/features/custom-prompts',
                component: ComponentCreator('/features/custom-prompts', '13b'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/features/data-sources-overview',
                component: ComponentCreator('/features/data-sources-overview', '61c'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/features/databases',
                component: ComponentCreator('/features/databases', '864'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/features/deep-analysis',
                component: ComponentCreator('/features/deep-analysis', 'b6f'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/features/echarts-integration',
                component: ComponentCreator('/features/echarts-integration', 'c3c'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/features/heatmaps',
                component: ComponentCreator('/features/heatmaps', 'fc1'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/features/line-charts',
                component: ComponentCreator('/features/line-charts', 'e2f'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/features/natural-language-queries',
                component: ComponentCreator('/features/natural-language-queries', 'bd0'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/features/real-time-streams',
                component: ComponentCreator('/features/real-time-streams', '97d'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/features/warehouses',
                component: ComponentCreator('/features/warehouses', 'd5f'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/features/what-if-simulations',
                component: ComponentCreator('/features/what-if-simulations', 'c15'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/getting-started/',
                component: ComponentCreator('/getting-started/', 'f21'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/getting-started/demo-walkthrough',
                component: ComponentCreator('/getting-started/demo-walkthrough', 'c8f'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/getting-started/faq',
                component: ComponentCreator('/getting-started/faq', '6cf'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/getting-started/first-chart',
                component: ComponentCreator('/getting-started/first-chart', '6f4'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/getting-started/quick-start-docker',
                component: ComponentCreator('/getting-started/quick-start-docker', '3ec'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/performance/',
                component: ComponentCreator('/performance/', '6d5'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/reference/api-reference',
                component: ComponentCreator('/reference/api-reference', '106'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/reference/config-reference',
                component: ComponentCreator('/reference/config-reference', '8a0'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/security/',
                component: ComponentCreator('/security/', '563'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/self-host/',
                component: ComponentCreator('/self-host/', 'eda'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/self-host/backups',
                component: ComponentCreator('/self-host/backups', 'af5'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/self-host/config-reference',
                component: ComponentCreator('/self-host/config-reference', 'eac'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/self-host/docker-compose',
                component: ComponentCreator('/self-host/docker-compose', 'ed0'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/self-host/ssl-certificates',
                component: ComponentCreator('/self-host/ssl-certificates', '701'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/troubleshooting/',
                component: ComponentCreator('/troubleshooting/', '65c'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/',
                component: ComponentCreator('/', 'd08'),
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
