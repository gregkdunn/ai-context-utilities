/**
 * Template Detection Service Tests
 * Tests for Phase 2 template analysis functionality
 */

import { TemplateDetectionService } from '../../../services/TemplateDetectionService';
import * as fs from 'fs';
import * as path from 'path';

jest.mock('fs', () => ({
    existsSync: jest.fn(),
    promises: {
        readFile: jest.fn(),
        stat: jest.fn()
    }
}));

describe('TemplateDetectionService', () => {
    let service: TemplateDetectionService;
    let mockOutputChannel: any;

    beforeEach(() => {
        mockOutputChannel = {
            appendLine: jest.fn(),
            show: jest.fn(),
            clear: jest.fn()
        };

        service = new TemplateDetectionService({
            workspaceRoot: '/test/workspace',
            outputChannel: mockOutputChannel
        });

        jest.clearAllMocks();
    });

    describe('detectTemplate', () => {
        test('should detect existing markdown template', async () => {
            const templateContent = `## Summary
Brief description of the changes

## Changes Made
- List the key changes
- Include technical details

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass

## QA Instructions
1. Test the new feature
2. Verify edge cases`;

            (fs.existsSync as jest.Mock).mockReturnValue(true);
            (fs.promises.readFile as jest.Mock).mockResolvedValue(templateContent);

            const result = await service.detectTemplate();

            expect(result.source).toBe('detected');
            expect(result.format).toBe('markdown-headers');
            expect(result.sections).toHaveLength(4);
            expect(result.sections[0].name).toBe('Summary');
            expect(result.sections[0].headerFormat).toBe('##');
            expect(result.sections[1].name).toBe('Changes Made');
            expect(result.sections[2].name).toBe('Testing');
            expect(result.sections[3].name).toBe('QA Instructions');
        });

        test('should detect bold text format template', async () => {
            const templateContent = `**Summary**
Brief description

**Changes**
List of changes

**Testing**
Test information`;

            (fs.existsSync as jest.Mock).mockReturnValue(true);
            (fs.promises.readFile as jest.Mock).mockResolvedValue(templateContent);

            const result = await service.detectTemplate();

            expect(result.format).toBe('bold-text');
            expect(result.sections).toHaveLength(3);
            expect(result.sections[0].headerFormat).toBe('**');
        });

        test('should detect mixed format template', async () => {
            const templateContent = `## Summary
Brief description

**Changes**
List of changes

### Details
Technical details`;

            (fs.existsSync as jest.Mock).mockReturnValue(true);
            (fs.promises.readFile as jest.Mock).mockResolvedValue(templateContent);

            const result = await service.detectTemplate();

            expect(result.format).toBe('mixed');
            expect(result.sections).toHaveLength(3);
        });

        test('should detect JIRA position', async () => {
            const templateWithJira = `**JIRA:** PROJ-123

## Summary
Changes related to the ticket

## Solution
How we solved it`;

            (fs.existsSync as jest.Mock).mockReturnValue(true);
            (fs.promises.readFile as jest.Mock).mockResolvedValue(templateWithJira);

            const result = await service.detectTemplate();

            expect(result.jiraPosition).toBe('top');
        });

        test('should detect image support', async () => {
            const templateWithImages = `## Summary
Changes description

## Screenshots
![Screenshot](screenshot.png)

Please attach relevant screenshots`;

            (fs.existsSync as jest.Mock).mockReturnValue(true);
            (fs.promises.readFile as jest.Mock).mockResolvedValue(templateWithImages);

            const result = await service.detectTemplate();

            expect(result.imageSupport).toBe(true);
        });

        test('should extract custom fields', async () => {
            const templateWithFields = `## Summary
Description here

## Checklist
- [ ] Code review completed
- [ ] Tests added
- [ ] Documentation updated

## Links
[JIRA Ticket](https://jira.company.com/PROJ-123)

<!-- Please describe any breaking changes -->`;

            (fs.existsSync as jest.Mock).mockReturnValue(true);
            (fs.promises.readFile as jest.Mock).mockResolvedValue(templateWithFields);

            const result = await service.detectTemplate();

            expect(result.customFields.length).toBeGreaterThan(0);
            
            const checkboxFields = result.customFields.filter(f => f.type === 'checkbox');
            expect(checkboxFields).toHaveLength(3);
            
            const urlFields = result.customFields.filter(f => f.type === 'url');
            expect(urlFields).toHaveLength(1);
            
            const textFields = result.customFields.filter(f => f.type === 'text');
            expect(textFields).toHaveLength(1);
        });

        test('should create default template when none exists', async () => {
            (fs.existsSync as jest.Mock).mockReturnValue(false);

            const result = await service.detectTemplate();

            expect(result.source).toBe('default');
            expect(result.sections.length).toBeGreaterThan(0);
            expect(result.sections.some(s => s.name.includes('Summary'))).toBe(true);
            expect(result.sections.some(s => s.name.includes('Changes'))).toBe(true);
        });

        test('should create fallback template on error', async () => {
            // Mock the outputChannel to throw during logging to trigger main catch block
            mockOutputChannel.appendLine = jest.fn().mockImplementation((msg: string) => {
                if (msg.includes('Detecting PR template structure')) {
                    throw new Error('Output channel error');
                }
            });

            const result = await service.detectTemplate();

            expect(result.source).toBe('fallback');
            expect(result.sections.length).toBeGreaterThan(0);
        });

        test('should estimate template length correctly', async () => {
            const shortTemplate = `## Summary\nBrief\n## Changes\nSimple`;
            const mediumTemplate = shortTemplate + '\n'.repeat(20) + 'More content '.repeat(20);
            const longTemplate = mediumTemplate + '\n'.repeat(50) + 'Much more content '.repeat(50);

            // Test short template
            (fs.existsSync as jest.Mock).mockReturnValue(true);
            (fs.promises.readFile as jest.Mock).mockResolvedValue(shortTemplate);
            let result = await service.detectTemplate();
            expect(result.estimatedLength).toBe('short');

            // Test medium template
            (fs.promises.readFile as jest.Mock).mockResolvedValue(mediumTemplate);
            result = await service.detectTemplate();
            expect(result.estimatedLength).toBe('medium');

            // Test long template
            (fs.promises.readFile as jest.Mock).mockResolvedValue(longTemplate);
            result = await service.detectTemplate();
            expect(result.estimatedLength).toBe('long');
        });
    });

    describe('validateTemplate', () => {
        test('should validate template structure', () => {
            const validTemplate = {
                format: 'markdown-headers' as const,
                sections: [
                    { name: 'Summary', headerFormat: '##' as const, required: true, contentType: 'paragraph' as const },
                    { name: 'Changes', headerFormat: '##' as const, required: true, contentType: 'list' as const },
                    { name: 'Testing', headerFormat: '##' as const, required: false, contentType: 'mixed' as const }
                ],
                jiraPosition: 'none' as const,
                imageSupport: false,
                customFields: [],
                estimatedLength: 'medium' as const,
                source: 'detected' as const,
                templateContent: '## Summary\n## Changes\n## Testing'
            };

            const result = service.validateTemplate(validTemplate);

            expect(result.isValid).toBe(true);
            expect(result.issues).toHaveLength(0);
            expect(result.suggestions.length).toBeLessThanOrEqual(1);
        });

        test('should identify missing required sections', () => {
            const invalidTemplate = {
                format: 'markdown-headers' as const,
                sections: [
                    { name: 'Notes', headerFormat: '##' as const, required: false, contentType: 'paragraph' as const }
                ],
                jiraPosition: 'none' as const,
                imageSupport: false,
                customFields: [],
                estimatedLength: 'short' as const,
                source: 'detected' as const,
                templateContent: '## Notes'
            };

            const result = service.validateTemplate(invalidTemplate);

            expect(result.isValid).toBe(false);
            expect(result.issues).toContain('Missing summary or description section');
            expect(result.issues).toContain('Missing changes section');
        });

        test('should provide suggestions for improvement', () => {
            const templateWithoutTesting = {
                format: 'markdown-headers' as const,
                sections: [
                    { name: 'Summary', headerFormat: '##' as const, required: true, contentType: 'paragraph' as const },
                    { name: 'Changes', headerFormat: '##' as const, required: true, contentType: 'list' as const }
                ],
                jiraPosition: 'none' as const,
                imageSupport: false,
                customFields: [],
                estimatedLength: 'short' as const,
                source: 'detected' as const,
                templateContent: '## Summary\n## Changes'
            };

            const result = service.validateTemplate(templateWithoutTesting);

            expect(result.suggestions).toContain('Consider adding testing or QA section');
        });
    });

    describe('generateImprovedTemplate', () => {
        test('should return original template if already good', () => {
            const goodTemplate = {
                format: 'markdown-headers' as const,
                sections: [
                    { name: 'Summary', headerFormat: '##' as const, required: true, contentType: 'paragraph' as const },
                    { name: 'Changes', headerFormat: '##' as const, required: true, contentType: 'list' as const },
                    { name: 'Testing', headerFormat: '##' as const, required: false, contentType: 'mixed' as const }
                ],
                jiraPosition: 'none' as const,
                imageSupport: false,
                customFields: [],
                estimatedLength: 'medium' as const,
                source: 'detected' as const,
                templateContent: '## Summary\nDescription\n## Changes\nList\n## Testing\nTests'
            };

            const result = service.generateImprovedTemplate(goodTemplate);

            expect(result).toBe(goodTemplate.templateContent);
        });

        test('should add missing sections to improve template', () => {
            const incompleteTemplate = {
                format: 'markdown-headers' as const,
                sections: [
                    { name: 'Notes', headerFormat: '##' as const, required: false, contentType: 'paragraph' as const }
                ],
                jiraPosition: 'none' as const,
                imageSupport: false,
                customFields: [],
                estimatedLength: 'short' as const,
                source: 'detected' as const,
                templateContent: '## Notes\nSome notes'
            };

            const result = service.generateImprovedTemplate(incompleteTemplate);

            expect(result).toContain('## Summary');
            expect(result).toContain('## Testing');
            expect(result).toContain('## QA Instructions');
        });
    });
});