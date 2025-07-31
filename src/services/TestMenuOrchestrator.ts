/**
 * Test Menu Orchestrator
 * Coordinates between services to provide unified test execution interface
 * Part of Phase 1.9.1 CommandRegistry refactor
 */

import * as vscode from 'vscode';
import { ServiceContainer } from '../core/ServiceContainer';
import { TestExecutionService, TestExecutionRequest } from './TestExecutionService';
import { ProjectSelectionService, ProjectSelectionResult } from './ProjectSelectionService';
import { UserFriendlyErrors } from '../utils/userFriendlyErrors';
import { UserFriendlyErrorHandler } from '../utils/UserFriendlyErrorHandler';
import { ContextCompiler } from '../modules/aiContext/ContextCompiler';
import { QuickPickUtils } from '../utils/QuickPickUtils';
import { CopilotUtils } from '../utils/CopilotUtils';
import { MessageUtils } from '../utils/MessageUtils';

/**
 * Main orchestrator for test menu and execution flow
 */
export class TestMenuOrchestrator {
    private testExecution: TestExecutionService;
    private projectSelection: ProjectSelectionService;

    constructor(private services: ServiceContainer) {
        this.testExecution = new TestExecutionService(services);
        this.projectSelection = new ProjectSelectionService(services);
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
                    
                case 'current-context':
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
                await this.executeProjectTest(selectedProject, { previousMenu: 'project-browser' });
            }
        } catch (error) {
            await this.handleError(error, 'showProjectBrowser');
        }
    }

    /**
     * Generic execute method - consolidates all test execution types
     */
    async execute(options: {
        type: 'project' | 'affected' | 'auto-detect' | 'context' | 'setup' | 'clear-cache';
        target?: string;
        navigationContext?: { previousMenu?: 'main' | 'project-browser' | 'context-browser' | 'custom'; customCommand?: string };
    }): Promise<void> {
        try {
            switch (options.type) {
                case 'project':
                    await this.executeProject(options.target!, options.navigationContext);
                    break;
                case 'affected':
                    await this.executeAffected();
                    break;
                case 'auto-detect':
                    await this.executeAutoDetect();
                    break;
                case 'context':  
                    await this.executeFromContext();
                    break;
                case 'setup':
                    await this.executeSetup();
                    break;
                case 'clear-cache':
                    await this.executeClearCache();
                    break;
                default:
                    throw new Error(`Unknown execution type: ${options.type}`);
            }
        } catch (error) {
            await this.handleError(error, `execute-${options.type}`);
        }
    }

    // Keep backwards compatibility
    async executeProjectTest(project: string, navigationContext?: any): Promise<void> {
        await this.execute({ type: 'project', target: project, navigationContext });
    }

    private async executeProject(project: string, navigationContext?: any): Promise<void> {
        const request: TestExecutionRequest = {
            project,
            mode: 'default',
            verbose: true,
            navigationContext
        };
        await this.testExecution.executeTest(request, (progress) => {
            // Real-time progress is handled by TestExecutionService
        });
    }

    private async executeAffected(): Promise<void> {
        const request: TestExecutionRequest = {
            mode: 'affected',
            verbose: true
        };
        await this.testExecution.executeTest(request);
    }

    private async executeAutoDetect(): Promise<void> {
        await this.runAutoDetectProjects();
    }

    private async executeFromContext(): Promise<void> {
        await this.executeContextRerun();
    }

    private async executeSetup(): Promise<void> {
        this.services.updateStatusBar('🍎 Running setup...', 'yellow');
        await this.services.setupWizard.runSetupWizard();
        this.services.updateStatusBar('✅ Setup complete', 'green');
    }

    private async executeClearCache(): Promise<void> {
        this.services.updateStatusBar('Clearing cache...', 'yellow');
        await this.services.projectDiscovery.clearCache();
        this.services.updateStatusBar('🗑️ Cache cleared');
        vscode.window.showInformationMessage('Test cache cleared successfully');
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
     * Send content to Copilot Chat - simplified reliable approach
     */
    private async sendToCopilotChat(content: string): Promise<boolean> {
        try {
            this.services.outputChannel.appendLine(`📋 Preparing context for Copilot Chat (${Math.round(content.length / 1024)}KB)`);
            
            // Copy to clipboard
            await vscode.env.clipboard.writeText(content);
            this.services.outputChannel.appendLine('✅ Content copied to clipboard');
            
            // Try to open Copilot Chat
            const opened = await this.openCopilotChat();
            
            if (opened) {
                this.services.outputChannel.appendLine('🤖 Copilot Chat opened');
                MessageUtils.showInfo('📋 Context ready! Paste with Ctrl+V/Cmd+V and press Enter in Copilot Chat.');
                return true;
            } else {
                this.services.outputChannel.appendLine('⚠️ Could not open Copilot Chat - showing instructions');
                MessageUtils.showInfo('📋 Context copied to clipboard. Please open Copilot Chat and paste manually.');
                return false;
            }
            
        } catch (error) {
            this.services.outputChannel.appendLine(`❌ Error sending to Copilot: ${error}`);
            await vscode.env.clipboard.writeText(content);
            MessageUtils.showError('❌ Context copied to clipboard. Please paste in Copilot Chat manually.');
            return false;
        }
    }

    /**
     * Try to open Copilot Chat - simplified approach
     */
    private async openCopilotChat(): Promise<boolean> {
        const commands = [
            'workbench.panel.chat.view.copilot.focus',
            'github.copilot.openChat'
        ];
        
        for (const command of commands) {
            try {
                await vscode.commands.executeCommand(command);
                return true;
            } catch {
                continue;
            }
        }
        return false;
    }



    // Backwards compatibility method
    async runGitAffected(): Promise<void> {
        await this.execute({ type: 'affected' });
    }


    /**
     * Open post-test context panel
     */
    async openPostTestContext(): Promise<void> {
        try {
            this.services.updateStatusBar('📖 Opening current context...', 'yellow');

            const fs = require('fs');
            const path = require('path');
            const contextDir = path.join(this.services.workspaceRoot, '.github', 'instructions', 'ai-utilities-context');

            if (!fs.existsSync(contextDir)) {
                vscode.window.showInformationMessage('No current context files found.');
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
                vscode.window.showInformationMessage('No current context files available.');
                this.services.updateStatusBar('Ready');
                return;
            }

            // Create menu items starting with navigation and actions
            const items: any[] = [];

            // Add navigation and actions first as specified
            // Back button
            items.push(QuickPickUtils.createBackButton());

            // Re-Submit Current Context
            items.push({
                label: 'Re-Submit Current Context',
                detail: 'Apply your context files',
                description: '✅❌'
            });

            // Build file items with details and add to the list
            const fileItems = files.map((file: string) => {
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

            // Add file items after navigation and actions
            items.push(...fileItems);
          
            const quickPick = QuickPickUtils.showManualQuickPick(
                items,
                {
                    title: '📖 Current Context Files',
                    placeholder: 'Select a context file to view'
                },
                (text: string) => this.services.updateStatusBar(text)
            );

            quickPick.onDidAccept(async () => {
                const selection = quickPick.activeItems[0];
                quickPick.hide();

                if (QuickPickUtils.isBackButton(selection)) {
                    // Return to main menu
                    this.services.updateStatusBar('Ready');
                    this.showMainMenu();
                } else if (selection.label.includes('Re-Submit Current Context')) {
                    // Analyze context files and show appropriate test menu
                    await this.showTestResultActions(contextDir);
                } else {
                    // Open selected file
                    const fileName = selection.label.replace(/^\$\([^)]+\)\s*/, '');
                    const filePath = vscode.Uri.file(path.join(contextDir, fileName));
                    vscode.window.showTextDocument(filePath);
                    this.services.updateStatusBar('📖 Context opened', 'green');
                }
            });

        } catch (error) {
            this.services.updateStatusBar('❌ Context error', 'red');
            await this.handleError(error, 'openPostTestContext');
        }
    }

    /**
     * Show test result actions based on context analysis
     */
    private async showTestResultActions(contextDir: string): Promise<void> {
        try {
            this.services.updateStatusBar('📊 Analyzing test results...', 'yellow');
            
            const fs = require('fs');
            const path = require('path');
            
            // Look for test output files to analyze
            const testOutputPath = path.join(contextDir, 'test-output.txt');
            const contextPath = path.join(contextDir, 'ai-debug-context.txt');
            
            let hasFailures = false;
            let testSummary: any = null;
            
            // First, try to read test-output.txt
            if (fs.existsSync(testOutputPath)) {
                const testOutput = fs.readFileSync(testOutputPath, 'utf8');
                testSummary = this.parseTestOutput(testOutput);
                hasFailures = !testSummary.success;
            }
            // Fallback to checking ai-debug-context.txt
            else if (fs.existsSync(contextPath)) {
                const contextContent = fs.readFileSync(contextPath, 'utf8');
                hasFailures = this.detectFailuresInContext(contextContent);
                // Create a basic test summary for the context
                testSummary = {
                    project: 'Current Project',
                    success: !hasFailures,
                    failed: hasFailures ? 1 : 0,
                    passed: hasFailures ? 0 : 1,
                    total: 1,
                    duration: 0,
                    failures: []
                };
            }
            else {
                vscode.window.showWarningMessage('No test context files found to analyze.');
                this.services.updateStatusBar('Ready');
                return;
            }
            
            // Show appropriate menu based on test results using the public interface
            // Set navigation context to return to context browser
            this.services.testActions.setNavigationContext({ previousMenu: 'context-browser' });
            await this.services.testActions.showTestResult(testSummary);
            
        } catch (error) {
            this.services.updateStatusBar('❌ Analysis error', 'red');
            await this.handleError(error, 'showTestResultActions');
        }
    }
    
    /**
     * Parse test output to determine success/failure
     */
    private parseTestOutput(output: string): any {
        // Use the existing TestResultParser
        const { TestResultParser } = require('../utils/testResultParser');
        return TestResultParser.parseNxOutput(output, 'Context Analysis');
    }
    
    /**
     * Detect failures in AI context content
     */
    private detectFailuresInContext(contextContent: string): boolean {
        const failureIndicators = [
            'FAIL ',
            'Test suite failed to run',
            'tests failed',
            'error TS',
            'Cannot find module',
            'SyntaxError',
            'TypeError',
            'AssertionError',
            'Test run failed',
            'failing tests',
            'failed with',
            '❌',
            'failures:',
            'test failures'
        ];
        
        const lowerContent = contextContent.toLowerCase();
        return failureIndicators.some(indicator => 
            lowerContent.includes(indicator.toLowerCase())
        );
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
            
            const [projects, frameworks, workspaceAnalysis] = await Promise.all([
                this.services.projectDiscovery.getAllProjects(),
                this.services.configManager.getDetectedFrameworks(),
                this.services.workspaceAnalyzer.getFormattedSummary()
            ]);

            const info = [
                `Workspace: ${this.services.workspaceRoot}`,
                `Projects found: ${projects.length}`,
                `Frameworks detected: ${frameworks.map(f => f.name).join(', ') || 'None'}`,
                ...workspaceAnalysis,
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

    // Backwards compatibility method
    async clearTestCache(): Promise<void> {
        await this.execute({ type: 'clear-cache' });
    }

    // Backwards compatibility method  
    async runSetup(): Promise<void> {
        await this.execute({ type: 'setup' });
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

    // Backwards compatibility method
    async rerunProjectTestsFromContext(): Promise<void> {
        await this.execute({ type: 'context' });
    }

    private async executeContextRerun(): Promise<void> {
        this.services.updateStatusBar('🔄 Analyzing context for re-run...', 'yellow');
        
        const fs = require('fs');
        const path = require('path');
        const contextDir = path.join(this.services.workspaceRoot, '.github', 'instructions', 'ai-utilities-context');
        
        if (!fs.existsSync(contextDir)) {
            vscode.window.showInformationMessage('No test context found. Run tests first to generate context.');
            this.services.updateStatusBar('Ready');
            return;
        }
        
        let projectName: string | null = null;
        const testOutputPath = path.join(contextDir, 'test-output.txt');
        const contextPath = path.join(contextDir, 'ai-debug-context.txt');
        
        if (fs.existsSync(testOutputPath)) {
            const testOutput = fs.readFileSync(testOutputPath, 'utf8');
            projectName = this.extractProjectFromTestOutput(testOutput);
        }
        
        if (!projectName && fs.existsSync(contextPath)) {
            const contextContent = fs.readFileSync(contextPath, 'utf8');
            projectName = this.extractProjectFromContext(contextContent);
        }
        
        if (!projectName) {
            this.services.outputChannel.appendLine('🔄 No specific project found in context, running affected tests...');
            await this.executeAffected();
            return;
        }
        
        this.services.outputChannel.appendLine(`🔄 Re-running tests for project: ${projectName}`);
        await this.executeProject(projectName, { previousMenu: 'context-browser' });
    }

    /**
     * Extract project name from test output
     */
    private extractProjectFromTestOutput(testOutput: string): string | null {
        // Look for common patterns that indicate project name
        const patterns = [
            /yarn nx test (\w+[\w-]*)/,
            /npm run test (\w+[\w-]*)/,
            /nx test (\w+[\w-]*)/,
            /Testing (\w+[\w-]*)/i,
            /Project: (\w+[\w-]*)/i,
            /\[(\w+[\w-]*)\] tests/i
        ];
        
        for (const pattern of patterns) {
            const match = testOutput.match(pattern);
            if (match && match[1] && match[1] !== 'test') {
                return match[1];
            }
        }
        
        return null;
    }

    /**
     * Extract project name from AI context content
     */
    private extractProjectFromContext(contextContent: string): string | null {
        // Look for project references in context
        const patterns = [
            /Project: (\w+[\w-]*)/i,
            /Testing (\w+[\w-]*) project/i,
            /## Project: (\w+[\w-]*)/,
            /\*\*Project:\*\* (\w+[\w-]*)/,
            /Running tests for (\w+[\w-]*)/i
        ];
        
        for (const pattern of patterns) {
            const match = contextContent.match(pattern);
            if (match && match[1]) {
                return match[1];
            }
        }
        
        return null;
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
     * Simplified error handling - consolidate into 2 types: User Error and System Error
     */
    private async handleError(error: any, operation: string): Promise<void> {
        this.services.updateStatusBar('❌ Error', 'red');
        
        // Log for debugging
        this.services.outputChannel.appendLine(`❌ ${operation} failed: ${error}\n`);
        
        // For tests, just log. In production, show appropriate message based on error type
        if (typeof jest !== 'undefined') {
            this.services.outputChannel.appendLine(`Error type: ${this.isUserError(error) ? 'User' : 'System'}`);
            return;
        }
        
        // Determine error type and show appropriate message
        if (this.isUserError(error)) {
            // User Error: Something the user can fix
            MessageUtils.showWarning(`❌ ${operation} failed. Please check your configuration and try again.`);
        } else {
            // System Error: Internal issue
            MessageUtils.showError(`❌ ${operation} encountered an internal error. Check output for details.`);
        }
    }

    /**
     * Determine if error is user-fixable or system-level
     */
    private isUserError(error: any): boolean {
        const errorString = String(error).toLowerCase();
        const userErrorPatterns = ['command not found', 'no such file', 'permission denied', 'configuration'];
        return userErrorPatterns.some(pattern => errorString.includes(pattern));
    }
}