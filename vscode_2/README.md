# AI Debug Context - VSCode Extension v2

A comprehensive, production-ready VSCode extension that revolutionizes the development workflow for Angular NX projects with advanced AI-powered debugging, intelligent context generation, real-time test execution, and automated PR documentation generation.

## 🎯 Key Features

### 🤖 AI-Powered Analysis
- **GitHub Copilot Integration**: Native VSCode Language Model API integration with multi-model support
- **Intelligent Test Failure Analysis**: Root cause analysis with specific code fixes and recommendations
- **False Positive Detection**: Identifies misleading passing tests that may hide issues
- **Smart Test Suggestions**: AI-generated recommendations for new test cases based on code changes
- **Fallback Systems**: Graceful degradation when AI services are unavailable

### 🗃️ Advanced File Management
- **Multi-Mode Git Selection**: Uncommitted changes, multi-commit selection, branch comparisons
- **Static File Naming**: Consistent filenames (`git-diff.txt`, `test-results.txt`, `ai-debug-context.txt`) for easy Copilot reference
- **Structured Output**: Organized file generation in configurable directories
- **File Operations**: Save, open, delete, and manage generated context files
- **Automatic Cleanup**: Intelligent file management to prevent clutter

### 🧪 Comprehensive Test Integration
- **NX Workspace Support**: Full NX CLI integration with project discovery and caching
- **Multiple Execution Modes**: Project-specific, affected tests, multi-project selection
- **Real-Time Streaming**: Live test output with progress tracking and result parsing
- **Performance Analytics**: Test execution timing, slow test identification, comprehensive reporting
- **Jest Integration**: Advanced output parsing, failure categorization, error extraction

### 🚀 Professional Workflow Automation
- **End-to-End Workflow**: From code changes to PR generation in a single interface
- **PR Template System**: Multiple templates (standard, feature, bugfix) with AI enhancement
- **Code Quality Validation**: Integrated linting, formatting, and pre-commit workflows
- **Jira Integration**: Automatic ticket linking and professional PR descriptions
- **Context Optimization**: AI-optimized output formatting for enhanced analysis

### 🎨 Premium User Experience
- **Terminal-Themed Interface**: Professional, consistent terminal aesthetic
- **Angular 17 Architecture**: Modern standalone components with Signals state management
- **Real-Time Updates**: Streaming interfaces for all long-running operations
- **VSCode Theme Integration**: Perfect light/dark mode compatibility
- **Responsive Design**: Optimized for various panel sizes and layouts

## Architecture

This extension uses:
- **VSCode Extension API** for the main extension logic
- **Angular 17** with standalone components for the webview UI
- **Signals** for state management
- **Tailwind CSS** for styling with VSCode theme integration
- **GitHub Copilot API** for AI analysis

## Project Structure

```
├── src/                          # Extension source code
│   ├── extension.ts             # Main extension entry point
│   ├── services/                # Core services
│   │   ├── GitIntegration.ts    # Git operations
│   │   ├── NXWorkspaceManager.ts # NX workspace management
│   │   ├── TestRunner.ts        # Test execution
│   │   └── CopilotIntegration.ts # AI analysis
│   ├── webview/                 # Webview provider
│   └── types/                   # TypeScript types
├── webview-ui/                  # Angular webview application
│   ├── src/app/                 # Angular components
│   │   ├── components/          # UI components
│   │   └── services/            # Angular services
│   └── src/styles.css          # VSCode theme styles
└── out/                         # Compiled output
```

## Development Setup

1. **Install Dependencies**:
   ```bash
   npm run setup
   ```

2. **Development Mode**:
   ```bash
   npm run dev              # Watch TypeScript + tests
   npm run dev:webview      # Start Angular dev server
   ```

3. **Testing**:
   ```bash
   npm run test             # Run extension tests
   npm run test:all         # Run all tests (extension + webview)
   ```

4. **Building**:
   ```bash
   npm run compile          # Compile TypeScript
   npm run build:webview    # Build Angular app
   ```

## Testing the Extension

1. Open this project in VSCode
2. Press `F5` to launch the Extension Development Host
3. Look for the "AI Debug Context" icon in the Activity Bar
4. The webview should load with the main interface

## Current Implementation Status

### ✅ Completed Modules (4/4)

#### 1. **DIFF Module - File Selection** ✅
- Multiple selection modes (uncommitted, commit history, branch-diff)
- Real-time diff generation with streaming output
- Multi-commit range selection with advanced UX
- File management operations (save, open, delete)
- Automatic cleanup of old diff files

#### 2. **TEST Module - Test Execution** ✅
- NX workspace auto-detection and project discovery
- Multiple execution modes (project, affected, multi-project)
- Real-time test output streaming with progress tracking
- Jest result parsing and categorization
- Test execution cancellation support

#### 3. **AI TEST DEBUG Module - Main Workflow** ✅
- GitHub Copilot integration via VSCode Language Model API
- Test failure analysis with specific fix recommendations
- False positive detection for passing tests
- New test case suggestions based on code changes
- Comprehensive diagnostics and fallback mechanisms

#### 4. **PR DESC Module - PR Template Generation** ✅
- Template-based PR description generation
- Git diff integration for change analysis
- Test result and AI analysis integration
- Automatic template file creation in `.ai-debug-context/pr-templates/`
- Support for custom PR format sections (Problem, Solution, Details, QA)

#### 5. **Prepare to Push Module** ✅
- Integrated linting and formatting validation
- Real-time output streaming
- Project-specific and affected mode support
- Clear success/failure status reporting

## ⚙️ Configuration

### Core Settings
- `aiDebugContext.outputDirectory`: Output directory for generated files (default: `.github/instructions/ai_utilities_context`)
- `aiDebugContext.nxBaseBranch`: Base branch for affected calculations (default: `main`)

### GitHub Copilot Integration
- `aiDebugContext.copilot.enabled`: Enable/disable GitHub Copilot features (default: `true`)
- `aiDebugContext.copilot.timeout`: API timeout in milliseconds (default: `30000`)
- `aiDebugContext.copilot.fallbackEnabled`: Enable template fallbacks when Copilot unavailable (default: `true`)

### Jira Integration
- `aiDebugContext.jira.enabled`: Enable Jira ticket integration (default: `false`)
- `aiDebugContext.jira.baseUrl`: Jira instance URL for automatic ticket linking

### Advanced Options
- `aiDebugContext.git.cleanupOldFiles`: Automatic file cleanup (default: `true`)
- `aiDebugContext.git.maxDiffSize`: Maximum diff size in MB (default: `10`)
- `aiDebugContext.test.timeout`: Test execution timeout in seconds (default: `300`)
- `aiDebugContext.performance.enableCaching`: Enable project caching (default: `true`)

## 📋 Commands

### Main Commands
- `AI Debug Context: Open AI Debug Context` - Launch the main extension panel
- `AI Debug Context: AI Test Debug` - Execute the complete AI-powered debug workflow

### Workflow Commands
- `AI Debug Context: Generate PR Template` - Create comprehensive PR documentation
- `AI Debug Context: Run Prepare to Push` - Validate code quality and formatting
- `AI Debug Context: Show Diagnostics` - Display system health and Copilot status
- `AI Debug Context: Clean Output Files` - Manual cleanup of generated files

### Quick Actions
- `AI Debug Context: Run Affected Tests` - Execute NX affected tests only
- `AI Debug Context: Generate Git Diff` - Create formatted diff analysis
- `AI Debug Context: Open Output Directory` - Browse generated files

## 🔄 Typical Workflow

1. **Start the Extension**: Click the AI Debug Context icon in the Activity Bar
2. **Select Files**: Choose uncommitted changes, specific commits, or branch differences
3. **Configure Tests**: Select NX projects or run affected tests
4. **Run AI Debug**: Execute tests and get AI-powered analysis
5. **Generate PR Template**: Automatically create a comprehensive PR template file
6. **Validate Code**: Run Prepare to Push to ensure code quality
7. **Use the Context**: Copy the generated template to your PR or AI assistant

## 📁 Generated Files

The extension creates organized, consistently named output files optimized for Copilot integration:

```
.github/instructions/ai_utilities_context/    # Main output directory
├── ai-debug-context.txt                     # Complete AI analysis context
├── test-results.txt                         # Formatted test execution results
└── copilot-analysis.md                      # AI-generated analysis reports

.ai-debug-context/                           # Additional context files
├── diffs/
│   └── git-diff.txt                         # Git changes analysis
└── pr-templates/
    └── pr-description-template.txt          # Generated PR templates
```

### File Characteristics
- **Static Naming**: Consistent filenames for easy reference in `.git/instructions/copilot-instructions.md`
- **Date in Content**: Timestamps embedded within files rather than filenames
- **AI-Optimized Format**: Structured for optimal AI analysis and processing
- **Copilot Ready**: Files formatted for direct integration with GitHub Copilot workflows

## 📋 Requirements

### Essential
- **VSCode**: 1.85.0 or higher (Language Model API support required)
- **Node.js**: 18 or higher
- **Git**: Any recent version for repository operations

### For Full Functionality
- **NX Workspace**: Required for advanced test execution and project management
- **GitHub Copilot Extension**: Required for AI-powered analysis features
- **Jest**: Test framework integration (automatically detected in NX projects)

### Optional Integrations
- **Jira**: For automatic ticket linking in PR templates
- **ESLint/Prettier**: For code quality validation in Prepare to Push module

## Contributing

1. Follow Angular best practices for UI components
2. Use TypeScript strict mode
3. Write tests for new functionality
4. Follow the existing code style and patterns