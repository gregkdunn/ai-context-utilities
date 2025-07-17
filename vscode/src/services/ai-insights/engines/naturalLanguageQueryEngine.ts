import * as vscode from 'vscode';
import { 
    QueryResult, 
    ActionSuggestion,
    CommandExecution,
    TestResult,
    ErrorPattern,
    AnalysisData
} from '../../../types';

/**
 * Enhanced Natural Language Query Interface for Phase 4.2
 * Provides sophisticated natural language processing for debugging queries
 */
export class NaturalLanguageQueryEngine {
    private queryHistory: QueryHistory[] = [];
    private entityExtractor: EntityExtractor;
    private intentClassifier: IntentClassifier;
    private responseGenerator: ResponseGenerator;
    private readonly maxHistorySize = 500;

    constructor(private context: vscode.ExtensionContext) {
        this.entityExtractor = new EntityExtractor();
        this.intentClassifier = new IntentClassifier();
        this.responseGenerator = new ResponseGenerator();
        this.loadQueryHistory();
    }

    /**
     * Process natural language query with enhanced understanding
     */
    async processQuery(query: string, context?: AnalysisData): Promise<QueryResult> {
        try {
            console.log(`Processing natural language query: "${query}"`);
            
            // Preprocess query
            const preprocessedQuery = this.preprocessQuery(query);
            
            // Extract entities and intent in parallel
            const [entities, intent] = await Promise.all([
                this.entityExtractor.extractEntities(preprocessedQuery),
                this.intentClassifier.classifyIntent(preprocessedQuery)
            ]);
            
            // Calculate confidence based on entity and intent quality
            const confidence = this.calculateQueryConfidence(intent, entities, preprocessedQuery);
            
            // Generate response based on intent and entities
            const response = await this.responseGenerator.generateResponse(
                intent, 
                entities, 
                preprocessedQuery, 
                context
            );
            
            // Generate contextual action suggestions
            const suggestedActions = await this.generateActionSuggestions(
                intent, 
                entities, 
                context
            );
            
            // Fetch relevant data if available
            const data = await this.fetchQueryData(intent, entities, context);
            
            // Create and store query result
            const result: QueryResult = {
                intent,
                entities,
                confidence,
                response,
                suggestedActions,
                data
            };
            
            // Record query for learning
            this.recordQuery(query, result);
            
            console.log(`Query processed with ${confidence.toFixed(2)} confidence`);
            return result;
            
        } catch (error) {
            console.error('Error processing natural language query:', error);
            return this.createErrorResponse(query);
        }
    }

    /**
     * Get query suggestions based on current context
     */
    async getQuerySuggestions(context?: AnalysisData): Promise<string[]> {
        const suggestions: string[] = [];
        
        try {
            // Base suggestions
            suggestions.push(
                "Show me failing tests from this week",
                "What's causing the performance issues?",
                "Find errors in the checkout module",
                "How can I improve test coverage?",
                "Show recent build failures"
            );
            
            // Context-aware suggestions
            if (context) {
                const contextSuggestions = await this.generateContextualSuggestions(context);
                suggestions.push(...contextSuggestions);
            }
            
            // Historical suggestions based on common queries
            const popularSuggestions = this.getPopularQuerySuggestions();
            suggestions.push(...popularSuggestions);
            
            return suggestions.slice(0, 8); // Return top 8 suggestions
            
        } catch (error) {
            console.error('Error generating query suggestions:', error);
            return suggestions.slice(0, 5);
        }
    }

    /**
     * Analyze query patterns to improve understanding
     */
    async analyzeQueryPatterns(): Promise<QueryPattern[]> {
        const patterns: QueryPattern[] = [];
        
        try {
            // Group queries by intent
            const intentGroups = this.groupQueriesByIntent();
            
            for (const [intent, queries] of intentGroups.entries()) {
                const pattern = this.extractQueryPattern(intent, queries);
                if (pattern.confidence > 0.6) {
                    patterns.push(pattern);
                }
            }
            
            // Update classifiers based on patterns
            await this.updateClassifiersFromPatterns(patterns);
            
            console.log(`Analyzed ${this.queryHistory.length} queries, found ${patterns.length} patterns`);
            return patterns;
            
        } catch (error) {
            console.error('Error analyzing query patterns:', error);
            return [];
        }
    }

    // Private implementation methods

    private preprocessQuery(query: string): string {
        return query
            .toLowerCase()
            .trim()
            .replace(/[^\w\s\?\!]/g, ' ')
            .replace(/\s+/g, ' ');
    }

    private calculateQueryConfidence(
        intent: string, 
        entities: Record<string, any>, 
        query: string
    ): number {
        let confidence = 0.5; // Base confidence
        
        // Intent confidence
        if (intent !== 'unknown' && intent !== 'unclear') {
            confidence += 0.3;
        }
        
        // Entity confidence
        const entityCount = Object.keys(entities).length;
        if (entityCount > 0) {
            confidence += Math.min(entityCount * 0.1, 0.2);
        }
        
        // Query length and structure
        const words = query.split(' ').length;
        if (words >= 3 && words <= 15) {
            confidence += 0.1;
        }
        
        // Question structure
        if (query.includes('?') || query.startsWith('what') || 
            query.startsWith('how') || query.startsWith('show')) {
            confidence += 0.1;
        }
        
        return Math.min(confidence, 0.95);
    }

    private async generateActionSuggestions(
        intent: string, 
        entities: Record<string, any>, 
        context?: AnalysisData
    ): Promise<ActionSuggestion[]> {
        const suggestions: ActionSuggestion[] = [];
        
        switch (intent) {
            case 'test-query':
                suggestions.push({
                    id: this.generateSuggestionId(),
                    title: 'Run Test Analysis',
                    description: 'Execute comprehensive test analysis',
                    action: {
                        type: 'command',
                        data: { command: 'nxTest', options: { focus: 'tests' } }
                    },
                    estimatedImpact: 'high',
                    estimatedEffort: 'minutes'
                });
                break;
                
            case 'performance-query':
                suggestions.push({
                    id: this.generateSuggestionId(),
                    title: 'Performance Analysis',
                    description: 'Run detailed performance analysis',
                    action: {
                        type: 'command',
                        data: { command: 'aiDebug', options: { focus: 'performance' } }
                    },
                    estimatedImpact: 'high',
                    estimatedEffort: 'minutes'
                });
                break;
                
            case 'error-query':
                suggestions.push({
                    id: this.generateSuggestionId(),
                    title: 'Error Investigation',
                    description: 'Investigate and analyze error patterns',
                    action: {
                        type: 'command',
                        data: { command: 'aiDebug', options: { focus: 'errors' } }
                    },
                    estimatedImpact: 'high',
                    estimatedEffort: 'minutes'
                });
                break;
                
            case 'git-query':
                suggestions.push({
                    id: this.generateSuggestionId(),
                    title: 'Git Analysis',
                    description: 'Analyze git history and changes',
                    action: {
                        type: 'command',
                        data: { command: 'gitDiff' }
                    },
                    estimatedImpact: 'medium',
                    estimatedEffort: 'minutes'
                });
                break;
                
            case 'build-query':
                suggestions.push({
                    id: this.generateSuggestionId(),
                    title: 'Build Analysis',
                    description: 'Analyze build process and issues',
                    action: {
                        type: 'command',
                        data: { command: 'prepareToPush' }
                    },
                    estimatedImpact: 'high',
                    estimatedEffort: 'minutes'
                });
                break;
        }
        
        // Add context-specific suggestions
        if (context) {
            const contextSuggestions = await this.generateContextualActionSuggestions(intent, entities, context);
            suggestions.push(...contextSuggestions);
        }
        
        return suggestions;
    }

    private async generateContextualActionSuggestions(
        intent: string, 
        entities: Record<string, any>, 
        context: AnalysisData
    ): Promise<ActionSuggestion[]> {
        const suggestions: ActionSuggestion[] = [];
        
        // If asking about tests and there are failing tests
        if (intent === 'test-query' && context.testResults.some(t => t.status === 'failed')) {
            suggestions.push({
                id: this.generateSuggestionId(),
                title: 'Focus on Failing Tests',
                description: 'Run only the currently failing tests',
                action: {
                    type: 'command',
                    data: { command: 'nxTest', options: { focus: 'failing' } }
                },
                estimatedImpact: 'high',
                estimatedEffort: 'minutes'
            });
        }
        
        // If asking about errors and there are recurring patterns
        if (intent === 'error-query' && context.errorPatterns.some(e => e.frequency > 3)) {
            suggestions.push({
                id: this.generateSuggestionId(),
                title: 'Address Recurring Errors',
                description: 'Focus on the most frequent error patterns',
                action: {
                    type: 'command',
                    data: { command: 'aiDebug', options: { focus: 'recurring-errors' } }
                },
                estimatedImpact: 'high',
                estimatedEffort: 'minutes'
            });
        }
        
        return suggestions;
    }

    private async fetchQueryData(
        intent: string, 
        entities: Record<string, any>, 
        context?: AnalysisData
    ): Promise<any> {
        if (!context) return null;
        
        const data: any = {};
        
        switch (intent) {
            case 'test-query':
                data.testResults = context.testResults;
                data.testSummary = this.summarizeTestResults(context.testResults);
                break;
                
            case 'error-query':
                data.errorPatterns = context.errorPatterns;
                data.errorSummary = this.summarizeErrorPatterns(context.errorPatterns);
                break;
                
            case 'performance-query':
                data.performanceMetrics = context.performanceMetrics;
                data.performanceSummary = this.summarizePerformanceMetrics(context.performanceMetrics);
                break;
                
            case 'git-query':
                data.gitHistory = context.gitHistory;
                data.gitSummary = this.summarizeGitHistory(context.gitHistory);
                break;
        }
        
        return data;
    }

    private async generateContextualSuggestions(context: AnalysisData): Promise<string[]> {
        const suggestions: string[] = [];
        
        // Test-related suggestions
        const failingTests = context.testResults.filter(t => t.status === 'failed');
        if (failingTests.length > 0) {
            suggestions.push(`Show me the ${failingTests.length} failing tests`);
            suggestions.push("Why are tests failing?");
        }
        
        // Error-related suggestions
        const frequentErrors = context.errorPatterns.filter(e => e.frequency > 3);
        if (frequentErrors.length > 0) {
            suggestions.push("What are the most common errors?");
            suggestions.push("How to fix recurring errors?");
        }
        
        // Performance suggestions
        if (context.performanceMetrics.length > 0) {
            suggestions.push("Show performance trends");
            suggestions.push("What's slowing down the build?");
        }
        
        // Git suggestions
        if (context.gitHistory.length > 0) {
            suggestions.push("Show recent commits");
            suggestions.push("What files changed recently?");
        }
        
        return suggestions;
    }

    private getPopularQuerySuggestions(): string[] {
        const queryFrequency = new Map<string, number>();
        
        // Count query patterns
        for (const entry of this.queryHistory) {
            const normalizedQuery = this.normalizeQueryForPattern(entry.query);
            queryFrequency.set(normalizedQuery, (queryFrequency.get(normalizedQuery) || 0) + 1);
        }
        
        // Return most popular patterns
        return Array.from(queryFrequency.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([query]) => query);
    }

    private normalizeQueryForPattern(query: string): string {
        return query
            .toLowerCase()
            .replace(/\b(show|find|get|what|how|why)\b/g, 'show')
            .replace(/\b(test|tests|testing)\b/g, 'tests')
            .replace(/\b(error|errors|bug|bugs)\b/g, 'errors')
            .replace(/\b(performance|speed|slow)\b/g, 'performance');
    }

    private groupQueriesByIntent(): Map<string, QueryHistory[]> {
        const groups = new Map<string, QueryHistory[]>();
        
        for (const query of this.queryHistory) {
            const intent = query.result.intent;
            if (!groups.has(intent)) {
                groups.set(intent, []);
            }
            groups.get(intent)!.push(query);
        }
        
        return groups;
    }

    private extractQueryPattern(intent: string, queries: QueryHistory[]): QueryPattern {
        const commonWords = this.findCommonWords(queries.map(q => q.query));
        const avgConfidence = queries.reduce((sum, q) => sum + q.result.confidence, 0) / queries.length;
        
        return {
            intent,
            commonWords,
            frequency: queries.length,
            avgConfidence,
            confidence: avgConfidence > 0.7 ? 0.8 : 0.6,
            examples: queries.slice(0, 3).map(q => q.query)
        };
    }

    private findCommonWords(queries: string[]): string[] {
        const wordFreq = new Map<string, number>();
        
        for (const query of queries) {
            const words = query.toLowerCase().split(/\s+/);
            for (const word of words) {
                if (word.length > 2) { // Ignore short words
                    wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
                }
            }
        }
        
        const threshold = Math.max(2, Math.floor(queries.length * 0.3));
        return Array.from(wordFreq.entries())
            .filter(([, freq]) => freq >= threshold)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([word]) => word);
    }

    private async updateClassifiersFromPatterns(patterns: QueryPattern[]): Promise<void> {
        // Update intent classifier with new patterns
        for (const pattern of patterns) {
            this.intentClassifier.addPattern(pattern);
        }
        
        // Update entity extractor with new examples
        this.entityExtractor.updateFromPatterns(patterns);
        
        console.log(`Updated classifiers with ${patterns.length} patterns`);
    }

    // Summary methods for different data types
    private summarizeTestResults(results: TestResult[]): any {
        const total = results.length;
        const passed = results.filter(r => r.status === 'passed').length;
        const failed = results.filter(r => r.status === 'failed').length;
        const skipped = results.filter(r => r.status === 'skipped').length;
        
        return {
            total,
            passed,
            failed,
            skipped,
            passRate: passed / total,
            failureRate: failed / total
        };
    }

    private summarizeErrorPatterns(patterns: ErrorPattern[]): any {
        const total = patterns.length;
        const totalFrequency = patterns.reduce((sum, p) => sum + p.frequency, 0);
        const mostFrequent = patterns.sort((a, b) => b.frequency - a.frequency)[0];
        
        return {
            total,
            totalFrequency,
            mostFrequent: mostFrequent?.pattern,
            avgFrequency: totalFrequency / total
        };
    }

    private summarizePerformanceMetrics(metrics: any[]): any {
        return {
            total: metrics.length,
            types: [...new Set(metrics.map(m => m.metric))],
            timeRange: metrics.length > 0 ? {
                start: Math.min(...metrics.map(m => m.timestamp.getTime())),
                end: Math.max(...metrics.map(m => m.timestamp.getTime()))
            } : null
        };
    }

    private summarizeGitHistory(history: any[]): any {
        return {
            totalCommits: history.length,
            authors: [...new Set(history.map(c => c.author))],
            timeRange: history.length > 0 ? {
                start: Math.min(...history.map(c => c.date.getTime())),
                end: Math.max(...history.map(c => c.date.getTime()))
            } : null
        };
    }

    private createErrorResponse(query: string): QueryResult {
        return {
            intent: 'error',
            entities: {},
            confidence: 0,
            response: `I apologize, but I couldn't understand your query: "${query}". Please try rephrasing your question or use one of the suggested queries.`,
            suggestedActions: [{
                id: this.generateSuggestionId(),
                title: 'Try Example Query',
                description: 'Use one of the example queries to get started',
                action: {
                    type: 'external',
                    data: { action: 'show-examples' }
                },
                estimatedImpact: 'low',
                estimatedEffort: 'minutes'
            }]
        };
    }

    private recordQuery(query: string, result: QueryResult): void {
        const entry: QueryHistory = {
            query,
            result,
            timestamp: new Date()
        };
        
        this.queryHistory.push(entry);
        
        // Limit history size
        if (this.queryHistory.length > this.maxHistorySize) {
            this.queryHistory = this.queryHistory.slice(-this.maxHistorySize);
        }
    }

    private loadQueryHistory(): void {
        try {
            const historyData = this.context.globalState.get<string>('query-history');
            if (historyData) {
                const history = JSON.parse(historyData);
                this.queryHistory = history.map((entry: any) => ({
                    ...entry,
                    timestamp: new Date(entry.timestamp)
                }));
                console.log(`Loaded ${this.queryHistory.length} query history entries`);
            }
        } catch (error) {
            console.error('Error loading query history:', error);
        }
    }

    private generateSuggestionId(): string {
        return `suggestion_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    async saveQueryHistory(): Promise<void> {
        try {
            await this.context.globalState.update(
                'query-history', 
                JSON.stringify(this.queryHistory)
            );
            console.log(`Saved ${this.queryHistory.length} query history entries`);
        } catch (error) {
            console.error('Error saving query history:', error);
        }
    }

    dispose(): void {
        this.saveQueryHistory();
        this.queryHistory = [];
        this.entityExtractor.dispose();
        this.intentClassifier.dispose();
        this.responseGenerator.dispose();
    }
}

// Supporting classes for NLP functionality

class EntityExtractor {
    private entityPatterns: Map<string, RegExp[]> = new Map();

    constructor() {
        this.initializePatterns();
    }

    private initializePatterns(): void {
        // Time entities
        this.entityPatterns.set('timeRange', [
            /(?:last|past)\s+(\d+)\s+(day|week|month|year)s?/i,
            /(today|yesterday|this\s+week|last\s+week)/i
        ]);
        
        // Project entities
        this.entityPatterns.set('project', [
            /project[s]?\s+(\w+)/i,
            /in\s+(\w+)\s+project/i
        ]);
        
        // File entities
        this.entityPatterns.set('files', [
            /file[s]?\s+(\S+\.\w+)/i,
            /(\w+\/\w+\.\w+)/i
        ]);
        
        // Test entities
        this.entityPatterns.set('tests', [
            /(failing|failed|broken)\s+tests?/i,
            /test[s]?\s+(\w+)/i
        ]);
        
        // Error entities
        this.entityPatterns.set('errors', [
            /error[s]?\s+in\s+(\w+)/i,
            /(error|bug|issue)[s]?\s+(\w+)/i
        ]);
    }

    async extractEntities(query: string): Promise<Record<string, any>> {
        const entities: Record<string, any> = {};
        
        for (const [entityType, patterns] of this.entityPatterns.entries()) {
            for (const pattern of patterns) {
                const match = query.match(pattern);
                if (match) {
                    entities[entityType] = match[1] || match[0];
                    break;
                }
            }
        }
        
        return entities;
    }

    updateFromPatterns(patterns: QueryPattern[]): void {
        // Update entity patterns based on successful query patterns
        for (const pattern of patterns) {
            // Simplified pattern learning
            if (pattern.commonWords.length > 0) {
                const newPatterns = pattern.commonWords.map(word => 
                    new RegExp(`\\b${word}\\b`, 'i')
                );
                
                if (this.entityPatterns.has(pattern.intent)) {
                    this.entityPatterns.get(pattern.intent)!.push(...newPatterns);
                } else {
                    this.entityPatterns.set(pattern.intent, newPatterns);
                }
            }
        }
    }

    dispose(): void {
        this.entityPatterns.clear();
    }
}

class IntentClassifier {
    private intentPatterns: Map<string, RegExp[]> = new Map();

    constructor() {
        this.initializeIntentPatterns();
    }

    private initializeIntentPatterns(): void {
        this.intentPatterns.set('test-query', [
            /\b(test|tests|testing|spec|specs)\b/i,
            /\b(failing|failed|broken|pass|passed)\b.*\b(test|tests)\b/i,
            /\brun\s+tests?\b/i
        ]);
        
        this.intentPatterns.set('error-query', [
            /\b(error|errors|bug|bugs|issue|issues)\b/i,
            /\b(fix|debug|solve|resolve)\b/i,
            /\b(exception|crash|fail)\b/i
        ]);
        
        this.intentPatterns.set('performance-query', [
            /\b(performance|speed|slow|fast|optimize)\b/i,
            /\b(time|duration|latency|bottleneck)\b/i,
            /\bhow\s+(fast|slow|long)\b/i
        ]);
        
        this.intentPatterns.set('git-query', [
            /\b(git|commit|commits|branch|merge)\b/i,
            /\b(changed|changes|diff|history)\b/i,
            /\bwhat.*changed\b/i
        ]);
        
        this.intentPatterns.set('build-query', [
            /\b(build|builds|compile|compilation)\b/i,
            /\b(deploy|deployment|ci|cd)\b/i,
            /\bpush|pull\b/i
        ]);
        
        this.intentPatterns.set('coverage-query', [
            /\b(coverage|covered|uncovered)\b/i,
            /\bhow\s+much.*covered\b/i
        ]);
    }

    async classifyIntent(query: string): Promise<string> {
        for (const [intent, patterns] of this.intentPatterns.entries()) {
            for (const pattern of patterns) {
                if (pattern.test(query)) {
                    return intent;
                }
            }
        }
        
        // Fallback classification based on question words
        if (/^(what|how|why|when|where)\b/i.test(query)) {
            return 'general-query';
        }
        
        if (/^(show|find|get|list)\b/i.test(query)) {
            return 'data-query';
        }
        
        return 'unknown';
    }

    addPattern(pattern: QueryPattern): void {
        if (!this.intentPatterns.has(pattern.intent)) {
            this.intentPatterns.set(pattern.intent, []);
        }
        
        // Add new patterns based on common words
        const newPatterns = pattern.commonWords.map(word => 
            new RegExp(`\\b${word}\\b`, 'i')
        );
        
        this.intentPatterns.get(pattern.intent)!.push(...newPatterns);
    }

    dispose(): void {
        this.intentPatterns.clear();
    }
}

class ResponseGenerator {
    private responseTemplates: Map<string, string[]> = new Map();

    constructor() {
        this.initializeTemplates();
    }

    private initializeTemplates(): void {
        this.responseTemplates.set('test-query', [
            "I can help you analyze your test results and identify patterns in test failures.",
            "Let me examine your test data to provide insights about test performance and failures.",
            "I'll analyze your test patterns to help improve test reliability and coverage."
        ]);
        
        this.responseTemplates.set('error-query', [
            "I can help identify and analyze error patterns in your codebase.",
            "Let me examine the error data to find recurring issues and suggest fixes.",
            "I'll analyze the error patterns to help you resolve the most impactful issues first."
        ]);
        
        this.responseTemplates.set('performance-query', [
            "I can analyze performance metrics and identify optimization opportunities.",
            "Let me examine your performance data to find bottlenecks and suggest improvements.",
            "I'll analyze performance trends to help you optimize your development workflow."
        ]);
        
        this.responseTemplates.set('git-query', [
            "I can analyze your git history and provide insights about code changes.",
            "Let me examine your commit patterns and file changes for insights.",
            "I'll analyze your git data to help you understand development patterns."
        ]);
        
        this.responseTemplates.set('build-query', [
            "I can help analyze your build process and identify improvement opportunities.",
            "Let me examine your build patterns to suggest optimizations.",
            "I'll analyze your build data to help streamline your deployment process."
        ]);
    }

    async generateResponse(
        intent: string, 
        entities: Record<string, any>, 
        query: string, 
        context?: AnalysisData
    ): Promise<string> {
        const templates = this.responseTemplates.get(intent) || [
            "I can help you analyze your debugging patterns and suggest improvements."
        ];
        
        let baseResponse = templates[Math.floor(Math.random() * templates.length)];
        
        // Customize response based on entities and context
        if (context) {
            baseResponse += this.addContextualDetails(intent, entities, context);
        }
        
        return baseResponse;
    }

    private addContextualDetails(
        intent: string, 
        entities: Record<string, any>, 
        context: AnalysisData
    ): string {
        let details = "";
        
        switch (intent) {
            case 'test-query':
                const failedTests = context.testResults.filter(t => t.status === 'failed').length;
                if (failedTests > 0) {
                    details += ` I found ${failedTests} failing tests that need attention.`;
                }
                break;
                
            case 'error-query':
                const errorCount = context.errorPatterns.length;
                if (errorCount > 0) {
                    details += ` I identified ${errorCount} error patterns in your codebase.`;
                }
                break;
                
            case 'performance-query':
                const metricCount = context.performanceMetrics.length;
                if (metricCount > 0) {
                    details += ` I have ${metricCount} performance metrics to analyze.`;
                }
                break;
        }
        
        return details;
    }

    dispose(): void {
        this.responseTemplates.clear();
    }
}

// Supporting interfaces for Natural Language Query Engine

interface QueryHistory {
    query: string;
    result: QueryResult;
    timestamp: Date;
}

interface QueryPattern {
    intent: string;
    commonWords: string[];
    frequency: number;
    avgConfidence: number;
    confidence: number;
    examples: string[];
}
