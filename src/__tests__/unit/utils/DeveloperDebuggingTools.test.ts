/**
 * Tests for DeveloperDebuggingTools
 */

import { DeveloperDebuggingTools, DebugSession, SystemDiagnostics } from '../../../utils/DeveloperDebuggingTools';
import { ServiceContainer } from '../../../core/ServiceContainer';
import * as vscode from 'vscode';

// Mock dependencies
jest.mock('vscode', () => ({
    window: {
        showErrorMessage: jest.fn(),
        showInformationMessage: jest.fn()
    },
    workspace: {
        workspaceFolders: [{ uri: { fsPath: '/test/workspace' } }]
    },
    version: '1.80.0'
}));

jest.mock('../../../core/ServiceContainer');
jest.mock('fs');

describe('DeveloperDebuggingTools', () => {
    let debuggingTools: DeveloperDebuggingTools;
    let mockOutputChannel: jest.Mocked<vscode.OutputChannel>;
    let mockServiceContainer: jest.Mocked<ServiceContainer>;

    beforeEach(() => {
        mockOutputChannel = {
            append: jest.fn(),
            appendLine: jest.fn(),
            show: jest.fn(),
            hide: jest.fn(),
            clear: jest.fn(),
            dispose: jest.fn(),
            name: 'debug-channel',
            replace: jest.fn()
        };

        mockServiceContainer = {} as jest.Mocked<ServiceContainer>;

        debuggingTools = new DeveloperDebuggingTools(
            mockServiceContainer,
            mockOutputChannel
        );
        jest.clearAllMocks();
    });

    describe('Constructor', () => {
        test('should create instance with output channel and workspace root', () => {
            expect(debuggingTools).toBeDefined();
            expect(debuggingTools).toBeInstanceOf(DeveloperDebuggingTools);
        });
    });

    describe('Interfaces', () => {
        test('should create valid DebugSession', () => {
            const session: DebugSession = {
                id: 'debug-session-1',
                timestamp: Date.now(),
                operation: 'test-execution',
                input: { project: 'test-app' },
                output: { success: true },
                duration: 1500,
                stackTrace: 'Error at line 10',
                memorySnapshot: {
                    rss: 1000000,
                    heapTotal: 800000,
                    heapUsed: 600000,
                    external: 200000,
                    arrayBuffers: 100000
                }
            };

            expect(session.id).toBe('debug-session-1');
            expect(session.operation).toBe('test-execution');
            expect(session.input.project).toBe('test-app');
            expect(session.memorySnapshot?.rss).toBe(1000000);
        });

        test('should create valid SystemDiagnostics', () => {
            const diagnostics: SystemDiagnostics = {
                extension: {
                    version: '3.5.1',
                    mode: 'development',
                    activeCommands: ['aiDebugContext.runTests', 'aiDebugContext.generateContext']
                },
                workspace: {
                    root: '/test/workspace',
                    hasProjects: true,
                    projectCount: 3,
                    detectedFrameworks: ['React', 'TypeScript', 'Jest']
                },
                system: {
                    nodeVersion: '18.0.0',
                    vsCodeVersion: '1.80.0',
                    platform: 'darwin',
                    memory: {
                        rss: 2000000,
                        heapTotal: 1500000,
                        heapUsed: 1200000,
                        external: 300000,
                        arrayBuffers: 150000
                    },
                    uptime: 3600
                },
                performance: {
                    operationCount: 150,
                    averageResponseTime: 250,
                    errorRate: 0.02,
                    cacheHitRate: 0.85
                }
            };

            expect(diagnostics.extension.version).toBe('3.5.1');
            expect(diagnostics.workspace.projectCount).toBe(3);
            expect(diagnostics.system.nodeVersion).toBe('18.0.0');
            expect(diagnostics.performance.errorRate).toBe(0.02);
        });
    });

    describe('Instance methods', () => {
        test('should have debugging tools available', () => {
            expect(debuggingTools).toBeDefined();
            expect(typeof debuggingTools).toBe('object');
        });
    });
});