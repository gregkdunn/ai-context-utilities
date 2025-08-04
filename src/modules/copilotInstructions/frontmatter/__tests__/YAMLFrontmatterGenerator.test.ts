import { YAMLFrontmatterGenerator, FrontmatterOptions, InstructionMetadata } from '../YAMLFrontmatterGenerator';

describe('YAMLFrontmatterGenerator', () => {
    let generator: YAMLFrontmatterGenerator;

    beforeEach(() => {
        generator = new YAMLFrontmatterGenerator();
    });

    describe('generateFrontmatter', () => {
        it('should generate basic frontmatter correctly', () => {
            const options: FrontmatterOptions = {
                applyTo: '**/*.ts',
                priority: 100,
                framework: 'typescript',
                category: 'Language Guidelines',
                description: 'TypeScript development rules'
            };

            const result = generator.generateFrontmatter(options);

            expect(result).toContain('---\n');
            expect(result).toContain('applyTo: "**/*.ts"');
            expect(result).toContain('priority: 100');
            expect(result).toContain('framework: typescript');
            expect(result).toContain('category: "Language Guidelines"');
            expect(result).toContain('description: "TypeScript development rules"');
            expect(result).toMatch(/lastModified: "\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z"/);
            expect(result).toMatch(/---\n$/);
        });

        it('should handle array values correctly', () => {
            const options: FrontmatterOptions = {
                applyTo: ['**/*.ts', '**/*.tsx'],
                tags: ['typescript', 'react'],
                fileTypes: ['typescript', 'tsx'],
                dependencies: ['react', '@types/react']
            };

            const result = generator.generateFrontmatter(options);

            expect(result).toContain('applyTo:\n  - "**/*.ts"\n  - "**/*.tsx"');
            expect(result).toContain('tags:\n  - typescript\n  - react');
            expect(result).toContain('fileTypes:\n  - typescript\n  - tsx');
            expect(result).toContain('dependencies:\n  - react\n  - "@types/react"');
        });

        it('should include optional fields when provided', () => {
            const options: FrontmatterOptions = {
                applyTo: '**/*',
                userOverride: true,
                version: '1.2.3',
                author: 'Test Author',
                excludePatterns: ['**/node_modules/**'],
                requiredPlugins: ['eslint-plugin-typescript']
            };

            const result = generator.generateFrontmatter(options);

            expect(result).toContain('userOverride: true');
            expect(result).toContain('version: 1.2.3');
            expect(result).toContain('author: "Test Author"');
            expect(result).toContain('excludePatterns:\n  - "**/node_modules/**"');
            expect(result).toContain('requiredPlugins:\n  - eslint-plugin-typescript');
        });

        it('should sort keys alphabetically', () => {
            const options: FrontmatterOptions = {
                version: '1.0.0',
                applyTo: '**/*',
                priority: 50,
                framework: 'angular'
            };

            const result = generator.generateFrontmatter(options);
            const lines = result.split('\n').filter(line => line.trim() && !line.startsWith('---'));
            
            // Check that applyTo comes before framework (alphabetical order)
            const applyToIndex = lines.findIndex(line => line.startsWith('applyTo:'));
            const frameworkIndex = lines.findIndex(line => line.startsWith('framework:'));
            expect(applyToIndex).toBeLessThan(frameworkIndex);
        });
    });

    describe('generateForFramework', () => {
        it('should generate Angular framework frontmatter', () => {
            const metadata: InstructionMetadata = {
                framework: 'Angular',
                version: '17.0.0',
                confidence: 0.9,
                detectedFeatures: ['control-flow', 'signals'],
                dependencies: ['@angular/core', '@angular/common']
            };

            const result = generator.generateForFramework('angular', metadata);

            expect(result).toContain('framework: angular');
            expect(result).toContain('priority: 100');
            expect(result).toContain('category: "Angular Framework"');
            expect(result).toContain('description: "Angular 17.0.0+ development guidelines and best practices"');
            expect(result).toContain('applyTo:\n  - "**/*.component.ts"');
            expect(result).toContain('fileTypes:\n  - typescript\n  - html');
            expect(result).toContain('dependencies:\n  - "@angular/core"');
            expect(result).toContain('requiredPlugins:\n  - "@angular-eslint/eslint-plugin"');
        });

        it('should generate React framework frontmatter', () => {
            const metadata: InstructionMetadata = {
                framework: 'React',
                version: '18.2.0',
                confidence: 0.85,
                detectedFeatures: ['hooks', 'server-components'],
                dependencies: ['react', 'react-dom']
            };

            const result = generator.generateForFramework('react', metadata);

            expect(result).toContain('framework: react');
            expect(result).toContain('priority: 95');
            expect(result).toContain('category: "React Framework"');
            expect(result).toContain('description: "React 18.2.0+ development guidelines with modern patterns"');
            expect(result).toContain('applyTo:\n  - "**/*.tsx"');
            expect(result).toContain('fileTypes:\n  - typescript\n  - javascript');
            expect(result).toContain('excludePatterns:\n  - "**/node_modules/**"');
        });

        it('should generate TypeScript language frontmatter', () => {
            const metadata: InstructionMetadata = {
                framework: 'TypeScript',
                version: '5.0.0',
                confidence: 0.95,
                detectedFeatures: ['strict-mode', 'decorators']
            };

            const result = generator.generateForFramework('typescript', metadata);

            expect(result).toContain('framework: typescript');
            expect(result).toContain('priority: 50');
            expect(result).toContain('category: "TypeScript Language"');
            expect(result).toContain('description: "TypeScript 5.0.0+ type safety and best practices"');
            expect(result).toContain('applyTo:\n  - "**/*.ts"');
            expect(result).toContain('excludePatterns:\n  - "**/node_modules/**"');
        });

        it('should handle unknown frameworks with defaults', () => {
            const metadata: InstructionMetadata = {
                framework: 'CustomFramework',
                version: '1.0.0',
                confidence: 0.7,
                detectedFeatures: ['feature1', 'feature2']
            };

            const result = generator.generateForFramework('customframework', metadata);

            expect(result).toContain('framework: customframework');
            expect(result).toContain('priority: 30');
            expect(result).toContain('category: "Framework Guidelines"');
            expect(result).toContain('description: "customframework development guidelines"');
            expect(result).toContain('applyTo: "**/*"');
        });
    });

    describe('framework-specific generators', () => {
        it('should generate user override frontmatter', () => {
            const result = generator.generateUserOverrideFrontmatter();

            expect(result).toContain('applyTo: "**/*"');
            expect(result).toContain('priority: 1000');
            expect(result).toContain('userOverride: true');
            expect(result).toContain('category: "User Overrides"');
            expect(result).toContain('tags:\n  - user-override');
        });

        it('should generate project-specific frontmatter', () => {
            const result = generator.generateProjectSpecificFrontmatter('My Project');

            expect(result).toContain('applyTo: "**/*"');
            expect(result).toContain('priority: 200');
            expect(result).toContain('category: "Project Specific"');
            expect(result).toContain('description: "Project-specific guidelines for My Project"');
            expect(result).toContain('tags:\n  - project-specific');
        });

        it('should generate ESLint rules frontmatter', () => {
            const eslintRules = ['@typescript-eslint/no-explicit-any', 'prefer-const'];
            const result = generator.generateESLintRulesFrontmatter(eslintRules);

            expect(result).toContain('priority: 30');
            expect(result).toContain('category: "Code Quality"');
            expect(result).toContain('description: "ESLint rules translated to natural language instructions"');
            expect(result).toContain('applyTo:\n  - "**/*.ts"');
            expect(result).toContain('tags:\n  - eslint');
            expect(result).toContain('dependencies:\n  - "@typescript-eslint/no-explicit-any"');
        });

        it('should generate Prettier config frontmatter', () => {
            const result = generator.generatePrettierConfigFrontmatter();

            expect(result).toContain('applyTo: "**/*"');
            expect(result).toContain('priority: 20');
            expect(result).toContain('category: "Code Formatting"');
            expect(result).toContain('description: "Prettier configuration translated to formatting guidelines"');
            expect(result).toContain('tags:\n  - prettier');
            expect(result).toContain('dependencies:\n  - prettier');
        });
    });

    describe('parseExistingFrontmatter', () => {
        it('should parse valid frontmatter correctly', () => {
            const content = `---
applyTo: "**/*.ts"
priority: 100
framework: typescript
---

# TypeScript Guidelines

Some content here.`;

            const result = generator.parseExistingFrontmatter(content);

            expect(result.frontmatter).toEqual({
                applyTo: '**/*.ts',
                priority: 100,
                framework: 'typescript'
            });
            expect(result.body).toBe('# TypeScript Guidelines\n\nSome content here.');
        });

        it('should handle content without frontmatter', () => {
            const content = '# TypeScript Guidelines\n\nSome content here.';

            const result = generator.parseExistingFrontmatter(content);

            expect(result.frontmatter).toBeNull();
            expect(result.body).toBe('# TypeScript Guidelines\n\nSome content here.');
        });

        it('should handle malformed frontmatter gracefully', () => {
            const content = `---
applyTo: "**/*.ts"
invalid yaml: [unclosed
---

# TypeScript Guidelines`;

            const result = generator.parseExistingFrontmatter(content);

            expect(result.frontmatter).toBeNull();
            expect(result.body).toBe(content.trim());
        });
    });

    describe('updateFrontmatter', () => {
        it('should update existing frontmatter', () => {
            const content = `---
applyTo: "**/*.ts"
priority: 100
---

# Content`;

            const updates = {
                priority: 200,
                framework: 'typescript'
            };

            const result = generator.updateFrontmatter(content, updates);

            expect(result).toContain('priority: 200');
            expect(result).toContain('framework: typescript');
            expect(result).toContain('applyTo: "**/*.ts"');
            expect(result).toContain('# Content');
            expect(result).toMatch(/lastModified: "\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z"/);
        });

        it('should add frontmatter to content without existing frontmatter', () => {
            const content = '# Content\n\nSome text.';
            const updates = {
                priority: 100,
                framework: 'typescript'
            };

            const result = generator.updateFrontmatter(content, updates);

            expect(result).toContain('---\n');
            expect(result).toContain('priority: 100');
            expect(result).toContain('framework: typescript');
            expect(result).toContain('# Content\n\nSome text.');
        });
    });

    describe('validateFrontmatter', () => {
        it('should validate correct frontmatter', () => {
            const frontmatter: FrontmatterOptions = {
                applyTo: '**/*.ts',
                priority: 100,
                framework: 'typescript',
                fileTypes: ['typescript']
            };

            const result = generator.validateFrontmatter(frontmatter);

            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should detect invalid priority', () => {
            const frontmatter: FrontmatterOptions = {
                priority: -10 // Invalid negative priority
            };

            const result = generator.validateFrontmatter(frontmatter);

            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Priority must be a number between 0 and 1000');
        });

        it('should detect invalid priority range', () => {
            const frontmatter: FrontmatterOptions = {
                priority: 1500 // Too high
            };

            const result = generator.validateFrontmatter(frontmatter);

            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Priority must be a number between 0 and 1000');
        });

        it('should detect invalid applyTo patterns', () => {
            const frontmatter: FrontmatterOptions = {
                applyTo: ['', '  '] // Empty patterns
            };

            const result = generator.validateFrontmatter(frontmatter);

            expect(result.valid).toBe(false);
            expect(result.errors).toContain('applyTo patterns must be non-empty strings');
        });

        it('should detect invalid file types', () => {
            const frontmatter: FrontmatterOptions = {
                fileTypes: ['invalid-type']
            };

            const result = generator.validateFrontmatter(frontmatter);

            expect(result.valid).toBe(false);
            expect(result.errors[0]).toContain('Invalid file type: invalid-type');
        });

        it('should detect invalid framework', () => {
            const frontmatter: FrontmatterOptions = {
                framework: 'unknown-framework'
            };

            const result = generator.validateFrontmatter(frontmatter);

            expect(result.valid).toBe(false);
            expect(result.errors[0]).toContain('Invalid framework: unknown-framework');
        });
    });

    describe('generateCompleteInstructionFile', () => {
        it('should combine frontmatter and content correctly', () => {
            const frontmatter: FrontmatterOptions = {
                applyTo: '**/*.ts',
                priority: 100,
                framework: 'typescript'
            };

            const content = '# TypeScript Guidelines\n\n- Use strict mode\n- Prefer interfaces over types';

            const result = generator.generateCompleteInstructionFile(frontmatter, content);

            expect(result).toMatch(/^---\n[\s\S]*---\n\n# TypeScript Guidelines/);
            expect(result).toContain('applyTo: "**/*.ts"');
            expect(result).toContain('priority: 100');
            expect(result).toContain('framework: typescript');
            expect(result).toContain('- Use strict mode');
            expect(result).toContain('- Prefer interfaces over types');
        });
    });

    describe('tag generation', () => {
        it('should generate appropriate tags for high confidence detection', () => {
            const metadata: InstructionMetadata = {
                framework: 'Angular',
                version: '17.0.0',
                confidence: 0.9,
                detectedFeatures: ['Control Flow', 'Signals']
            };

            const result = generator.generateForFramework('angular', metadata);

            expect(result).toContain('tags:\n  - angular\n  - angular-17\n  - control-flow\n  - signals\n  - high-confidence');
        });

        it('should generate medium confidence tag', () => {
            const metadata: InstructionMetadata = {
                framework: 'React',
                version: '18.0.0',
                confidence: 0.7,
                detectedFeatures: ['hooks']
            };

            const result = generator.generateForFramework('react', metadata);

            expect(result).toContain('medium-confidence');
            expect(result).not.toContain('high-confidence');
        });
    });
});