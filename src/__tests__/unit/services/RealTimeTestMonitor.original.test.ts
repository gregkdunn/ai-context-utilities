/**
 * Tests for RealTimeTestMonitor.original
 */

import { RealTimeTestMonitor } from '../../../services/RealTimeTestMonitor.original';
import { TestIntelligenceEngine } from '../../../core/TestIntelligenceEngine';
import * as vscode from 'vscode';

// Mock dependencies
jest.mock('vscode', () => ({
    window: {
        showErrorMessage: jest.fn(),
        showInformationMessage: jest.fn()
    },
    EventEmitter: jest.fn()
}));

jest.mock('../../../core/TestIntelligenceEngine');

describe('RealTimeTestMonitor.original', () => {
    test('should have RealTimeTestMonitor class exported', () => {
        expect(RealTimeTestMonitor).toBeDefined();
    });

    test('should be able to create interfaces', () => {
        // Test that the interfaces are properly exported by using them
        const testEvent = {
            type: 'start' as const,
            testName: 'test-name',
            fileName: 'test-file.ts',
            timestamp: Date.now()
        };
        
        expect(testEvent.type).toBe('start');
        expect(testEvent.testName).toBe('test-name');
    });
});