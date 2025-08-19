/**
 * Charts Cube Schema
 * Chart generation and usage analytics for Chat2Chart
 */

cube('Charts', {
  sql: `SELECT * FROM charts WHERE tenant_id = '${SECURITY_CONTEXT.tenantId}'`,
  
  joins: {
    Users: {
      sql: `${CUBE}.user_id = ${Users}.id`,
      relationship: 'belongsTo'
    },
    
    Conversations: {
      sql: `${CUBE}.conversation_id = ${Conversations}.id`,
      relationship: 'belongsTo'
    }
  },
  
  dimensions: {
    id: {
      sql: 'id',
      type: 'string',
      primaryKey: true,
      shown: false
    },
    
    title: {
      sql: 'title',
      type: 'string',
      title: 'Chart Title'
    },
    
    type: {
      sql: 'chart_type',
      type: 'string',
      title: 'Chart Type'
    },
    
    library: {
      sql: 'chart_library',
      type: 'string',
      title: 'Chart Library'
    },
    
    status: {
      sql: 'status',
      type: 'string',
      title: 'Chart Status'
    },
    
    complexity: {
      sql: 'complexity_score',
      type: 'number',
      title: 'Complexity Score'
    },
    
    dataSource: {
      sql: 'data_source',
      type: 'string',
      title: 'Data Source'
    },
    
    createdAt: {
      sql: 'created_at',
      type: 'time',
      title: 'Created Date'
    },
    
    updatedAt: {
      sql: 'updated_at',
      type: 'time',
      title: 'Last Updated'
    },
    
    userId: {
      sql: 'user_id',
      type: 'number',
      shown: false
    },
    
    conversationId: {
      sql: 'conversation_id',
      type: 'string',
      shown: false
    },
    
    tenantId: {
      sql: 'tenant_id',
      type: 'string',
      shown: false
    }
  },
  
  measures: {
    count: {
      type: 'count',
      title: 'Total Charts'
    },
    
    successfulCharts: {
      sql: 'id',
      type: 'countDistinct',
      title: 'Successful Charts',
      filters: [
        { sql: `${CUBE}.status = 'completed'` }
      ]
    },
    
    failedCharts: {
      sql: 'id',
      type: 'countDistinct',
      title: 'Failed Charts',
      filters: [
        { sql: `${CUBE}.status = 'failed'` }
      ]
    },
    
    chartsToday: {
      sql: 'id',
      type: 'countDistinct',
      title: 'Charts Created Today',
      filters: [
        { sql: `${CUBE}.created_at >= CURRENT_DATE` }
      ]
    },
    
    averageComplexity: {
      sql: 'complexity_score',
      type: 'avg',
      title: 'Average Complexity Score'
    },
    
    uniqueUsers: {
      sql: 'user_id',
      type: 'countDistinct',
      title: 'Unique Chart Creators'
    },
    
    successRate: {
      sql: `
        CASE 
          WHEN COUNT(*) > 0 
          THEN (COUNT(CASE WHEN ${CUBE}.status = 'completed' THEN 1 END) * 100.0 / COUNT(*))
          ELSE 0 
        END
      `,
      type: 'number',
      title: 'Success Rate (%)',
      format: 'percent'
    },
    
    averageCreationTime: {
      sql: `EXTRACT(EPOCH FROM (${CUBE}.updated_at - ${CUBE}.created_at))`,
      type: 'avg',
      title: 'Average Creation Time (Seconds)'
    }
  },
  
  segments: {
    successfulCharts: {
      sql: `${CUBE}.status = 'completed'`,
      title: 'Successful Charts'
    },
    
    failedCharts: {
      sql: `${CUBE}.status = 'failed'`,
      title: 'Failed Charts'
    },
    
    todayCharts: {
      sql: `${CUBE}.created_at >= CURRENT_DATE`,
      title: 'Today\'s Charts'
    },
    
    complexCharts: {
      sql: `${CUBE}.complexity_score > 7`,
      title: 'Complex Charts'
    },
    
    echartsCharts: {
      sql: `${CUBE}.chart_library = 'echarts'`,
      title: 'ECharts Charts'
    },
    
    antvCharts: {
      sql: `${CUBE}.chart_library = 'antv'`,
      title: 'AntV Charts'
    }
  },
  
  preAggregations: {
    // Daily chart creation metrics
    chartsByDay: {
      measures: [
        Charts.count,
        Charts.successfulCharts,
        Charts.failedCharts,
        Charts.successRate,
        Charts.uniqueUsers
      ],
      timeDimension: Charts.createdAt,
      granularity: 'day',
      partitionGranularity: 'month',
      refreshKey: {
        every: '1 hour'
      }
    },
    
    // Chart type popularity
    chartsByType: {
      measures: [
        Charts.count,
        Charts.successfulCharts,
        Charts.averageComplexity
      ],
      dimensions: [Charts.type],
      refreshKey: {
        every: '30 minutes'
      }
    },
    
    // Chart library usage
    chartsByLibrary: {
      measures: [
        Charts.count,
        Charts.successRate,
        Charts.averageCreationTime
      ],
      dimensions: [Charts.library],
      refreshKey: {
        every: '1 hour'
      }
    },
    
    // Data source analysis
    chartsByDataSource: {
      measures: [Charts.count, Charts.successRate],
      dimensions: [Charts.dataSource],
      refreshKey: {
        every: '2 hours'
      }
    },
    
    // Hourly chart activity
    chartsByHour: {
      measures: [Charts.count, Charts.successfulCharts],
      timeDimension: Charts.createdAt,
      granularity: 'hour',
      refreshKey: {
        every: '15 minutes'
      }
    },
    
    // User chart creation patterns
    userChartActivity: {
      measures: [
        Charts.count,
        Charts.averageComplexity,
        Charts.successRate
      ],
      dimensions: [Users.role],
      refreshKey: {
        every: '2 hours'
      }
    }
  }
});