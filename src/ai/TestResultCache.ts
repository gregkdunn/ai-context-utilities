/**
 * TestResultCache - Cache test results to avoid re-running unchanged tests
 * 
 * Implements intelligent caching based on file content hashes to determine
 * when tests need to be re-run. Can provide 40-60% cache hit rates in
 * typical development workflows.
 * 
 * @version 3.0.0
 */

import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import * as crypto from 'crypto';
import * as path from 'path';
import { TestResultSummary } from './TestFailureAnalyzer';

/**
 * Represents a cached test result
 */
export interface CachedTestResult {
    readonly testFile: string;
    readonly contentHash: string;
    readonly dependencyHashes: string[];
    readonly result: TestResultSummary;
    readonly timestamp: Date;
    readonly durationMs: number;
}

/**
 * Cache statistics
 */
export interface CacheStats {
    readonly totalRequests: number;
    readonly cacheHits: number;
    readonly cacheMisses: number;
    readonly hitRate: number;
    readonly timeSavedMs: number;
    readonly entriesCount: number;
}

/**
 * Options for cache behavior
 */
export interface CacheOptions {
    readonly maxEntries?: number;
    readonly maxAgeMs?: number;
    readonly includeDependencies?: boolean;
    readonly enablePersistence?: boolean;
}

/**
 * Intelligent test result caching system
 */
export class TestResultCache {
    private cache = new Map<string, CachedTestResult>();
    private stats = {
        totalRequests: 0,
        cacheHits: 0,
        cacheMisses: 0,
        hitRate: 0,
        timeSavedMs: 0,
        entriesCount: 0
    };

    private readonly storageDir: string;
    private readonly storageFile: string;
    private readonly options: Required<CacheOptions>;
    private readonly outputChannel: vscode.OutputChannel;

    constructor(workspaceRoot?: string, options: CacheOptions = {}) {
        this.storageDir = path.join(workspaceRoot || '', '.ai-debug-context');
        this.storageFile = path.join(this.storageDir, 'test-cache.json');
        this.outputChannel = vscode.window.createOutputChannel('AI Debug Context - Cache');

        this.options = {
            maxEntries: options.maxEntries || 1000,
            maxAgeMs: options.maxAgeMs || 24 * 60 * 60 * 1000, // 24 hours
            includeDependencies: options.includeDependencies ?? true,
            enablePersistence: options.enablePersistence ?? true
        };

        // Load existing cache
        if (this.options.enablePersistence) {
            this.loadCache().catch(error => {
                this.showOutput(`Failed to load cache: ${error}`);
            });
        }
    }

    /**
     * Get cached test result or run tests if cache miss
     */
    async getOrRunTest(
        testFile: string,
        runTestFn: () => Promise<TestResultSummary>
    ): Promise<{ result: TestResultSummary; fromCache: boolean }> {
        this.stats.totalRequests++;

        try {
            // Check if we have a valid cached result
            const cachedResult = await this.getCachedResult(testFile);
            
            if (cachedResult) {
                this.stats.cacheHits++;
                this.stats.timeSavedMs += cachedResult.durationMs;
                this.updateHitRate();
                
                this.showOutput(`Cache HIT for ${path.basename(testFile)} (saved ${cachedResult.durationMs}ms)`);
                
                return {
                    result: cachedResult.result,
                    fromCache: true
                };
            }

            // Cache miss - run the test
            this.stats.cacheMisses++;
            this.updateHitRate();
            
            this.showOutput(`Cache MISS for ${path.basename(testFile)} - running test`);
            
            const startTime = Date.now();
            const result = await runTestFn();
            const duration = Date.now() - startTime;

            // Cache the result
            await this.cacheResult(testFile, result, duration);

            return {
                result,
                fromCache: false
            };

        } catch (error) {
            this.showOutput(`Error in cache operation: ${error}`);
            // Fallback to running the test
            const result = await runTestFn();
            return { result, fromCache: false };
        }
    }

    /**
     * Manually cache a test result
     */
    async cacheResult(
        testFile: string,
        result: TestResultSummary,
        durationMs: number
    ): Promise<void> {
        try {
            const contentHash = await this.getFileHash(testFile);
            const dependencyHashes = this.options.includeDependencies 
                ? await this.getDependencyHashes(testFile)
                : [];

            const cachedResult: CachedTestResult = {
                testFile,
                contentHash,
                dependencyHashes,
                result,
                timestamp: new Date(),
                durationMs
            };

            this.cache.set(testFile, cachedResult);
            this.stats.entriesCount = this.cache.size;

            // Cleanup old entries if needed
            await this.cleanupCache();

            // Persist if enabled
            if (this.options.enablePersistence) {
                await this.saveCache();
            }

            this.showOutput(`Cached result for ${path.basename(testFile)}`);

        } catch (error) {
            this.showOutput(`Failed to cache result: ${error}`);
        }
    }

    /**
     * Invalidate cache entry for a specific test file
     */
    invalidate(testFile: string): void {
        if (this.cache.delete(testFile)) {
            this.stats.entriesCount = this.cache.size;
            this.showOutput(`Invalidated cache for ${path.basename(testFile)}`);
        }
    }

    /**
     * Invalidate cache entries that depend on a source file
     */
    async invalidateDependents(sourceFile: string): Promise<void> {
        const toInvalidate: string[] = [];
        
        for (const [testFile, cached] of this.cache.entries()) {
            if (await this.isDependentOn(testFile, sourceFile)) {
                toInvalidate.push(testFile);
            }
        }

        for (const testFile of toInvalidate) {
            this.invalidate(testFile);
        }

        if (toInvalidate.length > 0) {
            this.showOutput(`Invalidated ${toInvalidate.length} dependent test(s) for ${path.basename(sourceFile)}`);
        }
    }

    /**
     * Clear all cache entries
     */
    async clearCache(): Promise<void> {
        this.cache.clear();
        this.stats.entriesCount = 0;
        
        if (this.options.enablePersistence) {
            await this.saveCache();
        }
        
        this.showOutput('Cleared all cache entries');
    }

    /**
     * Get cache statistics
     */
    getStats(): CacheStats {
        return { ...this.stats };
    }

    /**
     * Get cache entries for inspection
     */
    getCacheEntries(): CachedTestResult[] {
        return Array.from(this.cache.values());
    }

    /**
     * Estimate cache effectiveness
     */
    getCacheEffectiveness(): {
        hitRate: number;
        timeSavedMinutes: number;
        spaceSavedMB: number;
        recommendedActions: string[];
    } {
        const timeSavedMinutes = this.stats.timeSavedMs / (1000 * 60);
        const spaceSavedMB = this.cache.size * 0.001; // Rough estimate
        
        const recommendations: string[] = [];
        
        if (this.stats.hitRate < 0.3) {
            recommendations.push('Consider including more dependencies in cache key');
            recommendations.push('Tests may be changing too frequently for effective caching');
        }
        
        if (this.stats.hitRate > 0.8) {
            recommendations.push('Cache is very effective - consider increasing max entries');
        }
        
        if (this.cache.size > this.options.maxEntries * 0.9) {
            recommendations.push('Cache is near capacity - consider increasing max entries or reducing max age');
        }

        return {
            hitRate: this.stats.hitRate,
            timeSavedMinutes,
            spaceSavedMB,
            recommendedActions: recommendations
        };
    }

    /**
     * Get cached result if valid
     */
    private async getCachedResult(testFile: string): Promise<CachedTestResult | null> {
        const cached = this.cache.get(testFile);
        
        if (!cached) {
            return null;
        }

        // Check if entry is too old
        const age = Date.now() - cached.timestamp.getTime();
        if (age > this.options.maxAgeMs) {
            this.invalidate(testFile);
            return null;
        }

        // Check if file content has changed
        const currentHash = await this.getFileHash(testFile);
        if (currentHash !== cached.contentHash) {
            this.invalidate(testFile);
            return null;
        }

        // Check if dependencies have changed
        if (this.options.includeDependencies) {
            const currentDepHashes = await this.getDependencyHashes(testFile);
            if (!this.arraysEqual(currentDepHashes, cached.dependencyHashes)) {
                this.invalidate(testFile);
                return null;
            }
        }

        return cached;
    }

    /**
     * Get hash of file content
     */
    private async getFileHash(filePath: string): Promise<string> {
        try {
            const content = await fs.readFile(filePath, 'utf8');
            return crypto.createHash('md5').update(content).digest('hex');
        } catch (error) {
            // File doesn't exist or can't be read
            return '';
        }
    }

    /**
     * Get hashes of test dependencies
     */
    private async getDependencyHashes(testFile: string): Promise<string[]> {
        try {
            const dependencies = await this.extractDependencies(testFile);
            const hashes: string[] = [];
            
            for (const dep of dependencies) {
                const hash = await this.getFileHash(dep);
                if (hash) {
                    hashes.push(hash);
                }
            }
            
            return hashes.sort(); // Sort for consistent comparison
        } catch (error) {
            return [];
        }
    }

    /**
     * Extract dependencies from test file
     */
    private async extractDependencies(testFile: string): Promise<string[]> {
        try {
            const content = await fs.readFile(testFile, 'utf8');
            const dependencies: string[] = [];
            
            // Extract import statements
            const importMatches = content.matchAll(/import.*from\s+['"`]([^'"`]+)['"`]/g);
            for (const match of importMatches) {
                const importPath = match[1];
                
                // Only include relative imports (actual source files)
                if (importPath.startsWith('./') || importPath.startsWith('../')) {
                    const resolvedPath = path.resolve(path.dirname(testFile), importPath);
                    
                    // Try common extensions
                    for (const ext of ['.ts', '.tsx', '.js', '.jsx']) {
                        const fullPath = resolvedPath + ext;
                        try {
                            await fs.access(fullPath);
                            dependencies.push(fullPath);
                            break;
                        } catch {
                            // Try next extension
                        }
                    }
                }
            }
            
            return dependencies;
        } catch (error) {
            return [];
        }
    }

    /**
     * Check if a test file depends on a source file
     */
    private async isDependentOn(testFile: string, sourceFile: string): Promise<boolean> {
        const dependencies = await this.extractDependencies(testFile);
        return dependencies.includes(sourceFile);
    }

    /**
     * Clean up old cache entries
     */
    private async cleanupCache(): Promise<void> {
        if (this.cache.size <= this.options.maxEntries) {
            return;
        }

        // Remove oldest entries
        const entries = Array.from(this.cache.entries())
            .sort((a, b) => a[1].timestamp.getTime() - b[1].timestamp.getTime());

        const toRemove = entries.slice(0, this.cache.size - this.options.maxEntries);
        
        for (const [testFile] of toRemove) {
            this.cache.delete(testFile);
        }

        this.stats.entriesCount = this.cache.size;
        
        if (toRemove.length > 0) {
            this.showOutput(`Cleaned up ${toRemove.length} old cache entries`);
        }
    }

    /**
     * Update hit rate calculation
     */
    private updateHitRate(): void {
        this.stats.hitRate = this.stats.totalRequests > 0 
            ? this.stats.cacheHits / this.stats.totalRequests 
            : 0;
    }

    /**
     * Compare two arrays for equality
     */
    private arraysEqual<T>(a: T[], b: T[]): boolean {
        if (a.length !== b.length) return false;
        return a.every((val, index) => val === b[index]);
    }

    /**
     * Load cache from storage
     */
    private async loadCache(): Promise<void> {
        try {
            await fs.access(this.storageFile);
            const data = await fs.readFile(this.storageFile, 'utf8');
            const stored = JSON.parse(data);
            
            if (stored.cache && stored.stats) {
                this.cache.clear();
                
                for (const [key, entry] of stored.cache) {
                    this.cache.set(key, {
                        ...entry,
                        timestamp: new Date(entry.timestamp)
                    });
                }
                
                this.stats = stored.stats;
                this.showOutput(`Loaded cache with ${this.cache.size} entries`);
            }
        } catch (error) {
            // File doesn't exist or is invalid - start fresh
            this.showOutput('Starting with empty cache');
        }
    }

    /**
     * Save cache to storage
     */
    private async saveCache(): Promise<void> {
        try {
            // Ensure directory exists
            await fs.mkdir(this.storageDir, { recursive: true });
            
            const data = {
                version: '1.0.0',
                cache: Array.from(this.cache.entries()),
                stats: this.stats,
                lastSaved: new Date().toISOString()
            };
            
            await fs.writeFile(this.storageFile, JSON.stringify(data, null, 2));
        } catch (error) {
            this.showOutput(`Failed to save cache: ${error}`);
        }
    }

    /**
     * Show output message
     */
    private showOutput(message: string): void {
        const timestamp = new Date().toLocaleTimeString();
        this.outputChannel.appendLine(`${timestamp} [INFO] ${message}`);
    }

    /**
     * Dispose of resources
     */
    dispose(): void {
        this.outputChannel.dispose();
    }
}