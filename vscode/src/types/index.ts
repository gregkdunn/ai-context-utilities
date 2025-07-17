// Enhanced types for real-time streaming functionality

export interface NxProject {
    name: string;
    root: string;
    projectType: 'application' | 'library';
    targets?: Record<string, any>;
}

export interface CommandOptions {
    project?: string;
    quick?: boolean;
    fullContext?: boolean;
    noDiff?: boolean;
    focus?: 'tests' | 'types' | 'performance';
    useExpected?: boolean;
    fullOutput?: boolean;
}

export interface CommandResult {
    success: boolean;
    exitCode: number;
    output: string;
    error?: string;
    outputFiles?: string[];
    duration: number;
}

export interface ActionButton {
    id: 'aiDebug' | 'nxTest' | 'gitDiff' | 'prepareToPush';
    label: string;
    icon: string;
    status: 'idle' | 'running' | 'success' | 'error';
    lastRun?: Date;
    enabled: boolean;
    progress?: number; // 0-100 for progress indication
}

// New streaming-related types
export interface StreamingMessage {
    type: 'output' | 'error' | 'progress' | 'status' | 'complete';
    data: {
        text?: string;
        progress?: number;
        status?: string;
        result?: CommandResult;
        actionId?: string;
    };
    timestamp: Date;
}

export interface WebviewMessage {
    command: 'runCommand' | 'getStatus' | 'openFile' | 'getProjects' | 'setProject' | 'cancelCommand' | 'clearOutput';
    data: {
        action?: 'aiDebug' | 'nxTest' | 'gitDiff' | 'prepareToPush';
        project?: string;
        options?: CommandOptions;
        filePath?: string;
    };
}

export interface WebviewState {
    currentProject?: string;
    projects: NxProject[];
    actions: Record<string, ActionButton>;
    outputFiles: Record<string, string>;
    lastRun?: {
        action: string;
        timestamp: Date;
        success: boolean;
    };
    // New streaming state
    isStreaming: boolean;
    currentOutput: string;
    currentAction?: string;
}

export type OutputType = 'ai-debug-context' | 'jest-output' | 'diff' | 'pr-description';

export interface DebugContext {
    testStatus: 'passing' | 'failing' | 'unknown';
    hasFailures: boolean;
    changedFiles: string[];
    lintStatus: 'passed' | 'failed' | 'unknown';
    formatStatus: 'passed' | 'failed' | 'unknown';
}

export interface PRContext {
    testsPassing: boolean;
    lintPassing: boolean;
    formatApplied: boolean;
    changedFiles: string[];
    projectName: string;
}

// Event emitter interface for streaming
export interface StreamingEventEmitter {
    on(event: 'output', listener: (data: string) => void): void;
    on(event: 'error', listener: (data: string) => void): void;
    on(event: 'progress', listener: (progress: number) => void): void;
    on(event: 'status', listener: (status: string) => void): void;
    on(event: 'complete', listener: (result: CommandResult) => void): void;
    emit(event: string, ...args: any[]): boolean;
    removeAllListeners(): void;
}

// Phase 4: Advanced Integration Types

// Collaboration Types
export interface Session {
    id: string;
    name: string;
    participants: Participant[];
    sharedState: SharedState;
    createdAt: Date;
    expiresAt: Date;
    isActive: boolean;
    owner: Participant;
}

export interface Participant {
    id: string;
    name: string;
    email?: string;
    role: 'owner' | 'collaborator' | 'viewer';
    joinedAt: Date;
    isOnline: boolean;
    cursor?: CursorPosition;
}

export interface SharedState {
    currentProject: string;
    activeCommands: CommandExecution[];
    annotations: Annotation[];
    cursorPositions: Record<string, CursorPosition>;
    sharedFiles: SharedFile[];
    chatMessages: ChatMessage[];
}

export interface CommandExecution {
    id: string;
    action: 'aiDebug' | 'nxTest' | 'gitDiff' | 'prepareToPush';
    project: string;
    status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
    startTime: Date;
    endTime?: Date;
    progress: number;
    output: string[];
    error?: string;
    initiator: Participant;
    sharedWith: string[]; // Participant IDs
}

export interface Annotation {
    id: string;
    type: 'comment' | 'suggestion' | 'issue' | 'resolved';
    content: string;
    author: Participant;
    createdAt: Date;
    position: {
        file?: string;
        line?: number;
        column?: number;
    };
    replies: AnnotationReply[];
    resolved: boolean;
}

export interface AnnotationReply {
    id: string;
    content: string;
    author: Participant;
    createdAt: Date;
}

export interface CursorPosition {
    file: string;
    line: number;
    column: number;
    selection?: {
        start: { line: number; column: number };
        end: { line: number; column: number };
    };
}

export interface SharedFile {
    path: string;
    content: string;
    lastModified: Date;
    modifiedBy: Participant;
    isLocked: boolean;
    lockOwner?: Participant;
}

export interface ChatMessage {
    id: string;
    content: string;
    author: Participant;
    timestamp: Date;
    type: 'text' | 'command' | 'result' | 'system';
    metadata?: Record<string, any>;
}

// AI Insights Types
export interface Insight {
    id: string;
    type: 'performance' | 'quality' | 'suggestion' | 'warning' | 'error';
    title: string;
    description: string;
    actionable: boolean;
    suggestions: ActionSuggestion[];
    confidence: number; // 0-1
    timestamp: Date;
    category: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    context: InsightContext;
}

export interface ActionSuggestion {
    id: string;
    title: string;
    description: string;
    action: {
        type: 'command' | 'file-edit' | 'configuration' | 'external';
        data: Record<string, any>;
    };
    estimatedImpact: 'low' | 'medium' | 'high';
    estimatedEffort: 'minutes' | 'hours' | 'days';
}

export interface InsightContext {
    project: string;
    files: string[];
    commands: string[];
    timeRange: {
        start: Date;
        end: Date;
    };
    metrics: Record<string, number>;
}

export interface CommandSuggestion {
    command: 'aiDebug' | 'nxTest' | 'gitDiff' | 'prepareToPush';
    reason: string;
    confidence: number; // 0-1
    estimatedImpact: 'low' | 'medium' | 'high';
    context: {
        trigger: string;
        relatedFiles: string[];
        similarPatterns: string[];
    };
    options?: CommandOptions;
}

// Phase 4 Service Interfaces
export interface CollaborationService {
    createSession(config: SessionConfig): Promise<Session>;
    joinSession(sessionId: string, participant: Participant): Promise<void>;
    leaveSession(sessionId: string, participantId: string): Promise<void>;
    shareCommand(sessionId: string, command: CommandExecution): Promise<void>;
    syncState(sessionId: string, state: SharedState): Promise<void>;
    addAnnotation(sessionId: string, annotation: Annotation): Promise<void>;
    updateCursor(sessionId: string, participantId: string, position: CursorPosition): Promise<void>;
    sendChatMessage(sessionId: string, message: ChatMessage): Promise<void>;
    getSessions(): Promise<Session[]>;
    getSession(sessionId: string): Promise<Session | null>;
    deleteSession(sessionId: string): Promise<void>;
}

export interface AIInsightsEngine {
    analyzePattern(data: AnalysisData): Promise<Insight[]>;
    suggestCommand(context: ExecutionContext): Promise<CommandSuggestion[]>;
    generateReport(criteria: ReportCriteria): Promise<Report>;
    processNaturalLanguageQuery(query: string): Promise<QueryResult>;
    predictFailures(projectData: any): Promise<PredictionResult[]>;
    optimizeWorkflow(history: CommandExecution[]): Promise<WorkflowOptimization>;
}

export interface SessionConfig {
    name: string;
    description?: string;
    maxParticipants: number;
    duration: number; // in minutes
    permissions: {
        canExecuteCommands: boolean;
        canEditFiles: boolean;
        canAddAnnotations: boolean;
        canInviteOthers: boolean;
    };
    project?: string;
    autoShareCommands: boolean;
}

export interface AnalysisData {
    commandHistory: CommandExecution[];
    projectFiles: string[];
    gitHistory: GitCommit[];
    testResults: TestResult[];
    performanceMetrics: PerformanceMetric[];
    errorPatterns: ErrorPattern[];
}

export interface ExecutionContext {
    project: string;
    currentFiles: string[];
    recentCommands: CommandExecution[];
    gitStatus: GitStatus;
    testStatus: TestStatus;
    timestamp: Date;
}

export interface ReportCriteria {
    timeRange: TimeRange;
    projects?: string[];
    commands?: string[];
    users?: string[];
    includeMetrics: string[];
    format: 'json' | 'csv' | 'pdf' | 'html';
    groupBy?: string;
    filters?: Record<string, any>;
}

export interface Report {
    id: string;
    title: string;
    description: string;
    criteria: ReportCriteria;
    data: any;
    generatedAt: Date;
    generatedBy: string;
    format: string;
    size: number;
}

export interface QueryResult {
    intent: string;
    entities: Record<string, any>;
    confidence: number;
    response: string;
    suggestedActions: ActionSuggestion[];
    data?: any;
}

export interface PredictionResult {
    type: 'test-failure' | 'build-failure' | 'performance-degradation' | 'security-issue';
    probability: number; // 0-1
    description: string;
    affectedFiles: string[];
    prevention: ActionSuggestion[];
    timeline: string; // e.g., "within 24 hours"
}

export interface WorkflowOptimization {
    currentEfficiency: number; // 0-1
    optimizedWorkflow: CommandSuggestion[];
    estimatedImprovement: {
        timeReduction: number; // percentage
        errorReduction: number; // percentage
        productivityGain: number; // percentage
    };
    reasoning: string;
}

export interface TimeRange {
    start: Date;
    end: Date;
    preset?: 'last-hour' | 'last-day' | 'last-week' | 'last-month' | 'last-year' | 'custom';
}

export interface GitCommit {
    hash: string;
    message: string;
    author: string;
    date: Date;
    files: string[];
    stats: {
        additions: number;
        deletions: number;
    };
}

export interface TestResult {
    suite: string;
    test: string;
    status: 'passed' | 'failed' | 'skipped';
    duration: number;
    error?: string;
    timestamp: Date;
}

export interface PerformanceMetric {
    metric: string;
    value: number;
    unit: string;
    timestamp: Date;
    context: Record<string, any>;
}

export interface ErrorPattern {
    pattern: string;
    frequency: number;
    lastSeen: Date;
    affectedFiles: string[];
    suggestedFix?: string;
}

export interface GitStatus {
    branch: string;
    hasUncommittedChanges: boolean;
    changedFiles: string[];
    commitsBehind: number;
    commitsAhead: number;
    lastCommit: GitCommit;
}

export interface TestStatus {
    passing: number;
    failing: number;
    skipped: number;
    coverage: number; // percentage
    lastRun: Date;
    failingTests: TestResult[];
}

// Phase 4.4: Advanced Analytics Types

// Analytics Engine Types
export interface AnalyticsEvent {
  id?: string;
  type: string;
  timestamp: Date;
  userId: string;
  sessionId?: string;
  metadata: Record<string, any>;
}

export interface AnalyticsEngineConfig {
  bufferSize?: number;
  flushInterval?: number;
  retentionDays?: number;
  enablePredictiveAnalytics?: boolean;
  enableRealTimeMonitoring?: boolean;
}

export interface Metrics {
  timeRange: TimeRange;
  commandExecutions: ExecutionMetrics;
  performance: PerformanceMetrics;
  errors: ErrorMetrics;
  usage: UsageMetrics;
  trends: TrendAnalysis;
  predictions?: PredictionResult[];
}

export interface ExecutionMetrics {
  total: number;
  successful: number;
  failed: number;
  successRate: number;
  averageExecutionTime: number;
  mostUsedCommands: Array<{ command: string; count: number }>;
  failurePatterns: Array<{ pattern: string; count: number }>;
}

export interface PerformanceMetrics {
  averageResponseTime: number;
  throughput: number;
  errorRate: number;
  memoryUsage: number;
  cpuUsage: number;
  slowestOperations: any[];
}

export interface ErrorMetrics {
  total: number;
  byType: Map<string, number>;
  byComponent: Map<string, number>;
  topErrors: Array<{ error: string; count: number }>;
  resolutionRate: number;
}

export interface UsageMetrics {
  activeUsers: number;
  totalSessions: number;
  averageSessionDuration: number;
  featureUsage: Map<string, number>;
  userJourney: Array<{ userId: string; actions: string[] }>;
}

export interface TrendAnalysis {
  usage: any;
  performance: any;
  errors: any;
  predictions: any[];
}

export interface MetricsSnapshot {
  id: string;
  timestamp: Date;
  metrics: Map<string, MetricValue[]>;
  systemMetrics: SystemMetrics;
  collectionStats: any;
  bufferStats: any;
}

export interface AnalyticsExportData {
  metrics: Metrics;
  events: AnalyticsEvent[];
  dashboards: Dashboard[];
  exportedAt: Date;
  timeRange: TimeRange;
  format: ReportFormat;
}

export type ReportFormat = 'json' | 'csv' | 'pdf';

// Dashboard Types
export interface Dashboard {
  id: string;
  name: string;
  description?: string;
  layout: DashboardLayout;
  widgets: DashboardWidget[];
  filters: DashboardFilter[];
  theme?: string;
  refreshInterval: number;
  createdAt: Date;
  updatedAt: Date;
  isRealTime: boolean;
  permissions?: DashboardPermission;
  createdBy?: string;
  tags?: string[];
  isPublic?: boolean;
}

export interface DashboardConfig {
  id?: string;
  name: string;
  description?: string;
  layout?: DashboardLayout;
  widgets?: WidgetConfig[];
  filters?: DashboardFilter[];
  theme?: string;
  refreshInterval?: number;
  isRealTime?: boolean;
  permissions?: DashboardPermission;
  createdBy?: string;
  tags?: string[];
  isPublic?: boolean;
}

export interface DashboardLayout {
  type: 'grid' | 'flex' | 'masonry';
  columns: number;
  rows: number | 'auto';
  gap: string;
  padding: string;
}

export interface DashboardWidget {
  id: string;
  type: string;
  title: string;
  description?: string;
  position: WidgetPosition;
  configuration: Record<string, any>;
  dataSource?: WidgetDataSource;
  filters: DashboardFilter[];
  refreshInterval: number;
  isVisible: boolean;
  createdAt: Date;
  updatedAt: Date;
  style: Record<string, any>;
  interactions: Record<string, any>;
}

export interface WidgetConfig {
  id?: string;
  type: string;
  title: string;
  description?: string;
  position?: WidgetPosition;
  configuration?: Record<string, any>;
  dataSource?: WidgetDataSource;
  filters?: DashboardFilter[];
  refreshInterval?: number;
  isVisible?: boolean;
  style?: Record<string, any>;
  interactions?: Record<string, any>;
}

export interface WidgetPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface WidgetDataSource {
  type: string;
  query?: string;
  parameters?: Record<string, any>;
  url?: string;
  headers?: Record<string, string>;
}

export interface DashboardFilter {
  id: string;
  type: 'text' | 'select' | 'multi-select' | 'date-range' | 'number-range';
  label: string;
  value: any;
  options?: any[];
  required?: boolean;
}

export interface DashboardPermission {
  read: string[];
  write: string[];
}

export interface WidgetData {
  id: string;
  type: string;
  data: any;
  metadata: {
    lastUpdated: Date;
    dataPoints: number;
    source: string;
    filters: DashboardFilter[];
  };
}

export interface DashboardTheme {
  id: string;
  name: string;
  colors: {
    primary: string;
    secondary: string;
    success: string;
    warning: string;
    error: string;
    background: string;
    surface: string;
    text: string;
  };
  fonts: {
    body: string;
    heading: string;
    monospace: string;
  };
  spacing: {
    small: string;
    medium: string;
    large: string;
  };
}

export interface WidgetType {
  id: string;
  name: string;
  category: string;
}

export interface RealTimeUpdate {
  widgetId: string;
  data: WidgetData;
  timestamp: Date;
}

export interface DashboardExport {
  dashboard: Dashboard;
  format: 'json' | 'pdf' | 'png' | 'svg';
  exportedAt: Date;
  data: any;
}

export interface ChartConfiguration {
  chartType: 'line' | 'bar' | 'pie' | 'scatter' | 'area';
  xAxis?: string;
  yAxis?: string;
  series?: string[];
  colors?: string[];
  legend?: boolean;
  animation?: boolean;
}

// Predictive Analytics Types
export interface PredictiveConfig {
  enableAnomalyDetection?: boolean;
  enableTrendForecasting?: boolean;
  enableRiskAssessment?: boolean;
  modelUpdateInterval?: number;
  anomalyThreshold?: number;
  predictionHorizon?: number;
  minTrainingDataSize?: number;
  confidenceThreshold?: number;
}

export interface PredictionModel {
  id: string;
  name: string;
  type: 'classification' | 'regression' | 'time_series' | 'unsupervised';
  algorithm: string;
  accuracy: number;
  lastTrained: Date;
  features: string[];
  isActive: boolean;
}

export interface ModelTrainingData {
  id: string;
  timestamp: Date;
  features: Record<string, number>;
  label: number;
  metadata: Record<string, any>;
}

export interface AnomalyDetectionResult {
  id: string;
  metric: string;
  currentValue: number;
  baseline: number;
  deviation: number;
  confidence: number;
  severity: 'low' | 'medium' | 'high';
  component: string;
  detectedAt: Date;
  description: string;
}

export interface ForecastResult {
  id: string;
  metric: string;
  currentValue: number;
  forecastValue: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  confidence: number;
  timeHorizon: number;
  generatedAt: Date;
  dataPoints: number;
}

export interface RiskAssessment {
  overallRiskScore: number;
  riskLevel: 'low' | 'medium' | 'high';
  criticalFactors: string[];
  recommendations: string[];
  predictions: PredictionResult[];
  anomalies: AnomalyDetectionResult[];
  assessedAt: Date;
}

// Metrics Collection Types
export interface MetricsCollectionConfig {
  bufferSize?: number;
  flushInterval?: number;
  enableSystemMetrics?: boolean;
  systemMetricsInterval?: number;
  enableCustomMetrics?: boolean;
  maxMetricDefinitions?: number;
  aggregationPeriods?: AggregationPeriod[];
  retentionPeriod?: number;
  enableMetricValidation?: boolean;
  compressionEnabled?: boolean;
}

export interface MetricDefinition {
  name: string;
  type: 'counter' | 'gauge' | 'histogram' | 'summary';
  unit: string;
  description: string;
  tags: string[];
}

export interface MetricValue {
  name: string;
  value: number;
  timestamp: Date;
  tags: Record<string, string>;
  unit: string;
  type: string;
}

export interface MetricAggregation {
  metricName: string;
  period: AggregationPeriod;
  timestamp: Date;
  count: number;
  sum: number;
  avg: number;
  min: number;
  max: number;
  p50: number;
  p90: number;
  p95: number;
  p99: number;
}

export interface CollectionRule {
  id: string;
  name: string;
  condition: string;
  action: 'sample' | 'throttle' | 'filter';
  parameters?: Record<string, any>;
  isActive: boolean;
}

export interface SystemMetrics {
  timestamp: Date;
  cpu: {
    usage: number;
    cores: number;
    loadAverage: number[];
  };
  memory: {
    total: number;
    used: number;
    free: number;
    percentage: number;
  };
  disk: {
    total: number;
    used: number;
    free: number;
    percentage: number;
  };
  network: {
    rx: number;
    tx: number;
    rxPackets: number;
    txPackets: number;
  };
  processes: number;
  uptime: number;
}

export interface CustomMetric {
  name: string;
  value: number;
  tags: Record<string, string>;
  timestamp: Date;
}

export interface MetricFilter {
  name?: string;
  tags?: Record<string, string>;
  timeRange?: TimeRange;
  valueRange?: {
    min?: number;
    max?: number;
  };
}

export type AggregationPeriod = '1m' | '5m' | '1h' | '1d';

// Export plugin types
export * from './plugin';