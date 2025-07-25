/**
 * Smart Framework Detection System
 * Detects all major JavaScript/TypeScript frameworks with confidence scoring
 * Part of Phase 1.9.1 improvements
 */

import * as fs from 'fs';
import * as path from 'path';

export interface FrameworkInfo {
    name: string;
    type: 'spa' | 'ssr' | 'static' | 'library' | 'monorepo';
    testCommand: string;
    buildCommand?: string;
    devCommand?: string;
    confidence: number; // 0-1
    indicators: string[]; // What files/patterns detected it
    version?: string;
}

export interface FrameworkDetector {
    detect(workspaceRoot: string): Promise<FrameworkInfo | null>;
    readonly name: string;
    readonly priority: number; // Higher = check first
}

/**
 * Nx Workspace Detector - Highest Priority
 */
export class NxWorkspaceDetector implements FrameworkDetector {
    readonly name = 'Nx Workspace';
    readonly priority = 10;

    async detect(root: string): Promise<FrameworkInfo | null> {
        const nxJson = path.join(root, 'nx.json');
        const packageJson = path.join(root, 'package.json');
        
        if (!fs.existsSync(nxJson)) return null;

        try {
            const indicators = ['nx.json'];
            let confidence = 0.9;

            if (fs.existsSync(packageJson)) {
                const pkg = JSON.parse(fs.readFileSync(packageJson, 'utf8'));
                const hasNxDep = pkg.dependencies?.['@nrwl/workspace'] || 
                               pkg.devDependencies?.['@nrwl/workspace'] ||
                               pkg.dependencies?.['@nx/workspace'] ||
                               pkg.devDependencies?.['@nx/workspace'];
                
                if (hasNxDep) {
                    confidence = 0.98;
                    indicators.push('nx workspace dependency');
                }
            }

            return {
                name: 'Nx',
                type: 'monorepo',
                testCommand: 'npx nx test {project}',
                buildCommand: 'npx nx build {project}',
                devCommand: 'npx nx serve {project}',
                confidence,
                indicators
            };
        } catch {
            return null;
        }
    }
}

/**
 * Angular CLI Detector
 */
export class AngularCLIDetector implements FrameworkDetector {
    readonly name = 'Angular CLI';
    readonly priority = 9;

    async detect(root: string): Promise<FrameworkInfo | null> {
        const angularJson = path.join(root, 'angular.json');
        const packageJson = path.join(root, 'package.json');
        
        if (!fs.existsSync(angularJson)) return null;

        try {
            const config = JSON.parse(fs.readFileSync(angularJson, 'utf8'));
            const indicators = ['angular.json'];
            let testCommand = 'ng test';
            let confidence = 0.85;

            if (fs.existsSync(packageJson)) {
                const pkg = JSON.parse(fs.readFileSync(packageJson, 'utf8'));
                const hasAngularCore = pkg.dependencies?.['@angular/core'];
                const hasAngularCLI = pkg.devDependencies?.['@angular/cli'];
                
                if (!hasAngularCore) return null;
                
                indicators.push('@angular/core dependency');
                
                if (hasAngularCLI) {
                    confidence = 0.95;
                    indicators.push('@angular/cli dependency');
                }

                // Single project setup
                if (config.projects && Object.keys(config.projects).length === 1) {
                    const projectName = Object.keys(config.projects)[0];
                    testCommand = `ng test ${projectName}`;
                }
            }

            return {
                name: 'Angular',
                type: 'spa',
                testCommand,
                buildCommand: 'ng build',
                devCommand: 'ng serve',
                confidence,
                indicators
            };
        } catch {
            return null;
        }
    }
}

/**
 * Next.js Detector
 */
export class NextJsDetector implements FrameworkDetector {
    readonly name = 'Next.js';
    readonly priority = 8;

    async detect(root: string): Promise<FrameworkInfo | null> {
        const nextConfigs = [
            'next.config.js',
            'next.config.ts',
            'next.config.mjs'
        ];

        const configFile = nextConfigs.find(config => 
            fs.existsSync(path.join(root, config))
        );

        const packageJson = path.join(root, 'package.json');
        if (!fs.existsSync(packageJson)) return null;

        try {
            const pkg = JSON.parse(fs.readFileSync(packageJson, 'utf8'));
            const hasNext = pkg.dependencies?.next || pkg.devDependencies?.next;
            
            if (!hasNext && !configFile) return null;

            const indicators: string[] = [];
            let confidence = 0.7;

            if (configFile) {
                indicators.push(configFile);
                confidence += 0.15;
            }

            if (hasNext) {
                indicators.push('next dependency');
                confidence += 0.15;
            }

            // Check for typical Next.js structure
            if (fs.existsSync(path.join(root, 'pages')) || 
                fs.existsSync(path.join(root, 'app'))) {
                indicators.push('Next.js directory structure');
                confidence = Math.min(0.95, confidence + 0.1);
            }

            const hasJest = pkg.devDependencies?.jest;
            const testCommand = hasJest ? 'npm test' : 'echo "No tests configured"';

            return {
                name: 'Next.js',
                type: 'ssr',
                testCommand,
                buildCommand: 'npm run build',
                devCommand: 'npm run dev',
                confidence,
                indicators
            };
        } catch {
            return null;
        }
    }
}

/**
 * Vite Detector
 */
export class ViteDetector implements FrameworkDetector {
    readonly name = 'Vite';
    readonly priority = 7;

    async detect(root: string): Promise<FrameworkInfo | null> {
        const viteConfigs = [
            'vite.config.js',
            'vite.config.ts',
            'vite.config.mjs'
        ];

        const configFile = viteConfigs.find(config => 
            fs.existsSync(path.join(root, config))
        );

        const packageJson = path.join(root, 'package.json');
        if (!fs.existsSync(packageJson)) return null;

        try {
            const pkg = JSON.parse(fs.readFileSync(packageJson, 'utf8'));
            const hasVite = pkg.devDependencies?.vite || pkg.dependencies?.vite;
            
            if (!hasVite && !configFile) return null;

            const indicators: string[] = [];
            let confidence = 0.8;

            if (configFile) {
                indicators.push(configFile);
                confidence += 0.1;
            }

            if (hasVite) {
                indicators.push('vite dependency');
            }

            const hasVitest = pkg.devDependencies?.vitest;
            const hasJest = pkg.devDependencies?.jest;
            
            let testCommand = 'npm test';
            if (hasVitest) {
                testCommand = 'vitest run';
                indicators.push('vitest for testing');
                confidence = Math.min(0.95, confidence + 0.05);
            } else if (hasJest) {
                testCommand = 'jest';
                indicators.push('jest for testing');
            }

            return {
                name: 'Vite',
                type: 'spa',
                testCommand,
                buildCommand: 'vite build',
                devCommand: 'vite dev',
                confidence,
                indicators
            };
        } catch {
            return null;
        }
    }
}

/**
 * Create React App Detector
 */
export class CreateReactAppDetector implements FrameworkDetector {
    readonly name = 'Create React App';
    readonly priority = 6;

    async detect(root: string): Promise<FrameworkInfo | null> {
        const packageJson = path.join(root, 'package.json');
        if (!fs.existsSync(packageJson)) return null;

        try {
            const pkg = JSON.parse(fs.readFileSync(packageJson, 'utf8'));
            const hasReactScripts = pkg.dependencies?.['react-scripts'] || 
                                  pkg.devDependencies?.['react-scripts'];
            
            if (!hasReactScripts) return null;

            const indicators = ['react-scripts dependency'];
            let confidence = 0.9;

            // Check for typical CRA structure
            const publicIndex = path.join(root, 'public', 'index.html');
            if (fs.existsSync(publicIndex)) {
                indicators.push('public/index.html');
                confidence = 0.95;
            }

            const srcIndex = path.join(root, 'src', 'index.js');
            const srcIndexTs = path.join(root, 'src', 'index.tsx');
            if (fs.existsSync(srcIndex) || fs.existsSync(srcIndexTs)) {
                indicators.push('src/index entry point');
                confidence = Math.min(0.98, confidence + 0.03);
            }

            return {
                name: 'Create React App',
                type: 'spa',
                testCommand: 'npm test',
                buildCommand: 'npm run build',
                devCommand: 'npm start',
                confidence,
                indicators
            };
        } catch {
            return null;
        }
    }
}

/**
 * Vue CLI Detector
 */
export class VueCLIDetector implements FrameworkDetector {
    readonly name = 'Vue CLI';
    readonly priority = 5;

    async detect(root: string): Promise<FrameworkInfo | null> {
        const vueConfigs = [
            'vue.config.js',
            'vue.config.ts'
        ];

        const configFile = vueConfigs.find(config => 
            fs.existsSync(path.join(root, config))
        );

        const packageJson = path.join(root, 'package.json');
        if (!fs.existsSync(packageJson)) return null;

        try {
            const pkg = JSON.parse(fs.readFileSync(packageJson, 'utf8'));
            const hasVue = pkg.dependencies?.vue;
            const hasVueCLI = pkg.devDependencies?.['@vue/cli-service'];
            
            if (!hasVue && !configFile) return null;

            const indicators: string[] = [];
            let confidence = 0.7;

            if (configFile) {
                indicators.push(configFile);
                confidence += 0.15;
            }

            if (hasVue) {
                indicators.push('vue dependency');
                confidence += 0.1;
            }

            if (hasVueCLI) {
                indicators.push('@vue/cli-service');
                confidence = Math.min(0.95, confidence + 0.1);
            }

            return {
                name: 'Vue',
                type: 'spa',
                testCommand: 'npm run test:unit',
                buildCommand: 'npm run build',
                devCommand: 'npm run serve',
                confidence,
                indicators
            };
        } catch {
            return null;
        }
    }
}

/**
 * Nuxt.js Detector
 */
export class NuxtDetector implements FrameworkDetector {
    readonly name = 'Nuxt.js';
    readonly priority = 4;

    async detect(root: string): Promise<FrameworkInfo | null> {
        const nuxtConfigs = [
            'nuxt.config.js',
            'nuxt.config.ts'
        ];

        const configFile = nuxtConfigs.find(config => 
            fs.existsSync(path.join(root, config))
        );

        const packageJson = path.join(root, 'package.json');
        if (!fs.existsSync(packageJson)) return null;

        try {
            const pkg = JSON.parse(fs.readFileSync(packageJson, 'utf8'));
            const hasNuxt = pkg.dependencies?.nuxt || pkg.devDependencies?.nuxt;
            
            if (!hasNuxt && !configFile) return null;

            const indicators: string[] = [];
            let confidence = 0.8;

            if (configFile) {
                indicators.push(configFile);
                confidence += 0.1;
            }

            if (hasNuxt) {
                indicators.push('nuxt dependency');
                confidence += 0.1;
            }

            return {
                name: 'Nuxt.js',
                type: 'ssr',
                testCommand: 'npm test',
                buildCommand: 'npm run build',
                devCommand: 'npm run dev',
                confidence,
                indicators
            };
        } catch {
            return null;
        }
    }
}

/**
 * Generic Jest Project Detector
 */
export class JestOnlyDetector implements FrameworkDetector {
    readonly name = 'Jest Project';
    readonly priority = 1;

    async detect(root: string): Promise<FrameworkInfo | null> {
        const packageJson = path.join(root, 'package.json');
        if (!fs.existsSync(packageJson)) return null;

        try {
            const pkg = JSON.parse(fs.readFileSync(packageJson, 'utf8'));
            const hasJest = pkg.devDependencies?.jest || pkg.dependencies?.jest;
            
            if (!hasJest) return null;

            const indicators = ['jest dependency'];
            let confidence = 0.5;

            // Check for jest config
            const jestConfigs = ['jest.config.js', 'jest.config.ts', 'jest.config.json'];
            const hasJestConfig = jestConfigs.some(config => 
                fs.existsSync(path.join(root, config))
            );

            if (hasJestConfig) {
                indicators.push('jest configuration file');
                confidence = 0.7;
            }

            return {
                name: 'Jest',
                type: 'library',
                testCommand: 'jest',
                confidence,
                indicators
            };
        } catch {
            return null;
        }
    }
}

/**
 * Main Smart Framework Detector
 */
export class SmartFrameworkDetector {
    private detectors: FrameworkDetector[] = [
        new NxWorkspaceDetector(),
        new AngularCLIDetector(),
        new NextJsDetector(),
        new ViteDetector(),
        new CreateReactAppDetector(),
        new VueCLIDetector(),
        new NuxtDetector(),
        new JestOnlyDetector(),
    ];

    constructor() {
        // Sort by priority (highest first)
        this.detectors.sort((a, b) => b.priority - a.priority);
    }

    /**
     * Detect all frameworks in workspace
     */
    async detectAll(workspaceRoot: string): Promise<FrameworkInfo[]> {
        const results: FrameworkInfo[] = [];
        
        for (const detector of this.detectors) {
            try {
                const info = await detector.detect(workspaceRoot);
                if (info && info.confidence > 0.6) { // Only include confident detections
                    results.push(info);
                }
            } catch (error) {
                console.warn(`Detector ${detector.name} failed:`, error);
            }
        }
        
        return results.sort((a, b) => b.confidence - a.confidence);
    }

    /**
     * Get the most confident framework detection
     */
    async detectPrimary(workspaceRoot: string): Promise<FrameworkInfo | null> {
        const frameworks = await this.detectAll(workspaceRoot);
        return frameworks.length > 0 ? frameworks[0] : null;
    }

    /**
     * Get framework-specific test command
     */
    async getRecommendedTestCommand(workspaceRoot: string, project?: string): Promise<string> {
        const primary = await this.detectPrimary(workspaceRoot);
        
        if (!primary) {
            return 'npm test';
        }

        let command = primary.testCommand;
        
        // Replace project placeholder if needed
        if (project && command.includes('{project}')) {
            command = command.replace('{project}', project);
        }
        
        return command;
    }

    /**
     * Generate framework detection summary
     */
    async generateDetectionSummary(workspaceRoot: string): Promise<string> {
        const frameworks = await this.detectAll(workspaceRoot);
        
        if (frameworks.length === 0) {
            return '❓ No frameworks detected - using generic npm test';
        }

        const primary = frameworks[0];
        let summary = `🎯 Primary: ${primary.name} (${Math.round(primary.confidence * 100)}% confidence)\n`;
        summary += `   Test Command: ${primary.testCommand}\n`;
        summary += `   Indicators: ${primary.indicators.join(', ')}\n`;

        if (frameworks.length > 1) {
            summary += `\n📋 Also detected:\n`;
            frameworks.slice(1).forEach(fw => {
                summary += `   • ${fw.name} (${Math.round(fw.confidence * 100)}%)\n`;
            });
        }

        return summary;
    }
}