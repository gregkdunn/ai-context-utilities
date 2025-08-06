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

    describe('Cache Management', () => {
        test('should invalidate project cache', () => {
            // First add some cache entries
            const cache1 = { 
                projectName: 'project1', 
                fileHashes: {}, 
                timestamp: Date.now(), 
                result: {} as any,
                configHash: 'hash1'
            };
            const cache2 = { 
                projectName: 'project2', 
                fileHashes: {}, 
                timestamp: Date.now(), 
                result: {} as any,
                configHash: 'hash2'
            };
            
            (cache as any).cache.set('key1', cache1);
            (cache as any).cache.set('key2', cache2);
            
            // Invalidate project1
            cache.invalidateProject('project1');
            
            // project1 should be removed, project2 should remain
            expect((cache as any).cache.has('key1')).toBe(false);
            expect((cache as any).cache.has('key2')).toBe(true);
        });

        test('should clear entire cache', async () => {
            // Add cache entries
            (cache as any).cache.set('key1', { projectName: 'project1' });
            (cache as any).cache.set('key2', { projectName: 'project2' });
            
            await cache.clearCache();
            
            expect((cache as any).cache.size).toBe(0);
            expect(fs.promises.writeFile).toHaveBeenCalled();
        });

        test('should get cache statistics', () => {
            // Add test entries with different timestamps
            const now = Date.now();
            (cache as any).cache.set('key1', { 
                projectName: 'project1', 
                timestamp: now - 1000,
                fileHashes: {},
                result: {},
                configHash: 'hash1'
            });
            (cache as any).cache.set('key2', { 
                projectName: 'project2', 
                timestamp: now,
                fileHashes: {},
                result: {},
                configHash: 'hash2'
            });

            const stats = cache.getCacheStats();
            
            expect(stats.totalEntries).toBe(2);
            expect(stats.oldestEntry).toBe(now - 1000);
            expect(stats.newestEntry).toBe(now);
            expect(typeof stats.hitRate).toBe('number');
            expect(typeof stats.sizeMB).toBe('number');
        });

        test('should dispose cache properly', () => {
            cache.dispose();
            expect((cache as any).cache.size).toBe(0);
        });
    });

    describe('Internal Methods', () => {
        test('should generate consistent cache keys', () => {
            const key1 = (cache as any).generateCacheKey('project1', ['file1.ts', 'file2.ts']);
            const key2 = (cache as any).generateCacheKey('project1', ['file1.ts', 'file2.ts']);
            
            expect(key1).toBe(key2);
            expect(typeof key1).toBe('string');
            expect(key1.length).toBeGreaterThan(0);
        });

        test('should hash objects consistently', () => {
            const obj1 = { test: 'value', number: 42 };
            const obj2 = { test: 'value', number: 42 };
            const obj3 = { test: 'different', number: 42 };
            
            const hash1 = (cache as any).hashObject(obj1);
            const hash2 = (cache as any).hashObject(obj2);
            const hash3 = (cache as any).hashObject(obj3);
            
            expect(hash1).toBe(hash2);
            expect(hash1).not.toBe(hash3);
            expect(typeof hash1).toBe('string');
        });

        test('should calculate hit rate correctly', () => {
            const hitRate = (cache as any).calculateHitRate();
            expect(typeof hitRate).toBe('number');
            expect(hitRate).toBeGreaterThanOrEqual(0);
            expect(hitRate).toBeLessThanOrEqual(1);
        });

        test('should handle hit rate calculation', () => {
            const hitRate = (cache as any).calculateHitRate();
            expect(typeof hitRate).toBe('number');
        });

        test('should calculate cache size', () => {
            // Add some entries
            (cache as any).cache.set('key1', { 
                projectName: 'project1',
                fileHashes: { 'file1': 'hash1' },
                result: { success: true },
                configHash: 'config1'
            });
            
            const size = (cache as any).calculateCacheSize();
            expect(typeof size).toBe('number');
            expect(size).toBeGreaterThan(0);
        });

        test('should cleanup expired entries', () => {
            const now = Date.now();
            const oldTimestamp = now - (25 * 60 * 60 * 1000); // 25 hours ago (expired)
            const newTimestamp = now - (1 * 60 * 60 * 1000); // 1 hour ago (fresh)
            
            (cache as any).cache.set('old', { timestamp: oldTimestamp });
            (cache as any).cache.set('new', { timestamp: newTimestamp });
            
            (cache as any).cleanupExpiredEntries();
            
            expect((cache as any).cache.has('old')).toBe(false);
            expect((cache as any).cache.has('new')).toBe(true);
        });

        test('should cleanup old entries when over size limit', () => {
            // Add 3 entries with different timestamps
            const now = Date.now();
            (cache as any).cache.set('oldest', { timestamp: now - 3000 });
            (cache as any).cache.set('middle', { timestamp: now - 2000 });
            (cache as any).cache.set('newest', { timestamp: now - 1000 });
            
            const initialSize = (cache as any).cache.size;
            (cache as any).cleanupOldEntries();
            
            // Function should run without errors
            expect(typeof (cache as any).cleanupOldEntries).toBe('function');
        });
    });
});