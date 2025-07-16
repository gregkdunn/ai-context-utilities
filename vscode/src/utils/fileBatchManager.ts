import { EnhancedFileManager, FileBatch, FileMetadata } from './enhancedFileManager';
import { OutputType } from '../types';
import * as vscode from 'vscode';

export interface BatchOperationResult {
    success: boolean;
    batchId: string;
    filesProcessed: number;
    errors: string[];
    duration: number;
    outputPaths: Record<OutputType, string>;
}

export interface BatchOperationOptions {
    createBackup?: boolean;
    validateContent?: boolean;
    notifyUser?: boolean;
    trackHistory?: boolean;
    maxRetries?: number;
}

export class FileBatchManager {
    private fileManager: EnhancedFileManager;
    private activeBatches: Map<string, FileBatch> = new Map();

    constructor() {
        this.fileManager = new EnhancedFileManager();
    }

    /**
     * Execute a batch file operation for a command
     */
    async executeBatch(
        command: string,
        files: Array<{ type: OutputType; content: string }>,
        options: BatchOperationOptions = {}
    ): Promise<BatchOperationResult> {
        const startTime = Date.now();
        const batchId = `${command}-${Date.now()}`;
        const errors: string[] = [];
        const outputPaths: Record<OutputType, string> = {} as Record<OutputType, string>;
        let filesProcessed = 0;

        try {
            // Create backup if requested
            if (options.createBackup) {
                try {
                    await this.fileManager.createBackup(`${command}-auto`);
                } catch (error) {
                    errors.push(`Backup failed: ${error}`);
                }
            }

            // Process each file
            for (const file of files) {
                let retries = options.maxRetries || 0;
                let fileSuccess = false;

                while (!fileSuccess && retries >= 0) {
                    try {
                        if (options.validateContent) {
                            const filePath = await this.fileManager.saveOutputWithVersioning(
                                file.type,
                                file.content,
                                { validate: true }
                            );
                            outputPaths[file.type] = filePath;
                        } else {
                            const filePath = await this.fileManager.saveOutput(file.type, file.content);
                            outputPaths[file.type] = filePath;
                        }
                        
                        filesProcessed++;
                        fileSuccess = true;
                    } catch (error) {
                        retries--;
                        if (retries < 0) {
                            errors.push(`Failed to save ${file.type}: ${error}`);
                        } else {
                            // Wait before retry
                            await new Promise(resolve => setTimeout(resolve, 100));
                        }
                    }
                }
            }

            // Create file batch record if tracking enabled
            if (options.trackHistory) {
                const batch = await this.fileManager.createFileBatch(
                    command,
                    files.map(f => f.type),
                    errors.length === 0
                );
                this.activeBatches.set(batchId, batch);
            }

            // Notify user if requested
            if (options.notifyUser && errors.length === 0) {
                vscode.window.showInformationMessage(
                    `${command}: Successfully processed ${filesProcessed} files`
                );
            } else if (options.notifyUser && errors.length > 0) {
                vscode.window.showWarningMessage(
                    `${command}: Processed ${filesProcessed} files with ${errors.length} errors`
                );
            }

            const duration = Date.now() - startTime;
            return {
                success: errors.length === 0,
                batchId,
                filesProcessed,
                errors,
                duration,
                outputPaths
            };

        } catch (error) {
            const duration = Date.now() - startTime;
            return {
                success: false,
                batchId,
                filesProcessed,
                errors: [...errors, `Batch operation failed: ${error}`],
                duration,
                outputPaths
            };
        }
    }

    /**
     * Prepare output files for a command workflow
     */
    async prepareCommandOutputs(command: string, types: OutputType[]): Promise<Record<OutputType, string>> {
        const outputPaths: Record<OutputType, string> = {} as Record<OutputType, string>;
        
        // Ensure output directory exists
        this.fileManager.ensureOutputDirectory();
        
        // Get file paths for each type
        for (const type of types) {
            outputPaths[type] = this.fileManager.getFilePath(type);
        }
        
        return outputPaths;
    }

    /**
     * Validate command outputs after execution
     */
    async validateCommandOutputs(
        command: string,
        expectedTypes: OutputType[]
    ): Promise<{ valid: OutputType[]; missing: OutputType[]; corrupt: OutputType[] }> {
        const valid: OutputType[] = [];
        const missing: OutputType[] = [];
        const corrupt: OutputType[] = [];

        for (const type of expectedTypes) {
            if (!this.fileManager.fileExists(type)) {
                missing.push(type);
                continue;
            }

            try {
                const content = await this.fileManager.getFileContent(type);
                if (!content || content.trim().length === 0) {
                    corrupt.push(type);
                } else if (this.isContentValid(type, content)) {
                    valid.push(type);
                } else {
                    corrupt.push(type);
                }
            } catch (error) {
                corrupt.push(type);
            }
        }

        return { valid, missing, corrupt };
    }

    /**
     * Create a summary report of file operations
     */
    async createOperationSummary(
        command: string,
        result: BatchOperationResult,
        additionalContext?: Record<string, any>
    ): Promise<string> {
        const timestamp = new Date().toISOString();
        const fileStats = await Promise.all(
            Object.entries(result.outputPaths).map(async ([type, path]) => {
                const stats = await this.fileManager.getFileStats(path);
                return `${type}: ${stats.size} (${stats.lines} lines)`;
            })
        );

        let summary = `
=================================================================
📊 FILE OPERATION SUMMARY - ${command.toUpperCase()}
=================================================================

🕐 Timestamp: ${timestamp}
⏱️  Duration: ${result.duration}ms
📁 Batch ID: ${result.batchId}
✅ Success: ${result.success ? 'Yes' : 'No'}
📄 Files Processed: ${result.filesProcessed}
❌ Errors: ${result.errors.length}

=================================================================
📋 FILE DETAILS
=================================================================

${fileStats.join('\n')}

`;

        if (result.errors.length > 0) {
            summary += `
=================================================================
⚠️  ERRORS ENCOUNTERED
=================================================================

${result.errors.map((error, i) => `${i + 1}. ${error}`).join('\n')}

`;
        }

        if (additionalContext) {
            summary += `
=================================================================
📝 ADDITIONAL CONTEXT
=================================================================

${Object.entries(additionalContext)
    .map(([key, value]) => `${key}: ${JSON.stringify(value, null, 2)}`)
    .join('\n')}

`;
        }

        summary += `
=================================================================
🎯 RECOMMENDATIONS
=================================================================

`;

        if (result.success) {
            summary += `✅ All files processed successfully
• Files are ready for AI analysis
• Consider creating a backup before major changes
• Review file content for accuracy
`;
        } else {
            summary += `⚠️  Some operations failed
• Review error messages above
• Check file permissions and disk space
• Consider retrying failed operations
• Verify output directory accessibility
`;
        }

        return summary;
    }

    /**
     * Get file manager instance for direct access
     */
    getFileManager(): EnhancedFileManager {
        return this.fileManager;
    }

    /**
     * Monitor file changes for active batches
     */
    monitorBatchFiles(
        batchId: string,
        callback: (type: OutputType, path: string, change: 'created' | 'modified' | 'deleted') => void
    ): vscode.Disposable {
        const batch = this.activeBatches.get(batchId);
        if (!batch) {
            throw new Error(`Batch ${batchId} not found`);
        }

        return this.fileManager.watchOutputFiles((event) => {
            // Only notify about files in this batch
            const batchTypes = batch.files.map(f => f.type);
            if (batchTypes.includes(event.file)) {
                callback(event.file, event.path, event.type);
            }
        });
    }

    /**
     * Get status of all active batches
     */
    getActiveBatches(): Map<string, FileBatch> {
        return new Map(this.activeBatches);
    }

    /**
     * Get specific batch by ID
     */
    getBatch(batchId: string): FileBatch | undefined {
        return this.activeBatches.get(batchId);
    }

    /**
     * Clean up completed batches
     */
    cleanupCompletedBatches(maxAge: number = 60 * 60 * 1000): void {
        const now = Date.now();
        for (const [batchId, batch] of this.activeBatches) {
            const age = now - batch.timestamp.getTime();
            if (age > maxAge) {
                this.activeBatches.delete(batchId);
            }
        }
    }

    /**
     * Validate content based on file type
     */
    private isContentValid(type: OutputType, content: string): boolean {
        switch (type) {
            case 'jest-output':
                return content.includes('Test') || content.includes('PASS') || 
                       content.includes('FAIL') || content.includes('SKIP');
            
            case 'diff':
                return content.trim() === '' || content.includes('diff --git') || 
                       content.includes('@@') || content.includes('No changes detected');
            
            case 'ai-debug-context':
                return content.includes('AI DEBUG CONTEXT') || content.length > 100;
            
            case 'pr-description':
                return content.includes('PR DESCRIPTION') || content.includes('Problem') ||
                       content.includes('Solution');
            
            default:
                return content.length > 0;
        }
    }
}