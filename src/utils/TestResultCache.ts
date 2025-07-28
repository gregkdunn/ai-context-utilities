/**
 * Test Result Cache
 * Caches test results to avoid re-running unchanged tests
 * Part of Phase 2.0.1 - Performance Improvements
 */

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { TestResult } from '../services/TestExecutionService';

export interface CachedTestResult {
    projectName: string;
    fileHashes: Record<string, string>;
    timestamp: number;
    result: TestResult;
    configHash: string;
}

export interface CacheStats {
    totalEntries: number;
    hitRate: number;
    sizeMB: number;
    oldestEntry: number;
    newestEntry: number;
}

/**
 * Intelligent test result caching system
 */
export class TestResultCache {
    private cache = new Map<string, CachedTestResult>();
    private cacheFilePath: string;
    private maxCacheAge = 24 * 60 * 60 * 1000; // 24 hours
    private maxCacheSize = 100; // Maximum number of cached results

    constructor(private workspaceRoot: string) {
        this.cacheFilePath = path.join(workspaceRoot, '.vscode', 'aiDebugCache.json');
        this.loadCache();
    }

    /**
     * Get cached test result if available and valid
     */
    async getCachedResult(
        projectName: string, 
        affectedFiles: string[], 
        testConfig: any
    ): Promise<TestResult | null> {
        const cacheKey = this.generateCacheKey(projectName, affectedFiles);
        const cached = this.cache.get(cacheKey);

        if (!cached) {
            return null;
        }

        // Check if cache is expired
        if (Date.now() - cached.timestamp > this.maxCacheAge) {
            this.cache.delete(cacheKey);
            return null;
        }

        // Check if config has changed
        const currentConfigHash = this.hashObject(testConfig);
        if (cached.configHash !== currentConfigHash) {
            this.cache.delete(cacheKey);
            return null;
        }

        // Check if files have changed
        const currentFileHashes = await this.getFileHashes(affectedFiles);
        for (const [file, hash] of Object.entries(currentFileHashes)) {
            if (cached.fileHashes[file] !== hash) {
                this.cache.delete(cacheKey);
                return null;
            }
        }

        // Check for new files not in cache
        for (const file of affectedFiles) {
            if (!(file in cached.fileHashes)) {
                this.cache.delete(cacheKey);
                return null;
            }
        }

        return cached.result;
    }

    /**
     * Cache a test result
     */
    async cacheResult(
        projectName: string,
        affectedFiles: string[],
        testConfig: any,
        result: TestResult
    ): Promise<void> {
        const cacheKey = this.generateCacheKey(projectName, affectedFiles);
        const fileHashes = await this.getFileHashes(affectedFiles);
        const configHash = this.hashObject(testConfig);

        const cached: CachedTestResult = {
            projectName,
            fileHashes,
            timestamp: Date.now(),
            result,
            configHash
        };

        this.cache.set(cacheKey, cached);

        // Cleanup old entries if cache is too large
        if (this.cache.size > this.maxCacheSize) {
            this.cleanupOldEntries();
        }

        await this.saveCache();
    }

    /**
     * Invalidate cache for a project
     */
    invalidateProject(projectName: string): void {
        const keysToDelete: string[] = [];
        
        for (const [key, cached] of this.cache.entries()) {
            if (cached.projectName === projectName) {
                keysToDelete.push(key);
            }
        }

        keysToDelete.forEach(key => this.cache.delete(key));
    }

    /**
     * Clear all cached results
     */
    async clearCache(): Promise<void> {
        this.cache.clear();
        await this.saveCache();
    }

    /**
     * Get cache statistics
     */
    getCacheStats(): CacheStats {
        const entries = Array.from(this.cache.values());
        const timestamps = entries.map(e => e.timestamp);
        
        return {
            totalEntries: this.cache.size,
            hitRate: this.calculateHitRate(),
            sizeMB: this.calculateCacheSize(),
            oldestEntry: timestamps.length > 0 ? Math.min(...timestamps) : 0,
            newestEntry: timestamps.length > 0 ? Math.max(...timestamps) : 0
        };
    }

    /**
     * Check if a test result would be cached
     */
    async wouldBeCached(
        projectName: string,
        affectedFiles: string[],
        testConfig: any
    ): Promise<boolean> {
        try {
            const fileHashes = await this.getFileHashes(affectedFiles);
            return Object.keys(fileHashes).length > 0;
        } catch {
            return false;
        }
    }

    /**
     * Generate cache key for project and files
     */
    private generateCacheKey(projectName: string, affectedFiles: string[]): string {
        const sortedFiles = [...affectedFiles].sort();
        const keyData = `${projectName}:${sortedFiles.join(',')}`;
        return crypto.createHash('md5').update(keyData).digest('hex');
    }

    /**
     * Get file hashes for affected files
     */
    private async getFileHashes(files: string[]): Promise<Record<string, string>> {
        const hashes: Record<string, string> = {};

        for (const file of files) {
            try {
                // Skip glob patterns - they're not actual files
                if (file.includes('*') || file.includes('?') || file.includes('[')) {
                    continue;
                }
                
                const fullPath = path.isAbsolute(file) ? file : path.join(this.workspaceRoot, file);
                
                // Check if file exists before trying to read it
                const stat = await fs.promises.stat(fullPath);
                if (!stat.isFile()) {
                    continue;
                }
                
                const content = await fs.promises.readFile(fullPath, 'utf8');
                hashes[file] = crypto.createHash('md5').update(content).digest('hex');
            } catch (error) {
                // File might not exist or be readable, skip it silently
                // Only log if it's not a glob pattern
                if (!file.includes('*') && !file.includes('?') && !file.includes('[')) {
                    console.warn(`Could not hash file ${file}:`, error);
                }
            }
        }

        return hashes;
    }

    /**
     * Hash configuration object
     */
    private hashObject(obj: any): string {
        const jsonString = JSON.stringify(obj, Object.keys(obj).sort());
        return crypto.createHash('md5').update(jsonString).digest('hex');
    }

    /**
     * Load cache from disk
     */
    private loadCache(): void {
        try {
            if (fs.existsSync(this.cacheFilePath)) {
                const data = fs.readFileSync(this.cacheFilePath, 'utf8');
                const parsed = JSON.parse(data);
                
                // Convert array back to Map
                this.cache = new Map(parsed.entries || []);
                
                // Cleanup expired entries on load
                this.cleanupExpiredEntries();
            }
        } catch (error) {
            console.warn('Failed to load test cache:', error);
            this.cache = new Map();
        }
    }

    /**
     * Save cache to disk
     */
    private async saveCache(): Promise<void> {
        try {
            // Ensure directory exists
            const cacheDir = path.dirname(this.cacheFilePath);
            await fs.promises.mkdir(cacheDir, { recursive: true });

            // Convert Map to serializable format
            const data = {
                entries: Array.from(this.cache.entries()),
                version: '1.0.0',
                timestamp: Date.now()
            };

            await fs.promises.writeFile(this.cacheFilePath, JSON.stringify(data, null, 2));
        } catch (error) {
            console.warn('Failed to save test cache:', error);
        }
    }

    /**
     * Remove expired cache entries
     */
    private cleanupExpiredEntries(): void {
        const now = Date.now();
        const keysToDelete: string[] = [];

        for (const [key, cached] of this.cache.entries()) {
            if (now - cached.timestamp > this.maxCacheAge) {
                keysToDelete.push(key);
            }
        }

        keysToDelete.forEach(key => this.cache.delete(key));
    }

    /**
     * Remove oldest cache entries to maintain size limit
     */
    private cleanupOldEntries(): void {
        const entries = Array.from(this.cache.entries());
        
        // Sort by timestamp (oldest first)
        entries.sort(([, a], [, b]) => a.timestamp - b.timestamp);
        
        // Remove oldest entries until we're under the limit
        const toRemove = entries.length - this.maxCacheSize + 10; // Remove extra to avoid frequent cleanup
        
        for (let i = 0; i < toRemove && i < entries.length; i++) {
            this.cache.delete(entries[i][0]);
        }
    }

    /**
     * Calculate cache hit rate (simplified)
     */
    private calculateHitRate(): number {
        // This would need to be tracked over time for accuracy
        // For now, return a placeholder
        return 0.75; // 75% placeholder
    }

    /**
     * Calculate cache size in MB
     */
    private calculateCacheSize(): number {
        const jsonString = JSON.stringify(Array.from(this.cache.entries()));
        return (new Blob([jsonString]).size) / (1024 * 1024);
    }

    /**
     * Dispose and cleanup
     */
    dispose(): void {
        this.saveCache().catch(console.warn);
        this.cache.clear();
    }
}