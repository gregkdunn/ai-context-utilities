# AI Debug Utilities - VSCode Extension

AI-powered debugging and code quality tools for Angular NX monorepos, now available directly in VSCode!

## 🎯 Overview

AI Debug Utilities is a comprehensive VSCode extension designed to enhance development workflows in Angular NX monorepos. The extension provides intelligent debugging tools, automated testing utilities, and advanced git integration with AI-powered insights.

## 🚀 Phase 5 Features

### 1. NX Affected Mode
- **Intelligent Project Detection**: Automatically identifies projects affected by recent changes
- **Targeted Command Execution**: Run tests, lints, and builds only on affected projects
- **Status Bar Integration**: Real-time affected project count display
- **Performance Optimization**: Caching and parallel execution support

### 2. Enhanced Git Diff Options
- **Interactive Commit Comparison**: Select and compare any two commits with rich UI
- **Branch Comparison Tools**: Visual diff between branches with file-by-file analysis
- **Commit History Browser**: Navigate through commit history with search and filters
- **Syntax Highlighting**: Proper diff syntax highlighting in results

### 3. Flipper Detection
- **Automatic Feature Flag Detection**: Scans code for flipper/feature flag patterns
- **PR Integration**: Generates comprehensive PR sections with QA checklists
- **Environment Setup Instructions**: Detailed staging and production setup guidance
- **Comprehensive Pattern Matching**: Detects imports, method calls, observables, and templates

## 📋 Core Features

### AI-Powered Analysis
- **🤖 AI Debug Analysis**: Complete development workflow with test analysis, git changes, and code quality checks
- **🧪 NX Test Runner**: Execute Jest tests with AI-optimized output formatting
- **📋 Smart Git Diff**: Intelligent git change analysis with file categorization
- **🚀 Prepare to Push**: Automated linting and code formatting validation
- **📝 GitHub Copilot Integration**: Auto-trigger Copilot analysis for test failures and code review

## 🔧 Installation

1. Install the extension from the VSCode marketplace
2. Open an Angular NX workspace
3. The extension will automatically activate and show the AI Debug panel

## ⚡ Quick Start

### Key Commands
- **Ctrl+Shift+D**: Open AI Debug Panel
- **Ctrl+Shift+N**: Run NX Affected Command
- **Ctrl+Shift+G**: Interactive Git Diff
- **Ctrl+Shift+A**: Run AI Debug Analysis

### Basic Workflow
1. **Open the Panel**: Use `Ctrl+Shift+D` to open the AI Debug panel
2. **Select a Project**: Choose your NX project from the dropdown
3. **Run Analysis**: Click any of the action buttons to start analysis
4. **View Results**: Check the output files and use them with AI assistants

## 📚 Commands Reference

### NX Affected Commands
- `nx.runAffected`: Run any target on affected projects
- `nx.testAffected`: Run tests on affected projects
- `nx.lintAffected`: Run linting on affected projects
- `nx.buildAffected`: Build affected projects
- `nx.showAffectedProjects`: Show affected projects in quick pick

### Git Diff Commands
- `git.interactiveDiff`: Main interactive diff interface
- `git.compareCommits`: Select and compare two commits
- `git.compareBranches`: Select and compare two branches
- `git.showCommitHistory`: Browse commit history
- `git.enhancedDiff`: Quick diff against main branch

### AI Debug Commands
- `aiDebugUtilities.runAiDebug`: Complete development workflow analysis
- `aiDebugUtilities.runNxTest`: Execute Jest tests with AI-optimized reporting
- `aiDebugUtilities.runGitDiff`: Smart git change analysis
- `aiDebugUtilities.runPrepareToPush`: Code quality validation

## ⚙️ Configuration

The extension can be configured through VSCode settings:

```json
{
  // Core Settings
  "aiDebugUtilities.outputDirectory": ".github/instructions/ai_utilities_context",
  "aiDebugUtilities.autoDetectProject": true,
  "aiDebugUtilities.showNotifications": true,
  "aiDebugUtilities.terminalIntegration": true,
  
  // NX Configuration
  "nxAngular.defaultBase": "main",
  "nxAngular.enableAffectedMode": true,
  "nxAngular.parallelExecutions": 3,
  
  // Flipper Configuration
  "flipperDetection.enabled": true,
  "flipperDetection.includePRSection": true,
  
  // Copilot Integration
  "aiDebugUtilities.copilot.autoAnalyze": true,
  "aiDebugUtilities.copilot.analyzeOnFailure": true,
  "aiDebugUtilities.copilot.generatePR": true
}
```

## 📄 Output Files

The extension generates AI-optimized files in your configured output directory:

- **`ai-debug-context.txt`**: Complete debugging context for AI analysis
- **`jest-output.txt`**: AI-optimized test results
- **`diff.txt`**: Git changes with intelligent analysis
- **`pr-description-prompt.txt`**: GitHub PR description generation prompts
- **`flipper-analysis.md`**: Flipper detection results and PR sections

## 🔍 Feature Details

### NX Affected Mode
Run commands only on projects affected by your changes:
1. Make changes to your codebase
2. Status bar shows "NX (5 affected)"
3. Use Ctrl+Shift+N to run affected commands
4. Select target (test, lint, build)
5. Extension runs command only on affected projects

### Enhanced Git Diff
Interactive tools for comparing changes:
1. Use Ctrl+Shift+G to open interactive diff
2. Choose from commit comparison, branch comparison, or commit history
3. View results in rich webview with syntax highlighting
4. Detailed diff opens in new document

### Flipper Detection
Automatic feature flag detection with PR integration:
1. System scans code changes for flipper patterns
2. Generates comprehensive QA checklists
3. Creates environment setup instructions
4. Provides post-deployment cleanup reminders

## 🧪 Testing

### Running Tests
```bash
# Test all features
npm run test:all

# Test Phase 5 features
npm run test:phase5

# Test individual components
npm run test:nx
npm run test:git
npm run test:flipper

# Test with coverage
npm run test:coverage

# Test Angular components
npm run test:angular
```

### Test Coverage
- **NX Affected Manager**: 95% coverage
- **Git Diff Manager**: 90% coverage
- **Flipper Detection Manager**: 93% coverage
- **Overall Extension**: 92% coverage

## 🚀 Development

### Setup
```bash
# Clone and install dependencies
git clone <repository>
cd ai-debug-utilities
npm install

# Install Angular app dependencies
cd angular-app
npm install
cd ..

# Test TypeScript configuration
./test-typescript-fix.sh

# Run all tests
npm run test:all
```

### Build Process
```bash
# Compile main extension
npm run compile

# Build Angular app
npm run build:angular

# Complete build for publishing
npm run vscode:prepublish
```

### Development Workflow
```bash
# Watch mode for main extension
npm run watch

# Watch mode for Angular app
npm run build:angular:watch

# Debug extension (Press F5 in VSCode)
```

### Architecture
```
ai-debug-utilities/
├── src/                 # Main extension source
│   ├── commands/        # VSCode Commands
│   ├── services/        # Core services
│   │   ├── nx/          # NX Affected Mode
│   │   ├── git/         # Enhanced Git Diff
│   │   ├── flipper/     # Flipper Detection
│   │   └── plugins/     # Plugin System
│   ├── utils/           # Utility Functions
│   └── webview/         # UI Components
├── angular-app/         # Angular webview app
│   ├── src/app/         # Angular components
│   └── tsconfig.json    # Angular TypeScript config
├── out/                 # Compiled output
│   ├── extension.js     # Main extension
│   └── webview/         # Angular app build
└── tsconfig.json        # Main TypeScript config
```

### TypeScript Configuration
The project uses **separate TypeScript configurations**:
- **Main Extension**: `tsconfig.json` (compiles `src/` → `out/`)
- **Angular App**: `angular-app/tsconfig.json` (compiles `angular-app/src/` → `angular-app/dist/`)

This separation ensures:
- Clean compilation without path conflicts
- Proper module resolution for each environment
- Independent build processes for extension and webview

## 🔧 Troubleshooting

### Extension Not Activating
- Ensure your workspace contains `nx.json` or `angular.json`
- Check that you're in the root directory of your NX workspace
- Reload VSCode window (`Ctrl+Shift+P` → "Developer: Reload Window")

### NX Commands Not Working
- Ensure `nx` is installed (`npm install -g nx`)
- Verify workspace configuration
- Check NX version compatibility

### Git Diff Not Showing
- Ensure you're in a Git repository
- Check Git extension is enabled
- Verify Git is installed and accessible

### Flipper Detection Issues
- Check configuration is enabled
- Verify file types are supported
- Review pattern matching in debug logs

### Build Issues
- Run `./test-typescript-fix.sh` to verify TypeScript configuration
- Ensure both main and Angular dependencies are installed
- Check that build scripts are working: `npm run compile` and `npm run build:angular`

## 📖 Documentation

- **[Getting Started](docs/guides/GETTING_STARTED.md)**: Quick setup and first steps
- **[Testing Guide](docs/guides/TESTING.md)**: Complete testing documentation
- **[Usage Guide](docs/guides/USAGE.md)**: Detailed feature usage
- **[Troubleshooting Guide](docs/guides/TROUBLESHOOTING.md)**: Common issues and solutions
- **[API Reference](docs/api/)**: Developer API documentation

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes with tests
4. Run the test suite: `npm run test:all`
5. Submit a pull request

### Code Quality Standards
- **Test Coverage**: Maintain 95%+ coverage for new code
- **TypeScript**: Use strict type checking
- **Documentation**: Update relevant documentation
- **Error Handling**: Implement comprehensive error handling
- **Build Verification**: Ensure both main extension and Angular app build successfully

## 📋 Requirements

- **VSCode**: Version 1.85.0 or higher
- **Angular NX**: Monorepo with `nx.json` or `angular.json`
- **Node.js**: Version 18 or higher
- **Git**: For git diff features

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

For issues and feature requests, please use the GitHub repository issues page.

---

**Built with ❤️ for the Angular NX community**
