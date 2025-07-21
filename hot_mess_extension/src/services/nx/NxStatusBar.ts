import * as vscode from 'vscode';
import { NxAffectedManager, NxProject } from './NxAffectedManager';

export class NxStatusBar {
    private statusBarItem: vscode.StatusBarItem;
    private affectedCount: number = 0;
    private isNxWorkspace: boolean = false;

    constructor(private context: vscode.ExtensionContext, private nxManager: NxAffectedManager) {
        this.statusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Left,
            10
        );
        this.statusBarItem.command = 'nx.showAffectedProjects';
        this.initialize();
    }

    private async initialize(): Promise<void> {
        this.isNxWorkspace = await this.nxManager.isNxWorkspace();
        if (this.isNxWorkspace) {
            await this.updateAffectedCount();
            this.updateStatusBar();
            this.statusBarItem.show();
            this.context.subscriptions.push(this.statusBarItem);
        }
    }

    async updateAffectedCount(): Promise<void> {
        if (!this.isNxWorkspace) {return;}

        try {
            const config = vscode.workspace.getConfiguration('nxAngular');
            const baseBranch = config.get('defaultBase', 'main');
            const projects = await this.nxManager.getAffectedProjects(baseBranch);
            this.affectedCount = projects.length;
            this.updateStatusBar();
        } catch (error) {
            console.error('Failed to update affected count:', error);
            this.affectedCount = 0;
            this.updateStatusBar();
        }
    }

    private updateStatusBar(): void {
        if (!this.isNxWorkspace) {return;}

        const statusText = `$(gear) NX (${this.affectedCount} affected)`;
        this.statusBarItem.text = statusText;
        this.statusBarItem.tooltip = `${this.affectedCount} projects affected by recent changes. Click to view details.`;
        
        // Update color based on affected count
        if (this.affectedCount > 0) {
            this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
        } else {
            this.statusBarItem.backgroundColor = undefined;
        }
    }

    dispose(): void {
        if (this.statusBarItem) {
            this.statusBarItem.dispose();
        }
    }
}
