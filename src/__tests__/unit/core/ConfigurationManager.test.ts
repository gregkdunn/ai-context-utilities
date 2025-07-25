/**
 * Comprehensive tests for ConfigurationManager with SmartFrameworkDetector
 * Part of Phase 1.9.1 test infrastructure
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ConfigurationManager } from '../../../core/ConfigurationManager';

describe('ConfigurationManager', () => {
    let tempDir: string;
    let configManager: ConfigurationManager;

    beforeEach(() => {
        // Create temporary directory for each test
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-debug-test-'));
    });

    afterEach(() => {
        // Clean up temporary directory
        if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
    });

    describe('Configuration Loading', () => {
        test('should load default Nx configuration when no config file exists', () => {
            // Create minimal Nx workspace
            fs.writeFileSync(path.join(tempDir, 'nx.json'), '{}');
            fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify({
                devDependencies: { '@nx/workspace': '^17.0.0' }
            }));

            configManager = new ConfigurationManager(tempDir);
            
            expect(configManager.get('framework')).toBe('nx');
            expect(configManager.getTestCommand('default')).toContain('npx nx test');
        });

        test('should load and parse YAML configuration file', () => {
            const yamlConfig = `
framework: vitest
testCommands:
  default: vitest run {project}
  watch: vitest --watch {project}
performance:
  cache: false
  cacheTimeout: 60
`;
            fs.writeFileSync(path.join(tempDir, '.aiDebugContext.yml'), yamlConfig);
            
            configManager = new ConfigurationManager(tempDir);
            
            expect(configManager.get('framework')).toBe('vitest');
            expect(configManager.getTestCommand('default', 'my-project')).toBe('vitest run my-project --verbose');
            expect(configManager.get('performance')?.cache).toBe(false);
            expect(configManager.get('performance')?.cacheTimeout).toBe(60);
        });

        test('should merge YAML config with defaults', () => {
            const yamlConfig = `
testCommands:
  default: custom test command
`;
            fs.writeFileSync(path.join(tempDir, '.aiDebugContext.yml'), yamlConfig);
            
            configManager = new ConfigurationManager(tempDir);
            
            // Should use custom default but keep other defaults
            expect(configManager.getTestCommand('default')).toBe('custom test command --verbose');
            expect(configManager.getTestCommand('affected')).toContain('npx nx affected:test');
            expect(configManager.get('performance')?.cache).toBe(true); // Default value
        });

        test('should handle corrupted YAML gracefully', () => {
            const invalidYaml = `
framework: nx
testCommands:
  - invalid yaml structure
`;
            fs.writeFileSync(path.join(tempDir, '.aiDebugContext.yml'), invalidYaml);
            
            // Should not throw, should fall back to defaults
            expect(() => {
                configManager = new ConfigurationManager(tempDir);
            }).not.toThrow();
            
            expect(configManager.get('framework')).toBe('nx');
        });
    });

    describe('Framework Auto-Detection', () => {
        test('should detect Angular CLI project', async () => {
            // Create Angular CLI project structure
            fs.writeFileSync(path.join(tempDir, 'angular.json'), JSON.stringify({
                projects: { 'my-app': {} }
            }));
            fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify({
                dependencies: { '@angular/core': '^17.0.0' },
                devDependencies: { '@angular/cli': '^17.0.0' }
            }));

            configManager = new ConfigurationManager(tempDir);
            await configManager.refreshFrameworkDetection();
            
            const frameworks = configManager.getDetectedFrameworks();
            expect(frameworks.length).toBeGreaterThan(0);
            expect(frameworks[0].name).toBe('Angular');
            
            const command = await configManager.getSmartTestCommand('my-app');
            expect(command).toContain('ng test');
        });

        test('should detect Create React App project', async () => {
            fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify({
                dependencies: { 'react-scripts': '^5.0.0' }
            }));
            fs.mkdirSync(path.join(tempDir, 'public'));
            fs.writeFileSync(path.join(tempDir, 'public', 'index.html'), '<div id="root"></div>');

            configManager = new ConfigurationManager(tempDir);
            await configManager.refreshFrameworkDetection();
            
            const primary = configManager.getPrimaryFramework();
            expect(primary?.name).toBe('Create React App');
            
            const command = await configManager.getSmartTestCommand();
            expect(command).toBe('npm test');
        });

        test('should detect Vite project with Vitest', async () => {
            fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify({
                devDependencies: { 
                    'vite': '^5.0.0',
                    'vitest': '^1.0.0'
                }
            }));
            fs.writeFileSync(path.join(tempDir, 'vite.config.ts'), 'export default {}');

            configManager = new ConfigurationManager(tempDir);
            await configManager.refreshFrameworkDetection();
            
            const primary = configManager.getPrimaryFramework();
            expect(primary?.name).toBe('Vite');
            expect(primary?.testCommand).toBe('vitest run');
        });

        test('should detect Vue CLI project', async () => {
            fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify({
                dependencies: { 'vue': '^3.0.0' },
                devDependencies: { '@vue/cli-service': '^5.0.0' }
            }));
            fs.writeFileSync(path.join(tempDir, 'vue.config.js'), 'module.exports = {}');

            configManager = new ConfigurationManager(tempDir);
            await configManager.refreshFrameworkDetection();
            
            const primary = configManager.getPrimaryFramework();
            expect(primary?.name).toBe('Vue');
            expect(primary?.testCommand).toBe('npm run test:unit');
        });

        test('should detect Next.js project', async () => {
            fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify({
                dependencies: { 'next': '^14.0.0' }
            }));
            fs.writeFileSync(path.join(tempDir, 'next.config.js'), 'module.exports = {}');

            configManager = new ConfigurationManager(tempDir);
            await configManager.refreshFrameworkDetection();
            
            const primary = configManager.getPrimaryFramework();
            expect(primary?.name).toBe('Next.js');
            expect(primary?.type).toBe('ssr');
        });

        test('should prioritize Nx over other frameworks', async () => {
            // Create a project that could be detected as both Nx and Angular
            fs.writeFileSync(path.join(tempDir, 'nx.json'), '{}');
            fs.writeFileSync(path.join(tempDir, 'angular.json'), '{}');
            fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify({
                dependencies: { '@angular/core': '^17.0.0' },
                devDependencies: { 
                    '@nx/workspace': '^17.0.0',
                    '@angular/cli': '^17.0.0'
                }
            }));

            configManager = new ConfigurationManager(tempDir);
            await configManager.refreshFrameworkDetection();
            
            const primary = configManager.getPrimaryFramework();
            expect(primary?.name).toBe('Nx'); // Should prioritize Nx
        });
    });

    describe('Test Command Generation', () => {
        beforeEach(() => {
            configManager = new ConfigurationManager(tempDir);
        });

        test('should replace project placeholder in commands', () => {
            const command = configManager.getTestCommand('default', 'my-project');
            expect(command).toBe('npx nx test my-project --verbose');
        });

        test('should handle commands without project placeholder', () => {
            const command = configManager.getTestCommand('affected');
            expect(command).toBe('npx nx affected:test --verbose');
        });

        test('should add verbose flag when configured', () => {
            // Verbose is enabled by default in our config
            const command = configManager.getTestCommand('default', 'my-project');
            expect(command).toContain('--verbose');
        });

        test('should return fallback for unknown command modes', () => {
            const command = configManager.getTestCommand('unknown' as any, 'my-project');
            expect(command).toBe('npx nx test my-project --verbose');
        });
    });

    describe('Configuration File Creation', () => {
        test('should create example configuration file', async () => {
            configManager = new ConfigurationManager(tempDir);
            await configManager.createExampleConfig();
            
            const configPath = path.join(tempDir, '.aiDebugContext.yml');
            expect(fs.existsSync(configPath)).toBe(true);
            
            const content = fs.readFileSync(configPath, 'utf8');
            expect(content).toContain('framework: nx');
            expect(content).toContain('testCommands:');
            expect(content).toContain('performance:');
        });

        test('should save current configuration to file', async () => {
            configManager = new ConfigurationManager(tempDir);
            
            // Modify configuration
            configManager.set('performance', { 
                parallel: false, 
                cache: false, 
                cacheTimeout: 15 
            });
            
            await configManager.saveConfiguration();
            
            const configPath = path.join(tempDir, '.aiDebugContext.yml');
            expect(fs.existsSync(configPath)).toBe(true);
            
            const content = fs.readFileSync(configPath, 'utf8');
            expect(content).toContain('parallel: false');
            expect(content).toContain('cache: false');
            expect(content).toContain('cacheTimeout: 15');
        });
    });

    describe('Framework Detection Summary', () => {
        test('should generate comprehensive detection summary', async () => {
            // Create Vite project for testing
            fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify({
                devDependencies: { 
                    'vite': '^5.0.0',
                    'vitest': '^1.0.0' 
                }
            }));
            fs.writeFileSync(path.join(tempDir, 'vite.config.ts'), 'export default {}');

            configManager = new ConfigurationManager(tempDir);
            const summary = await configManager.getFrameworkDetectionSummary();
            
            expect(summary).toContain('Primary: Vite');
            expect(summary).toContain('Test Command:');
            expect(summary).toContain('Indicators:');
            expect(summary).toContain('%');
        });

        test('should handle no frameworks detected', async () => {
            // Empty directory with no recognizable project structure
            configManager = new ConfigurationManager(tempDir);
            const summary = await configManager.getFrameworkDetectionSummary();
            
            expect(summary).toContain('No frameworks detected');
            expect(summary).toContain('npm test');
        });
    });

    describe('Configuration Validation', () => {
        test('should handle invalid framework values', () => {
            const yamlConfig = `
framework: invalid-framework
`;
            fs.writeFileSync(path.join(tempDir, '.aiDebugContext.yml'), yamlConfig);
            
            configManager = new ConfigurationManager(tempDir);
            
            // Should use the invalid value (our implementation doesn't validate enums)
            expect(configManager.get('framework')).toBe('invalid-framework');
        });

        test('should handle missing required properties', () => {
            const yamlConfig = `
performance:
  cache: true
  parallel: false
  # some other properties missing
`;
            fs.writeFileSync(path.join(tempDir, '.aiDebugContext.yml'), yamlConfig);
            
            configManager = new ConfigurationManager(tempDir);
            
            const performance = configManager.get('performance');
            expect(performance?.cache).toBe(true);
            expect(performance?.parallel).toBe(false); // As set in YAML
            expect(performance?.cacheTimeout).toBeGreaterThan(0); // Should have some timeout value
        });
    });

    describe('Utility Methods', () => {
        beforeEach(() => {
            configManager = new ConfigurationManager(tempDir);
        });

        test('should correctly identify Nx framework', () => {
            expect(configManager.isNx()).toBe(true);
        });

        test('should get framework display name', () => {
            expect(configManager.getFrameworkName()).toBe('Nx Workspace');
        });

        test('should handle custom framework names', () => {
            configManager.set('framework', 'custom');
            expect(configManager.getFrameworkName()).toBe('Custom');
        });
    });

    describe('Error Handling', () => {
        test('should handle file system permission errors gracefully', () => {
            // This is tricky to test cross-platform, but we ensure no exceptions
            expect(() => {
                configManager = new ConfigurationManager('/root/non-accessible-path');
            }).not.toThrow();
        });

        test('should handle concurrent access to config file', async () => {
            configManager = new ConfigurationManager(tempDir);
            
            // Simulate concurrent saves
            const promises = Array(5).fill(0).map(async () => {
                await configManager.saveConfiguration();
            });
            
            await expect(Promise.all(promises)).resolves.toBeDefined();
        });
    });
});