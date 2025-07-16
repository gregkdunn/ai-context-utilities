import { WebviewProvider } from '../../webview/provider';
import { ProjectDetector } from '../../utils/projectDetector';
import { CommandRunner } from '../../utils/shellRunner';
import { FileManager } from '../../utils/fileManager';
import { StreamingCommandRunner } from '../../utils/streamingRunner';
import { WebviewMessage, ActionButton } from '../../types';
import * as vscode from 'vscode';

// Mock VSCode API
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

// Mock dependencies
jest.mock('../../utils/projectDetector');
jest.mock('../../utils/shellRunner');
jest.mock('../../utils/fileManager');
jest.mock('../../utils/streamingRunner');

const MockedProjectDetector = ProjectDetector as jest.MockedClass<typeof ProjectDetector>;
const MockedCommandRunner = CommandRunner as jest.MockedClass<typeof CommandRunner>;
const MockedFileManager = FileManager as jest.MockedClass<typeof FileManager>;
const MockedStreamingCommandRunner = StreamingCommandRunner as jest.MockedClass<typeof StreamingCommandRunner>;

describe('WebviewProvider', () => {
    let provider: WebviewProvider;
    let mockProjectDetector: jest.Mocked<ProjectDetector>;
    let mockCommandRunner: jest.Mocked<CommandRunner>;
    let mockFileManager: jest.Mocked<FileManager>;
    let mockStreamingRunner: jest.Mocked<StreamingCommandRunner>;
    let mockWebviewView: jest.Mocked<vscode.WebviewView>;
    let mockWebview: jest.Mocked<vscode.Webview>;

    beforeEach(() => {
        jest.clearAllMocks();

        // Setup mocks
        mockProjectDetector = {
            getProjects: jest.fn().mockResolvedValue([
                { name: 'project1', root: 'apps/project1', projectType: 'application' },
                { name: 'project2', root: 'libs/project2', projectType: 'library' }
            ]),
            detectCurrentProject: jest.fn().mockResolvedValue('project1')
        } as any;

        mockCommandRunner = {
            runAiDebug: jest.fn().mockResolvedValue({ success: true, exitCode: 0, output: 'test', duration: 1000 }),
            runNxTest: jest.fn().mockResolvedValue({ success: true, exitCode: 0, output: 'test', duration: 1000 }),
            runGitDiff: jest.fn().mockResolvedValue({ success: true, exitCode: 0, output: 'test', duration: 1000 }),
            runPrepareToPush: jest.fn().mockResolvedValue({ success: true, exitCode: 0, output: 'test', duration: 1000 })
        } as any;

        mockFileManager = {
            watchFiles: jest.fn(),
            getFileContent: jest.fn().mockResolvedValue('test content'),
            openFile: jest.fn()
        } as any;

        mockStreamingRunner = {
            on: jest.fn(),
            emit: jest.fn(),
            removeAllListeners: jest.fn(),
            cancel: jest.fn(),
            clearOutput: jest.fn(),
            isRunning: jest.fn().mockReturnValue(false),
            executeTestCommand: jest.fn().mockResolvedValue({ success: true, exitCode: 0, output: 'test', duration: 1000 }),
            executeGitCommand: jest.fn().mockResolvedValue({ success: true, exitCode: 0, output: 'test', duration: 1000 }),
            executeLintCommand: jest.fn().mockResolvedValue({ success: true, exitCode: 0, output: 'test', duration: 1000 }),
            executeWithStreaming: jest.fn().mockResolvedValue({ success: true, exitCode: 0, output: 'test', duration: 1000 })
        } as any;

        // Setup webview mocks
        mockWebview = {
            asWebviewUri: jest.fn().mockReturnValue('mock://webview-uri'),
            postMessage: jest.fn(),
            onDidReceiveMessage: jest.fn()
        } as any;

        mockWebviewView = {
            webview: mockWebview,
            show: jest.fn()
        } as any;

        // Mock constructors
        MockedProjectDetector.mockImplementation(() => mockProjectDetector);
        MockedCommandRunner.mockImplementation(() => mockCommandRunner);
        MockedFileManager.mockImplementation(() => mockFileManager);
        MockedStreamingCommandRunner.mockImplementation(() => mockStreamingRunner);

        // Create provider
        provider = new WebviewProvider(
            vscode.Uri.parse('test://extension'),
            mockProjectDetector,
            mockCommandRunner,
            mockFileManager
        );
    });

    describe('initialization', () => {
        it('should initialize with correct state', () => {
            // Assert
            expect(MockedStreamingCommandRunner).toHaveBeenCalled();
            expect(mockStreamingRunner.on).toHaveBeenCalledWith('output', expect.any(Function));
            expect(mockStreamingRunner.on).toHaveBeenCalledWith('error', expect.any(Function));
            expect(mockStreamingRunner.on).toHaveBeenCalledWith('progress', expect.any(Function));
            expect(mockStreamingRunner.on).toHaveBeenCalledWith('status', expect.any(Function));
            expect(mockStreamingRunner.on).toHaveBeenCalledWith('complete', expect.any(Function));
        });

        it('should setup file watching', () => {
            // Assert
            expect(mockFileManager.watchFiles).toHaveBeenCalledWith(expect.any(Function));
        });
    });

    describe('resolveWebviewView', () => {
        it('should setup webview correctly', () => {
            // Act
            provider.resolveWebviewView(mockWebviewView, {} as any, {} as any);

            // Assert
            expect(mockWebviewView.webview.options).toEqual({
                enableScripts: true,
                localResourceRoots: [vscode.Uri.parse('test://extension')]
            });
            expect(mockWebview.onDidReceiveMessage).toHaveBeenCalled();
            expect(mockWebview.postMessage).toHaveBeenCalledWith({
                command: 'updateState',
                state: expect.any(Object)
            });
        });

        it('should generate correct HTML', () => {
            // Act
            provider.resolveWebviewView(mockWebviewView, {} as any, {} as any);

            // Assert
            expect(mockWebviewView.webview.html).toContain('AI Debug Assistant');
            expect(mockWebviewView.webview.html).toContain('streaming-output');
            expect(mockWebviewView.webview.html).toContain('progress-container');
            expect(mockWebviewView.webview.html).toContain('live-output');
        });
    });

    describe('streaming event handlers', () => {
        beforeEach(() => {
            provider.resolveWebviewView(mockWebviewView, {} as any, {} as any);
        });

        it('should handle output events', () => {
            // Arrange
            const outputHandler = mockStreamingRunner.on.mock.calls.find(call => call[0] === 'output')[1];

            // Act
            outputHandler('test output');

            // Assert
            expect(mockWebview.postMessage).toHaveBeenCalledWith({
                command: 'streamingUpdate',
                message: {
                    type: 'output',
                    data: { text: 'test output' },
                    timestamp: expect.any(Date)
                }
            });
        });

        it('should handle error events', () => {
            // Arrange
            const errorHandler = mockStreamingRunner.on.mock.calls.find(call => call[0] === 'error')[1];

            // Act
            errorHandler('test error');

            // Assert
            expect(mockWebview.postMessage).toHaveBeenCalledWith({
                command: 'streamingUpdate',
                message: {
                    type: 'error',
                    data: { text: 'test error' },
                    timestamp: expect.any(Date)
                }
            });
        });

        it('should handle progress events', () => {
            // Arrange
            const progressHandler = mockStreamingRunner.on.mock.calls.find(call => call[0] === 'progress')[1];
            
            // Setup current action
            (provider as any)._state.currentAction = 'nxTest';
            (provider as any)._state.actions = {
                nxTest: { id: 'nxTest', progress: 0 } as ActionButton
            };

            // Act
            progressHandler(50);

            // Assert
            expect(mockWebview.postMessage).toHaveBeenCalledWith({
                command: 'streamingUpdate',
                message: {
                    type: 'progress',
                    data: { progress: 50, actionId: 'nxTest' },
                    timestamp: expect.any(Date)
                }
            });
        });

        it('should handle status events', () => {
            // Arrange
            const statusHandler = mockStreamingRunner.on.mock.calls.find(call => call[0] === 'status')[1];

            // Act
            statusHandler('Processing...');

            // Assert
            expect(mockWebview.postMessage).toHaveBeenCalledWith({
                command: 'streamingUpdate',
                message: {
                    type: 'status',
                    data: { status: 'Processing...' },
                    timestamp: expect.any(Date)
                }
            });
        });

        it('should handle complete events', () => {
            // Arrange
            const completeHandler = mockStreamingRunner.on.mock.calls.find(call => call[0] === 'complete')[1];
            const result = { success: true, exitCode: 0, output: 'test', duration: 1000 };
            
            (provider as any)._state.currentAction = 'nxTest';
            (provider as any)._state.isStreaming = true;

            // Act
            completeHandler(result);

            // Assert
            expect(mockWebview.postMessage).toHaveBeenCalledWith({
                command: 'streamingUpdate',
                message: {
                    type: 'complete',
                    data: { result, actionId: 'nxTest' },
                    timestamp: expect.any(Date)
                }
            });
            expect((provider as any)._state.isStreaming).toBe(false);
        });
    });

    describe('runCommand', () => {
        beforeEach(() => {
            provider.resolveWebviewView(mockWebviewView, {} as any, {} as any);
        });

        it('should run aiDebug command with streaming', async () => {
            // Arrange
            (provider as any)._state.currentProject = 'project1';

            // Act
            await provider.runCommand('aiDebug', { project: 'project1' });

            // Assert
            expect((provider as any)._state.isStreaming).toBe(false); // Should be reset after completion
            expect(mockStreamingRunner.executeTestCommand).toHaveBeenCalled();
            expect(mockStreamingRunner.executeGitCommand).toHaveBeenCalled();
            expect(mockCommandRunner.runAiDebug).toHaveBeenCalledWith('project1', {});
        });

        it('should run nxTest command with streaming', async () => {
            // Arrange
            (provider as any)._state.currentProject = 'project1';

            // Act
            await provider.runCommand('nxTest', { project: 'project1' });

            // Assert
            expect(mockStreamingRunner.executeTestCommand).toHaveBeenCalledWith(
                'yarn',
                ['nx', 'test', 'project1', '--verbose'],
                '/test/workspace'
            );
        });

        it('should run gitDiff command with streaming', async () => {
            // Act
            await provider.runCommand('gitDiff', {});

            // Assert
            expect(mockStreamingRunner.executeGitCommand).toHaveBeenCalledWith(
                ['diff', '--cached', '--name-only'],
                '/test/workspace'
            );
        });

        it('should run prepareToPush command with streaming', async () => {
            // Arrange
            (provider as any)._state.currentProject = 'project1';

            // Act
            await provider.runCommand('prepareToPush', { project: 'project1' });

            // Assert
            expect(mockStreamingRunner.executeLintCommand).toHaveBeenCalledWith(
                'yarn',
                ['nx', 'lint', 'project1'],
                '/test/workspace'
            );
            expect(mockStreamingRunner.executeWithStreaming).toHaveBeenCalledWith(
                'yarn',
                ['nx', 'format:write'],
                { cwd: '/test/workspace' }
            );
        });

        it('should not run command when already streaming', async () => {
            // Arrange
            (provider as any)._state.isStreaming = true;

            // Act
            await provider.runCommand('nxTest', { project: 'project1' });

            // Assert
            expect(mockStreamingRunner.executeTestCommand).not.toHaveBeenCalled();
        });

        it('should handle command errors', async () => {
            // Arrange
            mockStreamingRunner.executeTestCommand.mockRejectedValue(new Error('Test error'));
            (provider as any)._state.currentProject = 'project1';

            // Act
            await provider.runCommand('nxTest', { project: 'project1' });

            // Assert
            expect(vscode.window.showErrorMessage).toHaveBeenCalledWith('nxTest failed: Error: Test error');
            expect((provider as any)._state.isStreaming).toBe(false);
        });

        it('should show notifications when enabled', async () => {
            // Arrange
            (provider as any)._state.currentProject = 'project1';
            vscode.workspace.getConfiguration.mockReturnValue({
                get: jest.fn().mockReturnValue(true)
            });

            // Act
            await provider.runCommand('nxTest', { project: 'project1' });

            // Assert
            expect(vscode.window.showInformationMessage).toHaveBeenCalledWith('nxTest completed successfully');
        });
    });

    describe('handleMessage', () => {
        beforeEach(() => {
            provider.resolveWebviewView(mockWebviewView, {} as any, {} as any);
        });

        it('should handle runCommand message', async () => {
            // Arrange
            const message: WebviewMessage = {
                command: 'runCommand',
                data: {
                    action: 'nxTest',
                    project: 'project1'
                }
            };

            const messageHandler = mockWebview.onDidReceiveMessage.mock.calls[0][0];
            (provider as any)._state.currentProject = 'project1';

            // Act
            await messageHandler(message);

            // Assert
            expect(mockStreamingRunner.executeTestCommand).toHaveBeenCalled();
        });

        it('should handle cancelCommand message', async () => {
            // Arrange
            const message: WebviewMessage = {
                command: 'cancelCommand',
                data: {}
            };

            (provider as any)._state.isStreaming = true;
            (provider as any)._state.currentAction = 'nxTest';
            (provider as any)._state.actions = {
                nxTest: { id: 'nxTest', status: 'running', progress: 50 } as ActionButton
            };

            const messageHandler = mockWebview.onDidReceiveMessage.mock.calls[0][0];

            // Act
            await messageHandler(message);

            // Assert
            expect(mockStreamingRunner.cancel).toHaveBeenCalled();
            expect((provider as any)._state.isStreaming).toBe(false);
            expect((provider as any)._state.actions.nxTest.progress).toBeUndefined();
        });

        it('should handle clearOutput message', async () => {
            // Arrange
            const message: WebviewMessage = {
                command: 'clearOutput',
                data: {}
            };

            const messageHandler = mockWebview.onDidReceiveMessage.mock.calls[0][0];

            // Act
            await messageHandler(message);

            // Assert
            expect(mockStreamingRunner.clearOutput).toHaveBeenCalled();
        });

        it('should handle getStatus message', async () => {
            // Arrange
            const message: WebviewMessage = {
                command: 'getStatus',
                data: {}
            };

            const messageHandler = mockWebview.onDidReceiveMessage.mock.calls[0][0];

            // Act
            await messageHandler(message);

            // Assert
            expect(mockWebview.postMessage).toHaveBeenCalledWith({
                command: 'updateState',
                state: expect.any(Object)
            });
        });

        it('should handle openFile message', async () => {
            // Arrange
            const message: WebviewMessage = {
                command: 'openFile',
                data: {
                    filePath: 'test.txt'
                }
            };

            const messageHandler = mockWebview.onDidReceiveMessage.mock.calls[0][0];

            // Act
            await messageHandler(message);

            // Assert
            expect(mockFileManager.openFile).toHaveBeenCalledWith('test.txt');
        });

        it('should handle getProjects message', async () => {
            // Arrange
            const message: WebviewMessage = {
                command: 'getProjects',
                data: {}
            };

            const messageHandler = mockWebview.onDidReceiveMessage.mock.calls[0][0];

            // Act
            await messageHandler(message);

            // Assert
            expect(mockProjectDetector.getProjects).toHaveBeenCalled();
        });

        it('should handle setProject message', async () => {
            // Arrange
            const message: WebviewMessage = {
                command: 'setProject',
                data: {
                    project: 'project2'
                }
            };

            const messageHandler = mockWebview.onDidReceiveMessage.mock.calls[0][0];

            // Act
            await messageHandler(message);

            // Assert
            expect((provider as any)._state.currentProject).toBe('project2');
        });
    });

    describe('show', () => {
        it('should show webview when available', () => {
            // Arrange
            provider.resolveWebviewView(mockWebviewView, {} as any, {} as any);

            // Act
            provider.show();

            // Assert
            expect(mockWebviewView.show).toHaveBeenCalledWith(true);
        });

        it('should not crash when webview not available', () => {
            // Act & Assert - should not throw
            expect(() => provider.show()).not.toThrow();
        });
    });

    describe('action state management', () => {
        beforeEach(() => {
            provider.resolveWebviewView(mockWebviewView, {} as any, {} as any);
        });

        it('should initialize actions with correct default state', () => {
            // Arrange
            const state = (provider as any)._state;

            // Assert
            expect(state.actions.aiDebug).toEqual({
                id: 'aiDebug',
                label: 'AI Debug Analysis',
                icon: 'debug-alt',
                status: 'idle',
                enabled: true
            });

            expect(state.actions.nxTest).toEqual({
                id: 'nxTest',
                label: 'Run Tests',
                icon: 'beaker',
                status: 'idle',
                enabled: true
            });

            expect(state.actions.gitDiff).toEqual({
                id: 'gitDiff',
                label: 'Analyze Changes',
                icon: 'git-compare',
                status: 'idle',
                enabled: true
            });

            expect(state.actions.prepareToPush).toEqual({
                id: 'prepareToPush',
                label: 'Prepare to Push',
                icon: 'rocket',
                status: 'idle',
                enabled: true
            });
        });

        it('should update action status correctly', () => {
            // Arrange
            const updateActionStatus = (provider as any).updateActionStatus.bind(provider);

            // Act
            updateActionStatus('nxTest', 'running');

            // Assert
            expect((provider as any)._state.actions.nxTest.status).toBe('running');
            expect((provider as any)._state.actions.nxTest.lastRun).toBeInstanceOf(Date);
        });
    });

    describe('error handling', () => {
        it('should handle project detection errors gracefully', async () => {
            // Arrange
            mockProjectDetector.getProjects.mockRejectedValue(new Error('Project detection failed'));
            
            // Act & Assert - should not throw
            await expect((provider as any).initializeProjects()).resolves.toBeUndefined();
        });

        it('should handle file update errors gracefully', async () => {
            // Arrange
            mockFileManager.getFileContent.mockRejectedValue(new Error('File read failed'));
            
            // Act & Assert - should not throw
            await expect((provider as any).updateOutputFile('test', 'path')).resolves.toBeUndefined();
        });
    });
});