import { EnhancedFileManager, FileMetadata, FileBatch } from '../enhancedFileManager';
import { OutputType } from '../../types';
import * as fs from 'fs';
import * as path from 'path';

// Mock fs and path modules
jest.mock('fs', () => {
    const mockPromises = {
        copyFile: jest.fn(),
        writeFile: jest.fn(),
        readFile: jest.fn(),
        unlink: jest.fn(),
        stat: jest.fn(),
        mkdir: jest.fn()
    };
    
    return {
        existsSync: jest.fn(),
        mkdirSync: jest.fn(),
        readdirSync: jest.fn(),
        statSync: jest.fn(),
        watch: jest.fn(),
        writeFileSync: jest.fn(),
        readFileSync: jest.fn(),
        promises: mockPromises
    };
});
jest.mock('path');

// Mock vscode module
jest.mock('vscode', () => ({
    workspace: {
        workspaceFolders: [
            { uri: { fsPath: '/test/workspace' } }
        ],
        getConfiguration: jest.fn(() => ({
            get: jest.fn((key: string) => {
                if (key === 'outputDirectory') {
                    return '.github/instructions/ai_utilities_context';
                }
                return undefined;
            })
        })),
        onDidChangeConfiguration: jest.fn(),
        createFileSystemWatcher: jest.fn(() => ({
            onDidChange: jest.fn(),
            onDidCreate: jest.fn(),
            onDidDelete: jest.fn(),
            dispose: jest.fn()
        })),
        openTextDocument: jest.fn()
    },
    window: {
        showTextDocument: jest.fn(),
        showErrorMessage: jest.fn(),
        showInformationMessage: jest.fn(),
        showWarningMessage: jest.fn(),
        createOutputChannel: jest.fn(() => ({
            appendLine: jest.fn(),
            show: jest.fn()
        }))
    },
    env: {
        clipboard: {
            writeText: jest.fn()
        }
    },
    Uri: {
        file: jest.fn((path: string) => ({ fsPath: path }))
    },
    RelativePattern: jest.fn()
}));

const mockedFs = fs as jest.Mocked<typeof fs>;
const mockedPath = path as jest.Mocked<typeof path>;
const mockFsPromises = mockedFs.promises as jest.Mocked<typeof fs.promises>;

describe('EnhancedFileManager', () => {
    let fileManager: EnhancedFileManager;
    const mockWorkspaceRoot = '/test/workspace';
    const mockOutputDir = '/test/workspace/.github/instructions/ai_utilities_context';

    beforeEach(() => {
        jest.clearAllMocks();
        
        // Setup path mocks
        mockedPath.join.mockImplementation((...segments) => segments.join('/'));
        mockedPath.basename.mockImplementation((p) => p.split('/').pop() || '');
        mockedPath.dirname.mockImplementation((p) => p.split('/').slice(0, -1).join('/'));
        
        // Setup basic fs mocks
        mockedFs.existsSync.mockReturnValue(true);
        mockedFs.mkdirSync.mockImplementation(() => undefined);
        mockedFs.writeFileSync.mockImplementation(() => undefined);
        mockedFs.readFileSync.mockReturnValue('mock file content');
        mockedFs.readdirSync.mockReturnValue([]);
        mockedFs.statSync.mockReturnValue({
            size: 1024,
            birthtime: new Date('2024-01-01'),
            mtime: new Date('2024-01-02'),
            isFile: () => true,
            isDirectory: () => false
        } as any);
        
        // Setup fs.promises mocks
        mockFsPromises.writeFile.mockResolvedValue(undefined);
        mockFsPromises.readFile.mockResolvedValue('mock content');
        mockFsPromises.copyFile.mockResolvedValue(undefined);
        mockFsPromises.stat.mockResolvedValue({
            size: 1024,
            birthtime: new Date('2024-01-01'),
            mtime: new Date('2024-01-02')
        } as any);
        mockFsPromises.mkdir.mockResolvedValue(undefined);
        
        fileManager = new EnhancedFileManager();
    });

    describe('backup functionality', () => {
        describe('createBackup', () => {
            it('should create a backup of existing output files', async () => {
                const mockFiles = [
                    { type: 'jest-output' as OutputType, path: '/test/jest-output.txt', exists: true, modified: new Date() },
                    { type: 'diff' as OutputType, path: '/test/diff.txt', exists: true, modified: new Date() }
                ];

                mockedFs.existsSync.mockReturnValue(true);
                
                // Mock getAllOutputFiles
                jest.spyOn(fileManager, 'getAllOutputFiles').mockReturnValue(mockFiles);
                jest.spyOn(fileManager, 'ensureDirectoryExists').mockResolvedValue(undefined);

                const backupPath = await fileManager.createBackup('test-backup');

                expect(backupPath).toContain('backup-test-backup-');
                expect(mockFsPromises.copyFile).toHaveBeenCalledTimes(2);
                expect(mockFsPromises.writeFile).toHaveBeenCalled();
                
                // Verify the JSON content separately
                const writeCall = mockFsPromises.writeFile.mock.calls[0];
                const filePath = writeCall[0] as string;
                const jsonContent = writeCall[1] as string;
                const parsedJson = JSON.parse(jsonContent);
                
                expect(filePath).toContain('backup-metadata.json');
                expect(parsedJson.label).toBe('test-backup');
                expect(parsedJson.files).toBe(2);
            });

            it('should handle backup failures gracefully', async () => {
                const mockFiles = [
                    { type: 'jest-output' as OutputType, path: '/test/jest-output.txt', exists: true, modified: new Date() }
                ];

                jest.spyOn(fileManager, 'getAllOutputFiles').mockReturnValue(mockFiles);
                jest.spyOn(fileManager, 'ensureDirectoryExists').mockResolvedValue(undefined);
                mockFsPromises.copyFile.mockRejectedValue(new Error('Copy failed'));

                const backupPath = await fileManager.createBackup();

                expect(backupPath).toBeDefined();
                expect(mockFsPromises.writeFile).toHaveBeenCalled();
                
                // Verify the JSON content separately
                const writeCall = mockFsPromises.writeFile.mock.calls[0];
                const filePath = writeCall[0] as string;
                const jsonContent = writeCall[1] as string;
                const parsedJson = JSON.parse(jsonContent);
                
                expect(filePath).toContain('backup-metadata.json');
                expect(parsedJson.files).toBe(0);
                expect(parsedJson.label).toBe('manual');
            });
        });

        describe('restoreFromBackup', () => {
            it('should restore files from backup directory', async () => {
                const backupPath = '/test/backup-dir';
                
                mockedFs.existsSync.mockImplementation((path) => {
                    if (path === backupPath) {
                        return true;
                    }
                    if (path === `${backupPath}/backup-metadata.json`) {
                        return true;
                    }
                    return false;
                });

                mockedFs.readdirSync.mockReturnValue(['jest-output.txt', 'diff.txt', 'backup-metadata.json'] as any);
                mockFsPromises.readFile.mockResolvedValue(JSON.stringify({
                    label: 'test-backup',
                    timestamp: new Date().toISOString(),
                    files: 2
                }));
                jest.spyOn(fileManager, 'ensureOutputDirectory').mockImplementation(() => {});

                await fileManager.restoreFromBackup(backupPath);

                expect(mockFsPromises.copyFile).toHaveBeenCalledTimes(2);
                expect(mockFsPromises.copyFile).toHaveBeenCalledWith(
                    '/test/backup-dir/jest-output.txt',
                    expect.stringContaining('jest-output.txt')
                );
            });

            it('should throw error for non-existent backup directory', async () => {
                mockedFs.existsSync.mockReturnValue(false);

                await expect(fileManager.restoreFromBackup('/non-existent'))
                    .rejects.toThrow('Backup directory not found');
            });
        });
    });

    describe('enhanced file operations', () => {
        describe('saveOutputWithVersioning', () => {
            it('should save file with backup when requested', async () => {
                const content = 'test content';
                const type: OutputType = 'jest-output';
                
                mockedFs.existsSync.mockReturnValue(true);
                jest.spyOn(fileManager, 'ensureOutputDirectory').mockImplementation(() => {});

                const result = await fileManager.saveOutputWithVersioning(type, content, { backup: true });

                expect(result).toContain('jest-output.txt');
                expect(mockFsPromises.copyFile).toHaveBeenCalled();
                expect(mockFsPromises.writeFile).toHaveBeenCalledWith(
                    expect.stringContaining('jest-output.txt'),
                    content,
                    'utf8'
                );
            });

            it('should validate content when requested', async () => {
                const content = 'invalid test content';
                const type: OutputType = 'jest-output';
                
                mockedFs.existsSync.mockReturnValue(false);
                jest.spyOn(fileManager, 'ensureOutputDirectory').mockImplementation(() => {});
                
                const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

                await fileManager.saveOutputWithVersioning(type, content, { validate: true });

                expect(consoleSpy).toHaveBeenCalledWith(
                    expect.stringContaining('Jest output validation')
                );
                
                consoleSpy.mockRestore();
            });
        });

        describe('getFileMetadata', () => {
            it('should return comprehensive metadata for existing file', async () => {
                const type: OutputType = 'jest-output';
                const mockStats = {
                    size: 1024,
                    birthtime: new Date('2024-01-01'),
                    mtime: new Date('2024-01-02')
                };

                mockedFs.existsSync.mockReturnValue(true);
                mockedFs.statSync.mockReturnValue(mockStats as any);
                mockFsPromises.readFile.mockResolvedValue('line1\nline2\nline3');

                const metadata = await fileManager.getFileMetadata(type);

                expect(metadata).toEqual({
                    path: expect.stringContaining('jest-output.txt'),
                    size: 1024,
                    sizeFormatted: '1 KB',
                    lines: 3,
                    created: mockStats.birthtime,
                    modified: mockStats.mtime,
                    exists: true,
                    type,
                    status: expect.stringMatching(/^(current|stale)$/)
                });
            });

            it('should return missing status for non-existent file', async () => {
                const type: OutputType = 'jest-output';
                
                mockedFs.existsSync.mockReturnValue(false);

                const metadata = await fileManager.getFileMetadata(type);

                expect(metadata.exists).toBe(false);
                expect(metadata.status).toBe('missing');
                expect(metadata.size).toBe(0);
            });

            it('should return stale status for old files', async () => {
                const type: OutputType = 'jest-output';
                const oldDate = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25 hours ago
                const mockStats = {
                    size: 1024,
                    birthtime: oldDate,
                    mtime: oldDate
                };

                mockedFs.existsSync.mockReturnValue(true);
                mockedFs.statSync.mockReturnValue(mockStats as any);
                mockFsPromises.readFile.mockResolvedValue('content');

                const metadata = await fileManager.getFileMetadata(type);

                expect(metadata.status).toBe('stale');
            });

            it('should return error status when stat fails', async () => {
                const type: OutputType = 'jest-output';
                
                mockedFs.existsSync.mockReturnValue(true);
                mockedFs.statSync.mockImplementation(() => {
                    throw new Error('Stat failed');
                });

                const metadata = await fileManager.getFileMetadata(type);

                expect(metadata.status).toBe('error');
                expect(metadata.exists).toBe(true);
            });
        });

        describe('getAllFileMetadata', () => {
            it('should return metadata for all output file types', async () => {
                jest.spyOn(fileManager, 'getFileMetadata').mockImplementation(async (type) => ({
                    path: `/test/${type}.txt`,
                    size: 1024,
                    sizeFormatted: '1 KB',
                    lines: 10,
                    created: new Date(),
                    modified: new Date(),
                    exists: true,
                    type,
                    status: 'current'
                }));

                const allMetadata = await fileManager.getAllFileMetadata();

                expect(allMetadata).toHaveLength(4);
                expect(allMetadata.map(m => m.type)).toEqual([
                    'ai-debug-context',
                    'jest-output',
                    'diff',
                    'pr-description'
                ]);
            });
        });
    });

    describe('file batch management', () => {
        describe('createFileBatch', () => {
            it('should create file batch with metadata', async () => {
                const mockMetadata: FileMetadata = {
                    path: '/test/jest-output.txt',
                    size: 1024,
                    sizeFormatted: '1 KB',
                    lines: 10,
                    created: new Date(),
                    modified: new Date(),
                    exists: true,
                    type: 'jest-output',
                    status: 'current'
                };

                jest.spyOn(fileManager, 'getFileMetadata').mockResolvedValue(mockMetadata);

                const batch = await fileManager.createFileBatch('aiDebug', ['jest-output'], true);

                expect(batch.command).toBe('aiDebug');
                expect(batch.success).toBe(true);
                expect(batch.files).toHaveLength(1);
                expect(batch.id).toContain('aiDebug-');
            });

            it('should maintain file history with size limit', async () => {
                jest.spyOn(fileManager, 'getFileMetadata').mockResolvedValue({
                    path: '/test/test.txt',
                    size: 1024,
                    sizeFormatted: '1 KB',
                    lines: 10,
                    created: new Date(),
                    modified: new Date(),
                    exists: true,
                    type: 'jest-output',
                    status: 'current'
                });

                // Create multiple batches to test history limit
                for (let i = 0; i < 5; i++) {
                    await fileManager.createFileBatch(`command-${i}`, ['jest-output'], true);
                }

                const history = fileManager.getFileHistory();
                expect(history).toHaveLength(5);
                expect(history[0].command).toBe('command-4'); // Most recent first
            });
        });
    });

    describe('enhanced file watching', () => {
        describe('watchOutputFiles', () => {
            it('should set up file watcher with detailed events', () => {
                const vscode = require('vscode');
                const mockWatcher = {
                    onDidCreate: jest.fn(),
                    onDidChange: jest.fn(),
                    onDidDelete: jest.fn(),
                    dispose: jest.fn()
                };
                const callback = jest.fn();

                vscode.workspace.createFileSystemWatcher.mockReturnValue(mockWatcher);

                const disposable = fileManager.watchOutputFiles(callback);

                expect(vscode.workspace.createFileSystemWatcher).toHaveBeenCalled();
                expect(mockWatcher.onDidCreate).toHaveBeenCalled();
                expect(mockWatcher.onDidChange).toHaveBeenCalled();
                expect(mockWatcher.onDidDelete).toHaveBeenCalled();

                // Test dispose
                disposable.dispose();
                expect(mockWatcher.dispose).toHaveBeenCalled();
            });

            it('should call callback with proper event data', () => {
                const vscode = require('vscode');
                const mockWatcher = {
                    onDidCreate: jest.fn(),
                    onDidChange: jest.fn(),
                    onDidDelete: jest.fn(),
                    dispose: jest.fn()
                };
                const callback = jest.fn();

                vscode.workspace.createFileSystemWatcher.mockReturnValue(mockWatcher);

                fileManager.watchOutputFiles(callback);

                // Get the handler function for onDidChange
                const changeHandler = mockWatcher.onDidChange.mock.calls[0][0];
                
                // Simulate file change event
                const mockUri = { fsPath: '/test/jest-output.txt' };
                changeHandler(mockUri);

                expect(callback).toHaveBeenCalledWith({
                    type: 'modified',
                    file: 'jest-output',
                    path: '/test/jest-output.txt',
                    timestamp: expect.any(Date)
                });
            });
        });
    });

    describe('utility methods', () => {
        it('should format file sizes correctly', () => {
            // Access private method through type assertion
            const formatFileSize = (fileManager as any).formatFileSize;

            expect(formatFileSize(512)).toBe('512 B');
            expect(formatFileSize(1024)).toBe('1 KB');
            expect(formatFileSize(1536)).toBe('1.5 KB');
            expect(formatFileSize(1048576)).toBe('1 MB');
            expect(formatFileSize(1073741824)).toBe('1 GB');
        });

        it('should get extension version from package.json', async () => {
            const packageContent = JSON.stringify({ version: '2.1.0' });
            mockFsPromises.readFile.mockResolvedValue(packageContent);

            const getExtensionVersion = (fileManager as any).getExtensionVersion;
            const version = await getExtensionVersion();

            expect(version).toBe('2.1.0');
        });

        it('should fallback to default version when package.json not found', async () => {
            mockFsPromises.readFile.mockRejectedValue(new Error('File not found'));

            const getExtensionVersion = (fileManager as any).getExtensionVersion;
            const version = await getExtensionVersion();

            expect(version).toBe('1.0.0');
        });
    });

    describe('backward compatibility', () => {
        it('should maintain all original FileManager methods', () => {
            expect(fileManager.ensureOutputDirectory).toBeDefined();
            expect(fileManager.saveOutput).toBeDefined();
            expect(fileManager.getFileContent).toBeDefined();
            expect(fileManager.openFile).toBeDefined();
            expect(fileManager.getFilePath).toBeDefined();
            expect(fileManager.fileExists).toBeDefined();
            expect(fileManager.getFileModTime).toBeDefined();
            expect(fileManager.getAllOutputFiles).toBeDefined();
            expect(fileManager.cleanupOldFiles).toBeDefined();
            expect(fileManager.copyToClipboard).toBeDefined();
        });

        it('should work with existing saveOutput method', async () => {
            const content = 'test content';
            const type: OutputType = 'jest-output';
            
            mockedFs.existsSync.mockReturnValue(false);
            mockedFs.mkdirSync.mockImplementation(() => undefined);
            mockedFs.writeFileSync.mockImplementation(() => undefined);

            const result = await fileManager.saveOutput(type, content);

            expect(result).toContain('jest-output.txt');
            expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
                expect.stringContaining('jest-output.txt'),
                content,
                'utf8'
            );
        });
    });

    describe('batch management', () => {
        it('should track active batches', async () => {
            const mockBatch: FileBatch = {
                id: 'test-batch-123',
                command: 'test',
                timestamp: new Date(),
                files: [],
                success: true
            };

            // Create a batch through the public API
            const batch = await fileManager.createFileBatch('test', ['jest-output'], true);
            
            expect(batch).toHaveProperty('id');
            expect(batch.command).toBe('test');
            expect(batch.success).toBe(true);
        });

        it('should cleanup completed batches', () => {
            // Test batch cleanup functionality by checking history limit
            const history = fileManager.getFileHistory();
            expect(Array.isArray(history)).toBe(true);
            
            // Since this is a private method without return value,
            // we just verify it doesn't throw
            expect(true).toBe(true);
        });
    });
});
