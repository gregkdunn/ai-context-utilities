import { WebviewProvider } from '../provider';
import { ProjectDetector } from '../../utils/projectDetector';
import { CommandRunner } from '../../utils/shellRunner';
import { FileManager } from '../../utils/fileManager';
import { StatusTracker } from '../../utils/statusTracker';
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
        getConfiguration: jest.fn().mockReturnValue({
            get: jest.fn(() => true)
        })
    },
    window: {
        showInformationMessage: jest.fn(),
        showErrorMessage: jest.fn(),
        createOutputChannel: jest.fn(() => ({
            appendLine: jest.fn(),
            show: jest.fn()
        }))
    }
}));

// Mock dependencies
jest.mock('../../utils/projectDetector');
jest.mock('../../utils/shellRunner');
jest.mock('../../utils/fileManager');
jest.mock('../../utils/statusTracker');

const MockedProjectDetector = ProjectDetector as jest.MockedClass<typeof ProjectDetector>;
const MockedCommandRunner = CommandRunner as jest.MockedClass<typeof CommandRunner>;
const MockedFileManager = FileManager as jest.MockedClass<typeof FileManager>;
const MockedStatusTracker = StatusTracker as jest.MockedClass<typeof StatusTracker>;

describe('WebviewProvider', () => {
    let provider: WebviewProvider;
    let mockProjectDetector: jest.Mocked<ProjectDetector>;
    let mockCommandRunner: jest.Mocked<CommandRunner>;
    let mockFileManager: jest.Mocked<FileManager>;
    let mockStatusTracker: jest.Mocked<StatusTracker>;
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
            getCurrentProject: jest.fn().mockResolvedValue({ name: 'project1', root: 'apps/project1' })
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

        mockStatusTracker = {
            clearHistory: jest.fn(),
            updateStatus: jest.fn(),
            setRunning: jest.fn(),
            setComplete: jest.fn()
        } as any;

        // Setup webview mocks
        mockWebview = {
            asWebviewUri: jest.fn().mockReturnValue('mock://webview-uri'),
            postMessage: jest.fn(),
            onDidReceiveMessage: jest.fn(),
            options: {},
            html: ''
        } as any;

        mockWebviewView = {
            webview: mockWebview,
            show: jest.fn()
        } as any;

        // Mock constructors
        MockedProjectDetector.mockImplementation(() => mockProjectDetector);
        MockedCommandRunner.mockImplementation(() => mockCommandRunner);
        MockedFileManager.mockImplementation(() => mockFileManager);
        MockedStatusTracker.mockImplementation(() => mockStatusTracker);

        // Create provider with correct constructor signature
        provider = new WebviewProvider(
            vscode.Uri.parse('test://extension'),
            mockProjectDetector,
            mockCommandRunner,
            mockFileManager,
            mockStatusTracker
        );
    });

    describe('initialization', () => {
        it('should initialize with correct dependencies', () => {
            expect(provider).toBeInstanceOf(WebviewProvider);
        });

        it('should setup file watching', () => {
            // Arrange
            provider.resolveWebviewView(mockWebviewView, {} as any, {} as any);
            
            // Assert
            expect(mockFileManager.watchFiles).toHaveBeenCalledWith(expect.any(Function));
        });
    });

    describe('resolveWebviewView', () => {
        it('should setup webview correctly', () => {
            // Act
            provider.resolveWebviewView(mockWebviewView, {} as any, {} as any);

            // Assert
            expect(mockWebviewView.webview.options.enableScripts).toBe(true);
            expect(mockWebviewView.webview.options.localResourceRoots).toHaveLength(1);
            expect(mockWebview.onDidReceiveMessage).toHaveBeenCalled();
        });

        it('should generate HTML', () => {
            // Act
            provider.resolveWebviewView(mockWebviewView, {} as any, {} as any);

            // Assert
            expect(mockWebviewView.webview.html).toBeTruthy();
        });
    });

    describe('runCommand', () => {
        beforeEach(() => {
            provider.resolveWebviewView(mockWebviewView, {} as any, {} as any);
        });

        it('should run aiDebug command', async () => {
            // Act
            await provider.runCommand('aiDebug', { project: 'project1' });

            // Assert
            expect(mockCommandRunner.runAiDebug).toHaveBeenCalledWith('project1', undefined);
        });

        it('should run nxTest command', async () => {
            // Act
            await provider.runCommand('nxTest', { project: 'project1' });

            // Assert
            expect(mockCommandRunner.runNxTest).toHaveBeenCalledWith('project1', undefined);
        });

        it('should run gitDiff command', async () => {
            // Act
            await provider.runCommand('gitDiff', {});

            // Assert
            expect(mockCommandRunner.runGitDiff).toHaveBeenCalledWith(undefined);
        });

        it('should run prepareToPush command', async () => {
            // Act
            await provider.runCommand('prepareToPush', { project: 'project1' });

            // Assert
            expect(mockCommandRunner.runPrepareToPush).toHaveBeenCalledWith('project1', undefined);
        });

        it('should handle command errors', async () => {
            // Arrange
            mockCommandRunner.runNxTest.mockRejectedValue(new Error('Test error'));

            // Act
            await provider.runCommand('nxTest', { project: 'project1' });

            // Assert - Should not throw, error should be handled internally
            expect(mockCommandRunner.runNxTest).toHaveBeenCalled();
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

            const onDidReceiveMessageCalls = mockWebview.onDidReceiveMessage.mock.calls;
            expect(onDidReceiveMessageCalls.length).toBeGreaterThan(0);
            const messageHandler = onDidReceiveMessageCalls[0][0];

            // Act
            if (messageHandler) {
                await messageHandler(message);
            }

            // Assert
            expect(mockCommandRunner.runNxTest).toHaveBeenCalled();
        });

        it('should handle getProjects message', async () => {
            // Arrange
            const message: WebviewMessage = {
                command: 'getProjects',
                data: {}
            };

            const onDidReceiveMessageCalls = mockWebview.onDidReceiveMessage.mock.calls;
            expect(onDidReceiveMessageCalls.length).toBeGreaterThan(0);
            const messageHandler = onDidReceiveMessageCalls[0][0];

            // Act
            await messageHandler(message);

            // Assert
            expect(mockProjectDetector.getProjects).toHaveBeenCalled();
        });

        it('should handle openFile message', async () => {
            // Arrange
            const message: WebviewMessage = {
                command: 'openFile',
                data: {
                    filePath: 'test.txt'
                }
            };

            const onDidReceiveMessageCalls = mockWebview.onDidReceiveMessage.mock.calls;
            expect(onDidReceiveMessageCalls.length).toBeGreaterThan(0);
            const messageHandler = onDidReceiveMessageCalls[0][0];

            // Act
            await messageHandler(message);

            // Assert
            expect(mockFileManager.openFile).toHaveBeenCalledWith('test.txt');
        });

        it('should handle clearOutput message', async () => {
            // Arrange
            const message: WebviewMessage = {
                command: 'clearOutput',
                data: {}
            };

            const onDidReceiveMessageCalls = mockWebview.onDidReceiveMessage.mock.calls;
            expect(onDidReceiveMessageCalls.length).toBeGreaterThan(0);
            const messageHandler = onDidReceiveMessageCalls[0][0];

            // Act
            await messageHandler(message);

            // Assert
            expect(mockStatusTracker.clearHistory).toHaveBeenCalled();
        });
    });

    describe('show', () => {
        it('should show webview when available', () => {
            // Arrange
            provider.resolveWebviewView(mockWebviewView, {} as any, {} as any);

            // Act
            provider.show();

            // Assert
            expect(mockWebviewView.show).toHaveBeenCalled();
        });

        it('should not crash when webview not available', () => {
            // Act & Assert - should not throw
            expect(() => provider.show()).not.toThrow();
        });
    });

    describe('error handling', () => {
        it('should handle project detection errors gracefully', async () => {
            // Arrange
            mockProjectDetector.getProjects.mockRejectedValue(new Error('Project detection failed'));
            provider.resolveWebviewView(mockWebviewView, {} as any, {} as any);
            
            const message: WebviewMessage = {
                command: 'getProjects',
                data: {}
            };

            const onDidReceiveMessageCalls = mockWebview.onDidReceiveMessage.mock.calls;
            expect(onDidReceiveMessageCalls.length).toBeGreaterThan(0);
            const messageHandler = onDidReceiveMessageCalls[0][0];

            // Act & Assert - should not throw
            await expect(messageHandler(message)).resolves.not.toThrow();
        });

        it('should handle file operation errors gracefully', async () => {
            // Arrange
            mockFileManager.openFile.mockRejectedValue(new Error('File read failed'));
            provider.resolveWebviewView(mockWebviewView, {} as any, {} as any);
            
            const message: WebviewMessage = {
                command: 'openFile',
                data: { filePath: 'test.txt' }
            };

            const onDidReceiveMessageCalls = mockWebview.onDidReceiveMessage.mock.calls;
            expect(onDidReceiveMessageCalls.length).toBeGreaterThan(0);
            const messageHandler = onDidReceiveMessageCalls[0][0];

            // Act & Assert - should not throw
            await expect(messageHandler(message)).resolves.not.toThrow();
        });
    });
});