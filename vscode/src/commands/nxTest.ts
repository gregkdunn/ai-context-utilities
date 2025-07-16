import * as vscode from 'vscode';
import { spawn } from 'child_process';
import { CommandOptions, CommandResult } from '../types';
import { FileManager } from '../utils/fileManager';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export class NxTestCommand {
    private fileManager: FileManager;

    constructor() {
        this.fileManager = new FileManager();
    }

    /**
     * Run NX Test command with AI-optimized output
     */
    async run(project: string, options: CommandOptions = {}): Promise<CommandResult> {
        const startTime = Date.now();
        
        try {
            const finalOutputFile = await this.fileManager.getOutputFilePath('jest-output.txt');
            const expectedOutputFile = await this.fileManager.getOutputFilePath('jest-output-expected.txt');
            
            // Create temporary files
            const tempRawOutput = path.join(os.tmpdir(), `jest-raw-${Date.now()}.txt`);
            const tempCleanOutput = path.join(os.tmpdir(), `jest-clean-${Date.now()}.txt`);
            const tempOptimizedOutput = path.join(os.tmpdir(), `jest-optimized-${Date.now()}.txt`);
            
            // Ensure output directory exists
            await this.fileManager.ensureDirectoryExists(path.dirname(finalOutputFile));
            
            // Delete existing output file
            try {
                await fs.promises.unlink(finalOutputFile);
            } catch {
                // File doesn't exist, that's fine
            }
            
            // If --use-expected flag was set, use expected output directly
            if (options.useExpected) {
                try {
                    await fs.promises.copyFile(expectedOutputFile, finalOutputFile);
                    this.showInfo("Using expected output file directly (--use-expected flag set)");
                    
                    const content = await fs.promises.readFile(finalOutputFile, 'utf8');
                    this.showFormattedReport(content, finalOutputFile);
                    
                    const duration = Date.now() - startTime;
                    return {
                        success: true,
                        exitCode: 0,
                        output: content,
                        outputFiles: [finalOutputFile],
                        duration
                    };
                } catch (error) {
                    throw new Error(`Expected output file not found: ${expectedOutputFile}`);
                }
            }

            // Execute the test command
            const testArgs = project ? [project] : [];
            this.showInfo(`Running: yarn nx test ${testArgs.join(' ')}`);
            this.showInfo(`Output mode: ${options.fullOutput ? "Full output" : "AI-optimized"}`);
            
            const testResult = await this.executeTest(testArgs, tempRawOutput);
            
            // Validate raw output
            if (fs.existsSync(tempRawOutput) && fs.statSync(tempRawOutput).size > 0) {
                const lines = fs.readFileSync(tempRawOutput, 'utf8').split('\n').length;
                this.showInfo(`Raw test output captured successfully (${lines} lines)`);
            } else {
                this.showWarning("No raw test output was captured");
                this.showError("Test execution may have failed");
                
                const duration = Date.now() - startTime;
                return {
                    success: false,
                    exitCode: testResult.exitCode,
                    output: testResult.output,
                    error: "No test output captured",
                    duration
                };
            }

            // Clean ANSI codes
            this.showInfo("Processing output for AI analysis...");
            const cleaningSuccess = await this.cleanAnsiCodes(tempRawOutput, tempCleanOutput);
            
            if (cleaningSuccess) {
                this.showSuccess("ANSI cleaning successful");
            } else {
                this.showWarning("ANSI cleaning failed, using raw output");
                await fs.promises.copyFile(tempRawOutput, tempCleanOutput);
            }

            // Generate final output
            if (options.fullOutput) {
                this.showInfo("📄 Using full output (--full-output specified)");
                await fs.promises.copyFile(tempCleanOutput, finalOutputFile);
            } else {
                this.showInfo("🤖 Optimizing output for AI analysis...");
                await this.createAiOptimizedOutput(tempCleanOutput, tempOptimizedOutput, testArgs.join(' '), testResult.exitCode);
                await fs.promises.copyFile(tempOptimizedOutput, finalOutputFile);
            }

            // Show final report
            const finalContent = await fs.promises.readFile(finalOutputFile, 'utf8');
            this.showFormattedReport(finalContent, finalOutputFile);
            
            // Show statistics
            const stats = fs.statSync(finalOutputFile);
            const lines = finalContent.split('\n').length;
            const sizeKB = Math.round(stats.size / 1024);
            this.showInfo(`Optimized output: ${sizeKB}KB, Lines: ${lines} (${options.fullOutput ? "full" : "optimized"})`);

            // Clean up temporary files
            await this.cleanupTempFiles([tempRawOutput, tempCleanOutput, tempOptimizedOutput]);
            
            const duration = Date.now() - startTime;
            return {
                success: testResult.success,
                exitCode: testResult.exitCode,
                output: finalContent,
                outputFiles: [finalOutputFile],
                duration
            };

        } catch (error) {
            const duration = Date.now() - startTime;
            return {
                success: false,
                exitCode: 1,
                output: "",
                error: error instanceof Error ? error.message : 'Unknown error',
                duration
            };
        }
    }

    private async executeTest(args: string[], outputFile: string): Promise<CommandResult> {
        return new Promise((resolve) => {
            const fullArgs = ['nx', 'test', ...args, '--verbose'];
            const process = spawn('yarn', fullArgs, {
                cwd: this.getWorkspaceRoot(),
                shell: true
            });

            let output = '';
            let errorOutput = '';
            const writeStream = fs.createWriteStream(outputFile);

            process.stdout?.on('data', (data) => {
                const text = data.toString();
                output += text;
                writeStream.write(text);
            });

            process.stderr?.on('data', (data) => {
                const text = data.toString();
                errorOutput += text;
                writeStream.write(text);
            });

            process.on('close', (code) => {
                writeStream.end();
                resolve({
                    success: code === 0,
                    exitCode: code || 0,
                    output,
                    error: errorOutput || undefined,
                    duration: 0
                });
            });

            process.on('error', (error) => {
                writeStream.end();
                resolve({
                    success: false,
                    exitCode: 1,
                    output,
                    error: error.message,
                    duration: 0
                });
            });
        });
    }

    private async cleanAnsiCodes(inputFile: string, outputFile: string): Promise<boolean> {
        try {
            const content = await fs.promises.readFile(inputFile, 'utf8');
            
            // Remove carriage returns and ANSI escape sequences
            const cleaned = content
                .replace(/\r/g, '')
                .replace(/\x1b\[[0-9;]*[mGKHJA-Z]/g, '');
            
            await fs.promises.writeFile(outputFile, cleaned);
            return true;
        } catch (error) {
            return false;
        }
    }

    private async createAiOptimizedOutput(inputFile: string, outputFile: string, testArgs: string, exitCode: number): Promise<void> {
        const content = await fs.promises.readFile(inputFile, 'utf8');
        const lines = content.split('\n');
        
        // Extract key information
        const testCommand = `yarn nx test ${testArgs}`;
        const totalSuites = this.extractPattern(lines, /Test Suites:.*total/) || "";
        const totalTests = this.extractPattern(lines, /Tests:.*total/) || "";
        const testTime = this.extractPattern(lines, /Time:.*s/) || "";
        const failedSuites = this.countMatches(lines, /FAIL.*\.spec\.ts/);
        const passedSuites = this.countMatches(lines, /PASS.*\.spec\.ts/);
        
        let output = `=================================================================
🤖 TEST ANALYSIS REPORT
=================================================================

COMMAND: ${testCommand}
EXIT CODE: ${exitCode}
STATUS: ${exitCode === 0 ? "✅ PASSED" : "❌ FAILED"}

=================================================================
📊 EXECUTIVE SUMMARY
=================================================================
${totalSuites}
${totalTests}
${testTime}
Test Suites: ${passedSuites} passed, ${failedSuites} failed

`;

        // Add failure analysis if tests failed
        if (exitCode !== 0) {
            output += `==================================================================
💥 FAILURE ANALYSIS
==================================================================

`;

            // Extract compilation errors
            if (lines.some(line => line.includes("Test suite failed to run"))) {
                output += `🔥 COMPILATION/RUNTIME ERRORS:
--------------------------------

`;
                
                let inFailedSuite = false;
                for (const line of lines) {
                    if (line.includes("Test suite failed to run")) {
                        inFailedSuite = true;
                        continue;
                    }
                    if (inFailedSuite && line.trim() === "") {
                        inFailedSuite = false;
                        continue;
                    }
                    if (inFailedSuite && (line.includes("error TS") || line.includes("Property") || line.includes("Cannot find") || line.includes("Type") && line.includes("is not assignable"))) {
                        output += `  • ${line.trim()}\n`;
                    }
                }
            }

            // Extract test failures
            if (lines.some(line => line.includes("✕") || line.includes("●") || line.includes("expect"))) {
                output += `
🧪 TEST FAILURES:
-----------------

`;
                
                let currentTest = "";
                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i];
                    if (line.match(/● .*›.*/)) {
                        currentTest = line.trim();
                        const nextLine = lines[i + 1];
                        if (nextLine) {
                            output += `  • ${currentTest}\n`;
                            output += `    ${nextLine.trim()}\n\n`;
                        }
                    }
                }

                // Extract expect() failures
                const expectFailures = lines.filter(line => 
                    line.includes("expect") && (line.includes("toEqual") || line.includes("Expected") || line.includes("Received"))
                );
                
                expectFailures.forEach(failure => {
                    output += `    ${failure.trim()}\n`;
                });
            }
        }

        // Add test results summary
        output += `==================================================================
🧪 TEST RESULTS SUMMARY
==================================================================

`;

        // Extract test suite results
        for (const line of lines) {
            if (line.match(/PASS.*\.spec\.ts/)) {
                const suite = line.replace(/.*PASS +[^ ]+ +/, "").replace(/\([0-9.]+ s\)/, "").trim();
                output += `✅ ${suite}\n`;
            } else if (line.match(/FAIL.*\.spec\.ts/)) {
                const suite = line.replace(/.*FAIL +[^ ]+ +/, "").replace(/\([0-9.]+ s\)/, "").trim();
                output += `❌ ${suite}\n`;
            }
        }

        // Add performance insights
        if (testTime) {
            output += `
==================================================================
⚡ PERFORMANCE INSIGHTS
==================================================================
${testTime}

`;

            // Extract slow tests (>1s)
            const slowTests = lines.filter(line => {
                const match = line.match(/✓.*\(([0-9]+) ms\)/);
                return match && parseInt(match[1]) > 1000;
            });

            slowTests.forEach(test => {
                const cleaned = test.replace(/^[[:space:]]*✓[[:space:]]*/, "").trim();
                output += `🐌 SLOW: ${cleaned}\n`;
            });
        }

        // Add final AI context
        output += `
==================================================================
🎯 AI ANALYSIS CONTEXT
==================================================================
This report focuses on:
• Test failures and their root causes
• Compilation/TypeScript errors
• Performance issues (slow tests)
• Overall test health metrics

Key areas for analysis:
`;

        if (exitCode !== 0) {
            output += `• 🔍 Focus on failure analysis section above
• 🔗 Correlate failures with recent code changes
• 🛠️  Identify patterns in TypeScript errors
`;
        } else {
            output += `• ✅ All tests passing - check for performance optimizations
• 📈 Monitor test execution time trends
`;
        }

        output += `
Original output reduced from ${lines.length} lines to ${output.split('\n').length} lines for AI efficiency.
`;

        await fs.promises.writeFile(outputFile, output);
    }

    private extractPattern(lines: string[], pattern: RegExp): string {
        const match = lines.find(line => pattern.test(line));
        return match ? match.match(pattern)?.[0] || "" : "";
    }

    private countMatches(lines: string[], pattern: RegExp): number {
        return lines.filter(line => pattern.test(line)).length;
    }

    private showFormattedReport(content: string, filePath: string): void {
        this.showInfo(`\n${"=".repeat(60)}`);
        this.showInfo("✅ TEST REPORT");
        this.showInfo(`${"=".repeat(60)}`);
        this.showInfo(content);
        this.showInfo(`${"=".repeat(60)}`);
        this.showInfo(`Report saved to: ${filePath}`);
    }

    private async cleanupTempFiles(files: string[]): Promise<void> {
        for (const file of files) {
            try {
                await fs.promises.unlink(file);
            } catch {
                // File doesn't exist or can't be deleted, ignore
            }
        }
    }

    private getWorkspaceRoot(): string {
        return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
    }

    private showInfo(message: string): void {
        const outputChannel = vscode.window.createOutputChannel('AI Debug Utilities');
        outputChannel.appendLine(message);
        outputChannel.show();
    }

    private showSuccess(message: string): void {
        this.showInfo(`✅ ${message}`);
    }

    private showWarning(message: string): void {
        this.showInfo(`⚠️  ${message}`);
    }

    private showError(message: string): void {
        this.showInfo(`❌ ${message}`);
    }
}
