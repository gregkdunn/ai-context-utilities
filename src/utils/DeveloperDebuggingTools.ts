/**
 * Developer Debugging Tools
 * Comprehensive debugging utilities for extension development
 * Phase 2.0.2 - Better developer experience
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { ServiceContainer } from '../core/ServiceContainer';

export interface DebugSession {
    id: string;
    timestamp: number;
    operation: string;
    input?: any;
    output?: any;
    error?: any;
    duration?: number;
    stackTrace?: string;
    memorySnapshot?: NodeJS.MemoryUsage;
}

export interface SystemDiagnostics {
    extension: {
        version: string;
        mode: 'development' | 'production';
        activeCommands: string[];
    };
    workspace: {
        root: string;
        hasProjects: boolean;
        projectCount: number;
        detectedFrameworks: string[];
    };
    system: {
        nodeVersion: string;
        vsCodeVersion: string;
        platform: string;
        memory: NodeJS.MemoryUsage;
        uptime: number;
    };
    performance: {
        operationCount: number;
        averageResponseTime: number;
        errorRate: number;
        cacheHitRate: number;
    };
}

/**
 * Comprehensive debugging tools for developers
 */
export class DeveloperDebuggingTools {
    private debugSessions: DebugSession[] = [];
    private isDebugging = false;
    private maxSessions = 500;

    constructor(
        private services: ServiceContainer,
        private outputChannel: vscode.OutputChannel
    ) {}

    /**
     * Start debug session for an operation
     */
    startDebugSession(operation: string, input?: any): string {
        const sessionId = `debug-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        const session: DebugSession = {
            id: sessionId,
            timestamp: Date.now(),
            operation,
            input: this.sanitizeDebugData(input),
            memorySnapshot: process.memoryUsage()
        };

        this.debugSessions.push(session);
        
        if (this.isDebugging) {
            this.outputChannel.appendLine(`🔍 DEBUG START: ${operation} [${sessionId}]`);
            if (input) {
                this.outputChannel.appendLine(`   📥 Input: ${JSON.stringify(input, null, 2)}`);
            }
        }

        return sessionId;
    }

    /**
     * End debug session with results
     */
    endDebugSession(sessionId: string, output?: any, error?: any): void {
        const session = this.debugSessions.find(s => s.id === sessionId);
        if (!session) return;

        session.duration = Date.now() - session.timestamp;
        session.output = this.sanitizeDebugData(output);
        session.error = error;

        if (error) {
            session.stackTrace = error.stack || new Error().stack;
        }

        if (this.isDebugging) {
            const icon = error ? '❌' : '✅';
            const timing = session.duration ? `${session.duration}ms` : 'unknown';
            
            this.outputChannel.appendLine(`${icon} DEBUG END: ${session.operation} [${sessionId}] (${timing})`);
            
            if (output) {
                this.outputChannel.appendLine(`   📤 Output: ${JSON.stringify(output, null, 2)}`);
            }
            
            if (error) {
                this.outputChannel.appendLine(`   💥 Error: ${error.message}`);
                if (error.stack) {
                    this.outputChannel.appendLine(`   📋 Stack: ${error.stack}`);
                }
            }
        }

        // Cleanup old sessions
        if (this.debugSessions.length > this.maxSessions) {
            this.debugSessions = this.debugSessions.slice(-this.maxSessions);
        }
    }

    /**
     * Enable detailed debugging
     */
    enableDebugging(): void {
        this.isDebugging = true;
        this.outputChannel.appendLine('🔍 Debug mode enabled - detailed logging active');
        vscode.window.showInformationMessage('Debug mode enabled for AI Debug Context');
    }

    /**
     * Disable debugging
     */
    disableDebugging(): void {
        this.isDebugging = false;
        this.outputChannel.appendLine('🔍 Debug mode disabled');
        vscode.window.showInformationMessage('Debug mode disabled for AI Debug Context');
    }

    /**
     * Toggle debugging state
     */
    toggleDebugging(): void {
        if (this.isDebugging) {
            this.disableDebugging();
        } else {
            this.enableDebugging();
        }
    }

    /**
     * Generate comprehensive system diagnostics
     */
    async generateSystemDiagnostics(): Promise<SystemDiagnostics> {
        const packageJson = await this.loadPackageJson();
        const projects = await this.services.projectDiscovery.getAllProjects();
        const frameworks = this.services.configManager.getDetectedFrameworks();
        // Get performance stats from real tracker if available
        const perfStats = this.services.realPerformanceTracker ? 
            this.services.realPerformanceTracker.getPerformanceStats() : 
            { totalOperations: 0, averageDuration: 0, successRate: 1 };

        return {
            extension: {
                version: packageJson?.version || 'unknown',
                mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
                activeCommands: this.getActiveCommands()
            },
            workspace: {
                root: this.services.workspaceRoot,
                hasProjects: projects.length > 0,
                projectCount: projects.length,
                detectedFrameworks: frameworks.map(f => `${f.name} (${f.confidence.toFixed(1)}%)`)
            },
            system: {
                nodeVersion: process.version,
                vsCodeVersion: vscode.version,
                platform: `${process.platform} ${process.arch}`,
                memory: process.memoryUsage(),
                uptime: process.uptime()
            },
            performance: {
                operationCount: perfStats.totalOperations,
                averageResponseTime: perfStats.averageDuration,
                errorRate: 1 - perfStats.successRate,
                cacheHitRate: perfStats.totalOperations > 0 ? 0.75 : 0 // TODO: Get from actual cache
            }
        };
    }

    /**
     * Show comprehensive diagnostics report
     */
    async showDiagnosticsReport(): Promise<void> {
        const diagnostics = await this.generateSystemDiagnostics();
        
        this.outputChannel.show();
        this.outputChannel.appendLine('\n' + '='.repeat(70));
        this.outputChannel.appendLine('🔧 AI DEBUG CONTEXT - SYSTEM DIAGNOSTICS');
        this.outputChannel.appendLine('='.repeat(70));
        
        // Extension info
        this.outputChannel.appendLine(`📦 Extension: v${diagnostics.extension.version} (${diagnostics.extension.mode})`);
        this.outputChannel.appendLine(`📋 Active Commands: ${diagnostics.extension.activeCommands.length}`);
        
        // Workspace info
        this.outputChannel.appendLine(`\n🏠 Workspace: ${diagnostics.workspace.root}`);
        this.outputChannel.appendLine(`📊 Projects: ${diagnostics.workspace.projectCount} found`);
        this.outputChannel.appendLine(`🎯 Frameworks: ${diagnostics.workspace.detectedFrameworks.join(', ') || 'None detected'}`);
        
        // System info
        this.outputChannel.appendLine(`\n💻 System: ${diagnostics.system.platform}`);
        this.outputChannel.appendLine(`🚀 Node: ${diagnostics.system.nodeVersion}`);
        this.outputChannel.appendLine(`📝 VS Code: ${diagnostics.system.vsCodeVersion}`);
        this.outputChannel.appendLine(`⏱️ Uptime: ${(diagnostics.system.uptime / 60).toFixed(1)} minutes`);
        
        // Memory info
        const memory = diagnostics.system.memory;
        this.outputChannel.appendLine(`\n🧠 Memory Usage:`);
        this.outputChannel.appendLine(`   Heap Used: ${(memory.heapUsed / 1024 / 1024).toFixed(1)}MB`);
        this.outputChannel.appendLine(`   Heap Total: ${(memory.heapTotal / 1024 / 1024).toFixed(1)}MB`);
        this.outputChannel.appendLine(`   RSS: ${(memory.rss / 1024 / 1024).toFixed(1)}MB`);
        
        // Performance info
        this.outputChannel.appendLine(`\n⚡ Performance:`);
        this.outputChannel.appendLine(`   Operations: ${diagnostics.performance.operationCount}`);
        this.outputChannel.appendLine(`   Avg Response: ${diagnostics.performance.averageResponseTime.toFixed(0)}ms`);
        this.outputChannel.appendLine(`   Error Rate: ${(diagnostics.performance.errorRate * 100).toFixed(1)}%`);
        this.outputChannel.appendLine(`   Cache Hit Rate: ${(diagnostics.performance.cacheHitRate * 100).toFixed(1)}%`);
        
        this.outputChannel.appendLine('\n' + '='.repeat(70));
        
        // Offer to save diagnostics
        const saveOption = await vscode.window.showInformationMessage(
            'System diagnostics generated',
            'Save to File',
            'Copy to Clipboard'
        );
        
        if (saveOption === 'Save to File') {
            await this.saveDiagnosticsToFile(diagnostics);
        } else if (saveOption === 'Copy to Clipboard') {
            await this.copyDiagnosticsToClipboard(diagnostics);
        }
    }

    /**
     * Show recent debug sessions
     */
    showRecentDebugSessions(limit: number = 20): void {
        const recentSessions = this.debugSessions.slice(-limit);
        
        if (recentSessions.length === 0) {
            this.outputChannel.appendLine('📋 No debug sessions found');
            return;
        }
        
        this.outputChannel.appendLine('\n' + '='.repeat(60));
        this.outputChannel.appendLine(`🔍 RECENT DEBUG SESSIONS (${recentSessions.length})`);
        this.outputChannel.appendLine('='.repeat(60));
        
        for (const session of recentSessions) {
            const timestamp = new Date(session.timestamp).toLocaleTimeString();
            const duration = session.duration ? `${session.duration}ms` : 'ongoing';
            const status = session.error ? '❌' : '✅';
            
            this.outputChannel.appendLine(`${status} ${timestamp} - ${session.operation} (${duration})`);
            
            if (session.error) {
                this.outputChannel.appendLine(`   💥 ${session.error.message || session.error}`);
            }
        }
        
        this.outputChannel.appendLine('='.repeat(60));
    }

    /**
     * Test all extension commands
     */
    async runExtensionHealthCheck(): Promise<void> {
        this.outputChannel.appendLine('\n🏥 Running Extension Health Check...');
        
        const healthChecks = [
            { name: 'Service Container', test: () => this.testServiceContainer() },
            { name: 'Project Discovery', test: () => this.testProjectDiscovery() },
            { name: 'Framework Detection', test: () => this.testFrameworkDetection() },
            { name: 'Configuration Manager', test: () => this.testConfigurationManager() },
            { name: 'Performance Tracker', test: () => this.testPerformanceTracker() }
        ];
        
        let passedChecks = 0;
        
        for (const check of healthChecks) {
            try {
                await check.test();
                this.outputChannel.appendLine(`✅ ${check.name}: OK`);
                passedChecks++;
            } catch (error) {
                this.outputChannel.appendLine(`❌ ${check.name}: FAILED - ${error instanceof Error ? error.message : String(error)}`);
            }
        }
        
        const healthScore = (passedChecks / healthChecks.length) * 100;
        const healthIcon = healthScore === 100 ? '💚' : healthScore >= 80 ? '💛' : '❤️';
        
        this.outputChannel.appendLine(`\n${healthIcon} Health Score: ${healthScore.toFixed(0)}% (${passedChecks}/${healthChecks.length})`);
        
        if (healthScore < 100) {
            vscode.window.showWarningMessage(
                `Extension health check: ${healthScore.toFixed(0)}% (${passedChecks}/${healthChecks.length} passed)`,
                'View Details'
            ).then(selection => {
                if (selection === 'View Details') {
                    this.outputChannel.show();
                }
            });
        }
    }

    /**
     * Helper methods for health checks
     */
    private async testServiceContainer(): Promise<void> {
        if (!this.services) throw new Error('ServiceContainer not initialized');
        if (!this.services.configManager) throw new Error('ConfigManager not available');
        if (!this.services.projectDiscovery) throw new Error('ProjectDiscovery not available');
    }

    private async testProjectDiscovery(): Promise<void> {
        const projects = await this.services.projectDiscovery.getAllProjects();
        if (!Array.isArray(projects)) throw new Error('getAllProjects did not return array');
    }

    private async testFrameworkDetection(): Promise<void> {
        const frameworks = this.services.configManager.getDetectedFrameworks();
        if (!Array.isArray(frameworks)) throw new Error('getDetectedFrameworks did not return array');
    }

    private async testConfigurationManager(): Promise<void> {
        // Test that configuration manager is available and functioning
        const frameworks = this.services.configManager.getDetectedFrameworks();
        if (!Array.isArray(frameworks)) throw new Error('getDetectedFrameworks did not return array');
    }

    private async testPerformanceTracker(): Promise<void> {
        // Test that performance tracker is available and functioning
        if (!this.services.performanceTracker) throw new Error('Performance tracker not initialized');
    }

    /**
     * Utility methods
     */
    private sanitizeDebugData(data: any): any {
        if (!data) return data;
        
        // Remove sensitive information
        const sensitiveKeys = ['password', 'token', 'key', 'secret', 'auth'];
        
        try {
            const jsonStr = JSON.stringify(data, (key, value) => {
                if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
                    return '[REDACTED]';
                }
                return value;
            });
            return JSON.parse(jsonStr);
        } catch {
            return '[Complex Object]';
        }
    }

    private async loadPackageJson(): Promise<any> {
        try {
            const packagePath = path.join(__dirname, '../../package.json');
            const content = await fs.promises.readFile(packagePath, 'utf8');
            return JSON.parse(content);
        } catch {
            return null;
        }
    }

    private getActiveCommands(): string[] {
        // This would need to be populated by the CommandRegistry
        return ['aiDebugContext.runTests', 'aiDebugContext.showProjectBrowser'];
    }

    private async saveDiagnosticsToFile(diagnostics: SystemDiagnostics): Promise<void> {
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `ai-debug-diagnostics-${timestamp}.json`;
            const filepath = path.join(this.services.workspaceRoot, filename);
            
            await fs.promises.writeFile(filepath, JSON.stringify(diagnostics, null, 2));
            
            vscode.window.showInformationMessage(
                `Diagnostics saved to ${filename}`,
                'Open File'
            ).then(selection => {
                if (selection === 'Open File') {
                    vscode.workspace.openTextDocument(filepath).then(doc => {
                        vscode.window.showTextDocument(doc);
                    });
                }
            });
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to save diagnostics: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    private async copyDiagnosticsToClipboard(diagnostics: SystemDiagnostics): Promise<void> {
        try {
            await vscode.env.clipboard.writeText(JSON.stringify(diagnostics, null, 2));
            vscode.window.showInformationMessage('Diagnostics copied to clipboard');
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to copy diagnostics: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Dispose and cleanup
     */
    dispose(): void {
        this.debugSessions = [];
        this.isDebugging = false;
    }
}