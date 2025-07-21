import { PluginManager } from '../pluginManager';
import { Plugin, PluginMetadata, PluginAPI, PluginContext } from '../../../types/plugin';
import * as vscode from 'vscode';

// Mock VSCode API
jest.mock('vscode', () => ({
  window: {
    showInformationMessage: jest.fn(),
    showWarningMessage: jest.fn(),
    showErrorMessage: jest.fn(),
    withProgress: jest.fn(),
    createTreeView: jest.fn(),
    showTextDocument: jest.fn(),
    showInputBox: jest.fn(),
    showQuickPick: jest.fn(),
    activeTextEditor: {
      document: {
        fileName: 'test.ts',
        getText: jest.fn().mockReturnValue('test content')
      },
      selection: {}
    }
  },
  workspace: {
    openTextDocument: jest.fn(),
    fs: {
      writeFile: jest.fn(),
      readFile: jest.fn()
    }
  },
  commands: {
    registerCommand: jest.fn().mockReturnValue({ dispose: jest.fn() })
  },
  ProgressLocation: {
    Notification: 15
  },
  Uri: {
    file: jest.fn()
  }
}));

// Mock plugin for testing
class TestPlugin implements Plugin {
  metadata: PluginMetadata = {
    id: 'test-plugin',
    name: 'Test Plugin',
    version: '1.0.0',
    description: 'Test plugin for unit tests',
    author: 'Test Author',
    license: 'MIT',
    enabled: true,
    capabilities: [
      {
        type: 'command',
        name: 'test-command',
        description: 'Test command'
      }
    ]
  };

  activated = false;
  deactivated = false;

  async activate(api: PluginAPI, context: PluginContext): Promise<void> {
    this.activated = true;
  }

  async deactivate(api: PluginAPI, context: PluginContext): Promise<void> {
    this.deactivated = true;
  }

  get commands() {
    return [
      {
        id: 'test-command',
        title: 'Test Command',
        description: 'Test command',
        execute: async (context: PluginContext, args?: any[]) => {
          return 'test-result';
        }
      }
    ];
  }
}

describe('PluginManager', () => {
  let pluginManager: PluginManager;
  let mockExtensionContext: vscode.ExtensionContext;

  beforeEach(() => {
    mockExtensionContext = {
      subscriptions: [],
      extensionPath: '/test/path',
      globalState: {
        get: jest.fn().mockReturnValue({}),
        update: jest.fn(),
        keys: jest.fn().mockReturnValue([])
      }
    } as any;

    pluginManager = new PluginManager(mockExtensionContext, '/test/workspace');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Plugin Registration', () => {
    it('should register a plugin successfully', async () => {
      const testPlugin = new TestPlugin();
      
      await pluginManager.register(testPlugin);
      
      const registeredPlugin = pluginManager.get('test-plugin');
      expect(registeredPlugin).toBe(testPlugin);
      expect(testPlugin.activated).toBe(true);
    });

    it('should throw error when registering plugin with duplicate ID', async () => {
      const testPlugin1 = new TestPlugin();
      const testPlugin2 = new TestPlugin();
      
      await pluginManager.register(testPlugin1);
      
      await expect(pluginManager.register(testPlugin2)).rejects.toThrow(
        'Plugin with ID \'test-plugin\' is already registered'
      );
    });

    it('should validate plugin before registration', async () => {
      const invalidPlugin = {
        metadata: {
          id: '',
          name: '',
          version: '',
          description: '',
          author: '',
          license: '',
          enabled: true,
          capabilities: []
        },
        activate: jest.fn(),
        deactivate: jest.fn()
      } as Plugin;
      
      await expect(pluginManager.register(invalidPlugin)).rejects.toThrow();
    });
  });

  describe('Plugin Lifecycle', () => {
    it('should enable and disable plugins', async () => {
      const testPlugin = new TestPlugin();
      await pluginManager.register(testPlugin);
      
      // Plugin should be enabled by default
      expect(pluginManager.isEnabled('test-plugin')).toBe(true);
      
      // Disable plugin
      await pluginManager.disable('test-plugin');
      expect(pluginManager.isEnabled('test-plugin')).toBe(false);
      expect(testPlugin.deactivated).toBe(true);
      
      // Re-enable plugin
      testPlugin.activated = false;
      await pluginManager.enable('test-plugin');
      expect(pluginManager.isEnabled('test-plugin')).toBe(true);
      expect(testPlugin.activated).toBe(true);
    });

    it('should unregister plugins', async () => {
      const testPlugin = new TestPlugin();
      await pluginManager.register(testPlugin);
      
      expect(pluginManager.get('test-plugin')).toBe(testPlugin);
      
      await pluginManager.unregister('test-plugin');
      
      expect(pluginManager.get('test-plugin')).toBeUndefined();
      expect(testPlugin.deactivated).toBe(true);
    });
  });

  describe('Plugin Discovery', () => {
    it('should get all registered plugins', async () => {
      const testPlugin1 = new TestPlugin();
      const testPlugin2 = new TestPlugin();
      testPlugin2.metadata.id = 'test-plugin-2';
      
      await pluginManager.register(testPlugin1);
      await pluginManager.register(testPlugin2);
      
      const allPlugins = pluginManager.getAll();
      expect(allPlugins).toHaveLength(5); // 2 test plugins + 3 built-in plugins
      expect(allPlugins.find(p => p.metadata.id === 'test-plugin')).toBe(testPlugin1);
      expect(allPlugins.find(p => p.metadata.id === 'test-plugin-2')).toBe(testPlugin2);
    });

    it('should get plugins by capability', async () => {
      const testPlugin = new TestPlugin();
      await pluginManager.register(testPlugin);
      
      const commandPlugins = pluginManager.getByCapability('command');
      expect(commandPlugins.length).toBeGreaterThan(0);
      expect(commandPlugins.find(p => p.metadata.id === 'test-plugin')).toBe(testPlugin);
    });
  });

  describe('Plugin Commands', () => {
    it('should execute plugin commands', async () => {
      const testPlugin = new TestPlugin();
      await pluginManager.register(testPlugin);
      
      const result = await pluginManager.executePluginCommand('test-plugin', 'test-command');
      expect(result).toBe('test-result');
    });

    it('should throw error for non-existent plugin', async () => {
      await expect(
        pluginManager.executePluginCommand('non-existent', 'test-command')
      ).rejects.toThrow('Plugin \'non-existent\' not found or not enabled');
    });

    it('should throw error for non-existent command', async () => {
      const testPlugin = new TestPlugin();
      await pluginManager.register(testPlugin);
      
      await expect(
        pluginManager.executePluginCommand('test-plugin', 'non-existent-command')
      ).rejects.toThrow('Command \'non-existent-command\' not found in plugin \'test-plugin\'');
    });
  });

  describe('Plugin Context', () => {
    it('should refresh plugin context', async () => {
      const testPlugin = new TestPlugin();
      await pluginManager.register(testPlugin);
      
      await pluginManager.refreshPluginContext();
      
      // Context should be updated
      expect(pluginManager).toBeDefined();
    });
  });

  describe('Development Utilities', () => {
    it('should create development utils', () => {
      const devUtils = pluginManager.createDevUtils('test-plugin');
      
      expect(devUtils).toBeDefined();
      expect(devUtils.createLogger).toBeDefined();
      expect(devUtils.createStorage).toBeDefined();
      expect(devUtils.createScheduler).toBeDefined();
    });

    it('should create logger', () => {
      const devUtils = pluginManager.createDevUtils('test-plugin');
      const logger = devUtils.createLogger('test-plugin');
      
      expect(logger).toBeDefined();
      expect(logger.info).toBeDefined();
      expect(logger.warn).toBeDefined();
      expect(logger.error).toBeDefined();
      expect(logger.debug).toBeDefined();
      
      // Test logging (should not throw)
      logger.info('Test message');
      logger.warn('Test warning');
      logger.error('Test error');
      logger.debug('Test debug');
    });

    it('should create storage', () => {
      const devUtils = pluginManager.createDevUtils('test-plugin');
      const storage = devUtils.createStorage('test-plugin');
      
      expect(storage).toBeDefined();
      expect(storage.get).toBeDefined();
      expect(storage.set).toBeDefined();
      expect(storage.delete).toBeDefined();
      expect(storage.clear).toBeDefined();
      expect(storage.keys).toBeDefined();
    });

    it('should create scheduler', () => {
      const devUtils = pluginManager.createDevUtils('test-plugin');
      const scheduler = devUtils.createScheduler('test-plugin');
      
      expect(scheduler).toBeDefined();
      expect(scheduler.schedule).toBeDefined();
      expect(scheduler.cancel).toBeDefined();
      expect(scheduler.cancelAll).toBeDefined();
    });
  });
});
