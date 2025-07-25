/**
 * Comprehensive tests for SmartFrameworkDetector
 * Part of Phase 1.9.1 test infrastructure
 */

import * as path from 'path';
import { 
    SmartFrameworkDetector,
    NxWorkspaceDetector,
    AngularCLIDetector,
    CreateReactAppDetector,
    ViteDetector,
    VueCLIDetector,
    NextJsDetector,
    JestOnlyDetector,
    FrameworkInfo
} from '../../../utils/SmartFrameworkDetector';

describe('SmartFrameworkDetector', () => {
    const getFixturePath = (project: string) => 
        path.join(__dirname, '../../../../tests/fixtures/sample-projects', project);

    describe('NxWorkspaceDetector', () => {
        const detector = new NxWorkspaceDetector();

        test('should detect Nx workspace with high confidence', async () => {
            const result = await detector.detect(getFixturePath('nx-monorepo'));
            
            expect(result).not.toBeNull();
            expect(result!.name).toBe('Nx');
            expect(result!.type).toBe('monorepo');
            expect(result!.confidence).toBeGreaterThan(0.9);
            expect(result!.testCommand).toBe('npx nx test {project}');
            expect(result!.indicators).toContain('nx.json');
        });

        test('should return null for non-Nx projects', async () => {
            const result = await detector.detect(getFixturePath('angular-cli'));
            expect(result).toBeNull();
        });
    });

    describe('AngularCLIDetector', () => {
        const detector = new AngularCLIDetector();

        test('should detect Angular CLI project', async () => {
            const result = await detector.detect(getFixturePath('angular-cli'));
            
            expect(result).not.toBeNull();
            expect(result!.name).toBe('Angular');
            expect(result!.type).toBe('spa');
            expect(result!.confidence).toBeGreaterThan(0.9);
            expect(result!.testCommand).toBe('ng test my-angular-app');
            expect(result!.indicators).toContain('angular.json');
            expect(result!.indicators).toContain('@angular/core dependency');
        });

        test('should return null for non-Angular projects', async () => {
            const result = await detector.detect(getFixturePath('create-react-app'));
            expect(result).toBeNull();
        });
    });

    describe('CreateReactAppDetector', () => {
        const detector = new CreateReactAppDetector();

        test('should detect Create React App project', async () => {
            const result = await detector.detect(getFixturePath('create-react-app'));
            
            expect(result).not.toBeNull();
            expect(result!.name).toBe('Create React App');
            expect(result!.type).toBe('spa');
            expect(result!.confidence).toBeGreaterThan(0.9);
            expect(result!.testCommand).toBe('npm test');
            expect(result!.indicators).toContain('react-scripts dependency');
            expect(result!.indicators).toContain('public/index.html');
        });

        test('should return null for non-CRA projects', async () => {
            const result = await detector.detect(getFixturePath('vue-cli'));
            expect(result).toBeNull();
        });
    });

    describe('ViteDetector', () => {
        const detector = new ViteDetector();

        test('should detect Vite project with Vitest', async () => {
            const result = await detector.detect(getFixturePath('vite-react'));
            
            expect(result).not.toBeNull();
            expect(result!.name).toBe('Vite');
            expect(result!.type).toBe('spa');
            expect(result!.confidence).toBeGreaterThan(0.8);
            expect(result!.testCommand).toBe('vitest run');
            expect(result!.indicators).toContain('vite.config.ts');
            expect(result!.indicators).toContain('vitest for testing');
        });

        test('should return null for non-Vite projects', async () => {
            const result = await detector.detect(getFixturePath('angular-cli'));
            expect(result).toBeNull();
        });
    });

    describe('VueCLIDetector', () => {
        const detector = new VueCLIDetector();

        test('should detect Vue CLI project', async () => {
            const result = await detector.detect(getFixturePath('vue-cli'));
            
            expect(result).not.toBeNull();
            expect(result!.name).toBe('Vue');
            expect(result!.type).toBe('spa');
            expect(result!.confidence).toBeGreaterThan(0.8);
            expect(result!.testCommand).toBe('npm run test:unit');
            expect(result!.indicators).toContain('vue.config.js');
            expect(result!.indicators).toContain('vue dependency');
        });
    });

    describe('NextJsDetector', () => {
        const detector = new NextJsDetector();

        test('should detect Next.js project', async () => {
            const result = await detector.detect(getFixturePath('nextjs'));
            
            expect(result).not.toBeNull();
            expect(result!.name).toBe('Next.js');
            expect(result!.type).toBe('ssr');
            expect(result!.confidence).toBeGreaterThan(0.8);
            expect(result!.testCommand).toBe('npm test');
            expect(result!.indicators).toContain('next.config.js');
            expect(result!.indicators).toContain('next dependency');
        });
    });

    describe('SmartFrameworkDetector Integration', () => {
        const detector = new SmartFrameworkDetector();

        test('should detect Nx as primary framework', async () => {
            const frameworks = await detector.detectAll(getFixturePath('nx-monorepo'));
            
            expect(frameworks.length).toBeGreaterThan(0);
            expect(frameworks[0].name).toBe('Nx');
            expect(frameworks[0].confidence).toBeGreaterThan(0.9);
        });

        test('should detect Angular CLI correctly', async () => {
            const primary = await detector.detectPrimary(getFixturePath('angular-cli'));
            
            expect(primary).not.toBeNull();
            expect(primary!.name).toBe('Angular');
        });

        test('should return recommended test command', async () => {
            const command = await detector.getRecommendedTestCommand(
                getFixturePath('create-react-app')
            );
            
            expect(command).toBe('npm test');
        });

        test('should handle project parameter in test commands', async () => {
            const command = await detector.getRecommendedTestCommand(
                getFixturePath('nx-monorepo'),
                'my-app'
            );
            
            expect(command).toBe('npx nx test my-app');
        });

        test('should generate detection summary', async () => {
            const summary = await detector.generateDetectionSummary(
                getFixturePath('vite-react')
            );
            
            expect(summary).toContain('Primary: Vite');
            expect(summary).toContain('Test Command: vitest run');
            expect(summary).toContain('Indicators:');
        });

        test('should handle unknown projects gracefully', async () => {
            const summary = await detector.generateDetectionSummary('/non/existent/path');
            
            expect(summary).toContain('No frameworks detected');
            expect(summary).toContain('using generic npm test');
        });

        test('should sort frameworks by confidence', async () => {
            // Create a mock scenario where multiple frameworks might be detected
            const frameworks = await detector.detectAll(getFixturePath('vite-react'));
            
            // Should be sorted by confidence (highest first)
            for (let i = 1; i < frameworks.length; i++) {
                expect(frameworks[i-1].confidence).toBeGreaterThanOrEqual(frameworks[i].confidence);
            }
        });

        test('should filter out low-confidence detections', async () => {
            const frameworks = await detector.detectAll(getFixturePath('create-react-app'));
            
            // All returned frameworks should have confidence > 0.6
            frameworks.forEach(fw => {
                expect(fw.confidence).toBeGreaterThan(0.6);
            });
        });
    });

    describe('Error Handling', () => {
        const detector = new SmartFrameworkDetector();

        test('should handle corrupted package.json gracefully', async () => {
            // This test would need a fixture with invalid JSON
            const result = await detector.detectPrimary('/non/existent/path');
            expect(result).toBeNull();
        });

        test('should continue detection even if one detector fails', async () => {
            // Mock a detector that throws an error
            const originalDetectors = (detector as any).detectors;
            const failingDetector = {
                name: 'Failing Detector',
                priority: 100,
                detect: async () => { throw new Error('Test error'); }
            };
            
            (detector as any).detectors = [failingDetector, ...originalDetectors];
            
            // Should still work with other detectors
            const result = await detector.detectPrimary(getFixturePath('nx-monorepo'));
            expect(result).not.toBeNull();
            expect(result!.name).toBe('Nx');
            
            // Restore original detectors
            (detector as any).detectors = originalDetectors;
        });
    });

    describe('Priority System', () => {
        test('should respect detector priority order', () => {
            const detector = new SmartFrameworkDetector();
            const detectors = (detector as any).detectors;
            
            // Should be sorted by priority (highest first)
            for (let i = 1; i < detectors.length; i++) {
                expect(detectors[i-1].priority).toBeGreaterThanOrEqual(detectors[i].priority);
            }
        });

        test('Nx should have highest priority', () => {
            const nxDetector = new NxWorkspaceDetector();
            const angularDetector = new AngularCLIDetector();
            
            expect(nxDetector.priority).toBeGreaterThan(angularDetector.priority);
        });
    });

    describe('Framework Info Validation', () => {
        test('should return valid FrameworkInfo structure', async () => {
            const detector = new NxWorkspaceDetector();
            const result = await detector.detect(getFixturePath('nx-monorepo'));
            
            expect(result).toHaveProperty('name');
            expect(result).toHaveProperty('type');
            expect(result).toHaveProperty('testCommand');
            expect(result).toHaveProperty('confidence');
            expect(result).toHaveProperty('indicators');
            
            expect(typeof result!.name).toBe('string');
            expect(['spa', 'ssr', 'static', 'library', 'monorepo']).toContain(result!.type);
            expect(typeof result!.testCommand).toBe('string');
            expect(typeof result!.confidence).toBe('number');
            expect(Array.isArray(result!.indicators)).toBe(true);
            
            expect(result!.confidence).toBeGreaterThanOrEqual(0);
            expect(result!.confidence).toBeLessThanOrEqual(1);
        });
    });
});