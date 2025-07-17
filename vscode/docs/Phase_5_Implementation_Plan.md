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
  const flipperManager = new FlipperDetectionManager(context);
  
  // Register command providers
  const nxProvider = new NxCommandProvider(nxManager);
  const gitProvider = new GitCommandProvider(gitManager);
  const flipperProvider = new FlipperCommandProvider(flipperManager);
  
  // Setup UI components
  const statusBar = new ExtensionStatusBar(context);
  const treeView = new ProjectTreeProvider(nxManager);
  
  // Register all components
  context.subscriptions.push(
    ...nxProvider.register(),
    ...gitProvider.register(),
    ...flipperProvider.register(),
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
│   ├── FlipperDetectionManager.ts # Flipper pattern detection
│   └── ConfigurationManager.ts # Settings management
├── providers/
│   ├── NxCommandProvider.ts    # NX command registration
│   ├── GitCommandProvider.ts   # Git command registration
│   ├── FlipperCommandProvider.ts # Flipper command registration
│   └── ProjectTreeProvider.ts  # Tree view data provider
├── ui/
│   ├── StatusBar.ts            # Status bar integration
│   ├── webview/                # Interactive UI components
│   └── dialogs/                # Input dialogs
├── utils/
│   ├── CommandExecutor.ts      # Safe command execution
│   ├── GitUtils.ts             # Git helper functions
│   ├── FlipperPatterns.ts      # Flipper detection patterns
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
        },
        "flipperDetection.enabled": {
          "type": "boolean",
          "default": true,
          "description": "Enable Flipper feature flag detection"
        },
        "flipperDetection.includePRSection": {
          "type": "boolean",
          "default": true,
          "description": "Include Flipper section in PR descriptions"
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
  private flipperCount: number = 0;
  
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

  updateFlipperCount(count: number) {
    this.flipperCount = count;
    this.updateStatusBar();
  }
  
  private updateStatusBar() {
    const statusParts = [`$(gear) NX (${this.affectedCount} affected)`];
    if (this.flipperCount > 0) {
      statusParts.push(`$(settings-gear) ${this.flipperCount} flippers`);
    }
    this.statusBarItem.text = statusParts.join(' | ');
    this.statusBarItem.tooltip = `${this.affectedCount} projects affected by recent changes${this.flipperCount > 0 ? `, ${this.flipperCount} flipper changes detected` : ''}`;
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

## Feature 3: Flipper Detection Implementation

### Core Flipper Detection Service

Based on your specific requirements, here's the comprehensive Flipper detection integrated into Git Diff analysis:

```typescript
export class FlipperDetectionManager {
  private broadPatterns: FlipperBroadPattern[];
  private cache = new Map<string, FlipperDetectionResult>();
  
  constructor(private context: vscode.ExtensionContext) {
    this.initializeBroadPatterns();
    this.setupFileWatcher();
  }
  
  private initializeBroadPatterns() {
    this.broadPatterns = [
      // 1. FlipperService imports and dependencies
      {
        type: 'import',
        pattern: /import\s+.*FlipperService.*from\s+['"]@callrail\/looky\/core['"]/g,
        description: 'FlipperService import',
        extractFlag: false
      },
      {
        type: 'import',
        pattern: /import\s+.*FlipperFlags.*from.*flipper-flags/g,
        description: 'FlipperFlags type import',
        extractFlag: false
      },
      {
        type: 'injection',
        pattern: /constructor\([^)]*FlipperService[^)]*\)/g,
        description: 'FlipperService dependency injection',
        extractFlag: false
      },
      
      // 2. Direct method calls with flag extraction
      {
        type: 'method_call',
        pattern: /\.flipperEnabled\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g,
        description: 'flipperEnabled() method call',
        extractFlag: true
      },
      {
        type: 'method_call',
        pattern: /\.eagerlyEnabled\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g,
        description: 'eagerlyEnabled() method call',
        extractFlag: true
      },
      
      // 3. Observable patterns from FlipperService
      {
        type: 'observable',
        pattern: /(\w+)\$:\s*Observable<boolean>\s*=\s*this\.flipper\$\.pipe\(/g,
        description: 'Flipper observable declaration',
        extractFlag: true,
        flagIndex: 1
      },
      {
        type: 'observable',
        pattern: /\.pipe\(\s*map\(\s*\([^)]*\)\s*=>\s*[^.]*\.isEnabled\s*\(\s*['"`]([^'"`]+)['"`]\s*\)\s*\)/g,
        description: 'Feature flag check in observable pipe',
        extractFlag: true
      },
      
      // 4. Specific pre-defined observables from actual FlipperService
      {
        type: 'predefined_observable',
        pattern: /(zuoraMaintenance|reportingNoop|acceleratedCallLog|otherHomepage|fullstory|cursorPaginateAcceleratedCallLog)\$/g,
        description: 'Pre-defined flipper observable usage',
        extractFlag: true,
        flagMapping: {
          'zuoraMaintenance': 'zuora_maintenance',
          'reportingNoop': 'reporting_noop',
          'acceleratedCallLog': 'accelerated_call_log',
          'otherHomepage': 'other_homepage',
          'fullstory': 'allow_fullstory_tracking',
          'cursorPaginateAcceleratedCallLog': 'cursor_paginate_accelerated_call_log'
        }
      },
      
      // 5. Configuration and setup patterns
      {
        type: 'configuration',
        pattern: /loadFlippers\s*\([^)]*\)/g,
        description: 'Flipper configuration loading',
        extractFlag: false
      },
      {
        type: 'configuration',
        pattern: /enabledFlippers\s*\([^)]*\)/g,
        description: 'Flipper enablement configuration',
        extractFlag: false
      },
      
      // 6. Feature flag string literals (comprehensive list)
      {
        type: 'flag_literal',
        pattern: /['"`](zuora_maintenance|pendo_resource_center|support_chat|show_cc_link_to_pending|show_call_tracking_migration_alert|ci_forms_incentive|reporting_noop|internal_calling|add_remove_lc_agents_ux|zuora_qa|account_billing_usage|use_inti|use_inti_for_bulk_google_adword|use_inti_for_my_case|use_inti_for_unbounce|apple_business_connect|use_inti_for_triggers|use_inti_for_hub_spot|use_inti_for_slack|use_inti_for_ms_teams|other_homepage|accelerated_call_log|homey_enabled|limit_client_view|rollout_anubis|allow_fullstory_tracking|new_numbers_page|cursor_paginate_accelerated_call_log|homepage_onboarding|ai_alpha_action_items|pre_ten_dlc_in_app_messaging|ai_alpha_new_or_existing_customer|ai_alpha_appointment_scheduled|ai_alpha_ai_coach|override_days_to_renewal|ai_alpha_questions_asked|ai_alpha_caller_details|ai_alpha_follow_up_email|ai_alpha_lead_qualification|ai_alpha_led_to_sale|pendo_segmentation|product_tier|prosperstack_flow|ai_alphas_white_label|kyc_registration_live|accelerated_reports|ai_alpha_lead_score|inbound_call_recording|year_end_metrics|click_to_contact_dynamic|account_deletion_ui|sa_update_plans_looky|automation_rule_new_criterias|business_profile_page|smart-follow-up-message-new-tag|voice_assist_workflow_page|native_10dlc_registration|hubspot_e164|voice_assist_select|voice_assist_test_call|automation_rules_templates)['"`]/g,
        description: 'Feature flag string literal',
        extractFlag: true
      },
      
      // 7. Conditional patterns
      {
        type: 'conditional',
        pattern: /if\s*\([^)]*\.(?:flipperEnabled|eagerlyEnabled|isEnabled)\s*\(\s*['"`]([^'"`]+)['"`]\s*\)[^)]*\)/g,
        description: 'Conditional flipper check',
        extractFlag: true
      },
      
      // 8. Template/HTML patterns
      {
        type: 'template',
        pattern: /\*ngIf\s*=\s*['"`][^'"`]*(?:flipperEnabled|eagerlyEnabled)\s*\(\s*['"`]([^'"`]+)['"`]\s*\)[^'"`]*['"`]/g,
        description: 'Angular template flipper conditional',
        extractFlag: true
      }
    ];
  }
  
  // Main method to integrate with Git Diff analysis
  async analyzeGitDiffForFlippers(diffContent: string): Promise<FlipperGitDiffResult> {
    const parsedDiff = this.parseGitDiff(diffContent);
    const flipperResults: FlipperFileResult[] = [];
    const detectedFlags = new Set<string>();
    
    for (const file of parsedDiff.files) {
      if (this.shouldAnalyzeFile(file.path)) {
        const fileResult = await this.analyzeFileForFlippers(file);
        if (fileResult.detections.length > 0) {
          flipperResults.push(fileResult);
          fileResult.detections.forEach(d => {
            if (d.flagName) detectedFlags.add(d.flagName);
          });
        }
      }
    }
    
    const prSections = this.generatePRSection(Array.from(detectedFlags));
    
    return {
      files: flipperResults,
      detectedFlags: Array.from(detectedFlags),
      summary: this.generateFlipperSummary(flipperResults),
      qaSection: prSections.qaSection,
      detailsSection: prSections.detailsSection
    };
  }
  
  private async analyzeFileForFlippers(file: GitFileChange): Promise<FlipperFileResult> {
    const detections: FlipperDetection[] = [];
    const content = file.content || '';
    
    for (const pattern of this.broadPatterns) {
      let match;
      const regex = new RegExp(pattern.pattern.source, pattern.pattern.flags);
      
      while ((match = regex.exec(content)) !== null) {
        const flagName = this.extractFlagName(match, pattern);
        
        const detection: FlipperDetection = {
          type: pattern.type,
          pattern: pattern.description,
          line: this.getLineNumber(content, match.index),
          column: this.getColumnNumber(content, match.index),
          match: match[0],
          flagName: flagName,
          context: this.getContext(content, match.index, 50)
        };
        
        detections.push(detection);
      }
    }
    
    return {
      path: file.path,
      detections,
      changeType: file.status
    };
  }
  
  private extractFlagName(match: RegExpExecArray, pattern: FlipperBroadPattern): string | undefined {
    if (!pattern.extractFlag) return undefined;
    
    // Handle flag mapping for predefined observables
    if (pattern.flagMapping && match[1]) {
      return pattern.flagMapping[match[1]] || match[1];
    }
    
    // Extract flag from specified index or default to index 1
    const flagIndex = pattern.flagIndex || 1;
    return match[flagIndex];
  }
  
  private generatePRSection(detectedFlags: string[]): { qaSection: string, detailsSection: string } {
    if (detectedFlags.length === 0) return { qaSection: '', detailsSection: '' };
    
    const flagList = detectedFlags.map(flag => `- \`${flag}\``).join('\n');
    
    const qaSection = `## 🔄 Feature Flags / Flipper Changes

**⚠️ This work is being hidden behind Feature Flags (Flippers)**

### Detected Flipper Changes:
${flagList}

### 📋 QA Checklist - Flipper Setup Required:
- [ ] Test functionality with flipper(s) **DISABLED** (fallback behavior)
- [ ] Test functionality with flipper(s) **ENABLED** (new behavior)
- [ ] Verify flipper(s) can be toggled without requiring deployment

### 🧹 Post-Release Cleanup:
- [ ] Remove flipper conditional logic from codebase
- [ ] **IMPORTANT**: Schedule flipper removal after 100% rollout
- [ ] Clean up unused flipper definitions
- [ ] Update documentation to reflect permanent changes`;

    const detailsSection = `## 🔧 Environment Setup Details - Flipper Configuration

### Staging Environment Setup:
1. **Flipper Dashboard Configuration:**
   - Access Staging Flipper dashboard
   - Verify the following flipper(s) are configured:
     ${flagList}
   - Ensure flipper(s) are initially set to **DISABLED**

2. **Testing Protocol:**
   - Deploy to staging with flipper(s) disabled
   - Verify fallback behavior works correctly
   - Enable flipper(s) and test new functionality
   - Confirm flipper(s) can be toggled without redeployment

### Production Environment Setup:
1. **Pre-Deployment:**
   - Ensure flipper(s) are configured in Production Flipper dashboard
   - Set flipper(s) to **DISABLED** initially
   - Document rollback procedure

2. **Rollout Strategy:**
   - Plan gradual rollout (percentage-based or user-based)
   - Monitor metrics and error rates during rollout
   - Have rollback plan ready in case of issues

### 🔗 Resources:
- [Flipper Documentation](https://callrail.atlassian.net/l/c/u7fFhHPM)
- [Flipper Cloud Dashboard](https://www.flippercloud.io/docs/ui)

### 📞 Coordination Required:
- **PR Developer**: Responsible for flipper configuration across environments
- **QA Team**: For testing both enabled/disabled states
- **Product Team**: For rollout strategy and success metrics

> **⚠️ Important**: This feature requires environment setup before deployment. Coordinate with DevOps team early in the development cycle.`;

    return { qaSection, detailsSection };
  }
}
```

### Integration with Enhanced Git Diff Manager

```typescript
export class EnhancedGitDiffManager extends GitDiffManager {
  constructor(
    context: vscode.ExtensionContext,
    private flipperManager: FlipperDetectionManager
  ) {
    super(context);
  }
  
  async analyzeWithFlipperDetection(diffContent: string): Promise<EnhancedDiffResult> {
    // Run standard git diff analysis
    const baseDiffResult = await this.analyzeDiff(diffContent);
    
    // Run flipper detection
    const flipperResult = await this.flipperManager.analyzeGitDiffForFlippers(diffContent);
    
    // Combine results
    const enhancedResult: EnhancedDiffResult = {
      ...baseDiffResult,
      flipperAnalysis: flipperResult,
      hasFlipperChanges: flipperResult.detectedFlags.length > 0
    };
    
    return enhancedResult;
  }
  
  async generateEnhancedDiffReport(result: EnhancedDiffResult): Promise<string> {
    const sections = [
      this.generateStandardDiffSection(result),
      this.generateFlipperSection(result.flipperAnalysis),
      result.flipperAnalysis.qaSection // Add QA section to diff report
    ];
    
    return sections.filter(section => section.length > 0).join('\n\n');
  }
  
  private generateFlipperSection(flipperResult: FlipperGitDiffResult): string {
    if (flipperResult.detectedFlags.length === 0) return '';
    
    const flagDetails = flipperResult.detectedFlags.map(flag => {
      const usageCount = flipperResult.files
        .flatMap(f => f.detections)
        .filter(d => d.flagName === flag).length;
      
      return `- **${flag}**: ${usageCount} usage(s) detected`;
    }).join('\n');
    
    return `## 🔄 Flipper Detection Results

### Feature Flags Modified:
${flagDetails}

### Files with Flipper Changes:
${flipperResult.files.map(f => `- ${f.path} (${f.detections.length} detection(s))`).join('\n')}

### Summary:
${flipperResult.summary}`;
  }
}
```

### Updated File Manager for PR Generation

```typescript
export class EnhancedFileManager extends FileManager {
  async generatePRDescription(result: EnhancedDiffResult): Promise<{ description: string, details: string }> {
    const description = [
      this.generateStandardPRDescription(result),
      result.flipperAnalysis.qaSection // Include the QA checklist in main description
    ].filter(section => section.length > 0).join('\n\n');
    
    const details = result.flipperAnalysis.detailsSection; // Environment setup goes to details
    
    return { description, details };
  }
  
  async saveDiffWithFlipperAnalysis(result: EnhancedDiffResult): Promise<void> {
    // Save standard diff file
    await this.saveDiffReport(result);
    
    // Save PR description with flipper section
    const prContent = await this.generatePRDescription(result);
    await this.saveFile('pr-description-with-flippers.md', prContent.description);
    
    // Save PR details section separately
    if (result.hasFlipperChanges && prContent.details) {
      await this.saveFile('pr-details-flipper-setup.md', prContent.details);
    }
    
    // Save flipper-specific report
    if (result.hasFlipperChanges) {
      const flipperReport = this.generateFlipperReport(result.flipperAnalysis);
      await this.saveFile('flipper-analysis.md', flipperReport);
    }
  }
}
```

### Types for Flipper Detection

```typescript
interface FlipperBroadPattern {
  type: 'import' | 'method_call' | 'observable' | 'predefined_observable' | 'configuration' | 'flag_literal' | 'conditional' | 'template' | 'injection';
  pattern: RegExp;
  description: string;
  extractFlag: boolean;
  flagIndex?: number;
  flagMapping?: { [key: string]: string };
}

interface FlipperDetection {
  type: string;
  pattern: string;
  line: number;
  column: number;
  match: string;
  flagName?: string;
  context: string;
}

interface FlipperFileResult {
  path: string;
  detections: FlipperDetection[];
  changeType: 'added' | 'modified' | 'deleted' | 'renamed';
}

interface FlipperGitDiffResult {
  files: FlipperFileResult[];
  detectedFlags: string[];
  summary: string;
  qaSection: string;
  detailsSection: string;
}

interface EnhancedDiffResult extends GitDiffResult {
  flipperAnalysis: FlipperGitDiffResult;
  hasFlipperChanges: boolean;
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
// test/unit/FlipperDetectionManager.test.ts
import { FlipperDetectionManager } from '../../src/managers/FlipperDetectionManager';
import * as vscode from 'vscode';

describe('FlipperDetectionManager', () => {
  let manager: FlipperDetectionManager;
  let mockContext: vscode.ExtensionContext;
  
  beforeEach(() => {
    mockContext = {
      subscriptions: [],
      extensionUri: vscode.Uri.file('/test')
    } as any;
    
    manager = new FlipperDetectionManager(mockContext);
  });
  
  test('should detect FlipperService imports and extract patterns', async () => {
    const code = `import { FlipperService } from '@callrail/looky/core';`;
    const result = await manager.analyzeCode(code);
    
    expect(result.detections).toHaveLength(1);
    expect(result.detections[0].type).toBe('import');
    expect(result.detections[0].pattern).toContain('FlipperService import');
  });
  
  test('should detect and extract flag names from flipperEnabled calls', async () => {
    const code = `if (this.flipperService.flipperEnabled('zuora_maintenance')) {`;
    const result = await manager.analyzeCode(code);
    
    expect(result.detections).toHaveLength(1);
    expect(result.detections[0].type).toBe('method_call');
    expect(result.detections[0].flagName).toBe('zuora_maintenance');
  });
  
  test('should detect predefined observable usage', async () => {
    const code = `
      return this.flipperService.zuoraMaintenance$.pipe(
        switchMap(enabled => enabled ? this.processPayment() : of(false))
      );
    `;
    const result = await manager.analyzeCode(code);
    
    expect(result.detections.length).toBeGreaterThan(0);
    expect(result.detections.some(d => d.flagName === 'zuora_maintenance')).toBe(true);
  });
  
  test('should generate PR section with QA checklist', async () => {
    const mockDiff = `
+  if (this.flipperService.flipperEnabled('new_feature')) {
+    // New feature implementation
+  }
    `;
    
    const result = await manager.analyzeGitDiffForFlippers(mockDiff);
    
    expect(result.prSection).toContain('🔄 Feature Flags / Flipper Changes');
    expect(result.prSection).toContain('QA Checklist - Flipper Setup Required');
    expect(result.prSection).toContain('new_feature');
    expect(result.prSection).toContain('Schedule flipper removal');
  });
});
```

### Integration Testing
```typescript
// test/integration/flipper-git-diff.test.ts
describe('Flipper Git Diff Integration', () => {
  test('should integrate flipper detection with git diff analysis', async () => {
    const mockDiff = `
diff --git a/src/app/services/billing.service.ts b/src/app/services/billing.service.ts
index 1234567..abcdefg 100644
--- a/src/app/services/billing.service.ts
+++ b/src/app/services/billing.service.ts
@@ -1,4 +1,8 @@
+import { FlipperService } from '@callrail/looky/core';
+
 export class BillingService {
+  constructor(private flipperService: FlipperService) {}
+  
+  isZuoraMaintenance$ = this.flipperService.flipperEnabled('zuora_maintenance');
   canProcessPayment(): Observable<boolean> {
     return of(true);
   }
    `;
    
    const result = await enhancedGitDiffManager.analyzeWithFlipperDetection(mockDiff);
    
    expect(result.hasFlipperChanges).toBe(true);
    expect(result.flipperAnalysis.detectedFlags).toContain('zuora_maintenance');
    expect(result.flipperAnalysis.prSection).toContain('Flipper Setup Required');
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

### Phase 4: Flipper Detection (Weeks 4-6)
- **Week 4**: Broad pattern detection for all flipper usage types
- **Week 5**: Git diff integration with PR section generation
- **Week 6**: QA checklist automation and enhanced reporting

### Phase 5: UI Enhancement (Weeks 5-7)
- **Week 5-6**: Enhanced diff reports with flipper sections
- **Week 6-7**: PR description generation with flipper checklists

### Phase 6: Testing and Optimization (Weeks 6-8)
- **Week 6-7**: Unit and integration testing implementation
- **Week 7-8**: Performance optimization, security auditing, error handling

### Phase 7: Polish and Deployment (Weeks 8-9)
- **Week 8**: Documentation, marketplace preparation, final testing
- **Week 9**: Publishing, user feedback collection, initial bug fixes

## Risk Assessment and Mitigation

**Technical Risks:**
- **Pattern Accuracy**: Comprehensive regex testing with real codebase samples
- **Performance**: Optimize pattern matching for large diffs
- **False Positives**: Careful pattern design to avoid incorrect matches

**Implementation Risks:**
- **Integration Complexity**: Incremental integration with existing git diff workflow
- **QA Workflow**: Collaborate with QA team to validate checklist accuracy
- **Flipper Management**: Coordinate with DevOps for proper flipper configuration

This comprehensive implementation plan now includes your specific requirements for broad pattern detection, git diff integration, and automated PR section generation with QA checklists for flipper management.
