/**
 * Workspace Analyzer
 * Analyzes package.json files to detect TypeScript, frontend frameworks, and test frameworks
 */

import * as fs from 'fs';
import * as path from 'path';

export interface WorkspaceAnalysis {
    typescript: {
        version: string | null;
        hasConfig: boolean;
    };
    frontendFrameworks: string[];
    testFrameworks: string[];
    buildTools: string[];
    packageManager: 'npm' | 'yarn' | 'pnpm' | 'unknown';
}

export class WorkspaceAnalyzer {
    private workspaceRoot: string;
    private packageJson: any = null;

    constructor(workspaceRoot: string) {
        this.workspaceRoot = workspaceRoot;
        this.loadPackageJson();
    }

    /**
     * Analyze the workspace and return comprehensive information
     */
    async analyze(): Promise<WorkspaceAnalysis> {
        return {
            typescript: this.analyzeTypeScript(),
            frontendFrameworks: this.analyzeFrontendFrameworks(),
            testFrameworks: this.analyzeTestFrameworks(),
            buildTools: this.analyzeBuildTools(),
            packageManager: this.detectPackageManager()
        };
    }

    /**
     * Load and parse package.json
     */
    private loadPackageJson(): void {
        try {
            const packageJsonPath = path.join(this.workspaceRoot, 'package.json');
            if (fs.existsSync(packageJsonPath)) {
                const content = fs.readFileSync(packageJsonPath, 'utf8');
                this.packageJson = JSON.parse(content);
            }
        } catch (error) {
            // Ignore parsing errors
        }
    }

    /**
     * Analyze TypeScript usage and version
     */
    private analyzeTypeScript(): { version: string | null; hasConfig: boolean } {
        // Check for TypeScript config files first
        const configFiles = ['tsconfig.json', 'tsconfig.base.json', 'tsconfig.build.json'];
        const hasConfig = configFiles.some(file => 
            fs.existsSync(path.join(this.workspaceRoot, file))
        );

        // Get version from package.json if available
        let version: string | null = null;
        if (this.packageJson) {
            const deps = { ...this.packageJson.dependencies, ...this.packageJson.devDependencies };
            version = deps['typescript'] || deps['@types/node'] ? this.extractVersion(deps['typescript']) : null;
        }

        return { version, hasConfig };
    }

    /**
     * Detect frontend frameworks
     */
    private analyzeFrontendFrameworks(): string[] {
        if (!this.packageJson) return [];

        const deps = { ...this.packageJson.dependencies, ...this.packageJson.devDependencies };
        const frameworks: string[] = [];

        // Frontend framework detection patterns
        const frontendPatterns = [
            { name: 'React', patterns: ['react', '@types/react'] },
            { name: 'Angular', patterns: ['@angular/core', '@angular/cli'] },
            { name: 'Vue', patterns: ['vue', '@vue/cli'] },
            { name: 'Svelte', patterns: ['svelte', '@sveltejs/kit'] },
            { name: 'Next.js', patterns: ['next'] },
            { name: 'Nuxt', patterns: ['nuxt', '@nuxt/core'] },
            { name: 'Gatsby', patterns: ['gatsby'] },
            { name: 'Astro', patterns: ['astro'] },
            { name: 'Solid', patterns: ['solid-js'] },
            { name: 'Preact', patterns: ['preact'] },
            { name: 'Lit', patterns: ['lit', 'lit-element'] },
            { name: 'Stencil', patterns: ['@stencil/core'] }
        ];

        for (const framework of frontendPatterns) {
            if (framework.patterns.some(pattern => deps[pattern])) {
                const version = this.findFrameworkVersion(deps, framework.patterns);
                frameworks.push(version ? `${framework.name} ${version}` : framework.name);
            }
        }

        return frameworks;
    }

    /**
     * Detect test frameworks
     */
    private analyzeTestFrameworks(): string[] {
        if (!this.packageJson) return [];

        const deps = { ...this.packageJson.dependencies, ...this.packageJson.devDependencies };
        const frameworks: string[] = [];

        // Test framework detection patterns
        const testPatterns = [
            { name: 'Jest', patterns: ['jest', '@types/jest'] },
            { name: 'Vitest', patterns: ['vitest'] },
            { name: 'Mocha', patterns: ['mocha', '@types/mocha'] },
            { name: 'Jasmine', patterns: ['jasmine', '@types/jasmine'] },
            { name: 'Cypress', patterns: ['cypress'] },
            { name: 'Playwright', patterns: ['@playwright/test', 'playwright'] },
            { name: 'Testing Library', patterns: ['@testing-library/react', '@testing-library/vue', '@testing-library/angular'] },
            { name: 'Karma', patterns: ['karma'] },
            { name: 'Protractor', patterns: ['protractor'] },
            { name: 'WebdriverIO', patterns: ['webdriverio', '@wdio/cli'] }
        ];

        for (const framework of testPatterns) {
            if (framework.patterns.some(pattern => deps[pattern])) {
                const version = this.findFrameworkVersion(deps, framework.patterns);
                frameworks.push(version ? `${framework.name} ${version}` : framework.name);
            }
        }

        return frameworks;
    }

    /**
     * Detect build tools
     */
    private analyzeBuildTools(): string[] {
        if (!this.packageJson) return [];

        const deps = { ...this.packageJson.dependencies, ...this.packageJson.devDependencies };
        const tools: string[] = [];

        const buildToolPatterns = [
            { name: 'Webpack', patterns: ['webpack'] },
            { name: 'Vite', patterns: ['vite'] },
            { name: 'Rollup', patterns: ['rollup'] },
            { name: 'Parcel', patterns: ['parcel'] },
            { name: 'esbuild', patterns: ['esbuild'] },
            { name: 'Turbo', patterns: ['turbo'] },
            { name: 'Nx', patterns: ['@nx/workspace', '@nrwl/workspace'] },
            { name: 'Lerna', patterns: ['lerna'] },
            { name: 'Rush', patterns: ['@microsoft/rush'] }
        ];

        for (const tool of buildToolPatterns) {
            if (tool.patterns.some(pattern => deps[pattern])) {
                const version = this.findFrameworkVersion(deps, tool.patterns);
                tools.push(version ? `${tool.name} ${version}` : tool.name);
            }
        }

        return tools;
    }

    /**
     * Detect package manager
     */
    private detectPackageManager(): 'npm' | 'yarn' | 'pnpm' | 'unknown' {
        const lockFiles = [
            { file: 'yarn.lock', manager: 'yarn' as const },
            { file: 'pnpm-lock.yaml', manager: 'pnpm' as const },
            { file: 'package-lock.json', manager: 'npm' as const }
        ];

        for (const { file, manager } of lockFiles) {
            if (fs.existsSync(path.join(this.workspaceRoot, file))) {
                return manager;
            }
        }

        return 'unknown';
    }

    /**
     * Find version for a framework from its patterns
     */
    private findFrameworkVersion(deps: any, patterns: string[]): string | null {
        for (const pattern of patterns) {
            if (deps[pattern]) {
                return this.extractVersion(deps[pattern]);
            }
        }
        return null;
    }

    /**
     * Extract clean version number from dependency version string
     */
    private extractVersion(versionString: string): string | null {
        if (!versionString) return null;
        
        // Remove common prefixes like ^, ~, >=, etc.
        const cleanVersion = versionString.replace(/^[\^~>=<]+/, '');
        
        // Extract major.minor version (e.g., "17.0.0" -> "17.0")
        const match = cleanVersion.match(/^(\d+\.\d+)/);
        return match ? match[1] : cleanVersion;
    }

    /**
     * Get formatted analysis summary
     */
    async getFormattedSummary(): Promise<string[]> {
        const analysis = await this.analyze();
        const summary: string[] = [];

        // TypeScript
        if (analysis.typescript.version) {
            summary.push(`TypeScript: ${analysis.typescript.version}${analysis.typescript.hasConfig ? ' (configured)' : ''}`);
        } else if (analysis.typescript.hasConfig) {
            summary.push('TypeScript: Configured');
        }

        // Frontend frameworks
        if (analysis.frontendFrameworks.length > 0) {
            summary.push(`Frontend: ${analysis.frontendFrameworks.join(', ')}`);
        }

        // Test frameworks
        if (analysis.testFrameworks.length > 0) {
            summary.push(`Testing: ${analysis.testFrameworks.join(', ')}`);
        }

        // Build tools (only show if different from frontend frameworks)
        const relevantBuildTools = analysis.buildTools.filter(tool => 
            !tool.includes('Nx') || analysis.frontendFrameworks.length === 0
        );
        if (relevantBuildTools.length > 0) {
            summary.push(`Build: ${relevantBuildTools.join(', ')}`);
        }

        // Package manager
        if (analysis.packageManager !== 'unknown') {
            summary.push(`Package manager: ${analysis.packageManager}`);
        }

        return summary;
    }
}