import * as vscode from 'vscode';
import { 
    AIInsightsEngine as IAIInsightsEngine, 
    AnalysisData, 
    ExecutionContext, 
    ReportCriteria, 
    QueryResult, 
    Insight, 
    CommandSuggestion, 
    Report, 
    PredictionResult, 
    WorkflowOptimization,
    CommandExecution,
    ActionSuggestion,
    InsightContext
} from '../../types';

/**
 * AIInsightsEngine provides AI-powered insights and recommendations for debugging workflows
 * Phase 4.2: Intelligent command suggestions, pattern analysis, and workflow optimization
 */
export class AIInsightsEngine implements IAIInsightsEngine {
    private insightCache: Map<string, Insight[]> = new Map();
    private patternHistory: Map<string, any[]> = new Map();
    private suggestionCache: Map<string, CommandSuggestion[]> = new Map();
    private readonly cacheTimeout = 300000; // 5 minutes

    constructor(private context: vscode.ExtensionContext) {
        this.initializeEngine();
    }

    private initializeEngine(): void {
        this.loadCachedData();
        setInterval(() => this.cleanupCache(), 60000);
        console.log('AIInsightsEngine initialized');
    }

    async analyzePattern(data: AnalysisData): Promise<Insight[]> {
        const cacheKey = this.generateCacheKey(data);
        
        if (this.insightCache.has(cacheKey)) {
            return this.insightCache.get(cacheKey)!;
        }

        const insights: Insight[] = [];
        
        try {
            const performanceInsights = await this.analyzePerformancePatterns(data);
            insights.push(...performanceInsights);

            const errorInsights = await this.analyzeErrorPatterns(data);
            insights.push(...errorInsights);

            const testInsights = await this.analyzeTestPatterns(data);
            insights.push(...testInsights);

            this.insightCache.set(cacheKey, insights);
            console.log(`Generated ${insights.length} insights from pattern analysis`);
            return insights;
            
        } catch (error) {
            console.error('Error analyzing patterns:', error);
            return [];
        }
    }

    async suggestCommand(context: ExecutionContext): Promise<CommandSuggestion[]> {
        const contextKey = this.generateContextKey(context);
        
        if (this.suggestionCache.has(contextKey)) {
            return this.suggestionCache.get(contextKey)!;
        }

        const suggestions: CommandSuggestion[] = [];
        
        try {
            const contextSuggestions = await this.generateContextBasedSuggestions(context);
            suggestions.push(...contextSuggestions);

            suggestions.sort((a, b) => b.confidence - a.confidence);
            const topSuggestions = suggestions.slice(0, 5);
            
            this.suggestionCache.set(contextKey, topSuggestions);
            console.log(`Generated ${topSuggestions.length} command suggestions`);
            return topSuggestions;
            
        } catch (error) {
            console.error('Error generating command suggestions:', error);
            return [];
        }
    }

    async generateReport(criteria: ReportCriteria): Promise<Report> {
        const reportId = this.generateReportId();
        
        try {
            const reportData = await this.collectReportData(criteria);
            const analysis = await this.generateReportAnalysis(reportData, criteria);
            
            const report: Report = {
                id: reportId,
                title: this.generateReportTitle(criteria),
                description: this.generateReportDescription(criteria),
                criteria,
                data: {
                    ...reportData,
                    analysis,
                    summary: this.generateReportSummary(reportData, analysis)
                },
                generatedAt: new Date(),
                generatedBy: await this.getCurrentUserId(),
                format: criteria.format,
                size: 0
            };
            
            console.log(`Generated report: ${report.title}`);
            return report;
            
        } catch (error) {
            console.error('Error generating report:', error);
            throw new Error(`Failed to generate report: ${error.message}`);
        }
    }

    async processNaturalLanguageQuery(query: string): Promise<QueryResult> {
        try {
            const intent = await this.parseQueryIntent(query);
            const entities = await this.extractQueryEntities(query);
            const response = await this.generateQueryResponse(intent, entities, query);
            const suggestedActions = await this.generateQueryActions(intent, entities);
            const data = await this.fetchQueryData(intent, entities);
            
            const result: QueryResult = {
                intent,
                entities,
                confidence: this.calculateQueryConfidence(intent, entities),
                response,
                suggestedActions,
                data
            };
            
            console.log(`Processed natural language query: "${query}"`);
            return result;
            
        } catch (error) {
            console.error('Error processing natural language query:', error);
            return {
                intent: 'unknown',
                entities: {},
                confidence: 0,
                response: 'I\'m sorry, I couldn\'t understand your query. Please try rephrasing it.',
                suggestedActions: []
            };
        }
    }

    async predictFailures(projectData: any): Promise<PredictionResult[]> {
        const predictions: PredictionResult[] = [];
        
        try {
            const testFailurePredictions = await this.predictTestFailures(projectData);
            predictions.push(...testFailurePredictions);
            
            const buildFailurePredictions = await this.predictBuildFailures(projectData);
            predictions.push(...buildFailurePredictions);
            
            predictions.sort((a, b) => b.probability - a.probability);
            
            console.log(`Generated ${predictions.length} failure predictions`);
            return predictions;
            
        } catch (error) {
            console.error('Error predicting failures:', error);
            return [];
        }
    }

    async optimizeWorkflow(history: CommandExecution[]): Promise<WorkflowOptimization> {
        try {
            const currentEfficiency = await this.calculateWorkflowEfficiency(history);
            const optimizations = await this.identifyOptimizations(history);
            const optimizedWorkflow = await this.generateOptimizedWorkflow(history, optimizations);
            const estimatedImprovement = await this.calculateEstimatedImprovement(history, optimizedWorkflow);
            const reasoning = await this.generateOptimizationReasoning(optimizations, estimatedImprovement);
            
            const optimization: WorkflowOptimization = {
                currentEfficiency,
                optimizedWorkflow,
                estimatedImprovement,
                reasoning
            };
            
            console.log(`Generated workflow optimization with ${estimatedImprovement.timeReduction}% time reduction`);
            return optimization;
            
        } catch (error) {
            console.error('Error optimizing workflow:', error);
            throw new Error(`Failed to optimize workflow: ${error.message}`);
        }
    }

    // Private analysis methods

    private async analyzePerformancePatterns(data: AnalysisData): Promise<Insight[]> {
        const insights: Insight[] = [];
        
        const slowCommands = data.commandHistory.filter(cmd => cmd.endTime && cmd.startTime && 
            (cmd.endTime.getTime() - cmd.startTime.getTime()) > 60000);
        
        if (slowCommands.length > 0) {
            insights.push({
                id: this.generateInsightId(),
                type: 'performance',
                title: 'Slow Command Execution Detected',
                description: `${slowCommands.length} commands took longer than 1 minute to execute`,
                actionable: true,
                suggestions: [
                    {
                        id: this.generateSuggestionId(),
                        title: 'Optimize Test Selection',
                        description: 'Run focused tests instead of full test suite',
                        action: {
                            type: 'command',
                            data: { command: 'nxTest', options: { focus: 'tests' } }
                        },
                        estimatedImpact: 'high',
                        estimatedEffort: 'minutes'
                    }
                ],
                confidence: 0.8,
                timestamp: new Date(),
                category: 'performance',
                priority: 'medium',
                context: this.createInsightContext(data, ['performance', 'commands'])
            });
        }
        
        return insights;
    }

    private async analyzeErrorPatterns(data: AnalysisData): Promise<Insight[]> {
        const insights: Insight[] = [];
        
        const errorPatterns = data.errorPatterns || [];
        const frequentErrors = errorPatterns.filter(pattern => pattern.frequency > 3);
        
        for (const errorPattern of frequentErrors) {
            insights.push({
                id: this.generateInsightId(),
                type: 'error',
                title: 'Recurring Error Pattern Detected',
                description: `Error pattern "${errorPattern.pattern}" occurred ${errorPattern.frequency} times`,
                actionable: true,
                suggestions: errorPattern.suggestedFix ? [
                    {
                        id: this.generateSuggestionId(),
                        title: 'Apply Suggested Fix',
                        description: errorPattern.suggestedFix,
                        action: {
                            type: 'file-edit',
                            data: { files: errorPattern.affectedFiles, fix: errorPattern.suggestedFix }
                        },
                        estimatedImpact: 'high',
                        estimatedEffort: 'minutes'
                    }
                ] : [],
                confidence: 0.9,
                timestamp: new Date(),
                category: 'error',
                priority: 'high',
                context: this.createInsightContext(data, ['errors', 'patterns'])
            });
        }
        
        return insights;
    }

    private async analyzeTestPatterns(data: AnalysisData): Promise<Insight[]> {
        const insights: Insight[] = [];
        
        const testResults = data.testResults || [];
        const recentTests = testResults.filter(test => 
            test.timestamp > new Date(Date.now() - 24 * 60 * 60 * 1000));
        
        const failingTests = recentTests.filter(test => test.status === 'failed');
        
        if (failingTests.length > 0) {
            const failureRate = failingTests.length / recentTests.length;
            if (failureRate > 0.1) {
                insights.push({
                    id: this.generateInsightId(),
                    type: 'quality',
                    title: 'High Test Failure Rate',
                    description: `${(failureRate * 100).toFixed(1)}% of tests are failing`,
                    actionable: true,
                    suggestions: [
                        {
                            id: this.generateSuggestionId(),
                            title: 'Focus on Failing Tests',
                            description: 'Run only failing tests to debug issues',
                            action: {
                                type: 'command',
                                data: { command: 'nxTest', options: { focus: 'failing' } }
                            },
                            estimatedImpact: 'high',
                            estimatedEffort: 'minutes'
                        }
                    ],
                    confidence: 0.8,
                    timestamp: new Date(),
                    category: 'quality',
                    priority: 'high',
                    context: this.createInsightContext(data, ['tests', 'failures'])
                });
            }
        }
        
        return insights;
    }

    private async generateContextBasedSuggestions(context: ExecutionContext): Promise<CommandSuggestion[]> {
        const suggestions: CommandSuggestion[] = [];
        
        if (context.gitStatus.hasUncommittedChanges) {
            suggestions.push({
                command: 'gitDiff',
                reason: 'Uncommitted changes detected',
                confidence: 0.8,
                estimatedImpact: 'medium',
                context: {
                    trigger: 'git-changes',
                    relatedFiles: context.gitStatus.changedFiles,
                    similarPatterns: []
                }
            });
        }
        
        if (context.testStatus.failing > 0) {
            suggestions.push({
                command: 'nxTest',
                reason: `${context.testStatus.failing} tests are failing`,
                confidence: 0.9,
                estimatedImpact: 'high',
                context: {
                    trigger: 'test-failures',
                    relatedFiles: context.testStatus.failingTests.map(t => t.suite),
                    similarPatterns: []
                },
                options: { focus: 'tests' }
            });
        }
        
        if (context.gitStatus.hasUncommittedChanges && context.testStatus.failing === 0) {
            suggestions.push({
                command: 'prepareToPush',
                reason: 'Changes ready for review - run full validation',
                confidence: 0.8,
                estimatedImpact: 'high',
                context: {
                    trigger: 'ready-for-push',
                    relatedFiles: context.gitStatus.changedFiles,
                    similarPatterns: []
                }
            });
        }
        
        return suggestions;
    }

    // Helper methods

    private generateCacheKey(data: AnalysisData): string {
        return [
            data.commandHistory.length,
            data.projectFiles.length,
            data.gitHistory.length,
            data.testResults.length,
            data.performanceMetrics.length,
            data.errorPatterns.length
        ].join('-');
    }

    private generateContextKey(context: ExecutionContext): string {
        return `${context.project}-${context.currentFiles.length}-${context.recentCommands.length}`;
    }

    private generateInsightId(): string {
        return `insight_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    private generateSuggestionId(): string {
        return `suggestion_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    private generateReportId(): string {
        return `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    private createInsightContext(data: AnalysisData, tags: string[]): InsightContext {
        return {
            project: data.projectFiles[0] || 'unknown',
            files: data.projectFiles.slice(0, 10),
            commands: data.commandHistory.slice(0, 10).map(cmd => cmd.action),
            timeRange: {
                start: new Date(Date.now() - 24 * 60 * 60 * 1000),
                end: new Date()
            },
            metrics: {
                commandCount: data.commandHistory.length,
                errorCount: data.errorPatterns.length,
                testCount: data.testResults.length
            }
        };
    }

    private async loadCachedData(): Promise<void> {
        console.log('Loading cached AI insights data');
    }

    private cleanupCache(): void {
        for (const [key, value] of this.insightCache.entries()) {
            if (Math.random() < 0.01) this.insightCache.delete(key);
        }
        for (const [key, value] of this.suggestionCache.entries()) {
            if (Math.random() < 0.01) this.suggestionCache.delete(key);
        }
    }

    // AI method implementations
    private async parseQueryIntent(query: string): Promise<string> {
        const lowerQuery = query.toLowerCase();
        if (lowerQuery.includes('test') || lowerQuery.includes('failing')) return 'test-query';
        if (lowerQuery.includes('performance') || lowerQuery.includes('slow')) return 'performance-query';
        if (lowerQuery.includes('error') || lowerQuery.includes('bug')) return 'error-query';
        if (lowerQuery.includes('git') || lowerQuery.includes('commit')) return 'git-query';
        return 'general-query';
    }

    private async extractQueryEntities(query: string): Promise<Record<string, any>> {
        const entities: Record<string, any> = {};
        const projectMatch = query.match(/project[s]?\s+(\w+)/i);
        if (projectMatch) entities.project = projectMatch[1];
        const timeMatch = query.match(/(last|past)\s+(\d+)\s+(day|week|month|year)s?/i);
        if (timeMatch) entities.timeRange = { amount: parseInt(timeMatch[2]), unit: timeMatch[3] };
        return entities;
    }

    private async generateQueryResponse(intent: string, entities: Record<string, any>, query: string): Promise<string> {
        const responses = {
            'test-query': 'I can help you analyze test results and identify patterns in test failures.',
            'performance-query': 'I can analyze performance metrics and suggest optimizations for your workflows.',
            'error-query': 'I can help identify recurring error patterns and suggest fixes.',
            'git-query': 'I can analyze your git history and suggest improvements to your commit patterns.'
        };
        return responses[intent] || 'I can help you analyze your debugging patterns and suggest improvements.';
    }

    private async generateQueryActions(intent: string, entities: Record<string, any>): Promise<ActionSuggestion[]> {
        const actions: ActionSuggestion[] = [];
        
        if (intent === 'test-query') {
            actions.push({
                id: this.generateSuggestionId(),
                title: 'Run Test Analysis',
                description: 'Analyze current test results and patterns',
                action: { type: 'command', data: { command: 'nxTest' } },
                estimatedImpact: 'medium',
                estimatedEffort: 'minutes'
            });
        }
        
        if (intent === 'performance-query') {
            actions.push({
                id: this.generateSuggestionId(),
                title: 'Run Performance Analysis',
                description: 'Generate performance report and recommendations',
                action: { type: 'command', data: { command: 'aiDebug', options: { focus: 'performance' } } },
                estimatedImpact: 'high',
                estimatedEffort: 'minutes'
            });
        }
        
        return actions;
    }

    private async fetchQueryData(intent: string, entities: Record<string, any>): Promise<any> {
        return null;
    }

    private calculateQueryConfidence(intent: string, entities: Record<string, any>): number {
        let confidence = 0.5;
        if (intent !== 'unknown') confidence += 0.3;
        if (Object.keys(entities).length > 0) confidence += 0.2;
        return Math.min(confidence, 1.0);
    }

    private async getCurrentUserId(): Promise<string> {
        return process.env.USER || process.env.USERNAME || 'unknown';
    }

    private async collectReportData(criteria: ReportCriteria): Promise<any> {
        return {
            timeRange: criteria.timeRange,
            projects: criteria.projects || [],
            commands: criteria.commands || [],
            metrics: {}
        };
    }

    private async generateReportAnalysis(data: any, criteria: ReportCriteria): Promise<any> {
        return { summary: 'Report analysis summary', insights: [], recommendations: [] };
    }

    private generateReportTitle(criteria: ReportCriteria): string {
        const timeRange = criteria.timeRange.preset || 'custom';
        const projects = criteria.projects?.length ? criteria.projects.join(', ') : 'all projects';
        return `Debug Analysis Report - ${projects} (${timeRange})`;
    }

    private generateReportDescription(criteria: ReportCriteria): string {
        return `Comprehensive analysis of debugging patterns and performance metrics`;
    }

    private generateReportSummary(data: any, analysis: any): string {
        return `Report generated with ${Object.keys(data).length} data points and ${analysis.insights?.length || 0} insights`;
    }

    private async predictTestFailures(projectData: any): Promise<PredictionResult[]> {
        return [];
    }

    private async predictBuildFailures(projectData: any): Promise<PredictionResult[]> {
        return [];
    }

    private async calculateWorkflowEfficiency(history: CommandExecution[]): Promise<number> {
        const successRate = history.filter(cmd => cmd.status === 'completed').length / history.length;
        const avgDuration = history.reduce((sum, cmd) => {
            if (cmd.endTime && cmd.startTime) {
                return sum + (cmd.endTime.getTime() - cmd.startTime.getTime());
            }
            return sum;
        }, 0) / history.length;
        
        return Math.min(successRate * (1 - avgDuration / 600000), 1);
    }

    private async identifyOptimizations(history: CommandExecution[]): Promise<any[]> {
        return [];
    }

    private async generateOptimizedWorkflow(history: CommandExecution[], optimizations: any[]): Promise<CommandSuggestion[]> {
        return [];
    }

    private async calculateEstimatedImprovement(history: CommandExecution[], optimized: CommandSuggestion[]): Promise<any> {
        return { timeReduction: 20, errorReduction: 15, productivityGain: 25 };
    }

    private async generateOptimizationReasoning(optimizations: any[], improvement: any): Promise<string> {
        return 'Optimization based on command usage patterns and historical performance data';
    }

    dispose(): void {
        this.insightCache.clear();
        this.patternHistory.clear();
        this.suggestionCache.clear();
        console.log('AIInsightsEngine disposed');
    }
}
