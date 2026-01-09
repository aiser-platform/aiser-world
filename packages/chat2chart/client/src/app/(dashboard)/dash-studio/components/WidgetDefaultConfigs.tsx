// Get default configuration for widget type
export const getDefaultConfig = (widgetType: string) => {
    const defaults: Record<string, any> = {
        bar: {
            // Title & Subtitle
            title: 'Bar Chart',
            subtitle: 'Professional visualization',

            // Visual Configuration
            colorPalette: 'default',
            theme: 'auto',
            legendShow: true,
            legendPosition: 'top',
            tooltipShow: true,
            tooltipTrigger: 'axis',
            tooltipFormatter: 'default',
            tooltipCustomFormatter: '',
            animation: true,
            animationDuration: 1000,
            seriesLabelShow: false,
            seriesLabelPosition: 'top',

            // Data Configuration
            xAxisField: 'category',
            yAxisField: 'value',
            seriesField: 'auto',
            dataLimit: 1000,
            showXAxis: true,
            showYAxis: true,
            dataLabelsShow: false,
            dataLabelsFormat: 'auto',

            // Layout & Positioning
            responsive: true,
            draggable: true,
            resizable: true,
            backgroundColor: 'transparent',
            borderColor: '#d9d9d9',
            padding: 16,
            margin: 8,

            // Typography
            fontFamily: 'Arial',
            fontSize: 12,
            fontWeight: 'normal',
            textColor: '#000000',

            // Effects & Animation
            animationType: 'fadeIn',
            animationDelay: 0,
            shadowEffect: false,
            glowEffect: false,

            // Advanced
            customOptions: '',
            performanceMode: false,
            autoResize: true,
            lazyLoading: false,

            // Data Zoom
            dataZoomShow: false,
            dataZoomType: 'inside',
            dataZoomStart: 0,
            dataZoomEnd: 100,

            // Mark Points & Lines
            markPointShow: false,
            markLineShow: false,
            markPointMax: false,
            markPointMin: false,
            markLineAverage: false,

            // Brush Selection
            brushShow: false,
            brushType: 'rect',

            // Visual Mapping
            visualMapShow: false,
            visualMapDimension: '0',
            visualMapMin: undefined,
            visualMapMax: undefined,

            // Accessibility
            ariaEnabled: true,
            ariaLabel: 'Bar chart showing data values',
        },
        line: {
            // Title & Subtitle
            title: 'Line Chart',
            subtitle: 'Trend visualization',

            // Visual Configuration
            colorPalette: 'default',
            theme: 'auto',
            legendShow: true,
            legendPosition: 'top',
            tooltipShow: true,
            tooltipTrigger: 'axis',
            tooltipFormatter: 'default',
            tooltipCustomFormatter: '',
            animation: true,
            animationDuration: 1000,
            seriesLabelShow: false,
            seriesLabelPosition: 'top',

            // Data Configuration
            xAxisField: 'time',
            yAxisField: 'value',
            seriesField: 'auto',
            dataLimit: 1000,
            showXAxis: true,
            showYAxis: true,
            dataLabelsShow: false,
            dataLabelsFormat: 'auto',

            // Layout & Positioning
            responsive: true,
            draggable: true,
            resizable: true,
            backgroundColor: 'transparent',
            borderColor: '#d9d9d9',
            padding: 16,
            margin: 8,

            // Typography
            fontFamily: 'Arial',
            fontSize: 12,
            fontWeight: 'normal',
            textColor: '#000000',

            // Effects & Animation
            animationType: 'fadeIn',
            animationDelay: 0,
            shadowEffect: false,
            glowEffect: false,

            // Advanced
            customOptions: '',
            performanceMode: false,
            autoResize: true,
            lazyLoading: false,

            // Data Zoom
            dataZoomShow: true,
            dataZoomType: 'inside',
            dataZoomStart: 0,
            dataZoomEnd: 100,

            // Mark Points & Lines
            markPointShow: true,
            markLineShow: true,
            markPointMax: true,
            markPointMin: true,
            markLineAverage: true,

            // Brush Selection
            brushShow: false,
            brushType: 'rect',

            // Visual Mapping
            visualMapShow: false,
            visualMapDimension: '0',
            visualMapMin: undefined,
            visualMapMax: undefined,

            // Accessibility
            ariaEnabled: true,
            ariaLabel: 'Line chart showing trend data',
        },
        pie: {
            // Title & Subtitle
            title: 'Pie Chart',
            subtitle: 'Proportion visualization',

            // Visual Configuration
            colorPalette: 'default',
            theme: 'auto',
            legendShow: true,
            legendPosition: 'right',
            tooltipShow: true,
            tooltipTrigger: 'item',
            tooltipFormatter: 'percentage',
            tooltipCustomFormatter: '{b}: {d}%',
            animation: true,
            animationDuration: 1000,
            seriesLabelShow: true,
            seriesLabelPosition: 'outside',

            // Data Configuration
            xAxisField: 'category',
            yAxisField: 'value',
            seriesField: 'auto',
            dataLimit: 1000,
            showXAxis: false,
            showYAxis: false,
            dataLabelsShow: true,
            dataLabelsFormat: 'percentage',

            // Layout & Positioning
            responsive: true,
            draggable: true,
            resizable: true,
            backgroundColor: 'transparent',
            borderColor: '#d9d9d9',
            padding: 16,
            margin: 8,

            // Typography
            fontFamily: 'Arial',
            fontSize: 12,
            fontWeight: 'normal',
            textColor: '#000000',

            // Effects & Animation
            animationType: 'fadeIn',
            animationDelay: 0,
            shadowEffect: false,
            glowEffect: false,

            // Advanced
            customOptions: '',
            performanceMode: false,
            autoResize: true,
            lazyLoading: false,

            // Data Zoom
            dataZoomShow: false,
            dataZoomType: 'inside',
            dataZoomStart: 0,
            dataZoomEnd: 100,

            // Mark Points & Lines
            markPointShow: false,
            markLineShow: false,
            markPointMax: false,
            markPointMin: false,
            markLineAverage: false,

            // Brush Selection
            brushShow: false,
            brushType: 'rect',

            // Visual Mapping
            visualMapShow: false,
            visualMapDimension: '0',
            visualMapMin: undefined,
            visualMapMax: undefined,

            // Accessibility
            ariaEnabled: true,
            ariaLabel: 'Pie chart showing data proportions',
        },
        area: {
            // Title & Subtitle
            title: 'Area Chart',
            subtitle: 'Area visualization',

            // Visual Configuration
            colorPalette: 'default',
            theme: 'auto',
            legendShow: true,
            legendPosition: 'top',
            tooltipShow: true,
            tooltipTrigger: 'axis',
            tooltipFormatter: 'default',
            tooltipCustomFormatter: '',
            animation: true,
            animationDuration: 1000,
            seriesLabelShow: false,
            seriesLabelPosition: 'top',

            // Data Configuration
            xAxisField: 'time',
            yAxisField: 'value',
            seriesField: 'auto',
            dataLimit: 1000,
            showXAxis: true,
            showYAxis: true,
            dataLabelsShow: false,
            dataLabelsFormat: 'auto',

            // Layout & Positioning
            responsive: true,
            draggable: true,
            resizable: true,
            backgroundColor: 'transparent',
            borderColor: '#d9d9d9',
            padding: 16,
            margin: 8,

            // Typography
            fontFamily: 'Arial',
            fontSize: 12,
            fontWeight: 'normal',
            textColor: '#000000',

            // Effects & Animation
            animationType: 'fadeIn',
            animationDelay: 0,
            shadowEffect: false,
            glowEffect: false,

            // Advanced
            customOptions: '',
            performanceMode: false,
            autoResize: true,
            lazyLoading: false,

            // Data Zoom
            dataZoomShow: true,
            dataZoomType: 'inside',
            dataZoomStart: 0,
            dataZoomEnd: 100,

            // Mark Points & Lines
            markPointShow: false,
            markLineShow: false,
            markPointMax: false,
            markPointMin: false,
            markLineAverage: false,

            // Brush Selection
            brushShow: false,
            brushType: 'rect',

            // Visual Mapping
            visualMapShow: false,
            visualMapDimension: '0',
            visualMapMin: undefined,
            visualMapMax: undefined,

            // Accessibility
            ariaEnabled: true,
            ariaLabel: 'Area chart showing filled data visualization',
        },
        scatter: {
            // Title & Subtitle
            title: 'Scatter Plot',
            subtitle: 'Correlation visualization',

            // Visual Configuration
            colorPalette: 'default',
            theme: 'auto',
            legendShow: true,
            legendPosition: 'top',
            tooltipShow: true,
            tooltipTrigger: 'item',
            tooltipFormatter: 'default',
            tooltipCustomFormatter: '',
            animation: true,
            animationDuration: 1000,
            seriesLabelShow: false,
            seriesLabelPosition: 'top',

            // Data Configuration
            xAxisField: 'x',
            yAxisField: 'y',
            seriesField: 'auto',
            dataLimit: 1000,
            showXAxis: true,
            showYAxis: true,
            dataLabelsShow: false,
            dataLabelsFormat: 'auto',

            // Layout & Positioning
            responsive: true,
            draggable: true,
            resizable: true,
            backgroundColor: 'transparent',
            borderColor: '#d9d9d9',
            padding: 16,
            margin: 8,

            // Typography
            fontFamily: 'Arial',
            fontSize: 12,
            fontWeight: 'normal',
            textColor: '#000000',

            // Effects & Animation
            animationType: 'fadeIn',
            animationDelay: 0,
            shadowEffect: false,
            glowEffect: false,

            // Advanced
            customOptions: '',
            performanceMode: false,
            autoResize: true,
            lazyLoading: false,

            // Data Zoom
            dataZoomShow: true,
            dataZoomType: 'inside',
            dataZoomStart: 0,
            dataZoomEnd: 100,

            // Mark Points & Lines
            markPointShow: false,
            markLineShow: false,
            markPointMax: false,
            markPointMin: false,
            markLineAverage: false,

            // Brush Selection
            brushShow: true,
            brushType: 'rect',

            // Visual Mapping
            visualMapShow: false,
            visualMapDimension: '0',
            visualMapMin: undefined,
            visualMapMax: undefined,

            // Accessibility
            ariaEnabled: true,
            ariaLabel: 'Scatter plot showing data correlation',
        },
        radar: {
            // Title & Subtitle
            title: 'Radar Chart',
            subtitle: 'Multi-dimensional visualization',

            // Visual Configuration
            colorPalette: 'default',
            theme: 'auto',
            legendShow: true,
            legendPosition: 'top',
            tooltipShow: true,
            tooltipTrigger: 'item',
            tooltipFormatter: 'default',
            tooltipCustomFormatter: '',
            animation: true,
            animationDuration: 1000,
            seriesLabelShow: false,
            seriesLabelPosition: 'top',

            // Data Configuration
            xAxisField: 'category',
            yAxisField: 'value',
            seriesField: 'auto',
            dataLimit: 1000,
            showXAxis: false,
            showYAxis: false,
            dataLabelsShow: false,
            dataLabelsFormat: 'auto',

            // Layout & Positioning
            responsive: true,
            draggable: true,
            resizable: true,
            backgroundColor: 'transparent',
            borderColor: '#d9d9d9',
            padding: 16,
            margin: 8,

            // Typography
            fontFamily: 'Arial',
            fontSize: 12,
            fontWeight: 'normal',
            textColor: '#000000',

            // Effects & Animation
            animationType: 'fadeIn',
            animationDelay: 0,
            shadowEffect: false,
            glowEffect: false,

            // Advanced
            customOptions: '',
            performanceMode: false,
            autoResize: true,
            lazyLoading: false,

            // Data Zoom
            dataZoomShow: false,
            dataZoomType: 'inside',
            dataZoomStart: 0,
            dataZoomEnd: 100,

            // Mark Points & Lines
            markPointShow: false,
            markLineShow: false,
            markPointMax: false,
            markPointMin: false,
            markLineAverage: false,

            // Brush Selection
            brushShow: false,
            brushType: 'rect',

            // Visual Mapping
            visualMapShow: false,
            visualMapDimension: '0',
            visualMapMin: undefined,
            visualMapMax: undefined,

            // Accessibility
            ariaEnabled: true,
            ariaLabel: 'Radar chart showing multi-dimensional data',
        },
        heatmap: {
            // Title & Subtitle
            title: 'Heatmap',
            subtitle: 'Density visualization',

            // Visual Configuration
            colorPalette: 'default',
            theme: 'auto',
            legendShow: true,
            legendPosition: 'right',
            tooltipShow: true,
            tooltipTrigger: 'item',
            tooltipFormatter: 'default',
            tooltipCustomFormatter: '',
            animation: true,
            animationDuration: 1000,
            seriesLabelShow: false,
            seriesLabelPosition: 'top',

            // Data Configuration
            xAxisField: 'x',
            yAxisField: 'y',
            seriesField: 'value',
            dataLimit: 1000,
            showXAxis: true,
            showYAxis: true,
            dataLabelsShow: false,
            dataLabelsFormat: 'auto',

            // Layout & Positioning
            responsive: true,
            draggable: true,
            resizable: true,
            backgroundColor: 'transparent',
            borderColor: '#d9d9d9',
            padding: 16,
            margin: 8,

            // Typography
            fontFamily: 'Arial',
            fontSize: 12,
            fontWeight: 'normal',
            textColor: '#000000',

            // Effects & Animation
            animationType: 'fadeIn',
            animationDelay: 0,
            shadowEffect: false,
            glowEffect: false,

            // Advanced
            customOptions: '',
            performanceMode: false,
            autoResize: true,
            lazyLoading: false,

            // Data Zoom
            dataZoomShow: true,
            dataZoomType: 'inside',
            dataZoomStart: 0,
            dataZoomEnd: 100,

            // Mark Points & Lines
            markPointShow: false,
            markLineShow: false,
            markPointMax: false,
            markPointMin: false,
            markLineAverage: false,

            // Brush Selection
            brushShow: true,
            brushType: 'rect',

            // Visual Mapping
            visualMapShow: true,
            visualMapDimension: '2',
            visualMapMin: 0,
            visualMapMax: 100,

            // Accessibility
            ariaEnabled: true,
            ariaLabel: 'Heatmap showing data density',
        },
        funnel: {
            // Title & Subtitle
            title: 'Funnel Chart',
            subtitle: 'Conversion visualization',

            // Visual Configuration
            colorPalette: 'default',
            theme: 'auto',
            legendShow: true,
            legendPosition: 'top',
            tooltipShow: true,
            tooltipTrigger: 'item',
            tooltipFormatter: 'percentage',
            tooltipCustomFormatter: '{b}: {d}%',
            animation: true,
            animationDuration: 1000,
            seriesLabelShow: true,
            seriesLabelPosition: 'inside',

            // Data Configuration
            xAxisField: 'category',
            yAxisField: 'value',
            seriesField: 'auto',
            dataLimit: 1000,
            showXAxis: false,
            showYAxis: false,
            dataLabelsShow: true,
            dataLabelsFormat: 'percentage',

            // Layout & Positioning
            responsive: true,
            draggable: true,
            resizable: true,
            backgroundColor: 'transparent',
            borderColor: '#d9d9d9',
            padding: 16,
            margin: 8,

            // Typography
            fontFamily: 'Arial',
            fontSize: 12,
            fontWeight: 'normal',
            textColor: '#000000',

            // Effects & Animation
            animationType: 'fadeIn',
            animationDelay: 0,
            shadowEffect: false,
            glowEffect: false,

            // Advanced
            customOptions: '',
            performanceMode: false,
            autoResize: true,
            lazyLoading: false,

            // Data Zoom
            dataZoomShow: false,
            dataZoomType: 'inside',
            dataZoomStart: 0,
            dataZoomEnd: 100,

            // Mark Points & Lines
            markPointShow: false,
            markLineShow: false,
            markPointMax: false,
            markPointMin: false,
            markLineAverage: false,

            // Brush Selection
            brushShow: false,
            brushType: 'rect',

            // Visual Mapping
            visualMapShow: false,
            visualMapDimension: '0',
            visualMapMin: undefined,
            visualMapMax: undefined,

            // Accessibility
            ariaEnabled: true,
            ariaLabel: 'Funnel chart showing conversion process',
        },
        gauge: {
            // Title & Subtitle
            title: 'Gauge Chart',
            subtitle: 'Progress visualization',

            // Visual Configuration
            colorPalette: 'default',
            theme: 'auto',
            legendShow: false,
            legendPosition: 'top',
            tooltipShow: true,
            tooltipTrigger: 'item',
            tooltipFormatter: 'default',
            tooltipCustomFormatter: '',
            animation: true,
            animationDuration: 1000,
            seriesLabelShow: true,
            seriesLabelPosition: 'inside',

            // Data Configuration
            xAxisField: 'category',
            yAxisField: 'value',
            seriesField: 'auto',
            dataLimit: 1000,
            showXAxis: false,
            showYAxis: false,
            dataLabelsShow: true,
            dataLabelsFormat: 'percentage',

            // Layout & Positioning
            responsive: true,
            draggable: true,
            resizable: true,
            backgroundColor: 'transparent',
            borderColor: '#d9d9d9',
            padding: 16,
            margin: 8,

            // Typography
            fontFamily: 'Arial',
            fontSize: 12,
            fontWeight: 'normal',
            textColor: '#000000',

            // Effects & Animation
            animationType: 'fadeIn',
            animationDelay: 0,
            shadowEffect: false,
            glowEffect: false,

            // Advanced
            customOptions: '',
            performanceMode: false,
            autoResize: true,
            lazyLoading: false,

            // Data Zoom
            dataZoomShow: false,
            dataZoomType: 'inside',
            dataZoomStart: 0,
            dataZoomEnd: 100,

            // Mark Points & Lines
            markPointShow: false,
            markLineShow: false,
            markPointMax: false,
            markPointMin: false,
            markLineAverage: false,

            // Brush Selection
            brushShow: false,
            brushType: 'rect',

            // Visual Mapping
            visualMapShow: false,
            visualMapDimension: '0',
            visualMapMin: undefined,
            visualMapMax: undefined,

            // Accessibility
            ariaEnabled: true,
            ariaLabel: 'Gauge chart showing progress value',
        },
    };

    return defaults[widgetType] || defaults.bar;
};
