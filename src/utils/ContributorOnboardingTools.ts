/**
 * Contributor Onboarding Tools
 * Automated setup and guidance for new contributors
 * Phase 2.0.2 - Better contributor experience
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export interface OnboardingStep {
    id: string;
    title: string;
    description: string;
    isCompleted: () => Promise<boolean>;
    autoFix?: () => Promise<void>;
    manualInstructions?: string[];
    documentation?: string;
}

export interface DevelopmentEnvironment {
    nodeVersion: string;
    npmVersion: string;
    hasTypeScript: boolean;
    hasJest: boolean;
    hasEslint: boolean;
    hasVsCodeExtensions: string[];
    workspaceConfig: boolean;
}

export interface OnboardingProgress {
    completedSteps: string[];
    totalSteps: number;
    completionPercentage: number;
    nextSteps: string[];
    blockers: string[];
}

/**
 * Tools to help new contributors get started quickly
 */
export class ContributorOnboardingTools {
    private onboardingSteps: OnboardingStep[] = [];

    constructor(
        private outputChannel: vscode.OutputChannel,
        private workspaceRoot: string
    ) {
        this.initializeOnboardingSteps();
    }

    /**
     * Initialize all onboarding steps
     */
    private initializeOnboardingSteps(): void {
        this.onboardingSteps = [
            {
                id: 'node_version',
                title: 'Node.js Version Check',
                description: 'Verify Node.js 18+ is installed',
                isCompleted: async () => {
                    try {
                        const version = process.version;
                        const majorVersion = parseInt(version.slice(1).split('.')[0]);
                        return majorVersion >= 18;
                    } catch {
                        return false;
                    }
                },
                manualInstructions: [
                    'Install Node.js 18 or later from https://nodejs.org',
                    'Restart VS Code after installation',
                    'Verify installation: node --version'
                ],
                documentation: 'https://nodejs.org/en/download/'
            },
            {
                id: 'dependencies_installed',
                title: 'Dependencies Installation',
                description: 'Install all project dependencies',
                isCompleted: async () => {
                    const nodeModulesPath = path.join(this.workspaceRoot, 'node_modules');
                    return fs.existsSync(nodeModulesPath);
                },
                autoFix: async () => {
                    const terminal = vscode.window.createTerminal('Install Dependencies');
                    terminal.sendText('npm install');
                    terminal.show();
                },
                manualInstructions: [
                    'Run: npm install',
                    'Wait for installation to complete',
                    'Check for any error messages'
                ]
            },
            {
                id: 'typescript_compile',
                title: 'TypeScript Compilation',
                description: 'Verify TypeScript code compiles without errors',
                isCompleted: async () => {
                    try {
                        // Check if there are any TypeScript compilation errors
                        const diagnostics = vscode.languages.getDiagnostics();
                        const tsErrors = diagnostics.some(([uri, diags]) => 
                            uri.fsPath.includes(this.workspaceRoot) && 
                            diags.some(d => d.severity === vscode.DiagnosticSeverity.Error)
                        );
                        return !tsErrors;
                    } catch {
                        return false;
                    }
                },
                autoFix: async () => {
                    const terminal = vscode.window.createTerminal('TypeScript Check');
                    terminal.sendText('npm run compile');
                    terminal.show();
                },
                manualInstructions: [
                    'Run: npm run compile',
                    'Fix any TypeScript errors shown in the Problems panel',
                    'Ensure all files compile successfully'
                ]
            },
            {
                id: 'tests_passing',
                title: 'Test Suite Passing',
                description: 'Verify all tests pass before making changes',
                isCompleted: async () => {
                    // This would need integration with the test runner
                    // For now, return false to encourage manual verification
                    return false;
                },
                autoFix: async () => {
                    const terminal = vscode.window.createTerminal('Run Tests');
                    terminal.sendText('npm test');
                    terminal.show();
                },
                manualInstructions: [
                    'Run: npm test',
                    'Ensure all tests pass (green)',
                    'If tests fail, check the test output for instructions',
                    'Never start development with failing tests'
                ]
            },
            {
                id: 'vscode_extensions',
                title: 'VS Code Extensions',
                description: 'Install recommended VS Code extensions',
                isCompleted: async () => {
                    const recommendedExtensions = [
                        'ms-vscode.vscode-typescript-next',
                        'esbenp.prettier-vscode',
                        'ms-vscode.vscode-eslint'
                    ];

                    for (const extId of recommendedExtensions) {
                        const ext = vscode.extensions.getExtension(extId);
                        if (!ext) return false;
                    }
                    return true;
                },
                autoFix: async () => {
                    const recommendedExtensions = [
                        'ms-vscode.vscode-typescript-next',
                        'esbenp.prettier-vscode',
                        'ms-vscode.vscode-eslint'
                    ];

                    for (const extId of recommendedExtensions) {
                        await vscode.commands.executeCommand('workbench.extensions.installExtension', extId);
                    }
                },
                manualInstructions: [
                    'Open Extensions panel (Ctrl+Shift+X)',
                    'Install: TypeScript and JavaScript Language Features',
                    'Install: Prettier - Code formatter',
                    'Install: ESLint',
                    'Reload window after installation'
                ]
            },
            {
                id: 'git_configured',
                title: 'Git Configuration',
                description: 'Verify Git is properly configured',
                isCompleted: async () => {
                    try {
                        const gitConfigPath = path.join(this.workspaceRoot, '.git', 'config');
                        return fs.existsSync(gitConfigPath);
                    } catch {
                        return false;
                    }
                },
                manualInstructions: [
                    'Ensure you have git installed and configured',
                    'Set up your git user: git config --global user.name "Your Name"',
                    'Set up your git email: git config --global user.email "your.email@example.com"',
                    'Fork the repository if contributing to open source'
                ]
            },
            {
                id: 'development_branch',
                title: 'Development Branch',
                description: 'Create a feature branch for your work',
                isCompleted: async () => {
                    try {
                        // Check if we're not on main/master branch
                        const { spawn } = require('child_process');
                        return new Promise<boolean>((resolve) => {
                            const git = spawn('git', ['branch', '--show-current'], {
                                cwd: this.workspaceRoot
                            });
                            
                            let output = '';
                            git.stdout?.on('data', (data: any) => {
                                output += data.toString();
                            });
                            
                            git.on('close', () => {
                                const branch = output.trim();
                                resolve(branch !== 'main' && branch !== 'master');
                            });
                        });
                    } catch {
                        return false;
                    }
                },
                manualInstructions: [
                    'Create a new branch: git checkout -b feature/your-feature-name',
                    'Use descriptive branch names (e.g., fix/error-handling, feat/new-command)',
                    'Never work directly on main/master branch',
                    'Push your branch: git push -u origin feature/your-feature-name'
                ]
            },
            {
                id: 'debug_setup',
                title: 'Debug Configuration',
                description: 'Set up debugging for extension development',
                isCompleted: async () => {
                    const launchJsonPath = path.join(this.workspaceRoot, '.vscode', 'launch.json');
                    return fs.existsSync(launchJsonPath);
                },
                autoFix: async () => {
                    await this.createDebugConfiguration();
                },
                manualInstructions: [
                    'Press F5 to start debugging',
                    'A new VS Code window should open with the extension loaded',
                    'Test extension commands in the new window',
                    'Set breakpoints in TypeScript files for debugging'
                ]
            }
        ];
    }

    /**
     * Run the complete onboarding process
     */
    async runOnboarding(): Promise<void> {
        this.outputChannel.show();
        this.outputChannel.appendLine('\n🚀 Welcome to AI Debug Context Development!');
        this.outputChannel.appendLine('='.repeat(50));
        this.outputChannel.appendLine('Let\'s get your development environment set up...\n');

        const progress = await this.getOnboardingProgress();
        
        if (progress.completionPercentage === 100) {
            this.outputChannel.appendLine('✅ Your development environment is fully set up!');
            this.outputChannel.appendLine('🎉 You\'re ready to start contributing!\n');
            await this.showContributionGuidance();
            return;
        }

        this.outputChannel.appendLine(`📊 Setup Progress: ${progress.completionPercentage}% (${progress.completedSteps.length}/${progress.totalSteps})\n`);

        // Show incomplete steps
        for (const step of this.onboardingSteps) {
            const isCompleted = await step.isCompleted();
            const icon = isCompleted ? '✅' : '❌';
            
            this.outputChannel.appendLine(`${icon} ${step.title}: ${step.description}`);
            
            if (!isCompleted) {
                if (step.autoFix) {
                    const action = await vscode.window.showInformationMessage(
                        `Setup step incomplete: ${step.title}`,
                        'Auto Fix',
                        'Manual Instructions',
                        'Skip'
                    );
                    
                    if (action === 'Auto Fix') {
                        this.outputChannel.appendLine(`   🔧 Running auto-fix for ${step.title}...`);
                        try {
                            await step.autoFix();
                            this.outputChannel.appendLine(`   ✅ Auto-fix completed for ${step.title}`);
                        } catch (error) {
                            this.outputChannel.appendLine(`   ❌ Auto-fix failed: ${error}`);
                            this.showManualInstructions(step);
                        }
                    } else if (action === 'Manual Instructions') {
                        this.showManualInstructions(step);
                    }
                } else {
                    this.showManualInstructions(step);
                }
            }
        }

        // Show final status
        const finalProgress = await this.getOnboardingProgress();
        this.outputChannel.appendLine(`\n📊 Final Progress: ${finalProgress.completionPercentage}% completed`);
        
        if (finalProgress.completionPercentage === 100) {
            this.outputChannel.appendLine('🎉 Onboarding complete! You\'re ready to contribute!');
            await this.showContributionGuidance();
        } else {
            this.outputChannel.appendLine('🔄 Please complete the remaining steps and run onboarding again.');
        }
    }

    /**
     * Get current onboarding progress
     */
    async getOnboardingProgress(): Promise<OnboardingProgress> {
        const completedSteps: string[] = [];
        const blockers: string[] = [];
        
        for (const step of this.onboardingSteps) {
            const isCompleted = await step.isCompleted();
            if (isCompleted) {
                completedSteps.push(step.id);
            } else if (!step.autoFix && !step.manualInstructions) {
                blockers.push(step.id);
            }
        }

        const totalSteps = this.onboardingSteps.length;
        const completionPercentage = Math.round((completedSteps.length / totalSteps) * 100);
        
        const nextSteps = this.onboardingSteps
            .filter(step => !completedSteps.includes(step.id))
            .slice(0, 3)
            .map(step => step.id);

        return {
            completedSteps,
            totalSteps,
            completionPercentage,
            nextSteps,
            blockers
        };
    }

    /**
     * Analyze development environment
     */
    async analyzeDevelopmentEnvironment(): Promise<DevelopmentEnvironment> {
        const packageJsonPath = path.join(this.workspaceRoot, 'package.json');
        let packageJson: any = {};
        
        try {
            const content = await fs.promises.readFile(packageJsonPath, 'utf8');
            packageJson = JSON.parse(content);
        } catch {
            // Package.json doesn't exist or is invalid
        }

        const nodeVersion = process.version;
        
        // Get npm version
        let npmVersion = 'unknown';
        try {
            const { spawn } = require('child_process');
            npmVersion = await new Promise<string>((resolve) => {
                const npm = spawn('npm', ['--version']);
                let version = '';
                npm.stdout?.on('data', (data: any) => {
                    version += data.toString();
                });
                npm.on('close', () => resolve(version.trim()));
            });
        } catch {
            // npm not available
        }

        const allDeps = {
            ...packageJson.dependencies,
            ...packageJson.devDependencies
        };

        const hasTypeScript = 'typescript' in allDeps;
        const hasJest = 'jest' in allDeps || '@types/jest' in allDeps;
        const hasEslint = 'eslint' in allDeps;

        // Check installed VS Code extensions
        const extensionIds = vscode.extensions.all.map(ext => ext.id);
        const hasVsCodeExtensions = extensionIds.filter(id => 
            id.includes('typescript') || 
            id.includes('prettier') || 
            id.includes('eslint')
        );

        const workspaceConfigPath = path.join(this.workspaceRoot, '.vscode', 'settings.json');
        const workspaceConfig = fs.existsSync(workspaceConfigPath);

        return {
            nodeVersion,
            npmVersion,
            hasTypeScript,
            hasJest,
            hasEslint,
            hasVsCodeExtensions,
            workspaceConfig
        };
    }

    /**
     * Show manual instructions for a step
     */
    private showManualInstructions(step: OnboardingStep): void {
        this.outputChannel.appendLine(`   📋 Manual setup required for ${step.title}:`);
        
        if (step.manualInstructions) {
            for (const [index, instruction] of step.manualInstructions.entries()) {
                this.outputChannel.appendLine(`      ${index + 1}. ${instruction}`);
            }
        }
        
        if (step.documentation) {
            this.outputChannel.appendLine(`   📖 Documentation: ${step.documentation}`);
        }
        
        this.outputChannel.appendLine('');
    }

    /**
     * Create debug configuration
     */
    private async createDebugConfiguration(): Promise<void> {
        const vscodePath = path.join(this.workspaceRoot, '.vscode');
        const launchJsonPath = path.join(vscodePath, 'launch.json');

        // Ensure .vscode directory exists
        if (!fs.existsSync(vscodePath)) {
            await fs.promises.mkdir(vscodePath, { recursive: true });
        }

        const launchConfig = {
            version: '0.2.0',
            configurations: [
                {
                    name: 'Run Extension',
                    type: 'extensionHost',
                    request: 'launch',
                    runtimeExecutable: '${execPath}',
                    args: [
                        '--extensionDevelopmentPath=${workspaceFolder}'
                    ],
                    outFiles: [
                        '${workspaceFolder}/out/**/*.js'
                    ],
                    preLaunchTask: '${workspaceFolder}/.vscode/tasks.json'
                }
            ]
        };

        await fs.promises.writeFile(launchJsonPath, JSON.stringify(launchConfig, null, 2));
        
        // Also create tasks.json if it doesn't exist
        const tasksJsonPath = path.join(vscodePath, 'tasks.json');
        if (!fs.existsSync(tasksJsonPath)) {
            const tasksConfig = {
                version: '2.0.0',
                tasks: [
                    {
                        type: 'npm',
                        script: 'compile',
                        group: 'build',
                        presentation: {
                            panel: 'shared',
                            clear: true
                        },
                        problemMatcher: '$tsc'
                    }
                ]
            };
            
            await fs.promises.writeFile(tasksJsonPath, JSON.stringify(tasksConfig, null, 2));
        }
    }

    /**
     * Show contribution guidance after onboarding
     */
    private async showContributionGuidance(): Promise<void> {
        this.outputChannel.appendLine('🎯 CONTRIBUTION GUIDANCE');
        this.outputChannel.appendLine('='.repeat(25));
        this.outputChannel.appendLine('Now that your environment is set up, here\'s how to contribute:\n');
        
        this.outputChannel.appendLine('📝 Development Workflow:');
        this.outputChannel.appendLine('   1. Create a feature branch: git checkout -b feat/your-feature');
        this.outputChannel.appendLine('   2. Make your changes in small, focused commits');
        this.outputChannel.appendLine('   3. Run tests frequently: npm test');
        this.outputChannel.appendLine('   4. Test the extension: Press F5 to launch Extension Development Host');
        this.outputChannel.appendLine('   5. Write tests for new functionality');
        this.outputChannel.appendLine('   6. Update documentation if needed\n');
        
        this.outputChannel.appendLine('🧪 Testing:');
        this.outputChannel.appendLine('   • Run all tests: npm test');
        this.outputChannel.appendLine('   • Run specific test: npm test -- --testNamePattern="your test"');
        this.outputChannel.appendLine('   • Generate coverage: npm test -- --coverage');
        this.outputChannel.appendLine('   • Debug tests: Use the Jest extension or F5 debugging\n');
        
        this.outputChannel.appendLine('🏗️ Architecture:');
        this.outputChannel.appendLine('   • ServiceContainer: Central dependency injection');
        this.outputChannel.appendLine('   • Services: Business logic (TestExecution, ProjectSelection, etc.)');
        this.outputChannel.appendLine('   • Utils: Helper functions and utilities');
        this.outputChannel.appendLine('   • Modules: Feature-specific code (gitDiff, testOutput, etc.)\n');
        
        this.outputChannel.appendLine('📋 Code Guidelines:');
        this.outputChannel.appendLine('   • Follow existing TypeScript patterns');
        this.outputChannel.appendLine('   • Use dependency injection through ServiceContainer');
        this.outputChannel.appendLine('   • Write comprehensive tests');
        this.outputChannel.appendLine('   • Use meaningful variable and function names');
        this.outputChannel.appendLine('   • Add JSDoc comments for public APIs\n');
        
        this.outputChannel.appendLine('🔄 Pull Request Process:');
        this.outputChannel.appendLine('   • Ensure all tests pass');
        this.outputChannel.appendLine('   • Verify the extension works in Development Host');
        this.outputChannel.appendLine('   • Write clear commit messages');
        this.outputChannel.appendLine('   • Fill out the PR template completely');
        this.outputChannel.appendLine('   • Respond to code review feedback promptly\n');

        // Offer to open key files
        const choice = await vscode.window.showInformationMessage(
            'Onboarding complete! Ready to start contributing?',
            'Open Main Extension File',
            'Open Service Container',
            'View Contributing Guide',
            'Done'
        );

        switch (choice) {
            case 'Open Main Extension File':
                await this.openFile('src/extension.ts');
                break;
            case 'Open Service Container':
                await this.openFile('src/core/ServiceContainer.ts');
                break;
            case 'View Contributing Guide':
                await this.openFile('docs/CONTRIBUTING.md');
                break;
        }
    }

    /**
     * Open a file for editing
     */
    private async openFile(relativePath: string): Promise<void> {
        try {
            const fullPath = path.join(this.workspaceRoot, relativePath);
            if (fs.existsSync(fullPath)) {
                const doc = await vscode.workspace.openTextDocument(fullPath);
                await vscode.window.showTextDocument(doc);
            } else {
                vscode.window.showWarningMessage(`File not found: ${relativePath}`);
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to open file: ${error}`);
        }
    }

    /**
     * Generate environment report
     */
    async generateEnvironmentReport(): Promise<string> {
        const env = await this.analyzeDevelopmentEnvironment();
        const progress = await this.getOnboardingProgress();

        let report = '# Development Environment Report\n\n';
        
        report += '## Setup Progress\n';
        report += `- **Completion**: ${progress.completionPercentage}% (${progress.completedSteps.length}/${progress.totalSteps})\n`;
        report += `- **Completed Steps**: ${progress.completedSteps.join(', ')}\n`;
        if (progress.nextSteps.length > 0) {
            report += `- **Next Steps**: ${progress.nextSteps.join(', ')}\n`;
        }
        if (progress.blockers.length > 0) {
            report += `- **Blockers**: ${progress.blockers.join(', ')}\n`;
        }
        report += '\n';

        report += '## Environment Details\n';
        report += `- **Node.js**: ${env.nodeVersion}\n`;
        report += `- **npm**: ${env.npmVersion}\n`;
        report += `- **TypeScript**: ${env.hasTypeScript ? '✅ Installed' : '❌ Missing'}\n`;
        report += `- **Jest**: ${env.hasJest ? '✅ Installed' : '❌ Missing'}\n`;
        report += `- **ESLint**: ${env.hasEslint ? '✅ Installed' : '❌ Missing'}\n`;
        report += `- **Workspace Config**: ${env.workspaceConfig ? '✅ Present' : '❌ Missing'}\n`;
        
        if (env.hasVsCodeExtensions.length > 0) {
            report += `- **VS Code Extensions**: ${env.hasVsCodeExtensions.join(', ')}\n`;
        }
        
        report += '\n## Recommendations\n';
        
        if (!env.hasTypeScript) {
            report += '- Install TypeScript for better development experience\n';
        }
        if (!env.hasJest) {
            report += '- Install Jest for running tests\n';
        }
        if (!env.hasEslint) {
            report += '- Install ESLint for code quality checks\n';
        }
        if (env.hasVsCodeExtensions.length < 3) {
            report += '- Install recommended VS Code extensions for better development experience\n';
        }

        return report;
    }

    /**
     * Dispose and cleanup
     */
    dispose(): void {
        this.onboardingSteps = [];
    }
}