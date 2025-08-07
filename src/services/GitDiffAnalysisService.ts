/**
 * Enhanced Git Diff Analysis Service
 * Phase 1 implementation of PR Description Enhancement Plan 3.5.2
 * Provides comprehensive context analysis for PR description generation
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { spawn } from 'child_process';
import { promisify } from 'util';

export interface CodeFunction {
    name: string;
    type: 'method' | 'function' | 'constructor' | 'getter' | 'setter';
    visibility: 'public' | 'private' | 'protected';
    parameters: string[];
    returnType?: string;
    file: string;
    line: number;
}

export interface Component {
    name: string;
    type: 'angular-component' | 'angular-service' | 'angular-directive' | 'angular-pipe';
    selector?: string;
    inputs?: string[];
    outputs?: string[];
    providers?: string[];
    file: string;
    line: number;
}

export interface Validator {
    name: string;
    type: 'form-validator' | 'custom-validator' | 'schema-validator';
    validationRules: string[];
    file: string;
    line: number;
}

export interface TestFileAnalysis {
    file: string;
    testSuites: string[];
    testCases: string[];
    coverageTargets: string[];
    mockUsage: string[];
}

export interface FeatureFlag {
    name: string;
    usagePattern: string;
    file: string;
    line: number;
    system: 'flipper' | 'launchdarkly' | 'generic' | 'config';
}

export interface JiraTicket {
    key: string;
    description?: string;
    type: 'commit-message' | 'branch-name' | 'pr-template';
    source: string;
}

export interface BreakingChange {
    type: 'api-removal' | 'interface-change' | 'dependency-update' | 'signature-change';
    description: string;
    affectedFiles: string[];
    severity: 'low' | 'medium' | 'high';
}

export interface DependencyChange {
    added: Array<{ name: string; version: string }>;
    updated: Array<{ name: string; oldVersion: string; newVersion: string }>;
    removed: Array<{ name: string; version: string }>;
}

export interface Migration {
    type: 'database' | 'config' | 'data' | 'dependency';
    description: string;
    files: string[];
}

export interface GitDiffAnalysis {
    fileChanges: {
        added: string[];
        modified: string[];
        deleted: string[];
        renamed: Array<{ from: string; to: string }>;
        moved: Array<{ from: string; to: string }>;
    };
    codeAnalysis: {
        newFunctions: CodeFunction[];
        modifiedFunctions: CodeFunction[];
        deletedFunctions: string[];
        newComponents: Component[];
        modifiedComponents: Component[];
        newValidators: Validator[];
        testFiles: TestFileAnalysis[];
    };
    businessContext: {
        featureFlags: FeatureFlag[];
        jiraTickets: JiraTicket[];
        breakingChanges: BreakingChange[];
        dependencies: DependencyChange;
        migrations: Migration[];
    };
    impact: {
        riskLevel: 'low' | 'medium' | 'high';
        affectedAreas: string[];
        testingPriority: string[];
        deploymentNotes: string[];
    };
}

export interface GitDiffAnalysisOptions {
    workspaceRoot: string;
    outputChannel: vscode.OutputChannel;
}

/**
 * Enhanced service for comprehensive git diff analysis
 * Builds upon existing GitDiffCapture with intelligent context extraction
 */
export class GitDiffAnalysisService {
    private readonly exec = promisify(require('child_process').exec);

    constructor(private options: GitDiffAnalysisOptions) {}

    /**
     * Perform comprehensive analysis of current git diff
     */
    async analyzeDiff(): Promise<GitDiffAnalysis> {
        try {
            this.options.outputChannel.appendLine('🔍 Starting comprehensive git diff analysis...');
            
            const diffContent = await this.getSmartGitDiff();
            const statsContent = await this.getGitStats();
            
            if (!diffContent || diffContent.trim().length === 0) {
                return this.createEmptyAnalysis();
            }

            const fileChanges = await this.analyzeFileChanges(diffContent);
            const codeAnalysis = await this.analyzeCodeChanges(diffContent, fileChanges);
            const businessContext = await this.analyzeBusinessContext(diffContent, fileChanges);
            const impact = this.assessImpact(fileChanges, codeAnalysis, businessContext);

            this.options.outputChannel.appendLine('✅ Git diff analysis completed');

            return {
                fileChanges,
                codeAnalysis,
                businessContext,
                impact
            };

        } catch (error) {
            this.options.outputChannel.appendLine(`❌ Git diff analysis failed: ${error}`);
            return this.createEmptyAnalysis();
        }
    }

    /**
     * Get git diff using smart detection logic
     * Replicates existing GitDiffCapture logic for consistency
     */
    private async getSmartGitDiff(): Promise<string> {
        try {
            // Priority 1: Unstaged changes
            const unstagedResult = await this.exec('git diff --quiet', { cwd: this.options.workspaceRoot });
            if (unstagedResult.stdout === '') { // git diff --quiet returns empty stdout when there are changes
                const diffResult = await this.exec('git diff', { cwd: this.options.workspaceRoot });
                if (diffResult.stdout && diffResult.stdout.trim()) {
                    this.options.outputChannel.appendLine('📝 Analyzing unstaged changes');
                    return diffResult.stdout;
                }
            }
        } catch {
            // There are unstaged changes, get them
            try {
                const diffResult = await this.exec('git diff', { cwd: this.options.workspaceRoot });
                if (diffResult.stdout && diffResult.stdout.trim()) {
                    this.options.outputChannel.appendLine('📝 Analyzing unstaged changes');
                    return diffResult.stdout;
                }
            } catch { /* continue */ }
        }

        try {
            // Priority 2: Staged changes
            const stagedResult = await this.exec('git diff --cached --quiet', { cwd: this.options.workspaceRoot });
            if (stagedResult.stdout === '') {
                const diffResult = await this.exec('git diff --cached', { cwd: this.options.workspaceRoot });
                if (diffResult.stdout && diffResult.stdout.trim()) {
                    this.options.outputChannel.appendLine('📂 Analyzing staged changes');
                    return diffResult.stdout;
                }
            }
        } catch {
            // There are staged changes, get them
            try {
                const diffResult = await this.exec('git diff --cached', { cwd: this.options.workspaceRoot });
                if (diffResult.stdout && diffResult.stdout.trim()) {
                    this.options.outputChannel.appendLine('📂 Analyzing staged changes');
                    return diffResult.stdout;
                }
            } catch { /* continue */ }
        }

        // Priority 3: Last commit
        try {
            const diffResult = await this.exec('git diff HEAD~1..HEAD', { cwd: this.options.workspaceRoot });
            if (diffResult.stdout && diffResult.stdout.trim()) {
                this.options.outputChannel.appendLine('📋 Analyzing last commit changes');
                return diffResult.stdout;
            }
        } catch { /* continue */ }

        return '';
    }

    /**
     * Get git diff statistics
     */
    private async getGitStats(): Promise<string> {
        try {
            // Use same priority logic for stats
            const unstagedCheck = await this.exec('git diff --quiet', { cwd: this.options.workspaceRoot }).catch(() => null);
            if (!unstagedCheck) {
                const statsResult = await this.exec('git diff --stat', { cwd: this.options.workspaceRoot });
                if (statsResult.stdout) return statsResult.stdout;
            }

            const stagedCheck = await this.exec('git diff --cached --quiet', { cwd: this.options.workspaceRoot }).catch(() => null);
            if (!stagedCheck) {
                const statsResult = await this.exec('git diff --cached --stat', { cwd: this.options.workspaceRoot });
                if (statsResult.stdout) return statsResult.stdout;
            }

            const statsResult = await this.exec('git diff HEAD~1..HEAD --stat', { cwd: this.options.workspaceRoot });
            return statsResult.stdout || '';
        } catch {
            return '';
        }
    }

    /**
     * Analyze file changes from diff content
     */
    private async analyzeFileChanges(diffContent: string): Promise<GitDiffAnalysis['fileChanges']> {
        const added: string[] = [];
        const modified: string[] = [];
        const deleted: string[] = [];
        const renamed: Array<{ from: string; to: string }> = [];
        const moved: Array<{ from: string; to: string }> = [];

        const lines = diffContent.split('\n');
        let currentFileA = '';
        let currentFileB = '';

        for (const line of lines) {
            const diffMatch = line.match(/^diff --git a\/(.+) b\/(.+)$/);
            if (diffMatch) {
                currentFileA = diffMatch[1];
                currentFileB = diffMatch[2];

                if (currentFileA !== currentFileB) {
                    // Determine if it's a rename or move
                    if (path.dirname(currentFileA) === path.dirname(currentFileB)) {
                        renamed.push({ from: currentFileA, to: currentFileB });
                    } else {
                        moved.push({ from: currentFileA, to: currentFileB });
                    }
                }
            } else if (line.startsWith('new file mode')) {
                added.push(currentFileB);
            } else if (line.startsWith('deleted file mode')) {
                deleted.push(currentFileA);
            } else if (line.match(/^index .+\.\..+/) && currentFileA === currentFileB && !added.includes(currentFileB)) {
                modified.push(currentFileA);
            }
        }

        return { added, modified, deleted, renamed, moved };
    }

    /**
     * Analyze code changes for functions, components, validators
     */
    private async analyzeCodeChanges(
        diffContent: string,
        fileChanges: GitDiffAnalysis['fileChanges']
    ): Promise<GitDiffAnalysis['codeAnalysis']> {
        const newFunctions: CodeFunction[] = [];
        const modifiedFunctions: CodeFunction[] = [];
        const deletedFunctions: string[] = [];
        const newComponents: Component[] = [];
        const modifiedComponents: Component[] = [];
        const newValidators: Validator[] = [];
        const testFiles: TestFileAnalysis[] = [];

        // Analyze added and modified TypeScript files
        const tsFiles = [...fileChanges.added, ...fileChanges.modified]
            .filter(file => file.endsWith('.ts') || file.endsWith('.js'));

        for (const file of tsFiles) {
            try {
                const fullPath = path.join(this.options.workspaceRoot, file);
                if (fs.existsSync(fullPath)) {
                    const content = await fs.promises.readFile(fullPath, 'utf8');
                    
                    // Analyze functions
                    const functions = this.extractFunctions(content, file);
                    if (fileChanges.added.includes(file)) {
                        newFunctions.push(...functions);
                    } else {
                        modifiedFunctions.push(...functions);
                    }

                    // Analyze Angular components
                    const components = this.extractAngularComponents(content, file);
                    if (fileChanges.added.includes(file)) {
                        newComponents.push(...components);
                    } else {
                        modifiedComponents.push(...components);
                    }

                    // Analyze validators
                    const validators = this.extractValidators(content, file);
                    newValidators.push(...validators);

                    // Analyze test files
                    if (file.includes('.spec.') || file.includes('.test.')) {
                        const testAnalysis = this.analyzeTestFile(content, file);
                        testFiles.push(testAnalysis);
                    }
                }
            } catch (error) {
                // Skip files that can't be read
            }
        }

        // Extract deleted functions from diff
        const deletedFunctionNames = this.extractDeletedFunctions(diffContent);
        deletedFunctions.push(...deletedFunctionNames);

        return {
            newFunctions,
            modifiedFunctions,
            deletedFunctions,
            newComponents,
            modifiedComponents,
            newValidators,
            testFiles
        };
    }

    /**
     * Extract functions from TypeScript content
     */
    private extractFunctions(content: string, file: string): CodeFunction[] {
        const functions: CodeFunction[] = [];
        const lines = content.split('\n');

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // Match various function patterns
            const patterns = [
                /^\s*(public|private|protected)?\s*(async\s+)?(\w+)\s*\([^)]*\)\s*:\s*([^{]+)/,
                /^\s*(export\s+)?(async\s+)?function\s+(\w+)\s*\([^)]*\)\s*:\s*([^{]+)/,
                /^\s*(get|set)\s+(\w+)\s*\([^)]*\)\s*:\s*([^{]+)/
            ];

            for (const pattern of patterns) {
                const match = line.match(pattern);
                if (match) {
                    const visibility = (match[1] === 'public' || match[1] === 'private' || match[1] === 'protected') 
                        ? match[1] as 'public' | 'private' | 'protected' 
                        : 'public';
                    
                    let functionName = '';
                    let returnType = '';
                    let type: CodeFunction['type'] = 'function';

                    if (match[1] === 'get' || match[1] === 'set') {
                        type = match[1] === 'get' ? 'getter' : 'setter';
                        functionName = match[2];
                        returnType = match[3];
                    } else {
                        functionName = match[3] || match[2];
                        returnType = match[4] || match[3];
                        type = line.includes('constructor') ? 'constructor' : 
                               line.includes('class') ? 'method' : 'function';
                    }

                    functions.push({
                        name: functionName,
                        type,
                        visibility,
                        parameters: this.extractParameters(line),
                        returnType: returnType?.trim(),
                        file,
                        line: i + 1
                    });
                    break;
                }
            }
        }

        return functions;
    }

    /**
     * Extract Angular components from content
     */
    private extractAngularComponents(content: string, file: string): Component[] {
        const components: Component[] = [];
        const lines = content.split('\n');

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            // Angular Component decorator
            if (line.includes('@Component')) {
                const componentMatch = this.findClassAfterDecorator(lines, i);
                if (componentMatch) {
                    const component: Component = {
                        name: componentMatch.className,
                        type: 'angular-component',
                        file,
                        line: componentMatch.line
                    };

                    // Extract component metadata
                    const decoratorContent = this.extractDecoratorContent(lines, i);
                    component.selector = this.extractProperty(decoratorContent, 'selector');
                    component.inputs = this.extractArrayProperty(decoratorContent, 'inputs');
                    component.outputs = this.extractArrayProperty(decoratorContent, 'outputs');

                    components.push(component);
                }
            }

            // Angular Service decorator
            if (line.includes('@Injectable')) {
                const serviceMatch = this.findClassAfterDecorator(lines, i);
                if (serviceMatch) {
                    components.push({
                        name: serviceMatch.className,
                        type: 'angular-service',
                        file,
                        line: serviceMatch.line
                    });
                }
            }

            // Angular Directive decorator
            if (line.includes('@Directive')) {
                const directiveMatch = this.findClassAfterDecorator(lines, i);
                if (directiveMatch) {
                    components.push({
                        name: directiveMatch.className,
                        type: 'angular-directive',
                        file,
                        line: directiveMatch.line
                    });
                }
            }

            // Angular Pipe decorator
            if (line.includes('@Pipe')) {
                const pipeMatch = this.findClassAfterDecorator(lines, i);
                if (pipeMatch) {
                    components.push({
                        name: pipeMatch.className,
                        type: 'angular-pipe',
                        file,
                        line: pipeMatch.line
                    });
                }
            }
        }

        return components;
    }

    /**
     * Extract validators from content
     */
    private extractValidators(content: string, file: string): Validator[] {
        const validators: Validator[] = [];
        const lines = content.split('\n');

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            // Custom validator patterns
            if (line.includes('Validator') && (line.includes('function') || line.includes('const'))) {
                const validatorMatch = line.match(/(?:function|const)\s+(\w+)/);
                if (validatorMatch) {
                    validators.push({
                        name: validatorMatch[1],
                        type: 'custom-validator',
                        validationRules: this.extractValidationRules(lines, i),
                        file,
                        line: i + 1
                    });
                }
            }

            // Form validator patterns
            if (line.includes('FormControl') || line.includes('FormGroup')) {
                const formMatch = line.match(/(\w+).*(?:FormControl|FormGroup)/);
                if (formMatch) {
                    validators.push({
                        name: formMatch[1],
                        type: 'form-validator',
                        validationRules: this.extractValidationRules(lines, i),
                        file,
                        line: i + 1
                    });
                }
            }
        }

        return validators;
    }

    /**
     * Analyze test file content
     */
    private analyzeTestFile(content: string, file: string): TestFileAnalysis {
        const testSuites: string[] = [];
        const testCases: string[] = [];
        const coverageTargets: string[] = [];
        const mockUsage: string[] = [];

        const lines = content.split('\n');
        for (const line of lines) {
            // Extract test suites
            const suiteMatch = line.match(/describe\(['"`]([^'"`]+)['"`]/);
            if (suiteMatch) {
                testSuites.push(suiteMatch[1]);
            }

            // Extract test cases
            const testMatch = line.match(/it\(['"`]([^'"`]+)['"`]/);
            if (testMatch) {
                testCases.push(testMatch[1]);
            }

            // Extract coverage targets (imported modules/components)
            const importMatch = line.match(/import\s+.*\s+from\s+['"`]([^'"`]+)['"`]/);
            if (importMatch && !importMatch[1].startsWith('.')) {
                coverageTargets.push(importMatch[1]);
            }

            // Extract mock usage
            if (line.includes('jest.fn()') || line.includes('spyOn') || line.includes('createSpy')) {
                const mockMatch = line.match(/(\w+).*(?:jest\.fn|spyOn|createSpy)/);
                if (mockMatch) {
                    mockUsage.push(mockMatch[1]);
                }
            }
        }

        return { file, testSuites, testCases, coverageTargets, mockUsage };
    }

    /**
     * Analyze business context including feature flags, JIRA tickets, etc.
     */
    private async analyzeBusinessContext(
        diffContent: string,
        fileChanges: GitDiffAnalysis['fileChanges']
    ): Promise<GitDiffAnalysis['businessContext']> {
        const featureFlags = await this.extractFeatureFlags(diffContent);
        const jiraTickets = await this.extractJiraTickets();
        const breakingChanges = this.detectBreakingChanges(diffContent, fileChanges);
        const dependencies = await this.analyzeDependencyChanges(fileChanges);
        const migrations = this.detectMigrations(fileChanges);

        return {
            featureFlags,
            jiraTickets,
            breakingChanges,
            dependencies,
            migrations
        };
    }

    /**
     * Extract feature flags from diff content
     */
    private async extractFeatureFlags(diffContent: string): Promise<FeatureFlag[]> {
        const featureFlags: FeatureFlag[] = [];
        const lines = diffContent.split('\n');

        const FLAG_PATTERNS = [
            { pattern: /\.flipperEnabled\(['"`]([^'"`]+)['"`]\)/g, system: 'flipper' as const },
            { pattern: /\.eagerlyEnabled\(['"`]([^'"`]+)['"`]\)/g, system: 'flipper' as const },
            { pattern: /\.isEnabled\(['"`]([^'"`]+)['"`]\)/g, system: 'generic' as const },
            { pattern: /\.checkFlag\(['"`]([^'"`]+)['"`]\)/g, system: 'generic' as const },
            { pattern: /LaunchDarkly\.variation\(['"`]([^'"`]+)['"`]\)/g, system: 'launchdarkly' as const },
            { pattern: /ldClient\.variation\(['"`]([^'"`]+)['"`]\)/g, system: 'launchdarkly' as const },
            { pattern: /featureFlag\(['"`]([^'"`]+)['"`]\)/g, system: 'generic' as const },
            { pattern: /getFeatureFlag\(['"`]([^'"`]+)['"`]\)/g, system: 'generic' as const },
            { pattern: /isFeatureEnabled\(['"`]([^'"`]+)['"`]\)/g, system: 'generic' as const },
            { pattern: /config\.feature\.([a-zA-Z0-9_-]+)/g, system: 'config' as const },
            { pattern: /features\.([a-zA-Z0-9_-]+)\.enabled/g, system: 'config' as const }
        ];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.startsWith('+') && !line.startsWith('+++')) {
                for (const { pattern, system } of FLAG_PATTERNS) {
                    let match;
                    pattern.lastIndex = 0; // Reset regex state
                    while ((match = pattern.exec(line)) !== null) {
                        const flagName = match[1];
                        if (flagName) {
                            featureFlags.push({
                                name: flagName,
                                usagePattern: line.trim().substring(1), // Remove +
                                file: this.extractFileFromDiffLine(lines, i),
                                line: i + 1,
                                system
                            });
                        }
                    }
                }
            }
        }

        return featureFlags;
    }

    /**
     * Extract JIRA tickets from branch name, commit messages, etc.
     */
    private async extractJiraTickets(): Promise<JiraTicket[]> {
        const tickets: JiraTicket[] = [];

        try {
            // Get current branch name
            const branchResult = await this.exec('git branch --show-current', { 
                cwd: this.options.workspaceRoot 
            });
            const branchName = branchResult.stdout.trim();
            
            // Extract JIRA ticket from branch name
            const branchTicketMatch = branchName.match(/([A-Z]+-\d+)/);
            if (branchTicketMatch) {
                tickets.push({
                    key: branchTicketMatch[1],
                    type: 'branch-name',
                    source: branchName
                });
            }

            // Get recent commit messages
            const commitResult = await this.exec('git log --oneline -10', { 
                cwd: this.options.workspaceRoot 
            });
            const commits = commitResult.stdout.split('\n');
            
            for (const commit of commits) {
                const commitTicketMatch = commit.match(/([A-Z]+-\d+)/);
                if (commitTicketMatch && !tickets.some(t => t.key === commitTicketMatch[1])) {
                    tickets.push({
                        key: commitTicketMatch[1],
                        type: 'commit-message',
                        source: commit
                    });
                }
            }
        } catch {
            // Git commands failed, return empty array
        }

        return tickets;
    }

    /**
     * Detect breaking changes in the diff
     */
    private detectBreakingChanges(
        diffContent: string,
        fileChanges: GitDiffAnalysis['fileChanges']
    ): BreakingChange[] {
        const breakingChanges: BreakingChange[] = [];
        const lines = diffContent.split('\n');

        for (const line of lines) {
            if (line.startsWith('-') && !line.startsWith('---')) {
                // Removed exported APIs
                if (line.includes('export') && (line.includes('class') || line.includes('function') || line.includes('interface'))) {
                    breakingChanges.push({
                        type: 'api-removal',
                        description: 'Removed exported API elements',
                        affectedFiles: [...fileChanges.modified, ...fileChanges.deleted],
                        severity: 'high'
                    });
                }

                // Removed public methods
                if (line.includes('public') && line.includes('(')) {
                    breakingChanges.push({
                        type: 'signature-change',
                        description: 'Removed public method signatures',
                        affectedFiles: fileChanges.modified,
                        severity: 'medium'
                    });
                }
            }
        }

        // Check for interface changes
        const interfaceFiles = fileChanges.modified.filter(f => f.includes('interface') || f.endsWith('.d.ts'));
        if (interfaceFiles.length > 0) {
            breakingChanges.push({
                type: 'interface-change',
                description: 'Interface or type definition changes detected',
                affectedFiles: interfaceFiles,
                severity: 'medium'
            });
        }

        return breakingChanges;
    }

    /**
     * Analyze dependency changes from package.json
     */
    private async analyzeDependencyChanges(
        fileChanges: GitDiffAnalysis['fileChanges']
    ): Promise<DependencyChange> {
        const dependencyChange: DependencyChange = {
            added: [],
            updated: [],
            removed: []
        };

        const packageJsonFiles = [...fileChanges.added, ...fileChanges.modified]
            .filter(file => file.endsWith('package.json'));

        for (const file of packageJsonFiles) {
            try {
                const fullPath = path.join(this.options.workspaceRoot, file);
                if (fs.existsSync(fullPath)) {
                    // This is a simplified implementation
                    // In a real scenario, you'd parse the diff to see actual changes
                    const content = await fs.promises.readFile(fullPath, 'utf8');
                    const packageJson = JSON.parse(content);
                    
                    // For now, just mark that dependencies might have changed
                    if (packageJson.dependencies || packageJson.devDependencies) {
                        // This would need more sophisticated diff analysis
                    }
                }
            } catch {
                // Skip files that can't be parsed
            }
        }

        return dependencyChange;
    }

    /**
     * Detect migrations in the changes
     */
    private detectMigrations(fileChanges: GitDiffAnalysis['fileChanges']): Migration[] {
        const migrations: Migration[] = [];

        // Check for database migration files
        const migrationFiles = [...fileChanges.added, ...fileChanges.modified]
            .filter(file => 
                file.includes('migration') || 
                file.includes('schema') ||
                file.includes('db/') ||
                file.match(/\d{14}_.*\.sql$/) // Timestamp-based migration pattern
            );

        if (migrationFiles.length > 0) {
            migrations.push({
                type: 'database',
                description: 'Database schema changes detected',
                files: migrationFiles
            });
        }

        // Check for configuration changes
        const configFiles = [...fileChanges.added, ...fileChanges.modified]
            .filter(file => 
                file.includes('config') ||
                file.endsWith('.env') ||
                file.endsWith('.yml') ||
                file.endsWith('.yaml') ||
                file.endsWith('.json')
            );

        if (configFiles.length > 0) {
            migrations.push({
                type: 'config',
                description: 'Configuration changes detected',
                files: configFiles
            });
        }

        return migrations;
    }

    /**
     * Assess overall impact of changes
     */
    private assessImpact(
        fileChanges: GitDiffAnalysis['fileChanges'],
        codeAnalysis: GitDiffAnalysis['codeAnalysis'],
        businessContext: GitDiffAnalysis['businessContext']
    ): GitDiffAnalysis['impact'] {
        let riskLevel: 'low' | 'medium' | 'high' = 'low';
        const affectedAreas: string[] = [];
        const testingPriority: string[] = [];
        const deploymentNotes: string[] = [];

        // Assess risk based on breaking changes
        if (businessContext.breakingChanges.some(c => c.severity === 'high')) {
            riskLevel = 'high';
        } else if (businessContext.breakingChanges.length > 0 || businessContext.featureFlags.length > 0) {
            riskLevel = 'medium';
        }

        // Determine affected areas
        const allFiles = [...fileChanges.added, ...fileChanges.modified, ...fileChanges.deleted];
        if (allFiles.some(f => f.includes('service'))) affectedAreas.push('Services');
        if (allFiles.some(f => f.includes('component'))) affectedAreas.push('Components');
        if (allFiles.some(f => f.includes('model') || f.includes('interface'))) affectedAreas.push('Data Models');
        if (codeAnalysis.testFiles.length > 0) affectedAreas.push('Testing');
        if (businessContext.dependencies.added.length > 0 || businessContext.dependencies.updated.length > 0) {
            affectedAreas.push('Dependencies');
        }

        // Set testing priorities
        if (businessContext.featureFlags.length > 0) {
            testingPriority.push('Feature flag testing');
        }
        if (codeAnalysis.newComponents.length > 0) {
            testingPriority.push('New component functionality');
        }
        if (businessContext.breakingChanges.length > 0) {
            testingPriority.push('Breaking change impact');
        }
        if (codeAnalysis.testFiles.length > 0) {
            testingPriority.push('Automated test validation');
        }

        // Generate deployment notes
        if (businessContext.migrations.length > 0) {
            deploymentNotes.push('Database migrations required');
        }
        if (businessContext.dependencies.added.length > 0 || businessContext.dependencies.updated.length > 0) {
            deploymentNotes.push('Dependency updates required');
        }
        if (businessContext.featureFlags.length > 0) {
            deploymentNotes.push('Feature flag configuration needed');
        }

        return {
            riskLevel,
            affectedAreas,
            testingPriority,
            deploymentNotes
        };
    }

    // Helper methods

    private createEmptyAnalysis(): GitDiffAnalysis {
        return {
            fileChanges: {
                added: [],
                modified: [],
                deleted: [],
                renamed: [],
                moved: []
            },
            codeAnalysis: {
                newFunctions: [],
                modifiedFunctions: [],
                deletedFunctions: [],
                newComponents: [],
                modifiedComponents: [],
                newValidators: [],
                testFiles: []
            },
            businessContext: {
                featureFlags: [],
                jiraTickets: [],
                breakingChanges: [],
                dependencies: { added: [], updated: [], removed: [] },
                migrations: []
            },
            impact: {
                riskLevel: 'low',
                affectedAreas: [],
                testingPriority: [],
                deploymentNotes: []
            }
        };
    }

    private extractParameters(line: string): string[] {
        const paramMatch = line.match(/\(([^)]*)\)/);
        if (paramMatch && paramMatch[1]) {
            return paramMatch[1].split(',').map(p => p.trim()).filter(p => p);
        }
        return [];
    }

    private findClassAfterDecorator(lines: string[], decoratorIndex: number): { className: string; line: number } | null {
        for (let i = decoratorIndex + 1; i < lines.length && i < decoratorIndex + 10; i++) {
            const classMatch = lines[i].match(/export\s+class\s+(\w+)/);
            if (classMatch) {
                return { className: classMatch[1], line: i + 1 };
            }
        }
        return null;
    }

    private extractDecoratorContent(lines: string[], decoratorIndex: number): string {
        let content = '';
        let braceCount = 0;
        let started = false;

        for (let i = decoratorIndex; i < lines.length; i++) {
            const line = lines[i];
            if (line.includes('{')) {
                started = true;
                braceCount += (line.match(/\{/g) || []).length;
            }
            if (started) {
                content += line + '\n';
                braceCount -= (line.match(/\}/g) || []).length;
                if (braceCount === 0) break;
            }
        }

        return content;
    }

    private extractProperty(content: string, property: string): string | undefined {
        const match = content.match(new RegExp(`${property}:\\s*['"\`]([^'"\`]+)['"\`]`));
        return match ? match[1] : undefined;
    }

    private extractArrayProperty(content: string, property: string): string[] | undefined {
        const match = content.match(new RegExp(`${property}:\\s*\\[([^\\]]+)\\]`));
        if (match) {
            return match[1].split(',').map(item => item.trim().replace(/['"\`]/g, ''));
        }
        return undefined;
    }

    private extractValidationRules(lines: string[], startIndex: number): string[] {
        const rules: string[] = [];
        // Look for validation-related patterns in surrounding lines
        for (let i = Math.max(0, startIndex - 3); i < Math.min(lines.length, startIndex + 3); i++) {
            const line = lines[i];
            if (line.includes('required') || line.includes('email') || line.includes('minLength') || line.includes('pattern')) {
                rules.push(line.trim());
            }
        }
        return rules;
    }

    private extractDeletedFunctions(diffContent: string): string[] {
        const deletedFunctions: string[] = [];
        const lines = diffContent.split('\n');

        for (const line of lines) {
            if (line.startsWith('-') && !line.startsWith('---')) {
                const functionMatch = line.match(/(?:function|method)\s+(\w+)/);
                if (functionMatch) {
                    deletedFunctions.push(functionMatch[1]);
                }
            }
        }

        return deletedFunctions;
    }

    private extractFileFromDiffLine(lines: string[], currentIndex: number): string {
        // Look backwards for the diff --git line
        for (let i = currentIndex; i >= 0; i--) {
            const diffMatch = lines[i].match(/^diff --git a\/.+ b\/(.+)$/);
            if (diffMatch) {
                return diffMatch[1];
            }
        }
        return 'unknown';
    }
}