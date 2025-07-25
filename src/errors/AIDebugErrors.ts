/**
 * AI Debug Context - Comprehensive Error System
 * 
 * Provides structured error handling with actionable error messages,
 * error classification, and user guidance for resolution.
 * 
 * @version 3.0.0
 */

/**
 * Base error class for all AI Debug Context errors
 */
export abstract class AIDebugError extends Error {
    public readonly code: string;
    public readonly category: ErrorCategory;
    public readonly userMessage: string;
    public readonly resolution: string;
    public readonly context?: Record<string, any>;

    constructor(
        message: string,
        code: string,
        category: ErrorCategory,
        userMessage: string,
        resolution: string,
        context?: Record<string, any>
    ) {
        super(message);
        this.name = this.constructor.name;
        this.code = code;
        this.category = category;
        this.userMessage = userMessage;
        this.resolution = resolution;
        this.context = context;
        
        // Maintains proper stack trace for where our error was thrown
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        }
    }

    /**
     * Get a structured error report for logging
     */
    getErrorReport(): ErrorReport {
        return {
            code: this.code,
            category: this.category,
            message: this.message,
            userMessage: this.userMessage,
            resolution: this.resolution,
            context: this.context,
            stack: this.stack,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Get user-friendly error display message
     */
    getUserDisplayMessage(): string {
        return `${this.userMessage}\n\n💡 Solution: ${this.resolution}`;
    }
}

/**
 * Error categories for classification
 */
export enum ErrorCategory {
    SHELL_SCRIPT = 'shell_script',
    FILE_SYSTEM = 'file_system',
    TEST_EXECUTION = 'test_execution',
    AI_INTEGRATION = 'ai_integration',
    CONFIGURATION = 'configuration',
    NETWORK = 'network',
    PERMISSION = 'permission',
    VALIDATION = 'validation',
    INTERNAL = 'internal'
}

/**
 * Structured error report
 */
export interface ErrorReport {
    code: string;
    category: ErrorCategory;
    message: string;
    userMessage: string;
    resolution: string;
    context?: Record<string, any>;
    stack?: string;
    timestamp: string;
}

/**
 * Shell script execution errors
 */
export class ShellScriptError extends AIDebugError {
    constructor(
        scriptName: string,
        exitCode: number,
        stderr: string,
        context?: Record<string, any>
    ) {
        const code = `SHELL_${exitCode}`;
        let userMessage: string;
        let resolution: string;

        // Classify based on exit code and stderr
        if (exitCode === 127) {
            userMessage = `Script '${scriptName}' not found or not executable`;
            resolution = `1. Check if script exists at expected location\n2. Run 'chmod +x ${scriptName}' to make executable\n3. Verify script path in settings`;
        } else if (exitCode === 126) {
            userMessage = `Script '${scriptName}' found but cannot be executed`;
            resolution = `1. Run 'chmod +x ${scriptName}' to add execute permission\n2. Check file ownership and permissions\n3. Verify shell interpreter (#!/bin/bash)`;
        } else if (stderr.includes('git') && stderr.includes('not a git repository')) {
            userMessage = 'Not in a git repository - affected tests detection requires git';
            resolution = `1. Navigate to your project root directory\n2. Run 'git init' if this is a new project\n3. Ensure you're in the correct workspace folder`;
        } else if (stderr.includes('jest') || stderr.includes('npm test')) {
            userMessage = 'Test execution failed - check your test configuration';
            resolution = `1. Verify Jest is installed: 'npm list jest'\n2. Check jest.config.js exists and is valid\n3. Run 'npm test' manually to see detailed errors`;
        } else if (stderr.includes('timeout')) {
            userMessage = 'Script execution timed out';
            resolution = `1. Check for infinite loops in your tests\n2. Increase timeout in settings\n3. Run fewer tests at once`;
        } else {
            userMessage = `Script '${scriptName}' failed with exit code ${exitCode}`;
            resolution = `1. Check the error details below\n2. Run the script manually: ./${scriptName}\n3. Check script logs for more information`;
        }

        super(
            `Shell script '${scriptName}' failed: ${stderr}`,
            code,
            ErrorCategory.SHELL_SCRIPT,
            userMessage,
            resolution,
            { scriptName, exitCode, stderr, ...context }
        );
    }
}

/**
 * File system operation errors
 */
export class FileSystemError extends AIDebugError {
    constructor(
        operation: string,
        filePath: string,
        originalError: Error,
        context?: Record<string, any>
    ) {
        const code = `FS_${operation.toUpperCase()}`;
        let userMessage: string;
        let resolution: string;

        if (originalError.message.includes('ENOENT')) {
            userMessage = `File or directory not found: ${filePath}`;
            resolution = `1. Check if the path exists and is correct\n2. Verify workspace folder is set properly\n3. Check for typos in file path`;
        } else if (originalError.message.includes('EACCES')) {
            userMessage = `Permission denied accessing: ${filePath}`;
            resolution = `1. Check file/directory permissions\n2. Run with appropriate user privileges\n3. Verify VSCode has access to the workspace`;
        } else if (originalError.message.includes('ENOTDIR')) {
            userMessage = `Expected directory but found file: ${filePath}`;
            resolution = `1. Check if the path should point to a directory\n2. Verify parent directory structure\n3. Check for naming conflicts`;
        } else {
            userMessage = `File system operation '${operation}' failed on: ${filePath}`;
            resolution = `1. Check file/directory permissions\n2. Verify path exists and is accessible\n3. Check available disk space`;
        }

        super(
            `File system ${operation} failed: ${originalError.message}`,
            code,
            ErrorCategory.FILE_SYSTEM,
            userMessage,
            resolution,
            { operation, filePath, originalError: originalError.message, ...context }
        );
    }
}

/**
 * Test execution errors
 */
export class TestExecutionError extends AIDebugError {
    constructor(
        phase: string,
        testFiles?: string[],
        originalError?: Error,
        context?: Record<string, any>
    ) {
        const code = `TEST_${phase.toUpperCase()}`;
        let userMessage: string;
        let resolution: string;

        if (phase === 'PARSE') {
            userMessage = 'Failed to parse test results - output format may have changed';
            resolution = `1. Check if Jest version is compatible\n2. Verify jest.config.js settings\n3. Run tests manually to check output format`;
        } else if (phase === 'TIMEOUT') {
            userMessage = 'Test execution timed out';
            resolution = `1. Check for infinite loops in tests\n2. Increase test timeout in jest.config.js\n3. Run fewer tests at once with --maxWorkers=1`;
        } else if (phase === 'COVERAGE') {
            userMessage = 'Test coverage requirements not met';
            resolution = `1. Add tests for uncovered code paths\n2. Check coverage thresholds in jest.config.js\n3. Use --coverage flag to see detailed report`;
        } else {
            userMessage = `Test execution failed during ${phase}`;
            resolution = `1. Check test files for syntax errors\n2. Verify all dependencies are installed\n3. Run 'npm test' manually to see full output`;
        }

        super(
            `Test execution failed during ${phase}: ${originalError?.message || 'Unknown error'}`,
            code,
            ErrorCategory.TEST_EXECUTION,
            userMessage,
            resolution,
            { phase, testFiles, originalError: originalError?.message, ...context }
        );
    }
}

/**
 * AI integration errors
 */
export class AIIntegrationError extends AIDebugError {
    constructor(
        service: string,
        operation: string,
        originalError?: Error,
        context?: Record<string, any>
    ) {
        const code = `AI_${service.toUpperCase()}_${operation.toUpperCase()}`;
        let userMessage: string;
        let resolution: string;

        if (service.toLowerCase().includes('copilot')) {
            if (operation === 'AUTH') {
                userMessage = 'GitHub Copilot authentication failed';
                resolution = `1. Sign in to GitHub Copilot in VSCode\n2. Check Copilot subscription status\n3. Restart VSCode and try again`;
            } else if (operation === 'REQUEST') {
                userMessage = 'GitHub Copilot request failed - service may be unavailable';
                resolution = `1. Check internet connection\n2. Verify Copilot service status\n3. Try again in a few minutes`;
            } else {
                userMessage = `GitHub Copilot ${operation} failed`;
                resolution = `1. Check Copilot extension is installed and enabled\n2. Verify authentication status\n3. Check VSCode command palette for Copilot commands`;
            }
        } else {
            userMessage = `AI service ${service} failed during ${operation}`;
            resolution = `1. Check AI service configuration\n2. Verify authentication and permissions\n3. Check network connectivity`;
        }

        super(
            `AI integration failed: ${service} ${operation} - ${originalError?.message || 'Unknown error'}`,
            code,
            ErrorCategory.AI_INTEGRATION,
            userMessage,
            resolution,
            { service, operation, originalError: originalError?.message, ...context }
        );
    }
}

/**
 * Configuration errors
 */
export class ConfigurationError extends AIDebugError {
    constructor(
        configType: string,
        issue: string,
        context?: Record<string, any>
    ) {
        const code = `CONFIG_${configType.toUpperCase()}`;
        let userMessage: string;
        let resolution: string;

        if (configType === 'WORKSPACE') {
            userMessage = 'Workspace configuration issue';
            resolution = `1. Open a folder in VSCode (File > Open Folder)\n2. Ensure workspace has package.json\n3. Check workspace settings for AI Debug Context`;
        } else if (configType === 'JEST') {
            userMessage = 'Jest configuration missing or invalid';
            resolution = `1. Create jest.config.js in project root\n2. Install Jest: 'npm install --save-dev jest'\n3. Add test script to package.json`;
        } else if (configType === 'GIT') {
            userMessage = 'Git configuration required for affected tests';
            resolution = `1. Initialize git repository: 'git init'\n2. Set up git user: 'git config user.name/email'\n3. Make initial commit`;
        } else {
            userMessage = `Configuration error in ${configType}: ${issue}`;
            resolution = `1. Check configuration file syntax\n2. Verify all required settings are present\n3. Restore default configuration if needed`;
        }

        super(
            `Configuration error: ${configType} - ${issue}`,
            code,
            ErrorCategory.CONFIGURATION,
            userMessage,
            resolution,
            { configType, issue, ...context }
        );
    }
}

/**
 * Input validation errors
 */
export class ValidationError extends AIDebugError {
    constructor(
        field: string,
        value: any,
        requirement: string,
        context?: Record<string, any>
    ) {
        const code = `VALIDATION_${field.toUpperCase()}`;
        const userMessage = `Invalid ${field}: ${requirement}`;
        const resolution = `1. Check the ${field} value: ${JSON.stringify(value)}\n2. Ensure it meets requirement: ${requirement}\n3. See documentation for valid formats`;

        super(
            `Validation failed for ${field}: ${requirement}`,
            code,
            ErrorCategory.VALIDATION,
            userMessage,
            resolution,
            { field, value, requirement, ...context }
        );
    }
}

/**
 * Error handler utility class
 */
export class ErrorHandler {
    private static instance: ErrorHandler;
    private readonly outputChannel: any; // vscode.OutputChannel

    private constructor(outputChannel?: any) {
        this.outputChannel = outputChannel;
    }

    public static getInstance(outputChannel?: any): ErrorHandler {
        if (!ErrorHandler.instance) {
            ErrorHandler.instance = new ErrorHandler(outputChannel);
        }
        return ErrorHandler.instance;
    }

    /**
     * Handle error with proper logging and user notification
     */
    public handleError(error: Error, context?: Record<string, any>): AIDebugError {
        let structuredError: AIDebugError;

        if (error instanceof AIDebugError) {
            structuredError = error;
        } else {
            // Convert generic error to structured error
            structuredError = new class extends AIDebugError {
                constructor() {
                    super(
                        error.message,
                        'UNKNOWN_ERROR',
                        ErrorCategory.INTERNAL,
                        'An unexpected error occurred',
                        '1. Try the operation again\n2. Check the error details below\n3. Report this issue if it persists',
                        { originalError: error.message, ...context }
                    );
                }
            }();
        }

        // Log detailed error for debugging
        this.logError(structuredError);

        return structuredError;
    }

    /**
     * Log error to output channel
     */
    private logError(error: AIDebugError): void {
        if (this.outputChannel) {
            const report = error.getErrorReport();
            this.outputChannel.appendLine(`[ERROR] ${report.timestamp}`);
            this.outputChannel.appendLine(`Code: ${report.code}`);
            this.outputChannel.appendLine(`Category: ${report.category}`);
            this.outputChannel.appendLine(`Message: ${report.message}`);
            this.outputChannel.appendLine(`User Message: ${report.userMessage}`);
            this.outputChannel.appendLine(`Resolution: ${report.resolution}`);
            if (report.context) {
                this.outputChannel.appendLine(`Context: ${JSON.stringify(report.context, null, 2)}`);
            }
            if (report.stack) {
                this.outputChannel.appendLine(`Stack: ${report.stack}`);
            }
            this.outputChannel.appendLine('---');
        }
    }

    /**
     * Show user-friendly error message
     */
    public showUserError(error: AIDebugError, vscode?: any): void {
        if (vscode?.window?.showErrorMessage) {
            const actions = ['Show Details', 'Copy Error'];
            vscode.window.showErrorMessage(
                error.userMessage,
                ...actions
            ).then((selection: string) => {
                if (selection === 'Show Details') {
                    this.outputChannel?.show();
                } else if (selection === 'Copy Error') {
                    const report = error.getErrorReport();
                    vscode.env.clipboard.writeText(JSON.stringify(report, null, 2));
                }
            });
        }
    }
}