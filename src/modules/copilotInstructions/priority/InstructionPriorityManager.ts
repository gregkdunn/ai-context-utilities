import * as path from 'path';
import * as fs from 'fs';

export interface ParsedInstruction {
    content: string;
    frontmatter: {
        applyTo?: string;
        priority?: number;
        userOverride?: boolean;
        lastModified?: string;
        description?: string;
        framework?: string;
        category?: string;
    };
}

export interface PrioritizedInstruction extends ParsedInstruction {
    filePath: string;
    priority: number;
    category: string;
}

export interface InstructionFile {
    path: string;
    name: string;
    exists: boolean;
}

export class InstructionPriorityManager {
    private readonly INSTRUCTION_PATTERNS = [
        '.github/instructions/user-overrides.instructions.md',
        '.github/instructions/project-specific.instructions.md',
        '.github/instructions/*.instructions.md',
        '.github/copilot-instructions.md'
    ];

    constructor(private workspaceRoot: string) {}

    private async getYAML(): Promise<any> {
        try {
            const yaml = await import('js-yaml');
            return yaml;
        } catch (error) {
            console.warn('js-yaml is not installed - YAML frontmatter parsing will be skipped');
            return null;
        }
    }

    async loadAllInstructions(): Promise<PrioritizedInstruction[]> {
        const instructionFiles = await this.findInstructionFiles();
        const instructions: PrioritizedInstruction[] = [];
        
        for (const file of instructionFiles) {
            if (!file.exists) continue;
            
            try {
                const content = await fs.promises.readFile(file.path, 'utf8');
                const parsed = await this.parseInstructionFile(content);
                
                instructions.push({
                    ...parsed,
                    filePath: file.path,
                    priority: this.calculateEffectivePriority(parsed, file.path),
                    category: this.categorizeInstruction(file.name, parsed)
                });
            } catch (error) {
                console.error(`Failed to load instruction file ${file.path}:`, error);
            }
        }
        
        // Sort by priority (highest first), then by category
        return instructions.sort((a, b) => {
            const priorityDiff = b.priority - a.priority;
            if (priorityDiff !== 0) return priorityDiff;
            return a.category.localeCompare(b.category);
        });
    }

    private async findInstructionFiles(): Promise<InstructionFile[]> {
        const files: InstructionFile[] = [];
        
        // User overrides (highest priority)
        const userOverridePath = path.join(this.workspaceRoot, '.github/instructions/user-overrides.instructions.md');
        files.push({
            path: userOverridePath,
            name: 'user-overrides.instructions.md',
            exists: fs.existsSync(userOverridePath)
        });

        // Project-specific instructions
        const projectSpecificPath = path.join(this.workspaceRoot, '.github/instructions/project-specific.instructions.md');
        files.push({
            path: projectSpecificPath,
            name: 'project-specific.instructions.md',
            exists: fs.existsSync(projectSpecificPath)
        });

        // Framework-specific instructions
        const instructionsDir = path.join(this.workspaceRoot, '.github/instructions');
        if (fs.existsSync(instructionsDir)) {
            try {
                const dirContents = await fs.promises.readdir(instructionsDir);
                for (const file of dirContents) {
                    if (file.endsWith('.instructions.md') && 
                        !file.includes('user-overrides') && 
                        !file.includes('project-specific')) {
                        const filePath = path.join(instructionsDir, file);
                        files.push({
                            path: filePath,
                            name: file,
                            exists: true
                        });
                    }
                }
            } catch (error) {
                console.error('Failed to read instructions directory:', error);
            }
        }

        // Main copilot instructions
        const mainInstructionsPath = path.join(this.workspaceRoot, '.github/copilot-instructions.md');
        files.push({
            path: mainInstructionsPath,
            name: 'copilot-instructions.md',
            exists: fs.existsSync(mainInstructionsPath)
        });

        return files;
    }
    
    async parseInstructionFile(content: string): Promise<ParsedInstruction> {
        const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
        
        if (frontmatterMatch) {
            const [, frontmatterYaml, bodyContent] = frontmatterMatch;
            const yaml = await this.getYAML();
            
            if (yaml) {
                try {
                    const frontmatter = yaml.load(frontmatterYaml) as any || {};
                    return {
                        content: bodyContent.trim(),
                        frontmatter
                    };
                } catch (error) {
                    console.warn('Failed to parse YAML frontmatter:', error);
                }
            } else {
                // Fallback: try to parse simple key-value pairs
                const frontmatter: any = {};
                const lines = frontmatterYaml.split('\n');
                for (const line of lines) {
                    const match = line.match(/^(\w+):\s*(.*)$/);
                    if (match) {
                        const [, key, value] = match;
                        // Try to parse numbers
                        if (/^\d+$/.test(value)) {
                            frontmatter[key] = parseInt(value);
                        } else if (value === 'true' || value === 'false') {
                            frontmatter[key] = value === 'true';
                        } else {
                            frontmatter[key] = value.trim();
                        }
                    }
                }
                return {
                    content: bodyContent.trim(),
                    frontmatter
                };
            }
        }
        
        return {
            content: content.trim(),
            frontmatter: {}
        };
    }
    
    private calculateEffectivePriority(instruction: ParsedInstruction, filePath: string): number {
        // User overrides always get highest priority
        if (filePath.includes('user-overrides.instructions.md')) {
            return 1000;
        }
        
        // Use frontmatter priority if specified
        if (instruction.frontmatter.priority !== undefined) {
            return instruction.frontmatter.priority;
        }
        
        // Calculate based on file name and specificity
        return this.calculateImplicitPriority(filePath);
    }

    private calculateImplicitPriority(filePath: string): number {
        const fileName = path.basename(filePath);
        
        // Project-specific instructions
        if (fileName.includes('project-specific')) {
            return 200;
        }
        
        // Framework-specific instructions
        if (fileName.includes('angular')) {
            return 100;
        }
        if (fileName.includes('react')) {
            return 95;
        }
        if (fileName.includes('vue')) {
            return 90;
        }
        if (fileName.includes('typescript')) {
            return 50;
        }
        if (fileName.includes('testing') || fileName.includes('jest') || fileName.includes('vitest')) {
            return 40;
        }
        
        // Main copilot instructions
        if (fileName === 'copilot-instructions.md') {
            return 10;
        }
        
        // Generic framework instructions
        if (fileName.endsWith('.instructions.md')) {
            return 30;
        }
        
        return 1; // Lowest priority fallback
    }

    private categorizeInstruction(fileName: string, instruction: ParsedInstruction): string {
        // Use frontmatter category if specified
        if (instruction.frontmatter.category) {
            return instruction.frontmatter.category;
        }
        
        // Categorize based on file name
        if (fileName.includes('user-overrides')) {
            return 'User Overrides';
        }
        if (fileName.includes('project-specific')) {
            return 'Project Specific';
        }
        if (fileName.includes('angular')) {
            return 'Angular Framework';
        }
        if (fileName.includes('react')) {
            return 'React Framework';
        }
        if (fileName.includes('vue')) {
            return 'Vue Framework';
        }
        if (fileName.includes('typescript')) {
            return 'TypeScript Language';
        }
        if (fileName.includes('testing') || fileName.includes('jest') || fileName.includes('vitest')) {
            return 'Testing & Quality';
        }
        if (fileName === 'copilot-instructions.md') {
            return 'General Instructions';
        }
        
        return 'Miscellaneous';
    }

    async validateInstructionHierarchy(): Promise<{ valid: boolean; issues: string[] }> {
        const instructions = await this.loadAllInstructions();
        const issues: string[] = [];
        
        // Check for priority conflicts
        const priorityGroups = new Map<number, PrioritizedInstruction[]>();
        for (const instruction of instructions) {
            if (!priorityGroups.has(instruction.priority)) {
                priorityGroups.set(instruction.priority, []);
            }
            priorityGroups.get(instruction.priority)!.push(instruction);
        }
        
        for (const [priority, group] of priorityGroups) {
            if (group.length > 1 && priority !== 1) { // Multiple files at same priority (except default)
                const fileNames = group.map(i => path.basename(i.filePath));
                issues.push(`Multiple files have priority ${priority}: ${fileNames.join(', ')}`);
            }
        }
        
        // Check for missing user overrides file
        const hasUserOverrides = instructions.some(i => i.filePath.includes('user-overrides'));
        if (!hasUserOverrides) {
            issues.push('User override file not found - create one for customization');
        }
        
        // Check for conflicting applyTo patterns
        const applyToPatterns = instructions
            .filter(i => i.frontmatter.applyTo)
            .map(i => ({ pattern: i.frontmatter.applyTo!, file: path.basename(i.filePath) }));
        
        for (let i = 0; i < applyToPatterns.length; i++) {
            for (let j = i + 1; j < applyToPatterns.length; j++) {
                if (applyToPatterns[i].pattern === applyToPatterns[j].pattern) {
                    issues.push(`Duplicate applyTo pattern "${applyToPatterns[i].pattern}" in ${applyToPatterns[i].file} and ${applyToPatterns[j].file}`);
                }
            }
        }
        
        return {
            valid: issues.length === 0,
            issues
        };
    }

    async generateMergedInstructions(): Promise<string> {
        const instructions = await this.loadAllInstructions();
        
        if (instructions.length === 0) {
            return '# No Copilot Instructions Found\n\nNo instruction files were found in this workspace.';
        }
        
        let merged = '# Merged Copilot Instructions\n\n';
        merged += `*Generated on ${new Date().toISOString()}*\n\n`;
        merged += `**Priority Order** (highest to lowest):\n`;
        
        for (const instruction of instructions) {
            const fileName = path.basename(instruction.filePath);
            merged += `- ${fileName} (Priority: ${instruction.priority})\n`;
        }
        
        merged += '\n---\n\n';
        
        // Group by category
        const categories = new Map<string, PrioritizedInstruction[]>();
        for (const instruction of instructions) {
            if (!categories.has(instruction.category)) {
                categories.set(instruction.category, []);
            }
            categories.get(instruction.category)!.push(instruction);
        }
        
        // Sort categories by highest priority instruction in each category
        const sortedCategories = Array.from(categories.entries())
            .sort(([, a], [, b]) => Math.max(...b.map(i => i.priority)) - Math.max(...a.map(i => i.priority)));
        
        for (const [categoryName, categoryInstructions] of sortedCategories) {
            merged += `## ${categoryName}\n\n`;
            
            for (const instruction of categoryInstructions) {
                const fileName = path.basename(instruction.filePath);
                merged += `### From: ${fileName}\n\n`;
                merged += instruction.content;
                merged += '\n\n---\n\n';
            }
        }
        
        return merged;
    }

    async exportInstructionSummary(): Promise<{ summary: string; stats: any }> {
        const instructions = await this.loadAllInstructions();
        
        const stats = {
            totalFiles: instructions.length,
            categories: new Set(instructions.map(i => i.category)).size,
            priorityRange: instructions.length > 0 ? {
                highest: Math.max(...instructions.map(i => i.priority)),
                lowest: Math.min(...instructions.map(i => i.priority))
            } : null,
            hasUserOverrides: instructions.some(i => i.filePath.includes('user-overrides')),
            totalContentLength: instructions.reduce((sum, i) => sum + i.content.length, 0)
        };
        
        let summary = '# Instruction File Summary\n\n';
        summary += `**Total Files**: ${stats.totalFiles}\n`;
        summary += `**Categories**: ${stats.categories}\n`;
        summary += `**User Overrides**: ${stats.hasUserOverrides ? 'Yes' : 'No'}\n`;
        summary += `**Total Content**: ${(stats.totalContentLength / 1024).toFixed(1)} KB\n\n`;
        
        if (stats.priorityRange) {
            summary += `**Priority Range**: ${stats.priorityRange.lowest} - ${stats.priorityRange.highest}\n\n`;
        }
        
        summary += '## File Breakdown\n\n';
        
        for (const instruction of instructions) {
            const fileName = path.basename(instruction.filePath);
            const contentLength = (instruction.content.length / 1024).toFixed(1);
            summary += `- **${fileName}** (Priority: ${instruction.priority}, Size: ${contentLength} KB)\n`;
            summary += `  - Category: ${instruction.category}\n`;
            if (instruction.frontmatter.description) {
                summary += `  - Description: ${instruction.frontmatter.description}\n`;
            }
            summary += '\n';
        }
        
        return { summary, stats };
    }
}