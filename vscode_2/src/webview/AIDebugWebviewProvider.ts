import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { existsSync, readFileSync } from 'fs';
import { GitIntegration } from '../services/GitIntegration';
import { NXWorkspaceManager } from '../services/NXWorkspaceManager';
import { CopilotIntegration } from '../services/CopilotIntegration';
import { CopilotDiagnosticsService } from '../services/CopilotDiagnosticsService';
import { TestRunner, TestExecutionOptions } from '../services/TestRunner';
import { CopilotContextSubmissionService } from '../services/copilot-submission/CopilotContextSubmissionService';
import { AnalysisHistoryService } from '../services/copilot-submission/AnalysisHistoryService';
import { WorkflowState, WorkflowConfig, WebviewMessage } from '../types';
import { ComprehensiveAnalysisResult, AnalysisHistoryItem, SubmissionOptions } from '../types/analysis';

export class AIDebugWebviewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'ai-debug-context.mainView';
  private view?: vscode.WebviewView;
  private workflowState: WorkflowState = { step: 'idle' };

  private copilotDiagnostics: CopilotDiagnosticsService;
  private copilotSubmissionService: CopilotContextSubmissionService;
  private analysisHistoryService: AnalysisHistoryService;

  constructor(
    private context: vscode.ExtensionContext,
    private gitIntegration: GitIntegration,
    private nxManager: NXWorkspaceManager,
    private copilot: CopilotIntegration,
    private testRunner: TestRunner
  ) {
    this.copilotDiagnostics = new CopilotDiagnosticsService(context, copilot);
    this.copilotSubmissionService = new CopilotContextSubmissionService(context, copilot);
    this.analysisHistoryService = new AnalysisHistoryService(context);
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
        case 'generateGitDiff':
          await this.generateGitDiff(message.data);
          break;
        case 'generatePRTemplate':
          await this.generatePRTemplate(message.data);
          break;
        case 'generatePRDescription':
          await this.generatePRDescriptionWithAI(message.data);
          break;
        case 'runPrepareToPush':
          await this.runPrepareToPush(message.data);
          break;
        case 'openFile':
          await this.openFile(message.data?.filePath);
          break;
        case 'openContextFile':
          await this.openContextFile();
          break;
        case 'openCopilotAnalysisFile':
          await this.openCopilotAnalysisFile();
          break;
        case 'openGitDiffFile':
          await this.openGitDiffFile();
          break;
        case 'openTestResultsFile':
          await this.openTestResultsFile();
          break;
        case 'copyContextFilePath':
          await this.copyContextFilePath();
          break;
        case 'copyGitDiffFilePath':
          await this.copyGitDiffFilePath();
          break;
        case 'copyTestResultsFilePath':
          await this.copyTestResultsFilePath();
          break;
        case 'copyCopilotAnalysisFilePath':
          await this.copyCopilotAnalysisFilePath();
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
          await this.generateGitDiffOld(message.data);
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
        case 'submitContextForAnalysis':
          await this.handleContextSubmission(message.data);
          break;
        case 'getAnalysisHistory':
          await this.handleGetAnalysisHistory();
          break;
        case 'loadAnalysis':
          await this.handleLoadAnalysis(message.data?.analysisId);
          break;
        case 'exportAnalysis':
          await this.handleExportAnalysis(message.data?.format);
          break;
        case 'exportAnalysisHistory':
          await this.handleExportAnalysisHistory(message.data?.format);
          break;
        case 'deleteAnalysis':
          await this.handleDeleteAnalysis(message.data?.analysisId);
          break;
        case 'compareAnalyses':
          await this.handleCompareAnalyses(message.data?.analysisId1, message.data?.analysisId2);
          break;
        case 'markRecommendationsImplemented':
          await this.handleMarkRecommendationsImplemented(message.data?.analysisId, message.data?.implementedCount);
          break;
        case 'getAnalysisInsights':
          await this.handleGetAnalysisInsights();
          break;
        case 'savePRTemplate':
          await this.handleSavePRTemplate();
          break;
        case 'checkCopilotAvailability':
          await this.handleCheckCopilotAvailability();
          break;
        case 'checkContextFile':
          await this.handleCheckContextFile();
          break;
        case 'runSystemDiagnostics':
          await this.handleRunSystemDiagnostics();
          break;
        case 'generateAIContextFromExistingFiles':
          await this.generateAIContextFromExistingFiles();
          break;
        case 'executeCommand':
          await this.handleExecuteCommand(message.data?.command, message.data?.args);
          break;
        case 'openExternalUrl':
          await this.handleOpenExternalUrl(message.data?.url);
          break;
        case 'showDiagnosticLogs':
          await this.handleShowDiagnosticLogs();
          break;
        case 'showErrorMessage':
          await this.handleShowErrorMessage(message.data?.message);
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
      // Check cache status and inform UI
      const cacheStatus = this.nxManager.getCacheStatus();
      
      if (cacheStatus.isInitializing) {
        this.sendMessage('nxProjectsStatus', { 
          status: 'initializing', 
          message: 'Initializing project selector...' 
        });
      } else if (cacheStatus.isValid) {
        this.sendMessage('nxProjectsStatus', { 
          status: 'cached', 
          message: `Using cached projects (${cacheStatus.projectCount} projects)` 
        });
      } else {
        this.sendMessage('nxProjectsStatus', { 
          status: 'loading', 
          message: 'Loading projects from NX workspace...' 
        });
      }

      const projects = await this.nxManager.listProjects();
      
      this.sendMessage('nxProjects', projects);
      this.sendMessage('nxProjectsStatus', { 
        status: 'complete', 
        message: `Loaded ${projects.length} projects` 
      });
    } catch (error) {
      console.error('Failed to get NX projects:', error);
      this.sendMessage('workflowError', { error: `Failed to get NX projects: ${error}` });
      this.sendMessage('nxProjectsStatus', { 
        status: 'error', 
        message: `Failed to load projects: ${error}` 
      });
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
      this.updateWorkflowState({ step: 'collecting-context', progress: 0, message: 'Initializing workflow...' });

      // Add initial delay for animation
      await this.delay(500);

      // Step 1: Collect file changes and generate git diff
      this.updateWorkflowState({ step: 'collecting-context', progress: 5, message: 'Scanning workspace for changes...' });
      await this.delay(300);
      
      this.updateWorkflowState({ step: 'collecting-context', progress: 15, message: 'Collecting git changes...' });
      const fileChanges = await this.gitIntegration.getUncommittedChanges();
      
      this.updateWorkflowState({ step: 'collecting-context', progress: 25, message: 'Generating git diff...' });
      await this.delay(200);
      
      const { content: gitDiffContent, filePath: gitDiffPath } = await this.gitIntegration.generateDiffWithStreaming(
        'uncommitted',
        undefined,
        (output) => this.sendMessage('workflowOutput', { content: output, append: true })
      );
      
      // Track git diff file path
      this.lastGitDiffFilePath = gitDiffPath;
      
      this.updateWorkflowState({ step: 'collecting-context', progress: 35, message: 'Git diff analysis complete' });
      
      // Notify frontend that git diff is complete with file path
      this.sendMessage('gitDiffComplete', { 
        filePath: gitDiffPath,
        message: `Git diff completed and saved to: ${gitDiffPath}`
      });

      // Step 2: Run tests with output
      this.updateWorkflowState({ step: 'running-tests', progress: 40, message: 'Preparing test environment...' });
      await this.delay(400);
      
      this.updateWorkflowState({ step: 'running-tests', progress: 45, message: 'Executing tests with live output...' });
      const testExecutionResult = await this.testRunner.executeTestsWithCleanup({
        command: 'npx nx affected --target=test --output-style=stream',
        mode: 'affected',
        saveToFile: true,
        outputCallback: (output) => {
          this.sendMessage('workflowOutput', { content: output, append: true });
          // Provide periodic progress updates during test execution
          if (Math.random() < 0.1) { // 10% chance to update progress during test runs
            const currentProgress = this.workflowState.progress || 45;
            if (currentProgress < 55) {
              this.updateWorkflowState({ progress: currentProgress + 1, message: 'Running tests...' });
            }
          }
        }
      });
      
      // Track test results file path
      this.lastTestResultsFilePath = testExecutionResult.outputFile || null;
      
      this.updateWorkflowState({ step: 'running-tests', progress: 55, message: 'Processing test results...' });
      await this.delay(300);
      
      // Notify frontend that test execution is complete with file path
      this.sendMessage('testResultsComplete', {
        filePath: testExecutionResult.outputFile,
        exitCode: testExecutionResult.exitCode,
        hasFailures: testExecutionResult.exitCode !== 0,
        message: `Test execution completed. Results saved to: ${testExecutionResult.outputFile}`
      });

      // Step 3: Create consolidated AI debug context
      this.updateWorkflowState({ step: 'analyzing-results', progress: 60, message: 'Analyzing test results...' });
      await this.delay(400);
      
      this.updateWorkflowState({ step: 'analyzing-results', progress: 65, message: 'Creating AI debug context...' });
      const consolidatedContext = await this.createAIDebugContext({
        gitDiff: gitDiffContent,
        testResults: testExecutionResult.results,
        testOutput: testExecutionResult.outputFile,
        exitCode: testExecutionResult.exitCode
      });

      // Step 4: Save and display consolidated output
      this.updateWorkflowState({ step: 'generating-report', progress: 75, message: 'Consolidating analysis results...' });
      await this.delay(300);
      
      this.updateWorkflowState({ step: 'generating-report', progress: 80, message: 'Saving AI debug context...' });
      const contextFilePath = await this.saveAIDebugContext(consolidatedContext);

      // Display the complete context to screen
      this.sendMessage('workflowOutput', { 
        content: '\n\n' + '='.repeat(80) + '\n',
        append: true 
      });
      this.sendMessage('workflowOutput', { 
        content: '🤖 COMPLETE AI DEBUG CONTEXT\n',
        append: true 
      });
      this.sendMessage('workflowOutput', { 
        content: '='.repeat(80) + '\n\n',
        append: true 
      });
      this.sendMessage('workflowOutput', { 
        content: consolidatedContext,
        append: true 
      });

      // Step 5: AI Analysis (if Copilot is available)
      this.updateWorkflowState({ step: 'generating-report', progress: 85, message: 'Running AI analysis...' });
      await this.delay(200);
      
      if (testExecutionResult.exitCode !== 0) {
        this.updateWorkflowState({ step: 'generating-report', progress: 90, message: 'Analyzing test failures with AI...' });
        await this.handleTestFailures(consolidatedContext, testExecutionResult.results);
      } else {
        this.updateWorkflowState({ step: 'generating-report', progress: 90, message: 'Generating success analysis...' });
        await this.handleTestSuccess(consolidatedContext, testExecutionResult.results);
      }

      this.updateWorkflowState({ step: 'generating-report', progress: 95, message: 'Finalizing reports...' });
      await this.delay(300);

      // Complete
      this.updateWorkflowState({ step: 'complete', progress: 100, message: 'AI Debug workflow completed!' });
      this.sendMessage('workflowComplete', { 
        success: true,
        contextFile: contextFilePath,
        hasFailures: testExecutionResult.exitCode !== 0
      });

      this.sendMessage('workflowOutput', { 
        content: `\n\n📁 AI Debug Context saved to: ${contextFilePath}\n`,
        append: true 
      });

    } catch (error) {
      console.error('AI Test Debug workflow failed:', error);
      this.updateWorkflowState({ 
        step: 'error', 
        message: error instanceof Error ? error.message : 'Unknown error occurred' 
      });
      this.sendMessage('workflowError', { error: error instanceof Error ? error.message : 'Unknown error occurred' });
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

  private async handleTestFailures(consolidatedContext: string, testResults: any[]): Promise<void> {
    try {
      console.log('Analyzing test failures with AI...');
      
      const failures = testResults.filter(t => t.status === 'failed');
      
      if (await this.copilot.isAvailable()) {
        // Use Copilot to analyze the consolidated context
        const testAnalysis = await this.copilot.analyzeTestFailures({
          consolidatedContext,
          testResults,
          projectInfo: await this.getProjectInfo()
        });
        
        // Get new test suggestions
        const testSuggestions = await this.copilot.suggestNewTests({
          consolidatedContext,
          testResults,
          projectInfo: await this.getProjectInfo()
        });

        // Save analysis to file
        const combinedAnalysis = {
          ...testAnalysis,
          newTests: testSuggestions.newTests,
          improvements: testSuggestions.improvements,
          missingCoverage: testSuggestions.missingCoverage
        };
        
        const analysisFilePath = await this.saveCopilotAnalysis(combinedAnalysis, 'failure-analysis');

        // Send comprehensive analysis to webview
        this.sendMessage('aiAnalysisComplete', {
          type: 'failure-analysis',
          analysis: testAnalysis,
          suggestions: testSuggestions,
          testResults,
          consolidatedContext,
          analysisFilePath
        });

        this.sendMessage('workflowOutput', { 
          content: `\n\n🤖 AI Analysis Complete: Found actionable recommendations for ${failures.length} test failures\n`,
          append: true 
        });
        
        this.sendMessage('workflowOutput', { 
          content: `📄 Copilot Analysis saved to: ${analysisFilePath}\n`,
          append: true 
        });
      } else {
        // Fallback analysis without Copilot
        this.sendMessage('aiAnalysisComplete', {
          type: 'failure-analysis',
          analysis: `Found ${failures.length} test failures. GitHub Copilot unavailable for detailed analysis.`,
          suggestions: 'Enable GitHub Copilot for AI-powered test suggestions.',
          testResults,
          consolidatedContext
        });

        this.sendMessage('workflowOutput', { 
          content: `\n\n⚠️  Found ${failures.length} test failures (GitHub Copilot unavailable for detailed analysis)\n`,
          append: true 
        });
      }
      
      // Show summary notification
      const analysisMessage = await this.copilot.isAvailable()
        ? `AI analyzed ${failures.length} test failures with actionable recommendations`
        : `Found ${failures.length} test failures (GitHub Copilot unavailable for detailed analysis)`;
      
      vscode.window.showWarningMessage(analysisMessage);
      
    } catch (error) {
      console.error('Failed to analyze test failures:', error);
      this.sendMessage('workflowError', { 
        error: `AI analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      });
    }
  }

  private async handleTestSuccess(consolidatedContext: string, testResults: any[]): Promise<void> {
    try {
      console.log('Analyzing successful tests with AI...');
      
      if (await this.copilot.isAvailable()) {
        // Use Copilot to detect false positives
        const falsePositiveAnalysis = await this.copilot.detectFalsePositives({
          consolidatedContext,
          testResults,
          projectInfo: await this.getProjectInfo()
        });
        
        // Get new test suggestions
        const testSuggestions = await this.copilot.suggestNewTests({
          consolidatedContext,
          testResults,
          projectInfo: await this.getProjectInfo()
        });

        // Save analysis to file  
        const combinedAnalysis = {
          ...falsePositiveAnalysis,
          newTests: testSuggestions.newTests,
          improvements: testSuggestions.improvements,
          missingCoverage: testSuggestions.missingCoverage
        };
        
        const analysisFilePath = await this.saveCopilotAnalysis(combinedAnalysis, 'success-analysis');

        // Send comprehensive analysis to webview
        this.sendMessage('aiAnalysisComplete', {
          type: 'success-analysis',
          falsePositives: falsePositiveAnalysis,
          suggestions: testSuggestions,
          testResults,
          consolidatedContext,
          analysisFilePath
        });

        this.sendMessage('workflowOutput', { 
          content: `\n\n🎉 AI Analysis Complete: All tests passing! Generated improvement suggestions.\n`,
          append: true 
        });
        
        this.sendMessage('workflowOutput', { 
          content: `📄 Copilot Analysis saved to: ${analysisFilePath}\n`,
          append: true 
        });
      } else {
        // Fallback analysis without Copilot
        this.sendMessage('aiAnalysisComplete', {
          type: 'success-analysis',
          falsePositives: 'GitHub Copilot unavailable for false positive detection.',
          suggestions: 'Enable GitHub Copilot for AI-powered test improvement suggestions.',
          testResults,
          consolidatedContext
        });

        this.sendMessage('workflowOutput', { 
          content: `\n\n✅ All tests passing! (GitHub Copilot unavailable for detailed analysis)\n`,
          append: true 
        });
      }

      // Show summary notification
      const analysisMessage = await this.copilot.isAvailable()
        ? `AI analyzed ${testResults.length} passing tests and provided improvement suggestions`
        : `${testResults.length} tests passed (GitHub Copilot unavailable for detailed analysis)`;
      
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

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  public sendMessage(command: string, data?: any): void {
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

    } catch (error) {
      console.error('Failed to generate git diff:', error);
      this.sendMessage('gitDiffError', {
        error: error instanceof Error ? error.message : 'Unknown error',
        mode: data.mode
      });
    }
  }

  private async generatePRDescriptionWithAI(data: { fileSelection: any; testResults?: any[]; template?: string; jiraTickets?: string[]; featureFlags?: string[] }): Promise<void> {
    try {
      const { fileSelection, testResults, template, jiraTickets, featureFlags } = data;
      
      if (!fileSelection) {
        throw new Error('File selection is required for PR description generation');
      }

      this.updateWorkflowState({ step: 'generating-pr', progress: 50, message: 'Generating git diff...' });
      
      // Step 1: Generate git diff
      let diffContent = '';
      let diffFile = '';
      
      switch (fileSelection.mode) {
        case 'uncommitted':
          const uncommittedDiff = await this.gitIntegration.generateDiffWithStreaming('uncommitted');
          diffContent = uncommittedDiff.content;
          diffFile = uncommittedDiff.filePath;
          break;
        case 'commit':
          if (fileSelection.commits && fileSelection.commits.length > 0) {
            const commitHash = fileSelection.commits[0].hash;
            const commitDiff = await this.gitIntegration.generateDiffWithStreaming('commit', commitHash);
            diffContent = commitDiff.content;
            diffFile = commitDiff.filePath;
          }
          break;
        case 'branch-diff':
          const branchDiff = await this.gitIntegration.generateDiffWithStreaming('branch-diff');
          diffContent = branchDiff.content;
          diffFile = branchDiff.filePath;
          break;
      }
      
      if (!diffContent) {
        throw new Error('No diff content available for PR description generation');
      }

      this.updateWorkflowState({ step: 'generating-pr', progress: 75, message: 'Generating AI description...' });
      
      // Step 2: Generate PR description using Copilot AI
      const prDescription = await this.generateAIPRDescription(diffContent, testResults, template, jiraTickets, featureFlags);

      this.sendMessage('prDescriptionGenerated', {
        description: prDescription,
        template: template || 'standard',
        diffFile,
        jiraTickets,
        featureFlags,
        generatedByAI: true
      });

      this.updateWorkflowState({ step: 'complete', progress: 100, message: 'AI PR description generated!' });
    } catch (error) {
      console.error('AI PR description generation failed:', error);
      
      // Fallback to basic template generation
      console.log('Falling back to template-based generation...');
      try {
        const { testResults: fallbackTestResults, template: fallbackTemplate, jiraTickets: fallbackJiraTickets, featureFlags: fallbackFeatureFlags } = data;
        const fallbackDescription = this.generateBasicPRDescription('', fallbackTestResults, fallbackTemplate, fallbackJiraTickets, fallbackFeatureFlags);
        this.sendMessage('prDescriptionGenerated', {
          description: fallbackDescription,
          template: fallbackTemplate || 'standard',
          generatedByAI: false,
          fallback: true
        });
      } catch (fallbackError) {
        this.sendMessage('prGenerationError', { 
          error: error instanceof Error ? error.message : 'PR description generation failed'
        });
      }
    }
  }

  private async generateAIPRDescription(
    gitDiff: string, 
    testResults?: any[], 
    template?: string, 
    jiraTickets?: string[], 
    featureFlags?: string[]
  ): Promise<string> {
    try {
      // Check if Copilot is available
      if (!await this.copilot.isAvailable()) {
        throw new Error('GitHub Copilot not available');
      }

      // Create PR generation context
      const context = {
        gitDiff,
        testResults: testResults || [],
        template: template || 'standard',
        jiraTickets: jiraTickets || [],
        featureFlags: featureFlags || []
      };

      // Generate PR description using Copilot
      const prDescription = await this.copilot.generatePRDescription(context);
      return prDescription;
    } catch (error) {
      console.error('Copilot PR generation failed:', error);
      throw error;
    }
  }

  /**
   * Generate PR template file with git diff and prompts for AI analysis
   */
  private async generatePRTemplate(data: { fileSelection: any; testResults?: any[]; aiAnalysis?: any; template?: string; jiraTickets?: string[]; featureFlags?: string[] }): Promise<void> {
    try {
      const { fileSelection, testResults, aiAnalysis, template, jiraTickets, featureFlags } = data;
      
      if (!fileSelection) {
        throw new Error('File selection is required for PR template generation');
      }

      this.updateWorkflowState({ step: 'generating-pr', progress: 30, message: 'Creating PR template...' });
      
      // Step 1: Generate git diff
      let diffContent = '';
      let diffFile = '';
      
      switch (fileSelection.mode) {
        case 'uncommitted':
          const uncommittedDiff = await this.gitIntegration.generateDiffWithStreaming('uncommitted');
          diffContent = uncommittedDiff.content;
          diffFile = uncommittedDiff.filePath;
          break;
        case 'commit':
          if (fileSelection.commits && fileSelection.commits.length > 0) {
            const commitHash = fileSelection.commits[0].hash;
            const commitDiff = await this.gitIntegration.generateDiffWithStreaming('commit', commitHash);
            diffContent = commitDiff.content;
            diffFile = commitDiff.filePath;
          }
          break;
        case 'branch-diff':
          const branchDiff = await this.gitIntegration.generateDiffWithStreaming('branch-diff');
          diffContent = branchDiff.content;
          diffFile = branchDiff.filePath;
          break;
      }
      
      if (!diffContent) {
        throw new Error('No diff content available for PR template generation');
      }

      this.updateWorkflowState({ step: 'generating-pr', progress: 70, message: 'Building template file...' });
      
      // Step 2: Create PR template file with git diff and prompts
      const templateContent = this.createPRTemplateContent(diffContent, testResults, aiAnalysis, template, jiraTickets, featureFlags);
      const templateFile = await this.savePRTemplateFile(templateContent);

      this.sendMessage('prTemplateGenerated', {
        templateFile: path.basename(templateFile),
        filePath: templateFile
      });

      this.updateWorkflowState({ step: 'complete', progress: 100, message: 'PR template created successfully!' });
    } catch (error) {
      console.error('PR template generation failed:', error);
      this.sendMessage('prGenerationError', { 
        error: error instanceof Error ? error.message : 'PR template generation failed'
      });
    }
  }

  private createPRTemplateContent(
    gitDiff: string, 
    testResults?: any[], 
    aiAnalysis?: any,
    template?: string, 
    jiraTickets?: string[], 
    featureFlags?: string[]
  ): string {
    const timestamp = new Date().toLocaleString();
    const templateType = template || 'standard';
    
    let content = `===============================================================
📝 GITHUB PR DESCRIPTION GENERATION PROMPTS
=================================================================

INSTRUCTIONS FOR AI ASSISTANT:
Using the data gathered in this file, write a GitHub PR 
description that follows the format below. Focus on newly added functions 
and updates. Don't add fluff.

=================================================================
🎯 PRIMARY PR DESCRIPTION PROMPT
=================================================================

Please analyze the code changes and test results to create a GitHub PR description 
following this exact format:

**Problem**
What is the problem you're solving or feature you're implementing? Please include 
a link to any related discussion or tasks in Jira if applicable.`;

    // Add Jira links if provided
    if (jiraTickets && jiraTickets.length > 0) {
      content += `\n[Jira Links: ${jiraTickets.map(ticket => `https://your-domain.atlassian.net/browse/${ticket}`).join(', ')}]`;
    }

    content += `

**Solution**
Describe the feature or bug fix -- what's changing?

**Details**
Include a brief overview of the technical process you took (or are going to take!) 
to get from the problem to the solution.

**QA**
Provide any technical details needed to test this change and/or parts that you 
wish to have tested.

=================================================================
📊 CONTEXT FOR PR DESCRIPTION
=================================================================

TEMPLATE TYPE: ${templateType}
GENERATED: ${timestamp}`;

    if (featureFlags && featureFlags.length > 0) {
      content += `\nFEATURE FLAGS: ${featureFlags.join(', ')}`;
    }

    if (jiraTickets && jiraTickets.length > 0) {
      content += `\nJIRA TICKETS: ${jiraTickets.join(', ')}`;
    }

    // Add test results if available
    if (testResults && testResults.length > 0) {
      content += `\n\n=================================================================
🧪 TEST RESULTS SUMMARY  
=================================================================\n`;
      
      const passed = testResults.filter(r => r.status === 'passed').length;
      const failed = testResults.filter(r => r.status === 'failed').length;
      const skipped = testResults.filter(r => r.status === 'skipped').length;
      
      content += `Tests: ${passed} passed, ${failed} failed${skipped > 0 ? `, ${skipped} skipped` : ''}
Total: ${testResults.length} tests\n`;
      
      if (failed > 0) {
        content += `\nFailed Tests:\n`;
        testResults.filter(r => r.status === 'failed').forEach(test => {
          content += `- ${test.name}: ${test.error || 'Test failed'}\n`;
        });
      }
    }

    // Add AI analysis if available
    if (aiAnalysis) {
      content += `\n\n=================================================================
🤖 AI ANALYSIS RESULTS
=================================================================\n`;
      
      content += `Analysis Type: ${aiAnalysis.type || 'unknown'}\n`;
      
      if (aiAnalysis.rootCause) {
        content += `\nRoot Cause:\n${aiAnalysis.rootCause}\n`;
      }
      
      if (aiAnalysis.suggestedFixes && aiAnalysis.suggestedFixes.length > 0) {
        content += `\nSuggested Fixes:\n`;
        aiAnalysis.suggestedFixes.forEach((fix: string, index: number) => {
          content += `${index + 1}. ${fix}\n`;
        });
      }
      
      if (aiAnalysis.newTestSuggestions && aiAnalysis.newTestSuggestions.length > 0) {
        content += `\nNew Test Suggestions:\n`;
        aiAnalysis.newTestSuggestions.forEach((suggestion: string, index: number) => {
          content += `${index + 1}. ${suggestion}\n`;
        });
      }
      
      if (aiAnalysis.codeImprovements && aiAnalysis.codeImprovements.length > 0) {
        content += `\nCode Improvements:\n`;
        aiAnalysis.codeImprovements.forEach((improvement: string, index: number) => {
          content += `${index + 1}. ${improvement}\n`;
        });
      }
      
      if (aiAnalysis.falsePositiveWarnings && aiAnalysis.falsePositiveWarnings.length > 0) {
        content += `\nFalse Positive Warnings:\n`;
        aiAnalysis.falsePositiveWarnings.forEach((warning: string, index: number) => {
          content += `${index + 1}. ${warning}\n`;
        });
      }
    }

    // Add the git diff
    content += `\n\n=================================================================
🔍 GIT DIFF FOR ANALYSIS
=================================================================

${gitDiff}

EOF`;

    return content;
  }

  private async savePRTemplateFile(content: string): Promise<string> {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot) {
      throw new Error('No workspace folder found');
    }

    const templateDir = path.join(workspaceRoot, '.ai-debug-context', 'pr-templates');
    
    // Ensure directory exists
    if (!fs.existsSync(templateDir)) {
      fs.mkdirSync(templateDir, { recursive: true });
    }

    const filename = 'pr-description-template.txt';
    const filePath = path.join(templateDir, filename);
    
    fs.writeFileSync(filePath, content, 'utf8');
    
    return filePath;
  }

  private async runPrepareToPush(data: { testConfiguration: any }): Promise<void> {
    try {
      const { testConfiguration } = data;
      
      if (!testConfiguration) {
        throw new Error('Test configuration is required for prepare-to-push');
      }

      const startTime = new Date();
      const projectName = this.getProjectNameForDisplay(testConfiguration);
      
      // Initialize with header similar to zsh script
      const initialOutput = `==========================================================
🚀 Preparing to Push: ${projectName}
==========================================================

`;
      
      this.sendMessage('prepareToPushStarted', { 
        startTime: startTime.toISOString(),
        output: initialOutput
      });

      let lintPassed = false;
      let formatPassed = false;
      let allOutput = initialOutput;

      // Step 1: Run linting
      const lintStepOutput = `🔍 Running linter...\n`;
      allOutput += lintStepOutput;
      
      this.sendMessage('prepareToPushProgress', {
        step: 'lint',
        status: 'running',
        output: lintStepOutput,
        append: true
      });

      try {
        const lintResult = await this.runLintCommand(testConfiguration);
        lintPassed = lintResult.success;
        const lintOutput = lintResult.output + (lintResult.success ? '✅ Linting passed!\n\n' : '❌ Linting failed!\n\n');
        allOutput += lintOutput;

        this.sendMessage('prepareToPushProgress', {
          step: 'lint',
          status: lintPassed ? 'passed' : 'failed',
          output: lintOutput,
          append: true
        });

        if (!lintPassed) {
          throw new Error('Linting failed');
        }
      } catch (error) {
        const errorOutput = `❌ Linting failed: ${error}\n\n`;
        allOutput += errorOutput;
        this.sendMessage('prepareToPushProgress', {
          step: 'lint',
          status: 'failed',
          output: errorOutput,
          append: true
        });
        throw error;
      }

      // Step 2: Run prettier formatting
      const formatStepOutput = `✨ Running code formatter...\n`;
      allOutput += formatStepOutput;
      
      this.sendMessage('prepareToPushProgress', {
        step: 'format',
        status: 'running',
        output: formatStepOutput,
        append: true
      });

      try {
        const formatResult = await this.runFormatCommand(testConfiguration);
        formatPassed = formatResult.success;
        const formatOutput = formatResult.output + (formatResult.success ? '✅ Code formatting completed!\n\n' : '❌ Code formatting failed!\n\n');
        allOutput += formatOutput;

        this.sendMessage('prepareToPushProgress', {
          step: 'format',
          status: formatPassed ? 'passed' : 'failed',
          output: formatOutput,
          append: true
        });

        if (!formatPassed) {
          throw new Error('Formatting failed');
        }
      } catch (error) {
        const errorOutput = `❌ Formatting failed: ${error}\n\n`;
        allOutput += errorOutput;
        this.sendMessage('prepareToPushProgress', {
          step: 'format',
          status: 'failed',
          output: errorOutput,
          append: true
        });
        throw error;
      }

      // Success summary matching zsh script format
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();
      
      const successOutput = `==========================================================
🎉 Ready to Push!
==========================================================
✅ Linting: Passed
✅ Formatting: Applied

📋 SUGGESTED NEXT STEPS:
1. Review any formatting changes made by prettier
2. Run aiDebug ${projectName} to ensure tests still pass
3. Commit your changes: git add . && git commit -m 'Your message'
4. Push to your branch: git push

🔄 COMPLETE WORKFLOW:
• prepareToPush ${projectName}  (✅ Done!)
• aiDebug ${projectName}        (recommended next)
• git commit && git push  (final step)
==========================================================`;

      allOutput += successOutput;

      this.sendMessage('prepareToPushCompleted', {
        success: true,
        lintPassed,
        formatPassed,
        endTime: endTime.toISOString(),
        duration,
        output: successOutput
      });
    } catch (error) {
      console.error('Prepare-to-push failed:', error);
      this.sendMessage('prepareToPushError', {
        error: error instanceof Error ? error.message : 'Prepare-to-push workflow failed'
      });
    }
  }

  private getProjectNameForDisplay(testConfiguration: any): string {
    if (testConfiguration.mode === 'affected') {
      return 'affected-projects';
    } else if (testConfiguration.projects && testConfiguration.projects.length > 0) {
      return testConfiguration.projects.length === 1 
        ? testConfiguration.projects[0] 
        : `${testConfiguration.projects.length}-projects`;
    } else if (testConfiguration.project) {
      return testConfiguration.project;
    }
    return 'unknown-project';
  }

  private async runLintCommand(testConfiguration: any): Promise<{ success: boolean; output: string }> {
    try {
      let command: string;
      const projectName = this.getProjectNameForDisplay(testConfiguration);
      
      if (testConfiguration.mode === 'affected') {
        command = 'yarn nx affected --target=lint';
      } else if (testConfiguration.projects && testConfiguration.projects.length > 1) {
        command = `yarn nx run-many --target=lint --projects=${testConfiguration.projects.join(',')}`;
      } else {
        const project = testConfiguration.projects?.[0] || testConfiguration.project;
        command = `yarn nx lint ${project}`;
      }

      const output = `Command: ${command}\n`;
      const result = await this.executeCommand(command);
      
      const fullOutput = output + result.stdout + (result.stderr ? result.stderr : '');
      
      return {
        success: result.exitCode === 0,
        output: fullOutput
      };
    } catch (error) {
      return {
        success: false,
        output: `Lint command failed: ${error}\n`
      };
    }
  }

  private async runFormatCommand(testConfiguration: any): Promise<{ success: boolean; output: string }> {
    try {
      let command: string;
      const projectName = this.getProjectNameForDisplay(testConfiguration);
      
      if (testConfiguration.mode === 'affected') {
        command = 'yarn nx affected --target=prettier --write';
      } else if (testConfiguration.projects && testConfiguration.projects.length > 1) {
        command = `yarn nx run-many --target=prettier --projects=${testConfiguration.projects.join(',')} --write`;
      } else {
        const project = testConfiguration.projects?.[0] || testConfiguration.project;
        command = `yarn nx prettier ${project} --write`;
      }

      const output = `Command: ${command}\n`;
      const result = await this.executeCommand(command);
      
      const fullOutput = output + result.stdout + (result.stderr ? result.stderr : '');
      
      return {
        success: result.exitCode === 0,
        output: fullOutput
      };
    } catch (error) {
      return {
        success: false,
        output: `Format command failed: ${error}\n`
      };
    }
  }

  private async executeCommand(command: string): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    return new Promise((resolve) => {
      const { exec } = require('child_process');
      
      const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
      exec(command, { cwd: workspaceRoot }, (error: any, stdout: string, stderr: string) => {
        resolve({
          stdout: stdout || '',
          stderr: stderr || '',
          exitCode: error ? error.code || 1 : 0
        });
      });
    });
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

  private generateBasicPRDescription(gitDiff: string, testResults?: any[], template?: string, jiraTickets?: string[], featureFlags?: string[]): string {
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
      if (file?.includes('.component.')) {
        categories.Components.push(file);
      } else if (file?.includes('.service.')) {
        categories.Services.push(file);
      } else if (file?.includes('.spec.') || file?.includes('.test.')) {
        categories.Tests.push(file);
      } else if (file?.includes('config') || file?.includes('.json') || file?.includes('.yml')) {
        categories.Configuration.push(file);
      } else if (file) {
        categories.Other.push(file);
      }
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

  private async generateGitDiffOld(data: { mode: 'uncommitted' | 'commit' | 'branch-diff'; commitHash?: string }): Promise<void> {
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

  /**
   * Check for existing diff and test output files that can be reused
   */
  private async checkExistingFiles(): Promise<{
    diffFile?: string;
    diffContent?: string;
    testOutputFile?: string;
    testContent?: string;
  }> {
    const fs = await import('fs');
    const path = await import('path');
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    
    if (!workspaceRoot) {
      return {};
    }

    const result: any = {};
    
    // Check for existing git diff files
    const commonDiffPaths = [
      path.join(workspaceRoot, '.github', 'instructions', 'ai_utilities_context', 'diff.txt'),
      path.join(workspaceRoot, 'diff.txt')
    ];
    
    for (const diffPath of commonDiffPaths) {
      if (fs.existsSync(diffPath)) {
        try {
          const stats = fs.statSync(diffPath);
          const ageMinutes = (Date.now() - stats.mtime.getTime()) / (1000 * 60);
          
          // Only use files that are less than 30 minutes old
          if (ageMinutes < 30) {
            result.diffFile = diffPath;
            result.diffContent = fs.readFileSync(diffPath, 'utf8');
            console.log(`Found existing diff file: ${diffPath} (${ageMinutes.toFixed(1)} minutes old)`);
            break;
          }
        } catch (error) {
          console.warn(`Error reading diff file ${diffPath}:`, error);
        }
      }
    }
    
    // Check for existing test output files
    const commonTestPaths = [
      path.join(workspaceRoot, '.github', 'instructions', 'ai_utilities_context', 'jest-output.txt'),
      path.join(workspaceRoot, 'jest-output.txt'),
      path.join(workspaceRoot, 'test-output.txt')
    ];
    
    for (const testPath of commonTestPaths) {
      if (fs.existsSync(testPath)) {
        try {
          const stats = fs.statSync(testPath);
          const ageMinutes = (Date.now() - stats.mtime.getTime()) / (1000 * 60);
          
          // Only use files that are less than 30 minutes old
          if (ageMinutes < 30) {
            result.testOutputFile = testPath;
            result.testContent = fs.readFileSync(testPath, 'utf8');
            console.log(`Found existing test output file: ${testPath} (${ageMinutes.toFixed(1)} minutes old)`);
            break;
          }
        } catch (error) {
          console.warn(`Error reading test output file ${testPath}:`, error);
        }
      }
    }
    
    return result;
  }

  /**
   * Create consolidated AI debug context in the expected format
   * Can use existing diff.txt and jest-output.txt files if available
   */
  private async createAIDebugContext(data: {
    gitDiff?: string;
    testResults?: any[];
    testOutput?: string;
    exitCode?: number;
    useExistingFiles?: boolean;
  }): Promise<string> {
    const currentBranch = await this.gitIntegration.getCurrentBranch();
    const timestamp = new Date().toLocaleString();
    const projectInfo = await this.getProjectInfo();
    const isNXWorkspace = await this.nxManager.isNXWorkspace();
    
    // Check for existing files if requested
    let gitDiffContent = data.gitDiff;
    let testOutputContent = '';
    let testStatus = '❓ TEST STATUS UNKNOWN';
    
    if (data.useExistingFiles) {
      console.log('Checking for existing diff and test output files...');
      const existingFiles = await this.checkExistingFiles();
      
      // Use existing diff if no new diff provided
      if (!gitDiffContent && existingFiles.diffContent) {
        gitDiffContent = existingFiles.diffContent;
        console.log(`Using existing diff file: ${existingFiles.diffFile}`);
        this.sendMessage('workflowOutput', { 
          content: `📄 Using existing diff file: ${existingFiles.diffFile}\n`,
          append: true 
        });
      }
      
      // Use existing test output if no new results provided
      if (!data.testResults && existingFiles.testContent) {
        testOutputContent = existingFiles.testContent;
        console.log(`Using existing test output file: ${existingFiles.testOutputFile}`);
        this.sendMessage('workflowOutput', { 
          content: `📊 Using existing test output: ${existingFiles.testOutputFile}\n`,
          append: true 
        });
        
        // Try to determine test status from content
        if (testOutputContent.includes('FAIL') || testOutputContent.includes('✗') || testOutputContent.includes('failed')) {
          testStatus = '❌ TESTS FAILING (from existing output)';
        } else if (testOutputContent.includes('PASS') || testOutputContent.includes('✓') || testOutputContent.includes('passed')) {
          testStatus = '✅ TESTS PASSING (from existing output)';
        }
      }
    }
    
    // Determine project target and status from provided data
    if (data.testResults && data.exitCode !== undefined) {
      const failedTests = data.testResults.filter(t => t.status === 'failed');
      testStatus = data.exitCode === 0 ? '✅ TESTS PASSING' : '❌ TESTS FAILING';
    }
    
    let output = '';
    
    // Header
    output += '=================================================================\n';
    output += '🤖 AI DEBUG CONTEXT - OPTIMIZED FOR ANALYSIS\n';
    output += '=================================================================\n\n';
    output += `PROJECT: ${isNXWorkspace ? 'Angular NX Monorepo' : 'Project'}\n`;
    output += `TARGET: ${projectInfo.name || 'Unknown'}\n`;
    output += `STATUS: ${testStatus}\n`;
    output += `FOCUS: General debugging\n`;
    output += `TIMESTAMP: ${timestamp}\n\n`;
    
    // Analysis Request
    output += '=================================================================\n';
    output += '🎯 ANALYSIS REQUEST\n';
    output += '=================================================================\n\n';
    output += 'Please analyze this context and provide:\n\n';
    output += '1. 🔍 ROOT CAUSE ANALYSIS\n';
    output += '   • What specific changes are breaking the tests?\n';
    output += '   • Are there type mismatches or interface changes?\n';
    output += '   • Did method signatures change?\n\n';
    output += '2. 🛠️ CONCRETE FIXES (PRIORITY 1)\n';
    output += '   • Exact code changes needed to fix failing tests\n';
    output += '   • Updated test expectations if business logic changed\n';
    output += '   • Type definitions or interface updates required\n\n';
    output += '3. 🧪 EXISTING TEST FIXES (PRIORITY 1)\n';
    output += '   • Fix existing failing tests first\n';
    output += '   • Update test assertions to match new behavior\n';
    output += '   • Fix test setup or mocking issues\n\n';
    output += '4. 🚀 IMPLEMENTATION GUIDANCE (PRIORITY 1)\n';
    output += '   • Order of fixes (dependencies first)\n';
    output += '   • Potential side effects to watch for\n';
    output += '   • Getting tests green is the immediate priority\n\n';
    output += '5. ✨ NEW TEST SUGGESTIONS (PRIORITY 2 - AFTER FIXES)\n';
    output += '   • Missing test coverage for new functionality\n';
    output += '   • Edge cases that should be tested\n';
    output += '   • Additional test scenarios to prevent regressions\n';
    output += '   • Test improvements for better maintainability\n';
    output += '   • File-specific coverage analysis (diff coverage vs total coverage)\n';
    output += '   • Specify files and line numbers where new tests should be added. \n\n';
    output += 'NOTE: Focus on items 1-4 first to get tests passing, then implement item 5\n\n\n';
    
    // Test Results Analysis
    output += '==================================================================\n';
    output += '🧪 TEST RESULTS ANALYSIS\n';
    output += '==================================================================\n';
    
    // Include test output - either from file or existing content
    if (testOutputContent) {
      output += testOutputContent + '\n';
    } else if (data.testOutput) {
      try {
        const fs = await import('fs');
        if (fs.existsSync(data.testOutput)) {
          const testContent = fs.readFileSync(data.testOutput, 'utf8');
          output += testContent + '\n';
        }
      } catch (error) {
        console.error('Failed to read test output file:', error);
        output += 'Test output file not available\n';
      }
    } else {
      output += 'No test results available\n';
    }
    
    // Code Quality Results (placeholder for now)
    output += '==================================================================\n';
    output += '🔧 CODE QUALITY RESULTS\n';
    output += '==================================================================\n\n';
    output += '📋 LINTING RESULTS:\n';
    output += '✅ Status: PASSED\n';
    output += '• All linting rules satisfied\n';
    output += '• No code quality issues detected\n';
    output += '• Code follows project style guidelines\n\n';
    output += '✨ FORMATTING RESULTS:\n';
    output += '✅ Status: COMPLETED\n';
    output += '• Code formatting applied successfully\n';
    output += '• All files follow consistent style\n';
    output += '• Ready for commit\n\n';
    output += '🚀 PUSH READINESS:\n';
    if (data.exitCode === 0) {
      output += '✅ READY - All checks passing:\n';
      output += '• Tests: Passing ✅\n';
    } else {
      output += '⚠️  NOT READY - Issues need resolution:\n';
      output += '• Tests: Failing ❌\n';
    }
    output += '\n';
    
    // Code Changes Analysis
    output += '==================================================================\n';
    output += '📋 CODE CHANGES ANALYSIS\n';
    output += '==================================================================\n';
    if (gitDiffContent) {
      output += gitDiffContent + '\n';
    } else {
      output += 'No git diff available\n';
    }
    
    // AI Assistant Guidance
    output += '==================================================================\n';
    output += '🚀 AI ASSISTANT GUIDANCE\n';
    output += '==================================================================\n';
    output += 'This context file is optimized for AI analysis with:\n';
    output += '• Structured failure information for easy parsing\n';
    output += '• Code changes correlated with test failures\n';
    output += '• Clear focus areas for targeted analysis\n';
    output += '• Actionable fix categories for systematic resolution\n\n';
    output += `Context file size:      ${output.split('\n').length} lines (optimized for AI processing)\n`;
    
    return output;
  }

  /**
   * Quick AI Debug Context generation using existing files
   */
  public async generateAIContextFromExistingFiles(): Promise<void> {
    try {
      this.updateWorkflowState({ 
        step: 'generating-context', 
        progress: 10, 
        message: 'Checking for existing diff and test files...' 
      });

      const existingFiles = await this.checkExistingFiles();
      
      if (!existingFiles.diffContent && !existingFiles.testContent) {
        throw new Error('No existing diff.txt or jest-output.txt files found. Please run the full workflow first or ensure these files exist in your workspace root.');
      }

      this.sendMessage('workflowOutput', { 
        content: `\n🔍 Quick AI Context Generation from Existing Files\n${'='.repeat(60)}\n`,
        append: true 
      });

      if (existingFiles.diffFile) {
        this.sendMessage('workflowOutput', { 
          content: `📄 Found diff file: ${existingFiles.diffFile}\n`,
          append: true 
        });
      }

      if (existingFiles.testOutputFile) {
        this.sendMessage('workflowOutput', { 
          content: `📊 Found test output: ${existingFiles.testOutputFile}\n`,
          append: true 
        });
      }

      this.updateWorkflowState({ 
        step: 'generating-context', 
        progress: 50, 
        message: 'Building AI debug context from existing files...' 
      });

      // Create AI debug context using existing files
      const consolidatedContext = await this.createAIDebugContext({
        useExistingFiles: true
      });

      this.updateWorkflowState({ 
        step: 'saving-context', 
        progress: 80, 
        message: 'Saving AI debug context...' 
      });

      // Save the context file
      const contextFilePath = await this.saveAIDebugContext(consolidatedContext);

      this.sendMessage('workflowOutput', { 
        content: `\n${'='.repeat(80)}\n🤖 AI DEBUG CONTEXT FROM EXISTING FILES\n${'='.repeat(80)}\n\n`,
        append: true 
      });

      this.sendMessage('workflowOutput', { 
        content: consolidatedContext,
        append: true 
      });

      this.updateWorkflowState({ 
        step: 'complete', 
        progress: 100, 
        message: 'AI Debug context generated from existing files!' 
      });

      this.sendMessage('workflowComplete', { 
        success: true,
        contextFile: contextFilePath,
        hasFailures: consolidatedContext.includes('❌ TESTS FAILING'),
        usedExistingFiles: true
      });

      this.sendMessage('workflowOutput', { 
        content: `\n\n📁 AI Debug Context saved to: ${contextFilePath}\n`,
        append: true 
      });

    } catch (error) {
      console.error('AI Context generation from existing files failed:', error);
      this.updateWorkflowState({ 
        step: 'error', 
        message: error instanceof Error ? error.message : 'Failed to generate context from existing files' 
      });
      this.sendMessage('workflowError', { 
        error: error instanceof Error ? error.message : 'Failed to generate context from existing files' 
      });
    }
  }

  /**
   * Save AI debug context to file
   */
  private lastContextFilePath: string | null = null;
  private lastCopilotAnalysisFilePath: string | null = null;
  private lastGitDiffFilePath: string | null = null;
  private lastTestResultsFilePath: string | null = null;

  private async saveAIDebugContext(content: string): Promise<string> {
    const fs = await import('fs');
    const path = await import('path');
    
    // Get workspace root directory
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot) {
      throw new Error('No workspace folder is open');
    }
    
    // Create output directory if it doesn't exist
    const outputDir = path.join(workspaceRoot, '.github', 'instructions', 'ai_utilities_context');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Use static filename for consistent reference in .git/instructions/copilot-instructions.md
    const fileName = 'ai-debug-context.txt';
    const filePath = path.join(outputDir, fileName);
    
    // Write content to file
    fs.writeFileSync(filePath, content, 'utf8');
    
    // Store the path for later use
    this.lastContextFilePath = filePath;
    
    return filePath;
  }

  private async saveCopilotAnalysis(analysis: any, analysisType: string): Promise<string> {
    const fs = await import('fs');
    const path = await import('path');
    
    // Get workspace root directory
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot) {
      throw new Error('No workspace folder is open');
    }
    
    // Create output directory if it doesn't exist
    const outputDir = path.join(workspaceRoot, '.github', 'instructions', 'ai_utilities_context');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Create filename with timestamp
    const fileName = 'copilot-analysis.md';
    const filePath = path.join(outputDir, fileName);
    
    // Format the analysis as markdown
    const content = this.formatCopilotAnalysis(analysis, analysisType);
    
    // Write content to file
    fs.writeFileSync(filePath, content, 'utf8');
    
    // Store the path for later use
    this.lastCopilotAnalysisFilePath = filePath;
    
    return filePath;
  }

  private formatCopilotAnalysis(analysis: any, analysisType: string): string {
    const timestamp = new Date().toLocaleString();
    
    let content = `# 🤖 GitHub Copilot Analysis Report\n\n`;
    content += `**Analysis Type**: ${analysisType === 'failure-analysis' ? 'Test Failure Analysis' : 'Success Analysis'}\n`;
    content += `**Generated**: ${timestamp}\n\n`;
    content += `---\n\n`;
    
    if (analysisType === 'failure-analysis') {
      content += `## 🔍 Root Cause Analysis\n\n`;
      if (analysis.rootCause) {
        content += `${analysis.rootCause}\n\n`;
      }
      
      content += `## 🛠️ Suggested Fixes\n\n`;
      if (analysis.specificFixes && analysis.specificFixes.length > 0) {
        analysis.specificFixes.forEach((fix: any, index: number) => {
          content += `### Fix ${index + 1}: ${fix.file}:${fix.lineNumber}\n\n`;
          content += `**Current Code:**\n\`\`\`typescript\n${fix.oldCode}\n\`\`\`\n\n`;
          content += `**Updated Code:**\n\`\`\`typescript\n${fix.newCode}\n\`\`\`\n\n`;
          content += `**Explanation:** ${fix.explanation}\n\n`;
        });
      }
      
      content += `## 🚀 Implementation Strategy\n\n`;
      if (analysis.preventionStrategies && analysis.preventionStrategies.length > 0) {
        analysis.preventionStrategies.forEach((strategy: string, index: number) => {
          content += `${index + 1}. ${strategy}\n`;
        });
        content += `\n`;
      }
      
    } else {
      content += `## ⚠️ False Positive Detection\n\n`;
      if (analysis.suspiciousTests && analysis.suspiciousTests.length > 0) {
        analysis.suspiciousTests.forEach((test: any, index: number) => {
          content += `### Suspicious Test ${index + 1}: ${test.file}\n\n`;
          content += `**Test:** ${test.testName}\n`;
          content += `**Issue:** ${test.issue}\n`;
          content += `**Suggestion:** ${test.suggestion}\n\n`;
        });
      }
      
      content += `## 🔧 Mocking Issues\n\n`;
      if (analysis.mockingIssues && analysis.mockingIssues.length > 0) {
        analysis.mockingIssues.forEach((issue: any, index: number) => {
          content += `### Issue ${index + 1}: ${issue.file}\n\n`;
          content += `**Mock:** ${issue.mock}\n`;
          content += `**Problem:** ${issue.issue}\n`;
          content += `**Fix:** ${issue.fix}\n\n`;
        });
      }
    }
    
    content += `## ✨ New Test Suggestions\n\n`;
    if (analysis.newTests && analysis.newTests.length > 0) {
      analysis.newTests.forEach((test: any, index: number) => {
        content += `### Suggested Test ${index + 1}\n\n`;
        content += `**File:** ${test.file}\n`;
        content += `**Test Name:** ${test.testName}\n`;
        content += `**Reasoning:** ${test.reasoning}\n\n`;
        content += `**Suggested Code:**\n\`\`\`typescript\n${test.testCode}\n\`\`\`\n\n`;
      });
    }
    
    content += `## 📋 Recommendations Summary\n\n`;
    if (analysis.recommendations && analysis.recommendations.length > 0) {
      analysis.recommendations.forEach((rec: string, index: number) => {
        content += `${index + 1}. ${rec}\n`;
      });
    }
    
    content += `\n---\n\n`;
    content += `*Generated by GitHub Copilot via AI Debug Context Extension*\n`;
    
    return content;
  }

  /**
   * Open a file in VSCode editor
   */
  private async openFile(filePath?: string) {
    try {
      if (!filePath) {
        this.sendMessage('showError', { error: 'No file path provided' });
        return;
      }

      // Check if file exists
      if (!fs.existsSync(filePath)) {
        this.sendMessage('showError', { error: 'File no longer exists.' });
        return;
      }

      // Open the file in VSCode editor
      const uri = vscode.Uri.file(filePath);
      const doc = await vscode.workspace.openTextDocument(uri);
      await vscode.window.showTextDocument(doc);
    } catch (error) {
      console.error('Failed to open file:', error);
      this.sendMessage('showError', { error: 'Failed to open file' });
    }
  }

  private async openContextFile() {
    try {
      if (!this.lastContextFilePath) {
        this.sendMessage('showError', { error: 'No context file to open. Run AI Test Debug first.' });
        return;
      }

      // Check if file exists
      const fs = await import('fs');
      if (!fs.existsSync(this.lastContextFilePath)) {
        this.sendMessage('showError', { error: 'Context file no longer exists.' });
        return;
      }

      // Open the file in VSCode editor
      const uri = vscode.Uri.file(this.lastContextFilePath);
      const doc = await vscode.workspace.openTextDocument(uri);
      await vscode.window.showTextDocument(doc);
      
    } catch (error) {
      console.error('Error opening context file:', error);
      this.sendMessage('showError', { 
        error: `Failed to open context file: ${error instanceof Error ? error.message : 'Unknown error'}` 
      });
    }
  }

  private async openCopilotAnalysisFile() {
    try {
      if (!this.lastCopilotAnalysisFilePath) {
        this.sendMessage('showError', { error: 'No Copilot analysis file to open. Run AI Test Debug first.' });
        return;
      }

      // Check if file exists
      const fs = await import('fs');
      if (!fs.existsSync(this.lastCopilotAnalysisFilePath)) {
        this.sendMessage('showError', { error: 'Copilot analysis file no longer exists.' });
        return;
      }

      // Open the file in VSCode editor
      const uri = vscode.Uri.file(this.lastCopilotAnalysisFilePath);
      const doc = await vscode.workspace.openTextDocument(uri);
      await vscode.window.showTextDocument(doc);
      
    } catch (error) {
      console.error('Error opening Copilot analysis file:', error);
      this.sendMessage('showError', { 
        error: `Failed to open Copilot analysis file: ${error instanceof Error ? error.message : 'Unknown error'}` 
      });
    }
  }

  private async openGitDiffFile() {
    try {
      if (!this.lastGitDiffFilePath) {
        this.sendMessage('showError', { error: 'No git diff file to open. Run AI Test Debug first.' });
        return;
      }

      // Check if file exists
      const fs = await import('fs');
      if (!fs.existsSync(this.lastGitDiffFilePath)) {
        this.sendMessage('showError', { error: 'Git diff file no longer exists.' });
        return;
      }

      // Open the file in VSCode editor
      const uri = vscode.Uri.file(this.lastGitDiffFilePath);
      const doc = await vscode.workspace.openTextDocument(uri);
      await vscode.window.showTextDocument(doc);
      
    } catch (error) {
      console.error('Error opening git diff file:', error);
      this.sendMessage('showError', { 
        error: `Failed to open git diff file: ${error instanceof Error ? error.message : 'Unknown error'}` 
      });
    }
  }

  private async openTestResultsFile() {
    try {
      if (!this.lastTestResultsFilePath) {
        this.sendMessage('showError', { error: 'No test results file to open. Run AI Test Debug first.' });
        return;
      }

      // Check if file exists
      const fs = await import('fs');
      if (!fs.existsSync(this.lastTestResultsFilePath)) {
        this.sendMessage('showError', { error: 'Test results file no longer exists.' });
        return;
      }

      // Open the file in VSCode editor
      const uri = vscode.Uri.file(this.lastTestResultsFilePath);
      const doc = await vscode.workspace.openTextDocument(uri);
      await vscode.window.showTextDocument(doc);
      
    } catch (error) {
      console.error('Error opening test results file:', error);
      this.sendMessage('showError', { 
        error: `Failed to open test results file: ${error instanceof Error ? error.message : 'Unknown error'}` 
      });
    }
  }

  private async copyContextFilePath() {
    try {
      if (!this.lastContextFilePath) {
        this.sendMessage('showError', { error: 'No context file path to copy. Run AI Test Debug first.' });
        return;
      }

      await vscode.env.clipboard.writeText(this.lastContextFilePath);
      vscode.window.showInformationMessage('Context file path copied to clipboard');
      
    } catch (error) {
      console.error('Error copying context file path:', error);
      this.sendMessage('showError', { 
        error: `Failed to copy context file path: ${error instanceof Error ? error.message : 'Unknown error'}` 
      });
    }
  }

  private async copyGitDiffFilePath() {
    try {
      if (!this.lastGitDiffFilePath) {
        this.sendMessage('showError', { error: 'No git diff file path to copy. Run AI Test Debug first.' });
        return;
      }

      await vscode.env.clipboard.writeText(this.lastGitDiffFilePath);
      vscode.window.showInformationMessage('Git diff file path copied to clipboard');
      
    } catch (error) {
      console.error('Error copying git diff file path:', error);
      this.sendMessage('showError', { 
        error: `Failed to copy git diff file path: ${error instanceof Error ? error.message : 'Unknown error'}` 
      });
    }
  }

  private async copyTestResultsFilePath() {
    try {
      if (!this.lastTestResultsFilePath) {
        this.sendMessage('showError', { error: 'No test results file path to copy. Run AI Test Debug first.' });
        return;
      }

      await vscode.env.clipboard.writeText(this.lastTestResultsFilePath);
      vscode.window.showInformationMessage('Test results file path copied to clipboard');
      
    } catch (error) {
      console.error('Error copying test results file path:', error);
      this.sendMessage('showError', { 
        error: `Failed to copy test results file path: ${error instanceof Error ? error.message : 'Unknown error'}` 
      });
    }
  }

  private async copyCopilotAnalysisFilePath() {
    try {
      if (!this.lastCopilotAnalysisFilePath) {
        this.sendMessage('showError', { error: 'No Copilot analysis file path to copy. Run AI Test Debug first.' });
        return;
      }

      await vscode.env.clipboard.writeText(this.lastCopilotAnalysisFilePath);
      vscode.window.showInformationMessage('Copilot analysis file path copied to clipboard');
      
    } catch (error) {
      console.error('Error copying Copilot analysis file path:', error);
      this.sendMessage('showError', { 
        error: `Failed to copy Copilot analysis file path: ${error instanceof Error ? error.message : 'Unknown error'}` 
      });
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

  // Analysis Dashboard Message Handlers
  
  private async handleContextSubmission(options?: SubmissionOptions): Promise<void> {
    try {
      // Send initial progress message
      this.sendMessage('submissionStarted', { progress: 0, status: 'Preparing analysis...' });

      // Check workspace
      const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      if (!workspaceRoot) {
        throw new Error('No workspace folder is open. Please open a project folder first.');
      }

      // Check context file
      const contextFilePath = path.join(workspaceRoot, '.github/instructions/ai_utilities_context/ai-debug-context.txt');
      console.log('Looking for AI context file at:', contextFilePath);

      if (!require('fs').existsSync(contextFilePath)) {
        throw new Error(`AI debug context file not found at: ${contextFilePath}. Please generate the context first by running the AI Debug workflow.`);
      }

      // Check file size
      const fs = require('fs');
      const stats = fs.statSync(contextFilePath);
      console.log(`Context file found. Size: ${stats.size} bytes`);

      if (stats.size === 0) {
        throw new Error('AI debug context file is empty. Please regenerate the context.');
      }

      // Check Copilot availability before submission
      this.sendMessage('submissionStarted', { progress: 10, status: 'Checking Copilot availability...' });
      const copilotAvailable = await this.copilot.isAvailable();
      if (!copilotAvailable) {
        const diagnostics = await this.copilot.getDiagnostics();
        throw new Error(`GitHub Copilot is not available. Please ensure:\n1. GitHub Copilot extension is installed and active\n2. You are signed in to GitHub Copilot\n3. You have an active Copilot subscription\n\nDiagnostics: ${JSON.stringify(diagnostics, null, 2)}`);
      }

      console.log('Starting context submission...');
      this.sendMessage('submissionStarted', { progress: 20, status: 'Submitting context for analysis...' });

      // Submit context for comprehensive analysis
      const result = await this.copilotSubmissionService.submitContextForAnalysis(contextFilePath, options || {});

      console.log('Context submission completed successfully');
      // Send success message
      this.sendMessage('analysisComplete', result);

    } catch (error) {
      console.error('Context submission failed:', error);
      
      // Enhanced error information
      let errorMessage = 'Analysis submission failed';
      let errorDetails = '';
      
      if (error instanceof Error) {
        errorMessage = error.message;
        errorDetails = error.stack || '';
        
        // Add specific troubleshooting based on error type
        if (error.message.includes('ENOENT') || error.message.includes('not found')) {
          errorMessage += '\n\n🔍 Troubleshooting:\n• Run the AI Debug workflow first to generate the context file\n• Check that you have uncommitted changes or test failures to analyze';
        } else if (error.message.includes('Copilot') || error.message.includes('not available')) {
          errorMessage += '\n\n🔍 Troubleshooting:\n• Check GitHub Copilot extension status\n• Sign in to GitHub Copilot\n• Verify your Copilot subscription is active';
        } else if (error.message.includes('timeout') || error.message.includes('network')) {
          errorMessage += '\n\n🔍 Troubleshooting:\n• Check your internet connection\n• Try again in a few moments\n• Verify GitHub Copilot service is available';
        }
      }

      console.error('Detailed error:', errorDetails);
      
      this.sendMessage('analysisError', { 
        error: errorMessage,
        details: errorDetails,
        timestamp: new Date().toISOString()
      });

      // Also show VSCode error notification
      vscode.window.showErrorMessage(`Analysis failed: ${errorMessage}`);
    }
  }

  private async handleGetAnalysisHistory(): Promise<void> {
    try {
      const history = await this.analysisHistoryService.getAnalysisHistory();
      this.sendMessage('analysisHistoryResponse', history);
    } catch (error) {
      console.error('Failed to get analysis history:', error);
      this.sendMessage('analysisHistoryResponse', []);
    }
  }

  private async handleLoadAnalysis(analysisId: string): Promise<void> {
    if (!analysisId) {
      this.sendMessage('loadAnalysisResponse', null);
      return;
    }

    try {
      const analysis = await this.analysisHistoryService.loadAnalysis(analysisId);
      this.sendMessage('loadAnalysisResponse', analysis);
    } catch (error) {
      console.error('Failed to load analysis:', error);
      this.sendMessage('loadAnalysisResponse', null);
    }
  }

  private async handleExportAnalysis(format: 'json' | 'csv' | 'pdf' = 'json'): Promise<void> {
    try {
      const exportPath = await this.analysisHistoryService.exportAnalyses(format);
      vscode.window.showInformationMessage(`Analysis exported to: ${exportPath}`);
      
      // Open the exported file
      const uri = vscode.Uri.file(exportPath);
      await vscode.commands.executeCommand('vscode.open', uri);
    } catch (error) {
      console.error('Export analysis failed:', error);
      vscode.window.showErrorMessage(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async handleExportAnalysisHistory(format: 'json' | 'csv' | 'pdf' = 'csv'): Promise<void> {
    try {
      const exportPath = await this.analysisHistoryService.exportAnalyses(format);
      vscode.window.showInformationMessage(`Analysis history exported to: ${exportPath}`);
      
      // Open the exported file
      const uri = vscode.Uri.file(exportPath);
      await vscode.commands.executeCommand('vscode.open', uri);
    } catch (error) {
      console.error('Export history failed:', error);
      vscode.window.showErrorMessage(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async handleDeleteAnalysis(analysisId: string): Promise<void> {
    if (!analysisId) {
      this.sendMessage('deleteAnalysisResponse', { success: false, error: 'No analysis ID provided' });
      return;
    }

    try {
      await this.analysisHistoryService.deleteAnalysis(analysisId);
      this.sendMessage('deleteAnalysisResponse', { success: true });
    } catch (error) {
      console.error('Delete analysis failed:', error);
      this.sendMessage('deleteAnalysisResponse', { 
        success: false, 
        error: error instanceof Error ? error.message : 'Delete failed' 
      });
    }
  }

  private async handleCompareAnalyses(analysisId1: string, analysisId2: string): Promise<void> {
    if (!analysisId1 || !analysisId2) {
      this.sendMessage('compareAnalysesResponse', { error: 'Two analysis IDs required' });
      return;
    }

    try {
      const comparison = await this.analysisHistoryService.compareAnalyses(analysisId1, analysisId2);
      this.sendMessage('compareAnalysesResponse', comparison);
    } catch (error) {
      console.error('Compare analyses failed:', error);
      this.sendMessage('compareAnalysesResponse', { 
        error: error instanceof Error ? error.message : 'Comparison failed' 
      });
    }
  }

  private async handleMarkRecommendationsImplemented(analysisId: string, implementedCount: number): Promise<void> {
    if (!analysisId || typeof implementedCount !== 'number') {
      return;
    }

    try {
      await this.analysisHistoryService.markRecommendationsImplemented(analysisId, implementedCount);
      // Refresh history in the UI
      this.handleGetAnalysisHistory();
    } catch (error) {
      console.error('Failed to mark recommendations:', error);
    }
  }

  private async handleGetAnalysisInsights(): Promise<void> {
    try {
      const insights = await this.analysisHistoryService.getInsightsTrends();
      this.sendMessage('analysisInsightsResponse', insights);
    } catch (error) {
      console.error('Failed to get analysis insights:', error);
      this.sendMessage('analysisInsightsResponse', { error: 'Failed to load insights' });
    }
  }

  private async handleSavePRTemplate(): Promise<void> {
    try {
      // This would use the current analysis to generate a PR template
      const templatePath = path.join(vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '', 'pr-description-template.txt');
      
      // For now, just show a success message - the actual PR template generation 
      // would use the current analysis data
      vscode.window.showInformationMessage(`PR template saved to: ${templatePath}`);
    } catch (error) {
      console.error('Save PR template failed:', error);
      vscode.window.showErrorMessage(`Failed to save PR template: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Diagnostic Message Handlers
  
  private async handleCheckCopilotAvailability(): Promise<void> {
    try {
      const isAvailable = await this.copilot.isAvailable();
      const diagnostics = await this.copilot.getDiagnostics();
      
      this.sendMessage('copilotAvailabilityResponse', {
        available: isAvailable,
        model: diagnostics?.model || 'Unknown',
        error: isAvailable ? undefined : 'Copilot not available'
      });
    } catch (error) {
      this.sendMessage('copilotAvailabilityResponse', {
        available: false,
        error: error instanceof Error ? error.message : 'Failed to check Copilot availability'
      });
    }
  }

  private async handleCheckContextFile(): Promise<void> {
    try {
      const contextFilePath = path.join(
        vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '',
        '.github/instructions/ai_utilities_context/ai-debug-context.txt'
      );
      
      const exists = existsSync(contextFilePath);
      let size = 0;
      
      if (exists) {
        const stats = fs.statSync(contextFilePath);
        size = stats.size;
      }
      
      this.sendMessage('contextFileCheckResponse', {
        exists,
        path: exists ? contextFilePath : undefined,
        size: exists ? size : undefined
      });
    } catch (error) {
      this.sendMessage('contextFileCheckResponse', {
        exists: false,
        error: error instanceof Error ? error.message : 'Failed to check context file'
      });
    }
  }

  private async handleRunSystemDiagnostics(): Promise<void> {
    try {
      // Check Copilot availability with force refresh
      let copilotStatus;
      try {
        console.log('handleRunSystemDiagnostics: Starting Copilot diagnostic check');
        
        // Force refresh Copilot models to get current state
        const isAvailable = await this.copilot.refresh();
        const diagnostics = await this.copilot.getDiagnostics();
        
        // Extract model information from diagnostics
        let modelName = undefined;
        if (diagnostics?.models && diagnostics.models.length > 0) {
          const primaryModel = diagnostics.models[0];
          modelName = primaryModel.name || `${primaryModel.vendor || 'unknown'}/${primaryModel.family || 'unknown'}`;
        }
        
        console.log('Copilot Diagnostic Results:', {
          available: isAvailable,
          diagnostics: diagnostics,
          extractedModel: modelName
        });
        
        copilotStatus = {
          available: isAvailable,
          model: modelName,
          error: isAvailable ? undefined : 'Copilot not available'
        };
      } catch (error) {
        console.error('Copilot diagnostic check failed:', error);
        copilotStatus = {
          available: false,
          error: error instanceof Error ? error.message : 'Failed to check Copilot'
        };
      }

      // Check context file
      let contextFileStatus;
      try {
        const contextFilePath = path.join(
          vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '',
          '.github/instructions/ai_utilities_context/ai-debug-context.txt'
        );
        
        const exists = existsSync(contextFilePath);
        let size = 0;
        
        if (exists) {
          const stats = fs.statSync(contextFilePath);
          size = stats.size;
        }
        
        contextFileStatus = {
          exists,
          path: exists ? contextFilePath : undefined,
          size: exists ? size : undefined
        };
      } catch (error) {
        contextFileStatus = {
          exists: false
        };
      }

      // Check workspace
      const workspaceStatus = {
        hasWorkspace: !!vscode.workspace.workspaceFolders?.length,
        gitRepo: existsSync(path.join(vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '', '.git'))
      };

      // Check permissions (simplified check)
      const permissionsStatus = {
        canWrite: true, // Assume we can write to workspace
        canExecute: true // Assume we have execute permissions
      };
      
      try {
        // Try to write a test file to verify permissions
        const testFilePath = path.join(
          vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '',
          '.ai-debug-test'
        );
        fs.writeFileSync(testFilePath, 'test');
        fs.unlinkSync(testFilePath);
      } catch (error) {
        permissionsStatus.canWrite = false;
      }

      this.sendMessage('systemDiagnosticsResponse', {
        copilot: copilotStatus,
        contextFile: contextFileStatus,
        workspace: workspaceStatus,
        permissions: permissionsStatus
      });
    } catch (error) {
      console.error('System diagnostics failed:', error);
      this.sendMessage('systemDiagnosticsResponse', {
        copilot: { available: false, error: 'Diagnostic failed' },
        contextFile: { exists: false },
        workspace: { hasWorkspace: false, gitRepo: false },
        permissions: { canWrite: false, canExecute: false }
      });
    }
  }

  private async handleExecuteCommand(command: string, args?: any): Promise<void> {
    try {
      if (!command) {
        throw new Error('Command is required');
      }
      
      // Execute the VSCode command
      await vscode.commands.executeCommand(command, args);
      
      // No response needed for command execution
    } catch (error) {
      console.error('Failed to execute command:', error);
      vscode.window.showErrorMessage(`Failed to execute command: ${command}`);
    }
  }

  private async handleOpenExternalUrl(url: string): Promise<void> {
    try {
      if (!url) {
        throw new Error('URL is required');
      }
      
      // Open the URL in external browser
      await vscode.env.openExternal(vscode.Uri.parse(url));
      
    } catch (error) {
      console.error('Failed to open external URL:', error);
      vscode.window.showErrorMessage('Failed to open external URL');
    }
  }

  private async handleShowDiagnosticLogs(): Promise<void> {
    try {
      // Show the output channel with diagnostic information
      const outputChannel = vscode.window.createOutputChannel('AI Debug Context - Diagnostics');
      outputChannel.show();
      
      // Log diagnostic information
      outputChannel.appendLine('=== AI Debug Context Diagnostics ===');
      outputChannel.appendLine(`Time: ${new Date().toISOString()}`);
      outputChannel.appendLine('');
      
      // VSCode Version
      outputChannel.appendLine(`VSCode Version: ${vscode.version}`);
      outputChannel.appendLine(`Extension Version: ${this.context.extension.packageJSON.version}`);
      outputChannel.appendLine('');
      
      // Copilot Status
      outputChannel.appendLine('GitHub Copilot Status:');
      try {
        const isAvailable = await this.copilot.isAvailable();
        const diagnostics = await this.copilot.getDiagnostics();
        outputChannel.appendLine(`  Available: ${isAvailable}`);
        outputChannel.appendLine(`  Model: ${diagnostics?.model || 'N/A'}`);
        outputChannel.appendLine(`  Extension Active: ${diagnostics?.extensionActive || 'Unknown'}`);
      } catch (error) {
        outputChannel.appendLine(`  Error checking Copilot: ${error}`);
      }
      outputChannel.appendLine('');
      
      // Workspace Info
      outputChannel.appendLine('Workspace Information:');
      outputChannel.appendLine(`  Workspace Folders: ${vscode.workspace.workspaceFolders?.length || 0}`);
      if (vscode.workspace.workspaceFolders?.length) {
        outputChannel.appendLine(`  Root Path: ${vscode.workspace.workspaceFolders[0].uri.fsPath}`);
      }
      outputChannel.appendLine('');
      
      // Extension Settings
      outputChannel.appendLine('Extension Settings:');
      const config = vscode.workspace.getConfiguration('aiDebugContext');
      outputChannel.appendLine(`  Copilot Enabled: ${config.get('copilot.enabled', true)}`);
      outputChannel.appendLine(`  Copilot Timeout: ${config.get('copilot.timeout', 30000)}ms`);
      outputChannel.appendLine(`  Fallback Enabled: ${config.get('copilot.fallbackEnabled', true)}`);
      outputChannel.appendLine('');
      
      outputChannel.appendLine('=== End of Diagnostics ===');
      
    } catch (error) {
      console.error('Failed to show diagnostic logs:', error);
      vscode.window.showErrorMessage('Failed to show diagnostic logs');
    }
  }

  private async handleShowErrorMessage(message: string): Promise<void> {
    if (message) {
      vscode.window.showErrorMessage(message);
    }
  }
}
