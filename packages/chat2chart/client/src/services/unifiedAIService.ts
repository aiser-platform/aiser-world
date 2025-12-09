import { fetchApi } from '@/utils/api';
import { getBackendUrl } from '@/utils/backendUrl';

// Unified AI Service Types
export interface UnifiedAIRequest {
    query: string;
    data_source_id?: string;
    business_context?: string;
    analysis_preferences?: Record<string, any>;
    tenant_id?: string;
    options?: Record<string, any>;
}

export interface UnifiedWorkflowRequest {
    workflow_type: 'data_ingestion' | 'schema_generation' | 'query_execution' | 'visualization' | 'insights_generation' | 'action_planning';
    data_source_id: string;
    query: string;
    options?: Record<string, any>;
}

export interface AgenticAnalysisRequest {
    query: string;
    data_source_id: string;
    analysis_depth: 'basic' | 'intermediate' | 'advanced' | 'expert';
    include_recommendations?: boolean;
    include_action_items?: boolean;
    business_context?: string;
}

export interface DataIngestionRequest {
    file: File;
    data_source_name?: string;
    data_type?: string;
    business_context?: string;
}

export interface DatabaseConnectionRequest {
    name: string;
    type: 'postgresql' | 'mysql' | 'snowflake' | 'bigquery';
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
    ssl_mode?: string;
}

export interface SchemaGenerationRequest {
    data_source_id: string;
    sample_data?: Record<string, any>[];
    business_context?: string;
    preferred_measures?: string[];
    preferred_dimensions?: string[];
}

export interface EChartsGenerationRequest {
    data: Record<string, any>[];
    chart_type: string;
    chart_config: Record<string, any>;
    styling_preferences?: Record<string, any>;
}

export interface BusinessInsightsRequest {
    data: Record<string, any>[];
    query_analysis: Record<string, any>;
    industry_context?: string;
}

export interface AIHealthResponse {
    success: boolean;
    service: string;
    status: string;
    version: string;
    capabilities: string[];
    ai_models: string[];
    integrations: string[];
}

export interface MigrationStatusResponse {
    success: boolean;
    migration_status: string;
    consolidated_services: string[];
    remaining_services: string[];
    next_steps: string[];
}

/**
 * Unified AI Analytics Service
 * 
 * This service consolidates all AI functionality and routes it through
 * our unified backend endpoints under /ai/*
 */
class UnifiedAIService {
    private baseURL: string;

    constructor() {
        this.baseURL = getBackendUrl();
    }

    // ===== Core AI Analytics Endpoints =====

    /**
     * Main entry point for intelligent AI-powered analytics
     */
    async intelligentQueryAnalysis(request: UnifiedAIRequest) {
        try {
            const response = await fetch(`${this.baseURL}/ai/chat/analyze`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(request),
            });

            if (!response.ok) {
                throw new Error(`Intelligent analysis failed: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Intelligent analysis error:', error);
            throw error;
        }
    }

    /**
     * Execute unified data analysis workflows
     */
    async executeUnifiedWorkflow(request: UnifiedWorkflowRequest) {
        try {
            const response = await fetch(`${this.baseURL}/ai/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(request),
            });

            if (!response.ok) {
                throw new Error(`Unified workflow failed: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Unified workflow error:', error);
            throw error;
        }
    }

    /**
     * Advanced agentic AI analysis with autonomous reasoning
     */
    async performAgenticAnalysis(request: AgenticAnalysisRequest) {
        try {
            const response = await fetch(`${this.baseURL}/ai/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(request),
            });

            if (!response.ok) {
                throw new Error(`Agentic analysis failed: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Agentic analysis error:', error);
            throw error;
        }
    }

    // ===== Agentic Analysis Endpoints =====

    /**
     * Execute advanced agentic analysis with autonomous reasoning
     * 
     * This method provides the most sophisticated AI analysis available,
     * including multi-step reasoning, autonomous action planning, and
     * comprehensive business insights generation.
     */
    async executeAgenticAnalysis(request: AgenticAnalysisRequest): Promise<any> {
        try {
            const response = await fetchApi('/ai/agentic-analysis', {
                method: 'POST',
                body: JSON.stringify(request)
            });

            if (!response.ok) {
                throw new Error(`Agentic analysis failed: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Agentic analysis error:', error);
            throw error;
        }
    }

    // ===== Data Ingestion & Connection =====

    /**
     * Unified data ingestion endpoint
     */
    async ingestDataFile(request: DataIngestionRequest) {
        try {
            const formData = new FormData();
            formData.append('file', request.file);
            if (request.data_source_name) formData.append('data_source_name', request.data_source_name);
            if (request.data_type) formData.append('data_type', request.data_type);
            if (request.business_context) formData.append('business_context', request.business_context);

            const response = await fetch(`${this.baseURL}/data/upload`, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error(`Data ingestion failed: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Data ingestion error:', error);
            throw error;
        }
    }

    /**
     * Connect to external database for analysis
     */
    async connectDatabase(request: DatabaseConnectionRequest) {
        try {
            const response = await fetch(`${this.baseURL}/data/connect-database`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(request),
            });

            if (!response.ok) {
                throw new Error(`Database connection failed: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Database connection error:', error);
            throw error;
        }
    }

    // ===== AI Schema Generation =====

    /**
     * Generate AI-powered data schema and cube configuration
     * 
     * NOTE: This endpoint is currently disabled. Auto-detection works fine.
     * Will be re-enabled with a better approach later.
     */
    async generateAISchema(request: SchemaGenerationRequest) {
        // DISABLED: Return fallback schema instead of AI generation
        // This avoids JSON serialization issues with date objects
        console.warn('⚠️ AI schema generation is disabled - using fallback schema');
        
        try {
            // Return a fallback response instead of calling the API
            return {
                success: true,
                yaml_schema: `# Fallback schema (AI generation disabled)\ndata_source_type: ${request.data_source_type || 'unknown'}`,
                cube_structure: {
                    cubes: [],
                    dimensions: [],
                    measures: []
                },
                data_source_id: request.data_source_id,
                ai_engine: "Fallback System (AI generation disabled)",
                deployment_status: "ready",
            };
            
            // OLD CODE - DISABLED
            /*
            const response = await fetch(`${this.baseURL}/ai/schema/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(request),
            });

            if (!response.ok) {
                throw new Error(`Schema generation failed: ${response.statusText}`);
            }

            return await response.json();
            */
        } catch (error) {
            console.error('Schema generation error:', error);
            // Return fallback on error
            return {
                success: true,
                yaml_schema: `# Fallback schema (AI generation disabled)\ndata_source_type: ${request.data_source_type || 'unknown'}`,
                cube_structure: {
                    cubes: [],
                    dimensions: [],
                    measures: []
                },
                data_source_id: request.data_source_id,
                ai_engine: "Fallback System (AI generation disabled)",
                deployment_status: "ready",
            };
        }
    }

    // ===== Natural Language Query Processing =====

    /**
     * Analyze natural language query using unified AI service
     */
    async analyzeNaturalLanguageQuery(request: UnifiedAIRequest) {
        try {
            const response = await fetch(`${this.baseURL}/ai/chat/analyze`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(request),
            });

            if (!response.ok) {
                throw new Error(`Query analysis failed: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Query analysis error:', error);
            throw error;
        }
    }

    /**
     * Execute AI-analyzed query and return results
     */
    async executeAIQuery(request: UnifiedAIRequest) {
        try {
            const response = await fetch(`${this.baseURL}/query/execute`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(request),
            });

            if (!response.ok) {
                throw new Error(`Query execution failed: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Query execution error:', error);
            throw error;
        }
    }

    // ===== ECharts Visualization =====

    /**
     * Generate ECharts visualization with AI-optimized configuration
     */
    async generateEChartsVisualization(request: EChartsGenerationRequest) {
        try {
            const response = await fetch(`${this.baseURL}/ai/echarts/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(request),
            });

            if (!response.ok) {
                throw new Error(`Chart generation failed: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Chart generation error:', error);
            throw error;
        }
    }

    // ===== Business Intelligence =====

    /**
     * Generate comprehensive business insights and recommendations
     */
    async generateBusinessInsights(request: BusinessInsightsRequest) {
        try {
            const response = await fetch(`${this.baseURL}/ai/insights/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(request),
            });

            if (!response.ok) {
                throw new Error(`Business insights failed: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Business insights error:', error);
            throw error;
        }
    }

    // ===== Function Calling & Tool Integration =====

    /**
     * Execute AI function calling for complex operations
     */
    async executeFunctionCalling(request: Record<string, any>) {
        try {
            const response = await fetch(`${this.baseURL}/ai/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(request),
            });

            if (!response.ok) {
                throw new Error(`Function calling failed: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Function calling error:', error);
            throw error;
        }
    }

    // ===== Analytics Dashboard =====

    /**
     * Get comprehensive analytics dashboard data
     */
    async getAnalyticsDashboard(dataSourceId?: string) {
        try {
            const url = dataSourceId 
                ? `${this.baseURL}/ai/health?data_source_id=${dataSourceId}`
                : `${this.baseURL}/ai/health`;

            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`Analytics dashboard failed: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Analytics dashboard error:', error);
            throw error;
        }
    }

    // ===== Health Check and Status =====

    /**
     * Health check for unified AI services
     */
    async healthCheck(): Promise<AIHealthResponse> {
        try {
            const response = await fetch(`${this.baseURL}/ai/health`);

            if (!response.ok) {
                throw new Error(`AI health check failed: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('AI health check error:', error);
            throw error;
        }
    }

    /**
     * Get status of migration from old AI services to unified service
     */
    async getMigrationStatus(): Promise<MigrationStatusResponse> {
        try {
            const response = await fetch(`${this.baseURL}/ai/health`);

            if (!response.ok) {
                throw new Error(`Migration status check failed: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Migration status error:', error);
            throw error;
        }
    }

    // ===== Convenience Methods =====

    /**
     * Complete chat-to-chart workflow using unified AI service
     */
    async chatToChart(
        query: string,
        dataSourceId: string,
        options?: Record<string, any>
    ) {
        try {
            // Step 1: Analyze query
            const analysis = await this.analyzeNaturalLanguageQuery({
                query,
                data_source_id: dataSourceId,
                options
            });

            // Step 2: Execute query
            const execution = await this.executeAIQuery({
                query,
                data_source_id: dataSourceId,
                options
            });

            // Step 3: Generate visualization
            const visualization = await this.generateEChartsVisualization({
                data: execution.data || [],
                chart_type: 'auto',
                chart_config: {},
                styling_preferences: options?.styling
            });

            // Step 4: Generate insights
            const insights = await this.generateBusinessInsights({
                data: execution.data || [],
                query_analysis: analysis,
                industry_context: options?.industry_context
            });

            return {
                success: true,
                analysis,
                execution,
                visualization,
                insights,
                workflow: 'unified_ai_chat_to_chart'
            };
        } catch (error) {
            console.error('Chat to chart workflow error:', error);
            throw error;
        }
    }

    /**
     * Complete data modeling workflow using unified AI service
     */
    async dataModelingWorkflow(
        dataSourceId: string,
        businessContext?: string,
        sampleData?: Record<string, any>[]
    ) {
        try {
            // Step 1: Generate AI schema with sample data if available
            const schema = await this.generateAISchema({
                data_source_id: dataSourceId,
                business_context: businessContext,
                sample_data: sampleData || []
            });

            // Step 2: Execute unified workflow
            const workflow = await this.executeUnifiedWorkflow({
                workflow_type: 'schema_generation',
                data_source_id: dataSourceId,
                query: 'Generate comprehensive data model',
                options: { 
                    business_context: businessContext,
                    sample_data: sampleData || []
                }
            });

            return {
                success: true,
                schema,
                workflow,
                workflow_type: 'ai_data_modeling',
                data_source_id: dataSourceId
            };
        } catch (error) {
            console.error('Data modeling workflow error:', error);
            throw error;
        }
    }
}

// Export singleton instance
export const unifiedAIService = new UnifiedAIService();
export default unifiedAIService;
