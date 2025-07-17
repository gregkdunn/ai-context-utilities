// Plugin Architecture Types for Phase 4.3

export interface Plugin {
  metadata: PluginMetadata;
  activate(api: PluginAPI, context: PluginContext): Promise<void>;
  deactivate(api: PluginAPI, context: PluginContext): Promise<void>;
  
  // Plugin capabilities
  commands?: PluginCommand[];
  analyzers?: PluginAnalyzer[];
  formatters?: PluginFormatter[];
  transformers?: PluginTransformer[];
  validators?: PluginValidator[];
  
  // Plugin lifecycle hooks
  hooks?: PluginHooks;
}

export interface PluginMetadata {
  id: string;
  name: string;
  version: string;
  description?: string;
  author?: string;
  license?: string;
  repository?: string;
  homepage?: string;
  keywords?: string[];
  
  // Extension configuration
  enabled: boolean;
  config?: Record<string, any>;
  
  // Plugin capabilities
  capabilities: PluginCapability[];
  
  // Dependencies
  dependencies?: string[];
  engineVersion?: string;
  
  // Resources
  icon?: string;
  documentation?: string;
  examples?: string[];
}

export interface PluginCapability {
  type: 'command' | 'analyzer' | 'formatter' | 'transformer' | 'validator' | 'ai-provider' | 'integration';
  name: string;
  description: string;
  permissions?: PluginPermission[];
}

export interface PluginPermission {
  type: 'file-system' | 'network' | 'extension-api' | 'user-interaction' | 'workspace-access';
  scope: string;
  reason: string;
}

export interface PluginAPI {
  // Core services
  getInsightsEngine(): any;
  getCollaborationService(): any;
  getExecutionService(): any;
  
  // UI utilities
  showNotification(message: string, type: 'info' | 'warning' | 'error'): void;
  showProgress<T>(title: string, task: (progress: any) => Promise<T>): Promise<T>;
  
  // File operations
  openFile(filePath: string): void;
  writeFile(filePath: string, content: string): Promise<void>;
  
  // Extension points
  registerCommand(command: PluginCommand): void;
  registerAnalyzer(analyzer: PluginAnalyzer): void;
  registerFormatter(formatter: PluginFormatter): void;
  registerTransformer(transformer: PluginTransformer): void;
  registerValidator(validator: PluginValidator): void;
  
  // Events
  emit(event: string, data?: any): void;
  on(event: string, handler: (data: any) => void): void;
  off(event: string, handler?: (data: any) => void): void;
}

export interface PluginContext {
  // Workspace context
  workspaceRoot: string;
  currentFile?: string;
  selectedText?: string;
  
  // Extension state
  executionHistory: ExecutionRecord[];
  aiInsights: any[];
  collaborationData: any;
  
  // Plugin-specific data
  customData: Record<string, any>;
}

export interface PluginCommand {
  id: string;
  title: string;
  description?: string;
  category?: string;
  icon?: string;
  keybinding?: string;
  when?: string; // VSCode when clause
  
  execute(context: PluginContext, args?: any[]): Promise<any>;
}

export interface PluginAnalyzer {
  id: string;
  name: string;
  description: string;
  filePatterns: string[];
  
  analyze(content: string, filePath: string, context: PluginContext): Promise<AnalysisResult>;
}

export interface PluginFormatter {
  id: string;
  name: string;
  description: string;
  filePatterns: string[];
  
  format(content: string, filePath: string, context: PluginContext): Promise<string>;
}

export interface PluginTransformer {
  id: string;
  name: string;
  description: string;
  inputType: string;
  outputType: string;
  
  transform(input: any, context: PluginContext): Promise<any>;
}

export interface PluginValidator {
  id: string;
  name: string;
  description: string;
  validationRules: ValidationRule[];
  
  validate(content: string, filePath: string, context: PluginContext): Promise<ValidationResult>;
}

export interface PluginHooks {
  onActivate?(context: PluginContext): Promise<void>;
  onDeactivate?(context: PluginContext): Promise<void>;
  onCommand?(command: string, context: PluginContext): Promise<void>;
  onFileChange?(filePath: string, context: PluginContext): Promise<void>;
  onInsightGenerated?(insight: any, context: PluginContext): Promise<void>;
}

export interface PluginRegistry {
  register(plugin: Plugin): Promise<void>;
  unregister(pluginId: string): Promise<void>;
  get(pluginId: string): Plugin | undefined;
  getAll(): Plugin[];
  getByCapability(capability: string): Plugin[];
  isEnabled(pluginId: string): boolean;
  enable(pluginId: string): Promise<void>;
  disable(pluginId: string): Promise<void>;
}

export interface PluginConfig {
  enabled: boolean;
  settings: Record<string, any>;
  permissions: PluginPermission[];
  resources: Record<string, any>;
}

export interface PluginEvent {
  type: string;
  pluginId: string;
  timestamp: Date;
  data?: any;
  source: string;
}

export interface AnalysisResult {
  issues: Issue[];
  metrics: Record<string, number>;
  suggestions: string[];
  confidence: number;
}

export interface Issue {
  id: string;
  type: 'error' | 'warning' | 'info';
  message: string;
  line?: number;
  column?: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  fixable: boolean;
  suggestedFix?: string;
}

export interface ValidationRule {
  id: string;
  name: string;
  description: string;
  pattern?: RegExp;
  validator?: (content: string) => boolean;
  severity: 'error' | 'warning' | 'info';
}

export interface ValidationResult {
  valid: boolean;
  errors: Issue[];
  warnings: Issue[];
  info: Issue[];
}

export interface ExecutionRecord {
  id: string;
  command: string;
  timestamp: Date;
  duration: number;
  success: boolean;
  output: string;
  error?: string;
}

// Plugin Development Utilities
export interface PluginDevUtils {
  createLogger(id: string): PluginLogger;
  createStorage(id: string): PluginStorage;
  createScheduler(id: string): PluginScheduler;
}

export interface PluginLogger {
  info(message: string, data?: any): void;
  warn(message: string, data?: any): void;
  error(message: string, error?: Error): void;
  debug(message: string, data?: any): void;
}

export interface PluginStorage {
  get<T>(key: string): T | undefined;
  set<T>(key: string, value: T): void;
  delete(key: string): void;
  clear(): void;
  keys(): string[];
}

export interface PluginScheduler {
  schedule(id: string, interval: number, task: () => Promise<void>): void;
  cancel(id: string): void;
  cancelAll(): void;
}

// Plugin Events
export const PLUGIN_EVENTS = {
  ACTIVATED: 'plugin:activated',
  DEACTIVATED: 'plugin:deactivated',
  ERROR: 'plugin:error',
  COMMAND_EXECUTED: 'plugin:command-executed',
  ANALYSIS_COMPLETE: 'plugin:analysis-complete',
  VALIDATION_COMPLETE: 'plugin:validation-complete',
  CONFIGURATION_CHANGED: 'plugin:configuration-changed'
} as const;

// Built-in Plugin Types
export interface GitAnalyzerPlugin extends Plugin {
  analyzers: [GitAnalyzer];
}

export interface GitAnalyzer extends PluginAnalyzer {
  analyzeCommits(commits: any[], context: PluginContext): Promise<AnalysisResult>;
  analyzeBranches(branches: any[], context: PluginContext): Promise<AnalysisResult>;
  analyzeChanges(changes: any[], context: PluginContext): Promise<AnalysisResult>;
}

export interface TestAnalyzerPlugin extends Plugin {
  analyzers: [TestAnalyzer];
}

export interface TestAnalyzer extends PluginAnalyzer {
  analyzeTestResults(results: any[], context: PluginContext): Promise<AnalysisResult>;
  analyzeCoverage(coverage: any, context: PluginContext): Promise<AnalysisResult>;
  analyzePerformance(metrics: any[], context: PluginContext): Promise<AnalysisResult>;
}

export interface AIProviderPlugin extends Plugin {
  providers: AIProvider[];
}

export interface AIProvider {
  id: string;
  name: string;
  description: string;
  capabilities: string[];
  
  generateInsights(data: any, context: PluginContext): Promise<any[]>;
  processQuery(query: string, context: PluginContext): Promise<any>;
  suggestActions(context: PluginContext): Promise<any[]>;
}

// Plugin Discovery and Loading
export interface PluginDiscovery {
  discoverPlugins(directories: string[]): Promise<PluginManifest[]>;
  loadPlugin(manifest: PluginManifest): Promise<Plugin>;
  validatePlugin(plugin: Plugin): Promise<boolean>;
}

export interface PluginManifest {
  path: string;
  packageJson: any;
  metadata: PluginMetadata;
  entryPoint: string;
}

// Plugin Marketplace
export interface PluginMarketplace {
  searchPlugins(query: string): Promise<PluginInfo[]>;
  getPlugin(id: string): Promise<PluginInfo>;
  installPlugin(id: string, version?: string): Promise<void>;
  updatePlugin(id: string, version?: string): Promise<void>;
  uninstallPlugin(id: string): Promise<void>;
  listInstalledPlugins(): Promise<PluginInfo[]>;
}

export interface PluginInfo {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  downloads: number;
  rating: number;
  tags: string[];
  screenshots: string[];
  readme: string;
  changelog: string;
  license: string;
  repository: string;
  homepage: string;
  bugs: string;
  dependencies: Record<string, string>;
  peerDependencies: Record<string, string>;
  publishedAt: Date;
  updatedAt: Date;
}

// Plugin Security
export interface PluginSecurity {
  scanPlugin(plugin: Plugin): Promise<SecurityReport>;
  validatePermissions(plugin: Plugin, permissions: PluginPermission[]): Promise<boolean>;
  sandboxPlugin(plugin: Plugin): Promise<void>;
  checkIntegrity(plugin: Plugin): Promise<boolean>;
}

export interface SecurityReport {
  pluginId: string;
  scanDate: Date;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  vulnerabilities: SecurityVulnerability[];
  recommendations: string[];
  approved: boolean;
}

export interface SecurityVulnerability {
  id: string;
  type: 'dependency' | 'code' | 'permission' | 'network';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  impact: string;
  remediation: string;
  references: string[];
}
