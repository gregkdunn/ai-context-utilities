import * as vscode from 'vscode';
import { NxAffectedManager, AffectedCommandResult } from './NxAffectedManager';

export class NxCommandProvider {
    constructor(private nxManager: NxAffectedManager) {}

    register(): vscode.Disposable[] {
        return [
            vscode.commands.registerCommand('nx.runAffected', this.runAffected.bind(this)),
            vscode.commands.registerCommand('nx.testAffected', this.testAffected.bind(this)),
            vscode.commands.registerCommand('nx.lintAffected', this.lintAffected.bind(this)),
            vscode.commands.registerCommand('nx.buildAffected', this.buildAffected.bind(this)),
            vscode.commands.registerCommand('nx.showAffectedProjects', this.showAffectedProjects.bind(this)),
            vscode.commands.registerCommand('nx.selectBaseBranch', this.selectBaseBranch.bind(this))
        ];
    }

    private async runAffected(target?: string): Promise<void> {
        try {
            const selectedTarget = target || await this.selectTarget();
            if (!selectedTarget) {
                return;
            }

            const baseBranch = await this.getBaseBranch();
            const projects = await this.nxManager.getAffectedProjects(baseBranch);

            if (projects.length === 0) {
                vscode.window.showInformationMessage('No affected projects found');
                return;
            }

            const proceed = await vscode.window.showInformationMessage(
                `Found ${projects.length} affected projects. Run ${selectedTarget}?`,
                { modal: true },
                'Yes',
                'Show Projects First'
            );

            if (proceed === 'Show Projects First') {
                await this.showAffectedProjects();
                const runNow = await vscode.window.showInformationMessage(
                    `Run ${selectedTarget} on these projects?`,
                    'Yes',
                    'No'
                );
                if (runNow !== 'Yes') {
                    return;
                }
            } else if (proceed !== 'Yes') {
                return;
            }

            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: `Running ${selectedTarget} on ${projects.length} affected projects`,
                cancellable: true
            }, async (progress, token) => {
                const result = await this.nxManager.runAffectedCommand(selectedTarget, baseBranch);
                
                if (result.success) {
                    vscode.window.showInformationMessage(
                        `Successfully ran ${selectedTarget} on ${result.projects.length} projects`
                    );
                } else {
                    vscode.window.showErrorMessage(
                        `Failed to run ${selectedTarget}: ${result.errors?.join(', ')}`
                    );
                }

                this.showCommandOutput(result, selectedTarget);
            });

        } catch (error) {
            vscode.window.showErrorMessage(`Failed to run affected ${target || 'command'}: ${(error as Error).message}`);
        }
    }

    private async testAffected(): Promise<void> {
        await this.runAffected('test');
    }

    private async lintAffected(): Promise<void> {
        await this.runAffected('lint');
    }

    private async buildAffected(): Promise<void> {
        await this.runAffected('build');
    }

    private async showAffectedProjects(): Promise<void> {
        try {
            const baseBranch = await this.getBaseBranch();
            const projects = await this.nxManager.getAffectedProjects(baseBranch);

            if (projects.length === 0) {
                vscode.window.showInformationMessage('No affected projects found');
                return;
            }

            const quickPick = vscode.window.createQuickPick();
            quickPick.items = projects.map(project => ({
                label: project,
                description: 'Affected project'
            }));
            quickPick.title = `Affected Projects (${projects.length}) - Base: ${baseBranch}`;
            quickPick.placeholder = 'Select a project to view details';
            quickPick.canSelectMany = false;
            
            quickPick.onDidAccept(async () => {
                const selectedItem = quickPick.selectedItems[0];
                if (selectedItem) {
                    await this.showProjectDetails(selectedItem.label);
                }
                quickPick.dispose();
            });

            quickPick.show();
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to show affected projects: ${(error as Error).message}`);
        }
    }

    private async showProjectDetails(projectName: string): Promise<void> {
        try {
            const projectConfig = await this.nxManager.getProjectConfiguration(projectName);
            const targets = Object.keys(projectConfig.targets).join(', ');
            
            const details = `# ${projectName}\n\n` +
                `**Type:** ${projectConfig.type}\n` +
                `**Root:** ${projectConfig.root}\n` +
                `**Available Targets:** ${targets}\n\n` +
                `**Configuration:**\n` +
                `\`\`\`json\n${JSON.stringify(projectConfig.targets, null, 2)}\n\`\`\``;

            const doc = await vscode.workspace.openTextDocument({
                content: details,
                language: 'markdown'
            });
            await vscode.window.showTextDocument(doc);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to show project details: ${(error as Error).message}`);
        }
    }

    private async selectTarget(): Promise<string | undefined> {
        const targets = ['test', 'lint', 'build', 'serve', 'e2e'];
        const selected = await vscode.window.showQuickPick(targets, {
            placeHolder: 'Select a target to run on affected projects'
        });
        return selected;
    }

    private async selectBaseBranch(): Promise<void> {
        const branches = await this.getAvailableBranches();
        const selected = await vscode.window.showQuickPick(branches, {
            placeHolder: 'Select base branch for affected calculation'
        });

        if (selected) {
            const config = vscode.workspace.getConfiguration('nxAngular');
            await config.update('defaultBase', selected, vscode.ConfigurationTarget.Workspace);
            vscode.window.showInformationMessage(`Base branch set to: ${selected}`);
        }
    }

    private async getBaseBranch(): Promise<string> {
        const config = vscode.workspace.getConfiguration('nxAngular');
        return config.get('defaultBase', 'main');
    }

    private async getAvailableBranches(): Promise<string[]> {
        return new Promise((resolve) => {
            const { spawn } = require('child_process');
            const child = spawn('git', ['branch', '-r'], {
                cwd: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath,
                stdio: 'pipe'
            });

            let output = '';
            child.stdout.on('data', (data: any) => {
                output += data.toString();
            });

            child.on('close', () => {
                const branches = output
                    .split('\n')
                    .map(line => line.trim())
                    .filter(line => line && !line.includes('HEAD'))
                    .map(line => line.replace(/^origin\//, ''));
                resolve(['main', 'master', 'develop', ...branches]);
            });

            child.on('error', () => {
                resolve(['main', 'master', 'develop']);
            });
        });
    }

    private showCommandOutput(result: AffectedCommandResult, command: string): void {
        const outputChannel = vscode.window.createOutputChannel(`NX ${command} Output`);
        outputChannel.appendLine(`=== NX ${command} Results ===`);
        outputChannel.appendLine(`Projects: ${result.projects.join(', ')}`);
        outputChannel.appendLine(`Success: ${result.success}`);
        outputChannel.appendLine('');
        outputChannel.appendLine('=== Command Output ===');
        outputChannel.appendLine(result.output);
        
        if (result.errors && result.errors.length > 0) {
            outputChannel.appendLine('');
            outputChannel.appendLine('=== Errors ===');
            result.errors.forEach(error => outputChannel.appendLine(error));
        }
        
        outputChannel.show();
    }
}
