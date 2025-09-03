// Dashboard API Service - Integration with backend API routes
export class DashboardAPIService {
  private baseURL: string;

  constructor(baseURL: string = 'http://localhost:8000') {
    this.baseURL = baseURL;
  }

  // Dashboard Management (Project-scoped)
         async createDashboard(dashboardData: any, organizationId: string = 'aiser-dev-org', projectId: string = 'development-project') {
    try {
      // Try project-scoped API first
      let response;
      try {
        response = await fetch(`${this.baseURL}/charts/api/organizations/${organizationId}/projects/${projectId}/dashboards`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(dashboardData),
        });
        if (!response.ok) {
          throw new Error(`Project-scoped API failed: ${response.status}`);
        }
      } catch (projectError) {
        console.log('Project-scoped API not available, falling back to global API');
        // Fallback to global API
        response = await fetch(`${this.baseURL}/charts/dashboards/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(dashboardData),
        });
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to create dashboard:', error);
      throw error;
    }
  }

  async getDashboard(dashboardId: string) {
    try {
      const response = await fetch(`${this.baseURL}/charts/dashboards/${dashboardId}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get dashboard:', error);
      throw error;
    }
  }

  async updateDashboard(dashboardId: string, dashboardData: any) {
    try {
      const response = await fetch(`${this.baseURL}/charts/dashboards/${dashboardId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dashboardData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to update dashboard:', error);
      throw error;
    }
  }

  async deleteDashboard(dashboardId: string) {
    try {
      const response = await fetch(`${this.baseURL}/charts/dashboards/${dashboardId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to delete dashboard:', error);
      throw error;
    }
  }

  async listDashboards() {
    try {
      const response = await fetch(`${this.baseURL}/charts/dashboards/`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to list dashboards:', error);
      throw error;
    }
  }

  // Widget Management
  async createWidget(dashboardId: string, widgetData: any) {
    try {
      const response = await fetch(`${this.baseURL}/charts/dashboards/${dashboardId}/widgets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(widgetData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to create widget:', error);
      throw error;
    }
  }

  async updateWidget(dashboardId: string, widgetId: string, widgetData: any) {
    try {
      const response = await fetch(`${this.baseURL}/charts/dashboards/${dashboardId}/widgets/${widgetId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(widgetData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to update widget:', error);
      throw error;
    }
  }

  async deleteWidget(dashboardId: string, widgetId: string) {
    try {
      const response = await fetch(`${this.baseURL}/charts/dashboards/${dashboardId}/widgets/${widgetId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to delete widget:', error);
      throw error;
    }
  }

  async listWidgets(dashboardId: string) {
    try {
      const response = await fetch(`${this.baseURL}/charts/dashboards/${dashboardId}/widgets`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to list widgets:', error);
      throw error;
    }
  }

  // Dashboard Sharing
  async shareDashboard(dashboardId: string, shareData: any) {
    try {
      const response = await fetch(`${this.baseURL}/charts/dashboards/${dashboardId}/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(shareData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to share dashboard:', error);
      throw error;
    }
  }

  // Dashboard Export
  async exportDashboard(dashboardId: string, format: string = 'json') {
    try {
      const response = await fetch(`${this.baseURL}/charts/dashboards/${dashboardId}/export?format=${format}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to export dashboard:', error);
      throw error;
    }
  }

  // Dashboard Templates
  async getDashboardTemplates() {
    try {
      const response = await fetch(`${this.baseURL}/charts/dashboards/templates`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get dashboard templates:', error);
      throw error;
    }
  }

  async createDashboardFromTemplate(templateId: string, dashboardName: string) {
    try {
      const response = await fetch(`${this.baseURL}/charts/dashboards/from-template`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          template_id: templateId,
          dashboard_name: dashboardName,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to create dashboard from template:', error);
      throw error;
    }
  }

  // Plan Limits
  async getPlanLimits() {
    try {
      const response = await fetch(`${this.baseURL}/charts/plans/limits`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get plan limits:', error);
      throw error;
    }
  }

  // Chart Management (Standalone Charts)
  async createChart(chartData: any) {
    try {
      const response = await fetch(`${this.baseURL}/charts/builder/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(chartData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to create chart:', error);
      throw error;
    }
  }

  async getChart(chartId: string) {
    try {
      const response = await fetch(`${this.baseURL}/charts/builder/${chartId}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get chart:', error);
      throw error;
    }
  }

  async updateChart(chartId: string, chartData: any) {
    try {
      const response = await fetch(`${this.baseURL}/charts/builder/${chartId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(chartData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to update chart:', error);
      throw error;
    }
  }

  async deleteChart(chartId: string) {
    try {
      const response = await fetch(`${this.baseURL}/charts/builder/${chartId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to delete chart:', error);
      throw error;
    }
  }

  async listCharts() {
    try {
      const response = await fetch(`${this.baseURL}/charts/builder/list`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to list charts:', error);
      throw error;
    }
  }

  async exportChart(chartData: any) {
    try {
      const response = await fetch(`${this.baseURL}/charts/builder/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(chartData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to export chart:', error);
      throw error;
    }
  }

  async shareChart(chartData: any) {
    try {
      const response = await fetch(`${this.baseURL}/charts/builder/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(chartData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to share chart:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const dashboardAPIService = new DashboardAPIService();
