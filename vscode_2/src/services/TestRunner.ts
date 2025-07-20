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

      // Create output file if requested
      if (options.saveToFile) {
        outputFile = this.createOutputFile(options);
      }

      this.currentProcess.stdout?.on('data', (data) => {
        const chunk = data.toString();
        output += chunk;
        
        // Write to file if saving
        if (outputFile) {
          this.appendToFile(outputFile, chunk);
        }
        
        // Call output callback for real-time streaming
        if (options.outputCallback) {
          options.outputCallback(chunk);
        }
        
        console.log('Test output:', chunk);
      });

      this.currentProcess.stderr?.on('data', (data) => {
        const chunk = data.toString();
        errorOutput += chunk;
        
        // Write error to file if saving
        if (outputFile) {
          this.appendToFile(outputFile, `[ERROR] ${chunk}`);
        }
        
        // Call output callback for errors too
        if (options.outputCallback) {
          options.outputCallback(`[ERROR] ${chunk}`);
        }
        
        console.error('Test error:', chunk);
      });

      this.currentProcess.on('close', (code) => {
        console.log('Test process finished with code:', code);
        this.currentProcess = null;
        
        const results = this.parseTestResults(output);
        
        resolve({
          results,
          exitCode: code || 0,
          outputFile
        });
      });

      this.currentProcess.on('error', (error) => {
        console.error('Test process error:', error);
        this.currentProcess = null;
        reject(new Error(`Failed to start test process: ${error.message}`));
      });
    });
  }

  async runAffectedTests(base: string = 'main'): Promise<TestResult[]> {
    const result = await this.executeTests({
      command: `npx nx affected --target=test --base=${base} --head=HEAD --output-style=stream`,
      mode: 'affected'
    });
    return result.results;
  }

  async runProjectTests(projectName: string): Promise<TestResult[]> {
    const result = await this.executeTests({
      command: `npx nx test ${projectName}`,
      mode: 'project',
      projects: [projectName]
    });
    return result.results;
  }

  async runMultipleProjectTests(projectNames: string[]): Promise<TestResult[]> {
    const result = await this.executeTests({
      command: `npx nx run-many --target=test --projects=${projectNames.join(',')}`,
      mode: 'project',
      projects: projectNames
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
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const mode = options.mode;
    const projectPart = options.projects ? options.projects.join('-') : 'affected';
    
    const fileName = `test-output-${mode}-${projectPart}-${timestamp}.log`;
    const fullPath = path.join(this.workspacePath, this.outputDirectory, fileName);
    
    // Ensure directory exists
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Create the file with initial content
    const initialContent = `Test Execution Log\nCommand: ${options.command}\nStarted: ${new Date().toISOString()}\n\n`;
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
}