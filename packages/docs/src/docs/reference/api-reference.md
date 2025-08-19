---
id: api-reference
title: API Reference
sidebar_label: API Reference
description: Complete API documentation for Aiser Platform - integrate AI-powered analytics into your applications
---

# 🔌 API Reference

**Integrate Aiser Platform's AI-powered analytics into your applications with our comprehensive REST API.**

The Aiser Platform API provides programmatic access to all platform features, from AI-powered chart generation to user management and data analysis. Built with FastAPI and following REST principles, our API is designed for performance, reliability, and ease of integration.

## 🚀 Quick Start

### **Base URL**
```
Production: https://your-aiser-instance.com/api/v1
Development: http://localhost:8000/api/v1
```

### **Authentication**
```bash
# Get access token
curl -X POST "https://your-aiser-instance.com/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password123"}'

# Use token in requests
curl -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  "https://your-aiser-instance.com/api/v1/analytics/charts"
```

### **Response Format**
```json
{
  "success": true,
  "data": {
    // Response data here
  },
  "message": "Operation completed successfully",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## 🔐 Authentication

### **Login**
```http
POST /api/v1/auth/login
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "token_type": "bearer",
    "expires_in": 3600,
    "user": {
      "id": "user_123",
      "email": "user@example.com",
      "username": "username",
      "role": "user"
    }
  }
}
```

### **Refresh Token**
```http
POST /api/v1/auth/refresh
```

**Headers:**
```
Authorization: Bearer YOUR_REFRESH_TOKEN
```

**Response:**
```json
{
  "success": true,
  "data": {
    "access_token": "new_access_token_here",
    "token_type": "bearer",
    "expires_in": 3600
  }
}
```

### **Logout**
```http
POST /api/v1/auth/logout
```

**Headers:**
```
Authorization: Bearer YOUR_ACCESS_TOKEN
```

## 📊 Analytics API

### **Generate Chart**

```http
POST /api/v1/analytics/chart
```

**Request Body:**
```json
{
  "query": "Show me sales by month for the last year",
  "data_source": "sales_data",
  "chart_type": "auto",
  "options": {
    "theme": "light",
    "interactive": true,
    "export_formats": ["png", "pdf", "csv"]
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "chart_id": "chart_abc123",
    "chart_url": "https://your-aiser-instance.com/chart/abc123",
    "chart_data": {
      "type": "line",
      "data": {
        "labels": ["Jan", "Feb", "Mar", "Apr"],
        "datasets": [{
          "label": "Sales",
          "data": [1000, 1200, 1100, 1400]
        }]
      }
    },
    "insights": [
      "Sales show an upward trend over the period",
      "February had the highest growth rate at 20%",
      "Overall growth rate is 15% month-over-month"
    ],
    "generated_at": "2024-01-15T10:30:00Z"
  }
}
```

### **Get Chart by ID**

```http
GET /api/v1/analytics/chart/{chart_id}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "chart_id": "chart_abc123",
    "query": "Show me sales by month for the last year",
    "chart_data": {
      "type": "line",
      "data": { /* chart data */ },
      "options": { /* chart options */ }
    },
    "insights": [ /* AI-generated insights */ ],
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T10:30:00Z"
  }
}
```

### **List Charts**

```http
GET /api/v1/analytics/charts
```

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)
- `query`: Search by query text
- `chart_type`: Filter by chart type
- `created_after`: Filter by creation date
- `sort_by`: Sort field (created_at, updated_at, query)
- `sort_order`: Sort order (asc, desc)

**Response:**
```json
{
  "success": true,
  "data": {
    "charts": [
      {
        "chart_id": "chart_abc123",
        "query": "Show me sales by month",
        "chart_type": "line",
        "created_at": "2024-01-15T10:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "pages": 8
    }
  }
}
```

### **Update Chart**

```http
PUT /api/v1/analytics/chart/{chart_id}
```

**Request Body:**
```json
{
  "options": {
    "theme": "dark",
    "interactive": false,
    "export_formats": ["png"]
  }
}
```

### **Delete Chart**

```http
DELETE /api/v1/analytics/chart/{chart_id}
```

## 🤖 AI Analytics API

### **Intelligent Analysis**

```http
POST /api/v1/ai/intelligent-analysis
```

**Request Body:**
```json
{
  "query": "What are the key drivers of our sales performance?",
  "data_source": "sales_data",
  "analysis_type": "auto",
  "options": {
    "include_insights": true,
    "include_recommendations": true,
    "confidence_threshold": 0.8
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "analysis_id": "analysis_xyz789",
    "query": "What are the key drivers of our sales performance?",
    "analysis_type": "correlation_analysis",
    "results": {
      "primary_drivers": [
        {
          "factor": "Marketing Spend",
          "correlation": 0.87,
          "impact": "High",
          "confidence": 0.92
        },
        {
          "factor": "Seasonal Trends",
          "correlation": 0.73,
          "impact": "Medium",
          "confidence": 0.88
        }
      ],
      "insights": [
        "Marketing spend has the strongest correlation with sales performance",
        "Seasonal patterns show Q4 peak performance",
        "Price changes have minimal impact on volume"
      ],
      "recommendations": [
        "Increase marketing budget allocation by 15%",
        "Focus seasonal campaigns in Q4",
        "Maintain current pricing strategy"
      ]
    },
    "generated_at": "2024-01-15T10:30:00Z"
  }
}
```

### **Custom AI Workflow**

```http
POST /api/v1/ai/workflow
```

**Request Body:**
```json
{
  "workflow_name": "sales_forecasting",
  "steps": [
    {
      "step": 1,
      "type": "data_preparation",
      "parameters": {
        "data_source": "sales_data",
        "time_range": "last_24_months",
        "cleaning_rules": ["remove_outliers", "fill_missing"]
      }
    },
    {
      "step": 2,
      "type": "trend_analysis",
      "parameters": {
        "method": "moving_average",
        "window_size": 3
      }
    },
    {
      "step": 3,
      "type": "forecasting",
      "parameters": {
        "model": "arima",
        "forecast_periods": 6,
        "confidence_interval": 0.95
      }
    }
  ],
  "options": {
    "parallel_execution": true,
    "save_intermediate_results": true
  }
}
```

### **AI Model Management**

```http
GET /api/v1/ai/models
```

**Response:**
```json
{
  "success": true,
  "data": {
    "available_models": [
      {
        "model_id": "gpt-4.1-mini",
        "provider": "openai",
        "capabilities": ["text_analysis", "query_understanding", "insight_generation"],
        "status": "active",
        "performance_metrics": {
          "accuracy": 0.985,
          "response_time": 1.2,
          "cost_per_request": 0.001
        }
      },
      {
        "model_id": "gemini-2.5",
        "provider": "google",
        "capabilities": ["text_analysis", "query_understanding"],
        "status": "active",
        "performance_metrics": {
          "accuracy": 0.972,
          "response_time": 1.8,
          "cost_per_request": 0.0008
        }
      }
    ]
  }
}
```

## 📁 Data Management API

### **Upload Data**

```http
POST /api/v1/data/upload
```

**Request Body (multipart/form-data):**
```
file: [CSV/Excel file]
data_source_name: "sales_data_2024"
description: "Monthly sales data for 2024"
tags: ["sales", "monthly", "2024"]
```

**Response:**
```json
{
  "success": true,
  "data": {
    "data_source_id": "ds_123",
    "name": "sales_data_2024",
    "file_name": "sales_2024.csv",
    "file_size": 245760,
    "rows": 1247,
    "columns": 8,
    "schema": {
      "date": "datetime",
      "product": "string",
      "category": "string",
      "region": "string",
      "quantity": "integer",
      "price": "decimal",
      "revenue": "decimal",
      "customer_type": "string"
    },
    "uploaded_at": "2024-01-15T10:30:00Z"
  }
}
```

### **List Data Sources**

```http
GET /api/v1/data/sources
```

**Query Parameters:**
- `page`: Page number
- `limit`: Items per page
- `tags`: Filter by tags
- `created_after`: Filter by upload date
- `file_type`: Filter by file type

**Response:**
```json
{
  "success": true,
  "data": {
    "data_sources": [
      {
        "data_source_id": "ds_123",
        "name": "sales_data_2024",
        "file_name": "sales_2024.csv",
        "rows": 1247,
        "columns": 8,
        "tags": ["sales", "monthly", "2024"],
        "uploaded_at": "2024-01-15T10:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "pages": 3
    }
  }
}
```

### **Get Data Source Schema**

```http
GET /api/v1/data/sources/{data_source_id}/schema
```

**Response:**
```json
{
  "success": true,
  "data": {
    "data_source_id": "ds_123",
    "schema": {
      "date": {
        "type": "datetime",
        "nullable": false,
        "unique_values": 12,
        "sample_values": ["2024-01-01", "2024-02-01"]
      },
      "product": {
        "type": "string",
        "nullable": false,
        "unique_values": 156,
        "sample_values": ["Product A", "Product B"]
      }
    },
    "statistics": {
      "total_rows": 1247,
      "completeness": 0.985,
      "data_quality_score": 0.92
    }
  }
}
```

### **Delete Data Source**

```http
DELETE /api/v1/data/sources/{data_source_id}
```

## 👥 User Management API

### **Create User**

```http
POST /api/v1/users
```

**Request Body:**
```json
{
  "email": "newuser@example.com",
  "username": "newuser",
  "password": "securepassword123",
  "first_name": "John",
  "last_name": "Doe",
  "role": "user",
  "organization": "Example Corp"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user_id": "user_456",
    "email": "newuser@example.com",
    "username": "newuser",
    "first_name": "John",
    "last_name": "Doe",
    "role": "user",
    "organization": "Example Corp",
    "created_at": "2024-01-15T10:30:00Z",
    "status": "active"
  }
}
```

### **Get User Profile**

```http
GET /api/v1/users/{user_id}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user_id": "user_456",
    "email": "newuser@example.com",
    "username": "newuser",
    "first_name": "John",
    "last_name": "Doe",
    "role": "user",
    "organization": "Example Corp",
    "preferences": {
      "theme": "light",
      "language": "en",
      "timezone": "UTC"
    },
    "statistics": {
      "charts_created": 25,
      "last_login": "2024-01-15T09:00:00Z",
      "total_usage_time": 3600
    }
  }
}
```

### **Update User**

```http
PUT /api/v1/users/{user_id}
```

**Request Body:**
```json
{
  "first_name": "Jonathan",
  "preferences": {
    "theme": "dark",
    "language": "en"
  }
}
```

### **List Users**

```http
GET /api/v1/users
```

**Query Parameters:**
- `page`: Page number
- `limit`: Items per page
- `role`: Filter by role
- `organization`: Filter by organization
- `status`: Filter by status

## 🔐 Organization Management API

### **Create Organization**

```http
POST /api/v1/organizations
```

**Request Body:**
```json
{
  "name": "Example Corporation",
  "domain": "example.com",
  "plan": "enterprise",
  "settings": {
    "max_users": 100,
    "data_retention_days": 365,
    "ai_model_access": ["gpt-4", "gemini-2.5"]
  }
}
```

### **Get Organization**

```http
GET /api/v1/organizations/{organization_id}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "organization_id": "org_789",
    "name": "Example Corporation",
    "domain": "example.com",
    "plan": "enterprise",
    "status": "active",
    "created_at": "2024-01-01T00:00:00Z",
    "settings": {
      "max_users": 100,
      "data_retention_days": 365,
      "ai_model_access": ["gpt-4", "gemini-2.5"]
    },
    "usage": {
      "current_users": 45,
      "data_storage_gb": 2.5,
      "api_calls_month": 15000
    }
  }
}
```

## 📊 Dashboard API

### **Create Dashboard**

```http
POST /api/v1/dashboards
```

**Request Body:**
```json
{
  "name": "Sales Performance Dashboard",
  "description": "Comprehensive view of sales metrics and trends",
  "layout": [
    {
      "chart_id": "chart_abc123",
      "position": {"x": 0, "y": 0, "w": 6, "h": 4}
    },
    {
      "chart_id": "chart_def456",
      "position": {"x": 6, "y": 0, "w": 6, "h": 4}
    }
  ],
  "settings": {
    "auto_refresh": true,
    "refresh_interval": 300,
    "theme": "light"
  }
}
```

### **Get Dashboard**

```http
GET /api/v1/dashboards/{dashboard_id}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "dashboard_id": "dashboard_123",
    "name": "Sales Performance Dashboard",
    "description": "Comprehensive view of sales metrics and trends",
    "layout": [
      {
        "chart_id": "chart_abc123",
        "position": {"x": 0, "y": 0, "w": 6, "h": 4},
        "chart_data": { /* chart information */ }
      }
    ],
    "settings": {
      "auto_refresh": true,
      "refresh_interval": 300,
      "theme": "light"
    },
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T10:30:00Z"
  }
}
```

## 🔍 Search API

### **Global Search**

```http
GET /api/v1/search
```

**Query Parameters:**
- `q`: Search query
- `type`: Filter by type (charts, dashboards, data_sources, users)
- `page`: Page number
- `limit`: Items per page

**Response:**
```json
{
  "success": true,
  "data": {
    "query": "sales performance",
    "results": [
      {
        "type": "chart",
        "id": "chart_abc123",
        "title": "Monthly Sales Performance",
        "query": "Show me sales by month",
        "relevance_score": 0.95,
        "created_at": "2024-01-15T10:30:00Z"
      },
      {
        "type": "dashboard",
        "id": "dashboard_123",
        "title": "Sales Performance Dashboard",
        "description": "Comprehensive view of sales metrics",
        "relevance_score": 0.87,
        "created_at": "2024-01-15T10:30:00Z"
      }
    ],
    "total_results": 15,
    "pagination": {
      "page": 1,
      "limit": 10,
      "pages": 2
    }
  }
}
```

## 📈 Export API

### **Export Chart**

```http
GET /api/v1/export/chart/{chart_id}
```

**Query Parameters:**
- `format`: Export format (png, pdf, csv, json, html)
- `width`: Image width (for image formats)
- `height`: Image height (for image formats)
- `theme`: Chart theme (light, dark)

**Response:**
- **Image formats**: Binary image data
- **Data formats**: JSON/CSV data
- **HTML format**: Interactive HTML chart

### **Export Dashboard**

```http
GET /api/v1/export/dashboard/{dashboard_id}
```

**Query Parameters:**
- `format`: Export format (pdf, html)
- `include_charts`: Include chart images (true/false)
- `page_size**: PDF page size (a4, letter, legal)

## 🔔 Webhooks API

### **Create Webhook**

```http
POST /api/v1/webhooks
```

**Request Body:**
```json
{
  "name": "Chart Creation Notifications",
  "url": "https://your-app.com/webhooks/aiser",
  "events": ["chart.created", "chart.updated"],
  "secret": "webhook_secret_123",
  "active": true
}
```

### **Webhook Events**

**Available Events:**
- `chart.created`: New chart created
- `chart.updated`: Chart updated
- `chart.deleted`: Chart deleted
- `dashboard.created`: New dashboard created
- `user.created`: New user created
- `data.uploaded`: New data uploaded

**Webhook Payload Example:**
```json
{
  "event": "chart.created",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "chart_id": "chart_abc123",
    "query": "Show me sales by month",
    "user_id": "user_456",
    "organization_id": "org_789"
  }
}
```

## 📊 Metrics API

### **Get Platform Metrics**

```http
GET /api/v1/metrics/platform
```

**Response:**
```json
{
  "success": true,
  "data": {
    "users": {
      "total": 1250,
      "active_today": 89,
      "active_this_week": 234,
      "active_this_month": 567
    },
    "charts": {
      "total": 15420,
      "created_today": 45,
      "created_this_week": 234,
      "created_this_month": 1234
    },
    "ai_queries": {
      "total": 45678,
      "today": 123,
      "this_week": 890,
      "this_month": 3456
    },
    "performance": {
      "average_response_time": 1.2,
      "uptime_percentage": 99.9,
      "error_rate": 0.1
    }
  }
}
```

### **Get User Metrics**

```http
GET /api/v1/metrics/user/{user_id}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user_id": "user_456",
    "usage": {
      "charts_created": 25,
      "ai_queries": 150,
      "data_uploaded_mb": 45.2,
      "api_calls": 1200
    },
    "activity": {
      "last_login": "2024-01-15T09:00:00Z",
      "login_count_this_month": 15,
      "total_session_time": 3600
    },
    "performance": {
      "average_query_time": 1.5,
      "success_rate": 0.98
    }
  }
}
```

## 🚀 SDKs and Libraries

### **JavaScript/TypeScript SDK**

**Installation:**
```bash
npm install @aiser/sdk
```

**Usage:**
```typescript
import { AiserClient } from '@aiser/sdk';

const client = new AiserClient({
  baseUrl: 'https://your-aiser-instance.com/api/v1',
  apiKey: 'your_api_key'
});

// Generate chart
const chart = await client.analytics.generateChart({
  query: 'Show me sales by month',
  dataSource: 'sales_data'
});

// Get AI insights
const insights = await client.ai.intelligentAnalysis({
  query: 'What drives our sales performance?',
  dataSource: 'sales_data'
});
```

### **Python SDK**

**Installation:**
```bash
pip install aiser-sdk
```

**Usage:**
```python
from aiser_sdk import AiserClient

client = AiserClient(
    base_url="https://your-aiser-instance.com/api/v1",
    api_key="your_api_key"
)

# Generate chart
chart = client.analytics.generate_chart(
    query="Show me sales by month",
    data_source="sales_data"
)

# Get AI insights
insights = client.ai.intelligent_analysis(
    query="What drives our sales performance?",
    data_source="sales_data"
)
```

### **REST API Examples**

**cURL Examples:**
```bash
# Generate chart
curl -X POST "https://your-aiser-instance.com/api/v1/analytics/chart" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "Show me sales by month"}'

# Get chart
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "https://your-aiser-instance.com/api/v1/analytics/chart/chart_id"

# Export chart as PNG
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "https://your-aiser-instance.com/api/v1/export/chart/chart_id?format=png" \
  --output chart.png
```

## 🔒 Rate Limiting

### **Rate Limits**

| Endpoint Category | Rate Limit | Window |
|-------------------|------------|---------|
| **Authentication** | 5 requests | 1 minute |
| **Analytics** | 100 requests | 1 minute |
| **AI Analysis** | 50 requests | 1 minute |
| **Data Management** | 20 requests | 1 minute |
| **User Management** | 10 requests | 1 minute |

### **Rate Limit Headers**

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642233600
```

### **Rate Limit Response**

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded. Try again in 60 seconds.",
    "retry_after": 60
  }
}
```

## 🐛 Error Handling

### **Error Response Format**

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      "field": "Additional error details"
    },
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

### **Common Error Codes**

| Error Code | HTTP Status | Description |
|------------|-------------|-------------|
| `AUTHENTICATION_FAILED` | 401 | Invalid or expired token |
| `PERMISSION_DENIED` | 403 | Insufficient permissions |
| `RESOURCE_NOT_FOUND` | 404 | Requested resource not found |
| `VALIDATION_ERROR` | 422 | Invalid request data |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |

### **Error Handling Best Practices**

```typescript
try {
  const response = await client.analytics.generateChart(request);
  // Handle success
} catch (error) {
  if (error.code === 'RATE_LIMIT_EXCEEDED') {
    // Wait and retry
    await delay(error.retry_after * 1000);
    return retryRequest();
  } else if (error.code === 'AUTHENTICATION_FAILED') {
    // Refresh token
    await refreshToken();
    return retryRequest();
  } else {
    // Handle other errors
    console.error('API Error:', error.message);
  }
}
```

## 📚 Next Steps

### **Integration Guides**

1. **🔌 [Quick Start Integration](../integration/quick-start)** - Get started in minutes
2. **🤖 [AI Analytics Integration](../integration/ai-analytics)** - Leverage AI capabilities
3. **📊 [Dashboard Integration](../integration/dashboards)** - Embed charts and dashboards
4. **📱 [Mobile Integration](../integration/mobile)** - Mobile app integration

### **Advanced Topics**

1. **🔐 [Authentication & Security](../security/authentication)** - Advanced security features
2. **📈 [Performance Optimization](../performance/optimization)** - Optimize API usage
3. **🔔 [Webhook Integration](../integration/webhooks)** - Real-time notifications
4. **📊 [Custom Analytics](../analytics/custom)** - Build custom analytics workflows

---

**Ready to integrate?** [Start with Quick Start Integration →](../integration/quick-start)
