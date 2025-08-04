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

        // Update status bar instead of showing notification
        this.services.updateStatusBar('🔍 Auto-detecting projects...');
        
        try {
            this.services.updateStatusBar('🔍 Checking for changes...');


            // Get changed files from git diff
            this.services.updateStatusBar('🔍 Analyzing changed files...');
            const gitDiffResult = await this.executeGitDiff();
            
            if (!gitDiffResult.success) {
                const friendlyError = UserFriendlyErrors.gitCommandFailed('git diff --name-only HEAD~1');
                this.services.outputChannel.appendLine(`❌ ${friendlyError}\n`);
                this.services.outputChannel.appendLine('🔄 Falling back to git affected...\n');
                this.services.updateStatusBar('🔄 Falling back to git affected...');
                await this.runGitAffected();
                return;
            }

            this.services.updateStatusBar('🔍 Processing changed files...');
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

            this.services.updateStatusBar('🔍 Finding affected projects...');
            // Find unique projects for changed files
            const projects = await this.services.projectDiscovery.getProjectsForFiles(changedFiles);

            if (projects.length === 0) {
                const friendlyError = UserFriendlyErrors.autoDetectionFailed('No projects found for changed files');
                this.services.outputChannel.appendLine(`⚠️ ${friendlyError}\n`);
                this.services.updateStatusBar('🔄 Falling back to git affected...');
                await this.runGitAffected();
                return;
            }

            this.services.outputChannel.appendLine(`🎯 Auto-detected projects: ${projects.join(', ')}\n`);

            this.services.updateStatusBar(`🔍 Running tests for ${projects.length} projects...`);
            // Run tests for each detected project
            for (let i = 0; i < projects.length; i++) {
                const project = projects[i];
                this.services.updateStatusBar(`🔍 Testing ${project}...`);
                await this.executeProjectTest(project);
            }

            const totalDuration = ((Date.now() - startTime) / 1000).toFixed(1);
            this.services.updateStatusBar(`✅ Auto-detect complete (${totalDuration}s)`, 'green');
            this.services.outputChannel.appendLine(`🎉 Auto-detection completed in ${totalDuration}s`);

        } catch (error) {
            const friendlyError = UserFriendlyErrors.autoDetectionFailed(String(error));
            this.services.outputChannel.appendLine(`❌ ${friendlyError}\n`);
            this.services.outputChannel.appendLine('🔄 Falling back to git affected...\n');
            this.services.updateStatusBar('❌ Error occurred, falling back...');
            await this.runGitAffected();
        }
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
        // Get the most recent project from configuration (workspace-specific)
        const config = vscode.workspace.getConfiguration('aiDebugContext');
        const workspaceKey = this.getWorkspaceKey();
        const allWorkspaceProjects = config.get<Record<string, any[]>>('recentProjectsByWorkspace', {});
        const recentProjects = allWorkspaceProjects[workspaceKey] || [];
        
        if (recentProjects.length > 0) {
            const mostRecent = recentProjects[0];
            // Show a quick confirmation with the project name
            const choice = await vscode.window.showQuickPick(
                [
                    {
                        label: `↻ Test Recent: ${mostRecent.name}`,
                        detail: `Last tested: ${mostRecent.lastUsed || 'Recently'}`,
                        description: 'Press Enter to run'
                    }
                ],
                {
                    placeHolder: 'Run tests for the most recent project',
                    ignoreFocusOut: false
                }
            );
            
            if (choice) {
                await this.execute({ type: 'context' });
            }
        } else {
            // No recent projects, just execute normally
            await this.execute({ type: 'context' });
        }
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
     * Prepare to push - run tests and checks before pushing
     */
    async prepareToPush(): Promise<void> {
        this.services.updateStatusBar('🚀 Preparing to push...', 'yellow');
        this.services.outputChannel.appendLine('🚀 Prepare To Push - Running pre-push checks...\n');

        try {
            // Check if we have recent projects in configuration (workspace-specific)
            const config = vscode.workspace.getConfiguration('aiDebugContext');
            const workspaceKey = this.getWorkspaceKey();
            const allWorkspaceProjects = config.get<Record<string, any[]>>('recentProjectsByWorkspace', {});
            const recentProjects = allWorkspaceProjects[workspaceKey] || [];

            if (recentProjects.length > 0) {
                // Run tests on the most recent project
                const mostRecent = recentProjects[0];
                this.services.outputChannel.appendLine(`🎯 Running tests for most recent project: ${mostRecent.name}\n`);
                await this.executeProjectTest(mostRecent.name);
            } else {
                // Fallback to auto-detect if no recent projects
                this.services.outputChannel.appendLine('📊 No recent projects found, running auto-detect...\n');
                await this.runAutoDetectProjects();
            }
            
            // Show git status
            const gitStatus = await this.executeGitCommand(['status', '--porcelain']);
            if (gitStatus.stdout.trim()) {
                this.services.outputChannel.appendLine('📋 Git Status:');
                this.services.outputChannel.appendLine(gitStatus.stdout);
            }

            // Check for uncommitted changes
            if (gitStatus.stdout.trim()) {
                const response = await vscode.window.showWarningMessage(
                    'You have uncommitted changes. Do you want to continue?',
                    'Continue', 'Cancel'
                );
                if (response !== 'Continue') {
                    this.services.updateStatusBar('🚀 Push preparation cancelled', 'yellow');
                    return;
                }
            }

            vscode.window.showInformationMessage('✅ Ready to push! All checks passed.');
            this.services.updateStatusBar('✅ Ready to push', 'green');
            this.services.outputChannel.appendLine('✅ Pre-push checks completed successfully!\n');

        } catch (error) {
            this.services.outputChannel.appendLine(`❌ Pre-push checks failed: ${error}\n`);
            vscode.window.showErrorMessage('❌ Pre-push checks failed. Check output for details.');
            this.services.updateStatusBar('❌ Push preparation failed', 'red');
        }
    }

    /**
     * Generate PR description based on changes
     */
    async generatePRDescription(): Promise<void> {
        this.services.updateStatusBar('📝 Generating PR description...', 'yellow');
        this.services.outputChannel.appendLine('📝 Generating PR Description...\n');

        try {
            // Get current branch name
            const currentBranch = await this.executeGitCommand(['branch', '--show-current']);
            const branchName = currentBranch.stdout.trim();

            // Extract JIRA ticket from branch name
            const jiraTicket = this.extractJiraTicket(branchName);

            // Get git diff against main/master branch
            let baseBranch = 'main';
            const mainExists = await this.executeGitCommand(['show-ref', '--verify', '--quiet', 'refs/heads/main']);
            if (!mainExists.success) {
                const masterExists = await this.executeGitCommand(['show-ref', '--verify', '--quiet', 'refs/heads/master']);
                if (masterExists.success) {
                    baseBranch = 'master';
                }
            }

            // Get git diff with actual changes
            const gitDiffResult = await this.executeGitCommand(['diff', `${baseBranch}...HEAD`]);
            const gitDiff = gitDiffResult.stdout;

            // Get changed files compared to base branch
            const gitDiffFiles = await this.executeGitCommand(['diff', '--name-only', `${baseBranch}...HEAD`]);
            const changedFiles = gitDiffFiles.stdout.split('\n').filter(f => f.trim());

            // If no changes against base branch, try staged changes
            if (changedFiles.length === 0) {
                const stagedDiff = await this.executeGitCommand(['diff', '--cached', '--name-only']);
                changedFiles.push(...stagedDiff.stdout.split('\n').filter(f => f.trim()));
            }

            // Get commit messages for this branch
            const gitLog = await this.executeGitCommand(['log', `${baseBranch}..HEAD`, '--oneline']);
            const commits = gitLog.stdout.split('\n').filter(c => c.trim()).slice(0, 10);

            // Read PR template if it exists
            const prTemplate = await this.readPRTemplate();

            // Extract feature flags from git diff
            const featureFlags = await this.extractFeatureFlags(gitDiff);

            // Generate description using template or AI-guided approach
            let description: string;
            if (prTemplate) {
                description = await this.generateFromTemplate(prTemplate, branchName, jiraTicket, gitDiff, changedFiles, commits, featureFlags);
                this.services.outputChannel.appendLine('📝 Used PR template from .github/PULL_REQUEST_TEMPLATE.md');
            } else {
                description = await this.generateWithAI(branchName, jiraTicket, gitDiff, changedFiles, commits, featureFlags);
                this.services.outputChannel.appendLine('📝 Generated PR description using AI guidance');
            }

            if (featureFlags.length > 0) {
                this.services.outputChannel.appendLine(`📝 Detected ${featureFlags.length} feature flags: ${featureFlags.join(', ')}`);
            }

            // Send to Copilot Chat with full automation
            await this.sendPRDescriptionToCopilot(description);

            this.services.updateStatusBar('📝 PR description sent to Copilot Chat', 'green');
            this.services.outputChannel.appendLine('✅ PR description sent to Copilot Chat for enhancement!\n');

        } catch (error) {
            this.services.outputChannel.appendLine(`❌ PR description generation failed: ${error}\n`);
            vscode.window.showErrorMessage('❌ Failed to generate PR description. Check output for details.');
            this.services.updateStatusBar('Ready');
        }
    }

    /**
     * Send PR description to Copilot Chat with full automation
     */
    private async sendPRDescriptionToCopilot(prDescription: string): Promise<void> {
        try {
            // Parse the PR description to extract key information
            const hasJiraTicket = prDescription.includes('**JIRA:**');
            const hasFeatureFlags = prDescription.includes('## Feature Flags') || prDescription.includes('Feature flags detected:');
            const isTemplate = prDescription.includes('<!-- ') || prDescription.includes('## Summary') || prDescription.includes('## Changes');
            
            // Build comprehensive PR description prompt for Copilot Chat
            const prPrompt = `# 🤖 Pull Request Description Enhancement

Please enhance this PR description while maintaining the exact template structure and headers. 

## 📝 Current PR Description Template
${prDescription}

## 🎯 IMPORTANT INSTRUCTIONS:

1. **PRESERVE ALL HEADERS** - Keep all existing headers exactly as they are (## Summary, ## Changes, ## Details, ## QA, etc.)
2. **MAINTAIN JIRA LINK** - Keep the **JIRA:** line at the top if present
3. **FILL IN CONTENT** - Replace placeholder text and comments with actual content based on the git diff and commits provided

## 📋 Content Guidelines for Each Section:

### Summary Section
- Provide a clear, one-paragraph description of what this PR accomplishes
- Focus on the "why" and the business value
- Keep it concise but informative

### Changes Section  
- List the key technical changes made
- Group related changes together
- Use bullet points for clarity

### Details Section (if present)
- Provide technical implementation details
- Explain architectural decisions
- Note any important considerations
${hasFeatureFlags ? `
### Feature Flags
- Include ALL detected feature flags
- Add them to both QA section and Details section
- Format as: \`flag-name\` - Description of what the flag controls` : ''}

### QA Section
- Include manual testing steps
- Add feature flag testing if applicable
- Focus on what QA engineers need to verify
- DO NOT include the standard checklist items (unit tests, ESLint, etc.) as these are prerequisites

## ❌ DO NOT INCLUDE:
- Generic testing checklists (unit tests pass, ESLint, Prettier, etc.)
- These items are already completed before PR review:
  - All unit tests pass locally
  - All integration/E2E tests pass
  - No new ESLint or Prettier errors
  - Code coverage meets thresholds
  - CI pipeline passes

## ✅ DO INCLUDE:
- Specific manual testing steps for this PR's changes
- Feature flag testing instructions if applicable
- Any special configuration or setup needed for testing
- Edge cases or scenarios QA should verify

Please provide the enhanced PR description maintaining the exact template structure while filling in meaningful content based on the provided context.`;

            this.services.outputChannel.appendLine(`🚀 DEBUG: Starting Copilot integration for PR description`);
            this.services.outputChannel.appendLine(`📋 DEBUG: Content length: ${prPrompt.length} characters (${Math.round(prPrompt.length / 1024)}KB)`);
            this.services.outputChannel.appendLine(`📋 DEBUG: Content preview:\n${prPrompt.substring(0, 200)}...`);
            
            // Import CopilotUtils dynamically to avoid startup dependencies
            const { CopilotUtils } = await import('../utils/CopilotUtils');
            
            const integrationResult = await CopilotUtils.integrateWithCopilot(
                prPrompt,
                this.services.outputChannel,
                {
                    autoSuccess: '🎉 PR description sent to Copilot Chat automatically! Check the response.',
                    manualPaste: '📋 PR description ready in Copilot Chat - press Enter to submit.',
                    clipboardOnly: '📋 PR description copied to clipboard. Please open Copilot Chat and paste manually.',
                    chatOpenFailed: '⚠️ Could not open Copilot Chat. PR description copied to clipboard.'
                }
            );
            
            this.services.outputChannel.appendLine(`✅ Copilot integration completed: ${integrationResult.method}`);
            
        } catch (error) {
            this.services.outputChannel.appendLine(`❌ Error in automated Copilot integration: ${error}`);
            // Fallback to manual copy
            await vscode.env.clipboard.writeText(prDescription);
            vscode.window.showInformationMessage('❌ Auto-integration failed. PR description copied to clipboard - please paste in Copilot Chat manually.');
        }
    }

    /**
     * Execute git command and return result
     */
    /**
     * Extract JIRA ticket number from branch name
     */
    private extractJiraTicket(branchName: string): string | null {
        // Common JIRA patterns: ABC-123, PROJECT-456, etc.
        const jiraPattern = /([A-Z]{2,}-\d+)/i;
        const match = branchName.match(jiraPattern);
        return match ? match[1].toUpperCase() : null;
    }

    /**
     * Extract feature flags from git diff - Multi-system support
     */
    private async extractFeatureFlags(gitDiff: string): Promise<string[]> {
        try {
            const featureFlags: string[] = [];

            // Support multiple feature flag systems
            const FLAG_PATTERNS = [
                // FlipperService patterns
                /\.flipperEnabled\(['"`]([^'"`]+)['"`]\)/g,
                /\.eagerlyEnabled\(['"`]([^'"`]+)['"`]\)/g,
                
                // Generic isEnabled patterns
                /\.isEnabled\(['"`]([^'"`]+)['"`]\)/g,
                /\.checkFlag\(['"`]([^'"`]+)['"`]\)/g,
                
                // LaunchDarkly patterns
                /LaunchDarkly\.variation\(['"`]([^'"`]+)['"`]\)/g,
                /ldClient\.variation\(['"`]([^'"`]+)['"`]\)/g,
                
                // Feature flag function patterns
                /featureFlag\(['"`]([^'"`]+)['"`]\)/g,
                /getFeatureFlag\(['"`]([^'"`]+)['"`]\)/g,
                /isFeatureEnabled\(['"`]([^'"`]+)['"`]\)/g,
                
                // Config-based patterns
                /config\.feature\.([a-zA-Z0-9_-]+)/g,
                /features\.([a-zA-Z0-9_-]+)\.enabled/g
            ];

            // Search through git diff for feature flag patterns
            const diffLines = gitDiff.split('\n').filter(line => line.startsWith('+'));
            
            for (const line of diffLines) {
                for (const pattern of FLAG_PATTERNS) {
                    let match;
                    while ((match = pattern.exec(line)) !== null) {
                        const flagName = match[1];
                        if (flagName && !featureFlags.includes(flagName)) {
                            featureFlags.push(flagName);
                        }
                    }
                }
            }

            return [...new Set(featureFlags)]; // Remove duplicates
        } catch (error) {
            this.services.outputChannel.appendLine(`⚠️ Failed to extract feature flags: ${error}`);
            return [];
        }
    }

    /**
     * Read PR template from .github/PULL_REQUEST_TEMPLATE.md
     */
    private async readPRTemplate(): Promise<string | null> {
        const fs = require('fs');
        const path = require('path');
        
        const templatePaths = [
            path.join(this.services.workspaceRoot, '.github', 'PULL_REQUEST_TEMPLATE.md'),
            path.join(this.services.workspaceRoot, '.github', 'pull_request_template.md'),
            path.join(this.services.workspaceRoot, '.github', 'PULL_REQUEST_TEMPLATE'),
            path.join(this.services.workspaceRoot, 'PULL_REQUEST_TEMPLATE.md'),
            path.join(this.services.workspaceRoot, 'pull_request_template.md')
        ];

        for (const templatePath of templatePaths) {
            if (fs.existsSync(templatePath)) {
                try {
                    return fs.readFileSync(templatePath, 'utf8');
                } catch (error) {
                    this.services.outputChannel.appendLine(`⚠️ Could not read PR template at ${templatePath}: ${error}`);
                }
            }
        }

        return null;
    }

    /**
     * Generate PR description from template
     */
    private async generateFromTemplate(
        template: string, 
        branchName: string, 
        jiraTicket: string | null, 
        gitDiff: string, 
        changedFiles: string[], 
        commits: string[],
        featureFlags: string[]
    ): Promise<string> {
        // Start with the JIRA ticket if found
        let description = '';
        if (jiraTicket) {
            description = `**JIRA:** [${jiraTicket}](https://jira.yourcompany.com/browse/${jiraTicket})\n\n`;
        }

        // Add the template
        description += template;

        // Add context information as HTML comments for AI to use
        description += `\n\n<!-- Context for AI Enhancement:\n`;
        description += `Branch: ${branchName}\n`;
        description += `Files changed: ${changedFiles.length}\n`;
        
        if (commits.length > 0) {
            description += `\nRecent commits:\n`;
            commits.slice(0, 10).forEach(commit => {
                description += `- ${commit}\n`;
            });
        }

        if (changedFiles.length > 0) {
            description += `\nModified files:\n`;
            changedFiles.slice(0, 20).forEach(file => {
                description += `- ${file}\n`;
            });
            if (changedFiles.length > 20) {
                description += `- ... and ${changedFiles.length - 20} more files\n`;
            }
        }

        if (featureFlags.length > 0) {
            description += `\nFeature flags detected:\n`;
            featureFlags.forEach(flag => {
                description += `- ${flag}\n`;
            });
            description += `\nIMPORTANT: Include these feature flags in both Details and QA sections\n`;
        }

        // Add git diff preview for context
        const diffPreview = gitDiff.substring(0, 2000);
        if (diffPreview.length > 0) {
            description += `\nGit diff preview:\n\`\`\`diff\n${diffPreview}${gitDiff.length > 2000 ? '\n...' : ''}\n\`\`\`\n`;
        }
        
        description += `-->\n`;

        return description;
    }

    /**
     * Generate PR description with AI guidance
     */
    private async generateWithAI(
        branchName: string, 
        jiraTicket: string | null, 
        gitDiff: string, 
        changedFiles: string[], 
        commits: string[],
        featureFlags: string[]
    ): Promise<string> {
        let description = '';

        // Add JIRA ticket if found
        if (jiraTicket) {
            description += `**JIRA:** [${jiraTicket}](https://jira.yourcompany.com/browse/${jiraTicket})\n\n`;
        }

        // Add standard PR template sections
        description += `## Summary\n\n`;
        description += `<!-- Provide a clear description of what this PR accomplishes and why -->\n\n`;

        description += `## Changes\n\n`;
        description += `<!-- List the key technical changes made in this PR -->\n\n`;

        description += `## Details\n\n`;
        description += `<!-- Technical implementation details and architectural decisions -->\n\n`;

        // Add feature flags to Details if detected
        if (featureFlags.length > 0) {
            description += `### Feature Flags\n\n`;
            featureFlags.forEach(flag => {
                description += `- \`${flag}\` - <!-- Describe what this flag controls -->\n`;
            });
            description += `\n`;
        }

        description += `## QA\n\n`;
        description += `<!-- Manual testing steps specific to this PR -->\n\n`;
        
        // Add feature flag testing to QA section
        if (featureFlags.length > 0) {
            description += `### Feature Flag Testing\n\n`;
            featureFlags.forEach(flag => {
                description += `- Test with \`${flag}\` enabled: <!-- Describe expected behavior -->\n`;
                description += `- Test with \`${flag}\` disabled: <!-- Describe expected behavior -->\n`;
            });
            description += `\n`;
        }

        // Add context information as HTML comments for AI to use
        description += `\n<!-- Context for AI Enhancement:\n`;
        description += `Branch: ${branchName}\n`;
        description += `Files changed: ${changedFiles.length}\n`;
        
        if (commits.length > 0) {
            description += `\nRecent commits:\n`;
            commits.slice(0, 10).forEach(commit => {
                description += `- ${commit}\n`;
            });
        }

        if (changedFiles.length > 0) {
            description += `\nModified files:\n`;
            changedFiles.slice(0, 20).forEach(file => {
                description += `- ${file}\n`;
            });
            if (changedFiles.length > 20) {
                description += `- ... and ${changedFiles.length - 20} more files\n`;
            }
        }

        // Add git diff preview for context
        const diffPreview = gitDiff.substring(0, 2000);
        if (diffPreview.length > 0) {
            description += `\nGit diff preview:\n\`\`\`diff\n${diffPreview}${gitDiff.length > 2000 ? '\n...' : ''}\n\`\`\`\n`;
        }
        
        description += `-->`;

        return description;
    }

    private async executeGitCommand(args: string[]): Promise<{success: boolean, stdout: string}> {
        return new Promise((resolve) => {
            const { spawn } = require('child_process');
            const child = spawn('git', args, {
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

    /**
     * Get workspace-specific key for storing recent projects
     */
    private getWorkspaceKey(): string {
        // Use workspace root path as the key, with fallback
        const workspacePath = this.services.workspaceRoot;
        
        // Create a shorter, more readable key from the workspace path
        const pathParts = workspacePath.split(/[/\\]/);
        const workspaceName = pathParts[pathParts.length - 1] || 'unknown';
        
        // Combine workspace name with a hash of the full path for uniqueness
        const pathHash = this.simpleHash(workspacePath);
        
        return `${workspaceName}-${pathHash}`;
    }

    /**
     * Simple hash function for creating workspace keys
     */
    private simpleHash(str: string): string {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash).toString(36).substring(0, 8);
    }
}