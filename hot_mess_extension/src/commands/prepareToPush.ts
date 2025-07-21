import * as vscode from 'vscode';
import { spawn } from 'child_process';
import { CommandOptions, CommandResult } from '../types';

export class PrepareToPushCommand {
    
    constructor() {}

    /**
     * Run Prepare to Push command (lint and format)
     */
    async run(project: string, options: CommandOptions = {}): Promise<CommandResult> {
        const startTime = Date.now();
        
        try {
            if (!project) {
                throw new Error("Project name is required");
            }

            this.showHeader(`Preparing to Push: ${project}`);

            // Step 1: Run linting
            this.showStep("Running linter...");
            this.showInfo(`Command: yarn nx lint ${project}`);
            
            const lintResult = await this.executeLint(project);
            
            if (lintResult.success) {
                this.showSuccess("Linting passed!");
            } else {
                this.showError(`Linting failed with exit code: ${lintResult.exitCode}`);
                this.showNextSteps([
                    "Fix the linting errors shown above",
                    `Some errors may be auto-fixable with: yarn nx lint ${project} --fix`,
                    `Re-run prepareToPush ${project} after fixes`
                ]);
                
                const duration = Date.now() - startTime;
                return {
                    success: false,
                    exitCode: lintResult.exitCode,
                    output: lintResult.output,
                    error: lintResult.error,
                    duration
                };
            }

            // Step 2: Run prettier formatting
            this.showStep("Running code formatter...");
            this.showInfo(`Command: yarn nx prettier ${project} --write`);
            
            const prettierResult = await this.executePrettier(project);
            
            if (prettierResult.success) {
                this.showSuccess("Code formatting completed!");
            } else {
                this.showError(`Prettier failed with exit code: ${prettierResult.exitCode}`);
                this.showNextSteps([
                    "Check the prettier errors shown above",
                    "Ensure all files are valid syntax",
                    `Re-run prepareToPush ${project} after fixes`
                ]);
                
                const duration = Date.now() - startTime;
                return {
                    success: false,
                    exitCode: prettierResult.exitCode,
                    output: prettierResult.output,
                    error: prettierResult.error,
                    duration
                };
            }

            // Success summary
            this.showSuccessSummary(project);
            
            const duration = Date.now() - startTime;
            return {
                success: true,
                exitCode: 0,
                output: `Prepare to push completed successfully for ${project}`,
                duration
            };

        } catch (error) {
            const duration = Date.now() - startTime;
            return {
                success: false,
                exitCode: 1,
                output: "",
                error: error instanceof Error ? error.message : 'Unknown error',
                duration
            };
        }
    }

    private async executeLint(project: string): Promise<CommandResult> {
        return new Promise((resolve) => {
            const process = spawn('yarn', ['nx', 'lint', project], {
                cwd: this.getWorkspaceRoot(),
                shell: true
            });

            let output = '';
            let errorOutput = '';

            process.stdout?.on('data', (data) => {
                const text = data.toString();
                output += text;
                this.showInfo(text);
            });

            process.stderr?.on('data', (data) => {
                const text = data.toString();
                errorOutput += text;
                this.showInfo(text);
            });

            process.on('close', (code) => {
                resolve({
                    success: code === 0,
                    exitCode: code || 0,
                    output,
                    error: errorOutput || undefined,
                    duration: 0
                });
            });

            process.on('error', (error) => {
                resolve({
                    success: false,
                    exitCode: 1,
                    output,
                    error: error.message,
                    duration: 0
                });
            });
        });
    }

    private async executePrettier(project: string): Promise<CommandResult> {
        return new Promise((resolve) => {
            const process = spawn('yarn', ['nx', 'prettier', project, '--write'], {
                cwd: this.getWorkspaceRoot(),
                shell: true
            });

            let output = '';
            let errorOutput = '';

            process.stdout?.on('data', (data) => {
                const text = data.toString();
                output += text;
                this.showInfo(text);
            });

            process.stderr?.on('data', (data) => {
                const text = data.toString();
                errorOutput += text;
                this.showInfo(text);
            });

            process.on('close', (code) => {
                resolve({
                    success: code === 0,
                    exitCode: code || 0,
                    output,
                    error: errorOutput || undefined,
                    duration: 0
                });
            });

            process.on('error', (error) => {
                resolve({
                    success: false,
                    exitCode: 1,
                    output,
                    error: error.message,
                    duration: 0
                });
            });
        });
    }

    private showHeader(title: string): void {
        const separator = "=".repeat(60);
        this.showInfo(`\n${separator}`);
        this.showInfo(`🚀 ${title}`);
        this.showInfo(separator);
    }

    private showStep(message: string): void {
        this.showInfo(`\n${message}`);
    }

    private showNextSteps(steps: string[]): void {
        this.showInfo("\n💡 NEXT STEPS:");
        steps.forEach(step => {
            this.showInfo(`• ${step}`);
        });
    }

    private showSuccessSummary(project: string): void {
        const separator = "=".repeat(60);
        this.showInfo(`\n${separator}`);
        this.showInfo("🎉 Ready to Push!");
        this.showInfo(separator);
        this.showInfo("✅ Linting: Passed");
        this.showInfo("✅ Formatting: Applied");
        this.showInfo("");
        this.showInfo("📋 SUGGESTED NEXT STEPS:");
        this.showInfo("1. Review any formatting changes made by prettier");
        this.showInfo(`2. Run aiDebug ${project} to ensure tests still pass`);
        this.showInfo("3. Commit your changes: git add . && git commit -m 'Your message'");
        this.showInfo("4. Push to your branch: git push");
        this.showInfo("");
        this.showInfo("🔄 COMPLETE WORKFLOW:");
        this.showInfo(`• prepareToPush ${project}  (✅ Done!)`);
        this.showInfo(`• aiDebug ${project}        (recommended next)`);
        this.showInfo("• git commit && git push  (final step)");
        this.showInfo(separator);
    }

    private getWorkspaceRoot(): string {
        return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
    }

    private showInfo(message: string): void {
        const outputChannel = vscode.window.createOutputChannel('AI Debug Utilities');
        outputChannel.appendLine(message);
        outputChannel.show();
    }

    private showSuccess(message: string): void {
        this.showInfo(`✅ ${message}`);
    }

    private showError(message: string): void {
        this.showInfo(`❌ ${message}`);
    }
}
