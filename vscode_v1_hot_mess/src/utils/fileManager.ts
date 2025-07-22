import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { OutputType } from '../types';

export interface FileOperationResult {
  success: boolean;
  filePath?: string;
  error?: string;
  content?: string;
}

export interface FileStats {
  size: number;
  created: Date;
  modified: Date;
  accessed: Date;
}

export class FileManager {
  private outputChannel: vscode.OutputChannel;
  private workspacePath: string;
  private outputDirectory: string;
  private watchers: fs.FSWatcher[] = [];

  constructor(outputChannel: vscode.OutputChannel) {
    this.outputChannel = outputChannel;
    this.workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
    this.outputDirectory = path.join(this.workspacePath, '.ai-debug-output');
    this.ensureOutputDirectory();
  }

  // Output directory management
  public getOutputDirectory(): string {
    return this.outputDirectory;
  }

  public ensureOutputDirectory(): void {
    if (!fs.existsSync(this.outputDirectory)) {
      fs.mkdirSync(this.outputDirectory, { recursive: true });
    }
  }

  // Initialize output files
  public async initializeOutputFiles(types: string[]): Promise<Record<string, string>> {
    const outputFiles: Record<string, string> = {};
    
    for (const type of types) {
      const filePath = this.getOutputFilePath(type);
      outputFiles[type] = filePath;
      
      // Create empty file if it doesn't exist
      if (!fs.existsSync(filePath)) {
        await fs.promises.writeFile(filePath, '', 'utf8');
      }
    }
    
    return outputFiles;
  }

  // Get output file path
  public getOutputFilePath(fileName: string): string {
    if (!fileName.endsWith('.txt')) {
      fileName += '.txt';
    }
    return path.join(this.outputDirectory, fileName);
  }

  // Save output to file
  public async saveOutput(type: OutputType, content: string): Promise<string> {
    try {
      const filePath = this.getOutputFilePath(type);
      await fs.promises.writeFile(filePath, content, 'utf8');
      this.outputChannel.appendLine(`Saved ${type} output to: ${filePath}`);
      return filePath;
    } catch (error) {
      const message = `Failed to save ${type} output: ${error}`;
      this.outputChannel.appendLine(message);
      throw new Error(message);
    }
  }

  // Get file content
  public async getFileContent(type: OutputType): Promise<string> {
    try {
      const filePath = this.getOutputFilePath(type);
      
      if (!fs.existsSync(filePath)) {
        return '';
      }
      
      return await fs.promises.readFile(filePath, 'utf8');
    } catch (error) {
      this.outputChannel.appendLine(`Error reading ${type} file: ${error}`);
      return '';
    }
  }

  // Get file path
  public getFilePath(type: OutputType): string {
    return this.getOutputFilePath(type);
  }

  // Get file modification time
  public getFileModTime(type: OutputType): Date | null {
    try {
      const filePath = this.getOutputFilePath(type);
      if (!fs.existsSync(filePath)) {
        return null;
      }
      
      const stats = fs.statSync(filePath);
      return stats.mtime;
    } catch (error) {
      this.outputChannel.appendLine(`Error getting mod time for ${type}: ${error}`);
      return null;
    }
  }

  // Get file stats
  public async getFileStats(filePath: string): Promise<FileStats | null> {
    try {
      const stats = await fs.promises.stat(filePath);
      return {
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        accessed: stats.atime
      };
    } catch (error) {
      this.outputChannel.appendLine(`Error getting file stats for ${filePath}: ${error}`);
      return null;
    }
  }

  // Get all output files
  public getAllOutputFiles(): Record<string, string> {
    const files: Record<string, string> = {};
    
    try {
      const outputFiles = fs.readdirSync(this.outputDirectory);
      
      for (const file of outputFiles) {
        if (file.endsWith('.txt')) {
          const name = file.replace('.txt', '');
          files[name] = path.join(this.outputDirectory, file);
        }
      }
    } catch (error) {
      this.outputChannel.appendLine(`Error reading output directory: ${error}`);
    }
    
    return files;
  }

  // Cleanup old files
  public async cleanupOldFiles(maxAge: number = 7 * 24 * 60 * 60 * 1000): Promise<void> {
    try {
      const files = fs.readdirSync(this.outputDirectory);
      const now = Date.now();
      
      for (const file of files) {
        const filePath = path.join(this.outputDirectory, file);
        const stats = fs.statSync(filePath);
        
        if (now - stats.mtime.getTime() > maxAge) {
          await fs.promises.unlink(filePath);
          this.outputChannel.appendLine(`Cleaned up old file: ${file}`);
        }
      }
    } catch (error) {
      this.outputChannel.appendLine(`Error cleaning up old files: ${error}`);
    }
  }

  // Copy to clipboard
  public async copyToClipboard(type: OutputType): Promise<void> {
    try {
      const content = await this.getFileContent(type);
      await vscode.env.clipboard.writeText(content);
      vscode.window.showInformationMessage(`${type} content copied to clipboard`);
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to copy ${type} to clipboard: ${error}`);
    }
  }

  // Open file in editor
  public async openFile(filePath: string): Promise<void> {
    try {
      const document = await vscode.workspace.openTextDocument(filePath);
      await vscode.window.showTextDocument(document);
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to open file: ${error}`);
    }
  }

  // Watch files for changes
  public watchFiles(callback: (filePath: string, eventType: string) => void): vscode.Disposable {
    const watcher = fs.watch(this.outputDirectory, (eventType, filename) => {
      if (filename) {
        const filePath = path.join(this.outputDirectory, filename);
        callback(filePath, eventType);
      }
    });
    
    this.watchers.push(watcher);
    
    return {
      dispose: () => {
        const index = this.watchers.indexOf(watcher);
        if (index > -1) {
          this.watchers.splice(index, 1);
        }
        watcher.close();
      }
    };
  }

  // Basic file operations
  public async readFile(filePath: string): Promise<FileOperationResult> {
    try {
      const fullPath = path.resolve(this.workspacePath, filePath);
      const content = await fs.promises.readFile(fullPath, 'utf8');
      return {
        success: true,
        filePath: fullPath,
        content
      };
    } catch (error) {
      return {
        success: false,
        filePath,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  public async writeFile(filePath: string, content: string): Promise<FileOperationResult> {
    try {
      const fullPath = path.resolve(this.workspacePath, filePath);
      await fs.promises.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.promises.writeFile(fullPath, content, 'utf8');
      
      this.outputChannel.appendLine(`File written: ${fullPath}`);
      
      return {
        success: true,
        filePath: fullPath
      };
    } catch (error) {
      return {
        success: false,
        filePath,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  public async ensureDirectoryExists(dirPath: string): Promise<void> {
    const fullPath = path.resolve(this.workspacePath, dirPath);
    await fs.promises.mkdir(fullPath, { recursive: true });
  }

  public async fileExists(filePath: string): Promise<boolean> {
    try {
      const fullPath = path.resolve(this.workspacePath, filePath);
      await fs.promises.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  public async deleteFile(filePath: string): Promise<FileOperationResult> {
    try {
      const fullPath = path.resolve(this.workspacePath, filePath);
      await fs.promises.unlink(fullPath);
      return {
        success: true,
        filePath: fullPath
      };
    } catch (error) {
      return {
        success: false,
        filePath,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  public async copyFile(sourcePath: string, destPath: string): Promise<FileOperationResult> {
    try {
      const fullSourcePath = path.resolve(this.workspacePath, sourcePath);
      const fullDestPath = path.resolve(this.workspacePath, destPath);
      
      await fs.promises.mkdir(path.dirname(fullDestPath), { recursive: true });
      await fs.promises.copyFile(fullSourcePath, fullDestPath);
      
      return {
        success: true,
        filePath: fullDestPath
      };
    } catch (error) {
      return {
        success: false,
        filePath: destPath,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  public async listFiles(dirPath: string): Promise<string[]> {
    try {
      const fullPath = path.resolve(this.workspacePath, dirPath);
      const files = await fs.promises.readdir(fullPath);
      return files.map(file => path.join(dirPath, file));
    } catch (error) {
      this.outputChannel.appendLine(`Error listing files in ${dirPath}: ${error}`);
      return [];
    }
  }

  public getWorkspacePath(): string {
    return this.workspacePath;
  }

  public getRelativePath(absolutePath: string): string {
    return path.relative(this.workspacePath, absolutePath);
  }

  public getAbsolutePath(relativePath: string): string {
    return path.resolve(this.workspacePath, relativePath);
  }

  public dispose(): void {
    this.watchers.forEach(watcher => watcher.close());
    this.watchers = [];
  }
}