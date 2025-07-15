# AI Debug Utilities

AI-powered debugging and code quality tools for Angular NX monorepos, available as both shell utilities and a VSCode extension.

## Overview

This repository provides comprehensive AI-optimized debugging tools designed specifically for Angular NX monorepos. The utilities capture test results, git changes, and code quality metrics in AI-friendly formats, making it easier to get targeted assistance from AI assistants like GitHub Copilot or ChatGPT.

## Available Implementations

### 🐚 Shell Functions (zsh/)
Powerful command-line utilities that integrate directly into your terminal workflow.

**Key Features:**
- Complete workflow automation with `aiDebug` command
- AI-optimized test output filtering
- Smart git diff analysis with change categorization  
- Automatic code quality checks (lint + format)
- PR description generation when ready to push

### 🎨 VSCode Extension (vscode/)
Modern side panel interface that brings the same functionality directly into your editor.

**Key Features:**
- Native VSCode integration with side panel UI
- Real-time command execution with progress indicators
- Project auto-detection and selection
- File management with click-to-open functionality
- Planned GitHub Copilot integration for automatic analysis

## Quick Start

### Shell Functions
```bash
# Add to your .zshrc
source /path/to/ai-debug-utilities/zsh/index.zsh

# Use the complete workflow
aiDebug my-project-name
```

### VSCode Extension
1. Open the `vscode/` directory in VSCode
2. Press F5 to launch the Extension Development Host  
3. Open an NX workspace in the development host
4. Use Ctrl+Shift+D to open the AI Debug panel

## Core Commands

All implementations provide these four main commands:

### `aiDebug` - Complete Development Workflow
- Runs tests with AI-optimized output
- Captures git changes with smart analysis  
- Performs code quality checks (lint + format)
- Generates PR description prompts when ready
- Provides structured context for AI debugging

### `nxTest` - AI-Optimized Test Runner
- Executes Jest tests with enhanced output formatting
- Filters out noise and focuses on key information
- Highlights failures with clear error categorization
- Provides performance insights for slow tests

### `gitDiff` - Smart Git Change Analysis  
- Auto-detects best diff strategy (unstaged → staged → last commit)
- Categorizes changes by file type and impact
- Provides AI-friendly formatting with change summaries
- Highlights test-related files and potential breaking changes

### `prepareToPush` - Code Quality Validation
- Runs ESLint/TSLint with clear error reporting
- Applies Prettier formatting automatically  
- Validates code meets project standards
- Provides clear next steps for any issues

## Output Files

Both implementations generate AI-optimized files in your configured output directory:

- **`ai-debug-context.txt`** - Complete debugging context for AI analysis
- **`jest-output.txt`** - AI-optimized test results  
- **`diff.txt`** - Git changes with intelligent analysis
- **`pr-description-prompt.txt`** - GitHub PR description generation prompts

## Workflow Examples

### Development Workflow (Shell)
```bash
# Make your code changes
# Run complete analysis  
aiDebug my-feature

# If tests pass: ✅ Tests + Lint + Format + PR prompts automatically generated
# If tests fail: ❌ Focused debugging context generated
```

### Development Workflow (VSCode)
1. Make code changes in your NX project
2. Open AI Debug panel (Ctrl+Shift+D)
3. Select your project from dropdown
4. Click "AI Debug Analysis" 
5. Review results in the tabbed interface
6. Upload generated files to your AI assistant

## AI Integration

### For Debugging (Test Failures)
1. Run `aiDebug [project]` (shell) or click "AI Debug Analysis" (VSCode)
2. Upload `ai-debug-context.txt` to your AI assistant
3. Use prompt: *"Analyze these test failures and provide specific fixes"*

### For PR Creation (Tests Passing) 
1. Run `aiDebug [project]` (auto-generates PR prompts when tests pass)
2. Upload `pr-description-prompt.txt` to your AI assistant  
3. Use prompt: *"Generate a GitHub PR description using these prompts"*

### For Code Review
1. Upload `ai-debug-context.txt`
2. Use prompt: *"Review this code for quality and suggest improvements"*

## Repository Structure

```
ai-debug-utilities/
├── zsh/                           # Shell function implementation
│   ├── functions/                 # Individual command implementations
│   │   ├── aiDebug.zsh           # Complete workflow function
│   │   ├── nxTest.zsh            # Test runner with AI optimization
│   │   ├── gitDiff.zsh           # Smart git change analyzer  
│   │   └── prepareToPush.zsh     # Code quality validator
│   ├── example_output/           # Sample generated files
│   ├── index.zsh                 # Main entry point for shell functions
│   └── README.md                 # Shell-specific documentation
└── vscode/                       # VSCode extension implementation
    ├── src/                      # TypeScript source code
    │   ├── extension.ts          # Main extension entry point
    │   ├── types/               # TypeScript interfaces  
    │   ├── utils/               # Core utilities (project detection, etc.)
    │   └── webview/             # Side panel UI implementation
    ├── package.json             # Extension manifest and dependencies
    ├── tsconfig.json            # TypeScript configuration
    └── README.md                # Extension-specific documentation
```

## Requirements

- **Angular NX monorepo** with Jest testing
- **Node.js** v18+ 
- **Yarn** package manager
- **Git** for version control

### Additional Requirements by Implementation:
- **Shell**: Zsh shell (bash compatibility available)
- **VSCode**: VSCode 1.85.0+ and TypeScript support

## Configuration

### Shell Functions
```bash
# Custom output directory
export AI_UTILITIES_BASE_DIR="/custom/output/path"  

# Disable startup messages
export AI_UTILITIES_QUIET=1
```

### VSCode Extension
```json
{
  "aiDebugUtilities.outputDirectory": ".github/instructions/ai_utilities_context",
  "aiDebugUtilities.autoDetectProject": true,
  "aiDebugUtilities.showNotifications": true,
  "aiDebugUtilities.terminalIntegration": true
}
```

## Development Status

### ✅ Shell Functions (Production Ready)
- Complete implementation of all four commands
- AI-optimized output generation  
- Full workflow automation
- Extensive configuration options

### 🚧 VSCode Extension (Development)
- **Phase 1 Complete**: Extension boilerplate and UI framework
- **Phase 2 In Progress**: Shell function porting to TypeScript  
- **Phase 3 Planned**: GitHub Copilot integration

## Contributing

1. Fork the repository
2. Create a feature branch  
3. Make your changes
4. Test with a real NX workspace
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support  

For issues and feature requests, please use the GitHub repository issues page.

---

**🎯 Goal**: Make AI-assisted debugging seamless and efficient for Angular NX developers by providing the right context in the right format at the right time.
