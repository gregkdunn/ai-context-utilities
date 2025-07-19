import { simpleGit, SimpleGit } from 'simple-git';
import * as vscode from 'vscode';
import { FileChange, GitCommit } from '../types';

export class GitIntegration {
  private git: SimpleGit;
  private gitApi: any;
  private workspaceRoot: string;

  constructor(private context: vscode.ExtensionContext) {
    this.workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
    this.git = simpleGit(this.workspaceRoot);
    this.initializeVSCodeGitAPI();
  }

  private async initializeVSCodeGitAPI() {
    try {
      const gitExtension = vscode.extensions.getExtension('vscode.git');
      if (gitExtension) {
        this.gitApi = gitExtension.exports.getAPI(1);
      }
    } catch (error) {
      console.warn('VSCode Git API not available:', error);
    }
  }

  async getUncommittedChanges(): Promise<FileChange[]> {
    try {
      const status = await this.git.status();
      return [
        ...status.modified.map(f => ({ path: f, status: 'modified' as const })),
        ...status.created.map(f => ({ path: f, status: 'added' as const })),
        ...status.deleted.map(f => ({ path: f, status: 'deleted' as const }))
      ];
    } catch (error) {
      console.error('Failed to get uncommitted changes:', error);
      throw new Error(`Failed to get uncommitted changes: ${error}`);
    }
  }

  async getCommitHistory(limit: number = 50): Promise<GitCommit[]> {
    try {
      const log = await this.git.log({ maxCount: limit });
      return log.all.map(commit => ({
        hash: commit.hash,
        message: commit.message,
        author: commit.author_name || 'Unknown',
        date: new Date(commit.date),
        files: [] // Will be populated if needed
      }));
    } catch (error) {
      console.error('Failed to get commit history:', error);
      throw new Error(`Failed to get commit history: ${error}`);
    }
  }

  async getDiffFromMainBranch(): Promise<string> {
    try {
      const currentBranch = await this.git.revparse(['--abbrev-ref', 'HEAD']);
      const baseBranch = vscode.workspace.getConfiguration('aiDebugContext').get<string>('nxBaseBranch') || 'main';
      return await this.git.diff([`${baseBranch}...${currentBranch}`]);
    } catch (error) {
      console.error('Failed to get diff from main branch:', error);
      throw new Error(`Failed to get diff from main branch: ${error}`);
    }
  }

  async getDiffForCommit(commitHash: string): Promise<string> {
    try {
      return await this.git.show([commitHash]);
    } catch (error) {
      console.error(`Failed to get diff for commit ${commitHash}:`, error);
      throw new Error(`Failed to get diff for commit ${commitHash}: ${error}`);
    }
  }

  async getDiffForUncommittedChanges(): Promise<string> {
    try {
      // Get both staged and unstaged changes
      const stagedDiff = await this.git.diff(['--cached']);
      const unstagedDiff = await this.git.diff();
      
      let combinedDiff = '';
      if (stagedDiff) {
        combinedDiff += '=== STAGED CHANGES ===\n' + stagedDiff + '\n\n';
      }
      if (unstagedDiff) {
        combinedDiff += '=== UNSTAGED CHANGES ===\n' + unstagedDiff;
      }
      
      return combinedDiff || 'No changes detected';
    } catch (error) {
      console.error('Failed to get diff for uncommitted changes:', error);
      throw new Error(`Failed to get diff for uncommitted changes: ${error}`);
    }
  }

  async getCurrentBranch(): Promise<string> {
    try {
      return await this.git.revparse(['--abbrev-ref', 'HEAD']);
    } catch (error) {
      console.error('Failed to get current branch:', error);
      return 'unknown';
    }
  }

  async isGitRepository(): Promise<boolean> {
    try {
      await this.git.revparse(['--git-dir']);
      return true;
    } catch {
      return false;
    }
  }

  getWorkspaceRoot(): string {
    return this.workspaceRoot;
  }
}
