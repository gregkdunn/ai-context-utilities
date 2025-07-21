import { AnalyticsEngine } from '../analyticsEngine';
import { PredictiveAnalyticsEngine } from '../engines/predictiveAnalyticsEngine';
import { MetricsCollectionEngine } from '../engines/metricsCollectionEngine';
import { InteractiveDashboardEngine } from '../engines/interactiveDashboardEngine';
import { 
  AnalyticsEvent, 
  TimeRange, 
  DashboardConfig, 
  PredictiveConfig,
  MetricsCollectionConfig 
} from '../../../types';

describe('Phase 4.4 - Advanced Analytics System', () => {
  let analyticsEngine: AnalyticsEngine;
  let predictiveEngine: PredictiveAnalyticsEngine;
  let metricsEngine: MetricsCollectionEngine;
  let dashboardEngine: InteractiveDashboardEngine;

  beforeEach(() => {
    analyticsEngine = new AnalyticsEngine({
      bufferSize: 100,
      flushInterval: 1000,
      enablePredictiveAnalytics: true,
      enableRealTimeMonitoring: true
    });

    predictiveEngine = new PredictiveAnalyticsEngine({
      enableAnomalyDetection: true,
      enableTrendForecasting: true,
      enableRiskAssessment: true,
      minTrainingDataSize: 10,
      confidenceThreshold: 0.5
    });

    metricsEngine = new MetricsCollectionEngine({
      bufferSize: 100,
      flushInterval: 1000,
      enableSystemMetrics: true,
      enableCustomMetrics: true
    });

    dashboardEngine = new InteractiveDashboardEngine();
  });

  afterEach(() => {
    analyticsEngine.dispose();
    predictiveEngine = null as any;
    metricsEngine.dispose();
    dashboardEngine.dispose();
  });

  describe('AnalyticsEngine', () => {
    it('should initialize with default configuration', () => {
      expect(analyticsEngine).toBeDefined();
      expect(analyticsEngine.listDashboards()).toEqual([]);
    });

    it('should start and stop collection', () => {
      const startSpy = jest.fn();
      const stopSpy = jest.fn();
      
      analyticsEngine.on('collectionStarted', startSpy);
      analyticsEngine.on('collectionStopped', stopSpy);
      
      analyticsEngine.startCollection();
      expect(startSpy).toHaveBeenCalled();
      
      analyticsEngine.stopCollection();
      expect(stopSpy).toHaveBeenCalled();
    });

    it('should track events and validate them', async () => {
      const validEvent: AnalyticsEvent = {
        id: 'test-event-1',
        type: 'command_executed',
        timestamp: new Date(),
        userId: 'user123',
        metadata: {
          command: 'npm test',
          success: true,
          executionTime: 1500
        }
      };

      analyticsEngine.startCollection();
      
      await expect(analyticsEngine.trackEvent(validEvent)).resolves.toBeUndefined();
      
      // Test invalid event
      const invalidEvent = {
        type: 'invalid_event',
        // Missing required fields
      } as AnalyticsEvent;
      
      await expect(analyticsEngine.trackEvent(invalidEvent)).rejects.toThrow('Invalid event structure');
    });

    it('should generate comprehensive metrics', async () => {
      const timeRange: TimeRange = {
        start: new Date(Date.now() - 3600000), // 1 hour ago
        end: new Date()
      };

      const events: AnalyticsEvent[] = [
        {
          id: 'event1',
          type: 'command_executed',
          timestamp: new Date(Date.now() - 1800000),
          userId: 'user1',
          metadata: { command: 'npm test', success: true, executionTime: 1200 }
        },
        {
          id: 'event2',
          type: 'error',
          timestamp: new Date(Date.now() - 1200000),
          userId: 'user1',
          metadata: { errorType: 'runtime', component: 'api' }
        }
      ];

      analyticsEngine.startCollection();
      
      for (const event of events) {
        await analyticsEngine.trackEvent(event);
      }

      const metrics = await analyticsEngine.generateMetrics(timeRange);
      
      expect(metrics).toHaveProperty('timeRange');
      expect(metrics).toHaveProperty('commandExecutions');
      expect(metrics).toHaveProperty('performance');
      expect(metrics).toHaveProperty('errors');
      expect(metrics).toHaveProperty('usage');
      expect(metrics).toHaveProperty('trends');
      expect(metrics.commandExecutions.total).toBe(1);
      expect(metrics.errors.total).toBe(1);
    });

    it('should create and manage dashboards', async () => {
      const dashboardConfig: DashboardConfig = {
        name: 'Test Dashboard',
        description: 'A test dashboard for analytics',
        layout: { type: 'grid', columns: 12, rows: 'auto', gap: '1rem', padding: '1rem' },
        widgets: [
          {
            type: 'line-chart',
            title: 'Performance Metrics',
            position: { x: 0, y: 0, width: 6, height: 4 },
            configuration: { chartType: 'line' }
          }
        ]
      };

      const dashboard = await analyticsEngine.createDashboard(dashboardConfig);
      
      expect(dashboard).toHaveProperty('id');
      expect(dashboard.name).toBe('Test Dashboard');
      expect(dashboard.widgets).toHaveLength(1);

      const retrieved = analyticsEngine.getDashboard(dashboard.id);
      expect(retrieved).toEqual(dashboard);

      const deleted = analyticsEngine.deleteDashboard(dashboard.id);
      expect(deleted).toBe(true);
      
      expect(analyticsEngine.getDashboard(dashboard.id)).toBeUndefined();
    });

    it('should export reports in different formats', async () => {
      const timeRange: TimeRange = {
        start: new Date(Date.now() - 3600000),
        end: new Date()
      };

      const events: AnalyticsEvent[] = [
        {
          id: 'event1',
          type: 'command_executed',
          timestamp: new Date(),
          userId: 'user1',
          metadata: { command: 'npm test', success: true }
        }
      ];

      analyticsEngine.startCollection();
      
      for (const event of events) {
        await analyticsEngine.trackEvent(event);
      }

      const jsonReport = await analyticsEngine.exportReport('json', timeRange);
      expect(jsonReport).toBeInstanceOf(Buffer);
      
      const csvReport = await analyticsEngine.exportReport('csv', timeRange);
      expect(csvReport).toBeInstanceOf(Buffer);
    });

    it('should generate predictive insights', async () => {
      const events: AnalyticsEvent[] = [
        {
          id: 'event1',
          type: 'command_executed',
          timestamp: new Date(),
          userId: 'user1',
          metadata: { command: 'npm test', success: false, executionTime: 1200 }
        },
        {
          id: 'event2',
          type: 'command_executed',
          timestamp: new Date(),
          userId: 'user1',
          metadata: { command: 'npm test', success: false, executionTime: 1500 }
        }
      ];

      analyticsEngine.startCollection();
      
      for (const event of events) {
        await analyticsEngine.trackEvent(event);
      }

      const predictions = await analyticsEngine.generatePredictions(events);
      
      expect(Array.isArray(predictions)).toBe(true);
      // Should predict command failures due to high failure rate
      expect(predictions.some(p => p.type === 'test-failure')).toBe(true);
    });
  });

  describe('PredictiveAnalyticsEngine', () => {
    it('should initialize with default models', () => {
      const models = predictiveEngine.getAvailableModels();
      expect(models.length).toBeGreaterThan(0);
      expect(models.some(m => m.id === 'command_failure')).toBe(true);
      expect(models.some(m => m.id === 'performance_degradation')).toBe(true);
    });

    it('should train models with sufficient data', async () => {
      const events: AnalyticsEvent[] = Array.from({ length: 20 }, (_, i) => ({
        id: `event${i}`,
        type: 'command_executed',
        timestamp: new Date(Date.now() - i * 60000),
        userId: 'user1',
        metadata: {
          command: 'npm test',
          success: Math.random() > 0.3,
          executionTime: Math.random() * 2000 + 500
        }
      }));

      await expect(predictiveEngine.trainModels(events)).resolves.toBeUndefined();
    });

    it('should reject training with insufficient data', async () => {
      const events: AnalyticsEvent[] = Array.from({ length: 5 }, (_, i) => ({
        id: `event${i}`,
        type: 'command_executed',
        timestamp: new Date(),
        userId: 'user1',
        metadata: { command: 'npm test', success: true }
      }));

      await expect(predictiveEngine.trainModels(events)).rejects.toThrow('Insufficient training data');
    });

    it('should generate predictions with confidence thresholds', async () => {
      const events: AnalyticsEvent[] = Array.from({ length: 15 }, (_, i) => ({
        id: `event${i}`,
        type: 'command_executed',
        timestamp: new Date(Date.now() - i * 60000),
        userId: 'user1',
        metadata: {
          command: 'npm test',
          success: i % 3 !== 0, // 33% failure rate
          executionTime: Math.random() * 2000 + 500
        }
      }));

      const predictions = await predictiveEngine.generatePredictions(events);
      
      expect(Array.isArray(predictions)).toBe(true);
      predictions.forEach(prediction => {
        expect(prediction.confidence || prediction.probability).toBeGreaterThanOrEqual(0.5);
        expect(prediction).toHaveProperty('type');
        expect(prediction).toHaveProperty('prediction');
        expect(prediction).toHaveProperty('recommendation');
      });
    });

    it('should detect anomalies in event patterns', async () => {
      const baselineEvents: AnalyticsEvent[] = Array.from({ length: 10 }, (_, i) => ({
        id: `baseline${i}`,
        type: 'performance_metric',
        timestamp: new Date(Date.now() - i * 60000),
        userId: 'user1',
        metadata: { value: 100 + Math.random() * 20 } // Normal range: 100-120
      }));

      const anomalousEvents: AnalyticsEvent[] = [
        {
          id: 'anomaly1',
          type: 'performance_metric',
          timestamp: new Date(),
          userId: 'user1',
          metadata: { value: 500 } // Anomalous value
        }
      ];

      // First, establish baseline
      await predictiveEngine.trainModels(baselineEvents);
      
      // Then detect anomalies
      const anomalies = await predictiveEngine.detectAnomalies([...baselineEvents, ...anomalousEvents]);
      
      expect(Array.isArray(anomalies)).toBe(true);
      // Should detect the anomalous value
      expect(anomalies.length).toBeGreaterThan(0);
    });

    it('should generate forecasts for metrics', async () => {
      const events: AnalyticsEvent[] = Array.from({ length: 15 }, (_, i) => ({
        id: `event${i}`,
        type: 'resource_usage',
        timestamp: new Date(Date.now() - i * 60000),
        userId: 'user1',
        metadata: { 
          memoryUsage: 500 + i * 10, // Trending upward
          responseTime: Math.random() * 1000 + 200 
        }
      }));

      const forecasts = await predictiveEngine.generateForecasts(events, ['memoryUsage', 'responseTime'], 12);
      
      expect(Array.isArray(forecasts)).toBe(true);
      forecasts.forEach(forecast => {
        expect(forecast).toHaveProperty('metric');
        expect(forecast).toHaveProperty('currentValue');
        expect(forecast).toHaveProperty('forecastValue');
        expect(forecast).toHaveProperty('confidence');
      });
    });

    it('should assess overall risk levels', async () => {
      const events: AnalyticsEvent[] = [
        {
          id: 'event1',
          type: 'command_executed',
          timestamp: new Date(),
          userId: 'user1',
          metadata: { command: 'npm test', success: false }
        },
        {
          id: 'event2',
          type: 'resource_usage',
          timestamp: new Date(),
          userId: 'user1',
          metadata: { memoryUsage: 90, cpuUsage: 85 }
        }
      ];

      const riskAssessment = await predictiveEngine.assessRisk(events);
      
      expect(riskAssessment).toHaveProperty('overallRiskScore');
      expect(riskAssessment).toHaveProperty('riskLevel');
      expect(riskAssessment).toHaveProperty('criticalFactors');
      expect(riskAssessment).toHaveProperty('recommendations');
      expect(riskAssessment).toHaveProperty('predictions');
      expect(riskAssessment).toHaveProperty('anomalies');
      expect(riskAssessment.riskLevel).toMatch(/^(low|medium|high)$/);
    });

    it('should provide model performance metrics', () => {
      const modelId = 'command_failure';
      const metrics = predictiveEngine.getModelMetrics(modelId);
      
      expect(metrics).toHaveProperty('accuracy');
      expect(metrics).toHaveProperty('precision');
      expect(metrics).toHaveProperty('recall');
      expect(metrics).toHaveProperty('f1Score');
      expect(metrics).toHaveProperty('lastTrained');
      expect(metrics.accuracy).toBeGreaterThan(0);
      expect(metrics.accuracy).toBeLessThanOrEqual(1);
    });

    it('should toggle model activation', () => {
      const modelId = 'command_failure';
      
      predictiveEngine.toggleModel(modelId, false);
      let model = predictiveEngine.getAvailableModels().find(m => m.id === modelId);
      expect(model?.isActive).toBe(false);
      
      predictiveEngine.toggleModel(modelId, true);
      model = predictiveEngine.getAvailableModels().find(m => m.id === modelId);
      expect(model?.isActive).toBe(true);
    });
  });

  describe('MetricsCollectionEngine', () => {
    it('should initialize with default metrics', () => {
      const definitions = metricsEngine.getMetricDefinitions();
      expect(definitions.length).toBeGreaterThan(0);
      expect(definitions.some(d => d.name === 'command.execution.time')).toBe(true);
      expect(definitions.some(d => d.name === 'command.execution.count')).toBe(true);
    });

    it('should define and collect custom metrics', () => {
      const metricDefinition = {
        name: 'custom.metric',
        type: 'gauge' as const,
        unit: 'count',
        description: 'A custom metric for testing',
        tags: ['test']
      };

      metricsEngine.defineMetric(metricDefinition);
      metricsEngine.startCollection();
      
      expect(() => {
        metricsEngine.collectMetric('custom.metric', 42, { environment: 'test' });
      }).not.toThrow();
    });

    it('should validate metric definitions', () => {
      const invalidDefinition = {
        name: '',
        type: 'invalid' as any,
        unit: 'count',
        description: 'Invalid metric',
        tags: []
      };

      expect(() => {
        metricsEngine.defineMetric(invalidDefinition);
      }).toThrow('Invalid metric definition');
    });

    it('should apply collection rules', () => {
      const rule = {
        id: 'test_rule',
        name: 'Test Rule',
        condition: 'metric.name === "test.metric"',
        action: 'filter' as const,
        parameters: {},
        isActive: true
      };

      const metricDefinition = {
        name: 'test.metric',
        type: 'counter' as const,
        unit: 'count',
        description: 'Test metric',
        tags: []
      };

      metricsEngine.defineMetric(metricDefinition);
      metricsEngine.createCollectionRule(rule);
      metricsEngine.startCollection();

      const collectedSpy = jest.fn();
      metricsEngine.on('metricCollected', collectedSpy);

      // This should be filtered out by the rule
      metricsEngine.collectMetric('test.metric', 1);
      
      expect(collectedSpy).not.toHaveBeenCalled();
    });

    it('should generate aggregated metrics', () => {
      const metricDefinition = {
        name: 'aggregation.test',
        type: 'histogram' as const,
        unit: 'milliseconds',
        description: 'Aggregation test metric',
        tags: []
      };

      metricsEngine.defineMetric(metricDefinition);
      metricsEngine.startCollection();

      // Collect some sample data
      for (let i = 0; i < 10; i++) {
        metricsEngine.collectMetric('aggregation.test', i * 10);
      }

      const aggregation = metricsEngine.getAggregatedMetrics('aggregation.test', '1m');
      
      expect(aggregation).toHaveProperty('count');
      expect(aggregation).toHaveProperty('sum');
      expect(aggregation).toHaveProperty('avg');
      expect(aggregation).toHaveProperty('min');
      expect(aggregation).toHaveProperty('max');
      expect(aggregation!.count).toBe(10);
      expect(aggregation!.sum).toBe(450); // 0+10+20+...+90
    });

    it('should collect system metrics automatically', (done) => {
      const metricCollectedSpy = jest.fn();
      metricsEngine.on('metricCollected', metricCollectedSpy);
      
      metricsEngine.startCollection();
      
      // Wait for system metrics to be collected
      setTimeout(() => {
        try {
          expect(metricCollectedSpy).toHaveBeenCalled();
          
          // Check if system metrics were collected
          const calls = metricCollectedSpy.mock.calls;
          const systemMetricsCalls = calls.filter(call => 
            call[0].name.startsWith('system.')
          );
          
          expect(systemMetricsCalls.length).toBeGreaterThan(0);
          done();
        } catch (error) {
          done(error);
        }
      }, 1200); // Wait longer than system metrics interval
    }, 15000); // Increase timeout to 15 seconds

    it('should export metrics in different formats', () => {
      const metricDefinition = {
        name: 'export.test',
        type: 'gauge' as const,
        unit: 'count',
        description: 'Export test metric',
        tags: []
      };

      metricsEngine.defineMetric(metricDefinition);
      metricsEngine.startCollection();
      metricsEngine.collectMetric('export.test', 100);

      const jsonExport = metricsEngine.exportMetrics('json');
      expect(typeof jsonExport).toBe('string');
      expect(() => JSON.parse(jsonExport)).not.toThrow();

      const csvExport = metricsEngine.exportMetrics('csv');
      expect(typeof csvExport).toBe('string');
      expect(csvExport).toContain('Metric,Value,Timestamp,Tags');

      const prometheusExport = metricsEngine.exportMetrics('prometheus');
      expect(typeof prometheusExport).toBe('string');
    });

    it('should provide buffer status information', () => {
      const metricDefinition = {
        name: 'buffer.test',
        type: 'counter' as const,
        unit: 'count',
        description: 'Buffer test metric',
        tags: []
      };

      metricsEngine.defineMetric(metricDefinition);
      metricsEngine.startCollection();
      metricsEngine.collectMetric('buffer.test', 1);

      const bufferStatus = metricsEngine.getBufferStatus();
      
      expect(bufferStatus).toBeInstanceOf(Map);
      expect(bufferStatus.has('buffer.test')).toBe(true);
      
      const status = bufferStatus.get('buffer.test');
      expect(status).toHaveProperty('size');
      expect(status).toHaveProperty('lastUpdated');
      expect(status!.size).toBe(1);
    });

    it('should clear metrics data', () => {
      const metricDefinition = {
        name: 'clear.test',
        type: 'gauge' as const,
        unit: 'count',
        description: 'Clear test metric',
        tags: []
      };

      metricsEngine.defineMetric(metricDefinition);
      metricsEngine.startCollection();
      metricsEngine.collectMetric('clear.test', 1);

      let bufferStatus = metricsEngine.getBufferStatus();
      expect(bufferStatus.has('clear.test')).toBe(true);

      metricsEngine.clearMetrics();
      
      bufferStatus = metricsEngine.getBufferStatus();
      expect(bufferStatus.has('clear.test')).toBe(false);
    });
  });

  describe('InteractiveDashboardEngine', () => {
    it('should create dashboards with widgets', async () => {
      const config: DashboardConfig = {
        name: 'Analytics Dashboard',
        description: 'Main analytics dashboard',
        widgets: [
          {
            type: 'line-chart',
            title: 'Performance Chart',
            position: { x: 0, y: 0, width: 6, height: 4 },
            configuration: { chartType: 'line' }
          },
          {
            type: 'metric-card',
            title: 'Success Rate',
            position: { x: 6, y: 0, width: 3, height: 2 },
            configuration: { metric: 'success_rate' }
          }
        ]
      };

      const dashboard = await dashboardEngine.createDashboard(config);
      
      expect(dashboard).toHaveProperty('id');
      expect(dashboard.name).toBe('Analytics Dashboard');
      expect(dashboard.widgets).toHaveLength(2);
      expect(dashboard.widgets[0].type).toBe('line-chart');
      expect(dashboard.widgets[1].type).toBe('metric-card');
    });

    it('should update dashboard configurations', async () => {
      const config: DashboardConfig = {
        name: 'Test Dashboard',
        description: 'Initial description'
      };

      const dashboard = await dashboardEngine.createDashboard(config);
      
      // Wait a bit to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const updated = await dashboardEngine.updateDashboard(dashboard.id, {
        name: 'Updated Dashboard',
        description: 'Updated description'
      });
      
      expect(updated.name).toBe('Updated Dashboard');
      expect(updated.description).toBe('Updated description');
      expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(dashboard.updatedAt.getTime());
    });

    it('should create and manage individual widgets', async () => {
      const widgetConfig = {
        type: 'bar-chart' as const,
        title: 'Command Usage',
        position: { x: 0, y: 0, width: 4, height: 3 },
        configuration: { 
          chartType: 'bar',
          dataSource: { type: 'analytics', query: 'command_usage' }
        }
      };

      const widget = await dashboardEngine.createWidget(widgetConfig);
      
      expect(widget).toHaveProperty('id');
      expect(widget.type).toBe('bar-chart');
      expect(widget.title).toBe('Command Usage');
    });

    it('should refresh widget data', async () => {
      const widgetConfig = {
        type: 'gauge' as const,
        title: 'System Health',
        position: { x: 0, y: 0, width: 2, height: 2 },
        configuration: { min: 0, max: 100 }
      };

      const widget = await dashboardEngine.createWidget(widgetConfig);
      const data = await dashboardEngine.refreshWidgetData(widget.id);
      
      expect(data).toHaveProperty('id');
      expect(data).toHaveProperty('type');
      expect(data).toHaveProperty('data');
      expect(data).toHaveProperty('metadata');
      expect(data.id).toBe(widget.id);
    });

    it('should apply filters to dashboards', async () => {
      const config: DashboardConfig = {
        name: 'Filtered Dashboard',
        description: 'Dashboard with filters'
      };

      const dashboard = await dashboardEngine.createDashboard(config);
      
      const filters = [
        {
          id: 'time_range',
          type: 'date-range' as const,
          label: 'Time Range',
          value: { start: new Date(Date.now() - 3600000), end: new Date() }
        },
        {
          id: 'user_filter',
          type: 'select' as const,
          label: 'User',
          value: 'user123',
          options: ['user123', 'user456']
        }
      ];

      const appliedSpy = jest.fn();
      dashboardEngine.on('filtersApplied', appliedSpy);

      dashboardEngine.applyFilters(dashboard.id, filters);
      
      expect(appliedSpy).toHaveBeenCalledWith({
        dashboardId: dashboard.id,
        filters
      });
    });

    it('should export dashboards', async () => {
      const config: DashboardConfig = {
        name: 'Export Test Dashboard',
        description: 'Dashboard for export testing'
      };

      const dashboard = await dashboardEngine.createDashboard(config);
      const exportData = await dashboardEngine.exportDashboard(dashboard.id, 'json');
      
      expect(exportData).toHaveProperty('dashboard');
      expect(exportData).toHaveProperty('format');
      expect(exportData).toHaveProperty('exportedAt');
      expect(exportData).toHaveProperty('data');
      expect(exportData.format).toBe('json');
    });

    it('should clone dashboards', async () => {
      const config: DashboardConfig = {
        name: 'Original Dashboard',
        description: 'Original dashboard for cloning',
        widgets: [
          {
            type: 'line-chart',
            title: 'Original Chart',
            position: { x: 0, y: 0, width: 4, height: 3 }
          }
        ]
      };

      const original = await dashboardEngine.createDashboard(config);
      const cloned = await dashboardEngine.cloneDashboard(original.id, 'Cloned Dashboard', 'user123');
      
      expect(cloned.name).toBe('Cloned Dashboard');
      expect(cloned.description).toContain('Clone of');
      expect(cloned.widgets).toHaveLength(original.widgets.length);
      expect(cloned.id).not.toBe(original.id);
    });

    it('should provide dashboard analytics', async () => {
      const config: DashboardConfig = {
        name: 'Analytics Test Dashboard',
        description: 'Dashboard for analytics testing'
      };

      const dashboard = await dashboardEngine.createDashboard(config);
      const analytics = dashboardEngine.getDashboardAnalytics(dashboard.id);
      
      expect(analytics).toHaveProperty('views');
      expect(analytics).toHaveProperty('interactions');
      expect(analytics).toHaveProperty('performance');
      expect(analytics).toHaveProperty('widgets');
      expect(typeof analytics.views).toBe('number');
      expect(typeof analytics.interactions).toBe('number');
    });

    it('should manage dashboard themes', () => {
      const customTheme = {
        id: 'custom-theme',
        name: 'Custom Theme',
        colors: {
          primary: '#FF6B6B',
          secondary: '#4ECDC4',
          success: '#45B7D1',
          warning: '#FFA07A',
          error: '#FF6B6B',
          background: '#F8F9FA',
          surface: '#FFFFFF',
          text: '#333333'
        },
        fonts: {
          body: 'Arial, sans-serif',
          heading: 'Helvetica, sans-serif',
          monospace: 'Courier New, monospace'
        },
        spacing: {
          small: '4px',
          medium: '8px',
          large: '16px'
        }
      };

      const themeCreatedSpy = jest.fn();
      dashboardEngine.on('themeCreated', themeCreatedSpy);

      dashboardEngine.createTheme(customTheme);
      
      expect(themeCreatedSpy).toHaveBeenCalledWith(customTheme);
      
      const themes = dashboardEngine.getThemes();
      expect(themes.some(t => t.id === 'custom-theme')).toBe(true);
    });

    it('should list available widget types', () => {
      const widgetTypes = dashboardEngine.getWidgetTypes();
      
      expect(Array.isArray(widgetTypes)).toBe(true);
      expect(widgetTypes.length).toBeGreaterThan(0);
      expect(widgetTypes.some(t => t.id === 'line-chart')).toBe(true);
      expect(widgetTypes.some(t => t.id === 'bar-chart')).toBe(true);
      expect(widgetTypes.some(t => t.id === 'pie-chart')).toBe(true);
    });

    it('should delete dashboards and clean up resources', async () => {
      const config: DashboardConfig = {
        name: 'Temporary Dashboard',
        description: 'Dashboard to be deleted'
      };

      const dashboard = await dashboardEngine.createDashboard(config);
      expect(dashboardEngine.getDashboard(dashboard.id)).toBeDefined();

      const deletedSpy = jest.fn();
      dashboardEngine.on('dashboardDeleted', deletedSpy);

      const deleted = dashboardEngine.deleteDashboard(dashboard.id);
      
      expect(deleted).toBe(true);
      expect(deletedSpy).toHaveBeenCalledWith(dashboard.id);
      expect(dashboardEngine.getDashboard(dashboard.id)).toBeUndefined();
    });
  });

  describe('Integration Tests', () => {
    it('should integrate analytics engine with predictive engine', async () => {
      const events: AnalyticsEvent[] = Array.from({ length: 15 }, (_, i) => ({
        id: `integration-event-${i}`,
        type: 'command_executed',
        timestamp: new Date(Date.now() - i * 60000),
        userId: 'integration-user',
        metadata: {
          command: 'npm test',
          success: i % 4 !== 0, // 25% failure rate
          executionTime: Math.random() * 1000 + 500
        }
      }));

      analyticsEngine.startCollection();
      
      for (const event of events) {
        await analyticsEngine.trackEvent(event);
      }

      const timeRange: TimeRange = {
        start: new Date(Date.now() - 3600000),
        end: new Date()
      };

      const metrics = await analyticsEngine.generateMetrics(timeRange);
      expect(metrics.predictions).toBeDefined();
      expect(Array.isArray(metrics.predictions)).toBe(true);
    });

    it('should integrate metrics engine with dashboard engine', async () => {
      const metricDefinition = {
        name: 'integration.test.metric',
        type: 'gauge' as const,
        unit: 'count',
        description: 'Integration test metric',
        tags: []
      };

      metricsEngine.defineMetric(metricDefinition);
      metricsEngine.startCollection();
      
      // Collect some metrics
      for (let i = 0; i < 10; i++) {
        metricsEngine.collectMetric('integration.test.metric', i * 10);
      }

      const dashboardConfig: DashboardConfig = {
        name: 'Metrics Integration Dashboard',
        description: 'Dashboard showing metrics integration',
        widgets: [
          {
            type: 'metric-card',
            title: 'Integration Metric',
            position: { x: 0, y: 0, width: 3, height: 2 },
            configuration: { metric: 'integration.test.metric' }
          }
        ]
      };

      const dashboard = await dashboardEngine.createDashboard(dashboardConfig);
      
      expect(dashboard.widgets).toHaveLength(1);
      expect(dashboard.widgets[0].title).toBe('Integration Metric');
    });

    it('should handle concurrent operations across all engines', async () => {
      const promises: Promise<any>[] = [];
      
      // Start concurrent operations
      promises.push(analyticsEngine.trackEvent({
        id: 'concurrent-1',
        type: 'command_executed',
        timestamp: new Date(),
        userId: 'concurrent-user',
        metadata: { command: 'npm test', success: true }
      }));

      metricsEngine.collectMetric('command.execution.count', 1);
      
      promises.push(dashboardEngine.createDashboard({
        name: 'Concurrent Dashboard',
        description: 'Created during concurrent test'
      }));

      const events = Array.from({ length: 5 }, (_, i) => ({
        id: `concurrent-${i}`,
        type: 'command_executed',
        timestamp: new Date(),
        userId: 'concurrent-user',
        metadata: { command: 'npm test', success: true }
      }));

      promises.push(predictiveEngine.generatePredictions(events));

      // All operations should complete successfully
      await expect(Promise.all(promises)).resolves.toBeDefined();
    });
  });
});
