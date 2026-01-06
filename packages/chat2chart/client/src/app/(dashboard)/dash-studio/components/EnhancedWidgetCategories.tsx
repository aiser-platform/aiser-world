import { AreaChartOutlined, BarChartOutlined, BorderOutlined, CalendarOutlined, DashboardOutlined, DotChartOutlined, DownOutlined, FileOutlined, FileTextOutlined, FilterOutlined, FontSizeOutlined, FunnelPlotOutlined, HeatMapOutlined, LayoutOutlined, LineChartOutlined, MenuOutlined, NumberOutlined, PictureOutlined, PieChartOutlined, RadarChartOutlined, SearchOutlined, TableOutlined } from "@ant-design/icons";

export const ENHANCED_WIDGET_CATEGORIES = {
  // Charts (PowerBI style)
  charts: {
    name: 'Charts',
    icon: <BarChartOutlined />,
    color: '#1890ff',
    description: 'Interactive charts and visualizations',
          widgets: [
        { type: 'bar', name: 'Bar', icon: <BarChartOutlined />, tooltip: 'Compare values across categories', category: 'comparison', popularity: 95 },
        { type: 'line', name: 'Line', icon: <LineChartOutlined />, tooltip: 'Show trends over time', category: 'trend', popularity: 90 },
        { type: 'pie', name: 'Pie', icon: <PieChartOutlined />, tooltip: 'Show parts of a whole', category: 'distribution', popularity: 85 },
        { type: 'area', name: 'Area', icon: <AreaChartOutlined />, tooltip: 'Show trends with filled areas', category: 'trend', popularity: 80 },
        { type: 'scatter', name: 'Scatter', icon: <DotChartOutlined />, tooltip: 'Show relationships between variables', category: 'correlation', popularity: 75 },
        { type: 'radar', name: 'Radar', icon: <RadarChartOutlined />, tooltip: 'Compare multiple variables', category: 'comparison', popularity: 70 },
        { type: 'heatmap', name: 'Heatmap', icon: <HeatMapOutlined />, tooltip: 'Show data density and patterns', category: 'correlation', popularity: 65 },
        { type: 'funnel', name: 'Funnel', icon: <FunnelPlotOutlined />, tooltip: 'Show process flow stages', category: 'distribution', popularity: 60 },
        { type: 'gauge', name: 'Gauge', icon: <DashboardOutlined />, tooltip: 'Single value indicator', category: 'metric', popularity: 55 }
      ]
  },
  
  // Data Tables (Tableau style)
  data: {
    name: 'Data',
    icon: <TableOutlined />,
    color: '#52c41a',
    description: 'Data display and analysis',
    widgets: [
      { type: 'table', name: 'Table', icon: <TableOutlined />, tooltip: 'Data table with sorting and filtering', category: 'table', popularity: 90 },
      { type: 'pivot', name: 'Pivot', icon: <TableOutlined />, tooltip: 'Interactive pivot table', category: 'table', popularity: 85 },
      { type: 'crossfilter', name: 'Cross Filter', icon: <FilterOutlined />, tooltip: 'Interactive cross-filtering', category: 'filter', popularity: 80 }
    ]
  },
  
  // Metrics & KPIs (PowerBI style)
  metrics: {
    name: 'Metrics',
    icon: <NumberOutlined />,
    color: '#fa8c16',
    description: 'Key performance indicators',
    widgets: [
      { type: 'kpi', name: 'KPI', icon: <NumberOutlined />, tooltip: 'Key performance indicator', category: 'metric', popularity: 95 },
      { type: 'metric', name: 'Metric', icon: <DashboardOutlined />, tooltip: 'Single metric display', category: 'metric', popularity: 90 },
      { type: 'trend', name: 'Trend', icon: <LineChartOutlined />, tooltip: 'Trend indicator', category: 'metric', popularity: 85 }
    ]
  },
  
  // Content & Media (Superset style)
  content: {
    name: 'Content',
    icon: <FileTextOutlined />,
    color: '#722ed1',
    description: 'Text, images, and media',
    widgets: [
      { type: 'text', name: 'Text', icon: <FontSizeOutlined />, tooltip: 'Rich text content', category: 'content', popularity: 80 },
      { type: 'markdown', name: 'Markdown', icon: <FileTextOutlined />, tooltip: 'Markdown content', category: 'content', popularity: 75 },
      { type: 'image', name: 'Image', icon: <PictureOutlined />, tooltip: 'Image display', category: 'content', popularity: 70 },
      { type: 'iframe', name: 'Embed', icon: <FileOutlined />, tooltip: 'Embedded content', category: 'content', popularity: 65 }
    ]
  },
  
  // Filters & Controls (Tableau style)
  filters: {
    name: 'Filters',
    icon: <FilterOutlined />,
    color: '#eb2f96',
    description: 'Interactive filters and controls',
    widgets: [
      { type: 'dateFilter', name: 'Date Filter', icon: <CalendarOutlined />, tooltip: 'Date range picker', category: 'filter', popularity: 90 },
      { type: 'dropdownFilter', name: 'Dropdown', icon: <DownOutlined />, tooltip: 'Dropdown selection', category: 'filter', popularity: 85 },
      { type: 'sliderFilter', name: 'Slider', icon: <MenuOutlined />, tooltip: 'Range slider', category: 'filter', popularity: 80 },
      { type: 'searchFilter', name: 'Search', icon: <SearchOutlined />, tooltip: 'Search input', category: 'filter', popularity: 75 }
    ]
  },
  
  // Layout & Structure (PowerBI style)
  layout: {
    name: 'Layout',
    icon: <LayoutOutlined />,
    color: '#13c2c2',
    description: 'Layout and structural elements',
    widgets: [
      { type: 'container', name: 'Container', icon: <BorderOutlined />, tooltip: 'Widget container', category: 'layout', popularity: 70 },
      { type: 'spacer', name: 'Spacer', icon: <LayoutOutlined />, tooltip: 'Flexible spacing', category: 'layout', popularity: 65 },
      { type: 'divider', name: 'Divider', icon: <BorderOutlined />, tooltip: 'Visual separator', category: 'layout', popularity: 60 }
    ]
  }
};
