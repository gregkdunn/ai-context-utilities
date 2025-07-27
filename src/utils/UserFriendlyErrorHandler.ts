/**
 * User-Friendly Error Handler
 * Transforms technical errors into actionable user messages
 * Part of Phase 2.0.1 - User Experience Improvements
 */

import * as vscode from 'vscode';

export interface UserFriendlyError {
    message: string;
    action?: string;
    details?: string;
    canRetry?: boolean;
    suggestedFix?: string;
}

/**
 * Centralized error handler that transforms technical errors into user-friendly messages
 */
export class UserFriendlyErrorHandler {
    private static readonly ERROR_PATTERNS = [
        {
            pattern: /fatal: not a git repository/i,
            transform: (): UserFriendlyError => ({
                message: "This isn't a Git repository",
                action: "Initialize Git or open a project with Git",
                suggestedFix: "Run 'git init' in your project folder",
                canRetry: true
            })
        },
        {
            pattern: /no changes added to commit|nothing to commit/i,
            transform: (): UserFriendlyError => ({
                message: "No changes detected",
                action: "Save a file and try again",
                details: "Make some changes to your code first",
                canRetry: true
            })
        },
        {
            pattern: /command not found|'.*' is not recognized/i,
            transform: (error: string): UserFriendlyError => {
                const command = error.match(/'([^']+)'|`([^`]+)`|\\b(\\w+)\\b/)?.[1] || 'command';
                return {
                    message: `${command} is not installed or not in PATH`,
                    action: "Install the required tool",
                    suggestedFix: `Install ${command} and make sure it's in your PATH`,
                    canRetry: true
                };
            }
        },
        {
            pattern: /ENOENT|no such file or directory/i,
            transform: (error: string): UserFriendlyError => {
                const file = error.match(/['"`]([^'"`]+)['"`]/)?.[1] || 'file';
                return {
                    message: `File not found: ${file}`,
                    action: "Check the file path and try again",
                    details: "The file may have been moved or deleted",
                    canRetry: true
                };
            }
        },
        {
            pattern: /EACCES|permission denied/i,
            transform: (): UserFriendlyError => ({
                message: "Permission denied",
                action: "Check file permissions",
                suggestedFix: "You may need to run with different permissions or check file ownership",
                canRetry: true
            })
        },
        {
            pattern: /network|connection|timeout/i,
            transform: (): UserFriendlyError => ({
                message: "Network connection issue",
                action: "Check your internet connection and try again",
                details: "This might be a temporary network problem",
                canRetry: true
            })
        },
        {
            pattern: /test.*failed|spec.*failed/i,
            transform: (error: string): UserFriendlyError => {
                const testCount = error.match(/(\\d+)\\s+failed/)?.[1];
                return {
                    message: testCount ? `${testCount} tests failed` : "Tests failed",
                    action: "Review test failures and fix issues",
                    details: "Check the test output for specific error details",
                    canRetry: true
                };
            }
        },
        {
            pattern: /module not found|cannot resolve module/i,
            transform: (error: string): UserFriendlyError => {
                const module = error.match(/module\\s+['"`]([^'"`]+)['"`]/i)?.[1] || 'module';
                return {
                    message: `Missing dependency: ${module}`,
                    action: "Install the missing package",
                    suggestedFix: `Run 'npm install ${module}' or 'yarn add ${module}'`,
                    canRetry: true
                };
            }
        },
        {
            pattern: /syntax error|unexpected token/i,
            transform: (): UserFriendlyError => ({
                message: "Code syntax error detected",
                action: "Fix the syntax error in your code",
                details: "Check for missing brackets, quotes, or semicolons",
                canRetry: true
            })
        },
        {
            pattern: /port.*already in use|address already in use/i,
            transform: (error: string): UserFriendlyError => {
                const port = error.match(/port\\s+(\\d+)/i)?.[1];
                return {
                    message: port ? `Port ${port} is already in use` : "Port is already in use",
                    action: "Stop the other process or use a different port",
                    suggestedFix: "Try closing other development servers",
                    canRetry: true
                };
            }
        }
    ];

    /**
     * Transform a technical error into a user-friendly message
     */
    static transformError(error: any): UserFriendlyError {
        const errorText = typeof error === 'string' ? error : error?.message || String(error);

        // Try to match against known error patterns
        for (const { pattern, transform } of this.ERROR_PATTERNS) {
            if (pattern.test(errorText)) {
                return transform(errorText);
            }
        }

        // Default transformation for unknown errors
        return {
            message: "Something went wrong",
            action: "Please try again",
            details: this.sanitizeErrorMessage(errorText),
            canRetry: true
        };
    }

    /**
     * Show a user-friendly error message with actions
     */
    static async showError(error: any, context?: string): Promise<void> {
        const friendlyError = this.transformError(error);
        
        const message = context 
            ? `${context}: ${friendlyError.message}`
            : friendlyError.message;

        const actions: string[] = [];
        if (friendlyError.suggestedFix) {
            actions.push('Show Fix');
        }
        if (friendlyError.canRetry) {
            actions.push('Retry');
        }
        actions.push('Dismiss');

        const selection = await vscode.window.showErrorMessage(message, ...actions);

        if (selection === 'Show Fix' && friendlyError.suggestedFix) {
            await vscode.window.showInformationMessage(
                `💡 Suggested fix: ${friendlyError.suggestedFix}`,
                'Got it'
            );
        }
    }

    /**
     * Get actionable error message for display
     */
    static getActionableMessage(error: any, context?: string): string {
        const friendlyError = this.transformError(error);
        
        let message = friendlyError.message;
        if (context) {
            message = `${context}: ${message}`;
        }
        
        if (friendlyError.action) {
            message += `\\n👉 ${friendlyError.action}`;
        }
        
        if (friendlyError.suggestedFix) {
            message += `\\n💡 ${friendlyError.suggestedFix}`;
        }
        
        return message;
    }

    /**
     * Check if an error is user-actionable
     */
    static isUserActionable(error: any): boolean {
        const friendlyError = this.transformError(error);
        return !!(friendlyError.action || friendlyError.suggestedFix);
    }

    /**
     * Get retry-able status
     */
    static canRetry(error: any): boolean {
        const friendlyError = this.transformError(error);
        return friendlyError.canRetry ?? true;
    }

    /**
     * Sanitize error message for user display
     */
    private static sanitizeErrorMessage(errorText: string): string {
        // Remove stack traces
        const withoutStack = errorText.split('\\n')[0];
        
        // Remove common technical prefixes
        return withoutStack
            .replace(/^Error:\\s*/i, '')
            .replace(/^TypeError:\\s*/i, '')
            .replace(/^ReferenceError:\\s*/i, '')
            .replace(/^SyntaxError:\\s*/i, '')
            .replace(/^.*Error:\\s*/i, '')
            .trim();
    }

    /**
     * Create enhanced error with context
     */
    static withContext(error: any, operation: string, details?: Record<string, any>): UserFriendlyError {
        const friendlyError = this.transformError(error);
        
        return {
            ...friendlyError,
            message: `${operation}: ${friendlyError.message}`,
            details: details ? 
                `${friendlyError.details || ''}\\n\\nContext: ${JSON.stringify(details, null, 2)}` : 
                friendlyError.details
        };
    }

    /**
     * Format error for output channel logging
     */
    static formatForLogging(error: any, operation?: string): string {
        const timestamp = new Date().toISOString();
        const friendlyError = this.transformError(error);
        
        const lines = [
            `[${timestamp}] ${operation ? `${operation}: ` : ''}${friendlyError.message}`
        ];
        
        if (friendlyError.details) {
            lines.push(`Details: ${friendlyError.details}`);
        }
        
        if (friendlyError.suggestedFix) {
            lines.push(`Suggested fix: ${friendlyError.suggestedFix}`);
        }
        
        return lines.join('\\n');
    }
}