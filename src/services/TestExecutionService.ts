/**
 * Test Execution Service
 * Handles test command execution with real-time progress tracking
 * Part of Phase 1.9.1 CommandRegistry refactor
 */

import * as vscode from 'vscode';
import { ServiceContainer } from '../core/ServiceContainer';
import { TestResultParser } from '../utils/testResultParser';
import { LegacyStyleFormatter } from '../utils/legacyStyleFormatter';

export interface TestExecutionRequest {
    project?: string;
    mode: 'default' | 'affected' | 'watch' | 'coverage' | 'debug';
    verbose?: boolean;
}

export interface TestResult {
    success: boolean;
    project: string;
    duration: number;
    exitCode: number;
    stdout: string;
    stderr: string;
    summary: any; // TestSummary from testResultParser
}

export type ProgressCallback = (progress: string) => void;

/**
 * Service for executing tests with streaming progress
 */
export class TestExecutionService {
    constructor(private services: ServiceContainer) {}

    /**
     * Execute test for specific request with streaming progress
     */
    async executeTest(request: TestExecutionRequest, onProgress?: ProgressCallback): Promise<TestResult> {
        const startTime = Date.now();
        const timestamp = new Date().toLocaleTimeString();
        
        // Track test execution performance
        const operationName = `test-${request.mode}${request.project ? `-${request.project}` : ''}`;
        
        return this.services.performanceTracker.trackCommand(operationName, async () => {
            // Get appropriate test command
            const command = await this.getTestCommand(request);
            const projectName = request.project || 'affected';
            
            this.services.outputChannel.appendLine(`\n${'='.repeat(80)}`);
            this.services.outputChannel.appendLine(`🧪 [${timestamp}] TESTING: ${projectName.toUpperCase()}`);
            this.services.outputChannel.appendLine(`🧪 Running: ${command}`);
            this.services.outputChannel.appendLine(`${'='.repeat(80)}`);
            
            // Save project as recent if it's a specific project
            if (request.project) {
                await this.saveRecentProject(request.project);
            }
            
            // Execute command with streaming progress
            const result = await this.executeCommand(command, onProgress);
            
            const duration = ((Date.now() - startTime) / 1000).toFixed(1);
            const testSummary = TestResultParser.parseNxOutput(result.stdout + result.stderr, projectName);
            testSummary.duration = parseFloat(duration);
            
            // Ensure consistency - if exit code is 1, mark as failed
            if (result.exitCode === 1) {
                testSummary.success = false;
                if (testSummary.failed === 0 && testSummary.failures.length === 0) {
                    testSummary.failed = 1;
                    testSummary.total = Math.max(testSummary.total, 1);
                }
            }
            
            // Format and display results
            await this.displayResults(testSummary, command, result);
            
            return {
                success: result.exitCode === 0,
                project: projectName,
                duration: parseFloat(duration),
                exitCode: result.exitCode,
                stdout: result.stdout,
                stderr: result.stderr,
                summary: testSummary
            };
        });
    }

    /**
     * Get appropriate test command for request
     */
    private async getTestCommand(request: TestExecutionRequest): Promise<string> {
        if (request.mode === 'affected') {
            return this.services.configManager.getTestCommand('affected');
        }
        
        if (request.project) {
            return await this.services.configManager.getSmartTestCommand(request.project);
        }
        
        return this.services.configManager.getTestCommand(request.mode);
    }

    /**
     * Execute command with real-time progress streaming
     */
    private async executeCommand(command: string, onProgress?: ProgressCallback): Promise<{
        exitCode: number;
        stdout: string;
        stderr: string;
    }> {
        return new Promise((resolve) => {
            const { spawn } = require('child_process');
            
            // Parse command
            const parts = command.split(' ');
            const cmd = parts[0];
            const args = parts.slice(1);
            
            const child = spawn(cmd, args, {
                cwd: this.services.workspaceRoot,
                stdio: ['ignore', 'pipe', 'pipe']
            });
            
            let stdout = '';
            let stderr = '';
            
            child.stdout?.on('data', (data: any) => {
                const text = data.toString();
                stdout += text;
                
                // Show real-time progress
                this.displayRealTimeProgress(text);
                onProgress?.(text);
            });
            
            child.stderr?.on('data', (data: any) => {
                const text = data.toString();
                stderr += text;
                
                // Show errors in real-time
                this.displayRealTimeProgress(text);
                onProgress?.(text);
            });
            
            child.on('close', (code: any) => {
                resolve({ 
                    exitCode: code || 0, 
                    stdout, 
                    stderr 
                });
            });
        });
    }

    /**
     * Display real-time test progress
     */
    private displayRealTimeProgress(output: string): void {
        const lines = output.split('\n');
        
        for (const line of lines) {
            const cleanedLine = this.cleanAnsiSequences(line);
            const trimmedLine = cleanedLine.trim();
            
            if (!trimmedLine) continue;
            
            // Show test file completion
            if (trimmedLine.startsWith('PASS ') || trimmedLine.startsWith('FAIL ')) {
                const status = trimmedLine.startsWith('PASS ') ? '✅' : '❌';
                const fileMatch = trimmedLine.match(/(PASS|FAIL)\s+(.+\.spec\.ts)/);
                if (fileMatch) {
                    const fileName = fileMatch[2].split('/').pop() || fileMatch[2];
                    this.services.outputChannel.appendLine(`   ${status} ${fileName}`);
                }
            }
            
            // Show test files starting
            else if (trimmedLine.includes('.spec.ts') && 
                    (trimmedLine.includes('RUNS') || trimmedLine.includes('RUN'))) {
                const fileMatch = trimmedLine.match(/([^/]+\.spec\.ts)/);
                if (fileMatch) {
                    const fileName = fileMatch[1];
                    this.services.outputChannel.appendLine(`   ⚡ Running ${fileName}...`);
                }
            }
            
            // Show individual test results
            else if (trimmedLine.includes('✓ ') || trimmedLine.includes('✗ ')) {
                const status = trimmedLine.includes('✓ ') ? '✅' : '❌';
                const testName = trimmedLine.replace(/[✓✗]\s*/, '').split('(')[0].trim();
                if (testName && testName.length > 0 && testName.length < 100) {
                    this.services.outputChannel.appendLine(`      ${status} ${testName}`);
                }
            }
            
            // Show compilation errors
            else if (trimmedLine.includes('Test suite failed to run') ||
                    trimmedLine.includes('error TS') ||
                    trimmedLine.includes('Cannot find module') ||
                    trimmedLine.includes('SyntaxError')) {
                const cleanError = trimmedLine
                    .replace(/Test suite failed to run\s*/g, 'Test suite failed to run')
                    .trim();
                if (cleanError && cleanError !== 'Test suite failed to run') {
                    this.services.outputChannel.appendLine(`   🔥 ${cleanError}`);
                }
            }
            
            // Check for Nx cloud URLs
            else if (trimmedLine.includes('View structured, searchable error logs at https://cloud.nx.app')) {
                this.makeUrlsClickable(trimmedLine);
            }
        }
    }

    /**
     * Display formatted test results
     */
    private async displayResults(testSummary: any, command: string, result: any): Promise<void> {
        // Create legacy-style formatted output
        const formattedReport = LegacyStyleFormatter.formatTestReport(testSummary, {
            command: command,
            exitCode: result.exitCode,
            rawOutput: result.stdout + result.stderr,
            optimized: true
        });
        
        // Display the formatted report
        const reportLines = formattedReport.split('\n');
        this.services.outputChannel.appendLine('');
        for (const line of reportLines) {
            if (line.includes('View structured, searchable error logs at https://cloud.nx.app')) {
                this.makeUrlsClickable(line);
            } else {
                this.services.outputChannel.appendLine(line);
            }
        }
        
        // Show status banner
        const statusBanner = LegacyStyleFormatter.createStatusBanner(testSummary);
        this.services.outputChannel.appendLine('\n' + statusBanner);
        
        // Show enhanced test results with actions
        this.services.testActions.updateRawOutput(result.stdout + result.stderr);
        await this.services.testActions.showTestResult(testSummary);
    }

    /**
     * Clean ANSI escape sequences
     */
    private cleanAnsiSequences(text: string): string {
        return text
            .replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '')
            .replace(/\[[0-9]+m/g, '')
            .replace(/\[22m/g, '')
            .replace(/\[1m/g, '')
            .replace(/●\s*/g, '')
            .replace(/\r/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    /**
     * Make URLs clickable in output
     */
    private makeUrlsClickable(text: string): void {
        const nxCloudPattern = /View structured, searchable error logs at (https:\/\/cloud\.nx\.app\/runs\/[a-zA-Z0-9]+)/g;
        const match = nxCloudPattern.exec(text);
        
        if (match) {
            const url = match[1];
            this.services.outputChannel.appendLine(`🔗 View structured, searchable error logs: ${url}`);
            
            vscode.window.showInformationMessage(
                'Nx Cloud error logs available', 
                'Open in Browser'
            ).then(selection => {
                if (selection === 'Open in Browser') {
                    vscode.env.openExternal(vscode.Uri.parse(url));
                }
            });
        } else {
            this.services.outputChannel.appendLine(text);
        }
    }

    /**
     * Save project as recent
     */
    private async saveRecentProject(projectName: string): Promise<void> {
        try {
            if (!projectName || typeof projectName !== 'string' || 
                projectName === '[object Object]' || projectName === '[Object object]') {
                return;
            }
            
            const workspaceState = vscode.workspace.getConfiguration('aiDebugContext');
            let recentProjects: any[] = workspaceState.get('recentProjects', []);
            
            // Clean up corrupted entries
            recentProjects = recentProjects.filter((p: any) => {
                return p && typeof p === 'object' && p.name && 
                       typeof p.name === 'string' && 
                       p.name !== '[object Object]' && 
                       p.name !== '[Object object]';
            });
            
            // Find existing entry
            const existingProject = recentProjects.find((p: any) => p.name === projectName);
            const testCount = existingProject ? (existingProject.testCount || 0) + 1 : 1;
            
            // Remove existing entry
            recentProjects = recentProjects.filter((p: any) => p.name !== projectName);
            
            // Add to front of list
            recentProjects.unshift({
                name: projectName,
                lastUsed: new Date().toLocaleString(),
                testCount: testCount,
                lastUsedTimestamp: Date.now()
            });
            
            // Keep only last 8 projects
            recentProjects = recentProjects.slice(0, 8);
            
            await workspaceState.update('recentProjects', recentProjects, true);
        } catch (error) {
            console.warn('Failed to save recent project:', error);
        }
    }
}