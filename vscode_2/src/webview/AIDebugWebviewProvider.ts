import * as vscode from 'vscode';
import * as path from 'path';
import { existsSync, readFileSync } from 'fs';
import { GitIntegration } from '../services/GitIntegration';
import { NXWorkspaceManager } from '../services/NXWorkspaceManager';
import { CopilotIntegration } from '../services/CopilotIntegration';
import { TestRunner } from '../services/TestRunner';
import { WorkflowState, WorkflowConfig, WebviewMessage } from '../types';

export class AIDebugWebviewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'ai-debug-context.mainView';
  private view?: vscode.WebviewView;
  private workflowState: WorkflowState = { step: 'idle' };

  constructor(
    private context: vscode.ExtensionContext,
    private gitIntegration: GitIntegration,
    private nxManager: NXWorkspaceManager,
    private copilot: CopilotIntegration,
    private testRunner: TestRunner
  ) {}

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
    // TODO: Implement AI analysis for test failures
    console.log('Handling test failures with AI analysis...');
    
    // Placeholder: Show basic info about failures
    const failures = testResults.filter(t => t.status === 'failed');
    vscode.window.showWarningMessage(`${failures.length} tests failed. AI analysis will be implemented.`);
    this.sendMessage('testFailures', { count: failures.length, failures });
  }

  private async handleTestSuccess(gitDiff: string, testResults: any[]): Promise<void> {
    // TODO: Implement AI analysis for successful tests (false positive detection, new test suggestions)
    console.log('Handling successful tests with AI analysis...');
    
    vscode.window.showInformationMessage('All tests passed! AI analysis for test suggestions will be implemented.');
    this.sendMessage('testSuccess', { count: testResults.length });
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

  private saveState(): void {
    if (this.view) {
      this.view.webview.postMessage({ 
        command: 'saveState', 
        data: { workflowState: this.workflowState } 
      });
    }
  }
}
