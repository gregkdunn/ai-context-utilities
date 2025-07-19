# AI Debug Context - VSCode Extension v2

A VSCode extension that provides AI-powered debugging and context generation for Angular NX projects with integrated test analysis and PR description generation.

## Features

- 🤖 **AI Test Debug**: Intelligent test failure analysis using GitHub Copilot
- 📁 **File Selection**: Choose from uncommitted changes, specific commits, or branch diffs
- 🧪 **Test Integration**: Run NX affected tests or project-specific tests
- 📋 **PR Generation**: AI-powered PR description generation with Jira integration
- 🎯 **Modular Design**: Independent modules for easy extension

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

### ✅ Completed
- Basic extension structure and activation
- VSCode webview provider with Angular integration
- Core services (Git, NX, TestRunner, Copilot stubs)
- Angular UI with VSCode theme integration
- Workflow state management with signals
- Basic test coverage for services
- Development and build configuration

### 🚧 In Progress
- Webview UI components for file selection
- Test configuration UI
- AI analysis workflow implementation
- PR description generation

### 📋 Planned
- File selection module (uncommitted/commit/branch diff)
- Test selection module (project/affected)
- AI analysis results display
- PR description generator UI
- Jira ticket integration
- Feature flag detection

## Configuration

The extension supports these settings:

- `aiDebugContext.outputDirectory`: Output directory for AI debug files
- `aiDebugContext.nxBaseBranch`: Base branch for NX affected calculations
- `aiDebugContext.copilot.enabled`: Enable/disable GitHub Copilot integration
- `aiDebugContext.jira.enabled`: Enable/disable Jira integration

## Commands

- `AI Debug Context: Open AI Debug Context` - Open the main webview
- `AI Debug Context: AI Test Debug` - Run the full AI debug workflow

## Requirements

- VSCode 1.85.0 or higher
- Node.js 18 or higher
- NX workspace (for full functionality)
- GitHub Copilot extension (for AI features)

## Contributing

1. Follow Angular best practices for UI components
2. Use TypeScript strict mode
3. Write tests for new functionality
4. Follow the existing code style and patterns