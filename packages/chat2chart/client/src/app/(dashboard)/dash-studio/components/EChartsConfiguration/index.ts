// ECharts Configuration Components - Optimized exports
export { 
  EChartsConfigProvider, 
  useEChartsConfig,
  CHART_TEMPLATES 
} from './EChartsConfigProvider';

// Export the EChartsOptionGenerator class
export { EChartsOptionGenerator } from './EChartsOptionGenerator';

// Lazy export heavy components
export { 
  PropertiesConfigPanel,
  EChartsConfigurationPanel,
  BasicConfigPanel,
  StandardConfigPanel,
  AdvancedConfigPanel
} from './ConfigurationPanels';

// Re-export types
export type { 
  BasicChartConfig, 
  StandardChartConfig, 
  AdvancedChartConfig,
  ConfigLevel,
  ChartTemplate
} from './EChartsConfigProvider';
