# VSCode Extension Implementation Plan: NX Affected Mode & Enhanced Git Diff

## Technical Architecture Overview

The extension architecture follows a **modular command-provider pattern** with separate modules for NX integration, Git operations, and UI components. The system uses **event-driven communication** between components and implements **lazy loading** for performance optimization.

### Core Architecture Components

**Extension Entry Point (`src/extension.ts`)**
```typescript
export function activate(context: vscode.ExtensionContext) {
  // Initialize managers
  const nxManager = new NxAffectedManager(context);
  const gitManager = new GitDiffManager(context);
  const configManager = new ConfigurationManager(context);
  
  // Register command providers
  const nxProvider = new NxCommandProvider(nxManager);
  const gitProvider = new GitCommandProvider(gitManager);
  
  // Setup UI components
  const statusBar = new ExtensionStatusBar(context);
  const treeView = new ProjectTreeProvider(nxManager);
  
  // Register all components
  context.subscriptions.push(
    ...nxProvider.register(),
    ...gitProvider.register(),
    statusBar,
    vscode.window.createTreeView('nxProjects', { treeDataProvider: treeView })
  );
}
```

**Project Structure**
```
src/
├── extension.ts                 # Main entry point
├── managers/
│   ├── NxAffectedManager.ts    # NX affected logic
│   ├── GitDiffManager.ts       # Git diff operations
│   └── ConfigurationManager.ts # Settings management
├── providers/
│   ├── NxCommandProvider.ts    # NX command registration
│   ├── GitCommandProvider.ts   # Git command registration
│   └── ProjectTreeProvider.ts  # Tree view data provider
├── ui/
│   ├── StatusBar.ts            # Status bar integration
│   ├── webview/                # Interactive UI components
│   └── dialogs/                # Input dialogs
├── utils/
│   ├── CommandExecutor.ts      # Safe command execution
│   ├── GitUtils.ts             # Git helper functions
│   └── ValidationUtils.ts      # Input validation
└── test/
    ├── unit/                   # Unit tests
    └── integration/            # Integration tests
```

## Feature 1: NX Affected Mode Implementation

### Phase 1: Core NX Integration (Week 1-2)

**NX Affected Manager Implementation**
```typescript
export class NxAffectedManager {
  private workspaceRoot: string;
  private nxConfig: any;
  private affectedCache: Map<string, string[]> = new Map();
  
  constructor(private context: vscode.ExtensionContext) {
    this.workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
    this.loadNxConfiguration();
    this.setupFileWatcher();
  }
  
  async getAffectedProjects(base: string = 'main'): Promise<string[]> {
    const cacheKey = `${base}-${await this.getHeadCommit()}`;
    
    if (this.affectedCache.has(cacheKey)) {
      return this.affectedCache.get(cacheKey)!;
    }
    
    const projects = await this.executeNxCommand(['show', 'projects', '--affected', '--base', base]);
    this.affectedCache.set(cacheKey, projects);
    
    return projects;
  }
  
  private async executeNxCommand(args: string[]): Promise<string[]> {
    return new Promise((resolve, reject) => {
      const child = spawn('nx', args, {
        cwd: this.workspaceRoot,
        stdio: 'pipe'
      });
      
      let output = '';
      let errorOutput = '';
      
      child.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      child.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });
      
      child.on('close', (code) => {
        if (code === 0) {
          const projects = output.trim().split('\n').filter(p => p.length > 0);
          resolve(projects);
        } else {
          reject(new Error(`NX command failed: ${errorOutput}`));
        }
      });
    });
  }
  
  private setupFileWatcher() {
    const watcher = vscode.workspace.createFileSystemWatcher('**/*');
    watcher.onDidChange(() => this.clearAffectedCache());
    watcher.onDidCreate(() => this.clearAffectedCache());
    watcher.onDidDelete(() => this.clearAffectedCache());
    this.context.subscriptions.push(watcher);
  }
}
```

**Command Provider for NX Operations**
```typescript
export class NxCommandProvider {
  constructor(private nxManager: NxAffectedManager) {}
  
  register(): vscode.Disposable[] {
    return [
      vscode.commands.registerCommand('nx.runAffected', this.runAffected.bind(this)),
      vscode.commands.registerCommand('nx.testAffected', this.testAffected.bind(this)),
      vscode.commands.registerCommand('nx.lintAffected', this.lintAffected.bind(this)),
      vscode.commands.registerCommand('nx.buildAffected', this.buildAffected.bind(this))
    ];
  }
  
  private async runAffected(target: string) {
    try {
      const projects = await this.nxManager.getAffectedProjects();
      
      if (projects.length === 0) {
        vscode.window.showInformationMessage('No affected projects found');
        return;
      }
      
      await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: `Running ${target} on ${projects.length} affected projects`,
        cancellable: true
      }, async (progress, token) => {
        for (let i = 0; i < projects.length; i++) {
          if (token.isCancellationRequested) break;
          
          const project = projects[i];
          progress.report({
            increment: (100 / projects.length),
            message: `Processing ${project}...`
          });
          
          await this.executeProjectCommand(project, target);
        }
      });
      
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to run affected ${target}: ${error.message}`);
    }
  }
}
```

### Phase 2: Workspace Detection and Configuration (Week 2-3)

**Workspace Detection Implementation**
```typescript
export class WorkspaceDetector {
  static isNxWorkspace(workspacePath: string): boolean {
    return existsSync(path.join(workspacePath, 'nx.json')) || 
           existsSync(path.join(workspacePath, 'angular.json'));
  }
  
  static async getNxConfiguration(workspacePath: string): Promise<any> {
    const nxConfigPath = path.join(workspacePath, 'nx.json');
    const angularConfigPath = path.join(workspacePath, 'angular.json');
    
    if (existsSync(nxConfigPath)) {
      return JSON.parse(await fs.readFile(nxConfigPath, 'utf-8'));
    }
    
    if (existsSync(angularConfigPath)) {
      return JSON.parse(await fs.readFile(angularConfigPath, 'utf-8'));
    }
    
    throw new Error('No NX configuration found');
  }
}
```

**Configuration Schema (package.json)**
```json
{
  "contributes": {
    "configuration": {
      "title": "NX Angular Extension",
      "properties": {
        "nxAngular.defaultBase": {
          "type": "string",
          "default": "main",
          "description": "Default base branch for affected calculations"
        },
        "nxAngular.enableAffectedMode": {
          "type": "boolean",
          "default": true,
          "description": "Enable automatic affected mode for commands"
        },
        "nxAngular.parallelExecutions": {
          "type": "number",
          "default": 3,
          "minimum": 1,
          "maximum": 10,
          "description": "Number of parallel executions for affected commands"
        }
      }
    }
  }
}
```

### Phase 3: UI Integration and Status Display (Week 3-4)

**Status Bar Implementation**
```typescript
export class ExtensionStatusBar {
  private statusBarItem: vscode.StatusBarItem;
  private affectedCount: number = 0;
  
  constructor(private context: vscode.ExtensionContext) {
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      10
    );
    this.statusBarItem.command = 'nx.showAffectedProjects';
    this.updateStatusBar();
    this.statusBarItem.show();
  }
  
  updateAffectedCount(count: number) {
    this.affectedCount = count;
    this.updateStatusBar();
  }
  
  private updateStatusBar() {
    this.statusBarItem.text = `$(gear) NX (${this.affectedCount} affected)`;
    this.statusBarItem.tooltip = `${this.affectedCount} projects affected by recent changes`;
  }
}
```

## Feature 2: Enhanced Git Diff Options Implementation

### Phase 1: Git Integration Foundation (Week 2-3)

**Git Diff Manager Implementation**
```typescript
export class GitDiffManager {
  private gitApi: GitAPI;
  private repository: Repository;
  
  constructor(private context: vscode.ExtensionContext) {
    this.initializeGitApi();
  }
  
  private async initializeGitApi() {
    const gitExtension = vscode.extensions.getExtension('vscode.git');
    if (!gitExtension) {
      throw new Error('Git extension not found');
    }
    
    const git = gitExtension.isActive ? gitExtension.exports : await gitExtension.activate();
    this.gitApi = git.getAPI(1);
    this.repository = this.gitApi.repositories[0];
  }
  
  async getCommitHistory(maxCount: number = 50): Promise<GitCommit[]> {
    const commits = await this.executeGitCommand([
      'log',
      '--oneline',
      '--max-count',
      maxCount.toString(),
      '--pretty=format:%H|%s|%an|%ad|%P',
      '--date=short'
    ]);
    
    return commits.map(line => this.parseCommitLine(line));
  }
  
  async getBranchDiff(branch1: string, branch2: string): Promise<GitDiff> {
    const diffOutput = await this.executeGitCommand([
      'diff',
      '--name-status',
      `${branch1}...${branch2}`
    ]);
    
    return this.parseDiffOutput(diffOutput);
  }
  
  async getInteractiveDiff(commit1: string, commit2: string): Promise<string> {
    return await this.executeGitCommand([
      'diff',
      '--unified=3',
      '--color=never',
      commit1,
      commit2
    ]);
  }
}
```

### Phase 2: Interactive Commit Selection UI (Week 3-4)

**Commit Selection Webview**
```typescript
export class CommitSelectionWebview {
  private panel: vscode.WebviewPanel;
  private commits: GitCommit[] = [];
  
  constructor(private context: vscode.ExtensionContext) {
    this.panel = vscode.window.createWebviewPanel(
      'gitCommitSelection',
      'Select Commits for Diff',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'media')]
      }
    );
    
    this.setupWebview();
  }
  
  private setupWebview() {
    this.panel.webview.html = this.getWebviewContent();
    
    this.panel.webview.onDidReceiveMessage(message => {
      switch (message.command) {
        case 'selectCommits':
          this.handleCommitSelection(message.commits);
          break;
        case 'loadMoreCommits':
          this.loadMoreCommits();
          break;
      }
    });
  }
  
  private getWebviewContent(): string {
    const stylesUri = this.panel.webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'media', 'commit-selection.css')
    );
    
    const scriptUri = this.panel.webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'media', 'commit-selection.js')
    );
    
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link href="${stylesUri}" rel="stylesheet">
        <title>Git Commit Selection</title>
      </head>
      <body>
        <div id="commit-list"></div>
        <div id="actions">
          <button id="compare-btn" disabled>Compare Selected</button>
          <button id="load-more-btn">Load More</button>
        </div>
        <script src="${scriptUri}"></script>
      </body>
      </html>
    `;
  }
}
```

### Phase 3: Branch Comparison Interface (Week 4-5)

**Branch Comparison Implementation**
```typescript
export class BranchComparisonProvider {
  constructor(private gitManager: GitDiffManager) {}
  
  async showBranchComparison() {
    const branches = await this.gitManager.getBranches();
    const mainBranch = this.detectMainBranch(branches);
    const currentBranch = await this.gitManager.getCurrentBranch();
    
    const selectedBranches = await this.showBranchSelectionDialog(branches, {
      branch1: currentBranch,
      branch2: mainBranch
    });
    
    if (selectedBranches) {
      await this.performBranchComparison(selectedBranches.branch1, selectedBranches.branch2);
    }
  }
  
  private async showBranchSelectionDialog(branches: string[], defaults: any) {
    const quickPick = vscode.window.createQuickPick();
    quickPick.items = branches.map(branch => ({
      label: branch,
      description: branch === defaults.branch1 ? 'Current branch' : 
                  branch === defaults.branch2 ? 'Main branch' : ''
    }));
    
    quickPick.canSelectMany = true;
    quickPick.placeholder = 'Select two branches to compare';
    quickPick.show();
    
    return new Promise<{branch1: string, branch2: string} | undefined>(resolve => {
      quickPick.onDidAccept(() => {
        const selected = quickPick.selectedItems;
        if (selected.length === 2) {
          resolve({
            branch1: selected[0].label,
            branch2: selected[1].label
          });
        }
        quickPick.dispose();
      });
    });
  }
}
```

## Security and Performance Considerations

### Security Implementation

**Input Validation and Command Sanitization**
```typescript
export class CommandValidator {
  private static readonly ALLOWED_NX_COMMANDS = [
    'show', 'affected', 'build', 'test', 'lint', 'serve'
  ];
  
  private static readonly ALLOWED_GIT_COMMANDS = [
    'diff', 'log', 'branch', 'status', 'show'
  ];
  
  static validateNxCommand(command: string, args: string[]): boolean {
    if (!this.ALLOWED_NX_COMMANDS.includes(command)) {
      throw new Error(`Command not allowed: ${command}`);
    }
    
    // Validate arguments
    for (const arg of args) {
      if (arg.includes('..') || arg.includes('~') || arg.includes('$')) {
        throw new Error(`Invalid argument: ${arg}`);
      }
    }
    
    return true;
  }
  
  static sanitizeFilePath(filePath: string): string {
    return path.normalize(filePath).replace(/^(\.\.[\/\\])+/, '');
  }
}
```

**Secure Command Execution**
```typescript
export class SecureCommandExecutor {
  static async executeCommand(
    command: string,
    args: string[],
    options: any = {}
  ): Promise<string> {
    // Validate command and arguments
    this.validateCommand(command, args);
    
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        cwd: options.cwd || process.cwd(),
        stdio: 'pipe',
        shell: false, // Prevent shell injection
        env: { ...process.env, ...options.env }
      });
      
      let output = '';
      let errorOutput = '';
      
      child.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      child.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });
      
      child.on('close', (code) => {
        if (code === 0) {
          resolve(output);
        } else {
          reject(new Error(`Command failed with code ${code}: ${errorOutput}`));
        }
      });
      
      // Set timeout for long-running commands
      setTimeout(() => {
        child.kill();
        reject(new Error('Command timeout'));
      }, 30000);
    });
  }
}
```

### Performance Optimization

**Caching Strategy**
```typescript
export class PerformanceCache {
  private cache = new Map<string, { data: any, timestamp: number }>();
  private readonly TTL = 5 * 60 * 1000; // 5 minutes
  
  get<T>(key: string): T | undefined {
    const cached = this.cache.get(key);
    if (cached && (Date.now() - cached.timestamp) < this.TTL) {
      return cached.data;
    }
    this.cache.delete(key);
    return undefined;
  }
  
  set<T>(key: string, data: T): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }
  
  clear(): void {
    this.cache.clear();
  }
}
```

**Background Task Processing**
```typescript
export class BackgroundTaskManager {
  private taskQueue: Array<() => Promise<void>> = [];
  private isProcessing = false;
  
  async addTask(task: () => Promise<void>): Promise<void> {
    this.taskQueue.push(task);
    this.processQueue();
  }
  
  private async processQueue(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;
    
    while (this.taskQueue.length > 0) {
      const task = this.taskQueue.shift();
      if (task) {
        try {
          await task();
        } catch (error) {
          console.error('Background task failed:', error);
        }
      }
    }
    
    this.isProcessing = false;
  }
}
```

## Testing Strategy

### Unit Testing Framework
```typescript
// test/unit/NxAffectedManager.test.ts
import { NxAffectedManager } from '../../src/managers/NxAffectedManager';
import * as vscode from 'vscode';

jest.mock('vscode', () => ({
  workspace: {
    workspaceFolders: [{ uri: { fsPath: '/test/workspace' } }]
  }
}));

describe('NxAffectedManager', () => {
  let manager: NxAffectedManager;
  let mockContext: vscode.ExtensionContext;
  
  beforeEach(() => {
    mockContext = {
      subscriptions: [],
      extensionUri: vscode.Uri.file('/test')
    } as any;
    
    manager = new NxAffectedManager(mockContext);
  });
  
  test('should detect affected projects', async () => {
    const mockProjects = ['app1', 'lib1'];
    jest.spyOn(manager as any, 'executeNxCommand').mockResolvedValue(mockProjects);
    
    const result = await manager.getAffectedProjects();
    expect(result).toEqual(mockProjects);
  });
});
```

### Integration Testing
```typescript
// test/integration/extension.test.ts
import * as vscode from 'vscode';
import * as assert from 'assert';

suite('Extension Integration Tests', () => {
  test('Extension should activate', async () => {
    const ext = vscode.extensions.getExtension('publisher.nx-angular-extension');
    assert.ok(ext);
    
    await ext.activate();
    assert.ok(ext.isActive);
  });
  
  test('NX commands should be registered', async () => {
    const commands = await vscode.commands.getCommands(true);
    assert.ok(commands.includes('nx.runAffected'));
    assert.ok(commands.includes('nx.testAffected'));
  });
});
```

## Implementation Timeline

### Phase 1: Foundation (Weeks 1-2)
- **Week 1**: Project setup, basic architecture, NX workspace detection
- **Week 2**: Core NX affected manager implementation, basic command execution

### Phase 2: NX Affected Features (Weeks 2-4)
- **Week 2-3**: NX command providers, affected project detection
- **Week 3-4**: Status bar integration, project tree view, configuration management

### Phase 3: Git Integration (Weeks 3-5)
- **Week 3**: Git manager implementation, basic diff operations
- **Week 4**: Interactive commit selection UI, webview implementation
- **Week 5**: Branch comparison interface, advanced diff features

### Phase 4: UI Enhancement (Weeks 4-6)
- **Week 4-5**: Webview development, interactive components
- **Week 5-6**: Theme integration, accessibility features, responsive design

### Phase 5: Testing and Optimization (Weeks 5-7)
- **Week 5-6**: Unit and integration testing implementation
- **Week 6-7**: Performance optimization, security auditing, error handling

### Phase 6: Polish and Deployment (Weeks 7-8)
- **Week 7**: Documentation, marketplace preparation, final testing
- **Week 8**: Publishing, user feedback collection, initial bug fixes

## Risk Assessment and Mitigation

**Technical Risks:**
- **NX API Changes**: Mitigate by implementing version detection and fallback mechanisms
- **Git Integration Complexity**: Use established patterns from GitLens and Git Graph extensions
- **Performance in Large Repos**: Implement lazy loading and background processing

**Timeline Risks:**
- **Scope Creep**: Maintain strict feature boundaries and prioritize core functionality
- **Testing Complexity**: Allocate 30% of development time for testing
- **Platform Compatibility**: Test on Windows, macOS, and Linux throughout development

**Deployment Risks:**
- **Marketplace Approval**: Follow VS Code extension guidelines strictly
- **User Adoption**: Provide comprehensive documentation and examples
- **Support Burden**: Implement proper error handling and logging

This comprehensive implementation plan provides a structured approach to building robust, secure, and performant VSCode extensions for Angular NX monorepos, with estimated completion in 8 weeks for a team of 2-3 developers.
