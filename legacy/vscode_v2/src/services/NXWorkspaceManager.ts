import { spawn } from 'child_process';
import * as vscode from 'vscode';
import * as path from 'path';
import { existsSync } from 'fs';
import { NXProject, TestResult } from '../types';

interface ProjectCache {
  projects: NXProject[];
  lastUpdated: number;
  affectedProjects: string[];
  affectedLastUpdated: number;
}

export class NXWorkspaceManager {
  private workspacePath: string;
  private projects: Map<string, NXProject> = new Map();
  private projectCache: ProjectCache | null = null;
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes
  private isInitializing = false;
  private initializationPromise: Promise<void> | null = null;

  constructor(private context: vscode.ExtensionContext) {
    this.workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
    this.detectNXWorkspace();
    
    // Initialize project cache on startup
    this.initializeProjectCache();
  }

  private async detectNXWorkspace(): Promise<boolean> {
    const nxJsonPath = path.join(this.workspacePath, 'nx.json');
    const workspaceJsonPath = path.join(this.workspacePath, 'workspace.json');
    
    return existsSync(nxJsonPath) || existsSync(workspaceJsonPath);
  }

  async isNXWorkspace(): Promise<boolean> {
    return await this.detectNXWorkspace();
  }

  /**
   * Initialize project cache on extension startup
   */
  private async initializeProjectCache(): Promise<void> {
    if (this.isInitializing || this.initializationPromise) {
      return this.initializationPromise || Promise.resolve();
    }

    this.isInitializing = true;
    
    this.initializationPromise = (async () => {
      try {
        console.log('🚀 Initializing NX project cache...');
        
        // Check if this is an NX workspace first
        const isNX = await this.detectNXWorkspace();
        if (!isNX) {
          console.log('📝 Not an NX workspace, skipping project cache initialization');
          return;
        }

        // Load projects in the background
        const startTime = Date.now();
        const projects = await this.loadProjectsFromNX();
        
        this.projectCache = {
          projects,
          lastUpdated: Date.now(),
          affectedProjects: [],
          affectedLastUpdated: 0
        };
        
        // Update the projects map for backward compatibility
        this.projects.clear();
        projects.forEach(project => {
          this.projects.set(project.name, project);
        });
        
        const duration = Date.now() - startTime;
        console.log(`✅ NX project cache initialized with ${projects.length} projects in ${duration}ms`);
        
        // Load affected projects in background
        this.updateAffectedProjectsCache();
        
      } catch (error) {
        console.error('❌ Failed to initialize NX project cache:', error);
        // Don't throw - extension should still work without cache
      } finally {
        this.isInitializing = false;
      }
    })();

    return this.initializationPromise;
  }

  /**
   * Wait for cache initialization to complete
   */
  async waitForInitialization(): Promise<void> {
    if (this.initializationPromise) {
      await this.initializationPromise;
    }
  }

  /**
   * Check if cache is valid and not expired
   */
  private isCacheValid(): boolean {
    if (!this.projectCache) {
      return false;
    }
    
    const now = Date.now();
    return (now - this.projectCache.lastUpdated) < this.cacheTimeout;
  }

  /**
   * Check if affected projects cache is valid
   */
  private isAffectedCacheValid(): boolean {
    if (!this.projectCache || !this.projectCache.affectedProjects.length) {
      return false;
    }
    
    const now = Date.now();
    return (now - this.projectCache.affectedLastUpdated) < this.cacheTimeout;
  }

  async listProjects(): Promise<NXProject[]> {
    // Try to use cache first
    if (this.isCacheValid()) {
      console.log('📋 Using cached NX projects');
      return this.projectCache!.projects;
    }

    // Wait for initialization if it's still in progress
    await this.waitForInitialization();
    
    // Check cache again after waiting for initialization
    if (this.isCacheValid()) {
      console.log('📋 Using cached NX projects (after initialization)');
      return this.projectCache!.projects;
    }

    // Fall back to loading projects fresh
    console.log('🔄 Cache expired or invalid, refreshing NX projects...');
    return await this.refreshProjectCache();
  }

  /**
   * Load projects directly from NX (used internally)
   */
  private async loadProjectsFromNX(): Promise<NXProject[]> {
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

  /**
   * Refresh the project cache with fresh data from NX
   */
  async refreshProjectCache(): Promise<NXProject[]> {
    try {
      const projects = await this.loadProjectsFromNX();
      
      this.projectCache = {
        projects,
        lastUpdated: Date.now(),
        affectedProjects: this.projectCache?.affectedProjects || [],
        affectedLastUpdated: this.projectCache?.affectedLastUpdated || 0
      };
      
      // Update the projects map for backward compatibility
      this.projects.clear();
      projects.forEach(project => {
        this.projects.set(project.name, project);
      });
      
      console.log(`✅ NX project cache refreshed with ${projects.length} projects`);
      return projects;
    } catch (error) {
      console.error('❌ Failed to refresh NX project cache:', error);
      // Return cached projects if available, otherwise empty array
      return this.projectCache?.projects || [];
    }
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
    // Try to use cache first
    if (this.isAffectedCacheValid()) {
      console.log('📋 Using cached affected projects');
      return this.projectCache!.affectedProjects;
    }

    // Load affected projects fresh
    console.log('🔄 Refreshing affected projects...');
    return await this.updateAffectedProjectsCache(base);
  }

  /**
   * Update the affected projects cache
   */
  private async updateAffectedProjectsCache(base: string = 'main'): Promise<string[]> {
    return new Promise((resolve) => {
      const baseBranch = vscode.workspace.getConfiguration('aiDebugContext').get<string>('nxBaseBranch') || base;
      
      const process = spawn('npx', ['nx', 'show', 'projects', '--affected', `--base=${baseBranch}`], {
        cwd: this.workspacePath,
        stdio: 'pipe'
      });

      let output = '';
      process.stdout.on('data', (data) => output += data.toString());

      process.on('close', (code) => {
        let affectedProjects: string[] = [];
        
        if (code === 0) {
          try {
            affectedProjects = output.trim().split('\n').filter(p => p.trim().length > 0);
          } catch (error) {
            console.error('Failed to parse affected projects:', error);
          }
        }

        // Update cache
        if (this.projectCache) {
          this.projectCache.affectedProjects = affectedProjects;
          this.projectCache.affectedLastUpdated = Date.now();
        }

        console.log(`✅ Affected projects cache updated with ${affectedProjects.length} projects`);
        resolve(affectedProjects);
      });

      process.on('error', (error) => {
        console.error('Failed to get affected projects:', error);
        resolve([]);
      });
    });
  }

  getWorkspacePath(): string {
    return this.workspacePath;
  }

  /**
   * Check if projects are cached and ready
   */
  isProjectsCached(): boolean {
    return this.isCacheValid();
  }

  /**
   * Get cache status for debugging
   */
  getCacheStatus(): {
    isValid: boolean;
    projectCount: number;
    lastUpdated: number | null;
    affectedCount: number;
    affectedLastUpdated: number | null;
    isInitializing: boolean;
  } {
    return {
      isValid: this.isCacheValid(),
      projectCount: this.projectCache?.projects.length || 0,
      lastUpdated: this.projectCache?.lastUpdated || null,
      affectedCount: this.projectCache?.affectedProjects.length || 0,
      affectedLastUpdated: this.projectCache?.affectedLastUpdated || null,
      isInitializing: this.isInitializing
    };
  }

  /**
   * Force refresh of all cached data
   */
  async refreshCache(): Promise<void> {
    console.log('🔄 Force refreshing NX project cache...');
    await this.refreshProjectCache();
    await this.updateAffectedProjectsCache();
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    console.log('🗑️  Clearing NX project cache...');
    this.projectCache = null;
    this.projects.clear();
  }
}
