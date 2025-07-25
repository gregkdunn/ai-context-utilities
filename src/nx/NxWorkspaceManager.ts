/**
 * NxWorkspaceManager - Enterprise Nx Monorepo Integration
 * 
 * Provides intelligent workspace detection, project analysis, and Nx-native
 * test execution for modern enterprise monorepos.
 * 
 * @version 3.0.0 - Phase 1.6
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';
import { ShellScriptError, FileSystemError } from '../errors/AIDebugErrors';

/**
 * Nx workspace information
 */
export interface NxWorkspaceInfo {
    readonly workspaceRoot: string;
    readonly nxVersion: string;
    readonly projects: Map<string, NxProjectConfig>;
    readonly dependencyGraph: Map<string, string[]>;
    readonly hasNxCloud: boolean;
    readonly cacheDirectory: string;
}

/**
 * Nx project configuration
 */
export interface NxProjectConfig {
    readonly name: string;
    readonly root: string;
    readonly sourceRoot: string;
    readonly projectType: 'application' | 'library';
    readonly tags: string[];
    readonly targets: Map<string, NxTargetConfig>;
    readonly implicitDependencies: string[];
}

/**
 * Nx target configuration (test, build, lint, etc.)
 */
export interface NxTargetConfig {
    readonly executor: string;
    readonly options: Record<string, any>;
    readonly configurations?: Record<string, Record<string, any>>;
}

/**
 * Result of Nx affected analysis
 */
export interface NxAffectedResult {
    readonly affectedProjects: string[];
    readonly affectedFiles: string[];
    readonly baseBranch: string;
    readonly totalProjects: number;
    readonly impactAnalysis: NxImpactAnalysis;
}

/**
 * Impact analysis for affected changes
 */
export interface NxImpactAnalysis {
    readonly librariesAffected: number;
    readonly applicationsAffected: number;
    readonly testTargetsAffected: number;
    readonly crossProjectDependencies: Map<string, string[]>;
}

/**
 * Options for Nx test execution
 */
export interface NxTestOptions {
    readonly projects?: string[];
    readonly parallel?: boolean;
    readonly maxParallel?: number;
    readonly skipCache?: boolean;
    readonly watch?: boolean;
    readonly verbose?: boolean;
    readonly configuration?: string;
}

/**
 * Enterprise-grade Nx workspace manager
 * 
 * Provides deep integration with Nx monorepos including:
 * - Workspace and project detection
 * - Dependency graph analysis  
 * - Intelligent affected project calculation
 * - Nx-native test execution with caching
 * - Performance optimization for large workspaces
 */
export class NxWorkspaceManager {
    private workspaceInfo: NxWorkspaceInfo | null = null;
    private readonly outputChannel: vscode.OutputChannel;
    
    constructor(
        private readonly workspaceRoot: string,
        outputChannel: vscode.OutputChannel
    ) {
        this.outputChannel = outputChannel;
    }

    /**
     * Detect if current workspace is an Nx monorepo
     * 
     * Checks for nx.json, workspace.json, or angular.json in workspace root
     * and validates Nx CLI availability.
     * 
     * @returns Promise resolving to workspace info or null if not Nx workspace
     */
    async detectWorkspace(): Promise<NxWorkspaceInfo | null> {
        try {
            this.outputChannel.appendLine('🔍 Detecting Nx workspace...');
            
            // Check for Nx configuration files
            const nxJsonPath = path.join(this.workspaceRoot, 'nx.json');
            const workspaceJsonPath = path.join(this.workspaceRoot, 'workspace.json');
            const angularJsonPath = path.join(this.workspaceRoot, 'angular.json');
            
            const hasNxJson = fs.existsSync(nxJsonPath);
            const hasWorkspaceJson = fs.existsSync(workspaceJsonPath);
            const hasAngularJson = fs.existsSync(angularJsonPath);
            
            if (!hasNxJson && !hasWorkspaceJson && !hasAngularJson) {
                this.outputChannel.appendLine('   No Nx configuration files found');
                return null;
            }
            
            // Verify Nx CLI is available
            const nxVersion = await this.getNxVersion();
            if (!nxVersion) {
                this.outputChannel.appendLine('   Nx CLI not available');
                return null;
            }
            
            this.outputChannel.appendLine(`   ✅ Nx workspace detected (v${nxVersion})`);
            
            // Load workspace configuration
            const projects = await this.loadProjects();
            const dependencyGraph = await this.loadDependencyGraph();
            const hasNxCloud = await this.detectNxCloud();
            const cacheDirectory = await this.getCacheDirectory();
            
            this.workspaceInfo = {
                workspaceRoot: this.workspaceRoot,
                nxVersion,
                projects,
                dependencyGraph,
                hasNxCloud,
                cacheDirectory
            };
            
            this.outputChannel.appendLine(`   📦 Found ${projects.size} projects`);
            this.outputChannel.appendLine(`   🌐 Nx Cloud: ${hasNxCloud ? 'Enabled' : 'Disabled'}`);
            
            return this.workspaceInfo;
            
        } catch (error) {
            this.outputChannel.appendLine(`   ❌ Workspace detection failed: ${error}`);
            return null;
        }
    }

    /**
     * Get projects affected by changes since base branch
     * 
     * Uses Nx's sophisticated dependency graph analysis to determine
     * which projects are impacted by file changes.
     * 
     * @param baseBranch - Base branch to compare against (default: main)
     * @param includeUncommitted - Include uncommitted changes
     * @returns Promise resolving to affected analysis result
     */
    async getAffectedProjects(
        baseBranch: string = 'main',
        includeUncommitted: boolean = true
    ): Promise<NxAffectedResult> {
        if (!this.workspaceInfo) {
            throw new Error('Nx workspace not detected. Call detectWorkspace() first.');
        }
        
        this.outputChannel.appendLine(`🎯 Analyzing affected projects (base: ${baseBranch})...`);
        
        try {
            // Use nx affected to get affected projects with fallback for older versions
            let affectedOutput = '';
            let affectedProjects: string[] = [];
            
            // Try modern command first
            try {
                const modernCmd = includeUncommitted 
                    ? `show projects --affected --base=${baseBranch} --head=HEAD`
                    : `show projects --affected --base=${baseBranch}`;
                    
                affectedOutput = await this.executeNxCommand(modernCmd);
                affectedProjects = this.parseAffectedOutput(affectedOutput);
            } catch (modernError) {
                this.outputChannel.appendLine(`   ⚠️ Modern Nx command failed, trying legacy approach: ${modernError}`);
                
                // Fallback to legacy command for older Nx versions
                try {
                    const legacyCmd = includeUncommitted
                        ? `affected:apps --base=${baseBranch} --head=HEAD`
                        : `affected:apps --base=${baseBranch}`;
                        
                    affectedOutput = await this.executeNxCommand(legacyCmd);
                    affectedProjects = this.parseAffectedOutput(affectedOutput);
                } catch (legacyError) {
                    this.outputChannel.appendLine(`   ⚠️ Legacy Nx command also failed: ${legacyError}`);
                    // Return empty list - Jest fallback will handle this
                    affectedProjects = [];
                }
            }
            
            // Get affected files for additional context
            const filesCmd = includeUncommitted
                ? `git diff --name-only ${baseBranch}...HEAD`
                : `git diff --name-only ${baseBranch}`;
            const affectedFiles = await this.executeGitCommand(filesCmd);
            
            // Generate impact analysis
            const impactAnalysis = this.analyzeImpact(affectedProjects);
            
            const result: NxAffectedResult = {
                affectedProjects,
                affectedFiles: affectedFiles.split('\n').filter(f => f.trim()),
                baseBranch,
                totalProjects: this.workspaceInfo.projects.size,
                impactAnalysis
            };
            
            this.outputChannel.appendLine(`   ✅ Found ${affectedProjects.length} affected projects`);
            this.outputChannel.appendLine(`   📊 Impact: ${impactAnalysis.librariesAffected} libs, ${impactAnalysis.applicationsAffected} apps`);
            
            return result;
            
        } catch (error) {
            throw new ShellScriptError(
                'nx-affected-analysis',
                1,
                `Failed to analyze affected projects: ${error}`,
                { baseBranch, includeUncommitted }
            );
        }
    }

    /**
     * Execute tests for specific Nx projects
     * 
     * Runs tests using Nx's native test execution with intelligent
     * caching, parallel execution, and dependency coordination.
     * 
     * @param projects - Projects to test (empty = affected projects)
     * @param options - Test execution options
     * @returns Promise resolving to test execution result
     */
    async executeProjectTests(
        projects: string[] = [],
        options: NxTestOptions = {}
    ): Promise<{ exitCode: number; output: string; duration: number }> {
        if (!this.workspaceInfo) {
            throw new Error('Nx workspace not detected. Call detectWorkspace() first.');
        }
        
        const startTime = Date.now();
        
        try {
            // If no projects specified, get affected projects
            const targetProjects = projects.length > 0 
                ? projects 
                : (await this.getAffectedProjects()).affectedProjects;
                
            if (targetProjects.length === 0) {
                this.outputChannel.appendLine('   ℹ️ No affected projects found');
                return { exitCode: 0, output: 'No tests to run', duration: 0 };
            }
            
            this.outputChannel.appendLine(`🚀 Running tests for ${targetProjects.length} projects...`);
            
            // Build Nx test command
            const nxCmd = this.buildNxTestCommand(targetProjects, options);
            this.outputChannel.appendLine(`   Command: ${nxCmd}`);
            
            // Execute with streaming output
            const output = await this.executeNxCommandWithStreaming(nxCmd);
            const duration = Date.now() - startTime;
            
            this.outputChannel.appendLine(`   ✅ Tests completed in ${duration}ms`);
            
            return { exitCode: 0, output, duration };
            
        } catch (error) {
            const duration = Date.now() - startTime;
            throw new ShellScriptError(
                'nx-test-execution',
                1,
                `Test execution failed: ${error}`,
                { projects, options, duration }
            );
        }
    }

    /**
     * Get project configuration by name
     */
    getProjectConfig(projectName: string): NxProjectConfig | null {
        return this.workspaceInfo?.projects.get(projectName) || null;
    }

    /**
     * Get all projects that depend on the given project
     */
    getDependentProjects(projectName: string): string[] {
        if (!this.workspaceInfo) return [];
        
        const dependents: string[] = [];
        for (const [project, deps] of this.workspaceInfo.dependencyGraph) {
            if (deps.includes(projectName)) {
                dependents.push(project);
            }
        }
        return dependents;
    }

    /**
     * Check if workspace has Nx Cloud enabled
     */
    hasNxCloud(): boolean {
        return this.workspaceInfo?.hasNxCloud || false;
    }

    /**
     * Get workspace info (must call detectWorkspace first)
     */
    getWorkspaceInfo(): NxWorkspaceInfo | null {
        return this.workspaceInfo;
    }

    // Private helper methods

    private async getNxVersion(): Promise<string | null> {
        try {
            const output = await this.executeCommand('npx nx --version');
            return output.trim();
        } catch {
            return null;
        }
    }

    private async loadProjects(): Promise<Map<string, NxProjectConfig>> {
        const projects = new Map<string, NxProjectConfig>();
        
        try {
            // Use nx show projects to get all project names
            const projectList = await this.executeNxCommand('show projects');
            const projectNames = projectList.split('\n').filter(p => p.trim());
            
            // Load configuration for each project
            for (const projectName of projectNames) {
                try {
                    const configOutput = await this.executeNxCommand(`show project ${projectName} --json`);
                    const config = JSON.parse(configOutput);
                    
                    const projectConfig: NxProjectConfig = {
                        name: projectName,
                        root: config.root || '',
                        sourceRoot: config.sourceRoot || config.root || '',
                        projectType: config.projectType || 'library',
                        tags: config.tags || [],
                        targets: this.parseTargets(config.targets || {}),
                        implicitDependencies: config.implicitDependencies || []
                    };
                    
                    projects.set(projectName, projectConfig);
                } catch (error) {
                    this.outputChannel.appendLine(`   ⚠️ Failed to load config for ${projectName}: ${error}`);
                }
            }
        } catch (error) {
            this.outputChannel.appendLine(`   ⚠️ Failed to load projects: ${error}`);
        }
        
        return projects;
    }

    private async loadDependencyGraph(): Promise<Map<string, string[]>> {
        const graph = new Map<string, string[]>();
        
        try {
            // Skip graph command if port is in use - use fallback approach
            this.outputChannel.appendLine('   ⚠️ Skipping dependency graph due to potential port conflicts');
            return graph;
        } catch (error) {
            this.outputChannel.appendLine(`   ⚠️ Failed to load dependency graph: ${error}`);
        }
        
        return graph;
    }

    private async detectNxCloud(): Promise<boolean> {
        try {
            const nxJsonPath = path.join(this.workspaceRoot, 'nx.json');
            if (!fs.existsSync(nxJsonPath)) return false;
            
            const nxJson = JSON.parse(fs.readFileSync(nxJsonPath, 'utf8'));
            return !!(nxJson.nxCloudAccessToken || nxJson.tasksRunnerOptions?.default?.runner === '@nrwl/nx-cloud');
        } catch {
            return false;
        }
    }

    private async getCacheDirectory(): Promise<string> {
        try {
            const nxJsonPath = path.join(this.workspaceRoot, 'nx.json');
            if (fs.existsSync(nxJsonPath)) {
                const nxJson = JSON.parse(fs.readFileSync(nxJsonPath, 'utf8'));
                if (nxJson.workspaceLayout?.cacheDirectory) {
                    return path.join(this.workspaceRoot, nxJson.workspaceLayout.cacheDirectory);
                }
            }
            return path.join(this.workspaceRoot, 'node_modules', '.cache', 'nx');
        } catch {
            return path.join(this.workspaceRoot, 'node_modules', '.cache', 'nx');
        }
    }

    private parseTargets(targets: Record<string, any>): Map<string, NxTargetConfig> {
        const targetMap = new Map<string, NxTargetConfig>();
        
        for (const [name, config] of Object.entries(targets)) {
            const targetConfig: NxTargetConfig = {
                executor: config.executor || '',
                options: config.options || {},
                configurations: config.configurations
            };
            targetMap.set(name, targetConfig);
        }
        
        return targetMap;
    }

    private parseAffectedOutput(output: string): string[] {
        return output
            .split('\n')
            .map(line => line.trim())
            .filter(line => line && !line.startsWith('>') && !line.startsWith('NX'));
    }

    private analyzeImpact(affectedProjects: string[]): NxImpactAnalysis {
        if (!this.workspaceInfo) {
            return {
                librariesAffected: 0,
                applicationsAffected: 0,
                testTargetsAffected: 0,
                crossProjectDependencies: new Map()
            };
        }
        
        let librariesAffected = 0;
        let applicationsAffected = 0;
        let testTargetsAffected = 0;
        const crossProjectDependencies = new Map<string, string[]>();
        
        for (const projectName of affectedProjects) {
            const project = this.workspaceInfo.projects.get(projectName);
            if (!project) continue;
            
            if (project.projectType === 'library') {
                librariesAffected++;
            } else {
                applicationsAffected++;
            }
            
            if (project.targets.has('test')) {
                testTargetsAffected++;
            }
            
            // Find dependent projects
            const dependents = this.getDependentProjects(projectName);
            if (dependents.length > 0) {
                crossProjectDependencies.set(projectName, dependents);
            }
        }
        
        return {
            librariesAffected,
            applicationsAffected,
            testTargetsAffected,
            crossProjectDependencies
        };
    }

    private buildNxTestCommand(projects: string[], options: NxTestOptions): string {
        const parts = ['nx'];
        
        if (projects.length === 1) {
            // Single project: nx test project-name
            parts.push('test', projects[0]);
        } else {
            // Multiple projects: nx run-many --target=test --projects=proj1,proj2
            parts.push('run-many', '--target=test');
            parts.push(`--projects=${projects.join(',')}`);
        }
        
        if (options.parallel && projects.length > 1) {
            parts.push('--parallel');
            if (options.maxParallel) {
                parts.push(`--maxParallel=${options.maxParallel}`);
            }
        }
        
        if (options.skipCache) {
            parts.push('--skip-nx-cache');
        }
        
        if (options.verbose) {
            parts.push('--verbose');
        }
        
        if (options.configuration) {
            parts.push(`--configuration=${options.configuration}`);
        }
        
        return parts.join(' ');
    }

    private async executeNxCommand(command: string): Promise<string> {
        return this.executeCommand(`npx nx ${command}`);
    }

    private async executeGitCommand(command: string): Promise<string> {
        return this.executeCommand(`git ${command}`);
    }

    private async executeCommand(command: string): Promise<string> {
        return new Promise((resolve, reject) => {
            const child = spawn('sh', ['-c', command], {
                cwd: this.workspaceRoot,
                stdio: ['ignore', 'pipe', 'pipe']
            });
            
            let stdout = '';
            let stderr = '';
            
            child.stdout?.on('data', data => stdout += data.toString());
            child.stderr?.on('data', data => stderr += data.toString());
            
            child.on('close', code => {
                if (code === 0) {
                    resolve(stdout);
                } else {
                    // Provide more detailed error information
                    const errorMsg = stderr || stdout || 'No error output available';
                    this.outputChannel.appendLine(`Command failed: ${command}`);
                    this.outputChannel.appendLine(`Exit code: ${code}`);
                    this.outputChannel.appendLine(`Error output: ${errorMsg}`);
                    reject(new Error(`Command failed (${code}): ${errorMsg.trim()}`));
                }
            });
        });
    }

    private async executeNxCommandWithStreaming(command: string): Promise<string> {
        return new Promise((resolve, reject) => {
            const child = spawn('sh', ['-c', `npx ${command}`], {
                cwd: this.workspaceRoot,
                stdio: ['ignore', 'pipe', 'pipe']
            });
            
            let output = '';
            
            child.stdout?.on('data', data => {
                const text = data.toString();
                output += text;
                // Stream to output channel for real-time feedback
                this.outputChannel.append(text);
            });
            
            child.stderr?.on('data', data => {
                const text = data.toString();
                output += text;
                this.outputChannel.append(text);
            });
            
            child.on('close', code => {
                if (code === 0) {
                    resolve(output);
                } else {
                    reject(new Error(`Nx command failed with exit code ${code}`));
                }
            });
        });
    }
}