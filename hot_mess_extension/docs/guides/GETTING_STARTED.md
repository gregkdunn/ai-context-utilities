# Getting Started with AI Debug Utilities

## Quick Start (2 minutes)

### 1. Installation
```bash
# Install from VSCode Marketplace
code --install-extension ai-debug-utilities
```

### 2. Open AI Debug Panel
- Press `Ctrl+Shift+D` (Windows/Linux) or `Cmd+Shift+D` (Mac)
- Or use Command Palette: `AI Debug: Open Panel`

### 3. Select Your Project
1. The extension auto-detects NX projects in your workspace
2. Select a project from the dropdown
3. Click any action button to get started

### 4. Run Your First Command
- **🤖 AI Debug**: Complete workflow analysis
- **🧪 NX Test**: Execute tests with AI insights  
- **📋 Git Diff**: Analyze changes for AI review
- **🚀 Prepare to Push**: Lint + format workflow

## What Each Command Does

### AI Debug Analysis 🤖
**Perfect for:** Getting AI help with failing tests
1. Runs your tests and captures any failures
2. Generates a git diff showing recent changes
3. Creates AI-optimized context files
4. Provides next-step recommendations

### NX Test 🧪  
**Perfect for:** Running tests with enhanced output
1. Executes NX test command for your project
2. Parses and highlights test failures
3. Provides performance insights
4. Formats output for easy reading

### Git Diff 📋
**Perfect for:** Code review preparation
1. Analyzes unstaged, staged, or recent changes
2. Categorizes changes by file type
3. Generates AI-friendly diff summaries
4. Identifies potential impact areas

### Prepare to Push 🚀
**Perfect for:** Pre-commit quality checks
1. Runs ESLint to check code quality
2. Executes Prettier to format code
3. Reports any issues found
4. Ensures code is ready for push

## Development Setup

### Prerequisites
- Node.js 18+ and npm
- VSCode 1.85+
- TypeScript 5.3+

### Building the Extension
```bash
# Clone and setup
git clone <repository>
cd ai-debug-utilities
npm install

# Build Angular app
cd angular-app
npm install
cd ..

# Compile TypeScript
npm run compile

# Build complete extension
npm run vscode:prepublish
```

### Testing
```bash
# Run all tests
npm run test:all

# Run specific test suites
npm run test              # Main extension tests
npm run test:angular      # Angular app tests
npm run test:phase5       # Service tests

# Test TypeScript configuration
./test-typescript-fix.sh
```

### Development Mode
```bash
# Watch mode for TypeScript
npm run watch

# Watch mode for Angular
npm run build:angular:watch

# Debug extension
# Press F5 in VSCode to launch Extension Development Host
```

## Architecture Overview

### Project Structure
```
ai-debug-utilities/
├── src/                 # Main extension source
│   ├── commands/        # Command implementations
│   ├── services/        # Core services (NX, Git, Flipper)
│   ├── utils/           # Utility functions
│   └── webview/         # Webview integration
├── angular-app/         # Angular webview app
│   ├── src/app/         # Angular components
│   └── tsconfig.json    # Angular TypeScript config
├── out/                 # Compiled output
│   ├── extension.js     # Main extension
│   └── webview/         # Angular app build
└── tsconfig.json        # Main TypeScript config
```

### Build Process
1. **Main Extension**: `tsconfig.json` compiles `src/` → `out/`
2. **Angular App**: `angular-app/tsconfig.json` compiles Angular → `angular-app/dist/`
3. **Integration**: `build:angular` copies Angular build to `out/webview/`

## Next Steps
- [Testing Guide](TESTING.md) - Complete testing documentation
- [Detailed Usage Guide](USAGE.md) - Learn all features and shortcuts
- [Troubleshooting](TROUBLESHOOTING.md) - Solve common issues
- [API Documentation](../api/COMMANDS.md) - Technical reference

## Tips for Success
- **Select the right project** - Make sure you've selected the correct NX project
- **Check prerequisites** - Ensure NX CLI and project dependencies are installed
- **Use real-time output** - Watch the live output to understand what's happening
- **Try keyboard shortcuts** - `Ctrl+R` to refresh, `Ctrl+Shift+C` to cancel all
- **Test regularly** - Run `npm run test:all` to ensure everything works
- **Separate builds** - Main extension and Angular app have separate TypeScript configs
