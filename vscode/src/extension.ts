import * as vscode from 'vscode';
import { WebviewProvider } from './webview/provider';
import { ProjectDetector } from './utils/projectDetector';
import { CommandRunner } from './utils/shellRunner';
import { FileManager } from './utils/fileManager';
import { StatusTracker } from './utils/statusTracker';
import { CommandCoordinator } from './utils/commandCoordinator';

let webviewProvider: WebviewProvider;
let statusTracker: StatusTracker;
let commandCoordinator: CommandCoordinator;

export async function activate(context: vscode.ExtensionContext) {
    console.log('AI Debug Utilities extension is now active');

    try {
        // Initialize core utilities
        const projectDetector = new ProjectDetector();
        const commandRunner = new CommandRunner();
        const fileManager = new FileManager();
        
        // Initialize status tracking and coordination
        statusTracker = new StatusTracker(context);
        commandCoordinator = new CommandCoordinator(statusTracker, context);

        // Check if this is an NX workspace
        const isNxWorkspace = await projectDetector.findNxWorkspace();
        
        if (isNxWorkspace) {
            // Set context for when clauses
            vscode.commands.executeCommand('setContext', 'workspaceHasNxProject', true);
            
            // Initialize webview provider
            webviewProvider = new WebviewProvider(
                context.extensionUri, 
                projectDetector, 
                commandRunner, 
                fileManager,
                statusTracker,
                commandCoordinator
            );
            
            // Register webview provider
            context.subscriptions.push(
                vscode.window.registerWebviewViewProvider('aiDebugUtilities', webviewProvider)
            );

            // Register commands
            registerCommands(context, webviewProvider, projectDetector, commandRunner, fileManager, statusTracker, commandCoordinator);
            
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
    } catch (error) {
        console.error('Error activating AI Debug Utilities:', error);
        vscode.commands.executeCommand('setContext', 'workspaceHasNxProject', false);
    }
}

function registerCommands(
    context: vscode.ExtensionContext,
    webviewProvider: WebviewProvider,
    projectDetector: ProjectDetector,
    commandRunner: CommandRunner,
    fileManager: FileManager,
    statusTracker: StatusTracker,
    commandCoordinator: CommandCoordinator
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

    // Status tracking commands
    const showStatusCommand = vscode.commands.registerCommand('aiDebugUtilities.showStatus', () => {
        const report = statusTracker.generateStatusReport();
        const panel = vscode.window.createWebviewPanel(
            'aiDebugStatus',
            'AI Debug Status Report',
            vscode.ViewColumn.One,
            {}
        );
        panel.webview.html = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Status Report</title>
                <style>
                    body { font-family: monospace; white-space: pre-wrap; padding: 20px; }
                    .report { background: #1e1e1e; color: #d4d4d4; padding: 20px; border-radius: 5px; }
                </style>
            </head>
            <body>
                <div class="report">${report.replace(/\n/g, '<br>')}</div>
            </body>
            </html>
        `;
    });

    const clearHistoryCommand = vscode.commands.registerCommand('aiDebugUtilities.clearHistory', async () => {
        const result = await vscode.window.showWarningMessage(
            'Are you sure you want to clear the command history?',
            { modal: true },
            'Yes', 'No'
        );
        
        if (result === 'Yes') {
            statusTracker.clearHistory();
            vscode.window.showInformationMessage('Command history cleared.');
        }
    });

    const cancelAllCommand = vscode.commands.registerCommand('aiDebugUtilities.cancelAll', () => {
        commandCoordinator.cancelAllCommands();
        vscode.window.showInformationMessage('All running commands cancelled.');
    });

    const healthReportCommand = vscode.commands.registerCommand('aiDebugUtilities.healthReport', () => {
        const report = commandCoordinator.createHealthReport();
        const panel = vscode.window.createWebviewPanel(
            'aiDebugHealth',
            'Command Execution Health Report',
            vscode.ViewColumn.One,
            {}
        );
        panel.webview.html = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Health Report</title>
                <style>
                    body { font-family: monospace; white-space: pre-wrap; padding: 20px; }
                    .report { background: #1e1e1e; color: #d4d4d4; padding: 20px; border-radius: 5px; }
                </style>
            </head>
            <body>
                <div class="report">${report.replace(/\n/g, '<br>')}</div>
            </body>
            </html>
        `;
    });

    // Add all commands to subscriptions
    context.subscriptions.push(
        openPanelCommand,
        runAiDebugCommand,
        runNxTestCommand,
        runGitDiffCommand,
        runPrepareToPushCommand,
        showStatusCommand,
        clearHistoryCommand,
        cancelAllCommand,
        healthReportCommand
    );
}

export function deactivate() {
    console.log('AI Debug Utilities extension is now deactivated');
    
    // Clean up resources
    if (statusTracker) {
        statusTracker.dispose();
    }
    
    if (commandCoordinator) {
        commandCoordinator.dispose();
    }
}
