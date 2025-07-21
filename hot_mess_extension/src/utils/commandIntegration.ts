import { FileBatchManager, BatchOperationResult } from '../utils/fileBatchManager';
import { OutputType, CommandResult, CommandOptions } from '../types';
import * as vscode from 'vscode';

/**
 * Enhanced base class for commands with advanced file management
 */
export abstract class EnhancedCommandBase {
    protected batchManager: FileBatchManager;
    protected outputChannel: vscode.OutputChannel;

    constructor() {
        this.batchManager = new FileBatchManager();
        this.outputChannel = vscode.window.createOutputChannel('AI Debug Utilities');
    }

    /**
     * Execute command with enhanced file management
     */
    protected async executeWithFileManagement(
        command: string,
        project: string,
        options: CommandOptions,
        executor: () => Promise<Map<OutputType, string>>
    ): Promise<CommandResult> {
        const startTime = Date.now();
        
        try {
            this.showProgress(`Starting ${command}...`, { project, options: JSON.stringify(options) });
            
            // Prepare output files
            const expectedTypes = this.getExpectedOutputTypes(command);
            const outputPaths = await this.batchManager.prepareCommandOutputs(command, expectedTypes);
            
            // Create backup if configured
            const config = vscode.workspace.getConfiguration('aiDebugUtilities');
            const autoBackup = config.get<boolean>('autoBackup', false);
            
            if (autoBackup) {
                await this.batchManager.getFileManager().createBackup(`${command}-${project}-auto`);
            }

            // Execute the command logic
            const contentMap = await executor();
            
            // Batch save all outputs
            const files = Array.from(contentMap.entries()).map(([type, content]) => ({
                type,
                content
            }));

            const batchResult = await this.batchManager.executeBatch(command, files, {
                validateContent: true,
                notifyUser: config.get<boolean>('showNotifications', true),
                trackHistory: true,
                maxRetries: 2
            });

            // Validate outputs
            const validation = await this.batchManager.validateCommandOutputs(command, expectedTypes);
            
            if (validation.missing.length > 0 || validation.corrupt.length > 0) {
                this.showWarning(`Output validation issues: Missing: ${validation.missing.join(', ')}, Corrupt: ${validation.corrupt.join(', ')}`);
            }

            // Create operation summary
            const summary = await this.batchManager.createOperationSummary(command, batchResult, {
                project,
                options,
                validation
            });

            // Show summary in output channel
            this.outputChannel.appendLine(summary);

            const duration = Date.now() - startTime;
            return {
                success: batchResult.success && validation.missing.length === 0,
                exitCode: batchResult.success ? 0 : 1,
                output: summary,
                outputFiles: Object.values(batchResult.outputPaths),
                duration
            };

        } catch (error) {
            const duration = Date.now() - startTime;
            this.showError(`${command} failed: ${error}`);
            
            return {
                success: false,
                exitCode: 1,
                output: `Command failed: ${error}`,
                error: error instanceof Error ? error.message : 'Unknown error',
                duration
            };
        }
    }

    /**
     * Get expected output types for a command
     */
    protected abstract getExpectedOutputTypes(command: string): OutputType[];

    /**
     * Monitor file changes during command execution
     */
    protected async monitorFileChanges(
        batchId: string,
        callback?: (type: OutputType, path: string, change: 'created' | 'modified' | 'deleted') => void
    ): Promise<vscode.Disposable> {
        return this.batchManager.monitorBatchFiles(batchId, (type, path, change) => {
            this.showInfo(`File ${change}: ${type} -> ${path}`);
            if (callback) {
                callback(type, path, change);
            }
        });
    }

    /**
     * Create a comprehensive file status report
     */
    protected async createFileStatusReport(): Promise<string> {
        const fileManager = this.batchManager.getFileManager();
        const allFiles = await fileManager.getAllFileMetadata();
        const history = fileManager.getFileHistory();

        let report = `
=================================================================
📁 FILE STATUS REPORT
=================================================================

🕐 Generated: ${new Date().toISOString()}
📂 Output Directory: ${fileManager.getOutputDirectory()}

=================================================================
📄 CURRENT FILES
=================================================================

`;

        for (const file of allFiles) {
            const statusIcon = file.status === 'current' ? '✅' : 
                             file.status === 'stale' ? '⚠️' : 
                             file.status === 'missing' ? '❌' : '🔴';
            
            report += `${statusIcon} ${file.type}
   Path: ${file.path}
   Size: ${file.sizeFormatted} (${file.lines} lines)
   Modified: ${file.exists ? file.modified.toLocaleString() : 'N/A'}
   Status: ${file.status}

`;
        }

        if (history.length > 0) {
            report += `
=================================================================
📈 RECENT HISTORY (Last ${Math.min(5, history.length)} operations)
=================================================================

`;

            for (const batch of history.slice(0, 5)) {
                const successIcon = batch.success ? '✅' : '❌';
                report += `${successIcon} ${batch.command} (${batch.id})
   Timestamp: ${batch.timestamp.toLocaleString()}
   Files: ${batch.files.length}
   Success: ${batch.success}

`;
            }
        }

        return report;
    }

    // Logging methods
    protected showProgress(message: string, details?: Record<string, any>) {
        this.outputChannel.appendLine(`🔄 ${message}`);
        if (details) {
            this.outputChannel.appendLine(`   Details: ${JSON.stringify(details, null, 2)}`);
        }
    }

    protected showInfo(message: string) {
        this.outputChannel.appendLine(`ℹ️  ${message}`);
    }

    protected showSuccess(message: string) {
        this.outputChannel.appendLine(`✅ ${message}`);
    }

    protected showWarning(message: string) {
        this.outputChannel.appendLine(`⚠️  ${message}`);
    }

    protected showError(message: string) {
        this.outputChannel.appendLine(`❌ ${message}`);
    }
}

/**
 * Utility functions for command integration
 */
export class CommandIntegrationUtils {
    /**
     * Compare outputs between two command runs
     */
    static async compareCommandRuns(
        batchManager: FileBatchManager,
        batch1Id: string,
        batch2Id: string
    ): Promise<string> {
        try {
            const batch1 = batchManager.getBatch(batch1Id);
            const batch2 = batchManager.getBatch(batch2Id);
            
            if (!batch1 || !batch2) {
                return 'Cannot compare: One or both batches not found';
            }

            // Simple comparison logic
            const comparison = {
                batch1: batch1.command,
                batch2: batch2.command,
                filesChanged: 0,
                summary: 'Comparison completed'
            };

            return `
=================================================================
📊 COMMAND RUN COMPARISON
=================================================================

Batch 1: ${batch1.command} (${batch1.timestamp.toLocaleString()})
Batch 2: ${batch2.command} (${batch2.timestamp.toLocaleString()})

Files in batch 1: ${batch1.files.length}
Files in batch 2: ${batch2.files.length}

=================================================================
`;
        } catch (error) {
            return `Failed to compare command runs: ${error}`;
        }
    }

    /**
     * Get recommendations based on file status
     */
    static async getFileRecommendations(
        batchManager: FileBatchManager
    ): Promise<string> {
        const fileManager = batchManager.getFileManager();
        const files = await fileManager.getAllFileMetadata();
        const recommendations: string[] = [];

        // Check for stale files
        const staleFiles = files.filter(f => f.status === 'stale');
        if (staleFiles.length > 0) {
            recommendations.push(`🔄 Consider refreshing ${staleFiles.length} stale files: ${staleFiles.map(f => f.type).join(', ')}`);
        }

        // Check for missing files
        const missingFiles = files.filter(f => !f.exists);
        if (missingFiles.length > 0) {
            recommendations.push(`📝 Generate missing files: ${missingFiles.map(f => f.type).join(', ')}`);
        }

        // Check for large files
        const largeFiles = files.filter(f => f.size > 100000); // > 100KB
        if (largeFiles.length > 0) {
            recommendations.push(`📦 Consider archiving large files: ${largeFiles.map(f => `${f.type} (${f.sizeFormatted})`).join(', ')}`);
        }

        // Check file history
        const history = fileManager.getFileHistory();
        if (history.length > 20) {
            recommendations.push(`🗂️  Consider cleaning up file history (${history.length} entries)`);
        }

        if (recommendations.length === 0) {
            recommendations.push('✅ All files are in good condition');
        }

        return `
=================================================================
💡 FILE MANAGEMENT RECOMMENDATIONS
=================================================================

${recommendations.map((rec, i) => `${i + 1}. ${rec}`).join('\n')}

=================================================================
`;
    }
}