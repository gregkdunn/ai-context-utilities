import { EventEmitter } from 'events';
import { performance } from 'perf_hooks';
import { 
    PerformanceMetric, 
    SystemMetrics, 
    MetricValue, 
    MetricAggregation,
    AggregationPeriod,
    TimeRange
} from '../../types';

export interface MonitoringConfig {
    metricsInterval: number;
    retentionPeriod: number;
    aggregationPeriods: AggregationPeriod[];
    enableSystemMetrics: boolean;
    enableApplicationMetrics: boolean;
    enableNetworkMetrics: boolean;
    enableErrorTracking: boolean;
    alertThresholds: AlertThreshold[];
    dashboardConfig: DashboardConfig;
}

export interface AlertThreshold {
    id: string;
    name: string;
    metric: string;
    operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
    value: number;
    severity: 'info' | 'warning' | 'error' | 'critical';
    enabled: boolean;
    cooldown: number;
    conditions: AlertCondition[];
}

export interface AlertCondition {
    metric: string;
    operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
    value: number;
    duration: number;
}

export interface DashboardConfig {
    refreshInterval: number;
    maxDataPoints: number;
    defaultTimeRange: TimeRange;
    widgets: DashboardWidget[];
}

export interface DashboardWidget {
    id: string;
    type: 'chart' | 'gauge' | 'table' | 'text' | 'alert';
    title: string;
    metrics: string[];
    position: { x: number; y: number; width: number; height: number };
    config: Record<string, any>;
}

export interface MonitoringAlert {
    id: string;
    thresholdId: string;
    metric: string;
    value: number;
    threshold: number;
    severity: 'info' | 'warning' | 'error' | 'critical';
    message: string;
    timestamp: Date;
    acknowledged: boolean;
    resolvedAt?: Date;
    metadata: Record<string, any>;
}

export interface MetricStream {
    id: string;
    name: string;
    description: string;
    collect: () => Promise<MetricValue[]>;
    interval: number;
    enabled: boolean;
    tags: Record<string, string>;
    lastCollected?: Date;
    errorCount: number;
}

export interface MonitoringDashboard {
    id: string;
    name: string;
    description: string;
    widgets: DashboardWidget[];
    layout: 'grid' | 'flex';
    refreshInterval: number;
    timeRange: TimeRange;
    filters: Record<string, any>;
    isPublic: boolean;
    createdAt: Date;
    updatedAt: Date;
}

class RealTimeMonitoringSystem extends EventEmitter {
    private config: MonitoringConfig;
    private streams: Map<string, MetricStream> = new Map();
    private metrics: Map<string, MetricValue[]> = new Map();
    private aggregations: Map<string, MetricAggregation[]> = new Map();
    private alerts: Map<string, MonitoringAlert> = new Map();
    private dashboards: Map<string, MonitoringDashboard> = new Map();
    private isMonitoring = false;
    private monitoringInterval?: NodeJS.Timeout;
    private aggregationInterval?: NodeJS.Timeout;
    private alertCooldowns: Map<string, number> = new Map();

    constructor(config: MonitoringConfig) {
        super();
        this.config = config;
        this.initializeDefaultStreams();
        this.initializeDefaultDashboard();
    }

    private initializeDefaultStreams(): void {
        // System metrics stream
        this.registerStream({
            id: 'system-metrics',
            name: 'System Metrics',
            description: 'Basic system resource monitoring',
            collect: async () => this.collectSystemMetrics(),
            interval: 5000, // 5 seconds
            enabled: this.config.enableSystemMetrics,
            tags: { type: 'system' },
            errorCount: 0
        });

        // Application metrics stream
        this.registerStream({
            id: 'application-metrics',
            name: 'Application Metrics',
            description: 'Application-specific performance metrics',
            collect: async () => this.collectApplicationMetrics(),
            interval: 10000, // 10 seconds
            enabled: this.config.enableApplicationMetrics,
            tags: { type: 'application' },
            errorCount: 0
        });

        // Network metrics stream
        this.registerStream({
            id: 'network-metrics',
            name: 'Network Metrics',
            description: 'Network connectivity and throughput metrics',
            collect: async () => this.collectNetworkMetrics(),
            interval: 15000, // 15 seconds
            enabled: this.config.enableNetworkMetrics,
            tags: { type: 'network' },
            errorCount: 0
        });

        // Error tracking stream
        this.registerStream({
            id: 'error-tracking',
            name: 'Error Tracking',
            description: 'Application error and exception tracking',
            collect: async () => this.collectErrorMetrics(),
            interval: 30000, // 30 seconds
            enabled: this.config.enableErrorTracking,
            tags: { type: 'error' },
            errorCount: 0
        });
    }

    private initializeDefaultDashboard(): void {
        const defaultDashboard: MonitoringDashboard = {
            id: 'default-dashboard',
            name: 'System Overview',
            description: 'Default monitoring dashboard',
            widgets: [
                {
                    id: 'cpu-usage',
                    type: 'gauge',
                    title: 'CPU Usage',
                    metrics: ['system.cpu.usage'],
                    position: { x: 0, y: 0, width: 6, height: 4 },
                    config: { min: 0, max: 100, unit: '%' }
                },
                {
                    id: 'memory-usage',
                    type: 'gauge',
                    title: 'Memory Usage',
                    metrics: ['system.memory.usage'],
                    position: { x: 6, y: 0, width: 6, height: 4 },
                    config: { min: 0, max: 100, unit: '%' }
                },
                {
                    id: 'response-time',
                    type: 'chart',
                    title: 'Response Time',
                    metrics: ['application.response.time'],
                    position: { x: 0, y: 4, width: 12, height: 6 },
                    config: { chartType: 'line', unit: 'ms' }
                },
                {
                    id: 'error-rate',
                    type: 'chart',
                    title: 'Error Rate',
                    metrics: ['application.error.rate'],
                    position: { x: 0, y: 10, width: 12, height: 4 },
                    config: { chartType: 'area', unit: 'errors/min' }
                }
            ],
            layout: 'grid',
            refreshInterval: 5000,
            timeRange: { start: new Date(Date.now() - 3600000), end: new Date() }, // Last hour
            filters: {},
            isPublic: true,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        this.dashboards.set(defaultDashboard.id, defaultDashboard);
    }

    public registerStream(stream: MetricStream): void {
        this.streams.set(stream.id, stream);
        this.metrics.set(stream.id, []);
        this.emit('streamRegistered', { streamId: stream.id, name: stream.name });
    }

    public async startMonitoring(): Promise<void> {
        if (this.isMonitoring) {
            return;
        }

        this.isMonitoring = true;
        this.emit('monitoringStarted');

        // Start metric collection
        this.monitoringInterval = setInterval(async () => {
            await this.collectAllMetrics();
        }, this.config.metricsInterval);

        // Start aggregation
        this.aggregationInterval = setInterval(async () => {
            await this.aggregateMetrics();
        }, 60000); // Every minute

        // Initial collection
        await this.collectAllMetrics();
    }

    public stopMonitoring(): void {
        if (!this.isMonitoring) {
            return;
        }

        this.isMonitoring = false;
        
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = undefined;
        }

        if (this.aggregationInterval) {
            clearInterval(this.aggregationInterval);
            this.aggregationInterval = undefined;
        }

        this.emit('monitoringStopped');
    }

    private async collectAllMetrics(): Promise<void> {
        const collectionPromises = Array.from(this.streams.values())
            .filter(stream => stream.enabled)
            .map(stream => this.collectStreamMetrics(stream));

        await Promise.allSettled(collectionPromises);
    }

    private async collectStreamMetrics(stream: MetricStream): Promise<void> {
        try {
            const metrics = await stream.collect();
            const existingMetrics = this.metrics.get(stream.id) || [];
            
            // Add new metrics
            existingMetrics.push(...metrics);
            
            // Apply retention policy
            const retentionCutoff = Date.now() - this.config.retentionPeriod;
            const filteredMetrics = existingMetrics.filter(m => 
                m.timestamp.getTime() > retentionCutoff
            );
            
            this.metrics.set(stream.id, filteredMetrics);
            stream.lastCollected = new Date();
            stream.errorCount = 0;

            // Emit metrics for real-time updates
            this.emit('metricsCollected', { streamId: stream.id, metrics });

            // Check alerts
            await this.checkAlerts(metrics);

        } catch (error) {
            stream.errorCount++;
            this.emit('streamError', { streamId: stream.id, error: (error as Error).message });
        }
    }

    private async collectSystemMetrics(): Promise<MetricValue[]> {
        const metrics: MetricValue[] = [];
        const timestamp = new Date();
        const memoryUsage = process.memoryUsage();
        const cpuUsage = process.cpuUsage();
        
        // Memory metrics
        metrics.push({
            name: 'system.memory.total',
            value: memoryUsage.heapTotal,
            timestamp,
            tags: { type: 'memory' },
            unit: 'bytes',
            type: 'gauge'
        });

        metrics.push({
            name: 'system.memory.used',
            value: memoryUsage.heapUsed,
            timestamp,
            tags: { type: 'memory' },
            unit: 'bytes',
            type: 'gauge'
        });

        metrics.push({
            name: 'system.memory.usage',
            value: (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100,
            timestamp,
            tags: { type: 'memory' },
            unit: 'percentage',
            type: 'gauge'
        });

        // CPU metrics (simplified - in real implementation would use OS modules)
        metrics.push({
            name: 'system.cpu.user',
            value: cpuUsage.user / 1000, // Convert to milliseconds
            timestamp,
            tags: { type: 'cpu' },
            unit: 'milliseconds',
            type: 'counter'
        });

        metrics.push({
            name: 'system.cpu.system',
            value: cpuUsage.system / 1000,
            timestamp,
            tags: { type: 'cpu' },
            unit: 'milliseconds',
            type: 'counter'
        });

        // Simulated CPU usage percentage
        metrics.push({
            name: 'system.cpu.usage',
            value: Math.random() * 100,
            timestamp,
            tags: { type: 'cpu' },
            unit: 'percentage',
            type: 'gauge'
        });

        return metrics;
    }

    private async collectApplicationMetrics(): Promise<MetricValue[]> {
        const metrics: MetricValue[] = [];
        const timestamp = new Date();

        // Simulated application metrics
        metrics.push({
            name: 'application.response.time',
            value: Math.random() * 1000 + 100, // 100-1100ms
            timestamp,
            tags: { type: 'performance' },
            unit: 'milliseconds',
            type: 'gauge'
        });

        metrics.push({
            name: 'application.throughput',
            value: Math.random() * 1000 + 500, // 500-1500 requests/sec
            timestamp,
            tags: { type: 'performance' },
            unit: 'requests_per_second',
            type: 'gauge'
        });

        metrics.push({
            name: 'application.active.connections',
            value: Math.floor(Math.random() * 100) + 10, // 10-110 connections
            timestamp,
            tags: { type: 'connection' },
            unit: 'count',
            type: 'gauge'
        });

        return metrics;
    }

    private async collectNetworkMetrics(): Promise<MetricValue[]> {
        const metrics: MetricValue[] = [];
        const timestamp = new Date();

        // Simulated network metrics
        metrics.push({
            name: 'network.bytes.sent',
            value: Math.random() * 1024 * 1024, // 0-1MB
            timestamp,
            tags: { type: 'network' },
            unit: 'bytes',
            type: 'counter'
        });

        metrics.push({
            name: 'network.bytes.received',
            value: Math.random() * 1024 * 1024, // 0-1MB
            timestamp,
            tags: { type: 'network' },
            unit: 'bytes',
            type: 'counter'
        });

        metrics.push({
            name: 'network.latency',
            value: Math.random() * 100 + 10, // 10-110ms
            timestamp,
            tags: { type: 'network' },
            unit: 'milliseconds',
            type: 'gauge'
        });

        return metrics;
    }

    private async collectErrorMetrics(): Promise<MetricValue[]> {
        const metrics: MetricValue[] = [];
        const timestamp = new Date();

        // Simulated error metrics
        metrics.push({
            name: 'application.error.rate',
            value: Math.random() * 10, // 0-10 errors/min
            timestamp,
            tags: { type: 'error' },
            unit: 'errors_per_minute',
            type: 'gauge'
        });

        metrics.push({
            name: 'application.error.count',
            value: Math.floor(Math.random() * 5), // 0-5 errors
            timestamp,
            tags: { type: 'error' },
            unit: 'count',
            type: 'counter'
        });

        return metrics;
    }

    private async aggregateMetrics(): Promise<void> {
        const now = new Date();
        
        for (const period of this.config.aggregationPeriods) {
            const periodMs = this.getPeriodMilliseconds(period);
            const startTime = new Date(now.getTime() - periodMs);

            for (const [streamId, metrics] of this.metrics.entries()) {
                const periodMetrics = metrics.filter(m => 
                    m.timestamp >= startTime && m.timestamp <= now
                );

                if (periodMetrics.length === 0) {continue;}

                const aggregations = this.calculateAggregations(periodMetrics, period, now);
                
                const existingAggregations = this.aggregations.get(`${streamId}_${period}`) || [];
                existingAggregations.push(...aggregations);

                // Keep only recent aggregations
                const retentionCutoff = now.getTime() - (this.config.retentionPeriod * 2);
                const filteredAggregations = existingAggregations.filter(a => 
                    a.timestamp.getTime() > retentionCutoff
                );

                this.aggregations.set(`${streamId}_${period}`, filteredAggregations);
            }
        }

        this.emit('metricsAggregated', { timestamp: now });
    }

    private calculateAggregations(metrics: MetricValue[], period: AggregationPeriod, timestamp: Date): MetricAggregation[] {
        const aggregationMap = new Map<string, MetricValue[]>();

        // Group metrics by name
        metrics.forEach(metric => {
            const key = metric.name;
            if (!aggregationMap.has(key)) {
                aggregationMap.set(key, []);
            }
            aggregationMap.get(key)!.push(metric);
        });

        const aggregations: MetricAggregation[] = [];

        // Calculate aggregations for each metric
        aggregationMap.forEach((metricValues, metricName) => {
            const values = metricValues.map(m => m.value);
            values.sort((a, b) => a - b);

            const aggregation: MetricAggregation = {
                metricName,
                period,
                timestamp,
                count: values.length,
                sum: values.reduce((sum, val) => sum + val, 0),
                avg: values.reduce((sum, val) => sum + val, 0) / values.length,
                min: Math.min(...values),
                max: Math.max(...values),
                p50: this.calculatePercentile(values, 0.5),
                p90: this.calculatePercentile(values, 0.9),
                p95: this.calculatePercentile(values, 0.95),
                p99: this.calculatePercentile(values, 0.99)
            };

            aggregations.push(aggregation);
        });

        return aggregations;
    }

    private calculatePercentile(sortedValues: number[], percentile: number): number {
        const index = Math.ceil(sortedValues.length * percentile) - 1;
        return sortedValues[Math.max(0, index)];
    }

    private getPeriodMilliseconds(period: AggregationPeriod): number {
        switch (period) {
            case '1m': return 60 * 1000;
            case '5m': return 5 * 60 * 1000;
            case '1h': return 60 * 60 * 1000;
            case '1d': return 24 * 60 * 60 * 1000;
            default: return 60 * 1000;
        }
    }

    private async checkAlerts(metrics: MetricValue[]): Promise<void> {
        for (const threshold of this.config.alertThresholds) {
            if (!threshold.enabled) {continue;}

            // Check cooldown
            const lastAlert = this.alertCooldowns.get(threshold.id);
            if (lastAlert && (Date.now() - lastAlert) < threshold.cooldown) {
                continue;
            }

            const relevantMetrics = metrics.filter(m => m.name === threshold.metric);
            
            for (const metric of relevantMetrics) {
                const triggered = this.evaluateThreshold(metric.value, threshold);
                
                if (triggered) {
                    const alert = await this.createAlert(threshold, metric);
                    this.alerts.set(alert.id, alert);
                    this.alertCooldowns.set(threshold.id, Date.now());
                    
                    this.emit('alertTriggered', { alert });
                    break; // Only trigger one alert per threshold per cycle
                }
            }
        }
    }

    private evaluateThreshold(value: number, threshold: AlertThreshold): boolean {
        switch (threshold.operator) {
            case 'gt': return value > threshold.value;
            case 'lt': return value < threshold.value;
            case 'eq': return value === threshold.value;
            case 'gte': return value >= threshold.value;
            case 'lte': return value <= threshold.value;
            default: return false;
        }
    }

    private async createAlert(threshold: AlertThreshold, metric: MetricValue): Promise<MonitoringAlert> {
        return {
            id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            thresholdId: threshold.id,
            metric: metric.name,
            value: metric.value,
            threshold: threshold.value,
            severity: threshold.severity,
            message: `${threshold.name}: ${metric.name} is ${metric.value} (threshold: ${threshold.value})`,
            timestamp: new Date(),
            acknowledged: false,
            metadata: {
                streamId: metric.tags.type,
                unit: metric.unit,
                tags: metric.tags
            }
        };
    }

    public acknowledgeAlert(alertId: string): void {
        const alert = this.alerts.get(alertId);
        if (alert) {
            alert.acknowledged = true;
            this.emit('alertAcknowledged', { alertId });
        }
    }

    public resolveAlert(alertId: string): void {
        const alert = this.alerts.get(alertId);
        if (alert) {
            alert.resolvedAt = new Date();
            this.emit('alertResolved', { alertId });
        }
    }

    public getMetrics(streamId: string, timeRange?: TimeRange): MetricValue[] {
        const metrics = this.metrics.get(streamId) || [];
        
        if (!timeRange) {
            return metrics;
        }

        return metrics.filter(m => 
            m.timestamp >= timeRange.start && m.timestamp <= timeRange.end
        );
    }

    public getAggregations(streamId: string, period: AggregationPeriod, timeRange?: TimeRange): MetricAggregation[] {
        const aggregations = this.aggregations.get(`${streamId}_${period}`) || [];
        
        if (!timeRange) {
            return aggregations;
        }

        return aggregations.filter(a => 
            a.timestamp >= timeRange.start && a.timestamp <= timeRange.end
        );
    }

    public getAlerts(severity?: string): MonitoringAlert[] {
        const alerts = Array.from(this.alerts.values());
        
        if (!severity) {
            return alerts;
        }

        return alerts.filter(a => a.severity === severity);
    }

    public getActiveAlerts(): MonitoringAlert[] {
        return Array.from(this.alerts.values()).filter(a => !a.resolvedAt);
    }

    public createDashboard(dashboard: Omit<MonitoringDashboard, 'id' | 'createdAt' | 'updatedAt'>): MonitoringDashboard {
        const newDashboard: MonitoringDashboard = {
            ...dashboard,
            id: `dashboard_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        this.dashboards.set(newDashboard.id, newDashboard);
        this.emit('dashboardCreated', { dashboardId: newDashboard.id });
        
        return newDashboard;
    }

    public updateDashboard(dashboardId: string, updates: Partial<MonitoringDashboard>): MonitoringDashboard | null {
        const dashboard = this.dashboards.get(dashboardId);
        if (!dashboard) {
            return null;
        }

        const updatedDashboard = {
            ...dashboard,
            ...updates,
            updatedAt: new Date()
        };

        this.dashboards.set(dashboardId, updatedDashboard);
        this.emit('dashboardUpdated', { dashboardId });
        
        return updatedDashboard;
    }

    public getDashboard(dashboardId: string): MonitoringDashboard | null {
        return this.dashboards.get(dashboardId) || null;
    }

    public getDashboards(): MonitoringDashboard[] {
        return Array.from(this.dashboards.values());
    }

    public deleteDashboard(dashboardId: string): boolean {
        const deleted = this.dashboards.delete(dashboardId);
        if (deleted) {
            this.emit('dashboardDeleted', { dashboardId });
        }
        return deleted;
    }

    public generateReport(timeRange: TimeRange): MonitoringReport {
        const streams = Array.from(this.streams.values());
        const alerts = this.getAlerts();
        const activeAlerts = this.getActiveAlerts();

        const report: MonitoringReport = {
            timestamp: new Date(),
            timeRange,
            summary: {
                totalStreams: streams.length,
                activeStreams: streams.filter(s => s.enabled).length,
                totalAlerts: alerts.length,
                activeAlerts: activeAlerts.length,
                criticalAlerts: alerts.filter(a => a.severity === 'critical').length,
                systemHealth: this.calculateSystemHealth()
            },
            streams: streams.map(s => ({
                id: s.id,
                name: s.name,
                enabled: s.enabled,
                lastCollected: s.lastCollected,
                errorCount: s.errorCount,
                metricCount: this.metrics.get(s.id)?.length || 0
            })),
            alerts: alerts.map(a => ({
                id: a.id,
                severity: a.severity,
                message: a.message,
                timestamp: a.timestamp,
                acknowledged: a.acknowledged,
                resolved: !!a.resolvedAt
            })),
            performance: {
                avgResponseTime: this.calculateAverageMetric('application.response.time', timeRange),
                avgCpuUsage: this.calculateAverageMetric('system.cpu.usage', timeRange),
                avgMemoryUsage: this.calculateAverageMetric('system.memory.usage', timeRange),
                errorRate: this.calculateAverageMetric('application.error.rate', timeRange)
            }
        };

        return report;
    }

    private calculateSystemHealth(): 'healthy' | 'warning' | 'critical' {
        const activeAlerts = this.getActiveAlerts();
        const criticalAlerts = activeAlerts.filter(a => a.severity === 'critical');
        const warningAlerts = activeAlerts.filter(a => a.severity === 'warning' || a.severity === 'error');

        if (criticalAlerts.length > 0) {return 'critical';}
        if (warningAlerts.length > 2) {return 'warning';}
        return 'healthy';
    }

    private calculateAverageMetric(metricName: string, timeRange: TimeRange): number {
        let totalValue = 0;
        let count = 0;

        for (const metrics of this.metrics.values()) {
            const relevantMetrics = metrics.filter(m => 
                m.name === metricName && 
                m.timestamp >= timeRange.start && 
                m.timestamp <= timeRange.end
            );

            relevantMetrics.forEach(m => {
                totalValue += m.value;
                count++;
            });
        }

        return count > 0 ? totalValue / count : 0;
    }

    public dispose(): void {
        this.stopMonitoring();
        this.streams.clear();
        this.metrics.clear();
        this.aggregations.clear();
        this.alerts.clear();
        this.dashboards.clear();
        this.alertCooldowns.clear();
        this.removeAllListeners();
    }
}

// Report interfaces
export interface MonitoringReport {
    timestamp: Date;
    timeRange: TimeRange;
    summary: {
        totalStreams: number;
        activeStreams: number;
        totalAlerts: number;
        activeAlerts: number;
        criticalAlerts: number;
        systemHealth: 'healthy' | 'warning' | 'critical';
    };
    streams: Array<{
        id: string;
        name: string;
        enabled: boolean;
        lastCollected?: Date;
        errorCount: number;
        metricCount: number;
    }>;
    alerts: Array<{
        id: string;
        severity: string;
        message: string;
        timestamp: Date;
        acknowledged: boolean;
        resolved: boolean;
    }>;
    performance: {
        avgResponseTime: number;
        avgCpuUsage: number;
        avgMemoryUsage: number;
        errorRate: number;
    };
}

export { RealTimeMonitoringSystem };
