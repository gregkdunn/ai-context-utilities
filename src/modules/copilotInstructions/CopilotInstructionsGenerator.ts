/**
 * Copilot Instructions Generator
 * Main orchestrator for generating Copilot instruction files
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { ServiceContainer } from '../../core/ServiceContainer';
import { InstructionBackupManager } from './InstructionBackupManager';
import { CopilotInstructionsUI } from './CopilotInstructionsUI';
import { SecureFileManager } from './SecureFileManager';
import { FrameworkDetectionService } from './FrameworkDetectionService';
import { InstructionTemplateEngine } from './InstructionTemplateEngine';
import { WorkspaceAnalysis } from '../../utils/WorkspaceAnalyzer';
import { ESLintConfigParser, ParsedRule } from './parsing/ESLintConfigParser';
import { PrettierConfigParser } from './parsing/PrettierConfigParser';
import { UserOverrideManager } from './override/UserOverrideManager';
import { InstructionPriorityManager } from './priority/InstructionPriorityManager';
import { YAMLFrontmatterGenerator } from './frontmatter/YAMLFrontmatterGenerator';
import { AngularContextDownloader } from './AngularContextDownloader';

export interface GeneratorOptions {
    type: 'quick' | 'custom' | 'browse';
    frameworks?: string[];
}

export interface InstructionSet {
    mainFile: InstructionFile;
    frameworkFiles: InstructionFile[];
}

export interface InstructionFile {
    path: string;
    content: string;
    framework?: string;
}

export class CopilotInstructionsGenerator {
    private ui: CopilotInstructionsUI;
    private fileManager: SecureFileManager;
    private frameworkDetector: FrameworkDetectionService;
    private templateEngine: InstructionTemplateEngine;
    private eslintParser: ESLintConfigParser;
    private prettierParser: PrettierConfigParser;
    private userOverrideManager: UserOverrideManager;
    private priorityManager: InstructionPriorityManager;
    private frontmatterGenerator: YAMLFrontmatterGenerator;
    private angularContextDownloader: AngularContextDownloader;

    constructor(
        private services: ServiceContainer,
        private outputChannel: vscode.OutputChannel,
        private backupManager: InstructionBackupManager
    ) {
        this.ui = new CopilotInstructionsUI(backupManager, outputChannel);
        this.fileManager = new SecureFileManager(services.workspaceRoot, outputChannel);
        this.frameworkDetector = new FrameworkDetectionService(services.workspaceAnalyzer);
        this.templateEngine = new InstructionTemplateEngine(services.workspaceRoot);
        this.eslintParser = new ESLintConfigParser();
        this.prettierParser = new PrettierConfigParser();
        this.userOverrideManager = new UserOverrideManager(services.workspaceRoot);
        this.priorityManager = new InstructionPriorityManager(services.workspaceRoot);
        this.frontmatterGenerator = new YAMLFrontmatterGenerator();
        this.angularContextDownloader = new AngularContextDownloader(services.workspaceRoot, outputChannel, this.fileManager);
    }

    /**
     * Main entry point - run the generator with progress tracking
     */
    async run(
        progress: vscode.Progress<{ message?: string; increment?: number }>,
        token: vscode.CancellationToken
    ): Promise<void> {
        // Check for existing files
        progress.report({ message: 'Checking existing instructions...', increment: 10 });
        const existing = await this.backupManager.checkExistingInstructions();

        if (existing.exists) {
            const action = await this.ui.handleExistingFiles(existing.hasBackup);
            
            switch (action) {
                case 'update':
                    progress.report({ message: 'Creating backup...', increment: 10 });
                    this.services.updateStatusBar('📦 Creating backup...', 'yellow');
                    await this.backupManager.createBackup(existing.files);
                    await this.generateInstructions(progress, token);
                    break;
                    
                case 'restore':
                    const backupId = await this.ui.showRestoreUI();
                    if (backupId) {
                        progress.report({ message: 'Restoring from backup...', increment: 80 });
                        this.services.updateStatusBar('🔄 Restoring backup...', 'yellow');
                        await this.backupManager.restoreFromBackup(backupId);
                        this.ui.showSuccess('Instructions restored from backup');
                        this.services.updateStatusBar('✅ Backup restored', 'green');
                    }
                    break;
                    
                case 'remove':
                    progress.report({ message: 'Removing files...', increment: 80 });
                    this.services.updateStatusBar('🗑️ Removing files...', 'yellow');
                    await this.backupManager.removeAndBackup(existing.files);
                    this.ui.showSuccess('Instructions removed (backup preserved)');
                    this.services.updateStatusBar('Ready');
                    break;
                    
                default:
                    // Cancel
                    this.services.updateStatusBar('Ready');
                    return;
            }
        } else {
            await this.generateInstructions(progress, token);
        }
    }

    /**
     * Generate new instruction files
     */
    private async generateInstructions(
        progress: vscode.Progress<{ message?: string; increment?: number }>,
        token: vscode.CancellationToken
    ): Promise<void> {
        // Ensure user override file exists first
        progress.report({ message: 'Setting up user overrides...', increment: 5 });
        await this.userOverrideManager.ensureOverrideFileExists();

        // Get setup options
        const setupOption = await this.ui.showSetupOptions();
        if (!setupOption) {
            return; // User cancelled
        }

        // Analyze workspace
        progress.report({ message: 'Analyzing workspace...', increment: 15 });
        this.services.updateStatusBar('🔍 Detecting frameworks...', 'yellow');
        const workspace = await this.analyzeWorkspace();
        
        if (token.isCancellationRequested) {
            throw new Error('Operation cancelled');
        }

        // Parse ESLint configuration
        progress.report({ message: 'Parsing ESLint rules...', increment: 15 });
        this.services.updateStatusBar('📋 Parsing ESLint rules...', 'yellow');
        this.outputChannel.appendLine(`🔍 Searching for ESLint config in: ${this.services.workspaceRoot}`);
        const eslintConfig = await this.eslintParser.parseConfiguration(this.services.workspaceRoot);
        
        if (eslintConfig) {
            this.outputChannel.appendLine(`🔍 ESLint parsing result: ${eslintConfig.configPath ? `Found config at ${eslintConfig.configPath}` : 'No config found'}`);
            if (eslintConfig.checkedPaths.length > 0) {
                this.outputChannel.appendLine(`📂 ESLint paths checked: ${eslintConfig.checkedPaths.slice(0, 5).join(', ')}${eslintConfig.checkedPaths.length > 5 ? ` and ${eslintConfig.checkedPaths.length - 5} more...` : ''}`);
            }
        } else {
            this.outputChannel.appendLine(`🔍 ESLint parsing result: No config found`);
        }
        
        // Parse Prettier configuration
        progress.report({ message: 'Parsing Prettier configuration...', increment: 10 });
        this.outputChannel.appendLine(`🔍 Searching for Prettier config in: ${this.services.workspaceRoot}`);
        const prettierConfig = await this.prettierParser.parseConfiguration(this.services.workspaceRoot);
        
        if (prettierConfig) {
            this.outputChannel.appendLine(`🔍 Prettier parsing result: ${prettierConfig.configPath ? `Found config at ${prettierConfig.configPath}` : 'resolved from defaults'}`);
            if (prettierConfig.checkedPaths.length > 0) {
                this.outputChannel.appendLine(`📂 Prettier paths checked: ${prettierConfig.checkedPaths.slice(0, 5).join(', ')}${prettierConfig.checkedPaths.length > 5 ? ` and ${prettierConfig.checkedPaths.length - 5} more...` : ''}`);
            }
        } else {
            this.outputChannel.appendLine(`🔍 Prettier parsing result: No config found`);
        }

        if (token.isCancellationRequested) {
            throw new Error('Operation cancelled');
        }

        // Build instruction set
        progress.report({ message: 'Building instructions...', increment: 15 });
        const instructions = await this.buildInstructionSet(workspace, setupOption, eslintConfig, prettierConfig);
        
        if (token.isCancellationRequested) {
            throw new Error('Operation cancelled');
        }

        // Write files
        progress.report({ message: 'Writing instruction files...', increment: 40 });
        this.services.updateStatusBar('✨ Generating instructions...', 'yellow');
        await this.writeInstructionFiles(instructions);
        
        this.services.updateStatusBar('✅ Instructions ready', 'green');
    }

    /**
     * Analyze workspace to detect frameworks and configuration
     */
    private async analyzeWorkspace(): Promise<WorkspaceAnalysis> {
        const analysis = await this.services.workspaceAnalyzer.analyze();
        
        // Enhance with framework detection
        const frameworks = await this.frameworkDetector.detectFrameworks();
        
        this.outputChannel.appendLine(`📊 Detected frameworks: ${frameworks.map(f => f.name).join(', ')}`);
        
        return analysis;
    }

    /**
     * Build complete instruction set based on workspace analysis
     */
    private async buildInstructionSet(
        workspace: WorkspaceAnalysis,
        options: GeneratorOptions,
        eslintConfig?: any,
        prettierConfig?: any
    ): Promise<InstructionSet> {
        const frameworkFiles: InstructionFile[] = [];
        
        // 0. Always include user overrides file (it's created during the generate process)
        frameworkFiles.push({
            path: '.github/instructions/user-overrides.instructions.md',
            content: '', // Content is managed by UserOverrideManager
            framework: 'User Overrides'
        });
        
        // 1. Generate ESLint rules instruction file if config exists
        if (eslintConfig && eslintConfig.rules && eslintConfig.rules.length > 0) {
            this.outputChannel.appendLine(`📋 Generating ESLint instructions from ${eslintConfig.rules.length} rules`);
            const eslintContent = this.generateESLintInstructions(eslintConfig.rules, eslintConfig.configPath, eslintConfig.checkedPaths);
            const frontmatter = this.frontmatterGenerator.generateESLintRulesFrontmatter(
                eslintConfig.rules.map((r: ParsedRule) => r.name)
            );
            
            frameworkFiles.push({
                path: '.github/instructions/frameworks/eslint-rules.instructions.md',
                content: frontmatter + '\n' + eslintContent,
                framework: 'ESLint'
            });
        } else if (eslintConfig) {
            this.outputChannel.appendLine(`⚠️ ESLint config found but no rules to translate - generating basic file`);
            // Generate a basic ESLint instructions file even without specific rules
            const basicESLintContent = this.generateBasicESLintInstructions(eslintConfig.configPath, eslintConfig.checkedPaths);
            const frontmatter = this.frontmatterGenerator.generateESLintRulesFrontmatter([]);
            
            frameworkFiles.push({
                path: '.github/instructions/frameworks/eslint-rules.instructions.md',
                content: frontmatter + '\n' + basicESLintContent,
                framework: 'ESLint'
            });
        } else {
            this.outputChannel.appendLine(`ℹ️ No ESLint configuration found`);
        }

        // 2. Generate Prettier configuration instructions if config exists
        if (prettierConfig && prettierConfig.instructions && prettierConfig.instructions.length > 0) {
            this.outputChannel.appendLine(`🎨 Generating Prettier instructions from config`);
            const prettierContent = this.generatePrettierInstructions(prettierConfig);
            const frontmatter = this.frontmatterGenerator.generatePrettierConfigFrontmatter();
            
            frameworkFiles.push({
                path: '.github/instructions/frameworks/prettier-formatting.instructions.md',
                content: frontmatter + '\n' + prettierContent,
                framework: 'Prettier'
            });
        } else if (prettierConfig) {
            this.outputChannel.appendLine(`⚠️ Prettier config found but no instructions generated - generating basic file`);
            // Generate a basic Prettier instructions file even without specific options
            const basicPrettierContent = this.generateBasicPrettierInstructions(prettierConfig.configPath, prettierConfig.checkedPaths);
            const frontmatter = this.frontmatterGenerator.generatePrettierConfigFrontmatter();
            
            frameworkFiles.push({
                path: '.github/instructions/frameworks/prettier-formatting.instructions.md',
                content: frontmatter + '\n' + basicPrettierContent,
                framework: 'Prettier'
            });
        } else {
            this.outputChannel.appendLine(`ℹ️ No Prettier configuration found`);
        }

        // 3. Detect frameworks first
        const detectedFrameworks = await this.frameworkDetector.detectFrameworks();
        
        // 4. Determine which frameworks to include
        let frameworks: string[] = [];
        if (options.type === 'quick') {
            // Use all detected frameworks
            frameworks = this.getDetectedFrameworks(workspace);
        } else if (options.type === 'custom' && options.frameworks) {
            // Use user-selected frameworks
            frameworks = options.frameworks;
        }

        // 5. Download Angular context files if Angular is detected
        const isAngularProject = frameworks.some(f => f.toLowerCase() === 'angular') || 
                                 detectedFrameworks.some(f => f.name.toLowerCase() === 'angular');
        
        if (isAngularProject) {
            this.outputChannel.appendLine('🅰️ Angular detected - checking for Angular context files...');
            
            const contextUpToDate = await this.angularContextDownloader.areContextFilesUpToDate();
            if (!contextUpToDate) {
                this.outputChannel.appendLine('📥 Downloading latest Angular context files...');
                const downloadResult = await this.angularContextDownloader.downloadAngularContext();
                
                if (downloadResult.success) {
                    // Add Angular context instruction file
                    const angularContextContent = this.angularContextDownloader.generateAngularContextInstructions();
                    const angularContextFrontmatter = this.frontmatterGenerator.generateForFramework(
                        'Angular Context',
                        { framework: 'Angular', version: '1.0.0', confidence: 1.0, detectedFeatures: ['Context Files'], dependencies: [] }
                    );
                    
                    frameworkFiles.push({
                        path: '.github/instructions/frameworks/angular-context.instructions.md',
                        content: angularContextFrontmatter + '\n' + angularContextContent,
                        framework: 'Angular Context'
                    });
                    
                    this.outputChannel.appendLine(`✅ Angular context files ready for Copilot instructions`);
                } else {
                    this.outputChannel.appendLine(`⚠️ Could not download Angular context files - continuing without them`);
                }
            } else {
                this.outputChannel.appendLine('✅ Angular context files are up to date');
                
                // Still add the Angular context instruction file even if files weren't downloaded
                const angularContextContent = this.angularContextDownloader.generateAngularContextInstructions();
                const angularContextFrontmatter = this.frontmatterGenerator.generateForFramework(
                    'Angular Context',
                    { framework: 'Angular', version: '1.0.0', confidence: 1.0, detectedFeatures: ['Context Files'], dependencies: [] }
                );
                
                frameworkFiles.push({
                    path: '.github/instructions/frameworks/angular-context.instructions.md',
                    content: angularContextFrontmatter + '\n' + angularContextContent,
                    framework: 'Angular Context'
                });
            }
        }

        // 6. Generate framework-specific files with frontmatter
        for (const framework of frameworks) {
            const frameworkInfo = detectedFrameworks.find(f => 
                f.name.toLowerCase() === framework.toLowerCase()
            );
            
            const content = await this.templateEngine.generateFrameworkInstructions(
                framework,
                workspace
            );
            
            if (content && frameworkInfo) {
                const metadata = {
                    framework: frameworkInfo.name,
                    version: frameworkInfo.version || '1.0.0',
                    confidence: frameworkInfo.confidence,
                    detectedFeatures: frameworkInfo.features,
                    dependencies: []
                };
                
                const frontmatter = this.frontmatterGenerator.generateForFramework(
                    framework,
                    metadata
                );
                
                frameworkFiles.push({
                    path: this.getFrameworkFilePath(framework),
                    content: frontmatter + '\n' + content,
                    framework
                });
            }
        }

        // 7. Generate main instructions file with links to all generated files
        const mainContent = await this.generateMainInstructionsWithLinks(workspace, frameworkFiles);
        const projectFrontmatter = this.frontmatterGenerator.generateProjectSpecificFrontmatter(
            'Current Project'
        );

        return {
            mainFile: {
                path: '.github/instructions/copilot-instructions.md',
                content: projectFrontmatter + '\n' + mainContent
            },
            frameworkFiles
        };
    }

    /**
     * Get list of detected frameworks from workspace analysis
     */
    private getDetectedFrameworks(workspace: WorkspaceAnalysis): string[] {
        const frameworks: string[] = [];
        
        // Frontend frameworks
        if (workspace.frontendFrameworks.length > 0) {
            frameworks.push(...workspace.frontendFrameworks.map(f => f.split(' ')[0]));
        }
        
        // Always include TypeScript if detected
        if (workspace.typescript.version || workspace.typescript.hasConfig) {
            frameworks.push('TypeScript');
        }
        
        // Test frameworks
        if (workspace.testFrameworks.length > 0) {
            frameworks.push(...workspace.testFrameworks.map(f => f.split(' ')[0]));
        }
        
        return [...new Set(frameworks)]; // Remove duplicates
    }

    /**
     * Generate ESLint rules instructions
     */
    private generateESLintInstructions(rules: ParsedRule[], configPath?: string, checkedPaths?: string[]): string {
        const categorizedRules = this.categorizeRules(rules);
        
        let content = '# TypeScript Development Guidelines\n\n';
        content += '*Generated from ESLint configuration*\n\n';
        
        if (configPath) {
            content += `**Configuration Source**: \`${configPath}\`\n\n`;
        }
        
        if (checkedPaths && checkedPaths.length > 0) {
            content += '**Paths Searched**:\n';
            for (const checkedPath of checkedPaths.slice(0, 10)) {
                const exists = require('fs').existsSync(checkedPath);
                content += `- \`${checkedPath}\` ${exists ? '✅' : '❌'}\n`;
            }
            if (checkedPaths.length > 10) {
                content += `- ... and ${checkedPaths.length - 10} more paths\n`;
            }
            content += '\n';
        }
        
        for (const [category, categoryRules] of Object.entries(categorizedRules)) {
            if (categoryRules.length === 0) continue;
            
            content += `## ${category}\n\n`;
            
            for (const rule of categoryRules) {
                content += `- ${rule.translation}\n`;
            }
            
            content += '\n';
        }
        
        return content;
    }

    /**
     * Generate Prettier configuration instructions
     */
    private generatePrettierInstructions(prettierConfig: any): string {
        let content = '# Code Formatting Guidelines\n\n';
        content += '*Generated from Prettier configuration*\n\n';
        
        if (prettierConfig.configPath) {
            content += `**Configuration Source**: \`${prettierConfig.configPath}\`\n\n`;
        }
        
        if (prettierConfig.checkedPaths && prettierConfig.checkedPaths.length > 0) {
            content += '**Paths Searched**:\n';
            for (const checkedPath of prettierConfig.checkedPaths.slice(0, 10)) {
                const exists = require('fs').existsSync(checkedPath);
                content += `- \`${checkedPath}\` ${exists ? '✅' : '❌'}\n`;
            }
            if (prettierConfig.checkedPaths.length > 10) {
                content += `- ... and ${prettierConfig.checkedPaths.length - 10} more paths\n`;
            }
            content += '\n';
        }
        
        content += '## Formatting Rules\n\n';
        
        for (const instruction of prettierConfig.instructions) {
            content += `- ${instruction}\n`;
        }
        
        content += '\n## Configuration Details\n\n';
        content += 'The following Prettier options are configured for this project:\n\n';
        content += '```json\n';
        content += JSON.stringify(prettierConfig.options, null, 2);
        content += '\n```\n';
        
        return content;
    }

    /**
     * Categorize ESLint rules by type
     */
    private categorizeRules(rules: ParsedRule[]): Record<string, ParsedRule[]> {
        const categories: Record<string, ParsedRule[]> = {
            'Type Safety': [],
            'Import Organization': [],
            'Naming Conventions': [],
            'Asynchronous Code': [],
            'Modern JavaScript': [],
            'React Best Practices': [],
            'Angular Best Practices': [],
            'General Code Quality': []
        };
        
        for (const rule of rules) {
            if (categories[rule.category]) {
                categories[rule.category].push(rule);
            } else {
                categories['General Code Quality'].push(rule);
            }
        }
        
        return categories;
    }

    /**
     * Get file path for framework-specific instructions
     */
    private getFrameworkFilePath(framework: string): string {
        const frameworkName = framework.toLowerCase().replace(/\s+/g, '-');
        return `.github/instructions/frameworks/${frameworkName}.instructions.md`;
    }

    /**
     * Generate preview content
     */
    private generatePreview(instructions: InstructionSet): string {
        const sections = [
            '# Copilot Instructions Preview',
            '',
            '## Files to be created:',
            '',
            `### Main Instructions: ${instructions.mainFile.path}`,
            '```markdown',
            instructions.mainFile.content.substring(0, 500) + '...',
            '```',
            ''
        ];

        for (const file of instructions.frameworkFiles) {
            sections.push(
                `### ${file.framework}: ${file.path}`,
                '```markdown',
                file.content.substring(0, 300) + '...',
                '```',
                ''
            );
        }

        return sections.join('\n');
    }

    /**
     * Write instruction files to disk
     */
    private async writeInstructionFiles(instructions: InstructionSet): Promise<void> {
        // Write main file
        await this.fileManager.writeFile(
            instructions.mainFile.path,
            instructions.mainFile.content
        );

        // Write framework files (skip user-overrides as it's managed by UserOverrideManager)
        let writtenFiles = 0;
        for (const file of instructions.frameworkFiles) {
            if (file.path.includes('user-overrides.instructions.md')) {
                this.outputChannel.appendLine(`ℹ️ Skipping user-overrides file (managed by UserOverrideManager)`);
            } else {
                await this.fileManager.writeFile(file.path, file.content);
                writtenFiles++;
            }
        }

        this.outputChannel.appendLine(
            `✅ Created ${1 + writtenFiles} instruction files (user-overrides preserved)`
        );

        // Open the main file for viewing
        await this.openMainFileForViewing(instructions.mainFile.path);
    }

    /**
     * Generate main instructions with links to all generated files
     */
    private async generateMainInstructionsWithLinks(
        workspace: WorkspaceAnalysis,
        frameworkFiles: InstructionFile[]
    ): Promise<string> {
        const sections = [];

        // Main project description
        const mainFrameworks = this.getMainFrameworks(workspace);
        const testFrameworks = this.getTestFrameworks(workspace);

        sections.push(
            '# GitHub Copilot Instructions',
            '',
            `This is a ${mainFrameworks} project with ${testFrameworks}.`,
            '',
            '## Quick Reference',
            '',
            '**Important**: This file links to specialized instruction files. Include this file in your Copilot context to access all project guidelines.',
            '',
            '## Project Guidelines',
            ''
        );

        // Add links to all generated instruction files
        if (frameworkFiles.length > 0) {
            sections.push('### Specialized Instructions');
            sections.push('');
            sections.push('The following files contain detailed guidelines for different aspects of this project:');
            sections.push('');

            // Sort files by priority (user overrides first, then by priority)
            const sortedFiles = [...frameworkFiles].sort((a, b) => {
                if (a.path.includes('user-overrides')) return -1;
                if (b.path.includes('user-overrides')) return 1;
                return a.path.localeCompare(b.path);
            });

            for (const file of sortedFiles) {
                const fileName = file.path.split('/').pop() || file.path;
                const displayName = this.getDisplayName(file.framework, fileName);
                const priority = this.getPriorityFromFileName(fileName);
                
                // Convert absolute path to relative path from main file location (.github/instructions/)
                let relativePath = file.path;
                if (file.path.startsWith('.github/instructions/')) {
                    relativePath = file.path.substring('.github/instructions/'.length);  // Remove '.github/instructions/' prefix
                }
                
                sections.push(`- **[${displayName}](./${relativePath})** ${priority ? `(Priority: ${priority})` : ''}`);
                
                // Add description based on file type
                const description = this.getFileDescription(fileName);
                if (description) {
                    sections.push(`  ${description}`);
                }
            }
            
            sections.push('');
            sections.push('### Usage Instructions');
            sections.push('');
            sections.push('1. **Include this file** in your Copilot context to access all guidelines');
            sections.push('2. **User overrides** (Priority 1000) take precedence over all other instructions');
            sections.push('3. **Official framework docs** (Priority 900) provide authoritative framework guidance');
            sections.push('4. **Framework-specific** guidelines (Priority 100) apply to relevant file types');
            sections.push('5. **ESLint rules** (Priority 30) are translated into natural language guidance');
            sections.push('6. **Prettier formatting** (Priority 20) preferences are documented for consistency');
            sections.push('');
        }

        // Add general project information
        sections.push('## Project Structure');
        sections.push('');
        
        if (workspace.frontendFrameworks.length > 0) {
            sections.push(`**Frontend**: ${workspace.frontendFrameworks.join(', ')}`);
        }
        
        if (workspace.testFrameworks.length > 0) {
            sections.push(`**Testing**: ${workspace.testFrameworks.join(', ')}`);
        }
        
        if (workspace.typescript.version) {
            sections.push(`**TypeScript**: ${workspace.typescript.version}`);
        }
        
        sections.push('');
        sections.push('## Best Practices');
        sections.push('');
        sections.push('- Follow the guidelines in the linked instruction files');
        sections.push('- Prioritize user overrides for team-specific decisions');
        sections.push('- Maintain consistency with existing code patterns');
        sections.push('- Use ESLint and Prettier configurations as defined');
        sections.push('');
        sections.push('---');
        sections.push('');
        sections.push('*Generated by AI Context Util v3.5.0 - Copilot Instructions Module*');

        return sections.join('\n');
    }

    /**
     * Get display name for instruction file
     */
    private getDisplayName(framework: string | undefined, fileName: string): string {
        if (fileName.includes('user-overrides')) {
            return 'User Overrides & Team Decisions';
        }
        if (fileName.includes('eslint-rules')) {
            return 'ESLint Rules & Code Quality';
        }
        if (fileName.includes('prettier-formatting')) {
            return 'Prettier Formatting Guidelines';
        }
        if (fileName.includes('angular-context')) {
            return 'Angular Context Files & Documentation';
        }
        if (fileName.includes('angular')) {
            return 'Angular Framework Guidelines';
        }
        if (fileName.includes('react')) {
            return 'React Framework Guidelines';
        }
        if (fileName.includes('vue')) {
            return 'Vue Framework Guidelines';
        }
        if (fileName.includes('typescript')) {
            return 'TypeScript Development Guidelines';
        }
        
        return `${framework || 'Unknown'} Guidelines`;
    }

    /**
     * Get priority from file name
     */
    private getPriorityFromFileName(fileName: string): number | null {
        if (fileName.includes('user-overrides')) return 1000;  // Highest - team decisions
        if (fileName.includes('angular-context')) return 900;  // Official Angular docs from angular.dev
        if (fileName.includes('angular') || fileName.includes('react') || fileName.includes('vue')) return 100;
        if (fileName.includes('typescript')) return 50;
        if (fileName.includes('eslint-rules')) return 30;
        if (fileName.includes('prettier-formatting')) return 20;
        return null;
    }

    /**
     * Get description for instruction file
     */
    private getFileDescription(fileName: string): string | null {
        if (fileName.includes('user-overrides')) {
            return 'Your team\'s architectural decisions and preferences (highest priority)';
        }
        if (fileName.includes('eslint-rules')) {
            return 'ESLint rules translated into natural language guidance';
        }
        if (fileName.includes('prettier-formatting')) {
            return 'Code formatting preferences and style guidelines';
        }
        if (fileName.includes('angular-context')) {
            return 'Official Angular documentation and LLM context from angular.dev (high priority)';
        }
        if (fileName.includes('angular')) {
            return 'Angular-specific patterns, best practices, and modern features';
        }
        if (fileName.includes('react')) {
            return 'React patterns, hooks, and component best practices';
        }
        if (fileName.includes('vue')) {
            return 'Vue.js composition API and component patterns';
        }
        if (fileName.includes('typescript')) {
            return 'TypeScript type safety and advanced language features';
        }
        
        return null;
    }

    /**
     * Get main frameworks description
     */
    private getMainFrameworks(workspace: WorkspaceAnalysis): string {
        if (workspace.frontendFrameworks.length === 0) {
            return workspace.typescript.version ? 'TypeScript' : 'JavaScript';
        }
        
        const mainFrameworks = workspace.frontendFrameworks
            .map(f => f.split(' ')[0])
            .join(' and ');
            
        return mainFrameworks;
    }
    
    /**
     * Get test frameworks description
     */
    private getTestFrameworks(workspace: WorkspaceAnalysis): string {
        if (workspace.testFrameworks.length === 0) {
            return 'no test framework detected';
        }
        
        return workspace.testFrameworks
            .map(f => f.split(' ')[0])
            .join(' and ');
    }

    /**
     * Generate basic ESLint instructions when config exists but has no specific rules
     */
    private generateBasicESLintInstructions(configPath?: string, checkedPaths?: string[]): string {
        let content = `# ESLint Code Quality Guidelines

*Generated from ESLint configuration (basic setup detected)*

`;

        if (configPath) {
            content += `**Configuration Source**: \`${configPath}\`\n\n`;
        }
        
        if (checkedPaths && checkedPaths.length > 0) {
            content += '**Paths Searched**:\n';
            for (const checkedPath of checkedPaths.slice(0, 10)) {
                const exists = require('fs').existsSync(checkedPath);
                content += `- \`${checkedPath}\` ${exists ? '✅' : '❌'}\n`;
            }
            if (checkedPaths.length > 10) {
                content += `- ... and ${checkedPaths.length - 10} more paths\n`;
            }
            content += '\n';
        }

        content += `## General Code Quality

ESLint configuration was detected in your project. While specific rules weren't parsed, here are general guidelines for maintaining code quality:

### Best Practices
- Follow consistent coding patterns throughout the project
- Use meaningful variable and function names
- Keep functions small and focused on a single responsibility
- Add comments for complex logic

### TypeScript Guidelines (if applicable)
- Use specific types instead of \`any\` when possible
- Prefer interfaces for object shapes
- Use proper error handling with try-catch blocks
- Follow consistent import/export patterns

### Code Organization
- Group related imports together
- Keep file sizes reasonable
- Use consistent indentation
- Remove unused imports and variables

*Note: For more specific guidelines, ensure your ESLint configuration includes explicit rules that can be translated into natural language instructions.*`;
        
        return content;
    }

    /**
     * Generate basic Prettier instructions when config exists but has no specific options
     */
    private generateBasicPrettierInstructions(configPath?: string, checkedPaths?: string[]): string {
        let content = `# Code Formatting Guidelines

*Generated from Prettier configuration (basic setup detected)*

`;

        if (configPath) {
            content += `**Configuration Source**: \`${configPath}\`\n\n`;
        }
        
        if (checkedPaths && checkedPaths.length > 0) {
            content += '**Paths Searched**:\n';
            for (const checkedPath of checkedPaths.slice(0, 10)) {
                const exists = require('fs').existsSync(checkedPath);
                content += `- \`${checkedPath}\` ${exists ? '✅' : '❌'}\n`;
            }
            if (checkedPaths.length > 10) {
                content += `- ... and ${checkedPaths.length - 10} more paths\n`;
            }
            content += '\n';
        }

        content += `## General Formatting

Prettier configuration was detected in your project. Here are general formatting guidelines:

### Consistency Guidelines
- Use consistent indentation throughout the project
- Maintain consistent quote style (single or double quotes)
- Follow consistent semicolon usage
- Keep line lengths reasonable for readability

### Best Practices
- Let Prettier handle formatting automatically
- Configure your editor to format on save
- Use consistent spacing around operators
- Maintain consistent bracket spacing

### Project Standards
- Follow the formatting rules established in your Prettier config
- Ensure all team members use the same Prettier settings
- Consider using a \`.prettierrc\` file to make formatting explicit
- Run Prettier before committing code changes

*Note: For more specific guidelines, configure explicit options in your Prettier configuration file.*`;
        
        return content;
    }

    /**
     * Open the main copilot-instructions.md file for user viewing
     */
    private async openMainFileForViewing(filePath: string): Promise<void> {
        try {
            const absolutePath = path.join(this.services.workspaceRoot, filePath);
            const fileUri = vscode.Uri.file(absolutePath);
            
            // Open the file in the editor
            const document = await vscode.workspace.openTextDocument(fileUri);
            await vscode.window.showTextDocument(document, {
                preview: false, // Open in a regular tab, not preview
                viewColumn: vscode.ViewColumn.One
            });

            this.outputChannel.appendLine(`📖 Opened main instructions file: ${filePath}`);

        } catch (error) {
            this.outputChannel.appendLine(`⚠️ Could not open main file: ${error}`);
            // Don't throw - this is not critical to the operation
        }
    }
}