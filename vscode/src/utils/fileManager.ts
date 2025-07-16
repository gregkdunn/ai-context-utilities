import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { OutputType } from '../types';

export class FileManager {
    private workspaceRoot: string;
    private outputDirectory: string;

    constructor() {
        this.workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
        this.outputDirectory = ''; // Initialize with empty string
        this.updateOutputDirectory();
        
        // Listen for configuration changes
        vscode.workspace.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration('aiDebugUtilities.outputDirectory')) {
                this.updateOutputDirectory();
            }
        });
    }

    /**
     * Update output directory from configuration
     */
    private updateOutputDirectory() {
        const config = vscode.workspace.getConfiguration('aiDebugUtilities');
        const configDir = config.get<string>('outputDirectory') || '.github/instructions/ai_utilities_context';
        this.outputDirectory = path.join(this.workspaceRoot, configDir);
    }

    /**
     * Get the output directory path
     */
    getOutputDirectory(): string {
        return this.outputDirectory;
    }

    /**
     * Ensure output directory exists
     */
    ensureOutputDirectory(): void {
        if (!fs.existsSync(this.outputDirectory)) {
            fs.mkdirSync(this.outputDirectory, { recursive: true });
        }
    }

    /**
     * Save output content to a file
     */
    async saveOutput(type: OutputType, content: string): Promise<string> {
        this.ensureOutputDirectory();
        
        const fileName = this.getFileName(type);
        const filePath = path.join(this.outputDirectory, fileName);
        
        try {
            fs.writeFileSync(filePath, content, 'utf8');
            return filePath;
        } catch (error) {
            throw new Error(`Failed to save ${type} output: ${error}`);
        }
    }

    /**
     * Read content from an output file
     */
    async getFileContent(type: OutputType): Promise<string | null> {
        const fileName = this.getFileName(type);
        const filePath = path.join(this.outputDirectory, fileName);
        
        try {
            if (fs.existsSync(filePath)) {
                return fs.readFileSync(filePath, 'utf8');
            }
        } catch (error) {
            console.error(`Failed to read ${type} file:`, error);
        }
        
        return null;
    }

    /**
     * Open a file in VSCode editor
     */
    async openFile(filePath: string): Promise<void> {
        try {
            const uri = vscode.Uri.file(filePath);
            const document = await vscode.workspace.openTextDocument(uri);
            await vscode.window.showTextDocument(document);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to open file: ${error}`);
        }
    }

    /**
     * Get file path for output type
     */
    getFilePath(type: OutputType): string {
        const fileName = this.getFileName(type);
        return path.join(this.outputDirectory, fileName);
    }

    /**
     * Check if output file exists
     */
    fileExists(type: OutputType): boolean {
        const filePath = this.getFilePath(type);
        return fs.existsSync(filePath);
    }

    /**
     * Get file modification time
     */
    getFileModTime(type: OutputType): Date | null {
        const filePath = this.getFilePath(type);
        try {
            if (fs.existsSync(filePath)) {
                const stats = fs.statSync(filePath);
                return stats.mtime;
            }
        } catch (error) {
            console.error(`Failed to get file stats for ${type}:`, error);
        }
        return null;
    }

    /**
     * Get all output files with their metadata
     */
    getAllOutputFiles(): Array<{ type: OutputType; path: string; exists: boolean; modified?: Date }> {
        const types: OutputType[] = ['ai-debug-context', 'jest-output', 'diff', 'pr-description'];
        
        return types.map(type => ({
            type,
            path: this.getFilePath(type),
            exists: this.fileExists(type),
            modified: this.getFileModTime(type) || undefined
        }));
    }

    /**
     * Clean up old output files
     */
    async cleanupOldFiles(maxAge: number = 7 * 24 * 60 * 60 * 1000): Promise<void> {
        const now = Date.now();
        const files = this.getAllOutputFiles();
        
        for (const file of files) {
            if (file.exists && file.modified) {
                const age = now - file.modified.getTime();
                if (age > maxAge) {
                    try {
                        fs.unlinkSync(file.path);
                        console.log(`Cleaned up old file: ${file.path}`);
                    } catch (error) {
                        console.error(`Failed to cleanup file ${file.path}:`, error);
                    }
                }
            }
        }
    }

    /**
     * Copy file content to clipboard
     */
    async copyToClipboard(type: OutputType): Promise<void> {
        const content = await this.getFileContent(type);
        if (content) {
            await vscode.env.clipboard.writeText(content);
            vscode.window.showInformationMessage(`${type} content copied to clipboard`);
        } else {
            vscode.window.showWarningMessage(`No ${type} file found`);
        }
    }

    /**
     * Watch for file changes
     */
    watchFiles(callback: (type: OutputType, path: string) => void): vscode.Disposable {
        const pattern = new vscode.RelativePattern(this.outputDirectory, '*.txt');
        const watcher = vscode.workspace.createFileSystemWatcher(pattern);
        
        const onFileChange = (uri: vscode.Uri) => {
            const fileName = path.basename(uri.fsPath);
            const type = this.getTypeFromFileName(fileName);
            if (type) {
                callback(type, uri.fsPath);
            }
        };

        watcher.onDidChange(onFileChange);
        watcher.onDidCreate(onFileChange);
        
        return watcher;
    }

    /**
     * Initialize output files and return file paths
     */
    async initializeOutputFiles(types: string[]): Promise<Record<string, string>> {
        this.ensureOutputDirectory();
        const filePaths: Record<string, string> = {};
        
        for (const type of types) {
            const fileName = this.getFileNameFromType(type);
            filePaths[type] = path.join(this.outputDirectory, fileName);
        }
        
        return filePaths;
    }

    /**
     * Get output file path by filename
     */
    async getOutputFilePath(fileName: string): Promise<string> {
        this.ensureOutputDirectory();
        return path.join(this.outputDirectory, fileName);
    }

    /**
     * Ensure a directory exists
     */
    async ensureDirectoryExists(dirPath: string): Promise<void> {
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }
    }

    /**
     * Delete a file if it exists
     */
    async deleteFile(filePath: string): Promise<void> {
        try {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        } catch (error) {
            // Ignore errors when deleting files
        }
    }

    /**
     * Write content to a file
     */
    async writeFile(filePath: string, content: string): Promise<void> {
        const dir = path.dirname(filePath);
        await this.ensureDirectoryExists(dir);
        fs.writeFileSync(filePath, content, 'utf8');
    }

    /**
     * Read content from a file
     */
    async readFile(filePath: string): Promise<string> {
        return fs.readFileSync(filePath, 'utf8');
    }

    /**
     * Get file statistics
     */
    async getFileStats(filePath: string): Promise<{ size: string; lines: number }> {
        try {
            const stats = fs.statSync(filePath);
            const content = fs.readFileSync(filePath, 'utf8');
            const lines = content.split('\n').length;
            const sizeKB = Math.round(stats.size / 1024);
            
            return {
                size: `${sizeKB}KB`,
                lines
            };
        } catch (error) {
            return {
                size: '0KB',
                lines: 0
            };
        }
    }

    /**
     * Get file name from type string
     */
    private getFileNameFromType(type: string): string {
        switch (type) {
            case 'ai-debug-context':
                return 'ai-debug-context.txt';
            case 'jest-output':
                return 'jest-output.txt';
            case 'diff':
                return 'diff.txt';
            case 'pr-description-prompt':
                return 'pr-description-prompt.txt';
            default:
                return `${type}.txt`;
        }
    }
    /**
     * Get file name for output type
     */
    private getFileName(type: OutputType): string {
        switch (type) {
            case 'ai-debug-context':
                return 'ai-debug-context.txt';
            case 'jest-output':
                return 'jest-output.txt';
            case 'diff':
                return 'diff.txt';
            case 'pr-description':
                return 'pr-description-prompt.txt';
            default:
                throw new Error(`Unknown output type: ${type}`);
        }
    }

    /**
     * Get output type from file name
     */
    private getTypeFromFileName(fileName: string): OutputType | null {
        switch (fileName) {
            case 'ai-debug-context.txt':
                return 'ai-debug-context';
            case 'jest-output.txt':
                return 'jest-output';
            case 'diff.txt':
                return 'diff';
            case 'pr-description-prompt.txt':
                return 'pr-description';
            default:
                return null;
        }
    }
}
