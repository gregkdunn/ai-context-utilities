# AI Debug Context - VSCode Extension v2

A comprehensive, production-ready VSCode extension that revolutionizes the development workflow for Angular NX projects with advanced AI-powered debugging, intelligent context generation, real-time test execution, and automated PR documentation generation.

## 🎯 Key Features

### 🤖 AI-Powered Analysis
- **GitHub Copilot Integration**: Native VSCode Language Model API integration with multi-model support
- **Comprehensive Analysis Dashboard**: Professional analysis interface with diagnostic status panel
- **System Diagnostics**: Real-time monitoring of Copilot availability, context files, and permissions
- **Intelligent Context Submission**: Automated chunking and parallel processing for large contexts
- **Historical Analysis Tracking**: Persistent storage and comparison of analysis results
- **Intelligent Test Failure Analysis**: Root cause analysis with specific code fixes and recommendations
- **False Positive Detection**: Identifies misleading passing tests that may hide issues
- **Smart Test Suggestions**: AI-generated recommendations for new test cases based on code changes
- **Fallback Systems**: Graceful degradation when AI services are unavailable

### 🔍 System Readiness Monitoring
- **Real-Time Health Checks**: Continuous monitoring of GitHub Copilot availability and model status
- **Context File Validation**: Automatic verification of required configuration files and permissions
- **Workspace Analysis**: Git repository detection and workspace validation
- **Diagnostic Dashboard**: Visual status indicators with expandable diagnostic details
- **One-Click System Refresh**: Manual diagnostic updates with comprehensive error reporting
- **Readiness Scoring**: Automated calculation of system preparedness for AI analysis

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

## 🔧 Diagnostic System

The extension includes a comprehensive diagnostic system that monitors system readiness for AI analysis:

### Status Monitoring
- **GitHub Copilot Status**: Real-time availability check with model information
- **Context File Verification**: Validates existence and accessibility of context files  
- **Workspace Health**: Confirms Git repository status and workspace configuration
- **Permission Checks**: Verifies file system read/write access

### Diagnostic Dashboard Features
- **Visual Status Indicators**: Color-coded status badges for immediate system health assessment
- **Expandable Details**: Collapsible diagnostic panels with detailed system information
- **One-Click Refresh**: Manual system diagnostics update with comprehensive error reporting
- **Readiness Scoring**: Automated calculation of overall system preparedness (0-100%)

### Troubleshooting Common Issues

#### 1. **GitHub Copilot Unavailable** ❌
**Error**: `Status: Unavailable - Error: Copilot not available`

**Root Causes & Solutions**:

**a) VSCode Version Compatibility**
- **Issue**: VSCode version below 1.85.0 (Language Model API not available)
- **Solution**: 
  - Check version: Help → About
  - Update to VSCode 1.85.0 or higher
  - Restart VSCode after updating

**b) GitHub Copilot Extension Missing**
- **Issue**: GitHub Copilot extension not installed or disabled
- **Solution**: 
  - Open Extensions (Ctrl+Shift+X / Cmd+Shift+X)
  - Search for "GitHub Copilot" 
  - Install and enable the extension
  - Restart VSCode if needed

**c) Authentication Problems**
- **Issue**: Not signed in to GitHub Copilot or session expired
- **Solution**: 
  - Run command: `GitHub Copilot: Sign In`
  - Follow authentication flow in browser
  - Verify active Copilot subscription in GitHub settings
  - Test with: `GitHub Copilot: Check Status`

**d) Network/Corporate Firewall**
- **Issue**: Corporate firewall blocking GitHub Copilot API access
- **Solution**: 
  - Contact IT to whitelist GitHub Copilot domains
  - Test basic Copilot functionality: Open `.ts` file, type `// function to add two numbers`
  - If suggestions don't appear, network configuration is likely the issue

**e) Extension Configuration**
- **Issue**: Copilot integration disabled in extension settings
- **Solution**: 
  - Open Settings (Ctrl+, / Cmd+,)
  - Search: `aiDebugContext.copilot.enabled`
  - Ensure setting is `true`
  - Reload window: `Developer: Reload Window`

**f) VSCode Language Model API Issues**
- **Issue**: Language Model API not responding or returning empty model list
- **Solution**: 
  - Try reloading VSCode window
  - Check VSCode Developer Console for errors: `Help → Toggle Developer Tools`
  - Look for language model related errors
  - Try: `GitHub Copilot: Reset Authentication`

**Quick Diagnostic Steps**:
1. Open any TypeScript file
2. Type: `// function to calculate factorial`
3. If no Copilot suggestions appear, the issue is with basic Copilot setup
4. If suggestions work but extension shows unavailable, restart VSCode
5. Use the extension's built-in diagnostic panel for detailed status

**Fallback Behavior**:
When Copilot is unavailable, the extension automatically:
- Provides template-based analysis instead of AI-powered insights
- Continues full workflow functionality (diff generation, test execution, PR templates)
- Shows clear status indicators and fallback messages
- Maintains all core features without AI analysis dependencies

**Additional Resources**:
- GitHub Copilot Status: https://githubstatus.com
- VSCode Language Model API Documentation
- Extension diagnostic panel provides real-time troubleshooting information
- Check VSCode Developer Console (`Help → Toggle Developer Tools`) for detailed error logs

#### 2. **Context Files Missing**
- **Issue**: Required configuration files not found in workspace
- **Solution**: Check that required configuration files exist in workspace root

#### 3. **Permission Errors**
- **Issue**: VSCode lacks necessary file system permissions
- **Solution**: Verify VSCode has necessary file system read/write permissions

#### 4. **Workspace Issues**
- **Issue**: Project not opened in a valid Git repository
- **Solution**: Confirm project is opened in a valid Git repository with proper initialization

## 🔄 Typical Workflow

1. **Start the Extension**: Click the AI Debug Context icon in the Activity Bar
2. **Check System Readiness**: Review the diagnostic panel to ensure all systems are ready
3. **Select Files**: Choose uncommitted changes, specific commits, or branch differences
4. **Configure Tests**: Select NX projects or run affected tests
5. **Run AI Debug**: Execute tests and get AI-powered analysis with diagnostic feedback
6. **Generate PR Template**: Automatically create a comprehensive PR template file
7. **Validate Code**: Run Prepare to Push to ensure code quality
8. **Use the Context**: Copy the generated template to your PR or AI assistant

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