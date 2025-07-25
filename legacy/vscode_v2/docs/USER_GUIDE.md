# AI Debug Context - User Guide

## Table of Contents
1. [Getting Started](#getting-started)
2. [DIFF Module - Git Diff Generation](#diff-module---git-diff-generation)
3. [TEST Module - Running NX Tests](#test-module---running-nx-tests)
4. [AI DEBUG Module - AI-Powered Debugging](#ai-debug-module---ai-powered-debugging)
5. [PR DESC Module - PR Description Generation](#pr-desc-module---pr-description-generation)
6. [Keyboard Shortcuts](#keyboard-shortcuts)
7. [Tips and Best Practices](#tips-and-best-practices)
8. [Troubleshooting](#troubleshooting)

## Getting Started

### Opening the Extension

There are three ways to access AI Debug Context:

1. **Command Palette**
   - Press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (Mac)
   - Type "AI Debug Context" and select it

2. **Activity Bar**
   - Look for the AI Debug Context icon in the VS Code Activity Bar (left sidebar)
   - Click to open the extension panel

3. **Status Bar**
   - Find the "AI Debug Context" item in the status bar (bottom)
   - Click to quickly access the extension

### Initial Setup

1. Ensure you're in an NX workspace with a Git repository
2. Configure extension settings if needed (see Configuration section in README)
3. Select a module from the main interface

## DIFF Module - Git Diff Generation

The DIFF module helps you generate and review Git differences for your changes.

### Features

#### 1. Generate Diff for Uncommitted Changes
- Shows all current uncommitted changes
- Includes both staged and unstaged files
- Perfect for reviewing before committing

**How to use:**
1. Select "DIFF" module
2. Click "Generate Diff"
3. Review the generated diff in the output panel

#### 2. Generate Diff for Specific Commits
- Select one or more commits from history
- Compare changes between commits
- Useful for code review

**How to use:**
1. Select "DIFF" module
2. Click "Select Commits"
3. Choose commits from the list (multi-select supported)
4. Click "Generate Diff"

#### 3. Compare Branches
- Compare current branch with another branch
- Shows all differences between branches
- Helpful for PR preparation

**How to use:**
1. Select "DIFF" module
2. Choose "Compare Branches" option
3. Select the target branch
4. Review the comprehensive diff

### Output Format
- Unified diff format with context
- Syntax highlighting for better readability
- File paths and line numbers included
- Summary statistics at the end

## TEST Module - Running NX Tests

The TEST module provides comprehensive test execution capabilities for NX workspaces.

### Features

#### 1. Run Tests for Single Project
**How to use:**
1. Select "TEST" module
2. Choose a project from the dropdown
3. Click "Run Tests"
4. View real-time output with progress indicators

#### 2. Run Tests for Multiple Projects
**How to use:**
1. Select "TEST" module
2. Click "Select Multiple Projects"
3. Check the projects you want to test
4. Click "Run Tests"
5. Monitor progress for each project

#### 3. Run Affected Tests
Automatically runs tests only for projects affected by your changes.

**How to use:**
1. Select "TEST" module
2. Click "Run Affected Tests"
3. The extension will:
   - Analyze Git changes
   - Determine affected projects
   - Run tests only for those projects

### Test Output
- Real-time streaming output
- Color-coded results (passed/failed/skipped)
- Execution time for each test
- Summary statistics
- Test failure details with stack traces

## AI DEBUG Module - AI-Powered Debugging

The AI DEBUG module uses GitHub Copilot to help debug test failures intelligently.

### Prerequisites
- GitHub Copilot installed and activated (optional)
- Test failures to debug
- Relevant source files for context

### How to Use

#### 1. Basic Debugging
1. Select "AI DEBUG" module
2. Choose test output file or paste test results
3. Click "Analyze with AI"
4. Review AI-generated debugging suggestions

#### 2. With File Context
For better analysis, include relevant source files:

1. Select "AI DEBUG" module
2. Click "Select Files for Context"
3. Choose relevant source files:
   - Test files
   - Implementation files
   - Configuration files
4. Select or paste test output
5. Click "Analyze with AI"

#### 3. Fallback Mode (No Copilot)
If GitHub Copilot is not available:
1. The extension automatically switches to clipboard mode
2. Analysis and context are copied to clipboard
3. Paste into your preferred AI tool (ChatGPT, Claude, etc.)

### Output
The AI Debug module generates:
- Root cause analysis
- Suggested fixes with code snippets
- Debugging steps
- Related documentation links
- File saved to configured output directory

### Customizing Output Directory
Set custom output directory in settings:
```json
{
  "aiDebugContext.outputDir": "./debug-results"
}
```

## PR DESC Module - PR Description Generation

Automatically generate comprehensive PR descriptions from your changes.

### Features

#### 1. Basic PR Description
1. Select "PR DESC" module
2. Click "Generate PR Description"
3. The extension analyzes:
   - Git diff
   - Commit messages
   - File changes
4. Review and copy the generated description

#### 2. With Jira Integration
If configured, automatically includes Jira ticket information:

1. Configure Jira settings in VS Code settings
2. Include ticket ID in branch name or commit
3. Generate PR description
4. Jira ticket details are automatically included

#### 3. Custom Templates
1. Select from predefined templates:
   - Standard
   - Detailed
   - Minimal
2. Or use custom template from settings

### Output Format
Generated PR descriptions include:
- Summary of changes
- Detailed change list by file
- Testing instructions
- Breaking changes (if any)
- Related tickets (if configured)
- Checklist items

## Keyboard Shortcuts

| Action | Windows/Linux | Mac |
|--------|--------------|-----|
| Open Extension | `Ctrl+Shift+D` | `Cmd+Shift+D` |
| Generate Diff | `Ctrl+Alt+D` | `Cmd+Alt+D` |
| Run Tests | `Ctrl+Alt+T` | `Cmd+Alt+T` |
| AI Debug | `Ctrl+Alt+A` | `Cmd+Alt+A` |
| Generate PR Desc | `Ctrl+Alt+P` | `Cmd+Alt+P` |
| Clear Output | `Ctrl+K` | `Cmd+K` |
| Toggle Panel | `Ctrl+Q` | `Cmd+Q` |

## Tips and Best Practices

### For DIFF Module
- Review diffs before committing to catch issues early
- Use branch comparison before creating PRs
- Save important diffs for documentation

### For TEST Module
- Run affected tests frequently during development
- Use multiple project selection for related changes
- Monitor test execution time trends

### For AI DEBUG Module
- Provide comprehensive file context for better analysis
- Include test configuration files when debugging setup issues
- Save AI suggestions for future reference

### For PR DESC Module
- Generate descriptions after all commits are ready
- Review and customize AI-generated content
- Include screenshots or GIFs for UI changes

## Troubleshooting

### Extension Not Loading
1. Check VS Code version (requires 1.74.0+)
2. Verify extension is enabled
3. Reload VS Code window

### No Projects Found
1. Ensure you're in an NX workspace
2. Check for `nx.json` in workspace root
3. Run `nx list` to verify setup

### GitHub Copilot Not Working
1. Verify Copilot is installed and activated
2. Check Copilot status in status bar
3. Extension will fallback to clipboard mode

### Test Output Not Showing
1. Check output panel is visible
2. Ensure tests are actually running
3. Check for test configuration issues

### Performance Issues
1. Close unused panels
2. Clear old output regularly
3. Limit file selection for AI context

### Getting Help
- Check error messages in Output panel
- Review VS Code Developer Tools console
- Report issues on GitHub with logs

---

For more detailed information, see the [Development Guide](DEVELOPMENT_GUIDE.md) or [Module Documentation](MODULES.md).