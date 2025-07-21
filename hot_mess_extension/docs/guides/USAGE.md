# Usage Guide

## Command Reference

### AI Debug Analysis 🤖
Complete debugging workflow with AI-optimized output generation.

**What it does:**
1. Runs tests and captures failures
2. Generates git diff for context  
3. Creates AI-ready analysis files
4. Provides next-step recommendations

**When to use:**
- Before asking AI for help with failing tests
- When preparing context for code reviews
- For comprehensive project analysis

**Output Files Generated:**
- `jest-output.md` - Test results and failures
- `git-diff.md` - Code changes analysis
- `ai-debug-context.md` - Combined AI context
- `pr-description.md` - Pull request template

### NX Test 🧪
Execute NX tests with enhanced output parsing and insights.

**What it does:**
1. Runs `nx test <project>` command
2. Parses test output for failures and warnings
3. Highlights performance issues
4. Provides test coverage insights

**When to use:**
- Running tests with better output formatting
- Analyzing test performance
- Getting detailed failure analysis

**Options Available:**
- Watch mode for continuous testing
- Coverage reporting
- Specific test file targeting
- Custom Jest arguments

### Git Diff 📋
Generate comprehensive git diff analysis for AI review.

**What it does:**
1. Detects unstaged, staged, or recent changes
2. Categorizes changes by file type and impact
3. Generates structured diff output
4. Provides change summary statistics

**When to use:**
- Preparing for code reviews
- Understanding change impact
- Creating AI-friendly change summaries

**Smart Detection:**
- Unstaged changes (if present)
- Staged changes (if no unstaged)
- Last commit changes (if clean working directory)
- Branch comparisons

### Prepare to Push 🚀
Run comprehensive code quality checks before pushing.

**What it does:**
1. Executes ESLint for code quality
2. Runs Prettier for code formatting
3. Reports any issues found
4. Provides fix recommendations

**When to use:**
- Before committing code
- As part of pre-push hooks
- For code quality validation

**Quality Checks:**
- TypeScript compilation
- ESLint rules validation
- Prettier formatting
- Import statement organization

## Advanced Features

### Real-time Streaming
- **Live Output**: See command output as it happens
- **Progress Tracking**: Visual progress bars with status updates
- **Cancellation**: Stop commands mid-execution with Cancel button
- **Auto-scroll**: Automatically scroll to latest output (toggleable)

### Context Menus  
Right-click on different elements for quick actions:

**Command Buttons:**
- Execute command
- Cancel if running
- Copy last output
- View output files
- Restart command

**Results Area:**
- Copy output to clipboard
- Download output files
- Clear results
- Open output directory

**Project Selector:**
- Refresh project list
- Open project folder
- Copy project path

### Keyboard Shortcuts
Master these shortcuts for efficient workflow:

**Global Shortcuts:**
- `Ctrl+Shift+D` - Open AI Debug panel
- `Ctrl+Shift+P` - Command palette
- `F5` - Refresh project data

**Panel Shortcuts:**
- `Ctrl+R` - Refresh project data
- `Ctrl+Shift+C` - Cancel all commands
- `Ctrl+A` - Toggle analytics view
- `Ctrl+K` - Clear output
- `Esc` - Close overlays and dialogs

**Navigation:**
- `Tab` - Navigate between elements
- `Enter` - Activate focused element
- `Space` - Toggle checkboxes/buttons

### Results Visualization
Advanced analytics dashboard with:

**Overview Metrics:**
- Total commands executed
- Success/failure rates
- Average execution times
- Most frequently used commands

**Performance Charts:**
- Execution time trends
- Success rate over time
- Command usage distribution
- Error pattern analysis

**Project Statistics:**
- Per-project execution data
- Test coverage trends
- Code quality metrics
- Change frequency analysis

### File Management
Intelligent output file handling:

**Automatic Organization:**
- Timestamped output files
- Organized by command type
- Automatic cleanup of old files
- Backup and restore capabilities

**File Operations:**
- Open files in VSCode
- Download files to local system
- Copy file contents to clipboard
- Share files with team members

**Version Control:**
- File versioning with rollback
- Change tracking and history
- Backup before modifications
- Conflict resolution

## Configuration Options

### Extension Settings
Customize the extension behavior through VSCode settings:

```json
{
  "aiDebugUtilities.outputDirectory": ".github/instructions/ai_utilities_context",
  "aiDebugUtilities.autoDetectProject": true,
  "aiDebugUtilities.showNotifications": true,
  "aiDebugUtilities.terminalIntegration": true,
  "aiDebugUtilities.autoBackup": false,
  "aiDebugUtilities.maxRetries": 2,
  "aiDebugUtilities.validateContent": true
}
```

**Setting Descriptions:**
- `outputDirectory` - Where to save output files
- `autoDetectProject` - Automatically detect current project
- `showNotifications` - Show completion notifications
- `terminalIntegration` - Use integrated terminal
- `autoBackup` - Create backups before file operations
- `maxRetries` - Maximum retry attempts for failed operations
- `validateContent` - Validate file content by type

### Per-Project Configuration
Create project-specific settings in `.vscode/settings.json`:

```json
{
  "aiDebugUtilities.defaultTestArgs": "--coverage",
  "aiDebugUtilities.customOutputPath": "./debug-output",
  "aiDebugUtilities.lintConfig": ".eslintrc.custom.js"
}
```

## Best Practices

### Workflow Optimization
1. **Start with AI Debug** - Get comprehensive analysis
2. **Use keyboard shortcuts** - Faster than mouse clicks
3. **Monitor real-time output** - Catch issues early
4. **Organize output files** - Keep workspace clean
5. **Review analytics** - Learn from patterns

### Troubleshooting Workflow
1. Run AI Debug to get full context
2. Review test failures in formatted output
3. Analyze git diff for recent changes
4. Use AI assistant with generated context
5. Implement fixes and re-test

### Code Quality Workflow
1. Make code changes
2. Run Prepare to Push for quality checks
3. Fix any linting or formatting issues
4. Run NX Test to verify functionality
5. Use Git Diff to review changes
6. Commit and push

### AI Assistant Integration
1. Run AI Debug for comprehensive context
2. Copy generated AI context file
3. Paste into ChatGPT, Claude, or other AI
4. Get specific recommendations
5. Implement suggestions and re-test

## Tips and Tricks

### Efficiency Tips
- Use `Ctrl+Shift+D` to quickly open the panel
- Right-click for context-specific actions
- Use auto-scroll toggle when reviewing long outputs
- Cancel long-running commands with `Ctrl+Shift+C`
- Clear output regularly to avoid clutter

### Customization Tips
- Adjust output directory for team sharing
- Enable auto-backup for important projects
- Customize notification preferences
- Set up project-specific configurations

### Integration Tips
- Use with GitHub Copilot for enhanced AI assistance
- Integrate with pre-commit hooks
- Share output files with team members
- Use analytics to identify improvement areas

### Performance Tips
- Close analytics view when not needed
- Clear command history periodically
- Use specific test targeting for faster execution
- Monitor system resources during large operations

## Common Workflows

### Daily Development
1. Open AI Debug panel (`Ctrl+Shift+D`)
2. Select current project
3. Run tests to verify current state
4. Make code changes
5. Use Prepare to Push before committing

### Bug Investigation
1. Run AI Debug for full context
2. Review test failures and errors
3. Analyze recent changes with Git Diff
4. Use AI assistant with generated context
5. Implement fixes and verify

### Code Review Preparation
1. Run Git Diff to see all changes
2. Use Prepare to Push for quality validation
3. Generate AI Debug context for complex changes
4. Review output files before creating PR

### Team Collaboration
1. Share output files with team members
2. Use consistent output directory structure
3. Include AI context in pull requests
4. Review analytics for team insights
