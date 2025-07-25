/**
 * Background Project Discovery Service
 * Performs project discovery in background to improve UI responsiveness
 * Part of Phase 1.9.1 performance optimizations
 */

import * as vscode from 'vscode';
import { SimpleProjectDiscovery, ProjectInfo } from './simpleProjectDiscovery';
import { ProjectCache } from './ProjectCache';

interface DiscoveryTask {
    workspaceRoot: string;
    priority: 'high' | 'medium' | 'low';
    timestamp: number;
}

/**
 * Background project discovery with queue management
 */
export class BackgroundProjectDiscovery {
    private discoveryQueue: DiscoveryTask[] = [];
    private isRunning: boolean = false;
    private lastDiscoveryTime: Map<string, number> = new Map();
    private readonly DISCOVERY_COOLDOWN = 5 * 60 * 1000; // 5 minutes
    private readonly MAX_QUEUE_SIZE = 10;

    constructor(
        private outputChannel: vscode.OutputChannel,
        private projectCache: ProjectCache
    ) {}

    /**
     * Queue workspace for background discovery
     */
    queueDiscovery(workspaceRoot: string, priority: 'high' | 'medium' | 'low' = 'medium'): void {
        // Check cooldown
        const lastTime = this.lastDiscoveryTime.get(workspaceRoot) || 0;
        if (Date.now() - lastTime < this.DISCOVERY_COOLDOWN && priority !== 'high') {
            return;
        }

        // Remove existing entry for this workspace
        this.discoveryQueue = this.discoveryQueue.filter(task => task.workspaceRoot !== workspaceRoot);

        // Add new task
        const task: DiscoveryTask = {
            workspaceRoot,
            priority,
            timestamp: Date.now()
        };

        // Insert based on priority
        if (priority === 'high') {
            this.discoveryQueue.unshift(task);
        } else {
            this.discoveryQueue.push(task);
        }

        // Limit queue size
        if (this.discoveryQueue.length > this.MAX_QUEUE_SIZE) {
            this.discoveryQueue = this.discoveryQueue.slice(0, this.MAX_QUEUE_SIZE);
        }

        // Start processing if not already running
        if (!this.isRunning) {
            this.startBackgroundProcessing();
        }
    }

    /**
     * Start background processing
     */
    private async startBackgroundProcessing(): Promise<void> {
        if (this.isRunning) return;

        this.isRunning = true;
        this.outputChannel.appendLine('🔄 Background project discovery started');

        try {
            while (this.discoveryQueue.length > 0) {
                const task = this.discoveryQueue.shift();
                if (!task) break;

                await this.processDiscoveryTask(task);
                
                // Small delay to prevent blocking
                await this.sleep(100);
            }
        } catch (error) {
            this.outputChannel.appendLine(`❌ Background discovery error: ${error}`);
        } finally {
            this.isRunning = false;
            this.outputChannel.appendLine('✅ Background project discovery completed');
        }
    }

    /**
     * Process a single discovery task
     */
    private async processDiscoveryTask(task: DiscoveryTask): Promise<void> {
        try {
            const startTime = Date.now();
            
            // Create discovery instance
            const discovery = new SimpleProjectDiscovery(
                task.workspaceRoot,
                this.outputChannel,
                this.projectCache
            );

            // Perform discovery
            const projects = await discovery.getAllProjects();
            
            const duration = Date.now() - startTime;
            this.lastDiscoveryTime.set(task.workspaceRoot, Date.now());
            
            this.outputChannel.appendLine(
                `📋 Background discovery for ${task.workspaceRoot}: ${projects.length} projects (${duration}ms)`
            );

            // Update cache
            this.projectCache.cacheProjects(projects);

        } catch (error) {
            this.outputChannel.appendLine(
                `⚠️ Background discovery failed for ${task.workspaceRoot}: ${error}`
            );
        }
    }

    /**
     * Get queue status
     */
    getQueueStatus(): {
        queueLength: number;
        isRunning: boolean;
        nextTask?: string;
    } {
        return {
            queueLength: this.discoveryQueue.length,
            isRunning: this.isRunning,
            nextTask: this.discoveryQueue[0]?.workspaceRoot
        };
    }

    /**
     * Clear queue
     */
    clearQueue(): void {
        this.discoveryQueue = [];
        this.outputChannel.appendLine('🗑️ Background discovery queue cleared');
    }

    /**
     * Force immediate discovery for workspace
     */
    async forceDiscovery(workspaceRoot: string): Promise<ProjectInfo[]> {
        this.outputChannel.appendLine(`🚀 Force discovery for ${workspaceRoot}`);
        
        const discovery = new SimpleProjectDiscovery(
            workspaceRoot,
            this.outputChannel,
            this.projectCache
        );

        const projects = await discovery.getAllProjects();
        this.lastDiscoveryTime.set(workspaceRoot, Date.now());
        
        return projects;
    }

    /**
     * Sleep utility
     */
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Dispose background discovery
     */
    dispose(): void {
        this.clearQueue();
        this.isRunning = false;
    }
}