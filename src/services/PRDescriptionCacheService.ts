/**
 * PR Description Cache Service
 * Performance optimization for enhanced PR description generation
 * Implements intelligent caching for git diff analysis and template detection
 */

import * as crypto from 'crypto';
import { GitDiffAnalysis } from './GitDiffAnalysisService';
import { TemplateStructure } from './TemplateDetectionService';

interface CacheEntry<T> {
    data: T;
    timestamp: number;
    ttl: number;
    key: string;
    hash?: string;
}

interface PerformanceMetrics {
    cacheHits: number;
    cacheMisses: number;
    totalRequests: number;
    averageResponseTime: number;
    lastCleanup: number;
}

/**
 * Intelligent caching service for PR description components
 * Provides performance optimization with automatic cache invalidation
 */
export class PRDescriptionCacheService {
    private diffAnalysisCache = new Map<string, CacheEntry<GitDiffAnalysis>>();
    private templateCache = new Map<string, CacheEntry<TemplateStructure>>();
    private gitHashCache = new Map<string, string>();
    private metrics: PerformanceMetrics = {
        cacheHits: 0,
        cacheMisses: 0,
        totalRequests: 0,
        averageResponseTime: 0,
        lastCleanup: Date.now()
    };

    // Cache TTL configurations (in milliseconds)
    private readonly TTL_DIFF_ANALYSIS = 10 * 60 * 1000; // 10 minutes
    private readonly TTL_TEMPLATE = 60 * 60 * 1000; // 1 hour
    private readonly TTL_GIT_HASH = 5 * 60 * 1000; // 5 minutes
    private readonly CLEANUP_INTERVAL = 15 * 60 * 1000; // 15 minutes
    private readonly MAX_CACHE_SIZE = 100; // Maximum entries per cache

    constructor() {
        // Periodic cleanup
        setInterval(() => this.performCleanup(), this.CLEANUP_INTERVAL);
    }

    /**
     * Get cached git diff analysis if available and valid
     */
    async getCachedDiffAnalysis(workspaceRoot: string): Promise<GitDiffAnalysis | null> {
        const startTime = Date.now();
        this.metrics.totalRequests++;

        try {
            // Generate cache key based on current git state
            const gitHash = await this.getCurrentGitHash(workspaceRoot);
            if (!gitHash) {
                this.metrics.cacheMisses++;
                return null;
            }

            const cacheKey = `diff_${gitHash}`;
            const entry = this.diffAnalysisCache.get(cacheKey);

            if (entry && this.isEntryValid(entry)) {
                this.metrics.cacheHits++;
                this.updateMetrics(Date.now() - startTime);
                return entry.data;
            }

            this.metrics.cacheMisses++;
            return null;

        } catch (error) {
            this.metrics.cacheMisses++;
            return null;
        }
    }

    /**
     * Cache git diff analysis with automatic invalidation
     */
    async cacheDiffAnalysis(
        workspaceRoot: string, 
        analysis: GitDiffAnalysis
    ): Promise<void> {
        try {
            const gitHash = await this.getCurrentGitHash(workspaceRoot);
            if (!gitHash) return;

            const cacheKey = `diff_${gitHash}`;
            const entry: CacheEntry<GitDiffAnalysis> = {
                data: analysis,
                timestamp: Date.now(),
                ttl: this.TTL_DIFF_ANALYSIS,
                key: cacheKey,
                hash: gitHash
            };

            this.diffAnalysisCache.set(cacheKey, entry);
            this.enforceMaxCacheSize(this.diffAnalysisCache);

        } catch (error) {
            // Silently fail - caching is optional
        }
    }

    /**
     * Get cached template structure if available and valid
     */
    async getCachedTemplate(workspaceRoot: string): Promise<TemplateStructure | null> {
        const startTime = Date.now();
        this.metrics.totalRequests++;

        try {
            // Generate cache key based on template file hash
            const templateHash = await this.getTemplateFileHash(workspaceRoot);
            const cacheKey = `template_${templateHash || 'default'}`;
            const entry = this.templateCache.get(cacheKey);

            if (entry && this.isEntryValid(entry)) {
                this.metrics.cacheHits++;
                this.updateMetrics(Date.now() - startTime);
                return entry.data;
            }

            this.metrics.cacheMisses++;
            return null;

        } catch (error) {
            this.metrics.cacheMisses++;
            return null;
        }
    }

    /**
     * Cache template structure with file change detection
     */
    async cacheTemplate(
        workspaceRoot: string, 
        template: TemplateStructure
    ): Promise<void> {
        try {
            const templateHash = await this.getTemplateFileHash(workspaceRoot);
            const cacheKey = `template_${templateHash || 'default'}`;
            
            const entry: CacheEntry<TemplateStructure> = {
                data: template,
                timestamp: Date.now(),
                ttl: this.TTL_TEMPLATE,
                key: cacheKey,
                hash: templateHash || undefined
            };

            this.templateCache.set(cacheKey, entry);
            this.enforceMaxCacheSize(this.templateCache);

        } catch (error) {
            // Silently fail - caching is optional
        }
    }

    /**
     * Invalidate all caches (useful for force refresh)
     */
    invalidateAll(): void {
        this.diffAnalysisCache.clear();
        this.templateCache.clear();
        this.gitHashCache.clear();
        
        // Reset metrics
        this.metrics = {
            cacheHits: 0,
            cacheMisses: 0,
            totalRequests: 0,
            averageResponseTime: 0,
            lastCleanup: Date.now()
        };
    }

    /**
     * Invalidate caches related to git changes
     */
    invalidateGitCaches(): void {
        this.diffAnalysisCache.clear();
        this.gitHashCache.clear();
    }

    /**
     * Invalidate template caches
     */
    invalidateTemplateCaches(): void {
        this.templateCache.clear();
    }

    /**
     * Get performance metrics
     */
    getMetrics(): PerformanceMetrics & {
        hitRate: number;
        diffCacheSize: number;
        templateCacheSize: number;
    } {
        const hitRate = this.metrics.totalRequests > 0 ? 
            (this.metrics.cacheHits / this.metrics.totalRequests) * 100 : 0;

        return {
            ...this.metrics,
            hitRate: Math.round(hitRate * 100) / 100,
            diffCacheSize: this.diffAnalysisCache.size,
            templateCacheSize: this.templateCache.size
        };
    }

    /**
     * Get cache status for debugging
     */
    getCacheStatus(): {
        diffAnalysis: Array<{ key: string; age: number; valid: boolean }>;
        templates: Array<{ key: string; age: number; valid: boolean }>;
    } {
        const now = Date.now();
        
        const diffStatus = Array.from(this.diffAnalysisCache.values()).map(entry => ({
            key: entry.key,
            age: now - entry.timestamp,
            valid: this.isEntryValid(entry)
        }));

        const templateStatus = Array.from(this.templateCache.values()).map(entry => ({
            key: entry.key,
            age: now - entry.timestamp,
            valid: this.isEntryValid(entry)
        }));

        return {
            diffAnalysis: diffStatus,
            templates: templateStatus
        };
    }

    // Private methods

    /**
     * Get current git hash for cache key generation
     */
    private async getCurrentGitHash(workspaceRoot: string): Promise<string | null> {
        try {
            // Check if we have a cached git hash
            const cacheKey = `hash_${workspaceRoot}`;
            const cachedEntry = this.gitHashCache.get(cacheKey);
            
            if (cachedEntry) {
                const entry = JSON.parse(cachedEntry);
                if (Date.now() - entry.timestamp < this.TTL_GIT_HASH) {
                    return entry.hash;
                }
            }

            // Get current git state hash
            const { exec } = require('child_process');
            const { promisify } = require('util');
            const execAsync = promisify(exec);

            // Use git status and diff to create a comprehensive hash
            const [statusResult, diffResult] = await Promise.all([
                execAsync('git status --porcelain', { cwd: workspaceRoot }).catch(() => ({ stdout: '' })),
                execAsync('git diff HEAD', { cwd: workspaceRoot }).catch(() => ({ stdout: '' }))
            ]);

            const combinedState = statusResult.stdout + diffResult.stdout;
            const hash = crypto.createHash('md5').update(combinedState).digest('hex');

            // Cache the hash
            this.gitHashCache.set(cacheKey, JSON.stringify({
                hash,
                timestamp: Date.now()
            }));

            return hash;

        } catch (error) {
            return null;
        }
    }

    /**
     * Get template file hash for change detection
     */
    private async getTemplateFileHash(workspaceRoot: string): Promise<string | null> {
        try {
            const path = require('path');
            const fs = require('fs');

            const templatePaths = [
                path.join(workspaceRoot, '.github', 'PULL_REQUEST_TEMPLATE.md'),
                path.join(workspaceRoot, '.github', 'pull_request_template.md'),
                path.join(workspaceRoot, '.github', 'PR_TEMPLATE.md')
            ];

            for (const templatePath of templatePaths) {
                if (fs.existsSync(templatePath)) {
                    const content = await fs.promises.readFile(templatePath, 'utf8');
                    const stats = await fs.promises.stat(templatePath);
                    
                    // Hash content + modification time for change detection
                    const hashInput = content + stats.mtime.toISOString();
                    return crypto.createHash('md5').update(hashInput).digest('hex');
                }
            }

            return null; // No template file found

        } catch (error) {
            return null;
        }
    }

    /**
     * Check if cache entry is still valid
     */
    private isEntryValid<T>(entry: CacheEntry<T>): boolean {
        const now = Date.now();
        return (now - entry.timestamp) < entry.ttl;
    }

    /**
     * Enforce maximum cache size by removing oldest entries
     */
    private enforceMaxCacheSize<T>(cache: Map<string, CacheEntry<T>>): void {
        if (cache.size <= this.MAX_CACHE_SIZE) return;

        // Convert to array and sort by timestamp
        const entries = Array.from(cache.entries()).sort(
            ([, a], [, b]) => a.timestamp - b.timestamp
        );

        // Remove oldest entries
        const toRemove = entries.slice(0, cache.size - this.MAX_CACHE_SIZE);
        toRemove.forEach(([key]) => cache.delete(key));
    }

    /**
     * Perform periodic cleanup of expired entries
     */
    private performCleanup(): void {
        const now = Date.now();
        this.metrics.lastCleanup = now;

        // Clean diff analysis cache
        for (const [key, entry] of this.diffAnalysisCache.entries()) {
            if (!this.isEntryValid(entry)) {
                this.diffAnalysisCache.delete(key);
            }
        }

        // Clean template cache
        for (const [key, entry] of this.templateCache.entries()) {
            if (!this.isEntryValid(entry)) {
                this.templateCache.delete(key);
            }
        }

        // Clean git hash cache
        for (const [key, value] of this.gitHashCache.entries()) {
            try {
                const entry = JSON.parse(value);
                if ((now - entry.timestamp) > this.TTL_GIT_HASH) {
                    this.gitHashCache.delete(key);
                }
            } catch {
                this.gitHashCache.delete(key);
            }
        }
    }

    /**
     * Update performance metrics
     */
    private updateMetrics(responseTime: number): void {
        // Calculate running average response time
        const totalTime = this.metrics.averageResponseTime * (this.metrics.totalRequests - 1);
        this.metrics.averageResponseTime = (totalTime + responseTime) / this.metrics.totalRequests;
    }

    /**
     * Pre-warm cache with common operations
     */
    async preWarmCache(workspaceRoot: string): Promise<void> {
        try {
            // Pre-warm git hash
            await this.getCurrentGitHash(workspaceRoot);
            
            // Pre-warm template hash
            await this.getTemplateFileHash(workspaceRoot);
            
        } catch (error) {
            // Pre-warming is optional
        }
    }

    /**
     * Export cache state for persistence (if needed)
     */
    exportCacheState(): {
        diffAnalysisKeys: string[];
        templateKeys: string[];
        metrics: PerformanceMetrics;
    } {
        return {
            diffAnalysisKeys: Array.from(this.diffAnalysisCache.keys()),
            templateKeys: Array.from(this.templateCache.keys()),
            metrics: this.metrics
        };
    }
}