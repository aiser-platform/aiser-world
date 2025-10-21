// Dashboard API Service - Integration with backend API routes
import { fetchWithAuth } from '@/services/apiService';
import { fetchApi } from '@/utils/api';
export class DashboardAPIService {
  private baseURL: string;

  constructor(baseURL: string = '/api') {
    this.baseURL = baseURL.replace(/\/$/, '');
  }

  private withCreds(init?: RequestInit): RequestInit {
    const headers: Record<string, string> = {
      ...(init?.headers as Record<string, string> | undefined),
    };
    // Use cookies for authentication (HttpOnly access_token). Do NOT fallback to localStorage.
    return { ...(init || {}), credentials: 'include', headers };
  }

  // Dashboard Management (Project-scoped)
         async createDashboard(dashboardData: any, organizationId?: string, projectId?: string) {
    try {
      // Ensure we have a project_id when possible: if not supplied, try to infer from current user
      if (!dashboardData.project_id) {
        try {
          const whoamiResp = await fetchWithAuth(`${this.baseURL}/auth/whoami`);
          // fetchWithAuth returns a Response; parse JSON if available
          let whoami: any = null;
          if (whoamiResp && typeof whoamiResp.json === 'function') {
            try {
              whoami = await whoamiResp.json();
            } catch (err) {
              whoami = null;
            }
          }

          if (whoami?.authenticated && whoami.payload) {
            const uid = whoami.payload?.id || whoami.payload?.user_id || whoami.payload?.sub;
            if (uid) {
              // fetch user's projects and pick the first active project as default
              const projResResp = await fetchWithAuth(`${this.baseURL}/api/projects?user_id=${uid}`);
              let projRes: any = null;
              if (projResResp && typeof projResResp.json === 'function') {
                try {
                  projRes = await projResResp.json();
                } catch (err) {
                  projRes = null;
                }
              }

              if (projRes && Array.isArray(projRes.items ? projRes.items : projRes) && (projRes.items ? projRes.items.length : projRes.length) > 0) {
                const list = projRes.items ? projRes.items : projRes;
                dashboardData.project_id = list[0].id;
                // if organizationId not provided, try to set from project
                if (!organizationId && list[0].organization_id) organizationId = String(list[0].organization_id);
              }
            }
          }
        } catch (e) {
          // best-effort only; continue without project_id if we can't infer
          console.debug('Could not infer project_id for dashboard create', e);
        }
      }

      // Try project-scoped API first only if numeric IDs are provided
      let response;
      const canUseProject = organizationId && projectId && /^\d+$/.test(String(organizationId)) && /^\d+$/.test(String(projectId));
      if (canUseProject) {
        try {
          response = await fetchApi(`charts/api/organizations/${organizationId}/projects/${projectId}/dashboards`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dashboardData),
          });
          if (!response.ok) throw new Error(`Project-scoped API failed: ${response.status}`);
        } catch (projectError) {
          response = await fetchApi('charts/dashboards/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dashboardData),
          });
        }
      } else {
        response = await fetchApi('charts/dashboards/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dashboardData),
        });
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const body = await response.json();

      // Normalize response: API may return { id, dashboard } or { success, dashboard, id }
      const normalizedId = body?.id || body?.dashboard?.id || (body?.dashboard && body.dashboard.id) || null;
      return { raw: body, id: normalizedId };
    } catch (error) {
      console.error('Failed to create dashboard:', error);
      throw error;
    }
  }

  async getDashboard(dashboardId: string) {
    try {
      const response = await fetchApi(`charts/dashboards/${dashboardId}`, { method: 'GET' });
      
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
      const response = await fetchApi(`charts/dashboards/${dashboardId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
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
      const response = await fetchApi(`charts/dashboards/${dashboardId}`, { method: 'DELETE' });

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
      const response = await fetchApi('charts/dashboards/', { method: 'GET' });
      
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
      const response = await fetchApi(`charts/dashboards/${dashboardId}/widgets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      const response = await fetchApi(`charts/dashboards/${dashboardId}/widgets/${widgetId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
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
      const response = await fetchApi(`charts/dashboards/${dashboardId}/widgets/${widgetId}`, { method: 'DELETE' });

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
      const response = await fetchApi(`charts/dashboards/${dashboardId}/widgets`, { method: 'GET' });
      
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
      const response = await fetch(`${this.baseURL}/charts/dashboards/${dashboardId}/share`, this.withCreds({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(shareData),
      }));

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to share dashboard:', error);
      throw error;
    }
  }

  async publishDashboard(dashboardId: string, makePublic: boolean = true) {
    try {
      const response = await fetch(`${this.baseURL}/charts/dashboards/${dashboardId}/publish`, this.withCreds({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ make_public: makePublic })
      }));

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Failed to publish dashboard:', error);
      throw error;
    }
  }

  async createEmbed(dashboardId: string, options: any = {}) {
    try {
      const response = await fetch(`${this.baseURL}/charts/dashboards/${dashboardId}/embed`, this.withCreds({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options)
      }));

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Failed to create embed:', error);
      throw error;
    }
  }

  async listEmbeds(dashboardId: string) {
    try {
      const response = await fetch(`${this.baseURL}/charts/dashboards/${dashboardId}/embeds`, this.withCreds());
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Failed to list embeds:', error);
      throw error;
    }
  }

  async revokeEmbed(dashboardId: string, embedId: string) {
    try {
      const response = await fetch(`${this.baseURL}/charts/dashboards/${dashboardId}/embeds/${embedId}`, this.withCreds({ method: 'DELETE' }));
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Failed to revoke embed:', error);
      throw error;
    }
  }

  // Dashboard Export
  async exportDashboard(dashboardId: string, format: string = 'json') {
    try {
      const response = await fetch(`${this.baseURL}/charts/dashboards/${dashboardId}/export?format=${format}`, this.withCreds());
      
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
