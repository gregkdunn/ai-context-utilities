import { FileBatchManager, BatchOperationResult } from '../fileBatchManager';
import { OutputType } from '../../types';
import { EnhancedFileManager } from '../enhancedFileManager';

// Mock the EnhancedFileManager
jest.mock('../enhancedFileManager');

// Mock vscode module
jest.mock('vscode', () => ({
    window: {
        showInformationMessage: jest.fn(),
        showWarningMessage: jest.fn()
    },
    workspace: {
        getConfiguration: jest.fn(() => ({
            get: jest.fn()
        }))
    }
}));

describe('FileBatchManager', () => {
    let batchManager: FileBatchManager;
    let mockFileManager: jest.Mocked<EnhancedFileManager>;

    beforeEach(() => {
        jest.clearAllMocks();
        
        // Create a properly mocked EnhancedFileManager
        mockFileManager = {
            ensureOutputDirectory: jest.fn(),
            saveOutput: jest.fn(),
            saveOutputWithVersioning: jest.fn(),
            getFilePath: jest.fn(),
            fileExists: jest.fn(),
            getFileContent: jest.fn(),
            getFileStats: jest.fn(),
            createBackup: jest.fn(),
            getAllFileMetadata: jest.fn(),
            getFileHistory: jest.fn(),
            createFileBatch: jest.fn(),
            watchOutputFiles: jest.fn(),
            getOutputDirectory: jest.fn()
        } as any;

        batchManager = new FileBatchManager();
        
        // Replace the internal file manager with our mock
        (batchManager as any).fileManager = mockFileManager;
    });

    describe('executeBatch', () => {
        it('should successfully process all files', async () => {
            const files = [
                { type: 'jest-output' as OutputType, content: 'test output' },
                { type: 'diff' as OutputType, content: 'diff content' }
            ];

            mockFileManager.saveOutput.mockResolvedValue('/test/path/jest-output.txt');
            mockFileManager.createFileBatch.mockResolvedValue({
                id: 'test-batch-123',
                timestamp: new Date(),
                files: [],
                command: 'test',
                success: true
            });

            const result = await batchManager.executeBatch('testCommand', files, {
                notifyUser: true,
                trackHistory: true
            });

            expect(result.success).toBe(true);
            expect(result.filesProcessed).toBe(2);
            expect(result.errors).toHaveLength(0);
            expect(mockFileManager.saveOutput).toHaveBeenCalledTimes(2);
        });

        it('should create backup when requested', async () => {
            const files = [
                { type: 'jest-output' as OutputType, content: 'test output' }
            ];

            mockFileManager.createBackup.mockResolvedValue('/backup/path');
            mockFileManager.saveOutput.mockResolvedValue('/test/path/jest-output.txt');

            await batchManager.executeBatch('testCommand', files, {
                createBackup: true
            });

            expect(mockFileManager.createBackup).toHaveBeenCalledWith('testCommand-auto');
        });

        it('should validate content when requested', async () => {
            const files = [
                { type: 'jest-output' as OutputType, content: 'PASS test content' }
            ];

            mockFileManager.saveOutputWithVersioning.mockResolvedValue('/test/path/jest-output.txt');

            await batchManager.executeBatch('testCommand', files, {
                validateContent: true
            });

            expect(mockFileManager.saveOutputWithVersioning).toHaveBeenCalledWith(
                'jest-output',
                'PASS test content',
                { validate: true }
            );
        });

        it('should retry failed operations', async () => {
            const files = [
                { type: 'jest-output' as OutputType, content: 'test output' }
            ];

            mockFileManager.saveOutput
                .mockRejectedValueOnce(new Error('First attempt failed'))
                .mockResolvedValueOnce('/test/path/jest-output.txt');

            const result = await batchManager.executeBatch('testCommand', files, {
                maxRetries: 1
            });

            expect(result.success).toBe(true);
            expect(result.filesProcessed).toBe(1);
            expect(mockFileManager.saveOutput).toHaveBeenCalledTimes(2);
        });

        it('should handle permanent failures after retries', async () => {
            const files = [
                { type: 'jest-output' as OutputType, content: 'test output' }
            ];

            mockFileManager.saveOutput.mockRejectedValue(new Error('Persistent failure'));

            const result = await batchManager.executeBatch('testCommand', files, {
                maxRetries: 2
            });

            expect(result.success).toBe(false);
            expect(result.filesProcessed).toBe(0);
            expect(result.errors).toHaveLength(1);
            expect(result.errors[0]).toContain('Failed to save jest-output');
            expect(mockFileManager.saveOutput).toHaveBeenCalledTimes(3); // Initial + 2 retries
        });

        it('should show user notifications when requested', async () => {
            const vscode = require('vscode');
            const files = [
                { type: 'jest-output' as OutputType, content: 'test output' }
            ];

            mockFileManager.saveOutput.mockResolvedValue('/test/path/jest-output.txt');

            await batchManager.executeBatch('testCommand', files, {
                notifyUser: true
            });

            expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
                'testCommand: Successfully processed 1 files'
            );
        });

        it('should show warning for partial failures', async () => {
            const vscode = require('vscode');
            const files = [
                { type: 'jest-output' as OutputType, content: 'test output' },
                { type: 'diff' as OutputType, content: 'diff content' }
            ];

            mockFileManager.saveOutput
                .mockResolvedValueOnce('/test/path/jest-output.txt')
                .mockRejectedValueOnce(new Error('Save failed'));

            await batchManager.executeBatch('testCommand', files, {
                notifyUser: true,
                maxRetries: 0
            });

            expect(vscode.window.showWarningMessage).toHaveBeenCalledWith(
                'testCommand: Processed 1 files with 1 errors'
            );
        });
    });

    describe('prepareCommandOutputs', () => {
        it('should prepare output paths for all types', async () => {
            const types: OutputType[] = ['jest-output', 'diff'];
            
            mockFileManager.ensureOutputDirectory.mockImplementation(() => {});
            mockFileManager.getFilePath.mockImplementation((type) => `/test/path/${type}.txt`);

            const result = await batchManager.prepareCommandOutputs('testCommand', types);

            expect(result).toEqual({
                'jest-output': '/test/path/jest-output.txt',
                'diff': '/test/path/diff.txt'
            });
            expect(mockFileManager.ensureOutputDirectory).toHaveBeenCalled();
        });
    });

    describe('validateCommandOutputs', () => {
        it('should validate all files correctly', async () => {
            const types: OutputType[] = ['jest-output', 'diff', 'ai-debug-context'];

            mockFileManager.fileExists.mockImplementation((type) => type !== 'diff');
            mockFileManager.getFileContent.mockImplementation(async (type) => {
                switch (type) {
                    case 'jest-output':
                        return 'PASS test content';
                    case 'ai-debug-context':
                        return 'short'; // Too short for valid AI context
                    default:
                        return null;
                }
            });

            const result = await batchManager.validateCommandOutputs('testCommand', types);

            expect(result.valid).toEqual(['jest-output']);
            expect(result.missing).toEqual(['diff']);
            expect(result.corrupt).toEqual(['ai-debug-context']);
        });

        it('should handle file read errors', async () => {
            const types: OutputType[] = ['jest-output'];

            mockFileManager.fileExists.mockReturnValue(true);
            mockFileManager.getFileContent.mockRejectedValue(new Error('Read error'));

            const result = await batchManager.validateCommandOutputs('testCommand', types);

            expect(result.corrupt).toEqual(['jest-output']);
        });
    });

    describe('createOperationSummary', () => {
        it('should create comprehensive operation summary', async () => {
            const batchResult: BatchOperationResult = {
                success: true,
                batchId: 'test-batch-123',
                filesProcessed: 2,
                errors: [],
                duration: 1500,
                outputPaths: {
                    'jest-output': '/test/jest-output.txt',
                    'diff': '/test/diff.txt'
                } as Record<OutputType, string>
            };

            mockFileManager.getFileStats.mockResolvedValue({
                size: '5KB',
                lines: 100
            });

            const summary = await batchManager.createOperationSummary(
                'testCommand',
                batchResult,
                { project: 'test-project' }
            );

            expect(summary).toContain('FILE OPERATION SUMMARY - TESTCOMMAND');
            expect(summary).toContain('Duration: 1500ms');
            expect(summary).toContain('Success: Yes');
            expect(summary).toContain('Files Processed: 2');
            expect(summary).toContain('jest-output: 5KB (100 lines)');
            expect(summary).toContain('project: "test-project"');
            expect(summary).toContain('All files processed successfully');
        });

        it('should include error details in summary', async () => {
            const batchResult: BatchOperationResult = {
                success: false,
                batchId: 'test-batch-123',
                filesProcessed: 1,
                errors: ['Failed to save file', 'Permission denied'],
                duration: 500,
                outputPaths: {} as Record<OutputType, string>
            };

            const summary = await batchManager.createOperationSummary('testCommand', batchResult);

            expect(summary).toContain('Success: No');
            expect(summary).toContain('Errors: 2');
            expect(summary).toContain('ERRORS ENCOUNTERED');
            expect(summary).toContain('1. Failed to save file');
            expect(summary).toContain('2. Permission denied');
            expect(summary).toContain('Some operations failed');
        });
    });

    describe('monitorBatchFiles', () => {
        it('should monitor files for specific batch', () => {
            const mockBatch = {
                id: 'test-batch-123',
                timestamp: new Date(),
                files: [
                    { type: 'jest-output' as OutputType, path: '/test/jest.txt', exists: true }
                ],
                command: 'test',
                success: true
            };

            // Set up active batch
            const activeBatches = (batchManager as any).activeBatches;
            activeBatches.set('test-batch-123', mockBatch);

            const callback = jest.fn();
            const mockDisposable = { dispose: jest.fn() };
            
            mockFileManager.watchOutputFiles.mockImplementation((eventCallback) => {
                // Simulate file event
                eventCallback({
                    type: 'modified',
                    file: 'jest-output',
                    path: '/test/jest.txt',
                    timestamp: new Date()
                });
                return mockDisposable;
            });

            const disposable = batchManager.monitorBatchFiles('test-batch-123', callback);

            expect(callback).toHaveBeenCalledWith('jest-output', '/test/jest.txt', 'modified');
            expect(disposable).toBe(mockDisposable);
        });

        it('should throw error for non-existent batch', () => {
            expect(() => {
                batchManager.monitorBatchFiles('non-existent', jest.fn());
            }).toThrow('Batch non-existent not found');
        });
    });

    describe('batch management', () => {
        it('should track active batches', async () => {
            const mockBatch = {
                id: 'test-batch-123',
                timestamp: new Date(),
                files: [],
                command: 'test',
                success: true
            };

            mockFileManager.createFileBatch.mockResolvedValue(mockBatch);
            mockFileManager.saveOutput.mockResolvedValue('/test/path.txt');

            const result = await batchManager.executeBatch('testCommand', [
                { type: 'jest-output', content: 'test' }
            ], { trackHistory: true });

            const activeBatches = batchManager.getActiveBatches();
            expect(activeBatches.size).toBe(1);
            
            // The batch ID is generated as command-timestamp, so we need to use the result's batchId
            const batch = batchManager.getBatch(result.batchId);
            expect(batch).toEqual(mockBatch);
        });

        it('should cleanup completed batches', () => {
            const oldBatch = {
                id: 'old-batch',
                timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
                files: [],
                command: 'old',
                success: true
            };

            const recentBatch = {
                id: 'recent-batch',
                timestamp: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
                files: [],
                command: 'recent',
                success: true
            };

            // Set up batches
            const activeBatches = (batchManager as any).activeBatches;
            activeBatches.set('old-batch', oldBatch);
            activeBatches.set('recent-batch', recentBatch);

            // Cleanup batches older than 1 hour
            batchManager.cleanupCompletedBatches(60 * 60 * 1000);

            expect(batchManager.getBatch('old-batch')).toBeUndefined();
            expect(batchManager.getBatch('recent-batch')).toEqual(recentBatch);
        });
    });

    describe('content validation', () => {
        it('should validate jest output content', () => {
            const isContentValid = (batchManager as any).isContentValid;

            expect(isContentValid('jest-output', 'PASS test case')).toBe(true);
            expect(isContentValid('jest-output', 'FAIL test case')).toBe(true);
            expect(isContentValid('jest-output', 'Test Suites: 1 passed')).toBe(true);
            expect(isContentValid('jest-output', 'SKIP test case')).toBe(true);
            expect(isContentValid('jest-output', 'invalid content')).toBe(false);
        });

        it('should validate diff content', () => {
            const isContentValid = (batchManager as any).isContentValid;

            expect(isContentValid('diff', 'diff --git a/file.js b/file.js')).toBe(true);
            expect(isContentValid('diff', '@@ -1,3 +1,4 @@')).toBe(true);
            expect(isContentValid('diff', 'No changes detected')).toBe(true);
            expect(isContentValid('diff', '')).toBe(true); // Empty diff is valid
            expect(isContentValid('diff', 'invalid diff content')).toBe(false);
        });

        it('should validate AI debug context', () => {
            const isContentValid = (batchManager as any).isContentValid;

            expect(isContentValid('ai-debug-context', 'AI DEBUG CONTEXT content here')).toBe(true);
            expect(isContentValid('ai-debug-context', 'A'.repeat(150))).toBe(true); // Long enough
            expect(isContentValid('ai-debug-context', 'short')).toBe(false); // Too short
        });

        it('should validate PR description content', () => {
            const isContentValid = (batchManager as any).isContentValid;

            expect(isContentValid('pr-description', 'PR DESCRIPTION content')).toBe(true);
            expect(isContentValid('pr-description', 'Problem: issue here')).toBe(true);
            expect(isContentValid('pr-description', 'Solution: fix here')).toBe(true);
            expect(isContentValid('pr-description', 'invalid content')).toBe(false);
        });

        it('should validate unknown types by checking non-empty content', () => {
            const isContentValid = (batchManager as any).isContentValid;

            expect(isContentValid('unknown-type' as OutputType, 'some content')).toBe(true);
            expect(isContentValid('unknown-type' as OutputType, '')).toBe(false);
        });
    });

    describe('getFileManager', () => {
        it('should return the file manager instance', () => {
            const fileManager = batchManager.getFileManager();
            expect(fileManager).toBe(mockFileManager);
        });
    });
});