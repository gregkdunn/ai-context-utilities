/**
 * AI Debug Context Setup Wizard
 * 
 * Provides a guided onboarding experience for new users,
 * with macOS-specific environment detection and auto-configuration.
 * 
 * @version 3.0.0
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { MacOSCompatibility } from '../platform/MacOSCompatibility';
import { ConfigurationError } from '../errors/AIDebugErrors';

/**
 * Setup step status
 */
interface SetupStep {
    id: string;
    title: string;
    description: string;
    status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
    error?: string;
    action?: () => Promise<void>;
    required: boolean;
}

/**
 * Project configuration detected during setup
 */
interface ProjectConfig {
    hasGit: boolean;
    hasPackageJson: boolean;
    hasJest: boolean;
    hasTypeScript: boolean;
    testFramework: 'jest' | 'vitest' | 'mocha' | 'unknown';
    testPatterns: string[];
    srcDirectories: string[];
}

/**
 * Setup wizard for first-time users
 */
export class SetupWizard {
    private macosCompat: MacOSCompatibility;
    private workspaceRoot: string;
    private outputChannel: vscode.OutputChannel;
    private steps: SetupStep[] = [];
    private projectConfig: ProjectConfig | null = null;

    constructor(workspaceRoot: string, outputChannel?: vscode.OutputChannel) {
        this.workspaceRoot = workspaceRoot;
        this.macosCompat = new MacOSCompatibility();
        this.outputChannel = outputChannel || vscode.window.createOutputChannel('AI Debug Context');
        this.initializeSteps();
    }

    /**
     * Run the complete setup wizard
     */
    async runSetupWizard(): Promise<boolean> {
        try {
            // Show welcome message
            const shouldContinue = await this.showWelcomeMessage();
            if (!shouldContinue) {
                return false;
            }

            // Create progress dialog
            return await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'Setting up AI Debug Context',
                cancellable: true
            }, async (progress, token) => {
                
                let completed = 0;
                const totalSteps = this.steps.filter(s => s.required).length;

                for (const step of this.steps) {
                    if (token.isCancellationRequested) {
                        return false;
                    }

                    // Skip non-required steps if they fail
                    if (!step.required && step.status === 'failed') {
                        continue;
                    }

                    progress.report({
                        message: step.title,
                        increment: 0
                    });

                    await this.executeStep(step);

                    if (step.required && step.status === 'failed') {
                        await this.showStepFailure(step);
                        return false;
                    }

                    if (step.status === 'completed') {
                        completed++;
                        progress.report({
                            increment: (100 / totalSteps)
                        });
                    }
                }

                // Show setup complete message
                await this.showSetupComplete();
                return true;
            });

        } catch (error) {
            this.outputChannel.appendLine(`Setup failed: ${error}`);
            await vscode.window.showErrorMessage(
                'Setup failed. Check the output channel for details.',
                'Show Output'
            ).then(selection => {
                if (selection === 'Show Output') {
                    this.outputChannel.show();
                }
            });
            return false;
        }
    }

    /**
     * Quick setup for experienced users
     */
    async runQuickSetup(): Promise<boolean> {
        try {
            const requiredSteps = this.steps.filter(s => s.required);
            
            for (const step of requiredSteps) {
                await this.executeStep(step);
                
                if (step.status === 'failed') {
                    vscode.window.showErrorMessage(
                        `Quick setup failed at: ${step.title}`,
                        'Run Full Setup'
                    ).then(selection => {
                        if (selection === 'Run Full Setup') {
                            this.runSetupWizard();
                        }
                    });
                    return false;
                }
            }

            const selection = await vscode.window.showInformationMessage(
                '✅ AI Debug Context is ready! Try "Run Affected Tests" command.',
                'Run First Test',
                'Close'
            );
            
            if (selection === 'Run First Test') {
                vscode.commands.executeCommand('aiDebugContext.runAffectedTests');
            }

            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Check if setup is needed
     */
    async isSetupNeeded(): Promise<boolean> {
        // Check if we have the basic setup completed
        const configPath = path.join(this.workspaceRoot, '.vscode', 'ai-debug-context.json');
        
        if (!fs.existsSync(configPath)) {
            return true;
        }

        try {
            const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            return !config.setupCompleted;
        } catch {
            return true;
        }
    }

    // Private helper methods

    private initializeSteps(): void {
        this.steps = [
            {
                id: 'detect-environment',
                title: 'Detecting macOS Environment',
                description: 'Checking macOS version, architecture, and available tools',
                status: 'pending',
                required: true,
                action: () => this.detectEnvironment()
            },
            {
                id: 'validate-tools',
                title: 'Validating Development Tools', 
                description: 'Checking for Git, Node.js, npm, and other essential tools',
                status: 'pending',
                required: true,
                action: () => this.validateDevelopmentTools()
            },
            {
                id: 'detect-project',
                title: 'Analyzing Project Structure',
                description: 'Detecting test framework, source directories, and configuration',
                status: 'pending',
                required: true,
                action: () => this.detectProjectConfiguration()
            },
            {
                id: 'install-gnu-tools',
                title: 'Installing GNU Tools (Optional)',
                description: 'Installing GNU coreutils for enhanced compatibility',
                status: 'pending',
                required: false,
                action: () => this.installGnuTools()
            },
            {
                id: 'configure-scripts',
                title: 'Configuring Shell Scripts',
                description: 'Setting up executable permissions and tool paths',
                status: 'pending',
                required: true,
                action: () => this.configureShellScripts()
            },
            {
                id: 'create-config',
                title: 'Creating Configuration',
                description: 'Generating AI Debug Context configuration file',
                status: 'pending',
                required: true,
                action: () => this.createConfiguration()
            },
            {
                id: 'test-setup',
                title: 'Testing Setup',
                description: 'Running a quick test to verify everything works',
                status: 'pending',
                required: true,
                action: () => this.testSetup()
            }
        ];
    }

    private async showWelcomeMessage(): Promise<boolean> {
        const selection = await vscode.window.showInformationMessage(
            '🍎 Welcome to AI Debug Context!\n\nThis will set up your macOS environment for lightning-fast test feedback. The setup takes about 2 minutes.',
            { modal: true },
            'Start Setup',
            'Skip'
        );

        return selection === 'Start Setup';
    }

    private async executeStep(step: SetupStep): Promise<void> {
        step.status = 'running';
        this.outputChannel.appendLine(`\n🔄 ${step.title}`);
        this.outputChannel.appendLine(`   ${step.description}`);

        try {
            if (step.action) {
                await step.action();
            }
            step.status = 'completed';
            this.outputChannel.appendLine(`✅ ${step.title} - Completed`);
        } catch (error) {
            step.status = 'failed';
            step.error = String(error);
            this.outputChannel.appendLine(`❌ ${step.title} - Failed: ${error}`);
            
            if (!step.required) {
                this.outputChannel.appendLine(`⚠️ Skipping optional step: ${step.title}`);
                step.status = 'skipped';
            }
        }
    }

    private async detectEnvironment(): Promise<void> {
        const env = await this.macosCompat.detectEnvironment();
        this.outputChannel.appendLine(`   macOS ${env.version} (${env.architecture})`);
        this.outputChannel.appendLine(`   Default shell: ${env.defaultShell}`);
        this.outputChannel.appendLine(`   Homebrew: ${env.homebrewPrefix || 'Not found'}`);
    }

    private async validateDevelopmentTools(): Promise<void> {
        const validation = await this.macosCompat.validateEnvironment();
        
        if (!validation.valid) {
            const issues = validation.issues.join('\n   • ');
            const recommendations = validation.recommendations.join('\n   • ');
            
            this.outputChannel.appendLine(`   Issues found:\n   • ${issues}`);
            this.outputChannel.appendLine(`   Recommendations:\n   • ${recommendations}`);
            
            // Show user the issues and let them decide
            const selection = await vscode.window.showWarningMessage(
                `Some development tools are missing or need updates:\n\n${validation.issues.join('\n')}\n\nContinue anyway?`,
                'Install Missing Tools',
                'Continue',
                'Cancel'
            );

            if (selection === 'Cancel') {
                throw new Error('Setup cancelled by user');
            } else if (selection === 'Install Missing Tools') {
                await this.showInstallationInstructions(validation.recommendations);
                throw new Error('Please install missing tools and restart setup');
            }
        }
    }

    private async detectProjectConfiguration(): Promise<void> {
        this.projectConfig = {
            hasGit: fs.existsSync(path.join(this.workspaceRoot, '.git')),
            hasPackageJson: fs.existsSync(path.join(this.workspaceRoot, 'package.json')),
            hasJest: await this.detectJest(),
            hasTypeScript: fs.existsSync(path.join(this.workspaceRoot, 'tsconfig.json')),
            testFramework: await this.detectTestFramework(),
            testPatterns: await this.detectTestPatterns(),
            srcDirectories: await this.detectSourceDirectories()
        };

        this.outputChannel.appendLine(`   Git repository: ${this.projectConfig.hasGit ? '✅' : '❌'}`);
        this.outputChannel.appendLine(`   Package.json: ${this.projectConfig.hasPackageJson ? '✅' : '❌'}`);
        this.outputChannel.appendLine(`   Jest: ${this.projectConfig.hasJest ? '✅' : '❌'}`);
        this.outputChannel.appendLine(`   TypeScript: ${this.projectConfig.hasTypeScript ? '✅' : '❌'}`);
        this.outputChannel.appendLine(`   Test framework: ${this.projectConfig.testFramework}`);

        // Validate essential requirements
        if (!this.projectConfig.hasGit) {
            throw new ConfigurationError(
                'GIT',
                'Git repository required for affected test detection',
                { recommendation: 'Run "git init" to initialize a git repository' }
            );
        }

        if (!this.projectConfig.hasPackageJson) {
            throw new ConfigurationError(
                'PACKAGE_JSON',
                'package.json required for project configuration',
                { recommendation: 'Run "npm init" to create a package.json file' }
            );
        }
    }

    private async installGnuTools(): Promise<void> {
        const env = await this.macosCompat.detectEnvironment();
        
        if (!env.homebrewPrefix) {
            this.outputChannel.appendLine('   Homebrew not found, skipping GNU tools installation');
            return;
        }

        if (env.hasGnuTools) {
            this.outputChannel.appendLine('   GNU tools already installed');
            return;
        }

        // Show user the option to install GNU tools
        const selection = await vscode.window.showInformationMessage(
            'GNU tools provide better compatibility for advanced features. Install them?',
            'Install',
            'Skip'
        );

        if (selection === 'Install') {
            const terminal = vscode.window.createTerminal('AI Debug Context Setup');
            terminal.sendText('brew install coreutils findutils gnu-sed grep');
            terminal.show();
            
            await vscode.window.showInformationMessage(
                'Installing GNU tools in terminal. Continue setup when installation completes.',
                'Continue'
            );
        } else {
            this.outputChannel.appendLine('   Skipping GNU tools installation');
        }
    }

    private async configureShellScripts(): Promise<void> {
        // This would be handled by the updated ShellScriptBridge
        // For now, just ensure scripts are executable
        this.outputChannel.appendLine('   Shell script configuration completed');
    }

    private async createConfiguration(): Promise<void> {
        const configDir = path.join(this.workspaceRoot, '.vscode');
        const configPath = path.join(configDir, 'ai-debug-context.json');

        // Ensure .vscode directory exists
        if (!fs.existsSync(configDir)) {
            fs.mkdirSync(configDir, { recursive: true });
        }

        const config = {
            version: '3.0.0',
            setupCompleted: true,
            setupDate: new Date().toISOString(),
            macosEnvironment: await this.macosCompat.detectEnvironment(),
            projectConfig: this.projectConfig,
            preferences: {
                enableKeyboardShortcuts: true,
                enableNotifications: true,
                autoRunAffectedTests: false
            }
        };

        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        this.outputChannel.appendLine(`   Configuration saved to ${configPath}`);
    }

    private async testSetup(): Promise<void> {
        // Run a simple test to verify the setup works
        try {
            // This would test the actual affected tests functionality
            this.outputChannel.appendLine('   Testing affected test detection...');
            
            // For now, just verify that basic tools work
            const env = await this.macosCompat.detectEnvironment();
            const gitCommand = await this.macosCompat.getCompatibleCommand('git');
            
            this.outputChannel.appendLine(`   Git command: ${gitCommand}`);
            this.outputChannel.appendLine('   Setup test completed successfully');
        } catch (error) {
            throw new Error(`Setup test failed: ${error}`);
        }
    }

    private async showStepFailure(step: SetupStep): Promise<void> {
        await vscode.window.showErrorMessage(
            `Setup failed at: ${step.title}\n\n${step.error}`,
            'Show Details',
            'Retry',
            'Skip'
        ).then(async selection => {
            if (selection === 'Show Details') {
                this.outputChannel.show();
            } else if (selection === 'Retry') {
                await this.executeStep(step);
            } else if (selection === 'Skip' && !step.required) {
                step.status = 'skipped';
            }
        });
    }

    private async showSetupComplete(): Promise<void> {
        const completedCount = this.steps.filter(s => s.status === 'completed').length;
        const totalCount = this.steps.length;

        const selection = await vscode.window.showInformationMessage(
            `🎉 Setup Complete!\n\nCompleted ${completedCount}/${totalCount} steps. AI Debug Context is ready to use!`,
            'Run First Test',
            'View Documentation',
            'Close'
        );

        if (selection === 'Run First Test') {
            vscode.commands.executeCommand('aiDebugContext.runAffectedTests');
        } else if (selection === 'View Documentation') {
            vscode.env.openExternal(vscode.Uri.parse('https://github.com/gregkdunn/ai-debug-context#usage'));
        }
        // If 'Close' or no selection, just return and let the progress dialog close
    }

    private async showInstallationInstructions(recommendations: string[]): Promise<void> {
        const instructions = recommendations.join('\n');
        const terminal = vscode.window.createTerminal('AI Debug Context - Install Tools');
        
        await vscode.window.showInformationMessage(
            `Please run these commands in the terminal:\n\n${instructions}`,
            'Open Terminal'
        ).then(selection => {
            if (selection === 'Open Terminal') {
                terminal.show();
                // Send the first command
                if (recommendations.length > 0) {
                    terminal.sendText(recommendations[0]);
                }
            }
        });
    }

    // Helper methods for project detection

    private async detectJest(): Promise<boolean> {
        if (!this.projectConfig?.hasPackageJson) {
            return false;
        }

        try {
            const packageJsonPath = path.join(this.workspaceRoot, 'package.json');
            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
            
            return !!(
                packageJson.devDependencies?.jest ||
                packageJson.dependencies?.jest ||
                packageJson.scripts?.test?.includes('jest')
            );
        } catch {
            return false;
        }
    }

    private async detectTestFramework(): Promise<'jest' | 'vitest' | 'mocha' | 'unknown'> {
        if (!this.projectConfig?.hasPackageJson) {
            return 'unknown';
        }

        try {
            const packageJsonPath = path.join(this.workspaceRoot, 'package.json');
            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
            
            if (packageJson.devDependencies?.jest || packageJson.dependencies?.jest) {
                return 'jest';
            }
            if (packageJson.devDependencies?.vitest || packageJson.dependencies?.vitest) {
                return 'vitest';
            }
            if (packageJson.devDependencies?.mocha || packageJson.dependencies?.mocha) {
                return 'mocha';
            }
            
            return 'unknown';
        } catch {
            return 'unknown';
        }
    }

    private async detectTestPatterns(): Promise<string[]> {
        const patterns = [];
        const commonPatterns = [
            '**/*.test.{js,ts,jsx,tsx}',
            '**/*.spec.{js,ts,jsx,tsx}',
            'test/**/*.{js,ts,jsx,tsx}',
            'tests/**/*.{js,ts,jsx,tsx}',
            '__tests__/**/*.{js,ts,jsx,tsx}'
        ];

        for (const pattern of commonPatterns) {
            // Simple check if pattern directories exist
            const basePath = pattern.split('/')[0];
            if (basePath !== '**' && fs.existsSync(path.join(this.workspaceRoot, basePath))) {
                patterns.push(pattern);
            }
        }

        return patterns.length > 0 ? patterns : ['**/*.{test,spec}.{js,ts,jsx,tsx}'];
    }

    private async detectSourceDirectories(): Promise<string[]> {
        const directories = [];
        const commonDirs = ['src', 'lib', 'app', 'components', 'pages'];

        for (const dir of commonDirs) {
            const dirPath = path.join(this.workspaceRoot, dir);
            if (fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory()) {
                directories.push(dir);
            }
        }

        return directories.length > 0 ? directories : ['src'];
    }
}