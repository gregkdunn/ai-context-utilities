import * as vscode from 'vscode';
import { MessageUtils } from '../../../utils/MessageUtils';

// Mock vscode
jest.mock('vscode', () => ({
    window: {
        showInformationMessage: jest.fn(),
        showWarningMessage: jest.fn(),
        showErrorMessage: jest.fn()
    }
}));

describe('MessageUtils', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('showInfo', () => {
        it('should show information message with non-modal configuration', () => {
            const message = 'Test info message';
            
            MessageUtils.showInfo(message);

            expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
                message,
                { modal: false }
            );
        });
    });

    describe('showWarning', () => {
        it('should show warning message with non-modal configuration', () => {
            const message = 'Test warning message';
            
            MessageUtils.showWarning(message);

            expect(vscode.window.showWarningMessage).toHaveBeenCalledWith(
                message,
                { modal: false }
            );
        });
    });

    describe('showError', () => {
        it('should show error message with non-modal configuration', () => {
            const message = 'Test error message';
            
            MessageUtils.showError(message);

            expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
                message,
                { modal: false }
            );
        });
    });

    describe('showInfoWithActions', () => {
        it('should show information message with action buttons', async () => {
            const message = 'Test message';
            const actions = ['Action 1', 'Action 2'];
            const expectedReturn = 'Action 1';

            (vscode.window.showInformationMessage as jest.Mock)
                .mockResolvedValue(expectedReturn);

            const result = await MessageUtils.showInfoWithActions(message, ...actions);

            expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
                message,
                { modal: false },
                'Action 1',
                'Action 2'
            );
            expect(result).toBe(expectedReturn);
        });

        it('should handle no actions', async () => {
            const message = 'Test message';

            await MessageUtils.showInfoWithActions(message);

            expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
                message,
                { modal: false }
            );
        });
    });

    describe('showWarningWithActions', () => {
        it('should show warning message with action buttons', async () => {
            const message = 'Test warning';
            const actions = ['OK', 'Cancel'];

            await MessageUtils.showWarningWithActions(message, ...actions);

            expect(vscode.window.showWarningMessage).toHaveBeenCalledWith(
                message,
                { modal: false },
                'OK',
                'Cancel'
            );
        });
    });

    describe('showErrorWithActions', () => {
        it('should show error message with action buttons', async () => {
            const message = 'Test error';
            const actions = ['Retry', 'Ignore'];

            await MessageUtils.showErrorWithActions(message, ...actions);

            expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
                message,
                { modal: false },
                'Retry',
                'Ignore'
            );
        });
    });
});