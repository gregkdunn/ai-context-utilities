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
      let rawDiffContent: string;
      let filename: string;
      let commandUsed: string;

      outputCallback?.('Starting git diff generation...\n');
      
      // Clean up old diff files before generating new one
      outputCallback?.('Cleaning up old diff files...\n');
      await this.cleanupOldDiffFiles(outputCallback);
      outputCallback?.('Old diff files cleaned up\n');

      switch (mode) {
        case 'uncommitted':
          outputCallback?.('Generating diff for uncommitted changes...\n');
          rawDiffContent = await this.getDiffForUncommittedChanges();
          filename = 'diff.txt';
          commandUsed = 'git diff';
          break;
        case 'commit':
          if (!commitHash) {
            throw new Error('Commit hash required for commit diff mode');
          }
          outputCallback?.(`Generating diff for commit ${commitHash}...\n`);
          rawDiffContent = await this.getDiffForCommit(commitHash);
          filename = 'diff.txt';
          commandUsed = `git show ${commitHash}`;
          break;
        case 'branch-diff':
          outputCallback?.('Generating diff from current branch to main...\n');
          rawDiffContent = await this.getDiffFromMainBranch();
          filename = 'diff.txt';
          const currentBranch = await this.getCurrentBranch();
          const baseBranch = vscode.workspace.getConfiguration('aiDebugContext').get<string>('nxBaseBranch') || 'main';
          commandUsed = `git diff ${baseBranch}...${currentBranch}`;
          break;
        default:
          throw new Error(`Unsupported diff mode: ${mode}`);
      }

      outputCallback?.('Formatting diff with AI optimization...\n');
      
      // Generate diff content
      const formattedContent = await this.createAIOptimizedDiff(rawDiffContent, commandUsed);
      
      outputCallback?.('Writing diff to file...\n');
      const filePath = await this.saveDiffToFile(formattedContent, filename);
      
      outputCallback?.(`Diff saved successfully to ${filePath}\n`);
      outputCallback?.('Diff generation complete!\n');

      return { content: formattedContent, filePath };
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
      const diffDir = path.join(this.workspaceRoot, '.github', 'instructions', 'ai_utilities_context');
      
      if (!fs.existsSync(diffDir)) {
        outputCallback?.('No diff directory found, nothing to clean up\n');
        return;
      }

      // With static filename, no cleanup needed - file will be overwritten
      const staticFileName = 'diff.txt';
      const filePath = path.join(diffDir, staticFileName);
      
      if (fs.existsSync(filePath)) {
        outputCallback?.('Found existing diff.txt file (will be overwritten)\n');
      } else {
        outputCallback?.('No existing diff file found\n');
      }
      
    } catch (error) {
      outputCallback?.(`Error during cleanup: ${error}\n`);
      // Don't throw error - cleanup failure shouldn't stop diff generation
    }
  }

  /**
   * Save diff content to a file in the workspace
   */
  private async saveDiffToFile(content: string, filename: string): Promise<string> {
    const diffDir = path.join(this.workspaceRoot, '.github', 'instructions', 'ai_utilities_context');
    
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
    const diffDir = path.join(this.workspaceRoot, '.github', 'instructions', 'ai_utilities_context');
    
    if (!fs.existsSync(diffDir)) {
      return [];
    }

    try {
      const staticFileName = 'diff.txt';
      const filePath = path.join(diffDir, staticFileName);
      return fs.existsSync(filePath) ? [filePath] : [];
    } catch (error) {
      console.error('Failed to read diff directory:', error);
      return [];
    }
  }

  /**
   * Clean up all diff files (for manual cleanup)
   */
  async cleanupAllDiffFiles(): Promise<{ deleted: number; errors: string[] }> {
    const diffDir = path.join(this.workspaceRoot, '.github', 'instructions', 'ai_utilities_context');
    const result = { deleted: 0, errors: [] as string[] };
    
    if (!fs.existsSync(diffDir)) {
      return result;
    }

    try {
      const staticFileName = 'diff.txt';
      const filePath = path.join(diffDir, staticFileName);
      
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
          result.deleted++;
        } catch (error) {
          result.errors.push(`Failed to delete ${staticFileName}: ${error}`);
        }
      }
      
    } catch (error) {
      result.errors.push(`Failed to read diff directory: ${error}`);
    }

    return result;
  }

  /**
   * Create  diff with analysis and context
   */
  private async createAIOptimizedDiff(rawDiff: string, commandUsed: string): Promise<string> {
    if (!rawDiff.trim()) {
      return this.createNoChangesOutput(commandUsed);
    }

    const currentBranch = await this.getCurrentBranch();
    const timestamp = new Date().toLocaleString();
    
    // Parse diff for file analysis
    const fileAnalysis = this.analyzeDiffFiles(rawDiff);
    const fileTypeStats = this.analyzeFileTypes(fileAnalysis.allFiles);
    
    let output = '';
    
    // Header
    output += '=================================================================\n';
    output += '🔍 GIT DIFF\n';
    output += '=================================================================\n\n';
    output += `COMMAND: ${commandUsed}\n`;
    output += `TIMESTAMP: ${timestamp}\n`;
    output += `BRANCH: ${currentBranch}\n\n`;
    
    // Change Summary
    output += '==================================================================\n';
    output += '📊 CHANGE SUMMARY\n';
    output += '==================================================================\n';
    output += `Total files changed: ${fileAnalysis.totalFiles}\n\n`;
    
    if (fileAnalysis.newFiles.length > 0) {
      output += `🆕 NEW FILES (${fileAnalysis.newFiles.length}):\n`;
      fileAnalysis.newFiles.forEach(file => {
        output += `  • ${file}\n`;
      });
      output += '\n';
    }
    
    if (fileAnalysis.modifiedFiles.length > 0) {
      output += `📝 MODIFIED FILES (${fileAnalysis.modifiedFiles.length}):\n`;
      fileAnalysis.modifiedFiles.forEach(file => {
        output += `  • ${file}\n`;
      });
      output += '\n';
    }
    
    if (fileAnalysis.deletedFiles.length > 0) {
      output += `🗑️ DELETED FILES (${fileAnalysis.deletedFiles.length}):\n`;
      fileAnalysis.deletedFiles.forEach(file => {
        output += `  • ${file}\n`;
      });
      output += '\n';
    }
    
    if (fileAnalysis.renamedFiles.length > 0) {
      output += `📦 RENAMED/MOVED FILES (${fileAnalysis.renamedFiles.length}):\n`;
      fileAnalysis.renamedFiles.forEach(file => {
        output += `  • ${file}\n`;
      });
      output += '\n';
    }
    
    // File Type Analysis
    output += '==================================================================\n';
    output += '🏷️ FILE TYPE ANALYSIS\n';
    output += '==================================================================\n';
    output += `TypeScript files: ${fileTypeStats.typescript}\n`;
    output += `Test files: ${fileTypeStats.tests}\n`;
    output += `Templates: ${fileTypeStats.templates}\n`;
    output += `Styles: ${fileTypeStats.styles}\n`;
    output += `Config/JSON: ${fileTypeStats.config}\n`;
    output += `Other: ${fileTypeStats.other}\n\n`;
    
    // Detailed Changes
    output += '==================================================================\n';
    output += '📋 DETAILED CHANGES\n';
    output += '==================================================================\n\n';
    
    // Process diff with file separators
    output += this.formatDiffWithFileSeparators(rawDiff);
    
    // AI Analysis Context
    output += '\n==================================================================\n';
    output += '🤖 AI ANALYSIS CONTEXT\n';
    output += '==================================================================\n';
    output += 'Key areas for analysis:\n';
    output += '• Focus on test-related files (.spec.ts, .test.ts)\n';
    output += '• Look for type/interface changes that might break tests\n';
    output += '• Check for new functionality that needs test coverage\n';
    output += '• Identify breaking changes in method signatures\n';
    output += '• Review dependency changes and imports\n\n';
    output += 'Change impact areas:\n';
    
    if (fileAnalysis.newFiles.length > 0) {
      output += '• New files may need comprehensive test coverage\n';
    }
    if (fileAnalysis.modifiedFiles.length > 0) {
      output += '• Modified files may have broken existing tests\n';
    }
    if (fileAnalysis.deletedFiles.length > 0) {
      output += '• Deleted files may have orphaned tests or dependencies\n';
    }
    
    return output;
  }

  /**
   * Analyze diff files and categorize them
   */
  private analyzeDiffFiles(diff: string): {
    newFiles: string[];
    modifiedFiles: string[];
    deletedFiles: string[];
    renamedFiles: string[];
    allFiles: string[];
    totalFiles: number;
  } {
    const newFiles: string[] = [];
    const modifiedFiles: string[] = [];
    const deletedFiles: string[] = [];
    const renamedFiles: string[] = [];
    const allFiles: string[] = [];
    
    const lines = diff.split('\n');
    let currentFileA = '';
    let currentFileB = '';
    let isNewFile = false;
    let isDeletedFile = false;
    
    for (const line of lines) {
      // Match diff --git a/file b/file
      const diffMatch = line.match(/^diff --git a\/(.+) b\/(.+)$/);
      if (diffMatch) {
        currentFileA = diffMatch[1];
        currentFileB = diffMatch[2];
        isNewFile = false;
        isDeletedFile = false;
        
        // Check for renames/moves
        if (currentFileA !== currentFileB) {
          renamedFiles.push(`${currentFileA} → ${currentFileB}`);
          allFiles.push(currentFileB);
        }
        continue;
      }
      
      // Check for new file mode
      if (line.match(/^new file mode/)) {
        isNewFile = true;
        newFiles.push(currentFileB);
        allFiles.push(currentFileB);
        continue;
      }
      
      // Check for deleted file mode
      if (line.match(/^deleted file mode/)) {
        isDeletedFile = true;
        deletedFiles.push(currentFileA);
        allFiles.push(currentFileA);
        continue;
      }
      
      // Check for index line (indicates modification)
      if (line.match(/^index [0-9a-f]+\.\.[0-9a-f]+/) && !isNewFile && !isDeletedFile && currentFileA === currentFileB) {
        modifiedFiles.push(currentFileA);
        allFiles.push(currentFileA);
      }
    }
    
    return {
      newFiles,
      modifiedFiles,
      deletedFiles,
      renamedFiles,
      allFiles,
      totalFiles: newFiles.length + modifiedFiles.length + deletedFiles.length + renamedFiles.length
    };
  }

  /**
   * Analyze file types in the diff
   */
  private analyzeFileTypes(files: string[]): {
    typescript: number;
    tests: number;
    templates: number;
    styles: number;
    config: number;
    other: number;
  } {
    let typescript = 0;
    let tests = 0;
    let templates = 0;
    let styles = 0;
    let config = 0;
    let other = 0;
    
    for (const file of files) {
      if (file.endsWith('.spec.ts') || file.endsWith('.test.ts')) {
        tests++;
      } else if (file.endsWith('.ts')) {
        typescript++;
      } else if (file.endsWith('.html')) {
        templates++;
      } else if (file.endsWith('.css') || file.endsWith('.scss') || file.endsWith('.sass')) {
        styles++;
      } else if (file.endsWith('.json') || file.endsWith('.yml') || file.endsWith('.yaml')) {
        config++;
      } else {
        other++;
      }
    }
    
    return { typescript, tests, templates, styles, config, other };
  }

  /**
   * Format diff with file separators for better AI parsing
   */
  private formatDiffWithFileSeparators(diff: string): string {
    const lines = diff.split('\n');
    let output = '';
    let currentFile = '';
    
    for (const line of lines) {
      // Check for new file header
      const diffMatch = line.match(/^diff --git a\/(.+) b\/(.+)$/);
      if (diffMatch) {
        currentFile = diffMatch[2];
        output += `📁 FILE: ${currentFile}\n`;
        output += '─────────────────────────────────────────\n';
      }
      output += line + '\n';
    }
    
    return output;
  }

  /**
   * Create output when no changes are detected
   */
  private createNoChangesOutput(commandUsed: string): string {
    const timestamp = new Date().toLocaleString();
    
    return `=================================================================
🔍 GIT DIFF ANALYSIS
=================================================================

STATUS: No changes detected
COMMAND: ${commandUsed}
TIMESTAMP: ${timestamp}
BRANCH: ${this.getCurrentBranch()}

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
• Review recent commit history
• Check if issue is environment-related rather than code-related
• Examine test setup or configuration files
`;
  }
}
