/**
 * End-to-End User Workflow Tests
 * Tests complete user journeys for Phase 2.0.1
 */

import * as vscode from 'vscode';
import { ServiceContainer } from '../../core/ServiceContainer';
import { TestMenuOrchestrator } from '../../services/TestMenuOrchestrator';

// Mock vscode
jest.mock('vscode', () => ({
    window: {
        createOutputChannel: jest.fn(() => ({
            appendLine: jest.fn(),
            show: jest.fn(),
            dispose: jest.fn(),
            clear: jest.fn(),
            replace: jest.fn(),
            append: jest.fn(),
            name: 'AI Context Utilities'
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
        showWarningMessage: jest.fn(() => Promise.resolve(undefined)),
        withProgress: jest.fn((options, callback) => {
            // Mock progress callback
            const progress = { report: jest.fn() };
            const token = { isCancellationRequested: false };
            return callback(progress, token);
        })
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
    StatusBarAlignment: { Left: 1, Right: 2 },
    ThemeColor: jest.fn(),
    ProgressLocation: {
        Notification: 15,
        Window: 10,
        SourceControl: 1
    },
    commands: {
        executeCommand: jest.fn()
    },
    env: {
        clipboard: {
            writeText: jest.fn(() => Promise.resolve())
        }
    }
}));

// Mock file system
jest.mock('fs', () => ({
    promises: {
        access: jest.fn(),
        readFile: jest.fn(),
        writeFile: jest.fn(),
        mkdir: jest.fn(),
        unlink: jest.fn()
    },
    constants: {
        F_OK: 0,
        R_OK: 4,
        W_OK: 2,
        X_OK: 1
    },
    existsSync: jest.fn(() => true),
    readFileSync: jest.fn(),
    accessSync: jest.fn(), // Missing method causing E2E test failures
    statSync: jest.fn(() => ({ isDirectory: () => true, isFile: () => true }))
}));

// Mock child_process
jest.mock('child_process', () => ({
    spawn: jest.fn().mockReturnValue({
        stdout: {
            on: jest.fn((event, callback) => {
                if (event === 'data') {
                    setTimeout(() => callback('Test output\n'), 10);
                }
            })
        },
        stderr: {
            on: jest.fn()
        },
        on: jest.fn((event, callback) => {
            if (event === 'close') {
                setTimeout(() => callback(0), 20);
            }
        })
    })
}));

describe('End-to-End User Workflows', () => {
    let serviceContainer: ServiceContainer;
    let orchestrator: TestMenuOrchestrator;
    let mockContext: jest.Mocked<vscode.ExtensionContext>;

    beforeEach(async () => {
        // Create mock extension context
        mockContext = {
            subscriptions: [],
            workspaceState: {
                get: jest.fn(),
                update: jest.fn(),
                keys: jest.fn()
            },
            globalState: {
                get: jest.fn(),
                update: jest.fn(),
                keys: jest.fn()
            },
            extensionPath: '/test/extension',
            storagePath: '/test/storage',
            globalStoragePath: '/test/global-storage',
            logPath: '/test/logs'
        } as any;

        // Create service container
        serviceContainer = await ServiceContainer.create(
            '/test/workspace',
            '/test/extension',
            mockContext
        );

        orchestrator = new TestMenuOrchestrator(serviceContainer);
    });

    afterEach(() => {
        serviceContainer?.dispose();
    });

    describe('Happy Path: File Change → Test Detection → Test Execution', () => {
        test('should complete full workflow from file change to test results', async () => {
            // Mock git diff to simulate file changes
            const { spawn } = require('child_process');
            (spawn as jest.Mock).mockReturnValueOnce({
                stdout: {
                    on: jest.fn((event, callback) => {
                        if (event === 'data') {
                            callback('src/user/user.service.ts\nsrc/auth/auth.controller.ts\n');
                        }
                    })
                },
                stderr: { on: jest.fn() },
                on: jest.fn((event, callback) => {
                    if (event === 'close') callback(0);
                }),
                kill: jest.fn()
            });

            // Mock project discovery to return projects
            const mockGetProjectsForFiles = jest.spyOn(serviceContainer.projectDiscovery, 'getProjectsForFiles')
                .mockResolvedValue(['user-service', 'auth-service']);

            // Mock test execution - check that performance tracking occurs
            const trackCommandSpy = jest.spyOn(serviceContainer.performanceTracker, 'trackCommand');

            // Execute the workflow
            await orchestrator.runAutoDetectProjects();

            // Verify the complete workflow
            expect(mockGetProjectsForFiles).toHaveBeenCalledWith([
                'src/user/user.service.ts',
                'src/auth/auth.controller.ts'
            ]);

            // Verify status updates throughout the workflow
            expect(serviceContainer.statusBarItem.text).toContain('AI Context Util');
        });

        test('should handle no changes gracefully', async () => {
            // Mock git diff to return empty results
            const { spawn } = require('child_process');
            (spawn as jest.Mock).mockReturnValueOnce({
                stdout: { on: jest.fn() },
                stderr: { on: jest.fn() },
                on: jest.fn((event, callback) => {
                    if (event === 'close') callback(0);
                })
            });

            await orchestrator.runAutoDetectProjects();

            // Verify graceful handling
            expect(serviceContainer.outputChannel.appendLine).toHaveBeenCalledWith(
                expect.stringContaining('No changes detected')
            );
        });
    });

    describe('Error Recovery Workflows', () => {
        test('should fallback to git affected when auto-detect fails', async () => {
            // Mock git diff to fail
            const { spawn } = require('child_process');
            (spawn as jest.Mock).mockReturnValueOnce({
                stdout: { on: jest.fn() },
                stderr: {
                    on: jest.fn((event, callback) => {
                        if (event === 'data') {
                            callback('fatal: not a git repository');
                        }
                    })
                },
                on: jest.fn((event, callback) => {
                    if (event === 'close') callback(1);
                })
            });

            // Mock git affected to succeed
            (spawn as jest.Mock).mockReturnValueOnce({
                stdout: {
                    on: jest.fn((event, callback) => {
                        if (event === 'data') {
                            callback('Test passed\n');
                        }
                    })
                },
                stderr: { on: jest.fn() },
                on: jest.fn((event, callback) => {
                    if (event === 'close') callback(0);
                })
            });

            await orchestrator.runAutoDetectProjects();

            // Verify fallback behavior
            expect(serviceContainer.outputChannel.appendLine).toHaveBeenCalledWith(
                expect.stringContaining('Falling back to git affected')
            );
        });

        test('should handle test failures with post-test actions', async () => {
            // This test would verify Phase 2.0 post-test action workflow
            // Mock failing test execution
            const { spawn } = require('child_process');
            (spawn as jest.Mock).mockReturnValue({
                stdout: {
                    on: jest.fn((event, callback) => {
                        if (event === 'data') {
                            callback('FAIL src/user/user.service.spec.ts\n');
                        }
                    })
                },
                stderr: { on: jest.fn() },
                on: jest.fn((event, callback) => {
                    if (event === 'close') callback(1); // Exit code 1 = failure
                })
            });

            // Execute test that will fail
            const result = await orchestrator.executeProjectTest('user-service');

            // Verify error handling
            expect(serviceContainer.statusBarItem.text).toContain('❌');
        });
    });

    describe('Phase 2.0 Git Diff & AI Context Workflows', () => {
        test('should capture git diff before test execution', async () => {
            const fs = require('fs');
            
            // Mock git diff capture
            const { spawn } = require('child_process');
            (spawn as jest.Mock).mockReturnValueOnce({
                stdout: {
                    on: jest.fn((event, callback) => {
                        if (event === 'data') {
                            callback(`diff --git a/test.ts b/test.ts
index 123..456 100644
--- a/test.ts
+++ b/test.ts
@@ -1,3 +1,3 @@
 function test() {
-  return false;
+  return true;
 }`);
                        }
                    })
                },
                stderr: { on: jest.fn() },
                on: jest.fn((event, callback) => {
                    if (event === 'close') callback(0);
                })
            });

            // Mock test execution
            (spawn as jest.Mock).mockReturnValueOnce({
                stdout: {
                    on: jest.fn((event, callback) => {
                        if (event === 'data') {
                            callback('Test output\n');
                        }
                    })
                },
                stderr: { on: jest.fn() },
                on: jest.fn((event, callback) => {
                    if (event === 'close') callback(0);
                })
            });

            await orchestrator.executeProjectTest('test-project');

            // Verify git diff was captured
            expect(fs.promises.writeFile).toHaveBeenCalledWith(
                expect.stringContaining('diff.txt'),
                expect.stringContaining('diff --git')
            );

            // Verify test output was captured
            expect(fs.promises.writeFile).toHaveBeenCalledWith(
                expect.stringContaining('test-output.txt'),
                expect.stringContaining('Test output')
            );
        });

        test('should show post-test actions menu for test failures', async () => {
            // Mock failing test
            const { spawn } = require('child_process');
            (spawn as jest.Mock).mockReturnValue({
                stdout: { on: jest.fn() },
                stderr: {
                    on: jest.fn((event, callback) => {
                        if (event === 'data') {
                            callback('FAIL src/test.spec.ts\nTest failed\n');
                        }
                    })
                },
                on: jest.fn((event, callback) => {
                    if (event === 'close') callback(1);
                })
            });

            // Mock createQuickPick for current test menu structure
            const mockQuickPick = {
                title: '',
                placeholder: '',
                ignoreFocusOut: false,
                items: [],
                onDidAccept: jest.fn(),
                onDidHide: jest.fn(),
                show: jest.fn(),
                hide: jest.fn(),
                dispose: jest.fn()
            };
            (vscode.window.createQuickPick as jest.Mock).mockReturnValue(mockQuickPick);

            await orchestrator.executeProjectTest('failing-project');

            // Verify post-test actions menu is created with correct structure
            expect(vscode.window.createQuickPick).toHaveBeenCalled();
            expect(mockQuickPick.title).toContain('❌');
            expect(mockQuickPick.title).toContain('tests failed');
            expect(mockQuickPick.placeholder).toBe('What would you like to do next?');
            
            // Verify menu items include Back button and Test Again
            expect(mockQuickPick.items).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        label: '$(arrow-left) Back',
                        id: 'back'
                    }),
                    expect.objectContaining({
                        label: '$(refresh) Test Again',
                        id: 'test-again'
                    }),
                    expect.objectContaining({
                        label: '🤖 Send to Copilot Chat',
                        id: 'copilot'
                    })
                ])
            );
        });
    });

    describe('Performance & User Experience', () => {
        test('should track performance metrics throughout workflow', async () => {
            const performanceTracker = serviceContainer.performanceTracker;
            const trackCommandSpy = jest.spyOn(performanceTracker, 'trackCommand');

            await orchestrator.runAutoDetectProjects();

            // Verify performance tracking
            expect(trackCommandSpy).toHaveBeenCalled();
        });

        test('should provide status updates during long operations', async () => {
            // Mock long-running operation
            const { spawn } = require('child_process');
            (spawn as jest.Mock).mockReturnValue({
                stdout: {
                    on: jest.fn((event, callback) => {
                        if (event === 'data') {
                            // Simulate slow test output
                            setTimeout(() => callback('Running tests...\n'), 100);
                            setTimeout(() => callback('PASS test1\n'), 200);
                            setTimeout(() => callback('PASS test2\n'), 300);
                        }
                    })
                },
                stderr: { on: jest.fn() },
                on: jest.fn((event, callback) => {
                    if (event === 'close') {
                        setTimeout(() => callback(0), 400);
                    }
                })
            });

            await orchestrator.executeProjectTest('slow-project');

            // Verify status updates
            expect(serviceContainer.statusBarItem.text).toContain('AI Context Util');
        });
    });

    describe('Configuration & Setup', () => {
        test('should handle workspace without projects gracefully', async () => {
            // Mock empty project discovery
            jest.spyOn(serviceContainer.projectDiscovery, 'getAllProjects')
                .mockResolvedValue([]);

            await orchestrator.showProjectBrowser();

            // Verify graceful handling
            expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
                expect.stringContaining('No projects found')
            );
        });

        test('should provide workspace information', async () => {
            // Mock project and framework detection
            jest.spyOn(serviceContainer.projectDiscovery, 'getAllProjects')
                .mockResolvedValue([
                    { name: 'app', path: '/test/app', type: 'application', projectJsonPath: '/test/app/project.json' },
                    { name: 'lib', path: '/test/lib', type: 'library', projectJsonPath: '/test/lib/project.json' }
                ]);

            jest.spyOn(serviceContainer.configManager, 'getDetectedFrameworks')
                .mockReturnValue([
                    { 
                        name: 'Angular', 
                        version: '17.0.0', 
                        type: 'spa', 
                        testCommand: 'ng test',
                        confidence: 0.9,
                        indicators: ['angular.json']
                    },
                    { 
                        name: 'Nx', 
                        version: '18.0.0', 
                        type: 'monorepo', 
                        testCommand: 'nx test',
                        confidence: 0.8,
                        indicators: ['nx.json']
                    }
                ]);

            await orchestrator.showWorkspaceInfo();

            // Verify information display
            expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
                expect.stringContaining('Projects found: 2')
            );
        });

        test('should re-run project tests based on context documents', async () => {
            const fs = require('fs');
            
            // Mock context directory exists
            (fs.existsSync as jest.Mock).mockImplementation((path: string) => {
                if (path.includes('ai-utilities-context')) return true;
                if (path.includes('test-output.txt')) return true;
                return false;
            });
            
            // Mock test output file with project information
            (fs.readFileSync as jest.Mock).mockReturnValue('yarn nx test user-service\nTests completed');
            
            // Mock executeProjectTest method
            const executeProjectTestSpy = jest.spyOn(orchestrator, 'executeProjectTest')
                .mockResolvedValue(undefined);
            
            await orchestrator.rerunProjectTestsFromContext();
            
            // Verify project extraction and test execution
            expect(executeProjectTestSpy).toHaveBeenCalledWith('user-service', { previousMenu: 'context-browser' });
        });
    });
});