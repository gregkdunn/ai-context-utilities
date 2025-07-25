/**
 * FixLearningSystem - Learn from successful and failed fix attempts
 * 
 * Tracks which fixes work over time to improve suggestion accuracy.
 * Uses a simple but effective approach to pattern recognition and
 * success rate tracking.
 * 
 * @version 3.0.0
 */

import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import * as path from 'path';
import { TestFailure } from './TestFailureAnalyzer';
import { AutoFix } from './PatternBasedFixer';

/**
 * Represents a pattern learned from fix attempts
 */
export interface FixPattern {
    readonly id: string;
    readonly errorPattern: string;
    readonly errorType: string;
    readonly successfulFixes: string[];
    readonly failedFixes: string[];
    readonly successRate: number;
    readonly totalAttempts: number;
    readonly lastUpdated: Date;
    readonly confidence: number;
}

/**
 * Represents feedback on a fix attempt
 */
export interface FixFeedback {
    readonly fixId: string;
    readonly errorPattern: string;
    readonly appliedFix: string;
    readonly success: boolean;
    readonly timestamp: Date;
    readonly userFeedback?: 'helpful' | 'not_helpful' | 'partially_helpful';
    readonly notes?: string;
}

/**
 * Options for learning system behavior
 */
export interface LearningOptions {
    readonly minAttempts?: number;
    readonly minSuccessRate?: number;
    readonly maxPatterns?: number;
    readonly enableAutolearn?: boolean;
}

/**
 * Simple learning system that improves fix suggestions over time
 */
export class FixLearningSystem {
    private patterns = new Map<string, FixPattern>();
    private readonly storageDir: string;
    private readonly storageFile: string;
    private readonly outputChannel: vscode.OutputChannel;

    constructor(workspaceRoot?: string) {
        this.storageDir = path.join(workspaceRoot || '', '.ai-debug-context');
        this.storageFile = path.join(this.storageDir, 'fix-patterns.json');
        this.outputChannel = vscode.window.createOutputChannel('AI Debug Context - Learning');
        
        // Load existing patterns
        this.loadPatterns().catch(error => {
            this.showOutput(`Failed to load patterns: ${error}`);
        });
    }

    /**
     * Record the outcome of a fix attempt
     */
    async recordFixAttempt(
        failure: TestFailure,
        appliedFix: AutoFix | string,
        success: boolean,
        userFeedback?: FixFeedback['userFeedback'],
        notes?: string
    ): Promise<void> {
        try {
            const fixDescription = typeof appliedFix === 'string' ? appliedFix : appliedFix.description;
            const fixId = typeof appliedFix === 'string' ? 'manual-fix' : appliedFix.id;
            
            const feedback: FixFeedback = {
                fixId,
                errorPattern: this.extractErrorPattern(failure.errorMessage),
                appliedFix: fixDescription,
                success,
                timestamp: new Date(),
                userFeedback,
                notes
            };

            await this.processFeedback(feedback);
            this.showOutput(`Recorded ${success ? 'successful' : 'failed'} fix attempt for: ${failure.testName}`);

        } catch (error) {
            this.showOutput(`Error recording fix attempt: ${error}`);
        }
    }

    /**
     * Get the best suggested fix for an error pattern
     */
    getBestFix(errorMessage: string, errorType: string): FixPattern | null {
        const pattern = this.extractErrorPattern(errorMessage);
        const patternKey = this.generatePatternKey(pattern, errorType);
        
        const storedPattern = this.patterns.get(patternKey);
        
        if (storedPattern && 
            storedPattern.totalAttempts >= 3 && 
            storedPattern.successRate >= 0.6) {
            return storedPattern;
        }
        
        return null;
    }

    /**
     * Get learning statistics
     */
    getLearningStats(): {
        totalPatterns: number;
        reliablePatterns: number;
        totalAttempts: number;
        averageSuccessRate: number;
    } {
        const patterns = Array.from(this.patterns.values());
        const reliablePatterns = patterns.filter(p => 
            p.totalAttempts >= 3 && p.successRate >= 0.6
        );
        
        const totalAttempts = patterns.reduce((sum, p) => sum + p.totalAttempts, 0);
        const averageSuccessRate = patterns.length > 0 
            ? patterns.reduce((sum, p) => sum + p.successRate, 0) / patterns.length 
            : 0;

        return {
            totalPatterns: patterns.length,
            reliablePatterns: reliablePatterns.length,
            totalAttempts,
            averageSuccessRate
        };
    }

    /**
     * Generate fix suggestions based on learned patterns
     */
    generateLearnedSuggestions(failure: TestFailure): AutoFix[] {
        const pattern = this.getBestFix(failure.errorMessage, failure.errorType);
        
        if (!pattern) {
            return [];
        }

        // Generate fixes based on successful patterns
        const fixes: AutoFix[] = [];
        
        for (const successfulFix of pattern.successfulFixes.slice(0, 3)) { // Top 3
            fixes.push({
                id: `learned-${pattern.id}-${Math.random().toString(36).substr(2, 9)}`,
                title: `Learned fix: ${this.summarizeFix(successfulFix)}`,
                description: successfulFix,
                filePath: failure.testFile,
                edits: [], // Learning system suggests approaches, not specific edits
                confidence: pattern.confidence,
                category: 'other'
            });
        }

        return fixes;
    }

    /**
     * Export learning data for analysis or backup
     */
    async exportLearningData(): Promise<string> {
        const data = {
            patterns: Array.from(this.patterns.entries()),
            exportDate: new Date().toISOString(),
            stats: this.getLearningStats()
        };

        return JSON.stringify(data, null, 2);
    }

    /**
     * Import learning data from backup
     */
    async importLearningData(jsonData: string): Promise<void> {
        try {
            const data = JSON.parse(jsonData);
            
            if (data.patterns && Array.isArray(data.patterns)) {
                this.patterns.clear();
                
                for (const [key, pattern] of data.patterns) {
                    this.patterns.set(key, {
                        ...pattern,
                        lastUpdated: new Date(pattern.lastUpdated)
                    });
                }
                
                await this.savePatterns();
                this.showOutput(`Imported ${data.patterns.length} learning patterns`);
            }
        } catch (error) {
            throw new Error(`Failed to import learning data: ${error}`);
        }
    }

    /**
     * Clear all learning data (useful for testing)
     */
    async clearLearningData(): Promise<void> {
        this.patterns.clear();
        await this.savePatterns();
        this.showOutput('Cleared all learning data');
    }

    /**
     * Get patterns that need more data
     */
    getPatternsNeedingData(): FixPattern[] {
        return Array.from(this.patterns.values())
            .filter(p => p.totalAttempts < 5)
            .sort((a, b) => a.totalAttempts - b.totalAttempts);
    }

    /**
     * Get most reliable patterns
     */
    getMostReliablePatterns(limit: number = 10): FixPattern[] {
        return Array.from(this.patterns.values())
            .filter(p => p.totalAttempts >= 3)
            .sort((a, b) => (b.successRate * b.totalAttempts) - (a.successRate * a.totalAttempts))
            .slice(0, limit);
    }

    /**
     * Process feedback and update patterns
     */
    private async processFeedback(feedback: FixFeedback): Promise<void> {
        const patternKey = this.generatePatternKey(feedback.errorPattern, 'unknown');
        let pattern = this.patterns.get(patternKey);

        if (!pattern) {
            // Create new pattern
            pattern = {
                id: this.generatePatternId(),
                errorPattern: feedback.errorPattern,
                errorType: 'unknown',
                successfulFixes: [],
                failedFixes: [],
                successRate: 0,
                totalAttempts: 0,
                lastUpdated: new Date(),
                confidence: 0
            };
        }

        // Update pattern with new feedback
        const updatedPattern = {
            ...pattern,
            successfulFixes: feedback.success 
                ? [...pattern.successfulFixes, feedback.appliedFix]
                : pattern.successfulFixes,
            failedFixes: !feedback.success 
                ? [...pattern.failedFixes, feedback.appliedFix] 
                : pattern.failedFixes,
            totalAttempts: pattern.totalAttempts + 1,
            lastUpdated: new Date()
        };

        updatedPattern.successRate = updatedPattern.successfulFixes.length / updatedPattern.totalAttempts;
        updatedPattern.confidence = this.calculateConfidence(updatedPattern);

        // Remove duplicates and limit array sizes
        const finalPattern = {
            ...updatedPattern,
            successfulFixes: [...new Set(updatedPattern.successfulFixes)].slice(0, 10),
            failedFixes: [...new Set(updatedPattern.failedFixes)].slice(0, 10)
        };

        this.patterns.set(patternKey, finalPattern);
        await this.savePatterns();
    }

    /**
     * Extract a normalized error pattern from error message
     */
    private extractErrorPattern(errorMessage: string): string {
        // Normalize the error message by removing specific values
        return errorMessage
            .replace(/\d+/g, 'NUMBER')
            .replace(/'[^']*'/g, 'STRING')
            .replace(/"[^"]*"/g, 'STRING')
            .replace(/\/[^\/\s]+/g, 'PATH')
            .replace(/\w+\(\)/g, 'FUNCTION')
            .toLowerCase()
            .trim();
    }

    /**
     * Generate a unique key for a pattern
     */
    private generatePatternKey(errorPattern: string, errorType: string): string {
        return `${errorType}:${errorPattern}`;
    }

    /**
     * Generate a unique pattern ID
     */
    private generatePatternId(): string {
        return Math.random().toString(36).substr(2, 9);
    }

    /**
     * Calculate confidence score for a pattern
     */
    private calculateConfidence(pattern: FixPattern): number {
        if (pattern.totalAttempts === 0) return 0;
        
        // Confidence increases with success rate and number of attempts
        const baseConfidence = pattern.successRate;
        const attemptBonus = Math.min(pattern.totalAttempts / 10, 0.3); // Max 30% bonus
        
        return Math.min(baseConfidence + attemptBonus, 1.0);
    }

    /**
     * Create a human-readable summary of a fix
     */
    private summarizeFix(fixDescription: string): string {
        if (fixDescription.length <= 50) {
            return fixDescription;
        }
        
        return fixDescription.substring(0, 47) + '...';
    }

    /**
     * Load patterns from storage
     */
    private async loadPatterns(): Promise<void> {
        try {
            await fs.access(this.storageFile);
            const data = await fs.readFile(this.storageFile, 'utf8');
            const stored = JSON.parse(data);
            
            if (stored.patterns) {
                this.patterns.clear();
                
                for (const [key, pattern] of stored.patterns) {
                    this.patterns.set(key, {
                        ...pattern,
                        lastUpdated: new Date(pattern.lastUpdated)
                    });
                }
                
                this.showOutput(`Loaded ${this.patterns.size} learned patterns`);
            }
        } catch (error) {
            // File doesn't exist or is invalid - start fresh
            this.showOutput('Starting with empty learning data');
        }
    }

    /**
     * Save patterns to storage
     */
    private async savePatterns(): Promise<void> {
        try {
            // Ensure directory exists
            await fs.mkdir(this.storageDir, { recursive: true });
            
            const data = {
                version: '1.0.0',
                patterns: Array.from(this.patterns.entries()),
                lastSaved: new Date().toISOString()
            };
            
            await fs.writeFile(this.storageFile, JSON.stringify(data, null, 2));
        } catch (error) {
            this.showOutput(`Failed to save patterns: ${error}`);
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