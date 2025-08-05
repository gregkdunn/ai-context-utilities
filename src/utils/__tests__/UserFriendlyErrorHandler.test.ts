/**
 * Unit tests for UserFriendlyErrorHandler
 */

import * as vscode from 'vscode';
import { UserFriendlyErrorHandler } from '../UserFriendlyErrorHandler';

// Mock vscode
jest.mock('vscode', () => ({
    window: {
        showErrorMessage: jest.fn(),
        showWarningMessage: jest.fn(),
        showInformationMessage: jest.fn()
    },
    OutputChannel: jest.fn()
}));

describe('UserFriendlyErrorHandler', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('showError', () => {
        it('should show error message with actions', async () => {
            const error = new Error('fatal: not a git repository');
            (vscode.window.showErrorMessage as jest.Mock).mockResolvedValue('Dismiss');

            await UserFriendlyErrorHandler.showError(error, 'Test Operation');

            expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
                expect.stringContaining("This isn't a Git repository"),
                'Show Fix',
                'Retry',
                'Dismiss'
            );
        });

        it('should show fix when requested', async () => {
            const error = new Error('fatal: not a git repository');
            (vscode.window.showErrorMessage as jest.Mock).mockResolvedValue('Show Fix');

            await UserFriendlyErrorHandler.showError(error);

            expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
                expect.stringContaining('git init'),
                'Got it'
            );
        });
    });

    describe('transformError', () => {
        it('should transform git repository error', () => {
            const result = UserFriendlyErrorHandler.transformError('fatal: not a git repository');

            expect(result.message).toBe("This isn't a Git repository");
            expect(result.canRetry).toBe(true);
            expect(result.suggestedFix).toBe("Run 'git init' in your project folder");
        });

        it('should transform no changes error', () => {
            const result = UserFriendlyErrorHandler.transformError('nothing to commit');

            expect(result.message).toBe('No changes detected');
            expect(result.canRetry).toBe(true);
            expect(result.details).toBe('Make some changes to your code first');
        });

        it('should return generic error for unknown patterns', () => {
            const result = UserFriendlyErrorHandler.transformError('Unknown error message');

            expect(result.message).toBe('Something went wrong');
            expect(result.canRetry).toBe(true);
        });
    });

    describe('getActionableMessage', () => {
        it('should get actionable message for error', () => {
            const error = new Error('fatal: not a git repository');

            const message = UserFriendlyErrorHandler.getActionableMessage(error, 'Test Context');

            expect(message).toContain("This isn't a Git repository");
            expect(message).toContain('👉 Initialize Git');
            expect(message).toContain('💡 Run \'git init\'');
        });
    });

    describe('canRetry', () => {
        it('should check if error is retryable', () => {
            const error = new Error('fatal: not a git repository');

            const canRetry = UserFriendlyErrorHandler.canRetry(error);

            expect(canRetry).toBe(true);
        });
    });

    describe('formatForLogging', () => {
        it('should format error for logging', () => {
            const error = new Error('fatal: not a git repository');

            const formatted = UserFriendlyErrorHandler.formatForLogging(error, 'Test Operation');

            expect(formatted).toContain('Test Operation');
            expect(formatted).toContain("This isn't a Git repository");
        });
    });
});