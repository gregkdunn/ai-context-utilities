/**
 * TestMenuOrchestrator Unit Tests
 * Tests the main orchestration logic including new rerun functionality
 */

import * as vscode from 'vscode';
import { TestMenuOrchestrator } from '../../../services/TestMenuOrchestrator';
import { ServiceContainer } from '../../../core/ServiceContainer';

// Mock vscode
jest.mock('vscode', () => ({
    window: {
        createOutputChannel: jest.fn(() => ({
            appendLine: jest.fn(),
            show: jest.fn(),
            dispose: jest.fn()
        })),
        showInformationMessage: jest.fn(() => Promise.resolve(undefined)),
        showWarningMessage: jest.fn(() => Promise.resolve(undefined)),
        withProgress: jest.fn((options, callback) => {
            const progress = { report: jest.fn() };
            const token = { isCancellationRequested: false };
            return callback(progress, token);
        })
    },
    workspace: {
        getConfiguration: jest.fn(() => ({
            get: jest.fn(),
            update: jest.fn()
        }))
    }
}));

// Mock fs
jest.mock('fs', () => ({
    existsSync: jest.fn(),
    readFileSync: jest.fn(),
    readdirSync: jest.fn(() => []),
    statSync: jest.fn(() => ({ size: 1000, mtime: new Date() }))
}));

describe('TestMenuOrchestrator', () => {
    let orchestrator: TestMenuOrchestrator;
    let mockServices: any;

    beforeEach(() => {
        // Mock services
        mockServices = {
            outputChannel: {
                appendLine: jest.fn(),
                show: jest.fn()
            },
            updateStatusBar: jest.fn(),
            workspaceRoot: '/test/workspace',
            projectDiscovery: {
                getProjectsForFiles: jest.fn().mockResolvedValue(['test-project']),
                getAllProjects: jest.fn().mockResolvedValue([])
            },
            configManager: {
                getDetectedFrameworks: jest.fn().mockReturnValue([])
            },
            testActions: {
                setNavigationContext: jest.fn()
            },
            performanceTracker: {
                trackCommand: jest.fn((name, fn) => fn())
            }
        };

        orchestrator = new TestMenuOrchestrator(mockServices);
    });

    describe('rerunProjectTestsFromContext', () => {
        const fs = require('fs');

        test('should extract project from test output and re-run tests', async () => {
            // Mock context directory exists
            (fs.existsSync as jest.Mock).mockImplementation((path: string) => {
                if (path.includes('ai-utilities-context')) return true;
                if (path.includes('test-output.txt')) return true;
                return false;
            });

            // Mock test output with project information
            (fs.readFileSync as jest.Mock).mockReturnValue('yarn nx test user-service\nTests completed successfully');

            // Mock executeProjectTest
            const executeProjectTestSpy = jest.spyOn(orchestrator, 'executeProjectTest')
                .mockResolvedValue(undefined);

            await orchestrator.rerunProjectTestsFromContext();

            expect(executeProjectTestSpy).toHaveBeenCalledWith('user-service', { previousMenu: 'context-browser' });
            expect(mockServices.outputChannel.appendLine).toHaveBeenCalledWith(
                expect.stringContaining('Re-running tests for project: user-service')
            );
        });

        test('should extract project from AI context when test output not available', async () => {
            // Mock context directory exists
            (fs.existsSync as jest.Mock).mockImplementation((path: string) => {
                if (path.includes('ai-utilities-context')) return true;
                if (path.includes('test-output.txt')) return false;
                if (path.includes('ai-debug-context.txt')) return true;
                return false;
            });

            // Mock AI context with project information
            (fs.readFileSync as jest.Mock).mockReturnValue('## Project: auth-service\nTest results and analysis...');

            // Mock executeProjectTest
            const executeProjectTestSpy = jest.spyOn(orchestrator, 'executeProjectTest')
                .mockResolvedValue(undefined);

            await orchestrator.rerunProjectTestsFromContext();

            expect(executeProjectTestSpy).toHaveBeenCalledWith('auth-service', { previousMenu: 'context-browser' });
        });

        test('should fallback to git affected when no project found', async () => {
            // Mock context directory exists but no project found
            (fs.existsSync as jest.Mock).mockImplementation((path: string) => {
                if (path.includes('ai-utilities-context')) return true;
                if (path.includes('test-output.txt')) return true;
                return false;
            });

            // Mock test output without clear project information
            (fs.readFileSync as jest.Mock).mockReturnValue('Running tests...\nSome generic test output');

            // Mock runGitAffected
            const runGitAffectedSpy = jest.spyOn(orchestrator, 'runGitAffected')
                .mockResolvedValue(undefined);

            await orchestrator.rerunProjectTestsFromContext();

            expect(runGitAffectedSpy).toHaveBeenCalled();
            expect(mockServices.outputChannel.appendLine).toHaveBeenCalledWith(
                expect.stringContaining('No specific project found in context, running affected tests...')
            );
        });

        test('should show warning when no context directory exists', async () => {
            // Mock context directory does not exist
            (fs.existsSync as jest.Mock).mockReturnValue(false);

            await orchestrator.rerunProjectTestsFromContext();

            expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
                'No test context found. Run tests first to generate context.'
            );
            expect(mockServices.updateStatusBar).toHaveBeenCalledWith('Ready');
        });
    });

    describe('extractProjectFromTestOutput', () => {
        test('should extract project from yarn nx test command', () => {
            const testOutput = 'yarn nx test user-service\nTests completed';
            const result = (orchestrator as any).extractProjectFromTestOutput(testOutput);
            expect(result).toBe('user-service');
        });

        test('should extract project from npm run test command', () => {
            const testOutput = 'npm run test auth-service\nTests completed';
            const result = (orchestrator as any).extractProjectFromTestOutput(testOutput);
            expect(result).toBe('auth-service');
        });

        test('should extract project from Testing label', () => {
            const testOutput = 'Testing payment-service project\nResults...';
            const result = (orchestrator as any).extractProjectFromTestOutput(testOutput);
            expect(result).toBe('payment-service');
        });

        test('should return null when no project pattern matches', () => {
            const testOutput = 'Generic test output without project info';
            const result = (orchestrator as any).extractProjectFromTestOutput(testOutput);
            expect(result).toBeNull();
        });
    });

    describe('extractProjectFromContext', () => {
        test('should extract project from Project: format', () => {
            const contextContent = 'Project: notification-service\nAnalysis results...';
            const result = (orchestrator as any).extractProjectFromContext(contextContent);
            expect(result).toBe('notification-service');
        });

        test('should extract project from markdown heading', () => {
            const contextContent = '## Project: data-service\nTest analysis...';
            const result = (orchestrator as any).extractProjectFromContext(contextContent);
            expect(result).toBe('data-service');
        });

        test('should extract project from Running tests format', () => {
            const contextContent = 'Running tests for analytics-service\nResults...';
            const result = (orchestrator as any).extractProjectFromContext(contextContent);
            expect(result).toBe('analytics-service');
        });

        test('should return null when no project pattern matches', () => {
            const contextContent = 'Generic context without project info';
            const result = (orchestrator as any).extractProjectFromContext(contextContent);
            expect(result).toBeNull();
        });
    });
});