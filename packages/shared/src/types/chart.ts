// Chart and visualization types
export type ChartType = 'line' | 'bar' | 'pie' | 'donut' | 'scatter' | 'area' | 'mixed';

export type AggregationType = 'sum' | 'avg' | 'count' | 'min' | 'max' | 'count_distinct';

export interface ChartMetric {
  label: string;
  column: string;
  aggregation: AggregationType;
  prefix?: string;
  suffix?: string;
  chartType?: ChartType;
}

export interface ChartDimension {
  label: string;
  column: string;
}

export interface ChartFilter {
  label: string;
  column: string;
  operator: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'like' | 'in' | 'not in';
  value: string | string[];
}

export interface ChartConfig {
  id?: string;
  title: string;
  type: ChartType;
  metrics: ChartMetric[];
  dimensions: ChartDimension[];
  filters?: ChartFilter[];
  rowLimit?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ChartData {
  config: ChartConfig;
  data: Record<string, any>[];
  insights?: string[];
}