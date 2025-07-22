import { GitAnalyzerPlugin } from '../builtin/gitAnalyzerPlugin';
import { PluginAPI, PluginContext } from '../../../types/plugin';
import * as vscode from 'vscode';

// Mock VSCode API
jest.mock('vscode', () => ({
  window: {
    showInformationMessage: jest.fn(),
    showWarningMessage: jest.fn(),
    showErrorMessage: jest.fn(),
    withProgress: jest.fn(),
    showTextDocument: jest.fn(),
    showInputBox: jest.fn(),
    showQuickPick: jest.fn()
  },
  workspace: {
    openTextDocument: jest.fn().mockResolvedValue({}),
    fs: {
      writeFile: jest.fn(),
      readFile: jest.fn()
    }
  },
  commands: {
    registerCommand: jest.fn().mockReturnValue({ dispose: jest.fn() })
  }
}));

describe('GitAnalyzerPlugin', () => {
  let gitPlugin: GitAnalyzerPlugin;
  let mockAPI: PluginAPI;
  let mockContext: PluginContext;

  beforeEach(() => {
    gitPlugin = new GitAnalyzerPlugin();
    
    mockAPI = {
      vscode: vscode as any,
      getPluginPath: jest.fn().mockReturnValue('/test/plugin/path'),
      getPluginVersion: jest.fn().mockReturnValue('1.0.0'),
      getPluginMetadata: jest.fn().mockReturnValue({ id: 'test-plugin', name: 'Test Plugin' }),
      registerCommand: jest.fn().mockReturnValue({ dispose: jest.fn() }),
      registerProvider: jest.fn().mockReturnValue({ dispose: jest.fn() }),
      registerAnalyzer: jest.fn(),
      registerFormatter: jest.fn(),
      registerTransformer: jest.fn(),
      registerValidator: jest.fn(),
      getInsightsEngine: jest.fn(),
      getCollaborationService: jest.fn(),
      getExecutionService: jest.fn(),
      showNotification: jest.fn(),
      showProgress: jest.fn(),
      openFile: jest.fn().mockResolvedValue(undefined),
      writeFile: jest.fn().mockResolvedValue(undefined),
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn(),
      createOutputChannel: jest.fn().mockReturnValue({ appendLine: jest.fn(), show: jest.fn() }),
      showMessage: jest.fn(),
      getConfiguration: jest.fn().mockReturnValue({ get: jest.fn(), update: jest.fn() }),
      onDidChangeConfiguration: jest.fn().mockReturnValue({ dispose: jest.fn() }),
      createStatusBarItem: jest.fn().mockReturnValue({ text: '', show: jest.fn(), hide: jest.fn() }),
      createTreeView: jest.fn().mockReturnValue({ reveal: jest.fn() }),
      createWebviewPanel: jest.fn().mockReturnValue({ webview: { html: '', onDidReceiveMessage: jest.fn() } }),
      executeCommand: jest.fn().mockResolvedValue(undefined),
      openExternal: jest.fn().mockResolvedValue(true),
      showTextDocument: jest.fn().mockResolvedValue({}),
      showQuickPick: jest.fn().mockResolvedValue(undefined),
      showInputBox: jest.fn().mockResolvedValue(undefined),
      withProgress: jest.fn().mockImplementation((options, task) => task({ report: jest.fn() }, { isCancellationRequested: false })),
      createTerminal: jest.fn().mockReturnValue({ sendText: jest.fn(), show: jest.fn() }),
      createFileSystemWatcher: jest.fn().mockReturnValue({ onDidChange: jest.fn(), dispose: jest.fn() }),
      findFiles: jest.fn().mockResolvedValue([]),
      openTextDocument: jest.fn().mockResolvedValue({}),
      saveAll: jest.fn().mockResolvedValue(true),
      applyEdit: jest.fn().mockResolvedValue(true),
      createDiagnosticCollection: jest.fn().mockReturnValue({ set: jest.fn(), clear: jest.fn() }),
      registerCodeActionsProvider: jest.fn().mockReturnValue({ dispose: jest.fn() }),
      registerCompletionItemProvider: jest.fn().mockReturnValue({ dispose: jest.fn() }),
      registerDefinitionProvider: jest.fn().mockReturnValue({ dispose: jest.fn() }),
      registerHoverProvider: jest.fn().mockReturnValue({ dispose: jest.fn() }),
      registerDocumentFormattingEditProvider: jest.fn().mockReturnValue({ dispose: jest.fn() }),
      registerDocumentRangeFormattingEditProvider: jest.fn().mockReturnValue({ dispose: jest.fn() }),
      registerRenameProvider: jest.fn().mockReturnValue({ dispose: jest.fn() }),
      registerReferenceProvider: jest.fn().mockReturnValue({ dispose: jest.fn() }),
      registerDocumentSymbolProvider: jest.fn().mockReturnValue({ dispose: jest.fn() }),
      registerDocumentHighlightProvider: jest.fn().mockReturnValue({ dispose: jest.fn() }),
      registerDocumentLinkProvider: jest.fn().mockReturnValue({ dispose: jest.fn() }),
      registerSignatureHelpProvider: jest.fn().mockReturnValue({ dispose: jest.fn() }),
      registerDebugConfigurationProvider: jest.fn().mockReturnValue({ dispose: jest.fn() }),
      registerDebugAdapterDescriptorFactory: jest.fn().mockReturnValue({ dispose: jest.fn() }),
      registerTaskProvider: jest.fn().mockReturnValue({ dispose: jest.fn() }),
      createTask: jest.fn(),
      executeTask: jest.fn().mockResolvedValue({}),
      onDidStartTask: jest.fn().mockReturnValue({ dispose: jest.fn() }),
      onDidEndTask: jest.fn().mockReturnValue({ dispose: jest.fn() }),
      onDidStartTaskProcess: jest.fn().mockReturnValue({ dispose: jest.fn() }),
      onDidEndTaskProcess: jest.fn().mockReturnValue({ dispose: jest.fn() }),
      createTreeDataProvider: jest.fn().mockReturnValue({ dispose: jest.fn() }),
      createCustomTextEditorProvider: jest.fn().mockReturnValue({ dispose: jest.fn() }),
      createCustomEditorProvider: jest.fn().mockReturnValue({ dispose: jest.fn() }),
      createWebviewViewProvider: jest.fn().mockReturnValue({ dispose: jest.fn() }),
      createAuthenticationProvider: jest.fn().mockReturnValue({ dispose: jest.fn() }),
      createSourceControlResourceGroup: jest.fn(),
      createSourceControl: jest.fn(),
      createCommentController: jest.fn(),
      createNotebookController: jest.fn(),
      createNotebookCellExecution: jest.fn(),
      createNotebookCellOutput: jest.fn(),
      createNotebookCellOutputItem: jest.fn(),
      createNotebookDocument: jest.fn(),
      createNotebookEdit: jest.fn(),
      createNotebookRange: jest.fn(),
      createNotebookCell: jest.fn(),
      createNotebookCellData: jest.fn(),
      createNotebookData: jest.fn(),
      createNotebookDocumentFilter: jest.fn(),
      createNotebookDocumentMetadata: jest.fn()
    } as PluginAPI;
    
    mockContext = {
      subscriptions: [],
      workspaceState: { get: jest.fn(), update: jest.fn(), keys: jest.fn().mockReturnValue([]) } as any,
      globalState: { get: jest.fn(), update: jest.fn(), keys: jest.fn().mockReturnValue([]) } as any,
      secrets: { get: jest.fn(), store: jest.fn(), delete: jest.fn() } as any,
      extensionUri: { scheme: 'file', path: '/test', fsPath: '/test' } as any,
      extensionPath: '/test/extension',
      environmentVariableCollection: {} as any,
      asAbsolutePath: jest.fn().mockImplementation((path: string) => `/test/extension/${path}`),
      storageUri: { scheme: 'file', path: '/test/storage', fsPath: '/test/storage' } as any,
      storagePath: '/test/storage',
      globalStorageUri: { scheme: 'file', path: '/test/global', fsPath: '/test/global' } as any,
      globalStoragePath: '/test/global',
      logUri: { scheme: 'file', path: '/test/logs', fsPath: '/test/logs' } as any,
      logPath: '/test/logs',
      extensionMode: 3 as any, // vscode.ExtensionMode.Test
      extension: {} as any,
      workspaceRoot: '/test/workspace',
      currentFile: 'test.ts',
      selectedText: 'test selection',
      executionHistory: [],
      aiInsights: [],
      collaborationData: {},
      customData: {}
    } as PluginContext;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Plugin Metadata', () => {
    it('should have valid metadata', () => {
      expect(gitPlugin.metadata.id).toBe('builtin-git-analyzer');
      expect(gitPlugin.metadata.name).toBe('Git Analyzer');
      expect(gitPlugin.metadata.version).toBe('1.0.0');
      expect(gitPlugin.metadata.enabled).toBe(true);
      expect(gitPlugin.metadata.capabilities).toHaveLength(2);
    });

    it('should have analyzer capability', () => {
      const analyzerCapability = gitPlugin.metadata.capabilities.find(c => c.type === 'analyzer');
      expect(analyzerCapability).toBeDefined();
      expect(analyzerCapability?.name).toBe('git-analyzer');
    });

    it('should have command capability', () => {
      const commandCapability = gitPlugin.metadata.capabilities.find(c => c.type === 'command');
      expect(commandCapability).toBeDefined();
      expect(commandCapability?.name).toBe('git-insights');
    });
  });

  describe('Plugin Activation', () => {
    it('should activate successfully', async () => {
      await gitPlugin.activate(mockAPI, mockContext);
      
      expect(mockAPI.registerAnalyzer).toHaveBeenCalledTimes(1);
      expect(mockAPI.registerCommand).toHaveBeenCalledTimes(2);
      expect(mockAPI.on).toHaveBeenCalledWith('git:commit', expect.any(Function));
      expect(mockAPI.on).toHaveBeenCalledWith('git:branch-changed', expect.any(Function));
    });

    it('should deactivate successfully', async () => {
      await gitPlugin.activate(mockAPI, mockContext);
      await gitPlugin.deactivate(mockAPI, mockContext);
      
      expect(mockAPI.off).toHaveBeenCalledWith('git:commit');
      expect(mockAPI.off).toHaveBeenCalledWith('git:branch-changed');
    });
  });

  describe('Analyzers', () => {
    it('should have git commit analyzer', () => {
      const analyzers = gitPlugin.analyzers;
      expect(analyzers).toHaveLength(1);
      
      const commitAnalyzer = analyzers[0];
      expect(commitAnalyzer.id).toBe('git-commit-analyzer');
      expect(commitAnalyzer.name).toBe('Git Commit Analyzer');
      expect(commitAnalyzer.filePatterns).toContain('.git/**/*');
    });

    it('should analyze git content successfully', async () => {
      const analyzers = gitPlugin.analyzers;
      const analyzer = analyzers[0];
      
      const result = await analyzer.analyze('', '.git/HEAD', mockContext);
      
      expect(result).toBeDefined();
      expect(result.issues).toBeDefined();
      expect(result.metrics).toBeDefined();
      expect(result.suggestions).toBeDefined();
      expect(result.confidence).toBe(0.85);
    });

    it('should handle analysis errors gracefully', async () => {
      const analyzers = gitPlugin.analyzers;
      const analyzer = analyzers[0];
      
      const result = await analyzer.analyze('', '.git/HEAD', mockContext);
      
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].type).toBe('warning');
      expect(result.issues[0].message).toContain('commit(s) with poor messages');
    });
  });

  describe('Commands', () => {
    it('should have git health check command', () => {
      const commands = gitPlugin.commands;
      expect(commands).toHaveLength(2);
      
      const healthCheckCommand = commands.find(c => c.id === 'git-health-check');
      expect(healthCheckCommand).toBeDefined();
      expect(healthCheckCommand?.title).toBe('Git Health Check');
      expect(healthCheckCommand?.category).toBe('Git');
    });

    it('should have git optimize workflow command', () => {
      const commands = gitPlugin.commands;
      
      const optimizeCommand = commands.find(c => c.id === 'git-optimize-workflow');
      expect(optimizeCommand).toBeDefined();
      expect(optimizeCommand?.title).toBe('Optimize Git Workflow');
      expect(optimizeCommand?.category).toBe('Git');
    });

    it('should execute git health check command', async () => {
      const commands = gitPlugin.commands;
      const healthCheckCommand = commands.find(c => c.id === 'git-health-check');
      
      const result = await healthCheckCommand?.execute(mockContext);
      
      expect(result).toBeDefined();
      expect(result.overall).toBeDefined();
      expect(result.scores).toBeDefined();
      expect(vscode.workspace.openTextDocument).toHaveBeenCalled();
    });

    it('should execute git optimize workflow command', async () => {
      const commands = gitPlugin.commands;
      const optimizeCommand = commands.find(c => c.id === 'git-optimize-workflow');
      
      (vscode.window.showQuickPick as jest.Mock).mockResolvedValue({
        label: 'Setup Git Hooks',
        description: 'Add pre-commit hooks for code quality checks'
      });
      
      const result = await optimizeCommand?.execute(mockContext);
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(vscode.window.showQuickPick).toHaveBeenCalled();
    });
  });

  describe('Analysis Methods', () => {
    it('should analyze commit history', async () => {
      await gitPlugin.activate(mockAPI, mockContext);
      
      // Access private method through any casting for testing
      const plugin = gitPlugin as any;
      const result = await plugin.analyzeCommitHistory(mockContext);
      
      expect(result).toBeDefined();
      expect(result.issues).toBeDefined();
      expect(result.metrics).toBeDefined();
      expect(result.suggestions).toBeDefined();
      expect(result.confidence).toBe(0.9);
    });

    it('should analyze branches', async () => {
      await gitPlugin.activate(mockAPI, mockContext);
      
      const plugin = gitPlugin as any;
      const result = await plugin.analyzeBranches(mockContext);
      
      expect(result).toBeDefined();
      expect(result.issues).toBeDefined();
      expect(result.metrics).toBeDefined();
      expect(result.suggestions).toBeDefined();
      expect(result.confidence).toBe(0.8);
    });

    it('should analyze changes', async () => {
      await gitPlugin.activate(mockAPI, mockContext);
      
      const plugin = gitPlugin as any;
      const result = await plugin.analyzeChanges(mockContext);
      
      expect(result).toBeDefined();
      expect(result.issues).toBeDefined();
      expect(result.metrics).toBeDefined();
      expect(result.suggestions).toBeDefined();
      expect(result.confidence).toBe(0.85);
    });

    it('should perform health check', async () => {
      await gitPlugin.activate(mockAPI, mockContext);
      
      const plugin = gitPlugin as any;
      const result = await plugin.performHealthCheck(mockContext);
      
      expect(result).toBeDefined();
      expect(result.overall).toBeDefined();
      expect(result.scores).toBeDefined();
      expect(result.scores.commitQuality).toBeDefined();
      expect(result.scores.branchHealth).toBeDefined();
    });

    it('should suggest workflow optimizations', async () => {
      await gitPlugin.activate(mockAPI, mockContext);
      
      const plugin = gitPlugin as any;
      const result = await plugin.suggestWorkflowOptimizations(mockContext);
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('title');
      expect(result[0]).toHaveProperty('description');
      expect(result[0]).toHaveProperty('impact');
    });
  });

  describe('Utility Methods', () => {
    it('should get recent commits', async () => {
      const plugin = gitPlugin as any;
      const commits = await plugin.getRecentCommits(mockContext);
      
      expect(commits).toBeDefined();
      expect(Array.isArray(commits)).toBe(true);
      expect(commits.length).toBeGreaterThan(0);
    });

    it('should get branches', async () => {
      const plugin = gitPlugin as any;
      const branches = await plugin.getBranches(mockContext);
      
      expect(branches).toBeDefined();
      expect(Array.isArray(branches)).toBe(true);
      expect(branches.length).toBeGreaterThan(0);
    });

    it('should get uncommitted files', async () => {
      const plugin = gitPlugin as any;
      const files = await plugin.getUncommittedFiles(mockContext);
      
      expect(files).toBeDefined();
      expect(Array.isArray(files)).toBe(true);
    });

    it('should analyze commit frequency', () => {
      const plugin = gitPlugin as any;
      const commits = [
        { date: new Date() },
        { date: new Date(Date.now() - 3600000) }, // 1 hour ago
        { date: new Date(Date.now() - 86400000 * 2) } // 2 days ago
      ];
      
      const frequency = plugin.analyzeCommitFrequency(commits);
      
      expect(frequency).toBeDefined();
      expect(frequency.daily).toBeDefined();
      expect(frequency.weekly).toBeDefined();
      expect(frequency.daily).toBeGreaterThanOrEqual(0);
      expect(frequency.weekly).toBeGreaterThanOrEqual(0);
    });

    it('should identify stale branches', () => {
      const plugin = gitPlugin as any;
      const staleBranch = {
        name: 'old-feature',
        lastCommit: new Date(Date.now() - 86400000 * 40), // 40 days ago
        active: false
      };
      const activeBranch = {
        name: 'main',
        lastCommit: new Date(),
        active: true
      };
      
      expect(plugin.isStaleBranch(staleBranch)).toBe(true);
      expect(plugin.isStaleBranch(activeBranch)).toBe(false);
    });

    it('should identify large files', () => {
      const plugin = gitPlugin as any;
      const largeFile = { size: 150 * 1024 * 1024 }; // 150MB
      const smallFile = { size: 50 * 1024 }; // 50KB
      
      expect(plugin.isLargeFile(largeFile)).toBe(true);
      expect(plugin.isLargeFile(smallFile)).toBe(false);
    });

    it('should calculate commit quality score', () => {
      const plugin = gitPlugin as any;
      const analysis = {
        metrics: {
          'total-commits': 10,
          'poor-commit-messages': 2,
          'long-commit-messages': 1
        }
      };
      
      const score = plugin.calculateCommitQualityScore(analysis);
      
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });

    it('should calculate branch health score', () => {
      const plugin = gitPlugin as any;
      const analysis = {
        metrics: {
          'total-branches': 5,
          'stale-branches': 1
        }
      };
      
      const score = plugin.calculateBranchHealthScore(analysis);
      
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });

    it('should format health report', () => {
      const plugin = gitPlugin as any;
      const health = {
        overall: 'good',
        scores: {
          commitQuality: 0.85,
          branchHealth: 0.78,
          repositorySize: 0.90,
          workflowEfficiency: 0.82
        },
        recommendations: [
          'Clean up old branches',
          'Improve commit messages'
        ]
      };
      
      const report = plugin.formatHealthReport(health);
      
      expect(report).toBeDefined();
      expect(typeof report).toBe('string');
      expect(report).toContain('# Git Repository Health Report');
      expect(report).toContain('Overall Health: GOOD');
      expect(report).toContain('Clean up old branches');
    });
  });
});
