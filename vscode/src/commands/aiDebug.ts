import * as vscode from 'vscode';
import { spawn } from 'child_process';
import { CommandOptions, CommandResult } from '../types';
import { FileManager } from '../utils/fileManager';
import { CommandRunner } from '../utils/shellRunner';

export class AiDebugCommand {
    private fileManager: FileManager;
    private commandRunner: CommandRunner;

    constructor() {
        this.fileManager = new FileManager();
        this.commandRunner = new CommandRunner();
    }

    /**
     * Run AI Debug command with integrated quality checks
     */
    async run(project: string, options: CommandOptions = {}): Promise<CommandResult> {
        const startTime = Date.now();
        
        try {
            // Prepare output files
            const outputFiles = await this.fileManager.initializeOutputFiles(['ai-debug-context', 'pr-description-prompt', 'diff', 'jest-output']);
            
            this.showProgress("AI Debug Assistant: Optimized Context Generation", {
                target: project,
                mode: options.quick ? "Quick" : "Full",
                context: options.fullContext ? "Verbose" : "AI-Optimized",
                focus: options.focus || "General"
            });

            // Step 1: Capture git changes (unless skipped)
            if (!options.noDiff) {
                await this.showStep("Analyzing git changes...");
                const gitDiffResult = await this.commandRunner.runGitDiff({ aiContext: true, smartDiff: true });
                
                if (gitDiffResult.success && gitDiffResult.output) {
                    const changesCount = this.countChangedFiles(gitDiffResult.output);
                    this.showSuccess(`Captured changes for ${changesCount} files`);
                } else {
                    this.showWarning("No git changes detected - focusing on existing code analysis");
                }
            } else {
                this.showInfo("Skipping git diff capture (--no-diff specified)");
            }

            // Step 2: Run tests and capture results
            await this.showStep("Running tests and generating analysis...");
            const testResult = await this.commandRunner.runNxTest(project, {
                fullOutput: options.fullContext,
                useExpected: options.useExpected
            });

            if (!testResult.success) {
                this.showError("Test execution failed");
            }

            // Step 3: Run prepareToPush if tests are passing
            let lintExitCode = 0;
            let prettierExitCode = 0;
            
            if (testResult.success) {
                await this.showStep("Tests passing! Running prepareToPush (lint + format)...");
                
                // Run linting
                await this.showStep("Running linter...");
                const lintResult = await this.executeLint(project);
                lintExitCode = lintResult.exitCode;
                
                if (lintResult.success) {
                    this.showSuccess("Linting passed!");
                    
                    // Run prettier
                    await this.showStep("Running code formatter...");
                    const prettierResult = await this.executePrettier(project);
                    prettierExitCode = prettierResult.exitCode;
                    
                    if (prettierResult.success) {
                        this.showSuccess("Code formatting completed!");
                    } else {
                        this.showError(`Prettier failed with exit code: ${prettierExitCode}`);
                    }
                } else {
                    this.showError(`Linting failed with exit code: ${lintExitCode}`);
                    this.showInfo("Skipping prettier due to lint failures");
                }
            }

            // Step 4: Generate intelligent AI context
            await this.showStep("Generating AI-optimized context file...");
            await this.createAiDebugContext(
                outputFiles['ai-debug-context'],
                outputFiles['diff'],
                outputFiles['jest-output'],
                project,
                testResult.exitCode,
                options.focus || "",
                options.quick || false,
                lintExitCode,
                prettierExitCode
            );

            // Step 5: Generate PR description prompts if tests are passing
            if (testResult.success) {
                await this.showStep("Auto-generating PR description prompts...");
                await this.createPrDescriptionPrompts(
                    outputFiles['pr-description-prompt'],
                    outputFiles['diff'],
                    outputFiles['jest-output'],
                    project,
                    testResult.exitCode,
                    lintExitCode,
                    prettierExitCode
                );
            }

            // Step 6: Display summary
            await this.displayAiDebugSummary(
                outputFiles['ai-debug-context'],
                testResult.exitCode,
                options.focus || "",
                testResult.success,
                outputFiles['pr-description-prompt'],
                lintExitCode,
                prettierExitCode
            );

            const duration = Date.now() - startTime;
            return {
                success: testResult.success,
                exitCode: testResult.exitCode,
                output: `AI Debug completed in ${duration}ms`,
                outputFiles: Object.values(outputFiles),
                duration
            };

        } catch (error) {
            const duration = Date.now() - startTime;
            return {
                success: false,
                exitCode: 1,
                output: "",
                error: error instanceof Error ? error.message : 'Unknown error',
                duration
            };
        }
    }

    private async executeLint(project: string): Promise<CommandResult> {
        return new Promise((resolve) => {
            const process = spawn('yarn', ['nx', 'lint', project], {
                cwd: this.getWorkspaceRoot(),
                shell: true
            });

            let output = '';
            let error = '';

            process.stdout?.on('data', (data) => {
                output += data.toString();
            });

            process.stderr?.on('data', (data) => {
                error += data.toString();
            });

            process.on('close', (code) => {
                resolve({
                    success: code === 0,
                    exitCode: code || 0,
                    output,
                    error: error || undefined,
                    duration: 0
                });
            });
        });
    }

    private async executePrettier(project: string): Promise<CommandResult> {
        return new Promise((resolve) => {
            const process = spawn('yarn', ['nx', 'prettier', project, '--write'], {
                cwd: this.getWorkspaceRoot(),
                shell: true
            });

            let output = '';
            let error = '';

            process.stdout?.on('data', (data) => {
                output += data.toString();
            });

            process.stderr?.on('data', (data) => {
                error += data.toString();
            });

            process.on('close', (code) => {
                resolve({
                    success: code === 0,
                    exitCode: code || 0,
                    output,
                    error: error || undefined,
                    duration: 0
                });
            });
        });
    }

    private async createAiDebugContext(
        contextFile: string,
        diffFile: string,
        testFile: string,
        testTarget: string,
        exitCode: number,
        focusArea: string,
        quickMode: boolean,
        lintExitCode: number,
        prettierExitCode: number
    ): Promise<void> {
        const timestamp = new Date().toISOString();
        const status = exitCode === 0 ? "✅ TESTS PASSING" : "❌ TESTS FAILING";
        
        let contextContent = `=================================================================
🤖 AI DEBUG CONTEXT - OPTIMIZED FOR ANALYSIS
=================================================================

PROJECT: Angular NX Monorepo
TARGET: ${testTarget}
STATUS: ${status}
FOCUS: ${focusArea || "General debugging"}
TIMESTAMP: ${timestamp}

=================================================================
🎯 ANALYSIS REQUEST
=================================================================

Please analyze this context and provide:

`;

        // Add conditional analysis requests based on test status
        if (exitCode === 0) {
            contextContent += `1. 🔍 CODE QUALITY ANALYSIS
   • Review code changes for potential improvements
   • Identify any code smells or anti-patterns
   • Check for performance optimization opportunities

2. 🎭 MOCK DATA VALIDATION (CRITICAL)
   • Review all mock data to ensure it matches real-world data structures
   • Verify mock objects have correct property names and types
   • Check that mock data represents realistic scenarios (not just minimal passing data)
   • Ensure mocked API responses match actual API contract
   • Validate that test data covers edge cases and realistic variations
   • Identify mock data that might be giving false positives

3. 🧪 TEST COVERAGE ANALYSIS
   • Missing test coverage for new functionality
   • Edge cases that should be tested
   • Additional test scenarios to prevent regressions
   • Test improvements for better maintainability
   • File-specific coverage analysis (diff coverage vs total coverage)

4. 🚀 ENHANCEMENT RECOMMENDATIONS
   • Code quality improvements
   • Better error handling or validation
   • Documentation or typing improvements
   • Performance optimizations

5. 🛡️ ROBUSTNESS IMPROVEMENTS
   • Potential edge cases to handle
   • Error scenarios to test
   • Input validation opportunities
   • Defensive programming suggestions
`;
        } else {
            contextContent += `1. 🔍 ROOT CAUSE ANALYSIS
   • What specific changes are breaking the tests?
   • Are there type mismatches or interface changes?
   • Did method signatures change?

2. 🛠️ CONCRETE FIXES (PRIORITY 1)
   • Exact code changes needed to fix failing tests
   • Updated test expectations if business logic changed
   • Type definitions or interface updates required

3. 🧪 EXISTING TEST FIXES (PRIORITY 1)
   • Fix existing failing tests first
   • Update test assertions to match new behavior
   • Fix test setup or mocking issues

4. 🚀 IMPLEMENTATION GUIDANCE (PRIORITY 1)
   • Order of fixes (dependencies first)
   • Potential side effects to watch for
   • Getting tests green is the immediate priority

5. ✨ NEW TEST SUGGESTIONS (PRIORITY 2 - AFTER FIXES)
   • Missing test coverage for new functionality
   • Edge cases that should be tested
   • Additional test scenarios to prevent regressions
   • Test improvements for better maintainability
   • File-specific coverage analysis (diff coverage vs total coverage)
   • Specify files and line numbers where new tests should be added. 

NOTE: Focus on items 1-4 first to get tests passing, then implement item 5
`;
        }

        // Add focus-specific guidance
        if (focusArea) {
            contextContent += `\n`;
            switch (focusArea) {
                case "types":
                    contextContent += `FOCUS AREA: TypeScript type issues and interface mismatches
• Pay special attention to type definitions and interface changes
• Look for property name mismatches or type incompatibilities
`;
                    break;
                case "tests":
                    contextContent += `FOCUS AREA: Test logic and assertions
• Focus on test expectations vs actual implementation
• Look for test data setup issues or mock problems
`;
                    break;
                case "performance":
                    contextContent += `FOCUS AREA: Performance and optimization
• Identify slow tests and optimization opportunities
• Look for inefficient test patterns or setup
`;
                    break;
            }
        }

        // Add test results
        contextContent += `\n==================================================================
🧪 TEST RESULTS ANALYSIS
==================================================================

`;

        try {
            const testContent = await this.fileManager.readFile(testFile);
            contextContent += testContent;
        } catch {
            contextContent += "❌ No test results available\n";
        }

        // Add code quality results
        contextContent += `\n==================================================================
🔧 CODE QUALITY RESULTS
==================================================================

📋 LINTING RESULTS:
`;

        if (lintExitCode === 0) {
            contextContent += `✅ Status: PASSED
• All linting rules satisfied
• No code quality issues detected
• Code follows project style guidelines
`;
        } else {
            contextContent += `❌ Status: FAILED (Exit code: ${lintExitCode})
• Linting errors detected above in test output
• Code quality issues need attention
• Some errors may be auto-fixable with --fix flag
`;
        }

        contextContent += `\n✨ FORMATTING RESULTS:
`;

        if (prettierExitCode === 0) {
            contextContent += `✅ Status: COMPLETED
• Code formatting applied successfully
• All files follow consistent style
• Ready for commit
`;
        } else if (lintExitCode !== 0) {
            contextContent += `⏭️  Status: SKIPPED
• Skipped due to linting failures
• Fix linting issues first
• Formatting will run after lint passes
`;
        } else {
            contextContent += `❌ Status: FAILED (Exit code: ${prettierExitCode})
• Formatting errors detected
• Check syntax errors in files
• Ensure all files are valid
`;
        }

        // Add push readiness
        contextContent += `\n🚀 PUSH READINESS:
`;

        if (exitCode === 0 && lintExitCode === 0 && prettierExitCode === 0) {
            contextContent += `✅ READY TO PUSH
• Tests: Passing ✅
• Lint: Clean ✅
• Format: Applied ✅
• All quality gates satisfied
`;
        } else {
            contextContent += `⚠️  NOT READY - Issues need resolution:
`;
            if (exitCode !== 0) contextContent += "• Tests: Failing ❌\n";
            if (lintExitCode !== 0) contextContent += "• Lint: Issues detected ❌\n";
            if (prettierExitCode !== 0) contextContent += "• Format: Failed ❌\n";
        }

        // Add git changes analysis
        contextContent += `\n==================================================================
📋 CODE CHANGES ANALYSIS
==================================================================

`;

        try {
            const diffContent = await this.fileManager.readFile(diffFile);
            contextContent += diffContent;
        } catch {
            contextContent += `ℹ️  No recent code changes detected

This suggests the test failures may be due to:
• Environment or configuration issues
• Dependencies or version conflicts
• Test setup or teardown problems
• Race conditions or timing issues
`;
        }

        // Add final guidance
        contextContent += `\n==================================================================
🚀 AI ASSISTANT GUIDANCE
==================================================================
This context file is optimized for AI analysis with:
• Structured failure information for easy parsing
• Code changes correlated with test failures
• Clear focus areas for targeted analysis
• Actionable fix categories for systematic resolution

Context file size: ${contextContent.split('\n').length} lines (optimized for AI processing)
`;

        await this.fileManager.writeFile(contextFile, contextContent);
    }

    private async createPrDescriptionPrompts(
        prFile: string,
        diffFile: string,
        testFile: string,
        testTarget: string,
        exitCode: number,
        lintExitCode: number,
        prettierExitCode: number
    ): Promise<void> {
        const timestamp = new Date().toISOString();
        const testStatus = exitCode === 0 ? "✅ All tests passing" : "❌ Some tests failing (needs fixes)";
        const lintStatus = lintExitCode === 0 ? "✅ Linting passed" : "❌ Linting failed";
        const formatStatus = prettierExitCode === 0 ? "✅ Code formatted" : "❌ Formatting failed";

        const prContent = `=================================================================
📝 GITHUB PR DESCRIPTION GENERATION PROMPTS
=================================================================

INSTRUCTIONS FOR AI ASSISTANT:
Using the data gathered in the ai-debug-context.txt file, write a GitHub PR 
description that follows the format below. Focus on newly added functions 
and updates. Don't add fluff.

=================================================================
🎯 PRIMARY PR DESCRIPTION PROMPT
=================================================================

Please analyze the code changes and test results to create a GitHub PR description 
following this exact format:

**Problem**
What is the problem you're solving or feature you're implementing? Please include 
a link to any related discussion or tasks in Jira if applicable.
[Jira Link if applicable]

**Solution**
Describe the feature or bug fix -- what's changing?

**Details**
Include a brief overview of the technical process you took (or are going to take!) 
to get from the problem to the solution.

**QA**
Provide any technical details needed to test this change and/or parts that you 
wish to have tested.

=================================================================
📊 CONTEXT FOR PR DESCRIPTION
=================================================================

PROJECT: Angular NX Monorepo
TARGET: ${testTarget}
TEST STATUS: ${testStatus}
LINT STATUS: ${lintStatus}
FORMAT STATUS: ${formatStatus}
TIMESTAMP: ${timestamp}

📋 TESTING INSTRUCTIONS:
• Run: yarn nx test ${testTarget}
• Run: yarn nx lint ${testTarget}
• Run: yarn nx prettier ${testTarget} --write
• Verify all tests pass and code follows style guidelines
• Test the specific functionality mentioned in the Solution section
• Check for any UI/UX changes if applicable

🎯 READY TO USE: Copy the primary prompt above, attach ai-debug-context.txt, and ask your AI assistant to create the PR description!
`;

        await this.fileManager.writeFile(prFile, prContent);
    }

    private async displayAiDebugSummary(
        contextFile: string,
        exitCode: number,
        focusArea: string,
        prDescriptionEnabled: boolean,
        prDescriptionFile: string,
        lintExitCode: number,
        prettierExitCode: number
    ): Promise<void> {
        const contextStats = await this.fileManager.getFileStats(contextFile);
        
        let summaryTitle = "";
        if (exitCode === 0) {
            if (lintExitCode === 0 && prettierExitCode === 0) {
                summaryTitle = "🎉 Ready to Push: Tests ✅ Lint ✅ Format ✅";
            } else if (lintExitCode !== 0) {
                summaryTitle = "⚠️  Tests Pass but Lint Issues: Tests ✅ Lint ❌ Format ⏭️";
            } else {
                summaryTitle = "⚠️  Tests Pass but Format Issues: Tests ✅ Lint ✅ Format ❌";
            }
        } else {
            summaryTitle = "🔍 AI Debug Context: Test failures detected";
        }

        this.showInfo(`\n${"=".repeat(60)}`);
        this.showInfo(summaryTitle);
        this.showInfo(`${"=".repeat(60)}`);

        // Show focus and suggested prompts
        if (exitCode === 0) {
            if (lintExitCode === 0 && prettierExitCode === 0) {
                this.showInfo("🎯 FOCUS: Final code review and PR preparation");
                this.showInfo("\n📋 SUGGESTED AI PROMPTS:");
                this.showInfo('• "Generate a GitHub PR description using the PR description prompts file"');
                this.showInfo('• "Review this code for quality and suggest any improvements"');
                this.showInfo('• "Check if mock objects have correct property names and realistic values"');
            } else {
                this.showInfo("🎯 FOCUS: Fix code quality issues before PR");
                this.showInfo("\n📋 SUGGESTED AI PROMPTS:");
                this.showInfo('• "Help me fix the linting/formatting issues shown above"');
                this.showInfo('• "Review this code for quality and suggest any improvements"');
                if (lintExitCode !== 0) {
                    this.showInfo('• "Analyze the linting errors and provide specific fixes"');
                }
            }
        } else {
            this.showInfo("🎯 FOCUS: Failure analysis and fix recommendations");
            this.showInfo("\n📋 SUGGESTED AI PROMPTS:");
            this.showInfo('• "Analyze these test failures and provide specific fixes first"');
            this.showInfo('• "What code changes are breaking these tests and how do I fix them?"');
            this.showInfo('• "Help me fix failing tests first, then suggest new test coverage"');
        }

        // Show file details
        this.showInfo("\n📄 CONTEXT FILE DETAILS:");
        this.showInfo(`• Location: ${contextFile}`);
        this.showInfo(`• Size: ${contextStats.size} (${contextStats.lines} lines)`);
        this.showInfo("• Optimized: ✅ AI-friendly structure");
        this.showInfo(`• Focus: ${focusArea || "General"}`);
        
        if (exitCode === 0) {
            this.showInfo("• Tests: ✅ Passing");
            this.showInfo(`• Lint: ${lintExitCode === 0 ? "✅ Passed" : "❌ Failed"}`);
            this.showInfo(`• Format: ${prettierExitCode === 0 ? "✅ Applied" : "❌ Failed"}`);
        }

        if (prDescriptionEnabled) {
            const prStats = await this.fileManager.getFileStats(prDescriptionFile);
            this.showInfo("\n📝 PR DESCRIPTION PROMPTS:");
            this.showInfo(`• Location: ${prDescriptionFile}`);
            this.showInfo(`• Size: ${prStats.size}`);
            this.showInfo("• Ready: ✅ GitHub PR format prompts generated");
        }

        // Show next steps
        this.showInfo("\n🚀 NEXT STEPS:");
        if (exitCode === 0) {
            if (lintExitCode === 0 && prettierExitCode === 0) {
                this.showInfo("1. Upload PR description prompts to your AI assistant");
                this.showInfo("2. Generate GitHub PR description");
                this.showInfo("3. Review any formatting changes made by prettier");
                this.showInfo("4. Commit and push: git add . && git commit && git push");
            } else {
                let step = 1;
                if (lintExitCode !== 0) {
                    this.showInfo(`${step}. Fix linting errors (try: yarn nx lint ${testTarget} --fix)`);
                    step++;
                }
                if (prettierExitCode !== 0) {
                    this.showInfo(`${step}. Fix prettier formatting issues`);
                    step++;
                }
                this.showInfo(`${step}. Re-run aiDebug to verify all checks pass`);
            }
        } else {
            this.showInfo("1. Upload the context file to your AI assistant");
            this.showInfo("2. Use one of the suggested prompts above");
            this.showInfo("3. Follow the AI's specific fix recommendations");
            this.showInfo("4. Re-run aiDebug to verify fixes");
        }

        this.showInfo(`\n${"=".repeat(60)}`);
    }

    private countChangedFiles(diffOutput: string): number {
        const matches = diffOutput.match(/^📁/gm);
        return matches ? matches.length : 0;
    }

    private getWorkspaceRoot(): string {
        return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
    }

    private showProgress(title: string, details: Record<string, string>) {
        this.showInfo(`\n${"=".repeat(60)}`);
        this.showInfo(`🤖 ${title}`);
        this.showInfo(`${"=".repeat(60)}`);
        
        Object.entries(details).forEach(([key, value]) => {
            this.showInfo(`${key}: ${value}`);
        });
        
        this.showInfo("");
    }

    private async showStep(message: string) {
        this.showInfo(message);
    }

    private showSuccess(message: string) {
        this.showInfo(`✅ ${message}`);
    }

    private showWarning(message: string) {
        this.showInfo(`⚠️  ${message}`);
    }

    private showError(message: string) {
        this.showInfo(`❌ ${message}`);
    }

    private showInfo(message: string) {
        const outputChannel = vscode.window.createOutputChannel('AI Debug Utilities');
        outputChannel.appendLine(message);
        outputChannel.show();
    }
}
