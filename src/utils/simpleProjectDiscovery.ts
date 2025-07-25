/**
 * Simple project discovery using direct project.json file search
 * Replaces complex Nx tool calls with reliable file system operations
 * Part of Phase 1.8 simplification
 */

import * as vscode from 'vscode';
import { promises as fs } from 'fs';
import * as path from 'path';
import { ProjectCache } from './ProjectCache';

export interface ProjectInfo {
    name: string;
    type: 'application' | 'library' | 'unknown';
    path: string;
    projectJsonPath: string;
}

// Alias for compatibility
export type Project = ProjectInfo;

// Legacy cache interface for workspace state
interface LegacyProjectCache {
    projects: ProjectInfo[];
    lastUpdated: string;
    workspaceRoot: string;
    version: string;
}

export class SimpleProjectDiscovery {
    private projectCache?: ProjectCache;
    
    // Legacy cache constants
    private static readonly CACHE_KEY = 'projectDiscoveryCache';
    private static readonly CACHE_VERSION = '1.8.0';
    
    constructor(
        private workspaceRoot: string,
        private outputChannel: vscode.OutputChannel,
        projectCache?: ProjectCache
    ) {
        this.projectCache = projectCache;
    }

    /**
     * Get all projects, using cache if available and fresh
     */
    async getAllProjects(): Promise<ProjectInfo[]> {
        // Check cache first if available
        if (this.projectCache) {
            const cachedProjects = this.projectCache.getCachedProjects();
            if (cachedProjects) {
                this.outputChannel.appendLine(`📋 Using cached projects (${cachedProjects.length} found)`);
                return cachedProjects as ProjectInfo[];
            }
        } else {
            // Check old cache when no ProjectCache is provided
            const cachedData = await this.getCachedProjectsOld();
            if (cachedData) {
                this.outputChannel.appendLine(`📋 Using cached projects (${cachedData.projects.length} found)`);
                return cachedData.projects;
            }
        }
        
        this.outputChannel.appendLine('🔍 Discovering projects by scanning project.json files...');
        const projects = await this.discoverProjects();
        
        // Cache the results
        if (this.projectCache) {
            this.projectCache.cacheProjects(projects as any[]);
        } else {
            // Fallback to old caching method
            await this.cacheProjectsOld(projects);
        }
        
        this.outputChannel.appendLine(`📋 Found and cached ${projects.length} projects`);
        return projects;
    }

    /**
     * Find projects for specific files (for auto-detection)
     */
    async getProjectsForFiles(files: string[]): Promise<string[]> {
        const allProjects = await this.getAllProjects();
        const foundProjects = new Set<string>();
        
        for (const file of files) {
            const project = this.findProjectForFile(file, allProjects);
            if (project) {
                foundProjects.add(project.name);
            }
        }
        
        return Array.from(foundProjects);
    }

    /**
     * Discover all projects by scanning for project.json files
     */
    private async discoverProjects(): Promise<ProjectInfo[]> {
        const projects: ProjectInfo[] = [];
        
        try {
            const projectJsonFiles = await this.findProjectJsonFiles(this.workspaceRoot);
            
            for (const projectJsonPath of projectJsonFiles) {
                try {
                    const projectInfo = await this.parseProjectJson(projectJsonPath);
                    if (projectInfo) {
                        projects.push(projectInfo);
                    }
                } catch (error) {
                    this.outputChannel.appendLine(`   ⚠️ Skipped invalid project.json: ${projectJsonPath}`);
                }
            }
            
        } catch (error) {
            this.outputChannel.appendLine(`❌ Project discovery failed: ${error}`);
        }
        
        return projects.sort((a, b) => a.name.localeCompare(b.name));
    }

    /**
     * Recursively find all project.json files
     */
    private async findProjectJsonFiles(dir: string): Promise<string[]> {
        const projectJsonFiles: string[] = [];
        
        try {
            const entries = await fs.readdir(dir, { withFileTypes: true });
            
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                
                if (entry.isDirectory()) {
                    // Skip common directories that won't have projects
                    if (this.shouldSkipDirectory(entry.name)) {
                        continue;
                    }
                    
                    // Recursively search subdirectories
                    const subProjects = await this.findProjectJsonFiles(fullPath);
                    projectJsonFiles.push(...subProjects);
                    
                } else if (entry.name === 'project.json') {
                    projectJsonFiles.push(fullPath);
                }
            }
        } catch (error) {
            // Skip directories we can't read (permissions, etc.)
        }
        
        return projectJsonFiles;
    }

    /**
     * Parse project.json file to extract project info
     */
    private async parseProjectJson(projectJsonPath: string): Promise<ProjectInfo | null> {
        try {
            const content = await fs.readFile(projectJsonPath, 'utf8');
            const projectJson = JSON.parse(content);
            
            if (!projectJson.name) {
                return null; // Invalid project.json without name
            }
            
            const projectPath = path.dirname(projectJsonPath);
            const relativePath = path.relative(this.workspaceRoot, projectPath);
            
            // Determine project type from project.json
            const type = this.determineProjectType(projectJson);
            
            return {
                name: projectJson.name,
                type,
                path: relativePath,
                projectJsonPath
            };
            
        } catch (error) {
            return null; // Invalid JSON or file read error
        }
    }

    /**
     * Determine if project is app, library, or unknown
     */
    private determineProjectType(projectJson: any): 'application' | 'library' | 'unknown' {
        // Check explicit project type first (highest priority)
        if (projectJson.projectType === 'application') {
            return 'application';
        }
        
        if (projectJson.projectType === 'library') {
            return 'library';
        }
        
        // Check targets for common patterns
        const targets = projectJson.targets || {};
        
        // If it has a serve target, it's likely an application
        if (targets.serve || targets.start) {
            return 'application';
        }
        
        // If it has build target but no serve, likely a library
        if (targets.build && !targets.serve) {
            return 'library';
        }
        
        return 'unknown';
    }

    /**
     * Find which project a file belongs to
     */
    private findProjectForFile(filePath: string, projects: ProjectInfo[]): ProjectInfo | null {
        // Sort projects by path length (longest first) to get most specific match
        const sortedProjects = projects.sort((a, b) => b.path.length - a.path.length);
        
        for (const project of sortedProjects) {
            if (filePath.startsWith(project.path + '/') || filePath.startsWith(project.path + '\\')) {
                return project;
            }
        }
        
        return null;
    }

    /**
     * Check if we should skip a directory during search
     */
    private shouldSkipDirectory(dirName: string): boolean {
        const skipPatterns = [
            'node_modules',
            '.git',
            '.nx',
            'dist',
            'build',
            'out',
            'coverage',
            '.vscode',
            '.angular',
            'tmp',
            'temp',
            '.jest-cache',
            '__pycache__'
        ];
        
        return skipPatterns.includes(dirName) || dirName.startsWith('.');
    }

    /**
     * Get cached projects from VS Code workspace state (legacy method)
     */
    private async getCachedProjectsOld(): Promise<LegacyProjectCache | null> {
        try {
            const workspaceState = vscode.workspace.getConfiguration('aiDebugContext');
            const cached = workspaceState.get<LegacyProjectCache>(SimpleProjectDiscovery.CACHE_KEY);
            
            if (cached && cached.workspaceRoot === this.workspaceRoot) {
                return cached;
            }
            
            return null;
        } catch (error) {
            return null;
        }
    }

    /**
     * Cache discovered projects (legacy method)
     */
    private async cacheProjectsOld(projects: ProjectInfo[]): Promise<void> {
        try {
            const cache: LegacyProjectCache = {
                projects,
                lastUpdated: new Date().toISOString(),
                workspaceRoot: this.workspaceRoot,
                version: SimpleProjectDiscovery.CACHE_VERSION
            };
            
            const workspaceState = vscode.workspace.getConfiguration('aiDebugContext');
            await workspaceState.update(SimpleProjectDiscovery.CACHE_KEY, cache, true);
            
        } catch (error) {
            this.outputChannel.appendLine(`⚠️ Failed to cache projects: ${error}`);
        }
    }

    /**
     * Check if cached projects are still valid (not too old)
     */
    private isCacheValid(cache: LegacyProjectCache): boolean {
        const cacheAge = Date.now() - new Date(cache.lastUpdated).getTime();
        const maxAge = 30 * 60 * 1000; // 30 minutes
        
        return cacheAge < maxAge && cache.version === SimpleProjectDiscovery.CACHE_VERSION;
    }

    /**
     * Clear project cache (for debugging or when workspace changes)
     */
    async clearCache(): Promise<void> {
        try {
            const workspaceState = vscode.workspace.getConfiguration('aiDebugContext');
            await workspaceState.update(SimpleProjectDiscovery.CACHE_KEY, undefined, true);
            this.outputChannel.appendLine('🗑️ Project cache cleared');
        } catch (error) {
            this.outputChannel.appendLine(`⚠️ Failed to clear cache: ${error}`);
        }
    }

    /**
     * Get projects by type
     */
    async getProjectsByType(type: 'application' | 'library'): Promise<ProjectInfo[]> {
        const allProjects = await this.getAllProjects();
        return allProjects.filter(p => p.type === type);
    }

    /**
     * Search projects by name pattern
     */
    async searchProjects(pattern: string): Promise<ProjectInfo[]> {
        const allProjects = await this.getAllProjects();
        const regex = new RegExp(pattern, 'i'); // Case insensitive
        
        return allProjects.filter(p => 
            regex.test(p.name) || 
            regex.test(p.path)
        );
    }

    /**
     * Get project info by name
     */
    async getProject(name: string): Promise<ProjectInfo | null> {
        const allProjects = await this.getAllProjects();
        return allProjects.find(p => p.name === name) || null;
    }
}