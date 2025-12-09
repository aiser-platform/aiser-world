export class C2CJsonMetadata {
    database?: IDatabase;

    schema?: string;

    tables?: ExtendedTable[];

    datasource?: ChatDatasource;

    constructor(props: C2CJsonMetadata) {
        this.database = props.database;
        this.schema = props.schema;
        this.tables = props.tables;
    }
}

export interface IDatabase {
    id?: number;
    name?: string;
    backend?: string;
    type?: string;
    host?: string;
    port?: number;
    database?: string;
    username?: string;
    password?: string;
}

export interface IConversation {
    id: string | null;
    title: string;
    messages?: IChatMessage[];
    created_at?: string | Date;
    updated_at?: string | Date;
    json_metadata?: {
        database?: IDatabase;
        schema?: string;
        tables?: ExtendedTable[];
    };
}

export class IChatPrompt {
    prompt: string;

    conversation_id?: string;

    history?: IChatMessage[];

    json_metadata?: C2CJsonMetadata;

    datasource?: ChatDatasource;

    constructor(props: IChatPrompt) {
        this.prompt = props.prompt;
        this.conversation_id = props.conversation_id;
        this.history = props.history;
        this.json_metadata = props.json_metadata;
        this.datasource = props.datasource;
    }
}

export class IChatToChartResponse {
    content: string;

    database_id: number;

    schema: string;

    id?: number;

    constructor(props: IChatToChartResponse) {
        this.content = props.content;
        this.database_id = props.database_id;
        this.schema = props.schema;
        this.id = props.id;
    }
}

export class IMessageChartResponse {
    id: number;

    result: string;

    chart_type: string;

    form_data: string;

    title: string;

    constructor(props: IMessageChartResponse) {
        this.id = props.id;
        this.result = props.result;
        this.chart_type = props.chart_type;
        this.form_data = props.form_data;
        this.title = props.title;
    }
}

export class IChatFeedback {
    id: string;

    chat_message_id: string;

    comment?: string;

    reaction?: 'like' | 'dislike';

    created_at: Date;

    updated_at: Date;

    constructor(props: IChatFeedback) {
        this.id = props.id;
        this.chat_message_id = props.chat_message_id;
        this.comment = props.comment;
        this.reaction = props.reaction;
        this.created_at = props.created_at;
        this.updated_at = props.updated_at;
    }
}

export class IChatMessage {
    id: string;

    query?: string;

    answer?: string;

    feedback?: IChatFeedback;

    created_at?: Date;

    updated_at?: Date;

    chartData?: any; // For storing chart configuration data
    
    isStreaming?: boolean; // For streaming responses
    
    executionMetadata?: any; // For storing execution metadata, SQL queries, etc.

    // Additional properties for backend persistence
    content?: string; // Message content (query or answer)
    role?: 'user' | 'assistant' | 'system'; // Message role
    timestamp?: string; // ISO timestamp
    messageType?: string; // Type of message (text, chart, etc.)
    saved?: boolean; // Whether message is saved to backend
    metadata?: any; // Additional metadata

    // Enhanced AI properties
    chartConfig?: any; // Chart configuration for ECharts
    echartsConfig?: any; // ECharts configuration
    message?: string; // Convenience field for rendered message text
    narration?: string; // Executive summary / narration text
    dataSourceId?: string; // Data source ID
    analysis?: string; // AI analysis text
    insights?: any[]; // AI insights
    recommendations?: any[]; // AI recommendations
    sqlSuggestions?: string[]; // SQL suggestions
    followUpQuestions?: string[]; // Follow-up questions (3 questions)
    aiCapabilities?: string[]; // AI capabilities used
    userPatternAnalysis?: any; // User pattern analysis
    aiEngine?: string; // AI engine used
    success?: boolean; // Success status
    sqlQuery?: string; // SQL query for chart menu
    queryResult?: any; // Raw query result returned from backend
    progress?: { // Progress state from LangGraph orchestrator
        percentage: number;
        message: string;
        stage: string;
    };
    currentStage?: string; // Current workflow stage
    progressMessage?: string; // Human-readable progress message
    progressPercentage?: number; // Progress percentage (0-100)
    executiveSummary?: string; // Executive summary (camelCase for frontend)
    executive_summary?: string; // Executive summary (snake_case from backend)
    fileInfo?: { // File upload information
        name: string;
        size: number;
        type: string;
        dataSourceId?: string;
        rowCount?: number;
    };

    constructor(props: IChatMessage) {
        this.id = props.id;
        this.created_at = props.created_at;
        this.updated_at = props.updated_at;
        this.feedback = props.feedback;
        this.query = props.query;
        this.answer = props.answer;
        this.chartData = props.chartData;
        this.isStreaming = props.isStreaming;
        this.executionMetadata = props.executionMetadata;
        this.content = props.content;
        this.role = props.role;
        this.timestamp = props.timestamp;
        this.messageType = props.messageType;
        this.saved = props.saved;
        this.metadata = props.metadata;
        // Enhanced AI properties
        this.chartConfig = props.chartConfig;
        this.echartsConfig = props.echartsConfig;
        this.dataSourceId = props.dataSourceId;
        this.analysis = props.analysis;
        this.insights = props.insights;
        this.recommendations = props.recommendations;
        this.sqlSuggestions = props.sqlSuggestions;
        this.aiCapabilities = props.aiCapabilities;
        this.userPatternAnalysis = props.userPatternAnalysis;
        this.aiEngine = props.aiEngine;
        this.success = props.success;
        this.message = props.message;
        this.narration = props.narration;
        this.progress = props.progress;
        this.currentStage = props.currentStage;
        this.progressMessage = props.progressMessage;
        this.progressPercentage = props.progressPercentage;
        this.executiveSummary = props.executiveSummary || props.executive_summary;
        this.executive_summary = props.executive_summary || props.executiveSummary;
    }
}

export const tooltipTitleMap = {
    pk: 'Primary key',
    fk: 'Foreign key',
    index: 'Index',
} as const;

export type ColumnKeyTypeType = keyof typeof tooltipTitleMap;

interface Column {
    name: string;
    keys?: { type: ColumnKeyTypeType }[];
    type: string;
}

export interface ExtendedTable {
    id: string;
    name: string;
    partitions?: {
        partitionQuery: string;
        latest: object[];
    };
    metadata?: Record<string, string>;
    indexes?: object[];
    selectStar?: string;
    view?: string;
    isMetadataLoading: boolean;
    isExtraMetadataLoading: boolean;
    columns: Column[];
    expanded: boolean;
}

export interface Pagination {
    current_page: number;
    has_more: boolean;
    limit: number;
    offset: number;
    total: number;
    total_pages: number;
}

export interface ChartButton {
    key: string;
    label: string;
    onClick: () => void;
}

export enum DataType {
    FILE = 'file',
    DATABASE = 'database',
}

export interface FileData {
    uuid_filename: string;
    filename: string;
    content_type: string;
}

export interface DatabaseData {
    database_id: string;
    database_schema: string;
    tables: string[];
}

export interface ChatDatasource {
    data_type: DataType;
    file?: FileData;
    database?: DatabaseData;
}
