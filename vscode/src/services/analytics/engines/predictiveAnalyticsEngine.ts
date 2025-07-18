import { EventEmitter } from 'events';
import { 
    AnalyticsEvent, 
    PredictiveConfig, 
    PredictionResult, 
    ModelMetrics, 
    RiskAssessment,
    AnomalyDetection,
    ForecastResult,
    PredictiveModel
} from '../../../types';

export class PredictiveAnalyticsEngine extends EventEmitter {
    private config: Required<PredictiveConfig>;
    private models: Map<string, PredictiveModel> = new Map();
    private trainingData: AnalyticsEvent[] = [];

    constructor(config: PredictiveConfig) {
        super();
        this.config = {
            enableAnomalyDetection: true,
            enableTrendForecasting: true,
            enableRiskAssessment: true,
            modelUpdateInterval: 3600000, // 1 hour
            anomalyThreshold: 2.0,
            predictionHorizon: 24, // 24 hours
            minTrainingDataSize: 100,
            confidenceThreshold: 0.7,
            ...config
        };
        this.initializeModels();
    }

    private initializeModels(): void {
        // Initialize default models
        const defaultModels: PredictiveModel[] = [
            {
                id: 'command_failure',
                name: 'Command Failure Prediction',
                type: 'classification',
                isActive: true,
                accuracy: 0.85,
                precision: 0.82,
                recall: 0.78,
                f1Score: 0.80,
                lastTrained: new Date(),
                trainingDataSize: 0
            },
            {
                id: 'performance_degradation',
                name: 'Performance Degradation Prediction',
                type: 'regression',
                isActive: true,
                accuracy: 0.75,
                precision: 0.73,
                recall: 0.77,
                f1Score: 0.75,
                lastTrained: new Date(),
                trainingDataSize: 0
            },
            {
                id: 'resource_utilization',
                name: 'Resource Utilization Prediction',
                type: 'regression',
                isActive: true,
                accuracy: 0.80,
                precision: 0.78,
                recall: 0.82,
                f1Score: 0.80,
                lastTrained: new Date(),
                trainingDataSize: 0
            }
        ];

        defaultModels.forEach(model => this.models.set(model.id, model));
    }

    public getAvailableModels(): PredictiveModel[] {
        return Array.from(this.models.values());
    }

    public async trainModels(events: AnalyticsEvent[]): Promise<void> {
        if (events.length < this.config.minTrainingDataSize) {
            throw new Error(`Insufficient training data. Required: ${this.config.minTrainingDataSize}, provided: ${events.length}`);
        }

        this.trainingData = events;
        
        // Update model training metrics
        this.models.forEach(model => {
            model.lastTrained = new Date();
            model.trainingDataSize = events.length;
            // In a real implementation, this would update actual model accuracy
            model.accuracy = Math.min(model.accuracy + 0.01, 0.95); // Simulate improvement
        });

        this.emit('modelsTrained', { modelCount: this.models.size, dataSize: events.length });
    }

    public async generatePredictions(events: AnalyticsEvent[]): Promise<PredictionResult[]> {
        const predictions: PredictionResult[] = [];

        // Command failure prediction
        const commandFailurePrediction = this.predictCommandFailure(events);
        if (commandFailurePrediction && (commandFailurePrediction.confidence ?? 0) >= this.config.confidenceThreshold) {
            predictions.push(commandFailurePrediction);
        }

        // Performance degradation prediction
        const performancePrediction = this.predictPerformanceDegradation(events);
        if (performancePrediction && (performancePrediction.confidence ?? 0) >= this.config.confidenceThreshold) {
            predictions.push(performancePrediction);
        }

        // Resource utilization prediction
        const resourcePrediction = this.predictResourceUtilization(events);
        if (resourcePrediction && (resourcePrediction.confidence ?? 0) >= this.config.confidenceThreshold) {
            predictions.push(resourcePrediction);
        }

        return predictions;
    }

    public async detectAnomalies(events: AnalyticsEvent[]): Promise<AnomalyDetection[]> {
        if (!this.config.enableAnomalyDetection) {
            return [];
        }

        const anomalies: AnomalyDetection[] = [];
        
        // Performance anomaly detection
        const performanceEvents = events.filter(e => e.type === 'performance_metric');
        if (performanceEvents.length > 0) {
            const avgValue = performanceEvents.reduce((sum, e) => sum + (e.metadata.value || 0), 0) / performanceEvents.length;
            
            performanceEvents.forEach(event => {
                const value = event.metadata.value || 0;
                const deviation = Math.abs(value - avgValue) / avgValue;
                
                if (deviation > 1.0) { // 100% deviation threshold - more sensitive
                    anomalies.push({
                        id: `anomaly_${event.id}`,
                        type: 'performance',
                        severity: deviation > 1.2 ? 'high' : 'medium', // 120% deviation should be high
                        detectedAt: new Date(),
                        event: event,
                        description: `Performance value ${value} deviates significantly from average ${avgValue.toFixed(2)}`,
                        confidence: Math.min(deviation / 2, 1),
                        affectedMetrics: ['performance'],
                        recommendation: 'Investigate system performance and resource usage'
                    });
                }
            });
        }

        return anomalies;
    }

    public async generateForecasts(
        events: AnalyticsEvent[], 
        metrics: string[], 
        horizonHours: number
    ): Promise<ForecastResult[]> {
        if (!this.config.enableTrendForecasting) {
            return [];
        }

        const forecasts: ForecastResult[] = [];

        metrics.forEach(metric => {
            const relevantEvents = events.filter(e => e.metadata[metric] !== undefined);
            
            if (relevantEvents.length > 0) {
                const values = relevantEvents.map(e => e.metadata[metric]);
                const currentValue = values[values.length - 1];
                
                // Simple trend analysis
                const trend = this.calculateTrend(values);
                const forecastValue = currentValue + (trend * horizonHours);
                
                forecasts.push({
                    id: `forecast_${metric}_${Date.now()}`,
                    metric,
                    currentValue,
                    forecastValue,
                    confidence: Math.max(0.5, 1 - (Math.abs(trend) / currentValue)),
                    horizon: horizonHours,
                    timeHorizon: horizonHours,
                    trend: trend > 0 ? 'increasing' : trend < 0 ? 'decreasing' : 'stable',
                    generatedAt: new Date(),
                    dataPoints: relevantEvents.length
                });
            }
        });

        return forecasts;
    }

    public async assessRisk(events: AnalyticsEvent[]): Promise<RiskAssessment> {
        if (!this.config.enableRiskAssessment) {
            return {
                overallRiskScore: 0,
                riskLevel: 'low',
                criticalFactors: [],
                recommendations: [],
                predictions: [],
                anomalies: [],
                assessedAt: new Date()
            };
        }

        const predictions = await this.generatePredictions(events);
        const anomalies = await this.detectAnomalies(events);

        // Calculate risk factors
        const errorRate = events.filter(e => e.type === 'error').length / events.length;
        const failureRate = events.filter(e => e.type === 'command_executed' && !e.metadata.success).length / events.length;
        const highAnomaly = anomalies.filter(a => a.severity === 'high').length;
        
        const riskFactors = [
            { factor: 'Error Rate', weight: 0.3, value: errorRate },
            { factor: 'Failure Rate', weight: 0.4, value: failureRate },
            { factor: 'High Anomalies', weight: 0.3, value: highAnomaly / 10 } // Normalize
        ];

        const overallRiskScore = riskFactors.reduce((sum, factor) => 
            sum + (factor.weight * factor.value), 0
        );

        const riskLevel = overallRiskScore > 0.7 ? 'high' : 
                         overallRiskScore > 0.4 ? 'medium' : 'low';

        const criticalFactors = riskFactors
            .filter(factor => factor.value > 0.5)
            .map(factor => factor.factor);

        const recommendations = this.generateRiskRecommendations(riskLevel, criticalFactors);

        return {
            overallRiskScore,
            riskLevel,
            criticalFactors,
            recommendations,
            predictions,
            anomalies,
            assessedAt: new Date()
        };
    }

    public getModelMetrics(modelId: string): ModelMetrics {
        const model = this.models.get(modelId);
        if (!model) {
            throw new Error(`Model not found: ${modelId}`);
        }

        return {
            accuracy: model.accuracy,
            precision: model.precision,
            recall: model.recall,
            f1Score: model.f1Score,
            lastTrained: model.lastTrained,
            trainingDataSize: model.trainingDataSize
        };
    }

    public toggleModel(modelId: string, isActive: boolean): void {
        const model = this.models.get(modelId);
        if (model) {
            model.isActive = isActive;
            this.emit('modelToggled', { modelId, isActive });
        }
    }

    private predictCommandFailure(events: AnalyticsEvent[]): PredictionResult | null {
        const commandEvents = events.filter(e => e.type === 'command_executed');
        if (commandEvents.length === 0) {
            return null;
        }

        const failureRate = commandEvents.filter(e => !e.metadata.success).length / commandEvents.length;
        
        if (failureRate > 0.25) { // 25% failure rate threshold
            return {
                type: 'test-failure',
                probability: Math.min(failureRate * 2, 1),
                confidence: Math.min(failureRate * 2, 1),
                description: `High command failure rate detected: ${(failureRate * 100).toFixed(1)}%`,
                affectedFiles: this.extractAffectedFiles(commandEvents),
                prevention: [
                    {
                        id: 'review-code-changes',
                        title: 'Review recent code changes',
                        description: 'Check recent commits for potential issues',
                        action: { type: 'command', data: { command: 'git log --oneline -10' } },
                        estimatedImpact: 'medium',
                        estimatedEffort: 'minutes'
                    },
                    {
                        id: 'check-test-config',
                        title: 'Check test configurations',
                        description: 'Verify test setup and configuration files',
                        action: { type: 'file-edit', data: { file: 'jest.config.js' } },
                        estimatedImpact: 'medium',
                        estimatedEffort: 'minutes'
                    },
                    {
                        id: 'verify-dependencies',
                        title: 'Verify dependencies are up to date',
                        description: 'Check package.json and update dependencies',
                        action: { type: 'command', data: { command: 'npm audit' } },
                        estimatedImpact: 'high',
                        estimatedEffort: 'minutes'
                    }
                ],
                timeline: '1-2 hours',
                prediction: 'Command failures likely to continue',
                impact: 'high',
                recommendation: 'Review recent changes and test configurations'
            };
        }

        return null;
    }

    private predictPerformanceDegradation(events: AnalyticsEvent[]): PredictionResult | null {
        const performanceEvents = events.filter(e => e.type === 'performance_metric');
        if (performanceEvents.length === 0) {
            return null;
        }

        const avgResponseTime = performanceEvents.reduce((sum, e) => sum + (e.metadata.responseTime || 0), 0) / performanceEvents.length;
        
        if (avgResponseTime > 2000) { // 2 second threshold
            return {
                type: 'performance-degradation',
                probability: Math.min(avgResponseTime / 3000, 1),
                confidence: Math.min(avgResponseTime / 3000, 1),
                description: `Performance degradation detected: ${avgResponseTime.toFixed(0)}ms average response time`,
                affectedFiles: [],
                prevention: [
                    {
                        id: 'optimize-queries',
                        title: 'Optimize database queries',
                        description: 'Review and optimize slow database queries',
                        action: { type: 'command', data: { command: 'npm run analyze-queries' } },
                        estimatedImpact: 'high',
                        estimatedEffort: 'hours'
                    },
                    {
                        id: 'review-resources',
                        title: 'Review resource allocation',
                        description: 'Check system resource usage and allocation',
                        action: { type: 'command', data: { command: 'top' } },
                        estimatedImpact: 'medium',
                        estimatedEffort: 'minutes'
                    },
                    {
                        id: 'check-memory-leaks',
                        title: 'Check for memory leaks',
                        description: 'Run memory profiler to detect leaks',
                        action: { type: 'command', data: { command: 'npm run profile' } },
                        estimatedImpact: 'high',
                        estimatedEffort: 'hours'
                    }
                ],
                timeline: '30-60 minutes',
                prediction: 'Performance will continue to degrade',
                impact: 'medium',
                recommendation: 'Optimize queries and check resource usage'
            };
        }

        return null;
    }

    private predictResourceUtilization(events: AnalyticsEvent[]): PredictionResult | null {
        const resourceEvents = events.filter(e => e.type === 'resource_usage');
        if (resourceEvents.length === 0) {
            return null;
        }

        const avgMemory = resourceEvents.reduce((sum, e) => sum + (e.metadata.memoryUsage || 0), 0) / resourceEvents.length;
        
        if (avgMemory > 85) { // 85% memory usage threshold
            return {
                type: 'security-issue',
                probability: Math.min(avgMemory / 100, 1),
                confidence: Math.min(avgMemory / 100, 1),
                description: `High memory usage detected: ${avgMemory.toFixed(1)}%`,
                affectedFiles: [],
                prevention: [
                    {
                        id: 'review-memory-patterns',
                        title: 'Review memory usage patterns',
                        description: 'Analyze memory usage patterns and optimize',
                        action: { type: 'command', data: { command: 'npm run memory-analysis' } },
                        estimatedImpact: 'high',
                        estimatedEffort: 'hours'
                    },
                    {
                        id: 'optimize-data-structures',
                        title: 'Optimize data structures',
                        description: 'Review and optimize data structures for memory efficiency',
                        action: { type: 'file-edit', data: { pattern: '**/*.ts' } },
                        estimatedImpact: 'medium',
                        estimatedEffort: 'hours'
                    },
                    {
                        id: 'check-resource-leaks',
                        title: 'Check for resource leaks',
                        description: 'Scan for resource leaks and memory retention issues',
                        action: { type: 'command', data: { command: 'npm run leak-detection' } },
                        estimatedImpact: 'high',
                        estimatedEffort: 'hours'
                    }
                ],
                timeline: '15-30 minutes',
                prediction: 'Memory usage will continue to increase',
                impact: 'high',
                recommendation: 'Investigate memory leaks and optimize data structures'
            };
        }

        return null;
    }

    private calculateTrend(values: number[]): number {
        if (values.length < 2) {
            return 0;
        }
        
        const n = values.length;
        const sumX = (n * (n - 1)) / 2;
        const sumY = values.reduce((sum, val) => sum + val, 0);
        const sumXY = values.reduce((sum, val, i) => sum + (i * val), 0);
        const sumXX = (n * (n - 1) * (2 * n - 1)) / 6;
        
        return (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    }

    private extractAffectedFiles(events: AnalyticsEvent[]): string[] {
        const files = new Set<string>();
        events.forEach(event => {
            if (event.metadata.filePath) {
                files.add(event.metadata.filePath);
            }
        });
        return Array.from(files);
    }

    private generateRiskRecommendations(riskLevel: string, criticalFactors: string[]): string[] {
        const recommendations: string[] = [];

        if (riskLevel === 'high') {
            recommendations.push('Immediate attention required');
            recommendations.push('Review system stability');
            recommendations.push('Consider rollback if recent changes');
        }

        if (criticalFactors.includes('Error Rate')) {
            recommendations.push('Investigate error patterns');
            recommendations.push('Review error logs');
        }

        if (criticalFactors.includes('Failure Rate')) {
            recommendations.push('Review test configurations');
            recommendations.push('Check dependency versions');
        }

        if (criticalFactors.includes('High Anomalies')) {
            recommendations.push('Investigate performance anomalies');
            recommendations.push('Monitor system resources');
        }

        return recommendations;
    }

    public dispose(): void {
        this.models.clear();
        this.trainingData = [];
        this.removeAllListeners();
    }
}
