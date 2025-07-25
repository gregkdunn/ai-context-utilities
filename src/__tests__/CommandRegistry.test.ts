import * as vscode from 'vscode';
import { CommandRegistry } from '../core/CommandRegistry';
import { ServiceContainer } from '../core/ServiceContainer';

// Mock vscode
jest.mock('vscode');

describe('CommandRegistry', () => {
    let commandRegistry: CommandRegistry;
    let mockServices: any;
    let mockQuickPick: any;

    beforeEach(() => {
        // Mock services
        mockServices = {
            outputChannel: {
                appendLine: jest.fn(),
                show: jest.fn()
            },
            updateStatusBar: jest.fn(),
            projectDiscovery: {
                getAllProjects: jest.fn().mockResolvedValue([
                    { name: 'app-one', type: 'application', path: '/apps/app-one' },
                    { name: 'lib-one', type: 'library', path: '/libs/lib-one' }
                ])
            },
            workspaceRoot: '/test/workspace'
        };

        // Mock VSCode APIs
        mockQuickPick = {
            title: '',
            placeholder: '',
            items: [],
            show: jest.fn(),
            hide: jest.fn(),
            dispose: jest.fn(),
            onDidAccept: jest.fn(),
            onDidHide: jest.fn()
        };

        (vscode.window.createQuickPick as jest.Mock).mockReturnValue(mockQuickPick);
        (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
            get: jest.fn().mockReturnValue([
                { name: 'recent-project-1', lastUsed: '2024-01-01' },
                { name: 'recent-project-2', lastUsed: '2024-01-02' }
            ])
        });

        commandRegistry = new CommandRegistry(mockServices);
    });

    describe('showMainTestMenu', () => {
        test('should display unified menu with correct title', async () => {
            // Trigger menu display
            const showMenuMethod = (commandRegistry as any).showMainTestMenu.bind(commandRegistry);
            await showMenuMethod();

            expect(mockQuickPick.title).toBe('🧪 AI Debug Context - Test Runner');
            expect(mockQuickPick.placeholder).toBe('Type project name or select an option below');
        });

        test('should show main action buttons in correct order', async () => {
            const showMenuMethod = (commandRegistry as any).showMainTestMenu.bind(commandRegistry);
            await showMenuMethod();

            const items = mockQuickPick.items;
            expect(items[0].label).toContain('Test Affected Projects');
            expect(items[1].label).toContain('Test Updated Files');
            expect(items[2].label).toContain('Select Project');
        });

        test('should display up to 5 recent projects', async () => {
            const showMenuMethod = (commandRegistry as any).showMainTestMenu.bind(commandRegistry);
            await showMenuMethod();

            const items = mockQuickPick.items;
            const recentItems = items.filter((item: any) => 
                item.label?.includes('Run Recent:') || 
                item.label?.includes('$(history)')
            );
            
            expect(recentItems.length).toBeLessThanOrEqual(5);
            expect(recentItems[0].label).toContain('Run Recent: recent-project-1');
        });

        test('should filter out corrupted [Object object] entries', async () => {
            // Mock corrupted data
            (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
                get: jest.fn().mockReturnValue([
                    { name: '[Object object]', lastUsed: '2024-01-01' },
                    { name: 'valid-project', lastUsed: '2024-01-02' },
                    { name: '[object Object]', lastUsed: '2024-01-03' }
                ])
            });

            const showMenuMethod = (commandRegistry as any).showMainTestMenu.bind(commandRegistry);
            await showMenuMethod();

            const items = mockQuickPick.items;
            const recentItems = items.filter((item: any) => 
                item.label?.includes('Run Recent:') || 
                item.label?.includes('$(history)')
            );
            
            // Should only show valid project
            expect(recentItems.length).toBe(1);
            expect(recentItems[0].label).toContain('valid-project');
            expect(recentItems[0].label).not.toContain('Object object');
        });
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
        });
    });

    describe('Project Execution', () => {
        test('should save project to recent when executing tests', async () => {
            const updateSpy = jest.fn();
            (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
                get: jest.fn().mockReturnValue([]),
                update: updateSpy
            });

            const executeMethod = (commandRegistry as any).executeProjectTest.bind(commandRegistry);
            await executeMethod('test-project');

            expect(updateSpy).toHaveBeenCalledWith(
                'recentProjects',
                expect.arrayContaining([
                    expect.objectContaining({
                        name: 'test-project',
                        lastUsed: expect.any(String)
                    })
                ]),
                true
            );
        });

        test('should show timestamp in output for test runs', async () => {
            const executeMethod = (commandRegistry as any).executeProjectTest.bind(commandRegistry);
            await executeMethod('test-project');

            expect(mockServices.outputChannel.appendLine).toHaveBeenCalledWith(
                expect.stringMatching(/🧪 \[\d{1,2}:\d{2}:\d{2} [AP]M\] TESTING: TEST-PROJECT/)
            );
        });
    });
});