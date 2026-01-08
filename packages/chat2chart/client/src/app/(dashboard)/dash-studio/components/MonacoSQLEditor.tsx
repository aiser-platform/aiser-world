'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  Layout, 
  Button, 
  Space, 
  Typography, 
  Select, 
  Table, 
  Tag, 
  Tabs, 
  Input, 
  Tooltip, 
  Progress, 
  Dropdown, 
  Menu, 
  message,
  Card,
  Collapse,
  Badge,
  Divider,
  Alert,
  Modal,
  Form,
  Tree,
  Spin,
  Switch,
  Grid
} from 'antd';
import MemoryOptimizedEditor from '@/app/components/MemoryOptimizedEditor';
import ErrorBoundary from '@/app/components/ErrorBoundary';
import LoadingStates, { QueryLoading } from '@/app/components/LoadingStates';
import { 
  PlayCircleOutlined, 
  QuestionCircleOutlined,
  DatabaseOutlined, 
  FieldBinaryOutlined,
  ReloadOutlined,
  CloseOutlined,
  PlusOutlined,
  SaveOutlined,
  CopyOutlined,
  MoreOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  EditOutlined,
  DeleteOutlined,
  ClockCircleOutlined,
  DownloadOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  ExpandOutlined,
  ExperimentOutlined,
  EyeOutlined,
  LinkOutlined,
  CloudOutlined,
  ApiOutlined,
  FileOutlined,
  FileTextOutlined,
  SettingOutlined,
  BulbOutlined,
  RocketOutlined,
  BarChartOutlined,
  SyncOutlined,
  ThunderboltOutlined,
  FolderOutlined,
  CodeOutlined
} from '@ant-design/icons';
import { enhancedDataService } from '@/services/enhancedDataService';
import { useDataSources, DataSource as ContextDataSource, SchemaInfo as ContextSchemaInfo } from '@/context/DataSourceContext';
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch';
import ChartWidget from './ChartWidget';
import UniversalDataSourceModal from '@/app/components/UniversalDataSourceModal/UniversalDataSourceModal';
import EnhancedDataPanel from '@/app/(dashboard)/chat/components/DataPanel/EnhancedDataPanel';
import AiserAIIcon from '@/app/components/AiserAIIcon/AiserAIIcon';
import AnimatedAIAvatar from '@/app/(dashboard)/chat/components/ChatPanel/AnimatedAIAvatar';
import '@/app/(dashboard)/chat/components/ChatPanel/styles.css'; // Import animation CSS


const { Sider, Content } = Layout;
const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;
const { Panel } = Collapse;

// Function to suggest chart types based on query results
const suggestChartTypes = (results: any[]) => {
  if (!results || results.length === 0) return [];
  
  const firstRow = results[0];
  const columns = Object.keys(firstRow);
  const numericColumns = columns.filter(col => 
    typeof firstRow[col] === 'number' || 
    !isNaN(Number(firstRow[col]))
  );
  const textColumns = columns.filter(col => 
    typeof firstRow[col] === 'string' && 
    isNaN(Number(firstRow[col]))
  );
  
  const suggestions = [];
  
  if (numericColumns.length >= 2 && textColumns.length >= 1) {
    suggestions.push({ icon: '📊', name: 'Bar Chart' });
    suggestions.push({ icon: '📈', name: 'Line Chart' });
  }
  
  if (numericColumns.length >= 1 && textColumns.length >= 1) {
    suggestions.push({ icon: '🥧', name: 'Pie Chart' });
    suggestions.push({ icon: '📊', name: 'Column Chart' });
  }
  
  if (numericColumns.length >= 2) {
    suggestions.push({ icon: '🔍', name: 'Scatter Plot' });
    suggestions.push({ icon: '📊', name: 'Area Chart' });
  }
  
  if (results.length > 10) {
    suggestions.push({ icon: '📊', name: 'Histogram' });
  }
  
  return suggestions.length > 0 ? suggestions : [
    { icon: '📊', name: 'Bar Chart' },
    { icon: '📈', name: 'Line Chart' },
    { icon: '🥧', name: 'Pie Chart' }
  ];
};

interface MonacoSQLEditorProps {
  isDarkMode?: boolean;
  onQueryResult?: (result: any) => void;
  onChartCreate?: (chartData: any) => void;
  selectedDataSource?: string;
  onDataSourceChange?: (dataSourceId: string) => void;
}

interface DataSource {
  id: string;
  name: string;
  type: 'file' | 'database' | 'warehouse' | 'api' | 'cube';
  status: 'connected' | 'disconnected' | 'error';
  config: Record<string, any>;
  metadata?: Record<string, any>;
  connection_info?: any;
  lastUsed?: string;
  rowCount?: number;
  columns?: string[];
  size?: string;
  description?: string;
  businessContext?: string;
  db_type?: string;
  schema?: string;
}

interface SchemaInfo {
  database: string;
  schema: string;
  tables: TableInfo[];
  lastRefreshed: string;
}

interface TableInfo {
  name: string;
  fields: FieldInfo[];
  rowCount?: number;
  size?: string;
  description?: string;
  lastModified?: string;
  schema?: string; // optional schema name when provided by backend
}

interface FieldInfo {
  name: string;
  type: string;
  description?: string;
  nullable?: boolean;
  primaryKey?: boolean;
  foreignKey?: boolean;
  sampleValues?: any[];
}

type QueryTab = {
  key: string;
  title: string;
  sql: string;
  python?: string;
  language?: QueryLanguage;
};

type QueryLanguage = 'sql' | 'python';

const resolveLanguage = (language?: string | null): QueryLanguage =>
  language === 'python' ? 'python' : 'sql';

const DEFAULT_SQL_SNIPPET = 'SELECT * FROM sales_data LIMIT 100;';
const ROW_LIMIT_PRESETS = [
  { value: '100', label: '100' },
  { value: '500', label: '500' },
  { value: '1000', label: '1,000' },
  { value: '5000', label: '5,000' },
  { value: '10000', label: '10,000' },
  { value: 'all', label: 'All' }
];
const MIN_EDITOR_HEIGHT = 120;
const DEFAULT_EDITOR_HEIGHT = 260;
const computeMaxEditorHeight = () => {
  if (typeof window === 'undefined') return 1600;
  return Math.max(500, window.innerHeight - 220);
};
const buildPythonTemplate = (baseSql: string, dataSourceName?: string) => `# Python code to query data source
import pandas as pd

# Connect to data source: ${dataSourceName || 'selected source'}
# Example query:
df = pd.read_sql(\"\"\"
${baseSql}
\"\"\", connection)
print(df.head())`;

const MonacoSQLEditor: React.FC<MonacoSQLEditorProps> = ({ 
  isDarkMode = false, 
  onQueryResult, 
  onChartCreate, 
  selectedDataSource: propSelectedDataSource,
  onDataSourceChange 
}) => {
  // Authenticated fetch hook
  const authenticatedFetch = useAuthenticatedFetch();
  
  // DataSourceContext integration
  const {
    selectedDataSourceId,
    dataSourceSchemas,
    getSelectedDataSource,
    refreshDataSources,
  } = useDataSources();

  // Derive selectedDataSource from context
  const contextDataSource = selectedDataSourceId ? getSelectedDataSource() : null;
  const selectedDataSource: DataSource | null = contextDataSource ? {
    id: contextDataSource.id,
    name: contextDataSource.name,
    type: contextDataSource.type,
    status: contextDataSource.connection_status === 'connected' ? 'connected' : 
            contextDataSource.connection_status === 'failed' ? 'error' : 'disconnected',
    config: contextDataSource.connection_config || {},
    metadata: contextDataSource.metadata || {},
    connection_info: contextDataSource.connection_config,
    lastUsed: contextDataSource.last_accessed,
    rowCount: contextDataSource.row_count,
    columns: [],
    size: contextDataSource.size?.toString(),
    description: contextDataSource.description
  } : null;

  // Get schema from context
  const schema = selectedDataSourceId ? dataSourceSchemas.get(selectedDataSourceId) : null;

  const [sqlQuery, setSqlQuery] = useState(DEFAULT_SQL_SNIPPET);
  const [editorLanguage, setEditorLanguage] = useState<QueryLanguage>('sql');
  const [selectedSchema, setSelectedSchema] = useState('public');
  const [selectedTable, setSelectedTable] = useState('sales_data');
  const [isLoadingSchema, setIsLoadingSchema] = useState<boolean>(false);
  const [isExecuting, setExecuting] = useState(false);
  const [activeTab, setActiveTab] = useState('results');
  // Query tabs - support both SQL and Python
  const [queryTabs, setQueryTabs] = useState<QueryTab[]>([
    { key: 'q-1', title: 'Query 1', sql: DEFAULT_SQL_SNIPPET, python: buildPythonTemplate(DEFAULT_SQL_SNIPPET), language: 'sql' }
  ]);
  const [activeQueryKey, setActiveQueryKey] = useState<string>('q-1');
  const [previewChart, setPreviewChart] = useState<any>(null);
  const [openTableTabs, setOpenTableTabs] = useState<string[]>([]);
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [showTableSchema, setShowTableSchema] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const stored = window.localStorage.getItem('sidebarCollapsed');
        return stored === 'true';
      }
    } catch {
      // ignore
    }
    return false;
  });
  const [executionTime, setExecutionTime] = useState<number | null>(null);
  const [results, setResults] = useState<any[]>([]);
  const [executionStatus, setExecutionStatus] = useState<string>('');
  const [selectedEngine, setSelectedEngine] = useState<string>('auto');
  const [resolvedEngine, setResolvedEngine] = useState<string | null>(null);
  const [queryHistory, setQueryHistory] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const screens = Grid.useBreakpoint();
  const isDesktopLayout = screens.lg ?? false;
  const isStackedLayout = !isDesktopLayout;
  const effectiveSidebarCollapsed = isStackedLayout ? false : sidebarCollapsed;
 
  // Sync collapse state from other components via event
  useEffect(() => {
    const handler = (e: Event) => {
      try {
        const detail = (e as CustomEvent).detail;
        if (typeof detail?.collapsed === 'boolean') {
          setSidebarCollapsed(detail.collapsed);
          try {
            window.localStorage.setItem('sidebarCollapsed', detail.collapsed ? 'true' : 'false');
          } catch {}
        }
      } catch {}
    };
    window.addEventListener('sidebar-collapse-changed', handler as EventListener);
    return () => window.removeEventListener('sidebar-collapse-changed', handler as EventListener);
  }, []);
  const [isQueryValid, setIsQueryValid] = useState<boolean>(true);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const [isRefreshingSchema, setIsRefreshingSchema] = useState(false);
  const [showConnectDataModal, setShowConnectDataModal] = useState(false);
  const [hasCube, setHasCube] = useState(false);
  const [selectedView, setSelectedView] = useState<string>('');
  const [openViewTabs, setOpenViewTabs] = useState<string[]>([]);
  const [perfLoading, setPerfLoading] = useState(false);
  const [aiAssistantInput, setAiAssistantInput] = useState<string>('');
  const [aiGenerating, setAiGenerating] = useState<boolean>(false);
  const [perfPlan, setPerfPlan] = useState<any>(null);
  const [perfSuggestions, setPerfSuggestions] = useState<string[]>([]);
  const [editingTabKey, setEditingTabKey] = useState<string | null>(null);
  const [titleDraft, setTitleDraft] = useState<string>('');
  const [showSavedModal, setShowSavedModal] = useState(false);
  const [snapshots, setSnapshots] = useState<any[]>([]);
  const [permissionModalVisible, setPermissionModalVisible] = useState(false);
  const [permEmail, setPermEmail] = useState('');
  const [permLoading, setPermLoading] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [chartDesignerActiveKeys, setChartDesignerActiveKeys] = useState<string[]>([]);
  const [savedQueries, setSavedQueries] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [isSavingTabs, setIsSavingTabs] = useState(false);
  const [rowLimit, setRowLimit] = useState<string>('1000');
  const [controlRowLimit, setControlRowLimit] = useState<string>('1000');
  const [limitSource, setLimitSource] = useState<'control' | 'query'>('control');
  const [maxEditorHeight, setMaxEditorHeight] = useState<number>(computeMaxEditorHeight);
  const [editorHeight, setEditorHeight] = useState<number>(() => {
    if (typeof window === 'undefined') return DEFAULT_EDITOR_HEIGHT;
    const stored = Number(window.localStorage.getItem('qe_editor_height'));
    const initial = Number.isFinite(stored) ? stored : DEFAULT_EDITOR_HEIGHT;
    return Math.min(Math.max(initial, MIN_EDITOR_HEIGHT), computeMaxEditorHeight());
  });
  const editorResizeStateRef = useRef({
    isResizing: false,
    startY: 0,
    startHeight: editorHeight,
  });
  const clampEditorHeight = useCallback(
    (value: number) => Math.min(Math.max(value, MIN_EDITOR_HEIGHT), maxEditorHeight),
    [maxEditorHeight]
  );
  const rowLimitOptions = useMemo(() => {
    const opts = [...ROW_LIMIT_PRESETS];
    if (limitSource === 'query' && rowLimit && !opts.some(option => option.value === rowLimit)) {
      opts.push({ value: rowLimit, label: rowLimit });
    }
    return opts;
  }, [limitSource, rowLimit]);
  useEffect(() => {
    const handleWindowResize = () => {
      setMaxEditorHeight(computeMaxEditorHeight());
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', handleWindowResize);
      return () => window.removeEventListener('resize', handleWindowResize);
    }
  }, []);
  useEffect(() => {
    if (!editorResizeStateRef.current.isResizing) {
      editorResizeStateRef.current.startHeight = editorHeight;
    }
    try {
      window.localStorage.setItem('qe_editor_height', String(editorHeight));
    } catch {
      // ignore storage failures
    }
  }, [editorHeight]);
  const normalizeTabs = (tabs: Array<Partial<QueryTab>>) =>
    tabs.map((tab, index) => {
      const sql = tab.sql ?? DEFAULT_SQL_SNIPPET;
      const language = resolveLanguage(tab.language);
      return {
        key: tab.key ?? `tab-${index}`,
        title: tab.title ?? `Query ${index + 1}`,
        sql,
        python: tab.python ?? buildPythonTemplate(sql, selectedDataSource?.name),
        language
      };
    });
  const getPythonTemplate = (tab?: Pick<QueryTab, 'sql' | 'python'> | null, fallbackDataSourceName?: string | null) =>
    tab?.python && tab.python.trim().length > 0
      ? tab.python
      : buildPythonTemplate(tab?.sql ?? DEFAULT_SQL_SNIPPET, fallbackDataSourceName || selectedDataSource?.name);
  const stripSqlComments = (query: string) =>
    query
      .replace(/--.*$/gm, '')
      .replace(/\/\*[\s\S]*?\*\//g, '');
  const extractLimitFromQuery = (query: string): number | null => {
    const normalized = stripSqlComments(query);
    const match = normalized.match(/\blimit\s+(\d+)/i);
    if (!match) return null;
    const parsed = parseInt(match[1], 10);
    return Number.isFinite(parsed) ? parsed : null;
  };
  const appendLimitClause = (query: string, limit: number) => {
    if (!limit || Number.isNaN(limit)) return query;
    const trimmed = query.trim().replace(/;+\s*$/, '');
    return `${trimmed}\nLIMIT ${limit};`;
  };
  
  // Listen for query template loading events from parent page
  useEffect(() => {
    const handleTemplateLoad = (event: CustomEvent) => {
      const templateSql = event.detail?.sql;
      if (!templateSql) {
        return;
      }
      // Use state directly instead of refs
      const tabs = queryTabs;
      const targetKey = activeQueryKey || tabs[0]?.key;
      const pythonTemplate = buildPythonTemplate(templateSql, selectedDataSource?.name);
      if (targetKey) {
        setQueryTabs(prev => prev.map(t => 
          t.key === targetKey ? { ...t, sql: templateSql, python: pythonTemplate } : t
        ));
      }
      const lang = editorLanguage || 'sql';
      const resolvedLanguage = resolveLanguage(lang);
      setEditorLanguage(resolvedLanguage);
      setSqlQuery(resolvedLanguage === 'python' ? pythonTemplate : templateSql);
      message.success('Query template loaded!');
    };

    window.addEventListener('load-query-template', handleTemplateLoad as EventListener);
    return () => {
      window.removeEventListener('load-query-template', handleTemplateLoad as EventListener);
    };
  }, [queryTabs, activeQueryKey, editorLanguage, selectedDataSource?.name]);

  useEffect(() => {
    if (editorLanguage !== 'sql') {
      setLimitSource('control');
      setRowLimit(controlRowLimit);
      return;
    }
    const detectedLimit = extractLimitFromQuery(sqlQuery);
    if (detectedLimit !== null) {
      setLimitSource('query');
      setRowLimit(detectedLimit.toString());
    } else {
      setLimitSource('control');
      setRowLimit(controlRowLimit);
    }
  }, [sqlQuery, editorLanguage, controlRowLimit]);

  const handleRowLimitChange = (value: string) => {
    setControlRowLimit(value);
    setRowLimit(value);
    setLimitSource('control');
  };
  const handleEditorResizeMove = useCallback((event: MouseEvent) => {
    if (!editorResizeStateRef.current.isResizing) return;
    const delta = event.clientY - editorResizeStateRef.current.startY;
    const next = clampEditorHeight(editorResizeStateRef.current.startHeight + delta);
    setEditorHeight(next);
  }, [clampEditorHeight]);
  const stopEditorResize = useCallback(() => {
    if (!editorResizeStateRef.current.isResizing) return;
    editorResizeStateRef.current.isResizing = false;
    document.body.style.userSelect = '';
    window.removeEventListener('mousemove', handleEditorResizeMove);
    window.removeEventListener('mouseup', stopEditorResize);
  }, [handleEditorResizeMove]);
  const startEditorResize = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    editorResizeStateRef.current.isResizing = true;
    editorResizeStateRef.current.startY = event.clientY;
    editorResizeStateRef.current.startHeight = editorHeight;
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', handleEditorResizeMove);
    window.addEventListener('mouseup', stopEditorResize);
  }, [editorHeight, handleEditorResizeMove, stopEditorResize]);
  useEffect(() => {
    return () => {
      window.removeEventListener('mousemove', handleEditorResizeMove);
      window.removeEventListener('mouseup', stopEditorResize);
    };
  }, [handleEditorResizeMove, stopEditorResize]);
  


  // Enhanced data sources with real integration capabilities
  const enhancedDatabases = [
    { 
      value: 'duckdb', 
      label: 'DuckDB - Local Analytics',
      type: 'database',
      status: 'connected',
      description: 'Fast in-memory analytical database for local development',
      icon: <DatabaseOutlined />
    },
    { 
      value: 'postgresql', 
      label: 'PostgreSQL - Production DB',
      type: 'database',
      status: 'connected',
      description: 'Primary production database with ACID compliance',
      icon: <DatabaseOutlined />
    },
    { 
      value: 'snowflake', 
      label: 'Snowflake - Cloud Data',
      type: 'warehouse',
      status: 'connected',
      description: 'Cloud data warehouse for large-scale analytics',
      icon: <CloudOutlined />
    },
    { 
      value: 'bigquery', 
      label: 'BigQuery - Google Analytics',
      type: 'warehouse',
      status: 'connected',
      description: 'Google Cloud data warehouse with ML capabilities',
      icon: <CloudOutlined />
    },
    { 
      value: 'api_rest', 
      label: 'REST API - External Service',
      type: 'api',
      status: 'connected',
      description: 'External REST API for real-time data',
      icon: <ApiOutlined />
    },
    { 
      value: 'csv_files', 
      label: 'CSV Files - Local Data',
      type: 'file',
      status: 'connected',
      description: 'Local CSV files for data analysis',
      icon: <FileOutlined />
    }
  ];

  const enhancedSchemas = [
    { 
      value: 'public', 
      label: 'public',
      description: 'Public schema with core business data',
      tables: ['sales_data', 'user_analytics', 'product_catalog']
    },
    { 
      value: 'analytics', 
      label: 'analytics',
      description: 'Analytics and reporting data',
      tables: ['kpi_metrics', 'dashboard_data', 'performance_metrics']
    },
    { 
      value: 'staging', 
      label: 'staging',
      description: 'Staging data for testing and development',
      tables: ['test_data', 'dev_samples', 'qa_datasets']
    },
    { 
      value: 'warehouse', 
      label: 'warehouse',
      description: 'Data warehouse for historical analysis',
      tables: ['historical_sales', 'user_behavior', 'market_trends']
    }
  ];

  const enhancedTables = [
    { 
      name: 'sales_data', 
      fields: [
        { name: 'date', type: 'DATE', description: 'Sale Date', nullable: false, primaryKey: false },
        { name: 'product_id', type: 'INTEGER', description: 'Product ID', nullable: false, primaryKey: true },
        { name: 'product_name', type: 'VARCHAR(255)', description: 'Product Name', nullable: false },
        { name: 'category', type: 'VARCHAR(100)', description: 'Product Category', nullable: true },
        { name: 'amount', type: 'DECIMAL(10,2)', description: 'Sale Amount', nullable: false },
        { name: 'region', type: 'VARCHAR(100)', description: 'Sales Region', nullable: true },
        { name: 'customer_id', type: 'INTEGER', description: 'Customer ID', nullable: false, foreignKey: true }
      ],
      rowCount: 125000,
      size: '15.2 MB',
      description: 'Core sales transaction data with product and customer information',
      lastModified: '2024-01-15'
    },
    { 
      name: 'user_analytics', 
      fields: [
        { name: 'user_id', type: 'INTEGER', description: 'User ID', nullable: false, primaryKey: true },
        { name: 'session_id', type: 'VARCHAR(50)', description: 'Session ID', nullable: false },
        { name: 'session_duration', type: 'INTEGER', description: 'Session Duration (minutes)', nullable: true },
        { name: 'page_views', type: 'INTEGER', description: 'Page Views Count', nullable: true },
        { name: 'conversion', type: 'BOOLEAN', description: 'Conversion Status', nullable: false },
        { name: 'timestamp', type: 'TIMESTAMP', description: 'Event Timestamp', nullable: false },
        { name: 'device_type', type: 'VARCHAR(50)', description: 'Device Type', nullable: true }
      ],
      rowCount: 89000,
      size: '8.7 MB',
      description: 'User behavior and session analytics data',
      lastModified: '2024-01-15'
    },
    { 
      name: 'product_catalog', 
      fields: [
        { name: 'product_id', type: 'INTEGER', description: 'Product ID', nullable: false, primaryKey: true },
        { name: 'name', type: 'VARCHAR(255)', description: 'Product Name', nullable: false },
        { name: 'category', type: 'VARCHAR(100)', description: 'Product Category', nullable: false },
        { name: 'price', type: 'DECIMAL(10,2)', description: 'Product Price', nullable: false },
        { name: 'inventory', type: 'INTEGER', description: 'Inventory Count', nullable: false },
        { name: 'created_at', type: 'TIMESTAMP', description: 'Creation Date', nullable: false },
        { name: 'updated_at', type: 'TIMESTAMP', description: 'Last Update', nullable: false }
      ],
      rowCount: 1500,
      size: '2.1 MB',
      description: 'Product catalog with pricing and inventory information',
      lastModified: '2024-01-15'
    }
  ];

  // Load persisted tabs and active key
  useEffect(() => {
    (async () => {
      // try local first
      try {
        const raw = localStorage.getItem('qe_tabs');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed.tabs) && parsed.tabs.length) {
            const normalized = normalizeTabs(parsed.tabs);
            setQueryTabs(normalized);
            setActiveQueryKey(parsed.activeKey || normalized[0].key);
            const found = normalized.find((t: QueryTab) => t.key === (parsed.activeKey || normalized[0].key));
            if (found) {
              const foundLanguage = resolveLanguage(found.language);
              setEditorLanguage(foundLanguage);
              setSqlQuery(foundLanguage === 'python' ? getPythonTemplate(found, selectedDataSource?.name) : (found.sql ?? DEFAULT_SQL_SNIPPET));
            }
          }
        }
      } catch {}
      // then attempt backend
      try {
        const res = await authenticatedFetch(`/api/queries/tabs`);
        if (res.ok) {
          const j = await res.json();
          if (Array.isArray(j.tabs) && j.tabs.length) {
            const normalized = normalizeTabs(j.tabs);
            setQueryTabs(normalized);
            const active = j.active_key || normalized[0].key;
            setActiveQueryKey(active);
            const found = normalized.find((t: QueryTab) => t.key === active);
            if (found) {
              const foundLanguage = resolveLanguage(found.language);
              setEditorLanguage(foundLanguage);
              setSqlQuery(foundLanguage === 'python' ? getPythonTemplate(found, selectedDataSource?.name) : (found.sql ?? DEFAULT_SQL_SNIPPET));
            }
          }
        }
      } catch {}
    })();
  }, []);

  // Persist tabs on change
  useEffect(() => {
    try {
      localStorage.setItem('qe_tabs', JSON.stringify({ tabs: queryTabs, activeKey: activeQueryKey }));
    } catch {}
  }, [queryTabs, activeQueryKey]);

  // Ctrl+S save shortcut with backend persistence
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        try { localStorage.setItem('qe_tabs', JSON.stringify({ tabs: queryTabs, activeKey: activeQueryKey })); } catch {}
        (async () => {
          try {
            setIsSavingTabs(true);
            const res = await authenticatedFetch(`/api/queries/tabs`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ tabs: queryTabs, active_key: activeQueryKey })
            });
            if (!res.ok) throw new Error('Failed');
            message.success('Query tabs saved');
          } catch {
            message.error('Failed to save query tabs');
          } finally {
            setIsSavingTabs(false);
          }
        })();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [queryTabs, activeQueryKey]);

  // Schema is now loaded automatically by DataSourceContext when selectDataSource is called

  // Validate SQL against loaded schema (simple FROM table check)
  // NOTE: This is a best-effort validation. We allow queries to execute even if table not found in cached schema
  // because the backend will validate against the actual database schema.
  const validateQueryAgainstSchema = (sql: string) => {
    try {
      const q = (sql || '').toLowerCase();
      const m = q.match(/from\s+([a-z0-9_\.]+)/i);
      if (!m) {
        // No table referenced; allow queries
        setIsQueryValid(true);
        setValidationMessage(null);
        return true;
      }
      
      let tableName = m[1];
      let schemaName: string | null = null;
      
      // Handle schema.table format (e.g., "aiser_warehouse.customers")
      if (tableName.includes('.')) {
        const parts = tableName.split('.');
        schemaName = parts[0];
        tableName = parts[1];
      }
      
      // If file-based data source, supported table is 'data' (inline) or file table name
      const ds = selectedDataSource;
      if (ds && ds.type === 'file') {
        if (tableName === 'data' || tableName === (ds.name && ds.name.replace(/\.[^/.]+$/, '').toLowerCase())) {
          setIsQueryValid(true);
          setValidationMessage(null);
          return true;
        }
        // Warn but allow execution - backend will validate
        setIsQueryValid(true);
        setValidationMessage(`Note: Table '${tableName}' not found in cached schema. Query will be validated by backend.`);
        return true;
      }

      // Get schema from context
      const schemaTables = schema?.tables || [];
      const availableTables = schemaTables.map((t: any) => t.name?.toLowerCase() || '').filter(Boolean);
      const availableSchemas = schemaTables.map((t: any) => (t.schema || 'public')?.toLowerCase() || 'public').filter(Boolean);
      
      // Check if table exists (with or without schema prefix)
      const tableExists = availableTables.includes(tableName.toLowerCase());
      const schemaExists = schemaName ? availableSchemas.includes(schemaName.toLowerCase()) : true;
      
      if (tableExists && schemaExists) {
        setIsQueryValid(true);
        setValidationMessage(null);
        return true;
      }

      // For cube sources
      if (selectedDataSourceId && selectedDataSource?.type === 'cube') {
        const allCubeTables = schemaTables.map((t: any) => t.name?.toLowerCase() || '').filter(Boolean);
        if (allCubeTables.includes(tableName.toLowerCase())) {
          setIsQueryValid(true);
          setValidationMessage(null);
          return true;
        }
        // Warn but allow - backend will validate
        setIsQueryValid(true);
        setValidationMessage(`Note: Cube table '${tableName}' not found in cached schema. Query will be validated by backend.`);
        return true;
      }

      // Default: Warn but ALLOW execution - backend will do actual validation
      // This is important because:
      // 1. Schema cache might be stale
      // 2. Tables might exist but not be in cache yet
      // 3. Backend has the authoritative schema
      setIsQueryValid(true);
      setValidationMessage(
        schemaName 
          ? `Note: Table '${schemaName}.${tableName}' not found in cached schema. Query will be validated by backend.`
          : `Note: Table '${tableName}' not found in cached schema. Query will be validated by backend.`
      );
      return true;
    } catch (e) {
      // On any error, allow the query - backend will validate
      setIsQueryValid(true);
      setValidationMessage(null);
      return true;
    }
  };

  // Re-validate when SQL or schema changes
  useEffect(() => {
    validateQueryAgainstSchema(sqlQuery);
  }, [sqlQuery, schema, selectedDataSource, selectedDataSourceId]);




  const refreshSchema = async () => {
    setIsRefreshingSchema(true);
    try {
      // Simulate schema refresh
      await new Promise(resolve => setTimeout(resolve, 1000));
      message.success('Schema refreshed successfully');
    } catch (error) {
      message.error('Failed to refresh schema');
    } finally {
      setIsRefreshingSchema(false);
    }
  };

  const handleHistoryItemClick = (sql: string) => {
    setSqlQuery(sql);
  };

  // Export functions
  const exportToCSV = (data: any[]) => {
    if (data.length === 0) return;
    
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => `"${row[header]}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `query_results_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToJSON = (data: any[]) => {
    if (data.length === 0) return;
    
    const jsonContent = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `query_results_${new Date().toISOString().slice(0, 10)}.json`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCreateChart = (chartType: string, data: any[], existingConfig?: any) => {
    try {
    if (!data || data.length === 0) {
      message.warning('No data available to create chart');
      return;
    }

      // CRITICAL: Intelligently analyze data structure
    const firstRow = data[0];
      if (!firstRow || typeof firstRow !== 'object') {
        message.error('Invalid data format. Expected array of objects.');
        return;
      }

    const columns: string[] = Object.keys(firstRow);
      if (columns.length === 0) {
        message.error('No columns found in query results.');
        return;
      }

      // Enhanced column detection - handle various data types
      const numericColumns: string[] = [];
      const textColumns: string[] = [];
      const dateColumns: string[] = [];

      columns.forEach((col: string) => {
        const sampleValue = firstRow[col];
        if (sampleValue === null || sampleValue === undefined) {
          return; // Skip null/undefined columns
        }
        
        // Check if numeric (including strings that can be parsed as numbers)
        if (typeof sampleValue === 'number') {
          numericColumns.push(col);
        } else if (typeof sampleValue === 'string') {
          // Try to parse as number
          const numValue = Number(sampleValue);
          if (!isNaN(numValue) && sampleValue.trim() !== '') {
            numericColumns.push(col);
          } else {
            // Check if date-like
            const dateValue = new Date(sampleValue);
            if (!isNaN(dateValue.getTime()) && sampleValue.length > 5) {
              dateColumns.push(col);
            } else {
              textColumns.push(col);
            }
          }
        } else if (sampleValue instanceof Date) {
          dateColumns.push(col);
        }
      });

      // Determine best columns for chart - use config if available, otherwise auto-detect
      const xColumn = existingConfig?.xAxisField || previewChart?.config?.xAxisField || textColumns[0] || dateColumns[0] || columns[0];
      const yColumn = existingConfig?.yAxisField || previewChart?.config?.yAxisField || numericColumns[0] || columns.find((col: string) => !textColumns.includes(col) && !dateColumns.includes(col)) || columns[1] || columns[0];
      const yColumn2 = numericColumns[1] || null;

      // Handle axis swap for chart generation - define effective columns
      let effectiveXColumn = xColumn;
      let effectiveYColumn = yColumn;
      if (existingConfig?.swapAxes && xColumn && yColumn) {
        // When swapped, use yColumn for x-axis and xColumn for y-axis
        effectiveXColumn = yColumn;
        effectiveYColumn = xColumn;
      }

      // Apply data transformations: filter, sort, aggregation
      let processedData = Array.isArray(data) ? [...data] : [];
      
      // Apply filter if specified
      if (existingConfig?.filter && existingConfig.filter.trim() !== '') {
        try {
          const filterExpr = existingConfig.filter.trim();
          // Simple filter evaluation (basic support for >, <, >=, <=, ==, !=)
          processedData = processedData.filter((row: any) => {
            try {
              // Try to evaluate simple expressions like "value > 100"
              const match = filterExpr.match(/(\w+)\s*(>|<|>=|<=|==|!=)\s*(.+)/);
              if (match) {
                const [, field, op, value] = match;
                const fieldVal = row[field.trim()];
                const compareVal = isNaN(Number(value)) ? value.trim().replace(/['"]/g, '') : Number(value);
                const numFieldVal = typeof fieldVal === 'number' ? fieldVal : Number(fieldVal);
                const numCompareVal = typeof compareVal === 'number' ? compareVal : Number(compareVal);
                
                switch (op) {
                  case '>': return numFieldVal > numCompareVal;
                  case '<': return numFieldVal < numCompareVal;
                  case '>=': return numFieldVal >= numCompareVal;
                  case '<=': return numFieldVal <= numCompareVal;
                  case '==': return numFieldVal === numCompareVal || String(fieldVal) === String(compareVal);
                  case '!=': return numFieldVal !== numCompareVal && String(fieldVal) !== String(compareVal);
                  default: return true;
                }
              }
              return true;
            } catch {
              return true;
            }
          });
        } catch (e) {
          console.warn('Filter evaluation failed:', e);
        }
      }
      
      // Apply sort if specified
      if (existingConfig?.sortOrder && existingConfig.sortOrder !== 'none' && yColumn) {
        processedData.sort((a: any, b: any) => {
          const aVal = typeof a[yColumn] === 'number' ? a[yColumn] : Number(a[yColumn]) || 0;
          const bVal = typeof b[yColumn] === 'number' ? b[yColumn] : Number(b[yColumn]) || 0;
          return existingConfig.sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
        });
      }
      
      // Apply aggregation if specified
      if (existingConfig?.aggregation && existingConfig.aggregation !== 'none' && yColumn && xColumn) {
        const grouped: Record<string, number[]> = {};
        processedData.forEach((row: any) => {
          const key = String(row[xColumn] || 'Unknown');
          const val = typeof row[yColumn] === 'number' ? row[yColumn] : (Number(row[yColumn]) || 0);
          if (!grouped[key]) grouped[key] = [];
          grouped[key].push(val);
        });
        
        processedData = Object.entries(grouped).map(([key, values]) => {
          let aggregatedValue = 0;
          switch (existingConfig.aggregation) {
            case 'sum':
              aggregatedValue = values.reduce((a, b) => a + b, 0);
              break;
            case 'avg':
              aggregatedValue = values.reduce((a, b) => a + b, 0) / values.length;
              break;
            case 'count':
              aggregatedValue = values.length;
              break;
            case 'min':
              aggregatedValue = Math.min(...values);
              break;
            case 'max':
              aggregatedValue = Math.max(...values);
              break;
          }
          return { [xColumn]: key, [yColumn]: aggregatedValue };
        });
      }
      
      // Use processed data
      const actualData = processedData;

      // Intelligent chart type selection and data mapping
      const normalizedChartType = chartType.toLowerCase().replace(/\s+/g, ' ').trim();
    let chartData: any = {};
    let chartConfig: any = {};

      switch (normalizedChartType) {
      case 'bar chart':
      case 'column chart':
        case 'bar':
        case 'column':
          if (!effectiveXColumn || !effectiveYColumn) {
            message.error('Bar chart requires at least one text/category column and one numeric column.');
            return;
          }
        chartData = {
            xAxis: actualData.map(row => {
              const val = row[effectiveXColumn];
              return val !== null && val !== undefined ? String(val) : '';
            }),
            yAxis: actualData.map(row => {
              const val = row[effectiveYColumn];
              return typeof val === 'number' ? val : (Number(val) || 0);
            })
        };
        chartConfig = {
          chartType: 'bar',
            title: { text: `${effectiveXColumn} vs ${effectiveYColumn}` },
          showTitle: true,
          showLegend: true,
          showTooltip: true,
          showGrid: true
        };
        break;

      case 'line chart':
        case 'line':
          if (!effectiveXColumn || !effectiveYColumn) {
            message.error('Line chart requires at least one text/category column and one numeric column.');
            return;
          }
        chartData = {
            xAxis: actualData.map(row => {
              const val = row[effectiveXColumn];
              return val !== null && val !== undefined ? String(val) : '';
            }),
            yAxis: actualData.map(row => {
              const val = row[effectiveYColumn];
              return typeof val === 'number' ? val : (Number(val) || 0);
            })
        };
        chartConfig = {
          chartType: 'line',
            title: { text: `${effectiveXColumn} Trend` },
          showTitle: true,
          showLegend: true,
          showTooltip: true,
          showGrid: true
        };
        break;

      case 'pie chart':
        case 'pie':
          if (!effectiveXColumn || !effectiveYColumn) {
            message.error('Pie chart requires at least one text/category column and one numeric column.');
            return;
          }
        chartData = {
            series: actualData
              .filter(row => {
                const val = row[effectiveYColumn];
                return val !== null && val !== undefined && (typeof val === 'number' || !isNaN(Number(val)));
              })
              .map(row => ({
                name: String(row[effectiveXColumn] || 'Unknown'),
                value: typeof row[effectiveYColumn] === 'number' ? row[effectiveYColumn] : (Number(row[effectiveYColumn]) || 0)
          }))
        };
        chartConfig = {
          chartType: 'pie',
            title: { text: `${effectiveXColumn} Distribution` },
          showTitle: true,
          showLegend: true,
          showTooltip: true
        };
        break;

      case 'scatter plot':
        case 'scatter':
          if (numericColumns.length < 2) {
            message.error('Scatter plot requires at least two numeric columns.');
            return;
          }
          // For scatter plots, use effective columns if available, otherwise use first two numeric columns
          const scatterX = effectiveXColumn && numericColumns.includes(effectiveXColumn) ? effectiveXColumn : numericColumns[0];
          const scatterY = effectiveYColumn && numericColumns.includes(effectiveYColumn) ? effectiveYColumn : numericColumns[1];
        chartData = {
            series: actualData
              .filter(row => {
                const val1 = row[scatterX];
                const val2 = row[scatterY];
                return val1 !== null && val1 !== undefined && val2 !== null && val2 !== undefined;
              })
              .map(row => ({
            value: [
                  typeof row[scatterX] === 'number' ? row[scatterX] : (Number(row[scatterX]) || 0),
                  typeof row[scatterY] === 'number' ? row[scatterY] : (Number(row[scatterY]) || 0)
            ],
                name: `${row[scatterX]}, ${row[scatterY]}`
          }))
        };
        chartConfig = {
          chartType: 'scatter',
            title: { text: `${scatterX} vs ${scatterY}` },
          showTitle: true,
          showLegend: true,
          showTooltip: true,
          showGrid: true
        };
        break;

      default:
          // Fallback: try to create a bar chart with available columns
          if (xColumn && yColumn) {
        chartData = {
              xAxis: actualData.map(row => String(row[xColumn] || '')),
              yAxis: actualData.map(row => {
                const val = row[yColumn];
                return typeof val === 'number' ? val : (Number(val) || 0);
              })
        };
        chartConfig = {
          chartType: 'bar',
              title: { text: `${xColumn} vs ${yColumn}` },
          showTitle: true,
          showLegend: true,
          showTooltip: true,
          showGrid: true
        };
          } else {
            message.error('Unable to determine suitable columns for chart. Please ensure your query returns at least one text and one numeric column.');
            return;
          }
      }

      // Validate chart data before creating widget
      if (!chartData || Object.keys(chartData).length === 0) {
        message.error('Failed to generate chart data. Please check your query results.');
        return;
      }

      // Create chart widget data with proper structure
      // CRITICAL: Normalize config.title to be a string (not an object) for ChartWidget compatibility
      // Merge with existing config to preserve user settings
      // Preserve existing title if user has edited it
      const existingTitle = previewChart?.title || previewChart?.name || existingConfig?.title;
      const defaultTitle = typeof chartConfig.title === 'object' && chartConfig.title?.text 
        ? chartConfig.title.text 
        : (typeof chartConfig.title === 'string' ? chartConfig.title : 'Untitled Chart');
      const finalTitle = existingTitle && existingTitle !== 'Untitled Chart' && existingTitle !== defaultTitle
        ? existingTitle
        : defaultTitle;
      
      // Validate axis fields against available columns
      const validXField = existingConfig?.xAxisField && columns.includes(existingConfig.xAxisField)
        ? existingConfig.xAxisField
        : (textColumns[0] || dateColumns[0] || columns[0]);
      const validYField = existingConfig?.yAxisField && columns.includes(existingConfig.yAxisField)
        ? existingConfig.yAxisField
        : (numericColumns[0] || columns.find((col: string) => !textColumns.includes(col) && !dateColumns.includes(col)) || columns[1] || columns[0]);
      
      const normalizedConfig = {
        ...existingConfig,
        ...chartConfig,
        title: finalTitle,
        chartType: chartConfig.chartType,
        // Preserve axis fields if valid, otherwise use defaults
        xAxisField: validXField,
        yAxisField: validYField,
        // Preserve data transformation settings
        aggregation: existingConfig?.aggregation || 'none',
        filter: existingConfig?.filter || '',
        sortOrder: existingConfig?.sortOrder || 'none',
        swapAxes: existingConfig?.swapAxes || false,
        // Preserve other user settings
        colorPalette: existingConfig?.colorPalette || chartConfig.colorPalette,
        legendShow: existingConfig?.legendShow !== undefined ? existingConfig.legendShow : chartConfig.showLegend,
        tooltipShow: existingConfig?.tooltipShow !== undefined ? existingConfig.tooltipShow : chartConfig.showTooltip,
        showGrid: existingConfig?.showGrid !== undefined ? existingConfig.showGrid : chartConfig.showGrid
      };
      
    const chartWidget = {
        id: previewChart?.id || `chart-${Date.now()}`,
      type: chartConfig.chartType,
        name: finalTitle,
        title: finalTitle,
        config: normalizedConfig,
      data: chartData,
      query: sqlQuery,
        dataSourceId: selectedDataSource?.id || selectedDataSourceId || '',
      // Add raw data for reference
        rawData: actualData,
        // Store original columns for robust axis selection
        originalColumns: columns,
        numericColumns: numericColumns,
        textColumns: textColumns,
        dateColumns: dateColumns,
        // Metadata
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

      // Set preview chart and switch to preview tab
      setPreviewChart((prevChart: any) => {
        // Only show message if this is a new chart generation, not a type change
        // Check if we already have a previewChart with the same rawData (indicating a type change)
        const isTypeChange = prevChart && prevChart.rawData === actualData && prevChart.id !== chartWidget.id;
        if (!isTypeChange) {
          message.success({
            content: `Chart "${normalizedConfig.title}" preview created!`,
            duration: 2,
          });
        }
        return chartWidget;
      });
      // Only switch tab if not already in preview (to avoid disrupting user if they're switching chart types)
      setActiveTab((prevTab) => prevTab !== 'preview' ? 'preview' : prevTab);
    } catch (error: any) {
      console.error('Error creating chart:', error);
      message.error({
        content: `Failed to create chart: ${error.message || 'Unknown error'}`,
        duration: 5,
      });
    }
  };

  const handleDesignerPanelHover = (panelKey: string) => {
    setChartDesignerActiveKeys([panelKey]);
  };

  const handleDesignerPanelLeave = (panelKey: string) => {
    setChartDesignerActiveKeys(prev => (prev[0] === panelKey ? [] : prev));
  };

  const handleDesignerCollapseChange = (keys: string | string[]) => {
    const normalizedKeys = Array.isArray(keys) ? keys : keys ? [keys] : [];
    setChartDesignerActiveKeys(normalizedKeys as string[]);
  };

  const handleChartGenerate = (chartConfig: any) => {
    if (onChartCreate) {
      const chartWidget = {
        type: chartConfig.chartType,
        name: chartConfig.title.text,
        title: chartConfig.title.text,
        config: chartConfig,
        data: chartConfig.data,
        query: sqlQuery,
        dataSourceId: selectedDataSource,
        rawData: chartConfig.rawData
      };
      onChartCreate(chartWidget);
    }
  };

  const saveChartAsset = async (assetData: any, successMessage: string) => {
    try {
      const response = await authenticatedFetch('/api/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assetData)
      });
      const responseText = await response.text().catch(() => '');
      let result: any = {};
      if (responseText) {
        try {
          result = JSON.parse(responseText);
        } catch {
          throw new Error(`Invalid JSON response: ${responseText.substring(0, 200)}`);
        }
      }
      if (response.status === 401) {
        message.error('Authentication required to save charts. Please log in.');
        return null;
      }
      if (!response.ok) {
        const errorMsg = result?.error || result?.detail || result?.message || `HTTP ${response.status}`;
        throw new Error(errorMsg);
      }
      if (!result || !(result.id || result.asset_id)) {
        throw new Error('Save failed - unexpected response format');
      }
      message.success(successMessage);
      return result;
    } catch (error: any) {
      console.error('Failed to save chart:', error);
      message.error(`Failed to save chart: ${error.message || 'Unknown error'}`);
      return null;
    }
  };

  const handleAIGenerate = async () => {
    if (!aiAssistantInput.trim()) {
      message.warning('Please enter a query description');
      return;
    }

    if (!selectedDataSourceId) {
      message.warning('Please select a data source first');
      return;
    }

    setAiGenerating(true);
    try {
      const response = await authenticatedFetch('/api/ai/query-editor/generate-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: aiAssistantInput.trim(),
          data_source_id: selectedDataSourceId,
          language: editorLanguage, // 'sql' or 'python'
          current_sql: sqlQuery.trim() || undefined  // Send current SQL from editor
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: response.statusText }));
        throw new Error(errorData.detail || errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('AI generation result (Query Editor):', { 
        success: result.success, 
        hasCode: !!result.code, 
        codeLength: result.code?.length || 0,
        language: result.language,
        // Only log first 100 chars of code to avoid spam
        codePreview: result.code?.substring(0, 100) || 'N/A'
      });

      if (result.success && result.code) {
        // CRITICAL: Ultra-aggressive frontend cleaning to ensure no metadata slips through
        const desiredLanguage: QueryLanguage = result.language ? resolveLanguage(result.language) : editorLanguage;
        const originalCode = result.code;
        let generatedCode = originalCode;
        
        if (desiredLanguage === 'sql') {
          // Step 1: Remove complete JSON objects that might be at the end
          generatedCode = generatedCode.replace(/\s*\{[^}]*"dialect"[^}]*\}.*$/gm, '');
          generatedCode = generatedCode.replace(/\s*\{[^}]*"explanation"[^}]*\}.*$/gm, '');
          generatedCode = generatedCode.replace(/\s*\{[^}]*"confidence"[^}]*\}.*$/gm, '');
          generatedCode = generatedCode.replace(/\s*\{[^}]*"validation_result"[^}]*\}.*$/gm, '');
          generatedCode = generatedCode.replace(/\s*\{[^}]*"step"[^}]*\}.*$/gm, '');
          generatedCode = generatedCode.replace(/\s*\{[^}]*"detail"[^}]*\}.*$/gm, '');
          generatedCode = generatedCode.replace(/\s*\{[^}]*"reasoning_steps"[^}]*\}.*$/gm, '');
          
          // Step 2: Remove nested JSON structures
          generatedCode = generatedCode.replace(/\s*\{[^{}]*\{[^}]*\}[^}]*\}.*$/gm, '');
          
          // Step 3: Remove JSON-like patterns embedded in strings
          generatedCode = generatedCode.replace(/["']dialect["']\s*:\s*["'][^"']*["'].*$/gm, '');
          generatedCode = generatedCode.replace(/["']explanation["']\s*:\s*["'][^"']*["'].*$/gm, '');
          generatedCode = generatedCode.replace(/["']confidence["']\s*:\s*[0-9.]+.*$/gm, '');
          generatedCode = generatedCode.replace(/["']validation_result["']\s*:\s*\{[^}]*\}.*$/gm, '');
          
          // Step 4: Remove text patterns that indicate metadata
          generatedCode = generatedCode.replace(/Counts unique customers.*$/gim, '');
          generatedCode = generatedCode.replace(/using a date-range filter.*$/gim, '');
          generatedCode = generatedCode.replace(/Query uses.*$/gim, '');
          generatedCode = generatedCode.replace(/and existing column.*$/gim, '');
          
          // Step 5: Extract SQL if code contains JSON metadata mixed with SQL
          const sqlMatch = generatedCode.match(/(SELECT\s+[^"'{]+?)(?:\s*["']|$)/i);
          if (sqlMatch) {
            let extracted = sqlMatch[1].trim();
            extracted = extracted.replace(/\s*["']\s*[,:]\s*.*$/gm, '');
            extracted = extracted.replace(/\s*\{[^}]*\}.*$/gm, '');
            if (extracted && extracted.length > 10) {
              generatedCode = extracted;
            }
          }
          
          // Step 6: Ensure code starts with SQL keywords
          const sqlKeywords = ['SELECT', 'WITH', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'ALTER', 'DROP'];
          const codeUpper = generatedCode.trim().toUpperCase();
          const isSQL = sqlKeywords.some(kw => codeUpper.startsWith(kw));
          
          // Step 7: If still doesn't look like SQL, try more aggressive extraction
          if (!isSQL) {
            const selectIndex = generatedCode.toUpperCase().indexOf('SELECT');
            if (selectIndex >= 0) {
              const afterSelect = generatedCode.substring(selectIndex);
              const endMatch = afterSelect.match(/^([^"'{]+)/);
              if (endMatch) {
                generatedCode = endMatch[1].trim();
                if (!generatedCode.endsWith(';')) {
                  generatedCode += ';';
                }
              }
            }
          }
          
          // Step 8: Final cleanup - remove any remaining JSON-like patterns
          generatedCode = generatedCode.replace(/\s*["']\s*[,:]\s*["'].*$/gm, '');
          generatedCode = generatedCode.replace(/\s*\{[^}]*\}.*$/gm, '');
          generatedCode = generatedCode.replace(/\s*\}\s*\}.*$/gm, '');
          generatedCode = generatedCode.replace(/\s*,\s*\{[^}]*\}.*$/gm, '');
          generatedCode = generatedCode.replace(/,\s*["']\s*[,:]\s*.*$/gm, '');

          // Step 9: Fix missing table name for file data sources
          if (desiredLanguage === 'sql' && selectedDataSource?.type === 'file') {
            // Find FROM clause (case-insensitive)
            const fromIndex = generatedCode.toUpperCase().indexOf('FROM');
            
            if (fromIndex !== -1) {
              // Get everything after FROM and trim whitespace
              const afterFrom = generatedCode.substring(fromIndex + 4).trim();
              
              // Check if "data" or "file" appears right after FROM (case-insensitive)
              const afterFromUpper = afterFrom.toUpperCase();
              const hasTableName = afterFromUpper.startsWith('DATA') || 
                                   afterFromUpper.startsWith('FILE') ||
                                   afterFromUpper.startsWith('"DATA"') ||
                                   afterFromUpper.startsWith('"FILE"') ||
                                   afterFromUpper.startsWith('`DATA`') ||
                                   afterFromUpper.startsWith('`FILE`');
              
              // If no table name found, insert "data"
              if (!hasTableName) {
                const beforeFrom = generatedCode.substring(0, fromIndex + 4);
                const after = generatedCode.substring(fromIndex + 4);
                generatedCode = beforeFrom + ' "data"' + after;
                console.log('🔧 Fixed missing table name for file data source: added "data"');
              }
            }
          }
        } else {
          generatedCode = generatedCode.trim();
        }
        
        // Final trim & fallback
        generatedCode = generatedCode.trim();
        if (!generatedCode) {
          generatedCode = originalCode.trim();
        }
        
        console.log('✅ Generated code received (cleaned and ready to run):', { 
          codeLength: generatedCode.length, 
          language: desiredLanguage,
          preview: generatedCode.substring(0, 100) + '...'
        });
        
        // Update the active query tab with generated code
        if (queryTabs.length > 0) {
          // Use activeQueryKey (the correct variable name)
          const currentActiveKey = activeQueryKey || queryTabs[0]?.key;
          const activeTab = queryTabs.find(t => t.key === currentActiveKey) || queryTabs[0];
          const nextLanguage: QueryLanguage = desiredLanguage;
          
          const updatedTabs = queryTabs.map(t => 
            t.key === activeTab.key 
              ? {
                  ...t,
                  sql: nextLanguage === 'sql' ? generatedCode : t.sql,
                  python: nextLanguage === 'python' ? generatedCode : t.python,
                  language: nextLanguage
                }
              : t
          );
          setQueryTabs(updatedTabs);
          
          // CRITICAL: Update editor value - code is ready to run directly
          setSqlQuery(generatedCode);
          
          // Update editor language if needed
          setEditorLanguage(nextLanguage);
        } else {
          // Create new tab if none exists
          const newTabKey = `query-${Date.now()}`;
          const nextLanguage: QueryLanguage = desiredLanguage;
          const newTab = {
            key: newTabKey,
            title: 'Query 1',
            sql: nextLanguage === 'sql' ? generatedCode : DEFAULT_SQL_SNIPPET,
            python: nextLanguage === 'python' ? generatedCode : buildPythonTemplate(generatedCode, selectedDataSource?.name),
            language: nextLanguage,
          };
          setQueryTabs([newTab]);
          setActiveQueryKey(newTabKey);
          // CRITICAL: Set the SQL query - code is ready to run directly
          setSqlQuery(generatedCode);
          setEditorLanguage(nextLanguage);
        }

        // Show simple success message - code is ready to run
        message.success({
          content: `Generated ${result.language?.toUpperCase() || 'SQL'} code successfully! Ready to run.`,
          duration: 3,
        });

        // Clear input
        setAiAssistantInput('');
      } else {
        // More detailed error message
        const errorMsg = result.error || result.detail || 'Failed to generate code. Please try again.';
        console.error('AI generation failed:', result);
        message.error({
          content: errorMsg,
          duration: 5,
        });
      }
    } catch (error: any) {
      console.error('AI generation error:', error);
      const errorMessage = error?.message || error?.toString() || 'Failed to generate code. Please try again.';
      message.error({
        content: `Error: ${errorMessage}`,
        duration: 5,
      });
    } finally {
      setAiGenerating(false);
    }
  };

  // Python execution handler
  const handleExecutePython = async () => {
    setExecuting(true);
    setLoading(true);
    setError(null);
    setExecutionTime(null);
    setResolvedEngine(null); // Clear resolved engine when starting new execution
    setExecutionStatus('Executing Python script...');
    
    try {
      const startTime = Date.now();

      // Determine data source id
      const dsId = selectedDataSource?.id || selectedDataSourceId || '';
      if (!dsId) {
        throw new Error('No data source selected. Please select a data source from the left panel before executing your script.');
      }

      if (!sqlQuery.trim()) {
        throw new Error('Please enter a Python script to execute.');
      }

      setExecutionStatus('Executing Python script...');

      // Execute Python script - extract SQL from Python and execute it
      // The generated Python code should contain SQL that we can extract and execute
      // For now, we'll execute the Python code which should call the API internally
      // In the future, we can add a dedicated Python execution endpoint
      
      // Extract SQL query from Python code if it contains API calls
      const pythonCode = sqlQuery;
      const sqlMatch = pythonCode.match(/sql_query\s*=\s*['"`]([\s\S]*?)['"`]/i);
      const extractedSQL = sqlMatch ? sqlMatch[1] : null;
      
      if (extractedSQL) {
        // If Python code contains SQL, execute the SQL directly
        const engineParam = (selectedEngine && selectedEngine !== 'auto') ? selectedEngine : undefined;
        const result = await enhancedDataService.executeMultiEngineQuery(extractedSQL, dsId, engineParam);
        
        const executionTime = Date.now() - startTime;

        if (result && result.success) {
          let resultData = result.data || [];
          if (!Array.isArray(resultData)) {
            resultData = resultData ? [resultData] : [];
          }
          
          setResults(resultData);
          setExecutionTime(result.execution_time || executionTime);
          // Update resolved engine state for display
          const resolvedEngineValue = result.engine || (engineParam as string) || 'auto';
          setResolvedEngine(resolvedEngineValue);
          setExecutionStatus('Python script completed successfully');
          setActiveTab('results');

          if (onQueryResult) {
            onQueryResult({
              data: resultData,
              columns: result.columns || [],
              rowCount: result.row_count || resultData.length,
              executionTime: result.execution_time || executionTime,
              query: extractedSQL,
              dataSourceId: dsId
            });
          }

          message.success(`Python script executed successfully! (${executionTime}ms)`);
        } else {
          throw new Error(result.error || 'Python script execution failed');
        }
      } else {
        // If no SQL found, show info message
        message.info('Python execution: The script should contain SQL queries that will be executed. For now, please use SQL queries directly.');
      }
    } catch (err: any) {
      const errorMessage = err?.message || err?.toString() || 'Failed to execute Python script';
      console.error('❌ Python execution error:', err);
      setError(errorMessage);
      setExecutionStatus('Python execution failed');
      message.error(`Python execution failed: ${errorMessage}`);
    } finally {
      setExecuting(false);
      setLoading(false);
    }
  };

  const handleExecuteQuery = async () => {
    setExecuting(true);
    setLoading(true);
    setError(null);
    setExecutionTime(null);
      setResolvedEngine(null); // Clear resolved engine when starting new execution
    setExecutionStatus('Analyzing query...');
    let executedSql = sqlQuery;
    let appendedLimit = false;
    
    try {
      const startTime = Date.now();

      if (editorLanguage === 'sql') {
        const existingLimit = extractLimitFromQuery(sqlQuery);
        if (existingLimit === null && rowLimit !== 'all') {
          const parsedLimit = parseInt(rowLimit, 10);
          if (!Number.isNaN(parsedLimit) && parsedLimit > 0) {
            executedSql = appendLimitClause(sqlQuery, parsedLimit);
            appendedLimit = true;
          }
        }
      }

      // Determine data source id - prioritize selectedDataSource from EnhancedDataPanel
      const dsId = selectedDataSource?.id || selectedDataSourceId || '';
      if (!dsId) {
        throw new Error('No data source selected. Please select a data source from the left panel before executing your query.');
      }
      
      // Log for debugging - include full context
      console.log('🔍 Executing query:', {
        sql: executedSql.substring(0, 200),
        dataSourceId: dsId,
        dataSourceName: selectedDataSource?.name,
        dataSourceType: selectedDataSource?.type,
        dataSourceDbType: selectedDataSource?.db_type,
        selectedDatabase: selectedDataSourceId || '',
        engine: selectedEngine,
        availableTables: (schema?.tables || []).map((t: any) => t.name).slice(0, 10) // Show first 10 tables
      });
      
      // Warn if query references a table that might not exist in current data source
      const queryLower = executedSql.toLowerCase();
      const fromMatch = queryLower.match(/from\s+([a-z0-9_\.]+)/);
      const schemaTables = schema?.tables || [];
      if (fromMatch && schemaTables.length > 0) {
        const referencedTable = fromMatch[1].split('.').pop()?.toLowerCase();
        const tableExists = schemaTables.some((t: any) => t.name?.toLowerCase() === referencedTable);
        if (!tableExists) {
          const availableTableNames = schemaTables.map((t: any) => t.name).filter(Boolean).join(', ');
          console.warn(`⚠️ Query references table '${referencedTable}' which may not exist in data source '${selectedDataSource?.name}'. Available tables: ${availableTableNames}`);
        }
      }

      if (!executedSql.trim()) {
        throw new Error('Please enter a SQL query to execute.');
      }

      setExecutionStatus('Executing query...');

      // Use enhancedDataService to run multi-engine queries (server-side routing)
      // If engine is 'auto' or empty, pass undefined to let backend auto-select
      const engineParam = (selectedEngine && selectedEngine !== 'auto') ? selectedEngine : undefined;
      const result = await enhancedDataService.executeMultiEngineQuery(executedSql, dsId, engineParam);

      const executionTime = Date.now() - startTime;

      if (result && result.success) {
        // Ensure results are properly set - handle both array and object formats
        let resultData = result.data || [];
        
        // Handle case where data might not be an array
        if (!Array.isArray(resultData)) {
          console.warn('⚠️ Result data is not an array, converting:', typeof resultData, resultData);
          resultData = resultData ? [resultData] : [];
        }
        
        console.log('✅ Query result received:', { 
          success: result.success, 
          dataLength: resultData.length,
          dataType: Array.isArray(resultData) ? 'array' : typeof resultData,
          firstRow: resultData.length > 0 ? resultData[0] : null,
          columns: result.columns || [],
          engine: result.engine,
          rowCount: result.row_count || resultData.length
        });
        
        // Log if data is empty but success is true
        if (resultData.length === 0) {
          console.warn('⚠️ Query executed successfully but returned no data rows');
          message.info('Query executed successfully but returned no results.');
        }
        
        setResults(resultData);
        setExecutionTime(result.execution_time || executionTime);
        // Update resolved engine state for display
        const resolvedEngineValue = result.engine || (engineParam as string) || 'auto';
        setResolvedEngine(resolvedEngineValue);
        setExecutionStatus('Query completed successfully');
        
        // Switch to results tab to show the results (even if empty, so user can see the status)
        setActiveTab('results');

        if (onQueryResult) {
          onQueryResult({
            data: result.data || [],
            columns: result.columns || [],
            rowCount: result.row_count || (result.data || []).length,
            executionTime: result.execution_time || executionTime,
            query: executedSql,
            dataSourceId: dsId
          });
        }

        const historyItem = {
          id: Date.now(),
          state: 'success',
          started: new Date().toLocaleTimeString(),
          duration: `00:00:${((result.execution_time || executionTime) / 1000).toFixed(2)}`,
          progress: 100,
          rows: result.row_count || (result.data || []).length,
          sql: executedSql,
          status: 'success',
          database: selectedDataSourceId || '',
          schema: selectedSchema,
          user: 'current_user',
          queryType: sqlQuery.trim().toUpperCase().split(' ')[0],
          engine: result.engine || (engineParam as string) || 'unknown'
        };

        setQueryHistory(prev => [historyItem, ...prev.slice(0, 49)]);
        if (appendedLimit) {
          const limitLabel = Number(rowLimit).toLocaleString();
          message.info(`Applied row limit of ${limitLabel} rows.`);
        }
        message.success(`Query executed successfully using ${historyItem.engine}. ${(historyItem.rows || 0).toLocaleString()} rows returned.`);
      } else {
        setExecutionStatus('Query failed');
        setSelectedEngine('unknown');
        throw new Error(result.error || 'Query execution failed');
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Query execution failed';
      setExecutionStatus('Query failed');
      setSelectedEngine('unknown');
      setError(errorMessage);
      setLoading(false);
      // Remove duplicate message.error to avoid confusion - error is now displayed in Alert
      console.error('Query execution error:', error);
      
      // Add failed query to history
      const historyItem = {
        id: Date.now(),
        state: 'error',
        started: new Date().toLocaleTimeString(),
        duration: '00:00:00.00',
        progress: 0,
        rows: 0,
        sql: executedSql,
        status: 'error',
        database: selectedDataSourceId || '',
        schema: selectedSchema,
        user: 'current_user',
        queryType: sqlQuery.trim().toUpperCase().split(' ')[0],
        engine: 'error',
        error: errorMessage
      };
      
      setQueryHistory(prev => [historyItem, ...prev.slice(0, 49)]);
    } finally {
      setExecuting(false);
      setLoading(false);
    }
  };

  // Generate columns dynamically from query results
  const generateColumns = (data: any[]) => {
    if (!data || data.length === 0) return [];
    
    const firstRow = data[0];
    const columnKeys = Object.keys(firstRow);
    
    return columnKeys.map((key, index) => ({
      title: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' '),
      dataIndex: key,
      key: key,
      render: (value: any) => {
        if (typeof value === 'number') {
          return value?.toLocaleString();
        }
        return value;
      },
      width: 150,
      ellipsis: true,
      sorter: (a: any, b: any) => {
        const aVal = a[key];
        const bVal = b[key];
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return aVal - bVal;
        }
        return String(aVal).localeCompare(String(bVal));
      }
    }));
  };

  const columns = generateColumns(results);

  const historyColumns = [
    { 
      title: 'Status', 
      key: 'status',
      render: (record: any) => (
        <Badge 
          status={record.state === 'success' ? 'success' : record.state === 'running' ? 'processing' : 'error'} 
          text={
            <span style={{ fontSize: 'var(--font-size-sm)' }}>
              {record.state === 'success' ? '✅ Success' : record.state === 'running' ? '🔄 Running' : '❌ Failed'}
            </span>
          }
        />
      )
    },
    { 
      title: 'Started', 
      dataIndex: 'started', 
      key: 'started', 
      render: (value: string) => <span style={{ fontFamily: 'monospace', fontSize: '11px' }}>{value}</span>
    },
    { 
      title: 'Duration', 
      dataIndex: 'duration', 
      key: 'duration', 
      render: (value: string) => <span style={{ fontFamily: 'monospace', fontSize: '11px' }}>{value}</span>
    },
    { 
      title: 'Progress', 
      key: 'progress', 
      render: (record: any) => (
          <Progress 
          percent={record.progress} 
            size="small" 
          status={record.state === 'success' ? 'success' : record.state === 'running' ? 'active' : 'exception'}
            showInfo={false}
          />
      )
    },
    { 
      title: 'Rows', 
      dataIndex: 'rows', 
      key: 'rows', 
      render: (value: number) => value?.toLocaleString()
    },
    { 
      title: 'Engine', 
      dataIndex: 'engine', 
      key: 'engine', 
      render: (value: string) => {
        const getEngineIcon = (engine: string) => {
          switch (engine) {
            case 'duckdb': return '🦆';
            case 'cube': return '📊';
            case 'spark': return '⚡';
            case 'direct_sql': return '🗄️';
            case 'pandas': return '🐼';
            case 'demo': return '🎯';
            case 'error': return '❌';
            default: return '🔧';
          }
        };
        
        return (
          <span style={{ fontSize: '11px' }}>
            {getEngineIcon(value)} {value}
          </span>
        );
      }
    },
    { 
      title: 'User', 
      dataIndex: 'user', 
      key: 'user', 
      render: (value: string) => <span style={{ fontSize: '11px' }}>{value}</span>
    },
    { 
      title: 'SQL Query', 
      dataIndex: 'sql', 
      key: 'sql', 
      render: (value: string) => (
        <Tooltip title={value} placement="topLeft">
          <div 
            style={{ 
              cursor: 'pointer', 
          fontFamily: 'monospace',
          fontSize: '10px',
              maxWidth: '200px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
            onClick={() => handleHistoryItemClick(value)}
          >
            {value}
        </div>
        </Tooltip>
      )
    },
    { 
      title: 'Actions', 
      key: 'actions', 
      render: (record: any) => (
        <Space size="small">
            <Button 
              size="small" 
              type="text" 
              icon={<EditOutlined />} 
              onClick={() => handleHistoryItemClick(record.sql)}
              title="Load Query"
            />
            <Button 
              size="small" 
              type="text" 
              danger 
              icon={<DeleteOutlined />} 
              title="Delete History"
            />
        </Space>
      )
    }
  ];

  return (
    <div style={{
      flex: 1,
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--ant-color-bg-layout)',
      color: 'var(--ant-color-text)',
      overflow: 'hidden',
      minHeight: 0
    }}>
      {/* Top Bar removed per UX request */}



      {/* Main Content - Two Column Layout - Match AI Chat page design */}
        <div style={{
        flex: 1, 
        display: 'flex', 
        flexDirection: isStackedLayout ? 'column' : 'row', 
        gap: isStackedLayout ? 16 : 0, 
        overflow: 'hidden', 
        minHeight: 0 
      }}>
        {/* Main Panel - SQL Editor & Results */}
        <div style={{ 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column', 
          overflow: 'hidden', 
          minHeight: 0,
          height: '100%',
          maxHeight: '100%'
        }}>
          {/* Aicser AI Assistant Prompt Bar */}
          <div style={{
            padding: '8px 16px',
            background: isDarkMode ? 'var(--ant-color-bg-container)' : 'var(--ant-color-bg-container)',
            flexShrink: 0,
            borderRadius: '8px 8px 0 0',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Tooltip
                title={
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: '4px' }}>Aicser AI Assistant</div>
                    <div style={{ fontSize: '12px' }}>Describe what you want to find in your data, and AI will generate the SQL query for you.</div>
                    <div style={{ fontSize: '11px', marginTop: '6px', color: 'var(--ant-color-text-secondary)' }}>
                      Example: "Show me sales from last month" or "What are the top 10 products?"
              </div>
                          </div>
                        }
                placement="bottomLeft"
              >
          <div style={{
                    flexShrink: 0,
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer'
                  }}>
            <AnimatedAIAvatar 
              size={24} 
              isSpeaking={!!aiAssistantInput && !aiGenerating}
              isThinking={aiGenerating}
            />
          </div>
                  </Tooltip>
              <Input
                placeholder="Ask in plain English... (e.g., 'Show me sales from last month')"
                style={{ flex: 1, height: '36px', borderRadius: '6px' }}
                size="middle"
                value={aiAssistantInput}
                onChange={(e) => setAiAssistantInput(e.target.value)}
                onPressEnter={handleAIGenerate}
                disabled={aiGenerating}
              />
                    <Button
                size="middle"
                type="primary"
                icon={<RocketOutlined />}
                style={{
                  height: '36px',
                  borderRadius: '6px',
                  flexShrink: 0
                }}
                onClick={handleAIGenerate}
                loading={aiGenerating}
                disabled={!selectedDataSourceId || !aiAssistantInput.trim()}
              >
                Generate {editorLanguage === 'python' ? 'Python' : 'SQL'}
                    </Button>
                            </div>
                </div>

          {/* Editor and Results Container */}
                    <div style={{ 
            flex: 1, 
                              display: 'flex',
            flexDirection: 'column', 
            overflow: 'hidden', 
            minHeight: 0,
            maxHeight: '100%',
            height: '100%',
            background: 'var(--ant-color-bg-container)' 
          }}>
          {/* Query Tabs above editor */}
            <div style={{ padding: '4px 16px', background: isDarkMode ? 'var(--ant-color-bg-container)' : 'var(--ant-color-bg-container)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {/* Language Switcher */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginRight: 'auto' }}>
                <Text style={{ fontSize: 'var(--font-size-sm)', color: 'var(--ant-color-text-secondary)' }}>Language:</Text>
                <Select
                  value={editorLanguage}
                  onChange={(val) => {
                    const nextLanguage = resolveLanguage(val as string);
                    if (nextLanguage === editorLanguage) return;
                    const activeTab = queryTabs.find(t => t.key === activeQueryKey);
                    const pythonText = getPythonTemplate(activeTab, selectedDataSource?.name);
                    setQueryTabs(prev => prev.map(t => {
                      if (t.key !== activeQueryKey) return t;
                      if (nextLanguage === 'python') {
                        return { ...t, python: pythonText, language: nextLanguage };
                      }
                      return { ...t, language: nextLanguage };
                    }));
                    setEditorLanguage(nextLanguage);
                    if (nextLanguage === 'python') {
                      setSqlQuery(pythonText);
                    } else {
                      setSqlQuery(activeTab?.sql ?? DEFAULT_SQL_SNIPPET);
                    }
                  }}
                  size="small"
                  style={{ width: 120 }}
                  options={[
                    { value: 'sql', label: 'SQL' },
                    { value: 'python', label: 'Python' }
                  ]}
                />
                        </div>
            <Tabs
              size="small"
              type="editable-card"
              hideAdd={false}
              activeKey={activeQueryKey}
              onChange={(key) => {
                // CRITICAL: Save current tab's changes before switching
                const currentTab = queryTabs.find(t => t.key === activeQueryKey);
                if (currentTab) {
                  // Update current tab with latest SQL query from editor
                  setQueryTabs(prev => prev.map(t => {
                    if (t.key !== activeQueryKey) return t;
                    if (editorLanguage === 'python') {
                      return { ...t, python: sqlQuery, language: editorLanguage };
                    }
                    return { ...t, sql: sqlQuery, language: editorLanguage };
                  }));
                }
                
                // Switch to new tab
                setActiveQueryKey(key);
                const tab = queryTabs.find(t => t.key === key);
                if (tab) {
                  const nextLanguage = resolveLanguage(tab.language);
                  setEditorLanguage(nextLanguage);
                  setSqlQuery(nextLanguage === 'python' ? getPythonTemplate(tab, selectedDataSource?.name) : (tab.sql ?? DEFAULT_SQL_SNIPPET));
                }
              }}
              onEdit={(targetKey, action) => {
                if (action === 'add') {
                  const newKey = `q-${Date.now()}`;
                    const defaultPython = buildPythonTemplate(DEFAULT_SQL_SNIPPET, selectedDataSource?.name);
                    const newTab = { 
                      key: newKey, 
                      title: `Query ${queryTabs.length + 1}`, 
                      sql: DEFAULT_SQL_SNIPPET, 
                      python: defaultPython, 
                      language: editorLanguage 
                    };
                  setQueryTabs(prev => [...prev, newTab]);
                  setActiveQueryKey(newKey);
                  setSqlQuery(editorLanguage === 'python' ? defaultPython : DEFAULT_SQL_SNIPPET);
                } else if (action === 'remove') {
                  const key = String(targetKey);
                  const idx = queryTabs.findIndex(t => t.key === key);
                  const newTabs = queryTabs.filter(t => t.key !== key);
                  setQueryTabs(newTabs);
                  if (activeQueryKey === key && newTabs.length) {
                    const next = newTabs[Math.max(0, idx - 1)];
                    const nextLanguage = resolveLanguage(next.language);
                    setActiveQueryKey(next.key);
                    setEditorLanguage(nextLanguage);
                    setSqlQuery(nextLanguage === 'python' ? getPythonTemplate(next, selectedDataSource?.name) : (next.sql ?? DEFAULT_SQL_SNIPPET));
                  } else if (!newTabs.length) {
                    setActiveQueryKey('');
                    setEditorLanguage('sql');
                    setSqlQuery(DEFAULT_SQL_SNIPPET);
                  }
                }
              }}
              items={queryTabs.map(t => ({ 
                key: t.key, 
                label: (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {editingTabKey === t.key ? (
                  <input
                    value={titleDraft}
                    autoFocus
                    onChange={e => setTitleDraft(e.target.value)}
                        onBlur={() => { 
                          setQueryTabs(prev => prev.map(x => x.key === t.key ? { ...x, title: titleDraft || x.title } : x)); 
                          setEditingTabKey(null); 
                        }}
                    onKeyDown={e => { if (e.key === 'Enter') { (e.target as HTMLInputElement).blur(); } }}
                    style={{ width: 100 }}
                  />
                ) : (
                      <>
                  <span onDoubleClick={() => { setEditingTabKey(t.key); setTitleDraft(t.title); }}>{t.title}</span>
                        <Tooltip title="Save this query">
                          <Button
                            type="text"
                            size="small"
                            icon={<SaveOutlined />}
                            onClick={async (e) => {
                              e.stopPropagation();
                              // Get current SQL from editor if this is the active tab
                          const baseLanguage = resolveLanguage(t.language);
                          const isActiveTab = t.key === activeQueryKey;
                          const currentSql = baseLanguage === 'python'
                            ? (isActiveTab ? sqlQuery : getPythonTemplate(t, selectedDataSource?.name))
                            : (isActiveTab ? sqlQuery : (t.sql ?? DEFAULT_SQL_SNIPPET));
                              try {
                                // Check for duplicate name first
                                const checkRes = await authenticatedFetch(`/api/queries/saved-queries`);
                                if (checkRes.ok) {
                                  const checkData = await checkRes.json();
                                  const existingQueries = Array.isArray(checkData.items) ? checkData.items : [];
                                  const duplicate = existingQueries.find((q: any) => q.name === t.title);
                                  if (duplicate) {
                                    message.warning(`Query name "${t.title}" already exists. Please rename the tab first.`);
                                    return;
                                  }
                                }
                                
                                const res = await authenticatedFetch(`/api/queries/saved-queries`, {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ 
                                    name: t.title, 
                                    sql: currentSql, 
                                    metadata: { 
                                      language: baseLanguage,
                                      tabKey: t.key 
                                    } 
                                  })
                                });
                                if (res.status === 403 || res.status === 401) { 
                                  setPermissionModalVisible(true); 
                                  return; 
                                }
                                if (!res.ok) {
                                  const errorData = await res.json().catch(() => ({ detail: res.statusText }));
                                  const errorMsg = errorData.detail || errorData.error || 'Failed to save';
                                  if (errorMsg.includes('already exists')) {
                                    message.warning(errorMsg);
                                  } else {
                                    message.error(errorMsg);
                                  }
                                  return;
                                }
                                message.success(`Query "${t.title}" saved successfully`);
                                // Reload saved queries
                                const reload = await authenticatedFetch(`/api/queries/saved-queries`);
                                if (reload.ok) { 
                                  const j = await reload.json(); 
                                  setSavedQueries(Array.isArray(j.items) ? j.items : []); 
                                }
                              } catch (err: any) {
                                message.error(err.message || 'Failed to save query');
                              }
                            }}
                            style={{ padding: '0 4px', height: '20px' }}
                          />
                        </Tooltip>
                      </>
                    )}
          </div>
                )
              }))}
            />
            {/* Saved Queries icon - moved to right of tabs */}
            <Tooltip title="Show Saved Queries & Snapshots">
              <Button 
                size="small" 
                icon={<FolderOutlined />}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  padding: '0 4px'
                }}
                onClick={async () => {
                  try {
                    const res = await authenticatedFetch(`/api/queries/saved-queries`);
                    if (res.status === 403 || res.status === 401) { 
                      setPermissionModalVisible(true); 
                      return; 
                    }
                    if (res.ok) {
                      const j = await res.json();
                      setSavedQueries(Array.isArray(j.items) ? j.items : []);
                      // Also load snapshots
                      const snapRes = await authenticatedFetch(`/api/queries/snapshots`);
                      if (snapRes.ok) {
                        const snapJ = await snapRes.json();
                        setSnapshots(Array.isArray(snapJ.items) ? snapJ.items : []);
                      }
                      setShowSavedModal(true);
                    } else { 
                      message.error('Failed to load saved queries'); 
                    }
                  } catch (err: any) { 
                    message.error('Failed to load saved queries'); 
                  }
                }} 
              />
            </Tooltip>
            </div>

            {/* SQL Editor with adjustable height */}
          <div style={{ 
            padding: '16px', 
            overflow: 'hidden', 
            height: `${editorHeight}px`,
            minHeight: '140px',
            maxHeight: '600px',
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            background: 'var(--ant-color-bg-container)'
          }}>
            <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
            <MemoryOptimizedEditor
              height="100%"
                language={editorLanguage}
              theme={isDarkMode ? 'vs-dark' : 'vs-light'}
              value={sqlQuery}
              onChange={(value) => {
                const v = value || '';
                setSqlQuery(v);
                  setQueryTabs(prev => prev.map(t => {
                    if (t.key !== activeQueryKey) return t;
                    if (editorLanguage === 'python') {
                      return { ...t, python: v, language: editorLanguage };
                    }
                    return { ...t, sql: v, language: editorLanguage };
                  }));
              }}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                lineNumbers: 'on',
                roundedSelection: false,
                scrollBeyondLastLine: false,
                automaticLayout: true,
                wordWrap: 'on',
                suggestOnTriggerCharacters: true,
                quickSuggestions: true,
                parameterHints: { enabled: true },
                scrollbar: {
                  vertical: 'visible',
                  horizontal: 'visible'
                  }
                }}
              />
            </div>
          </div>
          <div
            onMouseDown={startEditorResize}
            style={{
              cursor: 'row-resize',
              height: '8px',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '4px 16px'
            }}
          >
            <div
              style={{
                width: '64px',
                height: '2px',
                borderRadius: '999px',
                background: 'var(--ant-color-border)'
              }}
            />
          </div>

            {/* Query Controls & Execute Button */}
          <div style={{
            padding: '12px 16px',
              borderTop: `1px solid ${isDarkMode ? 'var(--ant-color-border)' : 'var(--ant-color-border-secondary)'}`,
              background: isDarkMode ? 'var(--ant-color-bg-container)' : 'var(--ant-color-bg-container)',
            flexShrink: 0
          }}>
            {/* Control Bar */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
                marginBottom: '8px',
                flexWrap: 'wrap',
                gap: '12px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                <Button 
                  type="primary" 
                  icon={<PlayCircleOutlined />} 
                  size="large"
                  loading={isExecuting}
                    onClick={editorLanguage === 'python' ? handleExecutePython : handleExecuteQuery}
                    disabled={isLoadingSchema || !sqlQuery.trim() || !selectedDataSource}
                >
                    Run {editorLanguage === 'python' ? 'Python' : 'SQL'}
                </Button>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Text style={{ fontSize: 'var(--font-size-sm)' }}>Row Limit:</Text>
                  <Space size={4}>
                  <Select
                      value={rowLimit}
                      onChange={handleRowLimitChange}
                      style={{ width: '100px' }}
                    size="small"
                      disabled={limitSource === 'query'}
                      options={rowLimitOptions}
                    />
                    {limitSource === 'query' && (
                      <Tooltip title="LIMIT detected inside SQL query. Remove it to use the Row Limit control.">
                        <Tag color="blue" style={{ margin: 0 }}>In SQL</Tag>
                      </Tooltip>
                    )}
                  </Space>
                </div>

                {/* Harmonized Engine selector with status */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Text style={{ fontSize: 'var(--font-size-sm)' }}>Engine:</Text>
                  <Select
                    value={selectedEngine}
                    onChange={(val) => {
                      setSelectedEngine(val);
                      setResolvedEngine(null); // Clear resolved engine when user changes selection
                    }}
                    size="small"
                    style={{ width: 140 }}
                    placeholder="Select engine"
                    options={[
                      { value: 'auto', label: 'Auto' },
                      ...enhancedDataService.getAvailableQueryEngines().map(e => ({ value: e.type, label: e.name }))
                    ]}
                  />
                  {/* Show resolved engine status after execution */}
                  {resolvedEngine && !isExecuting && (
                    <Tag color="success" style={{ margin: 0 }}>
                      <ThunderboltOutlined style={{ marginRight: '4px' }} />
                      {resolvedEngine}
                    </Tag>
                  )}
                  {/* Show execution status */}
                  {isExecuting && (
                    <Tag color="processing" style={{ margin: 0 }}>
                      <SyncOutlined spin style={{ marginRight: '4px' }} />
                      {executionStatus || 'Executing...'}
                    </Tag>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ClockCircleOutlined style={{ fontSize: 'var(--font-size-base)' }} />
                  <Text style={{ fontFamily: 'monospace', fontSize: 'var(--font-size-sm)' }}>
                    {executionTime ? `00:00:${(executionTime / 1000).toFixed(2)}` : '00:00:00.00'}
                  </Text>
                </div>

                  {/* Action buttons - only Save Snapshot */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
                <Tooltip title="Save Snapshot">
                  <Button size="small" icon={<FileTextOutlined />} onClick={async () => {
                    const name = prompt('Snapshot name (optional)');
                    if (name === null) return;
                    try {
                      const payload = { data_source_id: selectedDataSource?.id || selectedDataSourceId || '', sql: sqlQuery, name, preview_rows: 100 };
                      const res = await authenticatedFetch(`/api/queries/snapshots`, {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                      });
                      if (res.status === 403 || res.status === 401) { setPermissionModalVisible(true); return; }
                      if (!res.ok) {
                        const j = await res.json().catch(() => ({}));
                        throw new Error(j.detail || 'Failed to save snapshot');
                      }
                      const j = await res.json();
                      if (j && j.success) {
                        message.success('Snapshot saved');
                      } else {
                        throw new Error(j.error || 'Save failed');
                      }
                    } catch (e:any) {
                      console.error('Snapshot save failed', e);
                      message.error(e.message || 'Snapshot save failed');
                    }
                  }} />
                </Tooltip>
                <Tooltip title="Schedule Query">
                  <Button size="small" icon={<ClockCircleOutlined />} onClick={async () => {
                    try {
                      const res = await authenticatedFetch(`/api/queries/schedules`);
                      if (res.ok) {
                        const j = await res.json();
                        setSchedules(Array.isArray(j.items) ? j.items : []);
                        setShowScheduleModal(true);
                      } else { message.error('Failed to load schedules'); }
                    } catch { message.error('Failed to load schedules'); }
                  }} />
                </Tooltip>
                  </div>
                </div>
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <Alert
                message="Query Error"
                description={error}
                type="error"
                showIcon
                closable
                onClose={() => setError(null)}
                style={{ margin: '16px', marginBottom: '8px' }}
              />
            )}
                {!isQueryValid && validationMessage && (
                  <Alert
                    message="Query Validation"
                    description={validationMessage}
                    type="warning"
                    showIcon
                style={{ margin: '16px', marginBottom: '8px' }}
                  />
                )}

            {/* Results, History, Performance & Chart Tabs - Always Visible */}
            <div style={{ 
              flex: 1, 
              minHeight: 0, 
              display: 'flex', 
              flexDirection: 'column',
              borderTop: `1px solid ${isDarkMode ? 'var(--ant-color-border)' : 'var(--ant-color-border-secondary)'}`,
              background: isDarkMode ? 'var(--ant-color-bg-container)' : 'var(--ant-color-bg-container)'
            }}>
            <Tabs 
              activeKey={activeTab} 
              onChange={setActiveTab}
              size="small"
              style={{ 
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                minHeight: 0,
                height: '100%',
                maxHeight: '100%',
                overflow: 'hidden'
              }}
              tabBarStyle={{ 
                margin: 0,
                padding: '0 16px',
                background: isDarkMode ? 'var(--ant-color-bg-container)' : 'var(--ant-color-bg-container)',
                borderBottom: `1px solid ${isDarkMode ? 'var(--ant-color-border)' : 'var(--ant-color-border-secondary)'}`,
                flexShrink: 0
              }}
            >
              <TabPane tab="Query Results" key="results">
                <div style={{ 
                  padding: '12px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  flex: 1,
                  minHeight: 0,
                  background: 'transparent'
                }}>
                <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    {executionTime && (
                        <Text type="secondary" style={{ fontSize: 'var(--font-size-sm)' }}>
                          Execution time: {executionTime}ms
                        </Text>
                    )}
                  </div>
                  <Space size="small">
                    <Button
                      size="small"
                      type="primary"
                      icon={<BarChartOutlined />}
                      disabled={results.length === 0}
                      onClick={async () => {
                        if (!results || results.length === 0) return;
                        const chartTypes = suggestChartTypes(results);
                        const chartTypeName = chartTypes.length > 0 ? chartTypes[0].name : 'Bar Chart';

                        // Try server-side preview conversion first (robust for many engines)
                        try {
                          const resp = await authenticatedFetch(`/api/dash-studio/query-editor/preview-from-rows`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ rows: results, chart_type: chartTypeName.toLowerCase() })
                          });

                          if (resp.ok) {
                            const j = await resp.json();
                            // Server returned an echarts option; still use local generator to create a preview widget
                            // using the same chart type but with server-validated rows.
                            handleCreateChart(chartTypeName, results);
                            return;
                          }
                        } catch (e) {
                          console.warn('Server preview failed, falling back to local generator', e);
                        }

                        // Fallback: generate chart client-side
                        handleCreateChart(chartTypeName, results);
                      }}
                    >
                      Generate Chart
                    </Button>
                    <Button 
                      size="small" 
                      icon={<DownloadOutlined />} 
                      onClick={() => exportToCSV(results)}
                      disabled={results.length === 0}
                    >
                      CSV
                    </Button>
                    <Button 
                      size="small" 
                      icon={<DownloadOutlined />} 
                      onClick={() => exportToJSON(results)}
                      disabled={results.length === 0}
                    >
                      JSON
                    </Button>
                  </Space>
                </div>
                  <div className="data-content" style={{ flex: 1, minHeight: 0, overflow: 'auto', background: 'transparent' }}>
                    {isExecuting || loading ? (
                      <div style={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        height: '100%',
                        padding: '40px 20px',
                        gap: '16px'
                      }}>
                        <QueryLoading 
                          message={executionStatus || 'Executing query...'}
                          progress={executionStatus && executionStatus.toLowerCase().includes('executing') ? 50 : undefined}
                        />
                        <div style={{ 
                          textAlign: 'center',
                          maxWidth: '400px',
                          color: 'var(--ant-color-text-secondary)'
                        }}>
                          <Text type="secondary" style={{ fontSize: '14px', display: 'block', marginBottom: '8px' }}>
                            Please wait while we process your request...
                          </Text>
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            This may take a few moments depending on query complexity and data size.
                          </Text>
                        </div>
                      </div>
                    ) : results && results.length > 0 ? (
                  <div style={{ background: 'transparent' }}>
                  <Table
                    dataSource={results}
                    columns={columns}
                    size="small"
                    pagination={false}
                      scroll={{ y: 'calc(100vh - 600px)' }}
                      rowKey={(record, index) => `row-${index}`}
                      style={{ background: 'transparent' }}
                    />
                  </div>
                    ) : (
                      <div style={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        height: '100%',
                        color: 'var(--ant-color-text-secondary)',
                        background: 'transparent'
                      }}>
                        <Text type="secondary" style={{ fontSize: 14 }}>
                          No results to display. Execute a query to see results here.
                        </Text>
                      </div>
                    )}
                  </div>
                </div>
              </TabPane>
              <TabPane tab="Performance" key="performance">
                <div style={{ 
                  padding: '12px 16px',
                  display: 'flex', 
                  flexDirection: 'column',
                  flex: 1,
                  minHeight: 0,
                  maxHeight: '100%',
                  height: '100%',
                  overflow: 'hidden',
                  background: 'transparent'
                }}>
                  <div style={{ display: 'flex', gap: 16, flex: 1, minHeight: 0, maxHeight: '100%', overflow: 'hidden' }}>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
                    <Space style={{ marginBottom: 8, flexShrink: 0 }}>
                      <Button 
                        type="primary"
                        size="small" 
                        icon={<BulbOutlined />}
                        loading={perfLoading} 
                        onClick={async () => {
                          if (!selectedDataSourceId && !selectedDataSource?.id) { 
                            message.warning('Select a data source first'); 
                            return; 
                          }
                          if (!sqlQuery || !sqlQuery.trim()) {
                            message.warning('Enter a SQL query to analyze');
                            return;
                          }
                        setPerfLoading(true);
                          setPerfPlan(null);
                          setPerfSuggestions([]);
                          try {
                            const dataSourceId = selectedDataSource?.id || selectedDataSourceId || '';
                            const res = await authenticatedFetch(`/api/data/sources/${dataSourceId}/analyze`, { 
                              method: 'POST', 
                              headers: { 'Content-Type': 'application/json' }, 
                              body: JSON.stringify({ sql: sqlQuery }) 
                            });
                            
                            if (!res.ok) {
                              const errorData = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
                              throw new Error(errorData.error || errorData.detail || `HTTP ${res.status}`);
                            }
                            
                          const j = await res.json();
                            if (j.success) {
                            setPerfPlan(j.plan);
                            setPerfSuggestions(j.suggestions || []);
                              message.success(`Analysis complete${j.suggestions?.length ? ` - ${j.suggestions.length} suggestions` : ''}`);
                            } else {
                              throw new Error(j.error || j.detail || 'Analysis failed');
                            }
                          } catch (e: any) {
                            console.error('Performance analysis failed:', e);
                            message.error(e.message || 'Analysis failed. Please check your query and try again.');
                            setPerfPlan(null);
                            setPerfSuggestions([]);
                          } finally {
                            setPerfLoading(false);
                          }
                        }}
                      >
                        Analyze Query Performance
                      </Button>
                      {perfPlan && (
                        <Button 
                          size="small"
                          icon={<CopyOutlined />}
                          onClick={() => {
                            navigator.clipboard.writeText(JSON.stringify(perfPlan, null, 2));
                            message.success('Execution plan copied to clipboard');
                          }}
                        >
                          Copy Plan
                        </Button>
                      )}
                    </Space>
                      <Card 
                        size="small" 
                        title={
                          <Space>
                            <BulbOutlined />
                            <span>Performance Suggestions</span>
                            {perfSuggestions.length > 0 && (
                              <Badge count={perfSuggestions.length} style={{ backgroundColor: '#52c41a' }} />
                            )}
                          </Space>
                        }
                        style={{ 
                          marginBottom: 8, 
                          flexShrink: 0,
                          background: 'transparent'
                        }}
                        bodyStyle={{ background: 'transparent', padding: '12px' }}
                      >
                        <div className="data-content" style={{ 
                          maxHeight: '200px', 
                          overflowY: 'auto', 
                          overflowX: 'hidden',
                          background: 'transparent',
                          paddingRight: '8px',
                          paddingBottom: '4px',
                          scrollbarGutter: 'stable',
                          scrollBehavior: 'smooth'
                        }}>
                      {perfSuggestions.length ? (
                          <ul style={{ paddingLeft: 18, margin: 0, listStyle: 'disc' }}>
                          {perfSuggestions.map((s, i) => (
                            <li key={i} style={{ fontSize: 12, marginBottom: '6px', lineHeight: '1.5' }}>
                              <CheckCircleOutlined style={{ color: '#52c41a', marginRight: '6px' }} />
                              {s}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <Text type="secondary" style={{ fontSize: 12, background: 'transparent', fontStyle: 'italic' }}>
                          {perfLoading ? 'Analyzing query...' : 'No suggestions yet. Click "Analyze Query Performance" to get optimization tips.'}
                        </Text>
                      )}
                        </div>
                    </Card>
                      <Card 
                        size="small" 
                        title={
                          <Space>
                            <FileTextOutlined />
                            <span>Execution Plan</span>
                            {perfPlan && <Tag color="success">Available</Tag>}
                          </Space>
                        }
                        style={{ 
                          flex: 1, 
                          minHeight: 0, 
                          display: 'flex', 
                          flexDirection: 'column',
                          background: 'transparent'
                        }} 
                        bodyStyle={{ 
                          flex: 1, 
                          minHeight: 0, 
                          padding: '12px', 
                          display: 'flex', 
                          flexDirection: 'column',
                          background: 'transparent'
                        }}
                        extra={perfPlan && (
                          <Button 
                            size="small"
                            type="text"
                            icon={<CopyOutlined />}
                            onClick={() => {
                              navigator.clipboard.writeText(JSON.stringify(perfPlan, null, 2));
                              message.success('Plan copied to clipboard');
                            }}
                          >
                            Copy
                          </Button>
                        )}
                      >
                        <div className="data-content" style={{ 
                          flex: 1, 
                          minHeight: 0, 
                          maxHeight: '100%',
                          overflowY: 'auto',
                          overflowX: 'auto',
                          background: isDarkMode ? 'rgba(0, 0, 0, 0.2)' : 'rgba(0, 0, 0, 0.02)',
                          padding: '12px',
                          borderRadius: '4px',
                          paddingRight: '8px',
                          paddingBottom: '8px',
                          scrollbarGutter: 'stable',
                          scrollBehavior: 'smooth'
                        }}>
                          <pre style={{ 
                            fontSize: 11, 
                            whiteSpace: 'pre-wrap', 
                            margin: 0, 
                            background: 'transparent',
                            fontFamily: 'monospace',
                            lineHeight: '1.5'
                          }}>
                            {perfPlan ? JSON.stringify(perfPlan, null, 2) : (
                              <Text type="secondary" style={{ fontStyle: 'italic' }}>
                                {perfLoading ? 'Generating execution plan...' : 'No execution plan yet. Click "Analyze Query Performance" to generate one.'}
                              </Text>
                            )}
                          </pre>
                        </div>
                    </Card>
                  </div>
                    <div style={{ width: 280, flexShrink: 0 }}>
                    <Card 
                      size="small" 
                      title="Materialized Views"
                      style={{ background: 'transparent' }}
                      bodyStyle={{ background: 'transparent' }}
                    >
                      <Space direction="vertical" style={{ width: '100%' }}>
                        <Button size="small" onClick={async () => {
                          if (!selectedDataSourceId) { message.warning('Select a data source'); return; }
                          const name = prompt('MV name (letters/underscores)');
                          if (!name) return;
                          try {
                            const res = await authenticatedFetch(`/api/data/sources/${selectedDataSourceId}/materialized-views`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, sql: sqlQuery }) });
                            if (!res.ok) throw new Error('Create failed');
                            message.success('Materialized view created');
                          } catch { message.error('Create failed'); }
                        }}>Create MV from SQL</Button>
                        <Button size="small" onClick={async () => {
                          if (!selectedDataSourceId) { message.warning('Select a data source'); return; }
                          try {
                            const res = await authenticatedFetch(`/api/data/sources/${selectedDataSourceId}/materialized-views`);
                            const j = await res.json();
                            if (!res.ok) throw new Error('Load failed');
                            Modal.info({ title: 'Materialized Views', width: 520, content: (
                                <ul className="data-content" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                                {(j.materialized_views||[]).map((mv:any) => <li key={`${mv.schema}.${mv.name}`}>{mv.schema}.{mv.name}</li>)}
                              </ul>
                            )});
                          } catch { message.error('Load failed'); }
                        }}>List MVs</Button>
                      </Space>
                    </Card>
                    </div>
                  </div>
                </div>
              </TabPane>
              
              {/* Chart Preview Tab */}
              <TabPane 
                tab="Chart Preview" 
                key="preview"
              >
                <div style={{ 
                  padding: '0',
                  display: 'flex', 
                  flexDirection: 'column',
                  flex: 1,
                  minHeight: 0,
                  height: '100%',
                  maxHeight: '100%',
                  background: 'transparent',
                  overflow: 'hidden',
                  width: '100%',
                  position: 'relative'
                }}>
                  {previewChart ? (
                      <div style={{ 
                        display: 'flex', 
                      flexDirection: 'row', 
                      flex: 1, 
                      minHeight: 0,
                      height: '100%',
                      overflow: 'hidden',
                      gap: '8px',
                      padding: '8px',
                      width: '100%',
                      boxSizing: 'border-box'
                    }}>
                      {/* Left Column - Chart Area (70% - Larger for better visibility, 2x height) */}
                      <div style={{ 
                        flex: '1 1 70%',
                        minWidth: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        background: 'transparent',
                        overflow: 'hidden',
                        padding: '0',
                        height: '100%',
                        minHeight: 0
                      }}>
                        <div style={{
                          width: '100%',
                          height: '100%',
                          minHeight: 0,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'stretch',
                          justifyContent: 'stretch',
                          overflow: 'hidden',
                          position: 'relative'
                        }}>
                          <ChartWidget
                            key={`chart-${previewChart.id}-${previewChart.config?.chartType || previewChart.type}-${previewChart.config?.colorPalette || 'default'}-${previewChart.config?.legendShow !== false ? 'legend' : 'no-legend'}-${previewChart.config?.tooltipShow !== false ? 'tooltip' : 'no-tooltip'}-${previewChart.config?.showGrid !== false ? 'grid' : 'no-grid'}`}
                            widget={previewChart}
                            config={{
                              ...previewChart.config,
                              padding: 8,
                              responsive: true
                            }}
                            data={previewChart.data || {}}
                            isDarkMode={isDarkMode}
                            showEditableTitle={true}
                            onTitleChange={(newTitle) => {
                              setPreviewChart({
                                ...previewChart,
                                title: newTitle,
                                name: newTitle,
                                config: {
                                  ...previewChart.config,
                                  title: newTitle
                                }
                              });
                            }}
                          />
                        </div>
                      </div>

                      {/* Right Column - Chart Designer Controls (30% - Compact) */}
                      <div style={{ 
                        flex: '0 0 30%',
                        minWidth: 0,
                        maxWidth: '30%',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0',
                        overflow: 'hidden',
                        background: 'transparent',
                        padding: '0',
                        height: '100%',
                        minHeight: 0
                      }}>
                        <div style={{ 
                          background: isDarkMode ? 'var(--ant-color-bg-container)' : 'var(--ant-color-bg-container)',
                          padding: '12px',
                          height: '100%',
                          flex: 1,
                          minHeight: 0,
                          maxHeight: '100%',
                          overflow: 'hidden',
                          display: 'flex',
                          flexDirection: 'column',
                          position: 'relative'
                        }}>
                          <div
                            className="data-content"
                            style={{
                              flex: 1,
                              minHeight: 0,
                              maxHeight: '100%',
                              overflowY: 'auto',
                              overflowX: 'hidden',
                              width: '100%',
                              paddingRight: '8px',
                              paddingBottom: '8px',
                              scrollbarGutter: 'stable',
                              WebkitOverflowScrolling: 'touch',
                              scrollBehavior: 'smooth'
                            }}
                          >
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          <Button 
                            type="primary" 
                            size="small"
                            icon={<BarChartOutlined />}
                                  onClick={async () => {
                                    try {
                                      if (!previewChart) {
                                        message.warning('No chart to add. Please generate a chart first.');
                                        return;
                                      }
                                      if (onChartCreate) {
                                onChartCreate(previewChart);
                                message.success('Chart added to dashboard!');
                                      } else {
                                        const chartTitle = previewChart.title || previewChart.name || 'Untitled Chart';
                                        const assetData = {
                                          asset_type: 'chart',
                                          title: chartTitle,
                                          conversation_id: null,
                                          content: {
                                            type: previewChart.type || previewChart.config?.chartType || 'bar',
                                            config: previewChart.config || {},
                                            data: previewChart.data || {},
                                            query: previewChart.query,
                                            dataSourceId: previewChart.dataSourceId
                                          },
                                          data_source_id: previewChart.dataSourceId || null,
                                          metadata: {
                                            chartType: previewChart.config?.chartType || previewChart.type,
                                            dataSourceId: previewChart.dataSourceId,
                                            query: previewChart.query,
                                            name: chartTitle,
                                            description: `Chart generated from query: ${previewChart.query?.substring(0, 100) || 'N/A'}`,
                                            source: 'query-editor'
                                          }
                                        };
                                        await saveChartAsset(
                                          assetData,
                                          'Chart saved to library! You can add it to a dashboard from the library.'
                                        );
                                      }
                                    } catch (error: any) {
                                      console.error('Error adding chart to dashboard:', error);
                                      message.error(`Failed to add chart: ${error.message || 'Unknown error'}`);
                                    }
                                  }}
                                  style={{ flex: 1, minWidth: '120px' }}
                                >
                                  {onChartCreate ? 'Add to Dashboard' : 'Save to Library'}
                          </Button>
                          <Button 
                            size="small"
                            icon={<SaveOutlined />}
                            onClick={async () => {
                              if (previewChart) {
                                try {
                                        const chartTitle = previewChart.title || previewChart.name || 'Untitled Chart';
                                        const assetData = {
                                          asset_type: 'chart',
                                          title: chartTitle,
                                          conversation_id: null,
                                          content: {
                                            type: previewChart.type || previewChart.config?.chartType || 'bar',
                                            config: previewChart.config || {},
                                            data: previewChart.data || {},
                                            query: previewChart.query,
                                            dataSourceId: previewChart.dataSourceId
                                          },
                                          data_source_id: previewChart.dataSourceId || null,
                                          metadata: {
                                            chartType: previewChart.config?.chartType || previewChart.type,
                                            dataSourceId: previewChart.dataSourceId,
                                            query: previewChart.query,
                                            name: chartTitle,
                                            description: `Chart generated from query: ${previewChart.query?.substring(0, 100) || 'N/A'}`,
                                            source: 'query-editor'
                                          }
                                        };
                                        await saveChartAsset(
                                          assetData,
                                          'Chart saved to library! You can add it to a dashboard from the library.'
                                        );
                                } catch (error) {
                                        // saveChartAsset already handles messaging
                                }
                              }
                            }}
                                  style={{ flex: 1, minWidth: '100px' }}
                          >
                            Save Chart
                          </Button>
                                <Button
                                  size="small"
                                  type="text"
                                  danger
                                  icon={<DeleteOutlined />}
                                  onClick={() => {
                                    Modal.confirm({
                                      title: 'Clear Chart Preview?',
                                      content: 'This will remove the current chart preview. Continue?',
                                      okText: 'Clear',
                                      cancelText: 'Cancel',
                                      onOk: () => {
                                        setPreviewChart(null);
                                        message.info('Chart preview cleared');
                                      }
                                    });
                                  }}
                                >
                                  Clear
                                </Button>
                              </div>

                              <Collapse
                                activeKey={chartDesignerActiveKeys}
                                onChange={handleDesignerCollapseChange}
                                ghost
                                size="small"
                                expandIconPosition="end"
                                style={{ background: 'transparent' }}
                              >
                                <Panel
                                  key="basic"
                                  header={
                                    <div
                                      onMouseEnter={() => handleDesignerPanelHover('basic')}
                                      style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                                    >
                                      <EditOutlined style={{ fontSize: '12px', color: 'var(--ant-color-primary)' }} />
                                      <span style={{ fontSize: '11px', fontWeight: 500 }}>Basic Settings</span>
                                    </div>
                                  }
                                >
                                  <div
                                    onMouseEnter={() => handleDesignerPanelHover('basic')}
                                    onMouseLeave={() => handleDesignerPanelLeave('basic')}
                                  >
                                    <Space direction="vertical" style={{ width: '100%' }} size={8}>
                                      <Input
                                        size="small"
                                        value={previewChart.title || previewChart.name || 'Untitled Chart'}
                                        onChange={(e) => {
                                          const newTitle = e.target.value;
                                          setPreviewChart({
                                            ...previewChart,
                                            title: newTitle,
                                            name: newTitle,
                                            config: {
                                              ...previewChart.config,
                                              title: newTitle
                                            }
                                          });
                                        }}
                                        placeholder="Chart title"
                                        prefix={<EditOutlined style={{ fontSize: '10px', color: 'var(--ant-color-text-tertiary)' }} />}
                                      />
                                      <Select
                                        size="small"
                                        value={previewChart.config?.chartType || 'bar'}
                                        style={{ width: '100%' }}
                                        onChange={(value) => {
                                          try {
                                            if (!previewChart.rawData || previewChart.rawData.length === 0) {
                                              message.warning('Cannot change chart type: no data available');
                                              return;
                                            }
                                            const columns = previewChart.originalColumns || (previewChart.rawData[0] ? Object.keys(previewChart.rawData[0]) : []);
                                            const numericColumns = previewChart.numericColumns || [];
                                            const textColumns = previewChart.textColumns || [];
                                            const dateColumns = previewChart.dateColumns || [];
                                            let preservedXField = previewChart.config?.xAxisField;
                                            let preservedYField = previewChart.config?.yAxisField;
                                            if (!preservedXField || !columns.includes(preservedXField)) {
                                              preservedXField = textColumns[0] || dateColumns[0] || columns[0];
                                            }
                                            if (!preservedYField || !columns.includes(preservedYField)) {
                                              preservedYField = numericColumns[0] || columns.find((col: string) => !textColumns.includes(col) && !dateColumns.includes(col)) || columns[1] || columns[0];
                                            }
                                            const existingConfig = {
                                              ...previewChart.config,
                                              title: previewChart.title || previewChart.name,
                                              xAxisField: preservedXField,
                                              yAxisField: preservedYField,
                                              colorPalette: previewChart.config?.colorPalette,
                                              legendShow: previewChart.config?.legendShow,
                                              tooltipShow: previewChart.config?.tooltipShow,
                                              showGrid: previewChart.config?.showGrid,
                                              animation: previewChart.config?.animation,
                                              aggregation: previewChart.config?.aggregation,
                                              filter: previewChart.config?.filter,
                                              sortOrder: previewChart.config?.sortOrder,
                                              swapAxes: previewChart.config?.swapAxes
                                            };
                                            const chartTypeName = value.charAt(0).toUpperCase() + value.slice(1) + ' Chart';
                                            handleCreateChart(chartTypeName, previewChart.rawData, existingConfig);
                                          } catch (error) {
                                            console.error('Error changing chart type:', error);
                                            message.error('Failed to change chart type');
                                          }
                                        }}
                                      >
                                        <Select.Option value="bar">Bar</Select.Option>
                                        <Select.Option value="line">Line</Select.Option>
                                        <Select.Option value="pie">Pie</Select.Option>
                                        <Select.Option value="scatter">Scatter</Select.Option>
                                      </Select>
                        </Space>
                      </div>
                                </Panel>
                                <Panel
                                  key="data"
                                  header={
                                    <div
                                      onMouseEnter={() => handleDesignerPanelHover('data')}
                                      style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                                    >
                                      <DatabaseOutlined style={{ fontSize: '12px', color: 'var(--ant-color-primary)' }} />
                                      <span style={{ fontSize: '11px', fontWeight: 500 }}>Data Configuration</span>
                                    </div>
                                  }
                                >
                                  <div
                                    onMouseEnter={() => handleDesignerPanelHover('data')}
                                    onMouseLeave={() => handleDesignerPanelLeave('data')}
                                  >
                                    {previewChart.rawData && previewChart.rawData.length > 0 ? (() => {
                                      const columns: string[] = previewChart.originalColumns || (previewChart.rawData[0] ? Object.keys(previewChart.rawData[0]) : []);
                                      const numericColumns: string[] = previewChart.numericColumns || columns.filter((col: string) => {
                                        const val = previewChart.rawData[0]?.[col];
                                        return typeof val === 'number' || (!isNaN(Number(val)) && val !== null && val !== undefined);
                                      });
                                      const textColumns: string[] = previewChart.textColumns || columns.filter((col: string) => {
                                        const val = previewChart.rawData[0]?.[col];
                                        return typeof val === 'string' && isNaN(Number(val)) && val !== null && val !== undefined;
                                      });
                                      const dateColumns: string[] = previewChart.dateColumns || [];
                                      const chartType = previewChart.config?.chartType || 'bar';
                                      const currentXField = previewChart.config?.xAxisField;
                                      const currentYField = previewChart.config?.yAxisField;
                                      const validXField = currentXField && columns.includes(currentXField)
                                        ? currentXField
                                        : (textColumns[0] || dateColumns[0] || columns[0]);
                                      const validYField = currentYField && columns.includes(currentYField)
                                        ? currentYField
                                        : (numericColumns[0] || columns.find((col: string) => !textColumns.includes(col) && !dateColumns.includes(col)) || columns[1] || columns[0]);
                                      const showTransforms = chartType !== 'pie';

                                      return (
                                        <Space direction="vertical" style={{ width: '100%' }} size={10}>
                                          {chartType !== 'pie' && (
                                            <>
                                              <div>
                                                <Text strong style={{ fontSize: '10px', display: 'block', marginBottom: '3px', color: 'var(--ant-color-text-secondary)' }}>
                                                  X-Axis
                                                </Text>
                                                <Select
                                                  size="small"
                                                  value={validXField}
                                                  style={{ width: '100%' }}
                                                  onChange={(value) => {
                                                    try {
                                                      const newConfig = {
                                                        ...previewChart.config,
                                                        xAxisField: value,
                                                        yAxisField: validYField,
                                                        aggregation: previewChart.config?.aggregation || 'none',
                                                        filter: previewChart.config?.filter || '',
                                                        sortOrder: previewChart.config?.sortOrder || 'none',
                                                        swapAxes: previewChart.config?.swapAxes || false
                                                      };
                                                      const chartTypeName = (chartType.charAt(0).toUpperCase() + chartType.slice(1)) + ' Chart';
                                                      handleCreateChart(chartTypeName, previewChart.rawData, newConfig);
                                                    } catch (error) {
                                                      console.error('Error changing X-axis:', error);
                                                      message.error('Failed to update X-axis');
                                                    }
                                                  }}
                                                  showSearch
                                                  filterOption={(input, option) => {
                                                    const label = typeof option?.children === 'string' ? option.children : '';
                                                    return label.toLowerCase().includes(input.toLowerCase());
                                                  }}
                                                >
                                                  {columns.map(col => (
                                                    <Select.Option key={col} value={col}>
                                                      <span>{col}</span>
                                                      {numericColumns.includes(col) && <Tag color="green" style={{ marginLeft: '4px', fontSize: '9px' }}>Numeric</Tag>}
                                                      {textColumns.includes(col) && <Tag color="blue" style={{ marginLeft: '4px', fontSize: '9px' }}>Text</Tag>}
                                                      {dateColumns.includes(col) && <Tag color="purple" style={{ marginLeft: '4px', fontSize: '9px' }}>Date</Tag>}
                                                    </Select.Option>
                                                  ))}
                                                </Select>
                                              </div>
                                              <div>
                                                <Text strong style={{ fontSize: '10px', display: 'block', marginBottom: '3px', color: 'var(--ant-color-text-secondary)' }}>
                                                  Y-Axis
                                                </Text>
                                                <Select
                                                  size="small"
                                                  value={validYField}
                                                  style={{ width: '100%' }}
                                                  onChange={(value) => {
                                                    try {
                                                      const newConfig = {
                                                        ...previewChart.config,
                                                        yAxisField: value,
                                                        xAxisField: validXField,
                                                        aggregation: previewChart.config?.aggregation || 'none',
                                                        filter: previewChart.config?.filter || '',
                                                        sortOrder: previewChart.config?.sortOrder || 'none',
                                                        swapAxes: previewChart.config?.swapAxes || false
                                                      };
                                                      const chartTypeName = (chartType.charAt(0).toUpperCase() + chartType.slice(1)) + ' Chart';
                                                      handleCreateChart(chartTypeName, previewChart.rawData, newConfig);
                                                    } catch (error) {
                                                      console.error('Error changing Y-axis:', error);
                                                      message.error('Failed to update Y-axis');
                                                    }
                                                  }}
                                                  showSearch
                                                  filterOption={(input, option) => {
                                                    const label = typeof option?.children === 'string' ? option.children : '';
                                                    return label.toLowerCase().includes(input.toLowerCase());
                                                  }}
                                                >
                                                  {columns.map(col => (
                                                    <Select.Option key={col} value={col}>
                                                      <span>{col}</span>
                                                      {numericColumns.includes(col) && <Tag color="green" style={{ marginLeft: '4px', fontSize: '9px' }}>Numeric</Tag>}
                                                      {textColumns.includes(col) && <Tag color="blue" style={{ marginLeft: '4px', fontSize: '9px' }}>Text</Tag>}
                                                      {dateColumns.includes(col) && <Tag color="purple" style={{ marginLeft: '4px', fontSize: '9px' }}>Date</Tag>}
                                                    </Select.Option>
                                                  ))}
                                                </Select>
                                              </div>
                                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <Text style={{ fontSize: '10px' }}>Switch Rows/Columns</Text>
                                                <Switch
                                                  size="small"
                                                  checked={previewChart.config?.swapAxes || false}
                                                  onChange={(checked) => {
                                                    const newConfig = {
                                                      ...previewChart.config,
                                                      swapAxes: checked,
                                                      xAxisField: checked ? validYField : validXField,
                                                      yAxisField: checked ? validXField : validYField
                                                    };
                                                    const chartTypeName = (chartType.charAt(0).toUpperCase() + chartType.slice(1)) + ' Chart';
                                                    handleCreateChart(chartTypeName, previewChart.rawData, newConfig);
                                                  }}
                                                />
                                              </div>
                                            </>
                                          )}
                                          {showTransforms && (
                                            <>
                                              <Divider plain style={{ margin: '4px 0', fontSize: '10px' }}>Data Transformations</Divider>
                                              <Select
                                                size="small"
                                                value={previewChart.config?.aggregation || 'none'}
                                                style={{ width: '100%' }}
                                                onChange={(value) => {
                                                  try {
                                                    const newConfig = {
                                                      ...previewChart.config,
                                                      aggregation: value,
                                                      xAxisField: previewChart.config?.xAxisField,
                                                      yAxisField: previewChart.config?.yAxisField,
                                                      filter: previewChart.config?.filter || '',
                                                      sortOrder: previewChart.config?.sortOrder || 'none',
                                                      swapAxes: previewChart.config?.swapAxes || false
                                                    };
                                                    const chartTypeName = (chartType.charAt(0).toUpperCase() + chartType.slice(1)) + ' Chart';
                                                    handleCreateChart(chartTypeName, previewChart.rawData, newConfig);
                                                  } catch (error) {
                                                    console.error('Error changing aggregation:', error);
                                                    message.error('Failed to update aggregation');
                                                  }
                                                }}
                                              >
                                                <Select.Option value="none">No Aggregation</Select.Option>
                                                <Select.Option value="sum">Sum</Select.Option>
                                                <Select.Option value="avg">Average</Select.Option>
                                                <Select.Option value="count">Count</Select.Option>
                                                <Select.Option value="min">Min</Select.Option>
                                                <Select.Option value="max">Max</Select.Option>
                                              </Select>
                                              <Input
                                                size="small"
                                                placeholder="Filter e.g. value > 100"
                                                value={previewChart.config?.filter || ''}
                                                onChange={(e) => {
                                                  const updatedConfig = { ...previewChart.config, filter: e.target.value };
                                                  setPreviewChart({
                                                    ...previewChart,
                                                    config: updatedConfig
                                                  });
                                                }}
                                                onPressEnter={() => {
                                                  const chartTypeName = ((previewChart.config?.chartType || 'bar').charAt(0).toUpperCase() + (previewChart.config?.chartType || 'bar').slice(1)) + ' Chart';
                                                  handleCreateChart(chartTypeName, previewChart.rawData, previewChart.config);
                                                }}
                                                onBlur={() => {
                                                  const chartTypeName = ((previewChart.config?.chartType || 'bar').charAt(0).toUpperCase() + (previewChart.config?.chartType || 'bar').slice(1)) + ' Chart';
                                                  handleCreateChart(chartTypeName, previewChart.rawData, previewChart.config);
                                                }}
                                              />
                                              <Select
                                                size="small"
                                                value={previewChart.config?.sortOrder || 'none'}
                                                style={{ width: '100%' }}
                                                onChange={(value) => {
                                                  try {
                                                    const newConfig = {
                                                      ...previewChart.config,
                                                      sortOrder: value,
                                                      xAxisField: previewChart.config?.xAxisField,
                                                      yAxisField: previewChart.config?.yAxisField,
                                                      aggregation: previewChart.config?.aggregation || 'none',
                                                      filter: previewChart.config?.filter || '',
                                                      swapAxes: previewChart.config?.swapAxes || false
                                                    };
                                                    const chartTypeName = (chartType.charAt(0).toUpperCase() + chartType.slice(1)) + ' Chart';
                                                    handleCreateChart(chartTypeName, previewChart.rawData, newConfig);
                                                  } catch (error) {
                                                    console.error('Error changing sort order:', error);
                                                    message.error('Failed to update sort order');
                                                  }
                                                }}
                                              >
                                                <Select.Option value="none">Original Order</Select.Option>
                                                <Select.Option value="asc">Ascending</Select.Option>
                                                <Select.Option value="desc">Descending</Select.Option>
                                              </Select>
                                            </>
                                          )}
                                        </Space>
                                      );
                                    })() : (
                                      <Text type="secondary" style={{ fontSize: '11px' }}>
                                        Execute a query to configure axes.
                                      </Text>
                                    )}
                                  </div>
                                </Panel>
                                <Panel
                                  key="display"
                                  header={
                                    <div
                                      onMouseEnter={() => handleDesignerPanelHover('display')}
                                      style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                                    >
                                      <SettingOutlined style={{ fontSize: '12px', color: 'var(--ant-color-primary)' }} />
                                      <span style={{ fontSize: '11px', fontWeight: 500 }}>Display & Styling</span>
                                    </div>
                                  }
                                >
                                  <div
                                    onMouseEnter={() => handleDesignerPanelHover('display')}
                                    onMouseLeave={() => handleDesignerPanelLeave('display')}
                                  >
                                    <Space direction="vertical" style={{ width: '100%' }} size={8}>
                                      <Select
                                        size="small"
                                        value={previewChart.config?.colorPalette || 'default'}
                                        style={{ width: '100%' }}
                                        onChange={(value) => {
                                          setPreviewChart({
                                            ...previewChart,
                                            config: { ...previewChart.config, colorPalette: value }
                                          });
                                          setTimeout(() => {
                                            setPreviewChart((prev: any) => ({ ...prev, config: { ...prev.config, colorPalette: value } }));
                                          }, 0);
                                        }}
                                      >
                                        <Select.Option value="default">Default</Select.Option>
                                        <Select.Option value="vibrant">Vibrant</Select.Option>
                                        <Select.Option value="pastel">Pastel</Select.Option>
                                        <Select.Option value="monochrome">Monochrome</Select.Option>
                                        <Select.Option value="cool">Cool</Select.Option>
                                        <Select.Option value="warm">Warm</Select.Option>
                                      </Select>
                                      {(() => {
                                        const chartType = previewChart.config?.chartType || 'bar';
                                        const legendSupported = !['scatter', 'gauge', 'heatmap'].includes(chartType);
                                        return (
                                          <Space direction="vertical" size={6} style={{ width: '100%' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                              <Text style={{ fontSize: '10px' }}>Show Legend</Text>
                                              <Tooltip title={legendSupported ? '' : 'Legends are disabled for this chart type'}>
                                                <Switch
                                                  size="small"
                                                  disabled={!legendSupported}
                                                  checked={legendSupported ? previewChart.config?.legendShow !== false : false}
                                                  onChange={(checked) => {
                                                    if (!legendSupported) return;
                                                    setPreviewChart({
                                                      ...previewChart,
                                                      config: { ...previewChart.config, legendShow: checked }
                                                    });
                                                    setTimeout(() => {
                                                      setPreviewChart((prev: any) => ({ ...prev, config: { ...prev.config, legendShow: checked } }));
                                                    }, 0);
                                                  }}
                                                />
                                              </Tooltip>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                              <Text style={{ fontSize: '10px' }}>Show Tooltip</Text>
                                              <Switch
                                                size="small"
                                                checked={previewChart.config?.tooltipShow !== false}
                                                onChange={(checked) => {
                                                  setPreviewChart({
                                                    ...previewChart,
                                                    config: { ...previewChart.config, tooltipShow: checked }
                                                  });
                                                  setTimeout(() => {
                                                    setPreviewChart((prev: any) => ({ ...prev, config: { ...prev.config, tooltipShow: checked } }));
                                                  }, 0);
                                                }}
                                              />
                                            </div>
                                            {previewChart.config?.chartType !== 'pie' && (
                                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <Text style={{ fontSize: '10px' }}>Show Grid</Text>
                                                <Switch
                                                  size="small"
                                                  checked={previewChart.config?.showGrid !== false}
                                                  onChange={(checked) => {
                                                    setPreviewChart({
                                                      ...previewChart,
                                                      config: { ...previewChart.config, showGrid: checked }
                                                    });
                                                    setTimeout(() => {
                                                      setPreviewChart((prev: any) => ({ ...prev, config: { ...prev.config, showGrid: checked } }));
                                                    }, 0);
                                                  }}
                                                />
                                              </div>
                                            )}
                                          </Space>
                                        );
                                      })()}
                                    </Space>
                                  </div>
                                </Panel>
                              </Collapse>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="data-content" style={{ 
                      flex: 1,
                      minHeight: 0,
                      display: 'flex', 
                      flexDirection: 'column',
                      alignItems: 'center', 
                      justifyContent: 'center',
                      color: 'var(--ant-color-text-secondary)',
                      padding: '32px 20px',
                      background: 'transparent',
                      border: `1px dashed ${isDarkMode ? 'var(--ant-color-border)' : 'var(--ant-color-border-secondary)'}`,
                      borderRadius: '6px',
                      overflow: 'auto'
                    }}>
                      <BarChartOutlined style={{ fontSize: '40px', marginBottom: '12px', opacity: 0.4, color: 'var(--ant-color-text-tertiary)' }} />
                      <Title level={5} style={{ color: 'var(--ant-color-text-secondary)', marginBottom: '6px', fontWeight: 500 }}>
                        No Chart Preview
                      </Title>
                      <Text style={{ color: 'var(--ant-color-text-tertiary)', textAlign: 'center', maxWidth: '350px', fontSize: '13px' }}>
                        Execute a query and click "Generate Chart" in the Query Results tab to see a preview here.
                      </Text>
                    </div>
                  )}
                </div>
              </TabPane>
              
              <TabPane tab="Query History" key="history">
                <div style={{ 
                  padding: '12px 16px',
                  display: 'flex', 
                  flexDirection: 'column',
                  flex: 1,
                  minHeight: 0,
                  background: 'transparent'
                }}>
                  <div className="data-content" style={{ flex: 1, minHeight: 0, overflow: 'auto', background: 'transparent' }}>
                  <Table
                    dataSource={queryHistory}
                    columns={historyColumns}
                    size="small"
                    pagination={false}
                      scroll={{ y: 'calc(100vh - 600px)' }}
                      style={{ background: 'transparent' }}
                      className="query-history-table"
                    onRow={(record) => ({
                      style: { cursor: 'pointer' }
                    })}
                  />
                  </div>
                </div>
              </TabPane>
            </Tabs>
          </div>
          </div>
        </div>
        {/* Data Sources Panel on Right */}
        <div style={{
          width: isStackedLayout ? '100%' : effectiveSidebarCollapsed ? '64px' : '320px',
          minWidth: isStackedLayout ? '100%' : effectiveSidebarCollapsed ? '64px' : '320px',
          minHeight: isStackedLayout ? 'auto' : '100%',
          borderLeft: !isStackedLayout && !effectiveSidebarCollapsed ? `1px solid ${isDarkMode ? 'var(--ant-color-border)' : 'var(--ant-color-border-secondary)'}` : 'none',
          borderTop: isStackedLayout ? `1px solid ${isDarkMode ? 'var(--ant-color-border)' : 'var(--ant-color-border-secondary)'}` : 'none',
          background: 'var(--layout-panel-background, var(--ant-color-bg-container))',
          transition: 'all 0.3s ease',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          marginTop: isStackedLayout ? 16 : 0,
          order: isStackedLayout ? 2 : 0
        }}>
          {!isStackedLayout && effectiveSidebarCollapsed ? (
            <div style={{
              padding: '16px 8px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '16px',
              background: 'var(--ant-color-bg-container)',
              border: '1px solid var(--ant-color-border)',
              borderRadius: 'var(--ant-border-radius-lg)',
              height: '100%',
              boxShadow: 'var(--ant-box-shadow)'
            }}>
              <Tooltip title="Expand Data Panel" placement="left">
                <Button
                  type="text"
                  size="small"
                  icon={<ExpandOutlined />}
                  onClick={() => {
                    setSidebarCollapsed(false);
                    try {
                      window.localStorage.setItem('sidebarCollapsed', 'false');
                    } catch {}
                    try {
                      window.dispatchEvent(new CustomEvent('sidebar-collapse-changed', { detail: { collapsed: false } }));
                    } catch {}
                  }}
                  style={{ width: '100%', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                />
              </Tooltip>
              <Tooltip title="Add Data Source" placement="left">
                <Button 
                  type="text" 
                  size="small" 
                  icon={<PlusOutlined />}
                  onClick={() => setShowConnectDataModal(true)}
                  style={{ width: '100%', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                />
              </Tooltip>
              <Tooltip title="Data Sources" placement="left">
                <DatabaseOutlined style={{ fontSize: '20px', color: 'var(--ant-color-primary)' }} />
              </Tooltip>
            </div>
          ) : (
            <EnhancedDataPanel
              onCollapse={() => {
                setSidebarCollapsed(true);
                try {
                  window.localStorage.setItem('sidebarCollapsed', 'true');
                } catch {}
                try {
                  window.dispatchEvent(new CustomEvent('sidebar-collapse-changed', { detail: { collapsed: true } }));
                } catch {}
              }}
              compact={false}
            />
          )}
        </div>
      </div>

      {/* Connect Data Modal */}
      <UniversalDataSourceModal
        isOpen={showConnectDataModal}
        onClose={() => setShowConnectDataModal(false)}
        onDataSourceCreated={() => {
          setShowConnectDataModal(false);
          refreshDataSources();
        }}
      />

      {/* Saved Queries Modal - Consolidated */}
      <Modal
        open={showSavedModal}
        title="Saved Queries & Snapshots"
        onCancel={() => setShowSavedModal(false)}
        footer={null}
        width={900}
      >
        <Tabs
          defaultActiveKey="saved"
          items={[
            {
              key: 'saved',
              label: `Saved Queries (${savedQueries.length})`,
              children: (
                <div>
        <div style={{ marginBottom: 12, display: 'flex', gap: 8 }}>
                    <Input 
                      placeholder="Query name (or use tab name)" 
                      style={{ width: 240 }} 
                      id="save-query-name" 
                      defaultValue={queryTabs.find(t => t.key === activeQueryKey)?.title}
                    />
          <Button
            type="primary"
            icon={<SaveOutlined />}
            onClick={async () => {
              const nameInput = document.getElementById('save-query-name') as HTMLInputElement | null;
                        const currentTab = queryTabs.find(t => t.key === activeQueryKey);
                        const name = nameInput?.value?.trim() || currentTab?.title || `Query ${Date.now()}`;
              try {
                const res = await authenticatedFetch(`/api/queries/saved-queries`, {
                            method: 'POST', 
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ 
                              name, 
                              sql: sqlQuery, 
                              metadata: { 
                                activeQueryKey,
                                language: resolveLanguage(currentTab?.language ?? editorLanguage),
                                tabKey: currentTab?.key
                              } 
                            })
                          });
                          if (res.status === 403 || res.status === 401) { 
                            setPermissionModalVisible(true); 
                            return; 
                          }
                          if (!res.ok) throw new Error('Failed to save');
                          message.success(`Query "${name}" saved successfully`);
                const reload = await authenticatedFetch(`/api/queries/saved-queries`);
                          if (reload.ok) { 
                            const j = await reload.json(); 
                            setSavedQueries(Array.isArray(j.items) ? j.items : []); 
                          }
                if (nameInput) nameInput.value = '';
                        } catch (err: any) {
                          message.error(err.message || 'Save failed');
                        }
            }}
                    >Save Current Query</Button>
        </div>
        <Table
                    dataSource={savedQueries}
                    rowKey={(r) => r.id || r.name}
                    size="small"
                    pagination={{ pageSize: 10 }}
                    columns={[
                      { title: 'Name', dataIndex: 'name', key: 'name' },
                      { 
                        title: 'Query', 
                        dataIndex: 'sql', 
                        key: 'sql',
                        render: (text: string) => (
                          <Text code style={{ fontSize: '12px', maxWidth: '400px', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {text?.substring(0, 100)}{text?.length > 100 ? '...' : ''}
                          </Text>
                        )
                      },
                      { 
                        title: 'Language', 
                        dataIndex: ['metadata', 'language'], 
                        key: 'language',
                        render: (lang: string) => <Tag>{lang?.toUpperCase() || 'SQL'}</Tag>
                      },
                      { title: 'Created', dataIndex: 'created_at', key: 'created_at', render: (v: string) => v ? new Date(v).toLocaleString() : '-' },
                      {
                        title: 'Actions',
                        key: 'actions',
                        render: (_: any, record: any) => (
                          <Space>
                            <Button
                              size="small"
                              icon={<EditOutlined />}
                              onClick={() => {
                                // Load query into a new tab
                                const newKey = `q-${Date.now()}`;
                                const metadata = record.metadata || {};
                                const language = resolveLanguage(metadata.language);
                                const baseSql = record.sql || DEFAULT_SQL_SNIPPET;
                                const pythonContent = language === 'python'
                                  ? baseSql
                                  : buildPythonTemplate(baseSql, selectedDataSource?.name);
                                const newTab = {
                                  key: newKey,
                                  title: record.name,
                                  sql: language === 'python' ? DEFAULT_SQL_SNIPPET : baseSql,
                                  python: pythonContent,
                                  language
                                };
                                setQueryTabs(prev => [...prev, newTab]);
                                setActiveQueryKey(newKey);
                                setEditorLanguage(language);
                                setSqlQuery(language === 'python' ? pythonContent : baseSql);
                                setShowSavedModal(false);
                                message.success(`Query "${record.name}" loaded into new tab`);
                              }}
                            >
                              Load to Tab
                            </Button>
                            <Button
                              size="small"
                              onClick={() => {
                                // Load directly into current tab
                                const metadata = record.metadata || {};
                                const language = resolveLanguage(metadata.language);
                                const baseSql = record.sql || DEFAULT_SQL_SNIPPET;
                                const pythonContent = language === 'python'
                                  ? baseSql
                                  : buildPythonTemplate(baseSql, selectedDataSource?.name);
                                setEditorLanguage(language);
                                setSqlQuery(language === 'python' ? pythonContent : baseSql);
                                // Update current tab
                                setQueryTabs(prev => prev.map(t => 
                                  t.key === activeQueryKey 
                                    ? { 
                                        ...t, 
                                        title: record.name, 
                                        sql: language === 'python' ? DEFAULT_SQL_SNIPPET : baseSql,
                                        python: pythonContent,
                                        language 
                                      }
                                    : t
                                ));
                                setShowSavedModal(false);
                                message.success(`Query "${record.name}" loaded`);
                              }}
                            >
                              Load Here
                            </Button>
                            <Button
                              size="small"
                              danger
                              icon={<DeleteOutlined />}
                              onClick={async () => {
                                try {
                                  const res = await authenticatedFetch(`/api/queries/saved-queries/${record.id}`, {
                                    method: 'DELETE'
                                  });
                                  if (!res.ok) throw new Error('Failed to delete');
                                  message.success('Query deleted');
                                  const reload = await authenticatedFetch(`/api/queries/saved-queries`);
                                  if (reload.ok) { 
                                    const j = await reload.json(); 
                                    setSavedQueries(Array.isArray(j.items) ? j.items : []); 
                                  }
                                } catch (err: any) {
                                  message.error(err.message || 'Delete failed');
                                }
                              }}
                            >
                              Delete
                            </Button>
                          </Space>
                        )
                      }
                    ]}
                  />
                </div>
              )
            },
            {
              key: 'snapshots',
              label: `Snapshots (${snapshots.length})`,
              children: (
                <div>
                  <div style={{ marginBottom: 12, fontSize: 12, color: 'var(--ant-color-text-secondary)' }}>
                    Snapshots include query results and can be bound to widgets
                  </div>
                  <Table
                    dataSource={snapshots}
          rowKey={(r) => r.id}
          size="small"
                    pagination={{ pageSize: 10 }}
          columns={[
            { title: 'Name', dataIndex: 'name', key: 'name' },
                      { 
                        title: 'Query', 
                        dataIndex: 'sql', 
                        key: 'sql',
                        render: (text: string) => (
                          <Text code style={{ fontSize: '12px', maxWidth: '400px', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {text?.substring(0, 100)}{text?.length > 100 ? '...' : ''}
                          </Text>
                        )
                      },
            { title: 'Created', dataIndex: 'created_at', key: 'created_at', render: (v: string) => v ? new Date(v).toLocaleString() : '-' },
                      {
                        title: 'Actions',
                        key: 'actions',
                        render: (_: any, r: any) => (
              <Space>
                            <Button
                              size="small"
                              icon={<EditOutlined />}
                              onClick={() => {
                                // Load snapshot query into a new tab
                                const newKey = `q-${Date.now()}`;
                                const baseSql = r.sql || DEFAULT_SQL_SNIPPET;
                                const newTab = {
                                  key: newKey,
                                  title: r.name || 'Snapshot',
                                  sql: baseSql,
                                  python: buildPythonTemplate(baseSql, selectedDataSource?.name),
                                  language: 'sql' as QueryLanguage
                                };
                                setQueryTabs(prev => [...prev, newTab]);
                                setActiveQueryKey(newKey);
                                setEditorLanguage('sql');
                                setSqlQuery(baseSql);
                                setShowSavedModal(false);
                                message.success(`Snapshot "${r.name}" loaded into new tab`);
                              }}
                            >
                              Load Query to Tab
                            </Button>
                            <Button 
                              size="small" 
                              onClick={() => {
                                // Load snapshot rows into results
                  try {
                    const rows = r.rows || [];
                    if (Array.isArray(rows) && rows.length) {
                      setResults(rows);
                      setActiveTab('results');
                                    setShowSavedModal(false);
                      message.success('Snapshot loaded into results');
                    } else {
                      message.warning('Snapshot has no rows to load');
                    }
                                } catch (e) { 
                                  message.error('Failed to load snapshot'); 
                                }
                              }}
                            >
                              Load Results
                            </Button>
                            <Button
                              size="small"
                              danger
                              icon={<DeleteOutlined />}
                              onClick={async () => {
                                try {
                                  const res = await authenticatedFetch(`/api/queries/snapshots/${r.id}`, {
                                    method: 'DELETE',
                                    headers: { 'Content-Type': 'application/json' }
                                  });
                                  if (res.status === 403 || res.status === 401) {
                                    setPermissionModalVisible(true);
                                    return;
                                  }
                                  if (!res.ok) {
                                    const errorData = await res.json().catch(() => ({ detail: res.statusText }));
                                    throw new Error(errorData.detail || errorData.error || 'Failed to delete');
                                  }
                                  message.success('Snapshot deleted successfully');
                                  const reload = await authenticatedFetch(`/api/queries/snapshots`);
                                  if (reload.ok) {
                                    const j = await reload.json();
                                    setSnapshots(Array.isArray(j.items) ? j.items : []);
                                  }
                                } catch (err: any) {
                                  message.error(err.message || 'Delete failed');
                                }
                              }}
                            >
                              Delete
                            </Button>
              </Space>
                        )
                      }
                    ]}
                  />
                </div>
              )
            }
          ]}
        />
      </Modal>

      {/* Permission / Invite Modal */}
      <Modal
        open={permissionModalVisible}
        title="Request Access"
        onCancel={() => setPermissionModalVisible(false)}
        footer={null}
      >
        <div style={{ marginBottom: 12 }}>
          <Text>You're missing permissions to perform this action. Request access from your organization admin by entering their email below.</Text>
        </div>
        <Input placeholder="Admin email" value={permEmail} onChange={(e) => setPermEmail(e.target.value)} />
        <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button onClick={() => setPermissionModalVisible(false)}>Cancel</Button>
          <Button type="primary" loading={permLoading} onClick={async () => {
            setPermLoading(true);
            try {
              // Send a lightweight access request to the backend (endpoint to implement)
              await authenticatedFetch(`/api/organization/request-access`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: permEmail }) });
              message.success('Access request sent');
              setPermissionModalVisible(false);
            } catch {
              message.error('Failed to send request');
            } finally { setPermLoading(false); }
          }}>Request Access</Button>
        </div>
      </Modal>

      {/* Schedule Modal */}
      <Modal
        open={showScheduleModal}
        title="Schedule Query"
        onCancel={() => setShowScheduleModal(false)}
        footer={null}
        width={640}
      >
        <Form layout="inline" onFinish={async (vals) => {
          try {
            const res = await authenticatedFetch(`/api/queries/schedules`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name: vals.name, sql: sqlQuery, cron: vals.cron, enabled: true })
            });
            if (!res.ok) throw new Error('Failed');
            message.success('Scheduled');
            const reload = await authenticatedFetch(`/api/queries/schedules`);
            if (reload.ok) { const j = await reload.json(); setSchedules(Array.isArray(j.items) ? j.items : []); }
          } catch { message.error('Schedule failed'); }
        }}>
          <Form.Item name="name" rules={[{ required: true }]}>
            <Input placeholder="Schedule name" />
          </Form.Item>
          <Form.Item name="cron" rules={[{ required: true }]}>
            <Input placeholder="Cron (e.g., 0 9 * * 1)" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit">Create</Button>
          </Form.Item>
        </Form>
        <Divider />
        <Table
          dataSource={schedules}
          rowKey={(r) => r.id}
          size="small"
          pagination={false}
          columns={[
            { title: 'Name', dataIndex: 'name', key: 'name' },
            { title: 'Cron', dataIndex: 'cron', key: 'cron' },
            { title: 'Enabled', dataIndex: 'enabled', key: 'enabled', render: (v: boolean) => v ? 'Yes' : 'No' },
            { title: 'Last Run', dataIndex: 'last_run_at', key: 'last_run_at', render: (v: string) => v ? new Date(v).toLocaleString() : '-' }
          ]}
          className="data-content"
          style={{ maxHeight: 300, overflow: 'auto' }}
        />
      </Modal>

    </div>
  );
};

export default MonacoSQLEditor;
