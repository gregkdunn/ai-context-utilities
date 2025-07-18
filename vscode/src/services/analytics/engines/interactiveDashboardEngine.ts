import { EventEmitter } from 'events';
import { 
  Dashboard, 
  DashboardConfig, 
  DashboardWidget, 
  WidgetConfig, 
  ChartConfiguration, 
  DashboardFilter, 
  DashboardLayout,
  WidgetData,
  DashboardTheme,
  RealTimeUpdate,
  DashboardExport,
  WidgetType,
  DashboardPermission
} from '../../../types';

/**
 * Interactive Dashboard Engine for Phase 4.4
 * 
 * Advanced dashboard creation and management system with:
 * - Dynamic widget creation and configuration
 * - Real-time data updates and visualization
 * - Interactive filtering and drill-down capabilities
 * - Custom themes and responsive layouts
 * - Export and sharing functionality
 * - Performance optimization for large datasets
 */
export class InteractiveDashboardEngine extends EventEmitter {
  private dashboards: Map<string, Dashboard> = new Map();
  private widgets: Map<string, DashboardWidget> = new Map();
  private themes: Map<string, DashboardTheme> = new Map();
  private updateIntervals: Map<string, NodeJS.Timeout> = new Map();
  private widgetDataCache: Map<string, WidgetData> = new Map();
  private permissions: Map<string, DashboardPermission> = new Map();

  constructor() {
    super();
    this.initializeEngine();
  }

  /**
   * Initialize the dashboard engine
   */
  private initializeEngine(): void {
    this.setupDefaultThemes();
    this.setupDefaultWidgetTypes();
    this.emit('engineInitialized');
  }

  /**
   * Create a new dashboard
   */
  public async createDashboard(config: DashboardConfig): Promise<Dashboard> {
    const dashboard: Dashboard = {
      id: config.id || this.generateDashboardId(),
      name: config.name,
      description: config.description,
      layout: config.layout || this.createDefaultLayout(),
      widgets: [],
      filters: config.filters || [],
      theme: config.theme || 'default',
      refreshInterval: config.refreshInterval || 30000,
      isRealTime: config.isRealTime || false,
      permissions: config.permissions || { read: ['*'], write: ['admin'] },
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: config.createdBy || 'system',
      tags: config.tags || [],
      isPublic: config.isPublic || false
    };

    // Create widgets if provided
    if (config.widgets) {
      for (const widgetConfig of config.widgets) {
        const widget = await this.createWidget(widgetConfig);
        dashboard.widgets.push(widget);
      }
    }

    this.dashboards.set(dashboard.id, dashboard);
    
    // Set up real-time updates if enabled
    if (dashboard.isRealTime) {
      this.setupRealTimeUpdates(dashboard.id);
    }

    this.emit('dashboardCreated', dashboard);
    return dashboard;
  }

  /**
   * Update an existing dashboard
   */
  public async updateDashboard(
    dashboardId: string, 
    updates: Partial<DashboardConfig>
  ): Promise<Dashboard> {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) {
      throw new Error(`Dashboard not found: ${dashboardId}`);
    }

    // Apply updates
    Object.assign(dashboard, updates, { updatedAt: new Date() });

    // Update real-time settings if changed
    if (updates.isRealTime !== undefined) {
      if (updates.isRealTime) {
        this.setupRealTimeUpdates(dashboardId);
      } else {
        this.stopRealTimeUpdates(dashboardId);
      }
    }

    this.dashboards.set(dashboardId, dashboard);
    this.emit('dashboardUpdated', dashboard);
    return dashboard;
  }

  /**
   * Delete a dashboard
   */
  public deleteDashboard(dashboardId: string): boolean {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) {
      return false;
    }

    // Clean up widgets
    dashboard.widgets.forEach((widget: any) => {
      this.widgets.delete(widget.id);
      this.widgetDataCache.delete(widget.id);
    });

    // Stop real-time updates
    this.stopRealTimeUpdates(dashboardId);

    this.dashboards.delete(dashboardId);
    this.emit('dashboardDeleted', dashboardId);
    return true;
  }

  /**
   * Get a dashboard by ID
   */
  public getDashboard(dashboardId: string): Dashboard | undefined {
    return this.dashboards.get(dashboardId);
  }

  /**
   * List all dashboards
   */
  public listDashboards(userId?: string): Dashboard[] {
    const dashboards = Array.from(this.dashboards.values());
    
    if (userId) {
      return dashboards.filter(d => this.hasPermission(d, userId, 'read'));
    }
    
    return dashboards;
  }

  /**
   * Create a new widget
   */
  public async createWidget(config: WidgetConfig): Promise<DashboardWidget> {
    const widget: DashboardWidget = {
      id: config.id || this.generateWidgetId(),
      type: config.type,
      title: config.title,
      description: config.description,
      position: config.position || { x: 0, y: 0, width: 4, height: 4 },
      configuration: config.configuration || {},
      dataSource: config.dataSource,
      filters: config.filters || [],
      refreshInterval: config.refreshInterval || 30000,
      isVisible: config.isVisible !== false,
      createdAt: new Date(),
      updatedAt: new Date(),
      style: config.style || {},
      interactions: config.interactions || {}
    };

    this.widgets.set(widget.id, widget);
    
    // Initialize widget data
    await this.refreshWidgetData(widget.id);
    
    this.emit('widgetCreated', widget);
    return widget;
  }

  /**
   * Update a widget
   */
  public async updateWidget(
    widgetId: string, 
    updates: Partial<WidgetConfig>
  ): Promise<DashboardWidget> {
    const widget = this.widgets.get(widgetId);
    if (!widget) {
      throw new Error(`Widget not found: ${widgetId}`);
    }

    Object.assign(widget, updates, { updatedAt: new Date() });
    
    // Refresh data if configuration changed
    if (updates.configuration || updates.dataSource || updates.filters) {
      await this.refreshWidgetData(widgetId);
    }

    this.widgets.set(widgetId, widget);
    this.emit('widgetUpdated', widget);
    return widget;
  }

  /**
   * Delete a widget
   */
  public deleteWidget(widgetId: string): boolean {
    const widget = this.widgets.get(widgetId);
    if (!widget) {
      return false;
    }

    this.widgets.delete(widgetId);
    this.widgetDataCache.delete(widgetId);
    this.emit('widgetDeleted', widgetId);
    return true;
  }

  /**
   * Get widget data
   */
  public getWidgetData(widgetId: string): WidgetData | undefined {
    return this.widgetDataCache.get(widgetId);
  }

  /**
   * Refresh widget data
   */
  public async refreshWidgetData(widgetId: string): Promise<WidgetData> {
    const widget = this.widgets.get(widgetId);
    if (!widget) {
      throw new Error(`Widget not found: ${widgetId}`);
    }

    const data = await this.fetchWidgetData(widget);
    this.widgetDataCache.set(widgetId, data);
    
    this.emit('widgetDataRefreshed', { widgetId, data });
    return data;
  }

  /**
   * Apply filters to a dashboard
   */
  public applyFilters(dashboardId: string, filters: DashboardFilter[]): void {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) {
      throw new Error(`Dashboard not found: ${dashboardId}`);
    }

    dashboard.filters = filters;
    dashboard.updatedAt = new Date();

    // Refresh all widgets with new filters
    dashboard.widgets.forEach((widget: any) => {
      this.refreshWidgetData(widget.id);
    });

    this.emit('filtersApplied', { dashboardId, filters });
  }

  /**
   * Export dashboard
   */
  public async exportDashboard(
    dashboardId: string, 
    format: 'json' | 'pdf' | 'png' | 'svg' = 'json'
  ): Promise<DashboardExport> {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) {
      throw new Error(`Dashboard not found: ${dashboardId}`);
    }

    const exportData: DashboardExport = {
      dashboard,
      format,
      exportedAt: new Date(),
      data: await this.prepareExportData(dashboard, format)
    };

    this.emit('dashboardExported', exportData);
    return exportData;
  }

  /**
   * Clone a dashboard
   */
  public async cloneDashboard(
    dashboardId: string, 
    newName: string, 
    userId?: string
  ): Promise<Dashboard> {
    const original = this.dashboards.get(dashboardId);
    if (!original) {
      throw new Error(`Dashboard not found: ${dashboardId}`);
    }

    const cloneConfig: DashboardConfig = {
      name: newName,
      description: `Clone of ${original.name}`,
      layout: { ...original.layout },
      widgets: original.widgets.map((w: any) => ({ ...w })),
      filters: [...original.filters],
      theme: original.theme,
      refreshInterval: original.refreshInterval,
      isRealTime: original.isRealTime,
      createdBy: userId || 'system',
      tags: [...(original.tags || []), 'clone']
    };

    return this.createDashboard(cloneConfig);
  }

  /**
   * Get dashboard themes
   */
  public getThemes(): DashboardTheme[] {
    return Array.from(this.themes.values());
  }

  /**
   * Create a custom theme
   */
  public createTheme(theme: DashboardTheme): void {
    this.themes.set(theme.id, theme);
    this.emit('themeCreated', theme);
  }

  /**
   * Get widget types
   */
  public getWidgetTypes(): WidgetType[] {
    return [
      { id: 'line-chart', name: 'Line Chart', category: 'charts' },
      { id: 'bar-chart', name: 'Bar Chart', category: 'charts' },
      { id: 'pie-chart', name: 'Pie Chart', category: 'charts' },
      { id: 'scatter-plot', name: 'Scatter Plot', category: 'charts' },
      { id: 'heatmap', name: 'Heatmap', category: 'charts' },
      { id: 'metric-card', name: 'Metric Card', category: 'metrics' },
      { id: 'gauge', name: 'Gauge', category: 'metrics' },
      { id: 'table', name: 'Table', category: 'data' },
      { id: 'list', name: 'List', category: 'data' },
      { id: 'text', name: 'Text', category: 'content' },
      { id: 'image', name: 'Image', category: 'content' },
      { id: 'iframe', name: 'iFrame', category: 'content' }
    ];
  }

  /**
   * Get dashboard analytics
   */
  public getDashboardAnalytics(dashboardId: string): any {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) {
      throw new Error(`Dashboard not found: ${dashboardId}`);
    }

    return {
      views: this.getDashboardViews(dashboardId),
      interactions: this.getDashboardInteractions(dashboardId),
      performance: this.getDashboardPerformance(dashboardId),
      widgets: dashboard.widgets.map((w: any) => ({
        id: w.id,
        type: w.type,
        interactions: this.getWidgetInteractions(w.id),
        loadTime: this.getWidgetLoadTime(w.id)
      }))
    };
  }

  /**
   * Dispose of the dashboard engine
   */
  public dispose(): void {
    // Stop all real-time updates
    for (const [dashboardId] of this.updateIntervals) {
      this.stopRealTimeUpdates(dashboardId);
    }

    // Clear all data
    this.dashboards.clear();
    this.widgets.clear();
    this.widgetDataCache.clear();
    this.themes.clear();
    this.permissions.clear();

    this.removeAllListeners();
  }

  // Private helper methods

  private setupDefaultThemes(): void {
    const themes: DashboardTheme[] = [
      {
        id: 'default',
        name: 'Default',
        colors: {
          primary: '#007acc',
          secondary: '#6c757d',
          success: '#28a745',
          warning: '#ffc107',
          error: '#dc3545',
          background: '#ffffff',
          surface: '#f8f9fa',
          text: '#212529'
        },
        fonts: {
          body: 'system-ui, -apple-system, sans-serif',
          heading: 'system-ui, -apple-system, sans-serif',
          monospace: 'Consolas, Monaco, monospace'
        },
        spacing: {
          small: '8px',
          medium: '16px',
          large: '24px'
        }
      },
      {
        id: 'dark',
        name: 'Dark',
        colors: {
          primary: '#0d7377',
          secondary: '#6c757d',
          success: '#20c997',
          warning: '#ffc107',
          error: '#dc3545',
          background: '#1a1a1a',
          surface: '#2d2d2d',
          text: '#ffffff'
        },
        fonts: {
          body: 'system-ui, -apple-system, sans-serif',
          heading: 'system-ui, -apple-system, sans-serif',
          monospace: 'Consolas, Monaco, monospace'
        },
        spacing: {
          small: '8px',
          medium: '16px',
          large: '24px'
        }
      }
    ];

    themes.forEach(theme => this.themes.set(theme.id, theme));
  }

  private setupDefaultWidgetTypes(): void {
    // Widget types are defined in getWidgetTypes() method
    this.emit('widgetTypesInitialized');
  }

  private createDefaultLayout(): DashboardLayout {
    return {
      type: 'grid',
      columns: 12,
      rows: 'auto',
      gap: '16px',
      padding: '16px'
    };
  }

  private setupRealTimeUpdates(dashboardId: string): void {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) {return;}

    // Stop existing interval if any
    this.stopRealTimeUpdates(dashboardId);

    // Start new interval
    const interval = setInterval(() => {
      this.updateDashboardData(dashboardId);
    }, dashboard.refreshInterval);

    this.updateIntervals.set(dashboardId, interval);
  }

  private stopRealTimeUpdates(dashboardId: string): void {
    const interval = this.updateIntervals.get(dashboardId);
    if (interval) {
      clearInterval(interval);
      this.updateIntervals.delete(dashboardId);
    }
  }

  private async updateDashboardData(dashboardId: string): Promise<void> {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) {return;}

    const updates: RealTimeUpdate[] = [];

    for (const widget of dashboard.widgets) {
      try {
        const data = await this.refreshWidgetData(widget.id);
        updates.push({
          widgetId: widget.id,
          data,
          timestamp: new Date()
        });
      } catch (error) {
        console.error(`Error updating widget ${widget.id}:`, error);
      }
    }

    this.emit('dashboardDataUpdated', { dashboardId, updates });
  }

  private async fetchWidgetData(widget: DashboardWidget): Promise<WidgetData> {
    // Simulate data fetching based on widget type and configuration
    const data: WidgetData = {
      id: widget.id,
      type: widget.type,
      data: await this.generateMockData(widget),
      metadata: {
        lastUpdated: new Date(),
        dataPoints: 0,
        source: widget.dataSource?.type || 'mock',
        filters: widget.filters
      }
    };

    return data;
  }

  private async generateMockData(widget: DashboardWidget): Promise<any> {
    // Generate mock data based on widget type
    switch (widget.type) {
      case 'line-chart':
        return this.generateLineChartData();
      case 'bar-chart':
        return this.generateBarChartData();
      case 'pie-chart':
        return this.generatePieChartData();
      case 'metric-card':
        return this.generateMetricData();
      case 'table':
        return this.generateTableData();
      case 'gauge':
        return this.generateGaugeData();
      default:
        return {};
    }
  }

  private generateLineChartData(): any {
    const data = [];
    const now = new Date();
    
    for (let i = 23; i >= 0; i--) {
      const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000);
      data.push({
        x: timestamp.toISOString(),
        y: Math.floor(Math.random() * 100) + 50
      });
    }
    
    return {
      datasets: [{
        label: 'Sample Data',
        data,
        borderColor: '#007acc',
        backgroundColor: 'rgba(0, 122, 204, 0.1)'
      }]
    };
  }

  private generateBarChartData(): any {
    return {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
      datasets: [{
        label: 'Sample Data',
        data: Array.from({ length: 6 }, () => Math.floor(Math.random() * 100)),
        backgroundColor: '#007acc'
      }]
    };
  }

  private generatePieChartData(): any {
    return {
      labels: ['Category A', 'Category B', 'Category C', 'Category D'],
      datasets: [{
        data: [30, 25, 25, 20],
        backgroundColor: ['#007acc', '#28a745', '#ffc107', '#dc3545']
      }]
    };
  }

  private generateMetricData(): any {
    return {
      value: Math.floor(Math.random() * 1000) + 100,
      change: (Math.random() - 0.5) * 20,
      unit: 'count',
      trend: Math.random() > 0.5 ? 'up' : 'down'
    };
  }

  private generateTableData(): any {
    const columns = ['ID', 'Name', 'Status', 'Value'];
    const rows = [];
    
    for (let i = 0; i < 10; i++) {
      rows.push([
        i + 1,
        `Item ${i + 1}`,
        Math.random() > 0.5 ? 'Active' : 'Inactive',
        Math.floor(Math.random() * 100)
      ]);
    }
    
    return { columns, rows };
  }

  private generateGaugeData(): any {
    return {
      value: Math.floor(Math.random() * 100),
      min: 0,
      max: 100,
      thresholds: [
        { value: 30, color: '#28a745' },
        { value: 70, color: '#ffc107' },
        { value: 90, color: '#dc3545' }
      ]
    };
  }

  private hasPermission(dashboard: Dashboard, userId: string, action: 'read' | 'write'): boolean {
    if (dashboard.isPublic && action === 'read') {
      return true;
    }
    
    const permissions = dashboard.permissions?.[action];
    return permissions ? (permissions.includes('*') || permissions.includes(userId)) : false;
  }

  private async prepareExportData(dashboard: Dashboard, format: string): Promise<any> {
    switch (format) {
      case 'json':
        return {
          dashboard,
          widgets: dashboard.widgets.map((w: any) => ({
            ...w,
            data: this.widgetDataCache.get(w.id)
          }))
        };
      case 'pdf':
        return { content: 'PDF export not implemented' };
      case 'png':
        return { content: 'PNG export not implemented' };
      case 'svg':
        return { content: 'SVG export not implemented' };
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  private getDashboardViews(dashboardId: string): number {
    // Mock implementation
    return Math.floor(Math.random() * 1000) + 10;
  }

  private getDashboardInteractions(dashboardId: string): number {
    // Mock implementation
    return Math.floor(Math.random() * 100) + 5;
  }

  private getDashboardPerformance(dashboardId: string): any {
    return {
      loadTime: Math.random() * 2000 + 500,
      renderTime: Math.random() * 500 + 100,
      dataFetchTime: Math.random() * 1000 + 200
    };
  }

  private getWidgetInteractions(widgetId: string): number {
    // Mock implementation
    return Math.floor(Math.random() * 50) + 1;
  }

  private getWidgetLoadTime(widgetId: string): number {
    // Mock implementation
    return Math.random() * 1000 + 100;
  }

  private generateDashboardId(): string {
    return `dashboard_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateWidgetId(): string {
    return `widget_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
