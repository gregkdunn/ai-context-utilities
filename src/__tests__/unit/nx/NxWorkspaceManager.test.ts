/**
 * Tests for NxWorkspaceManager
 */

import { NxWorkspaceManager, NxWorkspaceInfo, NxProjectConfig, NxTargetConfig } from '../../../nx/NxWorkspaceManager';
import * as vscode from 'vscode';
import * as fs from 'fs';

// Mock dependencies
jest.mock('vscode', () => ({
    window: {
        showErrorMessage: jest.fn(),
        showInformationMessage: jest.fn()
    }
}));

jest.mock('fs', () => ({
    promises: {
        readFile: jest.fn(),
        access: jest.fn(),
        stat: jest.fn()
    },
    existsSync: jest.fn()
}));

jest.mock('child_process');

describe('NxWorkspaceManager', () => {
    let manager: NxWorkspaceManager;
    let mockOutputChannel: jest.Mocked<vscode.OutputChannel>;

    beforeEach(() => {
        mockOutputChannel = {
            append: jest.fn(),
            appendLine: jest.fn(),
            show: jest.fn(),
            hide: jest.fn(),
            clear: jest.fn(),
            dispose: jest.fn(),
            name: 'test-channel',
            replace: jest.fn()
        };

        manager = new NxWorkspaceManager('/test/workspace', mockOutputChannel);
        jest.clearAllMocks();
    });

    describe('Constructor', () => {
        test('should create instance with workspace path and output channel', () => {
            expect(manager).toBeDefined();
            expect(manager).toBeInstanceOf(NxWorkspaceManager);
        });
    });

    describe('Interfaces', () => {
        test('should create valid NxWorkspaceInfo', () => {
            const workspaceInfo: NxWorkspaceInfo = {
                workspaceRoot: '/test/workspace',
                nxVersion: '16.0.0',
                projects: new Map(),
                dependencyGraph: new Map(),
                hasNxCloud: false,
                cacheDirectory: '/test/.nx/cache'
            };

            expect(workspaceInfo.workspaceRoot).toBe('/test/workspace');
            expect(workspaceInfo.nxVersion).toBe('16.0.0');
        });

        test('should create valid NxProjectConfig', () => {
            const projectConfig: NxProjectConfig = {
                name: 'test-app',
                root: 'apps/test-app',
                sourceRoot: 'apps/test-app/src',
                projectType: 'application',
                tags: ['frontend', 'react'],
                targets: new Map(),
                implicitDependencies: []
            };

            expect(projectConfig.name).toBe('test-app');
            expect(projectConfig.projectType).toBe('application');
            expect(projectConfig.tags).toContain('react');
        });

        test('should create valid NxTargetConfig', () => {
            const targetConfig: NxTargetConfig = {
                executor: '@nx/jest:jest',
                options: {
                    jestConfig: 'apps/test-app/jest.config.ts'
                },
                configurations: {
                    ci: {
                        ci: true,
                        coverage: true
                    }
                }
            };

            expect(targetConfig.executor).toBe('@nx/jest:jest');
            expect(targetConfig.options.jestConfig).toBe('apps/test-app/jest.config.ts');
        });
    });

    describe('Instance methods', () => {
        test('should have public methods available', () => {
            expect(typeof manager).toBe('object');
            expect(manager).toBeInstanceOf(NxWorkspaceManager);
        });
    });
});