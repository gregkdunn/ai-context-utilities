/**
 * Tests for NativeTestRunner
 */

import { NativeTestRunner, NativeTestResult, TestExecutionOptions } from '../../../services/NativeTestRunner';
import { TestIntelligenceEngine } from '../../../core/TestIntelligenceEngine';
import { RealTimeTestMonitor } from '../../../services/RealTimeTestMonitor';
import { TestAnalysisHelper } from '../../../services/TestAnalysisHelper';
import * as vscode from 'vscode';

// Mock dependencies
jest.mock('vscode', () => ({
    window: {
        showErrorMessage: jest.fn(),
        showInformationMessage: jest.fn()
    }
}));

jest.mock('../../../core/TestIntelligenceEngine');
jest.mock('../../../services/RealTimeTestMonitor');
jest.mock('../../../services/TestAnalysisHelper');
jest.mock('child_process');

describe('NativeTestRunner', () => {
    let testRunner: NativeTestRunner;
    let mockOutputChannel: jest.Mocked<vscode.OutputChannel>;
    let mockTestIntelligence: jest.Mocked<TestIntelligenceEngine>;
    let mockRealTimeMonitor: jest.Mocked<RealTimeTestMonitor>;
    let mockTestAnalysisHelper: jest.Mocked<TestAnalysisHelper>;

    beforeEach(() => {
        mockOutputChannel = {
            append: jest.fn(),
            appendLine: jest.fn(),
            show: jest.fn(),
            hide: jest.fn(),
            clear: jest.fn(),
            dispose: jest.fn(),
            name: 'test-runner',
            replace: jest.fn()
        };

        mockTestIntelligence = {} as jest.Mocked<TestIntelligenceEngine>;
        mockRealTimeMonitor = {} as jest.Mocked<RealTimeTestMonitor>;
        mockTestAnalysisHelper = {} as jest.Mocked<TestAnalysisHelper>;

        testRunner = new NativeTestRunner(
            '/test/workspace',
            mockOutputChannel,
            mockTestIntelligence,
            mockRealTimeMonitor,
            mockTestAnalysisHelper
        );
        jest.clearAllMocks();
    });

    describe('Constructor', () => {
        test('should create instance with all dependencies', () => {
            expect(testRunner).toBeDefined();
            expect(testRunner).toBeInstanceOf(NativeTestRunner);
        });
    });

    describe('Interfaces', () => {
        test('should create valid NativeTestResult', () => {
            const result: NativeTestResult = {
                success: true,
                exitCode: 0,
                stdout: 'All tests passed',
                stderr: '',
                duration: 2500,
                testFiles: ['src/app.test.ts', 'src/utils.test.ts'],
                failures: [],
                predictions: {
                    accurateFailures: 8,
                    totalPredictions: 10,
                    accuracy: 0.8
                }
            };

            expect(result.success).toBe(true);
            expect(result.testFiles).toHaveLength(2);
            expect(result.predictions?.accuracy).toBe(0.8);
        });

        test('should create valid TestExecutionOptions', () => {
            const options: TestExecutionOptions = {
                maxConcurrency: 4,
                timeout: 30000,
                verbose: true,
                failFast: false,
                useIntelligence: true
            };

            expect(options.maxConcurrency).toBe(4);
            expect(options.timeout).toBe(30000);
            expect(options.useIntelligence).toBe(true);
        });
    });

    describe('Instance properties', () => {
        test('should have test runner functionality available', () => {
            expect(testRunner).toBeDefined();
            expect(typeof testRunner).toBe('object');
        });
    });
});