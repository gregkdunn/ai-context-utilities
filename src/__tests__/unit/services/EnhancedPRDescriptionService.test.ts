/**
 * Enhanced PR Description Service Tests
 * Tests for Phase 3.5.2 implementation
 */

import { EnhancedPRDescriptionService } from '../../../services/EnhancedPRDescriptionService';
import { ServiceContainer } from '../../../core/ServiceContainer';
import { TestResult } from '../../../services/TestExecutionService';

// Mock dependencies
jest.mock('../../../services/GitDiffAnalysisService');
jest.mock('../../../services/TemplateDetectionService');
jest.mock('../../../services/ContentGenerationService');
jest.mock('../../../utils/CopilotUtils');

describe('EnhancedPRDescriptionService', () => {
    let service: EnhancedPRDescriptionService;
    let mockServices: ServiceContainer;

    beforeEach(() => {
        mockServices = {
            workspaceRoot: '/test/workspace',
            outputChannel: {
                appendLine: jest.fn(),
                show: jest.fn(),
                clear: jest.fn()
            } as any,
            errorHandler: {
                handleError: jest.fn()
            } as any
        } as ServiceContainer;

        service = new EnhancedPRDescriptionService(mockServices);
    });

    describe('generateEnhancedPRDescription', () => {
        test('should generate PR description with test results', async () => {
            const testResult: TestResult = {
                success: true,
                exitCode: 0,
                duration: 5000,
                stdout: 'test output',
                stderr: '',
                project: 'test-project',
                summary: {
                    total: 10,
                    passed: 10,
                    failed: 0,
                    skipped: 0,
                    failures: []
                }
            };

            // Mock the internal services
            const mockDiffAnalysis = {
                fileChanges: { added: ['file1.ts'], modified: ['file2.ts'], deleted: [], renamed: [], moved: [] },
                codeAnalysis: { newComponents: [], modifiedComponents: [], newFunctions: [], modifiedFunctions: [], deletedFunctions: [], newValidators: [], testFiles: [] },
                businessContext: { featureFlags: [], jiraTickets: [], breakingChanges: [], dependencies: { added: [], updated: [], removed: [] }, migrations: [] },
                impact: { riskLevel: 'low' as const, affectedAreas: [], testingPriority: [], deploymentNotes: [] }
            };

            const mockTemplate = {
                format: 'markdown-headers' as const,
                sections: [{ name: 'Summary', headerFormat: '##' as const, required: true, contentType: 'paragraph' as const }],
                jiraPosition: 'none' as const,
                imageSupport: false,
                customFields: [],
                estimatedLength: 'medium' as const,
                source: 'detected' as const,
                templateContent: '## Summary\nBrief description'
            };

            // Mock service methods
            (service as any).diffAnalysisService = {
                analyzeDiff: jest.fn().mockResolvedValue(mockDiffAnalysis)
            };
            (service as any).templateDetectionService = {
                detectTemplate: jest.fn().mockResolvedValue(mockTemplate)
            };
            (service as any).promptTemplateEngine = {
                generateComprehensivePrompt: jest.fn().mockReturnValue('Generated prompt')
            };

            // Mock CopilotUtils
            const mockCopilotUtils = {
                integrateWithCopilot: jest.fn().mockResolvedValue({ method: 'auto' })
            };
            require('../../../utils/CopilotUtils').CopilotUtils = mockCopilotUtils;

            const result = await service.generateEnhancedPRDescription(testResult, {
                generatePromptOnly: true
            });

            expect(result.success).toBe(true);
            expect(result.context).toEqual({
                filesChanged: 2,
                featureFlags: 0,
                riskLevel: 'low',
                jiraTickets: []
            });
            expect(mockServices.outputChannel.appendLine).toHaveBeenCalledWith('🚀 Starting enhanced PR description generation...');
        });

        test('should handle errors gracefully', async () => {
            // Mock service to throw error
            (service as any).diffAnalysisService = {
                analyzeDiff: jest.fn().mockRejectedValue(new Error('Git diff failed'))
            };

            const result = await service.generateEnhancedPRDescription();

            expect(result.success).toBe(false);
            expect(result.error).toContain('Git diff failed');
        });

        test('should fallback to prompt-only mode when content generation fails', async () => {
            const mockDiffAnalysis = {
                fileChanges: { added: [], modified: [], deleted: [], renamed: [], moved: [] },
                codeAnalysis: { newComponents: [], modifiedComponents: [], newFunctions: [], modifiedFunctions: [], deletedFunctions: [], newValidators: [], testFiles: [] },
                businessContext: { featureFlags: [], jiraTickets: [], breakingChanges: [], dependencies: { added: [], updated: [], removed: [] }, migrations: [] },
                impact: { riskLevel: 'low' as const, affectedAreas: [], testingPriority: [], deploymentNotes: [] }
            };

            const mockTemplate = {
                format: 'markdown-headers' as const,
                sections: [],
                jiraPosition: 'none' as const,
                imageSupport: false,
                customFields: [],
                estimatedLength: 'short' as const,
                source: 'fallback' as const,
                templateContent: '## Summary\nFallback'
            };

            // Mock services
            (service as any).diffAnalysisService = {
                analyzeDiff: jest.fn().mockResolvedValue(mockDiffAnalysis)
            };
            (service as any).templateDetectionService = {
                detectTemplate: jest.fn().mockResolvedValue(mockTemplate)
            };
            (service as any).contentGenerationService = {
                generatePRDescription: jest.fn().mockResolvedValue({ success: false })
            };
            (service as any).promptTemplateEngine = {
                generateComprehensivePrompt: jest.fn().mockReturnValue('Fallback prompt')
            };

            const mockCopilotUtils = {
                integrateWithCopilot: jest.fn().mockResolvedValue({ method: 'manual' })
            };
            require('../../../utils/CopilotUtils').CopilotUtils = mockCopilotUtils;

            const result = await service.generateEnhancedPRDescription(undefined, {
                enhancedMode: true
            });

            expect(result.success).toBe(true);
            expect(mockServices.outputChannel.appendLine).toHaveBeenCalledWith('⚠️  AI generation failed, falling back to prompt mode');
        });
    });

    describe('validatePrerequisites', () => {
        test('should validate git repository', async () => {
            const mockExecAsync = jest.fn().mockResolvedValue({ stdout: 'On branch main' });
            
            // Mock the promisify function properly
            jest.doMock('util', () => ({
                promisify: jest.fn().mockReturnValue(mockExecAsync)
            }));

            // Mock fs.existsSync for package.json check
            jest.doMock('fs', () => ({
                existsSync: jest.fn().mockReturnValue(true)
            }));

            const result = await service.validatePrerequisites();

            expect(result.valid).toBe(true);
            expect(result.issues).toHaveLength(0);
        });

        test('should detect missing git repository', async () => {
            const mockExec = jest.fn().mockRejectedValue(new Error('Not a git repository'));
            require('child_process').exec = mockExec;
            require('util').promisify = jest.fn(() => mockExec);

            const result = await service.validatePrerequisites();

            expect(result.valid).toBe(false);
            expect(result.issues).toContain('Not in a git repository or git is not available');
        });
    });

    describe('getServiceStatus', () => {
        test('should return service capabilities', () => {
            const status = service.getServiceStatus();

            expect(status.available).toBe(true);
            expect(status.capabilities).toContain('Comprehensive git diff analysis');
            expect(status.capabilities).toContain('Quality-validated content generation');
            expect(status.limitations).toContain('Requires git repository');
        });
    });

    describe('generatePreview', () => {
        test('should generate quick preview', async () => {
            const mockDiffAnalysis = {
                fileChanges: { added: ['file1.ts'], modified: ['file2.ts'], deleted: [], renamed: [], moved: [] },
                impact: { riskLevel: 'medium' as const }
            };

            const mockTemplate = {
                sections: [{ name: 'Summary' }, { name: 'Changes' }, { name: 'QA' }],
                source: 'detected' as const
            };

            (service as any).diffAnalysisService = {
                analyzeDiff: jest.fn().mockResolvedValue(mockDiffAnalysis)
            };
            (service as any).templateDetectionService = {
                detectTemplate: jest.fn().mockResolvedValue(mockTemplate)
            };

            const preview = await service.generatePreview();

            expect(preview.filesSummary).toBe('2 files changed');
            expect(preview.templateSummary).toBe('3 sections (detected)');
            expect(preview.estimatedQuality).toBe('Medium');
        });

        test('should handle preview errors', async () => {
            (service as any).diffAnalysisService = {
                analyzeDiff: jest.fn().mockRejectedValue(new Error('Preview failed'))
            };

            const preview = await service.generatePreview();

            expect(preview.filesSummary).toBe('Analysis failed');
            expect(preview.templateSummary).toBe('Template detection failed');
            expect(preview.estimatedQuality).toBe('Unknown');
        });
    });
});