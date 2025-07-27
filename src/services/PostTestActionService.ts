/**
 * Post Test Action Service
 * Handles post-test actions based on test results
 * Part of Phase 2.0 - Git Diff & Post-Test Intelligence
 */

import * as vscode from 'vscode';
import { ServiceContainer } from '../core/ServiceContainer';
import { TestResult } from './TestExecutionService';
import { ContextCompiler, ContextType } from '../modules/aiContext/ContextCompiler';

export interface PostTestAction {
    label: string;
    description: string;
    icon: string;
    action: () => Promise<void>;
}

/**
 * Service for handling post-test actions
 */
export class PostTestActionService {
    private contextCompiler: ContextCompiler;
    private lastTestRequest: any = null;

    constructor(private services: ServiceContainer) {
        this.contextCompiler = new ContextCompiler({
            workspaceRoot: services.workspaceRoot,
            outputChannel: services.outputChannel
        });
    }

    /**
     * Show post-test actions based on test result
     */
    async showPostTestActions(result: TestResult, request: any): Promise<void> {
        this.lastTestRequest = request; // Store for rerun
        
        const actions = result.success 
            ? this.getSuccessActions() 
            : this.getFailureActions();

        const items = actions.map(action => ({
            label: `${action.icon} ${action.label}`,
            detail: action.description,
            action: action.action
        }));

        // Add separator
        items.push({
            label: '',
            kind: vscode.QuickPickItemKind.Separator
        } as any);

        // Add dismiss option
        items.push({
            label: '$(close) Dismiss',
            detail: 'Close this menu',
            action: async () => {} // No-op
        });

        const selection = await vscode.window.showQuickPick(items, {
            placeHolder: result.success ? 'Tests passed! What next?' : 'Tests failed. How can I help?',
            title: `Test ${result.success ? 'Success' : 'Failure'} Actions`
        });

        if (selection && selection.action) {
            await selection.action();
        }
    }

    /**
     * Get actions for test failures
     */
    private getFailureActions(): PostTestAction[] {
        return [
            {
                label: 'AI Debug',
                description: 'Get AI help to fix failing tests',
                icon: '$(hubot)',
                action: () => this.handleAIDebug()
            },
            {
                label: 'Rerun Tests',
                description: 'Run the same tests again',
                icon: '$(sync)',
                action: () => this.handleRerunTests()
            },
            {
                label: 'Test Watch',
                description: 'Toggle automatic test rerun on file changes',
                icon: '$(eye)',
                action: () => this.handleTestWatch()
            }
        ];
    }

    /**
     * Get actions for test successes
     */
    private getSuccessActions(): PostTestAction[] {
        return [
            {
                label: 'New Test Recommendations',
                description: 'Get AI suggestions for additional tests',
                icon: '$(beaker)',
                action: () => this.handleNewTestRecommendations()
            },
            {
                label: 'PR Description',
                description: 'Generate pull request description',
                icon: '$(git-pull-request)',
                action: () => this.handlePRDescription()
            }
        ];
    }

    /**
     * Handle AI Debug action
     */
    private async handleAIDebug(): Promise<void> {
        try {
            this.services.updateStatusBar('Compiling debug context...', 'yellow');
            
            const context = await this.contextCompiler.compileContext('debug', false);
            if (!context) {
                vscode.window.showErrorMessage('Failed to compile debug context');
                return;
            }

            await this.contextCompiler.copyToClipboard(context);
            
            // Try to open Copilot Chat
            const opened = await this.openCopilotChat();
            
            if (opened) {
                vscode.window.showInformationMessage(
                    'Debug context copied! Paste it in Copilot Chat for AI assistance.',
                    'OK'
                );
            } else {
                const choice = await vscode.window.showInformationMessage(
                    'Debug context copied to clipboard! Open Copilot Chat to paste and get AI assistance.',
                    'Open Copilot Chat',
                    'OK'
                );
                
                if (choice === 'Open Copilot Chat') {
                    await vscode.commands.executeCommand('github.copilot.openChat');
                }
            }
            
            this.services.updateStatusBar('Debug context ready');
        } catch (error) {
            this.services.errorHandler.handleError(error as Error, { operation: 'handleAIDebug' });
        }
    }

    /**
     * Handle rerun tests action
     */
    private async handleRerunTests(): Promise<void> {
        if (!this.lastTestRequest) {
            vscode.window.showErrorMessage('No previous test to rerun');
            return;
        }

        try {
            await vscode.commands.executeCommand('aiDebugContext.runAffectedTests');
        } catch (error) {
            this.services.errorHandler.handleError(error as Error, { operation: 'handleRerunTests' });
        }
    }

    /**
     * Handle test watch toggle
     */
    private async handleTestWatch(): Promise<void> {
        try {
            await vscode.commands.executeCommand('aiDebugContext.startFileWatcher');
        } catch (error) {
            this.services.errorHandler.handleError(error as Error, { operation: 'handleTestWatch' });
        }
    }

    /**
     * Handle new test recommendations
     */
    private async handleNewTestRecommendations(): Promise<void> {
        try {
            this.services.updateStatusBar('Compiling test recommendations context...', 'yellow');
            
            const context = await this.contextCompiler.compileContext('new-tests', true);
            if (!context) {
                vscode.window.showErrorMessage('Failed to compile test recommendations context');
                return;
            }

            await this.contextCompiler.copyToClipboard(context);
            
            const opened = await this.openCopilotChat();
            
            const message = opened 
                ? 'Context copied! Paste it in Copilot Chat for test recommendations.'
                : 'Context copied to clipboard! Open Copilot Chat to get test recommendations.';
                
            vscode.window.showInformationMessage(message, 'OK');
            
            this.services.updateStatusBar('Test recommendations ready');
        } catch (error) {
            this.services.errorHandler.handleError(error as Error, { operation: 'handleNewTestRecommendations' });
        }
    }

    /**
     * Handle PR description generation
     */
    private async handlePRDescription(): Promise<void> {
        try {
            this.services.updateStatusBar('Compiling PR description context...', 'yellow');
            
            const context = await this.contextCompiler.compileContext('pr-description', true);
            if (!context) {
                vscode.window.showErrorMessage('Failed to compile PR description context');
                return;
            }

            await this.contextCompiler.copyToClipboard(context);
            
            const opened = await this.openCopilotChat();
            
            const message = opened
                ? 'Context copied! Paste it in Copilot Chat to generate PR description.'
                : 'Context copied to clipboard! Open Copilot Chat to generate PR description.';
                
            vscode.window.showInformationMessage(message, 'OK');
            
            this.services.updateStatusBar('PR description context ready');
        } catch (error) {
            this.services.errorHandler.handleError(error as Error, { operation: 'handlePRDescription' });
        }
    }

    /**
     * Try to open Copilot Chat
     */
    private async openCopilotChat(): Promise<boolean> {
        try {
            // Try to open Copilot Chat
            await vscode.commands.executeCommand('github.copilot.openChat');
            return true;
        } catch {
            // Command might not be available
            return false;
        }
    }

    /**
     * Clear all context files
     */
    async clearContext(): Promise<void> {
        await this.contextCompiler.clearContext();
    }
}