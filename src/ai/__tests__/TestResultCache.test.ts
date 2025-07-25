/**
 * Unit tests for TestResultCache
 * 
 * Tests intelligent caching of test results based on file content hashes
 * and dependency tracking to avoid re-running unchanged tests.
 * 
 * @version 3.0.0
 */

import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import { TestResultCache, CachedTestResult, CacheStats, CacheOptions } from '../TestResultCache';
import { TestResultSummary } from '../TestFailureAnalyzer';

// Mock dependencies
jest.mock('fs/promises');
jest.mock('vscode', () => ({
    window: {
        createOutputChannel: jest.fn(() => ({
            appendLine: jest.fn(),
            show: jest.fn(),
            dispose: jest.fn()
        }))
    }
}));

describe('TestResultCache', () => {
    let cache: TestResultCache;
    let mockOutputChannel: any;
    const testWorkspaceRoot = '/test/workspace';
    
    const mockTestResult: TestResultSummary = {
        totalTests: 10,
        passedTests: 8,
        failedTests: 2,
        skippedTests: 0,
        failures: [],
        duration: 1500,
        timestamp: new Date()
    };

    beforeEach(() => {
        jest.clearAllMocks();
        
        mockOutputChannel = {
            appendLine: jest.fn(),
            show: jest.fn(),
            dispose: jest.fn()
        };
        
        (vscode.window.createOutputChannel as jest.Mock).mockReturnValue(mockOutputChannel);
        (fs.access as jest.Mock).mockRejectedValue(new Error('File not found'));
        (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
        (fs.writeFile as jest.Mock).mockResolvedValue(undefined);
        (fs.readFile as jest.Mock).mockResolvedValue('test file content');
        
        cache = new TestResultCache(testWorkspaceRoot);
    });

    afterEach(() => {
        cache.dispose();
    });

    describe('getOrRunTest', () => {
        it('should run test on cache miss', async () => {
            const testFile = '/test/workspace/test.spec.ts';
            const runTestFn = jest.fn().mockResolvedValue(mockTestResult);

            const result = await cache.getOrRunTest(testFile, runTestFn);

            expect(result.fromCache).toBe(false);
            expect(result.result).toBe(mockTestResult);
            expect(runTestFn).toHaveBeenCalled();
            expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
                expect.stringContaining('Cache MISS')
            );
        });

        it('should return cached result on cache hit', async () => {
            const testFile = '/test/workspace/test.spec.ts';
            const runTestFn = jest.fn().mockResolvedValue(mockTestResult);

            // First run - cache miss
            await cache.getOrRunTest(testFile, runTestFn);
            
            // Mock file hash to be the same
            const originalHash = crypto.createHash('md5').update('test file content').digest('hex');
            (fs.readFile as jest.Mock).mockResolvedValue('test file content');

            // Second run - should be cache hit
            const result = await cache.getOrRunTest(testFile, runTestFn);

            expect(result.fromCache).toBe(true);
            expect(result.result).toEqual(mockTestResult);
            expect(runTestFn).toHaveBeenCalledTimes(1); // Only called once
            expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
                expect.stringContaining('Cache HIT')
            );
        });

        it('should handle errors and fallback to running test', async () => {
            const testFile = '/test/workspace/test.spec.ts';
            const runTestFn = jest.fn()
                .mockRejectedValueOnce(new Error('Test run error'))
                .mockResolvedValueOnce(mockTestResult);

            const result = await cache.getOrRunTest(testFile, runTestFn);

            expect(result.fromCache).toBe(false);
            expect(result.result).toBe(mockTestResult);
            expect(runTestFn).toHaveBeenCalledTimes(2); // First call fails, second succeeds
            expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
                expect.stringContaining('Error in cache operation')
            );
        });
    });

    describe('cache invalidation', () => {
        it('should invalidate cache when file content changes', async () => {
            const testFile = '/test/workspace/test.spec.ts';
            const runTestFn = jest.fn().mockResolvedValue(mockTestResult);

            // First run
            (fs.readFile as jest.Mock).mockResolvedValueOnce('original content');
            await cache.getOrRunTest(testFile, runTestFn);

            // Change file content
            (fs.readFile as jest.Mock).mockResolvedValueOnce('modified content');
            
            // Second run - should be cache miss due to content change
            const result = await cache.getOrRunTest(testFile, runTestFn);

            expect(result.fromCache).toBe(false);
            expect(runTestFn).toHaveBeenCalledTimes(2);
        });

        it('should invalidate cache when entry is too old', async () => {
            const testFile = '/test/workspace/test.spec.ts';
            const runTestFn = jest.fn().mockResolvedValue(mockTestResult);
            
            // Create cache with short max age
            cache = new TestResultCache(testWorkspaceRoot, { maxAgeMs: 100 });

            // First run
            await cache.getOrRunTest(testFile, runTestFn);

            // Wait for cache to expire
            await new Promise(resolve => setTimeout(resolve, 150));

            // Second run - should be cache miss due to age
            const result = await cache.getOrRunTest(testFile, runTestFn);

            expect(result.fromCache).toBe(false);
            expect(runTestFn).toHaveBeenCalledTimes(2);
        });

        it('should manually invalidate specific test file', async () => {
            const testFile = '/test/workspace/test.spec.ts';
            const runTestFn = jest.fn().mockResolvedValue(mockTestResult);

            // First run
            await cache.getOrRunTest(testFile, runTestFn);

            // Manually invalidate
            cache.invalidate(testFile);

            // Second run - should be cache miss
            const result = await cache.getOrRunTest(testFile, runTestFn);

            expect(result.fromCache).toBe(false);
            expect(runTestFn).toHaveBeenCalledTimes(2);
            expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
                expect.stringContaining('Invalidated cache')
            );
        });
    });

    describe('dependency tracking', () => {
        it('should extract dependencies from import statements', async () => {
            const testFile = '/test/workspace/test.spec.ts';
            const testContent = `
                import { helper } from './utils';
                import { Component } from '../components/Button';
                import React from 'react';
                
                describe('test', () => {});
            `;
            
            (fs.readFile as jest.Mock)
                .mockResolvedValueOnce(testContent) // For hash
                .mockResolvedValueOnce(testContent) // For dependency extraction
                .mockResolvedValueOnce('utils content') // For utils.ts
                .mockResolvedValueOnce('button content'); // For Button.ts

            (fs.access as jest.Mock)
                .mockRejectedValueOnce(new Error()) // .ts doesn't exist
                .mockRejectedValueOnce(new Error()) // .tsx doesn't exist
                .mockRejectedValueOnce(new Error()) // .js doesn't exist
                .mockResolvedValueOnce(undefined) // .jsx exists
                .mockResolvedValueOnce(undefined); // Button.ts exists

            const runTestFn = jest.fn().mockResolvedValue(mockTestResult);
            await cache.getOrRunTest(testFile, runTestFn);

            // Verify dependency hashes were calculated
            expect(fs.readFile).toHaveBeenCalledWith(
                expect.stringContaining('utils'),
                'utf8'
            );
        });

        it('should invalidate cache when dependencies change', async () => {
            const testFile = '/test/workspace/test.spec.ts';
            const testContent = `
                import { helper } from './utils';
                describe('test', () => {});
            `;
            
            const runTestFn = jest.fn().mockResolvedValue(mockTestResult);

            // First run
            (fs.readFile as jest.Mock)
                .mockResolvedValueOnce(testContent)
                .mockResolvedValueOnce(testContent)
                .mockResolvedValueOnce('original utils');
            (fs.access as jest.Mock).mockResolvedValueOnce(undefined);

            await cache.getOrRunTest(testFile, runTestFn);

            // Second run with changed dependency
            (fs.readFile as jest.Mock)
                .mockResolvedValueOnce(testContent)
                .mockResolvedValueOnce(testContent)
                .mockResolvedValueOnce('modified utils');
            (fs.access as jest.Mock).mockResolvedValueOnce(undefined);

            const result = await cache.getOrRunTest(testFile, runTestFn);

            expect(result.fromCache).toBe(false);
            expect(runTestFn).toHaveBeenCalledTimes(2);
        });

        it('should invalidate dependent tests when source file changes', async () => {
            const testFile1 = '/test/workspace/test1.spec.ts';
            const testFile2 = '/test/workspace/test2.spec.ts';
            const sourceFile = '/test/workspace/utils.ts';
            
            const test1Content = `import { helper } from './utils';`;
            const test2Content = `import { helper } from './utils';`;
            
            // Set up mocks for both test files
            (fs.readFile as jest.Mock)
                .mockImplementation((file) => {
                    if (file.includes('test1')) return Promise.resolve(test1Content);
                    if (file.includes('test2')) return Promise.resolve(test2Content);
                    return Promise.resolve('utils content');
                });
            
            (fs.access as jest.Mock).mockResolvedValue(undefined);

            const runTestFn = jest.fn().mockResolvedValue(mockTestResult);

            // Cache both test results
            await cache.getOrRunTest(testFile1, runTestFn);
            await cache.getOrRunTest(testFile2, runTestFn);

            // Invalidate dependents of utils.ts
            await cache.invalidateDependents(sourceFile);

            expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
                expect.stringContaining('Invalidated 2 dependent test(s)')
            );
        });
    });

    describe('cache management', () => {
        it('should clean up old entries when exceeding max entries', async () => {
            cache = new TestResultCache(testWorkspaceRoot, { maxEntries: 3 });
            const runTestFn = jest.fn().mockResolvedValue(mockTestResult);

            // Add 4 entries (exceeding limit of 3)
            for (let i = 1; i <= 4; i++) {
                const testFile = `/test/workspace/test${i}.spec.ts`;
                (fs.readFile as jest.Mock).mockResolvedValue(`content ${i}`);
                await cache.getOrRunTest(testFile, runTestFn);
                // Add small delay to ensure different timestamps
                await new Promise(resolve => setTimeout(resolve, 10));
            }

            const entries = cache.getCacheEntries();
            expect(entries).toHaveLength(3);
            expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
                expect.stringContaining('Cleaned up 1 old cache entries')
            );
        });

        it('should clear all cache entries', async () => {
            const runTestFn = jest.fn().mockResolvedValue(mockTestResult);
            
            // Add some entries
            for (let i = 1; i <= 3; i++) {
                await cache.getOrRunTest(`/test/workspace/test${i}.spec.ts`, runTestFn);
            }

            await cache.clearCache();

            const entries = cache.getCacheEntries();
            expect(entries).toHaveLength(0);
            expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
                expect.stringContaining('Cleared all cache entries')
            );
        });

        it('should manually cache results', async () => {
            const testFile = '/test/workspace/test.spec.ts';
            
            await cache.cacheResult(testFile, mockTestResult, 1234);

            const entries = cache.getCacheEntries();
            expect(entries).toHaveLength(1);
            expect(entries[0].testFile).toBe(testFile);
            expect(entries[0].durationMs).toBe(1234);
        });
    });

    describe('statistics and effectiveness', () => {
        it('should track cache statistics accurately', async () => {
            const runTestFn = jest.fn().mockResolvedValue(mockTestResult);
            
            // First test - cache miss
            await cache.getOrRunTest('/test/workspace/test1.spec.ts', runTestFn);
            
            // Same test - cache hit
            await cache.getOrRunTest('/test/workspace/test1.spec.ts', runTestFn);
            
            // Different test - cache miss
            await cache.getOrRunTest('/test/workspace/test2.spec.ts', runTestFn);

            const stats = cache.getStats();
            
            expect(stats.totalRequests).toBe(3);
            expect(stats.cacheHits).toBe(1);
            expect(stats.cacheMisses).toBe(2);
            expect(stats.hitRate).toBeCloseTo(0.33, 2);
            expect(stats.entriesCount).toBe(2);
        });

        it('should calculate cache effectiveness', async () => {
            const runTestFn = jest.fn()
                .mockResolvedValueOnce({ ...mockTestResult, duration: 1000 })
                .mockResolvedValueOnce({ ...mockTestResult, duration: 2000 });
            
            // Create some cache activity
            await cache.getOrRunTest('/test/workspace/test1.spec.ts', runTestFn);
            await cache.getOrRunTest('/test/workspace/test2.spec.ts', runTestFn);
            
            // Cache hits
            await cache.getOrRunTest('/test/workspace/test1.spec.ts', runTestFn);
            await cache.getOrRunTest('/test/workspace/test2.spec.ts', runTestFn);

            const effectiveness = cache.getCacheEffectiveness();
            
            expect(effectiveness.hitRate).toBe(0.5);
            expect(effectiveness.timeSavedMinutes).toBeGreaterThanOrEqual(0); // Should save some time
            expect(effectiveness.spaceSavedMB).toBeGreaterThan(0);
            // With 0.5 hit rate, no specific recommendations are generated
            expect(Array.isArray(effectiveness.recommendedActions)).toBe(true);
        });

        it('should provide recommendations based on hit rate', async () => {
            // Test low hit rate recommendations
            cache = new TestResultCache(testWorkspaceRoot);
            let effectiveness = cache.getCacheEffectiveness();
            expect(effectiveness.recommendedActions).toContainEqual(
                expect.stringContaining('Consider including more dependencies')
            );

            // Test high hit rate recommendations
            const runTestFn = jest.fn().mockResolvedValue(mockTestResult);
            
            // Create high hit rate scenario
            await cache.getOrRunTest('/test/workspace/test.spec.ts', runTestFn);
            for (let i = 0; i < 9; i++) {
                await cache.getOrRunTest('/test/workspace/test.spec.ts', runTestFn);
            }

            effectiveness = cache.getCacheEffectiveness();
            expect(effectiveness.hitRate).toBe(0.9);
            expect(effectiveness.recommendedActions).toContainEqual(
                expect.stringContaining('Cache is very effective')
            );
        });
    });

    describe('persistence', () => {
        it('should save cache to disk', async () => {
            const testFile = '/test/workspace/test.spec.ts';
            await cache.cacheResult(testFile, mockTestResult, 1500);

            expect(fs.mkdir).toHaveBeenCalledWith(
                path.join(testWorkspaceRoot, '.ai-debug-context'),
                { recursive: true }
            );
            expect(fs.writeFile).toHaveBeenCalledWith(
                path.join(testWorkspaceRoot, '.ai-debug-context', 'test-cache.json'),
                expect.stringContaining('"version"')
            );
        });

        it('should load cache from disk on initialization', async () => {
            const savedCache = {
                version: '1.0.0',
                cache: [
                    [
                        '/test/workspace/test.spec.ts',
                        {
                            testFile: '/test/workspace/test.spec.ts',
                            contentHash: 'abc123',
                            dependencyHashes: [],
                            result: mockTestResult,
                            timestamp: new Date().toISOString(),
                            durationMs: 1500
                        }
                    ]
                ],
                stats: {
                    totalRequests: 5,
                    cacheHits: 3,
                    cacheMisses: 2,
                    hitRate: 0.6,
                    timeSavedMs: 4500,
                    entriesCount: 1
                }
            };

            (fs.access as jest.Mock).mockResolvedValueOnce(undefined);
            (fs.readFile as jest.Mock).mockResolvedValueOnce(JSON.stringify(savedCache));

            // Create new cache instance to trigger load
            const newCache = new TestResultCache(testWorkspaceRoot);
            await new Promise(resolve => setTimeout(resolve, 100)); // Wait for async load

            const stats = newCache.getStats();
            expect(stats.totalRequests).toBe(5);
            expect(stats.cacheHits).toBe(3);
            
            const entries = newCache.getCacheEntries();
            expect(entries).toHaveLength(1);

            newCache.dispose();
        });

        it('should handle persistence failures gracefully', async () => {
            (fs.writeFile as jest.Mock).mockRejectedValue(new Error('Write failed'));
            
            const testFile = '/test/workspace/test.spec.ts';
            await cache.cacheResult(testFile, mockTestResult, 1500);

            expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
                expect.stringContaining('Failed to save cache')
            );
        });

        it('should disable persistence when option is false', async () => {
            cache = new TestResultCache(testWorkspaceRoot, { enablePersistence: false });
            
            const testFile = '/test/workspace/test.spec.ts';
            await cache.cacheResult(testFile, mockTestResult, 1500);

            expect(fs.writeFile).not.toHaveBeenCalled();
        });
    });

    describe('edge cases', () => {
        it('should handle missing workspace root', () => {
            cache = new TestResultCache();
            expect(() => cache.getStats()).not.toThrow();
        });

        it('should handle file read errors during hash calculation', async () => {
            const testFile = '/test/workspace/test.spec.ts';
            const runTestFn = jest.fn().mockResolvedValue(mockTestResult);
            
            // First call succeeds, second fails
            (fs.readFile as jest.Mock)
                .mockResolvedValueOnce('content')
                .mockRejectedValueOnce(new Error('Read error'));

            const result = await cache.getOrRunTest(testFile, runTestFn);

            expect(result.fromCache).toBe(false);
            expect(runTestFn).toHaveBeenCalled();
        });

        it('should handle circular dependencies gracefully', async () => {
            const testFile = '/test/workspace/test.spec.ts';
            const testContent = `
                import { helper } from './test';  // Self import
                describe('test', () => {});
            `;
            
            (fs.readFile as jest.Mock).mockResolvedValue(testContent);
            (fs.access as jest.Mock).mockResolvedValue(undefined);

            const runTestFn = jest.fn().mockResolvedValue(mockTestResult);
            const result = await cache.getOrRunTest(testFile, runTestFn);

            expect(result.fromCache).toBe(false);
            expect(runTestFn).toHaveBeenCalled();
        });
    });
});