'use client';

import { EChartsOption } from 'echarts';
import { BasicChartConfig, StandardChartConfig, AdvancedChartConfig } from './EChartsConfigProvider';

export class EChartsOptionGenerator {
  static generateOption(
    basic: BasicChartConfig,
    data: any[],
    standard?: StandardChartConfig,
    advanced?: AdvancedChartConfig
  ): EChartsOption {
    const baseOption = this.generateBaseOption(basic, data);
    
    if (advanced) {
      return this.mergeAdvancedOptions(baseOption, advanced);
    }
    
    if (standard) {
      return this.mergeStandardOptions(baseOption, standard);
    }
    
    return baseOption;
  }

  private static generateBaseOption(config: BasicChartConfig, data: any[]): EChartsOption {
    const { chartType, title, subtitle, dataBinding, basicStyling } = config;
    
    // Process data based on binding
    const processedData = this.processData(data, dataBinding, chartType);
    
    const baseOption: EChartsOption = {
      title: {
        text: title,
        subtext: subtitle,
        left: config.titlePosition || 'center',
        textStyle: {
          fontSize: basicStyling.fontSize + 4,
          fontWeight: 'bold',
        },
        subtextStyle: {
          fontSize: basicStyling.fontSize,
        },
      },
      color: basicStyling.colors,
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(50, 50, 50, 0.9)',
        textStyle: {
          color: '#fff',
        },
      },
      legend: {
        show: basicStyling.showLegend,
        top: 'bottom',
        textStyle: {
          fontSize: basicStyling.fontSize,
        },
      },
      grid: {
        left: '10%',
        right: '10%',
        top: '15%',
        bottom: '20%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: processedData.xAxis,
        show: true,
        axisLine: { show: true },
        axisTick: { show: true },
        axisLabel: { show: true },
      },
      yAxis: {
        type: 'value',
        show: true,
        axisLine: { show: true },
        axisTick: { show: true },
        axisLabel: { show: true },
        splitLine: { show: true },
      },
    };

    // Add chart-specific options
    switch (chartType) {
      case 'bar':
      case 'column':
        return this.generateBarChartOption(baseOption, processedData, dataBinding);
      case 'line':
      case 'step':
      case 'spline':
        return this.generateLineChartOption(baseOption, processedData, dataBinding);
      case 'pie':
      case 'doughnut':
        return this.generatePieChartOption(baseOption, processedData, dataBinding);
      case 'scatter':
      case 'bubble':
        return this.generateScatterChartOption(baseOption, processedData, dataBinding);
      case 'area':
        return this.generateAreaChartOption(baseOption, processedData, dataBinding);
      case 'radar':
        return this.generateRadarChartOption(baseOption, processedData, dataBinding);
      case 'funnel':
        return this.generateFunnelChartOption(baseOption, processedData, dataBinding);
      case 'gauge':
        return this.generateGaugeChartOption(baseOption, processedData, dataBinding);
      case 'tree':
      case 'treemap':
        return this.generateTreeChartOption(baseOption, processedData, dataBinding);
      default:
        return this.generateBarChartOption(baseOption, processedData, dataBinding);
    }
  }

  private static processData(data: any[], binding: any, chartType: string) {
    // Always create chart structure, even with empty data
    const { xField, yFields, seriesField } = binding;
    
    // If no data, create sample structure for preview
    if (!data || data.length === 0) {
      return this.createSampleDataStructure(chartType, binding);
    }
    
    if (chartType === 'pie') {
          return this.processPieData(data, xField, yFields[0]);
  }

  if (seriesField) {
    return this.processSeriesData(data, xField, yFields, seriesField);
  }

  return this.processSimpleData(data, xField, yFields);
}

  // Create sample data structure for preview when no data is available
  private static createSampleDataStructure(chartType: string, binding: any) {
    const { xField, yFields, seriesField } = binding;
    
    // Generate sample data based on chart type
    const sampleData: any = {
      xAxis: ['Sample 1', 'Sample 2', 'Sample 3', 'Sample 4', 'Sample 5'],
      series: []
    };

    if (chartType === 'pie') {
      sampleData.series = [{
        type: 'pie',
        data: [
          { name: 'Category A', value: 30 },
          { name: 'Category B', value: 25 },
          { name: 'Category C', value: 20 },
          { name: 'Category D', value: 15 },
          { name: 'Category E', value: 10 }
        ]
      }];
    } else if (chartType === 'line' || chartType === 'area') {
      sampleData.series = (yFields || ['Series 1']).map((field: string, index: number) => ({
        name: field || `Series ${index + 1}`,
        type: 'line',
        data: [Math.random() * 100, Math.random() * 100, Math.random() * 100, Math.random() * 100, Math.random() * 100]
      }));
    } else {
      // Bar, scatter, etc.
      sampleData.series = (yFields || ['Series 1']).map((field: string, index: number) => ({
        name: field || `Series ${index + 1}`,
        type: chartType === 'scatter' ? 'scatter' : 'bar',
        data: [Math.random() * 100, Math.random() * 100, Math.random() * 100, Math.random() * 100, Math.random() * 100]
      }));
    }

    return sampleData;
  }

  private static processSimpleData(data: any[], xField: string, yFields: string[]) {
    const xAxis = data.map(row => row[xField]);
    const series = yFields.map((field, index) => ({
      name: field,
      type: 'bar',
      data: data.map(row => row[field]),
    }));

    return { xAxis, series };
  }

  private static processSeriesData(data: any[], xField: string, yFields: string[], seriesField: string) {
    const xAxis = [...new Set(data.map(row => row[xField]))];
    const seriesValues = [...new Set(data.map(row => row[seriesField]))];
    
    const series = yFields.map(field => ({
      name: field,
      type: 'bar',
      data: seriesValues.map(seriesValue => {
        const filteredData = data.filter(row => row[seriesField] === seriesValue);
        return xAxis.map(xValue => {
          const row = filteredData.find(r => r[xValue] === xValue);
          return row ? row[field] : 0;
        });
      }),
    }));

    return { xAxis, series };
  }

  private static processPieData(data: any[], nameField: string, valueField: string) {
    return data.map(row => ({
      name: row[nameField],
      value: row[valueField],
    }));
  }

  private static generateBarChartOption(baseOption: EChartsOption, processedData: any, binding: any): EChartsOption {
    return {
      ...baseOption,
      xAxis: {
        type: 'category',
        data: processedData.xAxis,
        axisLabel: {
          fontSize: 12,
          color: '#54555a',
        },
        axisLine: {
          lineStyle: {
            color: '#54555a',
          },
        },
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          fontSize: 12,
          color: '#54555a',
        },
        splitLine: {
          lineStyle: {
            color: '#dbdee4',
          },
        },
      },
      series: processedData.series.map((s: any) => ({
        ...s,
        type: 'bar',
        itemStyle: {
          borderRadius: [2, 2, 0, 0],
        },
      })),
    };
  }

  private static generateLineChartOption(baseOption: EChartsOption, processedData: any, binding: any): EChartsOption {
    return {
      ...baseOption,
      xAxis: {
        type: 'category',
        data: processedData.xAxis,
        axisLabel: {
          fontSize: 12,
          color: '#54555a',
        },
        axisLine: {
          lineStyle: {
            color: '#54555a',
          },
        },
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          fontSize: 12,
          color: '#54555a',
        },
        splitLine: {
          lineStyle: {
            color: '#dbdee4',
          },
        },
      },
      series: processedData.series.map((s: any) => ({
        ...s,
        type: 'line',
        smooth: false,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: {
          width: 2,
        },
      })),
    };
  }

  private static generatePieChartOption(baseOption: EChartsOption, processedData: any, binding: any): EChartsOption {
    return {
      ...baseOption,
      series: [
        {
          type: 'pie',
          radius: '50%',
          data: processedData,
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.5)',
            },
          },
        },
      ],
    };
  }

  private static generateScatterChartOption(baseOption: EChartsOption, processedData: any, binding: any): EChartsOption {
    return {
      ...baseOption,
      xAxis: {
        type: 'value',
        axisLabel: {
          fontSize: 12,
          color: '#54555a',
        },
        splitLine: {
          lineStyle: {
            color: '#dbdee4',
          },
        },
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          fontSize: 12,
          color: '#54555a',
        },
        splitLine: {
          lineStyle: {
            color: '#dbdee4',
          },
        },
      },
      series: processedData.series.map((s: any) => ({
        ...s,
        type: 'scatter',
        symbolSize: 8,
      })),
    };
  }

  private static generateAreaChartOption(baseOption: EChartsOption, processedData: any, binding: any): EChartsOption {
    return {
      ...baseOption,
      xAxis: {
        type: 'category',
        data: processedData.xAxis,
        axisLabel: {
          fontSize: 12,
          color: '#54555a',
        },
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          fontSize: 12,
          color: '#54555a',
        },
        splitLine: {
          lineStyle: {
            color: '#dbdee4',
          },
        },
      },
      series: processedData.series.map((s: any) => ({
        ...s,
        type: 'line',
        areaStyle: {
          opacity: 0.3,
        },
        smooth: true,
      })),
    };
  }

  private static generateRadarChartOption(baseOption: EChartsOption, processedData: any, binding: any): EChartsOption {
    const indicators = processedData.xAxis.map((name: string) => ({ name }));
    
    return {
      ...baseOption,
      radar: {
        indicator: indicators,
        radius: '60%',
      },
      series: [
        {
          type: 'radar',
          data: processedData.series.map((s: any) => ({
            name: s.name,
            value: s.data,
          })),
        },
      ],
    };
  }

  private static mergeStandardOptions(baseOption: EChartsOption, config: StandardChartConfig): EChartsOption {
    const { axis, series, legend, tooltip, gridSpacing } = config;
    
    // Ensure axis configuration exists with defaults
    if (!axis || !axis.xAxis || !axis.yAxis) {
      return baseOption;
    }
    
    return {
      ...baseOption,
      xAxis: {
        ...baseOption.xAxis,
        show: axis.xAxis.show,
        axisLabel: {
          ...(baseOption.xAxis as any)?.axisLabel,
          rotate: axis.xAxis.labelRotation,
          color: axis.xAxis.labelColor,
        },
        splitLine: {
          show: axis.xAxis.gridLines,
          lineStyle: {
            color: '#dbdee4',
            width: 1,
            type: 'solid',
          },
        },
      },
      yAxis: {
        ...baseOption.yAxis,
        show: axis.yAxis.show,
        axisLabel: {
          ...(baseOption.yAxis as any)?.axisLabel,
          color: axis.yAxis.labelColor,
          formatter: axis.yAxis.format,
        },
        splitLine: {
          show: axis.yAxis.gridLines,
          lineStyle: {
            color: '#dbdee4',
            width: 1,
            type: 'solid',
          },
        },
      },
      series: (baseOption.series as any[])?.map(s => ({
        ...s,
        label: {
          show: series?.showLabels || false,
          position: series?.labelPosition || 'top',
        },
        smooth: series?.smooth || false,
        areaStyle: series?.areaStyle ? { opacity: 0.3 } : undefined,
        symbolSize: series?.symbolSize || 6,
      })),
      legend: {
        ...baseOption.legend,
        orient: legend?.orientation || 'horizontal',
        left: legend?.position === 'left' ? 'left' : legend?.position === 'right' ? 'right' : 'center',
        top: legend?.position === 'top' ? 'top' : legend?.position === 'bottom' ? 'bottom' : 'middle',
        textStyle: {
          color: legend?.textColor || '#54555a',
        },
      },
      tooltip: {
        ...baseOption.tooltip,
        show: tooltip?.show !== false,
        trigger: tooltip?.trigger || 'axis',
        backgroundColor: tooltip?.backgroundColor || 'rgba(50, 50, 50, 0.9)',
        textStyle: {
          color: tooltip?.textColor || '#ffffff',
        },
      },
      grid: {
        ...baseOption.grid,
        left: '10%',
        right: '10%',
        top: '15%',
        bottom: '20%',
        containLabel: true,
      },
    };
  }

  private static mergeAdvancedOptions(baseOption: EChartsOption, config: AdvancedChartConfig): EChartsOption {
    const { grid, animation, dataZoom, toolbox, customOptions } = config;
    
    let advancedOption = this.mergeStandardOptions(baseOption, config);
    
    // Grid configuration
    if (grid) {
      advancedOption.grid = {
        ...advancedOption.grid,
        left: grid.left,
        right: grid.right,
        top: grid.top,
        bottom: grid.bottom,
        containLabel: grid.containLabel,
      };
    }
    
    // Animation configuration
    if (animation) {
      advancedOption.animation = animation.show !== false;
      advancedOption.animationDuration = animation.duration;
      advancedOption.animationEasing = animation.easing;
      advancedOption.animationDelay = animation.delay;
    }
    
    // Data zoom configuration
    if (dataZoom?.show) {
      advancedOption.dataZoom = [
        {
          type: dataZoom.type,
          start: dataZoom.start,
          end: dataZoom.end,
        },
      ];
    }
    
    // Toolbox configuration
    if (toolbox?.show) {
      const features: Record<string, any> = {};
      if (toolbox.features.includes('saveAsImage')) features.saveAsImage = {};
      if (toolbox.features.includes('dataZoom')) features.dataZoom = {};
      if (toolbox.features.includes('restore')) features.restore = {};
      if (toolbox.features.includes('dataView')) features.dataView = {};
      
      advancedOption.toolbox = {
        feature: features,
      };
    }
    
    // Custom options (for advanced users)
    if (customOptions) {
      advancedOption = { ...advancedOption, ...customOptions };
    }
    
    return advancedOption;
  }

  private static isStandardConfig(config: any): config is StandardChartConfig {
    return 'axis' in config && 'series' in config;
  }

  private static isAdvancedConfig(config: any): config is AdvancedChartConfig {
    return 'grid' in config && 'animation' in config;
  }

  private static generateFunnelChartOption(baseOption: EChartsOption, processedData: any, dataBinding: any): EChartsOption {
    return {
      ...baseOption,
      series: [{
        type: 'funnel',
        data: processedData.series[0]?.data || [
          { name: 'Step 1', value: 100 },
          { name: 'Step 2', value: 80 },
          { name: 'Step 3', value: 60 },
          { name: 'Step 4', value: 40 },
          { name: 'Step 5', value: 20 }
        ],
        sort: 'descending',
        orient: 'vertical',
        left: '10%',
        top: '20%',
        width: '80%',
        height: '60%',
      }],
    };
  }

  private static generateGaugeChartOption(baseOption: EChartsOption, processedData: any, dataBinding: any): EChartsOption {
    return {
      ...baseOption,
      series: [{
        type: 'gauge',
        data: [{
          value: processedData.series[0]?.data?.[0] || 70,
          name: 'Gauge',
        }],
        min: 0,
        max: 100,
        radius: '80%',
        startAngle: 180,
        endAngle: 0,
        splitNumber: 10,
        axisLine: {
          lineStyle: {
            width: 10,
            color: [
              [0.3, '#67e0e3'],
              [0.7, '#37a2da'],
              [1, '#fd666d']
            ]
          }
        },
        pointer: {
          icon: 'path://M12.8,0.7l12,40.1H0.7L12.8,0.7z',
          length: '12%',
          width: 20,
          offsetCenter: [0, '-60%']
        },
        axisTick: {
          length: 12,
          lineStyle: {
            color: 'auto',
            width: 2
          }
        },
        splitLine: {
          length: 20,
          lineStyle: {
            color: 'auto',
            width: 5
          }
        },
        axisLabel: {
          color: 'auto',
          distance: 30
        },
        detail: {
          valueAnimation: true,
          formatter: '{value}%',
          color: 'auto'
        }
      }],
    };
  }

  private static generateTreeChartOption(baseOption: EChartsOption, processedData: any, dataBinding: any): EChartsOption {
    return {
      ...baseOption,
              series: [{
        type: 'tree',
        data: processedData.series[0]?.data || [{
          name: 'Root',
          children: [
            { name: 'Category A', value: 30 },
            { name: 'Category B', value: 25 },
            { name: 'Category C', value: 20 }
          ]
        }],
        top: '5%',
        left: '7%',
        bottom: '2%',
        right: '20%',
        symbolSize: 7,
        orient: 'vertical',
        label: {
          position: 'left',
          verticalAlign: 'middle',
          align: 'right',
          fontSize: 12
        },
        leaves: {
          label: {
            position: 'right',
            verticalAlign: 'middle',
            align: 'left'
          }
        },
        emphasis: {
          focus: 'descendant'
        },
        expandAndCollapse: true,
        animationDuration: 550,
        animationDurationUpdate: 750
      }],
    };
  }
}
