import { simpleGit, SimpleGit } from 'simple-git';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
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

  /**
   * Generate and save diff to a file, with streaming output support
   */
  async generateDiffWithStreaming(
    mode: 'uncommitted' | 'commit' | 'branch-diff',
    commitHash?: string,
    outputCallback?: (output: string) => void
  ): Promise<{ content: string; filePath: string }> {
    try {
      let diffContent: string;
      let filename: string;

      outputCallback?.('Starting git diff generation...\n');
      
      // Clean up old diff files before generating new one
      outputCallback?.('Cleaning up old diff files...\n');
      await this.cleanupOldDiffFiles(outputCallback);
      outputCallback?.('Old diff files cleaned up\n');

      switch (mode) {
        case 'uncommitted':
          outputCallback?.('Generating diff for uncommitted changes...\n');
          diffContent = await this.getDiffForUncommittedChanges();
          filename = `uncommitted-changes-${Date.now()}.diff`;
          break;
        case 'commit':
          if (!commitHash) {
            throw new Error('Commit hash required for commit diff mode');
          }
          outputCallback?.(`Generating diff for commit ${commitHash}...\n`);
          diffContent = await this.getDiffForCommit(commitHash);
          filename = `commit-${commitHash.substring(0, 7)}-${Date.now()}.diff`;
          break;
        case 'branch-diff':
          outputCallback?.('Generating diff from current branch to main...\n');
          diffContent = await this.getDiffFromMainBranch();
          filename = `branch-diff-${Date.now()}.diff`;
          break;
        default:
          throw new Error(`Unsupported diff mode: ${mode}`);
      }

      outputCallback?.('Writing diff to file...\n');
      const filePath = await this.saveDiffToFile(diffContent, filename);
      
      outputCallback?.(`Diff saved successfully to ${filePath}\n`);
      outputCallback?.('Diff generation complete!\n');

      return { content: diffContent, filePath };
    } catch (error) {
      const errorMessage = `Failed to generate diff: ${error}`;
      outputCallback?.(errorMessage + '\n');
      throw error;
    }
  }

  /**
   * Clean up old diff files before generating a new one
   */
  private async cleanupOldDiffFiles(
    outputCallback?: (output: string) => void,
    keepLatest: number = 3
  ): Promise<void> {
    try {
      const diffDir = path.join(this.workspaceRoot, '.ai-debug-context', 'diffs');
      
      if (!fs.existsSync(diffDir)) {
        outputCallback?.('No diff directory found, nothing to clean up\n');
        return;
      }

      // Get all diff files with their stats
      const files = fs.readdirSync(diffDir)
        .filter(file => file.endsWith('.diff'))
        .map(file => {
          const filePath = path.join(diffDir, file);
          const stats = fs.statSync(filePath);
          return {
            name: file,
            path: filePath,
            mtime: stats.mtime
          };
        })
        .sort((a, b) => b.mtime.getTime() - a.mtime.getTime()); // Sort by newest first

      if (files.length === 0) {
        outputCallback?.('No diff files found to clean up\n');
        return;
      }

      outputCallback?.(`Found ${files.length} existing diff files\n`);

      // Keep the latest N files, delete the rest
      const filesToDelete = files.slice(keepLatest);
      
      if (filesToDelete.length === 0) {
        outputCallback?.(`Keeping all ${files.length} files (within limit of ${keepLatest})\n`);
        return;
      }

      outputCallback?.(`Keeping ${Math.min(files.length, keepLatest)} newest files, deleting ${filesToDelete.length} old files\n`);
      
      let deletedCount = 0;
      for (const file of filesToDelete) {
        try {
          fs.unlinkSync(file.path);
          deletedCount++;
          outputCallback?.(`Deleted: ${file.name}\n`);
        } catch (error) {
          outputCallback?.(`Failed to delete ${file.name}: ${error}\n`);
        }
      }
      
      outputCallback?.(`Successfully deleted ${deletedCount} old diff files\n`);
      
    } catch (error) {
      outputCallback?.(`Error during cleanup: ${error}\n`);
      // Don't throw error - cleanup failure shouldn't stop diff generation
    }
  }

  /**
   * Save diff content to a file in the workspace
   */
  private async saveDiffToFile(content: string, filename: string): Promise<string> {
    const diffDir = path.join(this.workspaceRoot, '.ai-debug-context', 'diffs');
    
    // Ensure directory exists
    if (!fs.existsSync(diffDir)) {
      fs.mkdirSync(diffDir, { recursive: true });
    }

    const filePath = path.join(diffDir, filename);
    fs.writeFileSync(filePath, content, 'utf8');
    
    return filePath;
  }

  /**
   * Open a diff file in VSCode
   */
  async openDiffFile(filePath: string): Promise<void> {
    try {
      const document = await vscode.workspace.openTextDocument(filePath);
      await vscode.window.showTextDocument(document);
    } catch (error) {
      throw new Error(`Failed to open diff file: ${error}`);
    }
  }

  /**
   * Delete a diff file
   */
  async deleteDiffFile(filePath: string): Promise<void> {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      throw new Error(`Failed to delete diff file: ${error}`);
    }
  }

  /**
   * Get all existing diff files
   */
  async getExistingDiffFiles(): Promise<string[]> {
    const diffDir = path.join(this.workspaceRoot, '.ai-debug-context', 'diffs');
    
    if (!fs.existsSync(diffDir)) {
      return [];
    }

    try {
      return fs.readdirSync(diffDir)
        .filter(file => file.endsWith('.diff'))
        .map(file => path.join(diffDir, file));
    } catch (error) {
      console.error('Failed to read diff directory:', error);
      return [];
    }
  }

  /**
   * Clean up all diff files (for manual cleanup)
   */
  async cleanupAllDiffFiles(): Promise<{ deleted: number; errors: string[] }> {
    const diffDir = path.join(this.workspaceRoot, '.ai-debug-context', 'diffs');
    const result = { deleted: 0, errors: [] as string[] };
    
    if (!fs.existsSync(diffDir)) {
      return result;
    }

    try {
      const files = fs.readdirSync(diffDir)
        .filter(file => file.endsWith('.diff'))
        .map(file => path.join(diffDir, file));

      for (const filePath of files) {
        try {
          fs.unlinkSync(filePath);
          result.deleted++;
        } catch (error) {
          result.errors.push(`Failed to delete ${path.basename(filePath)}: ${error}`);
        }
      }
      
    } catch (error) {
      result.errors.push(`Failed to read diff directory: ${error}`);
    }

    return result;
  }
}
