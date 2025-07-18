import * as vscode from 'vscode';
import { WebviewProvider } from './webview/provider';
import { ProjectDetector } from './utils/projectDetector';
import { CommandRunner } from './utils/shellRunner';
import { FileManager } from './utils/fileManager';
import { StatusTracker } from './utils/statusTracker';
import { CommandCoordinator } from './utils/commandCoordinator';
import { PluginManager } from './services/plugins/pluginManager';
import { PluginMarketplaceService } from './services/plugins/pluginMarketplace';
import { PluginDiscoveryService } from './services/plugins/pluginDiscovery';

// Phase 5 Features
import { NxAffectedManager } from './services/nx/NxAffectedManager';
import { NxCommandProvider } from './services/nx/NxCommandProvider';
import { NxStatusBar } from './services/nx/NxStatusBar';
import { GitDiffManager } from './services/git/GitDiffManager';
import { GitCommandProvider } from './services/git/GitCommandProvider';
import { FlipperDetectionManager } from './services/flipper/FlipperDetectionManager';

let webviewProvider: WebviewProvider;
let statusTracker: StatusTracker;
let commandCoordinator: CommandCoordinator;
let pluginManager: PluginManager;
let pluginMarketplace: PluginMarketplaceService;
let pluginDiscovery: PluginDiscoveryService;

// Phase 5 Features
let nxAffectedManager: NxAffectedManager;
let nxCommandProvider: NxCommandProvider;
let nxStatusBar: NxStatusBar;
let gitDiffManager: GitDiffManager;
let gitCommandProvider: GitCommandProvider;
let flipperDetectionManager: FlipperDetectionManager;

export async function activate(context: vscode.ExtensionContext) {
    console.log('AI Debug Utilities extension is now active');

    try {
        // Get workspace path
        const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
        
        // Create output channel
        const outputChannel = vscode.window.createOutputChannel('AI Debug Utilities');
        
        // Initialize core utilities with required parameters
        const projectDetector = new ProjectDetector(workspaceRoot);
        const commandRunner = new CommandRunner(outputChannel);
        const fileManager = new FileManager(outputChannel);
        
        // Initialize status tracking and coordination
        statusTracker = new StatusTracker();
        commandCoordinator = new CommandCoordinator(statusTracker, context);

        // Initialize plugin system
        pluginManager = new PluginManager(context, workspaceRoot);
        pluginMarketplace = new PluginMarketplaceService(context);
        pluginDiscovery = new PluginDiscoveryService(context);

        // Initialize Phase 5 Features
        nxAffectedManager = new NxAffectedManager(context);
        nxCommandProvider = new NxCommandProvider(nxAffectedManager);
        nxStatusBar = new NxStatusBar(context, nxAffectedManager);
        gitDiffManager = new GitDiffManager(context);
        gitCommandProvider = new GitCommandProvider(gitDiffManager);
        flipperDetectionManager = new FlipperDetectionManager(context);

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
                statusTracker
            );
            
            // Register webview provider
            context.subscriptions.push(
                vscode.window.registerWebviewViewProvider('aiDebugUtilities', webviewProvider)
            );

            // Register commands
            registerCommands(context, webviewProvider, projectDetector, commandRunner, fileManager, statusTracker, commandCoordinator, pluginManager, pluginMarketplace);
            
            // Register Phase 5 commands
            const nxCommands = nxCommandProvider.register();
            const gitCommands = gitCommandProvider.register();
            context.subscriptions.push(...nxCommands, ...gitCommands);
            
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
    commandCoordinator: CommandCoordinator,
    pluginManager: PluginManager,
    pluginMarketplace: PluginMarketplaceService
) {
    // Open panel command
    const openPanelCommand = vscode.commands.registerCommand('aiDebugUtilities.openPanel', () => {
        webviewProvider.show();
    });

    // Run AI Debug command
    const runAiDebugCommand = vscode.commands.registerCommand('aiDebugUtilities.runAiDebug', async () => {
        const project = await projectDetector.getCurrentProject();
        if (project) {
            await webviewProvider.runCommand('aiDebug', { project: project.name });
        } else {
            vscode.window.showWarningMessage('No NX project detected. Please select a project first.');
        }
    });

    // Run NX Test command
    const runNxTestCommand = vscode.commands.registerCommand('aiDebugUtilities.runNxTest', async () => {
        const project = await projectDetector.getCurrentProject();
        if (project) {
            await webviewProvider.runCommand('nxTest', { project: project.name });
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
        const project = await projectDetector.getCurrentProject();
        if (project) {
            await webviewProvider.runCommand('prepareToPush', { project: project.name });
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

    // Plugin management commands
    const pluginManagerCommand = vscode.commands.registerCommand('aiDebugUtilities.pluginManager', async () => {
        const plugins = pluginManager.getAll();
        const items = plugins.map(plugin => ({
            label: plugin.metadata.name,
            description: plugin.metadata.description,
            detail: `v${plugin.metadata.version} - ${plugin.metadata.author}`,
            plugin
        }));
        
        const selected = await vscode.window.showQuickPick(items, {
            placeHolder: 'Select a plugin to manage',
            canPickMany: false
        });
        
        if (selected) {
            const actions = [
                { label: 'Enable/Disable', action: 'toggle' },
                { label: 'View Details', action: 'details' },
                { label: 'Uninstall', action: 'uninstall' }
            ];
            
            const action = await vscode.window.showQuickPick(actions, {
                placeHolder: `What would you like to do with ${selected.plugin.metadata.name}?`
            });
            
            if (action) {
                switch (action.action) {
                    case 'toggle':
                        if (pluginManager.isEnabled(selected.plugin.metadata.id)) {
                            await pluginManager.disable(selected.plugin.metadata.id);
                            vscode.window.showInformationMessage(`${selected.plugin.metadata.name} disabled`);
                        } else {
                            await pluginManager.enable(selected.plugin.metadata.id);
                            vscode.window.showInformationMessage(`${selected.plugin.metadata.name} enabled`);
                        }
                        break;
                    case 'details':
                        const details = `# ${selected.plugin.metadata.name}\n\n` +
                            `**Version:** ${selected.plugin.metadata.version}\n` +
                            `**Author:** ${selected.plugin.metadata.author}\n` +
                            `**Description:** ${selected.plugin.metadata.description}\n\n` +
                            `**Capabilities:**\n` +
                            selected.plugin.metadata.capabilities.map(cap => `- ${cap.name}: ${cap.description}`).join('\n');
                        
                        const doc = await vscode.workspace.openTextDocument({
                            content: details,
                            language: 'markdown'
                        });
                        await vscode.window.showTextDocument(doc);
                        break;
                    case 'uninstall':
                        const confirm = await vscode.window.showWarningMessage(
                            `Are you sure you want to uninstall ${selected.plugin.metadata.name}?`,
                            { modal: true },
                            'Yes', 'No'
                        );
                        if (confirm === 'Yes') {
                            await pluginManager.unregister(selected.plugin.metadata.id);
                            vscode.window.showInformationMessage(`${selected.plugin.metadata.name} uninstalled`);
                        }
                        break;
                }
            }
        }
    });

    const pluginMarketplaceCommand = vscode.commands.registerCommand('aiDebugUtilities.pluginMarketplace', async () => {
        const query = await vscode.window.showInputBox({
            prompt: 'Search for plugins',
            placeHolder: 'Enter search terms (e.g., "git", "test", "ai")',
            value: ''
        });
        
        if (query !== undefined) {
            const plugins = await pluginMarketplace.searchPlugins(query || '');
            const items = plugins.map(plugin => ({
                label: plugin.name,
                description: plugin.description,
                detail: `v${plugin.version} - ${plugin.author} (${plugin.downloads} downloads, ${plugin.rating}/5 stars)`,
                plugin
            }));
            
            const selected = await vscode.window.showQuickPick(items, {
                placeHolder: 'Select a plugin to install',
                canPickMany: false
            });
            
            if (selected) {
                const actions = [
                    { label: 'Install', action: 'install' },
                    { label: 'View Details', action: 'details' }
                ];
                
                const action = await vscode.window.showQuickPick(actions, {
                    placeHolder: `What would you like to do with ${selected.plugin.name}?`
                });
                
                if (action) {
                    switch (action.action) {
                        case 'install':
                            try {
                                await pluginMarketplace.installPlugin(selected.plugin.id);
                                vscode.window.showInformationMessage(`${selected.plugin.name} installed successfully!`);
                            } catch (error) {
                                vscode.window.showErrorMessage(`Failed to install ${selected.plugin.name}: ${(error as Error).message}`);
                            }
                            break;
                        case 'details':
                            const details = `# ${selected.plugin.name}\n\n` +
                                `**Version:** ${selected.plugin.version}\n` +
                                `**Author:** ${selected.plugin.author}\n` +
                                `**Description:** ${selected.plugin.description}\n` +
                                `**Downloads:** ${selected.plugin.downloads}\n` +
                                `**Rating:** ${selected.plugin.rating}/5\n\n` +
                                `**Tags:** ${selected.plugin.tags.join(', ')}\n\n` +
                                `**README:**\n${selected.plugin.readme}`;
                            
                            const doc = await vscode.workspace.openTextDocument({
                                content: details,
                                language: 'markdown'
                            });
                            await vscode.window.showTextDocument(doc);
                            break;
                    }
                }
            }
        }
    });

    const runPluginCommand = vscode.commands.registerCommand('aiDebugUtilities.runPluginCommand', async () => {
        const plugins = pluginManager.getAll().filter(p => pluginManager.isEnabled(p.metadata.id));
        const commands = plugins.flatMap(plugin => 
            (plugin.commands || []).map(cmd => ({
                label: cmd.title,
                description: cmd.description,
                detail: `Plugin: ${plugin.metadata.name}`,
                pluginId: plugin.metadata.id,
                commandId: cmd.id
            }))
        );
        
        const selected = await vscode.window.showQuickPick(commands, {
            placeHolder: 'Select a plugin command to run',
            canPickMany: false
        });
        
        if (selected) {
            try {
                const result = await pluginManager.executePluginCommand(selected.pluginId, selected.commandId);
                vscode.window.showInformationMessage(`Command executed successfully: ${selected.label}`);
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to execute command: ${(error as Error).message}`);
            }
        }
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
        healthReportCommand,
        pluginManagerCommand,
        pluginMarketplaceCommand,
        runPluginCommand
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
    
    // Clean up plugin system
    if (pluginManager) {
        try {
            const allPlugins = pluginManager.getAll();
            if (allPlugins && Array.isArray(allPlugins)) {
                for (const plugin of allPlugins) {
                    if (plugin?.metadata?.id && pluginManager.isEnabled(plugin.metadata.id)) {
                        pluginManager.disable(plugin.metadata.id).catch(error => {
                            console.error(`Failed to disable plugin ${plugin.metadata.id}:`, error);
                        });
                    }
                }
            }
        } catch (error) {
            console.error('Error during plugin cleanup:', error);
        }
    }
    
    // Clean up Phase 5 Features
    if (nxAffectedManager) {
        nxAffectedManager.dispose();
    }
    if (nxStatusBar) {
        nxStatusBar.dispose();
    }
    if (gitDiffManager) {
        gitDiffManager.dispose();
    }
    if (flipperDetectionManager) {
        flipperDetectionManager.dispose();
    }
}