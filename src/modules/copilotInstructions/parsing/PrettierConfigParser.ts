import * as path from 'path';
import * as fs from 'fs';

export interface PrettierConfigResult {
    options: any; // prettier.Options when available
    configPath: string | null;
    ignored: boolean;
    inferredParser: string | null;
    instructions: string[];
    checkedPaths: string[];
}

export class PrettierConfigParser {
    private async getPrettier(): Promise<any> {
        try {
            const prettier = await import('prettier');
            return prettier.default || prettier;
        } catch (error) {
            console.warn('Prettier is not installed - some config parsing will be skipped');
            return null;
        }
    }
    async parseConfiguration(workspaceRoot: string): Promise<PrettierConfigResult | null> {
        try {
            // First, check for Prettier config files in the workspace root
            const configResult = await this.findPrettierConfig(workspaceRoot);
            const checkedPaths: string[] = [...configResult.checkedPaths];
            
            // Build search paths, starting with the config file if found
            const searchPaths: string[] = [];
            if (configResult.configPath) {
                searchPaths.push(configResult.configPath);
            }
            
            // Add common file paths for prettier to resolve from
            const additionalPaths = [
                path.join(workspaceRoot, 'src/index.ts'),
                path.join(workspaceRoot, 'src/main.ts'),
                path.join(workspaceRoot, 'src/app/app.component.ts'),
                path.join(workspaceRoot, 'libs/shared/src/index.ts')
            ];
            
            // Only add paths that weren't already checked
            for (const additionalPath of additionalPaths) {
                if (!checkedPaths.includes(additionalPath)) {
                    searchPaths.push(additionalPath);
                }
            }

            let resolvedOptions = null;
            let resolvedConfigPath = null;
            let fileInfo = null;

            // Try each search path until we find a config
            for (const searchPath of searchPaths) {
                checkedPaths.push(searchPath);
                
                try {
                    const prettier = await this.getPrettier();
                    if (!prettier) {
                        console.warn('Prettier not available - skipping config resolution');
                        continue;
                    }

                    // Resolve configuration for specific file path
                    resolvedOptions = await prettier.resolveConfig(searchPath, {
                        useCache: false,
                        editorconfig: true
                    });

                    // Get config file path  
                    resolvedConfigPath = await prettier.resolveConfigFile(searchPath);

                    // Check file info if the path exists
                    if (fs.existsSync(searchPath)) {
                        fileInfo = await prettier.getFileInfo(searchPath, {
                            ignorePath: '.prettierignore'
                        });
                    }

                    // If we found options or config path, use this result
                    if (resolvedOptions || resolvedConfigPath) {
                        console.log(`Prettier config resolved from search path: ${searchPath}`);
                        break;
                    }
                } catch (searchError) {
                    console.warn(`Prettier search failed for ${searchPath}:`, searchError);
                    continue;
                }
            }

            const instructions = this.generateInstructions(resolvedOptions || {});

            return {
                options: resolvedOptions || {},
                configPath: resolvedConfigPath,
                ignored: fileInfo?.ignored || false,
                inferredParser: fileInfo?.inferredParser || null,
                instructions,
                checkedPaths
            };
        } catch (error) {
            console.error('Prettier configuration parsing failed:', error);
            return null;
        }
    }

    private generateInstructions(options: any): string[] {
        const instructions: string[] = [];
        
        // Semicolons
        if (options.semi === false) {
            instructions.push('Omit semicolons at the end of statements');
        } else if (options.semi === true) {
            instructions.push('Always add semicolons at the end of statements');
        }

        // Quotes
        if (options.singleQuote === true) {
            instructions.push('Use single quotes for strings instead of double quotes');
        } else if (options.singleQuote === false) {
            instructions.push('Use double quotes for strings');
        }

        // JSX Quotes
        if (options.jsxSingleQuote === true) {
            instructions.push('Use single quotes in JSX attributes');
        } else if (options.jsxSingleQuote === false) {
            instructions.push('Use double quotes in JSX attributes');
        }

        // Print Width
        if (options.printWidth && options.printWidth !== 80) {
            instructions.push(`Keep lines under ${options.printWidth} characters`);
        }

        // Tab Width
        if (options.tabWidth && options.tabWidth !== 2) {
            instructions.push(`Use ${options.tabWidth} spaces for indentation`);
        }

        // Tabs vs Spaces
        if (options.useTabs === true) {
            instructions.push('Use tabs for indentation instead of spaces');
        }

        // Trailing Commas
        if (options.trailingComma === 'es5') {
            instructions.push('Add trailing commas where valid in ES5 (objects, arrays, etc)');
        } else if (options.trailingComma === 'all') {
            instructions.push('Add trailing commas wherever possible (including function parameters)');
        } else if (options.trailingComma === 'none') {
            instructions.push('Never add trailing commas');
        }

        // Bracket Spacing
        if (options.bracketSpacing === false) {
            instructions.push('Do not add spaces inside object literal braces: {foo: bar}');
        } else if (options.bracketSpacing === true) {
            instructions.push('Add spaces inside object literal braces: { foo: bar }');
        }

        // JSX Bracket Same Line
        if (options.jsxBracketSameLine === true) {
            instructions.push('Put the closing > of JSX multi-line elements on the same line as the last prop');
        }

        // Arrow Function Parentheses
        if (options.arrowParens === 'avoid') {
            instructions.push('Omit parentheses around single arrow function parameters: x => x');
        } else if (options.arrowParens === 'always') {
            instructions.push('Always include parentheses around arrow function parameters: (x) => x');
        }

        // Range
        if (options.rangeStart !== undefined && options.rangeStart > 0) {
            instructions.push(`Format only from character ${options.rangeStart}`);
        }
        if (options.rangeEnd !== undefined && options.rangeEnd < Infinity) {
            instructions.push(`Format only until character ${options.rangeEnd}`);
        }

        // Parser
        if (options.parser) {
            instructions.push(`Use ${options.parser} parser for formatting`);
        }

        // End of Line
        if (options.endOfLine === 'lf') {
            instructions.push('Use LF (\\n) line endings');
        } else if (options.endOfLine === 'crlf') {
            instructions.push('Use CRLF (\\r\\n) line endings');
        } else if (options.endOfLine === 'cr') {
            instructions.push('Use CR (\\r) line endings');
        }

        // Embedded Language Formatting
        if (options.embeddedLanguageFormatting === 'off') {
            instructions.push('Do not format code inside template literals, markdown code blocks, etc.');
        } else if (options.embeddedLanguageFormatting === 'auto') {
            instructions.push('Automatically format embedded languages when possible');
        }

        // HTML Whitespace Sensitivity
        if (options.htmlWhitespaceSensitivity === 'strict') {
            instructions.push('Preserve all whitespace in HTML');
        } else if (options.htmlWhitespaceSensitivity === 'ignore') {
            instructions.push('Ignore whitespace in HTML formatting');
        }

        // Vue Script and Style Tags Indentation
        if (options.vueIndentScriptAndStyle === true) {
            instructions.push('Indent <script> and <style> tags in Vue files');
        }

        // Prose Wrap
        if (options.proseWrap === 'always') {
            instructions.push('Always wrap prose (markdown, etc.) to print width');
        } else if (options.proseWrap === 'never') {
            instructions.push('Never wrap prose, keep it on single lines');
        } else if (options.proseWrap === 'preserve') {
            instructions.push('Preserve existing line breaks in prose');
        }

        // If no specific options are set, provide default guidance
        if (instructions.length === 0) {
            instructions.push('Use Prettier defaults for code formatting');
            instructions.push('Prefer consistent formatting over personal style preferences');
        }

        return instructions;
    }

    async findPrettierConfig(projectPath: string): Promise<{ configPath: string | null; checkedPaths: string[] }> {
        const configFiles = [
            '.prettierrc',
            '.prettierrc.json',
            '.prettierrc.yaml',
            '.prettierrc.yml',
            '.prettierrc.js',
            '.prettierrc.mjs',
            '.prettierrc.cjs',
            'prettier.config.js',
            'prettier.config.mjs',
            'prettier.config.cjs'
        ];

        const checkedPaths: string[] = [];

        // Check each config file in order of preference
        for (const configFile of configFiles) {
            const configPath = path.join(projectPath, configFile);
            checkedPaths.push(configPath);
            if (fs.existsSync(configPath)) {
                return { configPath, checkedPaths };
            }
        }

        // Check package.json for prettier config
        const packageJsonPath = path.join(projectPath, 'package.json');
        checkedPaths.push(packageJsonPath);
        if (fs.existsSync(packageJsonPath)) {
            try {
                const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
                if (packageJson.prettier) {
                    return { configPath: packageJsonPath, checkedPaths };
                }
            } catch (error) {
                // Ignore JSON parsing errors
            }
        }

        return { configPath: null, checkedPaths };
    }

    async validateConfiguration(configPath: string): Promise<{ valid: boolean; error?: string }> {
        try {
            const prettier = await this.getPrettier();
            if (!prettier) {
                return { valid: false, error: 'Prettier is not installed' };
            }

            const config = await prettier.resolveConfig(configPath);
            if (config === null) {
                return { valid: false, error: 'No configuration found' };
            }

            // Try to format a sample file to validate the config
            const sampleCode = 'const x = { a: 1, b: 2 };\n';
            await prettier.format(sampleCode, { ...config, parser: 'typescript' });
            
            return { valid: true };
        } catch (error) {
            return { 
                valid: false, 
                error: error instanceof Error ? error.message : 'Unknown configuration error' 
            };
        }
    }

    generateFormattingSection(options: any): string {
        const instructions = this.generateInstructions(options);
        
        if (instructions.length === 0) {
            return 'Using Prettier defaults for code formatting.';
        }

        return instructions.map(instruction => `- ${instruction}`).join('\n');
    }
}