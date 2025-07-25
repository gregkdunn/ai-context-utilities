/**
 * macOS Compatibility Layer
 * 
 * Handles BSD vs GNU tool differences, Homebrew detection,
 * and macOS-specific environment setup for reliable shell script execution.
 * 
 * @version 3.0.0
 */

import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { ConfigurationError, ValidationError } from '../errors/AIDebugErrors';

/**
 * macOS tool compatibility information
 */
interface ToolCompatibility {
    name: string;
    bsdVersion?: string;
    gnuVersion?: string;
    homebrewPath?: string;
    requiredForFeature: string;
    installCommand?: string;
}

/**
 * macOS environment information
 */
interface MacOSEnvironment {
    version: string;
    architecture: 'intel' | 'apple_silicon';
    homebrewPrefix: string;
    defaultShell: string;
    hasGnuTools: boolean;
    toolPaths: Map<string, string>;
}

/**
 * macOS compatibility layer for reliable tool execution
 */
export class MacOSCompatibility {
    private environment: MacOSEnvironment | null = null;
    private toolCompatibility: Map<string, ToolCompatibility> = new Map();

    constructor() {
        this.initializeToolCompatibility();
    }

    /**
     * Initialize known tool compatibility information
     */
    private initializeToolCompatibility(): void {
        const tools: ToolCompatibility[] = [
            {
                name: 'grep',
                bsdVersion: 'grep (BSD)',
                gnuVersion: 'grep (GNU)',
                homebrewPath: '/opt/homebrew/bin/ggrep',
                requiredForFeature: 'Advanced pattern matching in test detection',
                installCommand: 'brew install grep'
            },
            {
                name: 'sed',
                bsdVersion: 'sed (BSD)',
                gnuVersion: 'sed (GNU)', 
                homebrewPath: '/opt/homebrew/bin/gsed',
                requiredForFeature: 'Text processing in test output',
                installCommand: 'brew install gnu-sed'
            },
            {
                name: 'split',
                bsdVersion: 'split (BSD)',
                gnuVersion: 'split (GNU)',
                homebrewPath: '/opt/homebrew/bin/gsplit',
                requiredForFeature: 'Parallel test file distribution',
                installCommand: 'brew install coreutils'
            },
            {
                name: 'timeout',
                bsdVersion: undefined, // Not available in BSD
                gnuVersion: 'timeout (GNU)',
                homebrewPath: '/opt/homebrew/bin/gtimeout',
                requiredForFeature: 'Test execution timeouts',
                installCommand: 'brew install coreutils'
            },
            {
                name: 'xargs',
                bsdVersion: 'xargs (BSD)',
                gnuVersion: 'xargs (GNU)',
                homebrewPath: '/opt/homebrew/bin/gxargs',
                requiredForFeature: 'Parallel test execution',
                installCommand: 'brew install findutils'
            }
        ];

        for (const tool of tools) {
            this.toolCompatibility.set(tool.name, tool);
        }
    }

    /**
     * Detect and analyze macOS environment
     */
    async detectEnvironment(): Promise<MacOSEnvironment> {
        if (this.environment) {
            return this.environment;
        }

        try {
            // Detect macOS version
            const version = await this.getMacOSVersion();
            
            // Detect architecture
            const architecture = await this.getArchitecture();
            
            // Detect Homebrew prefix
            const homebrewPrefix = await this.getHomebrewPrefix();
            
            // Detect default shell
            const defaultShell = await this.getDefaultShell();
            
            // Check for GNU tools
            const hasGnuTools = await this.checkGnuToolsAvailable();
            
            // Map tool paths
            const toolPaths = await this.mapToolPaths(homebrewPrefix);

            this.environment = {
                version,
                architecture,
                homebrewPrefix,
                defaultShell,
                hasGnuTools,
                toolPaths
            };

            return this.environment;
        } catch (error) {
            throw new ConfigurationError(
                'MACOS_DETECTION',
                `Failed to detect macOS environment: ${error}`,
                { originalError: error }
            );
        }
    }

    /**
     * Get the appropriate command for a tool on macOS
     */
    async getCompatibleCommand(toolName: string): Promise<string> {
        const env = await this.detectEnvironment();
        const tool = this.toolCompatibility.get(toolName);

        if (!tool) {
            return toolName; // Unknown tool, return as-is
        }

        // Check if GNU version is available via Homebrew
        if (env.toolPaths.has(`g${toolName}`)) {
            return env.toolPaths.get(`g${toolName}`)!;
        }

        // Check if tool is available at Homebrew path
        if (tool.homebrewPath && fs.existsSync(tool.homebrewPath)) {
            return tool.homebrewPath;
        }

        // Fall back to system version (BSD)
        if (tool.bsdVersion) {
            return toolName;
        }

        // Tool not available - suggest installation
        throw new ConfigurationError(
            'MISSING_TOOL',
            `Required tool '${toolName}' not found on macOS`,
            {
                tool: toolName,
                requiredFor: tool.requiredForFeature,
                installCommand: tool.installCommand,
                homebrewPath: tool.homebrewPath
            }
        );
    }

    /**
     * Generate macOS-compatible script arguments
     */
    async adaptScriptArgs(toolName: string, args: string[]): Promise<string[]> {
        const tool = this.toolCompatibility.get(toolName);
        if (!tool) {
            return args; // Unknown tool, return args unchanged
        }

        const env = await this.detectEnvironment();
        const hasGnuVersion = Boolean(env.toolPaths.has(`g${toolName}`)) || 
                             Boolean(tool.homebrewPath && fs.existsSync(tool.homebrewPath));

        // Adapt arguments based on BSD vs GNU differences
        switch (toolName) {
            case 'grep':
                return this.adaptGrepArgs(args, hasGnuVersion);
            case 'sed':
                return this.adaptSedArgs(args, hasGnuVersion);
            case 'split':
                return this.adaptSplitArgs(args, hasGnuVersion);
            case 'xargs':
                return this.adaptXargsArgs(args, hasGnuVersion);
            default:
                return args;
        }
    }

    /**
     * Validate macOS environment for AI Debug Context
     */
    async validateEnvironment(): Promise<{ valid: boolean; issues: string[]; recommendations: string[] }> {
        const issues: string[] = [];
        const recommendations: string[] = [];

        try {
            const env = await this.detectEnvironment();

            // Check macOS version compatibility
            if (!this.isSupportedMacOSVersion(env.version)) {
                issues.push(`macOS ${env.version} may not be fully supported`);
                recommendations.push('Update to macOS 12.0+ for best compatibility');
            }

            // Check for Homebrew
            if (!env.homebrewPrefix) {
                issues.push('Homebrew not detected');
                recommendations.push('Install Homebrew: /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"');
            }

            // Check for essential tools
            const essentialTools = ['git', 'node', 'npm'];
            for (const tool of essentialTools) {
                if (!await this.isToolAvailable(tool)) {
                    issues.push(`Essential tool '${tool}' not found`);
                    recommendations.push(`Install ${tool} via Homebrew: brew install ${tool}`);
                }
            }

            // Check for GNU tools (nice to have)
            if (!env.hasGnuTools) {
                recommendations.push('Install GNU tools for better compatibility: brew install coreutils findutils gnu-sed grep');
            }

            return {
                valid: issues.length === 0,
                issues,
                recommendations
            };
        } catch (error) {
            return {
                valid: false,
                issues: [`Environment detection failed: ${error}`],
                recommendations: ['Please check macOS system configuration']
            };
        }
    }

    /**
     * Create auto-setup script for macOS
     */
    async generateSetupScript(): Promise<string> {
        const env = await this.detectEnvironment();

        const script = `#!/bin/bash
# AI Debug Context macOS Auto-Setup Script
# Generated for ${env.architecture} macOS ${env.version}

set -e

echo "🍎 Setting up AI Debug Context for macOS..."

# Check for Homebrew
if ! command -v brew &> /dev/null; then
    echo "📦 Installing Homebrew..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    
    # Add Homebrew to PATH for Apple Silicon Macs
    if [[ "$(uname -m)" == "arm64" ]]; then
        echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
        eval "$(/opt/homebrew/bin/brew shellenv)"
    fi
fi

# Install essential tools
echo "🔧 Installing essential tools..."
brew install git node npm

# Install GNU tools for better compatibility
echo "⚙️ Installing GNU tools..."
brew install coreutils findutils gnu-sed grep

# Verify Jest is available
echo "🧪 Checking Jest installation..."
if ! command -v jest &> /dev/null && ! npx jest --version &> /dev/null 2>&1; then
    echo "⚠️ Jest not found. Please install Jest in your project:"
    echo "  npm install --save-dev jest"
fi

# Set up permissions for scripts
echo "🔐 Setting up script permissions..."
SCRIPT_DIR="$HOME/.vscode/extensions/*/scripts"
if [ -d "$SCRIPT_DIR" ]; then
    chmod +x "$SCRIPT_DIR"/* 2>/dev/null || true
fi

echo "✅ macOS setup complete!"
echo "🚀 Run 'AI Debug Context: Run Affected Tests' to get started"
`;

        return script;
    }

    // Private helper methods

    private async getMacOSVersion(): Promise<string> {
        return new Promise((resolve, reject) => {
            const process = spawn('sw_vers', ['-productVersion']);
            let output = '';

            process.stdout.on('data', (data) => {
                output += data.toString();
            });

            process.on('close', (code) => {
                if (code === 0) {
                    resolve(output.trim());
                } else {
                    reject(new Error('Failed to get macOS version'));
                }
            });

            process.on('error', reject);
        });
    }

    private async getArchitecture(): Promise<'intel' | 'apple_silicon'> {
        return new Promise((resolve, reject) => {
            const process = spawn('uname', ['-m']);
            let output = '';

            process.stdout.on('data', (data) => {
                output += data.toString();
            });

            process.on('close', (code) => {
                if (code === 0) {
                    const arch = output.trim();
                    resolve(arch === 'arm64' ? 'apple_silicon' : 'intel');
                } else {
                    reject(new Error('Failed to get architecture'));
                }
            });

            process.on('error', reject);
        });
    }

    private async getHomebrewPrefix(): Promise<string> {
        // Check common Homebrew paths
        const paths = ['/opt/homebrew', '/usr/local'];
        
        for (const path of paths) {
            if (fs.existsSync(`${path}/bin/brew`)) {
                return path;
            }
        }

        // Try to get from brew command
        return new Promise((resolve) => {
            const process = spawn('brew', ['--prefix']);
            let output = '';

            process.stdout.on('data', (data) => {
                output += data.toString();
            });

            process.on('close', () => {
                resolve(output.trim() || '');
            });

            process.on('error', () => {
                resolve(''); // Homebrew not available
            });
        });
    }

    private async getDefaultShell(): Promise<string> {
        return process.env.SHELL || '/bin/zsh';
    }

    private async checkGnuToolsAvailable(): Promise<boolean> {
        const gnuTools = ['ggrep', 'gsed', 'gsplit', 'gtimeout'];
        
        for (const tool of gnuTools) {
            if (await this.isToolAvailable(tool)) {
                return true;
            }
        }
        
        return false;
    }

    private async mapToolPaths(homebrewPrefix: string): Promise<Map<string, string>> {
        const toolPaths = new Map<string, string>();
        
        if (!homebrewPrefix) {
            return toolPaths;
        }

        const gnuTools = ['ggrep', 'gsed', 'gsplit', 'gtimeout', 'gxargs'];
        
        for (const tool of gnuTools) {
            const toolPath = path.join(homebrewPrefix, 'bin', tool);
            if (fs.existsSync(toolPath)) {
                toolPaths.set(tool, toolPath);
            }
        }

        return toolPaths;
    }

    private async isToolAvailable(toolName: string): Promise<boolean> {
        return new Promise((resolve) => {
            const process = spawn('which', [toolName]);
            
            process.on('close', (code) => {
                resolve(code === 0);
            });

            process.on('error', () => {
                resolve(false);
            });
        });
    }

    private isSupportedMacOSVersion(version: string): boolean {
        const [major, minor] = version.split('.').map(Number);
        // Support macOS 12.0+ (Monterey and later)
        return major >= 12;
    }

    // Tool-specific argument adaptation methods

    private adaptGrepArgs(args: string[], hasGnuVersion: boolean): string[] {
        if (!hasGnuVersion) {
            // Remove GNU-specific flags for BSD grep
            return args.filter(arg => arg !== '-P'); // Perl regex not supported
        }
        return args;
    }

    private adaptSedArgs(args: string[], hasGnuVersion: boolean): string[] {
        if (!hasGnuVersion) {
            // BSD sed requires different syntax for in-place editing
            const adaptedArgs = [];
            for (let i = 0; i < args.length; i++) {
                if (args[i] === '-i' && i + 1 < args.length) {
                    // BSD sed requires -i '' for in-place editing
                    adaptedArgs.push('-i', '');
                } else {
                    adaptedArgs.push(args[i]);
                }
            }
            return adaptedArgs;
        }
        return args;
    }

    private adaptSplitArgs(args: string[], hasGnuVersion: boolean): string[] {
        if (!hasGnuVersion) {
            // BSD split doesn't support -n flag, use -l instead
            const adaptedArgs = [];
            for (let i = 0; i < args.length; i++) {
                if (args[i] === '-n' && i + 1 < args.length) {
                    // Convert -n 4 to -l <calculated lines per chunk>
                    adaptedArgs.push('-l', '1000'); // Default chunk size
                    i++; // Skip the number argument
                } else {
                    adaptedArgs.push(args[i]);
                }
            }
            return adaptedArgs;
        }
        return args;
    }

    private adaptXargsArgs(args: string[], hasGnuVersion: boolean): string[] {
        if (!hasGnuVersion) {
            // BSD xargs has different default behavior for -I
            return args.map(arg => {
                if (arg === '-I{}') {
                    return '-I {}'; // BSD requires space
                }
                return arg;
            });
        }
        return args;
    }
}