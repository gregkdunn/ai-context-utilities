# AI Debug Context VSCode Extension v2

## Project Overview

This is Version 2 of the AI Debug Context VSCode extension, built with a modern architecture using:

- **VSCode Extension Backend**: TypeScript with proper service architecture
- **Angular Frontend**: Standalone components with Tailwind CSS for the webview UI
- **Modular Design**: Four main modules (File Selection, Test Selection, AI Debug, PR Generator)

## Project Structure

```
vscode_2/
├── src/                          # VSCode Extension Backend
│   ├── extension.ts              # Main extension entry point
│   ├── services/                 # Core services
│   │   ├── GitIntegration.ts     # Git operations
│   │   ├── NXWorkspaceManager.ts # NX workspace handling
│   │   ├── CopilotIntegration.ts # AI/Copilot integration
│   │   └── TestRunner.ts         # Test execution
│   ├── types/                    # TypeScript type definitions
│   ├── webview/                  # Webview provider
│   └── __tests__/                # Jest unit tests
└── webview-ui/                   # Angular Frontend
    ├── src/app/
    │   ├── components/           # Shared components
    │   ├── modules/              # Feature modules
    │   │   ├── file-selection/   # File selection module
    │   │   ├── test-selection/   # Test configuration module
    │   │   ├── ai-debug/         # AI debugging module
    │   │   └── pr-generator/     # PR description generator
    │   └── services/             # Angular services
    └── ...                       # Angular configuration files
```

## Features

### 🏗️ Implemented (Backend)
- ✅ VSCode extension activation/deactivation
- ✅ Activity bar icon and webview container setup
- ✅ Core service architecture (Git, NX, Copilot, TestRunner)
- ✅ Comprehensive TypeScript type definitions
- ✅ Jest test setup with VSCode API mocking
- ✅ Package.json configuration with proper scripts

### 🎨 Implemented (Frontend)
- ✅ Angular 18 with standalone components
- ✅ Tailwind CSS with VSCode theme integration
- ✅ Modular architecture with four main modules
- ✅ File selection component (uncommitted, commit, branch-diff)
- ✅ Test selection component (project vs affected tests)
- ✅ VSCode service for backend communication
- ✅ State management with Angular signals
- ✅ Responsive design with VSCode theme colors

### 📋 Module Status

#### File Selection Module (COMPLETE)
- ✅ Three modes: Uncommitted changes, Previous commits, Branch diff
- ✅ Interactive file selection with checkboxes
- ✅ Commit search and selection
- ✅ Git diff preview capabilities
- ✅ Mock data for development

#### Test Selection Module (COMPLETE)
- ✅ Project-based test selection
- ✅ NX affected test integration
- ✅ Test file filtering and selection
- ✅ Command preview functionality

#### AI Debug Module (COMPLETE UI)
- ✅ Workflow orchestration UI
- ✅ Progress tracking
- ✅ Results display components
- 🔄 Backend integration needed

#### PR Generator Module (COMPLETE UI)
- ✅ Template selection
- ✅ Jira ticket integration
- ✅ Feature flag detection
- ✅ Description preview and copy
- 🔄 Backend integration needed

## Current Status

### ✅ Ready to Test
- VSCode extension backend structure
- Angular frontend modules
- Development and build scripts
- Comprehensive testing setup

### 🔄 Needs Integration
- Backend service implementations (mock data → real Git/NX operations)
- Copilot/AI integration
- Webview ↔ Extension communication
- End-to-end workflow

## Testing the Extension

### Prerequisites
```bash
# Ensure you have Node.js 18+ and npm installed
cd /Users/gregdunn/src/test/ai_debug_context/vscode_2
```

### Quick Test
```bash
# Run the quick test script
bash /Users/gregdunn/src/test/ai_debug_context/temp_scripts/quick_test_vscode2.sh
```

### Full Build and Test
```bash
# Run the complete build and test
bash /Users/gregdunn/src/test/ai_debug_context/temp_scripts/full_test_vscode2.sh
```

### Manual Testing in VSCode
1. Open the `vscode_2` folder in VSCode
2. Press `F5` to run the extension in a new Extension Development Host window
3. Look for the 🤖 "AI Debug Context" icon in the Activity Bar
4. Click to open the webview and test the Angular interface

## Available Scripts

### VSCode Extension
```bash
npm run compile          # Compile TypeScript
npm run watch           # Watch mode compilation
npm test               # Run Jest tests
npm run test:coverage  # Coverage report
npm run lint           # ESLint
```

### Angular Webview
```bash
cd webview-ui
npm run build          # Production build
npm run start          # Development server
npm test              # Jest tests
npm run test:coverage # Coverage report
```

## Configuration

The extension supports these configuration options:
- `aiDebugContext.outputDirectory`: Where to save debug output
- `aiDebugContext.nxBaseBranch`: Base branch for NX affected calculations
- `aiDebugContext.copilot.enabled`: Enable/disable Copilot integration
- `aiDebugContext.jira.enabled`: Enable/disable Jira integration

## Architecture Highlights

### VSCode Extension Pattern
- Follows VSCode extension best practices
- Proper lifecycle management
- Service-based architecture for testability
- Comprehensive error handling

### Angular Architecture
- Standalone components (Angular 18+)
- OnPush change detection for performance
- Signal-based state management
- Modular feature organization

### Styling
- Tailwind CSS for utility-first styling
- Full VSCode theme integration
- Responsive design
- Accessibility considerations

## Next Steps

1. **Verify Extension Runs**: Test the current setup in VSCode
2. **Implement Backend Services**: Replace mock data with real Git/NX operations
3. **Add AI Integration**: Implement Copilot service with actual AI calls
4. **Connect Frontend to Backend**: Establish webview communication
5. **End-to-End Testing**: Test complete workflows
6. **Documentation**: Add comprehensive usage docs

## Known Issues

- Services currently use mock data (by design for initial setup)
- Copilot integration needs proper authentication setup
- Some TypeScript strict mode warnings may exist
- WebView communication not fully implemented

## Development Notes

- The project follows Angular and TypeScript best practices from the provided guidelines
- All code is written for readability and maintainability
- Tests are comprehensive with proper mocking
- The architecture is designed to be easily extensible

---

**Last Updated**: January 2025
**Version**: 2.0.0
**Status**: Ready for initial testing and backend implementation
