import { WebviewProvider } from '../../webview/provider';
import { StreamingCommandRunner } from '../../utils/streamingRunner';
import { ProjectDetector } from '../../utils/projectDetector';
import { CommandRunner } from '../../utils/shellRunner';
import { FileManager } from '../../utils/fileManager';
import { StreamingMessage, WebviewMessage } from '../../types';
import * as vscode from 'vscode';
import { EventEmitter } from 'events';

// Mock VSCode completely for integration tests
jest.mock('vscode', () => ({
    Uri: {
        joinPath: jest.fn(() => ({ toString: () => 'mock://uri' })),
        parse: jest.fn(() => ({ toString: () => 'mock://uri' }))
    },
    workspace: {
        workspaceFolders: [{ uri: { fsPath: '/test/workspace' } }],
        getConfiguration: jest.fn(() => ({
            get: jest.fn(() => true)
        }))
    },
    window: {
        showInformationMessage: jest.fn(),
        showErrorMessage: jest.fn()
    }
}));

// Mock child_process for integration
const mockChildProcess = new EventEmitter();
Object.assign(mockChildProcess, {
    stdout: new EventEmitter(),
    stderr: new EventEmitter(),
    kill: jest.fn()
});

jest.mock('child_process', () => ({
    spawn: jest.fn(() => mockChildProcess)
}));

describe('Streaming Integration Tests', () => {
    let provider: WebviewProvider;
    let streamingRunner: StreamingCommandRunner;
    let mockProjectDetector: jest.Mocked<ProjectDetector>;
    let mockCommandRunner: jest.Mocked<CommandRunner>;
    let mockFileManager: jest.Mocked<FileManager>;
    let mockWebviewView: jest.Mocked<vscode.WebviewView>;
    let mockWebview: jest.Mocked<vscode.Webview>;
    let receivedMessages: any[] = [];

    beforeEach(() => {
        jest.clearAllMocks();
        receivedMessages = [];

        // Create real streaming runner for integration testing
        streamingRunner = new StreamingCommandRunner();

        // Setup mocked dependencies
        mockProjectDetector = {
            getProjects: jest.fn().mockResolvedValue([
                { name: 'test-app', root: 'apps/test-app', projectType: 'application' }
            ]),
            detectCurrentProject: jest.fn().mockResolvedValue('test-app')
        } as any;

        mockCommandRunner = {
            runAiDebug: jest.fn().mockResolvedValue({ success: true, exitCode: 0, output: 'AI debug complete', duration: 2000 })
        } as any;

        mockFileManager = {
            watchFiles: jest.fn(),
            getFileContent: jest.fn().mockResolvedValue('test file content'),
            openFile: jest.fn()
        } as any;

        // Setup webview mocks that capture messages
        mockWebview = {
            asWebviewUri: jest.fn().mockReturnValue('mock://webview-uri'),
            postMessage: jest.fn((message) => {
                receivedMessages.push(message);
                return Promise.resolve(true);
            }),
            onDidReceiveMessage: jest.fn(),
            html: '',
            options: {}
        } as any;

        mockWebviewView = {
            webview: mockWebview,
            show: jest.fn()
        } as any;

        // Create provider with real streaming runner
        provider = new WebviewProvider(
            vscode.Uri.parse('test://extension'),
            mockProjectDetector,
            mockCommandRunner,
            mockFileManager
        );

        // Replace the internal streaming runner with our test instance
        (provider as any).streamingRunner = streamingRunner;
        (provider as any).setupStreamingListeners();
    });

    afterEach(() => {
        streamingRunner.removeAllListeners();
    });

    describe('end-to-end command execution with streaming', () => {
        beforeEach(() => {
            provider.resolveWebviewView(mockWebviewView, {} as any, {} as any);
        });

        it('should stream output during command execution', async () => {
            // Arrange
            const { spawn } = require('child_process');
            let commandPromise: Promise<any>;

            // Act - start command
            commandPromise = provider.runCommand('nxTest', { project: 'test-app' });

            // Simulate command output streaming
            await new Promise(resolve => setTimeout(resolve, 10)); // Let command start

            mockChildProcess.stdout.emit('data', Buffer.from('Determining test suites to run...\n'));
            await new Promise(resolve => setTimeout(resolve, 10));

            mockChildProcess.stdout.emit('data', Buffer.from('Found 5 test suites\n'));
            await new Promise(resolve => setTimeout(resolve, 10));

            mockChildProcess.stdout.emit('data', Buffer.from('Running tests...\n'));
            await new Promise(resolve => setTimeout(resolve, 10));

            mockChildProcess.stdout.emit('data', Buffer.from('Test results:\n PASS src/app.spec.ts\n'));
            await new Promise(resolve => setTimeout(resolve, 10));

            // Complete command
            mockChildProcess.emit('close', 0);

            // Wait for command to complete
            await commandPromise;

            // Assert - check that streaming messages were sent
            const streamingMessages = receivedMessages.filter(msg => msg.command === 'streamingUpdate');
            
            expect(streamingMessages.length).toBeGreaterThan(0);
            
            // Check for output messages
            const outputMessages = streamingMessages.filter(msg => msg.message.type === 'output');
            expect(outputMessages.length).toBeGreaterThan(0);
            expect(outputMessages[0].message.data.text).toContain('Determining test suites');
            
            // Check for progress messages
            const progressMessages = streamingMessages.filter(msg => msg.message.type === 'progress');
            expect(progressMessages.length).toBeGreaterThan(0);
            
            // Check for completion message
            const completeMessages = streamingMessages.filter(msg => msg.message.type === 'complete');
            expect(completeMessages.length).toBe(1);
            expect(completeMessages[0].message.data.result.success).toBe(true);
        });

        it('should handle command cancellation', async () => {
            // Arrange
            let commandPromise: Promise<any>;

            // Act - start command
            commandPromise = provider.runCommand('nxTest', { project: 'test-app' });
            await new Promise(resolve => setTimeout(resolve, 10)); // Let command start

            // Simulate user cancellation
            const cancelMessage: WebviewMessage = {
                command: 'cancelCommand',
                data: {}
            };

            const messageHandler = mockWebview.onDidReceiveMessage.mock.calls[0][0];
            await messageHandler(cancelMessage);

            // Complete the cancelled command
            mockChildProcess.emit('close', 1);
            await commandPromise;

            // Assert
            expect(mockChildProcess.kill).toHaveBeenCalledWith('SIGTERM');
            expect((provider as any)._state.isStreaming).toBe(false);
        });

        it('should handle command failure with error streaming', async () => {
            // Arrange
            let commandPromise: Promise<any>;

            // Act - start command
            commandPromise = provider.runCommand('nxTest', { project: 'test-app' });
            await new Promise(resolve => setTimeout(resolve, 10));

            // Simulate error output
            mockChildProcess.stderr.emit('data', Buffer.from('Error: Test failed\n'));
            mockChildProcess.stdout.emit('data', Buffer.from('FAIL src/app.spec.ts\n'));
            
            // Complete with failure
            mockChildProcess.emit('close', 1);
            await commandPromise;

            // Assert
            const streamingMessages = receivedMessages.filter(msg => msg.command === 'streamingUpdate');
            const errorMessages = streamingMessages.filter(msg => msg.message.type === 'error');
            
            expect(errorMessages.length).toBeGreaterThan(0);
            expect(errorMessages[0].message.data.text).toContain('Error: Test failed');
            
            const completeMessages = streamingMessages.filter(msg => msg.message.type === 'complete');
            expect(completeMessages[0].message.data.result.success).toBe(false);
        });

        it('should coordinate multi-step AI Debug workflow', async () => {
            // Arrange
            let commandPromise: Promise<any>;

            // Act - start AI Debug command
            commandPromise = provider.runCommand('aiDebug', { project: 'test-app' });
            await new Promise(resolve => setTimeout(resolve, 10));

            // Simulate Step 1: Tests
            mockChildProcess.stdout.emit('data', Buffer.from('Determining test suites to run...\n'));
            mockChildProcess.emit('close', 0);
            await new Promise(resolve => setTimeout(resolve, 10));

            // The workflow should continue to git diff step
            // Reset for next command
            mockChildProcess.removeAllListeners();
            Object.assign(mockChildProcess, {
                stdout: new EventEmitter(),
                stderr: new EventEmitter()
            });

            // Simulate Step 2: Git diff
            mockChildProcess.stdout.emit('data', Buffer.from('Analyzing repository...\n'));
            mockChildProcess.emit('close', 0);
            await new Promise(resolve => setTimeout(resolve, 10));

            // Wait for command to complete
            await commandPromise;

            // Assert
            const streamingMessages = receivedMessages.filter(msg => msg.command === 'streamingUpdate');
            const statusMessages = streamingMessages.filter(msg => msg.message.type === 'status');
            
            // Should have status messages for each step
            const stepMessages = statusMessages.filter(msg => 
                msg.message.data.status.includes('Step 1/3') || 
                msg.message.data.status.includes('Step 2/3') ||
                msg.message.data.status.includes('Step 3/3')
            );
            expect(stepMessages.length).toBeGreaterThan(0);
            
            // Should complete successfully
            const completeMessages = streamingMessages.filter(msg => msg.message.type === 'complete');
            expect(completeMessages.length).toBe(1);
            expect(mockCommandRunner.runAiDebug).toHaveBeenCalled();
        });
    });

    describe('webview message handling integration', () => {
        beforeEach(() => {
            provider.resolveWebviewView(mockWebviewView, {} as any, {} as any);
        });

        it('should handle runCommand message and stream results', async () => {
            // Arrange
            const message: WebviewMessage = {
                command: 'runCommand',
                data: {
                    action: 'nxTest',
                    project: 'test-app'
                }
            };

            const messageHandler = mockWebview.onDidReceiveMessage.mock.calls[0][0];

            // Act
            const handlePromise = messageHandler(message);
            await new Promise(resolve => setTimeout(resolve, 10));

            // Simulate command execution
            mockChildProcess.stdout.emit('data', Buffer.from('Test output\n'));
            mockChildProcess.emit('close', 0);

            await handlePromise;

            // Assert
            const streamingMessages = receivedMessages.filter(msg => msg.command === 'streamingUpdate');
            expect(streamingMessages.length).toBeGreaterThan(0);
        });

        it('should handle clearOutput message', async () => {
            // Arrange
            const message: WebviewMessage = {
                command: 'clearOutput',
                data: {}
            };

            const messageHandler = mockWebview.onDidReceiveMessage.mock.calls[0][0];
            
            // Add some output first
            streamingRunner.emit('output', 'test output');

            // Act
            await messageHandler(message);

            // Assert
            expect(streamingRunner.getCurrentOutput()).toBe('');
        });
    });

    describe('progress tracking integration', () => {
        beforeEach(() => {
            provider.resolveWebviewView(mockWebviewView, {} as any, {} as any);
        });

        it('should track progress through command execution phases', async () => {
            // Arrange
            let commandPromise: Promise<any>;

            // Act
            commandPromise = provider.runCommand('nxTest', { project: 'test-app' });
            await new Promise(resolve => setTimeout(resolve, 10));

            // Simulate different progress phases
            mockChildProcess.stdout.emit('data', Buffer.from('Determining test suites to run...\n'));
            await new Promise(resolve => setTimeout(resolve, 10));

            mockChildProcess.stdout.emit('data', Buffer.from('Found test suites\n'));
            await new Promise(resolve => setTimeout(resolve, 10));

            mockChildProcess.stdout.emit('data', Buffer.from('Running tests\n'));
            await new Promise(resolve => setTimeout(resolve, 10));

            mockChildProcess.stdout.emit('data', Buffer.from('Test suites completed\n'));
            await new Promise(resolve => setTimeout(resolve, 10));

            mockChildProcess.emit('close', 0);
            await commandPromise;

            // Assert
            const streamingMessages = receivedMessages.filter(msg => msg.command === 'streamingUpdate');
            const progressMessages = streamingMessages.filter(msg => msg.message.type === 'progress');
            
            // Should have progress updates
            expect(progressMessages.length).toBeGreaterThan(0);
            
            // Progress should increase over time
            const progressValues = progressMessages.map(msg => msg.message.data.progress);
            for (let i = 1; i < progressValues.length; i++) {
                expect(progressValues[i]).toBeGreaterThanOrEqual(progressValues[i - 1]);
            }
        });

        it('should update action button progress in state', async () => {
            // Arrange
            let commandPromise: Promise<any>;

            // Act
            commandPromise = provider.runCommand('nxTest', { project: 'test-app' });
            await new Promise(resolve => setTimeout(resolve, 10));

            // Simulate progress
            mockChildProcess.stdout.emit('data', Buffer.from('Running tests\n'));
            await new Promise(resolve => setTimeout(resolve, 10));

            // Check intermediate state
            const state = (provider as any)._state;
            expect(state.actions.nxTest.status).toBe('running');

            mockChildProcess.emit('close', 0);
            await commandPromise;

            // Check final state
            expect(state.actions.nxTest.status).toBe('success');
            expect(state.actions.nxTest.progress).toBeUndefined(); // Should be cleared on completion
        });
    });

    describe('error handling integration', () => {
        beforeEach(() => {
            provider.resolveWebviewView(mockWebviewView, {} as any, {} as any);
        });

        it('should handle process spawn errors', async () => {
            // Arrange
            const { spawn } = require('child_process');
            spawn.mockImplementationOnce(() => {
                const errorProcess = new EventEmitter();
                setTimeout(() => {
                    errorProcess.emit('error', new Error('Command not found'));
                }, 10);
                return errorProcess;
            });

            // Act
            await provider.runCommand('nxTest', { project: 'test-app' });

            // Assert
            const streamingMessages = receivedMessages.filter(msg => msg.command === 'streamingUpdate');
            const completeMessages = streamingMessages.filter(msg => msg.message.type === 'complete');
            
            expect(completeMessages.length).toBe(1);
            expect(completeMessages[0].message.data.result.success).toBe(false);
            expect(completeMessages[0].message.data.result.error).toContain('Command not found');
        });

        it('should handle invalid action gracefully', async () => {
            // Act & Assert - should not throw
            await expect(provider.runCommand('invalidAction' as any, {})).resolves.toBeUndefined();
            
            expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
                expect.stringContaining('Unknown action: invalidAction')
            );
        });
    });

    describe('state consistency integration', () => {
        beforeEach(() => {
            provider.resolveWebviewView(mockWebviewView, {} as any, {} as any);
        });

        it('should maintain consistent state throughout command lifecycle', async () => {
            // Arrange
            const state = (provider as any)._state;
            
            expect(state.isStreaming).toBe(false);
            expect(state.currentAction).toBeUndefined();

            // Act - start command
            const commandPromise = provider.runCommand('nxTest', { project: 'test-app' });
            await new Promise(resolve => setTimeout(resolve, 10));

            // Assert - during execution
            expect(state.isStreaming).toBe(true);
            expect(state.currentAction).toBe('nxTest');
            expect(state.actions.nxTest.status).toBe('running');

            // Complete command
            mockChildProcess.emit('close', 0);
            await commandPromise;

            // Assert - after completion
            expect(state.isStreaming).toBe(false);
            expect(state.currentAction).toBeUndefined();
            expect(state.actions.nxTest.status).toBe('success');
        });

        it('should reset state properly on command failure', async () => {
            // Arrange
            const state = (provider as any)._state;

            // Act - start and fail command
            const commandPromise = provider.runCommand('nxTest', { project: 'test-app' });
            await new Promise(resolve => setTimeout(resolve, 10));

            mockChildProcess.emit('close', 1); // Failure
            await commandPromise;

            // Assert
            expect(state.isStreaming).toBe(false);
            expect(state.currentAction).toBeUndefined();
            expect(state.actions.nxTest.status).toBe('error');
        });
    });
});