import * as vscode from 'vscode';
import { AIDebugWebviewProvider } from './webview/AIDebugWebviewProvider';
import { GitIntegration } from './services/GitIntegration';
import { NXWorkspaceManager } from './services/NXWorkspaceManager';
import { CopilotIntegration } from './services/CopilotIntegration';
import { TestRunner } from './services/TestRunner';

export function activate(context: vscode.ExtensionContext) {
  console.log('AI Debug Context extension is being activated');

  try {
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
        provider,
        {
          webviewOptions: {
            retainContextWhenHidden: true
          }
        }
      )
    );

    // Register commands
    context.subscriptions.push(
      vscode.commands.registerCommand('ai-debug-context.runAITestDebug', 
        () => provider.runAITestDebug())
    );

    context.subscriptions.push(
      vscode.commands.registerCommand('ai-debug-context.openMainView', 
        () => vscode.commands.executeCommand('ai-debug-context.mainView.focus'))
    );

    console.log('AI Debug Context extension activated successfully');
  } catch (error) {
    console.error('Failed to activate AI Debug Context extension:', error);
    vscode.window.showErrorMessage(`Failed to activate AI Debug Context: ${error}`);
  }
}

export function deactivate() {
  console.log('AI Debug Context extension is being deactivated');
}
