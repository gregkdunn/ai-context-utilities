// Core workflow types
export interface WorkflowState {
  step: 'idle' | 'collecting-context' | 'running-tests' | 'analyzing-with-ai' | 'generating-pr' | 'complete' | 'error' | 'generating-context' | 'saving-context' | 'analyzing-results' | 'generating-report';
  progress?: number;
  message?: string;
}

export interface WorkflowConfig {
  fileSelectionMode: FileSelectionMode;
  testMode: TestMode;
  templateName?: string;
}

export interface WorkflowResult {
  success: boolean;
  report?: string;
  error?: string;
}

// File selection types
export type FileSelectionMode = 'uncommitted' | 'commit' | 'branch-diff';

export interface FileChange {
  path: string;
  status: 'modified' | 'added' | 'deleted';
  selected?: boolean;
}

export interface FileSelection {
  mode: FileSelectionMode;
  files: FileChange[];
  commit?: GitCommit;
  diff?: string;
}

// Git types
export interface GitCommit {
  hash: string;
  message: string;
  author: string;
  date: Date;
  files?: string[];
}

// Test types
export type TestMode = 'project' | 'affected';

export interface TestConfiguration {
  mode: TestMode;
  project?: string;
  testFiles?: TestFile[];
  command: string;
}

export interface TestFile {
  path: string;
  selected: boolean;
}

export interface TestResult {
  name: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  file: string;
  error?: string;
  stackTrace?: string;
}

// NX types
export interface NXProject {
  name: string;
  type: 'application' | 'library';
  root: string;
  sourceRoot?: string;
  targets?: Record<string, any>;
}

// AI Analysis types
export interface DebugContext {
  gitDiff?: string;
  testResults?: TestResult[];
  projectInfo?: ProjectInfo;
  errorDetails?: ErrorDetails[];
  consolidatedContext?: string;
}

export interface TestAnalysis {
  rootCause: string;
  specificFixes: CodeFix[];
  preventionStrategies: string[];
  additionalTests: string[];
}

export interface CodeFix {
  file: string;
  lineNumber: number;
  oldCode: string;
  newCode: string;
  explanation: string;
}

export interface TestSuggestions {
  newTests: TestSuggestion[];
  missingCoverage: string[];
  improvements: string[];
}

export interface TestSuggestion {
  file: string;
  testName: string;
  testCode: string;
  reasoning: string;
}

export interface FalsePositiveAnalysis {
  suspiciousTests: SuspiciousTest[];
  mockingIssues: MockingIssue[];
  recommendations: string[];
}

export interface SuspiciousTest {
  file: string;
  testName: string;
  issue: string;
  suggestion: string;
}

export interface MockingIssue {
  file: string;
  mock: string;
  issue: string;
  fix: string;
}

// PR Generation types
export interface PRContext {
  gitDiff: string;
  testResults: TestResult[];
  templateName: string;
}

export interface EnrichedPRContext extends PRContext {
  diffAnalysis: DiffAnalysis;
  featureFlags: string[];
  jiraTickets: JiraTicket[];
}

export interface DiffAnalysis {
  summary: string;
  filesChanged: string[];
  linesAdded: number;
  linesRemoved: number;
  type: 'feature' | 'bugfix' | 'refactor' | 'hotfix';
}

export interface JiraTicket {
  key: string;
  summary: string;
  status: string;
  url: string;
}

export interface JiraConfig {
  baseUrl: string;
  enabled: boolean;
}

// Project info types
export interface ProjectInfo {
  name: string;
  type: string;
  framework: string;
  testFramework: string;
  dependencies: string[];
}

export interface ErrorDetails {
  message: string;
  stack: string;
  file: string;
  line?: number;
}

// Webview message types
export interface WebviewMessage {
  command: string;
  data?: any;
}

export interface MessageResponse {
  success: boolean;
  data?: any;
  error?: string;
}
