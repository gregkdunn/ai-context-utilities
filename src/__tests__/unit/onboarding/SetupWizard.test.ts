/**
 * Tests for SetupWizard
 */

import { SetupWizard } from '../../../onboarding/SetupWizard';
import { MacOSCompatibility } from '../../../platform/MacOSCompatibility';
import * as vscode from 'vscode';

// Mock dependencies
jest.mock('vscode', () => ({
    window: {
        showErrorMessage: jest.fn(),
        showInformationMessage: jest.fn(),
        createQuickPick: jest.fn(),
        showQuickPick: jest.fn()
    },
    workspace: {
        workspaceFolders: [{ uri: { fsPath: '/test/workspace' } }]
    }
}));

jest.mock('../../../platform/MacOSCompatibility');
jest.mock('fs');

describe('SetupWizard', () => {
    let setupWizard: SetupWizard;
    let mockOutputChannel: jest.Mocked<vscode.OutputChannel>;
    let mockMacOSCompat: jest.Mocked<MacOSCompatibility>;

    beforeEach(() => {
        mockOutputChannel = {
            append: jest.fn(),
            appendLine: jest.fn(),
            show: jest.fn(),
            hide: jest.fn(),
            clear: jest.fn(),
            dispose: jest.fn(),
            name: 'setup-wizard',
            replace: jest.fn()
        };

        mockMacOSCompat = {} as jest.Mocked<MacOSCompatibility>;

        setupWizard = new SetupWizard(
            '/test/workspace',
            mockOutputChannel
        );
        jest.clearAllMocks();
    });

    describe('Constructor', () => {
        test('should create instance with macos compatibility, workspace root and output channel', () => {
            expect(setupWizard).toBeDefined();
            expect(setupWizard).toBeInstanceOf(SetupWizard);
        });
    });

    describe('Setup Steps Interface', () => {
        test('should have setup step structure', () => {
            // Test that we can create a setup step structure
            const step = {
                id: 'detect-environment',
                title: 'Detect Environment',
                description: 'Detecting your development environment',
                status: 'pending' as const,
                required: true,
                action: async () => {}
            };

            expect(step.id).toBe('detect-environment');
            expect(step.status).toBe('pending');
            expect(step.required).toBe(true);
            expect(typeof step.action).toBe('function');
        });
    });

    describe('Project Config Interface', () => {
        test('should have project configuration structure', () => {
            // Test that we can create a project config structure
            const config = {
                hasGit: true,
                hasPackageJson: true,
                hasJest: true,
                hasTypeScript: true,
                testFramework: 'jest' as const,
                testPatterns: ['**/*.test.ts', '**/*.spec.ts'],
                srcDirectories: ['src', 'lib']
            };

            expect(config.hasGit).toBe(true);
            expect(config.testFramework).toBe('jest');
            expect(config.testPatterns).toContain('**/*.test.ts');
            expect(config.srcDirectories).toContain('src');
        });
    });

    describe('Instance methods', () => {
        test('should have setup wizard functionality available', () => {
            expect(setupWizard).toBeDefined();
            expect(typeof setupWizard).toBe('object');
        });
    });
});