import * as vscode from 'vscode';
import * as path from 'path';
import { existsSync, readFileSync } from 'fs';
import { GitIntegration } from '../services/GitIntegration';
import { NXWorkspaceManager } from '../services/NXWorkspaceManager';
import { CopilotIntegration } from '../services/CopilotIntegration';
import { CopilotDiagnosticsService } from '../services/CopilotDiagnosticsService';
import { TestRunner, TestExecutionOptions } from '../services/TestRunner';
import { WorkflowState, WorkflowConfig, WebviewMessage } from '../types';

export class AIDebugWebviewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'ai-debug-context.mainView';
  private view?: vscode.WebviewView;
  private workflowState: WorkflowState = { step: 'idle' };

  private copilotDiagnostics: CopilotDiagnosticsService;

  constructor(
    private context: vscode.ExtensionContext,
    private gitIntegration: GitIntegration,
    private nxManager: NXWorkspaceManager,
    private copilot: CopilotIntegration,
    private testRunner: TestRunner
  ) {
    this.copilotDiagnostics = new CopilotDiagnosticsService(context, copilot);
  }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    token: vscode.CancellationToken
  ): void | Thenable<void> {
    this.view = webviewView;

    // Configure webview options
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        this.context.extensionUri,
        vscode.Uri.joinPath(this.context.extensionUri, 'out', 'webview')
      ]
    };

    // Set initial HTML content
    webviewView.webview.html = this.getHtmlContent(webviewView.webview);

    // Handle messages from webview
    webviewView.webview.onDidReceiveMessage(
      (message: WebviewMessage) => this.handleWebviewMessage(message),
      undefined,
      this.context.subscriptions
    );

    // Save state when view becomes hidden
    webviewView.onDidChangeVisibility(() => {
      if (!webviewView.visible) {
        this.saveState();
      }
    });

    // Send initial Copilot availability when webview becomes visible
    webviewView.onDidChangeVisibility(() => {
      if (webviewView.visible) {
        this.sendInitialStatus();
      }
    });

    // Send initial status immediately if already visible
    if (webviewView.visible) {
      // Delay slightly to ensure webview is ready
      setTimeout(() => {
        this.sendInitialStatus();
      }, 100);
    }
  }

  private getHtmlContent(webview: vscode.Webview): string {
    // Get paths to resources
    const extensionUri = this.context.extensionUri;
    const webviewUri = vscode.Uri.joinPath(extensionUri, 'out', 'webview');
    
    // Check if Angular build files exist
    const webviewPath = path.join(extensionUri.fsPath, 'out', 'webview');
    const angularFilesExist = this.checkAngularFiles(webviewPath);

    // Generate nonce for security
    const nonce = this.generateNonce();

    if (angularFilesExist) {
      return this.getAngularHtml(webview, webviewUri, webviewPath, nonce);
    } else {
      return this.getPlaceholderHtml(nonce);
    }
  }

  private checkAngularFiles(webviewPath: string): boolean {
    try {
      const mainJsPath = path.join(webviewPath, 'main.js');
      const polyfillsJsPath = path.join(webviewPath, 'polyfills.js');
      const indexHtmlPath = path.join(webviewPath, 'index.html');
      return existsSync(mainJsPath) && existsSync(polyfillsJsPath) && existsSync(indexHtmlPath);
    } catch (error) {
      return false;
    }
  }

  private getAngularHtml(webview: vscode.Webview, webviewUri: vscode.Uri, webviewPath: string, nonce: string): string {
    try {
      // Read the Angular-generated index.html
      const indexHtmlPath = path.join(webviewPath, 'index.html');
      let indexHtml = readFileSync(indexHtmlPath, 'utf8');

      // Convert all relative paths to webview URIs
      const baseUri = webview.asWebviewUri(webviewUri);
      
      // Replace script src and link href with webview URIs
      indexHtml = indexHtml.replace(
        /src="([^"]+\.js)"/g, 
        (match, filename) => {
          const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(webviewUri, filename));
          return `src="${scriptUri}"`;
        }
      );

      indexHtml = indexHtml.replace(
        /href="([^"]+\.css)"/g,
        (match, filename) => {
          const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(webviewUri, filename));
          return `href="${styleUri}"`;
        }
      );

      // Update the base href
      indexHtml = indexHtml.replace(
        /<base href="[^"]*">/,
        `<base href="${baseUri}/">`
      );

      // Add proper CSP for Angular with modules
      const cspContent = `default-src 'none'; 
        script-src 'nonce-${nonce}' ${webview.cspSource} 'unsafe-eval'; 
        style-src ${webview.cspSource} 'unsafe-inline'; 
        img-src ${webview.cspSource} data:; 
        font-src ${webview.cspSource};`;

      // Replace or add CSP
      if (indexHtml.includes('Content-Security-Policy')) {
        indexHtml = indexHtml.replace(
          /content="[^"]*"(?=.*Content-Security-Policy)/,
          `content="${cspContent}"`
        );
      } else {
        indexHtml = indexHtml.replace(
          '<head>',
          `<head>\n  <meta http-equiv="Content-Security-Policy" content="${cspContent}">`
        );
      }

      // Add nonce to all script tags
      indexHtml = indexHtml.replace(
        /<script([^>]*?)>/g,
        `<script nonce="${nonce}"$1>`
      );

      // Ensure VSCode API is available
      const vscodeApiScript = `
        <script nonce="${nonce}">
          window.acquireVsCodeApi = window.acquireVsCodeApi || (() => ({
            postMessage: (message) => console.log('Mock VSCode message:', message),
            getState: () => ({}),
            setState: (state) => console.log('Mock VSCode state:', state)
          }));
        </script>
      `;

      indexHtml = indexHtml.replace('</head>', `${vscodeApiScript}\n</head>`);

      return indexHtml;

    } catch (error) {
      console.error('Error reading Angular index.html:', error);
      return this.getFallbackAngularHtml(webview, webviewUri, nonce);
    }
  }

  private getFallbackAngularHtml(webview: vscode.Webview, webviewUri: vscode.Uri, nonce: string): string {
    // Fallback HTML in case reading the Angular index.html fails
    const baseUri = webview.asWebviewUri(webviewUri);
    const mainJs = webview.asWebviewUri(vscode.Uri.joinPath(webviewUri, 'main.js'));
    const polyfillsJs = webview.asWebviewUri(vscode.Uri.joinPath(webviewUri, 'polyfills.js'));
    const runtimeJs = webview.asWebviewUri(vscode.Uri.joinPath(webviewUri, 'runtime.js'));
    const stylesUri = webview.asWebviewUri(vscode.Uri.joinPath(webviewUri, 'styles.css'));

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; 
               script-src 'nonce-${nonce}' ${webview.cspSource} 'unsafe-eval'; 
               style-src ${webview.cspSource} 'unsafe-inline'; 
               img-src ${webview.cspSource} data:; 
               font-src ${webview.cspSource};">
        <base href="${baseUri}/">
        <title>AI Debug Context</title>
        <link rel="stylesheet" type="text/css" href="${stylesUri}">
        <style nonce="${nonce}">
          body {
            margin: 0;
            padding: 0;
            font-family: var(--vscode-font-family);
            background-color: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
          }
        </style>
      </head>
      <body>
        <app-root>
          <div style="display: flex; align-items: center; justify-content: center; height: 100vh; flex-direction: column;">
            <div style="border: 2px solid var(--vscode-progressBar-background); border-top: 2px solid var(--vscode-progressBar-foreground); border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite;"></div>
            <p style="margin-top: 16px; color: var(--vscode-descriptionForeground);">Loading AI Debug Context...</p>
          </div>
        </app-root>
        
        <script nonce="${nonce}">
          window.acquireVsCodeApi = window.acquireVsCodeApi || (() => ({
            postMessage: (message) => console.log('Mock VSCode message:', message),
            getState: () => ({}),
            setState: (state) => console.log('Mock VSCode state:', state)
          }));
        </script>
        
        <script nonce="${nonce}" src="${runtimeJs}" type="module"></script>
        <script nonce="${nonce}" src="${polyfillsJs}" type="module"></script>
        <script nonce="${nonce}" src="${mainJs}" type="module"></script>
        
        <style nonce="${nonce}">
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        </style>
      </body>
      </html>
    `;
  }

  private getPlaceholderHtml(nonce: string): string {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>AI Debug Context</title>
        <style nonce="${nonce}">
          body {
            margin: 0;
            padding: 20px;
            font-family: var(--vscode-font-family);
            background-color: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            text-align: center;
          }
          .header {
            font-size: 24px;
            margin-bottom: 20px;
            color: var(--vscode-foreground);
          }
          .description {
            margin-bottom: 30px;
            color: var(--vscode-descriptionForeground);
            line-height: 1.5;
          }
          .code {
            background-color: var(--vscode-textBlockQuote-background);
            padding: 10px;
            border-radius: 4px;
            font-family: var(--vscode-editor-font-family);
            margin: 10px 0;
          }
          .button {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 10px 20px;
            border-radius: 4px;
            cursor: pointer;
            margin: 5px;
          }
          .button:hover {
            background-color: var(--vscode-button-hoverBackground);
          }
          .status {
            margin-top: 20px;
            padding: 10px;
            border-radius: 4px;
            background-color: var(--vscode-inputValidation-warningBackground);
            color: var(--vscode-inputValidation-warningForeground);
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1 class="header">🤖 AI Debug Context</h1>
          <div class="description">
            <p>Welcome to AI Debug Context! The Angular webview is not built yet.</p>
            <p>This extension helps you debug tests and generate PR descriptions using AI.</p>
          </div>
          
          <div class="status">
            <strong>Setup Required:</strong> Please build the webview UI first.
          </div>
          
          <div class="code">
            <strong>Build Command:</strong><br>
            <code>npm run build:webview</code>
          </div>
          
          <div style="margin-top: 30px;">
            <button class="button" onclick="runTestDebug()">🧪 Test Extension (Backend Only)</button>
            <button class="button" onclick="runBasicDiff()">📄 Get Git Diff</button>
          </div>
          
          <div id="output" style="margin-top: 20px; text-align: left; background-color: var(--vscode-editor-background); padding: 10px; border-radius: 4px; font-family: monospace; font-size: 12px; max-height: 300px; overflow-y: auto;"></div>
        </div>

        <script nonce="${nonce}">
          // VSCode API
          const vscode = acquireVsCodeApi();
          
          function runTestDebug() {
            addOutput('🚀 Running AI Test Debug workflow...');
            vscode.postMessage({ command: 'runFullWorkflow' });
          }
          
          function runBasicDiff() {
            addOutput('📊 Getting git diff...');
            vscode.postMessage({ command: 'getGitDiff' });
          }
          
          function addOutput(text) {
            const output = document.getElementById('output');
            const timestamp = new Date().toLocaleTimeString();
            output.innerHTML += '[' + timestamp + '] ' + text + '\\n';
            output.scrollTop = output.scrollHeight;
          }
          
          // Listen for messages from extension
          window.addEventListener('message', event => {
            const message = event.data;
            switch (message.command) {
              case 'workflowStateUpdate':
                addOutput('📈 Workflow: ' + message.data.step + (message.data.message ? ' - ' + message.data.message : ''));
                break;
              case 'workflowComplete':
                addOutput('✅ Workflow completed!');
                break;
              case 'workflowError':
                addOutput('❌ Error: ' + message.data.error);
                break;
              case 'gitDiff':
                addOutput('📄 Git Diff received: ' + message.data.length + ' characters');
                break;
              default:
                addOutput('📨 Received: ' + message.command);
            }
          });
          
          addOutput('🎯 AI Debug Context loaded (placeholder mode)');
        </script>
      </body>
      </html>
    `;
  }

  private generateNonce(): string {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }

  private async handleWebviewMessage(message: WebviewMessage): Promise<void> {
    try {
      switch (message.command) {
        case 'selectModule':
          await this.handleModuleSelection(message.data?.moduleType);
          break;
        case 'runFullWorkflow':
          await this.runAITestDebug();
          break;
        case 'runTestsOnly':
          await this.runTestsOnly();
          break;
        case 'getGitDiff':
          await this.getGitDiff();
          break;
        case 'getUncommittedChanges':
          await this.getUncommittedChanges();
          break;
        case 'getCommitHistory':
          await this.getCommitHistory(message.data?.limit);
          break;
        case 'getBranchDiff':
          await this.getBranchDiff();
          break;
        case 'getDiffForCommit':
          await this.getDiffForCommit(message.data?.commitHash);
          break;
        case 'getCurrentBranch':
          await this.getCurrentBranch();
          break;
        case 'getNXProjects':
          await this.getNXProjects();
          break;
        case 'getAffectedProjects':
          await this.getAffectedProjects(message.data?.baseBranch);
          break;
        case 'runProjectTests':
          await this.runProjectTests(message.data?.projectName);
          break;
        case 'runAffectedTests':
          await this.runAffectedTests(message.data?.baseBranch);
          break;
        case 'isNXWorkspace':
          await this.checkNXWorkspace();
          break;
        case 'getProjectTestFiles':
          await this.getProjectTestFiles(message.data?.projectName);
          break;
        case 'getMultipleProjectTestFiles':
          await this.getMultipleProjectTestFiles(message.data?.projectNames);
          break;
        case 'checkCopilotAvailability':
          await this.checkCopilotAvailability();
          break;
        case 'runAIAnalysis':
          await this.runAIAnalysis(message.data);
          break;
        case 'generatePRDescription':
          await this.generatePRDescription(message.data);
          break;
        case 'runCopilotDiagnostics':
          await this.runCopilotDiagnostics();
          break;
        case 'executeCopilotAction':
          await this.executeCopilotAction(message.data?.action);
          break;
        case 'getCopilotCommands':
          await this.getCopilotCommands();
          break;
        case 'generateGitDiff':
          await this.generateGitDiff(message.data);
          break;
        case 'rerunGitDiff':
          await this.rerunGitDiff(message.data);
          break;
        case 'openDiffFile':
          await this.openDiffFile(message.data?.filePath);
          break;
        case 'deleteDiffFile':
          await this.deleteDiffFile(message.data?.filePath);
          break;
        case 'cleanupAllDiffFiles':
          await this.cleanupAllDiffFiles();
          break;
        case 'cleanupAllTestOutputFiles':
          await this.cleanupAllTestOutputFiles();
          break;
        case 'runTests':
          await this.runTestsWithStreaming(message.data);
          break;
        case 'cancelTestRun':
          await this.cancelTestRun();
          break;
        case 'openOutputFile':
          await this.openOutputFile(message.data?.filePath);
          break;
        case 'deleteOutputFile':
          await this.deleteOutputFile(message.data?.filePath);
          break;
        case 'resetWorkflow':
          this.resetWorkflow();
          break;
        default:
          console.warn('Unknown webview message command:', message.command);
      }
    } catch (error) {
      console.error('Error handling webview message:', error);
      this.sendMessage('workflowError', { error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  private async getGitDiff(): Promise<void> {
    try {
      const diff = await this.gitIntegration.getDiffForUncommittedChanges();
      this.sendMessage('gitDiff', diff);
    } catch (error) {
      this.sendMessage('workflowError', { error: `Failed to get git diff: ${error}` });
    }
  }

  private async getUncommittedChanges(): Promise<void> {
    try {
      const changes = await this.gitIntegration.getUncommittedChanges();
      this.sendMessage('uncommittedChanges', changes);
    } catch (error) {
      console.error('Failed to get uncommitted changes:', error);
      this.sendMessage('workflowError', { error: `Failed to get uncommitted changes: ${error}` });
    }
  }

  private async getCommitHistory(limit: number = 50): Promise<void> {
    try {
      const commits = await this.gitIntegration.getCommitHistory(limit);
      this.sendMessage('commitHistory', commits);
    } catch (error) {
      console.error('Failed to get commit history:', error);
      this.sendMessage('workflowError', { error: `Failed to get commit history: ${error}` });
    }
  }

  private async getBranchDiff(): Promise<void> {
    try {
      const diff = await this.gitIntegration.getDiffFromMainBranch();
      // Parse diff to get basic stats
      const stats = this.parseDiffStats(diff);
      this.sendMessage('branchDiff', { diff, stats });
    } catch (error) {
      console.error('Failed to get branch diff:', error);
      this.sendMessage('workflowError', { error: `Failed to get branch diff: ${error}` });
    }
  }

  private async getDiffForCommit(commitHash: string): Promise<void> {
    try {
      if (!commitHash) {
        throw new Error('Commit hash is required');
      }
      const diff = await this.gitIntegration.getDiffForCommit(commitHash);
      this.sendMessage('commitDiff', { commitHash, diff });
    } catch (error) {
      console.error(`Failed to get diff for commit ${commitHash}:`, error);
      this.sendMessage('workflowError', { error: `Failed to get diff for commit: ${error}` });
    }
  }

  private async getCurrentBranch(): Promise<void> {
    try {
      const branch = await this.gitIntegration.getCurrentBranch();
      this.sendMessage('currentBranch', branch);
    } catch (error) {
      console.error('Failed to get current branch:', error);
      this.sendMessage('workflowError', { error: `Failed to get current branch: ${error}` });
    }
  }

  private async checkNXWorkspace(): Promise<void> {
    try {
      const isNX = await this.nxManager.isNXWorkspace();
      this.sendMessage('nxWorkspaceStatus', { isNXWorkspace: isNX });
    } catch (error) {
      console.error('Failed to check NX workspace:', error);
      this.sendMessage('workflowError', { error: `Failed to check NX workspace: ${error}` });
    }
  }

  private async getNXProjects(): Promise<void> {
    try {
      const projects = await this.nxManager.listProjects();
      this.sendMessage('nxProjects', projects);
    } catch (error) {
      console.error('Failed to get NX projects:', error);
      this.sendMessage('workflowError', { error: `Failed to get NX projects: ${error}` });
    }
  }

  private async getAffectedProjects(baseBranch: string = 'main'): Promise<void> {
    try {
      const affectedProjects = await this.nxManager.getAffectedProjects(baseBranch);
      this.sendMessage('affectedProjects', { projects: affectedProjects, baseBranch });
    } catch (error) {
      console.error('Failed to get affected projects:', error);
      this.sendMessage('workflowError', { error: `Failed to get affected projects: ${error}` });
    }
  }

  private async runProjectTests(projectName: string): Promise<void> {
    try {
      if (!projectName) {
        throw new Error('Project name is required');
      }
      
      this.updateWorkflowState({ step: 'running-tests', progress: 0, message: `Running tests for ${projectName}...` });
      
      const testResults = await this.nxManager.runProjectTests(projectName);
      
      this.updateWorkflowState({ step: 'complete', progress: 100, message: 'Tests completed!' });
      this.sendMessage('testResults', { project: projectName, results: testResults });
    } catch (error) {
      console.error(`Failed to run tests for project ${projectName}:`, error);
      this.updateWorkflowState({ step: 'error', message: `Failed to run tests: ${error}` });
    }
  }

  private async runAffectedTests(baseBranch: string = 'main'): Promise<void> {
    try {
      this.updateWorkflowState({ step: 'running-tests', progress: 0, message: 'Running affected tests...' });
      
      const testResults = await this.nxManager.runAffectedTests(baseBranch);
      
      this.updateWorkflowState({ step: 'complete', progress: 100, message: 'Affected tests completed!' });
      this.sendMessage('testResults', { type: 'affected', baseBranch, results: testResults });
    } catch (error) {
      console.error('Failed to run affected tests:', error);
      this.updateWorkflowState({ step: 'error', message: `Failed to run affected tests: ${error}` });
    }
  }

  private async getProjectTestFiles(projectName: string): Promise<void> {
    try {
      if (!projectName) {
        throw new Error('Project name is required');
      }

      // Get project configuration to find test files
      const projects = await this.nxManager.listProjects();
      const project = projects.find(p => p.name === projectName);
      
      if (!project) {
        throw new Error(`Project ${projectName} not found`);
      }

      // Find test files in the project directory
      const testFiles = await this.findTestFiles(project.root);
      
      this.sendMessage('projectTestFiles', { projectName, testFiles });
    } catch (error) {
      console.error(`Failed to get test files for project ${projectName}:`, error);
      this.sendMessage('workflowError', { error: `Failed to get test files: ${error}` });
    }
  }

  private async findTestFiles(projectRoot: string): Promise<any[]> {
    const { readdir, stat } = require('fs').promises;
    const path = require('path');
    
    const testFiles: any[] = [];
    const fullPath = path.join(this.nxManager.getWorkspacePath(), projectRoot);
    
    try {
      const findTestFilesRecursive = async (dir: string, relativePath: string = '') => {
        const entries = await readdir(dir);
        
        for (const entry of entries) {
          const entryPath = path.join(dir, entry);
          const relativeEntryPath = path.join(relativePath, entry);
          const stats = await stat(entryPath);
          
          if (stats.isDirectory() && !entry.startsWith('.') && entry !== 'node_modules') {
            await findTestFilesRecursive(entryPath, relativeEntryPath);
          } else if (stats.isFile() && (entry.endsWith('.spec.ts') || entry.endsWith('.test.ts'))) {
            // Count test cases in the file (simple heuristic)
            const testCount = await this.countTestsInFile(entryPath);
            
            testFiles.push({
              path: relativeEntryPath,
              selected: false,
              testCount
            });
          }
        }
      };
      
      await findTestFilesRecursive(fullPath);
    } catch (error) {
      console.warn(`Could not scan directory ${fullPath}:`, error);
    }
    
    return testFiles;
  }

  private async countTestsInFile(filePath: string): Promise<number> {
    try {
      const { readFile } = require('fs').promises;
      const content = await readFile(filePath, 'utf-8');
      
      // Simple regex to count test cases
      const testMatches = content.match(/\b(it|test)\s*\(/g);
      return testMatches ? testMatches.length : 0;
    } catch (error) {
      return 0;
    }
  }

  private parseDiffStats(diff: string): { filesChanged: number; additions: number; deletions: number } {
    // Simple diff stats parser
    const lines = diff.split('\n');
    const files = new Set<string>();
    let additions = 0;
    let deletions = 0;

    for (const line of lines) {
      if (line.startsWith('diff --git')) {
        const match = line.match(/diff --git a\/(.*?) b\/(.*?)$/);
        if (match && match[1]) {
          files.add(match[1]);
        }
      } else if (line.startsWith('+') && !line.startsWith('+++')) {
        additions++;
      } else if (line.startsWith('-') && !line.startsWith('---')) {
        deletions++;
      }
    }

    return {
      filesChanged: files.size,
      additions,
      deletions
    };
  }

  private async handleModuleSelection(moduleType: string): Promise<void> {
    // For now, just show info about the selected module
    // In future iterations, we'll navigate to specific module views
    vscode.window.showInformationMessage(`Selected module: ${moduleType}`);
    this.sendMessage('moduleSelected', { moduleType });
  }

  public async runAITestDebug(): Promise<void> {
    try {
      this.updateWorkflowState({ step: 'collecting-context', progress: 0 });

      // Step 1: Collect file changes (using uncommitted changes as default)
      this.updateWorkflowState({ step: 'collecting-context', progress: 25, message: 'Collecting git changes...' });
      const fileChanges = await this.gitIntegration.getUncommittedChanges();
      const gitDiff = await this.gitIntegration.getDiffForUncommittedChanges();

      // Step 2: Run tests
      this.updateWorkflowState({ step: 'running-tests', progress: 50, message: 'Running affected tests...' });
      const testResults = await this.testRunner.runAffectedTests();

      // Step 3: AI Analysis
      this.updateWorkflowState({ step: 'analyzing-with-ai', progress: 75, message: 'Analyzing with AI...' });
      
      if (testResults.some(test => test.status === 'failed')) {
        // Handle test failures
        await this.handleTestFailures(gitDiff, testResults);
      } else {
        // All tests passed
        await this.handleTestSuccess(gitDiff, testResults);
      }

      // Step 4: Generate PR description (if applicable)
      this.updateWorkflowState({ step: 'generating-pr', progress: 90, message: 'Generating PR description...' });
      // TODO: Implement PR generation

      // Complete
      this.updateWorkflowState({ step: 'complete', progress: 100, message: 'Workflow completed successfully!' });
      this.sendMessage('workflowComplete', { success: true });

    } catch (error) {
      console.error('AI Test Debug workflow failed:', error);
      this.updateWorkflowState({ 
        step: 'error', 
        message: error instanceof Error ? error.message : 'Unknown error occurred' 
      });
    }
  }

  private async runTestsOnly(): Promise<void> {
    try {
      this.updateWorkflowState({ step: 'running-tests', progress: 0, message: 'Running tests...' });
      
      const testResults = await this.testRunner.runAffectedTests();
      
      this.updateWorkflowState({ step: 'complete', progress: 100, message: 'Tests completed!' });
      
      // Show test results
      const passedCount = testResults.filter(t => t.status === 'passed').length;
      const failedCount = testResults.filter(t => t.status === 'failed').length;
      const skippedCount = testResults.filter(t => t.status === 'skipped').length;
      
      vscode.window.showInformationMessage(
        `Tests completed: ${passedCount} passed, ${failedCount} failed, ${skippedCount} skipped`
      );
      
    } catch (error) {
      console.error('Test execution failed:', error);
      this.updateWorkflowState({ 
        step: 'error', 
        message: error instanceof Error ? error.message : 'Test execution failed' 
      });
    }
  }

  private async handleTestFailures(gitDiff: string, testResults: any[]): Promise<void> {
    try {
      console.log('Analyzing test failures with AI...');
      
      // Prepare debug context for AI analysis
      const debugContext = {
        gitDiff,
        testResults,
        projectInfo: await this.getProjectInfo()
      };

      // Use Copilot to analyze test failures
      const testAnalysis = await this.copilot.analyzeTestFailures(debugContext);
      
      // Get new test suggestions
      const testSuggestions = await this.copilot.suggestNewTests(debugContext);

      // Send comprehensive analysis to webview
      this.sendMessage('aiAnalysisComplete', {
        type: 'failure-analysis',
        analysis: testAnalysis,
        suggestions: testSuggestions,
        testResults
      });

      // Show summary notification
      const failures = testResults.filter(t => t.status === 'failed');
      const analysisMessage = await this.copilot.isAvailable() 
        ? `AI analyzed ${failures.length} test failures with actionable recommendations`
        : `Found ${failures.length} test failures (Copilot unavailable - using fallback analysis)`;
      
      vscode.window.showWarningMessage(analysisMessage);
      
    } catch (error) {
      console.error('Failed to analyze test failures:', error);
      this.sendMessage('workflowError', { 
        error: `AI analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      });
    }
  }

  private async handleTestSuccess(gitDiff: string, testResults: any[]): Promise<void> {
    try {
      console.log('Analyzing successful tests with AI...');
      
      // Prepare debug context for AI analysis
      const debugContext = {
        gitDiff,
        testResults,
        projectInfo: await this.getProjectInfo()
      };

      // Use Copilot to detect false positives
      const falsePositiveAnalysis = await this.copilot.detectFalsePositives(debugContext);
      
      // Get new test suggestions
      const testSuggestions = await this.copilot.suggestNewTests(debugContext);

      // Send comprehensive analysis to webview
      this.sendMessage('aiAnalysisComplete', {
        type: 'success-analysis',
        falsePositives: falsePositiveAnalysis,
        suggestions: testSuggestions,
        testResults
      });

      // Show summary notification
      const analysisMessage = await this.copilot.isAvailable()
        ? `AI analyzed ${testResults.length} passing tests and provided improvement suggestions`
        : `${testResults.length} tests passed (Copilot unavailable - using fallback analysis)`;
      
      vscode.window.showInformationMessage(analysisMessage);
      
    } catch (error) {
      console.error('Failed to analyze successful tests:', error);
      this.sendMessage('workflowError', { 
        error: `AI analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      });
    }
  }

  private resetWorkflow(): void {
    this.workflowState = { step: 'idle' };
    this.sendMessage('workflowStateUpdate', this.workflowState);
  }

  private updateWorkflowState(newState: Partial<WorkflowState>): void {
    this.workflowState = { ...this.workflowState, ...newState };
    this.sendMessage('workflowStateUpdate', this.workflowState);
  }

  private sendMessage(command: string, data?: any): void {
    if (this.view) {
      this.view.webview.postMessage({ command, data });
    }
  }

  private async sendInitialStatus(): Promise<void> {
    try {
      // Send Copilot availability status
      await this.checkCopilotAvailability();
      
      // Send initial workflow state
      this.sendMessage('workflowStateUpdate', this.workflowState);
      
      console.log('Initial status sent to webview');
    } catch (error) {
      console.error('Failed to send initial status:', error);
    }
  }

  private async checkCopilotAvailability(): Promise<void> {
    try {
      const isAvailable = await this.copilot.isAvailable();
      
      // Get diagnostic information for better troubleshooting
      const diagnostics = await this.copilot.getDiagnostics();
      
      this.sendMessage('copilotAvailability', { 
        available: isAvailable,
        diagnostics 
      });
      
      console.log(`Copilot availability: ${isAvailable}`, diagnostics);
    } catch (error) {
      console.error('Failed to check Copilot availability:', error);
      this.sendMessage('copilotAvailability', { 
        available: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }

  private async runAIAnalysis(data: { gitDiff: string; testResults: any[]; analysisType?: string }): Promise<void> {
    try {
      const { gitDiff, testResults, analysisType } = data;
      
      if (!gitDiff || !testResults) {
        throw new Error('Git diff and test results are required for AI analysis');
      }

      // Prepare debug context
      const debugContext = {
        gitDiff,
        testResults,
        projectInfo: await this.getProjectInfo()
      };

      this.updateWorkflowState({ step: 'analyzing-with-ai', progress: 70, message: 'Running AI analysis...' });

      // Determine analysis type if not specified
      const hasFailures = testResults.some((test: any) => test.status === 'failed');
      const actualAnalysisType = analysisType || (hasFailures ? 'failure' : 'success');

      let analysisResults: any = {};

      switch (actualAnalysisType) {
        case 'failure':
          analysisResults.testAnalysis = await this.copilot.analyzeTestFailures(debugContext);
          break;
        case 'success':
          analysisResults.falsePositiveAnalysis = await this.copilot.detectFalsePositives(debugContext);
          break;
        case 'comprehensive':
          // Run all types of analysis
          analysisResults.testAnalysis = hasFailures ? await this.copilot.analyzeTestFailures(debugContext) : null;
          analysisResults.falsePositiveAnalysis = await this.copilot.detectFalsePositives(debugContext);
          break;
      }

      // Always get test suggestions
      analysisResults.testSuggestions = await this.copilot.suggestNewTests(debugContext);

      this.sendMessage('aiAnalysisComplete', {
        type: actualAnalysisType,
        ...analysisResults,
        testResults
      });

      this.updateWorkflowState({ step: 'complete', progress: 100, message: 'AI analysis completed!' });

    } catch (error) {
      console.error('AI analysis failed:', error);
      this.updateWorkflowState({ step: 'error', message: `AI analysis failed: ${error}` });
      this.sendMessage('workflowError', { error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  private async generatePRDescription(data: { gitDiff: string; testResults?: any[]; template?: string; jiraTickets?: string[]; featureFlags?: string[] }): Promise<void> {
    try {
      // For now, this is a placeholder for PR description generation
      // In a full implementation, this would use the Copilot service with PR-specific prompts
      
      const { gitDiff, testResults, template, jiraTickets, featureFlags } = data;
      
      if (!gitDiff) {
        throw new Error('Git diff is required for PR description generation');
      }

      this.updateWorkflowState({ step: 'generating-pr', progress: 90, message: 'Generating PR description...' });

      // TODO: Implement actual PR description generation using Copilot
      // For now, generate a basic description based on the diff
      const prDescription = this.generateBasicPRDescription(gitDiff, testResults, jiraTickets, featureFlags);

      this.sendMessage('prDescriptionGenerated', {
        description: prDescription,
        template: template || 'standard',
        jiraTickets: jiraTickets || [],
        featureFlags: featureFlags || []
      });

      this.updateWorkflowState({ step: 'complete', progress: 100, message: 'PR description generated!' });

    } catch (error) {
      console.error('PR description generation failed:', error);
      this.sendMessage('workflowError', { error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  private async getMultipleProjectTestFiles(projectNames: string[]): Promise<void> {
    try {
      if (!projectNames || projectNames.length === 0) {
        throw new Error('Project names are required');
      }

      let allTestFiles: any[] = [];

      // Get test files for each project
      for (const projectName of projectNames) {
        const projects = await this.nxManager.listProjects();
        const project = projects.find(p => p.name === projectName);
        
        if (project) {
          const testFiles = await this.findTestFiles(project.root);
          // Add project prefix to distinguish files from different projects
          const prefixedFiles = testFiles.map(file => ({
            ...file,
            path: `${projectName}/${file.path}`,
            project: projectName
          }));
          allTestFiles = allTestFiles.concat(prefixedFiles);
        }
      }
      
      this.sendMessage('multipleProjectTestFiles', { projectNames, testFiles: allTestFiles });
    } catch (error) {
      console.error(`Failed to get test files for projects ${projectNames}:`, error);
      this.sendMessage('workflowError', { error: `Failed to get test files: ${error}` });
    }
  }

  private async getProjectInfo(): Promise<any> {
    try {
      // Get basic project information for AI context
      const workspacePath = this.nxManager.getWorkspacePath();
      const packageJsonPath = require('path').join(workspacePath, 'package.json');
      
      let projectInfo: any = {
        name: 'Unknown Project',
        type: 'NX Workspace',
        framework: 'Unknown',
        testFramework: 'Unknown',
        dependencies: []
      };

      try {
        const { readFile } = require('fs').promises;
        const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf-8'));
        
        projectInfo.name = packageJson.name || 'Unknown Project';
        
        // Detect framework
        if (packageJson.dependencies?.['@angular/core'] || packageJson.devDependencies?.['@angular/core']) {
          projectInfo.framework = 'Angular';
        } else if (packageJson.dependencies?.['react'] || packageJson.devDependencies?.['react']) {
          projectInfo.framework = 'React';
        } else if (packageJson.dependencies?.['vue'] || packageJson.devDependencies?.['vue']) {
          projectInfo.framework = 'Vue';
        }
        
        // Detect test framework
        if (packageJson.devDependencies?.['jest'] || packageJson.dependencies?.['jest']) {
          projectInfo.testFramework = 'Jest';
        } else if (packageJson.devDependencies?.['vitest'] || packageJson.dependencies?.['vitest']) {
          projectInfo.testFramework = 'Vitest';
        } else if (packageJson.devDependencies?.['mocha'] || packageJson.dependencies?.['mocha']) {
          projectInfo.testFramework = 'Mocha';
        }
        
        // Get key dependencies
        projectInfo.dependencies = Object.keys({
          ...packageJson.dependencies,
          ...packageJson.devDependencies
        }).slice(0, 20); // Limit to first 20 dependencies
        
      } catch (error) {
        console.warn('Could not read package.json:', error);
      }

      return projectInfo;
    } catch (error) {
      console.error('Failed to get project info:', error);
      return {
        name: 'Unknown Project',
        type: 'NX Workspace',
        framework: 'Unknown',
        testFramework: 'Unknown',
        dependencies: []
      };
    }
  }

  private generateBasicPRDescription(gitDiff: string, testResults?: any[], jiraTickets?: string[], featureFlags?: string[]): string {
    // Basic PR description generator - in a full implementation, this would use Copilot
    const lines = gitDiff.split('\n');
    const modifiedFiles = lines
      .filter(line => line.startsWith('diff --git'))
      .map(line => {
        const match = line.match(/diff --git a\/(.*?) b\/(.*?)$/);
        return match ? match[1] : null;
      })
      .filter(Boolean);

    let description = '## Summary\n\n';
    description += 'This PR includes changes to the following areas:\n\n';
    
    // Categorize files
    const categories: { [key: string]: string[] } = {
      Components: [],
      Services: [],
      Tests: [],
      Configuration: [],
      Other: []
    };

    modifiedFiles.forEach(file => {
      if (file?.includes('.component.')) categories.Components.push(file);
      else if (file?.includes('.service.')) categories.Services.push(file);
      else if (file?.includes('.spec.') || file?.includes('.test.')) categories.Tests.push(file);
      else if (file?.includes('config') || file?.includes('.json') || file?.includes('.yml')) categories.Configuration.push(file);
      else if (file) categories.Other.push(file);
    });

    Object.entries(categories).forEach(([category, files]) => {
      if (files.length > 0) {
        description += `### ${category}\n`;
        files.forEach(file => {
          description += `- ${file}\n`;
        });
        description += '\n';
      }
    });

    // Add test results if available
    if (testResults && testResults.length > 0) {
      const passed = testResults.filter(t => t.status === 'passed').length;
      const failed = testResults.filter(t => t.status === 'failed').length;
      description += '## Test Results\n\n';
      description += `- ✅ ${passed} tests passing\n`;
      if (failed > 0) {
        description += `- ❌ ${failed} tests failing\n`;
      }
      description += '\n';
    }

    // Add Jira tickets if provided
    if (jiraTickets && jiraTickets.length > 0) {
      description += '## Related Issues\n\n';
      jiraTickets.forEach(ticket => {
        description += `- ${ticket}\n`;
      });
      description += '\n';
    }

    // Add feature flags if detected
    if (featureFlags && featureFlags.length > 0) {
      description += '## Feature Flags\n\n';
      featureFlags.forEach(flag => {
        description += `- ${flag}\n`;
      });
      description += '\n';
    }

    description += '## Deployment Notes\n\n';
    description += '- [ ] Ensure all tests are passing\n';
    description += '- [ ] Verify no breaking changes\n';
    if (featureFlags && featureFlags.length > 0) {
      description += '- [ ] Feature flags configured properly\n';
    }

    return description;
  }

  private async runCopilotDiagnostics(): Promise<void> {
    try {
      console.log('Running Copilot diagnostics...');
      const diagnostics = await this.copilotDiagnostics.runDiagnostics();
      this.sendMessage('copilotDiagnosticsComplete', diagnostics);
    } catch (error) {
      console.error('Failed to run Copilot diagnostics:', error);
      this.sendMessage('workflowError', { 
        error: `Diagnostics failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      });
    }
  }

  private async getCopilotCommands(): Promise<void> {
    try {
      // Import the command helper dynamically
      const { CopilotCommandHelper } = await import('../services/CopilotCommandHelper');
      
      const commands = await CopilotCommandHelper.getAvailableCopilotCommands();
      const status = await CopilotCommandHelper.getCopilotExtensionStatus();
      
      this.sendMessage('copilotCommandsAvailable', {
        commands,
        extensionStatus: status
      });
    } catch (error) {
      console.error('Failed to get Copilot commands:', error);
      this.sendMessage('copilotCommandsAvailable', {
        commands: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async executeCopilotAction(action: string): Promise<void> {
    try {
      if (!action) {
        throw new Error('Action is required');
      }
      
      console.log(`Executing Copilot action: ${action}`);
      const result = await this.copilotDiagnostics.executeAction(action);
      
      this.sendMessage('copilotActionComplete', result);
      
      // Show notification to user
      if (result.success) {
        vscode.window.showInformationMessage(result.message);
      } else {
        vscode.window.showWarningMessage(result.message);
      }
    } catch (error) {
      console.error(`Failed to execute Copilot action ${action}:`, error);
      const errorMessage = `Action failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      this.sendMessage('workflowError', { error: errorMessage });
      vscode.window.showErrorMessage(errorMessage);
    }
  }

  private async generateGitDiff(data: { mode: 'uncommitted' | 'commit' | 'branch-diff'; commitHash?: string }): Promise<void> {
    try {
      const { mode, commitHash } = data;
      
      if (!mode) {
        throw new Error('Diff mode is required');
      }

      // Start streaming output
      this.sendMessage('gitDiffProgress', { output: 'Initializing git diff generation...\n' });

      // Generate diff with streaming
      const result = await this.gitIntegration.generateDiffWithStreaming(
        mode,
        commitHash,
        (output) => {
          // Stream output to webview
          this.sendMessage('gitDiffProgress', { output });
        }
      );

      // Send completion message
      this.sendMessage('gitDiffComplete', {
        mode,
        content: result.content,
        filePath: result.filePath,
        timestamp: new Date(),
        status: 'complete'
      });

      // Also send message to show git diff view
      this.sendMessage('gitDiffGenerated', {
        mode,
        content: result.content,
        filePath: result.filePath,
        timestamp: new Date(),
        status: 'complete'
      });

    } catch (error) {
      console.error('Failed to generate git diff:', error);
      this.sendMessage('gitDiffError', {
        error: error instanceof Error ? error.message : 'Unknown error',
        mode: data.mode
      });
    }
  }

  private async rerunGitDiff(data: { mode: 'uncommitted' | 'commit' | 'branch-diff'; commitHash?: string }): Promise<void> {
    // Rerun is the same as generate, just called from a different context
    await this.generateGitDiff(data);
  }

  private async openDiffFile(filePath: string): Promise<void> {
    try {
      if (!filePath) {
        throw new Error('File path is required');
      }

      await this.gitIntegration.openDiffFile(filePath);
      
      // Show success notification
      vscode.window.showInformationMessage('Diff file opened successfully');
      
    } catch (error) {
      console.error('Failed to open diff file:', error);
      const errorMessage = `Failed to open diff file: ${error instanceof Error ? error.message : 'Unknown error'}`;
      vscode.window.showErrorMessage(errorMessage);
      this.sendMessage('workflowError', { error: errorMessage });
    }
  }

  private async deleteDiffFile(filePath: string): Promise<void> {
    try {
      if (!filePath) {
        throw new Error('File path is required');
      }

      // Ask for confirmation
      const confirmation = await vscode.window.showWarningMessage(
        'Are you sure you want to delete this diff file?',
        { modal: true },
        'Delete',
        'Cancel'
      );

      if (confirmation === 'Delete') {
        await this.gitIntegration.deleteDiffFile(filePath);
        
        // Notify webview that file was deleted
        this.sendMessage('gitDiffFileDeleted', { filePath });
        
        // Show success notification
        vscode.window.showInformationMessage('Diff file deleted successfully');
      }
      
    } catch (error) {
      console.error('Failed to delete diff file:', error);
      const errorMessage = `Failed to delete diff file: ${error instanceof Error ? error.message : 'Unknown error'}`;
      vscode.window.showErrorMessage(errorMessage);
      this.sendMessage('workflowError', { error: errorMessage });
    }
  }

  private async runTestsWithStreaming(config: any): Promise<void> {
    try {
      if (!config) {
        throw new Error('Test configuration is required');
      }

      const { mode, project, projects, command } = config;
      const startTime = new Date().toISOString();
      
      // Notify test execution started
      this.sendMessage('testExecutionStarted', {
        command,
        startTime,
        mode
      });

      // Create execution options with streaming callback
      const executionOptions: TestExecutionOptions = {
        command,
        mode: mode as 'project' | 'affected',
        projects: projects || (project ? [project] : undefined),
        saveToFile: true,
        outputCallback: (output: string) => {
          // Stream output in real-time
          this.sendMessage('testExecutionOutput', {
            output,
            append: true
          });
        }
      };

      // Execute tests with automatic cleanup and streaming
      const result = await this.testRunner.executeTestsWithCleanup(executionOptions);
      
      // Notify completion
      this.sendMessage('testExecutionCompleted', {
        exitCode: result.exitCode,
        endTime: new Date().toISOString(),
        outputFile: result.outputFile,
        results: result.results
      });

      // Update workflow state
      this.updateWorkflowState({ 
        step: 'complete', 
        progress: 100, 
        message: `Tests completed with exit code ${result.exitCode}` 
      });

    } catch (error) {
      console.error('Failed to run tests with streaming:', error);
      
      this.sendMessage('testExecutionError', {
        error: error instanceof Error ? error.message : 'Unknown error',
        endTime: new Date().toISOString()
      });
      
      this.updateWorkflowState({ 
        step: 'error', 
        message: `Test execution failed: ${error}` 
      });
    }
  }

  private async cancelTestRun(): Promise<void> {
    try {
      const cancelled = this.testRunner.cancelCurrentExecution();
      
      if (cancelled) {
        this.sendMessage('testExecutionError', {
          error: 'Test execution cancelled by user',
          endTime: new Date().toISOString()
        });
        
        this.updateWorkflowState({ 
          step: 'idle', 
          message: 'Test execution cancelled' 
        });
        
        vscode.window.showInformationMessage('Test execution cancelled');
      } else {
        vscode.window.showWarningMessage('No test execution is currently running');
      }
    } catch (error) {
      console.error('Failed to cancel test run:', error);
      vscode.window.showErrorMessage(`Failed to cancel test run: ${error}`);
    }
  }

  private async openOutputFile(filePath: string): Promise<void> {
    try {
      if (!filePath) {
        throw new Error('Output file path is required');
      }

      await this.testRunner.openOutputFile(filePath);
      vscode.window.showInformationMessage('Output file opened successfully');
      
    } catch (error) {
      console.error('Failed to open output file:', error);
      const errorMessage = `Failed to open output file: ${error instanceof Error ? error.message : 'Unknown error'}`;
      vscode.window.showErrorMessage(errorMessage);
      this.sendMessage('workflowError', { error: errorMessage });
    }
  }

  private async deleteOutputFile(filePath: string): Promise<void> {
    try {
      if (!filePath) {
        throw new Error('Output file path is required');
      }

      // Ask for confirmation
      const confirmation = await vscode.window.showWarningMessage(
        'Are you sure you want to delete this test output file?',
        { modal: true },
        'Delete',
        'Cancel'
      );

      if (confirmation === 'Delete') {
        await this.testRunner.deleteOutputFile(filePath);
        
        // Notify webview that file was deleted
        this.sendMessage('testOutputFileDeleted', { filePath });
        
        vscode.window.showInformationMessage('Test output file deleted successfully');
      }
      
    } catch (error) {
      console.error('Failed to delete output file:', error);
      const errorMessage = `Failed to delete output file: ${error instanceof Error ? error.message : 'Unknown error'}`;
      vscode.window.showErrorMessage(errorMessage);
      this.sendMessage('workflowError', { error: errorMessage });
    }
  }

  private async cleanupAllDiffFiles(): Promise<void> {
    try {
      // Ask for confirmation
      const confirmation = await vscode.window.showWarningMessage(
        'Are you sure you want to delete all git diff files?',
        { modal: true },
        'Delete All',
        'Cancel'
      );

      if (confirmation === 'Delete All') {
        const result = await this.gitIntegration.cleanupAllDiffFiles();
        
        // Notify webview about the cleanup
        this.sendMessage('allDiffFilesDeleted', result);
        
        // Show success notification
        if (result.deleted > 0) {
          vscode.window.showInformationMessage(
            `Successfully deleted ${result.deleted} diff file${result.deleted === 1 ? '' : 's'}`
          );
        } else {
          vscode.window.showInformationMessage('No diff files found to delete');
        }
        
        // Show errors if any
        if (result.errors.length > 0) {
          vscode.window.showWarningMessage(
            `Cleanup completed with ${result.errors.length} error${result.errors.length === 1 ? '' : 's'}`
          );
        }
      }
      
    } catch (error) {
      console.error('Failed to cleanup all diff files:', error);
      const errorMessage = `Failed to cleanup diff files: ${error instanceof Error ? error.message : 'Unknown error'}`;
      vscode.window.showErrorMessage(errorMessage);
      this.sendMessage('workflowError', { error: errorMessage });
    }
  }

  private async cleanupAllTestOutputFiles(): Promise<void> {
    try {
      // Ask for confirmation
      const confirmation = await vscode.window.showWarningMessage(
        'Are you sure you want to delete all test output files?',
        { modal: true },
        'Delete All',
        'Cancel'
      );

      if (confirmation === 'Delete All') {
        const result = await this.testRunner.cleanupAllTestOutputFiles();
        
        // Notify webview about the cleanup
        this.sendMessage('allTestOutputFilesDeleted', result);
        
        // Show success notification
        if (result.deleted > 0) {
          vscode.window.showInformationMessage(
            `Successfully deleted ${result.deleted} test output file${result.deleted === 1 ? '' : 's'}`
          );
        } else {
          vscode.window.showInformationMessage('No test output files found to delete');
        }
        
        // Show errors if any
        if (result.errors.length > 0) {
          vscode.window.showWarningMessage(
            `Cleanup completed with ${result.errors.length} error${result.errors.length === 1 ? '' : 's'}`
          );
        }
      }
      
    } catch (error) {
      console.error('Failed to cleanup all test output files:', error);
      const errorMessage = `Failed to cleanup test output files: ${error instanceof Error ? error.message : 'Unknown error'}`;
      vscode.window.showErrorMessage(errorMessage);
      this.sendMessage('workflowError', { error: errorMessage });
    }
  }

  private saveState(): void {
    if (this.view) {
      this.view.webview.postMessage({ 
        command: 'saveState', 
        data: { workflowState: this.workflowState } 
      });
    }
  }
}
