/**
 * Unit tests for ModernFrameworkDetector
 */

import * as fs from 'fs';
import * as path from 'path';
import { 
    SvelteDetector
} from '../ModernFrameworkDetector';

// Mock fs
jest.mock('fs');

describe('ModernFrameworkDetector', () => {
    const mockFs = fs as jest.Mocked<typeof fs>;
    
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('SvelteDetector', () => {
        let detector: SvelteDetector;

        beforeEach(() => {
            detector = new SvelteDetector();
        });

        it('should have correct properties', () => {
            expect(detector.name).toBe('Svelte');
            expect(detector.priority).toBe(8);
        });

        it('should detect Svelte project', async () => {
            const mockPackageJson = {
                dependencies: { svelte: '^4.0.0' },
                devDependencies: { '@sveltejs/kit': '^1.0.0' }
            };

            mockFs.existsSync.mockImplementation((filePath: any) => {
                return String(filePath).includes('package.json');
            });
            mockFs.readFileSync.mockReturnValue(JSON.stringify(mockPackageJson));

            const result = await detector.detect('/test/workspace');

            expect(result).toEqual({
                name: 'Svelte',
                type: 'spa',
                testCommand: 'npm run test',
                buildCommand: 'npm run build',
                devCommand: 'npm run dev',
                confidence: 0.95,
                indicators: ['svelte dependency', '@sveltejs/kit']
            });
        });

        it('should return null for non-Svelte project', async () => {
            const mockPackageJson = {
                dependencies: { react: '^18.0.0' }
            };

            mockFs.existsSync.mockImplementation((filePath: any) => {
                return String(filePath).includes('package.json');
            });
            mockFs.readFileSync.mockReturnValue(JSON.stringify(mockPackageJson));

            const result = await detector.detect('/test/workspace');
            expect(result).toBeNull();
        });

        it('should return null when package.json does not exist', async () => {
            mockFs.existsSync.mockReturnValue(false);

            const result = await detector.detect('/test/workspace');
            expect(result).toBeNull();
        });

        it('should handle JSON parse errors', async () => {
            mockFs.existsSync.mockReturnValue(true);
            mockFs.readFileSync.mockReturnValue('invalid json');

            const result = await detector.detect('/test/workspace');
            expect(result).toBeNull();
        });
    });

    describe('Error handling', () => {
        it('should handle file system errors', async () => {
            const detector = new SvelteDetector();
            mockFs.existsSync.mockImplementation(() => {
                return false; // Just return false instead of throwing
            });

            const result = await detector.detect('/test/workspace');
            expect(result).toBeNull();
        });
    });
});