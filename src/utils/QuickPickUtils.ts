/**
 * QuickPick Utility
 * Centralizes QuickPick creation and common patterns to reduce code duplication
 */

import * as vscode from 'vscode';

export interface QuickPickConfig {
    title: string;
    placeholder: string;
    ignoreFocusOut?: boolean;
    canSelectMany?: boolean;
}

export interface BackButtonItem {
    label: '$(arrow-left) Back';
    detail: '';
    description: '';
    id: 'back';
}

export interface QuickPickCallbacks<T extends vscode.QuickPickItem> {
    onAccept?: (selection: T, quickPick: vscode.QuickPick<T>) => Promise<void> | void;
    onHide?: (quickPick: vscode.QuickPick<T>) => void;
}

/**
 * Utility class for consistent QuickPick creation and management
 */
export class QuickPickUtils {
    /**
     * Create a standard QuickPick with consistent configuration
     */
    static createQuickPick<T extends vscode.QuickPickItem>(config: QuickPickConfig): vscode.QuickPick<T> {
        const quickPick = vscode.window.createQuickPick<T>();
        quickPick.title = config.title;
        quickPick.placeholder = config.placeholder;
        quickPick.ignoreFocusOut = config.ignoreFocusOut ?? true;
        quickPick.canSelectMany = config.canSelectMany ?? false;
        return quickPick;
    }

    /**
     * Create standard back button item
     */
    static createBackButton(): BackButtonItem {
        return {
            label: '$(arrow-left) Back',
            detail: '',
            description: '',
            id: 'back'
        };
    }

    /**
     * Show a QuickPick with promise-based handling and automatic cleanup
     */
    static async showQuickPick<T extends vscode.QuickPickItem>(
        items: T[],
        config: QuickPickConfig,
        callbacks?: QuickPickCallbacks<T>
    ): Promise<T | undefined> {
        const quickPick = this.createQuickPick<T>(config);
        quickPick.items = items;

        return new Promise<T | undefined>((resolve) => {
            quickPick.onDidAccept(async () => {
                const selection = quickPick.activeItems[0];
                if (selection) {
                    if (callbacks?.onAccept) {
                        await callbacks.onAccept(selection, quickPick);
                    }
                    quickPick.hide();
                } else {
                    quickPick.hide();
                }
            });

            quickPick.onDidHide(() => {
                if (callbacks?.onHide) {
                    callbacks.onHide(quickPick);
                }
                quickPick.dispose();
                resolve(quickPick.activeItems[0]);
            });

            quickPick.show();
        });
    }

    /**
     * Show a QuickPick with manual control (returns the QuickPick instance)
     */
    static showManualQuickPick<T extends vscode.QuickPickItem>(
        items: T[],
        config: QuickPickConfig,
        statusBarUpdater?: (text: string) => void
    ): vscode.QuickPick<T> {
        const quickPick = this.createQuickPick<T>(config);
        quickPick.items = items;

        // Add standard hide handler for status bar cleanup
        quickPick.onDidHide(() => {
            if (statusBarUpdater) {
                statusBarUpdater('Ready');
            }
            quickPick.dispose();
        });

        quickPick.show();
        return quickPick;
    }

    /**
     * Check if selection is the back button
     */
    static isBackButton(selection: vscode.QuickPickItem): boolean {
        return selection && (selection.label === '$(arrow-left) Back' || selection.label === '← Back');
    }

    /**
     * Create menu separator
     */
    static createSeparator(label?: string): vscode.QuickPickItem {
        return {
            label: label || '',
            kind: vscode.QuickPickItemKind.Separator
        } as vscode.QuickPickItem;
    }
}