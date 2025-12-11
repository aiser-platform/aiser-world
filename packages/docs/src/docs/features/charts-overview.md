---
id: charts-overview
title: Charts & Visualizations
sidebar_label: Charts & Visualizations
description: Complete guide to chart types and visualization capabilities in Aicser Platform
---

# Charts & Visualizations

Aicser Platform provides powerful visualization capabilities powered by ECharts, enabling you to create beautiful, interactive charts from your data.

## 📊 Supported Chart Types

### **Basic Charts**
- **Line Charts**: Perfect for time series data, trends, and continuous data visualization
- **Bar Charts**: Ideal for categorical comparisons and ranking data
- **Pie Charts**: Great for showing proportions and percentages
- **Area Charts**: Useful for cumulative data over time

### **Advanced Charts**
- **Heatmaps**: Multi-dimensional data analysis with color-coded intensity
- **Scatter Plots**: Relationship analysis between variables
- **Gauge Charts**: Progress indicators and KPI displays
- **Funnel Charts**: Conversion and process flow visualization

### **ECharts Integration**
Aicser uses ECharts 6, providing access to 30+ chart types including:
- Geographic visualizations
- 3D charts
- Custom chart configurations
- Interactive features (zoom, pan, tooltips)

## 🎨 Chart Customization

### **Styling Options**
- **Colors**: Custom color palettes and themes
- **Layouts**: Flexible positioning and sizing
- **Animations**: Smooth transitions and interactions
- **Responsive Design**: Charts adapt to different screen sizes

### **Interactive Features**
- **Tooltips**: Hover to see detailed data points
- **Zoom & Pan**: Explore large datasets interactively
- **Data Filtering**: Filter and drill down into specific data ranges
- **Export Options**: Download charts as images or PDFs

## 🤖 AI-Powered Chart Selection

Aicser's AI automatically selects the best chart type based on:
- **Data Structure**: Analyzes your data columns and types
- **Question Intent**: Understands what you're trying to visualize
- **Best Practices**: Applies data visualization best practices
- **User Preferences**: Learns from your chart usage patterns

## 🚀 Creating Charts

### **Method 1: Natural Language**
Simply ask Aicser in plain English:
```
"Show me sales trends over the last 6 months"
"Compare revenue by region"
"Visualize customer distribution by age group"
```

### **Method 2: SQL Query**
Write SQL queries and Aicser will generate appropriate visualizations:
```sql
SELECT region, SUM(revenue) as total_revenue
FROM sales
GROUP BY region
ORDER BY total_revenue DESC
```

### **Method 3: Dashboard Builder**
Use the visual dashboard builder to:
- Drag and drop chart components
- Customize chart properties
- Arrange multiple charts on a dashboard
- Set up auto-refresh intervals

## 📈 Best Practices

### **Choosing the Right Chart**
- **Time Series**: Use line or area charts
- **Comparisons**: Use bar charts for categories
- **Proportions**: Use pie or donut charts
- **Relationships**: Use scatter plots or heatmaps
- **Hierarchies**: Use treemaps or sunburst charts

### **Design Tips**
- Keep charts simple and focused
- Use consistent color schemes
- Add clear labels and legends
- Include context and annotations
- Ensure accessibility (color-blind friendly)

## 🔗 Related Features

- [AI Overview](./ai-overview) - Learn about AI-powered analytics
- [Data Sources](./data-sources-overview) - Connect your data
- [Getting Started](../getting-started/first-chart) - Create your first chart

---

**Ready to create charts?** [Get Started →](../getting-started/first-chart)
