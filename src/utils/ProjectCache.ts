/**
 * Project Discovery Cache
 * Improves performance by caching discovered projects
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as crypto from 'crypto';
import { Project } from './simpleProjectDiscovery';

interface CacheEntry {
    projects: Project[];
    timestamp: number;
    hash: string;
}

export class ProjectCache {
    private cache: Map<string, CacheEntry> = new Map();
    private cacheTimeout: number;
    private workspaceRoot: string;
    
    constructor(workspaceRoot: string, cacheTimeoutMinutes: number = 30) {
        this.workspaceRoot = workspaceRoot;
        this.cacheTimeout = cacheTimeoutMinutes * 60 * 1000; // Convert to milliseconds
        this.loadFromWorkspaceState();
    }
    
    /**
     * Get cached projects if valid
     */
    getCachedProjects(): Project[] | null {
        const entry = this.cache.get(this.workspaceRoot);
        
        if (!entry) {
            return null;
        }
        
        // Check if cache is expired
        if (Date.now() - entry.timestamp > this.cacheTimeout) {
            this.cache.delete(this.workspaceRoot);
            return null;
        }
        
        // Check if workspace structure has changed
        const currentHash = this.computeWorkspaceHash();
        if (currentHash !== entry.hash) {
            this.cache.delete(this.workspaceRoot);
            return null;
        }
        
        return entry.projects;
    }
    
    /**
     * Cache discovered projects
     */
    cacheProjects(projects: Project[]): void {
        const entry: CacheEntry = {
            projects,
            timestamp: Date.now(),
            hash: this.computeWorkspaceHash()
        };
        
        this.cache.set(this.workspaceRoot, entry);
        this.saveToWorkspaceState();
    }
    
    /**
     * Clear cache
     */
    clearCache(): void {
        this.cache.clear();
        this.saveToWorkspaceState();
    }
    
    /**
     * Compute hash of workspace structure
     */
    private computeWorkspaceHash(): string {
        const hash = crypto.createHash('sha256');
        
        try {
            // Hash key files that indicate project structure
            const keyFiles = [
                'nx.json',
                'workspace.json',
                'angular.json',
                'package.json',
                'lerna.json',
                'pnpm-workspace.yaml'
            ];
            
            for (const file of keyFiles) {
                const filePath = `${this.workspaceRoot}/${file}`;
                if (fs.existsSync(filePath)) {
                    const stats = fs.statSync(filePath);
                    hash.update(`${file}:${stats.mtime.getTime()}`);
                }
            }
            
            // Hash directory structure
            const projectDirs = ['apps', 'libs', 'packages', 'projects'];
            for (const dir of projectDirs) {
                const dirPath = `${this.workspaceRoot}/${dir}`;
                if (fs.existsSync(dirPath)) {
                    const subdirs = fs.readdirSync(dirPath).filter(d => 
                        fs.statSync(`${dirPath}/${d}`).isDirectory()
                    );
                    hash.update(`${dir}:${subdirs.join(',')}`);
                }
            }
        } catch (error) {
            console.warn('Failed to compute workspace hash:', error);
        }
        
        return hash.digest('hex');
    }
    
    /**
     * Load cache from VSCode workspace state
     */
    private loadFromWorkspaceState(): void {
        try {
            const workspaceState = vscode.workspace.getConfiguration('aiDebugContext');
            const cachedData = workspaceState.get<Record<string, CacheEntry>>('projectCache', {});
            
            for (const [key, value] of Object.entries(cachedData)) {
                this.cache.set(key, value);
            }
        } catch (error) {
            console.warn('Failed to load project cache:', error);
        }
    }
    
    /**
     * Save cache to VSCode workspace state
     */
    private saveToWorkspaceState(): void {
        try {
            const workspaceState = vscode.workspace.getConfiguration('aiDebugContext');
            const cacheObject: Record<string, CacheEntry> = {};
            
            for (const [key, value] of this.cache.entries()) {
                cacheObject[key] = value;
            }
            
            workspaceState.update('projectCache', cacheObject, true);
        } catch (error) {
            console.warn('Failed to save project cache:', error);
        }
    }
    
    /**
     * Get cache statistics
     */
    getCacheStats(): { size: number; age: number | null } {
        const entry = this.cache.get(this.workspaceRoot);
        
        return {
            size: this.cache.size,
            age: entry ? Date.now() - entry.timestamp : null
        };
    }
}