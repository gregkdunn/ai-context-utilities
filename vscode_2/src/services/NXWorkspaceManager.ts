import { spawn } from 'child_process';
import * as vscode from 'vscode';
import * as path from 'path';
import { existsSync } from 'fs';
import { NXProject, TestResult } from '../types';

export class NXWorkspaceManager {
  private workspacePath: string;
  private projects: Map<string, NXProject> = new Map();

  constructor(private context: vscode.ExtensionContext) {
    this.workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
    this.detectNXWorkspace();
  }

  private async detectNXWorkspace(): Promise<boolean> {
    const nxJsonPath = path.join(this.workspacePath, 'nx.json');
    const workspaceJsonPath = path.join(this.workspacePath, 'workspace.json');
    
    return existsSync(nxJsonPath) || existsSync(workspaceJsonPath);
  }

  async isNXWorkspace(): Promise<boolean> {
    return await this.detectNXWorkspace();
  }

  async listProjects(): Promise<NXProject[]> {
    return new Promise((resolve, reject) => {
      const process = spawn('npx', ['nx', 'show', 'projects', '--json'], {
        cwd: this.workspacePath,
        stdio: 'pipe'
      });

      let output = '';
      let errorOutput = '';

      process.stdout.on('data', (data) => output += data.toString());
      process.stderr.on('data', (data) => errorOutput += data.toString());

      process.on('close', async (code) => {
        if (code === 0) {
          try {
            const projectNames = JSON.parse(output);
            const projects = await Promise.all(
              projectNames.map((name: string) => this.getProjectConfig(name))
            );
            resolve(projects.filter(p => p !== null) as NXProject[]);
          } catch (error) {
            reject(new Error(`Failed to parse project list: ${error}`));
          }
        } else {
          reject(new Error(`NX command failed: ${errorOutput || 'Unknown error'}`));
        }
      });

      process.on('error', (error) => {
        reject(new Error(`Failed to execute NX command: ${error.message}`));
      });
    });
  }

  private async getProjectConfig(projectName: string): Promise<NXProject | null> {
    return new Promise((resolve) => {
      const process = spawn('npx', ['nx', 'show', 'project', projectName, '--json'], {
        cwd: this.workspacePath,
        stdio: 'pipe'
      });

      let output = '';
      process.stdout.on('data', (data) => output += data.toString());

      process.on('close', (code) => {
        if (code === 0) {
          try {
            const config = JSON.parse(output);
            resolve({
              name: projectName,
              type: config.projectType || 'library',
              root: config.root || '',
              sourceRoot: config.sourceRoot,
              targets: config.targets
            });
          } catch {
            resolve(null);
          }
        } else {
          resolve(null);
        }
      });

      process.on('error', () => resolve(null));
    });
  }

  async runProjectTests(projectName: string): Promise<TestResult[]> {
    return this.executeTestCommand(['nx', 'test', projectName]);
  }

  async runAffectedTests(base: string = 'main'): Promise<TestResult[]> {
    const baseBranch = vscode.workspace.getConfiguration('aiDebugContext').get<string>('nxBaseBranch') || base;
    return this.executeTestCommand([
      'nx', 'affected',
      '--target=test',
      `--base=${baseBranch}`,
      '--head=HEAD'
    ]);
  }

  private executeTestCommand(args: string[]): Promise<TestResult[]> {
    return new Promise((resolve, reject) => {
      const process = spawn('npx', args, {
        cwd: this.workspacePath,
        stdio: 'pipe'
      });

      let output = '';
      let errorOutput = '';

      process.stdout.on('data', (data) => {
        const chunk = data.toString();
        output += chunk;
        // Stream output to webview for real-time updates
        this.streamTestOutput(chunk);
      });

      process.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      process.on('close', (code) => {
        const results = this.parseTestResults(output, errorOutput);
        resolve(results);
      });

      process.on('error', (error) => {
        reject(new Error(`Failed to execute test command: ${error.message}`));
      });
    });
  }

  private streamTestOutput(output: string) {
    // This will be called by the webview provider to stream real-time updates
    // For now, we'll just log it
    console.log('Test output:', output);
  }

  private parseTestResults(output: string, errorOutput: string): TestResult[] {
    const results: TestResult[] = [];
    
    try {
      // Parse Jest output format
      const lines = output.split('\n');
      
      // Look for test result patterns
      const testPattern = /^\s*(✓|✗|○)\s+(.+?)\s+\((\d+)\s*ms\)/;
      const failurePattern = /^\s*●\s+(.+)/;
      
      let currentFile = '';
      const filePattern = /^\s*(.+\.spec\.(ts|js))/;
      
      for (const line of lines) {
        const fileMatch = line.match(filePattern);
        if (fileMatch) {
          currentFile = fileMatch[1];
          continue;
        }
        
        const testMatch = line.match(testPattern);
        if (testMatch) {
          const [, status, name, duration] = testMatch;
          results.push({
            name: name.trim(),
            status: status === '✓' ? 'passed' : status === '✗' ? 'failed' : 'skipped',
            duration: parseInt(duration),
            file: currentFile || 'unknown'
          });
        }
      }
      
      // Parse failures for error details
      if (errorOutput) {
        this.parseFailureDetails(results, errorOutput);
      }
      
    } catch (error) {
      console.error('Failed to parse test results:', error);
    }
    
    return results;
  }

  private parseFailureDetails(results: TestResult[], errorOutput: string) {
    // Parse error details from Jest output
    const failedTests = results.filter(r => r.status === 'failed');
    const errorLines = errorOutput.split('\n');
    
    // This is a simplified parser - in practice, you'd want more robust parsing
    for (const test of failedTests) {
      for (let i = 0; i < errorLines.length; i++) {
        if (errorLines[i].includes(test.name)) {
          // Look for error message in subsequent lines
          let errorMessage = '';
          let stackTrace = '';
          
          for (let j = i + 1; j < errorLines.length && j < i + 10; j++) {
            const line = errorLines[j];
            if (line.includes('Error:') || line.includes('Expected:')) {
              errorMessage = line.trim();
            }
            if (line.includes('at ')) {
              stackTrace += line.trim() + '\n';
            }
          }
          
          test.error = errorMessage;
          test.stackTrace = stackTrace;
          break;
        }
      }
    }
  }

  async getAffectedProjects(base: string = 'main'): Promise<string[]> {
    return new Promise((resolve, reject) => {
      const baseBranch = vscode.workspace.getConfiguration('aiDebugContext').get<string>('nxBaseBranch') || base;
      
      const process = spawn('npx', ['nx', 'show', 'projects', '--affected', `--base=${baseBranch}`], {
        cwd: this.workspacePath,
        stdio: 'pipe'
      });

      let output = '';
      process.stdout.on('data', (data) => output += data.toString());

      process.on('close', (code) => {
        if (code === 0) {
          try {
            const projects = output.trim().split('\n').filter(p => p.trim().length > 0);
            resolve(projects);
          } catch (error) {
            resolve([]);
          }
        } else {
          resolve([]);
        }
      });

      process.on('error', () => resolve([]));
    });
  }

  getWorkspacePath(): string {
    return this.workspacePath;
  }
}
