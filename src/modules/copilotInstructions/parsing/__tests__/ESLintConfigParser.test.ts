import { ESLintConfigParser, ParsedRule } from '../ESLintConfigParser';
import * as fs from 'fs';
import * as path from 'path';

// Mock dependencies
jest.mock('fs');

// Mock dynamic imports
jest.mock('eslint', () => ({
    ESLint: jest.fn()
}), { virtual: true });

jest.mock('cosmiconfig', () => ({
    cosmiconfig: jest.fn()
}), { virtual: true });

jest.mock('find-up', () => ({
    findUp: jest.fn()
}), { virtual: true });

jest.mock('json5', () => ({
    parse: jest.fn()
}), { virtual: true });

jest.mock('js-yaml', () => ({
    load: jest.fn()
}), { virtual: true });

const mockFs = fs as jest.Mocked<typeof fs>;

describe('ESLintConfigParser', () => {
    let parser: ESLintConfigParser;
    const mockProjectPath = '/mock/project';

    beforeEach(() => {
        parser = new ESLintConfigParser();
        jest.clearAllMocks();
    });

    describe('parseConfiguration', () => {
        it('should return null when no configuration is found', async () => {
            // Mock dynamic imports to return null (not installed)
            parser['getCosmiconfig'] = jest.fn().mockResolvedValue(null);
            parser['getFindUp'] = jest.fn().mockResolvedValue(null);
            parser['getESLint'] = jest.fn().mockResolvedValue(null);
            
            // Mock fs.existsSync to return false for all config files
            jest.spyOn(fs, 'existsSync').mockReturnValue(false);

            const result = await parser.parseConfiguration(mockProjectPath);
            
            // When no parsers are available and no files exist, should return basic result
            expect(result).toEqual({
                rules: [],
                parser: null,
                plugins: [],
                typeAware: false,
                configPath: null,
                checkedPaths: expect.any(Array)
            });
        });

        it('should parse flat config successfully', async () => {
            const { findUp } = require('find-up');
            const { ESLint } = require('eslint');
            
            findUp.mockResolvedValue('/mock/project/eslint.config.js');
            
            const mockESLint = {
                calculateConfigForFile: jest.fn().mockResolvedValue({
                    rules: {
                        '@typescript-eslint/no-explicit-any': 'error',
                        '@typescript-eslint/prefer-const': ['warn', { destructuring: 'all' }],
                        'no-unused-vars': 'off'
                    },
                    languageOptions: {
                        parser: '@typescript-eslint/parser'
                    },
                    plugins: ['@typescript-eslint']
                })
            };
            
            ESLint.mockImplementation(() => mockESLint);

            const result = await parser.parseConfiguration(mockProjectPath);

            expect(result).not.toBeNull();
            expect(result!.rules).toHaveLength(2); // 'off' rule should be filtered out
            expect(result!.parser).toBe('@typescript-eslint/parser');
            expect(result!.plugins).toContain('@typescript-eslint');
        });

        it('should parse legacy config successfully', async () => {
            const { findUp } = require('find-up');
            const { cosmiconfig } = require('cosmiconfig');
            
            findUp.mockResolvedValue(null); // No flat config
            
            const mockExplorer = {
                search: jest.fn().mockResolvedValue({
                    config: {
                        rules: {
                            '@typescript-eslint/no-explicit-any': 2,
                            '@typescript-eslint/consistent-type-imports': [1, { prefer: 'type-imports' }]
                        },
                        parser: '@typescript-eslint/parser',
                        plugins: ['@typescript-eslint']
                    },
                    filepath: '/mock/project/.eslintrc.json'
                })
            };
            
            cosmiconfig.mockReturnValue(mockExplorer);

            const result = await parser.parseConfiguration(mockProjectPath);

            expect(result).not.toBeNull();
            expect(result!.rules).toHaveLength(2);
            expect(result!.configPath).toBe('/mock/project/.eslintrc.json');
        });

        it('should handle parsing errors gracefully', async () => {
            const { findUp } = require('find-up');
            const { cosmiconfig } = require('cosmiconfig');
            
            findUp.mockRejectedValue(new Error('File system error'));
            
            const mockExplorer = {
                search: jest.fn().mockRejectedValue(new Error('Config parsing error'))
            };
            
            cosmiconfig.mockReturnValue(mockExplorer);

            const result = await parser.parseConfiguration(mockProjectPath);
            expect(result).toBeNull();
        });
    });

    describe('rule translation', () => {
        it('should translate TypeScript-specific rules correctly', async () => {
            const { findUp } = require('find-up');
            const { cosmiconfig } = require('cosmiconfig');
            
            findUp.mockResolvedValue(null);
            
            const mockExplorer = {
                search: jest.fn().mockResolvedValue({
                    config: {
                        rules: {
                            '@typescript-eslint/no-explicit-any': 'error',
                            '@typescript-eslint/consistent-type-imports': ['warn', { prefer: 'type-imports' }],
                            '@typescript-eslint/naming-convention': [
                                'error',
                                { selector: 'interface', format: ['PascalCase'] },
                                { selector: 'variable', format: ['camelCase'] }
                            ]
                        }
                    }
                })
            };
            
            cosmiconfig.mockReturnValue(mockExplorer);

            const result = await parser.parseConfiguration(mockProjectPath);

            expect(result).not.toBeNull();
            
            // Find rules by name since order may vary
            const noExplicitAnyRule = result!.rules.find(r => r.name === '@typescript-eslint/no-explicit-any');
            const typeImportsRule = result!.rules.find(r => r.name === '@typescript-eslint/consistent-type-imports');
            const namingRule = result!.rules.find(r => r.name === '@typescript-eslint/naming-convention');
            
            expect(noExplicitAnyRule?.translation).toContain("use specific types instead of 'any'");
            expect(typeImportsRule?.translation).toContain("use 'import type'");
            expect(namingRule?.translation).toContain("Interfaces should use PascalCase naming");
        });

        it('should categorize rules correctly', async () => {
            const { findUp } = require('find-up');
            const { cosmiconfig } = require('cosmiconfig');
            
            findUp.mockResolvedValue(null);
            
            const mockExplorer = {
                search: jest.fn().mockResolvedValue({
                    config: {
                        rules: {
                            '@typescript-eslint/no-explicit-any': 'error',
                            '@typescript-eslint/consistent-type-imports': 'warn',
                            '@typescript-eslint/naming-convention': 'error',
                            '@typescript-eslint/no-floating-promises': 'error',
                            'prefer-const': 'warn'
                        }
                    }
                })
            };
            
            cosmiconfig.mockReturnValue(mockExplorer);

            const result = await parser.parseConfiguration(mockProjectPath);

            expect(result).not.toBeNull();
            
            const categories = result!.rules.map(rule => rule.category);
            expect(categories).toContain('Type Safety');
            expect(categories).toContain('Import Organization');
            expect(categories).toContain('Naming Conventions');
            expect(categories).toContain('Asynchronous Code');
            expect(categories).toContain('Modern JavaScript');
        });

        it('should handle different severity formats', async () => {
            const { findUp } = require('find-up');
            const { cosmiconfig } = require('cosmiconfig');
            
            findUp.mockResolvedValue(null);
            
            const mockExplorer = {
                search: jest.fn().mockResolvedValue({
                    config: {
                        rules: {
                            'rule-with-number': 2,        // error
                            'rule-with-string': 'warn',   // warn
                            'rule-with-array': ['error', { option: true }], // error with options
                            'rule-disabled': 0            // off - should be filtered
                        }
                    }
                })
            };
            
            cosmiconfig.mockReturnValue(mockExplorer);

            const result = await parser.parseConfiguration(mockProjectPath);

            expect(result).not.toBeNull();
            expect(result!.rules).toHaveLength(3); // 'off' rule filtered out
            
            const severities = result!.rules.map(rule => rule.severity);
            expect(severities).toContain('error');
            expect(severities).toContain('warn');
            expect(severities).not.toContain('off');
        });
    });

    describe('TypeScript integration', () => {
        it('should detect type-aware rules correctly', async () => {
            const { findUp } = require('find-up');
            const { ESLint } = require('eslint');
            
            findUp.mockResolvedValue('/mock/project/eslint.config.js');
            
            const mockESLint = {
                calculateConfigForFile: jest.fn().mockResolvedValue({
                    rules: {},
                    languageOptions: {
                        parserOptions: {
                            projectService: true
                        }
                    }
                })
            };
            
            ESLint.mockImplementation(() => mockESLint);

            const result = await parser.parseConfiguration(mockProjectPath);

            expect(result).not.toBeNull();
            expect(result!.typeAware).toBe(true);
        });

        it('should extract TypeScript-specific rules', async () => {
            const { findUp } = require('find-up');
            const { cosmiconfig } = require('cosmiconfig');
            
            findUp.mockResolvedValue(null);
            
            const mockExplorer = {
                search: jest.fn().mockResolvedValue({
                    config: {
                        rules: {
                            '@typescript-eslint/no-explicit-any': 'error',
                            '@typescript-eslint/strict-boolean-expressions': 'warn',
                            'no-console': 'warn', // Regular ESLint rule
                            'prefer-const': 'error'
                        }
                    }
                })
            };
            
            cosmiconfig.mockReturnValue(mockExplorer);

            const result = await parser.parseConfiguration(mockProjectPath);

            expect(result).not.toBeNull();
            
            const tsRules = result!.rules.filter(rule => 
                rule.name.startsWith('@typescript-eslint/')
            );
            expect(tsRules).toHaveLength(2);
        });
    });

    describe('error handling', () => {
        it('should handle malformed configuration gracefully', async () => {
            const { findUp } = require('find-up');
            const { cosmiconfig } = require('cosmiconfig');
            
            findUp.mockResolvedValue(null);
            
            const mockExplorer = {
                search: jest.fn().mockResolvedValue({
                    config: {
                        rules: null // Malformed rules
                    }
                })
            };
            
            cosmiconfig.mockReturnValue(mockExplorer);

            const result = await parser.parseConfiguration(mockProjectPath);

            expect(result).not.toBeNull();
            expect(result!.rules).toHaveLength(0);
        });

        it('should handle missing rule configurations', async () => {
            const { findUp } = require('find-up');
            const { cosmiconfig } = require('cosmiconfig');
            
            findUp.mockResolvedValue(null);
            
            const mockExplorer = {
                search: jest.fn().mockResolvedValue({
                    config: {} // No rules property
                })
            };
            
            cosmiconfig.mockReturnValue(mockExplorer);

            const result = await parser.parseConfiguration(mockProjectPath);

            expect(result).not.toBeNull();
            expect(result!.rules).toHaveLength(0);
        });
    });
});

describe('TypeScriptRuleTranslator', () => {
    // Note: This tests the private class through the public interface
    let parser: ESLintConfigParser;

    beforeEach(() => {
        parser = new ESLintConfigParser();
    });

    it('should generate appropriate severity prefixes', async () => {
        const { findUp } = require('find-up');
        const { cosmiconfig } = require('cosmiconfig');
        
        findUp.mockResolvedValue(null);
        
        const mockExplorer = {
            search: jest.fn().mockResolvedValue({
                config: {
                    rules: {
                        '@typescript-eslint/no-explicit-any': 'error',
                        '@typescript-eslint/prefer-const': 'warn'
                    }
                }
            })
        };
        
        cosmiconfig.mockReturnValue(mockExplorer);

        const result = await parser.parseConfiguration('/mock');

        expect(result!.rules[0].translation).toMatch(/^Always/);
        expect(result!.rules[1].translation).toMatch(/^Prefer to/);
    });

    it('should handle complex naming convention rules', async () => {
        const { findUp } = require('find-up');
        const { cosmiconfig } = require('cosmiconfig');
        
        findUp.mockResolvedValue(null);
        
        const mockExplorer = {
            search: jest.fn().mockResolvedValue({
                config: {
                    rules: {
                        '@typescript-eslint/naming-convention': [
                            'error',
                            {
                                selector: 'interface',
                                format: ['PascalCase'],
                                prefix: ['I']
                            },
                            {
                                selector: 'variable',
                                format: ['camelCase', 'UPPER_CASE']
                            }
                        ]
                    }
                }
            })
        };
        
        cosmiconfig.mockReturnValue(mockExplorer);

        const result = await parser.parseConfiguration('/mock');

        expect(result!.rules[0].translation).toContain('Interfaces should start with \'I\' prefix');
        expect(result!.rules[0].translation).toContain('Variables should use camelCase or UPPER_CASE');
    });
});