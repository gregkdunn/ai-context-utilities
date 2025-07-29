/**
 * Message Utility
 * Centralizes common message patterns to reduce code duplication
 */

import * as vscode from 'vscode';

/**
 * Utility class for consistent message handling
 */
export class MessageUtils {
    /**
     * Show non-modal information message
     */
    static showInfo(message: string): void {
        vscode.window.showInformationMessage(message, { modal: false });
    }

    /**
     * Show non-modal warning message
     */
    static showWarning(message: string): void {
        vscode.window.showWarningMessage(message, { modal: false });
    }

    /**
     * Show non-modal error message
     */
    static showError(message: string): void {
        vscode.window.showErrorMessage(message, { modal: false });
    }

    /**
     * Show information message with action buttons
     */
    static async showInfoWithActions(message: string, ...actions: string[]): Promise<string | undefined> {
        return vscode.window.showInformationMessage(message, { modal: false }, ...actions);
    }

    /**
     * Show warning message with action buttons
     */
    static async showWarningWithActions(message: string, ...actions: string[]): Promise<string | undefined> {
        return vscode.window.showWarningMessage(message, { modal: false }, ...actions);
    }

    /**
     * Show error message with action buttons
     */
    static async showErrorWithActions(message: string, ...actions: string[]): Promise<string | undefined> {
        return vscode.window.showErrorMessage(message, { modal: false }, ...actions);
    }
}