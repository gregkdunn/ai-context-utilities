/**
 * Prompt Template Engine
 * Phase 3 implementation of PR Description Enhancement Plan 3.5.2
 * Section-specific prompt engineering for high-quality content generation
 */

import { GitDiffAnalysis } from './GitDiffAnalysisService';
import { TemplateStructure } from './TemplateDetectionService';

export interface PRContext {
    diffAnalysis: GitDiffAnalysis;
    templateStructure: TemplateStructure;
    testResults?: {
        passed: number;
        total: number;
        status: 'PASSED' | 'FAILED';
        duration?: number;
    };
    userPreferences?: {
        tone: 'professional' | 'casual' | 'technical';
        detailLevel: 'brief' | 'detailed' | 'comprehensive';
        includeEmojis: boolean;
    };
}

export interface PromptTemplate {
    id: string;
    name: string;
    content: string;
    variables: string[];
    sectionType: 'summary' | 'changes' | 'qa' | 'details' | 'generic';
}

export interface GeneratedSection {
    sectionName: string;
    content: string;
    confidence: number;
    suggestions?: string[];
}

/**
 * Engine for generating section-specific prompts with intelligent context injection
 */
export class PromptTemplateEngine {
    private templates: Map<string, PromptTemplate> = new Map();

    constructor() {
        this.initializePromptTemplates();
    }

    /**
     * Generate section-specific prompt with context
     */
    generateSectionPrompt(sectionName: string, context: PRContext): string {
        const sectionType = this.categorizeSection(sectionName);
        const template = this.getTemplateForSection(sectionType);
        
        if (!template) {
            return this.generateGenericPrompt(sectionName, context);
        }

        return this.renderTemplate(template, context, sectionName);
    }

    /**
     * Generate complete PR description prompt with all sections
     */
    generateComprehensivePrompt(context: PRContext): string {
        const sections = context.templateStructure.sections;
        const businessSummary = this.createBusinessSummary(context);
        const technicalSummary = this.createTechnicalSummary(context);
        const qaInstructions = this.createQAInstructions(context);
        
        return `# 🎯 AI-Enhanced PR Description Generation

## 📋 Context Analysis Summary
${businessSummary}

## 🔧 Technical Changes Overview
${technicalSummary}

## 📊 Test Results Context
${this.formatTestResults(context.testResults)}

## 🎯 CRITICAL INSTRUCTIONS

**MAINTAIN EXACT TEMPLATE STRUCTURE**: The user has a specific PR template format. You MUST preserve:
- All existing headers exactly as they appear: ${sections.map(s => `"${s.name}"`).join(', ')}
- Header formatting: ${context.templateStructure.format}
- Section order and hierarchy
- Any checkboxes, links, or special formatting

**CONTENT GENERATION GUIDELINES**:
1. **Summary Section**: Focus on business value and user impact
2. **Changes Section**: List specific technical modifications  
3. **Testing Section**: Include actual test results (${context.testResults?.passed}/${context.testResults?.total} passed)
4. **QA Section**: Provide actionable manual testing steps

${qaInstructions}

## 📝 Original Template to Fill:
\`\`\`markdown
${context.templateStructure.templateContent}
\`\`\`

## 🎯 Expected Output
Return the completed PR description maintaining the exact template structure but with meaningful content based on the analysis above.`;
    }

    /**
     * Initialize built-in prompt templates
     */
    private initializePromptTemplates(): void {
        // Summary/Problem Section Template
        this.templates.set('summary', {
            id: 'summary',
            name: 'Summary Section Generator',
            sectionType: 'summary',
            variables: ['businessPurpose', 'filesSummary', 'jiraContext', 'userImpact'],
            content: `**🎯 SUMMARY SECTION GENERATION**

Based on the code analysis:
- Files changed: {filesSummary}
- Business context: {businessPurpose}
- JIRA reference: {jiraContext}
- User impact: {userImpact}

Generate a Summary/Problem section that:
1. States the business need or problem being solved
2. References specific components/features affected
3. Includes JIRA link if available  
4. Focuses on WHY this change was needed
5. Mentions user-visible impact

**Requirements:**
- Length: 2-3 sentences maximum
- Tone: Professional, business-focused
- Include: Business value, not technical implementation
- Avoid: Technical deep dives or implementation details

**Content Guidelines:**
- Use simple, readable language
- No technical jargon unless necessary
- Focus on user/business benefits
- Be specific about what problem this solves`
        });

        // Changes/Solution Section Template  
        this.templates.set('changes', {
            id: 'changes',
            name: 'Changes Section Generator',
            sectionType: 'changes',
            variables: ['newComponents', 'modifiedFunctions', 'validators', 'uiChanges', 'technicalApproach'],
            content: `**🔧 CHANGES SECTION GENERATION**

Technical modifications made:
- New components: {newComponents}
- Modified functions: {modifiedFunctions}
- Added validations: {validators}
- UI changes: {uiChanges}
- Technical approach: {technicalApproach}

Generate a Changes section that:
1. Lists specific technical modifications
2. Groups related changes together
3. Mentions user-visible changes
4. Highlights key architectural decisions
5. Includes new features or functionality

**Requirements:**
- Use bullet points for clarity
- Group similar changes together
- Be specific about what was implemented
- Focus on WHAT was changed, not WHY
- Include both backend and frontend changes

**Content Guidelines:**
- Use active voice ("Added X", "Updated Y")
- Be concrete and specific
- Avoid vague terms like "various", "multiple"
- Use industry-standard terminology
- Keep bullet points concise (1-2 lines each)`
        });

        // QA Section Template
        this.templates.set('qa', {
            id: 'qa',
            name: 'QA Section Generator', 
            sectionType: 'qa',
            variables: ['testingPriority', 'edgeCases', 'integrationRisks', 'featureFlags', 'userWorkflows'],
            content: `**🧪 QA SECTION GENERATION**

Testing analysis:
- Priority areas: {testingPriority}
- Edge cases: {edgeCases}
- Integration risks: {integrationRisks}
- Feature flags: {featureFlags}
- User workflows: {userWorkflows}

Generate QA instructions that:
1. List specific manual test scenarios for these changes
2. Include edge cases and error conditions
3. Specify feature flag testing if applicable
4. Focus on user workflows, not unit tests
5. Include regression testing areas
6. Provide expected results for each test

**Requirements:**
- Format as clear, actionable steps
- Number the steps for easy following
- Include expected outcomes
- Focus on manual testing only
- Exclude developer responsibilities

**Content Guidelines:**
- Start each step with an action verb
- Be specific about test data and conditions  
- Include both happy path and error scenarios
- Mention browser/environment requirements if relevant
- Keep steps focused and achievable`
        });

        // Details/Technical Section Template
        this.templates.set('details', {
            id: 'details',
            name: 'Details Section Generator',
            sectionType: 'details', 
            variables: ['architecturalDecisions', 'performanceConsiderations', 'securityImpact', 'dependencies', 'migrationSteps'],
            content: `**📋 DETAILS SECTION GENERATION**

Technical implementation details:
- Architecture: {architecturalDecisions}
- Performance: {performanceConsiderations} 
- Security: {securityImpact}
- Dependencies: {dependencies}
- Migration: {migrationSteps}

Generate a Details section that:
1. Explains key architectural decisions
2. Highlights performance or security considerations
3. Documents integration points and dependencies
4. Includes migration or configuration steps
5. Provides context for complex changes

**Requirements:**
- Use technical terminology appropriately
- Explain the reasoning behind decisions
- Include relevant background context
- Mention deployment considerations
- Focus on implementation approach

**Content Guidelines:**
- Use industry-standard patterns and terminology
- Explain complex concepts clearly
- Include code examples if helpful
- Mention potential risks or considerations
- Keep paragraphs short and focused`
        });

        // Generic Section Template
        this.templates.set('generic', {
            id: 'generic',
            name: 'Generic Section Generator',
            sectionType: 'generic',
            variables: ['sectionName', 'relevantContext', 'suggestedContent'],
            content: `**📝 SECTION CONTENT GENERATION**

Section: {sectionName}
Context: {relevantContext}
Suggestions: {suggestedContent}

Generate content for the "{sectionName}" section that:
1. Is relevant to the code changes made
2. Follows the section's apparent purpose
3. Provides meaningful, actionable information
4. Maintains consistency with other sections
5. Uses appropriate formatting and tone

**Requirements:**
- Match the section's intended purpose
- Use appropriate detail level
- Maintain professional tone
- Be specific and concrete
- Avoid placeholder text`
        });
    }

    /**
     * Categorize section by name to determine appropriate template
     */
    private categorizeSection(sectionName: string): PromptTemplate['sectionType'] {
        const lower = sectionName.toLowerCase();
        
        if (lower.includes('summary') || lower.includes('description') || lower.includes('problem') || lower.includes('issue')) {
            return 'summary';
        }
        if (lower.includes('changes') || lower.includes('solution') || lower.includes('what') || lower.includes('modifications')) {
            return 'changes';
        }
        if (lower.includes('qa') || lower.includes('testing') || lower.includes('test') || lower.includes('verification')) {
            return 'qa';
        }
        if (lower.includes('details') || lower.includes('technical') || lower.includes('implementation') || lower.includes('how')) {
            return 'details';
        }
        
        return 'generic';
    }

    /**
     * Get appropriate template for section type
     */
    private getTemplateForSection(sectionType: PromptTemplate['sectionType']): PromptTemplate | undefined {
        return this.templates.get(sectionType);
    }

    /**
     * Render template with context variables
     */
    private renderTemplate(template: PromptTemplate, context: PRContext, sectionName?: string): string {
        const contextVariables = this.extractContextVariables(context, template.sectionType, sectionName);
        
        let rendered = template.content;
        
        // Replace template variables
        for (const [key, value] of Object.entries(contextVariables)) {
            const regex = new RegExp(`\\{${key}\\}`, 'g');
            rendered = rendered.replace(regex, value || `[${key} not available]`);
        }
        
        return rendered;
    }

    /**
     * Extract relevant context variables for template rendering
     */
    private extractContextVariables(context: PRContext, sectionType: PromptTemplate['sectionType'], sectionName?: string): Record<string, string> {
        const { diffAnalysis, templateStructure, testResults } = context;
        
        const variables: Record<string, string> = {
            sectionName: sectionName || 'Unknown Section'
        };

        // Common variables
        variables.filesSummary = this.summarizeFileChanges(diffAnalysis.fileChanges);
        variables.businessPurpose = this.extractBusinessPurpose(diffAnalysis);
        variables.jiraContext = this.formatJiraTickets(diffAnalysis.businessContext.jiraTickets);
        
        // Section-specific variables
        switch (sectionType) {
            case 'summary':
                variables.userImpact = this.assessUserImpact(diffAnalysis);
                break;
                
            case 'changes':
                variables.newComponents = this.formatComponents(diffAnalysis.codeAnalysis.newComponents);
                variables.modifiedFunctions = this.formatFunctions(diffAnalysis.codeAnalysis.modifiedFunctions);
                variables.validators = this.formatValidators(diffAnalysis.codeAnalysis.newValidators);
                variables.uiChanges = this.identifyUIChanges(diffAnalysis);
                variables.technicalApproach = this.describeTechnicalApproach(diffAnalysis);
                break;
                
            case 'qa':
                variables.testingPriority = diffAnalysis.impact.testingPriority.join(', ');
                variables.edgeCases = this.identifyEdgeCases(diffAnalysis);
                variables.integrationRisks = diffAnalysis.impact.affectedAreas.join(', ');
                variables.featureFlags = this.formatFeatureFlags(diffAnalysis.businessContext.featureFlags);
                variables.userWorkflows = this.identifyUserWorkflows(diffAnalysis);
                break;
                
            case 'details':
                variables.architecturalDecisions = this.extractArchitecturalDecisions(diffAnalysis);
                variables.performanceConsiderations = this.identifyPerformanceImpact(diffAnalysis);
                variables.securityImpact = this.assessSecurityImpact(diffAnalysis);
                variables.dependencies = this.formatDependencies(diffAnalysis.businessContext.dependencies);
                variables.migrationSteps = this.extractMigrationSteps(diffAnalysis.businessContext.migrations);
                break;
                
            case 'generic':
                variables.relevantContext = this.extractRelevantContext(diffAnalysis, sectionName);
                variables.suggestedContent = this.suggestSectionContent(diffAnalysis, sectionName);
                break;
        }
        
        return variables;
    }

    /**
     * Create business summary from context
     */
    private createBusinessSummary(context: PRContext): string {
        const { diffAnalysis } = context;
        const summary = [];
        
        if (diffAnalysis.businessContext.jiraTickets.length > 0) {
            summary.push(`🎫 JIRA: ${diffAnalysis.businessContext.jiraTickets.map(t => t.key).join(', ')}`);
        }
        
        if (diffAnalysis.businessContext.featureFlags.length > 0) {
            summary.push(`🚩 Feature Flags: ${diffAnalysis.businessContext.featureFlags.length} detected`);
        }
        
        if (diffAnalysis.businessContext.breakingChanges.length > 0) {
            summary.push(`⚠️  Breaking Changes: ${diffAnalysis.businessContext.breakingChanges.length} identified`);
        }
        
        summary.push(`📊 Impact Level: ${diffAnalysis.impact.riskLevel.toUpperCase()}`);
        summary.push(`📁 Files Changed: ${diffAnalysis.fileChanges.added.length + diffAnalysis.fileChanges.modified.length} total`);
        
        return summary.join('\n');
    }

    /**
     * Create technical summary from context
     */
    private createTechnicalSummary(context: PRContext): string {
        const { diffAnalysis } = context;
        const summary = [];
        
        if (diffAnalysis.codeAnalysis.newComponents.length > 0) {
            summary.push(`🆕 New Components: ${diffAnalysis.codeAnalysis.newComponents.length}`);
        }
        
        if (diffAnalysis.codeAnalysis.newFunctions.length > 0) {
            summary.push(`⚙️  New Functions: ${diffAnalysis.codeAnalysis.newFunctions.length}`);
        }
        
        if (diffAnalysis.codeAnalysis.testFiles.length > 0) {
            summary.push(`🧪 Test Files: ${diffAnalysis.codeAnalysis.testFiles.length} modified`);
        }
        
        if (diffAnalysis.impact.affectedAreas.length > 0) {
            summary.push(`🎯 Affected Areas: ${diffAnalysis.impact.affectedAreas.join(', ')}`);
        }
        
        return summary.length > 0 ? summary.join('\n') : 'No significant technical changes detected';
    }

    /**
     * Create QA-specific instructions
     */
    private createQAInstructions(context: PRContext): string {
        const { diffAnalysis } = context;
        const instructions = [];
        
        if (diffAnalysis.businessContext.featureFlags.length > 0) {
            instructions.push('**🚩 FEATURE FLAG TESTING REQUIRED**');
            instructions.push('The following feature flags need testing with both enabled and disabled states:');
            diffAnalysis.businessContext.featureFlags.forEach(flag => {
                instructions.push(`- \`${flag.name}\` (${flag.system} system)`);
            });
            instructions.push('');
        }
        
        if (diffAnalysis.impact.testingPriority.length > 0) {
            instructions.push('**🎯 PRIORITY TESTING AREAS**');
            diffAnalysis.impact.testingPriority.forEach(area => {
                instructions.push(`- ${area}`);
            });
            instructions.push('');
        }
        
        if (diffAnalysis.businessContext.breakingChanges.length > 0) {
            instructions.push('**⚠️  BREAKING CHANGE VALIDATION**');
            instructions.push('Special attention required for backward compatibility testing');
            instructions.push('');
        }
        
        return instructions.join('\n');
    }

    /**
     * Format test results for display
     */
    private formatTestResults(testResults?: PRContext['testResults']): string {
        if (!testResults) {
            return 'No test results available';
        }
        
        const status = testResults.status === 'PASSED' ? '✅' : '❌';
        const duration = testResults.duration ? ` (${testResults.duration}ms)` : '';
        
        return `${status} ${testResults.status}: ${testResults.passed}/${testResults.total} tests passed${duration}`;
    }

    /**
     * Generate generic prompt for unknown section types
     */
    private generateGenericPrompt(sectionName: string, context: PRContext): string {
        const template = this.templates.get('generic');
        return template ? this.renderTemplate(template, context, sectionName) : 
            `Please generate content for the "${sectionName}" section based on the provided code changes and context.`;
    }

    // Helper methods for context extraction

    private summarizeFileChanges(fileChanges: GitDiffAnalysis['fileChanges']): string {
        const parts = [];
        if (fileChanges.added.length > 0) parts.push(`${fileChanges.added.length} added`);
        if (fileChanges.modified.length > 0) parts.push(`${fileChanges.modified.length} modified`);
        if (fileChanges.deleted.length > 0) parts.push(`${fileChanges.deleted.length} deleted`);
        if (fileChanges.renamed.length > 0) parts.push(`${fileChanges.renamed.length} renamed`);
        return parts.join(', ') || 'No file changes detected';
    }

    private extractBusinessPurpose(diffAnalysis: GitDiffAnalysis): string {
        // Extract purpose from JIRA tickets, file names, function names
        if (diffAnalysis.businessContext.jiraTickets.length > 0) {
            return `Related to ${diffAnalysis.businessContext.jiraTickets.map(t => t.key).join(', ')}`;
        }
        
        // Infer from component names
        const components = diffAnalysis.codeAnalysis.newComponents;
        if (components.length > 0) {
            return `New ${components[0].type.replace('-', ' ')} functionality`;
        }
        
        return 'Code improvements and maintenance';
    }

    private formatJiraTickets(tickets: GitDiffAnalysis['businessContext']['jiraTickets']): string {
        if (tickets.length === 0) return 'No JIRA ticket detected';
        return tickets.map(t => `${t.key} (${t.type})`).join(', ');
    }

    private assessUserImpact(diffAnalysis: GitDiffAnalysis): string {
        const impact = [];
        
        if (diffAnalysis.codeAnalysis.newComponents.some(c => c.type === 'angular-component')) {
            impact.push('New UI components');
        }
        
        if (diffAnalysis.businessContext.featureFlags.length > 0) {
            impact.push('Feature flag controlled functionality');
        }
        
        if (diffAnalysis.codeAnalysis.newValidators.length > 0) {
            impact.push('Enhanced form validation');
        }
        
        return impact.length > 0 ? impact.join(', ') : 'Backend improvements with no direct user interface changes';
    }

    private formatComponents(components: GitDiffAnalysis['codeAnalysis']['newComponents']): string {
        if (components.length === 0) return 'None';
        return components.map(c => `${c.name} (${c.type})`).join(', ');
    }

    private formatFunctions(functions: GitDiffAnalysis['codeAnalysis']['modifiedFunctions']): string {
        if (functions.length === 0) return 'None';
        return functions.map(f => `${f.name} (${f.type})`).join(', ');
    }

    private formatValidators(validators: GitDiffAnalysis['codeAnalysis']['newValidators']): string {
        if (validators.length === 0) return 'None';
        return validators.map(v => `${v.name} (${v.type})`).join(', ');
    }

    private identifyUIChanges(diffAnalysis: GitDiffAnalysis): string {
        const uiFiles = diffAnalysis.fileChanges.added
            .concat(diffAnalysis.fileChanges.modified)
            .filter(f => f.includes('.component.') || f.includes('.html') || f.includes('.scss') || f.includes('.css'));
            
        if (uiFiles.length === 0) return 'No UI changes detected';
        return `${uiFiles.length} UI-related files modified`;
    }

    private describeTechnicalApproach(diffAnalysis: GitDiffAnalysis): string {
        const approaches = [];
        
        if (diffAnalysis.codeAnalysis.newComponents.some(c => c.type === 'angular-service')) {
            approaches.push('Service-based architecture');
        }
        
        if (diffAnalysis.codeAnalysis.newValidators.length > 0) {
            approaches.push('Enhanced validation layer');
        }
        
        if (diffAnalysis.businessContext.featureFlags.length > 0) {
            approaches.push('Feature flag controlled rollout');
        }
        
        return approaches.join(', ') || 'Standard implementation approach';
    }

    private identifyEdgeCases(diffAnalysis: GitDiffAnalysis): string {
        const edgeCases = [];
        
        if (diffAnalysis.codeAnalysis.newValidators.length > 0) {
            edgeCases.push('Form validation edge cases');
        }
        
        if (diffAnalysis.businessContext.featureFlags.length > 0) {
            edgeCases.push('Feature flag state transitions');
        }
        
        if (diffAnalysis.businessContext.breakingChanges.length > 0) {
            edgeCases.push('Backward compatibility scenarios');
        }
        
        return edgeCases.join(', ') || 'Standard error handling scenarios';
    }

    private formatFeatureFlags(featureFlags: GitDiffAnalysis['businessContext']['featureFlags']): string {
        if (featureFlags.length === 0) return 'None detected';
        return featureFlags.map(f => `${f.name} (${f.system})`).join(', ');
    }

    private identifyUserWorkflows(diffAnalysis: GitDiffAnalysis): string {
        const workflows = [];
        
        const components = diffAnalysis.codeAnalysis.newComponents;
        if (components.some(c => c.type === 'angular-component')) {
            workflows.push('UI component interactions');
        }
        
        if (diffAnalysis.codeAnalysis.newValidators.length > 0) {
            workflows.push('Form submission workflows');
        }
        
        return workflows.join(', ') || 'Standard user workflows';
    }

    private extractArchitecturalDecisions(diffAnalysis: GitDiffAnalysis): string {
        // Infer architectural decisions from code changes
        const decisions = [];
        
        if (diffAnalysis.codeAnalysis.newComponents.length > 0) {
            decisions.push('Component-based architecture');
        }
        
        if (diffAnalysis.businessContext.dependencies.added.length > 0) {
            decisions.push('New dependency integration');
        }
        
        return decisions.join(', ') || 'Standard implementation patterns';
    }

    private identifyPerformanceImpact(diffAnalysis: GitDiffAnalysis): string {
        // Analyze for performance implications
        if (diffAnalysis.businessContext.dependencies.added.length > 0) {
            return 'New dependencies may impact bundle size';
        }
        
        if (diffAnalysis.codeAnalysis.newComponents.length > 0) {
            return 'New components may affect initial load time';
        }
        
        return 'No significant performance impact expected';
    }

    private assessSecurityImpact(diffAnalysis: GitDiffAnalysis): string {
        if (diffAnalysis.codeAnalysis.newValidators.length > 0) {
            return 'Enhanced input validation improves security';
        }
        
        if (diffAnalysis.businessContext.dependencies.added.length > 0) {
            return 'New dependencies require security review';
        }
        
        return 'No significant security impact';
    }

    private formatDependencies(dependencies: GitDiffAnalysis['businessContext']['dependencies']): string {
        const parts = [];
        if (dependencies.added.length > 0) parts.push(`${dependencies.added.length} added`);
        if (dependencies.updated.length > 0) parts.push(`${dependencies.updated.length} updated`);
        if (dependencies.removed.length > 0) parts.push(`${dependencies.removed.length} removed`);
        return parts.join(', ') || 'No dependency changes';
    }

    private extractMigrationSteps(migrations: GitDiffAnalysis['businessContext']['migrations']): string {
        if (migrations.length === 0) return 'No migrations required';
        return migrations.map(m => `${m.type}: ${m.description}`).join('; ');
    }

    private extractRelevantContext(diffAnalysis: GitDiffAnalysis, sectionName?: string): string {
        // Extract context relevant to the specific section
        const context = [];
        context.push(`Files changed: ${this.summarizeFileChanges(diffAnalysis.fileChanges)}`);
        context.push(`Impact level: ${diffAnalysis.impact.riskLevel}`);
        if (diffAnalysis.businessContext.featureFlags.length > 0) {
            context.push(`Feature flags: ${diffAnalysis.businessContext.featureFlags.length} detected`);
        }
        return context.join(', ');
    }

    private suggestSectionContent(diffAnalysis: GitDiffAnalysis, sectionName?: string): string {
        // Provide content suggestions based on section name and changes
        if (!sectionName) return 'Describe the changes and their impact';
        
        const lower = sectionName.toLowerCase();
        if (lower.includes('note') || lower.includes('additional')) {
            return 'Consider mentioning deployment notes, configuration changes, or special considerations';
        }
        if (lower.includes('risk') || lower.includes('consideration')) {
            return `Risk level is ${diffAnalysis.impact.riskLevel}. Consider mentioning testing priorities and deployment considerations`;
        }
        
        return `Provide information relevant to "${sectionName}" based on the code changes`;
    }
}