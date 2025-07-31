/**
 * Service Integration tests for Phase 1.9.3 validation
 * Tests key integration points between services
 */

import { TestMenuOrchestrator } from '../../services/TestMenuOrchestrator';
import { TestExecutionService } from '../../services/TestExecutionService';
import { ProjectSelectionService } from '../../services/ProjectSelectionService';
import { SimplePerformanceTracker } from '../../utils/SimplePerformanceTracker';
import { ConfigurationManager } from '../../core/ConfigurationManager';

// Mock vscode
jest.mock('vscode', () => ({
    window: {
        createOutputChannel: jest.fn(() => ({
            appendLine: jest.fn(),
            show: jest.fn(),
            dispose: jest.fn()
        })),
        showQuickPick: jest.fn(),
        showInformationMessage: jest.fn(),
        createQuickPick: jest.fn(() => ({
            title: '',
            placeholder: '',
            items: [],
            show: jest.fn(),
            hide: jest.fn(),
            dispose: jest.fn(),
            onDidAccept: jest.fn(),
            onDidHide: jest.fn()
        }))
    },
    workspace: {
        getConfiguration: jest.fn(() => ({
            get: jest.fn(),
            update: jest.fn()
        }))
    }
}));

describe('Service Integration Tests', () => {
    let mockServices: any;
    let mockOutputChannel: any;

    beforeEach(() => {
        jest.clearAllMocks();
        
        mockOutputChannel = {
            appendLine: jest.fn(),
            show: jest.fn(),
            dispose: jest.fn()
        };

        mockServices = {
            outputChannel: mockOutputChannel,
            updateStatusBar: jest.fn(),
            errorHandler: {
                handleError: jest.fn().mockReturnValue({}),
                showUserError: jest.fn()
            },
            workspaceRoot: '/test/workspace',
            configManager: new ConfigurationManager('/test/workspace'),
            performanceTracker: new SimplePerformanceTracker(mockOutputChannel),
            projectDiscovery: {
                getAllProjects: jest.fn().mockResolvedValue([]),
                getProjectsForFiles: jest.fn().mockResolvedValue([]),
                clearCache: jest.fn()
            },
            projectCache: {
                getCachedProjects: jest.fn(),
                cacheProjects: jest.fn(),
                clearCache: jest.fn(),
                getCacheStats: jest.fn().mockReturnValue({ size: 0, age: 0 })
            },
            backgroundDiscovery: {
                getQueueStatus: jest.fn().mockReturnValue({
                    queueLength: 0,
                    isRunning: false,
                    nextTask: null
                }),
                queueDiscovery: jest.fn()
            },
            setupWizard: {
                runSetupWizard: jest.fn()
            },
            projectSelection: {
                showProjectBrowser: jest.fn().mockResolvedValue(null),
                showMainMenu: jest.fn().mockResolvedValue(null)
            },
            fileWatcherActive: false
        };
    });

    describe('TestMenuOrchestrator Integration', () => {
        let orchestrator: TestMenuOrchestrator;

        beforeEach(() => {
            orchestrator = new TestMenuOrchestrator(mockServices);
        });

        test('should instantiate with all service dependencies', () => {
            expect(orchestrator).toBeDefined();
        });

        test('should delegate file watcher toggle', async () => {
            await orchestrator.toggleFileWatcher();
            
            // Should update the file watcher state
            expect(mockServices.updateStatusBar).toHaveBeenCalled();
        });

        test('should delegate cache clearing', async () => {
            await orchestrator.clearTestCache();
            
            expect(mockServices.projectDiscovery.clearCache).toHaveBeenCalled();
            expect(mockServices.updateStatusBar).toHaveBeenCalled();
        });

        test('should delegate setup wizard', async () => {
            await orchestrator.runSetup();
            
            expect(mockServices.setupWizard.runSetupWizard).toHaveBeenCalled();
            expect(mockServices.updateStatusBar).toHaveBeenCalled();
        });

        test('should show workspace info', async () => {
            mockServices.projectDiscovery.getAllProjects.mockResolvedValue([
                { name: 'test-app', type: 'application' as const, path: '/test/apps/test-app', projectJsonPath: '/test/apps/test-app/project.json' }
            ]);

            await orchestrator.showWorkspaceInfo();
            
            expect(mockServices.projectDiscovery.getAllProjects).toHaveBeenCalled();
            expect(mockServices.updateStatusBar).toHaveBeenCalled();
        });

    });

    describe('TestExecutionService Integration', () => {
        let testExecution: TestExecutionService;

        beforeEach(() => {
            testExecution = new TestExecutionService(mockServices);
        });

        test('should instantiate with service dependencies', () => {
            expect(testExecution).toBeDefined();
        });

        test('should use ConfigurationManager for test commands', async () => {
            const getTestCommandSpy = jest.spyOn(mockServices.configManager, 'getTestCommand');
            
            // Mock child process for test execution
            jest.mock('child_process', () => ({
                spawn: jest.fn().mockReturnValue({
                    stdout: { on: jest.fn() },
                    stderr: { on: jest.fn() },
                    on: jest.fn((event, callback) => {
                        if (event === 'close') callback(0);
                    })
                })
            }));

            const request = {
                mode: 'affected' as const,
                verbose: true
            };

            try {
                await testExecution.executeTest(request);
            } catch (error) {
                // Expected since we're not mocking child_process fully
            }

            expect(getTestCommandSpy).toHaveBeenCalledWith('affected');
        });
    });

    describe('ProjectSelectionService Integration', () => {
        let projectSelection: ProjectSelectionService;

        beforeEach(() => {
            projectSelection = new ProjectSelectionService(mockServices);
        });

        test('should integrate with project discovery', async () => {
            const mockProjects = [
                { name: 'app1', type: 'application' as const, path: '/test/apps/app1', projectJsonPath: '/test/apps/app1/project.json' }
            ];

            mockServices.projectDiscovery.getAllProjects.mockResolvedValue(mockProjects);

            const projects = await projectSelection.getAvailableProjects();
            
            expect(projects).toEqual(mockProjects);
            expect(mockServices.projectDiscovery.getAllProjects).toHaveBeenCalled();
        });

        test('should handle recent projects', async () => {
            const mockRecentProjects = [
                { name: 'recent-app', lastUsed: '2024-01-01', testCount: 5, lastUsedTimestamp: Date.now() }
            ];

            const mockWorkspaceConfig = {
                get: jest.fn().mockReturnValue(mockRecentProjects),
                update: jest.fn()
            };

            const vscode = require('vscode');
            vscode.workspace.getConfiguration.mockReturnValue(mockWorkspaceConfig);

            const recentProjects = await projectSelection.getRecentProjects();
            
            expect(recentProjects).toEqual(mockRecentProjects);
        });
    });

    describe('Performance Tracking Integration', () => {
        test('should track operations with simple metrics', async () => {
            const performanceTracker = new SimplePerformanceTracker(mockOutputChannel);
            
            const result = await performanceTracker.trackCommand(
                'test-command',
                async () => {
                    return 'success';
                }
            );

            expect(result).toBe('success');

            const summary = performanceTracker.getStatusSummary();
            expect(typeof summary).toBe('string');
            expect(summary.length).toBeGreaterThan(0);
        });

        test('should provide status summary for UI', () => {
            const performanceTracker = new SimplePerformanceTracker(mockOutputChannel);
            
            const summary = performanceTracker.getStatusSummary();
            expect(summary).toBe('Ready'); // No metrics recorded yet
        });
    });

    describe('ConfigurationManager Integration', () => {
        test('should provide framework detection and test commands', () => {
            const configManager = new ConfigurationManager('/test/workspace');
            
            const frameworks = configManager.getDetectedFrameworks();
            const testCommand = configManager.getTestCommand('default');
            const frameworkName = configManager.getFrameworkName();

            expect(Array.isArray(frameworks)).toBe(true);
            expect(typeof testCommand).toBe('string');
            expect(typeof frameworkName).toBe('string');
        });

        test('should provide configuration summary', async () => {
            const configManager = new ConfigurationManager('/test/workspace');
            
            const summary = await configManager.getFrameworkDetectionSummary();
            
            expect(typeof summary).toBe('string');
            expect(summary.length).toBeGreaterThan(0);
        });
    });

    describe('Error Handling Integration', () => {
        test('should handle errors gracefully without crashing', async () => {
            const orchestrator = new TestMenuOrchestrator(mockServices);
            
            // Mock projectDiscovery.getAllProjects to throw an error
            // ProjectSelectionService should handle this gracefully and return null
            mockServices.projectDiscovery.getAllProjects.mockRejectedValue(new Error('Test error'));

            // The orchestrator should complete without throwing
            await expect(orchestrator.showProjectBrowser()).resolves.not.toThrow();
            
            // Verify that the error is logged but handled gracefully
            expect(mockServices.outputChannel.appendLine).toHaveBeenCalledWith(
                expect.stringContaining('Failed to load projects')
            );
            expect(mockServices.updateStatusBar).toHaveBeenCalledWith('❌ Error', 'red');
        });

        test('should update status bar on errors', async () => {
            const orchestrator = new TestMenuOrchestrator(mockServices);
            
            mockServices.projectDiscovery.clearCache.mockRejectedValue(new Error('Cache error'));

            try {
                await orchestrator.clearTestCache();
            } catch (error) {
                // Expected
            }

            expect(mockServices.updateStatusBar).toHaveBeenCalledWith('❌ Error', 'red');
        });
    });
});