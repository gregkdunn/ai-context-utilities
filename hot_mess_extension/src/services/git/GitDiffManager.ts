import * as vscode from 'vscode';
import { spawn } from 'child_process';
import * as path from 'path';

export interface GitCommit {
    hash: string;
    message: string;
    author: string;
    date: string;
    parents: string[];
}

export interface GitDiff {
    files: GitFileChange[];
    additions: number;
    deletions: number;
    summary: string;
}

export interface GitFileChange {
    path: string;
    status: 'added' | 'modified' | 'deleted' | 'renamed';
    additions?: number;
    deletions?: number;
    content?: string;
}

export interface GitBranch {
    name: string;
    isRemote: boolean;
    isHead: boolean;
}

export class GitDiffManager {
    private workspaceRoot: string;
    private gitApi: any;
    private repository: any;

    constructor(private context: vscode.ExtensionContext) {
        this.workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
        this.initializeGitApi();
    }

    private async initializeGitApi(): Promise<void> {
        try {
            const gitExtension = vscode.extensions.getExtension('vscode.git');
            if (!gitExtension) {
                console.warn('Git extension not found');
                return;
            }

            const git = gitExtension.isActive ? gitExtension.exports : await gitExtension.activate();
            this.gitApi = git.getAPI(1);
            
            if (this.gitApi.repositories.length > 0) {
                this.repository = this.gitApi.repositories[0];
            }
        } catch (error) {
            console.error('Failed to initialize Git API:', error);
        }
    }

    async getCommitHistory(maxCount: number = 50): Promise<GitCommit[]> {
        try {
            const commits = await this.executeGitCommand([
                'log',
                '--oneline',
                '--max-count',
                maxCount.toString(),
                '--pretty=format:%H|%s|%an|%ad|%P',
                '--date=short'
            ]);

            return commits.map(line => this.parseCommitLine(line));
        } catch (error) {
            console.error('Failed to get commit history:', error);
            return [];
        }
    }

    private parseCommitLine(line: string): GitCommit {
        const parts = line.split('|');
        return {
            hash: parts[0] || '',
            message: parts[1] || '',
            author: parts[2] || '',
            date: parts[3] || '',
            parents: parts[4] ? parts[4].split(' ') : []
        };
    }

    async getBranches(): Promise<GitBranch[]> {
        try {
            const localBranches = await this.executeGitCommand(['branch']);
            const remoteBranches = await this.executeGitCommand(['branch', '-r']);

            const branches: GitBranch[] = [];

            // Parse local branches
            localBranches.forEach(line => {
                const trimmed = line.trim();
                if (trimmed) {
                    const isHead = trimmed.startsWith('* ');
                    const name = isHead ? trimmed.substring(2) : trimmed;
                    branches.push({ name, isRemote: false, isHead });
                }
            });

            // Parse remote branches
            remoteBranches.forEach(line => {
                const trimmed = line.trim();
                if (trimmed && !trimmed.includes('HEAD')) {
                    const name = trimmed.replace(/^origin\//, '');
                    // Only add if not already exists as local branch
                    if (!branches.some(b => b.name === name)) {
                        branches.push({ name, isRemote: true, isHead: false });
                    }
                }
            });

            return branches;
        } catch (error) {
            console.error('Failed to get branches:', error);
            return [];
        }
    }

    async getCurrentBranch(): Promise<string> {
        try {
            const result = await this.executeGitCommand(['rev-parse', '--abbrev-ref', 'HEAD']);
            return result[0] || 'main';
        } catch (error) {
            console.error('Failed to get current branch:', error);
            return 'main';
        }
    }

    async getBranchDiff(branch1: string, branch2: string): Promise<GitDiff> {
        try {
            const diffOutput = await this.executeGitCommand([
                'diff',
                '--name-status',
                `${branch1}...${branch2}`
            ]);

            const files = this.parseDiffOutput(diffOutput);
            
            // Get detailed diff stats
            const statsOutput = await this.executeGitCommand([
                'diff',
                '--stat',
                `${branch1}...${branch2}`
            ]);

            const stats = this.parseDiffStats(statsOutput);

            return {
                files,
                additions: stats.additions,
                deletions: stats.deletions,
                summary: `${files.length} files changed, ${stats.additions} insertions(+), ${stats.deletions} deletions(-)`
            };
        } catch (error) {
            console.error('Failed to get branch diff:', error);
            return { files: [], additions: 0, deletions: 0, summary: 'Failed to get diff' };
        }
    }

    async getCommitDiff(commit1: string, commit2: string): Promise<GitDiff> {
        try {
            const diffOutput = await this.executeGitCommand([
                'diff',
                '--name-status',
                commit1,
                commit2
            ]);

            const files = this.parseDiffOutput(diffOutput);
            
            // Get detailed diff stats
            const statsOutput = await this.executeGitCommand([
                'diff',
                '--stat',
                commit1,
                commit2
            ]);

            const stats = this.parseDiffStats(statsOutput);

            return {
                files,
                additions: stats.additions,
                deletions: stats.deletions,
                summary: `${files.length} files changed, ${stats.additions} insertions(+), ${stats.deletions} deletions(-)`
            };
        } catch (error) {
            console.error('Failed to get commit diff:', error);
            return { files: [], additions: 0, deletions: 0, summary: 'Failed to get diff' };
        }
    }

    async getInteractiveDiff(commit1: string, commit2: string): Promise<string> {
        try {
            const diffOutput = await this.executeGitCommandRaw([
                'diff',
                '--unified=3',
                '--color=never',
                commit1,
                commit2
            ]);

            return diffOutput;
        } catch (error) {
            console.error('Failed to get interactive diff:', error);
            return `Failed to get diff: ${(error as Error).message}`;
        }
    }

    async getFileDiff(commit1: string, commit2: string, filePath: string): Promise<string> {
        try {
            const diffOutput = await this.executeGitCommandRaw([
                'diff',
                '--unified=3',
                '--color=never',
                commit1,
                commit2,
                '--',
                filePath
            ]);

            return diffOutput;
        } catch (error) {
            console.error('Failed to get file diff:', error);
            return `Failed to get diff for ${filePath}: ${(error as Error).message}`;
        }
    }

    private parseDiffOutput(diffOutput: string[]): GitFileChange[] {
        const files: GitFileChange[] = [];

        diffOutput.forEach(line => {
            const trimmed = line.trim();
            if (trimmed) {
                const parts = trimmed.split('\t');
                if (parts.length >= 2) {
                    const status = this.mapGitStatus(parts[0]);
                    const path = parts[1];
                    files.push({ path, status });
                }
            }
        });

        return files;
    }

    private mapGitStatus(status: string): 'added' | 'modified' | 'deleted' | 'renamed' {
        switch (status.charAt(0)) {
            case 'A': return 'added';
            case 'M': return 'modified';
            case 'D': return 'deleted';
            case 'R': return 'renamed';
            default: return 'modified';
        }
    }

    private parseDiffStats(statsOutput: string[]): { additions: number, deletions: number } {
        let additions = 0;
        let deletions = 0;

        const summary = statsOutput[statsOutput.length - 1];
        if (summary) {
            const insertMatch = summary.match(/(\d+) insertions?\(\+\)/);
            const deleteMatch = summary.match(/(\d+) deletions?\(\-\)/);
            
            if (insertMatch) {
                additions = parseInt(insertMatch[1], 10);
            }
            if (deleteMatch) {
                deletions = parseInt(deleteMatch[1], 10);
            }
        }

        return { additions, deletions };
    }

    private async executeGitCommand(args: string[]): Promise<string[]> {
        const output = await this.executeGitCommandRaw(args);
        return output.trim().split('\n').filter(line => line.length > 0);
    }

    private async executeGitCommandRaw(args: string[]): Promise<string> {
        return new Promise((resolve, reject) => {
            const child = spawn('git', args, {
                cwd: this.workspaceRoot,
                stdio: 'pipe',
                shell: process.platform === 'win32'
            });

            let output = '';
            let errorOutput = '';

            child.stdout.on('data', (data) => {
                output += data.toString();
            });

            child.stderr.on('data', (data) => {
                errorOutput += data.toString();
            });

            child.on('close', (code) => {
                if (code === 0) {
                    resolve(output);
                } else {
                    reject(new Error(`Git command failed with code ${code}: ${errorOutput}`));
                }
            });

            child.on('error', (error) => {
                reject(new Error(`Failed to execute git command: ${error.message}`));
            });

            // Set timeout for long-running commands
            setTimeout(() => {
                child.kill();
                reject(new Error('Git command timeout'));
            }, 30000);
        });
    }

    async isGitRepository(): Promise<boolean> {
        try {
            await this.executeGitCommand(['rev-parse', '--git-dir']);
            return true;
        } catch (error) {
            return false;
        }
    }

    dispose(): void {
        // Clean up any resources if needed
    }
}
