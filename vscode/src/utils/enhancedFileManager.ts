import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { OutputType } from '../types';

export interface FileMetadata {
    path: string;
    size: number;
    sizeFormatted: string;
    lines: number;
    created: Date;
    modified: Date;
    exists: boolean;
    type: OutputType;
    status: 'current' | 'stale' | 'missing' | 'error';
}

export interface FileBatch {
    id: string;
    timestamp: Date;
    files: FileMetadata[];
    command: string;
    success: boolean;
}

export interface FileWatchEvent {
    type: 'created' | 'modified' | 'deleted';
    file: OutputType;
    path: string;
    timestamp: Date;
}

export class EnhancedFileManager {
    private workspaceRoot: string;
    private outputDirectory: string;
    private watchers: Map<string, vscode.FileSystemWatcher> = new Map();
    private fileHistory: FileBatch[] = [];
    private maxHistoryItems = 50;

    constructor() {
        this.workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
        this.outputDirectory = '';
        this.updateOutputDirectory();
        
        // Listen for configuration changes
        vscode.workspace.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration('aiDebugUtilities.outputDirectory')) {
                this.updateOutputDirectory();
                this.recreateWatchers();
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
     * Create a backup of the current output directory
     */
    async createBackup(label?: string): Promise<string> {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupLabel = label || 'manual';
        const backupDir = path.join(
            this.outputDirectory, 
            '..', 
            'backups', 
            `backup-${backupLabel}-${timestamp}`
        );
        
        await this.ensureDirectoryExists(backupDir);
        
        const files = this.getAllOutputFiles();
        let backedUpCount = 0;
        
        for (const file of files) {
            if (file.exists) {
                const backupPath = path.join(backupDir, path.basename(file.path));
                try {
                    await fs.promises.copyFile(file.path, backupPath);
                    backedUpCount++;
                } catch (error) {
                    console.warn(`Failed to backup ${file.path}:`, error);
                }
            }
        }
        
        // Create backup metadata
        const metadata = {
            timestamp: new Date(),
            label: backupLabel,
            files: backedUpCount,
            originalPath: this.outputDirectory,
            version: await this.getExtensionVersion()
        };
        
        await fs.promises.writeFile(
            path.join(backupDir, 'backup-metadata.json'),
            JSON.stringify(metadata, null, 2)
        );
        
        vscode.window.showInformationMessage(
            `Backup created with ${backedUpCount} files: ${path.basename(backupDir)}`
        );
        
        return backupDir;
    }

    /**
     * Restore from a backup directory
     */
    async restoreFromBackup(backupPath: string): Promise<void> {
        if (!fs.existsSync(backupPath)) {
            throw new Error(`Backup directory not found: ${backupPath}`);
        }
        
        // Read backup metadata if available
        const metadataPath = path.join(backupPath, 'backup-metadata.json');
        let metadata: any = null;
        
        if (fs.existsSync(metadataPath)) {
            try {
                metadata = JSON.parse(await fs.promises.readFile(metadataPath, 'utf8'));
            } catch (error) {
                console.warn('Failed to read backup metadata:', error);
            }
        }
        
        await this.ensureOutputDirectory();
        
        // Find all files in backup directory (excluding metadata)
        const backupFiles = fs.readdirSync(backupPath)
            .filter(file => file !== 'backup-metadata.json' && file.endsWith('.txt'));
        
        let restoredCount = 0;
        
        for (const file of backupFiles) {
            const sourcePath = path.join(backupPath, file);
            const targetPath = path.join(this.outputDirectory, file);
            
            try {
                await fs.promises.copyFile(sourcePath, targetPath);
                restoredCount++;
            } catch (error) {
                console.error(`Failed to restore ${file}:`, error);
            }
        }
        
        const backupInfo = metadata 
            ? ` from ${metadata.label} (${new Date(metadata.timestamp).toLocaleDateString()})`
            : '';
        
        vscode.window.showInformationMessage(
            `Restored ${restoredCount} files${backupInfo}`
        );
    }

    /**
     * Enhanced file saving with versioning and validation
     */
    async saveOutputWithVersioning(type: OutputType, content: string, options?: {
        backup?: boolean;
        validate?: boolean;
    }): Promise<string> {
        this.ensureOutputDirectory();
        
        const fileName = this.getFileName(type);
        const filePath = path.join(this.outputDirectory, fileName);
        
        // Create backup if existing file and backup requested
        if (options?.backup && fs.existsSync(filePath)) {
            const backupPath = `${filePath}.backup.${Date.now()}`;
            await fs.promises.copyFile(filePath, backupPath);
        }
        
        // Validate content if requested
        if (options?.validate) {
            await this.validateFileContent(type, content);
        }
        
        try {
            await fs.promises.writeFile(filePath, content, 'utf8');
            
            // Add to file history
            this.addToHistory(type, 'saved', filePath);
            
            return filePath;
        } catch (error) {
            throw new Error(`Failed to save ${type} output: ${error}`);
        }
    }

    /**
     * Validate file content based on type
     */
    private async validateFileContent(type: OutputType, content: string): Promise<void> {
        switch (type) {
            case 'jest-output':
                if (!content.includes('Test') && !content.includes('PASS') && !content.includes('FAIL')) {
                    console.warn('Jest output validation: Content may not be valid test output');
                }
                break;
            case 'diff':
                if (content.trim() && !content.includes('diff --git') && !content.includes('@@')) {
                    console.warn('Diff validation: Content may not be valid diff output');
                }
                break;
            case 'ai-debug-context':
                if (!content.includes('AI DEBUG CONTEXT') && content.length < 100) {
                    console.warn('AI context validation: Content seems too short or invalid');
                }
                break;
            case 'pr-description':
                if (!content.includes('PR DESCRIPTION') && content.length < 50) {
                    console.warn('PR description validation: Content seems incomplete');
                }
                break;
        }
    }

    /**
     * Get comprehensive file metadata
     */
    async getFileMetadata(type: OutputType): Promise<FileMetadata> {
        const filePath = this.getFilePath(type);
        const exists = fs.existsSync(filePath);
        
        if (!exists) {
            return {
                path: filePath,
                size: 0,
                sizeFormatted: '0 B',
                lines: 0,
                created: new Date(0),
                modified: new Date(0),
                exists: false,
                type,
                status: 'missing'
            };
        }
        
        try {
            const stats = fs.statSync(filePath);
            const content = await fs.promises.readFile(filePath, 'utf8');
            const lines = content.split('\n').length;
            
            // Determine status
            const age = Date.now() - stats.mtime.getTime();
            const isStale = age > (24 * 60 * 60 * 1000); // 24 hours
            
            return {
                path: filePath,
                size: stats.size,
                sizeFormatted: this.formatFileSize(stats.size),
                lines,
                created: stats.birthtime,
                modified: stats.mtime,
                exists: true,
                type,
                status: isStale ? 'stale' : 'current'
            };
        } catch (error) {
            return {
                path: filePath,
                size: 0,
                sizeFormatted: '0 B',
                lines: 0,
                created: new Date(0),
                modified: new Date(0),
                exists: true,
                type,
                status: 'error'
            };
        }
    }

    /**
     * Get metadata for all output files
     */
    async getAllFileMetadata(): Promise<FileMetadata[]> {
        const types: OutputType[] = ['ai-debug-context', 'jest-output', 'diff', 'pr-description'];
        return Promise.all(types.map(type => this.getFileMetadata(type)));
    }

    /**
     * Create file batch record for command execution
     */
    async createFileBatch(command: string, types: OutputType[], success: boolean): Promise<FileBatch> {
        const batch: FileBatch = {
            id: `${command}-${Date.now()}`,
            timestamp: new Date(),
            files: await Promise.all(types.map(type => this.getFileMetadata(type))),
            command,
            success
        };
        
        this.fileHistory.unshift(batch);
        
        // Limit history size
        if (this.fileHistory.length > this.maxHistoryItems) {
            this.fileHistory = this.fileHistory.slice(0, this.maxHistoryItems);
        }
        
        return batch;
    }

    /**
     * Get file history
     */
    getFileHistory(): FileBatch[] {
        return [...this.fileHistory];
    }

    /**
     * Enhanced file watching with detailed events
     */
    watchOutputFiles(callback: (event: FileWatchEvent) => void): vscode.Disposable {
        const watchId = `output-files-${Date.now()}`;
        const pattern = new vscode.RelativePattern(this.outputDirectory, '*.txt');
        const watcher = vscode.workspace.createFileSystemWatcher(pattern);
        
        const handleFileEvent = (type: 'created' | 'modified' | 'deleted') => 
            (uri: vscode.Uri) => {
                const fileName = path.basename(uri.fsPath);
                const outputType = this.getTypeFromFileName(fileName);
                
                if (outputType) {
                    const event: FileWatchEvent = {
                        type,
                        file: outputType,
                        path: uri.fsPath,
                        timestamp: new Date()
                    };
                    
                    callback(event);
                }
            };
        
        watcher.onDidCreate(handleFileEvent('created'));
        watcher.onDidChange(handleFileEvent('modified'));
        watcher.onDidDelete(handleFileEvent('deleted'));
        
        this.watchers.set(watchId, watcher);
        
        return {
            dispose: () => {
                watcher.dispose();
                this.watchers.delete(watchId);
            }
        };
    }

    // Helper methods
    private formatFileSize(bytes: number): string {
        const units = ['B', 'KB', 'MB', 'GB'];
        let size = bytes;
        let unitIndex = 0;
        
        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }
        
        return `${Math.round(size * 100) / 100} ${units[unitIndex]}`;
    }
    
    private async getExtensionVersion(): Promise<string> {
        try {
            const packagePath = path.join(__dirname, '..', '..', 'package.json');
            const packageContent = await fs.promises.readFile(packagePath, 'utf8');
            const packageJson = JSON.parse(packageContent);
            return packageJson.version || '1.0.0';
        } catch {
            return '1.0.0';
        }
    }
    
    private addToHistory(type: OutputType, action: string, filePath: string): void {
        // Add to internal history tracking if needed
        console.log(`File ${action}: ${type} -> ${filePath}`);
    }
    
    private recreateWatchers(): void {
        // Dispose existing watchers and recreate them with new output directory
        this.watchers.forEach(watcher => watcher.dispose());
        this.watchers.clear();
    }

    // Include all existing methods from the original FileManager
    ensureOutputDirectory(): void {
        if (!fs.existsSync(this.outputDirectory)) {
            fs.mkdirSync(this.outputDirectory, { recursive: true });
        }
    }

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

    async openFile(filePath: string): Promise<void> {
        try {
            const uri = vscode.Uri.file(filePath);
            const document = await vscode.workspace.openTextDocument(uri);
            await vscode.window.showTextDocument(document);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to open file: ${error}`);
        }
    }

    getFilePath(type: OutputType): string {
        const fileName = this.getFileName(type);
        return path.join(this.outputDirectory, fileName);
    }

    fileExists(type: OutputType): boolean {
        const filePath = this.getFilePath(type);
        return fs.existsSync(filePath);
    }

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

    getAllOutputFiles(): Array<{ type: OutputType; path: string; exists: boolean; modified?: Date }> {
        const types: OutputType[] = ['ai-debug-context', 'jest-output', 'diff', 'pr-description'];
        
        return types.map(type => ({
            type,
            path: this.getFilePath(type),
            exists: this.fileExists(type),
            modified: this.getFileModTime(type) || undefined
        }));
    }

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

    async copyToClipboard(type: OutputType): Promise<void> {
        const content = await this.getFileContent(type);
        if (content) {
            await vscode.env.clipboard.writeText(content);
            vscode.window.showInformationMessage(`${type} content copied to clipboard`);
        } else {
            vscode.window.showWarningMessage(`No ${type} file found`);
        }
    }

    async initializeOutputFiles(types: string[]): Promise<Record<string, string>> {
        this.ensureOutputDirectory();
        const filePaths: Record<string, string> = {};
        
        for (const type of types) {
            const fileName = this.getFileNameFromType(type);
            filePaths[type] = path.join(this.outputDirectory, fileName);
        }
        
        return filePaths;
    }

    async getOutputFilePath(fileName: string): Promise<string> {
        this.ensureOutputDirectory();
        return path.join(this.outputDirectory, fileName);
    }

    async ensureDirectoryExists(dirPath: string): Promise<void> {
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }
    }

    async deleteFile(filePath: string): Promise<void> {
        try {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        } catch (error) {
            // Ignore errors when deleting files
        }
    }

    async writeFile(filePath: string, content: string): Promise<void> {
        const dir = path.dirname(filePath);
        await this.ensureDirectoryExists(dir);
        fs.writeFileSync(filePath, content, 'utf8');
    }

    async readFile(filePath: string): Promise<string> {
        return fs.readFileSync(filePath, 'utf8');
    }

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

// Export the original FileManager class name for backward compatibility
export class FileManager extends EnhancedFileManager {
    // This maintains backward compatibility while providing enhanced features
}