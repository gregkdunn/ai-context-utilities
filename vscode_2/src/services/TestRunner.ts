import * as vscode from 'vscode';
import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { TestResult } from '../types';

export interface TestExecutionOptions {
  command: string;
  mode: 'project' | 'affected';
  projects?: string[];
  outputCallback?: (output: string) => void;
  saveToFile?: boolean;
  outputDirectory?: string;
}

export class TestRunner {
  private workspacePath: string;
  private currentProcess: ChildProcess | null = null;
  private outputDirectory: string;

  constructor(private context: vscode.ExtensionContext) {
    this.workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
    
    // Get output directory from configuration
    const config = vscode.workspace.getConfiguration('aiDebugContext');
    this.outputDirectory = config.get('outputDirectory', '.github/instructions/ai_utilities_context');
  }

  async executeTests(options: TestExecutionOptions): Promise<{
    results: TestResult[];
    exitCode: number;
    outputFile?: string;
  }> {
    return new Promise((resolve, reject) => {
      const args = this.buildCommandArgs(options);
      
      console.log('Running command:', 'npx', args.join(' '));

      this.currentProcess = spawn('npx', args, {
        cwd: this.workspacePath,
        stdio: 'pipe'
      });

      let output = '';
      let errorOutput = '';
      let outputFile: string | undefined;
      let rawOutputFile: string | undefined;

      // Show initial message
      if (options.outputCallback) {
        options.outputCallback('🚀 Starting test execution...\n');
        options.outputCallback(`📋 Command: ${options.command}\n\n`);
      }

      // Create output file if requested
      if (options.saveToFile) {
        rawOutputFile = this.createOutputFile(options);
        outputFile = rawOutputFile.replace('.log', '-ai-optimized.txt');
      }

      this.currentProcess.stdout?.on('data', (data) => {
        const chunk = data.toString();
        output += chunk;
        
        // Write to raw file if saving
        if (rawOutputFile) {
          this.appendToFile(rawOutputFile, chunk);
        }
        
        // Show minimal progress indicators instead of full raw output
        if (options.outputCallback) {
          if (chunk.includes('PASS') || chunk.includes('FAIL')) {
            // Extract and show test file results
            const cleanChunk = this.cleanAnsiCodes(chunk);
            const passMatch = cleanChunk.match(/PASS.*?([^\s]+\.spec\.ts)/);
            const failMatch = cleanChunk.match(/FAIL.*?([^\s]+\.spec\.ts)/);
            
            if (passMatch) {
              options.outputCallback(`✅ ${passMatch[1]}\n`);
            } else if (failMatch) {
              options.outputCallback(`❌ ${failMatch[1]}\n`);
            }
          } else if (chunk.includes('Test Suites:') || chunk.includes('Time:')) {
            // Show final summary lines
            const cleanChunk = this.cleanAnsiCodes(chunk);
            if (cleanChunk.trim()) {
              options.outputCallback(`📊 ${cleanChunk.trim()}\n`);
            }
          }
        }
        
        console.log('Test output:', chunk);
      });

      this.currentProcess.stderr?.on('data', (data) => {
        const chunk = data.toString();
        errorOutput += chunk;
        
        // Write error to raw file if saving
        if (rawOutputFile) {
          this.appendToFile(rawOutputFile, `[ERROR] ${chunk}`);
        }
        
        // Only show critical errors in real-time, not deprecation warnings
        if (options.outputCallback && !chunk.includes('DeprecationWarning')) {
          const cleanChunk = this.cleanAnsiCodes(chunk);
          if (cleanChunk.includes('FAIL') || cleanChunk.includes('Error') || cleanChunk.includes('Failed')) {
            options.outputCallback(`🔥 ${cleanChunk.trim()}\n`);
          }
        }
        
        console.error('Test error:', chunk);
      });

      this.currentProcess.on('close', async (code) => {
        console.log('Test process finished with code:', code);
        this.currentProcess = null;
        
        const results = this.parseTestResults(output);
        
        // Create  output and stream it to the callback
        try {
          const aiOptimizedContent = this.createAIOptimizedTestOutput(
            output + errorOutput,
            options.command,
            code || 0
          );
          
          // Stream the  output to the callback (for screen display)
          if (options.outputCallback) {
            options.outputCallback('\n\n' + '='.repeat(60) + '\n');
            options.outputCallback('🤖 TEST ANALYSIS\n');
            options.outputCallback('='.repeat(60) + '\n\n');
            options.outputCallback(aiOptimizedContent);
          }
          
          // Save  output to file if requested
          if (outputFile && rawOutputFile) {
            fs.writeFileSync(outputFile, aiOptimizedContent);
            
            if (options.outputCallback) {
              options.outputCallback('\n' + '='.repeat(60) + '\n');
              options.outputCallback(`📁 Report saved to: ${outputFile}\n`);
              options.outputCallback('='.repeat(60) + '\n');
            }
          }
        } catch (error) {
          console.error('Failed to create  output:', error);
          if (options.outputCallback) {
            options.outputCallback(`\n❌ Error creating  output: ${error}\n`);
          }
        }
        
        resolve({
          results,
          exitCode: code || 0,
          outputFile: outputFile || rawOutputFile
        });
      });

      this.currentProcess.on('error', (error) => {
        console.error('Test process error:', error);
        this.currentProcess = null;
        reject(new Error(`Failed to start test process: ${error.message}`));
      });
    });
  }

  /**
   * Execute tests with automatic cleanup of old test output files
   */
  async executeTestsWithCleanup(options: TestExecutionOptions): Promise<{
    results: TestResult[];
    exitCode: number;
    outputFile?: string;
  }> {
    try {
      // Clean up old test output files before generating new ones
      if (options.saveToFile && options.outputCallback) {
        options.outputCallback('Cleaning up old test output files...\n');
        await this.cleanupOldTestOutputFiles(options.outputCallback);
        options.outputCallback('Old test output files cleaned up\n');
      }

      // Execute the tests
      return await this.executeTests(options);
    } catch (error) {
      const errorMessage = `Failed to execute tests with cleanup: ${error}`;
      if (options.outputCallback) {
        options.outputCallback(errorMessage + '\n');
      }
      throw error;
    }
  }

  /**
   * Clean up old test output files before generating a new one
   */
  private async cleanupOldTestOutputFiles(
    outputCallback?: (output: string) => void,
    keepLatest: number = 3
  ): Promise<void> {
    try {
      const testOutputDir = path.join(this.workspacePath, this.outputDirectory);
      
      if (!fs.existsSync(testOutputDir)) {
        outputCallback?.('No test output directory found, nothing to clean up\n');
        return;
      }

      // With static filename, no cleanup needed - file will be overwritten
      const staticFileName = 'test-results.txt';
      const filePath = path.join(testOutputDir, staticFileName);
      
      if (fs.existsSync(filePath)) {
        outputCallback?.('Found existing test-results.txt file (will be overwritten)\n');
      } else {
        outputCallback?.('No existing test output file found\n');
      }
      
    } catch (error) {
      outputCallback?.(`Error during cleanup: ${error}\n`);
      // Don't throw error - cleanup failure shouldn't stop test execution
    }
  }

  /**
   * Clean up all test output files (for manual cleanup)
   */
  async cleanupAllTestOutputFiles(): Promise<{ deleted: number; errors: string[] }> {
    const testOutputDir = path.join(this.workspacePath, this.outputDirectory);
    const result = { deleted: 0, errors: [] as string[] };
    
    if (!fs.existsSync(testOutputDir)) {
      return result;
    }

    try {
      const staticFileName = 'test-results.txt';
      const filePath = path.join(testOutputDir, staticFileName);
      
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
          result.deleted++;
        } catch (error) {
          result.errors.push(`Failed to delete ${staticFileName}: ${error}`);
        }
      }
      
    } catch (error) {
      result.errors.push(`Failed to read test output directory: ${error}`);
    }

    return result;
  }

  /**
   * Get all existing test output files
   */
  async getExistingTestOutputFiles(): Promise<string[]> {
    const testOutputDir = path.join(this.workspacePath, this.outputDirectory);
    
    if (!fs.existsSync(testOutputDir)) {
      return [];
    }

    try {
      const staticFileName = 'test-results.txt';
      const filePath = path.join(testOutputDir, staticFileName);
      return fs.existsSync(filePath) ? [filePath] : [];
    } catch (error) {
      console.error('Failed to read test output directory:', error);
      return [];
    }
  }

  async runAffectedTests(base: string = 'main'): Promise<TestResult[]> {
    const result = await this.executeTestsWithCleanup({
      command: `npx nx affected --target=test --base=${base} --head=HEAD --output-style=stream`,
      mode: 'affected',
      saveToFile: true
    });
    return result.results;
  }

  async runProjectTests(projectName: string): Promise<TestResult[]> {
    const result = await this.executeTestsWithCleanup({
      command: `npx nx test ${projectName}`,
      mode: 'project',
      projects: [projectName],
      saveToFile: true
    });
    return result.results;
  }

  async runMultipleProjectTests(projectNames: string[]): Promise<TestResult[]> {
    const result = await this.executeTestsWithCleanup({
      command: `npx nx run-many --target=test --projects=${projectNames.join(',')}`,
      mode: 'project',
      projects: projectNames,
      saveToFile: true
    });
    return result.results;
  }

  cancelCurrentExecution(): boolean {
    if (this.currentProcess) {
      this.currentProcess.kill('SIGTERM');
      this.currentProcess = null;
      return true;
    }
    return false;
  }

  isExecutionRunning(): boolean {
    return this.currentProcess !== null;
  }

  private parseTestResults(output: string): TestResult[] {
    const results: TestResult[] = [];
    const lines = output.split('\n');

    // Try to parse Jest output format
    // Look for patterns like:
    // ✓ test name (123ms)
    // ✗ test name (456ms)
    const testPattern = /^\s*(✓|✗|○)\s+(.+?)\s+\((\d+)ms\)/;
    
    // Also look for PASS/FAIL patterns
    const suitePattern = /^\s*(PASS|FAIL)\s+(.+\.spec\.(ts|js))/;
    
    let currentFile = '';
    
    for (const line of lines) {
      const suiteMatch = line.match(suitePattern);
      if (suiteMatch) {
        currentFile = suiteMatch[2];
        continue;
      }
      
      const testMatch = line.match(testPattern);
      if (testMatch) {
        const [, status, name, duration] = testMatch;
        results.push({
          name: name.trim(),
          status: this.mapTestStatus(status),
          duration: parseInt(duration, 10),
          file: currentFile || 'unknown'
        });
      }
    }

    // If no individual tests found, create summary results from suite results
    if (results.length === 0) {
      for (const line of lines) {
        const suiteMatch = line.match(suitePattern);
        if (suiteMatch) {
          const [, status, file] = suiteMatch;
          results.push({
            name: `Test suite: ${file}`,
            status: status === 'PASS' ? 'passed' : 'failed',
            duration: 0,
            file: file
          });
        }
      }
    }

    return results;
  }

  private mapTestStatus(status: string): 'passed' | 'failed' | 'skipped' {
    switch (status) {
      case '✓':
        return 'passed';
      case '✗':
        return 'failed';
      case '○':
        return 'skipped';
      default:
        return 'failed';
    }
  }

  getOutputDirectory(): string {
    return path.join(this.workspacePath, this.outputDirectory);
  }

  setOutputDirectory(directory: string): void {
    this.outputDirectory = directory;
  }

  async isNXWorkspace(): Promise<boolean> {
    try {
      const result = await vscode.workspace.findFiles('nx.json', null, 1);
      return result.length > 0;
    } catch {
      return false;
    }
  }

  async openOutputFile(filePath: string): Promise<void> {
    try {
      const uri = vscode.Uri.file(filePath);
      const document = await vscode.workspace.openTextDocument(uri);
      await vscode.window.showTextDocument(document);
    } catch (error) {
      throw new Error(`Failed to open output file: ${error}`);
    }
  }

  async deleteOutputFile(filePath: string): Promise<void> {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      throw new Error(`Failed to delete output file: ${error}`);
    }
  }

  private buildCommandArgs(options: TestExecutionOptions): string[] {
    // Parse the command to extract arguments
    const parts = options.command.replace('npx ', '').split(' ');
    return parts;
  }

  private createOutputFile(options: TestExecutionOptions): string {
    const mode = options.mode;
    const projectPart = options.projects ? options.projects.join('-') : 'affected';
    
    // Use static filename for consistent reference in .git/instructions/copilot-instructions.md
    const fileName = 'test-results.txt';
    const fullPath = path.join(this.workspacePath, this.outputDirectory, fileName);
    
    // Ensure directory exists
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Create the file with initial content including timestamp in content
    const timestamp = new Date().toISOString();
    const initialContent = `Test Execution Log\nGenerated: ${timestamp}\nCommand: ${options.command}\nStarted: ${timestamp}\n\n`;
    fs.writeFileSync(fullPath, initialContent);
    
    return fullPath;
  }

  private appendToFile(filePath: string, content: string): void {
    try {
      fs.appendFileSync(filePath, content);
    } catch (error) {
      console.error('Failed to append to output file:', error);
    }
  }

  /**
   * Create  test output with analysis and context
   */
  private createAIOptimizedTestOutput(rawOutput: string, command: string, exitCode: number): string {
    // Clean ANSI codes from the output
    const cleanOutput = this.cleanAnsiCodes(rawOutput);
    
    // Extract key information from the raw output
    const totalSuites = this.extractPattern(cleanOutput, /Test Suites:.*total/, 'Test Suites: unknown');
    const totalTests = this.extractPattern(cleanOutput, /Tests:.*total/, 'Tests: unknown');
    const testTime = this.extractPattern(cleanOutput, /Time:.*s/, 'Time: unknown');
    const failedSuites = (cleanOutput.match(/FAIL.*\.spec\.ts/g) || []).length;
    const passedSuites = (cleanOutput.match(/PASS.*\.spec\.ts/g) || []).length;
    
    let output = '';
    
    // Header
    output += '=================================================================\n';
    output += '🤖 TEST REPORT\n';
    output += '=================================================================\n\n';
    output += `COMMAND: ${command}\n`;
    output += `EXIT CODE: ${exitCode}\n`;
    output += `STATUS: ${exitCode === 0 ? '✅ PASSED' : '❌ FAILED'}\n\n`;
    
    // Executive Summary
    output += '=================================================================\n';
    output += '📊 EXECUTIVE SUMMARY\n';
    output += '=================================================================\n';
    output += `${totalSuites}\n`;
    output += `${totalTests}\n`;
    output += `${testTime}\n`;
    output += `Test Suites: ${passedSuites} passed, ${failedSuites} failed\n\n`;
    
    // Failure Analysis
    if (exitCode !== 0) {
      output += '==================================================================\n';
      output += '💥 FAILURE ANALYSIS\n';
      output += '==================================================================\n\n';
      
      // Extract compilation errors
      if (cleanOutput.includes('Test suite failed to run')) {
        output += '🔥 COMPILATION/RUNTIME ERRORS:\n';
        output += '--------------------------------\n';
        
        const errorLines = this.extractCompilationErrors(cleanOutput);
        errorLines.forEach(line => {
          output += `  • ${line}\n`;
        });
        output += '\n';
      }
      
      // Extract test failures
      const testFailures = this.extractTestFailures(cleanOutput);
      if (testFailures.length > 0) {
        output += '🧪 TEST FAILURES:\n';
        output += '-----------------\n';
        testFailures.forEach(failure => {
          output += `  • ${failure.test}\n`;
          if (failure.reason) {
            output += `    ${failure.reason}\n`;
          }
          output += '\n';
        });
      }
    }
    
    // Test Results Summary
    output += '==================================================================\n';
    output += '🧪 TEST RESULTS SUMMARY\n';
    output += '==================================================================\n';
    
    const testSuiteResults = this.extractTestSuiteResults(cleanOutput);
    testSuiteResults.forEach(result => {
      output += `${result.passed ? '✅' : '❌'} ${result.file}\n`;
    });
    
    // Performance Insights
    if (testTime !== 'Time: unknown') {
      output += '\n==================================================================\n';
      output += '⚡ PERFORMANCE INSIGHTS\n';
      output += '==================================================================\n';
      output += `${testTime}\n`;
      
      const slowTests = this.extractSlowTests(cleanOutput);
      slowTests.forEach(test => {
        output += `🐌 SLOW: ${test}\n`;
      });
    }
    
    // AI Analysis Context
    output += '\n==================================================================\n';
    output += '🎯 AI ANALYSIS CONTEXT\n';
    output += '==================================================================\n';
    output += 'This report focuses on:\n';
    output += '• Test failures and their root causes\n';
    output += '• Compilation/TypeScript errors\n';
    output += '• Performance issues (slow tests)\n';
    output += '• Overall test health metrics\n\n';
    output += 'Key areas for analysis:\n';
    
    if (exitCode !== 0) {
      output += '• 🔍 Focus on failure analysis section above\n';
      output += '• 🔗 Correlate failures with recent code changes\n';
      output += '• 🛠️  Identify patterns in TypeScript errors\n';
    } else {
      output += '• ✅ All tests passing - check for performance optimizations\n';
      output += '• 📈 Monitor test execution time trends\n';
    }
    
    output += '\n';
    const originalLines = cleanOutput.split('\n').length;
    const optimizedLines = output.split('\n').length;
    output += `Original output reduced from ${originalLines} lines to ${optimizedLines} lines for AI efficiency.\n`;
    
    return output;
  }

  /**
   * Clean ANSI escape codes from output
   */
  private cleanAnsiCodes(text: string): string {
    // Remove ANSI escape sequences
    return text
      .replace(/\x1b\[[0-9;]*[mGKHJA-Z]/g, '')
      .replace(/\r/g, '');
  }

  /**
   * Extract pattern from text with fallback
   */
  private extractPattern(text: string, pattern: RegExp, fallback: string): string {
    const match = text.match(pattern);
    return match ? match[0] : fallback;
  }

  /**
   * Extract compilation/TypeScript errors
   */
  private extractCompilationErrors(text: string): string[] {
    const errors: string[] = [];
    const lines = text.split('\n');
    
    let inErrorSection = false;
    for (const line of lines) {
      if (line.includes('Test suite failed to run')) {
        inErrorSection = true;
        continue;
      }
      
      if (inErrorSection && line.trim() === '') {
        inErrorSection = false;
        continue;
      }
      
      if (inErrorSection) {
        if (line.match(/error TS\d+/) || 
            line.includes('Property') && line.includes('does not exist') ||
            line.includes('Cannot find') ||
            line.includes('Type') && line.includes('is not assignable')) {
          errors.push(line.trim());
        }
      }
    }
    
    return errors;
  }

  /**
   * Extract test failures with context
   */
  private extractTestFailures(text: string): Array<{ test: string; reason?: string }> {
    const failures: Array<{ test: string; reason?: string }> = [];
    const lines = text.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Match test failure patterns
      if (line.match(/● .*›.*/)) {
        const test = line.trim();
        let reason = '';
        
        // Look for the next line as the failure reason
        if (i + 1 < lines.length && lines[i + 1].trim()) {
          reason = lines[i + 1].trim();
        }
        
        failures.push({ test, reason });
      }
    }
    
    return failures;
  }

  /**
   * Extract test suite results
   */
  private extractTestSuiteResults(text: string): Array<{ file: string; passed: boolean }> {
    const results: Array<{ file: string; passed: boolean }> = [];
    const lines = text.split('\n');
    
    for (const line of lines) {
      const passMatch = line.match(/PASS.*?([^\s]+\.spec\.ts)/);
      if (passMatch) {
        results.push({ file: passMatch[1], passed: true });
        continue;
      }
      
      const failMatch = line.match(/FAIL.*?([^\s]+\.spec\.ts)/);
      if (failMatch) {
        results.push({ file: failMatch[1], passed: false });
      }
    }
    
    return results;
  }

  /**
   * Extract slow tests (>10ms)
   */
  private extractSlowTests(text: string): string[] {
    const slowTests: string[] = [];
    const lines = text.split('\n');
    
    for (const line of lines) {
      // Match test execution patterns with timing
      const match = line.match(/✓\s+(.+?)\s+\((\d+)\s*ms\)/);
      if (match) {
        const [, testName, duration] = match;
        const ms = parseInt(duration, 10);
        
        // Consider tests > 10ms as slow for reporting
        if (ms > 10) {
          slowTests.push(`${testName} (${ms} ms)`);
        }
      }
    }
    
    return slowTests;
  }
}