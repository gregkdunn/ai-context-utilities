/**
 * Template Detection Service
 * Phase 2 implementation of PR Description Enhancement Plan 3.5.2
 * Intelligently detects and analyzes PR template structures
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export interface TemplateSection {
    name: string;
    headerFormat: '##' | '**' | '###' | '####';
    required: boolean;
    contentType: 'paragraph' | 'list' | 'code' | 'mixed';
    examples?: string[];
    placeholder?: string;
    originalContent?: string;
}

export interface CustomField {
    name: string;
    pattern: string;
    required: boolean;
    type: 'text' | 'checkbox' | 'url' | 'dropdown';
    defaultValue?: string;
}

export interface TemplateStructure {
    format: 'markdown-headers' | 'bold-text' | 'mixed';
    sections: TemplateSection[];
    jiraPosition: 'top' | 'after-problem' | 'after-solution' | 'bottom' | 'none';
    imageSupport: boolean;
    customFields: CustomField[];
    estimatedLength: 'short' | 'medium' | 'long';
    source: 'detected' | 'default' | 'fallback';
    templateContent: string;
}

export interface TemplateDetectionOptions {
    workspaceRoot: string;
    outputChannel: vscode.OutputChannel;
}

/**
 * Service for intelligent PR template detection and analysis
 */
export class TemplateDetectionService {
    private readonly templatePaths: string[];

    constructor(private options: TemplateDetectionOptions) {
        this.templatePaths = [
            path.join(this.options.workspaceRoot, '.github', 'PULL_REQUEST_TEMPLATE.md'),
            path.join(this.options.workspaceRoot, '.github', 'pull_request_template.md'),
            path.join(this.options.workspaceRoot, '.github', 'PR_TEMPLATE.md'),
            path.join(this.options.workspaceRoot, '.github', 'templates', 'pull_request_template.md'),
            path.join(this.options.workspaceRoot, 'docs', 'PULL_REQUEST_TEMPLATE.md')
        ];
    }

    /**
     * Detect and analyze PR template structure
     */
    async detectTemplate(): Promise<TemplateStructure> {
        try {
            this.options.outputChannel.appendLine('🔍 Detecting PR template structure...');
            
            // Try to find existing template
            const templateContent = await this.findExistingTemplate();
            
            if (templateContent) {
                this.options.outputChannel.appendLine('✅ PR template found and analyzed');
                return this.analyzeTemplate(templateContent, 'detected');
            } else {
                this.options.outputChannel.appendLine('ℹ️  No PR template found, using default structure');
                return this.createDefaultTemplate();
            }
            
        } catch (error) {
            this.options.outputChannel.appendLine(`❌ Template detection failed: ${error}`);
            return this.createFallbackTemplate();
        }
    }

    /**
     * Find existing PR template in common locations
     */
    private async findExistingTemplate(): Promise<string | null> {
        for (const templatePath of this.templatePaths) {
            try {
                if (fs.existsSync(templatePath)) {
                    const content = await fs.promises.readFile(templatePath, 'utf8');
                    if (content.trim()) {
                        this.options.outputChannel.appendLine(`📋 Found PR template: ${this.getRelativePath(templatePath)}`);
                        return content;
                    }
                }
            } catch (error) {
                // Continue to next template path
            }
        }
        return null;
    }

    /**
     * Analyze template structure and extract metadata
     */
    private analyzeTemplate(content: string, source: 'detected' | 'default' | 'fallback'): TemplateStructure {
        const lines = content.split('\n');
        const sections = this.extractSections(lines);
        const format = this.detectFormat(lines);
        const jiraPosition = this.detectJiraPosition(lines);
        const imageSupport = this.detectImageSupport(content);
        const customFields = this.extractCustomFields(lines);
        const estimatedLength = this.estimateLength(content);

        return {
            format,
            sections,
            jiraPosition,
            imageSupport,
            customFields,
            estimatedLength,
            source,
            templateContent: content
        };
    }

    /**
     * Extract sections from template content
     */
    private extractSections(lines: string[]): TemplateSection[] {
        const sections: TemplateSection[] = [];
        let currentSection: Partial<TemplateSection> | null = null;
        let contentBuffer: string[] = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            // Detect section headers
            const headerMatch = this.detectSectionHeader(line);
            if (headerMatch) {
                // Save previous section
                if (currentSection) {
                    sections.push({
                        ...currentSection,
                        originalContent: contentBuffer.join('\n'),
                        contentType: this.analyzeContentType(contentBuffer)
                    } as TemplateSection);
                }

                // Start new section
                currentSection = {
                    name: headerMatch.title,
                    headerFormat: headerMatch.format,
                    required: this.isSectionRequired(headerMatch.title),
                    examples: [],
                    placeholder: this.extractPlaceholder(lines, i)
                };
                contentBuffer = [];
            } else if (currentSection) {
                contentBuffer.push(line);
            }
        }

        // Don't forget the last section
        if (currentSection) {
            sections.push({
                ...currentSection,
                originalContent: contentBuffer.join('\n'),
                contentType: this.analyzeContentType(contentBuffer)
            } as TemplateSection);
        }

        return sections;
    }

    /**
     * Detect section header format and extract title
     */
    private detectSectionHeader(line: string): { title: string; format: TemplateSection['headerFormat'] } | null {
        // Markdown headers (## Title)
        const markdownMatch = line.match(/^(#{2,4})\s+(.+)$/);
        if (markdownMatch) {
            return {
                title: markdownMatch[2].trim(),
                format: markdownMatch[1] as TemplateSection['headerFormat']
            };
        }

        // Bold headers (**Title**)
        const boldMatch = line.match(/^\*\*([^*]+)\*\*\s*$/);
        if (boldMatch) {
            return {
                title: boldMatch[1].trim(),
                format: '**'
            };
        }

        return null;
    }

    /**
     * Detect overall template format
     */
    private detectFormat(lines: string[]): TemplateStructure['format'] {
        let markdownHeaders = 0;
        let boldHeaders = 0;

        for (const line of lines) {
            if (line.match(/^#{2,4}\s+/)) markdownHeaders++;
            if (line.match(/^\*\*[^*]+\*\*\s*$/)) boldHeaders++;
        }

        if (markdownHeaders > 0 && boldHeaders > 0) return 'mixed';
        if (boldHeaders > 0) return 'bold-text';
        return 'markdown-headers';
    }

    /**
     * Detect JIRA ticket position in template
     */
    private detectJiraPosition(lines: string[]): TemplateStructure['jiraPosition'] {
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].toLowerCase();
            
            if (line.includes('jira') || line.includes('ticket')) {
                if (i < 5) return 'top';
                
                // Look for context around JIRA mention
                const context = lines.slice(Math.max(0, i - 3), i + 3).join(' ').toLowerCase();
                if (context.includes('problem') || context.includes('issue')) return 'after-problem';
                if (context.includes('solution') || context.includes('changes')) return 'after-solution';
                
                return 'bottom';
            }
        }

        return 'none';
    }

    /**
     * Detect image support in template
     */
    private detectImageSupport(content: string): boolean {
        return content.includes('![') || 
               content.includes('screenshot') || 
               content.includes('image') ||
               content.includes('visual') ||
               content.toLowerCase().includes('attach');
    }

    /**
     * Extract custom fields from template
     */
    private extractCustomFields(lines: string[]): CustomField[] {
        const customFields: CustomField[] = [];

        for (const line of lines) {
            // Checkbox fields
            const checkboxMatch = line.match(/- \[ \]\s*(.+)/);
            if (checkboxMatch) {
                customFields.push({
                    name: checkboxMatch[1].trim(),
                    pattern: line,
                    required: false,
                    type: 'checkbox'
                });
            }

            // URL/Link fields
            if (line.includes('[') && line.includes('](')) {
                const linkMatch = line.match(/\[([^\]]+)\]\([^)]*\)/);
                if (linkMatch) {
                    customFields.push({
                        name: linkMatch[1],
                        pattern: line,
                        required: false,
                        type: 'url'
                    });
                }
            }

            // Placeholder fields
            const placeholderMatch = line.match(/<!--\s*(.+)\s*-->/);
            if (placeholderMatch) {
                customFields.push({
                    name: placeholderMatch[1].trim(),
                    pattern: line,
                    required: true,
                    type: 'text',
                    defaultValue: placeholderMatch[1].trim()
                });
            }
        }

        return customFields;
    }

    /**
     * Estimate template length category
     */
    private estimateLength(content: string): TemplateStructure['estimatedLength'] {
        const wordCount = content.split(/\s+/).length;
        const lineCount = content.split('\n').length;

        if (wordCount < 100 && lineCount < 20) return 'short';
        if (wordCount < 300 && lineCount < 50) return 'medium';
        return 'long';
    }

    /**
     * Analyze content type of section
     */
    private analyzeContentType(contentLines: string[]): TemplateSection['contentType'] {
        const content = contentLines.join('\n');
        
        if (content.includes('```') || content.includes('`')) return 'code';
        
        let listItems = 0;
        let paragraphs = 0;
        
        for (const line of contentLines) {
            if (line.trim().match(/^[-*+]\s/) || line.trim().match(/^\d+\.\s/)) listItems++;
            if (line.trim() && !line.match(/^[-*+#]/)) paragraphs++;
        }
        
        if (listItems > 0 && paragraphs > 0) return 'mixed';
        if (listItems > 0) return 'list';
        return 'paragraph';
    }

    /**
     * Check if section is typically required
     */
    private isSectionRequired(sectionName: string): boolean {
        const requiredSections = [
            'summary', 'description', 'changes', 'what', 'why',
            'problem', 'solution', 'issue', 'fix'
        ];
        
        const lowerName = sectionName.toLowerCase();
        return requiredSections.some(req => lowerName.includes(req));
    }

    /**
     * Extract placeholder text near header
     */
    private extractPlaceholder(lines: string[], headerIndex: number): string | undefined {
        // Look for comment or placeholder in next few lines
        for (let i = headerIndex + 1; i < Math.min(lines.length, headerIndex + 5); i++) {
            const line = lines[i].trim();
            
            // HTML comment placeholders
            const commentMatch = line.match(/<!--\s*(.+)\s*-->/);
            if (commentMatch) return commentMatch[1].trim();
            
            // Markdown italic placeholders
            const italicMatch = line.match(/^_(.+)_$/);
            if (italicMatch) return italicMatch[1].trim();
            
            // Short descriptive lines
            if (line.length > 10 && line.length < 100 && !line.startsWith('#') && !line.startsWith('-')) {
                return line;
            }
        }
        
        return undefined;
    }

    /**
     * Create default template when none exists
     */
    private createDefaultTemplate(): TemplateStructure {
        const defaultContent = `## Summary
Brief description of the changes in this PR.

## Changes Made
- List the key changes
- Include technical details
- Mention any new features or fixes

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed

## QA Instructions
Specific steps for QA to test this change:
1. Step one
2. Step two
3. Expected behavior

## Additional Notes
Any additional context, considerations, or notes for reviewers.`;

        return this.analyzeTemplate(defaultContent, 'default');
    }

    /**
     * Create fallback template for error cases
     */
    private createFallbackTemplate(): TemplateStructure {
        const fallbackContent = `## Summary
Description of changes

## Changes
- Key modifications

## Testing
- [ ] Tests pass

## Notes
Additional information`;

        return this.analyzeTemplate(fallbackContent, 'fallback');
    }

    /**
     * Get relative path for display
     */
    private getRelativePath(fullPath: string): string {
        return path.relative(this.options.workspaceRoot, fullPath);
    }

    /**
     * Validate template structure quality
     */
    validateTemplate(template: TemplateStructure): {
        isValid: boolean;
        issues: string[];
        suggestions: string[];
    } {
        const issues: string[] = [];
        const suggestions: string[] = [];

        // Check for required sections
        const hasSummary = template.sections.some(s => 
            s.name.toLowerCase().includes('summary') || 
            s.name.toLowerCase().includes('description')
        );
        if (!hasSummary) {
            issues.push('Missing summary or description section');
        }

        const hasChanges = template.sections.some(s => 
            s.name.toLowerCase().includes('changes') || 
            s.name.toLowerCase().includes('what')
        );
        if (!hasChanges) {
            issues.push('Missing changes section');
        }

        const hasTesting = template.sections.some(s => 
            s.name.toLowerCase().includes('test') || 
            s.name.toLowerCase().includes('qa')
        );
        if (!hasTesting) {
            suggestions.push('Consider adding testing or QA section');
        }

        // Check format consistency
        const formats = template.sections.map(s => s.headerFormat);
        const uniqueFormats = [...new Set(formats)];
        if (uniqueFormats.length > 2) {
            suggestions.push('Consider using consistent header formatting');
        }

        // Check section count
        if (template.sections.length < 3) {
            suggestions.push('Template might benefit from more detailed sections');
        } else if (template.sections.length > 8) {
            suggestions.push('Template might be too complex - consider consolidating sections');
        }

        return {
            isValid: issues.length === 0,
            issues,
            suggestions
        };
    }

    /**
     * Generate improved template based on analysis
     */
    generateImprovedTemplate(current: TemplateStructure): string {
        const validation = this.validateTemplate(current);
        
        if (validation.isValid && validation.suggestions.length === 0) {
            return current.templateContent;
        }

        // Start with current content
        let improved = current.templateContent;

        // Add missing sections
        if (!current.sections.some(s => s.name.toLowerCase().includes('summary'))) {
            improved = `## Summary\nBrief description of the changes in this PR.\n\n${improved}`;
        }

        if (!current.sections.some(s => s.name.toLowerCase().includes('test'))) {
            improved += `\n## Testing\n- [ ] Unit tests pass\n- [ ] Integration tests pass\n- [ ] Manual testing completed`;
        }

        if (!current.sections.some(s => s.name.toLowerCase().includes('qa'))) {
            improved += `\n\n## QA Instructions\nSpecific steps for QA to test this change:\n1. Step one\n2. Step two\n3. Expected behavior`;
        }

        return improved;
    }
}