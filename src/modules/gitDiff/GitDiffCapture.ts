/**
 * Git Diff Capture Module
 * Captures git diff and saves to .github/instructions/ai_debug_context/diff.txt
 * Part of Phase 2.0 - Git Diff & Post-Test Intelligence
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { spawn } from 'child_process';

export interface GitDiffOptions {
    workspaceRoot: string;
    outputChannel: vscode.OutputChannel;
}

/**
 * Service for capturing git diff and saving to instructions directory
 */
export class GitDiffCapture {
    private readonly instructionsPath: string;
    private readonly diffFilePath: string;

    constructor(private options: GitDiffOptions) {
        this.instructionsPath = path.join(
            this.options.workspaceRoot,
            '.github',
            'instructions',
            'ai-utilities-context'
        );
        this.diffFilePath = path.join(this.instructionsPath, 'diff.txt');
    }

    /**
     * Capture current git diff and save to file
     */
    async captureDiff(): Promise<boolean> {
        try {
            this.options.outputChannel.appendLine('📝 Capturing git diff...');
            
            // Ensure directory exists
            await this.ensureDirectoryExists();
            
            // Get git diff
            const diff = await this.getGitDiff();
            
            if (!diff || diff.trim().length === 0) {
                this.options.outputChannel.appendLine('ℹ️  No changes detected in git diff');
                // Still write empty file to clear any previous diff
                await fs.promises.writeFile(this.diffFilePath, '# No changes detected\n');
                return true;
            }
            
            // Format and save diff
            const formattedDiff = this.formatDiff(diff);
            await fs.promises.writeFile(this.diffFilePath, formattedDiff);
            
            this.options.outputChannel.appendLine(`✅ Git diff saved to ${this.getRelativePath(this.diffFilePath)}`);
            return true;
            
        } catch (error) {
            this.options.outputChannel.appendLine(`❌ Failed to capture git diff: ${error}`);
            return false;
        }
    }

    /**
     * Get git diff output with smart detection (Phase 2.1 - Legacy gitDiff.zsh logic)
     */
    /**
     * Get git diff using smart detection logic (Phase 2.1 legacy gitDiff.zsh compatibility)
     * 
     * This method replicates the exact logic from the legacy gitDiff.zsh script:
     * 1. First priority: Unstaged changes (git diff)
     * 2. Second priority: Staged changes (git diff --cached)
     * 3. Fallback: Last commit changes (git diff HEAD~1..HEAD)
     * 
     * This ensures consistent behavior with the legacy script and provides
     * meaningful context for AI analysis regardless of git repository state.
     */
    private async getGitDiff(): Promise<string> {
        // Smart diff detection - check for unstaged, staged, or use last commit
        // This logic exactly matches the legacy gitDiff.zsh script for consistency
        const unstagedChanges = await this.hasUnstagedChanges();
        const stagedChanges = await this.hasStagedChanges();
        
        let diffArgs: string[] = [];
        
        // Priority 1: Unstaged changes (active development)
        if (unstagedChanges) {
            this.options.outputChannel.appendLine('📝 Using unstaged changes');
            diffArgs = ['diff'];
        // Priority 2: Staged changes (ready for commit)
        } else if (stagedChanges) {
            this.options.outputChannel.appendLine('📂 Using staged changes');
            diffArgs = ['diff', '--cached'];
        // Priority 3: Last commit (fallback for analysis)
        } else {
            this.options.outputChannel.appendLine('📋 Using last commit changes (no unstaged/staged changes found)');
            diffArgs = ['diff', 'HEAD~1..HEAD'];
        }
        
        return new Promise((resolve, reject) => {
            this.options.outputChannel.appendLine(`Running: git ${diffArgs.join(' ')}`);
            
            const gitProcess = spawn('git', diffArgs, {
                cwd: this.options.workspaceRoot
            });

            let stdout = '';
            let stderr = '';

            gitProcess.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            gitProcess.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            gitProcess.on('close', (code) => {
                if (code !== 0) {
                    reject(new Error(`Git diff failed: ${stderr}`));
                } else {
                    resolve(stdout);
                }
            });

            gitProcess.on('error', (error) => {
                reject(error);
            });
        });
    }

    /**
     * Check if there are unstaged changes
     */
    private async hasUnstagedChanges(): Promise<boolean> {
        return new Promise((resolve) => {
            const gitProcess = spawn('git', ['diff', '--quiet'], {
                cwd: this.options.workspaceRoot
            });

            gitProcess.on('close', (code) => {
                resolve(code !== 0); // If exit code is not 0, there are unstaged changes
            });

            gitProcess.on('error', () => {
                resolve(false);
            });
        });
    }

    /**
     * Check if there are staged changes
     */
    private async hasStagedChanges(): Promise<boolean> {
        return new Promise((resolve) => {
            const gitProcess = spawn('git', ['diff', '--cached', '--quiet'], {
                cwd: this.options.workspaceRoot
            });

            gitProcess.on('close', (code) => {
                resolve(code !== 0); // If exit code is not 0, there are staged changes
            });

            gitProcess.on('error', () => {
                resolve(false);
            });
        });
    }

    /**
     * Format diff for AI consumption (Phase 2.1 - Legacy gitDiff.zsh format)
     */
    private formatDiff(diff: string): string {
        const timestamp = new Date().toLocaleString();
        const currentBranch = this.getCurrentBranch();
        
        if (!diff || diff.trim().length === 0) {
            return [
                '=================================================================',
                '🔍 AI-OPTIMIZED GIT DIFF ANALYSIS',
                '=================================================================',
                '',
                'COMMAND: git diff (smart detection)',
                `TIMESTAMP: ${timestamp}`,
                `BRANCH: ${currentBranch}`,
                '',
                '==================================================================',
                '📊 CHANGE SUMMARY',
                '==================================================================',
                'Total files changed: 0',
                '',
                '==================================================================',
                '📋 DETAILED CHANGES',
                '==================================================================',
                '',
                'No changes detected.',
                '',
                '==================================================================',
                '🤖 AI ANALYSIS CONTEXT',
                '==================================================================',
                'No code changes to analyze.',
                'Focus on environment, configuration, or test setup issues.'
            ].join('\n');
        }

        // Analyze the diff for file changes
        const fileAnalysis = this.analyzeDiffFiles(diff);
        
        const sections = [
            '=================================================================',
            '🔍 AI-OPTIMIZED GIT DIFF ANALYSIS',
            '=================================================================',
            '',
            'COMMAND: git diff (smart detection)',
            `TIMESTAMP: ${timestamp}`,
            `BRANCH: ${currentBranch}`,
            '',
            '==================================================================',
            '📊 CHANGE SUMMARY',
            '==================================================================',
            `Total files changed: ${fileAnalysis.totalChanges}`,
            ''
        ];

        // Add file type breakdown
        if (fileAnalysis.newFiles.length > 0) {
            sections.push(`🆕 NEW FILES (${fileAnalysis.newFiles.length}):`);
            fileAnalysis.newFiles.forEach(file => sections.push(`  • ${file}`));
            sections.push('');
        }

        if (fileAnalysis.modifiedFiles.length > 0) {
            sections.push(`📝 MODIFIED FILES (${fileAnalysis.modifiedFiles.length}):`);
            fileAnalysis.modifiedFiles.forEach(file => sections.push(`  • ${file}`));
            sections.push('');
        }

        if (fileAnalysis.deletedFiles.length > 0) {
            sections.push(`🗑️ DELETED FILES (${fileAnalysis.deletedFiles.length}):`);
            fileAnalysis.deletedFiles.forEach(file => sections.push(`  • ${file}`));
            sections.push('');
        }

        if (fileAnalysis.renamedFiles.length > 0) {
            sections.push(`📦 RENAMED/MOVED FILES (${fileAnalysis.renamedFiles.length}):`);
            fileAnalysis.renamedFiles.forEach(file => sections.push(`  • ${file}`));
            sections.push('');
        }

        // Add file type analysis
        sections.push(
            '==================================================================',
            '🏷️ FILE TYPE ANALYSIS',
            '==================================================================',
            ''
        );
        
        const typeAnalysis = this.analyzeFileTypes(fileAnalysis);
        sections.push(...typeAnalysis);

        // Add detailed changes with file separators
        sections.push(
            '==================================================================',
            '📋 DETAILED CHANGES',
            '==================================================================',
            ''
        );

        // Process diff with file separators for better AI parsing
        const processedDiff = this.addFileMarkers(diff);
        sections.push(processedDiff);

        // Add AI analysis context
        sections.push(
            '',
            '==================================================================',
            '🤖 AI ANALYSIS CONTEXT',
            '==================================================================',
            'Key areas for analysis:',
            '• Focus on test-related files (.spec.ts, .test.ts)',
            '• Look for type/interface changes that might break tests',
            '• Check for new functionality that needs test coverage',
            '• Identify breaking changes in method signatures',
            '• Review dependency changes and imports',
            '',
            'Change impact areas:'
        );

        if (fileAnalysis.newFiles.length > 0) {
            sections.push('• New files may need comprehensive test coverage');
        }
        if (fileAnalysis.modifiedFiles.length > 0) {
            sections.push('• Modified files may have broken existing tests');
        }
        if (fileAnalysis.deletedFiles.length > 0) {
            sections.push('• Deleted files may have orphaned tests or dependencies');
        }

        return sections.join('\n');
    }

    /**
     * Get current git branch
     */
    private getCurrentBranch(): string {
        try {
            const { execSync } = require('child_process');
            const branch = execSync('git branch --show-current', { 
                cwd: this.options.workspaceRoot, 
                encoding: 'utf8' 
            }).trim();
            return branch || 'unknown';
        } catch {
            return 'unknown';
        }
    }

    /**
     * Analyze diff for file changes
     */
    private analyzeDiffFiles(diff: string): {
        newFiles: string[];
        modifiedFiles: string[];
        deletedFiles: string[];
        renamedFiles: string[];
        totalChanges: number;
    } {
        const newFiles: string[] = [];
        const modifiedFiles: string[] = [];
        const deletedFiles: string[] = [];
        const renamedFiles: string[] = [];
        
        const lines = diff.split('\n');
        let currentFileA = '';
        let currentFileB = '';
        
        for (const line of lines) {
            const diffMatch = line.match(/^diff --git a\/(.+) b\/(.+)$/);
            if (diffMatch) {
                currentFileA = diffMatch[1];
                currentFileB = diffMatch[2];
                
                // Check if it's a rename/move
                if (currentFileA !== currentFileB) {
                    renamedFiles.push(`${currentFileA} → ${currentFileB}`);
                }
            } else if (line.startsWith('new file mode')) {
                newFiles.push(currentFileB);
            } else if (line.startsWith('deleted file mode')) {
                deletedFiles.push(currentFileA);
            } else if (line.match(/^index .+\.\..+/) && currentFileA === currentFileB) {
                modifiedFiles.push(currentFileA);
            }
        }
        
        return {
            newFiles,
            modifiedFiles,
            deletedFiles,
            renamedFiles,
            totalChanges: newFiles.length + modifiedFiles.length + deletedFiles.length + renamedFiles.length
        };
    }

    /**
     * Analyze file types
     */
    private analyzeFileTypes(fileAnalysis: any): string[] {
        const allFiles = [
            ...fileAnalysis.newFiles,
            ...fileAnalysis.modifiedFiles,
            ...fileAnalysis.deletedFiles
        ];
        
        const typeCount: { [key: string]: number } = {};
        
        for (const file of allFiles) {
            const ext = path.extname(file);
            const type = this.getFileTypeDescription(ext);
            typeCount[type] = (typeCount[type] || 0) + 1;
        }
        
        const result: string[] = [];
        for (const [type, count] of Object.entries(typeCount)) {
            result.push(`${type}: ${count} files`);
        }
        
        return result.length > 0 ? result : ['No files to analyze'];
    }

    /**
     * Get file type description
     */
    private getFileTypeDescription(ext: string): string {
        switch (ext) {
            case '.ts': return 'TypeScript';
            case '.js': return 'JavaScript';
            case '.spec.ts': return 'Test Files';
            case '.test.ts': return 'Test Files';
            case '.json': return 'JSON Config';
            case '.md': return 'Documentation';
            case '.yml':
            case '.yaml': return 'YAML Config';
            default: return 'Other';
        }
    }

    /**
     * Add file markers to diff content
     */
    private addFileMarkers(diff: string): string {
        const lines = diff.split('\n');
        const result: string[] = [];
        
        for (const line of lines) {
            const diffMatch = line.match(/^diff --git a\/(.+) b\/(.+)$/);
            if (diffMatch) {
                const fileName = diffMatch[2];
                result.push(`📁 FILE: ${fileName}`);
                result.push('─────────────────────────────────────────');
            }
            result.push(line);
        }
        
        return result.join('\n');
    }

    /**
     * Ensure the instructions directory exists
     */
    private async ensureDirectoryExists(): Promise<void> {
        try {
            await fs.promises.mkdir(this.instructionsPath, { recursive: true });
        } catch (error: any) {
            if (error.code !== 'EEXIST') {
                throw error;
            }
        }
    }

    /**
     * Get relative path for display
     */
    private getRelativePath(fullPath: string): string {
        return path.relative(this.options.workspaceRoot, fullPath);
    }

    /**
     * Check if diff file exists
     */
    async diffExists(): Promise<boolean> {
        try {
            await fs.promises.access(this.diffFilePath);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Get the diff file path
     */
    getDiffFilePath(): string {
        return this.diffFilePath;
    }

    /**
     * Clear the diff file
     */
    async clearDiff(): Promise<void> {
        try {
            if (await this.diffExists()) {
                await fs.promises.unlink(this.diffFilePath);
                this.options.outputChannel.appendLine('🗑️  Git diff cleared');
            }
        } catch (error) {
            this.options.outputChannel.appendLine(`⚠️  Failed to clear diff: ${error}`);
        }
    }
}