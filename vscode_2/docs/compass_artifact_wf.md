# Comprehensive Implementation Guide for AI Debug Context VSCode Extension

This guide provides detailed implementation patterns for building a VSCode extension with Angular and Tailwind UI that integrates GitHub Copilot for intelligent test debugging and PR generation.

## Architecture Overview

The extension follows a multi-layered architecture combining VSCode's extension API, Angular webviews, Git integration, NX workspace support, and GitHub Copilot AI capabilities. The core workflow enables users to select file changes, run tests, receive AI-powered debugging assistance, and generate comprehensive PR descriptions.

## 1. Extension Setup and Core Architecture

### Package.json Configuration
```json
{
  "name": "ai-debug-context",
  "displayName": "AI Debug Context",
  "version": "1.0.0",
  "engines": {
    "vscode": "^1.85.0"
  },
  "categories": ["Testing", "AI", "Other"],
  "activationEvents": [
    "onView:ai-debug-context.fileSelector",
    "onCommand:ai-debug-context.start",
    "workspaceContains:**/*.test.{js,ts,jsx,tsx}"
  ],
  "contributes": {
    "viewsContainers": {
      "activitybar": [
        {
          "id": "ai-debug-context",
          "title": "AI Debug Context",
          "icon": "$(debug-alt)"
        }
      ]
    },
    "views": {
      "ai-debug-context": [
        {
          "type": "webview",
          "id": "ai-debug-context.mainView",
          "name": "AI Debug Context"
        }
      ]
    },
    "commands": [
      {
        "command": "ai-debug-context.runAITestDebug",
        "title": "AI Test Debug",
        "icon": "$(beaker)"
      }
    ]
  }
}
```

### Main Extension Entry Point
```typescript
// extension.ts
import * as vscode from 'vscode';
import { AIDebugWebviewProvider } from './webview/AIDebugWebviewProvider';
import { GitIntegration } from './services/GitIntegration';
import { NXWorkspaceManager } from './services/NXWorkspaceManager';
import { CopilotIntegration } from './services/CopilotIntegration';
import { TestRunner } from './services/TestRunner';

export function activate(context: vscode.ExtensionContext) {
  // Initialize core services
  const gitIntegration = new GitIntegration(context);
  const nxManager = new NXWorkspaceManager(context);
  const copilot = new CopilotIntegration(context);
  const testRunner = new TestRunner(context);

  // Register webview provider
  const provider = new AIDebugWebviewProvider(
    context,
    gitIntegration,
    nxManager,
    copilot,
    testRunner
  );

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      'ai-debug-context.mainView',
      provider
    )
  );

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand('ai-debug-context.runAITestDebug', 
      () => provider.runAITestDebug())
  );
}
```

## 2. File Selection UI Implementation

### Git Integration Service
```typescript
// services/GitIntegration.ts
import { simpleGit, SimpleGit } from 'simple-git';
import * as vscode from 'vscode';

export class GitIntegration {
  private git: SimpleGit;
  private gitApi: any;

  constructor(private context: vscode.ExtensionContext) {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    this.git = simpleGit(workspaceRoot);
    this.initializeVSCodeGitAPI();
  }

  private async initializeVSCodeGitAPI() {
    const gitExtension = vscode.extensions.getExtension('vscode.git');
    if (gitExtension) {
      this.gitApi = gitExtension.exports.getAPI(1);
    }
  }

  async getUncommittedChanges(): Promise<FileChange[]> {
    const status = await this.git.status();
    return [
      ...status.modified.map(f => ({ path: f, status: 'modified' })),
      ...status.created.map(f => ({ path: f, status: 'added' })),
      ...status.deleted.map(f => ({ path: f, status: 'deleted' }))
    ];
  }

  async getCommitHistory(limit: number = 50): Promise<GitCommit[]> {
    const log = await this.git.log({ maxCount: limit });
    return log.all.map(commit => ({
      hash: commit.hash,
      message: commit.message,
      author: commit.author_name,
      date: new Date(commit.date),
      files: [] // Populate with affected files if needed
    }));
  }

  async getDiffFromMainBranch(): Promise<string> {
    const currentBranch = await this.git.revparse(['--abbrev-ref', 'HEAD']);
    return await this.git.diff([`main...${currentBranch}`]);
  }

  async getDiffForCommit(commitHash: string): Promise<string> {
    return await this.git.show([commitHash]);
  }
}
```

### Angular File Selection Component
```typescript
// webview-ui/src/app/components/file-selector/file-selector.component.ts
import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { VscodeService } from '../../services/vscode.service';

interface FileSelectionMode {
  type: 'uncommitted' | 'commit' | 'branch-diff';
  data?: any;
}

@Component({
  selector: 'app-file-selector',
  template: `
    <div class="bg-vscode-editor-background p-4 rounded-lg">
      <!-- Mode Selection -->
      <div class="mb-4">
        <label class="text-vscode-foreground text-sm font-medium mb-2 block">
          Select Changes From:
        </label>
        <div class="grid grid-cols-3 gap-2">
          <button 
            *ngFor="let mode of selectionModes"
            (click)="selectMode(mode)"
            [class.bg-vscode-button-background]="currentMode?.type === mode.type"
            [class.bg-vscode-button-secondaryBackground]="currentMode?.type !== mode.type"
            class="px-3 py-2 rounded text-vscode-button-foreground hover:bg-vscode-button-hoverBackground transition-colors">
            {{ mode.label }}
          </button>
        </div>
      </div>

      <!-- Uncommitted Changes View -->
      <div *ngIf="currentMode?.type === 'uncommitted'" class="space-y-2">
        <div 
          *ngFor="let file of uncommittedFiles"
          class="flex items-center gap-3 p-2 rounded hover:bg-vscode-list-hoverBackground">
          <input 
            type="checkbox" 
            [(ngModel)]="file.selected"
            class="w-4 h-4 rounded border-vscode-checkbox-border bg-vscode-checkbox-background">
          <span class="flex-1 text-vscode-foreground text-sm font-mono">{{ file.path }}</span>
          <span 
            class="px-2 py-1 text-xs rounded"
            [class.bg-vscode-gitDecoration-addedResourceForeground]="file.status === 'added'"
            [class.bg-vscode-gitDecoration-modifiedResourceForeground]="file.status === 'modified'"
            [class.bg-vscode-gitDecoration-deletedResourceForeground]="file.status === 'deleted'">
            {{ file.status }}
          </span>
        </div>
      </div>

      <!-- Commit Selection View -->
      <div *ngIf="currentMode?.type === 'commit'" class="space-y-2">
        <div class="mb-3">
          <input 
            type="text"
            [(ngModel)]="commitSearch"
            placeholder="Search commits..."
            class="w-full px-3 py-2 bg-vscode-input-background text-vscode-input-foreground border border-vscode-input-border rounded focus:border-vscode-inputOption-activeBorder">
        </div>
        <div 
          *ngFor="let commit of filteredCommits"
          (click)="selectCommit(commit)"
          class="p-3 rounded hover:bg-vscode-list-hoverBackground cursor-pointer"
          [class.bg-vscode-list-activeSelectionBackground]="selectedCommit?.hash === commit.hash">
          <div class="flex items-center gap-2">
            <span class="text-vscode-descriptionForeground text-xs font-mono">
              {{ commit.hash.substring(0, 7) }}
            </span>
            <span class="flex-1 text-vscode-foreground text-sm">{{ commit.message }}</span>
          </div>
          <div class="text-vscode-descriptionForeground text-xs mt-1">
            {{ commit.author }} • {{ commit.date | date:'short' }}
          </div>
        </div>
      </div>

      <!-- Branch Diff View -->
      <div *ngIf="currentMode?.type === 'branch-diff'" class="space-y-2">
        <div class="bg-vscode-textBlockQuote-background p-3 rounded">
          <p class="text-vscode-textBlockQuote-foreground text-sm">
            Showing all changes from current branch to main
          </p>
          <div class="mt-2 text-vscode-foreground text-xs">
            <span class="font-semibold">{{ branchDiffStats.filesChanged }}</span> files changed,
            <span class="text-vscode-gitDecoration-addedResourceForeground">+{{ branchDiffStats.additions }}</span>,
            <span class="text-vscode-gitDecoration-deletedResourceForeground">-{{ branchDiffStats.deletions }}</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./file-selector.component.css']
})
export class FileSelectorComponent implements OnInit {
  @Output() selectionChanged = new EventEmitter<FileSelection>();

  selectionModes = [
    { type: 'uncommitted', label: 'Uncommitted Changes' },
    { type: 'commit', label: 'Previous Commit' },
    { type: 'branch-diff', label: 'Branch to Main' }
  ];

  currentMode: FileSelectionMode = { type: 'uncommitted' };
  uncommittedFiles: any[] = [];
  commits: any[] = [];
  selectedCommit: any = null;
  commitSearch = '';
  branchDiffStats = { filesChanged: 0, additions: 0, deletions: 0 };

  constructor(private vscode: VscodeService) {}

  ngOnInit() {
    this.loadUncommittedChanges();
    this.loadCommitHistory();
  }

  selectMode(mode: any) {
    this.currentMode = { type: mode.type };
    this.emitSelection();
  }

  private emitSelection() {
    this.selectionChanged.emit({
      mode: this.currentMode.type,
      files: this.getSelectedFiles(),
      commit: this.selectedCommit,
      diff: this.getCurrentDiff()
    });
  }
}
```

## 3. Test Selection UI Implementation

### NX Workspace Manager
```typescript
// services/NXWorkspaceManager.ts
import { spawn } from 'child_process';
import * as vscode from 'vscode';
import * as path from 'path';
import { existsSync } from 'fs';

export class NXWorkspaceManager {
  private workspacePath: string;
  private projects: Map<string, NXProject> = new Map();

  constructor(private context: vscode.ExtensionContext) {
    this.workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
    this.detectNXWorkspace();
  }

  private async detectNXWorkspace(): Promise<boolean> {
    const nxJsonPath = path.join(this.workspacePath, 'nx.json');
    const workspaceJsonPath = path.join(this.workspacePath, 'workspace.json');
    
    return existsSync(nxJsonPath) || existsSync(workspaceJsonPath);
  }

  async listProjects(): Promise<NXProject[]> {
    return new Promise((resolve, reject) => {
      const process = spawn('npx', ['nx', 'show', 'projects', '--json'], {
        cwd: this.workspacePath,
        stdio: 'pipe'
      });

      let output = '';
      process.stdout.on('data', (data) => output += data.toString());

      process.on('close', async (code) => {
        if (code === 0) {
          try {
            const projectNames = JSON.parse(output);
            const projects = await Promise.all(
              projectNames.map((name: string) => this.getProjectConfig(name))
            );
            resolve(projects);
          } catch (error) {
            reject(error);
          }
        } else {
          reject(new Error(`NX command failed with code ${code}`));
        }
      });
    });
  }

  async runAffectedTests(base: string = 'main'): Promise<TestResult[]> {
    return new Promise((resolve, reject) => {
      const args = [
        'nx', 'affected',
        '--target=test',
        `--base=${base}`,
        '--head=HEAD',
        '--output-style=stream'
      ];

      const process = spawn('npx', args, {
        cwd: this.workspacePath,
        stdio: 'pipe'
      });

      let output = '';
      let errorOutput = '';

      process.stdout.on('data', (data) => {
        output += data.toString();
        // Stream to webview for real-time updates
        this.streamTestOutput(data.toString());
      });

      process.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      process.on('close', (code) => {
        const results = this.parseTestResults(output);
        resolve(results);
      });
    });
  }

  private parseTestResults(output: string): TestResult[] {
    // Parse test output based on the test runner format
    const results: TestResult[] = [];
    const lines = output.split('\n');

    // Example parsing for Jest output
    const testPattern = /\s*(✓|✗)\s+(.+)\s+\((\d+)ms\)/;
    
    lines.forEach(line => {
      const match = line.match(testPattern);
      if (match) {
        results.push({
          name: match[2],
          status: match[1] === '✓' ? 'passed' : 'failed',
          duration: parseInt(match[3]),
          file: this.extractFileFromTestName(match[2])
        });
      }
    });

    return results;
  }
}
```

### Angular Test Selection Component
```typescript
// webview-ui/src/app/components/test-selector/test-selector.component.ts
@Component({
  selector: 'app-test-selector',
  template: `
    <div class="bg-vscode-editor-background p-4 rounded-lg">
      <h3 class="text-vscode-foreground font-semibold mb-4">Test Selection</h3>

      <!-- Test Mode Selection -->
      <div class="mb-4">
        <div class="flex gap-2">
          <button
            (click)="selectTestMode('project')"
            [class.bg-vscode-button-background]="testMode === 'project'"
            class="flex-1 px-4 py-2 rounded text-vscode-button-foreground">
            Run Project Tests
          </button>
          <button
            (click)="selectTestMode('affected')"
            [class.bg-vscode-button-background]="testMode === 'affected'"
            class="flex-1 px-4 py-2 rounded text-vscode-button-foreground">
            Run Affected Tests
          </button>
        </div>
      </div>

      <!-- Project Selection -->
      <div *ngIf="testMode === 'project'" class="space-y-3">
        <label class="text-vscode-foreground text-sm">Select Project:</label>
        <select
          [(ngModel)]="selectedProject"
          class="w-full px-3 py-2 bg-vscode-dropdown-background text-vscode-dropdown-foreground border border-vscode-dropdown-border rounded">
          <option value="">-- Select a project --</option>
          <option *ngFor="let project of projects" [value]="project.name">
            {{ project.name }} ({{ project.type }})
          </option>
        </select>

        <!-- Test File Selection -->
        <div *ngIf="selectedProject" class="mt-4">
          <label class="text-vscode-foreground text-sm">Test Files:</label>
          <div class="mt-2 max-h-48 overflow-y-auto border border-vscode-panel-border rounded p-2">
            <div 
              *ngFor="let file of projectTestFiles"
              class="flex items-center gap-2 p-1 hover:bg-vscode-list-hoverBackground rounded">
              <input 
                type="checkbox"
                [(ngModel)]="file.selected"
                class="w-4 h-4">
              <span class="text-vscode-foreground text-sm font-mono">{{ file.path }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Affected Tests Display -->
      <div *ngIf="testMode === 'affected'" class="space-y-3">
        <div class="bg-vscode-textBlockQuote-background p-3 rounded">
          <p class="text-vscode-textBlockQuote-foreground text-sm">
            NX will automatically detect and run tests affected by your changes
          </p>
        </div>
        
        <div *ngIf="affectedProjects.length > 0" class="mt-3">
          <label class="text-vscode-foreground text-sm">Affected Projects:</label>
          <div class="mt-2 space-y-1">
            <div 
              *ngFor="let project of affectedProjects"
              class="flex items-center gap-2 text-vscode-foreground text-sm">
              <svg class="w-4 h-4 text-vscode-gitDecoration-modifiedResourceForeground" viewBox="0 0 16 16">
                <path fill="currentColor" d="M8 4c-.65 0-1.26.26-1.71.71L5.5 5.5l1.06 1.06L7.29 5.83c.18-.18.43-.29.71-.29s.53.11.71.29l3.79 3.79c.18.18.29.43.29.71s-.11.53-.29.71l-3.79 3.79c-.18.18-.43.29-.71.29s-.53-.11-.71-.29L6.56 13.56 5.5 14.62l.79.79c.45.45 1.06.71 1.71.71s1.26-.26 1.71-.71l3.79-3.79c.45-.45.71-1.06.71-1.71s-.26-1.26-.71-1.71L8.71 4.71C8.26 4.26 7.65 4 8 4z"/>
              </svg>
              {{ project }}
            </div>
          </div>
        </div>
      </div>

      <!-- Test Command Preview -->
      <div class="mt-4 p-3 bg-vscode-textCodeBlock-background rounded">
        <label class="text-vscode-descriptionForeground text-xs">Command Preview:</label>
        <code class="text-vscode-textPreformat-foreground text-sm font-mono block mt-1">
          {{ getTestCommand() }}
        </code>
      </div>
    </div>
  `,
  styleUrls: ['./test-selector.component.css']
})
export class TestSelectorComponent implements OnInit {
  @Output() testConfigChanged = new EventEmitter<TestConfiguration>();

  testMode: 'project' | 'affected' = 'affected';
  projects: NXProject[] = [];
  selectedProject = '';
  projectTestFiles: TestFile[] = [];
  affectedProjects: string[] = [];

  constructor(private vscode: VscodeService) {}

  ngOnInit() {
    this.loadProjects();
    this.loadAffectedProjects();
  }

  selectTestMode(mode: 'project' | 'affected') {
    this.testMode = mode;
    this.emitConfiguration();
  }

  getTestCommand(): string {
    if (this.testMode === 'affected') {
      return 'npx nx affected --target=test';
    } else if (this.selectedProject) {
      return `npx nx test ${this.selectedProject}`;
    }
    return '-- No test configuration selected --';
  }

  private emitConfiguration() {
    this.testConfigChanged.emit({
      mode: this.testMode,
      project: this.selectedProject,
      testFiles: this.projectTestFiles.filter(f => f.selected),
      command: this.getTestCommand()
    });
  }
}
```

## 4. Main Action - AI TEST DEBUG Implementation

### Copilot Integration Service
```typescript
// services/CopilotIntegration.ts
import * as vscode from 'vscode';

interface DebugContext {
  gitDiff: string;
  testResults: TestResult[];
  projectInfo: ProjectInfo;
  errorDetails?: ErrorDetails[];
}

export class CopilotIntegration {
  private models: vscode.LanguageModelChat[] = [];

  constructor(private context: vscode.ExtensionContext) {
    this.initializeModels();
  }

  private async initializeModels() {
    // Select appropriate models for different tasks
    const models = await vscode.lm.selectChatModels({ 
      vendor: 'copilot', 
      family: 'gpt-4o' 
    });
    
    if (models.length === 0) {
      throw new Error('No Copilot models available. Please ensure GitHub Copilot is active.');
    }
    
    this.models = models;
  }

  async analyzeTestFailures(context: DebugContext): Promise<TestAnalysis> {
    const prompt = this.createTestAnalysisPrompt(context);
    const response = await this.sendRequest(prompt);
    return this.parseTestAnalysis(response);
  }

  private createTestAnalysisPrompt(context: DebugContext): vscode.LanguageModelChatMessage[] {
    const systemPrompt = `You are an expert test debugging assistant. Analyze test failures and provide actionable solutions.
    
    Response Format:
    1. Root Cause Analysis - Identify why tests are failing
    2. Specific Fixes - Provide exact code changes with line numbers
    3. Prevention Strategies - Suggest improvements
    4. Additional Tests - Recommend new test cases`;

    const userPrompt = `## Test Debugging Context

### Git Diff
\`\`\`diff
${context.gitDiff}
\`\`\`

### Test Results
- Passed: ${context.testResults.filter(t => t.status === 'passed').length}
- Failed: ${context.testResults.filter(t => t.status === 'failed').length}

### Failed Tests
${context.testResults
  .filter(t => t.status === 'failed')
  .map(t => `
**${t.name}**
- File: ${t.file}
- Error: ${t.error}
- Stack: ${t.stackTrace}
`).join('\n')}

Please analyze these test failures and provide solutions.`;

    return [
      vscode.LanguageModelChatMessage.User(systemPrompt),
      vscode.LanguageModelChatMessage.User(userPrompt)
    ];
  }

  async suggestNewTests(context: DebugContext): Promise<TestSuggestions> {
    const prompt = this.createTestSuggestionPrompt(context);
    const response = await this.sendRequest(prompt);
    return this.parseTestSuggestions(response);
  }

  async detectFalsePositives(context: DebugContext): Promise<FalsePositiveAnalysis> {
    const prompt = this.createFalsePositivePrompt(context);
    const response = await this.sendRequest(prompt);
    return this.parseFalsePositiveAnalysis(response);
  }

  private async sendRequest(
    messages: vscode.LanguageModelChatMessage[]
  ): Promise<string> {
    const model = this.models[0];
    const response = await model.sendRequest(messages, {}, new vscode.CancellationTokenSource().token);
    
    let result = '';
    for await (const fragment of response.text) {
      result += fragment;
    }
    
    return result;
  }
}
```

### AI Test Debug Workflow
```typescript
// webview/AIDebugWebviewProvider.ts
export class AIDebugWebviewProvider implements vscode.WebviewViewProvider {
  private view?: vscode.WebviewView;
  private workflowState: WorkflowState = { step: 'idle' };

  async runAITestDebug() {
    try {
      // Update UI to show progress
      this.updateWebviewState({ step: 'collecting-context' });

      // Step 1: Collect selected files and diffs
      const fileSelection = await this.getFileSelection();
      const gitDiff = await this.gitIntegration.getDiff(fileSelection);

      // Step 2: Run tests based on configuration
      this.updateWebviewState({ step: 'running-tests' });
      const testConfig = await this.getTestConfiguration();
      const testResults = await this.runTests(testConfig);

      // Step 3: Analyze with AI
      this.updateWebviewState({ step: 'analyzing-with-ai' });
      
      if (this.hasTestFailures(testResults)) {
        // Handle test failures
        await this.handleTestFailures(gitDiff, testResults);
      } else {
        // All tests passed
        await this.handleTestsSuccess(gitDiff, testResults);
      }

    } catch (error) {
      this.handleError(error);
    }
  }

  private async handleTestFailures(gitDiff: string, testResults: TestResult[]) {
    const context: DebugContext = {
      gitDiff,
      testResults,
      projectInfo: await this.getProjectInfo()
    };

    // Get AI analysis for failures
    const analysis = await this.copilot.analyzeTestFailures(context);
    
    // Get new test suggestions
    const suggestions = await this.copilot.suggestNewTests(context);

    // Update UI with results
    this.sendMessage('aiAnalysisComplete', {
      analysis,
      suggestions,
      type: 'failure-analysis'
    });
  }

  private async handleTestsSuccess(gitDiff: string, testResults: TestResult[]) {
    const context: DebugContext = {
      gitDiff,
      testResults,
      projectInfo: await this.getProjectInfo()
    };

    // Check for false positives
    const falsePositives = await this.copilot.detectFalsePositives(context);
    
    // Get new test suggestions
    const suggestions = await this.copilot.suggestNewTests(context);
    
    // Generate PR description
    const prDescription = await this.generatePRDescription(context);

    // Update UI with results
    this.sendMessage('aiAnalysisComplete', {
      falsePositives,
      suggestions,
      prDescription,
      type: 'success-analysis'
    });
  }
}
```

## 5. PR Description Generation Implementation

### PR Description Service
```typescript
// services/PRDescriptionGenerator.ts
import { FeatureFlagDetector } from './FeatureFlagDetector';
import { JiraIntegration } from './JiraIntegration';

export class PRDescriptionGenerator {
  private featureFlagDetector: FeatureFlagDetector;
  private jiraIntegration: JiraIntegration;

  constructor(
    private copilot: CopilotIntegration,
    jiraConfig: JiraConfig
  ) {
    this.featureFlagDetector = new FeatureFlagDetector();
    this.jiraIntegration = new JiraIntegration(jiraConfig);
  }

  async generatePRDescription(context: PRContext): Promise<string> {
    // Step 1: Analyze git diff
    const diffAnalysis = await this.analyzeDiff(context.gitDiff);
    
    // Step 2: Detect feature flags
    const featureFlags = this.featureFlagDetector.detectFlags(context.gitDiff);
    
    // Step 3: Extract and validate Jira tickets
    const jiraTickets = await this.extractJiraTickets(context);
    
    // Step 4: Generate PR description with AI
    const description = await this.generateWithAI({
      ...context,
      diffAnalysis,
      featureFlags,
      jiraTickets
    });

    return description;
  }

  private async generateWithAI(enrichedContext: EnrichedPRContext): Promise<string> {
    const template = await this.getTemplate(enrichedContext.templateName);
    
    const prompt = `Generate a comprehensive PR description using this template:

Template:
${template}

Context:
- Git Diff Summary: ${enrichedContext.diffAnalysis.summary}
- Files Changed: ${enrichedContext.diffAnalysis.filesChanged.join(', ')}
- Feature Flags: ${enrichedContext.featureFlags.join(', ')}
- Jira Tickets: ${enrichedContext.jiraTickets.map(t => `${t.key}: ${t.summary}`).join(', ')}
- Test Results: ${enrichedContext.testResults.summary}

Instructions:
1. Fill in all template sections with relevant information
2. Include all Jira ticket links in the Related Issues section
3. List all feature flags in the Deployment Notes section
4. Ensure the summary clearly explains what changed and why
5. Include testing details and any breaking changes

Generate a professional, comprehensive PR description.`;

    return await this.copilot.generatePRDescription(prompt);
  }
}

// Feature Flag Detector
export class FeatureFlagDetector {
  private patterns = [
    /flipper\s*\(\s*['"]([^'"]+)['"]\s*\)/gi,
    /feature_flag\s*\(\s*['"]([^'"]+)['"]\s*\)/gi,
    /is_enabled\s*\(\s*['"]([^'"]+)['"]\s*\)/gi
  ];

  detectFlags(diff: string): string[] {
    const flags = new Set<string>();
    
    for (const pattern of this.patterns) {
      const matches = diff.matchAll(pattern);
      for (const match of matches) {
        if (match[1]) flags.add(match[1]);
      }
    }
    
    return Array.from(flags);
  }
}

// Jira Integration
export class JiraIntegration {
  private ticketPattern = /\b([A-Z]+-\d+)\b/g;

  async extractAndValidateTickets(text: string): Promise<JiraTicket[]> {
    const matches = text.match(this.ticketPattern) || [];
    const tickets: JiraTicket[] = [];

    for (const ticketKey of matches) {
      try {
        const ticket = await this.validateTicket(ticketKey);
        if (ticket) tickets.push(ticket);
      } catch (error) {
        console.warn(`Failed to validate ticket ${ticketKey}:`, error);
      }
    }

    return tickets;
  }

  private async validateTicket(key: string): Promise<JiraTicket | null> {
    // Implementation would call Jira API
    // This is a placeholder
    return {
      key,
      summary: 'Ticket summary from Jira',
      status: 'In Progress',
      url: `https://jira.company.com/browse/${key}`
    };
  }
}
```

### Angular PR Generation Component
```typescript
// webview-ui/src/app/components/pr-generator/pr-generator.component.ts
@Component({
  selector: 'app-pr-generator',
  template: `
    <div class="bg-vscode-editor-background p-4 rounded-lg">
      <h3 class="text-vscode-foreground font-semibold mb-4">PR Description Generator</h3>

      <!-- Template Selection -->
      <div class="mb-4">
        <label class="text-vscode-foreground text-sm">PR Template:</label>
        <select
          [(ngModel)]="selectedTemplate"
          class="w-full mt-1 px-3 py-2 bg-vscode-dropdown-background text-vscode-dropdown-foreground border border-vscode-dropdown-border rounded">
          <option value="standard">Standard PR</option>
          <option value="feature">Feature PR</option>
          <option value="bugfix">Bug Fix PR</option>
          <option value="hotfix">Hotfix PR</option>
        </select>
      </div>

      <!-- Jira Ticket Input -->
      <div class="mb-4">
        <label class="text-vscode-foreground text-sm">Jira Tickets:</label>
        <div class="flex gap-2 mt-1">
          <input
            [(ngModel)]="jiraTicketInput"
            placeholder="PROJ-123"
            class="flex-1 px-3 py-2 bg-vscode-input-background text-vscode-input-foreground border border-vscode-input-border rounded">
          <button
            (click)="addJiraTicket()"
            class="px-4 py-2 bg-vscode-button-background text-vscode-button-foreground rounded hover:bg-vscode-button-hoverBackground">
            Add
          </button>
        </div>
        
        <!-- Added Tickets -->
        <div class="mt-2 flex flex-wrap gap-2">
          <span
            *ngFor="let ticket of jiraTickets"
            class="inline-flex items-center gap-1 px-2 py-1 bg-vscode-badge-background text-vscode-badge-foreground text-sm rounded">
            {{ ticket }}
            <button (click)="removeJiraTicket(ticket)" class="ml-1">
              <svg class="w-3 h-3" viewBox="0 0 16 16">
                <path fill="currentColor" d="M8 8.707l3.646 3.647.708-.707L8.707 8l3.647-3.646-.707-.708L8 7.293 4.354 3.646l-.707.708L7.293 8l-3.647 3.646.708.708L8 8.707z"/>
              </svg>
            </button>
          </span>
        </div>
      </div>

      <!-- Feature Flags Display -->
      <div *ngIf="detectedFeatureFlags.length > 0" class="mb-4">
        <label class="text-vscode-foreground text-sm">Detected Feature Flags:</label>
        <div class="mt-1 p-2 bg-vscode-textBlockQuote-background rounded">
          <div class="flex flex-wrap gap-2">
            <span
              *ngFor="let flag of detectedFeatureFlags"
              class="px-2 py-1 bg-vscode-textPreformat-background text-vscode-textPreformat-foreground text-xs font-mono rounded">
              {{ flag }}
            </span>
          </div>
        </div>
      </div>

      <!-- Generated PR Description -->
      <div *ngIf="generatedDescription" class="mt-6">
        <div class="flex items-center justify-between mb-2">
          <label class="text-vscode-foreground text-sm font-semibold">Generated Description:</label>
          <button
            (click)="copyToClipboard()"
            class="px-3 py-1 text-xs bg-vscode-button-secondaryBackground text-vscode-button-secondaryForeground rounded hover:bg-vscode-button-secondaryHoverBackground">
            Copy to Clipboard
          </button>
        </div>
        
        <div class="p-4 bg-vscode-editor-background border border-vscode-panel-border rounded">
          <pre class="text-vscode-editor-foreground text-sm whitespace-pre-wrap">{{ generatedDescription }}</pre>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="mt-6 flex gap-2">
        <button
          (click)="generateDescription()"
          [disabled]="isGenerating"
          class="flex-1 px-4 py-2 bg-vscode-button-background text-vscode-button-foreground rounded hover:bg-vscode-button-hoverBackground disabled:opacity-50">
          <span *ngIf="!isGenerating">Generate PR Description</span>
          <span *ngIf="isGenerating" class="flex items-center justify-center gap-2">
            <svg class="animate-spin w-4 h-4" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Generating...
          </span>
        </button>
      </div>
    </div>
  `,
  styleUrls: ['./pr-generator.component.css']
})
export class PRGeneratorComponent implements OnInit {
  selectedTemplate = 'standard';
  jiraTicketInput = '';
  jiraTickets: string[] = [];
  detectedFeatureFlags: string[] = [];
  generatedDescription = '';
  isGenerating = false;

  constructor(private vscode: VscodeService) {}

  ngOnInit() {
    // Listen for feature flag detection
    this.vscode.onMessage().subscribe(message => {
      if (message.command === 'featureFlagsDetected') {
        this.detectedFeatureFlags = message.data;
      }
    });
  }

  async generateDescription() {
    this.isGenerating = true;
    
    this.vscode.postMessage({
      command: 'generatePRDescription',
      data: {
        template: this.selectedTemplate,
        jiraTickets: this.jiraTickets,
        featureFlags: this.detectedFeatureFlags
      }
    });

    // Result will come back via message
  }

  copyToClipboard() {
    navigator.clipboard.writeText(this.generatedDescription);
    this.vscode.postMessage({
      command: 'showNotification',
      data: { message: 'PR description copied to clipboard!' }
    });
  }
}
```

## 6. Complete Workflow Integration

### Main Workflow Orchestrator
```typescript
// services/WorkflowOrchestrator.ts
export class AIDebugWorkflowOrchestrator {
  private state: WorkflowState = { phase: 'idle' };
  
  constructor(
    private gitIntegration: GitIntegration,
    private nxManager: NXWorkspaceManager,
    private testRunner: TestRunner,
    private copilot: CopilotIntegration,
    private prGenerator: PRDescriptionGenerator
  ) {}

  async executeCompleteWorkflow(config: WorkflowConfig): Promise<WorkflowResult> {
    try {
      // Phase 1: File Selection and Diff Collection
      this.updateState({ phase: 'collecting-files' });
      const fileSelection = await this.collectFileSelection(config.fileSelectionMode);
      const gitDiff = await this.generateDiff(fileSelection);

      // Phase 2: Test Configuration and Execution
      this.updateState({ phase: 'configuring-tests' });
      const testConfig = await this.configureTests(config.testMode);
      
      this.updateState({ phase: 'running-tests' });
      const testResults = await this.executeTests(testConfig);

      // Phase 3: AI Analysis
      this.updateState({ phase: 'ai-analysis' });
      const aiAnalysis = await this.performAIAnalysis({
        gitDiff,
        testResults,
        fileSelection,
        testConfig
      });

      // Phase 4: PR Generation (if applicable)
      let prDescription: string | null = null;
      if (this.shouldGeneratePR(testResults, config)) {
        this.updateState({ phase: 'generating-pr' });
        prDescription = await this.generatePRDescription({
          gitDiff,
          testResults,
          aiAnalysis,
          config
        });
      }

      // Phase 5: Report Generation
      this.updateState({ phase: 'generating-report' });
      const report = this.generateFinalReport({
        fileSelection,
        testResults,
        aiAnalysis,
        prDescription
      });

      this.updateState({ phase: 'complete' });
      return { success: true, report };

    } catch (error) {
      this.handleWorkflowError(error);
      return { success: false, error: error.message };
    }
  }

  private async performAIAnalysis(context: AnalysisContext): Promise<AIAnalysis> {
    const results: AIAnalysis = {
      testFailureAnalysis: null,
      falsePositiveAnalysis: null,
      newTestSuggestions: null,
      codeImprovements: null
    };

    if (context.testResults.some(t => t.status === 'failed')) {
      // Analyze test failures
      results.testFailureAnalysis = await this.copilot.analyzeTestFailures({
        gitDiff: context.gitDiff,
        testResults: context.testResults,
        projectInfo: await this.getProjectInfo()
      });

      // Suggest fixes
      results.codeImprovements = await this.copilot.suggestCodeFixes(
        results.testFailureAnalysis
      );
    } else {
      // Check for false positives
      results.falsePositiveAnalysis = await this.copilot.detectFalsePositives({
        gitDiff: context.gitDiff,
        testResults: context.testResults,
        projectInfo: await this.getProjectInfo()
      });
    }

    // Always suggest new tests based on changes
    results.newTestSuggestions = await this.copilot.suggestNewTests({
      gitDiff: context.gitDiff,
      existingTests: context.testResults,
      coverage: await this.getTestCoverage()
    });

    return results;
  }
}
```

## Key Implementation Considerations

### Performance Optimization
- Implement debouncing for file change detection
- Use virtual scrolling for large file lists
- Cache git operations results
- Stream test output in real-time
- Optimize bundle size with tree shaking

### Error Handling
- Graceful degradation when Copilot is unavailable
- Retry logic for network operations
- User-friendly error messages
- Fallback strategies for each workflow phase
- Comprehensive logging for debugging

### Security Considerations
- Implement proper Content Security Policy for webviews
- Sanitize all user inputs
- Avoid exposing sensitive information to AI
- Use secure communication between extension and webview
- Validate Jira tickets before displaying

### Best Practices
- Follow VSCode's UI/UX guidelines
- Implement keyboard shortcuts for common actions
- Provide progress indicators for long operations
- Save user preferences and state
- Support VSCode's theme system
- Implement comprehensive testing

This implementation guide provides a complete foundation for building the AI Debug Context VSCode extension with all requested features, from file selection through AI-powered test debugging to automated PR generation.