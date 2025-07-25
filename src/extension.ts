/**
 * AI Debug Context V3 - VSCode Extension
 * Phase 1.8: Clean architecture with dependency injection
 * 
 * This file has been refactored from 1,360+ lines to <50 lines using:
 * - ServiceContainer for dependency injection
 * - CommandRegistry for centralized command management
 * 
 * Core functionality:
 * - Run only affected tests (90% time savings)
 * - Real-time file watching (<2 second feedback)
 * - Guided setup for new users
 * - Clear test cache when needed
 * 
 * @version 3.0.0
 */

import * as vscode from 'vscode';
import { ServiceContainer } from './core/ServiceContainer';
import { CommandRegistry } from './core/CommandRegistry';

let services: ServiceContainer;
let commandRegistry: CommandRegistry;

/**
 * Extension activation entry point
 */
export async function activate(context: vscode.ExtensionContext) {
    try {
        // Get workspace root
        const workspaceRoot = getWorkspaceRoot();
        if (!workspaceRoot) {
            vscode.window.showErrorMessage('AI Debug Context requires an open workspace folder');
            return;
        }

        // Initialize services using dependency injection
        services = await ServiceContainer.create(
            workspaceRoot, 
            context.extensionPath, 
            context
        );

        // Initialize command registry
        commandRegistry = new CommandRegistry(services);
        const commands = commandRegistry.registerAll();
        
        // Register all commands with VS Code
        context.subscriptions.push(...commands);

        // Extension is ready
        services.outputChannel.appendLine('🚀 AI Debug Context V3 activated successfully');
        
    } catch (error) {
        const errorMessage = `Failed to activate AI Debug Context: ${error}`;
        vscode.window.showErrorMessage(errorMessage);
        console.error(errorMessage);
    }
}

/**
 * Extension deactivation
 */
export function deactivate() {
    try {
        commandRegistry?.dispose();
        services?.dispose();
    } catch (error) {
        console.error('Error during deactivation:', error);
    }
}

/**
 * Get the current workspace root path
 */
function getWorkspaceRoot(): string | undefined {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    return workspaceFolders?.[0]?.uri?.fsPath;
}