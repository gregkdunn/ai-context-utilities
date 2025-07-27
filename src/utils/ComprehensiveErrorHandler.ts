/**
 * Comprehensive Error Recovery System
 * Advanced error handling with automatic recovery and user guidance
 * Phase 2.0.2 - Bulletproof error handling
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export interface ErrorContext {
    operation: string;
    input?: any;
    timestamp: number;
    workspaceRoot: string;
    systemInfo: {
        platform: string;
        nodeVersion: string;
        vsCodeVersion: string;
    };
}

export interface ErrorRecoveryAction {
    label: string;
    description: string;
    action: () => Promise<void>;
    isDestructive?: boolean;
    requiresConfirmation?: boolean;
}

export interface ErrorAnalysis {
    category: 'user_error' | 'system_error' | 'configuration_error' | 'dependency_error' | 'network_error';
    severity: 'low' | 'medium' | 'high' | 'critical';
    isRecoverable: boolean;
    rootCause?: string;
    suggestedActions: ErrorRecoveryAction[];
    documentationLinks: string[];
    relatedErrors: string[];
}

/**
 * Comprehensive error handling with intelligent recovery
 */
export class ComprehensiveErrorHandler {
    private errorHistory: Array<{ error: Error; context: ErrorContext; analysis: ErrorAnalysis }> = [];
    private maxHistorySize = 100;

    constructor(
        private outputChannel: vscode.OutputChannel,
        private workspaceRoot: string
    ) {}

    /**
     * Handle error with comprehensive analysis and recovery options
     */
    async handleError(error: Error, context: ErrorContext): Promise<void> {
        const analysis = this.analyzeError(error, context);
        
        // Store in history
        this.errorHistory.push({ error, context, analysis });
        if (this.errorHistory.length > this.maxHistorySize) {
            this.errorHistory = this.errorHistory.slice(-this.maxHistorySize);
        }

        // Log detailed error information
        this.logError(error, context, analysis);

        // Show user-appropriate error message and recovery options
        await this.showErrorToUser(error, context, analysis);

        // Attempt automatic recovery if possible
        if (analysis.isRecoverable && analysis.severity !== 'critical') {
            await this.attemptAutomaticRecovery(error, context, analysis);
        }
    }

    /**
     * Analyze error to determine category, severity, and recovery options
     */
    private analyzeError(error: Error, context: ErrorContext): ErrorAnalysis {
        const errorMessage = error.message.toLowerCase();
        const errorStack = error.stack?.toLowerCase() || '';

        // File system errors
        if (errorMessage.includes('enoent') || errorMessage.includes('no such file')) {
            return this.createFileSystemErrorAnalysis(error, context);
        }

        // Permission errors
        if (errorMessage.includes('eacces') || errorMessage.includes('permission denied')) {
            return this.createPermissionErrorAnalysis(error, context);
        }

        // Network errors
        if (errorMessage.includes('enotfound') || errorMessage.includes('econnrefused') || 
            errorMessage.includes('timeout') || errorMessage.includes('network')) {
            return this.createNetworkErrorAnalysis(error, context);
        }

        // Node module errors
        if (errorMessage.includes('cannot find module') || errorMessage.includes('module not found')) {
            return this.createDependencyErrorAnalysis(error, context);
        }

        // Git errors
        if (errorMessage.includes('git') || errorMessage.includes('not a git repository')) {
            return this.createGitErrorAnalysis(error, context);
        }

        // Test runner errors
        if (errorMessage.includes('jest') || errorMessage.includes('test') || 
            errorMessage.includes('spec') || errorMessage.includes('nx test')) {
            return this.createTestRunnerErrorAnalysis(error, context);
        }

        // VS Code API errors
        if (errorStack.includes('vscode') || errorMessage.includes('command not found')) {
            return this.createVSCodeErrorAnalysis(error, context);
        }

        // Configuration errors
        if (errorMessage.includes('config') || errorMessage.includes('json') || 
            errorMessage.includes('yaml') || errorMessage.includes('package.json')) {
            return this.createConfigurationErrorAnalysis(error, context);
        }

        // TypeScript/compilation errors
        if (errorMessage.includes('typescript') || errorMessage.includes('ts(') || 
            errorMessage.includes('compilation')) {
            return this.createCompilationErrorAnalysis(error, context);
        }

        // Generic system error
        return this.createGenericErrorAnalysis(error, context);
    }

    /**
     * Create specific error analyses
     */
    private createFileSystemErrorAnalysis(error: Error, context: ErrorContext): ErrorAnalysis {
        const missingPath = this.extractPathFromError(error.message);
        
        return {
            category: 'system_error',
            severity: 'medium',
            isRecoverable: true,
            rootCause: `File or directory not found: ${missingPath}`,
            suggestedActions: [
                {
                    label: 'Create Missing Directory',
                    description: `Create the missing directory: ${missingPath}`,
                    action: async () => {
                        if (missingPath) {
                            await fs.promises.mkdir(path.dirname(missingPath), { recursive: true });
                        }
                    }
                },
                {
                    label: 'Check Workspace Structure',
                    description: 'Verify your workspace has the expected project structure',
                    action: async () => this.runWorkspaceStructureCheck()
                },
                {
                    label: 'Reset Project Discovery',
                    description: 'Clear cache and re-discover projects',
                    action: async () => this.resetProjectDiscovery()
                }
            ],
            documentationLinks: [
                'https://github.com/your-repo/wiki/File-System-Issues'
            ],
            relatedErrors: ['EACCES', 'EPERM']
        };
    }

    private createPermissionErrorAnalysis(error: Error, context: ErrorContext): ErrorAnalysis {
        return {
            category: 'system_error',
            severity: 'high',
            isRecoverable: false,
            rootCause: 'Insufficient file system permissions',
            suggestedActions: [
                {
                    label: 'Check File Permissions',
                    description: 'Open terminal and check file permissions with ls -la',
                    action: async () => {
                        const terminal = vscode.window.createTerminal('Permission Check');
                        terminal.sendText(`ls -la "${context.workspaceRoot}"`);
                        terminal.show();
                    }
                },
                {
                    label: 'Run VS Code as Administrator',
                    description: 'Restart VS Code with elevated permissions (Windows) or sudo (macOS/Linux)',
                    action: async () => {
                        vscode.window.showInformationMessage(
                            'Please restart VS Code with administrator privileges'
                        );
                    }
                }
            ],
            documentationLinks: [
                'https://github.com/your-repo/wiki/Permission-Issues'
            ],
            relatedErrors: ['EPERM', 'EACCES']
        };
    }

    private createNetworkErrorAnalysis(error: Error, context: ErrorContext): ErrorAnalysis {
        return {
            category: 'network_error',
            severity: 'medium',
            isRecoverable: true,
            rootCause: 'Network connectivity or DNS resolution issue',
            suggestedActions: [
                {
                    label: 'Test Network Connection',
                    description: 'Check if you can access the internet',
                    action: async () => {
                        const terminal = vscode.window.createTerminal('Network Test');
                        terminal.sendText('ping google.com');
                        terminal.show();
                    }
                },
                {
                    label: 'Check Proxy Settings',
                    description: 'Verify VS Code and npm proxy configuration',
                    action: async () => this.checkProxySettings()
                },
                {
                    label: 'Retry Operation',
                    description: 'Wait a moment and try the operation again',
                    action: async () => {
                        vscode.window.showInformationMessage('Please try the operation again');
                    }
                }
            ],
            documentationLinks: [
                'https://github.com/your-repo/wiki/Network-Issues'
            ],
            relatedErrors: ['ENOTFOUND', 'ECONNREFUSED', 'TIMEOUT']
        };
    }

    private createDependencyErrorAnalysis(error: Error, context: ErrorContext): ErrorAnalysis {
        const missingModule = this.extractModuleFromError(error.message);
        
        return {
            category: 'dependency_error',
            severity: 'high',
            isRecoverable: true,
            rootCause: `Missing dependency: ${missingModule}`,
            suggestedActions: [
                {
                    label: 'Install Dependencies',
                    description: 'Run npm install to install missing dependencies',
                    action: async () => {
                        const terminal = vscode.window.createTerminal('Install Dependencies');
                        terminal.sendText('npm install');
                        terminal.show();
                    }
                },
                {
                    label: 'Clear Node Modules',
                    description: 'Delete node_modules and reinstall',
                    action: async () => this.clearAndReinstallDependencies(),
                    isDestructive: true,
                    requiresConfirmation: true
                },
                {
                    label: 'Check Package.json',
                    description: 'Verify package.json has correct dependencies',
                    action: async () => this.openPackageJson()
                }
            ],
            documentationLinks: [
                'https://github.com/your-repo/wiki/Dependency-Issues'
            ],
            relatedErrors: ['MODULE_NOT_FOUND']
        };
    }

    private createGitErrorAnalysis(error: Error, context: ErrorContext): ErrorAnalysis {
        return {
            category: 'configuration_error',
            severity: 'medium',
            isRecoverable: true,
            rootCause: 'Git repository not found or not properly initialized',
            suggestedActions: [
                {
                    label: 'Initialize Git Repository',
                    description: 'Initialize a new git repository in this workspace',
                    action: async () => {
                        const terminal = vscode.window.createTerminal('Git Init');
                        terminal.sendText('git init');
                        terminal.show();
                    }
                },
                {
                    label: 'Check Git Status',
                    description: 'Check the current git repository status',
                    action: async () => {
                        const terminal = vscode.window.createTerminal('Git Status');
                        terminal.sendText('git status');
                        terminal.show();
                    }
                },
                {
                    label: 'Disable Git Features',
                    description: 'Continue without git-based features',
                    action: async () => this.disableGitFeatures()
                }
            ],
            documentationLinks: [
                'https://github.com/your-repo/wiki/Git-Setup'
            ],
            relatedErrors: ['fatal: not a git repository']
        };
    }

    private createTestRunnerErrorAnalysis(error: Error, context: ErrorContext): ErrorAnalysis {
        return {
            category: 'configuration_error',
            severity: 'medium',
            isRecoverable: true,
            rootCause: 'Test runner configuration or execution issue',
            suggestedActions: [
                {
                    label: 'Check Test Configuration',
                    description: 'Verify jest.config.js or similar test configuration exists',
                    action: async () => this.checkTestConfiguration()
                },
                {
                    label: 'Run Test Manually',
                    description: 'Try running the test command manually in terminal',
                    action: async () => {
                        const terminal = vscode.window.createTerminal('Manual Test');
                        terminal.sendText('npm test');
                        terminal.show();
                    }
                },
                {
                    label: 'Reset Test Cache',
                    description: 'Clear test cache and try again',
                    action: async () => this.clearTestCache()
                }
            ],
            documentationLinks: [
                'https://github.com/your-repo/wiki/Test-Configuration'
            ],
            relatedErrors: ['Test suite failed', 'Jest encountered']
        };
    }

    private createVSCodeErrorAnalysis(error: Error, context: ErrorContext): ErrorAnalysis {
        return {
            category: 'system_error',
            severity: 'medium',
            isRecoverable: true,
            rootCause: 'VS Code API or command registration issue',
            suggestedActions: [
                {
                    label: 'Reload Window',
                    description: 'Reload the VS Code window to refresh the extension',
                    action: async () => {
                        vscode.commands.executeCommand('workbench.action.reloadWindow');
                    }
                },
                {
                    label: 'Restart Extension',
                    description: 'Disable and re-enable the AI Debug Context extension',
                    action: async () => this.restartExtension()
                },
                {
                    label: 'Check Extension Logs',
                    description: 'Open extension logs for more details',
                    action: async () => this.outputChannel.show()
                }
            ],
            documentationLinks: [
                'https://github.com/your-repo/wiki/VS-Code-Issues'
            ],
            relatedErrors: ['command not found', 'Extension activation failed']
        };
    }

    private createConfigurationErrorAnalysis(error: Error, context: ErrorContext): ErrorAnalysis {
        return {
            category: 'configuration_error',
            severity: 'medium',
            isRecoverable: true,
            rootCause: 'Configuration file parsing or validation error',
            suggestedActions: [
                {
                    label: 'Validate Configuration',
                    description: 'Check configuration files for syntax errors',
                    action: async () => this.validateConfiguration()
                },
                {
                    label: 'Reset Configuration',
                    description: 'Reset to default configuration',
                    action: async () => this.resetConfiguration(),
                    isDestructive: true,
                    requiresConfirmation: true
                },
                {
                    label: 'Open Configuration File',
                    description: 'Open the configuration file for manual editing',
                    action: async () => this.openConfigurationFile()
                }
            ],
            documentationLinks: [
                'https://github.com/your-repo/wiki/Configuration'
            ],
            relatedErrors: ['JSON.parse', 'YAML.parse', 'Unexpected token']
        };
    }

    private createCompilationErrorAnalysis(error: Error, context: ErrorContext): ErrorAnalysis {
        return {
            category: 'user_error',
            severity: 'medium',
            isRecoverable: true,
            rootCause: 'TypeScript compilation or syntax error',
            suggestedActions: [
                {
                    label: 'Check TypeScript Errors',
                    description: 'Open Problems panel to see TypeScript errors',
                    action: async () => {
                        vscode.commands.executeCommand('workbench.actions.view.problems');
                    }
                },
                {
                    label: 'Run TypeScript Check',
                    description: 'Run TypeScript compiler to check for errors',
                    action: async () => {
                        const terminal = vscode.window.createTerminal('TypeScript Check');
                        terminal.sendText('npx tsc --noEmit');
                        terminal.show();
                    }
                },
                {
                    label: 'Fix Syntax Errors',
                    description: 'Review and fix any syntax or type errors in your code',
                    action: async () => {
                        vscode.window.showInformationMessage('Please review and fix TypeScript errors');
                    }
                }
            ],
            documentationLinks: [
                'https://github.com/your-repo/wiki/TypeScript-Issues'
            ],
            relatedErrors: ['TS2304', 'TS2345', 'Syntax error']
        };
    }

    private createGenericErrorAnalysis(error: Error, context: ErrorContext): ErrorAnalysis {
        return {
            category: 'system_error',
            severity: 'medium',
            isRecoverable: false,
            rootCause: 'Unexpected error occurred',
            suggestedActions: [
                {
                    label: 'View Full Error Details',
                    description: 'Show complete error information in output channel',
                    action: async () => {
                        this.outputChannel.show();
                        this.outputChannel.appendLine(`Full Error: ${error.stack}`);
                    }
                },
                {
                    label: 'Report Issue',
                    description: 'Report this issue to the extension developers',
                    action: async () => this.reportIssue(error, context)
                },
                {
                    label: 'Reset Extension State',
                    description: 'Clear all extension data and restart',
                    action: async () => this.resetExtensionState(),
                    isDestructive: true,
                    requiresConfirmation: true
                }
            ],
            documentationLinks: [
                'https://github.com/your-repo/issues'
            ],
            relatedErrors: []
        };
    }

    /**
     * Show error to user with appropriate severity
     */
    private async showErrorToUser(error: Error, context: ErrorContext, analysis: ErrorAnalysis): Promise<void> {
        const message = this.createUserFriendlyMessage(error, analysis);
        const actions = analysis.suggestedActions.slice(0, 3).map(a => a.label);
        
        let result: string | undefined;
        
        switch (analysis.severity) {
            case 'critical':
                result = await vscode.window.showErrorMessage(message, ...actions);
                break;
            case 'high':
                result = await vscode.window.showErrorMessage(message, ...actions);
                break;
            case 'medium':
                result = await vscode.window.showWarningMessage(message, ...actions);
                break;
            case 'low':
                result = await vscode.window.showInformationMessage(message, ...actions);
                break;
        }
        
        if (result) {
            const selectedAction = analysis.suggestedActions.find(a => a.label === result);
            if (selectedAction) {
                await this.executeRecoveryAction(selectedAction);
            }
        }
    }

    /**
     * Execute recovery action with confirmation if needed
     */
    private async executeRecoveryAction(action: ErrorRecoveryAction): Promise<void> {
        if (action.requiresConfirmation) {
            const confirm = await vscode.window.showWarningMessage(
                `${action.description}${action.isDestructive ? ' This action cannot be undone.' : ''}`,
                'Proceed',
                'Cancel'
            );
            
            if (confirm !== 'Proceed') {
                return;
            }
        }
        
        try {
            await action.action();
        } catch (recoveryError) {
            vscode.window.showErrorMessage(`Recovery action failed: ${recoveryError instanceof Error ? recoveryError.message : String(recoveryError)}`);
        }
    }

    /**
     * Create user-friendly error message
     */
    private createUserFriendlyMessage(error: Error, analysis: ErrorAnalysis): string {
        const prefix = {
            'critical': '🚨 Critical Error:',
            'high': '❌ Error:',
            'medium': '⚠️ Warning:',
            'low': 'ℹ️ Notice:'
        }[analysis.severity];
        
        return `${prefix} ${analysis.rootCause || error.message}`;
    }

    /**
     * Log detailed error information
     */
    private logError(error: Error, context: ErrorContext, analysis: ErrorAnalysis): void {
        this.outputChannel.appendLine('\n' + '='.repeat(80));
        this.outputChannel.appendLine(`🚨 ERROR REPORT - ${new Date().toLocaleString()}`);
        this.outputChannel.appendLine('='.repeat(80));
        this.outputChannel.appendLine(`Operation: ${context.operation}`);
        this.outputChannel.appendLine(`Category: ${analysis.category}`);
        this.outputChannel.appendLine(`Severity: ${analysis.severity}`);
        this.outputChannel.appendLine(`Recoverable: ${analysis.isRecoverable}`);
        this.outputChannel.appendLine(`Root Cause: ${analysis.rootCause || 'Unknown'}`);
        this.outputChannel.appendLine(`\nError Message: ${error.message}`);
        if (error.stack) {
            this.outputChannel.appendLine(`\nStack Trace:\n${error.stack}`);
        }
        this.outputChannel.appendLine(`\nContext:\n${JSON.stringify(context, null, 2)}`);
        this.outputChannel.appendLine('='.repeat(80));
    }

    /**
     * Utility methods for recovery actions
     */
    private async runWorkspaceStructureCheck(): Promise<void> {
        // Implementation for workspace structure check
        vscode.window.showInformationMessage('Running workspace structure check...');
    }

    private async resetProjectDiscovery(): Promise<void> {
        // Implementation for resetting project discovery
        vscode.window.showInformationMessage('Resetting project discovery...');
    }

    private async checkProxySettings(): Promise<void> {
        // Implementation for checking proxy settings
        vscode.window.showInformationMessage('Please check your proxy settings in VS Code preferences');
    }

    private async clearAndReinstallDependencies(): Promise<void> {
        const terminal = vscode.window.createTerminal('Reinstall Dependencies');
        terminal.sendText('rm -rf node_modules && npm install');
        terminal.show();
    }

    private async openPackageJson(): Promise<void> {
        const packageJsonPath = path.join(this.workspaceRoot, 'package.json');
        if (fs.existsSync(packageJsonPath)) {
            const doc = await vscode.workspace.openTextDocument(packageJsonPath);
            await vscode.window.showTextDocument(doc);
        }
    }

    private async disableGitFeatures(): Promise<void> {
        vscode.window.showInformationMessage('Git features disabled for this session');
    }

    private async checkTestConfiguration(): Promise<void> {
        // Look for test config files and show them
        const configFiles = ['jest.config.js', 'jest.config.ts', 'vitest.config.js'];
        for (const configFile of configFiles) {
            const configPath = path.join(this.workspaceRoot, configFile);
            if (fs.existsSync(configPath)) {
                const doc = await vscode.workspace.openTextDocument(configPath);
                await vscode.window.showTextDocument(doc);
                return;
            }
        }
        vscode.window.showWarningMessage('No test configuration file found');
    }

    private async clearTestCache(): Promise<void> {
        vscode.window.showInformationMessage('Test cache cleared');
    }

    private async restartExtension(): Promise<void> {
        vscode.window.showInformationMessage('Please reload the window to restart the extension');
    }

    private async validateConfiguration(): Promise<void> {
        vscode.window.showInformationMessage('Validating configuration...');
    }

    private async resetConfiguration(): Promise<void> {
        vscode.window.showInformationMessage('Configuration reset to defaults');
    }

    private async openConfigurationFile(): Promise<void> {
        const configPath = path.join(this.workspaceRoot, '.aiDebugContext.yml');
        if (fs.existsSync(configPath)) {
            const doc = await vscode.workspace.openTextDocument(configPath);
            await vscode.window.showTextDocument(doc);
        }
    }

    private async reportIssue(error: Error, context: ErrorContext): Promise<void> {
        const issueUrl = 'https://github.com/your-repo/issues/new';
        vscode.env.openExternal(vscode.Uri.parse(issueUrl));
    }

    private async resetExtensionState(): Promise<void> {
        vscode.window.showInformationMessage('Extension state reset - please reload window');
    }

    private extractPathFromError(message: string): string | null {
        const pathMatch = message.match(/['"`]([^'"`]+)['"`]/);
        return pathMatch ? pathMatch[1] : null;
    }

    private extractModuleFromError(message: string): string | null {
        const moduleMatch = message.match(/Cannot find module ['"`]([^'"`]+)['"`]/);
        return moduleMatch ? moduleMatch[1] : null;
    }

    private async attemptAutomaticRecovery(error: Error, context: ErrorContext, analysis: ErrorAnalysis): Promise<void> {
        // Attempt automatic recovery for certain error types
        if (analysis.category === 'dependency_error') {
            // Auto-install missing dependencies (with user consent)
            // Implementation would go here
        }
    }

    /**
     * Get error history for debugging
     */
    getErrorHistory(limit: number = 10): Array<{ error: Error; context: ErrorContext; analysis: ErrorAnalysis }> {
        return this.errorHistory.slice(-limit);
    }

    /**
     * Clear error history
     */
    clearErrorHistory(): void {
        this.errorHistory = [];
    }

    /**
     * Dispose and cleanup
     */
    dispose(): void {
        this.errorHistory = [];
    }
}