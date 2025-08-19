/**
 * Users Cube Schema
 * Multi-tenant user analytics with security context
 */

cube('Users', {
  sql: `SELECT * FROM users WHERE tenant_id = '${SECURITY_CONTEXT.tenantId}'`,
  
  dimensions: {
    id: {
      sql: 'id',
      type: 'number',
      primaryKey: true,
      shown: false
    },
    
    email: {
      sql: 'email',
      type: 'string',
      title: 'Email Address'
    },
    
    username: {
      sql: 'username',
      type: 'string',
      title: 'Username'
    },
    
    firstName: {
      sql: 'first_name',
      type: 'string',
      title: 'First Name'
    },
    
    lastName: {
      sql: 'last_name',
      type: 'string',
      title: 'Last Name'
    },
    
    fullName: {
      sql: `CONCAT(${CUBE}.first_name, ' ', ${CUBE}.last_name)`,
      type: 'string',
      title: 'Full Name'
    },
    
    role: {
      sql: 'role',
      type: 'string',
      title: 'User Role'
    },
    
    status: {
      sql: 'status',
      type: 'string',
      title: 'Account Status'
    },
    
    createdAt: {
      sql: 'created_at',
      type: 'time',
      title: 'Registration Date'
    },
    
    updatedAt: {
      sql: 'updated_at',
      type: 'time',
      title: 'Last Updated'
    },
    
    lastLoginAt: {
      sql: 'last_login_at',
      type: 'time',
      title: 'Last Login'
    },
    
    tenantId: {
      sql: 'tenant_id',
      type: 'string',
      shown: false // Hidden from end users but used for filtering
    }
  },
  
  measures: {
    count: {
      type: 'count',
      title: 'Total Users'
    },
    
    activeUsers: {
      sql: 'id',
      type: 'countDistinct',
      title: 'Active Users',
      filters: [
        { sql: `${CUBE}.status = 'active'` }
      ]
    },
    
    newUsers: {
      sql: 'id',
      type: 'countDistinct',
      title: 'New Users (Last 30 Days)',
      filters: [
        { sql: `${CUBE}.created_at >= CURRENT_DATE - INTERVAL '30 days'` }
      ]
    },
    
    recentlyActiveUsers: {
      sql: 'id',
      type: 'countDistinct',
      title: 'Recently Active Users',
      filters: [
        { sql: `${CUBE}.last_login_at >= CURRENT_DATE - INTERVAL '7 days'` }
      ]
    },
    
    adminUsers: {
      sql: 'id',
      type: 'countDistinct',
      title: 'Admin Users',
      filters: [
        { sql: `${CUBE}.role = 'admin'` }
      ]
    }
  },
  
  segments: {
    activeUsers: {
      sql: `${CUBE}.status = 'active'`,
      title: 'Active Users'
    },
    
    newUsers: {
      sql: `${CUBE}.created_at >= CURRENT_DATE - INTERVAL '30 days'`,
      title: 'New Users (Last 30 Days)'
    },
    
    adminUsers: {
      sql: `${CUBE}.role = 'admin'`,
      title: 'Admin Users'
    }
  },
  
  preAggregations: {
    // Daily user registrations
    usersByDay: {
      measures: [Users.count, Users.newUsers],
      timeDimension: Users.createdAt,
      granularity: 'day',
      partitionGranularity: 'month',
      refreshKey: {
        every: '1 hour'
      }
    },
    
    // User status breakdown
    usersByStatus: {
      measures: [Users.count],
      dimensions: [Users.status],
      refreshKey: {
        every: '30 minutes'
      }
    },
    
    // User role distribution
    usersByRole: {
      measures: [Users.count],
      dimensions: [Users.role],
      refreshKey: {
        every: '1 hour'
      }
    },
    
    // Monthly user activity
    monthlyActiveUsers: {
      measures: [Users.activeUsers, Users.recentlyActiveUsers],
      timeDimension: Users.createdAt,
      granularity: 'month',
      refreshKey: {
        every: '1 day'
      }
    }
  }
});