/**
 * Unit tests for PerformanceDashboard
 */

import * as vscode from 'vscode';
import { PerformanceDashboard } from '../PerformanceDashboard';
import { PerformanceMonitor } from '../PerformanceMonitor';

// Mock vscode
jest.mock('vscode', () => ({
    window: {
        showQuickPick: jest.fn(),
        showInformationMessage: jest.fn(),
        showSaveDialog: jest.fn()
    },
    workspace: {
        fs: {
            writeFile: jest.fn()
        }
    },
    Uri: {
        file: jest.fn()
    },
    QuickPickItemKind: {
        Separator: 'separator'
    }
}));

// Mock PerformanceMonitor
jest.mock('../PerformanceMonitor');

describe('PerformanceDashboard', () => {
    let dashboard: PerformanceDashboard;
    let mockPerformanceMonitor: jest.Mocked<PerformanceMonitor>;

    beforeEach(() => {
        mockPerformanceMonitor = {
            generateReport: jest.fn().mockReturnValue({
                summary: {
                    totalOperations: 100,
                    averageDuration: 250,
                    successRate: 0.95,
                    slowestOperation: 'slow-op',
                    fastestOperation: 'fast-op'
                },
                metrics: [],
                memoryUsage: [],
                recommendations: ['Optimize slow operations']
            }),
            clearMetrics: jest.fn(),
            dispose: jest.fn(),
            trackOperation: jest.fn()
        } as any;

        dashboard = new PerformanceDashboard(mockPerformanceMonitor);
        jest.clearAllMocks();
    });

    describe('constructor', () => {
        it('should create dashboard instance', () => {
            expect(dashboard).toBeInstanceOf(PerformanceDashboard);
        });
    });

    describe('show', () => {
        it('should show performance dashboard', async () => {
            (vscode.window.showQuickPick as jest.Mock).mockResolvedValue({
                label: '📊 Performance Summary'
            });

            await dashboard.show();

            expect(vscode.window.showQuickPick).toHaveBeenCalled();
            expect(mockPerformanceMonitor.generateReport).toHaveBeenCalled();
        });

        it('should handle dashboard cancellation', async () => {
            (vscode.window.showQuickPick as jest.Mock).mockResolvedValue(undefined);

            await dashboard.show();

            expect(vscode.window.showQuickPick).toHaveBeenCalled();
        });
    });
});