import type { ChartType, ChartMetric, ChartDimension, DataColumn } from '../types';

/**
 * Chart utilities
 */

/**
 * Suggest chart type based on data characteristics
 */
export function suggestChartType(
  metrics: ChartMetric[],
  dimensions: ChartDimension[],
  columns: DataColumn[]
): ChartType {
  const hasTimeColumn = columns.some(col => 
    col.type === 'date' || 
    col.name.toLowerCase().includes('date') || 
    col.name.toLowerCase().includes('time')
  );

  const metricCount = metrics.length;
  const dimensionCount = dimensions.length;

  // Time series data
  if (hasTimeColumn && metricCount >= 1) {
    return 'line';
  }

  // Single metric, single dimension
  if (metricCount === 1 && dimensionCount === 1) {
    const uniqueValues = columns.find(col => 
      col.name === dimensions[0].column
    )?.statistics?.uniqueCount || 0;

    // Few categories - pie chart
    if (uniqueValues <= 6) {
      return 'pie';
    }
    // Many categories - bar chart
    return 'bar';
  }

  // Multiple metrics
  if (metricCount > 1) {
    return 'mixed';
  }

  // Default to bar chart
  return 'bar';
}

/**
 * Generate chart colors
 */
export function generateChartColors(count: number): string[] {
  const baseColors = [
    '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd',
    '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'
  ];

  if (count <= baseColors.length) {
    return baseColors.slice(0, count);
  }

  // Generate additional colors if needed
  const colors = [...baseColors];
  for (let i = baseColors.length; i < count; i++) {
    const hue = (i * 137.508) % 360; // Golden angle approximation
    colors.push(`hsl(${hue}, 70%, 50%)`);
  }

  return colors;
}

/**
 * Format chart data for different chart types
 */
export function formatChartData(
  data: Record<string, any>[],
  metrics: ChartMetric[],
  dimensions: ChartDimension[]
): any {
  if (!data.length || !metrics.length || !dimensions.length) {
    return [];
  }

  const dimensionKey = dimensions[0].column;
  
  return data.map(row => ({
    [dimensionKey]: row[dimensionKey],
    ...metrics.reduce((acc, metric) => {
      acc[metric.label] = row[metric.column] || 0;
      return acc;
    }, {} as Record<string, any>)
  }));
}

/**
 * Calculate chart statistics
 */
export function calculateChartStats(data: Record<string, any>[], metricColumn: string) {
  const values = data.map(row => Number(row[metricColumn]) || 0);
  
  return {
    min: Math.min(...values),
    max: Math.max(...values),
    avg: values.reduce((sum, val) => sum + val, 0) / values.length,
    sum: values.reduce((sum, val) => sum + val, 0),
    count: values.length,
  };
}