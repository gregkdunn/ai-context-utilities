/**
 * Command Registry for VSCode Extension Commands
 * Part of Phase 1.8 architectural refactoring
 * 
 * Centralizes all command registration and removes command logic from extension.ts
 */

import * as vscode from 'vscode';
import { ServiceContainer } from './ServiceContainer';
import { UserFriendlyErrors } from '../utils/userFriendlyErrors';
import { TestResultParser } from '../utils/testResultParser';
import { LegacyStyleFormatter } from '../utils/legacyStyleFormatter';

/**
 * Registry for all extension commands with proper service injection
 */
export class CommandRegistry {
    private commands: vscode.Disposable[] = [];

    constructor(private services: ServiceContainer) {}

    /**
     * Register all extension commands
     */
    registerAll(): vscode.Disposable[] {
        this.commands = [
            this.registerRunAffectedTests(),
            this.registerStartFileWatcher(),
            this.registerClearTestCache(),
            this.registerRunSetup(),
            this.registerSelectProject(),
            this.registerShowWorkspaceInfo(),
            this.registerRunAffectedTestsQuick(),
            this.registerRunGitAffected(),
            this.registerRunManualProject()
        ];

        return this.commands;
    }

    /**
     * Show the main test execution menu with unified input and buttons
     */
    private async showMainTestMenu(): Promise<void> {
        this.services.updateStatusBar('🚀 Ready for input...', 'yellow');
        
        // Get available projects for suggestions and recent project info
        let projectSuggestions: string[] = [];
        let recentProjectsList: any[] = [];
        try {
            const allProjects = await this.services.projectDiscovery.getAllProjects();
            projectSuggestions = allProjects.map(p => p.name);
            
            // Get recent projects from workspace state
            const workspaceState = vscode.workspace.getConfiguration('aiDebugContext');
            const rawRecentProjects = workspaceState.get<any[]>('recentProjects', []);
            
            // Clean up any corrupted entries and ensure all have valid names
            recentProjectsList = rawRecentProjects.filter(p => {
                // Filter out any corrupted entries
                if (!p || typeof p !== 'object') return false;
                if (!p.name || typeof p.name !== 'string') return false;
                if (p.name === '[object Object]' || p.name === '[Object object]') return false;
                return true;
            });
        } catch (error) {
            // Continue without suggestions if project discovery fails
            projectSuggestions = [];
        }

        // Create quickpick with custom items - combining input and buttons
        const quickPick = vscode.window.createQuickPick();
        quickPick.title = '🧪 AI Debug Context - Test Runner';
        quickPick.placeholder = 'Type project name or select an option below';
        quickPick.ignoreFocusOut = true;
        
        // Create items for button options in new order with color icons
        const items: vscode.QuickPickItem[] = [
            {
                label: '$(zap) Test Affected Projects',
                detail: 'Test all files in affected projects',
                description: '$(sparkle) Smart'
            },
            {
                label: '$(git-pull-request) Test Updated Files',
                detail: 'Test only updated files',
                description: '$(target) Focused'
            },
            {
                label: '$(folder-library) Select Project',
                detail: 'Select a specific project to test',
                description: '$(list-tree) Browse'
            }
        ];

        // Add recent projects if available (up to 5)
        if (recentProjectsList.length > 0) {
            // Add separator before recent projects
            items.push({
                label: '',
                kind: vscode.QuickPickItemKind.Separator
            } as any);
            
            // Add most recent with special formatting
            items.push({
                label: `$(play-circle) Run Recent: ${recentProjectsList[0].name}`,
                detail: `Last tested: ${recentProjectsList[0].lastUsed || 'Recently'} $(check)`,
                description: '$(star-full) Most Recent'
            });
            
            // Add additional recent projects (2-5)
            for (let i = 1; i < Math.min(5, recentProjectsList.length); i++) {
                items.push({
                    label: `$(history) ${recentProjectsList[i].name}`,
                    detail: `Last tested: ${recentProjectsList[i].lastUsed || 'Recently'}`,
                    description: ``
                });
            }
        }

        quickPick.items = items;

        // Handle selection
        quickPick.onDidAccept(() => {
            const selection = quickPick.activeItems[0];
            const value = quickPick.value.trim();
            
            if (!selection && value) {
                // User typed a custom project name
                this.executeProjectTest(value).then(() => {
                    quickPick.hide();
                });
            } else if (selection) {
                quickPick.hide();
                
                // Handle button selections
                if (selection.label.includes('Test Affected Projects')) {
                    this.runAutoDetectProjects();
                } else if (selection.label.includes('Test Updated Files')) {
                    this.runGitAffected();
                } else if (selection.label.includes('Select Project')) {
                    this.runRecentProject();
                } else if (selection.label.includes('Run Recent:')) {
                    // Extract project name from "Run Recent: project-name"
                    const projectName = selection.label.split('Run Recent: ')[1];
                    if (projectName) {
                        this.executeProjectTest(projectName);
                    }
                } else if (selection.label.includes('$(history)')) {
                    // Handle other recent projects
                    const projectName = selection.label.replace('$(history) ', '').trim();
                    if (projectName) {
                        this.executeProjectTest(projectName);
                    }
                } else if (selection.description === 'Project') {
                    // Direct project selection from suggestions
                    this.executeProjectTest(selection.label);
                }
            }
        });

        quickPick.onDidHide(() => {
            this.services.updateStatusBar('Ready');
            quickPick.dispose();
        });

        quickPick.show();
    }

    /**
     * Main command: Run affected tests with auto-detection
     */
    private registerRunAffectedTests(): vscode.Disposable {
        return vscode.commands.registerCommand('aiDebugContext.runAffectedTests', async () => {
            try {
                await this.showMainTestMenu();
            } catch (error) {
                this.services.updateStatusBar('❌ Error', 'red');
                this.handleCommandError(error, 'runAffectedTests');
            }
        });
    }

    /**
     * Auto-detect projects from changed files
     */
    private async runAutoDetectProjects(): Promise<void> {
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

            // Find unique projects for changed files using simple discovery
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
     * Execute test for a specific project
     */
    private async executeProjectTest(project: string): Promise<void> {
        // Save this project as most recent
        await this.saveRecentProject(project);
        
        const command = `npx nx test ${project} --verbose`;
        const timestamp = new Date().toLocaleTimeString();
        this.services.outputChannel.appendLine(`\n${'='.repeat(80)}`);
        this.services.outputChannel.appendLine(`🧪 [${timestamp}] TESTING: ${project.toUpperCase()}`);
        this.services.outputChannel.appendLine(`🧪 Running: ${command}`);
        this.services.outputChannel.appendLine(`${'='.repeat(80)}`);
        
        const startTime = Date.now();
        
        // Execute nx command directly with verbose flag
        const result = await new Promise<{success: boolean, stdout: string, stderr: string}>((resolve) => {
            const { spawn } = require('child_process');
            const child = spawn('npx', ['nx', 'test', project, '--verbose'], {
                cwd: this.services.workspaceRoot,
                stdio: ['ignore', 'pipe', 'pipe']
            });
            
            let stdout = '';
            let stderr = '';
            
            child.stdout?.on('data', (data: any) => {
                const text = data.toString();
                stdout += text;
                
                // Show individual file progress in real-time
                this.displayRealTimeProgress(text);
            });
            
            child.stderr?.on('data', (data: any) => {
                const text = data.toString();
                stderr += text;
                
                // Show errors in real-time too
                this.displayRealTimeProgress(text);
            });
            
            child.on('close', (code: any) => {
                resolve({ success: code === 0, stdout, stderr });
            });
        });
        
        const duration = ((Date.now() - startTime) / 1000).toFixed(1);
        const exitCode = result.success ? 0 : 1;
        
        // Parse test results
        const testSummary = TestResultParser.parseNxOutput(result.stdout + result.stderr, project);
        testSummary.duration = parseFloat(duration);
        
        // Ensure consistency - if exit code is 1, mark as failed regardless of parsed results
        if (exitCode === 1) {
            testSummary.success = false;
            if (testSummary.failed === 0 && testSummary.failures.length === 0) {
                testSummary.failed = 1;
                testSummary.total = Math.max(testSummary.total, 1);
            }
        }
        
        // Create legacy-style formatted output
        const formattedReport = LegacyStyleFormatter.formatTestReport(testSummary, {
            command: command,
            exitCode: exitCode,
            rawOutput: result.stdout + result.stderr,
            optimized: true
        });
        
        // Display the beautifully formatted report, checking for URLs
        const reportLines = formattedReport.split('\n');
        this.services.outputChannel.appendLine('');
        for (const line of reportLines) {
            if (line.includes('View structured, searchable error logs at https://cloud.nx.app')) {
                this.makeUrlsClickable(line);
            } else {
                this.services.outputChannel.appendLine(line);
            }
        }
        
        // Show status banner for quick feedback
        const statusBanner = LegacyStyleFormatter.createStatusBanner(testSummary);
        this.services.outputChannel.appendLine('\n' + statusBanner);
        
        // Show enhanced test results with actions
        this.services.testActions.updateRawOutput(result.stdout + result.stderr);
        await this.services.testActions.showTestResult(testSummary);
        
        // Store in recent projects
        await this.storeRecentProject(project);
        
        // Clean up any running test animations
        for (const [testName, interval] of this.runningTests) {
            clearInterval(interval);
        }
        this.runningTests.clear();
        this.animationIndex.clear();
    }

    /**
     * Register file watcher command
     */
    private registerStartFileWatcher(): vscode.Disposable {
        return vscode.commands.registerCommand('aiDebugContext.startFileWatcher', async () => {
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
                this.handleCommandError(error, 'startFileWatcher');
            }
        });
    }

    /**
     * Register clear cache command
     */
    private registerClearTestCache(): vscode.Disposable {
        return vscode.commands.registerCommand('aiDebugContext.clearTestCache', async () => {
            try {
                this.services.updateStatusBar('Clearing cache...', 'yellow');
                
                // Clear project cache using simple discovery
                await this.services.projectDiscovery.clearCache();
                
                this.services.updateStatusBar('🗑️ Cache cleared');
                vscode.window.showInformationMessage('Test cache cleared successfully');
            } catch (error) {
                this.services.updateStatusBar('❌ Cache error', 'red');
                this.handleCommandError(error, 'clearTestCache');
            }
        });
    }

    /**
     * Register setup command
     */
    private registerRunSetup(): vscode.Disposable {
        return vscode.commands.registerCommand('aiDebugContext.runSetup', async () => {
            try {
                this.services.updateStatusBar('🍎 Running setup...', 'yellow');
                await this.services.setupWizard.runSetupWizard();
                this.services.updateStatusBar('✅ Setup complete', 'green');
            } catch (error) {
                this.services.updateStatusBar('❌ Setup failed', 'red');
                this.handleCommandError(error, 'runSetup');
            }
        });
    }

    /**
     * Register project selection command
     */
    private registerSelectProject(): vscode.Disposable {
        return vscode.commands.registerCommand('aiDebugContext.selectProject', async () => {
            try {
                // Get projects from simple discovery
                this.services.updateStatusBar('Loading projects...', 'yellow');
                const allProjects = await this.services.projectDiscovery.getAllProjects();
                
                if (allProjects.length === 0) {
                    vscode.window.showInformationMessage('No projects found. Make sure you have project.json files in your workspace.');
                    this.services.updateStatusBar('No projects found');
                    return;
                }
                    
                // Convert projects to quick pick items
                const projectItems = allProjects.map(project => ({
                    label: `${project.name}`,
                    detail: `${project.type} • ${project.path}`,
                    project: project.name
                }));
                
                const selectedItem = await vscode.window.showQuickPick(projectItems, {
                    placeHolder: 'Select a project to test',
                    title: 'Test Specific Project'
                });
                    
                if (!selectedItem) {
                    this.services.updateStatusBar('Ready');
                    return;
                }
                    
                await this.executeProjectTest(selectedItem.project);
                
            } catch (error) {
                this.services.updateStatusBar('❌ Error', 'red');
                this.handleCommandError(error, 'selectProject');
            }
        });
    }

    /**
     * Register workspace info command
     */
    private registerShowWorkspaceInfo(): vscode.Disposable {
        return vscode.commands.registerCommand('aiDebugContext.showWorkspaceInfo', async () => {
            try {
                this.services.updateStatusBar('Loading workspace info...', 'yellow');
                
                const projects = await this.services.projectDiscovery.getAllProjects();
                const info = [
                    `Workspace: ${this.services.workspaceRoot}`,
                    `Projects found: ${projects.length}`,
                    `File watcher: ${this.services.fileWatcherActive ? 'Active' : 'Inactive'}`,
                    `Extension: Ready`
                ].join('\n');
                
                vscode.window.showInformationMessage(info);
                this.services.updateStatusBar('Ready');
                
            } catch (error) {
                this.services.updateStatusBar('❌ Error', 'red');
                this.handleCommandError(error, 'showWorkspaceInfo');
            }
        });
    }

    /**
     * Quick test command (minimal mode)
     */
    private registerRunAffectedTestsQuick(): vscode.Disposable {
        return vscode.commands.registerCommand('aiDebugContext.runAffectedTestsQuick', async () => {
            try {
                this.services.updateStatusBar('⚡ Quick test...', 'yellow');
                await this.runGitAffected();
            } catch (error) {
                this.services.updateStatusBar('❌ Error', 'red');
                this.handleCommandError(error, 'runAffectedTestsQuick');
            }
        });
    }

    /**
     * Git-based affected tests (legacy fallback)
     */
    private registerRunGitAffected(): vscode.Disposable {
        return vscode.commands.registerCommand('aiDebugContext.runGitAffected', async () => {
            try {
                await this.runGitAffected();
            } catch (error) {
                this.services.updateStatusBar('❌ Error', 'red');
                this.handleCommandError(error, 'runGitAffected');
            }
        });
    }

    /**
     * Manual project input command (now uses unified main menu)
     */
    private registerRunManualProject(): vscode.Disposable {
        return vscode.commands.registerCommand('aiDebugContext.runManualProject', async () => {
            try {
                await this.showMainTestMenu();
            } catch (error) {
                this.services.updateStatusBar('❌ Error', 'red');
                this.handleCommandError(error, 'runManualProject');
            }
        });
    }

    /**
     * Helper: Run git affected tests with proper formatting
     */
    private async runGitAffected(): Promise<void> {
        const timestamp = new Date().toLocaleTimeString();
        this.services.outputChannel.show();
        this.services.outputChannel.appendLine('\n' + '='.repeat(80));
        this.services.outputChannel.appendLine(`📝 [${timestamp}] ONLY TEST UPDATED FILES (GIT AFFECTED)`);
        this.services.outputChannel.appendLine('='.repeat(80));
        this.services.outputChannel.appendLine('🧪 Running: npx nx affected:test --verbose');
        this.services.outputChannel.appendLine('');
        
        this.services.updateStatusBar('📝 Testing updated files...', 'yellow');
        
        const startTime = Date.now();
        
        // Execute nx affected test command directly for better control
        const result = await new Promise<{success: boolean, stdout: string, stderr: string}>((resolve) => {
            const { spawn } = require('child_process');
            const child = spawn('npx', ['nx', 'affected:test', '--verbose'], {
                cwd: this.services.workspaceRoot,
                stdio: ['ignore', 'pipe', 'pipe']
            });
            
            let stdout = '';
            let stderr = '';
            
            child.stdout?.on('data', (data: any) => {
                const text = data.toString();
                stdout += text;
                
                // Show individual file progress in real-time
                this.displayRealTimeProgress(text);
            });
            
            child.stderr?.on('data', (data: any) => {
                const text = data.toString();
                stderr += text;
                
                // Show errors in real-time too
                this.displayRealTimeProgress(text);
            });
            
            child.on('close', (code: any) => {
                resolve({ success: code === 0, stdout, stderr });
            });
        });
        
        const duration = ((Date.now() - startTime) / 1000).toFixed(1);
        const exitCode = result.success ? 0 : 1;
        
        // Parse test results properly
        const testSummary = TestResultParser.parseNxOutput(result.stdout + result.stderr, 'git-affected');
        testSummary.duration = parseFloat(duration);
        
        // Ensure consistency - if exit code is 1, mark as failed
        if (exitCode === 1) {
            testSummary.success = false;
            if (testSummary.failed === 0 && testSummary.failures.length === 0) {
                testSummary.failed = 1;
                testSummary.total = Math.max(testSummary.total, 1);
            }
        }
        
        // Create legacy-style formatted output
        const formattedReport = LegacyStyleFormatter.formatTestReport(testSummary, {
            command: 'npx nx affected:test --verbose',
            exitCode: exitCode,
            rawOutput: result.stdout + result.stderr,
            optimized: true
        });
        
        // Display the formatted report, checking for URLs
        const reportLines = formattedReport.split('\n');
        this.services.outputChannel.appendLine('');
        for (const line of reportLines) {
            if (line.includes('View structured, searchable error logs at https://cloud.nx.app')) {
                this.makeUrlsClickable(line);
            } else {
                this.services.outputChannel.appendLine(line);
            }
        }
        
        // Show status banner for quick feedback
        const statusBanner = LegacyStyleFormatter.createStatusBanner(testSummary);
        this.services.outputChannel.appendLine('\n' + statusBanner);
        
        // Show enhanced test results with actions
        this.services.testActions.updateRawOutput(result.stdout + result.stderr);
        await this.services.testActions.showTestResult(testSummary);
        
        // Clean up any running test animations
        for (const [testName, interval] of this.runningTests) {
            clearInterval(interval);
        }
        this.runningTests.clear();
        this.animationIndex.clear();
        
        // Add closing border
        this.services.outputChannel.appendLine('\n' + '='.repeat(80));
        if (result.success) {
            this.services.outputChannel.appendLine(`✅ ONLY TEST UPDATED FILES COMPLETED SUCCESSFULLY (${duration}s)`);
            this.services.updateStatusBar(`✅ Updated files tested (${duration}s)`, 'green');
        } else {
            this.services.outputChannel.appendLine(`❌ ONLY TEST UPDATED FILES FAILED (EXIT CODE ${exitCode}) (${duration}s)`);
            this.services.updateStatusBar(`❌ Updated files failed (${duration}s)`, 'red');
        }
        this.services.outputChannel.appendLine('='.repeat(80) + '\n');
    }


    /**
     * Helper: Run project selection with recent projects prioritized
     */
    private async runRecentProject(): Promise<void> {
        this.services.updateStatusBar('Loading projects...', 'yellow');
        
        try {
            // Get recent projects from workspace state
            const workspaceState = vscode.workspace.getConfiguration('aiDebugContext');
            const recentProjects: any[] = workspaceState.get('recentProjects', []);
            
            // Get all available projects
            const allProjects = await this.services.projectDiscovery.getAllProjects();
            
            if (allProjects.length === 0) {
                vscode.window.showInformationMessage('No projects found. Make sure you have project.json files in your workspace.');
                this.services.updateStatusBar('No projects found');
                return;
            }
            
            // Separate projects by type
            const apps = allProjects.filter(p => p.type === 'application').sort((a, b) => a.name.localeCompare(b.name));
            const libs = allProjects.filter(p => p.type === 'library').sort((a, b) => a.name.localeCompare(b.name));
            const others = allProjects.filter(p => p.type !== 'application' && p.type !== 'library').sort((a, b) => a.name.localeCompare(b.name));
            
            // Build quick pick items
            const quickPickItems: vscode.QuickPickItem[] = [];
            
            // Add back button at the top
            quickPickItems.push({
                label: '← Back',
                detail: '',
                description: ''
            });
            
            quickPickItems.push({
                label: '',
                kind: vscode.QuickPickItemKind.Separator
            });
            
            // Add recent projects section (if any)
            if (recentProjects.length > 0) {
                quickPickItems.push({
                    label: '📌 Recent Projects',
                    kind: vscode.QuickPickItemKind.Separator
                });
                
                // Filter recent projects that still exist
                const validRecentProjects = recentProjects.filter(recent => 
                    allProjects.some(project => project.name === recent.name)
                );
                
                validRecentProjects.forEach(recent => {
                    const project = allProjects.find(p => p.name === recent.name);
                    if (project) {
                        const testCountText = recent.testCount ? ` • Tested ${recent.testCount}x` : '';
                        quickPickItems.push({
                            label: `⭐ ${recent.name}`,
                            detail: `${project.type} • ${project.path} • Last used: ${recent.lastUsed}${testCountText}`,
                            description: recent.name
                        });
                    }
                });
                
                if (validRecentProjects.length > 0) {
                    quickPickItems.push({
                        label: '',
                        kind: vscode.QuickPickItemKind.Separator
                    });
                }
            }
            
            // Add Applications section
            if (apps.length > 0) {
                quickPickItems.push({
                    label: '📱 Applications',
                    kind: vscode.QuickPickItemKind.Separator
                });
                
                apps.forEach(app => {
                    quickPickItems.push({
                        label: `🚀 ${app.name}`,
                        detail: `${app.type} • ${app.path}`,
                        description: app.name
                    });
                });
                
                quickPickItems.push({
                    label: '',
                    kind: vscode.QuickPickItemKind.Separator
                });
            }
            
            // Add Libraries section
            if (libs.length > 0) {
                quickPickItems.push({
                    label: '📚 Libraries',
                    kind: vscode.QuickPickItemKind.Separator
                });
                
                libs.forEach(lib => {
                    quickPickItems.push({
                        label: `📦 ${lib.name}`,
                        detail: `${lib.type} • ${lib.path}`,
                        description: lib.name
                    });
                });
                
                if (others.length > 0) {
                    quickPickItems.push({
                        label: '',
                        kind: vscode.QuickPickItemKind.Separator
                    });
                }
            }
            
            // Add Other projects section
            if (others.length > 0) {
                quickPickItems.push({
                    label: '⚙️ Other Projects',
                    kind: vscode.QuickPickItemKind.Separator
                });
                
                others.forEach(other => {
                    quickPickItems.push({
                        label: `🔧 ${other.name}`,
                        detail: `${other.type} • ${other.path}`,
                        description: other.name
                    });
                });
            }
            
            // Show the selection dialog
            const selectedItem = await vscode.window.showQuickPick(quickPickItems, {
                placeHolder: 'Select a project to test',
                title: 'Select Project to Test',
                matchOnDetail: true,
                matchOnDescription: true
            });
            
            if (!selectedItem) {
                this.services.updateStatusBar('Ready');
                return;
            }
            
            // Check if back button was selected
            if (selectedItem.label === '← Back') {
                // Restart the main menu
                await this.showMainTestMenu();
                return;
            }
            
            if (!selectedItem.description) {
                this.services.updateStatusBar('Ready');
                return;
            }
            
            // Run the selected project
            await this.executeProjectTest(selectedItem.description);
            
        } catch (error) {
            const friendlyError = UserFriendlyErrors.makeActionable('Failed to load projects', 'Project Selection');
            this.services.outputChannel.appendLine(`❌ ${friendlyError}\n`);
            this.services.updateStatusBar('❌ Error', 'red');
            this.handleCommandError(error, 'runRecentProject');
        }
    }

    /**
     * Helper: Save project as most recent
     */
    private async saveRecentProject(projectName: string): Promise<void> {
        await this.storeRecentProject(projectName);
    }

    /**
     * Helper: Store recent project with usage tracking
     */
    private async storeRecentProject(projectName: string): Promise<void> {
        try {
            // Validate project name
            if (!projectName || typeof projectName !== 'string' || 
                projectName === '[object Object]' || projectName === '[Object object]') {
                console.warn('Invalid project name, not storing:', projectName);
                return;
            }
            
            const workspaceState = vscode.workspace.getConfiguration('aiDebugContext');
            let recentProjects: any[] = workspaceState.get('recentProjects', []);
            
            // Clean up any existing corrupted entries
            recentProjects = recentProjects.filter((p: any) => {
                return p && typeof p === 'object' && p.name && 
                       typeof p.name === 'string' && 
                       p.name !== '[object Object]' && 
                       p.name !== '[Object object]';
            });
            
            // Find existing entry to preserve test count
            const existingProject = recentProjects.find((p: any) => p.name === projectName);
            const testCount = existingProject ? (existingProject.testCount || 0) + 1 : 1;
            
            // Remove existing entry if present
            recentProjects = recentProjects.filter((p: any) => p.name !== projectName);
            
            // Add to front of list with updated info
            recentProjects.unshift({
                name: projectName,
                lastUsed: new Date().toLocaleString(),
                testCount: testCount,
                lastUsedTimestamp: Date.now()
            });
            
            // Keep only last 8 projects (manageable list)
            recentProjects = recentProjects.slice(0, 8);
            
            await workspaceState.update('recentProjects', recentProjects, true);
        } catch (error) {
            console.warn('Failed to store recent project:', error);
        }
    }

    /**
     * Make URLs clickable in output by detecting and formatting them
     */
    private makeUrlsClickable(text: string): void {
        // Check for Nx cloud URLs
        const nxCloudPattern = /View structured, searchable error logs at (https:\/\/cloud\.nx\.app\/runs\/[a-zA-Z0-9]+)/g;
        const match = nxCloudPattern.exec(text);
        
        if (match) {
            const url = match[1];
            this.services.outputChannel.appendLine(`🔗 View structured, searchable error logs: ${url}`);
            
            // Show notification with option to open
            vscode.window.showInformationMessage(
                'Nx Cloud error logs available', 
                'Open in Browser'
            ).then(selection => {
                if (selection === 'Open in Browser') {
                    vscode.env.openExternal(vscode.Uri.parse(url));
                }
            });
        } else {
            // Just append the line normally if no URL detected
            this.services.outputChannel.appendLine(text);
        }
    }

    private runningTests = new Map<string, NodeJS.Timeout>();
    private animationFrames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    private animationIndex = new Map<string, number>();

    /**
     * Clean ANSI escape sequences more thoroughly
     */
    private cleanAnsiSequences(text: string): string {
        return text
            // Remove color codes and formatting
            .replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '')
            // Remove bold/formatting sequences like [1m and [22m
            .replace(/\[[0-9]+m/g, '')
            // Remove specific sequences
            .replace(/\[22m/g, '')
            .replace(/\[1m/g, '')
            // Remove bullet characters and other formatting
            .replace(/●\s*/g, '')
            // Remove carriage returns
            .replace(/\r/g, '')
            // Clean up extra spaces
            .replace(/\s+/g, ' ')
            .trim();
    }

    /**
     * Start animation for a running test
     */
    private startTestAnimation(testName: string): void {
        this.animationIndex.set(testName, 0);
        
        const interval = setInterval(() => {
            const currentIndex = this.animationIndex.get(testName) || 0;
            const nextIndex = (currentIndex + 1) % this.animationFrames.length;
            this.animationIndex.set(testName, nextIndex);
            
            const frame = this.animationFrames[nextIndex];
            // Update the line in place (VSCode output doesn't support this well, so we'll show periodic updates)
        }, 100);
        
        this.runningTests.set(testName, interval);
    }

    /**
     * Stop animation for a completed test
     */
    private stopTestAnimation(testName: string): void {
        const interval = this.runningTests.get(testName);
        if (interval) {
            clearInterval(interval);
            this.runningTests.delete(testName);
            this.animationIndex.delete(testName);
        }
    }

    /**
     * Display real-time test progress as files are being tested
     */
    private displayRealTimeProgress(output: string): void {
        const lines = output.split('\n');
        
        for (const line of lines) {
            const cleanedLine = this.cleanAnsiSequences(line);
            const trimmedLine = cleanedLine.trim();
            
            // Skip empty lines
            if (!trimmedLine) continue;
            
            // Show test file start/completion
            if (trimmedLine.startsWith('PASS ') || trimmedLine.startsWith('FAIL ')) {
                const status = trimmedLine.startsWith('PASS ') ? '✅' : '❌';
                const fileMatch = trimmedLine.match(/(PASS|FAIL)\s+(.+\.spec\.ts)/);
                if (fileMatch) {
                    const fileName = fileMatch[2].split('/').pop() || fileMatch[2];
                    this.stopTestAnimation(fileName);
                    this.services.outputChannel.appendLine(`   ${status} ${fileName}`);
                }
            }
            
            // Detect test files starting to run
            else if (trimmedLine.includes('.spec.ts') && (trimmedLine.includes('RUNS') || trimmedLine.includes('RUN'))) {
                const fileMatch = trimmedLine.match(/([^/]+\.spec\.ts)/);
                if (fileMatch) {
                    const fileName = fileMatch[1];
                    this.startTestAnimation(fileName);
                    const frame = this.animationFrames[0];
                    this.services.outputChannel.appendLine(`   ${frame} Running ${fileName}...`);
                }
            }
            
            // Show individual test results
            else if (trimmedLine.includes('✓ ') || trimmedLine.includes('✗ ')) {
                const status = trimmedLine.includes('✓ ') ? '✅' : '❌';
                const testName = trimmedLine.replace(/[✓✗]\s*/, '').split('(')[0].trim();
                if (testName && testName.length > 0 && testName.length < 100) {
                    this.services.outputChannel.appendLine(`      ${status} ${testName}`);
                }
            }
            
            // Show test suite names (but filter out ANSI artifacts)
            else if (trimmedLine && 
                    !trimmedLine.startsWith('npm') && 
                    !trimmedLine.startsWith('>') && 
                    !trimmedLine.includes('nx test') &&
                    !trimmedLine.includes('RUNS') &&
                    !trimmedLine.includes('RUN') &&
                    !trimmedLine.includes('NX') &&
                    !trimmedLine.includes('Test suite failed') &&
                    trimmedLine.match(/^[A-Z][a-zA-Z\s]+[a-zA-Z]$/) &&
                    trimmedLine.length > 3 && trimmedLine.length < 50) {
                this.services.outputChannel.appendLine(`   📁 ${trimmedLine}`);
            }
            
            // Show compilation errors (cleaned)  
            else if (trimmedLine.includes('Test suite failed to run') ||
                    trimmedLine.includes('error TS') ||
                    trimmedLine.includes('Cannot find module') ||
                    trimmedLine.includes('SyntaxError')) {
                // Clean the error message thoroughly
                const cleanError = trimmedLine
                    .replace(/Test suite failed to run\s*/g, 'Test suite failed to run')
                    .trim();
                if (cleanError && cleanError !== 'Test suite failed to run') {
                    this.services.outputChannel.appendLine(`   🔥 ${cleanError}`);
                }
            }
            
            // Check for Nx cloud URLs and make them clickable
            else if (trimmedLine.includes('View structured, searchable error logs at https://cloud.nx.app')) {
                this.makeUrlsClickable(trimmedLine);
            }
        }
    }

    /**
     * Centralized error handling
     */
    private handleCommandError(error: any, commandName: string): void {
        const structuredError = this.services.errorHandler.handleError(error, { command: commandName });
        this.services.errorHandler.showUserError(structuredError, vscode);
    }

    /**
     * Dispose all registered commands
     */
    dispose(): void {
        this.commands.forEach(command => command.dispose());
        this.commands = [];
    }
}