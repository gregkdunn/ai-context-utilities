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
import { UserFriendlyErrorHandler } from '../utils/UserFriendlyErrorHandler';
import { ContextCompiler } from '../modules/aiContext/ContextCompiler';

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
                    
                case 'post-test-context':
                    await this.openPostTestContext();
                    break;
                    
                case 'cancelled':
                    // User cancelled, no action needed
                    break;
            }
        } catch (error) {
            await this.handleError(error, 'showMainMenu');
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
            await this.handleError(error, 'showProjectBrowser');
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
            await this.handleError(error, 'executeProjectTest');
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

        // Use progress indicator for long operation
        return vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "Auto-detecting projects",
            cancellable: true
        }, async (progress, token) => {
            try {
                progress.report({ increment: 10, message: "Checking for changes..." });

                // Check for cancellation
                if (token.isCancellationRequested) {
                    this.services.updateStatusBar('Auto-detect cancelled');
                    return;
                }

                // Get changed files from git diff
                progress.report({ increment: 30, message: "Analyzing changed files..." });
                const gitDiffResult = await this.executeGitDiff();
                
                if (!gitDiffResult.success) {
                    const friendlyError = UserFriendlyErrors.gitCommandFailed('git diff --name-only HEAD~1');
                    this.services.outputChannel.appendLine(`❌ ${friendlyError}\n`);
                    this.services.outputChannel.appendLine('🔄 Falling back to git affected...\n');
                    progress.report({ increment: 100, message: "Falling back to git affected..." });
                    await this.runGitAffected();
                    return;
                }

                progress.report({ increment: 50, message: "Processing changed files..." });
                const changedFiles = gitDiffResult.stdout
                    .split('\n')
                    .map(f => f.trim())
                    .filter(f => f.length > 0);
                    
                if (changedFiles.length === 0) {
                    const friendlyError = UserFriendlyErrors.noChangedFiles();
                    this.services.outputChannel.appendLine(`ℹ️ ${friendlyError}\n`);
                    this.services.updateStatusBar('No changes detected');
                    progress.report({ increment: 100, message: "No changes detected" });
                    return;
                }

                this.services.outputChannel.appendLine(`📁 Found ${changedFiles.length} changed files:`);
                changedFiles.forEach(file => this.services.outputChannel.appendLine(`   ${file}`));
                this.services.outputChannel.appendLine('');

                progress.report({ increment: 70, message: "Finding affected projects..." });
                // Find unique projects for changed files
                const projects = await this.services.projectDiscovery.getProjectsForFiles(changedFiles);

                if (projects.length === 0) {
                    const friendlyError = UserFriendlyErrors.autoDetectionFailed('No projects found for changed files');
                    this.services.outputChannel.appendLine(`⚠️ ${friendlyError}\n`);
                    progress.report({ increment: 100, message: "Falling back to git affected..." });
                    await this.runGitAffected();
                    return;
                }

                this.services.outputChannel.appendLine(`🎯 Auto-detected projects: ${projects.join(', ')}\n`);

                progress.report({ increment: 80, message: `Running tests for ${projects.length} projects...` });
                // Run tests for each detected project
                for (let i = 0; i < projects.length; i++) {
                    const project = projects[i];
                    progress.report({ 
                        increment: 80 + (15 * (i + 1) / projects.length), 
                        message: `Testing ${project}...` 
                    });
                    await this.executeProjectTest(project);
                }

                const totalDuration = ((Date.now() - startTime) / 1000).toFixed(1);
                progress.report({ increment: 100, message: `Completed in ${totalDuration}s` });
                this.services.updateStatusBar(`✅ Auto-detect complete (${totalDuration}s)`, 'green');
                this.services.outputChannel.appendLine(`🎉 Auto-detection completed in ${totalDuration}s`);

            } catch (error) {
                const friendlyError = UserFriendlyErrors.autoDetectionFailed(String(error));
                this.services.outputChannel.appendLine(`❌ ${friendlyError}\n`);
                this.services.outputChannel.appendLine('🔄 Falling back to git affected...\n');
                progress.report({ increment: 100, message: "Error occurred, falling back..." });
                await this.runGitAffected();
            }
        });
    }

    /**
     * Start Copilot analysis of test context
     */
    async startCopilotAnalysis(contextDir: string): Promise<void> {
        try {
            this.services.updateStatusBar('🤖 Starting Copilot analysis...', 'yellow');

            // First, try to compile fresh formatted context using ContextCompiler
            const formattedContext = await this.compileFormattedContext();

            if (formattedContext) {
                // Use the properly formatted context
                await this.openCopilotChat(formattedContext);
                this.services.updateStatusBar('🤖 Formatted context sent to Copilot', 'green');
                return;
            }

            // Fallback: read existing files manually
            const fs = require('fs');
            const path = require('path');

            // Find and read ai_context.txt
            const contextFiles = ['ai_debug_context.txt', 'ai_context.txt', 'context.txt'];
            let contextContent = '';
            let contextFile = '';

            for (const file of contextFiles) {
                const filePath = path.join(contextDir, file);
                if (fs.existsSync(filePath)) {
                    contextContent = fs.readFileSync(filePath, 'utf8');
                    contextFile = file;
                    break;
                }
            }

            if (!contextContent) {
                // Final fallback: read raw files and format them
                let diffContent = '';
                let testOutput = '';

                const diffPath = path.join(contextDir, 'diff.txt');
                if (fs.existsSync(diffPath)) {
                    diffContent = fs.readFileSync(diffPath, 'utf8');
                }

                const testOutputPath = path.join(contextDir, 'test_output.txt');
                if (fs.existsSync(testOutputPath)) {
                    testOutput = fs.readFileSync(testOutputPath, 'utf8');
                }

                if (!diffContent && !testOutput) {
                    vscode.window.showWarningMessage('No AI context files found to analyze.');
                    this.services.updateStatusBar('Ready');
                    return;
                }

                // Create comprehensive analysis prompt from raw files
                const analysisPrompt = this.buildCopilotPrompt(contextContent, diffContent, testOutput, contextFile);
                await this.openCopilotChat(analysisPrompt);
            } else {
                // Use existing formatted context file
                await this.openCopilotChat(contextContent);
            }

            this.services.updateStatusBar('🤖 Copilot analysis started', 'green');

        } catch (error) {
            this.services.updateStatusBar('❌ Copilot error', 'red');
            await this.handleError(error, 'startCopilotAnalysis');
        }
    }

    /**
     * Compile fresh formatted context using ContextCompiler
     */
    private async compileFormattedContext(): Promise<string | null> {
        try {
            const contextCompiler = new ContextCompiler({
                workspaceRoot: this.services.workspaceRoot,
                outputChannel: this.services.outputChannel
            });

            // Try to compile debug context (we'll assume failed tests for post-test analysis)
            const context = await contextCompiler.compileContext('debug', false);
            
            return context;
            
        } catch (error) {
            this.services.outputChannel.appendLine(`⚠️ Failed to compile formatted context: ${error}`);
            return null;
        }
    }

    /**
     * Build comprehensive Copilot analysis prompt
     */
    private buildCopilotPrompt(contextContent: string, diffContent: string, testOutput: string, contextFile: string): string {
        const prompt = `# 🤖 AI Debug Context Analysis

I need your help analyzing test failures and providing actionable suggestions. Here's the current context:

## 📋 Context File: ${contextFile}
\`\`\`
${contextContent}
\`\`\`

${diffContent ? `## 🔄 Git Changes
\`\`\`diff
${diffContent}
\`\`\`

` : ''}${testOutput ? `## 🧪 Test Output
\`\`\`
${testOutput}
\`\`\`

` : ''}## 🎯 What I need from you:

1. **🔧 Issue Analysis**: What are the root causes of the test failures?

2. **💡 Fix Suggestions**: Provide specific code fixes with examples

3. **🧪 Test Improvements**: Suggest new tests to prevent similar issues

4. **📝 PR Description**: Write a comprehensive PR description for these fixes

5. **🚀 Next Steps**: Prioritized action items for implementation

Please be specific and actionable in your suggestions. Include code examples where helpful.`;

        return prompt;
    }

    /**
     * Open Copilot Chat with the analysis prompt
     */
    private async openCopilotChat(prompt: string): Promise<void> {
        try {
            // First, try to open Copilot Chat using the workbench command
            await vscode.commands.executeCommand('workbench.panel.chat.view.copilot.focus');
            
            // Wait a moment for the chat to open
            await new Promise(resolve => setTimeout(resolve, 500));

            // Try to use Copilot's chat API if available
            try {
                await vscode.commands.executeCommand('github.copilot.interactiveEditor.explain', {
                    prompt: prompt
                });
            } catch (copilotError) {
                // Fallback: Copy prompt to clipboard and show instructions
                await vscode.env.clipboard.writeText(prompt);
                
                const choice = await vscode.window.showInformationMessage(
                    'Copilot analysis prompt copied to clipboard. Please paste it in Copilot Chat.',
                    'Open Copilot Chat', 'OK'
                );

                if (choice === 'Open Copilot Chat') {
                    // Try different Copilot commands
                    const copilotCommands = [
                        'github.copilot.terminal.explainTerminalSelection',
                        'github.copilot.interactiveEditor.explain',
                        'workbench.action.chat.open',
                        'workbench.panel.chat.view.copilot.focus'
                    ];

                    for (const command of copilotCommands) {
                        try {
                            await vscode.commands.executeCommand(command);
                            break;
                        } catch (cmdError) {
                            continue;
                        }
                    }
                }
            }

        } catch (error) {
            // Final fallback: Copy to clipboard and show instructions
            await vscode.env.clipboard.writeText(prompt);
            vscode.window.showInformationMessage(
                'Could not open Copilot Chat automatically. The analysis prompt has been copied to your clipboard. Please open Copilot Chat manually and paste it.'
            );
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
            await this.handleError(error, 'runGitAffected');
        }
    }


    /**
     * Open post-test context panel
     */
    async openPostTestContext(): Promise<void> {
        try {
            this.services.updateStatusBar('📖 Opening post-test context...', 'yellow');

            const fs = require('fs');
            const path = require('path');
            const contextDir = path.join(this.services.workspaceRoot, '.github', 'instructions', 'ai_debug_context');

            if (!fs.existsSync(contextDir)) {
                vscode.window.showInformationMessage('No post-test context files found.');
                this.services.updateStatusBar('Ready');
                return;
            }

            // Get all context files
            const files = fs.readdirSync(contextDir)
                .filter((file: string) => 
                    file !== '.gitkeep' && 
                    !file.startsWith('.') &&
                    fs.statSync(path.join(contextDir, file)).size > 0
                )
                .sort();

            if (files.length === 0) {
                vscode.window.showInformationMessage('No post-test context files available.');
                this.services.updateStatusBar('Ready');
                return;
            }

            // Create QuickPick for file selection
            const quickPick = vscode.window.createQuickPick();
            quickPick.title = '📖 Post-Test Context Files';
            quickPick.placeholder = 'Select a context file to view';
            quickPick.ignoreFocusOut = true;

            // Build file items with details
            const items = files.map((file: string) => {
                const filePath = path.join(contextDir, file);
                const stats = fs.statSync(filePath);
                const sizeKB = (stats.size / 1024).toFixed(1);
                const modifiedDate = stats.mtime.toLocaleDateString();

                let icon = '$(file-text)';
                if (file.includes('diff')) icon = '$(git-compare)';
                else if (file.includes('test')) icon = '$(beaker)';
                else if (file.includes('context')) icon = '$(note)';

                return {
                    label: `${icon} ${file}`,
                    detail: `${sizeKB} KB • Modified: ${modifiedDate}`,
                    description: this.getFileDescription(file)
                };
            });

            // Add back button and "Open All Files" option
            items.unshift({
                label: '$(arrow-left) Back to Main Menu',
                detail: 'Return to the main test menu',
                description: '$(arrow-left) Back'
            } as any);
            
            items.push({
                label: '$(files) Open All Files',
                detail: `Open all ${files.length} context files`,
                description: '$(folder-opened) View all'
            } as any);
            
            // Add Debug Tests with Copilot integration if ai_context.txt exists
            const hasAiContext = files.some((file: string) => file.includes('context') || file.includes('ai_context'));
            if (hasAiContext) {
                items.push({
                    label: '$(bug) Debug Tests with Copilot',
                    detail: 'Analyze context with Copilot Chat for test fixes and suggestions',
                    description: '$(copilot) AI Debug'
                } as any);
            }

            quickPick.items = items;

            quickPick.onDidAccept(async () => {
                const selection = quickPick.activeItems[0];
                quickPick.hide();

                if (selection.label.includes('Back to Main Menu')) {
                    // Return to main menu
                    this.services.updateStatusBar('Ready');
                    this.showMainMenu();
                } else if (selection.label.includes('Debug Tests with Copilot')) {
                    // Start Copilot analysis session
                    await this.startCopilotAnalysis(contextDir);
                } else if (selection.label.includes('Open All Files')) {
                    // Open all files
                    files.forEach((file: string) => {
                        const filePath = vscode.Uri.file(path.join(contextDir, file));
                        vscode.window.showTextDocument(filePath);
                    });
                    this.services.updateStatusBar('📖 Context opened', 'green');
                } else {
                    // Open selected file
                    const fileName = selection.label.replace(/^\$\([^)]+\)\s*/, '');
                    const filePath = vscode.Uri.file(path.join(contextDir, fileName));
                    vscode.window.showTextDocument(filePath);
                    this.services.updateStatusBar('📖 Context opened', 'green');
                }
            });

            quickPick.onDidHide(() => {
                this.services.updateStatusBar('Ready');
                quickPick.dispose();
            });

            quickPick.show();

        } catch (error) {
            this.services.updateStatusBar('❌ Context error', 'red');
            await this.handleError(error, 'openPostTestContext');
        }
    }

    /**
     * Get description for context file
     */
    private getFileDescription(fileName: string): string {
        if (fileName.includes('diff')) return 'Git changes';
        if (fileName.includes('test')) return 'Test output';
        if (fileName.includes('context')) return 'AI context';
        if (fileName.includes('summary')) return 'Test summary';
        if (fileName.includes('failure')) return 'Failure analysis';
        return 'Context file';
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
            await this.handleError(error, 'showWorkspaceInfo');
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
            await this.handleError(error, 'toggleFileWatcher');
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
            await this.handleError(error, 'clearTestCache');
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
            await this.handleError(error, 'runSetup');
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
            await this.handleError(error, 'createConfig');
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
    private async handleError(error: any, operation: string): Promise<void> {
        this.services.updateStatusBar('❌ Error', 'red');
        
        // Log technical error for debugging
        const logMessage = UserFriendlyErrorHandler.formatForLogging(error, operation);
        this.services.outputChannel.appendLine(`❌ ${logMessage}\n`);
        
        // Show user-friendly error message
        await UserFriendlyErrorHandler.showError(error, operation);
        
        // Also use the original error handler for consistency
        const structuredError = this.services.errorHandler.handleError(error, { command: operation });
        this.services.errorHandler.showUserError(structuredError, vscode);
    }
}