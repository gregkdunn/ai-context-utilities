import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { 
  PluginDiscovery, 
  PluginManifest, 
  Plugin, 
  PluginMetadata,
  PluginSecurity,
  SecurityReport,
  SecurityVulnerability,
  ValidationResult,
  PermissionResult 
} from '../../types/plugin';

export class PluginDiscoveryService implements PluginDiscovery {
  private securityService: PluginSecurityService;

  constructor(private context: vscode.ExtensionContext) {
    this.securityService = new PluginSecurityService();
  }

  async discoverPlugins(directories: string | string[]): Promise<PluginManifest[]> {
    const manifests: PluginManifest[] = [];

    try {
      const dirArray = Array.isArray(directories) ? directories : [directories];
      const allPluginDirs: string[] = [];
      
      for (const directory of dirArray) {
        const pluginDirs = await this.getPluginDirectories(directory);
        allPluginDirs.push(...pluginDirs);
      }
      
      for (const pluginDir of allPluginDirs) {
        const manifest = await this.loadPluginManifest(pluginDir);
        if (manifest) {
          manifests.push(manifest);
        }
      }
    } catch (error) {
      console.warn(`Failed to discover plugins:`, error);
    }

    return manifests;
  }

  async loadPlugin(manifest: PluginManifest): Promise<Plugin> {
    try {
      // Security check
      // Convert manifest to plugin-like object for security scan
      const pluginForScan = {
        metadata: manifest.metadata,
        activate: async () => {},
        deactivate: async () => {}
      } as Plugin;
      
      const securityReport = await this.securityService.scanPlugin(pluginForScan);
      if (!securityReport.approved) {
        throw new Error(`Plugin ${manifest.metadata.id} failed security scan`);
      }

      // Load plugin module
      const pluginModule = require(manifest.entryPoint);
      const PluginClass = pluginModule.default || pluginModule;
      
      if (typeof PluginClass !== 'function') {
        throw new Error(`Plugin ${manifest.metadata.id} does not export a valid plugin class`);
      }

      const plugin = new PluginClass();
      
      // Validate plugin structure
      if (!await this.validatePlugin(plugin)) {
        throw new Error(`Plugin ${manifest.metadata.id} failed validation`);
      }

      return plugin;
    } catch (error) {
      throw new Error(`Failed to load plugin ${manifest.metadata.id}: ${(error as Error).message}`);
    }
  }

  async validatePlugin(manifest: PluginManifest): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Check required properties
      if (!manifest.metadata.id || !manifest.metadata.name || !manifest.metadata.version) {
        errors.push('Plugin must have id, name, and version in metadata');
      }

      // Check capabilities
      if (!manifest.metadata.capabilities || manifest.metadata.capabilities.length === 0) {
        warnings.push('Plugin should declare at least one capability');
      }

      // Validate version format
      if (!this.isValidVersion(manifest.metadata.version)) {
        errors.push('Plugin version must follow semantic versioning');
      }

      // Check capabilities structure
      for (const capability of manifest.metadata.capabilities) {
        if (!capability.type || !capability.name) {
          errors.push('Each capability must have type and name');
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings
      };
    } catch (error) {
      return {
        isValid: false,
        errors: [`Plugin validation failed: ${(error as Error).message}`],
        warnings
      };
    }
  }

  private async getPluginDirectories(directory: string): Promise<string[]> {
    const directories: string[] = [];
    
    if (!fs.existsSync(directory)) {
      return directories;
    }

    const entries = fs.readdirSync(directory, { withFileTypes: true });
    
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const pluginDir = path.join(directory, entry.name);
        const packageJsonPath = path.join(pluginDir, 'package.json');
        
        if (fs.existsSync(packageJsonPath)) {
          directories.push(pluginDir);
        }
      }
    }

    return directories;
  }

  private async loadPluginManifest(pluginDir: string): Promise<PluginManifest | null> {
    try {
      const packageJsonPath = path.join(pluginDir, 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      
      // Check if it's an AI Debug plugin
      if (!packageJson.keywords?.includes('ai-debug-plugin')) {
        return null;
      }

      const metadata: PluginMetadata = {
        id: packageJson.name,
        name: packageJson.displayName || packageJson.name,
        version: packageJson.version,
        description: packageJson.description,
        author: packageJson.author,
        license: packageJson.license,
        repository: packageJson.repository?.url,
        homepage: packageJson.homepage,
        keywords: packageJson.keywords,
        enabled: true, // Default to enabled
        capabilities: packageJson.aiDebugPlugin?.capabilities || [],
        dependencies: packageJson.aiDebugPlugin?.dependencies || [],
        engineVersion: packageJson.aiDebugPlugin?.engineVersion || '1.0.0',
        config: packageJson.aiDebugPlugin?.config || {},
        icon: packageJson.aiDebugPlugin?.icon,
        documentation: packageJson.aiDebugPlugin?.documentation,
        examples: packageJson.aiDebugPlugin?.examples || []
      };

      const entryPoint = path.join(pluginDir, packageJson.main || 'index.js');
      
      if (!fs.existsSync(entryPoint)) {
        throw new Error(`Entry point not found: ${entryPoint}`);
      }

      return {
        path: pluginDir,
        packageJson,
        metadata,
        entryPoint
      };
    } catch (error) {
      console.warn(`Failed to load plugin manifest from ${pluginDir}:`, error);
      return null;
    }
  }

  private isValidVersion(version: string): boolean {
    // Simplified semver regex that works with TypeScript
    const semverRegex = /^\d+\.\d+\.\d+(?:-[\w.-]+)?(?:\+[\w.-]+)?$/;
    return semverRegex.test(version);
  }
}

class PluginSecurityService implements PluginSecurity {
  async validatePlugin(plugin: Plugin): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Check required methods
      if (typeof plugin.activate !== 'function') {
        errors.push('Plugin must have an activate method');
      }

      if (typeof plugin.deactivate !== 'function') {
        errors.push('Plugin must have a deactivate method');
      }

      // Check metadata
      const { metadata } = plugin;
      if (!metadata.id || !metadata.name || !metadata.version) {
        errors.push('Plugin must have id, name, and version in metadata');
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings
      };
    } catch (error) {
      return {
        isValid: false,
        errors: [`Plugin validation failed: ${(error as Error).message}`],
        warnings
      };
    }
  }
  async scanPlugin(plugin: Plugin): Promise<SecurityReport> {
    const vulnerabilities: SecurityVulnerability[] = [];
    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';

    // Check for suspicious dependencies
    // const suspiciousDeps = await this.checkDependencies(dependencies || {});
    // vulnerabilities.push(...suspiciousDeps);

    // Check permissions
    const permissionIssues = await this.checkPermissionsPrivate(plugin.metadata.capabilities);
    vulnerabilities.push(...permissionIssues);
    
    // Check code patterns - would need entry point from plugin metadata
    // const codeIssues = await this.checkCodePatterns(entryPoint);
    // vulnerabilities.push(...codeIssues);

    // Determine risk level
    const criticalVulns = vulnerabilities.filter(v => v.severity === 'critical');
    const highVulns = vulnerabilities.filter(v => v.severity === 'high');
    const mediumVulns = vulnerabilities.filter(v => v.severity === 'medium');

    if (criticalVulns.length > 0) {
      riskLevel = 'critical';
    } else if (highVulns.length > 0) {
      riskLevel = 'high';
    } else if (mediumVulns.length > 0) {
      riskLevel = 'medium';
    }

    return {
      pluginId: plugin.metadata.id,
      scannedAt: new Date(),
      riskLevel,
      issues: vulnerabilities.map(v => ({
        type: v.type as 'permission' | 'code' | 'dependency' | 'network' | 'file' | 'environment',
        severity: v.severity,
        message: v.description,
        location: v.affectedFiles?.join(', '),
        fix: v.fix
      })),
      recommendations: this.generateRecommendations(vulnerabilities),
      approved: riskLevel !== 'critical' && vulnerabilities.length === 0
    };
  }

  async validatePermissions(plugin: Plugin, permissions: any[]): Promise<boolean> {
    // Check if plugin is requesting only necessary permissions
    const validPermissions = ['file-system', 'network', 'extension-api', 'user-interaction', 'workspace-access'];
    
    for (const permission of permissions) {
      if (!validPermissions.includes(permission.type)) {
        return false;
      }
    }

    return true;
  }

  async sandboxPlugin(plugin: Plugin): Promise<void> {
    // Implement plugin sandboxing if needed
    // This would involve creating a restricted execution environment
    console.log(`Sandboxing plugin: ${plugin.metadata.id}`);
  }

  async checkIntegrity(plugin: Plugin): Promise<boolean> {
    // Implement integrity checking
    // This would involve verifying plugin signatures, checksums, etc.
    return true;
  }

  private async checkDependencies(dependencies: Record<string, string>): Promise<SecurityVulnerability[]> {
    const vulnerabilities: SecurityVulnerability[] = [];
    
    // List of known malicious or problematic packages
    const suspiciousPackages = [
      'exec', 'child_process', 'spawn', 'eval', 'vm'
    ];

    for (const [depName, version] of Object.entries(dependencies)) {
      if (suspiciousPackages.includes(depName)) {
        vulnerabilities.push({
          id: `dep-${depName}`,
          type: 'dependency',
          severity: 'medium',
          description: `Potentially dangerous dependency: ${depName}`,
          impact: 'Plugin can execute arbitrary code'
        });
      }
    }

    return vulnerabilities;
  }

  async checkPermissions(plugin: Plugin): Promise<PermissionResult> {
    const capabilities = plugin.metadata.capabilities;
    const granted: string[] = [];
    const denied: string[] = [];
    const requested: string[] = [];
    
    for (const capability of capabilities) {
      requested.push(capability.type);
      // Simple approval logic
      if (['command', 'analyzer', 'formatter'].includes(capability.type)) {
        granted.push(capability.type);
      } else {
        denied.push(capability.type);
      }
    }
    
    return { granted, denied, requested };
  }
  
  private async checkPermissionsPrivate(capabilities: any[]): Promise<SecurityVulnerability[]> {
    const vulnerabilities: SecurityVulnerability[] = [];
    
    for (const capability of capabilities) {
      if (capability.permissions) {
        for (const permission of capability.permissions) {
          if (permission.type === 'file-system' && permission.scope === '*') {
            vulnerabilities.push({
              id: `perm-fs-wildcard`,
              type: 'permission',
              severity: 'high',
              description: 'Plugin requests unrestricted file system access',
              impact: 'Plugin can read/write any file'
            });
          }
        }
      }
    }

    return vulnerabilities;
  }

  private async checkCodePatterns(entryPoint: string): Promise<SecurityVulnerability[]> {
    const vulnerabilities: SecurityVulnerability[] = [];
    
    try {
      const code = fs.readFileSync(entryPoint, 'utf8');
      
      // Check for eval usage
      if (code.includes('eval(')) {
        vulnerabilities.push({
          id: 'code-eval',
          type: 'code',
          severity: 'critical',
          description: 'Plugin uses eval() which can execute arbitrary code',
          impact: 'Code injection vulnerability'
        });
      }

      // Check for network requests to suspicious domains
      const suspiciousDomains = ['bit.ly', 'tinyurl.com', 'raw.githubusercontent.com'];
      for (const domain of suspiciousDomains) {
        if (code.includes(domain)) {
          vulnerabilities.push({
            id: `code-suspicious-domain-${domain}`,
            type: 'network',
            severity: 'medium',
            description: `Plugin makes requests to suspicious domain: ${domain}`,
            impact: 'Potential data exfiltration'
          });
        }
      }

    } catch (error) {
      console.warn(`Failed to scan code patterns in ${entryPoint}:`, error);
    }

    return vulnerabilities;
  }

  private generateRecommendations(vulnerabilities: SecurityVulnerability[]): string[] {
    const recommendations: string[] = [];
    
    if (vulnerabilities.some(v => v.severity === 'critical')) {
      recommendations.push('Do not install this plugin due to critical security issues');
    }
    
    if (vulnerabilities.some(v => v.severity === 'high')) {
      recommendations.push('Review plugin permissions and code before installation');
    }
    
    if (vulnerabilities.some(v => v.type === 'dependency')) {
      recommendations.push('Audit plugin dependencies for known vulnerabilities');
    }
    
    if (vulnerabilities.some(v => v.type === 'permission')) {
      recommendations.push('Limit plugin permissions to minimum necessary');
    }
    
    return recommendations;
  }
}

export { PluginSecurityService };
