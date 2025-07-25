# AI Debug Utilities for NX Projects

AI-powered debugging and code quality tools for Angular NX monorepos. Captures test results, git changes, and code quality metrics in AI-optimized formats.

## Installation

### Quick Setup
Add to your `.zshrc` file:

```bash
# AI Debug Utilities
source /path/to/ai-debug-utilities/index.zsh
```

Then reload your shell:
```bash
source ~/.zshrc
```

### Custom Output Directory (Optional)
```bash
# Set custom output directory before sourcing
export AI_UTILITIES_BASE_DIR="/custom/path/ai_context"
source /path/to/ai-debug-utilities/index.zsh
```

## Functions

### `aiDebug [project-name]`
**Complete development workflow in one command.** Runs tests, captures git changes, and generates AI-ready debugging context. When tests pass, automatically runs lint/format and generates PR description prompts.

**Benefits:**
- Single command handles entire development workflow
- AI-optimized output reduces noise by 80%+
- Auto-correlates test failures with code changes
- Generates PR descriptions when code is ready
- Automatic quality checks (lint + format) when tests pass

**Example:**
```bash
aiDebug settings-voice-assist-feature
# Tests pass → Auto-runs lint + prettier + PR prompts
# Tests fail → Focus on debugging with targeted AI context
```

**Options:**
- `--quick` - Skip detailed analysis for faster iteration
- `--full-context` - Include verbose test output
- `--no-diff` - Skip git diff capture
- `--focus=area` - Focus on specific area (tests|types|performance)

### `prepareToPush [project-name]`
**Code quality validation before committing.** Runs linting and formatting in sequence with clear error reporting.

**Benefits:**
- Catches style issues before CI/PR reviews
- Auto-formats code consistently
- Prevents lint failures in pipelines
- Clear guidance on fixing issues

**Example:**
```bash
prepareToPush my-component
# ✅ Lint: Clean → ✅ Format: Applied → Ready to commit
```

### `nxTest [project-name]`
**AI-optimized test reporting.** Runs Jest tests and creates focused reports highlighting failures, performance issues, and key metrics.

**Benefits:**
- Reduces verbose test output to essential information
- Highlights TypeScript errors and test failures
- Extracts performance insights and slow tests
- Structured for AI analysis

**Options:**
- `--full-output` - Include complete raw output
- `--use-expected` - Use cached expected output

**Example:**
```bash
nxTest my-component --full-output
```

### `gitDiff`
**Smart git change analysis.** Captures git changes with AI-friendly formatting and intelligent diff selection.

**Benefits:**
- Auto-detects best diff strategy (unstaged → staged → last commit)
- Categorizes changes by file type and impact
- Provides context for AI analysis
- File change statistics and insights

**Options:**
- `--ai-context` - Enhanced AI-friendly format (default)
- `--smart-diff` - Auto-select diff strategy (default)
- `--cached` - Only staged changes
- `--no-save` - Display only, don't save to file

**Example:**
```bash
gitDiff --cached  # Only staged changes
gitDiff HEAD~1..HEAD  # Compare with last commit
```

## Output Files

All functions save to the configured base directory (default: `.github/instructions/ai_utilities_context/`):

- **`ai-debug-context.txt`** - Complete debugging context for AI analysis
- **`pr-description-prompt.txt`** - GitHub PR description generation prompts
- **`jest-output.txt`** - AI-optimized test results
- **`diff.txt`** - Git changes with analysis

## Workflow

### Complete Development Workflow
```bash
# 1. Make your code changes
# 2. Run complete analysis
aiDebug my-feature

# If tests pass:
# ✅ Tests + Lint + Format + PR prompts automatically generated
# → Upload pr-description-prompt.txt to AI for PR creation
# → Commit and push

# If tests fail:
# ❌ Focused debugging context generated
# → Upload ai-debug-context.txt to AI for debugging
# → Fix issues and re-run aiDebug
```

### Manual Quality Workflow
```bash
# 1. Quality check only
prepareToPush my-feature

# 2. Test analysis
nxTest my-feature

# 3. Git change analysis
gitDiff

# 4. Upload relevant files to AI assistant
```

## File Structure

```
ai-debug-utilities/
├── index.zsh                    # Main entry point
├── functions/
│   ├── aiDebug.zsh             # Complete workflow function
│   ├── nxTest.zsh              # Test runner and optimizer
│   ├── gitDiff.zsh             # Git change analyzer
│   └── prepareToPush.zsh       # Code quality validator
└── README.md                   # This file
```

## Integration with AI Assistants

### For Debugging (Test Failures)
1. Run `aiDebug [project]`
2. Upload `ai-debug-context.txt` to your AI assistant
3. Use prompt: *"Analyze these test failures and provide specific fixes"*

### For PR Creation (Tests Passing)
1. Run `aiDebug [project]` (auto-generates PR prompts when tests pass)
2. Upload `pr-description-prompt.txt` to your AI assistant
3. Use prompt: *"Generate a GitHub PR description using these prompts"*

### For Code Review
1. Upload `ai-debug-context.txt` 
2. Use prompt: *"Review this code for quality and suggest improvements"*

## Advanced Configuration

### Environment Variables
```bash
# Custom output directory
export AI_UTILITIES_BASE_DIR="/custom/output/path"

# Disable startup messages
export AI_UTILITIES_QUIET=1
```

### Integration with Git Hooks
```bash
# pre-commit hook
#!/bin/sh
prepareToPush $(git diff --cached --name-only | head -1 | cut -d'/' -f1)
```

## Requirements

- **Angular NX monorepo** with Jest testing
- **Git** for version control
- **Yarn** package manager
- **Zsh shell** (bash compatibility available)
- **Node.js** v19+ recommended

## Key Features

- **Auto-triggered quality checks** when tests pass
- **Smart diff detection** finds relevant changes automatically
- **Failure correlation** links code changes to test failures
- **Performance insights** identifies slow tests
- **Coverage analysis** for changed files
- **PR-ready output** with formatted prompts for AI
- **Modular architecture** - use individual functions or complete workflow

## Troubleshooting

### Functions not found
```bash
# Reload shell configuration
source ~/.zshrc

# Check if functions are loaded
which aiDebug
```

### Permission errors
```bash
# Make scripts executable
chmod +x ai-debug-utilities/index.zsh
chmod +x ai-debug-utilities/functions/*.zsh
```

### Custom NX commands
The utilities work with standard NX commands. For custom test/lint configurations, ensure your project supports:
- `yarn nx test [project]`
- `yarn nx lint [project]`  
- `yarn nx prettier [project] --write`