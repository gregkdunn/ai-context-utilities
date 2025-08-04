import * as path from 'path';
import * as fs from 'fs';

export interface ParsedRule {
    name: string;
    severity: 'error' | 'warn' | 'off';
    options: any[];
    translation: string;
    category: string;
}

export interface ESLintConfigResult {
    rules: ParsedRule[];
    parser: string | null;
    plugins: string[];
    typeAware: boolean;
    configPath: string | null;
    checkedPaths: string[];
}

export class ESLintConfigParser {
    private ruleTranslator = new TypeScriptRuleTranslator();

    private async getESLint(): Promise<any> {
        try {
            const { ESLint } = await import('eslint');
            return ESLint;
        } catch (error) {
            console.warn('ESLint is not installed - some advanced config parsing will be skipped');
            return null;
        }
    }

    private async getCosmiconfig(): Promise<any> {
        try {
            const { cosmiconfig } = await import('cosmiconfig');
            return cosmiconfig;
        } catch (error) {
            console.warn('cosmiconfig is not installed - using fallback config discovery');
            return null;
        }
    }

    private async getFindUp(): Promise<any> {
        try {
            const { findUp } = await import('find-up');
            return findUp;
        } catch (error) {
            console.warn('find-up is not installed - using fallback file discovery');
            return null;
        }
    }

    private async getJSON5(): Promise<any> {
        try {
            const JSON5 = await import('json5');
            return JSON5;
        } catch (error) {
            console.warn('json5 is not installed - using fallback JSON parsing');
            return null;
        }
    }

    private async getYAML(): Promise<any> {
        try {
            const yaml = await import('js-yaml');
            return yaml;
        } catch (error) {
            console.warn('js-yaml is not installed - using fallback YAML parsing');
            return null;
        }
    }

    async parseConfiguration(projectPath: string): Promise<ESLintConfigResult | null> {
        try {
            const result = await this.findConfiguration(projectPath);
            if (!result.config) {
                return {
                    rules: [],
                    parser: null,
                    plugins: [],
                    typeAware: false,
                    configPath: null,
                    checkedPaths: result.checkedPaths
                };
            }

            const parsedRules = this.extractAndTranslateRules(result.config);
            
            return {
                rules: parsedRules,
                parser: this.extractParser(result.config),
                plugins: this.extractPlugins(result.config),
                typeAware: this.isTypeAware(result.config),
                configPath: result.config.configPath || null,
                checkedPaths: result.checkedPaths
            };
        } catch (error) {
            console.error('ESLint configuration parsing failed:', error);
            return null;
        }
    }

    private async findConfiguration(startDir: string): Promise<{ config: any; checkedPaths: string[] }> {
        const checkedPaths: string[] = [];
        
        // For Nx workspaces, check common ESLint locations
        const nxConfigLocations = [
            // Workspace root configs (most common in Nx)
            '.eslintrc.json',
            '.eslintrc.js', 
            '.eslintrc.yml',
            '.eslintrc.yaml',
            // Flat config (ESLint 9+)
            'eslint.config.js',
            'eslint.config.mjs',
            'eslint.config.ts',
            // Nx-specific locations
            'libs/.eslintrc.json',
            'apps/.eslintrc.json'
        ];

        // First try finding configs starting from workspace root
        for (const configFile of nxConfigLocations) {
            const configPath = path.join(startDir, configFile);
            checkedPaths.push(configPath);
            
            if (fs.existsSync(configPath)) {
                if (configFile.includes('eslint.config.')) {
                    const config = await this.loadFlatConfig(configPath);
                    return { config, checkedPaths };
                } else {
                    try {
                        const content = await fs.promises.readFile(configPath, 'utf8');
                        let config;
                        
                        if (configFile.endsWith('.json')) {
                            config = JSON.parse(content);
                        } else if (configFile.endsWith('.js')) {
                            config = require(configPath);
                        } else {
                            // YAML file
                            const yaml = await this.getYAML();
                            config = yaml ? yaml.load(content) : {};
                        }
                        return {
                            config: {
                                ...config,
                                configPath
                            },
                            checkedPaths
                        };
                    } catch (error) {
                        console.warn(`Failed to parse ESLint config at ${configPath}:`, error);
                        continue;
                    }
                }
            }
        }

        // Check for flat config using findUp (ESLint 9+) if available
        const findUp = await this.getFindUp();
        if (findUp) {
            const flatConfigPath = await findUp([
                'eslint.config.js',
                'eslint.config.mjs',
                'eslint.config.ts'
            ], { cwd: startDir });

            if (flatConfigPath) {
                checkedPaths.push(flatConfigPath);
                const config = await this.loadFlatConfig(flatConfigPath);
                return { config, checkedPaths };
            }
        }

        // Fall back to cosmiconfig search (traverses up directory tree) if available
        const cosmiconfig = await this.getCosmiconfig();
        if (!cosmiconfig) {
            console.warn('Cosmiconfig not available - skipping legacy config search');
            return { config: null, checkedPaths };
        }

        const explorer = cosmiconfig('eslint', {
            loaders: {
                '.json5': async (_filepath: string, content: string) => {
                    const JSON5 = await this.getJSON5();
                    return JSON5 ? JSON5.parse(content) : JSON.parse(content);
                },
                '.yaml': async (_filepath: string, content: string) => {
                    const yaml = await this.getYAML();
                    return yaml ? yaml.load(content) : {};
                },
                '.yml': async (_filepath: string, content: string) => {
                    const yaml = await this.getYAML();
                    return yaml ? yaml.load(content) : {};
                }
            }
        });

        const legacyResult = await explorer.search(startDir);
        if (legacyResult) {
            checkedPaths.push(legacyResult.filepath);
            return {
                config: {
                    ...legacyResult.config,
                    configPath: legacyResult.filepath
                },
                checkedPaths
            };
        }

        return { config: null, checkedPaths };
    }

    private async loadFlatConfig(configPath: string): Promise<any> {
        try {
            const ESLintClass = await this.getESLint();
            if (!ESLintClass) {
                console.warn('ESLint not available - cannot load flat config');
                return null;
            }
            
            const eslint = new ESLintClass({
                overrideConfigFile: configPath
            });
            
            // Calculate configuration for a sample TypeScript file
            const config = await eslint.calculateConfigForFile(
                path.join(path.dirname(configPath), 'sample.ts')
            );
            
            return {
                ...config,
                configPath
            };
        } catch (error) {
            console.error('Failed to load flat config:', error);
            return null;
        }
    }

    private extractAndTranslateRules(config: any): ParsedRule[] {
        const rules = config.rules || {};
        const parsedRules: ParsedRule[] = [];

        for (const [ruleName, ruleConfig] of Object.entries(rules)) {
            const parsedRule = this.parseRule(ruleName, ruleConfig);
            if (parsedRule) {
                parsedRules.push(parsedRule);
            }
        }

        return parsedRules.sort((a, b) => {
            // Sort by severity (error > warn > off) then by name
            const severityWeight = { error: 3, warn: 2, off: 1 };
            const weightDiff = severityWeight[b.severity] - severityWeight[a.severity];
            return weightDiff !== 0 ? weightDiff : a.name.localeCompare(b.name);
        });
    }

    private parseRule(ruleName: string, ruleConfig: any): ParsedRule | null {
        const [severity, ...options] = Array.isArray(ruleConfig) 
            ? ruleConfig 
            : [ruleConfig];

        const normalizedSeverity = this.normalizeSeverity(severity);
        
        // Skip 'off' rules
        if (normalizedSeverity === 'off') {
            return null;
        }

        const translation = this.ruleTranslator.translateRule(ruleName, normalizedSeverity, options);
        const category = this.categorizeRule(ruleName);

        return {
            name: ruleName,
            severity: normalizedSeverity,
            options,
            translation,
            category
        };
    }

    private normalizeSeverity(severity: any): 'error' | 'warn' | 'off' {
        if (typeof severity === 'number') {
            return severity === 0 ? 'off' : severity === 1 ? 'warn' : 'error';
        }
        
        if (typeof severity === 'string') {
            const lower = severity.toLowerCase();
            if (lower === 'error' || lower === '2') return 'error';
            if (lower === 'warn' || lower === 'warning' || lower === '1') return 'warn';
            if (lower === 'off' || lower === '0') return 'off';
        }

        return 'error'; // Default fallback
    }

    private categorizeRule(ruleName: string): string {
        if (ruleName.includes('no-unsafe') || ruleName.includes('no-any') || ruleName.includes('strict')) {
            return 'Type Safety';
        }
        if (ruleName.includes('import') || ruleName.includes('export')) {
            return 'Import Organization';
        }
        if (ruleName.includes('naming-convention') || ruleName.includes('camelcase')) {
            return 'Naming Conventions';
        }
        if (ruleName.includes('promise') || ruleName.includes('async') || ruleName.includes('await')) {
            return 'Asynchronous Code';
        }
        if (ruleName.includes('prefer-') || ruleName.includes('no-var') || ruleName.includes('const')) {
            return 'Modern JavaScript';
        }
        if (ruleName.includes('react') || ruleName.includes('jsx')) {
            return 'React Best Practices';
        }
        if (ruleName.includes('angular') || ruleName.includes('@angular-eslint')) {
            return 'Angular Best Practices';
        }
        
        return 'General Code Quality';
    }

    private extractParser(config: any): string | null {
        if (config.languageOptions?.parser) {
            return typeof config.languageOptions.parser === 'string' 
                ? config.languageOptions.parser 
                : config.languageOptions.parser.name || null;
        }
        return config.parser || null;
    }

    private extractPlugins(config: any): string[] {
        if (config.plugins) {
            return Array.isArray(config.plugins) 
                ? config.plugins 
                : Object.keys(config.plugins);
        }
        return [];
    }

    private isTypeAware(config: any): boolean {
        const parserOptions = config.languageOptions?.parserOptions || config.parserOptions || {};
        return parserOptions.projectService === true || 
               parserOptions.project !== undefined ||
               parserOptions.tsconfigRootDir !== undefined;
    }
}

class TypeScriptRuleTranslator {
    private severityMap = {
        'error': 'Always',
        'warn': 'Prefer to',
        'off': null
    };

    translateRule(ruleName: string, severity: 'error' | 'warn' | 'off', options: any[]): string {
        const severityText = this.severityMap[severity];
        if (!severityText) return '';

        return this.getRuleTranslation(ruleName, severityText, options);
    }

    private getRuleTranslation(ruleName: string, severity: string, options: any[]): string {
        const translations: Record<string, (sev: string, opts: any[]) => string> = {
            '@typescript-eslint/no-explicit-any': (sev) => 
                `${sev} use specific types instead of 'any'. When the type is truly unknown, use 'unknown' and add type guards.`,
            
            '@typescript-eslint/consistent-type-imports': (sev, opts) => {
                const prefer = opts[0]?.prefer || 'type-imports';
                return prefer === 'type-imports'
                    ? `${sev} use 'import type' for type-only imports to improve bundling and compilation performance.`
                    : `${sev} use regular imports for all imports, avoiding 'import type' syntax.`;
            },
            
            '@typescript-eslint/naming-convention': (sev, opts) => 
                this.translateNamingConvention(sev, opts),
            
            '@typescript-eslint/no-floating-promises': (sev) =>
                `${sev} handle all Promises with await, .then(), or .catch(). Unhandled promises can cause silent failures.`,
            
            '@typescript-eslint/no-unused-vars': (sev, opts) => {
                const argsIgnorePattern = opts[0]?.argsIgnorePattern;
                const varsIgnorePattern = opts[0]?.varsIgnorePattern;
                let message = `${sev} remove unused variables and imports.`;
                if (argsIgnorePattern) message += ` Parameters matching '${argsIgnorePattern}' are allowed.`;
                if (varsIgnorePattern) message += ` Variables matching '${varsIgnorePattern}' are allowed.`;
                return message;
            },
            
            '@typescript-eslint/prefer-nullish-coalescing': (sev) =>
                `${sev} use nullish coalescing (??) instead of logical OR (||) when checking for null/undefined values.`,
            
            '@typescript-eslint/prefer-optional-chain': (sev) =>
                `${sev} use optional chaining (?.) instead of logical AND (&&) for accessing nested properties.`,
            
            '@typescript-eslint/strict-boolean-expressions': (sev) =>
                `${sev} use explicit boolean expressions in if statements, avoid truthy/falsy checks on non-boolean values.`,
            
            '@typescript-eslint/no-non-null-assertion': (sev) =>
                `${sev} avoid non-null assertion operator (!). Use type guards or optional chaining instead.`,
            
            'prefer-const': (sev) =>
                `${sev} use 'const' for variables that are never reassigned.`,
            
            'no-var': (sev) =>
                `${sev} use 'let' or 'const' instead of 'var' for block-scoped variable declarations.`,
            
            'eqeqeq': (sev, opts) => {
                const always = opts[0] !== 'smart';
                return always 
                    ? `${sev} use strict equality (===) and inequality (!==) operators.`
                    : `${sev} use strict equality except when comparing with null.`;
            }
        };

        const translation = translations[ruleName];
        if (translation) {
            return translation(severity, options);
        }

        // Generic fallback for unknown rules
        const readableName = this.makeRuleNameReadable(ruleName);
        return `${severity} follow the ${readableName} rule.`;
    }

    private translateNamingConvention(severity: string, options: any[]): string {
        const rules: string[] = [];
        
        for (const option of options) {
            if (!option || typeof option !== 'object') continue;
            
            const { selector, format, custom, prefix, suffix } = option;
            if (!selector || !format) continue;
            
            const formats = Array.isArray(format) ? format : [format];
            const formatStr = formats.join(' or ');
            
            switch (selector) {
                case 'variable':
                    rules.push(`Variables should use ${formatStr} naming`);
                    break;
                case 'function':
                    rules.push(`Functions should use ${formatStr} naming`);
                    break;
                case 'parameter':
                    rules.push(`Parameters should use ${formatStr} naming`);
                    break;
                case 'interface':
                    if (prefix?.includes('I')) {
                        rules.push(`Interfaces should start with 'I' prefix and use ${formatStr} naming`);
                    } else {
                        rules.push(`Interfaces should use ${formatStr} naming without 'I' prefix`);
                    }
                    break;
                case 'class':
                    rules.push(`Classes should use ${formatStr} naming`);
                    break;
                case 'typeAlias':
                    rules.push(`Type aliases should use ${formatStr} naming`);
                    break;
                case 'enum':
                    rules.push(`Enums should use ${formatStr} naming`);
                    break;
                case 'enumMember':
                    rules.push(`Enum members should use ${formatStr} naming`);
                    break;
            }
            
            if (custom?.regex) {
                rules.push(`Custom pattern: ${custom.regex} (${custom.message || 'no message'})`);
            }
        }
        
        return rules.length > 0 
            ? `${severity} ${rules.join('. ')}.`
            : `${severity} follow naming convention rules.`;
    }

    private makeRuleNameReadable(ruleName: string): string {
        return ruleName
            .replace(/^@[\w-]+\//, '') // Remove plugin prefix
            .replace(/-/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase());
    }
}