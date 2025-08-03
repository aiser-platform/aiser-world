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
}

export interface IConversation {
    id: string | null;
    title: string;
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

    constructor(props: IChatMessage) {
        this.id = props.id;
        this.created_at = props.created_at;
        this.updated_at = props.updated_at;
        this.feedback = props.feedback;
        this.query = props.query;
        this.answer = props.answer;
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
