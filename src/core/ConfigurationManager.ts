/**
 * Configuration Manager for AI Debug Context
 * Supports .aiDebugContext.yml configuration files
 * Nx remains the default framework
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { SmartFrameworkDetector, FrameworkInfo } from '../utils/SmartFrameworkDetector';

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
                const userConfig = yaml.load(fileContent) as Partial<AIDebugConfig>;
                
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
        let command = this.config.testCommands[mode] || this.config.testCommands.default;
        
        // Replace placeholders
        if (project) {
            command = command.replace('{project}', project);
        }
        
        // Add verbose flag if configured
        if (this.config.output?.verbose && !command.includes('--verbose')) {
            command += ' --verbose';
        }
        
        return command;
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
            const yamlContent = yaml.dump(this.config, {
                indent: 2,
                lineWidth: 120,
                noRefs: true
            });
            
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