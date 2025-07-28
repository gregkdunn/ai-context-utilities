/**
 * Unit tests for TestResultCache
 * Tests caching functionality and glob pattern handling
 */

import { TestResultCache } from '../TestResultCache';
import * as fs from 'fs';
import * as path from 'path';

// Mock dependencies
jest.mock('fs', () => ({
    promises: {
        readFile: jest.fn(),
        writeFile: jest.fn(),
        stat: jest.fn(),
        mkdir: jest.fn()
    }
}));

describe('TestResultCache', () => {
    let cache: TestResultCache;
    const mockWorkspaceRoot = '/test/workspace';

    beforeEach(() => {
        cache = new TestResultCache(mockWorkspaceRoot);
        jest.clearAllMocks();
    });

    describe('Glob Pattern Handling', () => {
        test('should skip glob patterns when hashing files', async () => {
            const files = [
                'actual-file.ts',
                '**/*.ts',
                'another-file.js', 
                '**/*.js',
                'libs/*/src/**/*.ts'
            ];

            (fs.promises.stat as jest.Mock).mockResolvedValue({ isFile: () => true });
            (fs.promises.readFile as jest.Mock).mockResolvedValue('file content');

            const result = await (cache as any).getFileHashes(files);

            // Should only try to read actual files, not glob patterns
            expect(fs.promises.readFile).toHaveBeenCalledTimes(2);
            expect(fs.promises.readFile).toHaveBeenCalledWith('/test/workspace/actual-file.ts', 'utf8');
            expect(fs.promises.readFile).toHaveBeenCalledWith('/test/workspace/another-file.js', 'utf8');
            
            // Should not try to read glob patterns
            expect(fs.promises.readFile).not.toHaveBeenCalledWith(expect.stringContaining('**'), 'utf8');
        });

        test('should handle file existence check before reading', async () => {
            const files = ['existing-file.ts', 'missing-file.ts'];

            (fs.promises.stat as jest.Mock)
                .mockResolvedValueOnce({ isFile: () => true })  // existing file
                .mockRejectedValueOnce(new Error('ENOENT'));    // missing file

            (fs.promises.readFile as jest.Mock).mockResolvedValue('content');

            const result = await (cache as any).getFileHashes(files);

            // Should only read the existing file
            expect(fs.promises.readFile).toHaveBeenCalledTimes(1);
            expect(fs.promises.readFile).toHaveBeenCalledWith('/test/workspace/existing-file.ts', 'utf8');
        });

        test('should skip directories when checking files', async () => {
            const files = ['file.ts', 'directory'];

            (fs.promises.stat as jest.Mock)
                .mockResolvedValueOnce({ isFile: () => true })   // actual file
                .mockResolvedValueOnce({ isFile: () => false }); // directory

            (fs.promises.readFile as jest.Mock).mockResolvedValue('content');

            await (cache as any).getFileHashes(files);

            // Should only read the actual file, not the directory
            expect(fs.promises.readFile).toHaveBeenCalledTimes(1);
            expect(fs.promises.readFile).toHaveBeenCalledWith('/test/workspace/file.ts', 'utf8');
        });

        test('should handle absolute paths correctly', async () => {
            const files = ['/absolute/path/file.ts', 'relative/path/file.ts'];

            (fs.promises.stat as jest.Mock).mockResolvedValue({ isFile: () => true });
            (fs.promises.readFile as jest.Mock).mockResolvedValue('content');

            await (cache as any).getFileHashes(files);

            expect(fs.promises.readFile).toHaveBeenCalledWith('/absolute/path/file.ts', 'utf8');
            expect(fs.promises.readFile).toHaveBeenCalledWith('/test/workspace/relative/path/file.ts', 'utf8');
        });
    });

    describe('Cache Operations', () => {
        test('should cache test results with file hashes', async () => {
            const testResult = {
                success: true,
                project: 'test-project',
                duration: 1.5,
                exitCode: 0,
                stdout: 'test output',
                stderr: '',
                summary: { passed: 1, failed: 0, skipped: 0, total: 1, failures: [] }
            };

            const affectedFiles = ['src/test.ts'];
            const testConfig = { command: 'npm test', mode: 'default', verbose: true };

            (fs.promises.stat as jest.Mock).mockResolvedValue({ isFile: () => true });
            (fs.promises.readFile as jest.Mock).mockResolvedValue('test file content');

            await cache.cacheResult('test-project', affectedFiles, testConfig, testResult);

            // Should create hash for the affected file
            expect(fs.promises.readFile).toHaveBeenCalledWith('/test/workspace/src/test.ts', 'utf8');
        });

        test('should return null for cache miss', async () => {
            const result = await cache.getCachedResult('nonexistent-project', [], {});
            expect(result).toBeNull();
        });

        test('should invalidate cache when files change', async () => {
            const affectedFiles = ['src/test.ts'];
            const testConfig = { command: 'npm test', mode: 'default', verbose: true };
            const testResult = {
                success: true,
                project: 'test-project',
                duration: 1.5,
                exitCode: 0,
                stdout: 'test output',
                stderr: '',
                summary: { passed: 1, failed: 0, skipped: 0, total: 1, failures: [] }
            };

            (fs.promises.stat as jest.Mock).mockResolvedValue({ isFile: () => true });
            
            // First cache the result
            (fs.promises.readFile as jest.Mock).mockResolvedValue('original content');
            await cache.cacheResult('test-project', affectedFiles, testConfig, testResult);

            // Then check with changed file content
            (fs.promises.readFile as jest.Mock).mockResolvedValue('changed content');
            const cachedResult = await cache.getCachedResult('test-project', affectedFiles, testConfig);

            // Should return null because file content changed
            expect(cachedResult).toBeNull();
        });
    });
});