/**
 * Intelligent AI Context Filtering
 * Filters and prioritizes relevant context for AI analysis
 * Phase 2.0.2 - Improved AI context quality
 */

import * as fs from 'fs';
import * as path from 'path';

export interface ContextItem {
    type: 'git_diff' | 'test_output' | 'error_log' | 'config_file' | 'source_code';
    content: string;
    relevanceScore: number;
    metadata: {
        filePath?: string;
        timestamp?: number;
        size: number;
        lineCount: number;
    };
}

export interface FilteredContext {
    primary: ContextItem[];
    secondary: ContextItem[];
    excluded: ContextItem[];
    summary: {
        totalItems: number;
        totalSize: number;
        primaryRelevance: number;
        filteringReason: string;
    };
}

export interface FilteringOptions {
    maxTokens: number;
    includeTypes: ContextItem['type'][];
    prioritizeRecent: boolean;
    includeErrorContext: boolean;
    minRelevanceScore: number;
}

/**
 * Intelligent context filtering for AI analysis
 */
export class IntelligentContextFilter {
    private static readonly DEFAULT_OPTIONS: FilteringOptions = {
        maxTokens: 8000, // Conservative token limit for most AI models
        includeTypes: ['git_diff', 'test_output', 'error_log'],
        prioritizeRecent: true,
        includeErrorContext: true,
        minRelevanceScore: 0.3
    };

    constructor(private workspaceRoot: string) {}

    /**
     * Filter and prioritize context items for AI analysis
     */
    filterContext(items: ContextItem[], options: Partial<FilteringOptions> = {}): FilteredContext {
        const opts = { ...IntelligentContextFilter.DEFAULT_OPTIONS, ...options };
        
        // Step 1: Filter by type and minimum relevance
        const typeFiltered = items.filter(item => 
            opts.includeTypes.includes(item.type) && 
            item.relevanceScore >= opts.minRelevanceScore
        );

        // Step 2: Calculate relevance scores
        const scoredItems = this.calculateRelevanceScores(typeFiltered, opts);

        // Step 3: Sort by relevance and recency
        const sortedItems = this.sortByPriority(scoredItems, opts);

        // Step 4: Apply token limit
        const { primary, secondary, excluded } = this.applyTokenLimit(sortedItems, opts.maxTokens);

        // Step 5: Generate summary
        const summary = this.generateSummary(items, primary, secondary, excluded, opts);

        return {
            primary,
            secondary,
            excluded,
            summary
        };
    }

    /**
     * Calculate relevance scores based on content analysis
     */
    private calculateRelevanceScores(items: ContextItem[], options: FilteringOptions): ContextItem[] {
        return items.map(item => ({
            ...item,
            relevanceScore: this.calculateItemRelevance(item, options)
        }));
    }

    /**
     * Calculate relevance score for a single item
     */
    private calculateItemRelevance(item: ContextItem, options: FilteringOptions): number {
        let score = item.relevanceScore; // Base score

        // Boost error-related content
        if (options.includeErrorContext && this.containsErrorIndicators(item.content)) {
            score += 0.3;
        }

        // Boost recent content
        if (options.prioritizeRecent && item.metadata.timestamp) {
            const hoursSinceModified = (Date.now() - item.metadata.timestamp) / (1000 * 60 * 60);
            if (hoursSinceModified < 1) score += 0.2;
            else if (hoursSinceModified < 24) score += 0.1;
        }

        // Penalize very large files (might be noise)
        if (item.metadata.size > 50000) { // 50KB
            score -= 0.1;
        }

        // Boost concise, focused content
        if (item.metadata.lineCount > 0 && item.metadata.lineCount < 100) {
            score += 0.1;
        }

        // Type-specific scoring
        switch (item.type) {
            case 'git_diff':
                score += this.scoreGitDiff(item.content);
                break;
            case 'test_output':
                score += this.scoreTestOutput(item.content);
                break;
            case 'error_log':
                score += this.scoreErrorLog(item.content);
                break;
            case 'config_file':
                score += this.scoreConfigFile(item.content);
                break;
            case 'source_code':
                score += this.scoreSourceCode(item.content);
                break;
        }

        return Math.max(0, Math.min(1, score)); // Clamp between 0 and 1
    }

    /**
     * Score git diff content
     */
    private scoreGitDiff(content: string): number {
        let score = 0;

        // Prefer diffs with actual changes
        const addedLines = (content.match(/^\+[^+]/gm) || []).length;
        const removedLines = (content.match(/^-[^-]/gm) || []).length;
        const totalChanges = addedLines + removedLines;

        if (totalChanges > 0) score += 0.2;
        if (totalChanges > 10) score += 0.1; // Substantial changes
        if (totalChanges > 100) score -= 0.1; // Too many changes might be noise

        // Boost if it contains test files
        if (content.includes('.test.') || content.includes('.spec.')) {
            score += 0.2;
        }

        // Boost if it contains configuration changes
        if (content.includes('package.json') || content.includes('tsconfig.json') || 
            content.includes('.yml') || content.includes('.yaml')) {
            score += 0.1;
        }

        return score;
    }

    /**
     * Score test output content
     */
    private scoreTestOutput(content: string): number {
        let score = 0;

        // Boost failed tests
        if (content.includes('FAIL') || content.includes('✗') || content.includes('failed')) {
            score += 0.3;
        }

        // Boost content with error messages
        if (content.includes('Error:') || content.includes('TypeError:') || 
            content.includes('ReferenceError:')) {
            score += 0.2;
        }

        // Boost content with stack traces
        if (content.includes('at ') && content.includes('.ts:') || content.includes('.js:')) {
            score += 0.1;
        }

        // Penalize very verbose output
        const lineCount = content.split('\n').length;
        if (lineCount > 500) score -= 0.1;

        return score;
    }

    /**
     * Score error log content
     */
    private scoreErrorLog(content: string): number {
        let score = 0.3; // Base boost for errors

        // Boost specific error types that are actionable
        const actionableErrors = [
            'Module not found',
            'Cannot find module',
            'ENOENT',
            'EACCES',
            'Permission denied',
            'Command not found',
            'Syntax error',
            'Type error'
        ];

        for (const errorType of actionableErrors) {
            if (content.toLowerCase().includes(errorType.toLowerCase())) {
                score += 0.2;
                break;
            }
        }

        // Boost if it has stack trace
        if (content.includes('at ') && (content.includes('.ts:') || content.includes('.js:'))) {
            score += 0.1;
        }

        return score;
    }

    /**
     * Score configuration file content
     */
    private scoreConfigFile(content: string): number {
        let score = 0;

        // Boost if it's a package.json with test-related dependencies
        if (content.includes('"jest"') || content.includes('"vitest"') || 
            content.includes('"@nx/') || content.includes('"@angular/')) {
            score += 0.2;
        }

        // Boost TypeScript config
        if (content.includes('"compilerOptions"') || content.includes('"extends"')) {
            score += 0.1;
        }

        return score;
    }

    /**
     * Score source code content
     */
    private scoreSourceCode(content: string): number {
        let score = 0;

        // Boost test files
        if (content.includes('describe(') || content.includes('it(') || 
            content.includes('test(') || content.includes('expect(')) {
            score += 0.2;
        }

        // Boost if it contains error handling
        if (content.includes('try {') || content.includes('catch (') || 
            content.includes('throw ') || content.includes('Error(')) {
            score += 0.1;
        }

        // Penalize very long files
        const lineCount = content.split('\n').length;
        if (lineCount > 1000) score -= 0.2;

        return score;
    }

    /**
     * Check if content contains error indicators
     */
    private containsErrorIndicators(content: string): boolean {
        const errorIndicators = [
            'error', 'failed', 'fail', 'exception', 'stack trace',
            'ENOENT', 'EACCES', 'TypeError', 'ReferenceError', 
            'SyntaxError', 'Cannot find', 'not found'
        ];

        const lowerContent = content.toLowerCase();
        return errorIndicators.some(indicator => lowerContent.includes(indicator));
    }

    /**
     * Sort items by priority (relevance + recency)
     */
    private sortByPriority(items: ContextItem[], options: FilteringOptions): ContextItem[] {
        return items.sort((a, b) => {
            // Primary sort: relevance score
            if (Math.abs(a.relevanceScore - b.relevanceScore) > 0.05) {
                return b.relevanceScore - a.relevanceScore;
            }

            // Secondary sort: recency (if prioritizing recent)
            if (options.prioritizeRecent && a.metadata.timestamp && b.metadata.timestamp) {
                return b.metadata.timestamp - a.metadata.timestamp;
            }

            // Tertiary sort: size (prefer smaller, more focused content)
            return a.metadata.size - b.metadata.size;
        });
    }

    /**
     * Apply token limit by progressively including items
     */
    private applyTokenLimit(items: ContextItem[], maxTokens: number): {
        primary: ContextItem[];
        secondary: ContextItem[];
        excluded: ContextItem[];
    } {
        const primary: ContextItem[] = [];
        const secondary: ContextItem[] = [];
        const excluded: ContextItem[] = [];

        let currentTokens = 0;
        const reserveTokens = Math.floor(maxTokens * 0.2); // Reserve 20% for secondary

        // First pass: add high-relevance items to primary
        for (const item of items) {
            const itemTokens = this.estimateTokens(item.content);
            
            if (item.relevanceScore >= 0.7 && 
                currentTokens + itemTokens <= maxTokens - reserveTokens) {
                primary.push(item);
                currentTokens += itemTokens;
            } else if (item.relevanceScore >= 0.5) {
                secondary.push(item);
            } else {
                excluded.push(item);
            }
        }

        // Second pass: fill remaining space with secondary items
        const remainingTokens = maxTokens - currentTokens;
        let secondaryTokens = 0;

        for (const item of secondary.slice()) {
            const itemTokens = this.estimateTokens(item.content);
            
            if (secondaryTokens + itemTokens <= remainingTokens) {
                // Move from secondary to primary
                const index = secondary.indexOf(item);
                secondary.splice(index, 1);
                primary.push(item);
                secondaryTokens += itemTokens;
            }
        }

        return { primary, secondary, excluded };
    }

    /**
     * Estimate token count for content (rough approximation)
     */
    private estimateTokens(content: string): number {
        // Rough approximation: 1 token ≈ 4 characters for English text
        // Code and structured text might be different, but this is a reasonable estimate
        return Math.ceil(content.length / 4);
    }

    /**
     * Generate filtering summary
     */
    private generateSummary(
        originalItems: ContextItem[],
        primary: ContextItem[],
        secondary: ContextItem[],
        excluded: ContextItem[],
        options: FilteringOptions
    ) {
        const totalSize = originalItems.reduce((sum, item) => sum + item.metadata.size, 0);
        const primaryRelevance = primary.length > 0 
            ? primary.reduce((sum, item) => sum + item.relevanceScore, 0) / primary.length
            : 0;

        let filteringReason = '';
        if (excluded.length > 0) {
            filteringReason += `${excluded.length} items excluded due to low relevance or token limits. `;
        }
        if (secondary.length > 0) {
            filteringReason += `${secondary.length} items moved to secondary due to space constraints.`;
        }
        if (!filteringReason) {
            filteringReason = 'All items included in primary context.';
        }

        return {
            totalItems: originalItems.length,
            totalSize,
            primaryRelevance,
            filteringReason: filteringReason.trim()
        };
    }

    /**
     * Create context item from file
     */
    static async createContextItemFromFile(
        filePath: string,
        type: ContextItem['type'],
        baseRelevance: number = 0.5
    ): Promise<ContextItem | null> {
        try {
            const content = await fs.promises.readFile(filePath, 'utf8');
            const stats = await fs.promises.stat(filePath);
            
            return {
                type,
                content,
                relevanceScore: baseRelevance,
                metadata: {
                    filePath,
                    timestamp: stats.mtime.getTime(),
                    size: stats.size,
                    lineCount: content.split('\n').length
                }
            };
        } catch (error) {
            console.warn(`Failed to create context item from file ${filePath}:`, error);
            return null;
        }
    }

    /**
     * Create context item from string content
     */
    static createContextItemFromString(
        content: string,
        type: ContextItem['type'],
        baseRelevance: number = 0.5,
        metadata: Partial<ContextItem['metadata']> = {}
    ): ContextItem {
        return {
            type,
            content,
            relevanceScore: baseRelevance,
            metadata: {
                timestamp: Date.now(),
                size: content.length,
                lineCount: content.split('\n').length,
                ...metadata
            }
        };
    }

    /**
     * Format filtered context for AI consumption
     */
    static formatForAI(filteredContext: FilteredContext): string {
        let formatted = '# AI Debug Context\n\n';
        
        // Add summary
        formatted += `## Context Summary\n`;
        formatted += `- Total items analyzed: ${filteredContext.summary.totalItems}\n`;
        formatted += `- Primary items included: ${filteredContext.primary.length}\n`;
        formatted += `- Average relevance: ${(filteredContext.summary.primaryRelevance * 100).toFixed(1)}%\n`;
        formatted += `- Filtering: ${filteredContext.summary.filteringReason}\n\n`;

        // Add primary context
        if (filteredContext.primary.length > 0) {
            formatted += `## Primary Context (High Relevance)\n\n`;
            
            for (const [index, item] of filteredContext.primary.entries()) {
                formatted += `### ${index + 1}. ${item.type.replace('_', ' ').toUpperCase()}`;
                if (item.metadata.filePath) {
                    formatted += ` - ${path.basename(item.metadata.filePath)}`;
                }
                formatted += ` (${(item.relevanceScore * 100).toFixed(0)}% relevance)\n\n`;
                formatted += '```\n';
                formatted += item.content.trim();
                formatted += '\n```\n\n';
            }
        }

        // Add secondary context if space allows
        if (filteredContext.secondary.length > 0 && filteredContext.secondary.length <= 3) {
            formatted += `## Secondary Context (Medium Relevance)\n\n`;
            
            for (const [index, item] of filteredContext.secondary.entries()) {
                formatted += `### ${index + 1}. ${item.type.replace('_', ' ').toUpperCase()}`;
                if (item.metadata.filePath) {
                    formatted += ` - ${path.basename(item.metadata.filePath)}`;
                }
                formatted += ` (${(item.relevanceScore * 100).toFixed(0)}% relevance)\n\n`;
                
                // Truncate secondary content to save space
                const truncatedContent = item.content.length > 500 
                    ? item.content.substring(0, 500) + '\n... (truncated)'
                    : item.content;
                
                formatted += '```\n';
                formatted += truncatedContent.trim();
                formatted += '\n```\n\n';
            }
        }

        return formatted;
    }
}