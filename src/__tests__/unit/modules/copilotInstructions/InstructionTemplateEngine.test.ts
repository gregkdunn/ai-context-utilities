/**
 * Tests for InstructionTemplateEngine
 */

import { InstructionTemplateEngine } from '../../../../modules/copilotInstructions/InstructionTemplateEngine';
import { WorkspaceAnalysis } from '../../../../utils/WorkspaceAnalyzer';
import { FrameworkTemplates } from '../../../../modules/copilotInstructions/templates/FrameworkTemplates';

// Mock dependencies
jest.mock('../../../../modules/copilotInstructions/templates/FrameworkTemplates');

describe('InstructionTemplateEngine', () => {
    let templateEngine: InstructionTemplateEngine;
    let mockWorkspace: WorkspaceAnalysis;

    beforeEach(() => {
        templateEngine = new InstructionTemplateEngine('/test/workspace');
        
        mockWorkspace = {
            frontendFrameworks: ['Angular 15.0.0'],
            testFrameworks: ['Jest 29.0.0'],
            buildTools: ['webpack', 'babel'],
            packageManager: 'npm',
            typescript: {
                version: '4.8.0',
                hasConfig: true
            }
        } as WorkspaceAnalysis;

        jest.clearAllMocks();
    });

    describe('Constructor', () => {
        test('should create instance with workspace root', () => {
            expect(templateEngine).toBeDefined();
            expect(templateEngine).toBeInstanceOf(InstructionTemplateEngine);
        });
    });

    describe('generateMainInstructions', () => {
        test('should generate main instructions template', async () => {
            const result = await templateEngine.generateMainInstructions(mockWorkspace);
            
            expect(result).toBeDefined();
            expect(typeof result).toBe('string');
            expect(result).toContain('Copilot Instructions for workspace');
            expect(result).toContain('Angular');
            expect(result).toContain('Jest');
            expect(result).toContain('TypeScript 4.8.0');
        });

        test('should handle workspace without frontend frameworks', async () => {
            const minimalWorkspace = {
                frontendFrameworks: [],
                testFrameworks: [],
                buildTools: [],
                packageManager: 'unknown',
                typescript: { version: null, hasConfig: false }
            } as WorkspaceAnalysis;

            const result = await templateEngine.generateMainInstructions(minimalWorkspace);
            
            expect(result).toBeDefined();
            expect(result).toContain('JavaScript');
            expect(result).toContain('no test framework detected');
        });
    });

    describe('generateFrameworkInstructions', () => {
        test('should generate framework-specific instructions', async () => {
            const mockTemplate = 'Angular {{version}} template with {{testFramework}}';
            (FrameworkTemplates.prototype.getTemplate as jest.Mock).mockReturnValue(mockTemplate);

            const result = await templateEngine.generateFrameworkInstructions('angular', mockWorkspace);
            
            expect(result).toBe('Angular 15.0 template with Jest');
        });

        test('should return null for unknown framework', async () => {
            (FrameworkTemplates.prototype.getTemplate as jest.Mock).mockReturnValue(null);

            const result = await templateEngine.generateFrameworkInstructions('unknown', mockWorkspace);
            
            expect(result).toBeNull();
        });
    });

    describe('Framework Detection', () => {
        test('should detect TypeScript with version', async () => {
            const result = await templateEngine.generateMainInstructions(mockWorkspace);
            expect(result).toContain('TypeScript 4.8.0 (configured)');
        });

        test('should detect frontend frameworks', async () => {
            const result = await templateEngine.generateMainInstructions(mockWorkspace);
            expect(result).toContain('Frontend**: Angular');
        });

        test('should detect test frameworks', async () => {
            const result = await templateEngine.generateMainInstructions(mockWorkspace);
            expect(result).toContain('Testing**: Jest');
        });

        test('should detect build tools', async () => {
            const result = await templateEngine.generateMainInstructions(mockWorkspace);
            expect(result).toContain('Build**: webpack, babel');
        });

        test('should detect package manager', async () => {
            const result = await templateEngine.generateMainInstructions(mockWorkspace);
            expect(result).toContain('Package Manager**: npm');
        });
    });

    describe('Framework Links Generation', () => {
        test('should generate Angular framework links', async () => {
            const result = await templateEngine.generateMainInstructions(mockWorkspace);
            expect(result).toContain('Angular Best Practices');
            expect(result).toContain('Angular LLM Documentation');
        });

        test('should generate TypeScript guidelines link', async () => {
            const result = await templateEngine.generateMainInstructions(mockWorkspace);
            expect(result).toContain('TypeScript Guidelines');
        });

        test('should generate Jest testing patterns link', async () => {
            const result = await templateEngine.generateMainInstructions(mockWorkspace);
            expect(result).toContain('Jest Testing Patterns');
        });

        test('should handle React framework', async () => {
            const reactWorkspace = {
                ...mockWorkspace,
                frontendFrameworks: ['React 18.0.0']
            };

            const result = await templateEngine.generateMainInstructions(reactWorkspace);
            expect(result).toContain('React Best Practices');
        });
    });

    describe('Template Content', () => {
        test('should include AI Context Utilities section', async () => {
            const result = await templateEngine.generateMainInstructions(mockWorkspace);
            expect(result).toContain('AI Context Utilities');
            expect(result).toContain('ai-debug-context.txt');
            expect(result).toContain('diff.txt');
            expect(result).toContain('test-output.txt');
        });

        test('should include code style guidelines', async () => {
            const result = await templateEngine.generateMainInstructions(mockWorkspace);
            expect(result).toContain('Code Style Guidelines');
            expect(result).toContain('TypeScript strict mode');
            expect(result).toContain('meaningful variable');
        });

        test('should include testing guidelines', async () => {
            const result = await templateEngine.generateMainInstructions(mockWorkspace);
            expect(result).toContain('Testing Guidelines');
            expect(result).toContain('high code coverage');
            expect(result).toContain('TDD');
        });

        test('should include security guidelines', async () => {
            const result = await templateEngine.generateMainInstructions(mockWorkspace);
            expect(result).toContain('Security Guidelines');
            expect(result).toContain('sensitive data');
            expect(result).toContain('OWASP');
        });
    });
});