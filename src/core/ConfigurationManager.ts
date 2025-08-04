/**
 * Configuration Manager for AI Debug Context
 * Supports .aiDebugContext.yml configuration files
 * Nx remains the default framework
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
// import * as yaml from 'js-yaml';
import { SmartFrameworkDetector, FrameworkInfo } from '../utils/SmartFrameworkDetector';

// Minimal YAML loader fallback for VSCode extension compatibility
function loadYaml(content: string): any {
    try {
        // Try to load js-yaml dynamically if available
        const yaml = require('js-yaml');
        return yaml.load(content);
    } catch (error) {
        // Fallback to JSON if yaml file looks like JSON
        try {
            return JSON.parse(content);
        } catch {
            // Basic YAML parsing for simple cases
            return parseBasicYaml(content);
        }
    }
}

function dumpYaml(data: any): string {
    try {
        // Try to use js-yaml if available
        const yaml = require('js-yaml');
        return yaml.dump(data, {
            indent: 2,
            lineWidth: 120,
            noRefs: true
        });
    } catch (error) {
        // Fallback to JSON
        return JSON.stringify(data, null, 2);
    }
}

function parseBasicYaml(content: string): any {
    // Very basic YAML parser for simple key-value pairs
    const result: any = {};
    const lines = content.split('\n');
    
    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
            const colonIndex = trimmed.indexOf(':');
            if (colonIndex > 0) {
                const key = trimmed.substring(0, colonIndex).trim();
                const value = trimmed.substring(colonIndex + 1).trim();
                
                // Simple value parsing
                if (value === 'true') result[key] = true;
                else if (value === 'false') result[key] = false;
                else if (!isNaN(Number(value))) result[key] = Number(value);
                else result[key] = value.replace(/^['"]|['"]$/g, ''); // Remove quotes
            }
        }
    }
    
    return result;
}

export interface AIDebugConfig {
    // Test framework - defaults to nx
    framework: 'nx' | 'jest' | 'vitest' | 'mocha' | 'custom';
    
    // Test commands for different scenarios
    testCommands: {
        default: string;        // Default test command
        affected?: string;      // Test affected files (git-based)
        watch?: string;         // Watch mode command
        coverage?: string;      // Coverage command
        debug?: string;         // Debug command
        ci?: string;           // CI command
    };
    
    // Patterns for file matching
    patterns?: {
        test: string[];         // Test file patterns
        source: string[];       // Source file patterns
        ignore?: string[];      // Patterns to ignore
    };
    
    // Performance options
    performance?: {
        parallel: boolean;      // Run tests in parallel
        maxWorkers?: number;    // Max parallel workers
        cache: boolean;         // Enable caching
        cacheTimeout?: number;  // Cache timeout in minutes
    };
    
    // Output options
    output?: {
        verbose: boolean;       // Verbose output
        format: 'legacy' | 'minimal' | 'detailed';
        preserveAnsi: boolean;  // Preserve ANSI colors
        showTiming: boolean;    // Show timing info
    };
}

// Default configuration - Nx focused
const DEFAULT_CONFIG: AIDebugConfig = {
    framework: 'nx',
    testCommands: {
        default: 'npx nx test {project}',
        affected: 'npx nx affected:test',
        watch: 'npx nx test {project} --watch',
        coverage: 'npx nx test {project} --coverage',
        debug: 'npx nx test {project} --inspect'
    },
    patterns: {
        test: ['**/*.spec.ts', '**/*.spec.js', '**/*.test.ts', '**/*.test.js'],
        source: ['src/**/*.ts', 'src/**/*.js'],
        ignore: ['node_modules/**', 'dist/**', 'coverage/**']
    },
    performance: {
        parallel: true,
        cache: true,
        cacheTimeout: 30
    },
    output: {
        verbose: true,
        format: 'legacy',
        preserveAnsi: false,
        showTiming: true
    }
};

// Framework-specific presets
const FRAMEWORK_PRESETS: Record<string, Partial<AIDebugConfig>> = {
    jest: {
        testCommands: {
            default: 'npx jest {project}',
            affected: 'npx jest --findRelatedTests {files}',
            watch: 'npx jest --watch {project}',
            coverage: 'npx jest --coverage {project}',
            debug: 'node --inspect-brk ./node_modules/.bin/jest --runInBand {project}'
        }
    },
    vitest: {
        testCommands: {
            default: 'npx vitest run {project}',
            affected: 'npx vitest run --changed',
            watch: 'npx vitest {project}',
            coverage: 'npx vitest run --coverage {project}',
            debug: 'npx vitest --inspect-brk {project}'
        }
    },
    mocha: {
        testCommands: {
            default: 'npx mocha {project}/**/*.test.js',
            watch: 'npx mocha --watch {project}/**/*.test.js',
            coverage: 'npx nyc mocha {project}/**/*.test.js',
            debug: 'npx mocha --inspect-brk {project}/**/*.test.js'
        }
    }
};

export class ConfigurationManager {
    private config: AIDebugConfig;
    private configPath: string;
    private workspaceRoot: string;
    private frameworkDetector: SmartFrameworkDetector;
    private detectedFrameworks: FrameworkInfo[] = [];
    
    constructor(workspaceRoot: string) {
        this.workspaceRoot = workspaceRoot;
        this.configPath = path.join(workspaceRoot, '.aiDebugContext.yml');
        this.frameworkDetector = new SmartFrameworkDetector();
        this.config = this.loadConfiguration();
    }
    
    /**
     * Load configuration from file or use defaults
     */
    private loadConfiguration(): AIDebugConfig {
        try {
            if (fs.existsSync(this.configPath)) {
                const fileContent = fs.readFileSync(this.configPath, 'utf8');
                const userConfig = loadYaml(fileContent) as Partial<AIDebugConfig>;
                
                // Merge with defaults
                return this.mergeConfigs(DEFAULT_CONFIG, userConfig);
            }
        } catch (error) {
            console.warn('Failed to load .aiDebugContext.yml:', error);
        }
        
        // Auto-detect framework if no config file
        return this.autoDetectFramework();
    }
    
    /**
     * Auto-detect test framework using SmartFrameworkDetector
     */
    private autoDetectFramework(): AIDebugConfig {
        try {
            // Use smart detection (async operation, but fallback to sync for constructor)
            this.performAsyncDetection();
            
            // Fallback to basic detection for immediate use
            const packageJsonPath = path.join(this.workspaceRoot, 'package.json');
            if (fs.existsSync(packageJsonPath)) {
                const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
                const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
                
                // Check for Nx first (primary framework)
                if (deps['@nrwl/workspace'] || deps['@nx/workspace'] || fs.existsSync(path.join(this.workspaceRoot, 'nx.json'))) {
                    return DEFAULT_CONFIG;
                }
                
                // Check other frameworks
                if (deps['vitest']) {
                    return this.mergeConfigs(DEFAULT_CONFIG, { framework: 'vitest', ...FRAMEWORK_PRESETS.vitest });
                }
                if (deps['mocha']) {
                    return this.mergeConfigs(DEFAULT_CONFIG, { framework: 'mocha', ...FRAMEWORK_PRESETS.mocha });
                }
                if (deps['jest']) {
                    return this.mergeConfigs(DEFAULT_CONFIG, { framework: 'jest', ...FRAMEWORK_PRESETS.jest });
                }
            }
        } catch (error) {
            console.warn('Failed to auto-detect framework:', error);
        }
        
        return DEFAULT_CONFIG;
    }

    /**
     * Perform async framework detection and update config
     */
    private async performAsyncDetection(): Promise<void> {
        try {
            this.detectedFrameworks = await this.frameworkDetector.detectAll(this.workspaceRoot);
            
            if (this.detectedFrameworks.length > 0) {
                const primary = this.detectedFrameworks[0];
                
                // Update config based on detection
                if (primary.name === 'Nx') {
                    // Already using Nx config
                } else if (primary.name === 'Angular') {
                    this.config = this.mergeConfigs(this.config, {
                        framework: 'custom',
                        testCommands: {
                            default: primary.testCommand,
                            watch: primary.testCommand.replace('test', 'test --watch'),
                        }
                    });
                } else {
                    // Use detected framework commands
                    this.config = this.mergeConfigs(this.config, {
                        framework: 'custom',
                        testCommands: {
                            default: primary.testCommand,
                            watch: primary.testCommand + ' --watch',
                        }
                    });
                }
            }
        } catch (error) {
            console.warn('Async framework detection failed:', error);
        }
    }
    
    /**
     * Deep merge configurations
     */
    private mergeConfigs(base: AIDebugConfig, override: Partial<AIDebugConfig>): AIDebugConfig {
        return {
            framework: override.framework || base.framework,
            testCommands: {
                ...base.testCommands,
                ...override.testCommands
            },
            patterns: override.patterns ? {
                ...base.patterns,
                ...override.patterns
            } : base.patterns,
            performance: override.performance ? {
                ...base.performance,
                ...override.performance
            } : base.performance,
            output: override.output ? {
                ...base.output,
                ...override.output
            } : base.output
        };
    }
    
    /**
     * Get test command for a specific mode
     */
    getTestCommand(mode: 'default' | 'affected' | 'watch' | 'coverage' | 'debug' = 'default', project?: string): string {
        // Check if we're using Nx but it's not actually available
        if (this.isNx() && !this.isNxAvailable()) {
            return this.getFallbackTestCommand(mode, project);
        }

        let command = this.config.testCommands[mode] || this.config.testCommands.default;
        
        // Replace placeholders
        if (project) {
            command = command.replace('{project}', project);
        } else {
            // Remove {project} placeholder if no project is provided
            command = command.replace(' {project}', '').replace('{project}', '');
        }
        
        // Add verbose flag if configured
        if (this.config.output?.verbose && !command.includes('--verbose')) {
            command += ' --verbose';
        }
        
        return command;
    }

    /**
     * Get fallback test command when Nx is configured but not available
     */
    private getFallbackTestCommand(mode: 'default' | 'affected' | 'watch' | 'coverage' | 'debug' = 'default', project?: string): string {
        const packageScripts = this.getPackageJsonTestScripts();
        
        // Show notification about fallback (only once per session)
        if (!this.hasShownFallbackNotification) {
            this.showNxFallbackNotification();
            this.hasShownFallbackNotification = true;
        }

        // Handle affected tests differently since package.json scripts don't support this
        if (mode === 'affected') {
            return this.getAffectedTestFallback();
        }

        // Map modes to package.json scripts
        let command: string | undefined;
        switch (mode) {
            case 'default':
                command = packageScripts.default;
                break;
            case 'watch':
                command = packageScripts.watch || packageScripts.default;
                break;
            case 'coverage':
                command = packageScripts.coverage || packageScripts.default;
                break;
            case 'debug':
                // For debug mode, fall back to default since package.json rarely has debug scripts
                command = packageScripts.default;
                break;
        }

        // If no suitable script found, return a basic test command
        if (!command) {
            return 'npm test';
        }

        return command;
    }

    private hasShownFallbackNotification = false;

    /**
     * Show notification when falling back from Nx to package.json scripts
     */
    private showNxFallbackNotification(): void {
        const message = 'Nx is not installed, falling back to project test script';
        
        // Use setTimeout to avoid blocking the current execution
        setTimeout(() => {
            vscode.window.showInformationMessage(message);
        }, 100);
    }

    /**
     * Get alternative affected test strategy for non-Nx workspaces
     * This provides a git-based fallback when nx affected is not available
     */
    getAffectedTestFallback(): string {
        const packageScripts = this.getPackageJsonTestScripts();
        
        // Show notification about affected test limitations
        if (!this.hasShownAffectedFallbackNotification) {
            this.showAffectedFallbackNotification();
            this.hasShownAffectedFallbackNotification = true;
        }

        // For non-Nx workspaces, we can't truly run "affected" tests
        // so we fall back to running all tests
        return packageScripts.default || 'npm test';
    }

    private hasShownAffectedFallbackNotification = false;

    /**
     * Show notification about affected test limitations in non-Nx workspaces
     */
    private showAffectedFallbackNotification(): void {
        const message = 'Affected tests not available without Nx - running all tests instead';
        
        setTimeout(() => {
            vscode.window.showInformationMessage(message, 'Learn More').then(selection => {
                if (selection === 'Learn More') {
                    vscode.env.openExternal(vscode.Uri.parse('https://nx.dev/features/run-tasks#run-only-tasks-affected-by-a-pr'));
                }
            });
        }, 100);
    }
    
    /**
     * Get configuration value
     */
    get<K extends keyof AIDebugConfig>(key: K): AIDebugConfig[K] {
        return this.config[key];
    }
    
    /**
     * Update configuration value
     */
    set<K extends keyof AIDebugConfig>(key: K, value: AIDebugConfig[K]): void {
        this.config[key] = value;
    }
    
    /**
     * Save configuration to file
     */
    async saveConfiguration(): Promise<void> {
        try {
            const yamlContent = dumpYaml(this.config);
            
            fs.writeFileSync(this.configPath, yamlContent, 'utf8');
            vscode.window.showInformationMessage('Configuration saved to .aiDebugContext.yml');
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to save configuration: ${error}`);
        }
    }
    
    /**
     * Create example configuration file
     */
    async createExampleConfig(): Promise<void> {
        const exampleConfig = `# AI Debug Context Configuration
# Primary framework: Nx (default)

framework: nx  # Options: nx, jest, vitest, mocha, custom

# Test commands - use {project} as placeholder
testCommands:
  default: npx nx test {project}
  affected: npx nx affected:test
  watch: npx nx test {project} --watch
  coverage: npx nx test {project} --coverage
  debug: npx nx test {project} --inspect

# File patterns
patterns:
  test:
    - "**/*.spec.ts"
    - "**/*.spec.js"
    - "**/*.test.ts"
    - "**/*.test.js"
  source:
    - "src/**/*.ts"
    - "src/**/*.js"
  ignore:
    - "node_modules/**"
    - "dist/**"

# Performance settings
performance:
  parallel: true
  maxWorkers: 4
  cache: true
  cacheTimeout: 30  # minutes

# Output preferences
output:
  verbose: true
  format: legacy  # Options: legacy, minimal, detailed
  preserveAnsi: false
  showTiming: true
`;
        
        fs.writeFileSync(this.configPath, exampleConfig, 'utf8');
        vscode.window.showInformationMessage('Created example .aiDebugContext.yml configuration');
    }
    
    /**
     * Get framework display name
     */
    getFrameworkName(): string {
        const names = {
            nx: 'Nx Workspace',
            jest: 'Jest',
            vitest: 'Vitest',
            mocha: 'Mocha',
            custom: 'Custom'
        };
        return names[this.config.framework] || 'Unknown';
    }
    
    /**
     * Check if using Nx (primary framework)
     */
    isNx(): boolean {
        return this.config.framework === 'nx';
    }

    /**
     * Check if Nx is actually installed and available in the workspace
     */
    isNxAvailable(): boolean {
        try {
            // Check for nx.json configuration file
            if (fs.existsSync(path.join(this.workspaceRoot, 'nx.json'))) {
                return true;
            }

            // Check for nx binary in node_modules
            const nxBinaryPath = path.join(this.workspaceRoot, 'node_modules', '.bin', 'nx');
            if (fs.existsSync(nxBinaryPath)) {
                return true;
            }

            // Check package.json for nx dependencies
            const packageJsonPath = path.join(this.workspaceRoot, 'package.json');
            if (fs.existsSync(packageJsonPath)) {
                const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
                const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
                
                if (deps['@nrwl/workspace'] || deps['@nx/workspace'] || deps['nx']) {
                    return true;
                }
            }

            return false;
        } catch (error) {
            console.warn('Error checking Nx availability:', error);
            return false;
        }
    }

    /**
     * Get test scripts from package.json as fallback when Nx is not available
     */
    private getPackageJsonTestScripts(): { default?: string; watch?: string; coverage?: string; [key: string]: string | undefined } {
        try {
            const packageJsonPath = path.join(this.workspaceRoot, 'package.json');
            if (!fs.existsSync(packageJsonPath)) {
                return {};
            }

            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
            const scripts = packageJson.scripts || {};
            
            const testScripts: { default?: string; watch?: string; coverage?: string; [key: string]: string | undefined } = {};

            // Map common script names to our test command modes
            if (scripts.test) {
                testScripts.default = `npm run test`;
            }
            if (scripts['test:watch']) {
                testScripts.watch = `npm run test:watch`;
            } else if (scripts['test-watch']) {
                testScripts.watch = `npm run test-watch`;
            }
            if (scripts['test:coverage']) {
                testScripts.coverage = `npm run test:coverage`;
            } else if (scripts.coverage) {
                testScripts.coverage = `npm run coverage`;
            }

            // Look for other test-related scripts
            for (const [scriptName, scriptValue] of Object.entries(scripts)) {
                if (typeof scriptValue === 'string' && scriptName.includes('test')) {
                    testScripts[scriptName] = `npm run ${scriptName}`;
                }
            }

            return testScripts;
        } catch (error) {
            console.warn('Error reading package.json test scripts:', error);
            return {};
        }
    }

    /**
     * Get detected frameworks
     */
    getDetectedFrameworks(): FrameworkInfo[] {
        return this.detectedFrameworks;
    }

    /**
     * Get primary detected framework
     */
    getPrimaryFramework(): FrameworkInfo | null {
        return this.detectedFrameworks.length > 0 ? this.detectedFrameworks[0] : null;
    }

    /**
     * Generate framework detection summary
     */
    async getFrameworkDetectionSummary(): Promise<string> {
        if (this.detectedFrameworks.length === 0) {
            // Trigger detection if not done yet
            await this.performAsyncDetection();
        }
        
        return this.frameworkDetector.generateDetectionSummary(this.workspaceRoot);
    }

    /**
     * Get smart test command based on framework detection
     */
    async getSmartTestCommand(project?: string): Promise<string> {
        if (this.detectedFrameworks.length === 0) {
            await this.performAsyncDetection();
        }
        
        return this.frameworkDetector.getRecommendedTestCommand(this.workspaceRoot, project);
    }

    /**
     * Force re-detection of frameworks
     */
    async refreshFrameworkDetection(): Promise<void> {
        await this.performAsyncDetection();
    }
}