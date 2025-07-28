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

            const result = await this.testExecution.executeTest(request, (progress) => {
                // Real-time progress is handled by TestExecutionService
                // Status bar animation is also handled by TestExecutionService
            });

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
                // Automatically send context to Copilot Chat
                const contextWithInstruction = `Analyze the pasted document.\n\n${formattedContext}`;
                await this.sendToCopilotChat(contextWithInstruction);
                // Note: sendToCopilotChat already shows success/failure messages
                this.services.updateStatusBar('🤖 Formatted context sent to Copilot', 'green');
                return;
            }

            // Fallback: read existing files manually
            const fs = require('fs');
            const path = require('path');

            // Find and read ai_debug_context.txt
            const contextFiles = ['ai-debug-context.txt', 'ai_debug_context.txt', 'ai_context.txt', 'context.txt'];
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
                
                // Automatically send context to Copilot Chat
                const contextWithInstruction = `Analyze the pasted document.\n\n${analysisPrompt}`;
                await this.sendToCopilotChat(contextWithInstruction);
                // Note: sendToCopilotChat already shows success/failure messages
            } else {
                // Use existing formatted context file - automatically send to Copilot Chat
                const contextWithInstruction = `Analyze the pasted document.\n\n${contextContent}`;
                await this.sendToCopilotChat(contextWithInstruction);
                // Note: sendToCopilotChat already shows success/failure messages
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
     * Send content directly to Copilot Chat
     */
    private async sendToCopilotChat(content: string): Promise<boolean> {
        try {
            this.services.outputChannel.appendLine(`🚀 Fully automated Copilot integration for post-test analysis`);
            this.services.outputChannel.appendLine(`📋 Preparing to send ${Math.round(content.length / 1024)}KB of context to Copilot Chat...`);
            
            // Always copy to clipboard first
            await vscode.env.clipboard.writeText(content);
            this.services.outputChannel.appendLine('📋 Content copied to clipboard successfully');
            
            // Try to open Copilot Chat
            const opened = await this.openCopilotChat();
            
            if (opened) {
                this.services.outputChannel.appendLine('🤖 Copilot Chat opened successfully');
                
                // Wait for Copilot Chat to fully load
                await new Promise(resolve => setTimeout(resolve, 1500));
                
                // Focus on Copilot Chat
                await vscode.commands.executeCommand('workbench.panel.chat.view.copilot.focus');
                
                // Attempt automatic paste and submit
                this.services.outputChannel.appendLine('🚀 Attempting fully automated paste and submit...');
                const success = await this.tryAutomaticPaste();
                
                if (success) {
                    // Success - show brief success message
                    vscode.window.showInformationMessage(
                        `🚀 Post-test analysis automatically sent to Copilot Chat!`,
                        { modal: false }
                    );
                    return true;
                } else {
                    // Fallback - show instructions
                    vscode.window.showInformationMessage(
                        '📋 Copilot Chat ready. Content in clipboard - paste (Ctrl+V/Cmd+V) and press Enter.',
                        { modal: false }
                    );
                    return true;
                }
                
            } else {
                this.services.outputChannel.appendLine('⚠️ Could not open Copilot Chat automatically');
                // Try alternative methods
                await this.tryAlternativeCopilotCommands();
                vscode.window.showInformationMessage(
                    '📋 AI context copied to clipboard. Please open Copilot Chat and paste.',
                    { modal: false }
                );
                return false;
            }
            
        } catch (error) {
            this.services.outputChannel.appendLine(`❌ Error in automated Copilot integration: ${error}`);
            await vscode.env.clipboard.writeText(content);
            vscode.window.showErrorMessage(
                '❌ Auto-integration failed. Content copied to clipboard - please paste in Copilot Chat manually.'
            );
            return false;
        }
    }

    /**
     * Try to open Copilot Chat
     */
    private async openCopilotChat(): Promise<boolean> {
        try {
            await vscode.commands.executeCommand('workbench.panel.chat.view.copilot.focus');
            return true;
        } catch {
            try {
                await vscode.commands.executeCommand('github.copilot.openChat');
                return true;
            } catch {
                return false;
            }
        }
    }

    /**
     * Try automatic paste and submit to Copilot Chat
     */
    private async tryAutomaticPaste(): Promise<boolean> {
        try {
            // Focus on Copilot Chat input
            await vscode.commands.executeCommand('workbench.panel.chat.view.copilot.focus');
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Try paste command
            this.services.outputChannel.appendLine('📋 Attempting automatic paste...');
            await vscode.commands.executeCommand('editor.action.clipboardPasteAction');
            await new Promise(resolve => setTimeout(resolve, 800)); // Wait for paste to complete
            
            this.services.outputChannel.appendLine('✅ Content pasted successfully, attempting auto-submit...');
            
            // Try to submit automatically with multiple methods
            const submitted = await this.tryAutoSubmit();
            
            if (submitted) {
                this.services.outputChannel.appendLine('🚀 Content automatically submitted to Copilot Chat!');
                return true;
            } else {
                this.services.outputChannel.appendLine('✅ Content pasted - please press Enter to submit');
                return true;
            }
            
        } catch (error) {
            this.services.outputChannel.appendLine(`⚠️ Auto-paste failed: ${error}`);
            return false;
        }
    }

    /**
     * Try different methods to automatically submit content to Copilot Chat
     */
    private async tryAutoSubmit(): Promise<boolean> {
        const submitMethods = [
            // Method 1: Standard Enter key simulation
            async () => {
                await vscode.commands.executeCommand('type', { text: '\n' });
                return true;
            },
            
            // Method 2: Workbench submit action
            async () => {
                await vscode.commands.executeCommand('workbench.action.chat.submit');
                return true;
            },
            
            // Method 3: Chat specific submit
            async () => {
                await vscode.commands.executeCommand('chat.action.submit');
                return true;
            },
            
            // Method 4: Generic submit/accept commands
            async () => {
                await vscode.commands.executeCommand('workbench.action.acceptSelectedSuggestion');
                return true;
            },
            
            // Method 5: Chat send message command
            async () => {
                await vscode.commands.executeCommand('workbench.action.chat.sendMessage');
                return true;
            },
            
            // Method 6: Copilot specific submit
            async () => {
                await vscode.commands.executeCommand('github.copilot.chat.submit');
                return true;
            },
            
            // Method 7: Editor action submit
            async () => {
                await vscode.commands.executeCommand('editor.action.submitComment');
                return true;
            },
            
            // Method 8: Simulate Ctrl+Enter or Cmd+Enter
            async () => {
                await vscode.commands.executeCommand('type', { text: '\r' });
                return true;
            }
        ];
        
        for (let i = 0; i < submitMethods.length; i++) {
            try {
                this.services.outputChannel.appendLine(`🔄 Trying submit method ${i + 1}...`);
                await submitMethods[i]();
                await new Promise(resolve => setTimeout(resolve, 200)); // Wait for command to process
                this.services.outputChannel.appendLine(`✅ Submit method ${i + 1} executed successfully`);
                return true;
            } catch (error) {
                this.services.outputChannel.appendLine(`⚠️ Submit method ${i + 1} failed: ${error}`);
                continue;
            }
        }
        
        this.services.outputChannel.appendLine('⚠️ All auto-submit methods failed - manual submission required');
        return false;
    }

    /**
     * Try alternative Copilot Chat commands
     */
    private async tryAlternativeCopilotCommands(): Promise<void> {
        const commands = [
            'github.copilot.openChat',
            'workbench.action.chat.open', 
            'github.copilot.terminal.explainTerminalSelection',
            'workbench.action.chat.newChat'
        ];
        
        for (const command of commands) {
            try {
                await vscode.commands.executeCommand(command);
                this.services.outputChannel.appendLine(`✅ Opened Copilot Chat using: ${command}`);
                vscode.window.showInformationMessage(
                    '🤖 Copilot Chat opened! Please paste the content from clipboard.',
                    { modal: false }
                );
                return;
            } catch (error) {
                this.services.outputChannel.appendLine(`⚠️ Command ${command} failed: ${error}`);
                continue;
            }
        }
        
        vscode.window.showWarningMessage(
            '⚠️ Could not open Copilot Chat. Please open it manually and paste the content.',
            { modal: false }
        );
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

            const result = await this.testExecution.executeTest(request);
            // Status bar animation and final status are handled by TestExecutionService

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
            const contextDir = path.join(this.services.workspaceRoot, '.github', 'instructions', 'ai-utilities-context');

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
                label: '$(arrow-left) Back ',
                detail: 'Return to the main test menu',
                description: 'to Main Menu'
            } as any);
            
            
            // Add Debug Tests with Copilot integration if ai_context.txt exists
            const hasAiContext = files.some((file: string) => file.includes('context') || file.includes('ai_context'));
            if (hasAiContext) {
                items.unshift({
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