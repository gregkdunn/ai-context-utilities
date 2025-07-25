/**
 * ProjectCache Test Suite
 * Tests for project discovery caching functionality
 */

import { ProjectCache } from '../../../utils/ProjectCache';
import { Project } from '../../../utils/simpleProjectDiscovery';
import * as vscode from 'vscode';
import * as fs from 'fs';

// Mock dependencies
jest.mock('vscode', () => ({
    workspace: {
        getConfiguration: jest.fn()
    }
}));

jest.mock('fs', () => ({
    existsSync: jest.fn(),
    statSync: jest.fn(),
    readdirSync: jest.fn()
}));

describe('ProjectCache', () => {
    let projectCache: ProjectCache;
    let mockWorkspaceConfig: jest.Mocked<vscode.WorkspaceConfiguration>;
    let mockFs: jest.Mocked<typeof fs>;

    const testWorkspaceRoot = '/test/workspace';
    const mockProjects: Project[] = [
        {
            name: 'app1',
            path: 'apps/app1',
            type: 'application',
            projectJsonPath: '/test/apps/app1/project.json'
        },
        {
            name: 'lib1',
            path: 'libs/lib1',
            type: 'library',
            projectJsonPath: '/test/libs/lib1/project.json'
        }
    ];

    beforeEach(() => {
        // Mock filesystem
        mockFs = fs as jest.Mocked<typeof fs>;
        (mockFs.existsSync as jest.Mock).mockReturnValue(true);
        (mockFs.statSync as jest.Mock).mockReturnValue({ 
            mtime: new Date('2024-01-01'), 
            isDirectory: () => true 
        } as any);
        (mockFs.readdirSync as jest.Mock).mockImplementation((dirPath: any) => {
            // Default implementation for consistent hash computation
            const pathStr = dirPath.toString();
            if (pathStr.includes('apps')) {
                return ['app1'] as any;
            }
            if (pathStr.includes('libs')) {
                return ['lib1'] as any;
            }
            return [] as any;
        });

        // Mock workspace configuration
        mockWorkspaceConfig = {
            get: jest.fn(),
            update: jest.fn(),
            inspect: jest.fn(),
            has: jest.fn()
        } as any;

        (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue(mockWorkspaceConfig);

        // Create project cache instance
        projectCache = new ProjectCache(testWorkspaceRoot, 30); // 30 minute timeout
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Constructor and Initialization', () => {
        it('should initialize with correct workspace root and timeout', () => {
            expect(projectCache['workspaceRoot']).toBe(testWorkspaceRoot);
            expect(projectCache['cacheTimeout']).toBe(30 * 60 * 1000); // 30 minutes in ms
        });

        it('should convert timeout from minutes to milliseconds', () => {
            const cache = new ProjectCache('/test', 15); // 15 minutes
            expect(cache['cacheTimeout']).toBe(15 * 60 * 1000);
        });

        it('should use default timeout when not specified', () => {
            const cache = new ProjectCache('/test');
            expect(cache['cacheTimeout']).toBe(30 * 60 * 1000); // Default 30 minutes
        });

        it('should attempt to load from workspace state on initialization', () => {
            expect(vscode.workspace.getConfiguration).toHaveBeenCalledWith('aiDebugContext');
        });
    });

    describe('Cache Operations', () => {
        beforeEach(() => {
            // Mock file system for workspace hash computation
            mockFs.existsSync.mockReturnValue(true);
            mockFs.statSync.mockReturnValue({ mtime: new Date('2024-01-01') } as any);
            mockFs.readdirSync.mockReturnValue(['apps', 'libs', 'nx.json', 'package.json'] as any);
        });

        it('should cache and retrieve projects successfully', () => {
            projectCache.cacheProjects(mockProjects);
            
            const cachedProjects = projectCache.getCachedProjects();
            expect(cachedProjects).toEqual(mockProjects);
        });

        it('should return null when no cache exists', () => {
            const cachedProjects = projectCache.getCachedProjects();
            expect(cachedProjects).toBeNull();
        });

        it('should save cache to workspace state when caching', () => {
            projectCache.cacheProjects(mockProjects);
            
            expect(mockWorkspaceConfig.update).toHaveBeenCalledWith(
                'projectCache',
                expect.objectContaining({
                    [testWorkspaceRoot]: expect.objectContaining({
                        projects: mockProjects,
                        timestamp: expect.any(Number),
                        hash: expect.any(String)
                    })
                }),
                true
            );
        });

        it('should handle empty project arrays', () => {
            projectCache.cacheProjects([]);
            
            const cachedProjects = projectCache.getCachedProjects();
            expect(cachedProjects).toEqual([]);
        });
    });

    describe('Cache Validation', () => {
        beforeEach(() => {
            // Setup consistent mock filesystem state
            mockFs.existsSync.mockReturnValue(true);
            mockFs.statSync.mockReturnValue({ mtime: new Date('2024-01-01') } as any);
            mockFs.readdirSync.mockReturnValue(['apps', 'libs', 'nx.json'] as any);
        });

        it('should invalidate expired cache', () => {
            // Cache projects
            projectCache.cacheProjects(mockProjects);
            
            // Mock expired timestamp (older than timeout)
            const expiredTimestamp = Date.now() - (31 * 60 * 1000); // 31 minutes ago
            projectCache['cache'].set(testWorkspaceRoot, {
                projects: mockProjects,
                timestamp: expiredTimestamp,
                hash: projectCache['computeWorkspaceHash']()
            });
            
            const cachedProjects = projectCache.getCachedProjects();
            expect(cachedProjects).toBeNull();
        });

        it('should invalidate cache when workspace structure changes', () => {
            // Cache projects with initial filesystem state
            projectCache.cacheProjects(mockProjects);
            
            // Verify cache works initially
            expect(projectCache.getCachedProjects()).toEqual(mockProjects);
            
            // Manually test the invalidation by directly modifying the cache entry's hash
            // This simulates what would happen if filesystem structure changed
            const cacheEntry = projectCache['cache'].get(testWorkspaceRoot);
            if (cacheEntry) {
                // Change the hash to simulate structure change
                cacheEntry.hash = 'different-hash-after-change';
                projectCache['cache'].set(testWorkspaceRoot, cacheEntry);
            }
            
            const cachedProjects = projectCache.getCachedProjects();
            expect(cachedProjects).toBeNull(); // Should be invalidated due to hash mismatch
        });

        it('should return cached projects when structure is unchanged', () => {
            projectCache.cacheProjects(mockProjects);
            
            // Retrieve again with same filesystem state
            const cachedProjects = projectCache.getCachedProjects();
            expect(cachedProjects).toEqual(mockProjects);
        });

        it('should handle missing workspace files gracefully', () => {
            // Mock some files as missing
            (mockFs.existsSync as jest.Mock).mockImplementation((path: any) => {
                return !path.toString().includes('missing-file');
            });
            
            expect(() => {
                projectCache.cacheProjects(mockProjects);
                projectCache.getCachedProjects();
            }).not.toThrow();
        });
    });

    describe('Workspace Hash Computation', () => {
        it('should compute consistent hash for same workspace structure', () => {
            mockFs.existsSync.mockReturnValue(true);
            mockFs.statSync.mockReturnValue({ mtime: new Date('2024-01-01') } as any);
            mockFs.readdirSync.mockReturnValue(['apps', 'libs'] as any);
            
            const hash1 = projectCache['computeWorkspaceHash']();
            const hash2 = projectCache['computeWorkspaceHash']();
            
            expect(hash1).toBe(hash2);
            expect(hash1).toBeTruthy();
        });

        it('should compute different hash when structure changes', () => {
            mockFs.existsSync.mockReturnValue(true);
            mockFs.statSync.mockReturnValue({ mtime: new Date('2024-01-01'), isDirectory: () => true } as any);
            
            // First structure - setup directory-specific responses
            let directoryState = {
                apps: ['app1'],
                libs: ['lib1']
            };
            
            mockFs.readdirSync.mockImplementation((dirPath: any) => {
                const pathStr = dirPath.toString();
                if (pathStr.includes('apps')) {
                    return directoryState.apps as any;
                }
                if (pathStr.includes('libs')) {
                    return directoryState.libs as any;
                }
                return [] as any;
            });
            
            const hash1 = projectCache['computeWorkspaceHash']();
            
            // Changed structure - different subdirectories
            directoryState = {
                apps: ['app1', 'app2'], // Added new app
                libs: ['lib1']
            };
            
            const hash2 = projectCache['computeWorkspaceHash']();
            
            expect(hash1).not.toBe(hash2);
        });

        it('should handle filesystem errors during hash computation', () => {
            mockFs.existsSync.mockImplementation(() => {
                throw new Error('Filesystem error');
            });
            
            expect(() => {
                projectCache['computeWorkspaceHash']();
            }).not.toThrow();
            
            // Should return a fallback hash
            const hash = projectCache['computeWorkspaceHash']();
            expect(hash).toBeTruthy();
        });
    });

    describe('Cache Statistics', () => {
        it('should return cache statistics for valid cache', async () => {
            (mockFs.existsSync as jest.Mock).mockReturnValue(true);
            (mockFs.statSync as jest.Mock).mockReturnValue({ mtime: new Date('2024-01-01') } as any);
            (mockFs.readdirSync as jest.Mock).mockReturnValue(['apps'] as any);
            
            projectCache.cacheProjects(mockProjects);
            
            // Wait a small amount to ensure timestamp difference
            await new Promise(resolve => setTimeout(resolve, 1));
            
            const stats = projectCache.getCacheStats();
            expect(stats.size).toBe(1);
            expect(stats.age).toBeGreaterThanOrEqual(0);
        });

        it('should return zero size when no cache exists', () => {
            const stats = projectCache.getCacheStats();
            expect(stats.size).toBe(0);
            expect(stats.age).toBeNull();
        });
    });

    describe('Cache Clearing', () => {
        it('should clear cache completely', () => {
            projectCache.cacheProjects(mockProjects);
            
            // Verify cache exists
            expect(projectCache.getCachedProjects()).toEqual(mockProjects);
            
            projectCache.clearCache();
            
            // Verify cache is cleared
            expect(projectCache.getCachedProjects()).toBeNull();
        });

        it('should update workspace state when clearing cache', () => {
            projectCache.cacheProjects(mockProjects);
            projectCache.clearCache();
            
            expect(mockWorkspaceConfig.update).toHaveBeenCalledWith(
                'projectCache',
                {},
                true
            );
        });

        it('should handle clearing non-existent cache gracefully', () => {
            expect(() => {
                projectCache.clearCache();
            }).not.toThrow();
        });
    });

    describe('Workspace State Integration', () => {
        it('should load cache from workspace state on initialization', () => {
            const savedCache = {
                [testWorkspaceRoot]: {
                    projects: mockProjects,
                    timestamp: Date.now(),
                    hash: 'test-hash'
                }
            };
            
            mockWorkspaceConfig.get.mockReturnValue(savedCache);
            
            const cache = new ProjectCache(testWorkspaceRoot, 30);
            
            // Should load from workspace state
            expect(vscode.workspace.getConfiguration).toHaveBeenCalledWith('aiDebugContext');
            expect(mockWorkspaceConfig.get).toHaveBeenCalledWith('projectCache', {});
        });

        it('should handle corrupted workspace state gracefully', () => {
            mockWorkspaceConfig.get.mockReturnValue('invalid-cache-data');
            
            expect(() => {
                new ProjectCache(testWorkspaceRoot, 30);
            }).not.toThrow();
        });

        it('should handle missing workspace state gracefully', () => {
            mockWorkspaceConfig.get.mockReturnValue(undefined);
            
            expect(() => {
                new ProjectCache(testWorkspaceRoot, 30);
            }).not.toThrow();
        });
    });


    describe('Performance and Edge Cases', () => {
        it('should handle large project arrays efficiently', () => {
            const largeProjectArray = Array.from({ length: 1000 }, (_, i) => ({
                name: `project-${i}`,
                path: `apps/project-${i}`,
                type: 'application' as const,
                projectJsonPath: `/test/apps/project-${i}/project.json`
            }));
            
            const startTime = Date.now();
            projectCache.cacheProjects(largeProjectArray);
            const cachedProjects = projectCache.getCachedProjects();
            const endTime = Date.now();
            
            expect(cachedProjects).toEqual(largeProjectArray);
            expect(endTime - startTime).toBeLessThan(100); // Should be fast
        });

        it('should handle projects with special characters in names', () => {
            const specialProjects: Project[] = [
                {
                    name: 'app-with-dashes',
                    path: 'apps/app-with-dashes',
                    type: 'application',
                    projectJsonPath: '/test/apps/app-with-dashes/project.json'
                },
                {
                    name: 'app_with_underscores',
                    path: 'apps/app_with_underscores',
                    type: 'application',
                    projectJsonPath: '/test/apps/app_with_underscores/project.json'
                },
                {
                    name: 'app.with.dots',
                    path: 'apps/app.with.dots',
                    type: 'application',
                    projectJsonPath: '/test/apps/app.with.dots/project.json'
                }
            ];
            
            projectCache.cacheProjects(specialProjects);
            const cachedProjects = projectCache.getCachedProjects();
            
            expect(cachedProjects).toEqual(specialProjects);
        });

        it('should handle concurrent cache operations', () => {
            const projects1 = [mockProjects[0]];
            const projects2 = [mockProjects[1]];
            
            // Simulate concurrent operations
            projectCache.cacheProjects(projects1);
            projectCache.cacheProjects(projects2);
            
            const cachedProjects = projectCache.getCachedProjects();
            expect(cachedProjects).toEqual(projects2); // Last write wins
        });

        it('should maintain cache consistency across multiple operations', () => {
            // Cache projects
            projectCache.cacheProjects(mockProjects);
            const stats1 = projectCache.getCacheStats();
            expect(stats1.size).toBe(1);
            
            // Retrieve and verify
            const retrieved1 = projectCache.getCachedProjects();
            expect(retrieved1).toEqual(mockProjects);
            
            // Retrieve again and verify consistency
            const retrieved2 = projectCache.getCachedProjects();
            expect(retrieved2).toEqual(retrieved1);
            
            // Clear and verify
            projectCache.clearCache();
            const stats2 = projectCache.getCacheStats();
            expect(stats2.size).toBe(0);
            expect(projectCache.getCachedProjects()).toBeNull();
        });
    });
});