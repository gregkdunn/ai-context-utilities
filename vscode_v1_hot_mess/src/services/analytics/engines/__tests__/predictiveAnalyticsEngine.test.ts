import { PredictiveAnalyticsEngine } from '../predictiveAnalyticsEngine';
import { AnalyticsEvent, PredictiveConfig, PredictionResult, ForecastResult, AnomalyDetection } from '../../../../types';

describe('PredictiveAnalyticsEngine', () => {
    let engine: PredictiveAnalyticsEngine;
    let mockEvents: AnalyticsEvent[];

    beforeEach(() => {
        const config: PredictiveConfig = {
            enableAnomalyDetection: true,
            enableTrendForecasting: true,
            enableRiskAssessment: true,
            modelUpdateInterval: 3600000,
            anomalyThreshold: 2.0,
            predictionHorizon: 24,
            minTrainingDataSize: 10, // Lower for testing
            confidenceThreshold: 0.5
        };

        engine = new PredictiveAnalyticsEngine(config);

        // Create mock events for testing
        mockEvents = [
            {
                id: 'event1',
                type: 'command_executed',
                timestamp: new Date('2024-01-01T10:00:00Z'),
                userId: 'user1',
                metadata: {
                    success: true,
                    duration: 1000,
                    command: 'nxTest'
                }
            },
            {
                id: 'event2',
                type: 'command_executed',
                timestamp: new Date('2024-01-01T10:05:00Z'),
                userId: 'user1',
                metadata: {
                    success: false,
                    duration: 2000,
                    command: 'nxTest'
                }
            },
            {
                id: 'event3',
                type: 'performance_metric',
                timestamp: new Date('2024-01-01T10:10:00Z'),
                userId: 'user1',
                metadata: {
                    responseTime: 1500,
                    value: 1500
                }
            },
            {
                id: 'event4',
                type: 'performance_metric',
                timestamp: new Date('2024-01-01T10:15:00Z'),
                userId: 'user1',
                metadata: {
                    responseTime: 3000,
                    value: 3000
                }
            },
            {
                id: 'event5',
                type: 'resource_usage',
                timestamp: new Date('2024-01-01T10:20:00Z'),
                userId: 'user1',
                metadata: {
                    memoryUsage: 90,
                    cpuUsage: 75
                }
            }
        ];
    });

    afterEach(() => {
        engine.dispose();
    });

    describe('initialization', () => {
        it('should initialize with default models', () => {
            const models = engine.getAvailableModels();
            expect(models).toHaveLength(3);
            expect(models.map(m => m.id)).toContain('command_failure');
            expect(models.map(m => m.id)).toContain('performance_degradation');
            expect(models.map(m => m.id)).toContain('resource_utilization');
        });

        it('should have correct model properties', () => {
            const models = engine.getAvailableModels();
            const commandFailureModel = models.find(m => m.id === 'command_failure');
            
            expect(commandFailureModel).toBeDefined();
            expect(commandFailureModel!.name).toBe('Command Failure Prediction');
            expect(commandFailureModel!.type).toBe('classification');
            expect(commandFailureModel!.isActive).toBe(true);
        });
    });

    describe('model training', () => {
        it('should train models with sufficient data', async () => {
            const events = Array.from({ length: 15 }, (_, i) => ({
                id: `event${i}`,
                type: 'command_executed',
                timestamp: new Date(),
                userId: 'user1',
                metadata: { success: i % 2 === 0 }
            }));

            await expect(engine.trainModels(events)).resolves.not.toThrow();
        });

        it('should throw error with insufficient training data', async () => {
            const events = Array.from({ length: 5 }, (_, i) => ({
                id: `event${i}`,
                type: 'command_executed',
                timestamp: new Date(),
                userId: 'user1',
                metadata: { success: true }
            }));

            await expect(engine.trainModels(events)).rejects.toThrow('Insufficient training data');
        });

        it('should emit modelsTrained event', async () => {
            const events = Array.from({ length: 15 }, (_, i) => ({
                id: `event${i}`,
                type: 'command_executed',
                timestamp: new Date(),
                userId: 'user1',
                metadata: { success: true }
            }));

            let eventEmitted = false;
            engine.on('modelsTrained', (data) => {
                eventEmitted = true;
                expect(data.modelCount).toBe(3);
                expect(data.dataSize).toBe(15);
            });

            await engine.trainModels(events);
            expect(eventEmitted).toBe(true);
        });
    });

    describe('prediction generation', () => {
        it('should generate predictions for high failure rate', async () => {
            const commandEvents = Array.from({ length: 10 }, (_, i) => ({
                id: `cmd${i}`,
                type: 'command_executed',
                timestamp: new Date(),
                userId: 'user1',
                metadata: { success: i < 3 } // 70% failure rate
            }));

            const predictions = await engine.generatePredictions(commandEvents);
            
            expect(predictions).toHaveLength(1);
            expect(predictions[0].type).toBe('test-failure');
            expect(predictions[0].probability).toBeGreaterThan(0);
            expect(predictions[0].confidence).toBeGreaterThan(0);
        });

        it('should generate predictions for performance degradation', async () => {
            const performanceEvents = Array.from({ length: 5 }, (_, i) => ({
                id: `perf${i}`,
                type: 'performance_metric',
                timestamp: new Date(),
                userId: 'user1',
                metadata: { responseTime: 3000 + i * 100 } // High response times
            }));

            const predictions = await engine.generatePredictions(performanceEvents);
            
            expect(predictions).toHaveLength(1);
            expect(predictions[0].type).toBe('performance-degradation');
            expect(predictions[0].probability).toBeGreaterThan(0);
        });

        it('should generate predictions for resource utilization', async () => {
            const resourceEvents = Array.from({ length: 5 }, (_, i) => ({
                id: `res${i}`,
                type: 'resource_usage',
                timestamp: new Date(),
                userId: 'user1',
                metadata: { memoryUsage: 90 + i } // High memory usage
            }));

            const predictions = await engine.generatePredictions(resourceEvents);
            
            expect(predictions).toHaveLength(1);
            expect(predictions[0].type).toBe('security-issue');
            expect(predictions[0].probability).toBeGreaterThan(0);
        });

        it('should handle events without confidence property', async () => {
            const events = [{
                id: 'test1',
                type: 'command_executed',
                timestamp: new Date(),
                userId: 'user1',
                metadata: { success: false }
            }];

            // Should not throw error even if confidence is undefined
            await expect(engine.generatePredictions(events)).resolves.not.toThrow();
        });
    });

    describe('anomaly detection', () => {
        it('should detect performance anomalies', async () => {
            const events = [
                {
                    id: 'normal1',
                    type: 'performance_metric',
                    timestamp: new Date(),
                    userId: 'user1',
                    metadata: { value: 100 }
                },
                {
                    id: 'normal2',
                    type: 'performance_metric',
                    timestamp: new Date(),
                    userId: 'user1',
                    metadata: { value: 110 }
                },
                {
                    id: 'anomaly1',
                    type: 'performance_metric',
                    timestamp: new Date(),
                    userId: 'user1',
                    metadata: { value: 600 } // 500% deviation from average
                }
            ];

            const anomalies = await engine.detectAnomalies(events);
            
            expect(anomalies).toHaveLength(1);
            expect(anomalies[0].type).toBe('performance');
            expect(anomalies[0].severity).toBe('high');
        });

        it('should return empty array when anomaly detection is disabled', async () => {
            const config: PredictiveConfig = { enableAnomalyDetection: false };
            const disabledEngine = new PredictiveAnalyticsEngine(config);
            
            const anomalies = await disabledEngine.detectAnomalies(mockEvents);
            expect(anomalies).toHaveLength(0);
            
            disabledEngine.dispose();
        });
    });

    describe('forecasting', () => {
        it('should generate forecasts for metrics', async () => {
            const events = [
                {
                    id: 'metric1',
                    type: 'performance',
                    timestamp: new Date(),
                    userId: 'user1',
                    metadata: { responseTime: 100 }
                },
                {
                    id: 'metric2',
                    type: 'performance',
                    timestamp: new Date(),
                    userId: 'user1',
                    metadata: { responseTime: 110 }
                },
                {
                    id: 'metric3',
                    type: 'performance',
                    timestamp: new Date(),
                    userId: 'user1',
                    metadata: { responseTime: 120 }
                }
            ];

            const forecasts = await engine.generateForecasts(events, ['responseTime'], 24);
            
            expect(forecasts).toHaveLength(1);
            expect(forecasts[0]).toHaveProperty('id');
            expect(forecasts[0]).toHaveProperty('timeHorizon');
            expect(forecasts[0]).toHaveProperty('dataPoints');
            expect(forecasts[0].metric).toBe('responseTime');
            expect(forecasts[0].horizon).toBe(24);
            expect(forecasts[0].timeHorizon).toBe(24);
            expect(forecasts[0].dataPoints).toBe(3);
        });

        it('should return empty array when forecasting is disabled', async () => {
            const config: PredictiveConfig = { enableTrendForecasting: false };
            const disabledEngine = new PredictiveAnalyticsEngine(config);
            
            const forecasts = await disabledEngine.generateForecasts(mockEvents, ['responseTime'], 24);
            expect(forecasts).toHaveLength(0);
            
            disabledEngine.dispose();
        });
    });

    describe('risk assessment', () => {
        it('should perform comprehensive risk assessment', async () => {
            const riskEvents = [
                ...Array.from({ length: 5 }, (_, i) => ({
                    id: `error${i}`,
                    type: 'error',
                    timestamp: new Date(),
                    userId: 'user1',
                    metadata: { message: 'Test error' }
                })),
                ...Array.from({ length: 5 }, (_, i) => ({
                    id: `cmd${i}`,
                    type: 'command_executed',
                    timestamp: new Date(),
                    userId: 'user1',
                    metadata: { success: i < 2 } // 40% failure rate
                }))
            ];

            const assessment = await engine.assessRisk(riskEvents);
            
            expect(assessment.overallRiskScore).toBeGreaterThan(0);
            expect(assessment.riskLevel).toMatch(/^(low|medium|high)$/);
            expect(assessment.recommendations).toBeInstanceOf(Array);
            expect(assessment.assessedAt).toBeInstanceOf(Date);
        });

        it('should return low risk when risk assessment is disabled', async () => {
            const config: PredictiveConfig = { enableRiskAssessment: false };
            const disabledEngine = new PredictiveAnalyticsEngine(config);
            
            const assessment = await disabledEngine.assessRisk(mockEvents);
            expect(assessment.riskLevel).toBe('low');
            expect(assessment.overallRiskScore).toBe(0);
            
            disabledEngine.dispose();
        });
    });

    describe('model management', () => {
        it('should get model metrics', () => {
            const metrics = engine.getModelMetrics('command_failure');
            
            expect(metrics).toHaveProperty('accuracy');
            expect(metrics).toHaveProperty('precision');
            expect(metrics).toHaveProperty('recall');
            expect(metrics).toHaveProperty('f1Score');
            expect(metrics).toHaveProperty('lastTrained');
            expect(metrics).toHaveProperty('trainingDataSize');
        });

        it('should throw error for unknown model', () => {
            expect(() => engine.getModelMetrics('unknown_model')).toThrow('Model not found: unknown_model');
        });

        it('should toggle model activation', () => {
            let eventEmitted = false;
            engine.on('modelToggled', (data) => {
                eventEmitted = true;
                expect(data.modelId).toBe('command_failure');
                expect(data.isActive).toBe(false);
            });

            engine.toggleModel('command_failure', false);
            
            const models = engine.getAvailableModels();
            const toggledModel = models.find(m => m.id === 'command_failure');
            expect(toggledModel!.isActive).toBe(false);
            expect(eventEmitted).toBe(true);
        });
    });

    describe('disposal', () => {
        it('should clean up resources on dispose', () => {
            const models = engine.getAvailableModels();
            expect(models).toHaveLength(3);

            engine.dispose();

            // After disposal, models should be cleared
            const modelsAfterDispose = engine.getAvailableModels();
            expect(modelsAfterDispose).toHaveLength(0);
        });
    });
});
