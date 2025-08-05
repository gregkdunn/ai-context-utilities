/**
 * Integration tests for core user workflows
 * Tests the complete service integration after Phase 1.9.3 refactor
 */

import * as vscode from 'vscode';
import { ServiceContainer } from '../../core/ServiceContainer';
import { TestMenuOrchestrator } from '../../services/TestMenuOrchestrator';
import { TestExecutionService } from '../../services/TestExecutionService';
import { ProjectSelectionService } from '../../services/ProjectSelectionService';

// Mock vscode
jest.mock('vscode', () => ({
    window: {
        createOutputChannel: jest.fn(() => ({
            appendLine: jest.fn(),
            show: jest.fn(),
            dispose: jest.fn()
        })),
        createStatusBarItem: jest.fn(() => ({
            text: '',
            tooltip: '',
            command: '',
            color: undefined,
            show: jest.fn(),
            hide: jest.fn(),
            dispose: jest.fn()
        })),
        showQuickPick: jest.fn(),
        showInformationMessage: jest.fn(() => Promise.resolve(undefined)),
        showErrorMessage: jest.fn(() => Promise.resolve(undefined)),
        createQuickPick: jest.fn(() => ({
            title: '',
            placeholder: '',
            items: [],
            show: jest.fn(),
            hide: jest.fn(),
            dispose: jest.fn(),
            onDidAccept: jest.fn(),
            onDidHide: jest.fn(),
            activeItems: [],
            value: ''
        }))
    },
    workspace: {
        getConfiguration: jest.fn(() => ({
            get: jest.fn(),
            update: jest.fn()
        })),
        workspaceFolders: [{
            uri: { fsPath: '/test/workspace' }
        }]
    },
    StatusBarAlignment: { Left: 1 },
    QuickPickItemKind: { Separator: 'separator' },
    Uri: {
        file: jest.fn((path: string) => ({ fsPath: path })),
        parse: jest.fn()
    },
    env: {
        openExternal: jest.fn()
    },
    commands: {
        registerCommand: jest.fn()
    },
    ThemeColor: jest.fn()
}));

// Mock file system
jest.mock('fs', () => ({
    promises: {
        readdir: jest.fn(),
        readFile: jest.fn(),
        writeFile: jest.fn(),
        access: jest.fn()
    },
    existsSync: jest.fn().mockReturnValue(true),
    readFileSync: jest.fn(),
    writeFileSync: jest.fn(),
    accessSync: jest.fn(),
    constants: {
        F_OK: 0,
        R_OK: 4,
        W_OK: 2,
        X_OK: 1
    }
}));

// Mock child_process
jest.mock('child_process', () => ({
    spawn: jest.fn()
}));

describe('Core Workflows Integration Tests', () => {
    let serviceContainer: ServiceContainer;
    let mockContext: vscode.ExtensionContext;

    beforeEach(async () => {
        // Reset all mocks
        jest.clearAllMocks();

        // Mock extension context
        mockContext = {
            subscriptions: [],
            extensionPath: '/test/extension',
            workspaceState: {
                get: jest.fn(),
                update: jest.fn()
            },
            globalState: {
                get: jest.fn(),
                update: jest.fn()
            }
        } as any;

        // Mock workspace configuration
        (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
            get: jest.fn().mockReturnValue([]),
            update: jest.fn()
        });

        // Create service container
        serviceContainer = await ServiceContainer.create(
            '/test/workspace',
            '/test/extension',
            mockContext
        );
    });

    afterEach(() => {
        serviceContainer?.dispose();
    });

    describe('Service Container Integration', () => {
        test('should initialize all core services successfully', () => {
            expect(serviceContainer.outputChannel).toBeDefined();
            expect(serviceContainer.statusBarItem).toBeDefined();
            expect(serviceContainer.configManager).toBeDefined();
            expect(serviceContainer.projectCache).toBeDefined();
            expect(serviceContainer.performanceTracker).toBeDefined();
            expect(serviceContainer.backgroundDiscovery).toBeDefined();
        });

        test('should perform health check successfully', async () => {
            const healthOk = await serviceContainer.performHealthCheck();
            expect(healthOk).toBe(true);
        });

        test('should update status bar with performance data', () => {
            serviceContainer.updateStatusBar('Test status');
            
            expect(serviceContainer.statusBarItem.text).toBe('⚡ AI Context Util: Test status');
            expect(serviceContainer.statusBarItem.tooltip).toContain('Test status');
            expect(serviceContainer.statusBarItem.tooltip).toContain('⚡ Performance');
        });
    });

    describe('TestMenuOrchestrator Integration', () => {
        let orchestrator: TestMenuOrchestrator;

        beforeEach(() => {
            orchestrator = new TestMenuOrchestrator(serviceContainer);
        });

        test('should create orchestrator with all dependencies', () => {
            expect(orchestrator).toBeDefined();
            // Orchestrator should have access to all services through serviceContainer
        });

        test('should handle project selection workflow', async () => {
            // Mock project discovery
            jest.spyOn(serviceContainer.projectDiscovery, 'getAllProjects').mockResolvedValue([
                { name: 'app1', type: 'application' as const, path: '/test/apps/app1', projectJsonPath: '/test/apps/app1/project.json' },
                { name: 'lib1', type: 'library' as const, path: '/test/libs/lib1', projectJsonPath: '/test/libs/lib1/project.json' }
            ]);

            // Should not throw and should interact with services
            await expect(orchestrator.showProjectBrowser()).resolves.not.toThrow();
            expect(serviceContainer.projectDiscovery.getAllProjects).toHaveBeenCalled();
        });
    });

    describe('TestExecutionService Integration', () => {
        let testExecution: TestExecutionService;

        beforeEach(() => {
            testExecution = new TestExecutionService(serviceContainer);
        });

        test('should create test execution service with dependencies', () => {
            expect(testExecution).toBeDefined();
        });

    });

    describe('ProjectSelectionService Integration', () => {
        let projectSelection: ProjectSelectionService;

        beforeEach(() => {
            projectSelection = new ProjectSelectionService(serviceContainer);
        });

        test('should integrate with project discovery service', async () => {
            const mockProjects = [
                { name: 'app1', type: 'application' as const, path: '/test/apps/app1', projectJsonPath: '/test/apps/app1/project.json' }
            ];

            jest.spyOn(serviceContainer.projectDiscovery, 'getAllProjects').mockResolvedValue(mockProjects);

            const availableProjects = await projectSelection.getAvailableProjects();
            
            expect(availableProjects).toEqual(mockProjects);
            expect(serviceContainer.projectDiscovery.getAllProjects).toHaveBeenCalled();
        });

        test('should handle recent projects from workspace state', async () => {
            const mockRecentProjects = [
                { name: 'recent-app', lastUsed: '2024-01-01', testCount: 5, lastUsedTimestamp: Date.now() }
            ];

            // Use a Proxy to return mock data for any workspace key
            const workspaceData = new Proxy({}, {
                get: (target, prop) => {
                    // Return mock projects for any key that looks like a workspace key
                    if (typeof prop === 'string' && prop.includes('workspace')) {
                        return mockRecentProjects;
                    }
                    return [];
                }
            });

            (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
                get: jest.fn().mockImplementation((key: string, defaultValue: any) => {
                    if (key === 'recentProjectsByWorkspace') {
                        return workspaceData;
                    }
                    return defaultValue;
                }),
                update: jest.fn()
            });

            const recentProjects = await projectSelection.getRecentProjects();
            
            expect(recentProjects).toEqual(mockRecentProjects);
        });
    });

    describe('Performance Tracking Integration', () => {
        test('should provide performance summary for status bar', () => {
            const summary = serviceContainer.performanceTracker.getStatusSummary();
            
            expect(typeof summary).toBe('string');
            expect(summary.length).toBeGreaterThan(0);
        });

        test('should integrate with background discovery queue status', () => {
            const queueStatus = serviceContainer.backgroundDiscovery.getQueueStatus();
            
            expect(queueStatus).toHaveProperty('queueLength');
            expect(queueStatus).toHaveProperty('isRunning');
            expect(queueStatus).toHaveProperty('nextTask');
        });
    });

    describe('Configuration Management Integration', () => {
        test('should detect frameworks and provide smart test commands', () => {
            // getDetectedFrameworks is synchronous, not async
            const frameworks = serviceContainer.configManager.getDetectedFrameworks();
            const testCommand = serviceContainer.configManager.getTestCommand('default');

            expect(Array.isArray(frameworks)).toBe(true);
            expect(typeof testCommand).toBe('string');
        });

        test('should provide framework-optimized configuration', async () => {
            const summary = await serviceContainer.configManager.getFrameworkDetectionSummary();
            
            expect(typeof summary).toBe('string');
            expect(summary.length).toBeGreaterThan(0);
        });
    });

    describe('End-to-End User Workflows', () => {
        test('should support complete project selection and execution flow', async () => {
            // Mock the complete workflow
            const orchestrator = new TestMenuOrchestrator(serviceContainer);
            
            // Mock project discovery
            jest.spyOn(serviceContainer.projectDiscovery, 'getAllProjects').mockResolvedValue([
                { name: 'test-app', type: 'application' as const, path: '/test/apps/test-app', projectJsonPath: '/test/apps/test-app/project.json' }
            ]);

            // Mock test execution
            const mockChild = {
                stdout: { on: jest.fn() },
                stderr: { on: jest.fn() },
                on: jest.fn((event, callback) => {
                    if (event === 'close') callback(0);
                })
            };
            const { spawn } = require('child_process');
            (spawn as jest.Mock).mockReturnValue(mockChild);

            // The workflow should complete without errors
            await expect(orchestrator.showProjectBrowser()).resolves.not.toThrow();
        });

        test('should track and display performance metrics throughout workflow', () => {
            // Simulate user workflow with performance tracking
            serviceContainer.updateStatusBar('Starting workflow');
            
            // Performance data should be included in status bar
            expect(serviceContainer.statusBarItem.tooltip).toContain('⚡ Performance');
            
            // Performance tracker should be ready to track operations
            const summary = serviceContainer.performanceTracker.getStatusSummary();
            expect(typeof summary).toBe('string');
        });
    });
});