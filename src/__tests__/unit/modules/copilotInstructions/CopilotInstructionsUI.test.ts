/**
 * Tests for CopilotInstructionsUI
 */

import { CopilotInstructionsUI, UserAction, SetupOption } from '../../../../modules/copilotInstructions/CopilotInstructionsUI';
import { InstructionBackupManager, Backup } from '../../../../modules/copilotInstructions/InstructionBackupManager';
import * as vscode from 'vscode';

// Mock dependencies
jest.mock('vscode', () => ({
    window: {
        showQuickPick: jest.fn(),
        showInformationMessage: jest.fn(),
        showErrorMessage: jest.fn(),
        showTextDocument: jest.fn(),
        setStatusBarMessage: jest.fn()
    },
    workspace: {
        openTextDocument: jest.fn()
    },
    ViewColumn: {
        Beside: 2
    }
}));

jest.mock('../../../../modules/copilotInstructions/InstructionBackupManager');

describe('CopilotInstructionsUI', () => {
    let ui: CopilotInstructionsUI;
    let mockBackupManager: jest.Mocked<InstructionBackupManager>;
    let mockOutputChannel: jest.Mocked<vscode.OutputChannel>;

    beforeEach(() => {
        mockOutputChannel = {
            append: jest.fn(),
            appendLine: jest.fn(),
            show: jest.fn(),
            hide: jest.fn(),
            clear: jest.fn(),
            dispose: jest.fn(),
            name: 'copilot-ui',
            replace: jest.fn()
        };

        mockBackupManager = {} as jest.Mocked<InstructionBackupManager>;

        ui = new CopilotInstructionsUI(mockBackupManager, mockOutputChannel);
        jest.clearAllMocks();
    });

    describe('Constructor', () => {
        test('should create instance with backup manager and output channel', () => {
            expect(ui).toBeDefined();
            expect(ui).toBeInstanceOf(CopilotInstructionsUI);
        });
    });

    describe('UserAction type', () => {
        test('should validate UserAction types', () => {
            const actions: UserAction[] = ['update', 'restore', 'remove', 'cancel', 'create'];
            actions.forEach(action => {
                expect(['update', 'restore', 'remove', 'cancel', 'create']).toContain(action);
            });
        });
    });

    describe('SetupOption interface', () => {
        test('should create valid SetupOption objects', () => {
            const quickOption: SetupOption = { type: 'quick' };
            const customOption: SetupOption = { type: 'custom', frameworks: ['Angular', 'React'] };
            const browseOption: SetupOption = { type: 'browse' };

            expect(quickOption.type).toBe('quick');
            expect(customOption.type).toBe('custom');
            expect(customOption.frameworks).toContain('Angular');
            expect(browseOption.type).toBe('browse');
        });
    });

    describe('handleExistingFiles', () => {
        test('should return update when user selects update option', async () => {
            (vscode.window.showQuickPick as jest.Mock).mockResolvedValue({
                label: '↻ Update existing files'
            });

            const result = await ui.handleExistingFiles(false);
            expect(result).toBe('update');
        });

        test('should return restore when user selects restore option', async () => {
            (vscode.window.showQuickPick as jest.Mock).mockResolvedValue({
                label: '$(history) Restore previous version'
            });

            const result = await ui.handleExistingFiles(true);
            expect(result).toBe('restore');
        });

        test('should return remove when user selects remove option', async () => {
            (vscode.window.showQuickPick as jest.Mock).mockResolvedValue({
                label: '$(trash) Remove current files'
            });

            const result = await ui.handleExistingFiles(true);
            expect(result).toBe('remove');
        });

        test('should return cancel when user cancels', async () => {
            (vscode.window.showQuickPick as jest.Mock).mockResolvedValue(undefined);

            const result = await ui.handleExistingFiles(false);
            expect(result).toBe('cancel');
        });

        test('should include restore option when backup exists', async () => {
            (vscode.window.showQuickPick as jest.Mock).mockImplementation((options) => {
                expect(options.some((opt: any) => opt.label.includes('Restore previous version'))).toBe(true);
                return Promise.resolve({ label: '$(close) Cancel' });
            });

            await ui.handleExistingFiles(true);
        });

        test('should not include restore option when no backup exists', async () => {
            (vscode.window.showQuickPick as jest.Mock).mockImplementation((options) => {
                expect(options.some((opt: any) => opt.label.includes('Restore previous version'))).toBe(false);
                return Promise.resolve({ label: '$(close) Cancel' });
            });

            await ui.handleExistingFiles(false);
        });
    });

    describe('showSetupOptions', () => {
        test('should return quick setup option', async () => {
            (vscode.window.showQuickPick as jest.Mock).mockResolvedValue({
                label: '$(rocket) Quick Setup'
            });

            const result = await ui.showSetupOptions();
            expect(result).toEqual({ type: 'quick' });
        });

        test('should return browse option', async () => {
            (vscode.window.showQuickPick as jest.Mock).mockResolvedValue({
                label: '$(book) Browse Templates'
            });

            const result = await ui.showSetupOptions();
            expect(result).toEqual({ type: 'browse' });
        });

        test('should return undefined when user cancels', async () => {
            (vscode.window.showQuickPick as jest.Mock).mockResolvedValue(undefined);

            const result = await ui.showSetupOptions();
            expect(result).toBeUndefined();
        });

        test('should handle custom setup selection', async () => {
            (vscode.window.showQuickPick as jest.Mock)
                .mockResolvedValueOnce({ label: '$(settings-gear) Custom Setup' })
                .mockResolvedValueOnce([
                    { label: 'Angular' },
                    { label: 'TypeScript' }
                ]);

            const result = await ui.showSetupOptions();
            expect(result).toEqual({
                type: 'custom',
                frameworks: ['Angular', 'TypeScript']
            });
        });
    });

    describe('showRestoreUI', () => {
        test('should show backup options', async () => {
            const mockBackups: Backup[] = [
                {
                    id: 'backup1',
                    timestamp: new Date('2023-01-01T10:00:00Z'),
                    files: ['copilot-instructions.md']
                },
                {
                    id: 'backup2',
                    timestamp: new Date('2023-01-02T10:00:00Z'),
                    files: ['copilot-instructions.md', 'angular.md']
                }
            ];

            mockBackupManager.listBackups = jest.fn().mockResolvedValue(mockBackups);
            
            // Mock the formatted date label that will be generated
            const formattedDate = new Date('2023-01-01T10:00:00Z').toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            
            (vscode.window.showQuickPick as jest.Mock).mockResolvedValue({
                label: formattedDate
            });

            const result = await ui.showRestoreUI();
            expect(result).toBe('backup1');
        });

        test('should return undefined when no backups exist', async () => {
            mockBackupManager.listBackups = jest.fn().mockResolvedValue([]);

            const result = await ui.showRestoreUI();
            expect(result).toBeUndefined();
            expect(vscode.window.showInformationMessage).toHaveBeenCalledWith('No backups available to restore');
        });

        test('should return undefined when user cancels', async () => {
            const mockBackups: Backup[] = [{
                id: 'backup1',
                timestamp: new Date('2023-01-01T10:00:00Z'),
                files: ['copilot-instructions.md']
            }];

            mockBackupManager.listBackups = jest.fn().mockResolvedValue(mockBackups);
            (vscode.window.showQuickPick as jest.Mock).mockResolvedValue(undefined);

            const result = await ui.showRestoreUI();
            expect(result).toBeUndefined();
        });
    });

    describe('showPreview', () => {
        test('should show preview and return true when user saves', async () => {
            const mockDocument = { uri: 'mock-uri' };
            (vscode.workspace.openTextDocument as jest.Mock).mockResolvedValue(mockDocument);
            (vscode.window.showTextDocument as jest.Mock).mockResolvedValue(undefined);
            (vscode.window.showInformationMessage as jest.Mock).mockResolvedValue('Save');

            const result = await ui.showPreview('# Test Content');

            expect(result).toBe(true);
            expect(vscode.workspace.openTextDocument).toHaveBeenCalledWith({
                content: '# Test Content',
                language: 'markdown'
            });
        });

        test('should return false when user cancels', async () => {
            const mockDocument = { uri: 'mock-uri' };
            (vscode.workspace.openTextDocument as jest.Mock).mockResolvedValue(mockDocument);
            (vscode.window.showTextDocument as jest.Mock).mockResolvedValue(undefined);
            (vscode.window.showInformationMessage as jest.Mock).mockResolvedValue('Cancel');

            const result = await ui.showPreview('# Test Content');
            expect(result).toBe(false);
        });
    });

    describe('Utility methods', () => {
        test('should show progress message', () => {
            ui.showProgress('Processing...');
            expect(vscode.window.setStatusBarMessage).toHaveBeenCalledWith('Processing...', 3000);
        });

        test('should show success message', () => {
            ui.showSuccess('Operation completed');
            expect(vscode.window.showInformationMessage).toHaveBeenCalledWith('Operation completed');
            expect(mockOutputChannel.appendLine).toHaveBeenCalledWith('✅ Operation completed');
        });

        test('should show error message without error object', () => {
            ui.showError('Something went wrong');
            expect(vscode.window.showErrorMessage).toHaveBeenCalledWith('Something went wrong');
            expect(mockOutputChannel.appendLine).toHaveBeenCalledWith('❌ Something went wrong');
        });

        test('should show error message with error object', () => {
            const error = new Error('Test error');
            ui.showError('Operation failed', error);
            expect(vscode.window.showErrorMessage).toHaveBeenCalledWith('Operation failed: Error: Test error');
            expect(mockOutputChannel.appendLine).toHaveBeenCalledWith('❌ Operation failed: Error: Test error');
        });
    });

    describe('Date formatting', () => {
        test('should format valid dates correctly', async () => {
            const mockBackups: Backup[] = [{
                id: 'backup1',
                timestamp: new Date('2023-06-15T14:30:00Z'),
                files: ['test.md']
            }];

            mockBackupManager.listBackups = jest.fn().mockResolvedValue(mockBackups);
            (vscode.window.showQuickPick as jest.Mock).mockImplementation((items) => {
                expect(items[0].label).toMatch(/Jun \d+, 2023/);
                return Promise.resolve(undefined);
            });

            await ui.showRestoreUI();
        });

        test('should handle invalid dates gracefully', async () => {
            const mockBackups: Backup[] = [{
                id: 'backup1',
                timestamp: new Date('invalid'),
                files: ['test.md']
            }];

            mockBackupManager.listBackups = jest.fn().mockResolvedValue(mockBackups);
            (vscode.window.showQuickPick as jest.Mock).mockImplementation((items) => {
                expect(items[0].label).toBe('Invalid Date - Corrupted Backup');
                return Promise.resolve(undefined);
            });

            await ui.showRestoreUI();
        });
    });
});