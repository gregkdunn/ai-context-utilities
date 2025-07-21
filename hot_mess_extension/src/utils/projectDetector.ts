import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export interface ProjectInfo {
    name: string;
    root: string;
    type: 'nx' | 'angular' | 'npm';
    packageJsonPath: string;
    configPath?: string;
    projectType?: 'application' | 'library'; // Added for compatibility
    targets?: Record<string, any>;
}

export class ProjectDetector {
    private _cache: Map<string, ProjectInfo[]> = new Map();

    constructor(private readonly _workspacePath: string) {}

    // Find NX workspace configuration
    public async findNxWorkspace(): Promise<string | null> {
        try {
            const nxConfigPath = path.join(this._workspacePath, 'nx.json');
            const angularConfigPath = path.join(this._workspacePath, 'angular.json');
            
            if (fs.existsSync(nxConfigPath)) {
                return nxConfigPath;
            }
            
            if (fs.existsSync(angularConfigPath)) {
                return angularConfigPath;
            }
            
            return null;
        } catch (error) {
            console.error('Error finding workspace configuration:', error);
            return null;
        }
    }

    // Get all projects
    public async getProjects(): Promise<ProjectInfo[]> {
        return this.detectProjects();
    }

    // Get specific project by name
    public async getProject(name: string): Promise<ProjectInfo | null> {
        const projects = await this.detectProjects();
        return projects.find(project => project.name === name) || null;
    }

    // Check if project has a specific target
    public async hasTarget(projectName: string, targetName: string): Promise<boolean> {
        const project = await this.getProject(projectName);
        return project?.targets?.[targetName] !== undefined;
    }

    // Get workspace root
    public getWorkspaceRoot(): string {
        return this._workspacePath;
    }

    // Legacy method name for compatibility
    public async detectCurrentProject(): Promise<ProjectInfo | undefined> {
        return this.getCurrentProject();
    }

    public async detectProjects(): Promise<ProjectInfo[]> {
        const cacheKey = this._workspacePath;
        
        if (this._cache.has(cacheKey)) {
            return this._cache.get(cacheKey)!;
        }

        const projects = await this._scanForProjects();
        this._cache.set(cacheKey, projects);
        
        return projects;
    }

    private async _scanForProjects(): Promise<ProjectInfo[]> {
        const projects: ProjectInfo[] = [];

        try {
            // Check for NX workspace
            const nxConfigPath = path.join(this._workspacePath, 'nx.json');
            if (fs.existsSync(nxConfigPath)) {
                const nxProjects = await this._detectNxProjects();
                projects.push(...nxProjects);
            }

            // Check for Angular workspace
            const angularConfigPath = path.join(this._workspacePath, 'angular.json');
            if (fs.existsSync(angularConfigPath)) {
                const angularProjects = await this._detectAngularProjects();
                projects.push(...angularProjects);
            }

            // Fallback to npm projects
            if (projects.length === 0) {
                const npmProjects = await this._detectNpmProjects();
                projects.push(...npmProjects);
            }

        } catch (error) {
            console.error('Error detecting projects:', error);
        }

        return projects;
    }

    private async _detectNxProjects(): Promise<ProjectInfo[]> {
        const projects: ProjectInfo[] = [];
        const nxConfigPath = path.join(this._workspacePath, 'nx.json');
        
        try {
            const nxConfig = JSON.parse(fs.readFileSync(nxConfigPath, 'utf8'));
            
            // Check for projects in nx.json
            if (nxConfig.projects) {
                for (const [name, projectPath] of Object.entries(nxConfig.projects)) {
                    const fullPath = path.join(this._workspacePath, projectPath as string);
                    const packageJsonPath = path.join(fullPath, 'package.json');
                    
                    if (fs.existsSync(packageJsonPath)) {
                        projects.push({
                            name,
                            root: fullPath,
                            type: 'nx',
                            packageJsonPath,
                            configPath: nxConfigPath,
                            projectType: 'application' // Default
                        });
                    }
                }
            }

            // Check for project.json files
            const projectJsonPaths = await this._findProjectJsonFiles();
            for (const projectJsonPath of projectJsonPaths) {
                const projectConfig = JSON.parse(fs.readFileSync(projectJsonPath, 'utf8'));
                const projectDir = path.dirname(projectJsonPath);
                const projectName = path.basename(projectDir);
                
                projects.push({
                    name: projectName,
                    root: projectDir,
                    type: 'nx',
                    packageJsonPath: path.join(projectDir, 'package.json'),
                    configPath: projectJsonPath,
                    projectType: projectConfig.projectType || 'application',
                    targets: projectConfig.targets
                });
            }

        } catch (error) {
            console.error('Error detecting NX projects:', error);
        }

        return projects;
    }

    private async _detectAngularProjects(): Promise<ProjectInfo[]> {
        const projects: ProjectInfo[] = [];
        const angularConfigPath = path.join(this._workspacePath, 'angular.json');
        
        try {
            const angularConfig = JSON.parse(fs.readFileSync(angularConfigPath, 'utf8'));
            
            if (angularConfig.projects) {
                for (const [name, projectConfig] of Object.entries(angularConfig.projects)) {
                    const config = projectConfig as any;
                    const projectRoot = path.join(this._workspacePath, config.root || '');
                    const packageJsonPath = path.join(projectRoot, 'package.json');
                    
                    projects.push({
                        name,
                        root: projectRoot,
                        type: 'angular',
                        packageJsonPath,
                        configPath: angularConfigPath,
                        projectType: config.projectType || 'application',
                        targets: config.architect
                    });
                }
            }

        } catch (error) {
            console.error('Error detecting Angular projects:', error);
        }

        return projects;
    }

    private async _detectNpmProjects(): Promise<ProjectInfo[]> {
        const projects: ProjectInfo[] = [];
        const packageJsonPath = path.join(this._workspacePath, 'package.json');
        
        if (fs.existsSync(packageJsonPath)) {
            try {
                const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
                
                projects.push({
                    name: packageJson.name || 'root',
                    root: this._workspacePath,
                    type: 'npm',
                    packageJsonPath,
                    projectType: 'application',
                    targets: packageJson.scripts ? Object.keys(packageJson.scripts).reduce((acc, script) => {
                        acc[script] = { executor: 'npm', options: { command: script } };
                        return acc;
                    }, {} as Record<string, any>) : undefined
                });

            } catch (error) {
                console.error('Error detecting npm project:', error);
            }
        }

        return projects;
    }

    private async _findProjectJsonFiles(): Promise<string[]> {
        const projectJsonFiles: string[] = [];
        
        const findFiles = (dir: string) => {
            const files = fs.readdirSync(dir);
            
            for (const file of files) {
                const fullPath = path.join(dir, file);
                const stat = fs.statSync(fullPath);
                
                if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
                    findFiles(fullPath);
                } else if (file === 'project.json') {
                    projectJsonFiles.push(fullPath);
                }
            }
        };

        try {
            findFiles(this._workspacePath);
        } catch (error) {
            console.error('Error finding project.json files:', error);
        }

        return projectJsonFiles;
    }

    public clearCache(): void {
        this._cache.clear();
    }

    public async getCurrentProject(): Promise<ProjectInfo | undefined> {
        const activeEditor = vscode.window.activeTextEditor;
        if (!activeEditor) {
            return undefined;
        }

        const activeFilePath = activeEditor.document.uri.fsPath;
        const projects = await this.detectProjects();
        
        // Find the project that contains the active file
        return projects.find(project => 
            activeFilePath.startsWith(project.root)
        );
    }
}