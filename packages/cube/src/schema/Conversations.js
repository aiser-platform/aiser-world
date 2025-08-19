/**
 * Conversations Cube Schema
 * Chat2Chart conversation analytics with user relationships
 */

cube('Conversations', {
  sql: `SELECT * FROM conversation WHERE tenant_id = '${SECURITY_CONTEXT.tenantId}'`,
  
  joins: {
    Users: {
      sql: `${CUBE}.user_id = ${Users}.id`,
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
      title: 'Conversation Title'
    },
    
    description: {
      sql: 'description',
      type: 'string',
      title: 'Description'
    },
    
    status: {
      sql: 'status',
      type: 'string',
      title: 'Status'
    },
    
    type: {
      sql: 'type',
      type: 'string',
      title: 'Conversation Type'
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
    
    tenantId: {
      sql: 'tenant_id',
      type: 'string',
      shown: false
    }
  },
  
  measures: {
    count: {
      type: 'count',
      title: 'Total Conversations'
    },
    
    activeConversations: {
      sql: 'id',
      type: 'countDistinct',
      title: 'Active Conversations',
      filters: [
        { sql: `${CUBE}.updated_at >= CURRENT_DATE - INTERVAL '7 days'` }
      ]
    },
    
    newConversations: {
      sql: 'id',
      type: 'countDistinct',
      title: 'New Conversations (Today)',
      filters: [
        { sql: `${CUBE}.created_at >= CURRENT_DATE` }
      ]
    },
    
    completedConversations: {
      sql: 'id',
      type: 'countDistinct',
      title: 'Completed Conversations',
      filters: [
        { sql: `${CUBE}.status = 'completed'` }
      ]
    },
    
    averageConversationDuration: {
      sql: `EXTRACT(EPOCH FROM (${CUBE}.updated_at - ${CUBE}.created_at)) / 60`,
      type: 'avg',
      title: 'Average Duration (Minutes)'
    },
    
    uniqueUsers: {
      sql: 'user_id',
      type: 'countDistinct',
      title: 'Unique Users'
    }
  },
  
  segments: {
    activeConversations: {
      sql: `${CUBE}.updated_at >= CURRENT_DATE - INTERVAL '7 days'`,
      title: 'Active Conversations'
    },
    
    todayConversations: {
      sql: `${CUBE}.created_at >= CURRENT_DATE`,
      title: 'Today\'s Conversations'
    },
    
    completedConversations: {
      sql: `${CUBE}.status = 'completed'`,
      title: 'Completed Conversations'
    },
    
    longConversations: {
      sql: `EXTRACT(EPOCH FROM (${CUBE}.updated_at - ${CUBE}.created_at)) > 3600`,
      title: 'Long Conversations (>1 hour)'
    }
  },
  
  preAggregations: {
    // Daily conversation metrics
    conversationsByDay: {
      measures: [
        Conversations.count, 
        Conversations.newConversations,
        Conversations.activeConversations,
        Conversations.uniqueUsers
      ],
      timeDimension: Conversations.createdAt,
      granularity: 'day',
      partitionGranularity: 'month',
      refreshKey: {
        every: '1 hour'
      }
    },
    
    // Conversation status breakdown
    conversationsByStatus: {
      measures: [Conversations.count],
      dimensions: [Conversations.status],
      refreshKey: {
        every: '30 minutes'
      }
    },
    
    // Conversation type analysis
    conversationsByType: {
      measures: [Conversations.count, Conversations.averageConversationDuration],
      dimensions: [Conversations.type],
      refreshKey: {
        every: '1 hour'
      }
    },
    
    // Hourly conversation activity
    conversationsByHour: {
      measures: [Conversations.count, Conversations.newConversations],
      timeDimension: Conversations.createdAt,
      granularity: 'hour',
      refreshKey: {
        every: '15 minutes'
      }
    },
    
    // User engagement metrics
    userEngagement: {
      measures: [
        Conversations.count,
        Conversations.averageConversationDuration
      ],
      dimensions: [Users.role, Users.status],
      refreshKey: {
        every: '2 hours'
      }
    }
  }
});