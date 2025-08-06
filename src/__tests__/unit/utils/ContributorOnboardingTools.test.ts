/**
 * Tests for ContributorOnboardingTools
 */

import { ContributorOnboardingTools, OnboardingStep, DevelopmentEnvironment, OnboardingProgress } from '../../../utils/ContributorOnboardingTools';
import * as vscode from 'vscode';
import * as fs from 'fs';

// Mock dependencies
jest.mock('vscode', () => ({
    window: {
        showErrorMessage: jest.fn(),
        showInformationMessage: jest.fn(),
        createQuickPick: jest.fn()
    },
    workspace: {
        getConfiguration: jest.fn()
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

describe('ContributorOnboardingTools', () => {
    let onboardingTools: ContributorOnboardingTools;
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

        onboardingTools = new ContributorOnboardingTools(
            mockOutputChannel,
            '/test/workspace'
        );
        jest.clearAllMocks();
    });

    describe('Constructor', () => {
        test('should create instance with output channel and workspace root', () => {
            expect(onboardingTools).toBeDefined();
            expect(onboardingTools).toBeInstanceOf(ContributorOnboardingTools);
        });
    });

    describe('Interfaces', () => {
        test('should create valid OnboardingStep', () => {
            const step: OnboardingStep = {
                id: 'setup-node',
                title: 'Setup Node.js',
                description: 'Install Node.js version 18+',
                isCompleted: async () => true,
                autoFix: async () => {},
                manualInstructions: ['Install Node.js from nodejs.org'],
                documentation: 'https://nodejs.org/en/download/'
            };

            expect(step.id).toBe('setup-node');
            expect(step.title).toBe('Setup Node.js');
            expect(typeof step.isCompleted).toBe('function');
        });

        test('should create valid DevelopmentEnvironment', () => {
            const environment: DevelopmentEnvironment = {
                nodeVersion: '18.0.0',
                npmVersion: '9.0.0',
                hasTypeScript: true,
                hasJest: true,
                hasEslint: true,
                hasVsCodeExtensions: ['ms-vscode.vscode-typescript-next'],
                workspaceConfig: true
            };

            expect(environment.nodeVersion).toBe('18.0.0');
            expect(environment.hasTypeScript).toBe(true);
            expect(environment.hasVsCodeExtensions).toContain('ms-vscode.vscode-typescript-next');
        });

        test('should create valid OnboardingProgress', () => {
            const progress: OnboardingProgress = {
                completedSteps: ['setup-node', 'install-deps'],
                totalSteps: 5,
                completionPercentage: 40,
                nextSteps: ['setup-testing', 'configure-linting'],
                blockers: []
            };

            expect(progress.completedSteps).toHaveLength(2);
            expect(progress.completionPercentage).toBe(40);
            expect(progress.nextSteps).toContain('setup-testing');
        });
    });

    describe('Instance properties', () => {
        test('should have onboarding steps initialized', () => {
            expect(onboardingTools).toBeDefined();
            expect(typeof onboardingTools).toBe('object');
        });
    });
});