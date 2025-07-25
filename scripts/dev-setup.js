#!/usr/bin/env node

/**
 * One-Click Developer Setup Script
 * Sets up the development environment for AI Debug Context V3
 * Part of Phase 1.9.3 - Complete Service Architecture
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');
const os = require('os');

class DevSetup {
    constructor() {
        this.projectRoot = path.resolve(__dirname, '..');
        this.packageJsonPath = path.join(this.projectRoot, 'package.json');
        this.hasErrors = false;
        
        console.log('🚀 AI Debug Context V3 - Development Setup');
        console.log('============================================\n');
    }

    /**
     * Run the complete setup process
     */
    async run() {
        try {
            await this.checkPrerequisites();
            await this.installDependencies();
            await this.runInitialBuild();
            await this.runTests();
            await this.setupVSCode();
            await this.createDevConfig();
            this.showCompletion();
        } catch (error) {
            console.error('❌ Setup failed:', error.message);
            process.exit(1);
        }
    }

    /**
     * Check system prerequisites
     */
    async checkPrerequisites() {
        console.log('🔍 Checking prerequisites...\n');
        
        // Check Node.js version
        const nodeVersion = process.version;
        const majorVersion = parseInt(nodeVersion.substring(1).split('.')[0]);
        
        if (majorVersion < 16) {
            throw new Error(`Node.js 16+ required, found ${nodeVersion}`);
        }
        
        console.log(`✅ Node.js ${nodeVersion}`);

        // Check npm
        try {
            const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
            console.log(`✅ npm ${npmVersion}`);
        } catch (error) {
            throw new Error('npm not found. Please install Node.js with npm.');
        }

        // Check TypeScript
        try {
            const tscVersion = execSync('npx tsc --version', { encoding: 'utf8' }).trim();
            console.log(`✅ ${tscVersion}`);
        } catch (error) {
            console.log('⚠️  TypeScript not found - will install locally');
        }

        // Check VS Code
        try {
            execSync('code --version', { stdio: 'ignore' });
            console.log('✅ VS Code detected');
        } catch (error) {
            console.log('⚠️  VS Code not in PATH - manual extension testing needed');
        }

        // Check git
        try {
            const gitVersion = execSync('git --version', { encoding: 'utf8' }).trim();
            console.log(`✅ ${gitVersion}`);
        } catch (error) {
            console.log('⚠️  Git not found - version control features limited');
        }

        console.log();
    }

    /**
     * Install project dependencies
     */
    async installDependencies() {
        console.log('📦 Installing dependencies...\n');
        
        if (!fs.existsSync(this.packageJsonPath)) {
            throw new Error('package.json not found. Are you in the correct directory?');
        }

        try {
            console.log('Installing npm dependencies...');
            execSync('npm ci', { 
                cwd: this.projectRoot, 
                stdio: 'inherit',
                timeout: 300000 // 5 minutes
            });
            console.log('✅ Dependencies installed\n');
        } catch (error) {
            throw new Error('Failed to install dependencies. Check npm configuration.');
        }
    }

    /**
     * Run initial build
     */
    async runInitialBuild() {
        console.log('🔨 Building project...\n');
        
        try {
            console.log('Compiling TypeScript...');
            execSync('npm run compile', { 
                cwd: this.projectRoot, 
                stdio: 'inherit' 
            });
            console.log('✅ Build successful\n');
        } catch (error) {
            console.log('❌ Build failed - continuing with setup\n');
            this.hasErrors = true;
        }
    }

    /**
     * Run test suite
     */
    async runTests() {
        console.log('🧪 Running test suite...\n');
        
        try {
            console.log('Running unit and integration tests...');
            execSync('npm test', { 
                cwd: this.projectRoot, 
                stdio: 'inherit',
                timeout: 120000 // 2 minutes
            });
            console.log('✅ All tests passed\n');
        } catch (error) {
            console.log('❌ Some tests failed - check test output above\n');
            this.hasErrors = true;
        }
    }

    /**
     * Setup VS Code workspace
     */
    async setupVSCode() {
        console.log('🔧 Setting up VS Code workspace...\n');
        
        const vscodeDir = path.join(this.projectRoot, '.vscode');
        
        // Create .vscode directory if it doesn't exist
        if (!fs.existsSync(vscodeDir)) {
            fs.mkdirSync(vscodeDir);
        }

        // Create launch.json for debugging
        const launchConfig = {
            version: "0.2.0",
            configurations: [
                {
                    name: "Run Extension",
                    type: "extensionHost",
                    request: "launch",
                    args: ["--extensionDevelopmentPath=${workspaceFolder}"],
                    outFiles: ["${workspaceFolder}/out/**/*.js"],
                    preLaunchTask: "${workspaceFolder}/npm: compile"
                },
                {
                    name: "Extension Tests",
                    type: "extensionHost",
                    request: "launch",
                    args: [
                        "--extensionDevelopmentPath=${workspaceFolder}",
                        "--extensionTestsPath=${workspaceFolder}/out/test/suite/index"
                    ],
                    outFiles: ["${workspaceFolder}/out/test/**/*.js"],
                    preLaunchTask: "${workspaceFolder}/npm: compile"
                }
            ]
        };

        const launchPath = path.join(vscodeDir, 'launch.json');
        if (!fs.existsSync(launchPath)) {
            fs.writeFileSync(launchPath, JSON.stringify(launchConfig, null, 2));
            console.log('✅ Created .vscode/launch.json');
        } else {
            console.log('✅ .vscode/launch.json already exists');
        }

        // Create tasks.json
        const tasksConfig = {
            version: "2.0.0",
            tasks: [
                {
                    type: "npm",
                    script: "compile",
                    group: "build",
                    presentation: {
                        panel: "dedicated",
                        reveal: "never"
                    },
                    problemMatcher: ["$tsc"]
                },
                {
                    type: "npm", 
                    script: "test",
                    group: "test"
                }
            ]
        };

        const tasksPath = path.join(vscodeDir, 'tasks.json');
        if (!fs.existsSync(tasksPath)) {
            fs.writeFileSync(tasksPath, JSON.stringify(tasksConfig, null, 2));
            console.log('✅ Created .vscode/tasks.json');
        } else {
            console.log('✅ .vscode/tasks.json already exists');
        }

        // Create settings.json with recommended settings
        const settingsConfig = {
            "typescript.preferences.includePackageJsonAutoImports": "on",
            "typescript.suggest.autoImports": true,
            "editor.formatOnSave": true,
            "editor.codeActionsOnSave": {
                "source.organizeImports": true
            },
            "files.exclude": {
                "**/node_modules": true,
                "**/out": true,
                "**/.git": true
            },
            "search.exclude": {
                "**/node_modules": true,
                "**/out": true
            }
        };

        const settingsPath = path.join(vscodeDir, 'settings.json');
        if (!fs.existsSync(settingsPath)) {
            fs.writeFileSync(settingsPath, JSON.stringify(settingsConfig, null, 2));
            console.log('✅ Created .vscode/settings.json');
        } else {
            console.log('✅ .vscode/settings.json already exists');
        }

        console.log();
    }

    /**
     * Create development configuration
     */
    async createDevConfig() {
        console.log('⚙️  Creating development configuration...\n');
        
        const devConfigPath = path.join(this.projectRoot, '.aiDebugContext.dev.yml');
        
        if (!fs.existsSync(devConfigPath)) {
            const devConfig = `# AI Debug Context V3 - Development Configuration
# This file is used for local development and testing

framework: 'Development'
testCommand: 'npm test'

# Performance settings optimized for development
performance:
  cacheTimeout: 5        # Short cache for rapid development
  backgroundDiscovery: true
  enableAnalytics: true
  enableDebugLogs: true

# Development projects for testing
projects:
  - name: 'ai-debug-context'
    testCommand: 'npm test'
    type: 'extension'
  - name: 'unit-tests'
    testCommand: 'npm run test:unit'
    type: 'test-suite'
  - name: 'integration-tests' 
    testCommand: 'npm run test:integration'
    type: 'test-suite'

# Development settings
development:
  watchMode: true
  hotReload: true
  verboseLogging: true
  mockExternalServices: true
`;

            fs.writeFileSync(devConfigPath, devConfig);
            console.log('✅ Created .aiDebugContext.dev.yml');
        } else {
            console.log('✅ .aiDebugContext.dev.yml already exists');
        }

        console.log();
    }

    /**
     * Show completion message with next steps
     */
    showCompletion() {
        console.log('🎉 Development setup complete!\n');
        
        if (this.hasErrors) {
            console.log('⚠️  Setup completed with some warnings - check output above\n');
        }

        console.log('📋 Next Steps:');
        console.log('=============\n');
        
        console.log('1. 🚀 Start Development:');
        console.log('   • Open VS Code: `code .`');
        console.log('   • Press F5 to launch extension in debug mode');
        console.log('   • Or run: `npm run compile && npm run test`\n');
        
        console.log('2. 🧪 Testing:');
        console.log('   • Run all tests: `npm test`');
        console.log('   • Run unit tests: `npm run test:unit`');
        console.log('   • Run integration tests: `npm run test:integration`');
        console.log('   • Watch mode: `npm run test:watch`\n');
        
        console.log('3. 📦 Building:');
        console.log('   • Compile TypeScript: `npm run compile`');
        console.log('   • Watch mode: `npm run watch`');
        console.log('   • Package extension: `npm run package`\n');
        
        console.log('4. 📖 Documentation:');
        console.log('   • Read README.md for feature overview');
        console.log('   • Check ARCHITECTURE.md for technical details');
        console.log('   • View src/__tests__/ for testing examples\n');
        
        console.log('5. 🔧 Extension Development:');
        console.log('   • Test in workspace with project.json files');
        console.log('   • Use Command Palette: "AI Debug Context: Run Tests"');
        console.log('   • Check VS Code Output → "AI Debug Context" for logs\n');
        
        console.log('6. 🐛 Troubleshooting:');
        console.log('   • Build issues: `npm run clean && npm run compile`');
        console.log('   • Test failures: Check test output and fix failing tests');
        console.log('   • Extension issues: Reload VS Code window\n');
        
        console.log('🏗️  Architecture Highlights:');
        console.log('   • Service Container with Dependency Injection');
        console.log('   • Performance Monitoring & Analytics');
        console.log('   • Smart Framework Detection (Angular, React, Vue+)');
        console.log('   • Background Project Discovery');
        console.log('   • Comprehensive Test Suite (~50% coverage)\n');
        
        console.log('Happy coding! 🎯');
    }
}

// Run setup if called directly
if (require.main === module) {
    const setup = new DevSetup();
    setup.run().catch(error => {
        console.error('Setup failed:', error);
        process.exit(1);
    });
}

module.exports = DevSetup;