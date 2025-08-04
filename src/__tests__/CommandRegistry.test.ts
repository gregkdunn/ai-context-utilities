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
            runSetup: jest.fn(),
            showWorkspaceInfo: jest.fn(),
            runGitAffected: jest.fn(),
            rerunProjectTestsFromContext: jest.fn(),
            prepareToPush: jest.fn(),
            generatePRDescription: jest.fn()
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
            expect(registeredCommands).toContain('aiDebugContext.runSetup');
            expect(registeredCommands).toContain('aiDebugContext.showWorkspaceInfo');
            expect(registeredCommands).toContain('aiDebugContext.runGitAffected');
            expect(registeredCommands).toContain('aiDebugContext.rerunProjectTests');
            expect(registeredCommands).toContain('aiDebugContext.addCopilotInstructionContexts');
            expect(registeredCommands).toContain('aiDebugContext.prepareToPush');
            expect(registeredCommands).toContain('aiDebugContext.generatePRDescription');
            
            // Should register exactly 8 commands
            expect(registeredCommands).toHaveLength(8);
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

        test('runSetup should delegate to orchestrator.runSetup', async () => {
            const registerSpy = jest.spyOn(vscode.commands, 'registerCommand');
            
            const runSetupCall = registerSpy.mock.calls.find(
                call => call[0] === 'aiDebugContext.runSetup'
            );
            expect(runSetupCall).toBeDefined();
            
            const handler = runSetupCall![1];
            await handler();

            expect(mockOrchestrator.runSetup).toHaveBeenCalled();
        });

        test('showWorkspaceInfo should delegate to orchestrator.showWorkspaceInfo', async () => {
            const registerSpy = jest.spyOn(vscode.commands, 'registerCommand');
            
            const showWorkspaceInfoCall = registerSpy.mock.calls.find(
                call => call[0] === 'aiDebugContext.showWorkspaceInfo'
            );
            expect(showWorkspaceInfoCall).toBeDefined();
            
            const handler = showWorkspaceInfoCall![1];
            await handler();

            expect(mockOrchestrator.showWorkspaceInfo).toHaveBeenCalled();
        });

        test('runGitAffected should delegate to orchestrator.runGitAffected', async () => {
            const registerSpy = jest.spyOn(vscode.commands, 'registerCommand');
            
            const runGitAffectedCall = registerSpy.mock.calls.find(
                call => call[0] === 'aiDebugContext.runGitAffected'
            );
            expect(runGitAffectedCall).toBeDefined();
            
            const handler = runGitAffectedCall![1];
            await handler();

            expect(mockOrchestrator.runGitAffected).toHaveBeenCalled();
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

        test('prepareToPush should delegate to orchestrator.prepareToPush', async () => {
            const registerSpy = jest.spyOn(vscode.commands, 'registerCommand');
            
            const prepareToPushCall = registerSpy.mock.calls.find(
                call => call[0] === 'aiDebugContext.prepareToPush'
            );
            expect(prepareToPushCall).toBeDefined();
            
            const handler = prepareToPushCall![1];
            await handler();

            expect(mockOrchestrator.prepareToPush).toHaveBeenCalled();
        });

        test('generatePRDescription should delegate to orchestrator.generatePRDescription', async () => {
            const registerSpy = jest.spyOn(vscode.commands, 'registerCommand');
            
            const generatePRCall = registerSpy.mock.calls.find(
                call => call[0] === 'aiDebugContext.generatePRDescription'
            );
            expect(generatePRCall).toBeDefined();
            
            const handler = generatePRCall![1];
            await handler();

            expect(mockOrchestrator.generatePRDescription).toHaveBeenCalled();
        });

        test('addCopilotInstructionContexts should handle module loading', async () => {
            const registerSpy = jest.spyOn(vscode.commands, 'registerCommand');
            
            const addCopilotCall = registerSpy.mock.calls.find(
                call => call[0] === 'aiDebugContext.addCopilotInstructionContexts'
            );
            expect(addCopilotCall).toBeDefined();
            
            // Mock the dynamic import
            const mockModule = {
                addCopilotInstructionContexts: jest.fn()
            };
            const mockCopilotInstructionsModule = jest.fn().mockImplementation(() => mockModule);
            
            // Mock the import
            jest.doMock('../modules/copilotInstructions/CopilotInstructionsModule', () => ({
                CopilotInstructionsModule: mockCopilotInstructionsModule
            }));
            
            const handler = addCopilotCall![1];
            await handler();

            // Note: Testing dynamic import is complex and may require additional setup
            // This test ensures the command is registered properly
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