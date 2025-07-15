# AI Debug Utilities - VSCode Extension

AI-powered debugging and code quality tools for Angular NX monorepos, now available directly in VSCode!

## Features

- **🤖 AI Debug Analysis**: Complete development workflow with test analysis, git changes, and code quality checks
- **🧪 NX Test Runner**: Execute Jest tests with AI-optimized output formatting
- **📋 Smart Git Diff**: Intelligent git change analysis with file categorization
- **🚀 Prepare to Push**: Automated linting and code formatting validation
- **📝 GitHub Copilot Integration**: Auto-trigger Copilot analysis for test failures and code review

## Installation

1. Install the extension from the VSCode marketplace
2. Open an Angular NX workspace
3. The extension will automatically activate and show the AI Debug panel

## Quick Start

1. **Open the Panel**: Use `Ctrl+Shift+D` (or `Cmd+Shift+D` on Mac) to open the AI Debug panel
2. **Select a Project**: Choose your NX project from the dropdown
3. **Run Analysis**: Click any of the action buttons to start analysis
4. **View Results**: Check the output files and use them with AI assistants

## Commands

### AI Debug Analysis (`aiDebug`)
Complete development workflow that:
- Runs tests with AI-optimized output
- Captures git changes with smart analysis
- Performs code quality checks (lint + format)
- Generates PR description prompts when ready
- Provides structured context for AI debugging

**Options:**
- `--quick`: Skip detailed analysis for faster iteration
- `--full-context`: Include verbose test output
- `--focus=area`: Focus on specific area (tests|types|performance)

### Run Tests (`nxTest`)
Execute Jest tests with AI-optimized reporting:
- Filters out noise and focuses on key information
- Highlights failures with clear error categorization
- Provides performance insights for slow tests
- Generates structured output for AI analysis

### Analyze Changes (`gitDiff`)
Smart git change analysis:
- Auto-detects best diff strategy (unstaged → staged → last commit)
- Categorizes changes by file type and impact
- Provides AI-friendly formatting with change summaries
- Highlights test-related files and potential breaking changes

### Prepare to Push (`prepareToPush`)
Code quality validation:
- Runs ESLint/TSLint with clear error reporting
- Applies Prettier formatting automatically
- Validates code meets project standards
- Provides clear next steps for any issues

## Configuration

The extension can be configured through VSCode settings:

```json
{
  "aiDebugUtilities.outputDirectory": ".github/instructions/ai_utilities_context",
  "aiDebugUtilities.autoDetectProject": true,
  "aiDebugUtilities.showNotifications": true,
  "aiDebugUtilities.terminalIntegration": true,
  "aiDebugUtilities.copilot.autoAnalyze": true,
  "aiDebugUtilities.copilot.analyzeOnFailure": true,
  "aiDebugUtilities.copilot.generatePR": true
}
```

## Output Files

The extension generates AI-optimized files in your configured output directory:

- **`ai-debug-context.txt`**: Complete debugging context for AI analysis
- **`jest-output.txt`**: AI-optimized test results
- **`diff.txt`**: Git changes with intelligent analysis
- **`pr-description-prompt.txt`**: GitHub PR description generation prompts

## GitHub Copilot Integration

When GitHub Copilot is available, the extension provides enhanced AI assistance:

### Automatic Analysis
- **Test Failures**: Auto-triggers Copilot analysis when tests fail
- **Code Review**: Suggests improvements when tests pass
- **PR Generation**: Creates GitHub PR descriptions from your changes

### Manual Analysis
- Click "Analyze with Copilot" buttons for targeted AI assistance
- Custom chat participant: `@aidebug analyze failures`
- Context-aware prompts based on your specific codebase

## Keyboard Shortcuts

- `Ctrl+Shift+D` / `Cmd+Shift+D`: Open AI Debug panel
- `Ctrl+Shift+A` / `Cmd+Shift+A`: Run AI Debug Analysis on current project

## Workflow Example

1. **Make Code Changes**: Modify your Angular/NX project
2. **Run AI Debug**: Click "AI Debug Analysis" or use `Ctrl+Shift+A`
3. **If Tests Fail**: Extension auto-opens Copilot with failure analysis
4. **If Tests Pass**: Extension runs lint + format, generates PR prompts
5. **Review Results**: Check output files and follow AI suggestions
6. **Push Changes**: Code is ready for commit and PR creation

## Requirements

- **VSCode**: Version 1.85.0 or higher
- **Angular NX**: Monorepo with `nx.json` or `angular.json`
- **Node.js**: Version 18 or higher
- **Yarn**: Package manager (npm support coming soon)

## Supported Project Types

- Angular applications and libraries
- NX monorepos with Jest testing
- TypeScript projects with ESLint/TSLint
- Projects using Prettier for formatting

## Troubleshooting

### Extension Not Activating
- Ensure your workspace contains `nx.json` or `angular.json`
- Check that you're in the root directory of your NX workspace
- Reload VSCode window (`Ctrl+Shift+P` → "Developer: Reload Window")

### Commands Not Working
- Verify your project has the required targets in `project.json`
- Check that Yarn is installed and accessible
- Review VSCode output panel for error messages

### Output Files Not Generated
- Check the configured output directory exists and is writable
- Ensure commands complete successfully (check terminal output)
- Verify file permissions in your workspace

## Contributing

This extension is based on the AI Debug Utilities shell functions. To contribute:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test with a real NX workspace
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and feature requests, please use the GitHub repository issues page.
