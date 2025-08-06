/**
 * Tests for ComprehensiveErrorHandler
 */

import { ComprehensiveErrorHandler, ErrorContext, ErrorRecoveryAction, ErrorAnalysis } from '../../../utils/ComprehensiveErrorHandler';
import * as vscode from 'vscode';

// Mock vscode
jest.mock('vscode', () => ({
    window: {
        showErrorMessage: jest.fn(),
        showInformationMessage: jest.fn(),
        showWarningMessage: jest.fn(),
        createTerminal: jest.fn()
    },
    commands: {
        executeCommand: jest.fn()
    },
    workspace: {
        openTextDocument: jest.fn()
    },
    env: {
        openExternal: jest.fn()
    },
    Uri: {
        parse: jest.fn()
    }
}));

jest.mock('fs');

describe('ComprehensiveErrorHandler', () => {
    let errorHandler: ComprehensiveErrorHandler;
    let mockOutputChannel: jest.Mocked<vscode.OutputChannel>;

    beforeEach(() => {
        mockOutputChannel = {
            append: jest.fn(),
            appendLine: jest.fn(),
            show: jest.fn(),
            hide: jest.fn(),
            clear: jest.fn(),
            dispose: jest.fn(),
            name: 'error-handler',
            replace: jest.fn()
        };

        errorHandler = new ComprehensiveErrorHandler(
            mockOutputChannel,
            '/test/workspace'
        );
        jest.clearAllMocks();
    });

    describe('Constructor', () => {
        test('should create instance with output channel and workspace root', () => {
            expect(errorHandler).toBeDefined();
            expect(errorHandler).toBeInstanceOf(ComprehensiveErrorHandler);
        });
    });

    describe('Interfaces', () => {
        test('should create valid ErrorContext', () => {
            const context: ErrorContext = {
                operation: 'test-execution',
                input: { project: 'test-app' },
                timestamp: Date.now(),
                workspaceRoot: '/test/workspace',
                systemInfo: {
                    platform: 'darwin',
                    nodeVersion: '18.0.0',
                    vsCodeVersion: '1.80.0'
                }
            };

            expect(context.operation).toBe('test-execution');
            expect(context.systemInfo.platform).toBe('darwin');
            expect(context.workspaceRoot).toBe('/test/workspace');
        });

        test('should create valid ErrorRecoveryAction', () => {
            const action: ErrorRecoveryAction = {
                label: 'Install Dependencies',
                description: 'Run npm install to fix missing dependencies',
                action: async () => {},
                isDestructive: false,
                requiresConfirmation: true
            };

            expect(action.label).toBe('Install Dependencies');
            expect(action.isDestructive).toBe(false);
            expect(action.requiresConfirmation).toBe(true);
            expect(typeof action.action).toBe('function');
        });

        test('should create valid ErrorAnalysis', () => {
            const analysis: ErrorAnalysis = {
                category: 'dependency_error',
                severity: 'high',
                isRecoverable: true,
                rootCause: 'Missing npm packages',
                suggestedActions: [],
                documentationLinks: ['https://docs.npmjs.com'],
                relatedErrors: ['MODULE_NOT_FOUND', 'ENOENT']
            };

            expect(analysis.category).toBe('dependency_error');
            expect(analysis.severity).toBe('high');
            expect(analysis.isRecoverable).toBe(true);
            expect(analysis.documentationLinks).toContain('https://docs.npmjs.com');
        });
    });

    describe('Public methods', () => {
        test('should have handleError method', () => {
            expect(typeof errorHandler.handleError).toBe('function');
        });

        test('should have getErrorHistory method', () => {
            expect(typeof errorHandler.getErrorHistory).toBe('function');
        });

        test('should have clearErrorHistory method', () => {
            expect(typeof errorHandler.clearErrorHistory).toBe('function');
        });

        test('should have dispose method', () => {
            expect(typeof errorHandler.dispose).toBe('function');
        });
    });

    describe('Basic functionality', () => {
        test('should get empty error history initially', () => {
            const history = errorHandler.getErrorHistory();
            expect(Array.isArray(history)).toBe(true);
            expect(history.length).toBe(0);
        });

        test('should clear error history', () => {
            errorHandler.clearErrorHistory();
            const history = errorHandler.getErrorHistory();
            expect(history.length).toBe(0);
        });

        test('should dispose without errors', () => {
            expect(() => errorHandler.dispose()).not.toThrow();
        });
    });
});