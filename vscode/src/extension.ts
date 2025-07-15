import * as vscode from 'vscode';
import { WebviewProvider } from './webview/provider';
import { ProjectDetector } from './utils/projectDetector';
import { CommandRunner } from './utils/shellRunner';
import { FileManager } from './utils/fileManager';

let webviewProvider: WebviewProvider;

export async function activate(context: vscode.ExtensionContext) {
    console.log('AI Debug Utilities extension is now active');

    // Initialize core utilities
    const projectDetector = new ProjectDetector();
    const commandRunner = new CommandRunner();
    const fileManager = new FileManager();

    // Check if this is an NX workspace
    const isNxWorkspace = await projectDetector.findNxWorkspace();
    
    if (isNxWorkspace) {
        // Set context for when clauses
        vscode.commands.executeCommand('setContext', 'workspaceHasNxProject', true);
        
        // Initialize webview provider
        webviewProvider = new WebviewProvider(context.extensionUri, projectDetector, commandRunner, fileManager);
        
        // Register webview provider
        context.subscriptions.push(
            vscode.window.registerWebviewViewProvider('aiDebugUtilities', webviewProvider)
        );

        // Register commands
        registerCommands(context, webviewProvider, projectDetector, commandRunner, fileManager);
        
        console.log('AI Debug Utilities: NX workspace detected, extension fully activated');
        
        // Show welcome notification
        const config = vscode.workspace.getConfiguration('aiDebugUtilities');
        if (config.get('showNotifications')) {
            vscode.window.showInformationMessage(
                'AI Debug Utilities activated! Open the panel to get started.',
                'Open Panel'
            ).then(selection => {
                if (selection === 'Open Panel') {
                    vscode.commands.executeCommand('aiDebugUtilities.openPanel');
                }
            });
        }
    } else {
        vscode.commands.executeCommand('setContext', 'workspaceHasNxProject', false);
        console.log('AI Debug Utilities: No NX workspace detected, extension remains dormant');
    }
}

function registerCommands(
    context: vscode.ExtensionContext,
    webviewProvider: WebviewProvider,
    projectDetector: ProjectDetector,
    commandRunner: CommandRunner,
    fileManager: FileManager
) {
    // Open panel command
    const openPanelCommand = vscode.commands.registerCommand('aiDebugUtilities.openPanel', () => {
        webviewProvider.show();
    });

    // Run AI Debug command
    const runAiDebugCommand = vscode.commands.registerCommand('aiDebugUtilities.runAiDebug', async () => {
        const project = await projectDetector.detectCurrentProject();
        if (project) {
            await webviewProvider.runCommand('aiDebug', { project });
        } else {
            vscode.window.showWarningMessage('No NX project detected. Please select a project first.');
        }
    });

    // Run NX Test command
    const runNxTestCommand = vscode.commands.registerCommand('aiDebugUtilities.runNxTest', async () => {
        const project = await projectDetector.detectCurrentProject();
        if (project) {
            await webviewProvider.runCommand('nxTest', { project });
        } else {
            vscode.window.showWarningMessage('No NX project detected. Please select a project first.');
        }
    });

    // Run Git Diff command
    const runGitDiffCommand = vscode.commands.registerCommand('aiDebugUtilities.runGitDiff', async () => {
        await webviewProvider.runCommand('gitDiff', {});
    });

    // Run Prepare to Push command
    const runPrepareToPushCommand = vscode.commands.registerCommand('aiDebugUtilities.runPrepareToPush', async () => {
        const project = await projectDetector.detectCurrentProject();
        if (project) {
            await webviewProvider.runCommand('prepareToPush', { project });
        } else {
            vscode.window.showWarningMessage('No NX project detected. Please select a project first.');
        }
    });

    // Add all commands to subscriptions
    context.subscriptions.push(
        openPanelCommand,
        runAiDebugCommand,
        runNxTestCommand,
        runGitDiffCommand,
        runPrepareToPushCommand
    );
}

export function deactivate() {
    console.log('AI Debug Utilities extension is now deactivated');
}
