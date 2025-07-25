/**
 * Refactored Command Registry - Phase 1.9.1
 * Clean, focused command registration using service orchestration
 * Replaces the monolithic CommandRegistry.ts
 */

import * as vscode from 'vscode';
import { ServiceContainer } from './ServiceContainer';
import { TestMenuOrchestrator } from '../services/TestMenuOrchestrator';

/**
 * Lightweight command registry using service orchestration
 */
export class RefactoredCommandRegistry {
    private commands: vscode.Disposable[] = [];
    private orchestrator: TestMenuOrchestrator;

    constructor(private services: ServiceContainer) {
        this.orchestrator = new TestMenuOrchestrator(services);
    }

    /**
     * Register all extension commands
     */
    registerAll(): vscode.Disposable[] {
        this.commands = [
            this.registerMainTestCommand(),
            this.registerQuickTestCommand(),
            this.registerAutoDetectCommand(),
            this.registerGitAffectedCommand(),
            this.registerManualProjectCommand(),
            this.registerFileWatcherCommand(),
            this.registerClearCacheCommand(),
            this.registerSetupCommand(),
            this.registerProjectSelectionCommand(),
            this.registerWorkspaceInfoCommand(),
            this.registerCreateConfigCommand()
        ];

        return this.commands;
    }

    /**
     * Main command: Show unified test menu
     */
    private registerMainTestCommand(): vscode.Disposable {
        return vscode.commands.registerCommand('aiDebugContext.runAffectedTests', async () => {
            try {
                await this.orchestrator.showMainMenu();
            } catch (error) {
                this.handleCommandError(error, 'runAffectedTests');
            }
        });
    }

    /**
     * Quick test command (minimal mode)
     */
    private registerQuickTestCommand(): vscode.Disposable {
        return vscode.commands.registerCommand('aiDebugContext.runAffectedTestsQuick', async () => {
            try {
                await this.orchestrator.runGitAffected();
            } catch (error) {
                this.handleCommandError(error, 'runAffectedTestsQuick');
            }
        });
    }

    /**
     * Auto-detect projects command
     */
    private registerAutoDetectCommand(): vscode.Disposable {
        return vscode.commands.registerCommand('aiDebugContext.runGitAffected', async () => {
            try {
                await this.orchestrator.runAutoDetectProjects();
            } catch (error) {
                this.handleCommandError(error, 'runGitAffected');
            }
        });
    }

    /**
     * Git affected tests command
     */
    private registerGitAffectedCommand(): vscode.Disposable {
        return vscode.commands.registerCommand('aiDebugContext.runGitAffectedOnly', async () => {
            try {
                await this.orchestrator.runGitAffected();
            } catch (error) {
                this.handleCommandError(error, 'runGitAffectedOnly');
            }
        });
    }

    /**
     * Manual project input command
     */
    private registerManualProjectCommand(): vscode.Disposable {
        return vscode.commands.registerCommand('aiDebugContext.runManualProject', async () => {
            try {
                await this.orchestrator.showMainMenu();
            } catch (error) {
                this.handleCommandError(error, 'runManualProject');
            }
        });
    }

    /**
     * File watcher toggle command
     */
    private registerFileWatcherCommand(): vscode.Disposable {
        return vscode.commands.registerCommand('aiDebugContext.startFileWatcher', async () => {
            try {
                await this.orchestrator.toggleFileWatcher();
            } catch (error) {
                this.handleCommandError(error, 'startFileWatcher');
            }
        });
    }

    /**
     * Clear cache command
     */
    private registerClearCacheCommand(): vscode.Disposable {
        return vscode.commands.registerCommand('aiDebugContext.clearTestCache', async () => {
            try {
                await this.orchestrator.clearTestCache();
            } catch (error) {
                this.handleCommandError(error, 'clearTestCache');
            }
        });
    }

    /**
     * Setup wizard command
     */
    private registerSetupCommand(): vscode.Disposable {
        return vscode.commands.registerCommand('aiDebugContext.runSetup', async () => {
            try {
                await this.orchestrator.runSetup();
            } catch (error) {
                this.handleCommandError(error, 'runSetup');
            }
        });
    }

    /**
     * Project selection command
     */
    private registerProjectSelectionCommand(): vscode.Disposable {
        return vscode.commands.registerCommand('aiDebugContext.selectProject', async () => {
            try {
                await this.orchestrator.showProjectBrowser();
            } catch (error) {
                this.handleCommandError(error, 'selectProject');
            }
        });
    }

    /**
     * Workspace info command
     */
    private registerWorkspaceInfoCommand(): vscode.Disposable {
        return vscode.commands.registerCommand('aiDebugContext.showWorkspaceInfo', async () => {
            try {
                await this.orchestrator.showWorkspaceInfo();
            } catch (error) {
                this.handleCommandError(error, 'showWorkspaceInfo');
            }
        });
    }

    /**
     * Create configuration command
     */
    private registerCreateConfigCommand(): vscode.Disposable {
        return vscode.commands.registerCommand('aiDebugContext.createConfig', async () => {
            try {
                await this.orchestrator.createConfig();
            } catch (error) {
                this.handleCommandError(error, 'createConfig');
            }
        });
    }

    /**
     * Centralized error handling
     */
    private handleCommandError(error: any, commandName: string): void {
        const structuredError = this.services.errorHandler.handleError(error, { command: commandName });
        this.services.errorHandler.showUserError(structuredError, vscode);
    }

    /**
     * Dispose all registered commands
     */
    dispose(): void {
        this.commands.forEach(command => command.dispose());
        this.commands = [];
    }
}