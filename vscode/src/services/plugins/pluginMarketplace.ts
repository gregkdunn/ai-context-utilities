import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { 
  PluginMarketplace, 
  PluginInfo,
  PluginManifest,
  Plugin
} from '../../types/plugin';
import { PluginDiscoveryService } from './pluginDiscovery';

export class PluginMarketplaceService implements PluginMarketplace {
  private discoveryService: PluginDiscoveryService;
  private pluginsDirectory: string;

  constructor(private context: vscode.ExtensionContext) {
    this.discoveryService = new PluginDiscoveryService(context);
    this.pluginsDirectory = path.join(context.extensionPath, 'plugins');
    
    // Ensure plugins directory exists
    if (!fs.existsSync(this.pluginsDirectory)) {
      fs.mkdirSync(this.pluginsDirectory, { recursive: true });
    }
  }

  async searchPlugins(query: string): Promise<PluginInfo[]> {
    // In a real implementation, this would search a remote registry
    // For now, we'll search local plugins and simulate some results
    
    const localPlugins = await this.listInstalledPlugins();
    const filteredPlugins = localPlugins.filter(plugin => 
      plugin.name.toLowerCase().includes(query.toLowerCase()) ||
      plugin.description.toLowerCase().includes(query.toLowerCase()) ||
      plugin.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase()))
    );

    // Add some mock plugins for demonstration
    const mockPlugins = this.getMockPlugins().filter(plugin =>
      plugin.name.toLowerCase().includes(query.toLowerCase()) ||
      plugin.description.toLowerCase().includes(query.toLowerCase()) ||
      plugin.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase()))
    );

    return [...filteredPlugins, ...mockPlugins];
  }

  async getPlugin(id: string): Promise<PluginInfo> {
    const localPlugins = await this.listInstalledPlugins();
    const localPlugin = localPlugins.find(p => p.id === id);
    
    if (localPlugin) {
      return localPlugin;
    }

    // Check mock plugins
    const mockPlugins = this.getMockPlugins();
    const mockPlugin = mockPlugins.find(p => p.id === id);
    
    if (mockPlugin) {
      return mockPlugin;
    }

    throw new Error(`Plugin not found: ${id}`);
  }

  async installPlugin(id: string, version?: string): Promise<void> {
    try {
      // In a real implementation, this would download from a registry
      // For now, we'll simulate installation
      
      const pluginInfo = await this.getPlugin(id);
      const targetVersion = version || pluginInfo.version;
      
      // Create plugin directory
      const pluginDir = path.join(this.pluginsDirectory, id);
      if (!fs.existsSync(pluginDir)) {
        fs.mkdirSync(pluginDir, { recursive: true });
      }

      // Generate package.json
      const packageJson = {
        name: pluginInfo.id,
        displayName: pluginInfo.name,
        version: targetVersion,
        description: pluginInfo.description,
        author: pluginInfo.author,
        license: pluginInfo.license,
        repository: {
          type: 'git',
          url: pluginInfo.repository
        },
        homepage: pluginInfo.homepage,
        bugs: pluginInfo.bugs,
        keywords: [...pluginInfo.tags, 'ai-debug-plugin'],
        main: 'index.js',
        dependencies: pluginInfo.dependencies,
        peerDependencies: pluginInfo.peerDependencies,
        aiDebugPlugin: {
          capabilities: this.getDefaultCapabilities(pluginInfo),
          config: {},
          engineVersion: '1.0.0'
        }
      };

      fs.writeFileSync(
        path.join(pluginDir, 'package.json'),
        JSON.stringify(packageJson, null, 2)
      );

      // Generate basic plugin implementation
      const pluginCode = this.generatePluginCode(pluginInfo);
      fs.writeFileSync(path.join(pluginDir, 'index.js'), pluginCode);

      // Generate README
      const readme = this.generateReadme(pluginInfo);
      fs.writeFileSync(path.join(pluginDir, 'README.md'), readme);

      vscode.window.showInformationMessage(`Plugin ${pluginInfo.name} installed successfully!`);
      
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to install plugin: ${error.message}`);
      throw error;
    }
  }

  async updatePlugin(id: string, version?: string): Promise<void> {
    try {
      const pluginInfo = await this.getPlugin(id);
      const currentVersion = pluginInfo.version;
      const targetVersion = version || 'latest';
      
      // In a real implementation, this would check for updates and download
      // For now, we'll simulate an update
      
      if (targetVersion === currentVersion) {
        vscode.window.showInformationMessage(`Plugin ${pluginInfo.name} is already up to date.`);
        return;
      }

      // Simulate update process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      vscode.window.showInformationMessage(`Plugin ${pluginInfo.name} updated to version ${targetVersion}!`);
      
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to update plugin: ${error.message}`);
      throw error;
    }
  }

  async uninstallPlugin(id: string): Promise<void> {
    try {
      const pluginDir = path.join(this.pluginsDirectory, id);
      
      if (fs.existsSync(pluginDir)) {
        // Remove plugin directory
        fs.rmSync(pluginDir, { recursive: true, force: true });
        
        vscode.window.showInformationMessage(`Plugin ${id} uninstalled successfully!`);
      } else {
        throw new Error(`Plugin ${id} is not installed`);
      }
      
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to uninstall plugin: ${error.message}`);
      throw error;
    }
  }

  async listInstalledPlugins(): Promise<PluginInfo[]> {
    const plugins: PluginInfo[] = [];
    
    try {
      const manifests = await this.discoveryService.discoverPlugins([this.pluginsDirectory]);
      
      for (const manifest of manifests) {
        const pluginInfo: PluginInfo = {
          id: manifest.metadata.id,
          name: manifest.metadata.name,
          version: manifest.metadata.version,
          description: manifest.metadata.description || '',
          author: manifest.metadata.author || '',
          downloads: 0, // Would be fetched from registry
          rating: 0, // Would be fetched from registry
          tags: manifest.metadata.keywords || [],
          screenshots: [],
          readme: this.getReadme(manifest.path),
          changelog: this.getChangelog(manifest.path),
          license: manifest.metadata.license || '',
          repository: manifest.metadata.repository || '',
          homepage: manifest.metadata.homepage || '',
          bugs: '',
          dependencies: manifest.packageJson.dependencies || {},
          peerDependencies: manifest.packageJson.peerDependencies || {},
          publishedAt: new Date(fs.statSync(manifest.path).birthtime),
          updatedAt: new Date(fs.statSync(manifest.path).mtime)
        };
        
        plugins.push(pluginInfo);
      }
      
    } catch (error) {
      console.error('Failed to list installed plugins:', error);
    }
    
    return plugins;
  }

  private getMockPlugins(): PluginInfo[] {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    return [
      {
        id: 'git-enhanced-analyzer',
        name: 'Git Enhanced Analyzer',
        version: '1.2.0',
        description: 'Advanced Git analysis with commit pattern recognition and branch optimization suggestions',
        author: 'AI Debug Community',
        downloads: 1250,
        rating: 4.8,
        tags: ['git', 'analysis', 'vcs', 'optimization'],
        screenshots: [],
        readme: '# Git Enhanced Analyzer\n\nAdvanced Git analysis plugin...',
        changelog: '## 1.2.0\n- Added branch optimization\n- Improved commit analysis',
        license: 'MIT',
        repository: 'https://github.com/ai-debug/git-enhanced-analyzer',
        homepage: 'https://ai-debug.com/plugins/git-enhanced-analyzer',
        bugs: 'https://github.com/ai-debug/git-enhanced-analyzer/issues',
        dependencies: {
          'simple-git': '^3.0.0',
          'moment': '^2.29.0'
        },
        peerDependencies: {},
        publishedAt: weekAgo,
        updatedAt: now
      },
      {
        id: 'test-coverage-insights',
        name: 'Test Coverage Insights',
        version: '2.1.3',
        description: 'Intelligent test coverage analysis with AI-powered suggestions for improving test quality',
        author: 'TestBot Inc.',
        downloads: 2100,
        rating: 4.6,
        tags: ['testing', 'coverage', 'quality', 'ai'],
        screenshots: [],
        readme: '# Test Coverage Insights\n\nIntelligent test coverage analysis...',
        changelog: '## 2.1.3\n- Fixed coverage calculation\n- Added AI suggestions',
        license: 'Apache-2.0',
        repository: 'https://github.com/testbot/test-coverage-insights',
        homepage: 'https://testbot.com/plugins/coverage-insights',
        bugs: 'https://github.com/testbot/test-coverage-insights/issues',
        dependencies: {
          'istanbul': '^0.4.5',
          'nyc': '^15.0.0'
        },
        peerDependencies: {},
        publishedAt: weekAgo,
        updatedAt: now
      },
      {
        id: 'performance-profiler',
        name: 'Performance Profiler',
        version: '1.0.5',
        description: 'Real-time performance monitoring and optimization suggestions for your development workflow',
        author: 'SpeedDev',
        downloads: 890,
        rating: 4.3,
        tags: ['performance', 'profiling', 'optimization', 'monitoring'],
        screenshots: [],
        readme: '# Performance Profiler\n\nReal-time performance monitoring...',
        changelog: '## 1.0.5\n- Added memory profiling\n- Performance improvements',
        license: 'MIT',
        repository: 'https://github.com/speeddev/performance-profiler',
        homepage: 'https://speeddev.com/plugins/performance-profiler',
        bugs: 'https://github.com/speeddev/performance-profiler/issues',
        dependencies: {
          'perf_hooks': '^1.0.0',
          'v8-profiler': '^5.7.0'
        },
        peerDependencies: {},
        publishedAt: weekAgo,
        updatedAt: now
      },
      {
        id: 'ai-code-reviewer',
        name: 'AI Code Reviewer',
        version: '3.0.1',
        description: 'AI-powered code review with smart suggestions, bug detection, and code quality analysis',
        author: 'CodeAI Labs',
        downloads: 3200,
        rating: 4.9,
        tags: ['ai', 'code-review', 'quality', 'bugs', 'analysis'],
        screenshots: [],
        readme: '# AI Code Reviewer\n\nAI-powered code review...',
        changelog: '## 3.0.1\n- Enhanced AI model\n- Better bug detection',
        license: 'Commercial',
        repository: 'https://github.com/codeai/ai-code-reviewer',
        homepage: 'https://codeai.com/plugins/ai-code-reviewer',
        bugs: 'https://github.com/codeai/ai-code-reviewer/issues',
        dependencies: {
          'openai': '^4.0.0',
          'typescript': '^5.0.0'
        },
        peerDependencies: {},
        publishedAt: weekAgo,
        updatedAt: now
      }
    ];
  }

  private getDefaultCapabilities(pluginInfo: PluginInfo): any[] {
    const capabilities = [];
    
    // Add capabilities based on plugin tags
    if (pluginInfo.tags.includes('git')) {
      capabilities.push({
        type: 'analyzer',
        name: 'git-analyzer',
        description: 'Analyze Git repositories and commits'
      });
    }
    
    if (pluginInfo.tags.includes('testing')) {
      capabilities.push({
        type: 'analyzer',
        name: 'test-analyzer',
        description: 'Analyze test results and coverage'
      });
    }
    
    if (pluginInfo.tags.includes('performance')) {
      capabilities.push({
        type: 'analyzer',
        name: 'performance-analyzer',
        description: 'Analyze performance metrics'
      });
    }
    
    if (pluginInfo.tags.includes('ai')) {
      capabilities.push({
        type: 'ai-provider',
        name: 'ai-provider',
        description: 'Provide AI-powered insights'
      });
    }
    
    return capabilities;
  }

  private generatePluginCode(pluginInfo: PluginInfo): string {
    const className = this.toPascalCase(pluginInfo.id);
    
    return `
class ${className} {
  constructor() {
    this.metadata = {
      id: '${pluginInfo.id}',
      name: '${pluginInfo.name}',
      version: '${pluginInfo.version}',
      description: '${pluginInfo.description}',
      author: '${pluginInfo.author}',
      license: '${pluginInfo.license}',
      enabled: true,
      capabilities: ${JSON.stringify(this.getDefaultCapabilities(pluginInfo), null, 6)}
    };
  }

  async activate(api, context) {
    console.log('${pluginInfo.name} plugin activated');
    
    // Register plugin capabilities
    if (this.commands) {
      for (const command of this.commands) {
        api.registerCommand(command);
      }
    }
    
    if (this.analyzers) {
      for (const analyzer of this.analyzers) {
        api.registerAnalyzer(analyzer);
      }
    }
    
    // Plugin-specific initialization
    await this.initialize(api, context);
  }

  async deactivate(api, context) {
    console.log('${pluginInfo.name} plugin deactivated');
    
    // Cleanup plugin resources
    await this.cleanup(api, context);
  }

  async initialize(api, context) {
    // Plugin-specific initialization logic
    console.log('Initializing ${pluginInfo.name}...');
  }

  async cleanup(api, context) {
    // Plugin-specific cleanup logic
    console.log('Cleaning up ${pluginInfo.name}...');
  }

  // Example analyzer (if plugin has analysis capabilities)
  get analyzers() {
    return [
      {
        id: '${pluginInfo.id}-analyzer',
        name: '${pluginInfo.name} Analyzer',
        description: '${pluginInfo.description}',
        filePatterns: ['**/*'],
        
        async analyze(content, filePath, context) {
          // Implement analysis logic here
          return {
            issues: [],
            metrics: {},
            suggestions: [],
            confidence: 0.8
          };
        }
      }
    ];
  }

  // Example commands (if plugin has command capabilities)
  get commands() {
    return [
      {
        id: '${pluginInfo.id}-command',
        title: '${pluginInfo.name} Command',
        description: 'Execute ${pluginInfo.name} functionality',
        category: 'AI Debug',
        
        async execute(context, args) {
          // Implement command logic here
          return 'Command executed successfully';
        }
      }
    ];
  }
}

module.exports = ${className};
    `.trim();
  }

  private generateReadme(pluginInfo: PluginInfo): string {
    return `
# ${pluginInfo.name}

${pluginInfo.description}

## Installation

Install this plugin through the AI Debug Plugin Marketplace:

1. Open AI Debug extension
2. Go to Plugin Marketplace
3. Search for "${pluginInfo.name}"
4. Click Install

## Usage

After installation, the plugin will be automatically activated and its features will be available in the AI Debug extension.

## Features

- Advanced analysis capabilities
- Smart suggestions and insights
- Seamless integration with AI Debug workflow

## Configuration

The plugin can be configured through the AI Debug settings panel.

## Support

For issues and questions, please visit: ${pluginInfo.bugs || 'N/A'}

## License

${pluginInfo.license}
    `.trim();
  }

  private getReadme(pluginPath: string): string {
    const readmePath = path.join(pluginPath, 'README.md');
    if (fs.existsSync(readmePath)) {
      return fs.readFileSync(readmePath, 'utf8');
    }
    return '';
  }

  private getChangelog(pluginPath: string): string {
    const changelogPath = path.join(pluginPath, 'CHANGELOG.md');
    if (fs.existsSync(changelogPath)) {
      return fs.readFileSync(changelogPath, 'utf8');
    }
    return '';
  }

  private toPascalCase(str: string): string {
    return str
      .replace(/[-_]/g, ' ')
      .replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase())
      .replace(/\s/g, '');
  }
}
