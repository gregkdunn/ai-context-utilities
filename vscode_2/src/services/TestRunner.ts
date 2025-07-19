import * as vscode from 'vscode';
import { spawn } from 'child_process';
import { TestResult } from '../types';

export class TestRunner {
  private workspacePath: string;

  constructor(private context: vscode.ExtensionContext) {
    this.workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
  }

  async runAffectedTests(base: string = 'main'): Promise<TestResult[]> {
    return new Promise((resolve, reject) => {
      const args = [
        'nx', 'affected',
        '--target=test',
        `--base=${base}`,
        '--head=HEAD',
        '--output-style=stream'
      ];

      console.log('Running command:', 'npx', args.join(' '));

      const process = spawn('npx', args, {
        cwd: this.workspacePath,
        stdio: 'pipe'
      });

      let output = '';
      let errorOutput = '';

      process.stdout.on('data', (data) => {
        output += data.toString();
        console.log('Test output:', data.toString());
      });

      process.stderr.on('data', (data) => {
        errorOutput += data.toString();
        console.error('Test error:', data.toString());
      });

      process.on('close', (code) => {
        console.log('Test process finished with code:', code);
        
        if (code === 0) {
          const results = this.parseTestResults(output);
          resolve(results);
        } else {
          // Even if exit code is non-zero, try to parse results as some tests might have run
          const results = this.parseTestResults(output);
          if (results.length > 0) {
            resolve(results);
          } else {
            reject(new Error(`Test execution failed with code ${code}: ${errorOutput}`));
          }
        }
      });

      process.on('error', (error) => {
        console.error('Test process error:', error);
        reject(new Error(`Failed to start test process: ${error.message}`));
      });
    });
  }

  async runProjectTests(projectName: string): Promise<TestResult[]> {
    return new Promise((resolve, reject) => {
      const args = ['nx', 'test', projectName];

      console.log('Running command:', 'npx', args.join(' '));

      const process = spawn('npx', args, {
        cwd: this.workspacePath,
        stdio: 'pipe'
      });

      let output = '';
      let errorOutput = '';

      process.stdout.on('data', (data) => {
        output += data.toString();
      });

      process.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      process.on('close', (code) => {
        console.log('Test process finished with code:', code);
        
        const results = this.parseTestResults(output);
        if (results.length > 0 || code === 0) {
          resolve(results);
        } else {
          reject(new Error(`Test execution failed with code ${code}: ${errorOutput}`));
        }
      });

      process.on('error', (error) => {
        reject(new Error(`Failed to start test process: ${error.message}`));
      });
    });
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

  async isNXWorkspace(): Promise<boolean> {
    try {
      const result = await vscode.workspace.findFiles('nx.json', null, 1);
      return result.length > 0;
    } catch {
      return false;
    }
  }
}