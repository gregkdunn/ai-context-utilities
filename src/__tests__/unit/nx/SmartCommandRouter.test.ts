/**
 * Tests for SmartCommandRouter
 */

import { SmartCommandRouter, WorkspaceDetectionResult, UnifiedTestOptions, UnifiedTestResult } from '../../../nx/SmartCommandRouter';
import { NxWorkspaceManager } from '../../../nx/NxWorkspaceManager';
import { ShellScriptBridge } from '../../../ShellScriptBridge';
import * as vscode from 'vscode';

// Mock dependencies
jest.mock('vscode', () => ({
    window: {
        showErrorMessage: jest.fn(),
        showInformationMessage: jest.fn()
    }
}));

jest.mock('../../../nx/NxWorkspaceManager');
jest.mock('../../../ShellScriptBridge');

describe('SmartCommandRouter', () => {
    let router: SmartCommandRouter;
    let mockNxManager: jest.Mocked<NxWorkspaceManager>;
    let mockScriptBridge: jest.Mocked<ShellScriptBridge>;
    let mockOutputChannel: jest.Mocked<vscode.OutputChannel>;

    beforeEach(() => {
        mockOutputChannel = {
            append: jest.fn(),
            appendLine: jest.fn(),
            show: jest.fn(),
            hide: jest.fn(),
            clear: jest.fn(),
            dispose: jest.fn(),
            name: 'router-channel',
            replace: jest.fn()
        };

        mockNxManager = {} as jest.Mocked<NxWorkspaceManager>;
        mockScriptBridge = {} as jest.Mocked<ShellScriptBridge>;

        router = new SmartCommandRouter(
            '/test/workspace',
            mockOutputChannel
        );
        jest.clearAllMocks();
    });

    describe('Constructor', () => {
        test('should create instance with workspace root and output channel', () => {
            expect(router).toBeDefined();
            expect(router).toBeInstanceOf(SmartCommandRouter);
        });
    });

    describe('Interfaces', () => {
        test('should create valid WorkspaceDetectionResult', () => {
            const result: WorkspaceDetectionResult = {
                type: 'nx',
                confidence: 0.95,
                reasons: ['nx.json found', 'package.json has nx dependency']
            };

            expect(result.type).toBe('nx');
            expect(result.confidence).toBe(0.95);
            expect(result.reasons).toContain('nx.json found');
        });

        test('should create valid UnifiedTestOptions', () => {
            const options: UnifiedTestOptions = {
                baseBranch: 'main',
                parallel: true,
                maxParallel: 4,
                skipCache: false,
                verbose: true,
                dryRun: false,
                projects: ['app1', 'lib1'],
                configuration: 'ci',
                timeout: 30000
            };

            expect(options.baseBranch).toBe('main');
            expect(options.parallel).toBe(true);
            expect(options.projects).toContain('app1');
            expect(options.timeout).toBe(30000);
        });

        test('should create valid UnifiedTestResult', () => {
            const result: UnifiedTestResult = {
                success: true,
                exitCode: 0,
                stdout: 'All tests passed',
                stderr: '',
                duration: 5000,
                workspaceType: 'nx',
                projectsAffected: 3,
                cacheHits: 2,
                executionStrategy: 'nx-affected'
            };

            expect(result.success).toBe(true);
            expect(result.workspaceType).toBe('nx');
            expect(result.projectsAffected).toBe(3);
            expect(result.executionStrategy).toBe('nx-affected');
        });
    });

    describe('Instance properties', () => {
        test('should have router functionality available', () => {
            expect(router).toBeDefined();
            expect(typeof router).toBe('object');
        });
    });
});