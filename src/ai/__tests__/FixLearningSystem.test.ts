/**
 * Unit tests for FixLearningSystem
 * 
 * Tests the learning system that tracks successful and failed fix attempts
 * to improve suggestions over time.
 * 
 * @version 3.0.0
 */

import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import * as path from 'path';
import { FixLearningSystem, FixPattern, FixFeedback, LearningOptions } from '../FixLearningSystem';
import { TestFailure } from '../TestFailureAnalyzer';
import { AutoFix } from '../PatternBasedFixer';

// Mock dependencies
jest.mock('fs/promises');
jest.mock('vscode', () => ({
    window: {
        createOutputChannel: jest.fn(() => ({
            appendLine: jest.fn(),
            show: jest.fn(),
            dispose: jest.fn()
        }))
    }
}));

describe('FixLearningSystem', () => {
    let learningSystem: FixLearningSystem;
    let mockOutputChannel: any;
    const testWorkspaceRoot = '/test/workspace';

    beforeEach(() => {
        jest.clearAllMocks();
        
        mockOutputChannel = {
            appendLine: jest.fn(),
            show: jest.fn(),
            dispose: jest.fn()
        };
        
        (vscode.window.createOutputChannel as jest.Mock).mockReturnValue(mockOutputChannel);
        (fs.access as jest.Mock).mockRejectedValue(new Error('File not found'));
        (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
        (fs.writeFile as jest.Mock).mockResolvedValue(undefined);
        (fs.readFile as jest.Mock).mockResolvedValue('{}');
        
        learningSystem = new FixLearningSystem(testWorkspaceRoot);
    });

    afterEach(() => {
        learningSystem.dispose();
    });

    describe('recordFixAttempt', () => {
        it('should record successful fix attempt', async () => {
            const failure: TestFailure = {
                testName: 'test case',
                testFile: 'test.spec.ts',
                errorMessage: 'Expected 5 but received 4',
                errorType: 'assertion_mismatch',
                stackTrace: []
            };

            const fix: AutoFix = {
                id: 'fix-123',
                title: 'Fix assertion',
                description: 'Change expected value to 4',
                filePath: 'test.spec.ts',
                edits: [],
                confidence: 0.8,
                category: 'assertion'
            };

            await learningSystem.recordFixAttempt(failure, fix, true, 'helpful');

            expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
                expect.stringContaining('Recorded successful fix attempt')
            );
            expect(fs.writeFile).toHaveBeenCalled();
        });

        it('should record failed fix attempt', async () => {
            const failure: TestFailure = {
                testName: 'test case',
                testFile: 'test.spec.ts',
                errorMessage: 'Type error occurred',
                errorType: 'type_error',
                stackTrace: []
            };

            await learningSystem.recordFixAttempt(failure, 'Manual fix description', false);

            expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
                expect.stringContaining('Recorded failed fix attempt')
            );
        });

        it('should handle errors gracefully', async () => {
            const failure: TestFailure = {
                testName: 'test case',
                testFile: 'test.spec.ts',
                errorMessage: 'Test error',
                errorType: 'unknown',
                stackTrace: []
            };

            (fs.writeFile as jest.Mock).mockRejectedValue(new Error('Write failed'));

            await learningSystem.recordFixAttempt(failure, 'Fix description', true);

            expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
                expect.stringContaining('Failed to save patterns')
            );
        });

        it('should include user feedback and notes', async () => {
            const failure: TestFailure = {
                testName: 'test case',
                testFile: 'test.spec.ts',
                errorMessage: 'Test failed',
                errorType: 'unknown',
                stackTrace: []
            };

            await learningSystem.recordFixAttempt(
                failure,
                'Fix description',
                true,
                'partially_helpful',
                'This fix worked but needed adjustment'
            );

            const writeCall = (fs.writeFile as jest.Mock).mock.calls[0];
            const savedData = JSON.parse(writeCall[1]);
            
            expect(savedData.patterns).toBeDefined();
        });
    });

    describe('getBestFix', () => {
        it('should return pattern with sufficient data and success rate', async () => {
            // Pre-populate with a reliable pattern
            const mockData = {
                patterns: [
                    [
                        'assertion_mismatch:expected number but received number',
                        {
                            id: 'pattern-1',
                            errorPattern: 'expected number but received number',
                            errorType: 'assertion_mismatch',
                            successfulFixes: ['Change to toBe()', 'Update expected value'],
                            failedFixes: [],
                            successRate: 0.8,
                            totalAttempts: 5,
                            lastUpdated: new Date().toISOString(),
                            confidence: 0.85
                        }
                    ]
                ]
            };

            (fs.access as jest.Mock).mockResolvedValueOnce(undefined);
            (fs.readFile as jest.Mock).mockResolvedValueOnce(JSON.stringify(mockData));

            // Recreate to load the pattern
            learningSystem = new FixLearningSystem(testWorkspaceRoot);
            await new Promise(resolve => setTimeout(resolve, 100)); // Wait for async load

            const pattern = learningSystem.getBestFix('Expected 5 but received 4', 'assertion_mismatch');

            expect(pattern).toBeTruthy();
            expect(pattern?.successRate).toBe(0.8);
            expect(pattern?.totalAttempts).toBe(5);
        });

        it('should return null for patterns with insufficient data', async () => {
            const pattern = learningSystem.getBestFix('Some error', 'unknown');

            expect(pattern).toBeNull();
        });

        it('should return null for patterns with low success rate', async () => {
            // Pre-populate with a low success rate pattern
            const mockData = {
                patterns: [
                    [
                        'type_error:type string is not assignable to type number',
                        {
                            id: 'pattern-2',
                            errorPattern: 'type string is not assignable to type number',
                            errorType: 'type_error',
                            successfulFixes: ['Cast to number'],
                            failedFixes: ['Change type', 'Remove type', 'Ignore error'],
                            successRate: 0.25, // Below 0.6 threshold
                            totalAttempts: 4,
                            lastUpdated: new Date().toISOString(),
                            confidence: 0.3
                        }
                    ]
                ]
            };

            (fs.access as jest.Mock).mockResolvedValueOnce(undefined);
            (fs.readFile as jest.Mock).mockResolvedValueOnce(JSON.stringify(mockData));

            learningSystem = new FixLearningSystem(testWorkspaceRoot);
            await new Promise(resolve => setTimeout(resolve, 100));

            const pattern = learningSystem.getBestFix(
                'Type \'string\' is not assignable to type \'number\'',
                'type_error'
            );

            expect(pattern).toBeNull();
        });
    });

    describe('getLearningStats', () => {
        it('should calculate statistics correctly', async () => {
            // Set up test data
            const mockData = {
                patterns: [
                    [
                        'pattern1',
                        {
                            id: '1',
                            errorPattern: 'pattern1',
                            errorType: 'type1',
                            successfulFixes: ['fix1', 'fix2'],
                            failedFixes: ['fix3'],
                            successRate: 0.67,
                            totalAttempts: 3,
                            lastUpdated: new Date().toISOString(),
                            confidence: 0.7
                        }
                    ],
                    [
                        'pattern2',
                        {
                            id: '2',
                            errorPattern: 'pattern2',
                            errorType: 'type2',
                            successfulFixes: ['fix4'],
                            failedFixes: [],
                            successRate: 1.0,
                            totalAttempts: 5,
                            lastUpdated: new Date().toISOString(),
                            confidence: 0.9
                        }
                    ]
                ]
            };

            (fs.access as jest.Mock).mockResolvedValueOnce(undefined);
            (fs.readFile as jest.Mock).mockResolvedValueOnce(JSON.stringify(mockData));

            learningSystem = new FixLearningSystem(testWorkspaceRoot);
            await new Promise(resolve => setTimeout(resolve, 100));

            const stats = learningSystem.getLearningStats();

            expect(stats.totalPatterns).toBe(2);
            expect(stats.reliablePatterns).toBe(2); // Both patterns meet criteria (>=3 attempts, >=0.6 success rate)
            expect(stats.totalAttempts).toBe(8);
            expect(stats.averageSuccessRate).toBeCloseTo(0.835, 2);
        });

        it('should handle empty patterns', () => {
            const stats = learningSystem.getLearningStats();

            expect(stats.totalPatterns).toBe(0);
            expect(stats.reliablePatterns).toBe(0);
            expect(stats.totalAttempts).toBe(0);
            expect(stats.averageSuccessRate).toBe(0);
        });
    });

    describe('generateLearnedSuggestions', () => {
        it('should generate suggestions from learned patterns', async () => {
            // Set up a good pattern
            const mockData = {
                patterns: [
                    [
                        'assertion_mismatch:expected number but received number',
                        {
                            id: 'pattern-1',
                            errorPattern: 'expected number but received number',
                            errorType: 'assertion_mismatch',
                            successfulFixes: [
                                'Change toEqual to toBe',
                                'Update expected value',
                                'Fix calculation logic'
                            ],
                            failedFixes: [],
                            successRate: 0.9,
                            totalAttempts: 10,
                            lastUpdated: new Date().toISOString(),
                            confidence: 0.95
                        }
                    ]
                ]
            };

            (fs.access as jest.Mock).mockResolvedValueOnce(undefined);
            (fs.readFile as jest.Mock).mockResolvedValueOnce(JSON.stringify(mockData));

            learningSystem = new FixLearningSystem(testWorkspaceRoot);
            await new Promise(resolve => setTimeout(resolve, 100));

            const failure: TestFailure = {
                testName: 'math test',
                testFile: 'math.test.ts',
                errorMessage: 'Expected 10 but received 5',
                errorType: 'assertion_mismatch',
                stackTrace: []
            };

            const suggestions = learningSystem.generateLearnedSuggestions(failure);

            expect(suggestions).toHaveLength(3); // Top 3 successful fixes
            expect(suggestions[0].id).toContain('learned-');
            expect(suggestions[0].title).toContain('Learned fix:');
            expect(suggestions[0].confidence).toBe(0.95);
            expect(suggestions[0].category).toBe('other');
        });

        it('should return empty array when no pattern found', () => {
            const failure: TestFailure = {
                testName: 'unknown test',
                testFile: 'test.spec.ts',
                errorMessage: 'Unknown error',
                errorType: 'unknown',
                stackTrace: []
            };

            const suggestions = learningSystem.generateLearnedSuggestions(failure);

            expect(suggestions).toEqual([]);
        });
    });

    describe('import/export functionality', () => {
        it('should export learning data', async () => {
            // Add some test data
            const failure: TestFailure = {
                testName: 'test',
                testFile: 'test.spec.ts',
                errorMessage: 'Test error',
                errorType: 'test_type',
                stackTrace: []
            };

            await learningSystem.recordFixAttempt(failure, 'Fix 1', true);
            await learningSystem.recordFixAttempt(failure, 'Fix 2', false);

            const exported = await learningSystem.exportLearningData();
            const data = JSON.parse(exported);

            expect(data.patterns).toBeDefined();
            expect(data.exportDate).toBeDefined();
            expect(data.stats).toBeDefined();
            expect(data.stats.totalPatterns).toBeGreaterThan(0);
        });

        it('should import learning data', async () => {
            const importData = {
                patterns: [
                    [
                        'imported_pattern',
                        {
                            id: 'import-1',
                            errorPattern: 'imported error pattern',
                            errorType: 'import_type',
                            successfulFixes: ['Imported fix'],
                            failedFixes: [],
                            successRate: 0.75,
                            totalAttempts: 4,
                            lastUpdated: new Date().toISOString(),
                            confidence: 0.8
                        }
                    ]
                ],
                exportDate: new Date().toISOString(),
                stats: {
                    totalPatterns: 1,
                    reliablePatterns: 1,
                    totalAttempts: 4,
                    averageSuccessRate: 0.75
                }
            };

            await learningSystem.importLearningData(JSON.stringify(importData));

            const stats = learningSystem.getLearningStats();
            expect(stats.totalPatterns).toBe(1);
            expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
                expect.stringContaining('Imported 1 learning patterns')
            );
        });

        it('should handle invalid import data', async () => {
            await expect(
                learningSystem.importLearningData('invalid json')
            ).rejects.toThrow('Failed to import learning data');
        });
    });

    describe('clearLearningData', () => {
        it('should clear all patterns', async () => {
            // Add some data first
            const failure: TestFailure = {
                testName: 'test',
                testFile: 'test.spec.ts',
                errorMessage: 'Test error',
                errorType: 'test_type',
                stackTrace: []
            };

            await learningSystem.recordFixAttempt(failure, 'Fix', true);
            
            // Verify data exists
            let stats = learningSystem.getLearningStats();
            expect(stats.totalPatterns).toBeGreaterThan(0);

            // Clear data
            await learningSystem.clearLearningData();

            // Verify data is cleared
            stats = learningSystem.getLearningStats();
            expect(stats.totalPatterns).toBe(0);
            expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
                expect.stringContaining('Cleared all learning data')
            );
        });
    });

    describe('pattern analysis methods', () => {
        it('should get patterns needing more data', async () => {
            const mockData = {
                patterns: [
                    ['pattern1', { totalAttempts: 2, successRate: 0.5 }],
                    ['pattern2', { totalAttempts: 10, successRate: 0.8 }],
                    ['pattern3', { totalAttempts: 1, successRate: 1.0 }]
                ]
            };

            (fs.access as jest.Mock).mockResolvedValueOnce(undefined);
            (fs.readFile as jest.Mock).mockResolvedValueOnce(JSON.stringify(mockData));

            learningSystem = new FixLearningSystem(testWorkspaceRoot);
            await new Promise(resolve => setTimeout(resolve, 100));

            const needingData = learningSystem.getPatternsNeedingData();

            expect(needingData).toHaveLength(2); // pattern1 and pattern3
            expect(needingData[0].totalAttempts).toBe(1); // Sorted by attempts
            expect(needingData[1].totalAttempts).toBe(2);
        });

        it('should get most reliable patterns', async () => {
            const mockData = {
                patterns: [
                    [
                        'pattern1',
                        {
                            id: '1',
                            successRate: 0.9,
                            totalAttempts: 10,
                            confidence: 0.95
                        }
                    ],
                    [
                        'pattern2',
                        {
                            id: '2',
                            successRate: 0.7,
                            totalAttempts: 20,
                            confidence: 0.8
                        }
                    ],
                    [
                        'pattern3',
                        {
                            id: '3',
                            successRate: 1.0,
                            totalAttempts: 3,
                            confidence: 0.7
                        }
                    ]
                ]
            };

            (fs.access as jest.Mock).mockResolvedValueOnce(undefined);
            (fs.readFile as jest.Mock).mockResolvedValueOnce(JSON.stringify(mockData));

            learningSystem = new FixLearningSystem(testWorkspaceRoot);
            await new Promise(resolve => setTimeout(resolve, 100));

            const reliable = learningSystem.getMostReliablePatterns(2);

            expect(reliable).toHaveLength(2);
            // Should be sorted by (successRate * totalAttempts)
            expect(reliable[0].successRate * reliable[0].totalAttempts).toBeGreaterThanOrEqual(
                reliable[1].successRate * reliable[1].totalAttempts
            );
        });
    });

    describe('error pattern extraction', () => {
        it('should normalize error messages correctly', async () => {
            const testCases = [
                {
                    input: 'Expected 42 but received 24',
                    expected: 'expected number but received number'
                },
                {
                    input: 'Cannot read property \'name\' of undefined',
                    expected: 'cannot read property string of undefined'
                },
                {
                    input: 'File not found: /path/to/file.ts',
                    expected: 'file not found: path'
                },
                {
                    input: 'Function getData() returned null',
                    expected: 'function function returned null'
                }
            ];

            for (const testCase of testCases) {
                // Clear previous mock calls
                (fs.writeFile as jest.Mock).mockClear();
                
                const failure: TestFailure = {
                    testName: 'test',
                    testFile: 'test.spec.ts',
                    errorMessage: testCase.input,
                    errorType: 'test',
                    stackTrace: []
                };

                await learningSystem.recordFixAttempt(failure, 'fix', true);

                const writeCall = (fs.writeFile as jest.Mock).mock.calls[0];
                const savedData = JSON.parse(writeCall[1]);
                const patterns = savedData.patterns;

                // Check if normalized pattern exists
                const hasExpectedPattern = patterns.some(([key]: [string]) => 
                    key.includes(testCase.expected)
                );

                expect(hasExpectedPattern).toBe(true);
            }
        });
    });

    describe('storage operations', () => {
        it('should create storage directory if it does not exist', async () => {
            await learningSystem.recordFixAttempt(
                {
                    testName: 'test',
                    testFile: 'test.spec.ts',
                    errorMessage: 'error',
                    errorType: 'type',
                    stackTrace: []
                },
                'fix',
                true
            );

            expect(fs.mkdir).toHaveBeenCalledWith(
                path.join(testWorkspaceRoot, '.ai-debug-context'),
                { recursive: true }
            );
        });

        it('should handle storage write failures gracefully', async () => {
            (fs.writeFile as jest.Mock).mockRejectedValue(new Error('Disk full'));

            await learningSystem.recordFixAttempt(
                {
                    testName: 'test',
                    testFile: 'test.spec.ts',
                    errorMessage: 'error',
                    errorType: 'type',
                    stackTrace: []
                },
                'fix',
                true
            );

            expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
                expect.stringContaining('Failed to save patterns')
            );
        });

        it('should handle storage read failures gracefully', async () => {
            (fs.access as jest.Mock).mockResolvedValue(undefined);
            (fs.readFile as jest.Mock).mockRejectedValue(new Error('Read error'));

            learningSystem = new FixLearningSystem(testWorkspaceRoot);
            await new Promise(resolve => setTimeout(resolve, 100));

            expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
                expect.stringContaining('Starting with empty learning data')
            );
        });
    });
});