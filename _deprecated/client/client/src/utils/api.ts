/**
 * API Service Utilities
 * Centralized API calls for the enhanced backend
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
const AUTH_BASE_URL = process.env.NEXT_PUBLIC_AUTH_URL || 'http://localhost:5000';

export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

// Auth API utility function
export const fetchAuthApi = async (endpoint: string, options: RequestInit = {}) => {
    const url = `${AUTH_BASE_URL}/${endpoint}`;
    const response = await fetch(url, {
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
        ...options,
    });
    return response;
};

class ApiService {
    private baseUrl: string;

    constructor(baseUrl: string = API_BASE_URL) {
        this.baseUrl = baseUrl;
    }

    private async request<T>(
        endpoint: string,
        options: RequestInit = {}
    ): Promise<ApiResponse<T>> {
        try {
            const url = `${this.baseUrl}${endpoint}`;
            const response = await fetch(url, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers,
                },
                ...options,
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || `HTTP error! status: ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error(`API request failed: ${endpoint}`, error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            };
        }
    }

    // Data Source APIs
    async uploadFile(formData: FormData): Promise<ApiResponse> {
        return this.request('/data/upload', {
            method: 'POST',
            body: formData,
            headers: {}, // Let browser set Content-Type for FormData
        });
    }

    async connectDatabase(config: any): Promise<ApiResponse> {
        return this.request('/data/connect-database', {
            method: 'POST',
            body: JSON.stringify(config),
        });
    }

    async getDataSources(): Promise<ApiResponse> {
        return this.request('/data/sources');
    }

    async getDataSource(id: string): Promise<ApiResponse> {
        return this.request(`/data/sources/${id}`);
    }

    async queryDataSource(id: string, query: any): Promise<ApiResponse> {
        return this.request(`/data/sources/${id}/query`, {
            method: 'POST',
            body: JSON.stringify(query),
        });
    }

    async deleteDataSource(id: string): Promise<ApiResponse> {
        return this.request(`/data/sources/${id}`, {
            method: 'DELETE',
        });
    }

    async getSupportedDatabases(): Promise<ApiResponse> {
        return this.request('/data/supported-databases');
    }

    // Chat to Chart APIs
    async chatToChart(dataSourceId: string, query: string): Promise<ApiResponse> {
        return this.request('/data/chat-to-chart', {
            method: 'POST',
            body: JSON.stringify({
                data_source_id: dataSourceId,
                natural_language_query: query,
            }),
        });
    }

    // Chart Generation APIs
    async generateMCPChart(data: any[], queryAnalysis: any, options?: any): Promise<ApiResponse> {
        return this.request('/charts/mcp-chart', {
            method: 'POST',
            body: JSON.stringify({
                data,
                query_analysis: queryAnalysis,
                options,
            }),
        });
    }

    async generateChart(data: any[], query: string, queryAnalysis?: any, options?: any): Promise<ApiResponse> {
        return this.request('/charts/generate', {
            method: 'POST',
            body: JSON.stringify({
                data,
                natural_language_query: query,
                query_analysis: queryAnalysis,
                options,
            }),
        });
    }

    async getChartRecommendations(data: any[], queryAnalysis?: any): Promise<ApiResponse> {
        return this.request('/charts/recommendations', {
            method: 'POST',
            body: JSON.stringify({
                data,
                query_analysis: queryAnalysis,
            }),
        });
    }

    async getSupportedChartTypes(): Promise<ApiResponse> {
        return this.request('/charts/types');
    }

    // AI Services APIs
    async analyzeQuery(query: string, context?: any): Promise<ApiResponse> {
        return this.request('/ai/analyze-query', {
            method: 'POST',
            body: JSON.stringify({
                query,
                context,
            }),
        });
    }

    async getChartRecommendationsAI(dataAnalysis: any, queryAnalysis: any): Promise<ApiResponse> {
        return this.request('/ai/chart-recommendations', {
            method: 'POST',
            body: JSON.stringify({
                data_analysis: dataAnalysis,
                query_analysis: queryAnalysis,
            }),
        });
    }

    async generateBusinessInsights(data: any[], queryAnalysis: any): Promise<ApiResponse> {
        return this.request('/ai/business-insights', {
            method: 'POST',
            body: JSON.stringify({
                data,
                query_analysis: queryAnalysis,
            }),
        });
    }

    async getModelStatus(): Promise<ApiResponse> {
        return this.request('/ai/model-status');
    }

    // Health Check APIs
    async healthCheck(): Promise<ApiResponse> {
        return this.request('/health');
    }

    async dataHealthCheck(): Promise<ApiResponse> {
        return this.request('/data/health');
    }

    async aiHealthCheck(): Promise<ApiResponse> {
        return this.request('/ai/health');
    }
}

// Export singleton instance
export const apiService = new ApiService();

// Export individual API functions for convenience
export const {
    uploadFile,
    connectDatabase,
    getDataSources,
    getDataSource,
    queryDataSource,
    deleteDataSource,
    getSupportedDatabases,
    chatToChart,
    generateMCPChart,
    generateChart,
    getChartRecommendations,
    getSupportedChartTypes,
    analyzeQuery,
    getChartRecommendationsAI,
    generateBusinessInsights,
    getModelStatus,
    healthCheck,
    dataHealthCheck,
    aiHealthCheck,
} = apiService;

export default apiService;