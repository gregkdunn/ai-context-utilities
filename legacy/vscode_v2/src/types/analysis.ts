/**
 * Comprehensive types for the Copilot API Submission Module
 */

export interface AnalysisSchema {
  timestamp: string;
  summary: {
    projectHealth: string;
    riskLevel: 'low' | 'medium' | 'high';
    recommendedActions: string[];
  };
  codeAnalysis: {
    testRecommendations: TestRecommendation[];
    codeQualityIssues: CodeIssue[];
    performanceConsiderations: string[];
    securityConcerns: SecurityIssue[];
    technicalDebt: DebtIssue[];
  };
  prGeneration: {
    suggestedTitle: string;
    problem: string;
    solution: string;
    details: string[];
    qaChecklist: string[];
    riskAssessment: string;
  };
  implementationGuidance: {
    prioritizedTasks: Task[];
    dependencies: string[];
    estimatedEffort: string;
    successCriteria: string[];
  };
  futureConsiderations: {
    technicalImprovements: string[];
    architecturalRecommendations: string[];
    monitoringPoints: string[];
  };
}

export interface TestRecommendation {
  id: string;
  type: 'new-test' | 'improve-test' | 'remove-test' | 'refactor-test';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  file: string;
  lineNumber?: number;
  estimatedEffort: 'small' | 'medium' | 'large';
  reasoning: string;
  suggestedImplementation?: string;
}

export interface CodeIssue {
  id: string;
  severity: 'error' | 'warning' | 'info';
  category: 'maintainability' | 'reliability' | 'security' | 'performance' | 'style';
  title: string;
  description: string;
  file: string;
  lineNumber?: number;
  suggestion: string;
  impact: string;
  effort: 'low' | 'medium' | 'high';
}

export interface SecurityIssue {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  type: string;
  title: string;
  description: string;
  file: string;
  lineNumber?: number;
  recommendation: string;
  references: string[];
}

export interface DebtIssue {
  id: string;
  type: 'code-smell' | 'duplication' | 'complexity' | 'outdated-dependency' | 'documentation';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  effort: 'small' | 'medium' | 'large';
  file?: string;
  suggestion: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  estimatedHours: number;
  dependencies: string[];
  category: 'bug-fix' | 'feature' | 'refactor' | 'test' | 'documentation';
  acceptanceCriteria: string[];
}

export interface EnrichedContext {
  timestamp: string;
  projectMetadata: ProjectMetadata;
  contextContent: string;
  analysisObjectives: AnalysisObjective[];
  expectedOutputFormat: AnalysisSchema;
}

export interface ProjectMetadata {
  name: string;
  framework: string;
  language: string;
  packageManager: string;
  testFramework: string;
  lintingTools: string[];
  dependencies: {
    production: number;
    development: number;
    outdated: string[];
  };
  gitMetadata: {
    currentBranch: string;
    lastCommit: string;
    uncommittedChanges: number;
    stashEntries: number;
  };
  nxMetadata?: {
    version: string;
    projects: number;
    affectedProjects: string[];
  };
}

export interface AnalysisObjective {
  type: 'code-quality' | 'test-coverage' | 'performance' | 'security' | 'maintainability';
  priority: 'high' | 'medium' | 'low';
  description: string;
}

export interface ContextChunk {
  id: string;
  content: EnrichedContext | string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  analysisType: 'comprehensive' | 'executive-summary' | 'test-focused' | 'code-focused' | 'future-planning';
}

export interface ChunkAnalysisResult {
  chunkId: string;
  analysisType: string;
  rawResponse: string;
  structuredResult: Partial<AnalysisSchema>;
  metadata: {
    timestamp: string;
    tokenUsage: number;
    processingTime: number;
    modelUsed: string;
  };
}

export interface ComprehensiveAnalysisResult {
  id: string;
  timestamp: string;
  analysisResults: AnalysisSchema;
  chunkSummaries: ChunkAnalysisResult['metadata'][];
  qualityScore: number;
  recommendationsImplemented: boolean;
  processingMetrics: {
    totalProcessingTime: number;
    totalTokensUsed: number;
    chunksProcessed: number;
    apiCallsmade: number;
  };
}

export interface AnalysisStorageResult {
  jsonPath: string;
  markdownPath: string;
  htmlPath: string;
  csvPath: string;
  timestamp: string;
  analysisId: string;
  fileSize: {
    json: number;
    markdown: number;
    html: number;
    csv: number;
  };
}

export interface SubmissionOptions {
  timeout?: number;
  maxRetries?: number;
  chunkingStrategy?: 'auto' | 'manual' | 'section-based';
  analysisDepth?: 'quick' | 'standard' | 'comprehensive';
  focusAreas?: AnalysisObjective['type'][];
  apiOptions?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  };
}

export interface QueueConfig {
  maxConcurrent: number;
  minInterval: number;
  backoffMultiplier: number;
  maxRetries: number;
  timeout: number;
}

export interface AnalysisHistoryItem {
  id: string;
  timestamp: string;
  projectName: string;
  branch: string;
  summary: string;
  riskLevel: 'low' | 'medium' | 'high';
  recommendationsCount: number;
  implementedCount: number;
  filePath: string;
  fileSize: number;
}

export interface AnalysisComparison {
  analysisId1: string;
  analysisId2: string;
  timestamp1: string;
  timestamp2: string;
  improvements: {
    riskLevelChange: 'improved' | 'degraded' | 'unchanged';
    newIssues: CodeIssue[];
    resolvedIssues: CodeIssue[];
    newRecommendations: TestRecommendation[];
    implementedRecommendations: TestRecommendation[];
  };
  metrics: {
    codeQualityTrend: 'improving' | 'declining' | 'stable';
    testCoverageTrend: 'improving' | 'declining' | 'stable';
    technicalDebtTrend: 'improving' | 'declining' | 'stable';
  };
}

export interface ProjectInsights {
  analysisCount: number;
  timespan: {
    first: string;
    last: string;
  };
  trends: {
    codeQuality: InsightTrend;
    testCoverage: InsightTrend;
    technicalDebt: InsightTrend;
    performance: InsightTrend;
    security: InsightTrend;
  };
  recommendations: {
    mostCommon: string[];
    leastImplemented: string[];
    highestImpact: string[];
  };
}

export interface InsightTrend {
  direction: 'improving' | 'declining' | 'stable';
  confidence: number;
  dataPoints: {
    timestamp: string;
    value: number;
  }[];
  prediction: {
    nextPeriod: number;
    confidence: number;
  };
}

export interface RequestQueueItem<T> {
  id: string;
  request: () => Promise<T>;
  priority: 'critical' | 'high' | 'medium' | 'low';
  timestamp: number;
  retryCount: number;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
}

// Event types for inter-service communication
export interface AnalysisEvent {
  type: 'analysis-started' | 'analysis-completed' | 'analysis-failed' | 'chunk-completed';
  data: any;
  timestamp: string;
}

// UI Component Props
export interface AnalysisDashboardProps {
  contextFilePath?: string;
  autoSubmit?: boolean;
  showHistory?: boolean;
}

export interface AnalysisSectionProps {
  data: Partial<AnalysisSchema>;
  sectionType: keyof AnalysisSchema;
  expanded?: boolean;
  onImplementRecommendation?: (recommendation: TestRecommendation | CodeIssue) => void;
}

export interface AnalysisHistoryProps {
  analyses: AnalysisHistoryItem[];
  onCompare?: (analysis1: string, analysis2: string) => void;
  onExport?: (format: 'json' | 'csv' | 'pdf') => void;
  onDelete?: (analysisId: string) => void;
}