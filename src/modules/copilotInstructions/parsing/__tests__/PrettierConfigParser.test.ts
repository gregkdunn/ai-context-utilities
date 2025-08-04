import { PrettierConfigParser } from '../PrettierConfigParser';
import * as fs from 'fs';

// Mock prettier
jest.mock('prettier', () => ({
    resolveConfig: jest.fn(),
    resolveConfigFile: jest.fn(),
    getFileInfo: jest.fn(),
    format: jest.fn()
}));

jest.mock('fs');

const mockFs = fs as jest.Mocked<typeof fs>;

describe('PrettierConfigParser', () => {
    let parser: PrettierConfigParser;
    const mockFilePath = '/mock/project/src/index.ts';

    beforeEach(() => {
        parser = new PrettierConfigParser();
        jest.clearAllMocks();
    });

    describe('parseConfiguration', () => {
        it('should parse Prettier configuration successfully', async () => {
            const prettier = require('prettier');
            
            prettier.resolveConfig.mockResolvedValue({
                semi: false,
                singleQuote: true,
                tabWidth: 2,
                printWidth: 100,
                trailingComma: 'es5'
            });
            
            prettier.resolveConfigFile.mockResolvedValue('/mock/project/.prettierrc.json');
            
            prettier.getFileInfo.mockResolvedValue({
                ignored: false,
                inferredParser: 'typescript'
            });

            const result = await parser.parseConfiguration('/mock/project');

            expect(result).not.toBeNull();
            expect(result!.options.semi).toBe(false);
            expect(result!.options.singleQuote).toBe(true);
            expect(result!.configPath).toBe('/mock/project/.prettierrc.json');
            expect(result!.ignored).toBe(false);
            expect(result!.inferredParser).toBeNull();
        });

        it('should handle missing configuration gracefully', async () => {
            const prettier = require('prettier');
            
            prettier.resolveConfig.mockResolvedValue(null);
            prettier.resolveConfigFile.mockResolvedValue(null);
            prettier.getFileInfo.mockResolvedValue({
                ignored: false,
                inferredParser: 'typescript'
            });

            const result = await parser.parseConfiguration('/mock/project');

            expect(result).not.toBeNull();
            expect(result!.options).toEqual({});
            expect(result!.configPath).toBeNull();
        });

        it('should handle errors gracefully', async () => {
            const prettier = require('prettier');
            
            prettier.resolveConfig.mockRejectedValue(new Error('Config error'));

            const result = await parser.parseConfiguration('/mock/project');
            expect(result).toEqual(expect.objectContaining({
                options: {},
                configPath: null,
                instructions: expect.any(Array),
                checkedPaths: expect.any(Array)
            }));
        });
    });

    describe('generateInstructions', () => {
        it('should generate correct instructions for semicolons', () => {
            const instructions = parser['generateInstructions']({
                semi: false
            });

            expect(instructions).toContain('Omit semicolons at the end of statements');
        });

        it('should generate correct instructions for quotes', () => {
            const instructions = parser['generateInstructions']({
                singleQuote: true,
                jsxSingleQuote: false  
            });

            expect(instructions).toContain('Use single quotes for strings instead of double quotes');
            expect(instructions).toContain('Use double quotes in JSX attributes');
        });

        it('should generate correct instructions for indentation', () => {
            const instructions = parser['generateInstructions']({
                tabWidth: 4,
                useTabs: true
            });

            expect(instructions).toContain('Use 4 spaces for indentation');
            expect(instructions).toContain('Use tabs for indentation instead of spaces');
        });

        it('should generate correct instructions for line width', () => {
            const instructions = parser['generateInstructions']({
                printWidth: 120
            });

            expect(instructions).toContain('Keep lines under 120 characters');
        });

        it('should generate correct instructions for trailing commas', () => {
            const instructionsEs5 = parser['generateInstructions']({
                trailingComma: 'es5'
            });
            expect(instructionsEs5).toContain('Add trailing commas where valid in ES5 (objects, arrays, etc)');

            const instructionsAll = parser['generateInstructions']({
                trailingComma: 'all'
            });
            expect(instructionsAll).toContain('Add trailing commas wherever possible (including function parameters)');

            const instructionsNone = parser['generateInstructions']({
                trailingComma: 'none'
            });
            expect(instructionsNone).toContain('Never add trailing commas');
        });

        it('should generate correct instructions for bracket spacing', () => {
            const instructionsTrue = parser['generateInstructions']({
                bracketSpacing: true
            });
            expect(instructionsTrue).toContain('Add spaces inside object literal braces: { foo: bar }');

            const instructionsFalse = parser['generateInstructions']({
                bracketSpacing: false
            });
            expect(instructionsFalse).toContain('Do not add spaces inside object literal braces: {foo: bar}');
        });

        it('should generate correct instructions for arrow function parentheses', () => {
            const instructionsAvoid = parser['generateInstructions']({
                arrowParens: 'avoid'
            });
            expect(instructionsAvoid).toContain('Omit parentheses around single arrow function parameters: x => x');

            const instructionsAlways = parser['generateInstructions']({
                arrowParens: 'always'
            });
            expect(instructionsAlways).toContain('Always include parentheses around arrow function parameters: (x) => x');
        });

        it('should generate default instructions when no options provided', () => {
            const instructions = parser['generateInstructions']({});

            expect(instructions).toContain('Use Prettier defaults for code formatting');
            expect(instructions).toContain('Prefer consistent formatting over personal style preferences');
        });
    });

    describe('findPrettierConfig', () => {
        beforeEach(() => {
            mockFs.existsSync.mockReturnValue(false);
        });

        it('should find .prettierrc file', async () => {
            mockFs.existsSync.mockImplementation((filePath: any) => {
                return filePath.toString().endsWith('.prettierrc');
            });

            const result = await parser.findPrettierConfig('/mock/project');
            expect(result.configPath).toBe('/mock/project/.prettierrc');
            expect(result.checkedPaths).toContain('/mock/project/.prettierrc');
        });

        it('should find prettier.config.js file', async () => {
            mockFs.existsSync.mockImplementation((filePath: any) => {
                return filePath.toString().endsWith('prettier.config.js');
            });

            const result = await parser.findPrettierConfig('/mock/project');
            expect(result.configPath).toBe('/mock/project/prettier.config.js');
            expect(result.checkedPaths).toContain('/mock/project/prettier.config.js');
        });

        it('should find configuration in package.json', async () => {
            mockFs.existsSync.mockImplementation((filePath: any) => {
                return filePath.toString().endsWith('package.json');
            });

            mockFs.readFileSync.mockReturnValue(JSON.stringify({
                name: 'test',
                prettier: {
                    semi: false
                }
            }));

            const result = await parser.findPrettierConfig('/mock/project');
            expect(result.configPath).toBe('/mock/project/package.json');
            expect(result.checkedPaths).toContain('/mock/project/package.json');
        });

        it('should return null when no config found', async () => {
            mockFs.existsSync.mockReturnValue(false);

            const result = await parser.findPrettierConfig('/mock/project');
            expect(result.configPath).toBeNull();
            expect(result.checkedPaths.length).toBeGreaterThan(0);
        });

        it('should handle package.json parsing errors', async () => {
            mockFs.existsSync.mockImplementation((filePath: any) => {
                return filePath.toString().endsWith('package.json');
            });

            mockFs.readFileSync.mockReturnValue('invalid json');

            const result = await parser.findPrettierConfig('/mock/project');
            expect(result.configPath).toBeNull();
            expect(result.checkedPaths).toContain('/mock/project/package.json');
        });
    });

    describe('validateConfiguration', () => {
        it('should validate correct configuration', async () => {
            const prettier = require('prettier');
            
            prettier.resolveConfig.mockResolvedValue({
                semi: false,
                singleQuote: true
            });
            
            prettier.format.mockResolvedValue('const x = { a: 1, b: 2 }\n');

            const result = await parser.validateConfiguration('/mock/.prettierrc');
            
            expect(result.valid).toBe(true);
            expect(result.error).toBeUndefined();
        });

        it('should detect invalid configuration', async () => {
            const prettier = require('prettier');
            
            prettier.resolveConfig.mockResolvedValue(null);

            const result = await parser.validateConfiguration('/mock/.prettierrc');
            
            expect(result.valid).toBe(false);
            expect(result.error).toBe('No configuration found');
        });

        it('should handle formatting errors', async () => {
            const prettier = require('prettier');
            
            prettier.resolveConfig.mockResolvedValue({
                parser: 'invalid-parser'
            });
            
            prettier.format.mockRejectedValue(new Error('Invalid parser'));

            const result = await parser.validateConfiguration('/mock/.prettierrc');
            
            expect(result.valid).toBe(false);
            expect(result.error).toBe('Invalid parser');
        });
    });

    describe('generateFormattingSection', () => {
        it('should generate formatted instruction section', () => {
            const options = {
                semi: false,
                singleQuote: true,
                printWidth: 100
            };

            const result = parser.generateFormattingSection(options);

            expect(result).toContain('- Omit semicolons at the end of statements');
            expect(result).toContain('- Use single quotes for strings instead of double quotes');
            expect(result).toContain('- Keep lines under 100 characters');
        });

        it('should return default message for empty options', () => {
            const result = parser.generateFormattingSection({});
            expect(result).toContain('Use Prettier defaults for code formatting');
        });
    });
});