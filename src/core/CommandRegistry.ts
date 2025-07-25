/**
 * Command Registry for VSCode Extension Commands
 * Part of Phase 1.9.3 refactor - now uses service architecture
 * 
 * Delegates all functionality to appropriate services:
 * - TestMenuOrchestrator for test execution flow
 * - ProjectSelectionService for project management
 * - ConfigurationManager for setup and config
 */

import * as vscode from 'vscode';
import { ServiceContainer } from './ServiceContainer';
import { TestMenuOrchestrator } from '../services/TestMenuOrchestrator';

/**
 * Registry for all extension commands with proper service delegation
 */
export class CommandRegistry {
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
            this.registerRunAffectedTests(),
            this.registerStartFileWatcher(),
            this.registerClearTestCache(),
            this.registerRunSetup(),
            this.registerSelectProject(),
            this.registerShowWorkspaceInfo(),
            this.registerRunAffectedTestsQuick(),
            this.registerRunGitAffected(),
            this.registerRunManualProject(),
            this.registerCreateConfig()
        ];

        return this.commands;
    }

    /**
     * Main command: Run affected tests with auto-detection
     */
    private registerRunAffectedTests(): vscode.Disposable {
        return vscode.commands.registerCommand('aiDebugContext.runAffectedTests', async () => {
            try {
                await this.orchestrator.showMainMenu();
            } catch (error) {
                this.handleCommandError(error, 'runAffectedTests');
            }
        });
    }

    /**
     * Register file watcher command
     */
    private registerStartFileWatcher(): vscode.Disposable {
        return vscode.commands.registerCommand('aiDebugContext.startFileWatcher', async () => {
            try {
                await this.orchestrator.toggleFileWatcher();
            } catch (error) {
                this.handleCommandError(error, 'startFileWatcher');
            }
        });
    }

    /**
     * Register clear cache command
     */
    private registerClearTestCache(): vscode.Disposable {
        return vscode.commands.registerCommand('aiDebugContext.clearTestCache', async () => {
            try {
                await this.orchestrator.clearTestCache();
            } catch (error) {
                this.handleCommandError(error, 'clearTestCache');
            }
        });
    }

    /**
     * Register setup command
     */
    private registerRunSetup(): vscode.Disposable {
        return vscode.commands.registerCommand('aiDebugContext.runSetup', async () => {
            try {
                await this.orchestrator.runSetup();
            } catch (error) {
                this.handleCommandError(error, 'runSetup');
            }
        });
    }

    /**
     * Register project selection command
     */
    private registerSelectProject(): vscode.Disposable {
        return vscode.commands.registerCommand('aiDebugContext.selectProject', async () => {
            try {
                await this.orchestrator.showProjectBrowser();
            } catch (error) {
                this.handleCommandError(error, 'selectProject');
            }
        });
    }

    /**
     * Register workspace info command
     */
    private registerShowWorkspaceInfo(): vscode.Disposable {
        return vscode.commands.registerCommand('aiDebugContext.showWorkspaceInfo', async () => {
            try {
                await this.orchestrator.showWorkspaceInfo();
            } catch (error) {
                this.handleCommandError(error, 'showWorkspaceInfo');
            }
        });
    }

    /**
     * Quick test command (minimal mode)
     */
    private registerRunAffectedTestsQuick(): vscode.Disposable {
        return vscode.commands.registerCommand('aiDebugContext.runAffectedTestsQuick', async () => {
            try {
                await this.orchestrator.runGitAffected();
            } catch (error) {
                this.handleCommandError(error, 'runAffectedTestsQuick');
            }
        });
    }

    /**
     * Git-based affected tests (legacy fallback)
     */
    private registerRunGitAffected(): vscode.Disposable {
        return vscode.commands.registerCommand('aiDebugContext.runGitAffected', async () => {
            try {
                await this.orchestrator.runGitAffected();
            } catch (error) {
                this.handleCommandError(error, 'runGitAffected');
            }
        });
    }

    /**
     * Manual project input command (now uses unified main menu)
     */
    private registerRunManualProject(): vscode.Disposable {
        return vscode.commands.registerCommand('aiDebugContext.runManualProject', async () => {
            try {
                await this.orchestrator.showMainMenu();
            } catch (error) {
                this.handleCommandError(error, 'runManualProject');
            }
        });
    }

    /**
     * Create configuration file command
     */
    private registerCreateConfig(): vscode.Disposable {
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
        this.services.updateStatusBar('❌ Error', 'red');
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