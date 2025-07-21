import * as vscode from 'vscode';
import { AnalysisData, InsightData, InsightPriority } from '../../../types';

export interface AutomatedInsight {
    id: string;
    category: 'testing' | 'performance' | 'security' | 'quality' | 'git' | 'dependencies';
    priority: InsightPriority;
    confidence: number;
    title: string;
    description: string;
    impact: string;
    actionable: boolean;
    suggestions: InsightSuggestion[];
    metadata: {
        source: string;
        generatedAt: Date;
        validUntil?: Date;
    };
}

export interface InsightSuggestion {
    title: string;
    description: string;
    action: string;
    estimatedImpact: 'low' | 'medium' | 'high';
    estimatedEffort: 'minutes' | 'hours' | 'days';
    priority: number;
}

export class AutomatedInsightsEngine {
    private context: vscode.ExtensionContext;
    private insightGenerators: Map<string, (data: AnalysisData) => Promise<AutomatedInsight[]>>;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.insightGenerators = new Map();
        this.initializeGenerators();
    }

    public async generateAutomatedInsights(data: AnalysisData): Promise<AutomatedInsight[]> {
        const insights: AutomatedInsight[] = [];

        // Run all insight generators
        for (const [category, generator] of this.insightGenerators) {
            try {
                const categoryInsights = await generator(data);
                insights.push(...categoryInsights);
            } catch (error) {
                console.error(`Error generating insights for category ${category}:`, error);
            }
        }

        // Sort by priority and confidence
        return this.prioritizeInsights(insights);
    }

    private initializeGenerators(): void {
        this.insightGenerators.set('testing', this.generateTestingInsights.bind(this));
        this.insightGenerators.set('performance', this.generatePerformanceInsights.bind(this));
        this.insightGenerators.set('security', this.generateSecurityInsights.bind(this));
        this.insightGenerators.set('quality', this.generateQualityInsights.bind(this));
        this.insightGenerators.set('git', this.generateGitInsights.bind(this));
        this.insightGenerators.set('dependencies', this.generateDependencyInsights.bind(this));
    }

    private async generateTestingInsights(data: AnalysisData): Promise<AutomatedInsight[]> {
        const insights: AutomatedInsight[] = [];

        // Analyze test failures
        const failingTests = data.testResults.filter(test => test.status === 'failed');
        if (failingTests.length > 0) {
            insights.push({
                id: 'test-failures',
                category: 'testing',
                priority: 'high',
                confidence: 0.95,
                title: `${failingTests.length} Test Failures Detected`,
                description: `Found ${failingTests.length} failing tests that need attention.`,
                impact: 'Code quality and stability may be compromised',
                actionable: true,
                suggestions: [
                    {
                        title: 'Run Failing Tests',
                        description: 'Execute only the failing tests to debug issues',
                        action: 'runFailingTests',
                        estimatedImpact: 'high',
                        estimatedEffort: 'minutes',
                        priority: 1
                    },
                    {
                        title: 'Analyze Test Patterns',
                        description: 'Look for common patterns in test failures',
                        action: 'analyzeTestPatterns',
                        estimatedImpact: 'medium',
                        estimatedEffort: 'hours',
                        priority: 2
                    }
                ],
                metadata: {
                    source: 'test-results',
                    generatedAt: new Date()
                }
            });
        }

        // Analyze test coverage
        const totalTests = data.testResults.length;
        const passingTests = data.testResults.filter(test => test.status === 'passed').length;
        const coverage = totalTests > 0 ? (passingTests / totalTests) * 100 : 0;

        if (coverage < 80) {
            insights.push({
                id: 'low-test-coverage',
                category: 'testing',
                priority: 'medium',
                confidence: 0.8,
                title: 'Low Test Coverage',
                description: `Test coverage is ${coverage.toFixed(1)}%, below recommended 80%`,
                impact: 'Increased risk of undetected bugs',
                actionable: true,
                suggestions: [
                    {
                        title: 'Add More Tests',
                        description: 'Write additional tests to improve coverage',
                        action: 'addTests',
                        estimatedImpact: 'high',
                        estimatedEffort: 'hours',
                        priority: 1
                    }
                ],
                metadata: {
                    source: 'coverage-analysis',
                    generatedAt: new Date()
                }
            });
        }

        return insights;
    }

    private async generatePerformanceInsights(data: AnalysisData): Promise<AutomatedInsight[]> {
        const insights: AutomatedInsight[] = [];

        // Analyze command execution times
        const slowCommands = data.commandHistory.filter(cmd => {
            const duration = cmd.endTime && cmd.startTime ? 
                cmd.endTime.getTime() - cmd.startTime.getTime() : 0;
            return duration > 30000; // 30 seconds
        });

        if (slowCommands.length > 0) {
            insights.push({
                id: 'slow-commands',
                category: 'performance',
                priority: 'medium',
                confidence: 0.7,
                title: 'Slow Command Execution',
                description: `${slowCommands.length} commands took longer than 30 seconds`,
                impact: 'Development workflow efficiency is reduced',
                actionable: true,
                suggestions: [
                    {
                        title: 'Optimize Command Execution',
                        description: 'Consider running affected tests only',
                        action: 'optimizeCommands',
                        estimatedImpact: 'medium',
                        estimatedEffort: 'minutes',
                        priority: 1
                    }
                ],
                metadata: {
                    source: 'command-history',
                    generatedAt: new Date()
                }
            });
        }

        return insights;
    }

    private async generateSecurityInsights(data: AnalysisData): Promise<AutomatedInsight[]> {
        const insights: AutomatedInsight[] = [];

        // Check for security-related error patterns
        const securityErrors = data.errorPatterns.filter(pattern => 
            pattern.pattern.toLowerCase().includes('security') ||
            pattern.pattern.toLowerCase().includes('vulnerability') ||
            pattern.pattern.toLowerCase().includes('injection')
        );

        if (securityErrors.length > 0) {
            insights.push({
                id: 'security-issues',
                category: 'security',
                priority: 'critical',
                confidence: 0.9,
                title: 'Security Issues Detected',
                description: `Found ${securityErrors.length} potential security issues`,
                impact: 'Application security may be compromised',
                actionable: true,
                suggestions: [
                    {
                        title: 'Review Security Issues',
                        description: 'Investigate and fix security vulnerabilities',
                        action: 'reviewSecurity',
                        estimatedImpact: 'high',
                        estimatedEffort: 'hours',
                        priority: 1
                    }
                ],
                metadata: {
                    source: 'error-patterns',
                    generatedAt: new Date()
                }
            });
        }

        return insights;
    }

    private async generateQualityInsights(data: AnalysisData): Promise<AutomatedInsight[]> {
        const insights: AutomatedInsight[] = [];

        // Analyze error patterns
        const frequentErrors = data.errorPatterns.filter(pattern => pattern.frequency > 5);
        if (frequentErrors.length > 0) {
            insights.push({
                id: 'frequent-errors',
                category: 'quality',
                priority: 'high',
                confidence: 0.8,
                title: 'Frequent Error Patterns',
                description: `${frequentErrors.length} error patterns occur frequently`,
                impact: 'Code quality and reliability issues',
                actionable: true,
                suggestions: [
                    {
                        title: 'Fix Common Errors',
                        description: 'Address the most frequent error patterns',
                        action: 'fixErrors',
                        estimatedImpact: 'high',
                        estimatedEffort: 'hours',
                        priority: 1
                    }
                ],
                metadata: {
                    source: 'error-analysis',
                    generatedAt: new Date()
                }
            });
        }

        return insights;
    }

    private async generateGitInsights(data: AnalysisData): Promise<AutomatedInsight[]> {
        const insights: AutomatedInsight[] = [];

        // Analyze git history
        const recentCommits = data.gitHistory.filter(commit => {
            const daysSinceCommit = (Date.now() - commit.date.getTime()) / (1000 * 60 * 60 * 24);
            return daysSinceCommit <= 7;
        });

        if (recentCommits.length > 20) {
            insights.push({
                id: 'high-commit-frequency',
                category: 'git',
                priority: 'low',
                confidence: 0.6,
                title: 'High Commit Frequency',
                description: `${recentCommits.length} commits in the last week`,
                impact: 'May indicate unstable code or missing tests',
                actionable: true,
                suggestions: [
                    {
                        title: 'Review Commit Quality',
                        description: 'Consider squashing small commits',
                        action: 'reviewCommits',
                        estimatedImpact: 'low',
                        estimatedEffort: 'minutes',
                        priority: 1
                    }
                ],
                metadata: {
                    source: 'git-history',
                    generatedAt: new Date()
                }
            });
        }

        return insights;
    }

    private async generateDependencyInsights(data: AnalysisData): Promise<AutomatedInsight[]> {
        const insights: AutomatedInsight[] = [];

        // Check for dependency-related errors
        const dependencyErrors = data.errorPatterns.filter(pattern => 
            pattern.pattern.toLowerCase().includes('module') ||
            pattern.pattern.toLowerCase().includes('import') ||
            pattern.pattern.toLowerCase().includes('dependency')
        );

        if (dependencyErrors.length > 0) {
            insights.push({
                id: 'dependency-issues',
                category: 'dependencies',
                priority: 'medium',
                confidence: 0.7,
                title: 'Dependency Issues',
                description: `${dependencyErrors.length} dependency-related errors found`,
                impact: 'Build and runtime stability issues',
                actionable: true,
                suggestions: [
                    {
                        title: 'Update Dependencies',
                        description: 'Review and update project dependencies',
                        action: 'updateDependencies',
                        estimatedImpact: 'medium',
                        estimatedEffort: 'hours',
                        priority: 1
                    }
                ],
                metadata: {
                    source: 'dependency-analysis',
                    generatedAt: new Date()
                }
            });
        }

        return insights;
    }

    private prioritizeInsights(insights: AutomatedInsight[]): AutomatedInsight[] {
        return insights.sort((a, b) => {
            const priorityScore = {
                'critical': 4,
                'high': 3,
                'medium': 2,
                'low': 1
            };

            const aScore = priorityScore[a.priority] * a.confidence;
            const bScore = priorityScore[b.priority] * b.confidence;

            return bScore - aScore;
        });
    }

    public async getInsightHistory(): Promise<AutomatedInsight[]> {
        const history = this.context.globalState.get<AutomatedInsight[]>('insightHistory', []);
        return history;
    }

    public async saveInsightHistory(insights: AutomatedInsight[]): Promise<void> {
        await this.context.globalState.update('insightHistory', insights);
    }

    public dispose(): void {
        // Cleanup resources
        this.insightGenerators.clear();
    }
}
