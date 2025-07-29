import * as vscode from 'vscode';
import { QuickPickUtils } from '../../../utils/QuickPickUtils';

// Mock vscode
jest.mock('vscode', () => ({
    window: {
        createQuickPick: jest.fn()
    },
    QuickPickItemKind: {
        Separator: 'separator'
    }
}));

describe('QuickPickUtils', () => {
    let mockQuickPick: any;

    beforeEach(() => {
        mockQuickPick = {
            title: '',
            placeholder: '',
            ignoreFocusOut: false,
            canSelectMany: false,
            items: [],
            activeItems: [],
            onDidAccept: jest.fn(),
            onDidHide: jest.fn(),
            show: jest.fn(),
            hide: jest.fn(),
            dispose: jest.fn()
        };

        (vscode.window.createQuickPick as jest.Mock).mockReturnValue(mockQuickPick);
        jest.clearAllMocks();
    });

    describe('createQuickPick', () => {
        it('should create QuickPick with provided configuration', () => {
            const config = {
                title: 'Test Title',
                placeholder: 'Test Placeholder',
                ignoreFocusOut: true,
                canSelectMany: false
            };

            const result = QuickPickUtils.createQuickPick(config);

            expect(vscode.window.createQuickPick).toHaveBeenCalled();
            expect(result.title).toBe('Test Title');
            expect(result.placeholder).toBe('Test Placeholder');
            expect(result.ignoreFocusOut).toBe(true);
            expect(result.canSelectMany).toBe(false);
        });

        it('should use default values for optional properties', () => {
            const config = {
                title: 'Test Title',
                placeholder: 'Test Placeholder'
            };

            const result = QuickPickUtils.createQuickPick(config);

            expect(result.ignoreFocusOut).toBe(true); // default
            expect(result.canSelectMany).toBe(false); // default
        });
    });

    describe('createBackButton', () => {
        it('should create standardized back button', () => {
            const backButton = QuickPickUtils.createBackButton();

            expect(backButton).toEqual({
                label: '$(arrow-left) Back',
                detail: '',
                description: '',
                id: 'back'
            });
        });
    });

    describe('showQuickPick', () => {
        it('should show QuickPick with items and handle selection', async () => {
            const items = [
                { label: 'Item 1', description: 'First item' },
                { label: 'Item 2', description: 'Second item' }
            ];
            const config = {
                title: 'Test Menu',
                placeholder: 'Select an item'
            };

            // Mock the selection
            mockQuickPick.activeItems = [items[0]];

            // Start the promise
            const promise = QuickPickUtils.showQuickPick(items, config);

            // Simulate user acceptance
            const onAcceptCallback = mockQuickPick.onDidAccept.mock.calls[0][0];
            await onAcceptCallback();

            // Simulate hide event
            const onHideCallback = mockQuickPick.onDidHide.mock.calls[0][0];
            onHideCallback();

            expect(mockQuickPick.items).toEqual(items);
            expect(mockQuickPick.show).toHaveBeenCalled();
            expect(mockQuickPick.hide).toHaveBeenCalled();
            expect(mockQuickPick.dispose).toHaveBeenCalled();
        });

        it('should handle callbacks if provided', async () => {
            const items = [{ label: 'Test Item' }];
            const config = { title: 'Test', placeholder: 'Test' };
            const onAccept = jest.fn();
            const onHide = jest.fn();
            const callbacks = { onAccept, onHide };

            mockQuickPick.activeItems = [items[0]];

            QuickPickUtils.showQuickPick(items, config, callbacks);

            // Simulate accept
            const onAcceptCallback = mockQuickPick.onDidAccept.mock.calls[0][0];
            await onAcceptCallback();

            // Simulate hide
            const onHideCallback = mockQuickPick.onDidHide.mock.calls[0][0];
            onHideCallback();

            expect(onAccept).toHaveBeenCalledWith(items[0], mockQuickPick);
            expect(onHide).toHaveBeenCalledWith(mockQuickPick);
        });
    });

    describe('showManualQuickPick', () => {
        it('should create and show QuickPick with status bar updater', () => {
            const items = [{ label: 'Test Item' }];
            const config = { title: 'Test', placeholder: 'Test' };
            const statusBarUpdater = jest.fn();

            const result = QuickPickUtils.showManualQuickPick(items, config, statusBarUpdater);

            expect(result).toBe(mockQuickPick);
            expect(mockQuickPick.items).toEqual(items);
            expect(mockQuickPick.show).toHaveBeenCalled();
            expect(mockQuickPick.onDidHide).toHaveBeenCalled();

            // Test hide handler
            const onHideCallback = mockQuickPick.onDidHide.mock.calls[0][0];
            onHideCallback();

            expect(statusBarUpdater).toHaveBeenCalledWith('Ready');
            expect(mockQuickPick.dispose).toHaveBeenCalled();
        });
    });

    describe('isBackButton', () => {
        it('should identify back button with arrow-left icon', () => {
            const backButton = { label: '$(arrow-left) Back' };
            expect(QuickPickUtils.isBackButton(backButton)).toBe(true);
        });

        it('should identify back button with arrow symbol', () => {
            const backButton = { label: '← Back' };
            expect(QuickPickUtils.isBackButton(backButton)).toBe(true);
        });

        it('should not identify non-back buttons', () => {
            const regularButton = { label: 'Regular Item' };
            expect(QuickPickUtils.isBackButton(regularButton)).toBe(false);
        });
    });

    describe('createSeparator', () => {
        it('should create separator with empty label by default', () => {
            const separator = QuickPickUtils.createSeparator();

            expect(separator).toEqual({
                label: '',
                kind: 'separator'
            });
        });

        it('should create separator with custom label', () => {
            const separator = QuickPickUtils.createSeparator('Custom Section');

            expect(separator).toEqual({
                label: 'Custom Section',
                kind: 'separator'
            });
        });
    });
});