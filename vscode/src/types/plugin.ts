import * as vscode from 'vscode';

export interface PluginMetadata {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  license: string;
  enabled: boolean;
  capabilities: PluginCapability[];
  dependencies?: string[];
  keywords?: string[];
  repository?: string;
  homepage?: string;
  bugs?: string;
  main?: string;
  scripts?: Record<string, string>;
  files?: string[];
  engines?: Record<string, string>;
  publishConfig?: Record<string, any>;
  config?: Record<string, any>;
  engineVersion?: string;
  icon?: string;
  documentation?: string;
  examples?: string[];
}

export interface PluginCapability {
  type: 'command' | 'provider' | 'view' | 'language' | 'debug' | 'task' | 'completion' | 'hover' | 'definition' | 'reference' | 'rename' | 'format' | 'lint' | 'test' | 'git' | 'file' | 'terminal' | 'webview' | 'tree' | 'status' | 'notification' | 'configuration' | 'theme' | 'icon' | 'snippet' | 'keybinding' | 'menu' | 'toolbar' | 'panel' | 'editor' | 'workbench' | 'analyzer' | 'formatter' | 'ai-provider';
  name: string;
  description: string;
  configuration?: Record<string, any>;
  activation?: string[];
  deactivation?: string[];
  permissions?: string[];
  resources?: string[];
  platforms?: string[];
  vscodeVersion?: string;
}

export interface PluginAPI {
  vscode: typeof vscode;
  getPluginPath(): string;
  getPluginVersion(): string;
  getPluginMetadata(): PluginMetadata;
  registerCommand(id: string, callback: (...args: any[]) => any): vscode.Disposable;
  registerProvider(type: string, provider: any): vscode.Disposable;
  registerAnalyzer?(analyzer: PluginAnalyzer): void;
  registerFormatter?(formatter: PluginFormatter): void;
  registerTransformer?(transformer: any): void;
  registerValidator?(validator: any): void;
  getInsightsEngine?(): any;
  getCollaborationService?(): any;
  getExecutionService?(): any;
  showNotification?(message: string, level?: 'info' | 'warning' | 'error'): void;
  showProgress?(title: string, task: (progress: any) => Promise<void>): Promise<void>;
  openFile?(path: string): Promise<void>;
  writeFile?(path: string, content: string): Promise<void>;
  on?(event: string, listener: (...args: any[]) => void): void;
  off?(event: string): void;
  emit?(event: string, ...args: any[]): void;
  createOutputChannel(name: string): vscode.OutputChannel;
  showMessage(message: string, level?: 'info' | 'warning' | 'error'): void;
  showNotification?(message: string, level?: 'info' | 'warning' | 'error'): void;
  getConfiguration(section?: string): vscode.WorkspaceConfiguration;
  onDidChangeConfiguration(callback: (e: vscode.ConfigurationChangeEvent) => void): vscode.Disposable;
  createStatusBarItem(alignment?: vscode.StatusBarAlignment, priority?: number): vscode.StatusBarItem;
  createTreeView(viewId: string, options: vscode.TreeViewOptions<any>): vscode.TreeView<any>;
  createWebviewPanel(viewType: string, title: string, showOptions: vscode.ViewColumn | vscode.WebviewPanelOptions, options?: vscode.WebviewPanelOptions & vscode.WebviewOptions): vscode.WebviewPanel;
  executeCommand(command: string, ...args: any[]): Thenable<any>;
  openExternal(uri: vscode.Uri): Thenable<boolean>;
  showTextDocument(document: vscode.TextDocument, column?: vscode.ViewColumn, preserveFocus?: boolean): Thenable<vscode.TextEditor>;
  showQuickPick(items: string[] | Thenable<string[]>, options?: vscode.QuickPickOptions): Thenable<string | undefined>;
  showInputBox(options?: vscode.InputBoxOptions): Thenable<string | undefined>;
  withProgress<R>(options: vscode.ProgressOptions, task: (progress: vscode.Progress<{ message?: string; increment?: number }>, token: vscode.CancellationToken) => Thenable<R>): Thenable<R>;
  createTerminal(name?: string, shellPath?: string, shellArgs?: string[]): vscode.Terminal;
  createFileSystemWatcher(globPattern: string, ignoreCreateEvents?: boolean, ignoreChangeEvents?: boolean, ignoreDeleteEvents?: boolean): vscode.FileSystemWatcher;
  findFiles(include: string, exclude?: string, maxResults?: number, token?: vscode.CancellationToken): Thenable<vscode.Uri[]>;
  openTextDocument(uri: vscode.Uri): Thenable<vscode.TextDocument>;
  saveAll(includeUntitled?: boolean): Thenable<boolean>;
  applyEdit(edit: vscode.WorkspaceEdit): Thenable<boolean>;
  createDiagnosticCollection(name?: string): vscode.DiagnosticCollection;
  registerCodeActionsProvider(selector: vscode.DocumentSelector, provider: vscode.CodeActionProvider): vscode.Disposable;
  registerCompletionItemProvider(selector: vscode.DocumentSelector, provider: vscode.CompletionItemProvider, ...triggerCharacters: string[]): vscode.Disposable;
  registerDefinitionProvider(selector: vscode.DocumentSelector, provider: vscode.DefinitionProvider): vscode.Disposable;
  registerHoverProvider(selector: vscode.DocumentSelector, provider: vscode.HoverProvider): vscode.Disposable;
  registerDocumentFormattingEditProvider(selector: vscode.DocumentSelector, provider: vscode.DocumentFormattingEditProvider): vscode.Disposable;
  registerDocumentRangeFormattingEditProvider(selector: vscode.DocumentSelector, provider: vscode.DocumentRangeFormattingEditProvider): vscode.Disposable;
  registerRenameProvider(selector: vscode.DocumentSelector, provider: vscode.RenameProvider): vscode.Disposable;
  registerReferenceProvider(selector: vscode.DocumentSelector, provider: vscode.ReferenceProvider): vscode.Disposable;
  registerDocumentSymbolProvider(selector: vscode.DocumentSelector, provider: vscode.DocumentSymbolProvider): vscode.Disposable;
  registerDocumentHighlightProvider(selector: vscode.DocumentSelector, provider: vscode.DocumentHighlightProvider): vscode.Disposable;
  registerDocumentLinkProvider(selector: vscode.DocumentSelector, provider: vscode.DocumentLinkProvider): vscode.Disposable;
  registerSignatureHelpProvider(selector: vscode.DocumentSelector, provider: vscode.SignatureHelpProvider, ...triggerCharacters: string[]): vscode.Disposable;
  registerDebugConfigurationProvider(type: string, provider: vscode.DebugConfigurationProvider): vscode.Disposable;
  registerDebugAdapterDescriptorFactory(type: string, factory: vscode.DebugAdapterDescriptorFactory): vscode.Disposable;
  registerTaskProvider(type: string, provider: vscode.TaskProvider): vscode.Disposable;
  createTask(definition: vscode.TaskDefinition, name: string, source: string, execution: vscode.ProcessExecution | vscode.ShellExecution, problemMatchers?: string[]): vscode.Task;
  executeTask(task: vscode.Task): Thenable<vscode.TaskExecution>;
  onDidStartTask(callback: (e: vscode.TaskStartEvent) => void): vscode.Disposable;
  onDidEndTask(callback: (e: vscode.TaskEndEvent) => void): vscode.Disposable;
  onDidStartTaskProcess(callback: (e: vscode.TaskProcessStartEvent) => void): vscode.Disposable;
  onDidEndTaskProcess(callback: (e: vscode.TaskProcessEndEvent) => void): vscode.Disposable;
  createTreeDataProvider(viewId: string, treeDataProvider: vscode.TreeDataProvider<any>): vscode.Disposable;
  createCustomTextEditorProvider(viewType: string, provider: vscode.CustomTextEditorProvider): vscode.Disposable;
  createCustomEditorProvider(viewType: string, provider: vscode.CustomReadonlyEditorProvider | vscode.CustomEditorProvider, options?: vscode.WebviewPanelOptions): vscode.Disposable;
  createWebviewViewProvider(viewId: string, provider: vscode.WebviewViewProvider): vscode.Disposable;
  createAuthenticationProvider(id: string, label: string, provider: vscode.AuthenticationProvider, options?: vscode.AuthenticationProviderOptions): vscode.Disposable;
  createSourceControlResourceGroup(id: string, label: string): vscode.SourceControlResourceGroup;
  createSourceControl(id: string, label: string, rootUri?: vscode.Uri): vscode.SourceControl;
  createCommentController(id: string, label: string): vscode.CommentController;
  createNotebookController(id: string, notebookType: string, label: string): vscode.NotebookController;
  createNotebookCellExecution(uri: vscode.Uri): vscode.NotebookCellExecution;
  createNotebookCellOutput(items: vscode.NotebookCellOutputItem[]): vscode.NotebookCellOutput;
  createNotebookCellOutputItem(data: Uint8Array, mime: string): vscode.NotebookCellOutputItem;
  createNotebookDocument(uri: vscode.Uri, notebookType: string, metadata?: Record<string, any>): vscode.NotebookDocument;
  createNotebookEdit(uri: vscode.Uri, edit: vscode.NotebookEdit): vscode.WorkspaceEdit;
  createNotebookRange(start: number, end: number): vscode.NotebookRange;
  createNotebookCell(kind: vscode.NotebookCellKind, value: string, languageId: string, outputs?: vscode.NotebookCellOutput[], metadata?: Record<string, any>, executionSummary?: vscode.NotebookCellExecutionSummary): vscode.NotebookCell;
  createNotebookCellData(kind: vscode.NotebookCellKind, value: string, languageId: string, outputs?: vscode.NotebookCellOutput[], metadata?: Record<string, any>, executionSummary?: vscode.NotebookCellExecutionSummary): vscode.NotebookCellData;
  createNotebookData(cells: vscode.NotebookCellData[], metadata?: Record<string, any>): vscode.NotebookData;
  createNotebookDocumentFilter(pattern?: string, scheme?: string, language?: string): vscode.NotebookDocument;
  createNotebookDocumentMetadata(metadata?: Record<string, any>): vscode.NotebookDocument;
}

export interface PluginContext {
  subscriptions: vscode.Disposable[];
  workspaceState: vscode.Memento;
  globalState: vscode.Memento;
  secrets: vscode.SecretStorage;
  extensionUri: vscode.Uri;
  extensionPath: string;
  environmentVariableCollection: vscode.EnvironmentVariableCollection;
  asAbsolutePath(relativePath: string): string;
  storageUri: vscode.Uri | undefined;
  storagePath: string | undefined;
  globalStorageUri: vscode.Uri;
  globalStoragePath: string;
  logUri: vscode.Uri;
  logPath: string;
  extensionMode: vscode.ExtensionMode;
  extension: vscode.Extension<any>;
  workspaceRoot?: string;
  currentFile?: string;
  selectedText?: string;
  executionHistory?: any[];
  aiInsights?: any[];
  collaborationData?: Record<string, any>;
  customData?: Record<string, any>;
}

export interface Plugin {
  metadata: PluginMetadata;
  activate(api: PluginAPI, context: PluginContext): Promise<void>;
  deactivate(api: PluginAPI, context: PluginContext): Promise<void>;
  commands?: PluginCommand[];
  providers?: PluginProvider[];
  views?: PluginView[];
  configuration?: PluginConfiguration;
  keybindings?: PluginKeybinding[];
  menus?: PluginMenu[];
  themes?: PluginTheme[];
  snippets?: PluginSnippet[];
  languages?: PluginLanguage[];
  debuggers?: PluginDebugger[];
  tasks?: PluginTask[];
  problemMatchers?: PluginProblemMatcher[];
  colors?: PluginColor[];
  icons?: PluginIcon[];
  walkthroughs?: PluginWalkthrough[];
  notebooks?: PluginNotebook[];
  terminal?: PluginTerminal[];
  authentication?: PluginAuthentication[];
  resourceLabelFormatters?: PluginResourceLabelFormatter[];
  customEditors?: PluginCustomEditor[];
  webviews?: PluginWebview[];
  comments?: PluginComment[];
  sourceControl?: PluginSourceControl[];
  timeline?: PluginTimeline[];
  testing?: PluginTesting[];
  chat?: PluginChat[];
  ai?: PluginAI[];
  scm?: PluginSCM[];
  git?: PluginGit[];
  github?: PluginGitHub[];
  gitlab?: PluginGitLab[];
  bitbucket?: PluginBitbucket[];
  azure?: PluginAzure[];
  aws?: PluginAWS[];
  gcp?: PluginGCP[];
  hooks?: {
    onActivate?(context: PluginContext): Promise<void>;
    onDeactivate?(context: PluginContext): Promise<void>;
    onCommand?(command: string, args: any[]): Promise<void>;
  };
  analyzers?: PluginAnalyzer[];
  formatters?: PluginFormatter[];
  transformers?: any[];
  validators?: any[];
}

export interface PluginCommand {
  id: string;
  title: string;
  category?: string;
  description?: string;
  icon?: string;
  enablement?: string;
  when?: string;
  arguments?: any[];
  execute(context: PluginContext, ...args: any[]): Promise<any>;
}

export interface PluginProvider {
  type: string;
  selector: vscode.DocumentSelector;
  scheme?: string;
  language?: string;
  pattern?: string;
  hasAccessToAllModels?: boolean;
  provide(document: vscode.TextDocument, position: vscode.Position, context: any, token: vscode.CancellationToken): Promise<any>;
}

export interface PluginView {
  id: string;
  name: string;
  when?: string;
  icon?: string;
  contextualTitle?: string;
  type?: string;
  visibility?: string;
  initialSize?: number;
  treeDataProvider?: vscode.TreeDataProvider<any>;
  webviewProvider?: vscode.WebviewViewProvider;
  customProvider?: any;
}

export interface PluginConfiguration {
  title: string;
  properties: Record<string, any>;
}

export interface PluginKeybinding {
  command: string;
  key: string;
  mac?: string;
  linux?: string;
  win?: string;
  when?: string;
  args?: any;
}

export interface PluginMenu {
  command: string;
  when?: string;
  group?: string;
  alt?: string;
  submenu?: string;
  title?: string;
  icon?: string;
}

export interface PluginTheme {
  id: string;
  label: string;
  uiTheme: string;
  path: string;
}

export interface PluginSnippet {
  language: string;
  path: string;
}

export interface PluginLanguage {
  id: string;
  aliases?: string[];
  extensions?: string[];
  filenames?: string[];
  firstLine?: string;
  configuration?: string;
}

export interface PluginDebugger {
  type: string;
  label: string;
  program?: string;
  args?: string[];
  runtime?: string;
  runtimeArgs?: string[];
  variables?: Record<string, any>;
  initialConfigurations?: any[];
  configurationSnippets?: any[];
  configurationAttributes?: any;
}

export interface PluginTask {
  type: string;
  required?: string[];
  properties?: Record<string, any>;
  when?: string;
}

export interface PluginProblemMatcher {
  name: string;
  label?: string;
  owner?: string;
  source?: string;
  applyTo?: string;
  severity?: string;
  fileLocation?: string | string[];
  pattern?: any;
  watching?: any;
  background?: any;
}

export interface PluginColor {
  id: string;
  description: string;
  defaults: {
    light: string;
    dark: string;
    highContrast: string;
    highContrastLight?: string;
  };
}

export interface PluginIcon {
  id: string;
  description: string;
  default: {
    fontPath: string;
    fontCharacter: string;
  };
}

export interface PluginWalkthrough {
  id: string;
  title: string;
  description: string;
  steps: any[];
  featuredFor?: string[];
  when?: string;
}

export interface PluginNotebook {
  type: string;
  displayName: string;
  selector?: any[];
  priority?: string;
}

export interface PluginTerminal {
  id: string;
  title: string;
}

export interface PluginAuthentication {
  id: string;
  label: string;
}

export interface PluginResourceLabelFormatter {
  scheme: string;
  authority?: string;
  formatting: {
    label: string;
    separator: string;
    tildify?: boolean;
    workspaceSuffix?: string;
  };
}

export interface PluginCustomEditor {
  viewType: string;
  displayName: string;
  selector?: any[];
  priority?: string;
}

export interface PluginWebview {
  viewType: string;
  displayName: string;
}

export interface PluginComment {
  id: string;
  label: string;
}

export interface PluginSourceControl {
  id: string;
  label: string;
}

export interface PluginTimeline {
  id: string;
  label: string;
}

export interface PluginTesting {
  id: string;
}

export interface PluginChat {
  id: string;
  label: string;
}

export interface PluginAI {
  id: string;
  label: string;
}

// Plugin types that are referenced in other files
export interface PluginAnalyzer {
  id: string;
  name: string;
  description?: string;
  filePatterns?: string[];
  analyze(content: string, filePath: string, context: PluginContext): Promise<AnalysisResult>;
}

export interface AnalysisResult {
  id: string;
  issues: Issue[];
  suggestions: any[];
  summary: string;
  metrics?: Record<string, any>;
  confidence?: number;
}

export interface Issue {
  id?: string;
  type: string;
  severity: 'error' | 'warning' | 'info' | 'low' | 'medium' | 'high';
  message: string;
  file?: string;
  line?: number;
  column?: number;
  fixable?: boolean;
  suggestedFix?: string;
}

export interface PluginFormatter {
  id: string;
  name: string;
  description?: string;
  filePatterns?: string[];
  format(content: string, filePath?: string, context?: PluginContext): Promise<string>;
}

// AI Provider types
export interface AIProvider {
  id: string;
  name: string;
  description?: string;
  capabilities?: string[];
  query?(prompt: string): Promise<AIResponse>;
  generateInsights?(data: any, context: any): Promise<AIResponse>;
  processQuery?(question: string, context: any): Promise<AIResponse>;
  suggestActions?(context: any): Promise<AISuggestion[]>;
}

export interface AIResponse {
  response: string;
  suggestions?: AISuggestion[];
}

export interface AISuggestion {
  title: string;
  description: string;
  action?: () => void;
}

export interface AIProviderPlugin extends Plugin {
  providers: PluginProvider[];
}

// Plugin maker/utilities
export interface PluginMaker {
  create(template: string): Promise<Plugin>;
}

// Simplified base types
export interface PluginSCM extends PluginSourceControl {}
export interface PluginGit extends PluginSourceControl {}
export interface PluginGitHub extends PluginSourceControl {}
export interface PluginGitLab extends PluginSourceControl {}
export interface PluginBitbucket extends PluginSourceControl {}
export interface PluginAzure extends PluginSourceControl {}
export interface PluginAWS extends PluginSourceControl {}
export interface PluginGCP extends PluginSourceControl {}
export interface PluginDego extends PluginSourceControl {}

export interface PluginManifest {
  metadata: PluginMetadata;
  path: string;
  packageJson: any;
  entryPoint: string;
}

export interface PluginSecurity {
  scanPlugin(plugin: Plugin): Promise<SecurityReport>;
  validatePlugin(plugin: Plugin): Promise<ValidationResult>;
  checkPermissions(plugin: Plugin): Promise<PermissionResult>;
}

export interface SecurityReport {
  pluginId: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  issues: SecurityIssue[];
  recommendations: string[];
  scannedAt: Date;
  approved?: boolean;
}

export interface SecurityIssue {
  type: 'permission' | 'code' | 'dependency' | 'network' | 'file' | 'environment';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  location?: string;
  fix?: string;
}

export interface SecurityVulnerability {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affectedFiles?: string[];
  fix?: string;
  impact?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface PermissionResult {
  granted: string[];
  denied: string[];
  requested: string[];
}

// Plugin Management types
export interface PluginRegistry {
  register(plugin: Plugin): Promise<void>;
  unregister(pluginId: string): Promise<void>;
  getPlugin(pluginId: string): Plugin | undefined;
  getAllPlugins(): Plugin[];
}

export interface PluginInfo {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  tags: string[];
  downloadCount?: number;
  rating?: number;
  lastUpdated?: Date;
  downloads: number;
  license?: string;
  repository?: string;
  homepage?: string;
  bugs?: string;
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  readme?: string;
  changelog?: string;
  screenshots?: string[];
  publishedAt?: Date;
  updatedAt?: Date;
}

export interface PluginMarketplace {
  search?(query: string): Promise<PluginInfo[]>;
  searchPlugins?(query: string): Promise<PluginInfo[]>;
  getPlugin?(id: string): Promise<PluginInfo>;
  install?(id: string, version?: string): Promise<void>;
  installPlugin?(id: string, version?: string): Promise<void>;
  update?(id: string, version?: string): Promise<void>;
  updatePlugin?(id: string, version?: string): Promise<void>;
  uninstall?(id: string): Promise<void>;
  uninstallPlugin?(id: string): Promise<void>;
  listInstalledPlugins?(): Promise<PluginInfo[]>;
}

export interface PluginDiscovery {
  discoverPlugins(directories: string | string[]): Promise<PluginManifest[]>;
  loadPlugin(manifest: PluginManifest): Promise<Plugin>;
  validatePlugin(manifest: PluginManifest): Promise<ValidationResult>;
}

export interface PluginConfig {
  enabled: boolean;
  settings: Record<string, any>;
  permissions?: string[];
  resources?: Record<string, any>;
}

export interface PluginEvent {
  type: string;
  pluginId: string;
  data: any;
  timestamp: Date;
  source?: string;
}

export interface PluginDevUtils {
  createTestSuite(pluginId: string): PluginTestSuite;
  createLogger(pluginId: string): PluginLogger;
  createProfiler(pluginId: string): PluginProfiler;
  createStorage(pluginId: string): PluginStorage;
  createScheduler(pluginId: string): PluginScheduler;
}

export interface ExecutionRecord {
  id: string;
  pluginId: string;
  command: string;
  startTime: Date;
  endTime?: Date;
  success: boolean;
  error?: string;
}

export const PLUGIN_EVENTS = {
  ACTIVATED: 'plugin:activated',
  DEACTIVATED: 'plugin:deactivated',
  ERROR: 'plugin:error',
  COMMAND_EXECUTED: 'plugin:command-executed'
} as const;

export interface PluginDevelopmentUtils {
  createLogger(pluginId: string): PluginLogger;
  createStorage(pluginId: string): PluginStorage;
  createScheduler(pluginId: string): PluginScheduler;
  createNotification(pluginId: string): PluginNotification;
  createTelemetry(pluginId: string): PluginTelemetry;
  createDebugger(pluginId: string): PluginDebugger;
  createProfiler(pluginId: string): PluginProfiler;
  createTester(pluginId: string): PluginTester;
  createBuilder(pluginId: string): PluginBuilder;
  createPublisher(pluginId: string): PluginPublisher;
}

export interface PluginLogger {
  debug(message: string, ...args: any[]): void;
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
  trace(message: string, ...args: any[]): void;
  setLevel(level: 'debug' | 'info' | 'warn' | 'error' | 'trace'): void;
  createChild(name: string): PluginLogger;
}

export interface PluginStorage {
  get<T>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
  keys(): Promise<string[]>;
  has(key: string): Promise<boolean>;
  size(): Promise<number>;
}

export interface PluginScheduler {
  schedule(task: () => Promise<void> | void, delay: number): PluginScheduledTask;
  scheduleRepeating(task: () => Promise<void> | void, interval: number): PluginScheduledTask;
  cancel(task: PluginScheduledTask): void;
  cancelAll(): void;
}

export interface PluginScheduledTask {
  id: string;
  cancel(): void;
  reschedule(delay: number): void;
}

export interface PluginNotification {
  showInfo(message: string, ...items: string[]): Promise<string | undefined>;
  showWarning(message: string, ...items: string[]): Promise<string | undefined>;
  showError(message: string, ...items: string[]): Promise<string | undefined>;
  showProgress(title: string, task: (progress: PluginProgress) => Promise<void>): Promise<void>;
}

export interface PluginProgress {
  report(increment: number, message?: string): void;
}

export interface PluginTelemetry {
  sendEvent(event: string, properties?: Record<string, any>): void;
  sendError(error: Error, properties?: Record<string, any>): void;
  sendMetric(metric: string, value: number, properties?: Record<string, any>): void;
}

export interface PluginProfiler {
  start(name: string): PluginProfilerSession;
  measure<T>(name: string, fn: () => T): T;
  measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T>;
}

export interface PluginProfilerSession {
  end(): number;
  mark(name: string): void;
}

export interface PluginTester {
  createSuite(name: string): PluginTestSuite;
  run(suite: PluginTestSuite): Promise<PluginTestResult>;
  runAll(): Promise<PluginTestResult[]>;
}

export interface PluginTestSuite {
  addTest(name: string, test: () => Promise<void> | void): void;
  addSetup(setup: () => Promise<void> | void): void;
  addTeardown(teardown: () => Promise<void> | void): void;
}

export interface PluginTestResult {
  suiteName: string;
  passed: number;
  failed: number;
  skipped: number;
  errors: PluginTestError[];
  duration: number;
}

export interface PluginTestError {
  testName: string;
  message: string;
  stack?: string;
}

export interface PluginBuilder {
  build(): Promise<PluginBuildResult>;
  watch(): Promise<PluginBuildWatcher>;
  clean(): Promise<void>;
}

export interface PluginBuildResult {
  success: boolean;
  errors: string[];
  warnings: string[];
  outputFiles: string[];
  duration: number;
}

export interface PluginBuildWatcher {
  onChanged(callback: (result: PluginBuildResult) => void): void;
  stop(): void;
}

export interface PluginPublisher {
  publish(version?: string): Promise<PluginPublishResult>;
  unpublish(version: string): Promise<void>;
  getVersions(): Promise<string[]>;
}

export interface PluginPublishResult {
  success: boolean;
  version: string;
  packageUrl: string;
  errors: string[];
}
