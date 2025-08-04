/**
 * Project Selection Service
 * Handles project discovery, selection UI, and recent project management
 * Part of Phase 1.9.1 CommandRegistry refactor
 */

import * as vscode from 'vscode';
import { ServiceContainer } from '../core/ServiceContainer';
import { ProjectInfo } from '../utils/simpleProjectDiscovery';

export interface ProjectSelectionResult {
    type: 'project' | 'auto-detect' | 'git-affected' | 'current-context' | 'cancelled';
    project?: string;
}

export interface RecentProject {
    name: string;
    lastUsed: string;
    testCount: number;
    lastUsedTimestamp: number;
}

/**
 * Service for project selection and management
 */
export class ProjectSelectionService {
    constructor(private services: ServiceContainer) {}

    /**
     * Check if current context files exist
     */
    private async hasCurrentContextFiles(): Promise<boolean> {
        try {
            const fs = require('fs');
            const path = require('path');
            const contextDir = path.join(this.services.workspaceRoot, '.github', 'instructions', 'ai-utilities-context');
            
            if (!fs.existsSync(contextDir)) {
                return false;
            }

            const files = fs.readdirSync(contextDir);
            // Check for any non-empty files (excluding .gitkeep or similar)
            const contextFiles = files.filter((file: string) => 
                file !== '.gitkeep' && 
                !file.startsWith('.') &&
                fs.statSync(path.join(contextDir, file)).size > 0
            );
            
            return contextFiles.length > 0;
        } catch (error) {
            return false;
        }
    }

    /**
     * Show main project selection menu
     */
    async showMainSelectionMenu(): Promise<ProjectSelectionResult> {
        this.services.updateStatusBar('🚀 Ready for input...', 'yellow');
        
        // Get available projects and recent projects
        const { projectSuggestions, recentProjects } = await this.loadProjectData();
        
        // Create quickpick with unified interface
        const quickPick = vscode.window.createQuickPick();
        quickPick.title = '🧪 AI Context Util - Test Runner';
        quickPick.placeholder = 'Type project name or select an option below';
        quickPick.ignoreFocusOut = true;
        
        // Build menu items
        const items = await this.buildMenuItems(recentProjects);
        quickPick.items = items;
        
        return new Promise((resolve) => {
            quickPick.onDidAccept(() => {
                const selection = quickPick.activeItems[0];
                const value = quickPick.value.trim();
                
                quickPick.hide();
                
                if (!selection && value) {
                    // User typed a custom project name
                    resolve({ type: 'project', project: value });
                } else if (selection) {
                    resolve(this.handleSelection(selection));
                } else {
                    resolve({ type: 'cancelled' });
                }
            });
            
            quickPick.onDidHide(() => {
                this.services.updateStatusBar('Ready');
                quickPick.dispose();
                resolve({ type: 'cancelled' });
            });
            
            quickPick.show();
        });
    }

    /**
     * Show detailed project browser
     */
    async showProjectBrowser(): Promise<string | null> {
        this.services.updateStatusBar('Loading projects...', 'yellow');
        
        try {
            const allProjects = await this.services.projectDiscovery.getAllProjects();
            const recentProjects = await this.getRecentProjects();
            
            if (allProjects.length === 0) {
                vscode.window.showInformationMessage(
                    'No projects found. Make sure you have project.json files in your workspace.'
                );
                this.services.updateStatusBar('No projects found');
                return null;
            }
            
            const quickPickItems = this.buildProjectBrowserItems(allProjects, recentProjects);
            
            const selectedItem = await vscode.window.showQuickPick(quickPickItems, {
                placeHolder: 'Select a project to test',
                title: 'Select Project to Test',
                matchOnDetail: true,
                matchOnDescription: true
            });
            
            if (!selectedItem) {
                this.services.updateStatusBar('Ready');
                return null;
            }
            
            // Handle back button
            if (selectedItem.label === '← Back') {
                return await this.showMainSelectionMenu().then(result => 
                    result.type === 'project' ? result.project || null : null
                );
            }
            
            return selectedItem.description || null;
            
        } catch (error) {
            this.services.outputChannel.appendLine(`❌ Failed to load projects: ${error}\n`);
            this.services.updateStatusBar('❌ Error', 'red');
            return null;
        }
    }

    /**
     * Get available projects for suggestions
     */
    async getAvailableProjects(): Promise<ProjectInfo[]> {
        try {
            return await this.services.projectDiscovery.getAllProjects();
        } catch (error) {
            console.warn('Failed to get available projects:', error);
            return [];
        }
    }

    /**
     * Get recent projects list (workspace-specific)
     */
    async getRecentProjects(): Promise<RecentProject[]> {
        try {
            const workspaceState = vscode.workspace.getConfiguration('aiDebugContext');
            const workspaceKey = this.getWorkspaceKey();
            const allWorkspaceProjects = workspaceState.get<Record<string, any[]>>('recentProjectsByWorkspace', {});
            const rawRecentProjects = allWorkspaceProjects[workspaceKey] || [];
            
            // Clean up corrupted entries
            return rawRecentProjects.filter(p => {
                if (!p || typeof p !== 'object') return false;
                if (!p.name || typeof p.name !== 'string') return false;
                if (p.name === '[object Object]' || p.name === '[Object object]') return false;
                if (p.name === 'SHOW_BROWSER') return false;
                return true;
            });
        } catch (error) {
            console.warn('Failed to get recent projects:', error);
            return [];
        }
    }

    /**
     * Get workspace-specific key for storing recent projects
     */
    private getWorkspaceKey(): string {
        // Use workspace root path as the key, with fallback
        const workspacePath = this.services.workspaceRoot;
        
        // Create a shorter, more readable key from the workspace path
        const pathParts = workspacePath.split(/[/\\]/);
        const workspaceName = pathParts[pathParts.length - 1] || 'unknown';
        
        // Combine workspace name with a hash of the full path for uniqueness
        const pathHash = this.simpleHash(workspacePath);
        
        return `${workspaceName}-${pathHash}`;
    }

    /**
     * Simple hash function for creating workspace keys
     */
    private simpleHash(str: string): string {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash).toString(36).substring(0, 8);
    }

    /**
     * Load project data for menu
     */
    private async loadProjectData(): Promise<{
        projectSuggestions: string[];
        recentProjects: RecentProject[];
    }> {
        try {
            const [allProjects, recentProjects] = await Promise.all([
                this.getAvailableProjects(),
                this.getRecentProjects()
            ]);
            
            const projectSuggestions = allProjects.map(p => p.name);
            
            return { projectSuggestions, recentProjects };
        } catch (error) {
            console.warn('Failed to load project data:', error);
            return { projectSuggestions: [], recentProjects: [] };
        }
    }

    /**
     * Build main menu items
     */
    private async buildMenuItems(recentProjects: RecentProject[]): Promise<vscode.QuickPickItem[]> {
        const items: vscode.QuickPickItem[] = [];

        // Add recent projects if available
        if (recentProjects.length > 0) {

            
            // Add most recent with special formatting
            items.push({
                label: `↻ Test Recent: ${recentProjects[0].name}`,
                detail: `Last tested: ${recentProjects[0].lastUsed || 'Recently'} $(check)`,
                description: '$(star-full) Most Recent'
            });

            items.push({
                label: '',
                kind: vscode.QuickPickItemKind.Separator
            } as any);
            
        }


        items.push({
                label: '$(zap) Test Affected Projects',
                detail: 'Test all files in affected projects ⭐ RECOMMENDED',
                description: '$(star-full) Default'
            });
         items.push({
                label: '$(folder-library) Select Project',
                detail: 'Select a specific project to test',
                description: '$(list-tree) Browse'
            });
    

        // Add current context panel option if context files exist
        const hasCurrentContextFiles = await this.hasCurrentContextFiles();
        if (hasCurrentContextFiles) {

            items.push({
                label: '',
                kind: vscode.QuickPickItemKind.Separator
            } as any);

            items.push({
                label: '📖 Current Context',
                detail: 'View generated AI context files',
                description: 'Browse files'
            });
        }



        return items;
    }

    /**
     * Build project browser items
     */
    private buildProjectBrowserItems(
        allProjects: ProjectInfo[], 
        recentProjects: RecentProject[]
    ): vscode.QuickPickItem[] {
        const items: vscode.QuickPickItem[] = [];
        
        // Add back button
        items.push({
            label: '← Back',
            detail: '',
            description: ''
        });
        
        items.push({
            label: '',
            kind: vscode.QuickPickItemKind.Separator
        });
        
        // Separate projects by type
        const apps = allProjects.filter(p => p.type === 'application').sort((a, b) => a.name.localeCompare(b.name));
        const libs = allProjects.filter(p => p.type === 'library').sort((a, b) => a.name.localeCompare(b.name));
        const others = allProjects.filter(p => p.type !== 'application' && p.type !== 'library').sort((a, b) => a.name.localeCompare(b.name));
        
        // Add recent projects section
        if (recentProjects.length > 0) {
            items.push({
                label: '📌 Recent Projects',
                kind: vscode.QuickPickItemKind.Separator
            });
            
            const validRecentProjects = recentProjects.filter(recent => 
                allProjects.some(project => project.name === recent.name)
            );
            
            validRecentProjects.forEach(recent => {
                const project = allProjects.find(p => p.name === recent.name);
                if (project) {
                    const testCountText = recent.testCount ? ` • Tested ${recent.testCount}x` : '';
                    items.push({
                        label: `⭐ ${recent.name}`,
                        detail: `${project.type} • ${project.path} • Last used: ${recent.lastUsed}${testCountText}`,
                        description: recent.name
                    });
                }
            });
            
            if (validRecentProjects.length > 0) {
                items.push({
                    label: '',
                    kind: vscode.QuickPickItemKind.Separator
                });
            }
        }
        
        // Add Applications section
        if (apps.length > 0) {
            items.push({
                label: '📱 Applications',
                kind: vscode.QuickPickItemKind.Separator
            });
            
            apps.forEach(app => {
                items.push({
                    label: `🚀 ${app.name}`,
                    detail: `${app.type} • ${app.path}`,
                    description: app.name
                });
            });
            
            items.push({
                label: '',
                kind: vscode.QuickPickItemKind.Separator
            });
        }
        
        // Add Libraries section
        if (libs.length > 0) {
            items.push({
                label: '📚 Libraries',
                kind: vscode.QuickPickItemKind.Separator
            });
            
            libs.forEach(lib => {
                items.push({
                    label: `📦 ${lib.name}`,
                    detail: `${lib.type} • ${lib.path}`,
                    description: lib.name
                });
            });
            
            if (others.length > 0) {
                items.push({
                    label: '',
                    kind: vscode.QuickPickItemKind.Separator
                });
            }
        }
        
        // Add Other projects section
        if (others.length > 0) {
            items.push({
                label: '⚙️ Other Projects',
                kind: vscode.QuickPickItemKind.Separator
            });
            
            others.forEach(other => {
                items.push({
                    label: `🔧 ${other.name}`,
                    detail: `${other.type} • ${other.path}`,
                    description: other.name
                });
            });
        }
        
        return items;
    }

    /**
     * Handle menu selection
     */
    private handleSelection(selection: vscode.QuickPickItem): ProjectSelectionResult {
        if (selection.label.includes('Test Affected Projects')) {
            return { type: 'auto-detect' };
        } else if (selection.label.includes('Test Updated Files')) {
            return { type: 'git-affected' };
        } else if (selection.label.includes('Current Context')) {
            return { type: 'current-context' };
        } else if (selection.label.includes('Select Project')) {
            // This will trigger the project browser
            return { type: 'project', project: 'SHOW_BROWSER' };
        } else if (selection.label.includes('Test Recent:')) {
            // Extract project name from "Test Recent: project-name"
            const projectName = selection.label.split('Test Recent: ')[1];
            return { type: 'project', project: projectName };
        } else if (selection.label.includes('$(history)')) {
            // Handle other recent projects
            const projectName = selection.label.replace('$(history) ', '').trim();
            return { type: 'project', project: projectName };
        } else if (selection.description && selection.description !== '') {
            // Direct project selection
            return { type: 'project', project: selection.description };
        }
        
        return { type: 'cancelled' };
    }
}