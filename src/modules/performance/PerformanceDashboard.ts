/**
 * Performance Dashboard
 * Optional performance analytics and visualization component
 */

import * as vscode from 'vscode';
import { PerformanceMonitor } from './PerformanceMonitor';

export class PerformanceDashboard {
    constructor(private performanceMonitor: PerformanceMonitor) {}

    /**
     * Show comprehensive performance dashboard
     */
    async show(): Promise<void> {
        const report = this.performanceMonitor.generateReport();
        
        const items: vscode.QuickPickItem[] = [
            {
                label: '📊 Performance Summary',
                detail: `${report.summary.totalOperations} operations, ${Math.round(report.summary.successRate * 100)}% success rate`,
                description: `Avg: ${Math.round(report.summary.averageDuration)}ms`
            },
            {
                label: '⚡ Fastest Operation',
                detail: report.summary.fastestOperation,
                description: 'Best performance'
            },
            {
                label: '🐌 Slowest Operation', 
                detail: report.summary.slowestOperation,
                description: 'Needs optimization'
            },
            {
                label: '', kind: vscode.QuickPickItemKind.Separator
            },
            {
                label: '📋 Export Performance Data',
                detail: 'Save detailed performance report',
                description: 'JSON format'
            },
            {
                label: '🗑️ Clear Performance Data',
                detail: 'Reset all metrics',
                description: 'Start fresh'
            }
        ];

        // Add recommendations if any
        if (report.recommendations.length > 0) {
            items.splice(-3, 0, {
                label: '', kind: vscode.QuickPickItemKind.Separator
            });
            
            report.recommendations.forEach((rec, index) => {
                items.splice(-3, 0, {
                    label: `💡 Recommendation ${index + 1}`,
                    detail: rec,
                    description: 'Optimization tip'
                });
            });
        }

        const selection = await vscode.window.showQuickPick(items, {
            placeHolder: 'Performance Analytics Dashboard',
            title: '📊 AI Debug Context Performance'
        });

        if (!selection) return;

        if (selection.label === '📋 Export Performance Data') {
            await this.exportPerformanceData(report);
        } else if (selection.label === '🗑️ Clear Performance Data') {
            this.performanceMonitor.clearMetrics();
            vscode.window.showInformationMessage('Performance data cleared');
        }
    }

    /**
     * Export performance data to JSON file
     */
    private async exportPerformanceData(report: any): Promise<void> {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `ai-debug-context-performance-${timestamp}.json`;
        
        const uri = await vscode.window.showSaveDialog({
            defaultUri: vscode.Uri.file(filename),
            filters: {
                'JSON': ['json']
            }
        });

        if (uri) {
            const data = {
                generatedAt: new Date().toISOString(),
                summary: report.summary,
                recommendations: report.recommendations,
                recentMetrics: report.metrics,
                memoryUsage: report.memoryUsage
            };

            await vscode.workspace.fs.writeFile(
                uri, 
                Buffer.from(JSON.stringify(data, null, 2))
            );

            vscode.window.showInformationMessage(
                `Performance report exported to ${uri.fsPath}`,
                'Open File'
            ).then(action => {
                if (action === 'Open File') {
                    vscode.env.openExternal(uri);
                }
            });
        }
    }
}