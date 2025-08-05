import { CopilotInstructionsGenerator, GeneratorOptions } from '../CopilotInstructionsGenerator';
import { ServiceContainer } from '../../../core/ServiceContainer';
import { InstructionBackupManager } from '../InstructionBackupManager';
import * as vscode from 'vscode';
import * as fs from 'fs';

// Mock dependencies
jest.mock('vscode');
jest.mock('fs');
jest.mock('../InstructionBackupManager');
jest.mock('../../../core/ServiceContainer');
jest.mock('../parsing/ESLintConfigParser');
jest.mock('../parsing/PrettierConfigParser');

const mockVscode = vscode as jest.Mocked<typeof vscode>;
const mockFs = fs as jest.Mocked<typeof fs>;

describe('CopilotInstructionsGenerator Integration Tests', () => {
    let generator: CopilotInstructionsGenerator;
    let mockServices: jest.Mocked<ServiceContainer>;
    let mockOutputChannel: jest.Mocked<vscode.OutputChannel>;
    let mockBackupManager: jest.Mocked<InstructionBackupManager>;
    let mockProgress: jest.Mocked<vscode.Progress<{ message?: string; increment?: number }>>;
    let mockToken: jest.Mocked<vscode.CancellationToken>;

    beforeEach(() => {
        // Mock ServiceContainer
        mockServices = {
            workspaceRoot: '/mock/workspace',
            workspaceAnalyzer: {
                analyze: jest.fn().mockResolvedValue({
                    frontendFrameworks: ['Angular 17.0.0'],
                    typescript: { version: '5.0.0', hasConfig: true },
                    testFrameworks: ['Jest 29.0.0'],
                    packageManagers: ['npm']
                })
            },
            outputChannel: {
                appendLine: jest.fn()
            },
            updateStatusBar: jest.fn()
        } as any;

        // Mock OutputChannel
        mockOutputChannel = {
            appendLine: jest.fn(),
            show: jest.fn(),
            dispose: jest.fn()
        } as any;

        // Mock BackupManager
        mockBackupManager = {
            checkExistingInstructions: jest.fn(),
            createBackup: jest.fn(),
            restoreFromBackup: jest.fn(),
            removeAndBackup: jest.fn()
        } as any;

        // Mock Progress and CancellationToken
        mockProgress = {
            report: jest.fn()
        } as any;

        mockToken = {
            isCancellationRequested: false,
            onCancellationRequested: jest.fn()
        } as any;

        generator = new CopilotInstructionsGenerator(mockServices, mockOutputChannel, mockBackupManager);

        jest.clearAllMocks();
    });

    describe('Full Workflow Integration', () => {
        it('should complete full generation workflow for new project', async () => {
            // Setup: No existing files
            mockBackupManager.checkExistingInstructions.mockResolvedValue({
                exists: false,
                files: [],
                hasBackup: false
            });

            // Mock UI interactions
            const mockShowSetupOptions = jest.fn().mockResolvedValue({ type: 'quick' });
            const mockShowPreview = jest.fn().mockResolvedValue(true);
            const mockShowSuccess = jest.fn();

            (generator as any).ui = {
                showSetupOptions: mockShowSetupOptions,
                showPreview: mockShowPreview,
                showSuccess: mockShowSuccess
            };

            // Mock framework detection
            const mockDetectFrameworks = jest.fn().mockResolvedValue([
                {
                    name: 'Angular',
                    version: '17.0.0',
                    confidence: 0.9,
                    features: ['control-flow', 'signals']
                },
                {
                    name: 'TypeScript',
                    version: '5.0.0',
                    confidence: 0.95,
                    features: ['strict-mode']
                }
            ]);

            (generator as any).frameworkDetector = {
                detectFrameworks: mockDetectFrameworks
            };

            // Mock ESLint parser
            const mockESLintParser = {
                parseConfiguration: jest.fn().mockResolvedValue({
                    rules: [
                        {
                            name: '@typescript-eslint/no-explicit-any',
                            severity: 'error',
                            translation: 'Always use specific types instead of "any"',
                            category: 'Type Safety'
                        },
                        {
                            name: 'prefer-const',
                            severity: 'warn',
                            translation: 'Prefer const for variables that are never reassigned',
                            category: 'Modern JavaScript'
                        }
                    ],
                    parser: '@typescript-eslint/parser',
                    plugins: ['@typescript-eslint'],
                    typeAware: true,
                    checkedPaths: ['.eslintrc.js', '.eslintrc.json'],
                    configPath: '/mock/workspace/.eslintrc.js'
                })
            };

            (generator as any).eslintParser = mockESLintParser;

            // Mock Prettier parser
            const mockPrettierParser = {
                parseConfiguration: jest.fn().mockResolvedValue({
                    options: {
                        semi: false,
                        singleQuote: true,
                        tabWidth: 2
                    },
                    instructions: [
                        'Omit semicolons at the end of statements',
                        'Use single quotes for strings instead of double quotes',
                        'Use 2 spaces for indentation'
                    ],
                    checkedPaths: ['.prettierrc', '.prettierrc.json'],
                    configPath: '/mock/workspace/.prettierrc'
                })
            };

            (generator as any).prettierParser = mockPrettierParser;

            // Mock template engine
            const mockTemplateEngine = {
                generateMainInstructions: jest.fn().mockResolvedValue('# Main Instructions\n\nGeneral project guidelines.'),
                generateFrameworkInstructions: jest.fn().mockResolvedValue('# Framework Instructions\n\nFramework-specific guidelines.')
            };

            (generator as any).templateEngine = mockTemplateEngine;

            // Mock file manager
            const mockFileManager = {
                writeFile: jest.fn().mockResolvedValue(undefined)
            };

            (generator as any).fileManager = mockFileManager;

            // Mock user override manager
            const mockUserOverrideManager = {
                ensureOverrideFileExists: jest.fn().mockResolvedValue(undefined)
            };

            (generator as any).userOverrideManager = mockUserOverrideManager;

            // Execute the test
            await generator.run(mockProgress, mockToken);

            // Verify workflow steps
            expect(mockUserOverrideManager.ensureOverrideFileExists).toHaveBeenCalled();
            expect(mockShowSetupOptions).toHaveBeenCalled();
            expect(mockServices.workspaceAnalyzer.analyze).toHaveBeenCalled();
            expect(mockESLintParser.parseConfiguration).toHaveBeenCalledWith('/mock/workspace');
            expect(mockPrettierParser.parseConfiguration).toHaveBeenCalled();
            expect(mockDetectFrameworks).toHaveBeenCalled();
            expect(mockShowPreview).toHaveBeenCalled();
            expect(mockShowSuccess).toHaveBeenCalledWith('Copilot instructions generated successfully!');

            // Verify file writing
            expect(mockFileManager.writeFile).toHaveBeenCalledWith(
                '.github/instructions/copilot-instructions.md',
                expect.stringContaining('# GitHub Copilot Instructions')
            );
            expect(mockFileManager.writeFile).toHaveBeenCalledWith(
                '.github/instructions/frameworks/eslint-rules.instructions.md',
                expect.stringContaining('# TypeScript Development Guidelines')
            );
            expect(mockFileManager.writeFile).toHaveBeenCalledWith(
                '.github/instructions/frameworks/prettier-formatting.instructions.md',
                expect.stringContaining('# Code Formatting Guidelines')
            );

            // Verify progress reporting
            expect(mockProgress.report).toHaveBeenCalledWith({ message: 'Setting up user overrides...', increment: 5 });
            expect(mockProgress.report).toHaveBeenCalledWith({ message: 'Parsing ESLint rules...', increment: 15 });
            expect(mockProgress.report).toHaveBeenCalledWith({ message: 'Writing instruction files...', increment: 40 });
        });

        it('should handle existing files with backup workflow', async () => {
            // Setup: Existing files detected
            mockBackupManager.checkExistingInstructions.mockResolvedValue({
                exists: true,
                files: ['.github/copilot-instructions.md'],
                hasBackup: false
            });

            // Mock UI to choose update option
            const mockHandleExistingFiles = jest.fn().mockResolvedValue('update');
            const mockShowSetupOptions = jest.fn().mockResolvedValue({ type: 'quick' });
            const mockShowPreview = jest.fn().mockResolvedValue(true);
            const mockShowSuccess = jest.fn();

            (generator as any).ui = {
                handleExistingFiles: mockHandleExistingFiles,
                showSetupOptions: mockShowSetupOptions,
                showPreview: mockShowPreview,
                showSuccess: mockShowSuccess
            };

            // Mock minimal required components for workflow
            (generator as any).frameworkDetector = { detectFrameworks: jest.fn().mockResolvedValue([]) };
            (generator as any).eslintParser = { parseConfiguration: jest.fn().mockResolvedValue(null) };
            (generator as any).prettierParser = { parseConfiguration: jest.fn().mockResolvedValue(null) };
            (generator as any).templateEngine = { 
                generateMainInstructions: jest.fn().mockResolvedValue('# Instructions'),
                generateFrameworkInstructions: jest.fn().mockResolvedValue('# Framework Instructions')
            };
            (generator as any).fileManager = { writeFile: jest.fn() };
            (generator as any).userOverrideManager = { ensureOverrideFileExists: jest.fn() };

            await generator.run(mockProgress, mockToken);

            // Verify backup was created before proceeding
            expect(mockHandleExistingFiles).toHaveBeenCalledWith(false);
            expect(mockBackupManager.createBackup).toHaveBeenCalledWith(['.github/copilot-instructions.md']);
            expect(mockShowSuccess).toHaveBeenCalled();
        });

        it('should handle restore workflow', async () => {
            // Setup: Existing files with backup available
            mockBackupManager.checkExistingInstructions.mockResolvedValue({
                exists: true,
                files: ['.github/copilot-instructions.md'],
                hasBackup: true
            });

            // Mock UI to choose restore option
            const mockHandleExistingFiles = jest.fn().mockResolvedValue('restore');
            const mockShowRestoreUI = jest.fn().mockResolvedValue('backup-2024-01-15');
            const mockShowSuccess = jest.fn();

            (generator as any).ui = {
                handleExistingFiles: mockHandleExistingFiles,
                showRestoreUI: mockShowRestoreUI,
                showSuccess: mockShowSuccess
            };

            await generator.run(mockProgress, mockToken);

            // Verify restore workflow
            expect(mockHandleExistingFiles).toHaveBeenCalledWith(true);
            expect(mockShowRestoreUI).toHaveBeenCalled();
            expect(mockBackupManager.restoreFromBackup).toHaveBeenCalledWith('backup-2024-01-15');
            expect(mockShowSuccess).toHaveBeenCalledWith('Instructions restored from backup');
        });

        it('should handle cancellation gracefully', async () => {
            mockBackupManager.checkExistingInstructions.mockResolvedValue({
                exists: false,
                files: [],
                hasBackup: false
            });

            // Mock cancellation after workspace analysis
            mockToken.isCancellationRequested = false;
            let cancelAfterAnalysis = false;

            const mockAnalyze = jest.fn().mockImplementation(async () => {
                if (cancelAfterAnalysis) {
                    mockToken.isCancellationRequested = true;
                }
                cancelAfterAnalysis = true;
                return { 
                    frontendFrameworks: [],
                    typescript: { version: '5.0.0', hasConfig: true },
                    testFrameworks: [],
                    packageManagers: ['npm']
                };
            });

            mockServices.workspaceAnalyzer.analyze = mockAnalyze;

            (generator as any).ui = {
                showSetupOptions: jest.fn().mockResolvedValue({ type: 'quick' })
            };
            (generator as any).userOverrideManager = { 
                ensureOverrideFileExists: jest.fn() 
            };
            (generator as any).eslintParser = { 
                parseConfiguration: jest.fn().mockResolvedValue(null) 
            };

            await expect(generator.run(mockProgress, mockToken)).rejects.toThrow('Operation cancelled');

            expect(mockAnalyze).toHaveBeenCalled();
        });
    });

    describe('Error Handling Integration', () => {
        it('should handle ESLint parsing errors gracefully', async () => {
            mockBackupManager.checkExistingInstructions.mockResolvedValue({
                exists: false,
                files: [],
                hasBackup: false
            });

            // Mock ESLint parser to throw error
            const mockESLintParser = {
                parseConfiguration: jest.fn().mockRejectedValue(new Error('ESLint config error'))
            };

            (generator as any).eslintParser = mockESLintParser;
            (generator as any).ui = {
                showSetupOptions: jest.fn().mockResolvedValue({ type: 'quick' }),
                showPreview: jest.fn().mockResolvedValue(true),
                showSuccess: jest.fn()
            };
            (generator as any).userOverrideManager = { ensureOverrideFileExists: jest.fn() };
            (generator as any).prettierParser = { parseConfiguration: jest.fn().mockResolvedValue(null) };
            (generator as any).frameworkDetector = { detectFrameworks: jest.fn().mockResolvedValue([]) };
            (generator as any).templateEngine = { 
                generateMainInstructions: jest.fn().mockResolvedValue('# Instructions'),
                generateFrameworkInstructions: jest.fn().mockResolvedValue('# Framework Instructions')
            };
            (generator as any).fileManager = { writeFile: jest.fn() };

            // Should complete workflow despite ESLint error
            await generator.run(mockProgress, mockToken);

            expect(mockESLintParser.parseConfiguration).toHaveBeenCalled();
            // Workflow should continue without ESLint-based instructions
            expect((generator as any).ui.showSuccess).toHaveBeenCalled();
        });

        it('should handle file writing errors', async () => {
            mockBackupManager.checkExistingInstructions.mockResolvedValue({
                exists: false,
                files: [],
                hasBackup: false
            });

            // Mock file manager to throw error
            const mockFileManager = {
                writeFile: jest.fn().mockRejectedValue(new Error('File write error'))
            };

            (generator as any).fileManager = mockFileManager;
            (generator as any).ui = {
                showSetupOptions: jest.fn().mockResolvedValue({ type: 'quick' }),
                showPreview: jest.fn().mockResolvedValue(true)
            };
            (generator as any).userOverrideManager = { ensureOverrideFileExists: jest.fn() };
            (generator as any).eslintParser = { parseConfiguration: jest.fn().mockResolvedValue(null) };
            (generator as any).prettierParser = { parseConfiguration: jest.fn().mockResolvedValue(null) };
            (generator as any).frameworkDetector = { detectFrameworks: jest.fn().mockResolvedValue([]) };
            (generator as any).templateEngine = { 
                generateMainInstructions: jest.fn().mockResolvedValue('# Instructions'),
                generateFrameworkInstructions: jest.fn().mockResolvedValue('# Framework Instructions')
            };

            await expect(generator.run(mockProgress, mockToken)).rejects.toThrow('File write error');
        });
    });

    describe('Content Generation Integration', () => {
        it('should generate comprehensive instruction set', async () => {
            mockBackupManager.checkExistingInstructions.mockResolvedValue({
                exists: false,
                files: [],
                hasBackup: false
            });

            // Setup rich test data
            const mockESLintRules = [
                {
                    name: '@typescript-eslint/no-explicit-any',
                    severity: 'error' as const,
                    translation: 'Always use specific types instead of "any"',
                    category: 'Type Safety'
                },
                {
                    name: '@typescript-eslint/consistent-type-imports',
                    severity: 'warn' as const,
                    translation: 'Prefer to use "import type" for type-only imports',
                    category: 'Import Organization'
                }
            ];

            const mockPrettierInstructions = [
                'Omit semicolons at the end of statements',
                'Use single quotes for strings',
                'Use 2 spaces for indentation'
            ];

            const mockFrameworks = [
                {
                    name: 'Angular',
                    version: '17.0.0',
                    confidence: 0.9,
                    features: ['control-flow', 'signals']
                }
            ];

            // Mock all components
            (generator as any).ui = {
                showSetupOptions: jest.fn().mockResolvedValue({ type: 'quick' }),
                showPreview: jest.fn().mockResolvedValue(true),
                showSuccess: jest.fn()
            };
            (generator as any).userOverrideManager = { ensureOverrideFileExists: jest.fn() };
            (generator as any).eslintParser = {
                parseConfiguration: jest.fn().mockResolvedValue({
                    rules: mockESLintRules,
                    parser: '@typescript-eslint/parser',
                    plugins: ['@typescript-eslint'],
                    typeAware: true,
                    checkedPaths: ['.eslintrc.js'],
                    configPath: '/mock/workspace/.eslintrc.js'
                })
            };
            (generator as any).prettierParser = {
                parseConfiguration: jest.fn().mockResolvedValue({
                    instructions: mockPrettierInstructions,
                    options: { semi: false, singleQuote: true },
                    checkedPaths: ['.prettierrc'],
                    configPath: '/mock/workspace/.prettierrc'
                })
            };
            (generator as any).frameworkDetector = {
                detectFrameworks: jest.fn().mockResolvedValue(mockFrameworks)
            };
            (generator as any).templateEngine = {
                generateMainInstructions: jest.fn().mockResolvedValue('# Main Instructions'),
                generateFrameworkInstructions: jest.fn().mockResolvedValue('# Angular Guidelines')
            };

            const mockWriteFile = jest.fn();
            (generator as any).fileManager = { writeFile: mockWriteFile };

            await generator.run(mockProgress, mockToken);

            // Verify comprehensive file generation
            expect(mockWriteFile).toHaveBeenCalledWith(
                '.github/instructions/copilot-instructions.md',
                expect.stringContaining('applyTo: "**/*"')
            );
            expect(mockWriteFile).toHaveBeenCalledWith(
                '.github/instructions/frameworks/eslint-rules.instructions.md',
                expect.stringContaining('Type Safety')
            );
            expect(mockWriteFile).toHaveBeenCalledWith(
                '.github/instructions/frameworks/prettier-formatting.instructions.md',
                expect.stringContaining('Code Formatting Guidelines')
            );
            expect(mockWriteFile).toHaveBeenCalledWith(
                '.github/instructions/frameworks/angular.instructions.md',
                expect.stringContaining('# Angular Guidelines')
            );

            // Verify content quality
            const eslintCall = mockWriteFile.mock.calls.find(call => 
                call[0].includes('eslint-rules.instructions.md')
            );
            expect(eslintCall[1]).toContain('Always use specific types instead of "any"');
            expect(eslintCall[1]).toContain('## Type Safety');
            expect(eslintCall[1]).toContain('## Import Organization');

            const angularCall = mockWriteFile.mock.calls.find(call => 
                call[0].includes('angular.instructions.md')
            );
            expect(angularCall[1]).toContain('priority: 100');
            expect(angularCall[1]).toContain('version: 17.0.0');
        });
    });
});