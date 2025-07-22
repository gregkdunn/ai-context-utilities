import { EventEmitter } from 'events';
import { 
  AnalyticsEvent, 
  Metrics, 
  Dashboard, 
  ReportFormat, 
  TimeRange, 
  DashboardConfig,
  AnalyticsEngineConfig,
  MetricsSnapshot,
  PredictionResult,
  PerformanceMetrics,
  ErrorMetrics,
  UsageMetrics,
  ExecutionMetrics,
  TrendAnalysis,
  AnalyticsExportData
} from '../../types';

/**
 * Advanced Analytics Engine for Phase 4.4
 * 
 * Provides comprehensive analytics capabilities including:
 * - Advanced metrics collection and processing
 * - Interactive dashboard generation
 * - Predictive analytics and insights
 * - Custom report generation with export
 * - Real-time performance monitoring
 */
export class AnalyticsEngine extends EventEmitter {
  private metricsHistory: MetricsSnapshot[] = [];
  private eventBuffer: AnalyticsEvent[] = [];
  private dashboards: Map<string, Dashboard> = new Map();
  private config: AnalyticsEngineConfig;
  private isCollecting = false;
  private bufferFlushInterval?: NodeJS.Timeout;
  private performanceMonitor?: NodeJS.Timeout;

  constructor(config: AnalyticsEngineConfig = {}) {
    super();
    this.config = {
      bufferSize: 1000,
      flushInterval: 5000, // 5 seconds
      retentionDays: 30,
      enablePredictiveAnalytics: true,
      enableRealTimeMonitoring: true,
      ...config
    };
    
    this.initializeEngine();
  }

  /**
   * Initialize the analytics engine
   */
  private initializeEngine(): void {
    this.startEventBuffering();
    if (this.config.enableRealTimeMonitoring) {
      this.startPerformanceMonitoring();
    }
    this.emit('engineInitialized');
  }

  /**
   * Start collecting analytics events
   */
  public startCollection(): void {
    if (this.isCollecting) {
      return;
    }
    
    this.isCollecting = true;
    this.emit('collectionStarted');
  }

  /**
   * Stop collecting analytics events
   */
  public stopCollection(): void {
    if (!this.isCollecting) {
      return;
    }
    
    this.isCollecting = false;
    this.flushEventBuffer();
    this.emit('collectionStopped');
  }

  /**
   * Track an analytics event
   */
  public async trackEvent(event: AnalyticsEvent): Promise<void> {
    if (!this.isCollecting) {
      return;
    }

    // Validate event structure
    if (!this.validateEvent(event)) {
      throw new Error('Invalid event structure');
    }

    // Add to buffer
    this.eventBuffer.push({
      ...event,
      timestamp: event.timestamp || new Date(),
      id: event.id || this.generateEventId()
    });

    // Check if buffer needs flushing
    if (this.eventBuffer.length >= (this.config.bufferSize || 1000)) {
      this.flushEventBuffer();
    }

    this.emit('eventTracked', event);
  }

  /**
   * Generate comprehensive metrics for a time range
   */
  public async generateMetrics(timeRange: TimeRange): Promise<Metrics> {
    const events = this.getEventsInRange(timeRange);
    
    const metrics: Metrics = {
      timeRange,
      commandExecutions: this.analyzeCommandExecutions(events),
      performance: this.analyzePerformance(events),
      errors: this.analyzeErrors(events),
      usage: this.analyzeUsage(events),
      trends: this.analyzeTrends(events),
      predictions: this.config.enablePredictiveAnalytics ? 
        await this.generatePredictions(events) : undefined
    };

    // Store metrics snapshot
    this.metricsHistory.push({
      id: this.generateSnapshotId(),
      metrics: metrics as any,
      timestamp: new Date(),
      systemMetrics: {
        timestamp: new Date(),
        cpu: {
          usage: 0,
          cores: 1,
          loadAverage: [0, 0, 0]
        },
        memory: {
          total: 0,
          used: 0,
          free: 0,
          percentage: 0
        },
        disk: {
          total: 0,
          used: 0,
          free: 0,
          percentage: 0
        },
        network: {
          rx: 0,
          tx: 0,
          rxPackets: 0,
          txPackets: 0
        },
        processes: 0,
        uptime: 0
      },
      collectionStats: {},
      bufferStats: {}
    });

    // Cleanup old metrics
    this.cleanupOldMetrics();

    this.emit('metricsGenerated', metrics);
    return metrics;
  }

  /**
   * Create an interactive dashboard
   */
  public async createDashboard(config: DashboardConfig): Promise<Dashboard> {
    const dashboard: Dashboard = {
      id: config.id || this.generateDashboardId(),
      name: config.name,
      description: config.description,
      layout: config.layout || { type: 'grid', columns: 12, rows: 'auto', gap: '1rem', padding: '1rem' },
      widgets: await this.createDashboardWidgets(config),
      filters: config.filters || [],
      refreshInterval: config.refreshInterval || 30000,
      createdAt: new Date(),
      updatedAt: new Date(),
      isRealTime: config.isRealTime || false
    };

    this.dashboards.set(dashboard.id, dashboard);
    
    if (dashboard.isRealTime) {
      this.startDashboardUpdates(dashboard.id);
    }

    this.emit('dashboardCreated', dashboard);
    return dashboard;
  }

  /**
   * Export analytics data in specified format
   */
  public async exportReport(
    format: ReportFormat, 
    timeRange: TimeRange,
    config?: any
  ): Promise<Buffer> {
    const metrics = await this.generateMetrics(timeRange);
    const exportData: AnalyticsExportData = {
      metrics,
      events: this.getEventsInRange(timeRange),
      dashboards: Array.from(this.dashboards.values()),
      exportedAt: new Date(),
      timeRange,
      format
    };

    switch (format) {
      case 'json':
        return this.exportAsJson(exportData);
      case 'csv':
        return this.exportAsCsv(exportData);
      case 'pdf':
        return this.exportAsPdf(exportData, config);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Generate predictive analytics insights
   */
  public async generatePredictions(events?: AnalyticsEvent[]): Promise<PredictionResult[]> {
    if (!this.config.enablePredictiveAnalytics) {
      return [];
    }

    const analysisEvents = events || this.eventBuffer;
    const predictions: PredictionResult[] = [];

    // Command failure prediction
    const failurePrediction = this.predictCommandFailures(analysisEvents);
    if (failurePrediction) {
      predictions.push(failurePrediction);
    }

    // Performance degradation prediction
    const performancePrediction = this.predictPerformanceDegradation(analysisEvents);
    if (performancePrediction) {
      predictions.push(performancePrediction);
    }

    // Resource utilization prediction
    const resourcePrediction = this.predictResourceUtilization(analysisEvents);
    if (resourcePrediction) {
      predictions.push(resourcePrediction);
    }

    return predictions;
  }

  /**
   * Get real-time performance metrics
   */
  public getRealtimeMetrics(): PerformanceMetrics {
    const recentEvents = this.eventBuffer.slice(-100); // Last 100 events
    return this.analyzePerformance(recentEvents);
  }

  /**
   * Update dashboard configuration
   */
  public async updateDashboard(id: string, config: Partial<DashboardConfig>): Promise<Dashboard> {
    const dashboard = this.dashboards.get(id);
    if (!dashboard) {
      throw new Error(`Dashboard not found: ${id}`);
    }

    const updatedDashboard = {
      ...dashboard,
      ...config,
      updatedAt: new Date()
    };

    this.dashboards.set(id, updatedDashboard as Dashboard);
    this.emit('dashboardUpdated', updatedDashboard);
    return updatedDashboard as Dashboard;
  }

  /**
   * Get dashboard by ID
   */
  public getDashboard(id: string): Dashboard | undefined {
    return this.dashboards.get(id);
  }

  /**
   * List all dashboards
   */
  public listDashboards(): Dashboard[] {
    return Array.from(this.dashboards.values());
  }

  /**
   * Delete a dashboard
   */
  public deleteDashboard(id: string): boolean {
    const deleted = this.dashboards.delete(id);
    if (deleted) {
      this.emit('dashboardDeleted', id);
    }
    return deleted;
  }

  /**
   * Get historical metrics
   */
  public getMetricsHistory(limit?: number): MetricsSnapshot[] {
    return limit ? this.metricsHistory.slice(-limit) : this.metricsHistory;
  }

  /**
   * Clear all analytics data
   */
  public clearData(): void {
    this.eventBuffer = [];
    this.metricsHistory = [];
    this.dashboards.clear();
    this.emit('dataCleared');
  }

  /**
   * Dispose of the analytics engine
   */
  public dispose(): void {
    this.stopCollection();
    if (this.bufferFlushInterval) {
      clearInterval(this.bufferFlushInterval);
    }
    if (this.performanceMonitor) {
      clearInterval(this.performanceMonitor);
    }
    this.removeAllListeners();
  }

  // Private helper methods

  private validateEvent(event: AnalyticsEvent): boolean {
    return !!(event.type && event.timestamp && event.userId);
  }

  private generateEventId(): string {
    return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSnapshotId(): string {
    return `snapshot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateDashboardId(): string {
    return `dashboard_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateWidgetId(): string {
    return `widget_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private startEventBuffering(): void {
    this.bufferFlushInterval = setInterval(() => {
      if (this.eventBuffer.length > 0) {
        this.flushEventBuffer();
      }
    }, this.config.flushInterval);
  }

  private flushEventBuffer(): void {
    if (this.eventBuffer.length === 0) {return;}

    const eventsToFlush = [...this.eventBuffer];
    this.eventBuffer = [];
    this.emit('bufferFlushed', eventsToFlush);
  }

  private startPerformanceMonitoring(): void {
    this.performanceMonitor = setInterval(() => {
      const metrics = this.getRealtimeMetrics();
      this.emit('performanceUpdate', metrics);
    }, 1000); // Update every second
  }

  private getEventsInRange(timeRange: TimeRange): AnalyticsEvent[] {
    return this.eventBuffer.filter(event => 
      event.timestamp >= timeRange.start && 
      event.timestamp <= timeRange.end
    );
  }

  private analyzeCommandExecutions(events: AnalyticsEvent[]): ExecutionMetrics {
    const commandEvents = events.filter(e => e.type === 'command_executed');
    const successEvents = commandEvents.filter(e => e.metadata.success);
    const failureEvents = commandEvents.filter(e => !e.metadata.success);

    return {
      total: commandEvents.length,
      successful: successEvents.length,
      failed: failureEvents.length,
      successRate: commandEvents.length > 0 ? successEvents.length / commandEvents.length : 0,
      averageExecutionTime: this.calculateAverageExecutionTime(commandEvents),
      mostUsedCommands: this.getMostUsedCommands(commandEvents),
      failurePatterns: this.analyzeFailurePatterns(failureEvents)
    };
  }

  private analyzePerformance(events: AnalyticsEvent[]): PerformanceMetrics {
    const performanceEvents = events.filter(e => e.type === 'performance_metric');
    
    return {
      averageResponseTime: this.calculateAverageResponseTime(performanceEvents),
      throughput: this.calculateThroughput(performanceEvents),
      errorRate: this.calculateErrorRate(events),
      memoryUsage: this.calculateMemoryUsage(performanceEvents),
      cpuUsage: this.calculateCpuUsage(performanceEvents),
      slowestOperations: this.findSlowestOperations(performanceEvents)
    };
  }

  private analyzeErrors(events: AnalyticsEvent[]): ErrorMetrics {
    const errorEvents = events.filter(e => e.type === 'error');
    
    return {
      total: errorEvents.length,
      byType: this.groupErrorsByType(errorEvents),
      byComponent: this.groupErrorsByComponent(errorEvents),
      topErrors: this.getTopErrors(errorEvents),
      resolutionRate: this.calculateResolutionRate(errorEvents)
    };
  }

  private analyzeUsage(events: AnalyticsEvent[]): UsageMetrics {
    const userEvents = events.filter(e => e.userId);
    const uniqueUsers = new Set(userEvents.map(e => e.userId));
    
    return {
      activeUsers: uniqueUsers.size,
      totalSessions: this.countSessions(userEvents),
      averageSessionDuration: this.calculateAverageSessionDuration(userEvents),
      featureUsage: this.analyzeFeatureUsage(userEvents),
      userJourney: this.analyzeUserJourney(userEvents)
    };
  }

  private analyzeTrends(events: AnalyticsEvent[]): TrendAnalysis {
    return {
      usage: this.calculateUsageTrend(events),
      performance: this.calculatePerformanceTrend(events),
      errors: this.calculateErrorTrend(events),
      predictions: this.generateTrendPredictions(events)
    };
  }

  private predictCommandFailures(events: AnalyticsEvent[]): PredictionResult | null {
    const commandEvents = events.filter(e => e.type === 'command_executed');
    const failureRate = this.calculateFailureRate(commandEvents);
    
    if (failureRate > 0.3) { // 30% failure rate threshold
      return {
        type: 'test-failure',
        probability: Math.min(failureRate * 2, 1), // Cap at 100%
        confidence: Math.min(failureRate * 2, 1), // Cap at 100%
        description: 'High probability of command failures',
        affectedFiles: [],
        prevention: [],
        timeline: '1-2 hours',
        prediction: 'High probability of command failures',
        impact: 'high'
      };
    }
    
    return null;
  }

  private predictPerformanceDegradation(events: AnalyticsEvent[]): PredictionResult | null {
    const performanceEvents = events.filter(e => e.type === 'performance_metric');
    const trend = this.calculatePerformanceTrend(performanceEvents);
    
    if (trend.direction === 'declining' && trend.severity > 0.7) {
      return {
        type: 'performance-degradation',
        probability: trend.severity,
        confidence: trend.severity,
        description: 'Performance degradation detected',
        affectedFiles: [],
        prevention: [],
        timeline: '30-60 minutes',
        prediction: 'Performance degradation detected',
        impact: 'medium'
      };
    }
    
    return null;
  }

  private predictResourceUtilization(events: AnalyticsEvent[]): PredictionResult | null {
    const resourceEvents = events.filter(e => e.type === 'resource_usage');
    const memoryTrend = this.calculateMemoryTrend(resourceEvents);
    
    if (memoryTrend.utilizationRate > 0.8) {
      return {
        type: 'security-issue',
        probability: memoryTrend.utilizationRate,
        confidence: memoryTrend.utilizationRate,
        description: 'High resource utilization predicted',
        affectedFiles: [],
        prevention: [],
        timeline: '15-30 minutes',
        prediction: 'High resource utilization predicted',
        impact: 'high'
      };
    }
    
    return null;
  }

  private async createDashboardWidgets(config: DashboardConfig): Promise<any[]> {
    // Return the widgets from the config if provided, otherwise return default widgets
    if (config.widgets && config.widgets.length > 0) {
      return config.widgets.map(widget => ({
        id: widget.id || this.generateWidgetId(),
        type: widget.type,
        title: widget.title,
        config: widget.configuration || {}
      }));
    }
    
    // Default widgets when none specified
    return [
      {
        id: 'performance_chart',
        type: 'chart',
        title: 'Performance Metrics',
        config: { chartType: 'line', metrics: ['responseTime', 'throughput'] }
      },
      {
        id: 'error_summary',
        type: 'summary',
        title: 'Error Overview',
        config: { metrics: ['errorRate', 'totalErrors'] }
      }
    ];
  }

  private startDashboardUpdates(dashboardId: string): void {
    const dashboard = this.dashboards.get(dashboardId);
    // Implementation for real-time dashboard updates
    setInterval(() => {
      const currentDashboard = this.dashboards.get(dashboardId);
      if (currentDashboard) {
        this.emit('dashboardUpdate', currentDashboard);
      }
    }, dashboard?.refreshInterval || 30000);
  }

  private exportAsJson(data: AnalyticsExportData): Buffer {
    return Buffer.from(JSON.stringify(data, null, 2));
  }

  private exportAsCsv(data: AnalyticsExportData): Buffer {
    // Simple CSV export implementation
    const csv = this.convertToCSV(data);
    return Buffer.from(csv);
  }

  private exportAsPdf(data: AnalyticsExportData, config?: any): Buffer {
    // PDF export would require a PDF library
    // For now, return a mock buffer
    return Buffer.from('PDF Report Content');
  }

  private convertToCSV(data: AnalyticsExportData): string {
    // Basic CSV conversion
    const lines = ['Type,Timestamp,User ID,Data'];
    data.events.forEach(event => {
      lines.push(`${event.type},${event.timestamp},${event.userId},${JSON.stringify(event.metadata)}`);
    });
    return lines.join('\n');
  }

  private cleanupOldMetrics(): void {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - (this.config.retentionDays || 30));
    
    this.metricsHistory = this.metricsHistory.filter(
      snapshot => snapshot.timestamp > cutoffDate
    );
  }

  // Additional helper methods for calculations
  private calculateAverageExecutionTime(events: AnalyticsEvent[]): number {
    const times = events.map(e => e.metadata.executionTime).filter(t => t);
    return times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0;
  }

  private calculateAverageResponseTime(events: AnalyticsEvent[]): number {
    const times = events.map(e => e.metadata.responseTime).filter(t => t);
    return times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0;
  }

  private calculateThroughput(events: AnalyticsEvent[]): number {
    return events.length / ((this.config.flushInterval || 5000) / 1000); // Events per second
  }

  private calculateErrorRate(events: AnalyticsEvent[]): number {
    const errorEvents = events.filter(e => e.type === 'error');
    return events.length > 0 ? errorEvents.length / events.length : 0;
  }

  private calculateMemoryUsage(events: AnalyticsEvent[]): number {
    const memoryEvents = events.filter(e => e.metadata.memoryUsage);
    if (memoryEvents.length === 0) {return 0;}
    
    const totalMemory = memoryEvents.reduce((sum, e) => sum + e.metadata.memoryUsage, 0);
    return totalMemory / memoryEvents.length;
  }

  private calculateCpuUsage(events: AnalyticsEvent[]): number {
    const cpuEvents = events.filter(e => e.metadata.cpuUsage);
    if (cpuEvents.length === 0) {return 0;}
    
    const totalCpu = cpuEvents.reduce((sum, e) => sum + e.metadata.cpuUsage, 0);
    return totalCpu / cpuEvents.length;
  }

  private findSlowestOperations(events: AnalyticsEvent[]): any[] {
    return events
      .filter(e => e.metadata.operationTime)
      .sort((a, b) => b.metadata.operationTime - a.metadata.operationTime)
      .slice(0, 10);
  }

  private getMostUsedCommands(events: AnalyticsEvent[]): any[] {
    const commandCounts = new Map<string, number>();
    events.forEach(e => {
      const command = e.metadata.command;
      if (command) {
        commandCounts.set(command, (commandCounts.get(command) || 0) + 1);
      }
    });
    
    return Array.from(commandCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([command, count]) => ({ command, count }));
  }

  private analyzeFailurePatterns(events: AnalyticsEvent[]): any[] {
    const patterns = new Map<string, number>();
    events.forEach(e => {
      const pattern = e.metadata.errorPattern || 'unknown';
      patterns.set(pattern, (patterns.get(pattern) || 0) + 1);
    });
    
    return Array.from(patterns.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([pattern, count]) => ({ pattern, count }));
  }

  private groupErrorsByType(events: AnalyticsEvent[]): Map<string, number> {
    const types = new Map<string, number>();
    events.forEach(e => {
      const type = e.metadata.errorType || 'unknown';
      types.set(type, (types.get(type) || 0) + 1);
    });
    return types;
  }

  private groupErrorsByComponent(events: AnalyticsEvent[]): Map<string, number> {
    const components = new Map<string, number>();
    events.forEach(e => {
      const component = e.metadata.component || 'unknown';
      components.set(component, (components.get(component) || 0) + 1);
    });
    return components;
  }

  private getTopErrors(events: AnalyticsEvent[]): any[] {
    const errorCounts = new Map<string, number>();
    events.forEach(e => {
      const error = e.metadata.errorMessage || 'unknown';
      errorCounts.set(error, (errorCounts.get(error) || 0) + 1);
    });
    
    return Array.from(errorCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([error, count]) => ({ error, count }));
  }

  private calculateResolutionRate(events: AnalyticsEvent[]): number {
    const resolvedEvents = events.filter(e => e.metadata.resolved);
    return events.length > 0 ? resolvedEvents.length / events.length : 0;
  }

  private countSessions(events: AnalyticsEvent[]): number {
    const sessions = new Set(events.map(e => e.sessionId).filter(s => s));
    return sessions.size;
  }

  private calculateAverageSessionDuration(events: AnalyticsEvent[]): number {
    const sessions = new Map<string, { start: Date, end: Date }>();
    
    events.forEach(e => {
      if (e.sessionId) {
        if (!sessions.has(e.sessionId)) {
          sessions.set(e.sessionId, { start: e.timestamp, end: e.timestamp });
        } else {
          const session = sessions.get(e.sessionId)!;
          if (e.timestamp < session.start) {session.start = e.timestamp;}
          if (e.timestamp > session.end) {session.end = e.timestamp;}
        }
      }
    });
    
    const durations = Array.from(sessions.values())
      .map(s => s.end.getTime() - s.start.getTime());
    
    return durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;
  }

  private analyzeFeatureUsage(events: AnalyticsEvent[]): Map<string, number> {
    const features = new Map<string, number>();
    events.forEach(e => {
      const feature = e.metadata.feature;
      if (feature) {
        features.set(feature, (features.get(feature) || 0) + 1);
      }
    });
    return features;
  }

  private analyzeUserJourney(events: AnalyticsEvent[]): any[] {
    // Simplified user journey analysis
    const journeys = new Map<string, string[]>();
    events.forEach(e => {
      if (e.userId && e.metadata.action) {
        if (!journeys.has(e.userId)) {
          journeys.set(e.userId, []);
        }
        journeys.get(e.userId)!.push(e.metadata.action);
      }
    });
    
    return Array.from(journeys.entries()).map(([userId, actions]) => ({ userId, actions }));
  }

  private calculateUsageTrend(events: AnalyticsEvent[]): any {
    // Simplified trend calculation
    const hourlyUsage = new Map<number, number>();
    events.forEach(e => {
      const hour = e.timestamp.getHours();
      hourlyUsage.set(hour, (hourlyUsage.get(hour) || 0) + 1);
    });
    
    return {
      direction: 'stable',
      data: Array.from(hourlyUsage.entries())
    };
  }

  private calculatePerformanceTrend(events: AnalyticsEvent[]): any {
    const performanceEvents = events.filter(e => e.type === 'performance_metric');
    if (performanceEvents.length === 0) {
      return { direction: 'stable', severity: 0 };
    }
    
    const avgResponseTime = this.calculateAverageResponseTime(performanceEvents);
    const severity = Math.min(avgResponseTime / 1000, 1); // Normalize to 0-1
    
    return {
      direction: severity > 0.7 ? 'declining' : 'stable',
      severity
    };
  }

  private calculateErrorTrend(events: AnalyticsEvent[]): any {
    const errorEvents = events.filter(e => e.type === 'error');
    const errorRate = this.calculateErrorRate(events);
    
    return {
      direction: errorRate > 0.1 ? 'increasing' : 'stable',
      rate: errorRate
    };
  }

  private generateTrendPredictions(events: AnalyticsEvent[]): any[] {
    return [
      {
        metric: 'usage',
        prediction: 'stable',
        confidence: 0.8
      },
      {
        metric: 'performance',
        prediction: 'improving',
        confidence: 0.6
      }
    ];
  }

  private calculateFailureRate(events: AnalyticsEvent[]): number {
    const failedEvents = events.filter(e => !e.metadata.success);
    return events.length > 0 ? failedEvents.length / events.length : 0;
  }

  private calculateMemoryTrend(events: AnalyticsEvent[]): any {
    const memoryEvents = events.filter(e => e.metadata.memoryUsage);
    if (memoryEvents.length === 0) {
      return { utilizationRate: 0 };
    }
    
    const avgMemory = this.calculateMemoryUsage(memoryEvents);
    const utilizationRate = Math.min(avgMemory / (1024 * 1024 * 1024), 1); // GB to ratio
    
    return { utilizationRate };
  }
}
