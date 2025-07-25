/**
 * Test Menu Orchestrator
 * Coordinates between services to provide unified test execution interface
 * Part of Phase 1.9.1 CommandRegistry refactor
 */

import * as vscode from 'vscode';
import { ServiceContainer } from '../core/ServiceContainer';
import { TestExecutionService, TestExecutionRequest } from './TestExecutionService';
import { ProjectSelectionService, ProjectSelectionResult } from './ProjectSelectionService';
import { UIService } from './UIService';
import { UserFriendlyErrors } from '../utils/userFriendlyErrors';

/**
 * Main orchestrator for test menu and execution flow
 */
export class TestMenuOrchestrator {
    private testExecution: TestExecutionService;
    private projectSelection: ProjectSelectionService;
    private ui: UIService;

    constructor(private services: ServiceContainer) {
        this.testExecution = new TestExecutionService(services);
        this.projectSelection = new ProjectSelectionService(services);
        this.ui = new UIService(services);
    }

    /**
     * Show main test menu and handle user flow
     */
    async showMainMenu(): Promise<void> {
        try {
            const selection = await this.projectSelection.showMainSelectionMenu();
            
            switch (selection.type) {
                case 'project':
                    if (selection.project === 'SHOW_BROWSER') {
                        await this.showProjectBrowser();
                    } else if (selection.project) {
                        await this.executeProjectTest(selection.project);
                    }
                    break;
                    
                case 'auto-detect':
                    await this.runAutoDetectProjects();
                    break;
                    
                case 'git-affected':
                    await this.runGitAffected();
                    break;
                    
                    
                case 'cancelled':
                    // User cancelled, no action needed
                    break;
            }
        } catch (error) {
            this.handleError(error, 'showMainMenu');
        }
    }

    /**
     * Show project browser
     */
    async showProjectBrowser(): Promise<void> {
        try {
            const selectedProject = await this.projectSelection.showProjectBrowser();
            if (selectedProject) {
                await this.executeProjectTest(selectedProject);
            }
        } catch (error) {
            this.handleError(error, 'showProjectBrowser');
        }
    }

    /**
     * Execute test for specific project
     */
    async executeProjectTest(project: string): Promise<void> {
        try {
            const request: TestExecutionRequest = {
                project,
                mode: 'default',
                verbose: true
            };

            this.services.updateStatusBar(`🧪 Testing ${project}...`, 'yellow');
            
            const result = await this.testExecution.executeTest(request, (progress) => {
                // Real-time progress is handled by TestExecutionService
            });

            const statusText = result.success 
                ? `✅ ${project} passed (${result.duration}s)`
                : `❌ ${project} failed (${result.duration}s)`;
            
            const statusColor = result.success ? 'green' : 'red';
            this.services.updateStatusBar(statusText, statusColor);

        } catch (error) {
            this.services.updateStatusBar(`❌ ${project} error`, 'red');
            this.handleError(error, 'executeProjectTest');
        }
    }

    /**
     * Run auto-detect projects from changed files
     */
    async runAutoDetectProjects(): Promise<void> {
        const startTime = Date.now();
        const timestamp = new Date().toLocaleTimeString();
        
        this.services.outputChannel.show();
        this.services.outputChannel.appendLine(`\n${'='.repeat(80)}`);
        this.services.outputChannel.appendLine(`🚀 [${timestamp}] AUTO-DETECT PROJECTS`);
        this.services.outputChannel.appendLine(`${'='.repeat(80)}`);
        this.services.outputChannel.appendLine('🚀 Auto-detecting projects from changed files...\n');

        try {
            // Get changed files from git diff
            const gitDiffResult = await this.executeGitDiff();
            
            if (!gitDiffResult.success) {
                const friendlyError = UserFriendlyErrors.gitCommandFailed('git diff --name-only HEAD~1');
                this.services.outputChannel.appendLine(`❌ ${friendlyError}\n`);
                this.services.outputChannel.appendLine('🔄 Falling back to git affected...\n');
                await this.runGitAffected();
                return;
            }

            const changedFiles = gitDiffResult.stdout
                .split('\n')
                .map(f => f.trim())
                .filter(f => f.length > 0);
                
            if (changedFiles.length === 0) {
                const friendlyError = UserFriendlyErrors.noChangedFiles();
                this.services.outputChannel.appendLine(`ℹ️ ${friendlyError}\n`);
                this.services.updateStatusBar('No changes detected');
                return;
            }

            this.services.outputChannel.appendLine(`📁 Found ${changedFiles.length} changed files:`);
            changedFiles.forEach(file => this.services.outputChannel.appendLine(`   ${file}`));
            this.services.outputChannel.appendLine('');

            // Find unique projects for changed files
            const projects = await this.services.projectDiscovery.getProjectsForFiles(changedFiles);

            if (projects.length === 0) {
                const friendlyError = UserFriendlyErrors.autoDetectionFailed('No projects found for changed files');
                this.services.outputChannel.appendLine(`⚠️ ${friendlyError}\n`);
                await this.runGitAffected();
                return;
            }

            this.services.outputChannel.appendLine(`🎯 Auto-detected projects: ${projects.join(', ')}\n`);

            // Run tests for each detected project
            for (const project of projects) {
                await this.executeProjectTest(project);
            }

            const totalDuration = ((Date.now() - startTime) / 1000).toFixed(1);
            this.services.updateStatusBar(`✅ Auto-detect complete (${totalDuration}s)`, 'green');
            this.services.outputChannel.appendLine(`🎉 Auto-detection completed in ${totalDuration}s`);

        } catch (error) {
            const friendlyError = UserFriendlyErrors.autoDetectionFailed(String(error));
            this.services.outputChannel.appendLine(`❌ ${friendlyError}\n`);
            this.services.outputChannel.appendLine('🔄 Falling back to git affected...\n');
            await this.runGitAffected();
        }
    }

    /**
     * Run git affected tests
     */
    async runGitAffected(): Promise<void> {
        try {
            const request: TestExecutionRequest = {
                mode: 'affected',
                verbose: true
            };

            this.services.updateStatusBar('📝 Testing updated files...', 'yellow');
            
            const result = await this.testExecution.executeTest(request);

            const statusText = result.success 
                ? `✅ Updated files tested (${result.duration}s)`
                : `❌ Updated files failed (${result.duration}s)`;
            
            const statusColor = result.success ? 'green' : 'red';
            this.services.updateStatusBar(statusText, statusColor);

        } catch (error) {
            this.services.updateStatusBar('❌ Git affected error', 'red');
            this.handleError(error, 'runGitAffected');
        }
    }


    /**
     * Show workspace info
     */
    async showWorkspaceInfo(): Promise<void> {
        try {
            this.services.updateStatusBar('Loading workspace info...', 'yellow');
            
            const [projects, frameworks] = await Promise.all([
                this.services.projectDiscovery.getAllProjects(),
                this.services.configManager.getDetectedFrameworks()
            ]);

            const info = [
                `Workspace: ${this.services.workspaceRoot}`,
                `Projects found: ${projects.length}`,
                `Frameworks detected: ${frameworks.map(f => f.name).join(', ') || 'None'}`,
                `File watcher: ${this.services.fileWatcherActive ? 'Active' : 'Inactive'}`,
                `Extension: Ready`
            ].join('\n');
            
            vscode.window.showInformationMessage(info);
            this.services.updateStatusBar('Ready');
            
        } catch (error) {
            this.handleError(error, 'showWorkspaceInfo');
        }
    }

    /**
     * Toggle file watcher
     */
    async toggleFileWatcher(): Promise<void> {
        try {
            if (this.services.fileWatcherActive) {
                this.services.fileWatcherActive = false;
                this.services.updateStatusBar('👁️ Watcher stopped');
                vscode.window.showInformationMessage('File watcher stopped');
            } else {
                this.services.fileWatcherActive = true;
                this.services.updateStatusBar('👁️ Watching files', 'yellow');
                vscode.window.showInformationMessage('File watcher started');
            }
        } catch (error) {
            this.handleError(error, 'toggleFileWatcher');
        }
    }

    /**
     * Clear test cache
     */
    async clearTestCache(): Promise<void> {
        try {
            this.services.updateStatusBar('Clearing cache...', 'yellow');
            
            await this.services.projectDiscovery.clearCache();
            
            this.services.updateStatusBar('🗑️ Cache cleared');
            vscode.window.showInformationMessage('Test cache cleared successfully');
        } catch (error) {
            this.services.updateStatusBar('❌ Cache error', 'red');
            this.handleError(error, 'clearTestCache');
        }
    }

    /**
     * Run setup wizard
     */
    async runSetup(): Promise<void> {
        try {
            this.services.updateStatusBar('🍎 Running setup...', 'yellow');
            await this.services.setupWizard.runSetupWizard();
            this.services.updateStatusBar('✅ Setup complete', 'green');
        } catch (error) {
            this.services.updateStatusBar('❌ Setup failed', 'red');
            this.handleError(error, 'runSetup');
        }
    }

    /**
     * Create configuration file
     */
    async createConfig(): Promise<void> {
        try {
            this.services.updateStatusBar('Creating config...', 'yellow');
            await this.services.configManager.createExampleConfig();
            
            const framework = this.services.configManager.getFrameworkName();
            this.services.updateStatusBar(`Config created (${framework})`, 'green');
            
            const choice = await vscode.window.showInformationMessage(
                `Created .aiDebugContext.yml for ${framework}`,
                'Open File', 'View Documentation'
            );
            
            if (choice === 'Open File') {
                const configUri = vscode.Uri.file(`${this.services.workspaceRoot}/.aiDebugContext.yml`);
                await vscode.window.showTextDocument(configUri);
            }
            
        } catch (error) {
            this.services.updateStatusBar('❌ Config error', 'red');
            this.handleError(error, 'createConfig');
        }
    }

    /**
     * Execute git diff command
     */
    private async executeGitDiff(): Promise<{success: boolean, stdout: string}> {
        return new Promise((resolve) => {
            const { spawn } = require('child_process');
            const child = spawn('git', ['diff', '--name-only', 'HEAD~1'], {
                cwd: this.services.workspaceRoot,
                stdio: ['ignore', 'pipe', 'pipe']
            });

            let stdout = '';
            let stderr = '';

            child.stdout?.on('data', (data: any) => stdout += data.toString());
            child.stderr?.on('data', (data: any) => stderr += data.toString());

            child.on('close', (code: any) => {
                resolve({ success: code === 0, stdout });
            });
        });
    }

    /**
     * Centralized error handling
     */
    private handleError(error: any, operation: string): void {
        this.services.updateStatusBar('❌ Error', 'red');
        const structuredError = this.services.errorHandler.handleError(error, { command: operation });
        this.services.errorHandler.showUserError(structuredError, vscode);
    }
}