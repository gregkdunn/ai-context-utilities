import * as vscode from 'vscode';
import { spawn } from 'child_process';
import { CommandOptions, CommandResult } from '../types';
import { FileManager } from '../utils/fileManager';

export class GitDiffCommand {
    private fileManager: FileManager;
    private outputChannel: vscode.OutputChannel;

    constructor() {
        this.outputChannel = vscode.window.createOutputChannel('AI Debug Utilities');
        this.fileManager = new FileManager(this.outputChannel);
    }

    /**
     * Run Git Diff command with AI-optimized analysis
     */
    async run(options: CommandOptions = {}): Promise<CommandResult> {
        const startTime = Date.now();
        
        try {
            // Skip diff if noDiff option is set
            if (options.noDiff) {
                const duration = Date.now() - startTime;
                return {
                    success: true,
                    exitCode: 0,
                    output: 'Diff skipped due to noDiff option',
                    duration
                };
            }

            const outputFile = this.fileManager.getOutputFilePath('diff.txt');
            
            // Ensure output directory exists
            await this.fileManager.ensureDirectoryExists(require('path').dirname(outputFile));
            
            // Smart diff detection
            const diffArgs = await this.detectSmartDiff();
            
            // Generate the diff
            const diffResult = await this.executeDiff(diffArgs);
            
            if (!diffResult.success) {
                const duration = Date.now() - startTime;
                return {
                    success: false,
                    exitCode: diffResult.exitCode,
                    output: diffResult.output,
                    error: diffResult.error,
                    duration
                };
            }

            // Process diff for AI context
            const processedOutput = await this.createAiDiffContext(diffResult.output, diffArgs);
            
            // Save to file
            await this.fileManager.writeFile(outputFile, processedOutput);
            
            // Show statistics
            const stats = await this.fileManager.getFileStats(outputFile);
            
            if (!stats || stats.size === 0) {
                this.showWarning("No diff output generated");
            } else {
                this.showSuccess(`Diff saved to: ${outputFile}`);
                this.showInfo(`📊 Size: ${stats.size} bytes`);
                
                // Quick content summary
                const filesChanged = this.countChangedFiles(processedOutput);
                this.showInfo(`📈 AI-optimized format: ${filesChanged} files analyzed`);
            }
            
            const duration = Date.now() - startTime;
            return {
                success: true,
                exitCode: 0,
                output: processedOutput,
                outputFiles: [outputFile],
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

    private async detectSmartDiff(): Promise<string[]> {
        this.showInfo("🔍 Smart diff detection...");
        
        // Check for unstaged changes
        const unstagedResult = await this.executeGitCommand(['diff', '--quiet']);
        
        if (unstagedResult.exitCode !== 0) {
            // Has unstaged changes
            this.showInfo("📝 Using unstaged changes");
            return [];
        }
        
        // Check for staged changes
        const stagedResult = await this.executeGitCommand(['diff', '--cached', '--quiet']);
        
        if (stagedResult.exitCode !== 0) {
            // Has staged changes
            this.showInfo("📂 Using staged changes");
            return ['--cached'];
        }
        
        // No unstaged or staged changes, check for commits
        const hasCommits = await this.executeGitCommand(['rev-parse', '--verify', 'HEAD~1']);
        
        if (hasCommits.success) {
            this.showInfo("📋 Using last commit changes (no unstaged/staged changes found)");
            return ['HEAD~1..HEAD'];
        }
        
        // No changes found
        this.showWarning("No changes detected (initial commit or clean working directory)");
        return [];
    }

    private async executeDiff(args: string[]): Promise<CommandResult> {
        if (args.length === 0) {
            this.showInfo("Running: git diff");
        } else {
            this.showInfo(`Running: git diff ${args.join(' ')}`);
        }
        
        return this.executeGitCommand(['diff', ...args]);
    }

    private async executeGitCommand(args: string[]): Promise<CommandResult> {
        return new Promise((resolve) => {
            const process = spawn('git', args, {
                cwd: this.getWorkspaceRoot(),
                shell: false
            });

            let output = '';
            let errorOutput = '';

            process.stdout?.on('data', (data) => {
                output += data.toString();
            });

            process.stderr?.on('data', (data) => {
                errorOutput += data.toString();
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

    private async createAiDiffContext(diffOutput: string, diffArgs: string[]): Promise<string> {
        if (!diffOutput.trim()) {
            return this.createNoChangesOutput();
        }

        const timestamp = new Date().toISOString();
        const branch = await this.getCurrentBranch();
        
        let output = `=================================================================
🔍 AI-OPTIMIZED GIT DIFF ANALYSIS
=================================================================

COMMAND: git diff ${diffArgs.join(' ')}
TIMESTAMP: ${timestamp}
BRANCH: ${branch}

`;

        // Analyze the diff for file changes
        const analysis = this.analyzeDiffChanges(diffOutput);
        
        // Generate change summary
        output += `==================================================================
📊 CHANGE SUMMARY
==================================================================

Total files changed: ${analysis.totalChanges}

`;

        if (analysis.newFiles.length > 0) {
            output += `🆕 NEW FILES (${analysis.newFiles.length}):\n`;
            analysis.newFiles.forEach(file => {
                output += `  • ${file}\n`;
            });
            output += '\n';
        }

        if (analysis.modifiedFiles.length > 0) {
            output += `📝 MODIFIED FILES (${analysis.modifiedFiles.length}):\n`;
            analysis.modifiedFiles.forEach(file => {
                output += `  • ${file}\n`;
            });
            output += '\n';
        }

        if (analysis.deletedFiles.length > 0) {
            output += `🗑️ DELETED FILES (${analysis.deletedFiles.length}):\n`;
            analysis.deletedFiles.forEach(file => {
                output += `  • ${file}\n`;
            });
            output += '\n';
        }

        if (analysis.renamedFiles.length > 0) {
            output += `📦 RENAMED/MOVED FILES (${analysis.renamedFiles.length}):\n`;
            analysis.renamedFiles.forEach(file => {
                output += `  • ${file}\n`;
            });
            output += '\n';
        }

        // File type analysis
        output += `==================================================================
🏷️ FILE TYPE ANALYSIS
==================================================================

`;
        output += this.analyzeFileTypes(diffOutput);

        // Add the actual diff with file separators
        output += `==================================================================
📋 DETAILED CHANGES
==================================================================

`;
        output += this.addFileSeparators(diffOutput);

        // Add AI analysis context
        output += `
==================================================================
🤖 AI ANALYSIS CONTEXT
==================================================================
Key areas for analysis:
• Focus on test-related files (.spec.ts, .test.ts)
• Look for type/interface changes that might break tests
• Check for new functionality that needs test coverage
• Identify breaking changes in method signatures
• Review dependency changes and imports

Change impact areas:
`;

        if (analysis.newFiles.length > 0) {
            output += "• New files may need comprehensive test coverage\n";
        }
        if (analysis.modifiedFiles.length > 0) {
            output += "• Modified files may have broken existing tests\n";
        }
        if (analysis.deletedFiles.length > 0) {
            output += "• Deleted files may have orphaned tests or dependencies\n";
        }

        return output;
    }

    private analyzeDiffChanges(diffOutput: string): {
        newFiles: string[];
        modifiedFiles: string[];
        deletedFiles: string[];
        renamedFiles: string[];
        totalChanges: number;
    } {
        const lines = diffOutput.split('\n');
        const newFiles: string[] = [];
        const modifiedFiles: string[] = [];
        const deletedFiles: string[] = [];
        const renamedFiles: string[] = [];
        
        let currentFileA = '';
        let currentFileB = '';
        let isProcessingFile = false;
        
        for (const line of lines) {
            const diffMatch = line.match(/^diff --git a\/(.*) b\/(.*)/);
            if (diffMatch) {
                currentFileA = diffMatch[1];
                currentFileB = diffMatch[2];
                isProcessingFile = true;
                
                // Check if it's a rename/move
                if (currentFileA !== currentFileB) {
                    renamedFiles.push(`${currentFileA} → ${currentFileB}`);
                }
                continue;
            }
            
            if (isProcessingFile) {
                if (line.match(/^new file mode/)) {
                    newFiles.push(currentFileB);
                    isProcessingFile = false;
                } else if (line.match(/^deleted file mode/)) {
                    deletedFiles.push(currentFileA);
                    isProcessingFile = false;
                } else if (line.match(/^index.*\.\./) && currentFileA === currentFileB && !renamedFiles.some(f => f.includes(currentFileA))) {
                    modifiedFiles.push(currentFileA);
                    isProcessingFile = false;
                }
            }
        }
        
        const totalChanges = newFiles.length + modifiedFiles.length + deletedFiles.length + renamedFiles.length;
        
        return {
            newFiles,
            modifiedFiles,
            deletedFiles,
            renamedFiles,
            totalChanges
        };
    }

    private analyzeFileTypes(diffOutput: string): string {
        const lines = diffOutput.split('\n');
        const counts = {
            ts: 0,
            spec: 0,
            html: 0,
            css: 0,
            json: 0,
            other: 0
        };
        
        for (const line of lines) {
            const match = line.match(/^diff --git.*b\/(.*)/);
            if (match) {
                const file = match[1];
                if (file.match(/\.(spec|test)\.ts$/)) {
                    counts.spec++;
                } else if (file.endsWith('.ts')) {
                    counts.ts++;
                } else if (file.endsWith('.html')) {
                    counts.html++;
                } else if (file.match(/\.(css|scss|sass)$/)) {
                    counts.css++;
                } else if (file.endsWith('.json')) {
                    counts.json++;
                } else {
                    counts.other++;
                }
            }
        }
        
        let output = `TypeScript files: ${counts.ts}
Test files: ${counts.spec}
Templates: ${counts.html}
Styles: ${counts.css}
Config/JSON: ${counts.json}
Other: ${counts.other}

`;
        
        // AI insights based on file types
        if (counts.spec > 0) {
            output += "🧪 Test files modified - may fix or introduce test issues\n";
        }
        if (counts.ts > counts.spec) {
            output += "⚠️  More source files than test files changed - check test coverage\n";
        }
        if (counts.json > 0) {
            output += "⚙️  Configuration changes detected - may affect build/test setup\n";
        }
        
        return output;
    }

    private addFileSeparators(diffOutput: string): string {
        const lines = diffOutput.split('\n');
        const result: string[] = [];
        
        for (const line of lines) {
            const match = line.match(/^diff --git a\/(.*) b\/(.*)/);
            if (match) {
                const currentFile = match[2];
                result.push(`📁 FILE: ${currentFile}`);
                result.push('─'.repeat(40));
            }
            result.push(line);
        }
        
        return result.join('\n');
    }

    private createNoChangesOutput(): string {
        const timestamp = new Date().toISOString();
        
        return `=================================================================
🔍 GIT DIFF ANALYSIS
=================================================================

STATUS: No changes detected
TIMESTAMP: ${timestamp}

=================================================================
📊 REPOSITORY STATUS
=================================================================
Working directory: Clean
Staged changes: None

=================================================================
🤖 AI ANALYSIS CONTEXT
=================================================================
No code changes were found to analyze. This could mean:
• Working directory is clean (all changes committed)
• You're analyzing test failures without recent changes
• Focus should be on existing code patterns or environment issues
• Consider checking if tests were recently updated in previous commits

Suggested actions:
• Review recent commit history: git log --oneline -10
• Check if issue is environment-related rather than code-related
• Examine test setup or configuration files
`;
    }

    private async getCurrentBranch(): Promise<string> {
        try {
            const result = await this.executeGitCommand(['branch', '--show-current']);
            return result.success ? result.output.trim() : 'unknown';
        } catch {
            return 'unknown';
        }
    }

    private countChangedFiles(output: string): number {
        const matches = output.match(/^📁 FILE:/gm);
        return matches ? matches.length : 0;
    }

    private getWorkspaceRoot(): string {
        return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
    }

    private showInfo(message: string): void {
        this.outputChannel.appendLine(message);
        this.outputChannel.show();
    }

    private showSuccess(message: string): void {
        this.showInfo(`✅ ${message}`);
    }

    private showWarning(message: string): void {
        this.showInfo(`⚠️  ${message}`);
    }

    private showError(message: string): void {
        this.showInfo(`❌ ${message}`);
    }
}
