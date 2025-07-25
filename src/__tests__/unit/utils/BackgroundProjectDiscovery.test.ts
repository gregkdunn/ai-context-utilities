/**
 * BackgroundProjectDiscovery Test Suite
 * Tests for background project discovery and queue management
 */

import { BackgroundProjectDiscovery } from '../../../utils/BackgroundProjectDiscovery';
import { ProjectCache } from '../../../utils/ProjectCache';
import { SimpleProjectDiscovery, ProjectInfo } from '../../../utils/simpleProjectDiscovery';
import * as vscode from 'vscode';

// Mock dependencies
jest.mock('vscode', () => ({
    window: {
        createOutputChannel: jest.fn()
    }
}));

jest.mock('../../../utils/ProjectCache');
jest.mock('../../../utils/simpleProjectDiscovery');

describe('BackgroundProjectDiscovery', () => {
    let backgroundDiscovery: BackgroundProjectDiscovery;
    let mockOutputChannel: jest.Mocked<vscode.OutputChannel>;
    let mockProjectCache: jest.Mocked<ProjectCache>;
    let mockSimpleProjectDiscovery: jest.Mocked<SimpleProjectDiscovery>;

    const mockProjects: ProjectInfo[] = [
        {
            name: 'test-app',
            path: 'apps/test-app',
            type: 'application',
            projectJsonPath: '/test/apps/test-app/project.json'
        },
        {
            name: 'shared-lib',
            path: 'libs/shared',
            type: 'library',
            projectJsonPath: '/test/libs/shared/project.json'
        }
    ];

    beforeEach(() => {
        // Create mock output channel
        mockOutputChannel = {
            appendLine: jest.fn(),
            show: jest.fn(),
            hide: jest.fn(),
            dispose: jest.fn(),
            clear: jest.fn(),
            replace: jest.fn(),
            append: jest.fn(),
            name: 'Test Channel'
        };

        // Create mock project cache
        mockProjectCache = {
            cacheProjects: jest.fn(),
            getCachedProjects: jest.fn(),
            getCachedProjectsOld: jest.fn(),
            cacheProjectsOld: jest.fn(),
            clearCache: jest.fn(),
            isValidCache: jest.fn(),
            getStructureHash: jest.fn()
        } as any;

        // Create background discovery instance
        backgroundDiscovery = new BackgroundProjectDiscovery(
            mockOutputChannel,
            mockProjectCache
        );
        
        // Prevent automatic background processing for most tests
        jest.spyOn(backgroundDiscovery as any, 'startBackgroundProcessing').mockImplementation(() => {
            // Mock implementation that doesn't actually process
            backgroundDiscovery['isRunning'] = false;
            return Promise.resolve();
        });

        // Mock SimpleProjectDiscovery constructor and methods
        mockSimpleProjectDiscovery = {
            getAllProjects: jest.fn().mockResolvedValue(mockProjects),
            getProjectsForFiles: jest.fn().mockResolvedValue(['test-app']),
            clearCache: jest.fn(),
            isValidCache: jest.fn()
        } as any;

        (SimpleProjectDiscovery as jest.MockedClass<typeof SimpleProjectDiscovery>).mockImplementation(
            () => mockSimpleProjectDiscovery
        );
    });

    afterEach(() => {
        backgroundDiscovery.dispose();
        jest.clearAllMocks();
        jest.clearAllTimers();
    });

    describe('Queue Management', () => {
        it('should queue discovery task with default medium priority', () => {
            backgroundDiscovery.queueDiscovery('/test/workspace');
            
            const status = backgroundDiscovery.getQueueStatus();
            expect(status.queueLength).toBe(1);
            expect(status.nextTask).toBe('/test/workspace');
            expect(status.isRunning).toBe(false);
        });

        it('should queue high priority task at front of queue', () => {
            backgroundDiscovery.queueDiscovery('/test/workspace1', 'medium');
            backgroundDiscovery.queueDiscovery('/test/workspace2', 'high');
            
            const status = backgroundDiscovery.getQueueStatus();
            expect(status.queueLength).toBe(2);
            expect(status.nextTask).toBe('/test/workspace2'); // High priority first
        });

        it('should replace existing task for same workspace', () => {
            backgroundDiscovery.queueDiscovery('/test/workspace', 'low');
            backgroundDiscovery.queueDiscovery('/test/workspace', 'high');
            
            const status = backgroundDiscovery.getQueueStatus();
            expect(status.queueLength).toBe(1); // Should replace, not duplicate
            expect(status.nextTask).toBe('/test/workspace');
        });

        it('should respect cooldown period for non-high priority tasks', () => {
            // Queue first task
            backgroundDiscovery.queueDiscovery('/test/workspace', 'medium');
            
            // Simulate that discovery just completed by setting last discovery time
            backgroundDiscovery['lastDiscoveryTime'].set('/test/workspace', Date.now());
            
            // Try to queue again with medium priority (should be ignored due to cooldown)
            backgroundDiscovery.queueDiscovery('/test/workspace', 'medium');
            
            const status = backgroundDiscovery.getQueueStatus();
            expect(status.queueLength).toBe(1); // Should still have the original task
        });

        it('should bypass cooldown for high priority tasks', () => {
            // Queue and simulate completion
            backgroundDiscovery.queueDiscovery('/test/workspace', 'medium');
            backgroundDiscovery['lastDiscoveryTime'].set('/test/workspace', Date.now());
            
            // Queue high priority task (should bypass cooldown)
            backgroundDiscovery.queueDiscovery('/test/workspace', 'high');
            
            const status = backgroundDiscovery.getQueueStatus();
            expect(status.queueLength).toBe(1);
        });

        it('should limit queue size to MAX_QUEUE_SIZE', () => {
            // Queue more than MAX_QUEUE_SIZE (10) tasks
            for (let i = 0; i < 15; i++) {
                backgroundDiscovery.queueDiscovery(`/test/workspace${i}`, 'medium');
            }
            
            const status = backgroundDiscovery.getQueueStatus();
            expect(status.queueLength).toBe(10); // Should be limited to MAX_QUEUE_SIZE
        });

        it('should clear queue', () => {
            backgroundDiscovery.queueDiscovery('/test/workspace1', 'medium');
            backgroundDiscovery.queueDiscovery('/test/workspace2', 'low');
            
            backgroundDiscovery.clearQueue();
            
            const status = backgroundDiscovery.getQueueStatus();
            expect(status.queueLength).toBe(0);
            expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
                '🗑️ Background discovery queue cleared'
            );
        });
    });

    describe('Discovery Execution', () => {
        beforeEach(() => {
            // Restore real implementation for execution tests
            (backgroundDiscovery as any).startBackgroundProcessing.mockRestore();
        });

        it('should process discovery task successfully', async () => {
            const workspaceRoot = '/test/workspace';
            
            // Queue a task
            backgroundDiscovery.queueDiscovery(workspaceRoot, 'medium');
            
            // Wait for background processing to complete
            await new Promise(resolve => setTimeout(resolve, 200));
            
            // Verify SimpleProjectDiscovery was created and called
            expect(SimpleProjectDiscovery).toHaveBeenCalledWith(
                workspaceRoot,
                mockOutputChannel,
                mockProjectCache
            );
            expect(mockSimpleProjectDiscovery.getAllProjects).toHaveBeenCalled();
            
            // Verify cache was updated
            expect(mockProjectCache.cacheProjects).toHaveBeenCalledWith(mockProjects);
            
            // Verify logging
            expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
                '🔄 Background project discovery started'
            );
            expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
                expect.stringContaining(`📋 Background discovery for ${workspaceRoot}: 2 projects`)
            );
            expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
                '✅ Background project discovery completed'
            );
        });

        it('should handle discovery errors gracefully', async () => {
            const workspaceRoot = '/test/workspace';
            const testError = new Error('Discovery failed');
            
            // Mock getAllProjects to throw error
            mockSimpleProjectDiscovery.getAllProjects.mockRejectedValue(testError);
            
            backgroundDiscovery.queueDiscovery(workspaceRoot, 'medium');
            
            // Wait for background processing
            await new Promise(resolve => setTimeout(resolve, 200));
            
            // Verify error was logged
            expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
                expect.stringContaining(`⚠️ Background discovery failed for ${workspaceRoot}: ${testError}`)
            );
        });

        it('should update last discovery time after successful completion', async () => {
            const workspaceRoot = '/test/workspace';
            const beforeTime = Date.now();
            
            backgroundDiscovery.queueDiscovery(workspaceRoot, 'medium');
            
            // Wait for processing
            await new Promise(resolve => setTimeout(resolve, 200));
            
            const afterTime = Date.now();
            const lastTime = backgroundDiscovery['lastDiscoveryTime'].get(workspaceRoot);
            
            expect(lastTime).toBeGreaterThanOrEqual(beforeTime);
            expect(lastTime).toBeLessThanOrEqual(afterTime);
        });

        it('should prevent concurrent execution', async () => {
            backgroundDiscovery.queueDiscovery('/test/workspace1', 'medium');
            backgroundDiscovery.queueDiscovery('/test/workspace2', 'medium');
            
            // Check that isRunning becomes true during execution
            const initialStatus = backgroundDiscovery.getQueueStatus();
            
            // Wait a bit for execution to start
            await new Promise(resolve => setTimeout(resolve, 50));
            
            const runningStatus = backgroundDiscovery.getQueueStatus();
            expect(runningStatus.isRunning).toBe(true);
            
            // Wait for completion
            await new Promise(resolve => setTimeout(resolve, 200));
            
            const finalStatus = backgroundDiscovery.getQueueStatus();
            expect(finalStatus.isRunning).toBe(false);
        });
    });

    describe('Force Discovery', () => {
        beforeEach(() => {
            // Restore real implementation for force discovery tests
            if ((backgroundDiscovery as any).startBackgroundProcessing.mockRestore) {
                (backgroundDiscovery as any).startBackgroundProcessing.mockRestore();
            }
        });

        it('should perform immediate discovery bypassing queue', async () => {
            const workspaceRoot = '/test/workspace';
            
            const result = await backgroundDiscovery.forceDiscovery(workspaceRoot);
            
            expect(result).toEqual(mockProjects);
            expect(mockSimpleProjectDiscovery.getAllProjects).toHaveBeenCalled();
            expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
                `🚀 Force discovery for ${workspaceRoot}`
            );
            
            // Verify last discovery time was updated
            const lastTime = backgroundDiscovery['lastDiscoveryTime'].get(workspaceRoot);
            expect(lastTime).toBeGreaterThan(0);
        });

        it('should handle force discovery errors', async () => {
            const workspaceRoot = '/test/workspace';
            const testError = new Error('Force discovery failed');
            
            mockSimpleProjectDiscovery.getAllProjects.mockRejectedValue(testError);
            
            await expect(backgroundDiscovery.forceDiscovery(workspaceRoot))
                .rejects.toThrow('Force discovery failed');
        });
    });

    describe('Queue Status', () => {
        it('should return accurate queue status', () => {
            expect(backgroundDiscovery.getQueueStatus()).toEqual({
                queueLength: 0,
                isRunning: false,
                nextTask: undefined
            });
            
            backgroundDiscovery.queueDiscovery('/test/workspace', 'medium');
            
            expect(backgroundDiscovery.getQueueStatus()).toEqual({
                queueLength: 1,
                isRunning: false,
                nextTask: '/test/workspace'
            });
        });

        it('should show next task correctly with multiple tasks', () => {
            backgroundDiscovery.queueDiscovery('/test/workspace1', 'low');
            backgroundDiscovery.queueDiscovery('/test/workspace2', 'high'); // Should be first
            backgroundDiscovery.queueDiscovery('/test/workspace3', 'medium');
            
            const status = backgroundDiscovery.getQueueStatus();
            expect(status.queueLength).toBe(3);
            expect(status.nextTask).toBe('/test/workspace2'); // High priority task
        });
    });

    describe('Disposal and Cleanup', () => {
        it('should dispose cleanly', () => {
            backgroundDiscovery.queueDiscovery('/test/workspace', 'medium');
            
            expect(() => {
                backgroundDiscovery.dispose();
            }).not.toThrow();
            
            const status = backgroundDiscovery.getQueueStatus();
            expect(status.queueLength).toBe(0);
        });

        it('should stop processing when disposed', () => {
            backgroundDiscovery.queueDiscovery('/test/workspace', 'medium');
            backgroundDiscovery.dispose();
            
            // isRunning should be set to false
            expect(backgroundDiscovery['isRunning']).toBe(false);
        });
    });

    describe('Edge Cases', () => {
        it('should handle empty workspace roots', () => {
            backgroundDiscovery.queueDiscovery('', 'medium');
            
            const status = backgroundDiscovery.getQueueStatus();
            expect(status.queueLength).toBe(1);
            expect(status.nextTask).toBe('');
        });

        it('should handle invalid priority gracefully', () => {
            // TypeScript should prevent this, but test runtime behavior
            backgroundDiscovery.queueDiscovery('/test/workspace', 'invalid' as any);
            
            const status = backgroundDiscovery.getQueueStatus();
            expect(status.queueLength).toBe(1);
        });

        it('should handle rapid queue operations', () => {
            // Rapidly queue many tasks
            for (let i = 0; i < 5; i++) {
                backgroundDiscovery.queueDiscovery(`/test/workspace${i}`, 'high');
                backgroundDiscovery.queueDiscovery(`/test/workspace${i}`, 'low');
            }
            
            const status = backgroundDiscovery.getQueueStatus();
            expect(status.queueLength).toBe(5); // Should handle duplicates correctly
        });
    });

    describe('Performance Characteristics', () => {
        it('should have minimal overhead for duplicate queue operations', () => {
            const startTime = Date.now();
            
            // Perform many duplicate queue operations
            for (let i = 0; i < 1000; i++) {
                backgroundDiscovery.queueDiscovery('/test/workspace', 'medium');
            }
            
            const endTime = Date.now();
            const duration = endTime - startTime;
            
            expect(duration).toBeLessThan(100); // Should complete quickly
            expect(backgroundDiscovery.getQueueStatus().queueLength).toBe(1);
        });

        it('should handle large queue sizes efficiently', () => {
            const startTime = Date.now();
            
            // Queue maximum number of different workspaces
            for (let i = 0; i < 10; i++) {
                backgroundDiscovery.queueDiscovery(`/test/workspace${i}`, 'medium');
            }
            
            const endTime = Date.now();
            const duration = endTime - startTime;
            
            expect(duration).toBeLessThan(50);
            expect(backgroundDiscovery.getQueueStatus().queueLength).toBe(10);
        });
    });
});