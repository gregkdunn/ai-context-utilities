import * as vscode from 'vscode';
import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

export interface NxProject {
    name: string;
    root: string;
    targets: { [key: string]: any };
    type: 'application' | 'library';
}

export interface AffectedCommandResult {
    projects: string[];
    output: string;
    success: boolean;
    errors?: string[];
}

export class NxAffectedManager {
    private workspaceRoot: string;
    private nxConfig: any;
    private affectedCache: Map<string, string[]> = new Map();
    private fileWatcher: vscode.FileSystemWatcher | null = null;

    constructor(private context: vscode.ExtensionContext) {
        this.workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
        this.initialize();
    }

    private async initialize(): Promise<void> {
        try {
            await this.loadNxConfiguration();
            this.setupFileWatcher();
        } catch (error) {
            console.error('Failed to initialize NX Affected Manager:', error);
        }
    }

    private async loadNxConfiguration(): Promise<void> {
        const nxConfigPath = path.join(this.workspaceRoot, 'nx.json');
        const angularConfigPath = path.join(this.workspaceRoot, 'angular.json');

        try {
            if (fs.existsSync(nxConfigPath)) {
                const configContent = fs.readFileSync(nxConfigPath, 'utf-8');
                this.nxConfig = JSON.parse(configContent);
            } else if (fs.existsSync(angularConfigPath)) {
                const configContent = fs.readFileSync(angularConfigPath, 'utf-8');
                this.nxConfig = JSON.parse(configContent);
            } else {
                throw new Error('No NX configuration found');
            }
        } catch (error) {
            throw new Error(`Failed to load NX configuration: ${(error as Error).message}`);
        }
    }

    private setupFileWatcher(): void {
        if (this.fileWatcher) {
            this.fileWatcher.dispose();
        }

        this.fileWatcher = vscode.workspace.createFileSystemWatcher('**/*');
        
        this.fileWatcher.onDidChange(() => this.clearAffectedCache());
        this.fileWatcher.onDidCreate(() => this.clearAffectedCache());
        this.fileWatcher.onDidDelete(() => this.clearAffectedCache());
        
        this.context.subscriptions.push(this.fileWatcher);
    }

    private clearAffectedCache(): void {
        this.affectedCache.clear();
    }

    async getAffectedProjects(base: string = 'main'): Promise<string[]> {
        const headCommit = await this.getHeadCommit();
        const cacheKey = `${base}-${headCommit}`;

        if (this.affectedCache.has(cacheKey)) {
            return this.affectedCache.get(cacheKey)!;
        }

        try {
            const projects = await this.executeNxCommand(['show', 'projects', '--affected', '--base', base]);
            this.affectedCache.set(cacheKey, projects);
            return projects;
        } catch (error) {
            console.error('Failed to get affected projects:', error);
            return [];
        }
    }

    async getAllProjects(): Promise<NxProject[]> {
        try {
            const projectNames = await this.executeNxCommand(['show', 'projects']);
            const projects: NxProject[] = [];

            for (const projectName of projectNames) {
                try {
                    const projectConfig = await this.getProjectConfiguration(projectName);
                    projects.push(projectConfig);
                } catch (error) {
                    console.warn(`Failed to get configuration for project ${projectName}:`, error);
                }
            }

            return projects;
        } catch (error) {
            console.error('Failed to get all projects:', error);
            return [];
        }
    }

    async getProjectConfiguration(projectName: string): Promise<NxProject> {
        try {
            const configOutput = await this.executeNxCommandRaw(['show', 'project', projectName, '--json']);
            const config = JSON.parse(configOutput);

            return {
                name: projectName,
                root: config.root || '',
                targets: config.targets || {},
                type: this.inferProjectType(config)
            };
        } catch (error) {
            throw new Error(`Failed to get project configuration for ${projectName}: ${(error as Error).message}`);
        }
    }

    private inferProjectType(config: any): 'application' | 'library' {
        if (config.targets && config.targets.serve) {
            return 'application';
        }
        return 'library';
    }

    async runAffectedCommand(target: string, base: string = 'main', options: string[] = []): Promise<AffectedCommandResult> {
        try {
            const projects = await this.getAffectedProjects(base);
            
            if (projects.length === 0) {
                return {
                    projects: [],
                    output: 'No affected projects found',
                    success: true
                };
            }

            const args = ['run-many', '--target', target, '--projects', projects.join(','), ...options];
            const output = await this.executeNxCommandRaw(args);

            return {
                projects,
                output,
                success: true
            };
        } catch (error) {
            return {
                projects: [],
                output: (error as Error).message,
                success: false,
                errors: [(error as Error).message]
            };
        }
    }

    async runAffectedTest(base: string = 'main', parallel: boolean = true): Promise<AffectedCommandResult> {
        const options = parallel ? ['--parallel'] : [];
        return this.runAffectedCommand('test', base, options);
    }

    async runAffectedLint(base: string = 'main', parallel: boolean = true): Promise<AffectedCommandResult> {
        const options = parallel ? ['--parallel'] : [];
        return this.runAffectedCommand('lint', base, options);
    }

    async runAffectedBuild(base: string = 'main', parallel: boolean = true): Promise<AffectedCommandResult> {
        const options = parallel ? ['--parallel'] : [];
        return this.runAffectedCommand('build', base, options);
    }

    private async executeNxCommand(args: string[]): Promise<string[]> {
        const output = await this.executeNxCommandRaw(args);
        return output.trim().split('\n').filter(line => line.length > 0);
    }

    private async executeNxCommandRaw(args: string[]): Promise<string> {
        return new Promise((resolve, reject) => {
            const child = spawn('npx', ['nx', ...args], {
                cwd: this.workspaceRoot,
                stdio: 'pipe',
                shell: process.platform === 'win32'
            });

            let output = '';
            let errorOutput = '';

            child.stdout.on('data', (data) => {
                output += data.toString();
            });

            child.stderr.on('data', (data) => {
                errorOutput += data.toString();
            });

            child.on('close', (code) => {
                if (code === 0) {
                    resolve(output);
                } else {
                    reject(new Error(`NX command failed with code ${code}: ${errorOutput}`));
                }
            });

            child.on('error', (error) => {
                reject(new Error(`Failed to execute NX command: ${error.message}`));
            });

            // Set timeout for long-running commands
            setTimeout(() => {
                child.kill();
                reject(new Error('NX command timeout'));
            }, 120000); // 2 minutes timeout
        });
    }

    private async getHeadCommit(): Promise<string> {
        return new Promise((resolve, reject) => {
            const child = spawn('git', ['rev-parse', 'HEAD'], {
                cwd: this.workspaceRoot,
                stdio: 'pipe'
            });

            let output = '';
            child.stdout.on('data', (data) => {
                output += data.toString();
            });

            child.on('close', (code) => {
                if (code === 0) {
                    resolve(output.trim());
                } else {
                    resolve('unknown');
                }
            });

            child.on('error', () => {
                resolve('unknown');
            });
        });
    }

    async isNxWorkspace(): Promise<boolean> {
        const nxConfig = path.join(this.workspaceRoot, 'nx.json');
        const angularConfig = path.join(this.workspaceRoot, 'angular.json');
        return fs.existsSync(nxConfig) || fs.existsSync(angularConfig);
    }

    dispose(): void {
        if (this.fileWatcher) {
            this.fileWatcher.dispose();
        }
        this.clearAffectedCache();
    }
}
