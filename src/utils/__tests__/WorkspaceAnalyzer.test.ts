/**
 * Tests for WorkspaceAnalyzer
 */

import { WorkspaceAnalyzer } from '../WorkspaceAnalyzer';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('WorkspaceAnalyzer', () => {
    let tempDir: string;
    let analyzer: WorkspaceAnalyzer;

    beforeEach(() => {
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'workspace-test-'));
        analyzer = new WorkspaceAnalyzer(tempDir);
    });

    afterEach(() => {
        if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
    });

    describe('TypeScript Detection', () => {
        test('should detect TypeScript version from package.json', async () => {
            const packageJson = {
                devDependencies: {
                    'typescript': '^5.0.0'
                }
            };
            fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify(packageJson));
            fs.writeFileSync(path.join(tempDir, 'tsconfig.json'), '{}');

            analyzer = new WorkspaceAnalyzer(tempDir);
            const analysis = await analyzer.analyze();

            expect(analysis.typescript.version).toBe('5.0');
            expect(analysis.typescript.hasConfig).toBe(true);
        });

        test('should detect TypeScript config without version', async () => {
            fs.writeFileSync(path.join(tempDir, 'tsconfig.json'), '{}');

            analyzer = new WorkspaceAnalyzer(tempDir);
            const analysis = await analyzer.analyze();

            expect(analysis.typescript.version).toBeNull();
            expect(analysis.typescript.hasConfig).toBe(true);
        });
    });

    describe('Frontend Framework Detection', () => {
        test('should detect React', async () => {
            const packageJson = {
                dependencies: {
                    'react': '^18.2.0',
                    '@types/react': '^18.0.0'
                }
            };
            fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify(packageJson));

            analyzer = new WorkspaceAnalyzer(tempDir);
            const analysis = await analyzer.analyze();

            expect(analysis.frontendFrameworks).toContain('React 18.2');
        });

        test('should detect Angular', async () => {
            const packageJson = {
                dependencies: {
                    '@angular/core': '^17.0.0'
                },
                devDependencies: {
                    '@angular/cli': '^17.0.0'
                }
            };
            fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify(packageJson));

            analyzer = new WorkspaceAnalyzer(tempDir);
            const analysis = await analyzer.analyze();

            expect(analysis.frontendFrameworks).toContain('Angular 17.0');
        });

        test('should detect Vue', async () => {
            const packageJson = {
                dependencies: {
                    'vue': '^3.3.0'
                }
            };
            fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify(packageJson));

            analyzer = new WorkspaceAnalyzer(tempDir);
            const analysis = await analyzer.analyze();

            expect(analysis.frontendFrameworks).toContain('Vue 3.3');
        });
    });

    describe('Test Framework Detection', () => {
        test('should detect Jest', async () => {
            const packageJson = {
                devDependencies: {
                    'jest': '^29.0.0',
                    '@types/jest': '^29.0.0'
                }
            };
            fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify(packageJson));

            analyzer = new WorkspaceAnalyzer(tempDir);
            const analysis = await analyzer.analyze();

            expect(analysis.testFrameworks).toContain('Jest 29.0');
        });

        test('should detect Vitest', async () => {
            const packageJson = {
                devDependencies: {
                    'vitest': '^1.0.0'
                }
            };
            fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify(packageJson));

            analyzer = new WorkspaceAnalyzer(tempDir);
            const analysis = await analyzer.analyze();

            expect(analysis.testFrameworks).toContain('Vitest 1.0');
        });

        test('should detect Cypress', async () => {
            const packageJson = {
                devDependencies: {
                    'cypress': '^13.0.0'
                }
            };
            fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify(packageJson));

            analyzer = new WorkspaceAnalyzer(tempDir);
            const analysis = await analyzer.analyze();

            expect(analysis.testFrameworks).toContain('Cypress 13.0');
        });
    });

    describe('Package Manager Detection', () => {
        test('should detect yarn from yarn.lock', async () => {
            fs.writeFileSync(path.join(tempDir, 'yarn.lock'), '');

            analyzer = new WorkspaceAnalyzer(tempDir);
            const analysis = await analyzer.analyze();

            expect(analysis.packageManager).toBe('yarn');
        });

        test('should detect npm from package-lock.json', async () => {
            fs.writeFileSync(path.join(tempDir, 'package-lock.json'), '{}');

            analyzer = new WorkspaceAnalyzer(tempDir);
            const analysis = await analyzer.analyze();

            expect(analysis.packageManager).toBe('npm');
        });

        test('should detect pnpm from pnpm-lock.yaml', async () => {
            fs.writeFileSync(path.join(tempDir, 'pnpm-lock.yaml'), '');

            analyzer = new WorkspaceAnalyzer(tempDir);
            const analysis = await analyzer.analyze();

            expect(analysis.packageManager).toBe('pnpm');
        });
    });

    describe('Build Tools Detection', () => {
        test('should detect Nx workspace', async () => {
            const packageJson = {
                devDependencies: {
                    '@nx/workspace': '^17.0.0'
                }
            };
            fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify(packageJson));

            analyzer = new WorkspaceAnalyzer(tempDir);
            const analysis = await analyzer.analyze();

            expect(analysis.buildTools).toContain('Nx 17.0');
        });

        test('should detect Vite', async () => {
            const packageJson = {
                devDependencies: {
                    'vite': '^5.0.0'
                }
            };
            fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify(packageJson));

            analyzer = new WorkspaceAnalyzer(tempDir);
            const analysis = await analyzer.analyze();

            expect(analysis.buildTools).toContain('Vite 5.0');
        });
    });

    describe('Formatted Summary', () => {
        test('should generate comprehensive summary', async () => {
            const packageJson = {
                dependencies: {
                    'react': '^18.2.0'
                },
                devDependencies: {
                    'typescript': '^5.0.0',
                    'jest': '^29.0.0',
                    'vite': '^5.0.0'
                }
            };
            fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify(packageJson));
            fs.writeFileSync(path.join(tempDir, 'tsconfig.json'), '{}');
            fs.writeFileSync(path.join(tempDir, 'yarn.lock'), '');

            analyzer = new WorkspaceAnalyzer(tempDir);
            const summary = await analyzer.getFormattedSummary();

            expect(summary).toContain('TypeScript: 5.0 (configured)');
            expect(summary).toContain('Frontend: React 18.2');
            expect(summary).toContain('Testing: Jest 29.0');
            expect(summary).toContain('Build: Vite 5.0');
            expect(summary).toContain('Package manager: yarn');
        });

        test('should handle empty workspace gracefully', async () => {
            analyzer = new WorkspaceAnalyzer(tempDir);
            const summary = await analyzer.getFormattedSummary();

            expect(Array.isArray(summary)).toBe(true);
            expect(summary.length).toBeGreaterThanOrEqual(0);
        });
    });
});