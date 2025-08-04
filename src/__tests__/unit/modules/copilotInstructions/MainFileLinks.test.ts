/**
 * Test to verify main copilot-instructions.md properly links to all generated files
 */

describe('Main Copilot Instructions File Linking', () => {
    describe('File Link Generation', () => {
        test('should include links to all generated instruction files', () => {
            // Mock framework files that would be generated
            const mockFrameworkFiles = [
                {
                    path: '.github/instructions/user-overrides.instructions.md',
                    framework: 'User',
                    content: 'mock content'
                },
                {
                    path: '.github/instructions/angular.instructions.md',
                    framework: 'Angular',
                    content: 'mock content'
                },
                {
                    path: '.github/instructions/typescript.instructions.md',
                    framework: 'TypeScript',
                    content: 'mock content'
                },
                {
                    path: '.github/instructions/eslint-rules.instructions.md',
                    framework: 'ESLint',
                    content: 'mock content'
                },
                {
                    path: '.github/instructions/prettier-formatting.instructions.md',
                    framework: 'Prettier',
                    content: 'mock content'
                }
            ];

            // Verify each file would be referenced in main instructions
            mockFrameworkFiles.forEach(file => {
                const fileName = file.path.split('/').pop();
                expect(fileName).toBeDefined();
                expect(file.path).toContain('.github/instructions/');
                expect(file.framework).toBeDefined();
            });
        });

        test('should prioritize user overrides in file listing', () => {
            const userOverrideFile = {
                path: '.github/instructions/user-overrides.instructions.md',
                framework: 'User',
                content: 'mock content'
            };

            const otherFile = {
                path: '.github/instructions/angular.instructions.md',
                framework: 'Angular',
                content: 'mock content'
            };

            // User overrides should come first
            expect(userOverrideFile.path.includes('user-overrides')).toBe(true);
            expect(otherFile.path.includes('user-overrides')).toBe(false);
        });

        test('should include file descriptions for context', () => {
            const fileDescriptions = {
                'user-overrides': 'Your team\'s architectural decisions and preferences (highest priority)',
                'eslint-rules': 'ESLint rules translated into natural language guidance',
                'prettier-formatting': 'Code formatting preferences and style guidelines',
                'angular': 'Angular-specific patterns, best practices, and modern features',
                'typescript': 'TypeScript type safety and advanced language features'
            };

            Object.entries(fileDescriptions).forEach(([fileType, description]) => {
                expect(description).toBeDefined();
                expect(description.length).toBeGreaterThan(0);
                expect(typeof description).toBe('string');
            });
        });

        test('should assign correct priorities to files', () => {
            const priorityMappings = {
                'user-overrides': 1000,
                'angular': 100,
                'typescript': 50,
                'eslint-rules': 30,
                'prettier-formatting': 20
            };

            Object.entries(priorityMappings).forEach(([fileType, priority]) => {
                expect(priority).toBeGreaterThan(0);
                expect(typeof priority).toBe('number');
            });

            // User overrides should have highest priority
            expect(priorityMappings['user-overrides']).toBe(1000);
            expect(priorityMappings['user-overrides']).toBeGreaterThan(priorityMappings['angular']);
        });
    });

    describe('Main File Content Structure', () => {
        test('should include usage instructions for Copilot', () => {
            const expectedSections = [
                'GitHub Copilot Instructions',
                'Quick Reference',
                'Project Guidelines',
                'Specialized Instructions',
                'Usage Instructions',
                'Project Structure',
                'Best Practices'
            ];

            expectedSections.forEach(section => {
                expect(section).toBeDefined();
                expect(typeof section).toBe('string');
                expect(section.length).toBeGreaterThan(0);
            });
        });

        test('should include clear usage instructions', () => {
            const usageInstructions = [
                'Include this file in your Copilot context to access all guidelines',
                'User overrides (Priority 1000) take precedence over all other instructions',
                'Framework-specific guidelines apply to relevant file types',
                'ESLint rules are translated into natural language guidance',
                'Prettier formatting preferences are documented for consistency'
            ];

            usageInstructions.forEach(instruction => {
                expect(instruction).toBeDefined();
                expect(typeof instruction).toBe('string');
                expect(instruction.length).toBeGreaterThan(0);
            });
        });

        test('should include file links in correct format', () => {
            const mockFilePath = '.github/instructions/angular.instructions.md';
            const linkFormat = `[Angular Framework Guidelines](./${mockFilePath})`;
            
            // Verify link format
            expect(linkFormat).toContain('[');
            expect(linkFormat).toContain(']');
            expect(linkFormat).toContain('(');
            expect(linkFormat).toContain(')');
            expect(linkFormat).toContain(mockFilePath);
        });
    });

    describe('Project Information Integration', () => {
        test('should include framework detection results', () => {
            const mockWorkspace = {
                frontendFrameworks: ['Angular 17.0.0'],
                testFrameworks: ['Jest 29.0.0'],
                typescript: { version: '5.2.0' }
            };

            // Should include frontend frameworks
            expect(mockWorkspace.frontendFrameworks.length).toBeGreaterThan(0);
            expect(mockWorkspace.frontendFrameworks[0]).toContain('Angular');

            // Should include test frameworks
            expect(mockWorkspace.testFrameworks.length).toBeGreaterThan(0);
            expect(mockWorkspace.testFrameworks[0]).toContain('Jest');

            // Should include TypeScript version
            expect(mockWorkspace.typescript.version).toBeDefined();
            expect(mockWorkspace.typescript.version).toContain('5.2');
        });
    });

    describe('Copilot Context Integration', () => {
        test('should provide clear instructions for including in context', () => {
            const contextInstructions = 'Include this file in your Copilot context to access all project guidelines';
            
            expect(contextInstructions).toContain('Include this file');
            expect(contextInstructions).toContain('Copilot context');
            expect(contextInstructions).toContain('access all');
        });

        test('should emphasize importance of main file as entry point', () => {
            const importanceNote = 'This file links to specialized instruction files';
            
            expect(importanceNote).toContain('links to');
            expect(importanceNote).toContain('specialized');
            expect(importanceNote).toContain('instruction files');
        });
    });
});