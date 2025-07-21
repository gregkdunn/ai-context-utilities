import * as vscode from 'vscode';
import { GitDiffManager, GitCommit, GitBranch, GitDiff } from './GitDiffManager';

export class GitCommandProvider {
    constructor(private gitManager: GitDiffManager) {}

    register(): vscode.Disposable[] {
        return [
            vscode.commands.registerCommand('git.interactiveDiff', this.interactiveDiff.bind(this)),
            vscode.commands.registerCommand('git.compareCommits', this.compareCommits.bind(this)),
            vscode.commands.registerCommand('git.compareBranches', this.compareBranches.bind(this)),
            vscode.commands.registerCommand('git.showCommitHistory', this.showCommitHistory.bind(this)),
            vscode.commands.registerCommand('git.enhancedDiff', this.enhancedDiff.bind(this))
        ];
    }

    private async interactiveDiff(): Promise<void> {
        try {
            const isGitRepo = await this.gitManager.isGitRepository();
            if (!isGitRepo) {
                vscode.window.showErrorMessage('Not a Git repository');
                return;
            }

            const action = await vscode.window.showQuickPick([
                { label: 'Compare Commits', description: 'Select two commits to compare' },
                { label: 'Compare Branches', description: 'Select two branches to compare' },
                { label: 'View Commit History', description: 'Browse recent commits' }
            ], {
                placeHolder: 'What would you like to do?'
            });

            if (!action) {
                return;
            }

            switch (action.label) {
                case 'Compare Commits':
                    await this.compareCommits();
                    break;
                case 'Compare Branches':
                    await this.compareBranches();
                    break;
                case 'View Commit History':
                    await this.showCommitHistory();
                    break;
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Interactive diff failed: ${(error as Error).message}`);
        }
    }

    private async compareCommits(): Promise<void> {
        try {
            const commits = await this.gitManager.getCommitHistory(50);
            if (commits.length === 0) {
                vscode.window.showErrorMessage('No commits found');
                return;
            }

            const commit1 = await this.selectCommit(commits, 'Select first commit');
            if (!commit1) {
                return;
            }

            const commit2 = await this.selectCommit(commits, 'Select second commit');
            if (!commit2) {
                return;
            }

            const diff = await this.gitManager.getCommitDiff(commit1.hash, commit2.hash);
            await this.showDiffResults(diff, `${commit1.hash.substring(0, 7)} → ${commit2.hash.substring(0, 7)}`);

            // Show detailed diff in a new document
            const detailedDiff = await this.gitManager.getInteractiveDiff(commit1.hash, commit2.hash);
            await this.showDiffDocument(detailedDiff, `Diff: ${commit1.hash.substring(0, 7)} → ${commit2.hash.substring(0, 7)}`);
        } catch (error) {
            vscode.window.showErrorMessage(`Compare commits failed: ${(error as Error).message}`);
        }
    }

    private async compareBranches(): Promise<void> {
        try {
            const branches = await this.gitManager.getBranches();
            if (branches.length === 0) {
                vscode.window.showErrorMessage('No branches found');
                return;
            }

            const branch1 = await this.selectBranch(branches, 'Select first branch');
            if (!branch1) {
                return;
            }

            const branch2 = await this.selectBranch(branches, 'Select second branch');
            if (!branch2) {
                return;
            }

            const diff = await this.gitManager.getBranchDiff(branch1.name, branch2.name);
            await this.showDiffResults(diff, `${branch1.name} → ${branch2.name}`);

            // Show detailed diff in a new document
            const detailedDiff = await this.gitManager.getInteractiveDiff(branch1.name, branch2.name);
            await this.showDiffDocument(detailedDiff, `Diff: ${branch1.name} → ${branch2.name}`);
        } catch (error) {
            vscode.window.showErrorMessage(`Compare branches failed: ${(error as Error).message}`);
        }
    }

    private async showCommitHistory(): Promise<void> {
        try {
            const commits = await this.gitManager.getCommitHistory(100);
            if (commits.length === 0) {
                vscode.window.showErrorMessage('No commits found');
                return;
            }

            const quickPick = vscode.window.createQuickPick();
            quickPick.items = commits.map(commit => ({
                label: `$(git-commit) ${commit.hash.substring(0, 7)}`,
                description: commit.message,
                detail: `${commit.author} • ${commit.date}`,
                commit
            }));
            quickPick.title = 'Git Commit History';
            quickPick.placeholder = 'Select a commit to view details';
            quickPick.matchOnDescription = true;
            quickPick.matchOnDetail = true;

            quickPick.onDidAccept(async () => {
                const selectedItem = quickPick.selectedItems[0] as any;
                if (selectedItem) {
                    await this.showCommitDetails(selectedItem.commit);
                }
                quickPick.dispose();
            });

            quickPick.show();
        } catch (error) {
            vscode.window.showErrorMessage(`Show commit history failed: ${(error as Error).message}`);
        }
    }

    private async enhancedDiff(): Promise<void> {
        try {
            const currentBranch = await this.gitManager.getCurrentBranch();
            const mainBranch = await this.detectMainBranch();

            if (currentBranch === mainBranch) {
                vscode.window.showInformationMessage('You are already on the main branch');
                return;
            }

            const diff = await this.gitManager.getBranchDiff(mainBranch, currentBranch);
            await this.showDiffResults(diff, `${mainBranch} → ${currentBranch}`);

            // Show detailed diff in a new document
            const detailedDiff = await this.gitManager.getInteractiveDiff(mainBranch, currentBranch);
            await this.showDiffDocument(detailedDiff, `Enhanced Diff: ${mainBranch} → ${currentBranch}`);
        } catch (error) {
            vscode.window.showErrorMessage(`Enhanced diff failed: ${(error as Error).message}`);
        }
    }

    private async selectCommit(commits: GitCommit[], title: string): Promise<GitCommit | undefined> {
        const selected = await vscode.window.showQuickPick(
            commits.map(commit => ({
                label: `$(git-commit) ${commit.hash.substring(0, 7)}`,
                description: commit.message,
                detail: `${commit.author} • ${commit.date}`,
                commit
            })),
            {
                placeHolder: title,
                matchOnDescription: true,
                matchOnDetail: true
            }
        );

        return selected?.commit;
    }

    private async selectBranch(branches: GitBranch[], title: string): Promise<GitBranch | undefined> {
        const selected = await vscode.window.showQuickPick(
            branches.map(branch => ({
                label: `$(git-branch) ${branch.name}`,
                description: branch.isRemote ? 'Remote' : 'Local',
                detail: branch.isHead ? 'Current branch' : '',
                branch
            })),
            {
                placeHolder: title
            }
        );

        return selected?.branch;
    }

    private async showDiffResults(diff: GitDiff, title: string): Promise<void> {
        const panel = vscode.window.createWebviewPanel(
            'gitDiffResults',
            `Git Diff: ${title}`,
            vscode.ViewColumn.Two,
            { enableScripts: true }
        );

        const filesList = diff.files.map(file => {
            const statusIcon = this.getStatusIcon(file.status);
            return `<div class="file-item">
                <span class="status-icon ${file.status}">${statusIcon}</span>
                <span class="file-path">${file.path}</span>
            </div>`;
        }).join('');

        panel.webview.html = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: var(--vscode-font-family); }
                    .summary { 
                        background: var(--vscode-editor-background); 
                        padding: 15px; 
                        border-radius: 5px; 
                        margin-bottom: 20px; 
                    }
                    .file-item { 
                        display: flex; 
                        align-items: center; 
                        padding: 5px 0; 
                        border-bottom: 1px solid var(--vscode-widget-border);
                    }
                    .status-icon { 
                        margin-right: 10px; 
                        width: 20px; 
                        font-weight: bold; 
                    }
                    .added { color: var(--vscode-gitDecoration-addedResourceForeground); }
                    .modified { color: var(--vscode-gitDecoration-modifiedResourceForeground); }
                    .deleted { color: var(--vscode-gitDecoration-deletedResourceForeground); }
                    .renamed { color: var(--vscode-gitDecoration-renamedResourceForeground); }
                    .file-path { font-family: var(--vscode-editor-font-family); }
                </style>
            </head>
            <body>
                <div class="summary">
                    <h3>Diff Summary</h3>
                    <p>${diff.summary}</p>
                </div>
                <div class="files">
                    <h3>Changed Files (${diff.files.length})</h3>
                    ${filesList}
                </div>
            </body>
            </html>
        `;
    }

    private getStatusIcon(status: string): string {
        switch (status) {
            case 'added': return '+';
            case 'modified': return '~';
            case 'deleted': return '-';
            case 'renamed': return '→';
            default: return '?';
        }
    }

    private async showDiffDocument(diffContent: string, title: string): Promise<void> {
        const doc = await vscode.workspace.openTextDocument({
            content: diffContent,
            language: 'diff'
        });
        await vscode.window.showTextDocument(doc, { preview: false });
    }

    private async showCommitDetails(commit: GitCommit): Promise<void> {
        const details = `# Commit Details\n\n` +
            `**Hash:** ${commit.hash}\n` +
            `**Message:** ${commit.message}\n` +
            `**Author:** ${commit.author}\n` +
            `**Date:** ${commit.date}\n` +
            `**Parents:** ${commit.parents.join(', ')}\n\n` +
            `## Actions\n\n` +
            `- Compare with parent\n` +
            `- View file changes\n` +
            `- Show commit in terminal`;

        const doc = await vscode.workspace.openTextDocument({
            content: details,
            language: 'markdown'
        });
        await vscode.window.showTextDocument(doc);
    }

    private async detectMainBranch(): Promise<string> {
        const branches = await this.gitManager.getBranches();
        const mainBranches = ['main', 'master', 'develop'];
        
        for (const mainBranch of mainBranches) {
            if (branches.some(b => b.name === mainBranch)) {
                return mainBranch;
            }
        }
        
        return 'main'; // Default fallback
    }
}
