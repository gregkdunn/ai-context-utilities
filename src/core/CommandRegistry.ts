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
            this.registerRunSetup(),
            this.registerShowWorkspaceInfo(),
            this.registerRunGitAffected(),
            this.registerRerunProjectTests(),
            this.registerAddCopilotInstructionContexts(),
            this.registerPrepareToPush(),
            this.registerGeneratePRDescription()
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

    // Removed unused commands: startFileWatcher, clearTestCache

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


    // Removed unused commands: selectProject, openContextBrowser

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
     * Git-based affected tests
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

    // Removed unused command: createConfig

    /**
     * Re-run project tests based on current context
     */
    private registerRerunProjectTests(): vscode.Disposable {
        return vscode.commands.registerCommand('aiDebugContext.rerunProjectTests', async () => {
            try {
                await this.orchestrator.rerunProjectTestsFromContext();
            } catch (error) {
                this.handleCommandError(error, 'rerunProjectTests');
            }
        });
    }

    /**
     * Register add Copilot instruction contexts command
     * Phase 3.5.0 - Automated Copilot instruction generation
     */
    private registerAddCopilotInstructionContexts(): vscode.Disposable {
        return vscode.commands.registerCommand('aiDebugContext.addCopilotInstructionContexts', async () => {
            try {
                // Lazy load the module to avoid impacting extension startup
                const { CopilotInstructionsModule } = await import('../modules/copilotInstructions/CopilotInstructionsModule');
                const module = new CopilotInstructionsModule(this.services, this.services.outputChannel);
                await module.addCopilotInstructionContexts();
            } catch (error) {
                this.handleCommandError(error, 'addCopilotInstructionContexts');
            }
        });
    }

    /**
     * Prepare to push - run tests and checks before pushing
     */
    private registerPrepareToPush(): vscode.Disposable {
        return vscode.commands.registerCommand('aiDebugContext.prepareToPush', async () => {
            try {
                await this.orchestrator.prepareToPush();
            } catch (error) {
                this.handleCommandError(error, 'prepareToPush');
            }
        });
    }

    /**
     * Generate PR description based on changes
     */
    private registerGeneratePRDescription(): vscode.Disposable {
        return vscode.commands.registerCommand('aiDebugContext.generatePRDescription', async () => {
            try {
                await this.orchestrator.generatePRDescription();
            } catch (error) {
                this.handleCommandError(error, 'generatePRDescription');
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