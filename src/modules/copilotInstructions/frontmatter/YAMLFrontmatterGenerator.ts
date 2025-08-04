// Remove direct import - will use dynamic import instead

export interface FrontmatterOptions {
    applyTo?: string | string[];
    priority?: number;
    framework?: string;
    category?: string;
    description?: string;
    userOverride?: boolean;
    lastModified?: string;
    version?: string;
    tags?: string[];
    fileTypes?: string[];
    excludePatterns?: string[];
    author?: string;
    dependencies?: string[];
    requiredPlugins?: string[];
}

export interface InstructionMetadata {
    framework: string;
    version: string;
    confidence: number;
    detectedFeatures: string[];
    eslintRules?: string[];
    prettierConfig?: boolean;
    testingFramework?: string;
    buildTool?: string;
    dependencies?: string[];
}

export class YAMLFrontmatterGenerator {
    private async getYAML(): Promise<any> {
        try {
            const yaml = await import('js-yaml');
            return yaml;
        } catch (error) {
            // Return null if js-yaml is not installed
            return null;
        }
    }

    private formatYAMLManually(obj: Record<string, any>, indent: number = 0): string {
        const lines: string[] = [];
        const spaces = '  '.repeat(indent);
        
        for (const [key, value] of Object.entries(obj).sort()) {
            if (value === undefined || value === null) {
                continue;
            }
            
            if (Array.isArray(value)) {
                lines.push(`${spaces}${key}:`);
                for (const item of value) {
                    lines.push(`${spaces}  - ${item}`);
                }
            } else if (typeof value === 'object') {
                lines.push(`${spaces}${key}:`);
                lines.push(this.formatYAMLManually(value, indent + 1));
            } else if (typeof value === 'string' && value.includes('\n')) {
                // Multi-line string
                lines.push(`${spaces}${key}: |`);
                value.split('\n').forEach(line => {
                    lines.push(`${spaces}  ${line}`);
                });
            } else if (typeof value === 'string' && (value.includes(':') || value.includes('#'))) {
                // Quote strings that might confuse YAML parser
                lines.push(`${spaces}${key}: "${value}"`);
            } else {
                lines.push(`${spaces}${key}: ${value}`);
            }
        }
        
        return lines.join('\n');
    }

    generateFrontmatter(options: FrontmatterOptions): string {
        const frontmatter: Record<string, any> = {};
        
        // Core fields
        if (options.applyTo) {
            frontmatter.applyTo = options.applyTo;
        }
        
        if (options.priority !== undefined) {
            frontmatter.priority = options.priority;
        }
        
        if (options.framework) {
            frontmatter.framework = options.framework;
        }
        
        if (options.category) {
            frontmatter.category = options.category;
        }
        
        if (options.description) {
            frontmatter.description = options.description;
        }
        
        // Metadata fields
        frontmatter.lastModified = options.lastModified || new Date().toISOString();
        
        if (options.version) {
            frontmatter.version = options.version;
        }
        
        if (options.userOverride !== undefined) {
            frontmatter.userOverride = options.userOverride;
        }
        
        if (options.tags && options.tags.length > 0) {
            frontmatter.tags = options.tags;
        }
        
        if (options.fileTypes && options.fileTypes.length > 0) {
            frontmatter.fileTypes = options.fileTypes;
        }
        
        if (options.excludePatterns && options.excludePatterns.length > 0) {
            frontmatter.excludePatterns = options.excludePatterns;
        }
        
        if (options.author) {
            frontmatter.author = options.author;
        }
        
        if (options.dependencies && options.dependencies.length > 0) {
            frontmatter.dependencies = options.dependencies;
        }
        
        if (options.requiredPlugins && options.requiredPlugins.length > 0) {
            frontmatter.requiredPlugins = options.requiredPlugins;
        }
        
        // For synchronous method, use manual formatting
        // This is a limitation but acceptable for frontmatter generation
        const yamlContent = this.formatYAMLManually(frontmatter);
        
        return `---\n${yamlContent}\n---\n`;
    }

    generateForFramework(framework: string, metadata: InstructionMetadata): string {
        const options = this.getFrameworkDefaults(framework, metadata);
        return this.generateFrontmatter(options);
    }

    private getFrameworkDefaults(framework: string, metadata: InstructionMetadata): FrontmatterOptions {
        const baseOptions: FrontmatterOptions = {
            framework: framework,
            version: metadata.version,
            lastModified: new Date().toISOString(),
            priority: this.calculateFrameworkPriority(framework),
            category: this.getFrameworkCategory(framework),
            tags: this.getFrameworkTags(framework, metadata)
        };

        switch (framework.toLowerCase()) {
            case 'angular':
                return {
                    ...baseOptions,
                    applyTo: ['**/*.component.ts', '**/*.service.ts', '**/*.module.ts', '**/*.directive.ts', '**/*.pipe.ts'],
                    description: `Angular ${metadata.version}+ development guidelines and best practices`,
                    fileTypes: ['typescript', 'html', 'scss', 'css'],
                    dependencies: metadata.dependencies || ['@angular/core', '@angular/common'],
                    requiredPlugins: ['@angular-eslint/eslint-plugin']
                };

            case 'react':
                return {
                    ...baseOptions,
                    applyTo: ['**/*.tsx', '**/*.jsx', '**/*.ts', '**/*.js'],
                    description: `React ${metadata.version}+ development guidelines with modern patterns`,
                    fileTypes: ['typescript', 'javascript', 'jsx', 'tsx'],
                    dependencies: metadata.dependencies || ['react', 'react-dom'],
                    excludePatterns: ['**/node_modules/**', '**/build/**', '**/dist/**']
                };

            case 'vue':
                return {
                    ...baseOptions,
                    applyTo: ['**/*.vue', '**/*.ts', '**/*.js'],
                    description: `Vue.js ${metadata.version}+ with Composition API guidelines`,
                    fileTypes: ['vue', 'typescript', 'javascript'],
                    dependencies: metadata.dependencies || ['vue']
                };

            case 'typescript':
                return {
                    ...baseOptions,
                    applyTo: ['**/*.ts', '**/*.tsx', '**/*.d.ts'],
                    description: `TypeScript ${metadata.version}+ type safety and best practices`,
                    fileTypes: ['typescript'],
                    excludePatterns: ['**/node_modules/**', '**/dist/**', '**/*.d.ts'],
                    tags: [...(baseOptions.tags || []), 'type-safety', 'eslint-rules']
                };

            case 'testing':
                return {
                    ...baseOptions,
                    applyTo: ['**/*.test.ts', '**/*.spec.ts', '**/*.test.tsx', '**/*.spec.tsx'],
                    description: `Testing guidelines for ${metadata.testingFramework || 'Jest'} and best practices`,
                    fileTypes: ['typescript', 'javascript'],
                    priority: 40,
                    category: 'Testing & Quality Assurance',
                    dependencies: this.getTestingDependencies(metadata.testingFramework)
                };

            default:
                return {
                    ...baseOptions,
                    applyTo: '**/*',
                    description: `${framework} development guidelines`,
                    priority: 30
                };
        }
    }

    private calculateFrameworkPriority(framework: string): number {
        const priorities: Record<string, number> = {
            'angular': 100,
            'react': 95,
            'vue': 90,
            'typescript': 50,
            'testing': 40,
            'prettier': 20,
            'eslint': 30
        };
        
        return priorities[framework.toLowerCase()] || 30;
    }

    private getFrameworkCategory(framework: string): string {
        const categories: Record<string, string> = {
            'angular': 'Angular Framework',
            'react': 'React Framework',
            'vue': 'Vue Framework',
            'typescript': 'TypeScript Language',
            'testing': 'Testing & Quality',
            'prettier': 'Code Formatting',
            'eslint': 'Code Quality'
        };
        
        return categories[framework.toLowerCase()] || 'Framework Guidelines';
    }

    private getFrameworkTags(framework: string, metadata: InstructionMetadata): string[] {
        const baseTags = [framework.toLowerCase()];
        
        // Add version-specific tags
        if (metadata.version) {
            baseTags.push(`${framework.toLowerCase()}-${metadata.version.split('.')[0]}`);
        }
        
        // Add feature-specific tags
        baseTags.push(...metadata.detectedFeatures.map(feature => 
            feature.toLowerCase().replace(/\s+/g, '-')
        ));
        
        // Add confidence level
        if (metadata.confidence > 0.8) {
            baseTags.push('high-confidence');
        } else if (metadata.confidence > 0.6) {
            baseTags.push('medium-confidence');
        }
        
        return baseTags;
    }

    private getTestingDependencies(testingFramework?: string): string[] {
        switch (testingFramework?.toLowerCase()) {
            case 'jest':
                return ['jest', '@types/jest'];
            case 'vitest':
                return ['vitest'];
            case 'mocha':
                return ['mocha', '@types/mocha', 'chai'];
            case 'jasmine':
                return ['jasmine', '@types/jasmine'];
            default:
                return ['jest', '@types/jest']; // Default to Jest
        }
    }

    generateUserOverrideFrontmatter(): string {
        return this.generateFrontmatter({
            applyTo: "**/*",
            priority: 1000,
            userOverride: true,
            category: "User Overrides",
            description: "User-customizable instructions that override all automated generations",
            lastModified: new Date().toISOString(),
            tags: ['user-override', 'customizable', 'highest-priority']
        });
    }

    generateProjectSpecificFrontmatter(projectName?: string): string {
        return this.generateFrontmatter({
            applyTo: "**/*",
            priority: 200,
            category: "Project Specific",
            description: `Project-specific guidelines for ${projectName || 'this workspace'}`,
            lastModified: new Date().toISOString(),
            tags: ['project-specific', 'workspace-guidelines']
        });
    }

    generateESLintRulesFrontmatter(eslintRules: string[]): string {
        return this.generateFrontmatter({
            applyTo: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
            priority: 30,
            category: "Code Quality",
            description: "ESLint rules translated to natural language instructions",
            lastModified: new Date().toISOString(),
            tags: ['eslint', 'code-quality', 'automated-generation'],
            dependencies: eslintRules,
            fileTypes: ['typescript', 'javascript']
        });
    }

    generatePrettierConfigFrontmatter(): string {
        return this.generateFrontmatter({
            applyTo: "**/*",
            priority: 20,
            category: "Code Formatting",
            description: "Prettier configuration translated to formatting guidelines",
            lastModified: new Date().toISOString(),
            tags: ['prettier', 'formatting', 'automated-generation'],
            dependencies: ['prettier']
        });
    }

    private parseYAMLManually(yamlContent: string): FrontmatterOptions {
        const result: any = {};
        const lines = yamlContent.split('\n');
        let currentKey: string | null = null;
        let currentArray: string[] | null = null;
        
        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) continue;
            
            // Array item
            if (trimmed.startsWith('- ')) {
                if (currentArray && currentKey) {
                    currentArray.push(trimmed.substring(2).trim());
                }
                continue;
            }
            
            // Key-value pair
            const match = line.match(/^(\s*)(\w+):\s*(.*)$/);
            if (match) {
                const [, indent, key, value] = match;
                
                if (indent.length === 0) {
                    // Top-level key
                    currentKey = key;
                    currentArray = null;
                    
                    if (!value) {
                        // Start of array or object
                        result[key] = [];
                        currentArray = result[key];
                    } else {
                        // Direct value
                        const cleanValue = value.replace(/^["']|["']$/g, '');
                        if (cleanValue === 'true') result[key] = true;
                        else if (cleanValue === 'false') result[key] = false;
                        else if (/^\d+$/.test(cleanValue)) result[key] = parseInt(cleanValue);
                        else result[key] = cleanValue;
                    }
                }
            }
        }
        
        return result as FrontmatterOptions;
    }

    parseExistingFrontmatter(content: string): { frontmatter: FrontmatterOptions | null; body: string } {
        const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
        
        if (frontmatterMatch) {
            const [, frontmatterYaml, bodyContent] = frontmatterMatch;
            try {
                const frontmatter = this.parseYAMLManually(frontmatterYaml);
                return {
                    frontmatter,
                    body: bodyContent.trim()
                };
            } catch (error) {
                console.warn('Failed to parse YAML frontmatter:', error);
            }
        }
        
        return {
            frontmatter: null,
            body: content.trim()
        };
    }

    updateFrontmatter(content: string, updates: Partial<FrontmatterOptions>): string {
        const { frontmatter, body } = this.parseExistingFrontmatter(content);
        
        const updatedFrontmatter: FrontmatterOptions = {
            ...frontmatter,
            ...updates,
            lastModified: new Date().toISOString()
        };
        
        return this.generateFrontmatter(updatedFrontmatter) + '\n' + body;
    }

    validateFrontmatter(frontmatter: FrontmatterOptions): { valid: boolean; errors: string[] } {
        const errors: string[] = [];
        
        // Validate priority
        if (frontmatter.priority !== undefined) {
            if (typeof frontmatter.priority !== 'number' || frontmatter.priority < 0 || frontmatter.priority > 1000) {
                errors.push('Priority must be a number between 0 and 1000');
            }
        }
        
        // Validate applyTo patterns
        if (frontmatter.applyTo) {
            const patterns = Array.isArray(frontmatter.applyTo) ? frontmatter.applyTo : [frontmatter.applyTo];
            for (const pattern of patterns) {
                if (typeof pattern !== 'string' || pattern.trim().length === 0) {
                    errors.push('applyTo patterns must be non-empty strings');
                }
            }
        }
        
        // Validate fileTypes
        if (frontmatter.fileTypes) {
            const validFileTypes = ['typescript', 'javascript', 'html', 'css', 'scss', 'json', 'yaml', 'markdown', 'vue', 'jsx', 'tsx'];
            for (const fileType of frontmatter.fileTypes) {
                if (!validFileTypes.includes(fileType)) {
                    errors.push(`Invalid file type: ${fileType}. Valid types: ${validFileTypes.join(', ')}`);
                }
            }
        }
        
        // Validate framework
        if (frontmatter.framework) {
            const validFrameworks = ['angular', 'react', 'vue', 'typescript', 'testing', 'prettier', 'eslint'];
            if (!validFrameworks.includes(frontmatter.framework.toLowerCase())) {
                errors.push(`Invalid framework: ${frontmatter.framework}. Valid frameworks: ${validFrameworks.join(', ')}`);
            }
        }
        
        return {
            valid: errors.length === 0,
            errors
        };
    }

    generateCompleteInstructionFile(frontmatter: FrontmatterOptions, content: string): string {
        const frontmatterYaml = this.generateFrontmatter(frontmatter);
        return frontmatterYaml + '\n' + content;
    }
}