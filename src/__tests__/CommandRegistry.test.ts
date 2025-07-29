import * as vscode from 'vscode';
import { CommandRegistry } from '../core/CommandRegistry';
import { ServiceContainer } from '../core/ServiceContainer';
import { TestMenuOrchestrator } from '../services/TestMenuOrchestrator';

// Mock vscode
jest.mock('vscode', () => ({
    window: {
        createQuickPick: jest.fn(),
        showQuickPick: jest.fn(),
        showInformationMessage: jest.fn()
    },
    commands: {
        registerCommand: jest.fn()
    },
    workspace: {
        getConfiguration: jest.fn()
    },
    QuickPickItemKind: {
        Separator: 'separator'
    }
}));

// Mock the TestMenuOrchestrator
jest.mock('../services/TestMenuOrchestrator');

describe('CommandRegistry', () => {
    let commandRegistry: CommandRegistry;
    let mockServices: any;
    let mockOrchestrator: jest.Mocked<TestMenuOrchestrator>;

    beforeEach(() => {
        // Mock services
        mockServices = {
            outputChannel: {
                appendLine: jest.fn(),
                show: jest.fn()
            },
            updateStatusBar: jest.fn(),
            errorHandler: {
                handleError: jest.fn().mockReturnValue({}),
                showUserError: jest.fn()
            },
            workspaceRoot: '/test/workspace'
        };

        // Mock orchestrator methods
        mockOrchestrator = {
            showMainMenu: jest.fn(),
            showProjectBrowser: jest.fn(),
            runGitAffected: jest.fn(),
            toggleFileWatcher: jest.fn(),
            clearTestCache: jest.fn(),
            runSetup: jest.fn(),
            showWorkspaceInfo: jest.fn(),
            createConfig: jest.fn(),
            openPostTestContext: jest.fn(),
            rerunProjectTestsFromContext: jest.fn()
        } as any;

        // Make TestMenuOrchestrator constructor return our mock
        (TestMenuOrchestrator as jest.Mock).mockImplementation(() => mockOrchestrator);

        // Reset all mocks
        jest.clearAllMocks();

        commandRegistry = new CommandRegistry(mockServices);
    });

    describe('Command Registration', () => {
        test('should register all required commands', () => {
            const registerSpy = jest.spyOn(vscode.commands, 'registerCommand');
            commandRegistry.registerAll();

            const registeredCommands = registerSpy.mock.calls.map(call => call[0]);
            
            expect(registeredCommands).toContain('aiDebugContext.runAffectedTests');
            expect(registeredCommands).toContain('aiDebugContext.selectProject');
            expect(registeredCommands).toContain('aiDebugContext.clearTestCache');
            expect(registeredCommands).toContain('aiDebugContext.startFileWatcher');
            expect(registeredCommands).toContain('aiDebugContext.runSetup');
            expect(registeredCommands).toContain('aiDebugContext.showWorkspaceInfo');
            expect(registeredCommands).toContain('aiDebugContext.runGitAffected');
            expect(registeredCommands).toContain('aiDebugContext.runCopilotInstructionContexts');
            expect(registeredCommands).toContain('aiDebugContext.createConfig');
            expect(registeredCommands).toContain('aiDebugContext.openContextBrowser');
            expect(registeredCommands).toContain('aiDebugContext.rerunProjectTests');
        });

        test('should return array of disposables', () => {
            const mockDisposable = { dispose: jest.fn() };
            jest.spyOn(vscode.commands, 'registerCommand').mockReturnValue(mockDisposable);

            const disposables = commandRegistry.registerAll();

            expect(Array.isArray(disposables)).toBe(true);
            expect(disposables.length).toBeGreaterThan(0);
            expect(disposables[0]).toBe(mockDisposable);
        });
    });

    describe('Command Delegation', () => {
        beforeEach(() => {
            // Register commands before testing them
            commandRegistry.registerAll();
        });

        test('runAffectedTests should delegate to orchestrator.showMainMenu', async () => {
            const registerSpy = jest.spyOn(vscode.commands, 'registerCommand');
            
            // Find the runAffectedTests handler
            const runAffectedTestsCall = registerSpy.mock.calls.find(
                call => call[0] === 'aiDebugContext.runAffectedTests'
            );
            expect(runAffectedTestsCall).toBeDefined();
            
            const handler = runAffectedTestsCall![1];
            await handler();

            expect(mockOrchestrator.showMainMenu).toHaveBeenCalled();
        });

        test('selectProject should delegate to orchestrator.showProjectBrowser', async () => {
            const registerSpy = jest.spyOn(vscode.commands, 'registerCommand');
            
            const selectProjectCall = registerSpy.mock.calls.find(
                call => call[0] === 'aiDebugContext.selectProject'
            );
            expect(selectProjectCall).toBeDefined();
            
            const handler = selectProjectCall![1];
            await handler();

            expect(mockOrchestrator.showProjectBrowser).toHaveBeenCalled();
        });

        test('clearTestCache should delegate to orchestrator.clearTestCache', async () => {
            const registerSpy = jest.spyOn(vscode.commands, 'registerCommand');
            
            const clearCacheCall = registerSpy.mock.calls.find(
                call => call[0] === 'aiDebugContext.clearTestCache'
            );
            expect(clearCacheCall).toBeDefined();
            
            const handler = clearCacheCall![1];
            await handler();

            expect(mockOrchestrator.clearTestCache).toHaveBeenCalled();
        });

        test('startFileWatcher should delegate to orchestrator.toggleFileWatcher', async () => {
            const registerSpy = jest.spyOn(vscode.commands, 'registerCommand');
            
            const fileWatcherCall = registerSpy.mock.calls.find(
                call => call[0] === 'aiDebugContext.startFileWatcher'
            );
            expect(fileWatcherCall).toBeDefined();
            
            const handler = fileWatcherCall![1];
            await handler();

            expect(mockOrchestrator.toggleFileWatcher).toHaveBeenCalled();
        });

        test('rerunProjectTests should delegate to orchestrator.rerunProjectTestsFromContext', async () => {
            const registerSpy = jest.spyOn(vscode.commands, 'registerCommand');
            
            const rerunCall = registerSpy.mock.calls.find(
                call => call[0] === 'aiDebugContext.rerunProjectTests'
            );
            expect(rerunCall).toBeDefined();
            
            const handler = rerunCall![1];
            await handler();

            expect(mockOrchestrator.rerunProjectTestsFromContext).toHaveBeenCalled();
        });
    });

    describe('Error Handling', () => {
        beforeEach(() => {
            commandRegistry.registerAll();
        });

        test('should handle errors in command execution', async () => {
            const error = new Error('Test error');
            mockOrchestrator.showMainMenu.mockRejectedValue(error);

            const registerSpy = jest.spyOn(vscode.commands, 'registerCommand');
            const runAffectedTestsCall = registerSpy.mock.calls.find(
                call => call[0] === 'aiDebugContext.runAffectedTests'
            );
            
            const handler = runAffectedTestsCall![1];
            await handler();

            expect(mockServices.updateStatusBar).toHaveBeenCalledWith('❌ Error', 'red');
            expect(mockServices.errorHandler.handleError).toHaveBeenCalledWith(error, { command: 'runAffectedTests' });
            expect(mockServices.errorHandler.showUserError).toHaveBeenCalled();
        });
    });

    describe('Disposal', () => {
        test('should dispose all registered commands', () => {
            const mockDisposable = { dispose: jest.fn() };
            jest.spyOn(vscode.commands, 'registerCommand').mockReturnValue(mockDisposable);

            commandRegistry.registerAll();
            commandRegistry.dispose();

            expect(mockDisposable.dispose).toHaveBeenCalled();
        });
    });
});