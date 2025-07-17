import * as vscode from 'vscode';
import { EventEmitter } from 'events';
import { 
  Plugin, 
  PluginMetadata, 
  PluginRegistry, 
  PluginAPI, 
  PluginContext, 
  PluginConfig, 
  PluginEvent, 
  PluginDevUtils,
  PluginLogger,
  PluginStorage,
  PluginScheduler,
  PLUGIN_EVENTS,
  ExecutionRecord
} from '../../types/plugin';

export class PluginManager implements PluginRegistry {
  private plugins = new Map<string, Plugin>();
  private pluginConfigs = new Map<string, PluginConfig>();
  private eventEmitter = new EventEmitter();
  private pluginAPI: PluginAPI;
  private context: PluginContext;

  constructor(
    private extensionContext: vscode.ExtensionContext,
    private workspaceRoot: string
  ) {
    this.pluginAPI = this.createPluginAPI();
    this.context = this.createPluginContext();
    this.initializeBuiltinPlugins().catch(error => {
      console.error('Failed to initialize plugin manager:', error);
    });
  }

  private createPluginAPI(): PluginAPI {
    return {
      // Core services
      getInsightsEngine: () => this.getInsightsEngine(),
      getCollaborationService: () => this.getCollaborationService(),
      getExecutionService: () => this.getExecutionService(),

      // Utilities
      showNotification: (message: string, type: 'info' | 'warning' | 'error') => {
        switch (type) {
          case 'info':
            vscode.window.showInformationMessage(message);
            break;
          case 'warning':
            vscode.window.showWarningMessage(message);
            break;
          case 'error':
            vscode.window.showErrorMessage(message);
            break;
        }
      },
      
      showProgress: async (title: string, task: (progress: any) => Promise<any>) => {
        return await vscode.window.withProgress({
          location: vscode.ProgressLocation.Notification,
          title,
          cancellable: true
        }, task);
      },

      openFile: (filePath: string) => {
        vscode.workspace.openTextDocument(filePath).then(doc => {
          vscode.window.showTextDocument(doc);
        });
      },

      writeFile: async (filePath: string, content: string) => {
        const uri = vscode.Uri.file(filePath);
        await vscode.workspace.fs.writeFile(uri, Buffer.from(content));
      },

      // Extension points
      registerCommand: (command) => this.registerCommand(command),
      registerAnalyzer: (analyzer) => this.registerAnalyzer(analyzer),
      registerFormatter: (formatter) => this.registerFormatter(formatter),
      registerTransformer: (transformer) => this.registerTransformer(transformer),
      registerValidator: (validator) => this.registerValidator(validator),

      // Events
      emit: (event: string, data?: any) => this.eventEmitter.emit(event, data),
      on: (event: string, handler: (data: any) => void) => this.eventEmitter.on(event, handler),
      off: (event: string, handler?: (data: any) => void) => {
        if (handler) {
          this.eventEmitter.off(event, handler);
        } else {
          this.eventEmitter.removeAllListeners(event);
        }
      }
    };
  }

  private createPluginContext(): PluginContext {
    return {
      workspaceRoot: this.workspaceRoot,
      currentFile: vscode.window.activeTextEditor?.document.fileName,
      selectedText: vscode.window.activeTextEditor?.document.getText(
        vscode.window.activeTextEditor?.selection
      ),
      executionHistory: [],
      aiInsights: [],
      collaborationData: {},
      customData: {}
    };
  }

  // Plugin Registry implementation
  async register(plugin: Plugin): Promise<void> {
    const { id } = plugin.metadata;
    
    if (this.plugins.has(id)) {
      throw new Error(`Plugin with ID '${id}' is already registered`);
    }

    // Validate plugin
    await this.validatePlugin(plugin);

    // Store plugin
    this.plugins.set(id, plugin);
    
    // Set default config
    if (!this.pluginConfigs.has(id)) {
      this.pluginConfigs.set(id, {
        enabled: plugin.metadata.enabled,
        settings: plugin.metadata.config || {},
        permissions: [],
        resources: {}
      });
    }

    // Activate if enabled
    if (this.isEnabled(id)) {
      await this.activatePlugin(id);
    }

    this.emitEvent(PLUGIN_EVENTS.ACTIVATED, { pluginId: id });
  }

  async unregister(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin with ID '${pluginId}' not found`);
    }

    // Deactivate if active
    if (this.isEnabled(pluginId)) {
      await this.deactivatePlugin(pluginId);
    }

    // Remove from storage
    this.plugins.delete(pluginId);
    this.pluginConfigs.delete(pluginId);

    this.emitEvent(PLUGIN_EVENTS.DEACTIVATED, { pluginId });
  }

  get(pluginId: string): Plugin | undefined {
    return this.plugins.get(pluginId);
  }

  getAll(): Plugin[] {
    return Array.from(this.plugins.values());
  }

  getByCapability(capability: string): Plugin[] {
    return this.getAll().filter(plugin => 
      plugin.metadata.capabilities.some(cap => cap.type === capability)
    );
  }

  isEnabled(pluginId: string): boolean {
    const config = this.pluginConfigs.get(pluginId);
    return config?.enabled ?? false;
  }

  async enable(pluginId: string): Promise<void> {
    const config = this.pluginConfigs.get(pluginId);
    if (!config) {
      throw new Error(`Plugin '${pluginId}' not found`);
    }

    config.enabled = true;
    await this.activatePlugin(pluginId);
    this.savePluginConfig(pluginId, config);
  }

  async disable(pluginId: string): Promise<void> {
    const config = this.pluginConfigs.get(pluginId);
    if (!config) {
      throw new Error(`Plugin '${pluginId}' not found`);
    }

    config.enabled = false;
    await this.deactivatePlugin(pluginId);
    this.savePluginConfig(pluginId, config);
  }

  // Plugin lifecycle
  private async activatePlugin(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin '${pluginId}' not found`);
    }

    try {
      await plugin.activate(this.pluginAPI, this.context);
      
      // Register plugin capabilities
      this.registerPluginCapabilities(plugin);
      
      // Execute activation hook
      if (plugin.hooks?.onActivate) {
        await plugin.hooks.onActivate(this.context);
      }
    } catch (error) {
      this.emitEvent(PLUGIN_EVENTS.ERROR, { 
        pluginId, 
        error: error.message 
      });
      throw error;
    }
  }

  private async deactivatePlugin(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      return;
    }

    try {
      // Execute deactivation hook
      if (plugin.hooks?.onDeactivate) {
        await plugin.hooks.onDeactivate(this.context);
      }

      await plugin.deactivate(this.pluginAPI, this.context);
      
      // Unregister plugin capabilities
      this.unregisterPluginCapabilities(plugin);
    } catch (error) {
      this.emitEvent(PLUGIN_EVENTS.ERROR, { 
        pluginId, 
        error: error.message 
      });
      throw error;
    }
  }

  private registerPluginCapabilities(plugin: Plugin): void {
    const { id } = plugin.metadata;

    // Register commands
    if (plugin.commands) {
      plugin.commands.forEach(command => {
        this.registerCommand(command);
      });
    }

    // Register analyzers
    if (plugin.analyzers) {
      plugin.analyzers.forEach(analyzer => {
        this.registerAnalyzer(analyzer);
      });
    }

    // Register formatters
    if (plugin.formatters) {
      plugin.formatters.forEach(formatter => {
        this.registerFormatter(formatter);
      });
    }

    // Register transformers
    if (plugin.transformers) {
      plugin.transformers.forEach(transformer => {
        this.registerTransformer(transformer);
      });
    }

    // Register validators
    if (plugin.validators) {
      plugin.validators.forEach(validator => {
        this.registerValidator(validator);
      });
    }
  }

  private unregisterPluginCapabilities(plugin: Plugin): void {
    // Implementation would remove registered capabilities
    // This is a simplified version
  }

  // Capability registration methods
  private registerCommand(command: any): void {
    // Register VSCode command
    const disposable = vscode.commands.registerCommand(
      `aiDebug.plugin.${command.id}`,
      async (...args: any[]) => {
        try {
          const result = await command.execute(this.context, args);
          this.emitEvent(PLUGIN_EVENTS.COMMAND_EXECUTED, {
            commandId: command.id,
            result
          });
          return result;
        } catch (error) {
          this.emitEvent(PLUGIN_EVENTS.ERROR, {
            commandId: command.id,
            error: error.message
          });
          throw error;
        }
      }
    );

    this.extensionContext.subscriptions.push(disposable);
  }

  private registerAnalyzer(analyzer: any): void {
    // Store analyzer for use by insight engine
    this.eventEmitter.emit('analyzer:registered', analyzer);
  }

  private registerFormatter(formatter: any): void {
    // Store formatter for use by output system
    this.eventEmitter.emit('formatter:registered', formatter);
  }

  private registerTransformer(transformer: any): void {
    // Store transformer for use by processing pipeline
    this.eventEmitter.emit('transformer:registered', transformer);
  }

  private registerValidator(validator: any): void {
    // Store validator for use by validation system
    this.eventEmitter.emit('validator:registered', validator);
  }

  // Plugin validation
  private async validatePlugin(plugin: Plugin): Promise<void> {
    const { metadata } = plugin;
    
    if (!metadata.id || !metadata.name || !metadata.version) {
      throw new Error('Plugin must have id, name, and version');
    }

    if (!metadata.capabilities || metadata.capabilities.length === 0) {
      throw new Error('Plugin must declare at least one capability');
    }

    // Validate dependencies
    if (metadata.dependencies) {
      for (const dep of metadata.dependencies) {
        if (!this.plugins.has(dep)) {
          throw new Error(`Missing dependency: ${dep}`);
        }
      }
    }

    // Validate required methods
    if (typeof plugin.activate !== 'function') {
      throw new Error('Plugin must have an activate method');
    }

    if (typeof plugin.deactivate !== 'function') {
      throw new Error('Plugin must have a deactivate method');
    }
  }

  // Configuration management
  private savePluginConfig(pluginId: string, config: PluginConfig): void {
    const configs = this.extensionContext.globalState.get<Record<string, PluginConfig>>('pluginConfigs', {});
    configs[pluginId] = config;
    this.extensionContext.globalState.update('pluginConfigs', configs);
  }

  private loadPluginConfigs(): void {
    const configs = this.extensionContext.globalState.get<Record<string, PluginConfig>>('pluginConfigs', {});
    for (const [pluginId, config] of Object.entries(configs)) {
      this.pluginConfigs.set(pluginId, config);
    }
  }

  // Event handling
  private emitEvent(type: string, data?: any): void {
    const event: PluginEvent = {
      type,
      pluginId: data?.pluginId || 'system',
      timestamp: new Date(),
      data,
      source: 'plugin-manager'
    };

    this.eventEmitter.emit(type, event);
  }

  // Development utilities
  createDevUtils(pluginId: string): PluginDevUtils {
    return {
      createLogger: (id: string) => this.createLogger(id),
      createStorage: (id: string) => this.createStorage(id),
      createScheduler: (id: string) => this.createScheduler(id)
    };
  }

  private createLogger(pluginId: string): PluginLogger {
    return {
      info: (message: string, data?: any) => {
        console.log(`[${pluginId}] ${message}`, data);
      },
      warn: (message: string, data?: any) => {
        console.warn(`[${pluginId}] ${message}`, data);
      },
      error: (message: string, error?: Error) => {
        console.error(`[${pluginId}] ${message}`, error);
      },
      debug: (message: string, data?: any) => {
        console.debug(`[${pluginId}] ${message}`, data);
      }
    };
  }

  private createStorage(pluginId: string): PluginStorage {
    const prefix = `plugin.${pluginId}.`;
    
    return {
      get: <T>(key: string): T | undefined => {
        return this.extensionContext.globalState.get<T>(prefix + key);
      },
      set: <T>(key: string, value: T): void => {
        this.extensionContext.globalState.update(prefix + key, value);
      },
      delete: (key: string): void => {
        this.extensionContext.globalState.update(prefix + key, undefined);
      },
      clear: (): void => {
        // Get all keys with this plugin's prefix and clear them
        const keys = this.extensionContext.globalState.keys();
        for (const key of keys) {
          if (key.startsWith(prefix)) {
            this.extensionContext.globalState.update(key, undefined);
          }
        }
      },
      keys: (): string[] => {
        return this.extensionContext.globalState.keys()
          .filter(key => key.startsWith(prefix))
          .map(key => key.substring(prefix.length));
      }
    };
  }

  private createScheduler(pluginId: string): PluginScheduler {
    const timers = new Map<string, NodeJS.Timeout>();
    
    return {
      schedule: (id: string, interval: number, task: () => Promise<void>) => {
        // Cancel existing timer if any
        const existingTimer = timers.get(id);
        if (existingTimer) {
          clearInterval(existingTimer);
        }

        // Create new timer
        const timer = setInterval(async () => {
          try {
            await task();
          } catch (error) {
            this.emitEvent(PLUGIN_EVENTS.ERROR, {
              pluginId,
              error: error.message,
              source: 'scheduler'
            });
          }
        }, interval);

        timers.set(id, timer);
      },
      cancel: (id: string) => {
        const timer = timers.get(id);
        if (timer) {
          clearInterval(timer);
          timers.delete(id);
        }
      },
      cancelAll: () => {
        for (const timer of timers.values()) {
          clearInterval(timer);
        }
        timers.clear();
      }
    };
  }

  // Integration with existing services
  private getInsightsEngine(): any {
    // Return reference to existing AI insights engine
    return null; // Placeholder
  }

  private getCollaborationService(): any {
    // Return reference to existing collaboration service
    return null; // Placeholder
  }

  private getExecutionService(): any {
    // Return reference to existing execution service
    return null; // Placeholder
  }

  // Built-in plugins initialization
  private async initializeBuiltinPlugins(): Promise<void> {
    // Load built-in plugins
    this.loadPluginConfigs();
    
    // Register built-in plugins
    try {
      const { GitAnalyzerPlugin, TestAnalyzerPlugin, AIProviderPlugin } = await import('./builtin');
      
      // Register Git Analyzer Plugin
      const gitPlugin = new GitAnalyzerPlugin();
      await this.register(gitPlugin);
      
      // Register Test Analyzer Plugin
      const testPlugin = new TestAnalyzerPlugin();
      await this.register(testPlugin);
      
      // Register AI Provider Plugin
      const aiPlugin = new AIProviderPlugin();
      await this.register(aiPlugin);
      
      console.log('Built-in plugins initialized successfully');
    } catch (error) {
      console.error('Failed to initialize built-in plugins:', error);
    }
  }

  // Public API for extension
  public async executePluginCommand(pluginId: string, commandId: string, args?: any[]): Promise<any> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin || !this.isEnabled(pluginId)) {
      throw new Error(`Plugin '${pluginId}' not found or not enabled`);
    }

    const command = plugin.commands?.find(cmd => cmd.id === commandId);
    if (!command) {
      throw new Error(`Command '${commandId}' not found in plugin '${pluginId}'`);
    }

    return await command.execute(this.context, args);
  }

  public getPluginInsights(pluginId: string): any[] {
    // Return insights generated by specific plugin
    return [];
  }

  public async refreshPluginContext(): Promise<void> {
    this.context = this.createPluginContext();
    
    // Notify all active plugins about context change
    for (const [pluginId, plugin] of this.plugins) {
      if (this.isEnabled(pluginId) && plugin.hooks?.onCommand) {
        // This is a simplified notification
        // In practice, you'd have a more sophisticated context update system
      }
    }
  }
}
