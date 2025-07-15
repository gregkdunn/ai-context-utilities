import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { NxProject } from '../types';

export class ProjectDetector {
    private workspaceRoot: string;
    private nxConfigPath?: string;

    constructor() {
        this.workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
    }

    /**
     * Find NX workspace configuration
     */
    async findNxWorkspace(): Promise<string | null> {
        if (!this.workspaceRoot) {
            return null;
        }

        const nxJsonPath = path.join(this.workspaceRoot, 'nx.json');
        const angularJsonPath = path.join(this.workspaceRoot, 'angular.json');

        try {
            if (fs.existsSync(nxJsonPath)) {
                this.nxConfigPath = nxJsonPath;
                return nxJsonPath;
            } else if (fs.existsSync(angularJsonPath)) {
                this.nxConfigPath = angularJsonPath;
                return angularJsonPath;
            }
        } catch (error) {
            console.error('Error checking for NX workspace:', error);
        }

        return null;
    }

    /**
     * Get all NX projects in the workspace
     */
    async getProjects(): Promise<NxProject[]> {
        if (!this.nxConfigPath) {
            await this.findNxWorkspace();
        }

        if (!this.nxConfigPath) {
            return [];
        }

        try {
            const configContent = fs.readFileSync(this.nxConfigPath, 'utf8');
            const config = JSON.parse(configContent);

            const projects: NxProject[] = [];

            if (config.projects) {
                // NX workspace format
                for (const [name, projectConfig] of Object.entries(config.projects)) {
                    if (typeof projectConfig === 'string') {
                        // Project defined by path
                        const projectJsonPath = path.join(this.workspaceRoot, projectConfig, 'project.json');
                        if (fs.existsSync(projectJsonPath)) {
                            const projectJson = JSON.parse(fs.readFileSync(projectJsonPath, 'utf8'));
                            projects.push({
                                name,
                                root: projectConfig,
                                projectType: projectJson.projectType || 'library',
                                targets: projectJson.targets
                            });
                        }
                    } else if (typeof projectConfig === 'object' && projectConfig !== null) {
                        // Inline project configuration
                        projects.push({
                            name,
                            root: (projectConfig as any).root || name,
                            projectType: (projectConfig as any).projectType || 'library',
                            targets: (projectConfig as any).targets
                        });
                    }
                }
            } else if (path.basename(this.nxConfigPath) === 'angular.json') {
                // Angular workspace format
                for (const [name, projectConfig] of Object.entries(config.projects || {})) {
                    const project = projectConfig as any;
                    projects.push({
                        name,
                        root: project.root || '',
                        projectType: project.projectType || 'application',
                        targets: project.architect || project.targets
                    });
                }
            }

            return projects;
        } catch (error) {
            console.error('Error parsing NX configuration:', error);
            return [];
        }
    }

    /**
     * Detect the current project based on the active file
     */
    async detectCurrentProject(): Promise<string | null> {
        const activeEditor = vscode.window.activeTextEditor;
        if (!activeEditor) {
            return null;
        }

        const activeFilePath = activeEditor.document.uri.fsPath;
        const relativePath = path.relative(this.workspaceRoot, activeFilePath);

        const projects = await this.getProjects();
        
        // Find the project that contains the active file
        for (const project of projects) {
            if (relativePath.startsWith(project.root)) {
                return project.name;
            }
        }

        return null;
    }

    /**
     * Get project by name
     */
    async getProject(name: string): Promise<NxProject | null> {
        const projects = await this.getProjects();
        return projects.find(p => p.name === name) || null;
    }

    /**
     * Check if a project has specific targets
     */
    async hasTarget(projectName: string, targetName: string): Promise<boolean> {
        const project = await this.getProject(projectName);
        return project?.targets ? targetName in project.targets : false;
    }

    /**
     * Get workspace root directory
     */
    getWorkspaceRoot(): string {
        return this.workspaceRoot;
    }
}
