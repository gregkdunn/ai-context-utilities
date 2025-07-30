/**
 * Simplified Real-Time Test Monitor
 * Phase 3.2.0 - Focused on core functionality only
 * Target: 100 lines, 82% reduction from 569 lines
 */

import * as vscode from 'vscode';
import { EventEmitter } from 'events';

export interface TestEvent {
    type: 'start' | 'pass' | 'fail' | 'skip' | 'complete';
    testName: string;
    fileName: string;
    duration?: number;
    error?: string;
    timestamp: number;
}

export interface TestMetrics {
    total: number;
    passed: number;
    failed: number;
    duration: number;
}

/**
 * Simplified real-time test monitoring - core functionality only
 */
export class RealTimeTestMonitor extends EventEmitter {
    private currentMetrics: TestMetrics = {
        total: 0,
        passed: 0,
        failed: 0,
        duration: 0
    };
    private startTime: number = 0;
    private outputChannel: vscode.OutputChannel;

    constructor(outputChannel: vscode.OutputChannel) {
        super();
        this.outputChannel = outputChannel;
    }

    /**
     * Start monitoring test execution
     */
    startMonitoring(): void {
        this.startTime = Date.now();
        this.currentMetrics = { total: 0, passed: 0, failed: 0, duration: 0 };
        this.emit('monitoring:started');
    }

    /**
     * Stop monitoring and finalize metrics
     */
    stopMonitoring(): void {
        this.currentMetrics.duration = Date.now() - this.startTime;
        this.emit('monitoring:completed', this.currentMetrics);
    }

    /**
     * Process test output line - single generic parser
     */
    processOutput(line: string): void {
        const cleanLine = this.stripAnsi(line);
        
        // Basic test result patterns
        if (cleanLine.includes('PASS') || cleanLine.includes('✓')) {
            this.currentMetrics.passed++;
            this.currentMetrics.total++;
            this.emit('test:pass', { type: 'pass', testName: this.extractTestName(cleanLine), fileName: '', timestamp: Date.now() });
        } else if (cleanLine.includes('FAIL') || cleanLine.includes('✗')) {
            this.currentMetrics.failed++;
            this.currentMetrics.total++;
            this.emit('test:fail', { type: 'fail', testName: this.extractTestName(cleanLine), fileName: '', timestamp: Date.now() });
        } else if (cleanLine.includes('SKIP') || cleanLine.includes('⚬')) {
            this.currentMetrics.total++;
            this.emit('test:skip', { type: 'skip', testName: this.extractTestName(cleanLine), fileName: '', timestamp: Date.now() });
        }
    }

    /**
     * Get current metrics
     */
    getMetrics(): TestMetrics {
        return { ...this.currentMetrics };
    }

    /**
     * Extract test name from output line
     */
    private extractTestName(line: string): string {
        // Simple extraction - just get text after status indicators
        const match = line.match(/(?:PASS|FAIL|SKIP|✓|✗|⚬)\s+(.+)/);
        return match ? match[1].trim() : 'Unknown Test';
    }

    /**
     * Strip ANSI escape sequences
     */
    private stripAnsi(text: string): string {
        return text.replace(/\u001b\[[0-9;]*m/g, '');
    }
}