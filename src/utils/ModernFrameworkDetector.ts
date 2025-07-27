/**
 * Modern Framework Detection System
 * Detects all current JavaScript/TypeScript frameworks and test runners
 * Phase 2.0.2 - Comprehensive framework support
 */

import * as fs from 'fs';
import * as path from 'path';
import { FrameworkInfo, FrameworkDetector } from './SmartFrameworkDetector';

export interface TestFrameworkInfo {
    name: string;
    testCommand: string;
    watchCommand?: string;
    coverageCommand?: string;
    debugCommand?: string;
    configFiles: string[];
    confidence: number;
}

/**
 * Modern Frontend Framework Detectors
 */
export class SvelteDetector implements FrameworkDetector {
    readonly name = 'Svelte';
    readonly priority = 8;

    async detect(root: string): Promise<FrameworkInfo | null> {
        const packageJsonPath = path.join(root, 'package.json');
        const svelteConfig = path.join(root, 'svelte.config.js');
        const viteConfig = path.join(root, 'vite.config.js');
        
        if (!fs.existsSync(packageJsonPath)) return null;

        try {
            const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
            const hasSvelte = pkg.dependencies?.['svelte'] || pkg.devDependencies?.['svelte'];
            
            if (!hasSvelte) return null;

            const indicators = ['svelte dependency'];
            let confidence = 0.7;
            let testCommand = 'npm test';

            if (fs.existsSync(svelteConfig)) {
                indicators.push('svelte.config.js');
                confidence = 0.85;
            }

            if (fs.existsSync(viteConfig)) {
                indicators.push('vite.config.js');
                confidence = 0.9;
                testCommand = 'vitest';
            }

            // Check for SvelteKit
            if (pkg.dependencies?.['@sveltejs/kit'] || pkg.devDependencies?.['@sveltejs/kit']) {
                indicators.push('@sveltejs/kit');
                confidence = 0.95;
                testCommand = 'npm run test';
            }

            return {
                name: 'Svelte',
                type: hasSvelte ? 'spa' : 'library',
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

export class SolidJSDetector implements FrameworkDetector {
    readonly name = 'SolidJS';
    readonly priority = 8;

    async detect(root: string): Promise<FrameworkInfo | null> {
        const packageJsonPath = path.join(root, 'package.json');
        
        if (!fs.existsSync(packageJsonPath)) return null;

        try {
            const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
            const hasSolid = pkg.dependencies?.['solid-js'] || pkg.devDependencies?.['solid-js'];
            
            if (!hasSolid) return null;

            const indicators = ['solid-js dependency'];
            let confidence = 0.8;
            let testCommand = 'vitest';

            // Check for Solid Start
            if (pkg.dependencies?.['@solidjs/start'] || pkg.devDependencies?.['@solidjs/start']) {
                indicators.push('@solidjs/start');
                confidence = 0.9;
            }

            return {
                name: 'SolidJS',
                type: 'spa',
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

export class AstroDetector implements FrameworkDetector {
    readonly name = 'Astro';
    readonly priority = 8;

    async detect(root: string): Promise<FrameworkInfo | null> {
        const packageJsonPath = path.join(root, 'package.json');
        const astroConfig = path.join(root, 'astro.config.mjs');
        
        if (!fs.existsSync(packageJsonPath)) return null;

        try {
            const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
            const hasAstro = pkg.dependencies?.['astro'] || pkg.devDependencies?.['astro'];
            
            if (!hasAstro) return null;

            const indicators = ['astro dependency'];
            let confidence = 0.8;

            if (fs.existsSync(astroConfig)) {
                indicators.push('astro.config.mjs');
                confidence = 0.95;
            }

            return {
                name: 'Astro',
                type: 'static',
                testCommand: 'vitest',
                buildCommand: 'astro build',
                devCommand: 'astro dev',
                confidence,
                indicators
            };
        } catch {
            return null;
        }
    }
}

export class RemixDetector implements FrameworkDetector {
    readonly name = 'Remix';
    readonly priority = 8;

    async detect(root: string): Promise<FrameworkInfo | null> {
        const packageJsonPath = path.join(root, 'package.json');
        const remixConfig = path.join(root, 'remix.config.js');
        
        if (!fs.existsSync(packageJsonPath)) return null;

        try {
            const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
            const hasRemix = pkg.dependencies?.['@remix-run/react'] || 
                           pkg.devDependencies?.['@remix-run/react'] ||
                           pkg.dependencies?.['@remix-run/node'] ||
                           pkg.devDependencies?.['@remix-run/node'];
            
            if (!hasRemix) return null;

            const indicators = ['@remix-run dependency'];
            let confidence = 0.85;

            if (fs.existsSync(remixConfig)) {
                indicators.push('remix.config.js');
                confidence = 0.95;
            }

            return {
                name: 'Remix',
                type: 'ssr',
                testCommand: 'vitest',
                buildCommand: 'remix build',
                devCommand: 'remix dev',
                confidence,
                indicators
            };
        } catch {
            return null;
        }
    }
}

/**
 * Test Framework Detection System
 */
export class TestFrameworkDetector {
    private static readonly TEST_FRAMEWORKS = [
        {
            name: 'Vitest',
            patterns: ['vitest.config.*', 'vite.config.*'],
            dependencies: ['vitest'],
            commands: {
                test: 'vitest run',
                watch: 'vitest',
                coverage: 'vitest run --coverage',
                debug: 'vitest --inspect-brk'
            }
        },
        {
            name: 'Jest',
            patterns: ['jest.config.*', 'jest.json'],
            dependencies: ['jest', '@jest/core'],
            commands: {
                test: 'jest',
                watch: 'jest --watch',
                coverage: 'jest --coverage',
                debug: 'node --inspect-brk node_modules/.bin/jest'
            }
        },
        {
            name: 'Playwright',
            patterns: ['playwright.config.*'],
            dependencies: ['@playwright/test', 'playwright'],
            commands: {
                test: 'playwright test',
                watch: 'playwright test --watch',
                coverage: 'playwright test --coverage',
                debug: 'playwright test --debug'
            }
        },
        {
            name: 'Cypress',
            patterns: ['cypress.config.*', 'cypress.json'],
            dependencies: ['cypress'],
            commands: {
                test: 'cypress run',
                watch: 'cypress open',
                coverage: 'cypress run --coverage',
                debug: 'cypress open --config video=false'
            }
        },
        {
            name: 'Mocha',
            patterns: ['.mocharc.*', 'mocha.opts'],
            dependencies: ['mocha'],
            commands: {
                test: 'mocha',
                watch: 'mocha --watch',
                coverage: 'nyc mocha',
                debug: 'mocha --inspect-brk'
            }
        }
    ];

    static async detectTestFrameworks(workspaceRoot: string): Promise<TestFrameworkInfo[]> {
        const detected: TestFrameworkInfo[] = [];
        const packageJsonPath = path.join(workspaceRoot, 'package.json');
        
        if (!fs.existsSync(packageJsonPath)) return detected;

        try {
            const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
            const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };

            for (const framework of this.TEST_FRAMEWORKS) {
                let confidence = 0;
                const configFiles: string[] = [];

                // Check for dependencies
                const hasDependency = framework.dependencies.some(dep => allDeps[dep]);
                if (hasDependency) confidence += 0.5;

                // Check for config files
                for (const pattern of framework.patterns) {
                    const configPath = path.join(workspaceRoot, pattern.replace('*', 'js'));
                    if (fs.existsSync(configPath) || 
                        fs.existsSync(configPath.replace('.js', '.ts')) ||
                        fs.existsSync(configPath.replace('.js', '.json'))) {
                        confidence += 0.3;
                        configFiles.push(pattern);
                    }
                }

                // Check package.json scripts
                if (pkg.scripts) {
                    const testScript = pkg.scripts.test || '';
                    if (testScript.includes(framework.name.toLowerCase())) {
                        confidence += 0.2;
                    }
                }

                if (confidence > 0.4) {
                    detected.push({
                        name: framework.name,
                        testCommand: framework.commands.test,
                        watchCommand: framework.commands.watch,
                        coverageCommand: framework.commands.coverage,
                        debugCommand: framework.commands.debug,
                        configFiles,
                        confidence: Math.min(confidence, 1.0)
                    });
                }
            }

            // Sort by confidence
            return detected.sort((a, b) => b.confidence - a.confidence);
        } catch {
            return detected;
        }
    }
}

/**
 * Monorepo Detection System
 */
export class MonorepoDetector {
    static async detectMonorepoType(workspaceRoot: string): Promise<{
        type: 'nx' | 'lerna' | 'rush' | 'pnpm' | 'yarn' | 'npm' | null;
        confidence: number;
        workspaceFiles: string[];
    }> {
        const indicators = {
            nx: ['nx.json', 'workspace.json', 'angular.json'],
            lerna: ['lerna.json'],
            rush: ['rush.json'],
            pnpm: ['pnpm-workspace.yaml', 'pnpm-lock.yaml'],
            yarn: ['yarn.lock', '.yarnrc*'],
            npm: ['package-lock.json']
        };

        let bestMatch: { type: any; confidence: number; workspaceFiles: string[] } = {
            type: null,
            confidence: 0,
            workspaceFiles: []
        };

        for (const [type, files] of Object.entries(indicators)) {
            const foundFiles: string[] = [];
            let confidence = 0;

            for (const file of files) {
                const filePath = path.join(workspaceRoot, file);
                if (fs.existsSync(filePath) || 
                    (file.includes('*') && this.globExists(workspaceRoot, file))) {
                    foundFiles.push(file);
                    confidence += 0.3;
                }
            }

            // Check package.json for workspace configuration
            const packageJsonPath = path.join(workspaceRoot, 'package.json');
            if (fs.existsSync(packageJsonPath)) {
                try {
                    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
                    if (pkg.workspaces) {
                        confidence += 0.4;
                        foundFiles.push('package.json workspaces');
                    }
                } catch {
                    // Ignore parse errors
                }
            }

            if (confidence > bestMatch.confidence) {
                bestMatch = {
                    type: type as any,
                    confidence,
                    workspaceFiles: foundFiles
                };
            }
        }

        return bestMatch;
    }

    private static globExists(root: string, pattern: string): boolean {
        try {
            const files = fs.readdirSync(root);
            const regex = new RegExp(pattern.replace('*', '.*'));
            return files.some(file => regex.test(file));
        } catch {
            return false;
        }
    }
}