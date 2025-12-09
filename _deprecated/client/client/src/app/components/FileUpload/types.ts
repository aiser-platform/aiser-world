// Legacy file upload interface (kept for compatibility)
export class IFileUpload {
    filename: string;
    content_type: string;
    storage_type: string;
    file_size: number;
    uuid_filename: string;

    constructor(
        filename: string,
        content_type: string,
        storage_type: string,
        file_size: number,
        uuid_filename: string
    ) {
        this.filename = filename;
        this.content_type = content_type;
        this.storage_type = storage_type;
        this.file_size = file_size;
        this.uuid_filename = uuid_filename;
    }
}

// New data source interface for enhanced backend
export interface IDataSource {
    id: string;
    name: string;
    type: 'file' | 'database';
    format?: string; // csv, xlsx, json, etc.
    dbType?: string; // postgresql, mysql, etc.
    size?: number;
    rowCount?: number;
    schema?: IDataSchema;
    preview?: any[];
    uploadedAt?: string;
    createdAt?: string;
    status?: string;
}

export interface IDataSchema {
    columns: IColumnSchema[];
    types: Record<string, string>;
    rowCount: number;
    inferredAt: string;
}

export interface IColumnSchema {
    name: string;
    type: 'string' | 'number' | 'integer' | 'date' | 'boolean';
    nullable: boolean;
    statistics?: {
        min?: number;
        max?: number;
        mean?: number;
        uniqueCount?: number;
        maxLength?: number;
        nullCount?: number;
    };
}

// Database connection interface
export interface IDatabaseConnection {
    type: 'postgresql' | 'mysql' | 'sqlserver' | 'snowflake' | 'bigquery' | 'redshift';
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
    name?: string;
    ssl?: boolean;
    schema?: string;
    // Database-specific fields
    projectId?: string; // BigQuery
    account?: string; // Snowflake
    region?: string; // Snowflake
}

// Query interface
export interface IDataQuery {
    filters?: IFilterConfig[];
    sort?: ISortConfig;
    offset?: number;
    limit?: number;
    measures?: string[];
    dimensions?: string[];
    timeDimensions?: ITimeDimension[];
}

export interface IFilterConfig {
    column: string;
    operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'greater_equal' | 'less_equal';
    value: any;
}

export interface ISortConfig {
    column: string;
    direction: 'asc' | 'desc';
}

export interface ITimeDimension {
    dimension: string;
    granularity: 'hour' | 'day' | 'week' | 'month' | 'year';
    dateRange: string;
}

// Chart generation interfaces
export interface IChartConfig {
    title?: { text: string };
    tooltip?: any;
    legend?: any;
    xAxis?: any;
    yAxis?: any;
    series?: any[];
    color?: string[];
    backgroundColor?: string;
}

export interface IQueryAnalysis {
    originalQuery: string;
    queryType: string[];
    businessContext: { type: string };
    timeContext: { range: string; granularity: string };
    entities: string[];
    intent: string;
    complexity: number;
    urgency: string;
    enhancedByLlm?: boolean;
}
