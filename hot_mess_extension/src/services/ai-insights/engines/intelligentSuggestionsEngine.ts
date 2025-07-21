import * as vscode from 'vscode';
import { 
    CommandSuggestion, 
    ExecutionContext, 
    CommandExecution,
    AnalysisData,
    PredictionResult,
    TestResult,
    GitStatus,
    ErrorPattern
} from '../../../types';

/**
 * Enhanced Intelligent Command Suggestions Engine for Phase 4.2
 * Provides context-aware, pattern-based command recommendations with ML-like insights
 */
export class IntelligentSuggestionsEngine {
    private patternDatabase: Map<string, CommandPattern> = new Map();
    private successPredictors: Map<string, SuccessPredictor> = new Map();
    private contextHistory: ContextHistoryEntry[] = [];
    private readonly maxHistorySize = 1000;

    constructor(private context: vscode.ExtensionContext) {
        this.initializePatternDatabase();
        this.loadHistoricalPatterns();
    }

    /**
     * Generate intelligent command suggestions based on current context
     * Enhanced with pattern recognition and success prediction
     */
    async generateIntelligentSuggestions(context: ExecutionContext): Promise<CommandSuggestion[]> {
        const suggestions: CommandSuggestion[] = [];
        
        try {
            // Phase 4.2: Enhanced context analysis
            const contextSignature = this.generateContextSignature(context);
            const patterns = await this.findMatchingPatterns(contextSignature);
            const predictions = await this.predictCommandSuccess(context);
            
            // Generate base suggestions
            const baseSuggestions = await this.generateBaseSuggestions(context);
            
            // Enhance suggestions with pattern-based insights
            for (const suggestion of baseSuggestions) {
                const enhancedSuggestion = await this.enhanceSuggestionWithPatterns(
                    suggestion, 
                    patterns, 
                    predictions
                );
                suggestions.push(enhancedSuggestion);
            }
            
            // Add pattern-derived suggestions
            const patternSuggestions = await this.generatePatternBasedSuggestions(patterns, context);
            suggestions.push(...patternSuggestions);
            
            // Add proactive suggestions based on failure prediction
            const proactiveSuggestions = await this.generateProactiveSuggestions(context, predictions);
            suggestions.push(...proactiveSuggestions);
            
            // Sort by confidence and relevance
            suggestions.sort((a, b) => {
                const scoreA = this.calculateSuggestionScore(a, context);
                const scoreB = this.calculateSuggestionScore(b, context);
                return scoreB - scoreA;
            });
            
            // Record context for learning
            this.recordContextForLearning(context, suggestions);
            
            console.log(`Generated ${suggestions.length} intelligent suggestions`);
            return suggestions.slice(0, 8); // Return top 8 suggestions
            
        } catch (error) {
            console.error('Error generating intelligent suggestions:', error);
            return [];
        }
    }

    /**
     * Analyze command execution patterns to improve future suggestions
     */
    async analyzeExecutionPatterns(executions: CommandExecution[]): Promise<CommandPattern[]> {
        const patterns: CommandPattern[] = [];
        
        try {
            // Group executions by context similarity
            const contextGroups = this.groupExecutionsByContext(executions);
            
            for (const [contextSignature, groupExecutions] of contextGroups.entries()) {
                const pattern = await this.extractPattern(contextSignature, groupExecutions);
                if (pattern.confidence > 0.5) {
                    patterns.push(pattern);
                    this.patternDatabase.set(pattern.id, pattern);
                }
            }
            
            // Update success predictors
            await this.updateSuccessPredictors(executions);
            
            console.log(`Analyzed ${executions.length} executions, found ${patterns.length} patterns`);
            return patterns;
            
        } catch (error) {
            console.error('Error analyzing execution patterns:', error);
            return [];
        }
    }

    /**
     * Predict likelihood of command success based on current context
     */
    async predictCommandSuccess(context: ExecutionContext): Promise<Map<string, SuccessPrediction>> {
        const predictions = new Map<string, SuccessPrediction>();
        
        try {
            const commands = ['aiDebug', 'nxTest', 'gitDiff', 'prepareToPush'];
            
            for (const command of commands) {
                const prediction = await this.calculateSuccessProbability(command, context);
                predictions.set(command, prediction);
            }
            
            return predictions;
            
        } catch (error) {
            console.error('Error predicting command success:', error);
            return new Map();
        }
    }

    // Private implementation methods

    private initializePatternDatabase(): void {
        // Initialize with common patterns
        const commonPatterns: CommandPattern[] = [
            {
                id: 'test-failure-debug-cycle',
                name: 'Test Failure Debug Cycle',
                description: 'Pattern for debugging failing tests',
                contextSignature: 'failing-tests-*',
                commandSequence: ['nxTest', 'aiDebug', 'nxTest'],
                successRate: 0.85,
                confidence: 0.9,
                conditions: {
                    testStatus: { failing: '>0' },
                    gitStatus: { hasUncommittedChanges: true }
                },
                outcomes: {
                    successfulResolution: 0.85,
                    partialResolution: 0.12,
                    noResolution: 0.03
                },
                lastUpdated: new Date(),
                usageCount: 0
            },
            {
                id: 'pre-commit-validation',
                name: 'Pre-commit Validation',
                description: 'Complete validation before committing changes',
                contextSignature: 'uncommitted-changes-passing-tests',
                commandSequence: ['nxTest', 'aiDebug', 'prepareToPush'],
                successRate: 0.92,
                confidence: 0.95,
                conditions: {
                    testStatus: { failing: '=0' },
                    gitStatus: { hasUncommittedChanges: true }
                },
                outcomes: {
                    successfulResolution: 0.92,
                    partialResolution: 0.06,
                    noResolution: 0.02
                },
                lastUpdated: new Date(),
                usageCount: 0
            }
        ];

        commonPatterns.forEach(pattern => {
            this.patternDatabase.set(pattern.id, pattern);
        });
    }

    private async loadHistoricalPatterns(): Promise<void> {
        try {
            const historicalData = this.context.globalState.get<string>('ai-insights-patterns');
            if (historicalData) {
                const patterns = JSON.parse(historicalData) as CommandPattern[];
                patterns.forEach(pattern => {
                    this.patternDatabase.set(pattern.id, pattern);
                });
                console.log(`Loaded ${patterns.length} historical patterns`);
            }
        } catch (error) {
            console.error('Error loading historical patterns:', error);
        }
    }

    private generateContextSignature(context: ExecutionContext): string {
        const parts = [
            `project:${context.project}`,
            `files:${context.currentFiles.length}`,
            `tests:${context.testStatus.failing}/${context.testStatus.passing}`,
            `git:${context.gitStatus.hasUncommittedChanges ? 'dirty' : 'clean'}`,
            `branch:${context.gitStatus.branch}`,
            `recent:${context.recentCommands.length}`
        ];
        
        return parts.join('|');
    }

    private async findMatchingPatterns(contextSignature: string): Promise<CommandPattern[]> {
        const matches: CommandPattern[] = [];
        
        for (const pattern of this.patternDatabase.values()) {
            const similarity = this.calculateContextSimilarity(contextSignature, pattern.contextSignature);
            if (similarity > 0.6) {
                matches.push({ ...pattern, confidence: pattern.confidence * similarity });
            }
        }
        
        return matches.sort((a, b) => b.confidence - a.confidence);
    }

    private calculateContextSimilarity(signature1: string, signature2: string): number {
        const parts1 = signature1.split('|');
        const parts2 = signature2.split('|');
        
        let matches = 0;
        let total = Math.max(parts1.length, parts2.length);
        
        for (let i = 0; i < Math.min(parts1.length, parts2.length); i++) {
            if (parts1[i] === parts2[i] || parts2[i].includes('*')) {
                matches++;
            }
        }
        
        return matches / total;
    }

    private async generateBaseSuggestions(context: ExecutionContext): Promise<CommandSuggestion[]> {
        const suggestions: CommandSuggestion[] = [];
        
        // Test-related suggestions
        if (context.testStatus.failing > 0) {
            suggestions.push({
                command: 'nxTest',
                reason: `${context.testStatus.failing} tests are failing`,
                confidence: 0.9,
                estimatedImpact: 'high',
                context: {
                    trigger: 'test-failures',
                    relatedFiles: context.testStatus.failingTests.map(t => t.suite),
                    similarPatterns: ['test-failure-debug-cycle']
                },
                options: { focus: 'tests' }
            });
        }
        
        // Git-related suggestions
        if (context.gitStatus.hasUncommittedChanges) {
            suggestions.push({
                command: 'gitDiff',
                reason: 'Review uncommitted changes',
                confidence: 0.8,
                estimatedImpact: 'medium',
                context: {
                    trigger: 'uncommitted-changes',
                    relatedFiles: context.gitStatus.changedFiles,
                    similarPatterns: ['change-review-pattern']
                }
            });
        }
        
        // Performance suggestions
        if (context.recentCommands.some(cmd => cmd.endTime && cmd.startTime && 
            (cmd.endTime.getTime() - cmd.startTime.getTime()) > 300000)) {
            suggestions.push({
                command: 'aiDebug',
                reason: 'Recent commands were slow, analyze performance',
                confidence: 0.7,
                estimatedImpact: 'medium',
                context: {
                    trigger: 'performance-concern',
                    relatedFiles: context.currentFiles,
                    similarPatterns: ['performance-optimization']
                },
                options: { focus: 'performance' }
            });
        }
        
        return suggestions;
    }

    private async enhanceSuggestionWithPatterns(
        suggestion: CommandSuggestion, 
        patterns: CommandPattern[], 
        predictions: Map<string, SuccessPrediction>
    ): Promise<CommandSuggestion> {
        const relevantPatterns = patterns.filter(p => 
            p.commandSequence.includes(suggestion.command)
        );
        
        if (relevantPatterns.length > 0) {
            const bestPattern = relevantPatterns[0];
            suggestion.confidence = Math.min(
                suggestion.confidence * 1.2, 
                suggestion.confidence + (bestPattern.successRate * 0.3)
            );
            suggestion.context.similarPatterns.push(bestPattern.id);
        }
        
        const prediction = predictions.get(suggestion.command);
        if (prediction) {
            suggestion.confidence = Math.min(
                suggestion.confidence * prediction.probability,
                0.95
            );
        }
        
        return suggestion;
    }

    private async generatePatternBasedSuggestions(
        patterns: CommandPattern[], 
        context: ExecutionContext
    ): Promise<CommandSuggestion[]> {
        const suggestions: CommandSuggestion[] = [];
        
        for (const pattern of patterns.slice(0, 3)) {
            if (pattern.commandSequence.length > 0) {
                const nextCommand = pattern.commandSequence[0];
                suggestions.push({
                    command: nextCommand as any,
                    reason: `Pattern-based: ${pattern.description}`,
                    confidence: pattern.confidence * 0.8,
                    estimatedImpact: pattern.successRate > 0.8 ? 'high' : 'medium',
                    context: {
                        trigger: 'pattern-match',
                        relatedFiles: context.currentFiles,
                        similarPatterns: [pattern.id]
                    }
                });
            }
        }
        
        return suggestions;
    }

    private async generateProactiveSuggestions(
        context: ExecutionContext, 
        predictions: Map<string, SuccessPrediction>
    ): Promise<CommandSuggestion[]> {
        const suggestions: CommandSuggestion[] = [];
        
        // Proactive test suggestion if tests haven't been run recently
        const lastTestRun = context.recentCommands
            .filter(cmd => cmd.action === 'nxTest')
            .sort((a, b) => b.startTime.getTime() - a.startTime.getTime())[0];
        
        if (!lastTestRun || 
            (Date.now() - lastTestRun.startTime.getTime()) > 3600000) { // 1 hour
            suggestions.push({
                command: 'nxTest',
                reason: 'Proactive: Tests haven\'t been run recently',
                confidence: 0.6,
                estimatedImpact: 'medium',
                context: {
                    trigger: 'proactive-testing',
                    relatedFiles: context.currentFiles,
                    similarPatterns: ['regular-testing-pattern']
                }
            });
        }
        
        return suggestions;
    }

    private calculateSuggestionScore(suggestion: CommandSuggestion, context: ExecutionContext): number {
        let score = suggestion.confidence;
        
        // Boost score based on impact
        const impactMultiplier = {
            'high': 1.3,
            'medium': 1.1,
            'low': 0.9
        };
        score *= impactMultiplier[suggestion.estimatedImpact];
        
        // Boost score based on context relevance
        if (suggestion.context.relatedFiles.length > 0) {
            score *= 1.1;
        }
        
        if (suggestion.context.similarPatterns.length > 0) {
            score *= 1.2;
        }
        
        return score;
    }

    private groupExecutionsByContext(executions: CommandExecution[]): Map<string, CommandExecution[]> {
        const groups = new Map<string, CommandExecution[]>();
        
        for (const execution of executions) {
            // Simplified context signature for grouping
            const signature = `${execution.project}-${execution.action}`;
            
            if (!groups.has(signature)) {
                groups.set(signature, []);
            }
            groups.get(signature)!.push(execution);
        }
        
        return groups;
    }

    private async extractPattern(
        contextSignature: string, 
        executions: CommandExecution[]
    ): Promise<CommandPattern> {
        const successfulExecutions = executions.filter(e => e.status === 'completed');
        const successRate = successfulExecutions.length / executions.length;
        
        return {
            id: `pattern_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: `Extracted Pattern for ${contextSignature}`,
            description: `Pattern extracted from ${executions.length} executions`,
            contextSignature,
            commandSequence: executions.map(e => e.action),
            successRate,
            confidence: Math.min(successRate + 0.1, 0.95),
            conditions: {},
            outcomes: {
                successfulResolution: successRate,
                partialResolution: Math.max(0, 1 - successRate - 0.1),
                noResolution: Math.max(0, 0.1)
            },
            lastUpdated: new Date(),
            usageCount: executions.length
        };
    }

    private async updateSuccessPredictors(executions: CommandExecution[]): Promise<void> {
        for (const execution of executions) {
            const predictorKey = `${execution.action}-${execution.project}`;
            
            if (!this.successPredictors.has(predictorKey)) {
                this.successPredictors.set(predictorKey, {
                    command: execution.action,
                    project: execution.project,
                    successCount: 0,
                    totalCount: 0,
                    lastUpdated: new Date()
                });
            }
            
            const predictor = this.successPredictors.get(predictorKey)!;
            predictor.totalCount++;
            if (execution.status === 'completed') {
                predictor.successCount++;
            }
            predictor.lastUpdated = new Date();
        }
    }

    private async calculateSuccessProbability(
        command: string, 
        context: ExecutionContext
    ): Promise<SuccessPrediction> {
        const predictorKey = `${command}-${context.project}`;
        const predictor = this.successPredictors.get(predictorKey);
        
        let baseProbability = 0.7; // Default probability
        
        if (predictor && predictor.totalCount > 0) {
            baseProbability = predictor.successCount / predictor.totalCount;
        }
        
        // Adjust probability based on context
        let adjustedProbability = baseProbability;
        
        // Test failures reduce success probability for nxTest
        if (command === 'nxTest' && context.testStatus.failing > 0) {
            adjustedProbability *= 0.6;
        }
        
        // Uncommitted changes can affect prepareToPush
        if (command === 'prepareToPush' && context.gitStatus.hasUncommittedChanges) {
            adjustedProbability *= 0.8;
        }
        
        return {
            probability: adjustedProbability,
            factors: [
                `Historical success rate: ${(baseProbability * 100).toFixed(1)}%`,
                `Context adjustments applied`
            ],
            confidence: predictor ? Math.min(predictor.totalCount / 10, 1) : 0.5
        };
    }

    private recordContextForLearning(context: ExecutionContext, suggestions: CommandSuggestion[]): void {
        const entry: ContextHistoryEntry = {
            contextSignature: this.generateContextSignature(context),
            timestamp: new Date(),
            suggestions: suggestions.map(s => ({ command: s.command, confidence: s.confidence })),
            context: {
                project: context.project,
                testStatus: context.testStatus,
                gitStatus: context.gitStatus,
                fileCount: context.currentFiles.length
            }
        };
        
        this.contextHistory.push(entry);
        
        // Limit history size
        if (this.contextHistory.length > this.maxHistorySize) {
            this.contextHistory = this.contextHistory.slice(-this.maxHistorySize);
        }
    }

    /**
     * Save patterns to persistent storage
     */
    async savePatterns(): Promise<void> {
        try {
            const patterns = Array.from(this.patternDatabase.values());
            await this.context.globalState.update(
                'ai-insights-patterns', 
                JSON.stringify(patterns)
            );
            console.log(`Saved ${patterns.length} patterns to storage`);
        } catch (error) {
            console.error('Error saving patterns:', error);
        }
    }

    dispose(): void {
        this.savePatterns();
        this.patternDatabase.clear();
        this.successPredictors.clear();
        this.contextHistory = [];
    }
}

// Supporting interfaces for Phase 4.2

interface CommandPattern {
    id: string;
    name: string;
    description: string;
    contextSignature: string;
    commandSequence: string[];
    successRate: number;
    confidence: number;
    conditions: Record<string, any>;
    outcomes: {
        successfulResolution: number;
        partialResolution: number;
        noResolution: number;
    };
    lastUpdated: Date;
    usageCount: number;
}

interface SuccessPredictor {
    command: string;
    project: string;
    successCount: number;
    totalCount: number;
    lastUpdated: Date;
}

interface SuccessPrediction {
    probability: number;
    factors: string[];
    confidence: number;
}

interface ContextHistoryEntry {
    contextSignature: string;
    timestamp: Date;
    suggestions: { command: string; confidence: number }[];
    context: {
        project: string;
        testStatus: any;
        gitStatus: any;
        fileCount: number;
    };
}
