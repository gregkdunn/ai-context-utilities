import { WebviewProvider } from '../webview/provider';
import { ProjectDetector } from '../utils/projectDetector';
import { CommandRunner } from '../utils/shellRunner';
import { FileManager } from '../utils/fileManager';
import { StatusTracker } from '../utils/statusTracker';
import { WebviewMessage } from '../types';
import * as vscode from 'vscode';

// Mock VSCode completely for integration tests
jest.mock('vscode', () => ({
    StatusBarAlignment: {
        Left: 1,
        Right: 2
    },
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
        createStatusBarItem: jest.fn(() => ({
            show: jest.fn(),
            hide: jest.fn(),
            dispose: jest.fn(),
            text: '',
            tooltip: '',
            command: ''
        })),
        showInformationMessage: jest.fn(),
        showErrorMessage: jest.fn(),
        createOutputChannel: jest.fn(() => ({
            append: jest.fn(),
            appendLine: jest.fn(),
            show: jest.fn(),
            hide: jest.fn(),
            dispose: jest.fn()
        }))
    }
}));

describe('Integration Tests', () => {
    let provider: WebviewProvider;
    let mockProjectDetector: jest.Mocked<ProjectDetector>;
    let mockCommandRunner: jest.Mocked<CommandRunner>;
    let mockFileManager: jest.Mocked<FileManager>;
    let mockWebviewView: jest.Mocked<vscode.WebviewView>;
    let mockWebview: jest.Mocked<vscode.Webview>;
    let receivedMessages: any[] = [];

    beforeEach(() => {
        jest.clearAllMocks();
        receivedMessages = [];

        // Setup mocked dependencies
        mockProjectDetector = {
            getProjects: jest.fn().mockResolvedValue([
                { name: 'test-app', root: 'apps/test-app', projectType: 'application' }
            ]),
            getCurrentProject: jest.fn().mockResolvedValue({ name: 'test-app', root: 'apps/test-app', projectType: 'application' })
        } as any;

        mockCommandRunner = {
            runAiDebug: jest.fn().mockResolvedValue({ success: true, exitCode: 0, output: 'AI debug complete', duration: 2000 }),
            runNxTest: jest.fn().mockResolvedValue({ success: true, exitCode: 0, output: 'Tests passed', duration: 5000 }),
            runGitDiff: jest.fn().mockResolvedValue({ success: true, exitCode: 0, output: 'Diff complete', duration: 1000 }),
            runPrepareToPush: jest.fn().mockResolvedValue({ success: true, exitCode: 0, output: 'Prepared to push', duration: 3000 })
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

        // Create provider
        const mockStatusTracker = new StatusTracker();
        provider = new WebviewProvider(
            vscode.Uri.parse('test://extension'),
            mockProjectDetector,
            mockCommandRunner,
            mockFileManager,
            mockStatusTracker
        );
    });

    describe('webview integration', () => {
        beforeEach(() => {
            provider.resolveWebviewView(mockWebviewView, {} as any, {} as any);
        });

        it('should handle runCommand message for nxTest', async () => {
            // Arrange
            const message: WebviewMessage = {
                command: 'runCommand',
                data: {
                    action: 'nxTest',
                    project: 'test-app',
                    options: {}
                }
            };

            const messageHandler = mockWebview.onDidReceiveMessage.mock.calls[0][0];

            // Act
            await messageHandler(message);

            // Assert
            expect(mockCommandRunner.runNxTest).toHaveBeenCalledWith('test-app', {});
            expect(receivedMessages.some(msg => msg.type === 'commandResult')).toBe(true);
            
            const resultMessage = receivedMessages.find(msg => msg.type === 'commandResult');
            expect(resultMessage.data.action).toBe('nxTest');
            expect(resultMessage.data.result.success).toBe(true);
        });

        it('should handle runCommand message for gitDiff', async () => {
            // Arrange
            const message: WebviewMessage = {
                command: 'runCommand',
                data: {
                    action: 'gitDiff',
                    options: {}
                }
            };

            const messageHandler = mockWebview.onDidReceiveMessage.mock.calls[0][0];

            // Act
            await messageHandler(message);

            // Assert
            expect(mockCommandRunner.runGitDiff).toHaveBeenCalledWith({});
            expect(receivedMessages.some(msg => msg.type === 'commandResult')).toBe(true);
        });

        it('should handle runCommand message for aiDebug', async () => {
            // Arrange
            const message: WebviewMessage = {
                command: 'runCommand',
                data: {
                    action: 'aiDebug',
                    project: 'test-app',
                    options: {}
                }
            };

            const messageHandler = mockWebview.onDidReceiveMessage.mock.calls[0][0];

            // Act
            await messageHandler(message);

            // Assert
            expect(mockCommandRunner.runAiDebug).toHaveBeenCalledWith('test-app', {});
            expect(receivedMessages.some(msg => msg.type === 'commandResult')).toBe(true);
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
            expect(receivedMessages.some(msg => msg.type === 'projects')).toBe(true);
            
            const projectsMessage = receivedMessages.find(msg => msg.type === 'projects');
            expect(projectsMessage.data.projects).toHaveLength(1);
            expect(projectsMessage.data.projects[0].name).toBe('test-app');
        });

        it('should handle openFile message', async () => {
            // Arrange
            const message: WebviewMessage = {
                command: 'openFile',
                data: {
                    filePath: '/test/file.ts'
                }
            };

            const messageHandler = mockWebview.onDidReceiveMessage.mock.calls[0][0];

            // Act
            await messageHandler(message);

            // Assert
            expect(mockFileManager.openFile).toHaveBeenCalledWith('/test/file.ts');
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
            expect(receivedMessages.some(msg => msg.type === 'outputCleared')).toBe(true);
        });

        it('should handle unknown message command', async () => {
            // Arrange
            const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
            const message: WebviewMessage = {
                command: 'unknownCommand' as any,
                data: {}
            };

            const messageHandler = mockWebview.onDidReceiveMessage.mock.calls[0][0];

            // Act
            await messageHandler(message);

            // Assert
            expect(consoleSpy).toHaveBeenCalledWith('Unknown message command:', 'unknownCommand');
            
            consoleSpy.mockRestore();
        });

        it('should handle command errors gracefully', async () => {
            // Arrange
            mockCommandRunner.runNxTest.mockRejectedValue(new Error('Command failed'));
            
            const message: WebviewMessage = {
                command: 'runCommand',
                data: {
                    action: 'nxTest',
                    project: 'test-app'
                }
            };

            const messageHandler = mockWebview.onDidReceiveMessage.mock.calls[0][0];

            // Act
            await messageHandler(message);

            // Assert
            expect(receivedMessages.some(msg => msg.type === 'commandError')).toBe(true);
            
            const errorMessage = receivedMessages.find(msg => msg.type === 'commandError');
            expect(errorMessage.data.action).toBe('nxTest');
            expect(errorMessage.data.error).toBe('Command failed');
        });

        it('should handle project detection errors', async () => {
            // Arrange
            mockProjectDetector.getProjects.mockRejectedValue(new Error('Project detection failed'));
            
            const message: WebviewMessage = {
                command: 'getProjects',
                data: {}
            };

            const messageHandler = mockWebview.onDidReceiveMessage.mock.calls[0][0];

            // Act
            await messageHandler(message);

            // Assert
            expect(receivedMessages.some(msg => msg.type === 'error')).toBe(true);
            
            const errorMessage = receivedMessages.find(msg => msg.type === 'error');
            expect(errorMessage.data.error).toBe('Project detection failed');
        });

        it('should handle file operation errors', async () => {
            // Arrange
            mockFileManager.openFile.mockRejectedValue(new Error('File not found'));
            
            const message: WebviewMessage = {
                command: 'openFile',
                data: {
                    filePath: '/non/existent/file.ts'
                }
            };

            const messageHandler = mockWebview.onDidReceiveMessage.mock.calls[0][0];

            // Act
            await messageHandler(message);

            // Assert
            expect(receivedMessages.some(msg => msg.type === 'error')).toBe(true);
            
            const errorMessage = receivedMessages.find(msg => msg.type === 'error');
            expect(errorMessage.data.error).toBe('File not found');
        });

        it('should handle invalid action in runCommand', async () => {
            // Arrange
            vscode.window.showErrorMessage = jest.fn();
            
            const message: WebviewMessage = {
                command: 'runCommand',
                data: {
                    action: 'invalidAction' as any,
                    project: 'test-app'
                }
            };

            const messageHandler = mockWebview.onDidReceiveMessage.mock.calls[0][0];

            // Act
            await messageHandler(message);

            // Assert
            expect(receivedMessages.some(msg => msg.type === 'commandError')).toBe(true);
            
            const errorMessage = receivedMessages.find(msg => msg.type === 'commandError');
            expect(errorMessage.data.error).toContain('Unknown action: invalidAction');
        });
    });

    describe('webview setup', () => {
        it('should set up webview correctly', () => {
            // Act
            provider.resolveWebviewView(mockWebviewView, {} as any, {} as any);

            // Assert
            expect(mockWebviewView.webview.options.enableScripts).toBe(true);
            expect(mockWebviewView.webview.options.localResourceRoots).toHaveLength(1);
            expect(mockWebviewView.webview.options.localResourceRoots?.[0]?.toString()).toBe('mock://uri');
            expect(mockWebviewView.webview.html).toContain('<!DOCTYPE html>');
            expect(mockWebviewView.webview.onDidReceiveMessage).toHaveBeenCalled();
            expect(mockFileManager.watchFiles).toHaveBeenCalled();
        });

        it('should set up file watcher', () => {
            // Arrange
            provider.resolveWebviewView(mockWebviewView, {} as any, {} as any);

            // Get the file watcher callback
            const watchFilesCallback = mockFileManager.watchFiles.mock.calls[0][0];

            // Act
            watchFilesCallback('/test/file.ts', 'modified');

            // Assert
            expect(receivedMessages.some(msg => msg.type === 'fileChanged')).toBe(true);
            
            const fileChangedMessage = receivedMessages.find(msg => msg.type === 'fileChanged');
            expect(fileChangedMessage.data.filePath).toBe('/test/file.ts');
            expect(fileChangedMessage.data.eventType).toBe('modified');
        });

        it('should generate correct HTML for webview', () => {
            // Act
            provider.resolveWebviewView(mockWebviewView, {} as any, {} as any);

            // Assert
            const html = mockWebviewView.webview.html;
            expect(html).toContain('<!DOCTYPE html>');
            expect(html).toContain('<title>AI Debug Utilities</title>');
            expect(html).toContain('<div id="root"></div>');
            expect(html).toContain('mock://webview-uri');
        });
    });

    describe('public methods', () => {
        beforeEach(() => {
            provider.resolveWebviewView(mockWebviewView, {} as any, {} as any);
        });

        it('should show webview when show() is called', () => {
            // Act
            provider.show();

            // Assert
            expect(mockWebviewView.show).toHaveBeenCalled();
        });

        it('should run command when runCommand() is called', async () => {
            // Act
            await provider.runCommand('nxTest', { project: 'test-app' });

            // Assert
            expect(mockCommandRunner.runNxTest).toHaveBeenCalledWith('test-app', undefined);
        });

        it('should dispose cleanly', () => {
            // Act
            provider.dispose();

            // Assert - should not throw
            expect(() => provider.dispose()).not.toThrow();
        });
    });
});
