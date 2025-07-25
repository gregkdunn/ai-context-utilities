# AI Debug Context - VS Code Extension

![AI Debug Context](icon/icon.png)

## Overview

AI Debug Context is a powerful VS Code extension that enhances your development workflow by integrating AI-powered test debugging, Git diff analysis, and automated PR description generation for NX Angular projects. Built with TypeScript and Angular 18, it seamlessly integrates with GitHub Copilot to provide intelligent debugging assistance.

## Features

### 🔍 DIFF Module - Git Diff Generation
- Generate comprehensive diffs for uncommitted changes
- Select specific commits for diff generation
- Compare branches with intelligent diff analysis
- Real-time diff preview with syntax highlighting

### 🧪 TEST Module - NX Test Execution
- Run tests for single or multiple NX projects
- Execute affected tests based on Git changes
- Real-time test output streaming with progress indicators
- Smart project detection and selection

### 🤖 AI DEBUG Module - AI-Powered Test Debugging
- Intelligent test failure analysis using GitHub Copilot
- File selection interface for contextual debugging
- Fallback to clipboard functionality when Copilot is unavailable
- Customizable output directory for debug results

### 📝 PR DESC Module - Automated PR Descriptions
- Generate comprehensive PR descriptions from Git diffs
- Customizable templates and formatting options
- Jira integration for ticket linking
- AI-powered content suggestions

## Installation

### Prerequisites
- VS Code version 1.74.0 or higher
- Node.js 18.x or higher
- NX workspace (for test features)
- Git repository (for diff features)
- GitHub Copilot (optional, for AI features)

### Install from Marketplace
1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X / Cmd+Shift+X)
3. Search for "AI Debug Context"
4. Click Install

### Install from Source
```bash
# Clone the repository
git clone https://github.com/gregkdunn/ai_debug_context.git
cd ai_debug_context/vscode_v2

# Install dependencies
npm run setup

# Build and package
npm run package

# Install the generated .vsix file
code --install-extension ai-debug-context-*.vsix
```

## Quick Start

1. **Open an NX workspace** in VS Code
2. **Access the extension** via:
   - Command Palette: `Ctrl+Shift+P` / `Cmd+Shift+P` → "AI Debug Context"
   - Activity Bar: Click the AI Debug Context icon
   - Status Bar: Click the AI Debug Context status item

3. **Select a module**:
   - **DIFF**: Generate Git diffs for review
   - **TEST**: Run NX tests with real-time output
   - **AI DEBUG**: Debug test failures with AI assistance
   - **PR DESC**: Generate PR descriptions automatically

## Configuration

Configure the extension through VS Code settings:

```json
{
  // Output directory for AI debug files
  "aiDebugContext.outputDir": "${workspaceFolder}/ai-debug-output",
  
  // NX base branch for affected tests
  "aiDebugContext.nxBaseBranch": "main",
  
  // Enable GitHub Copilot integration
  "aiDebugContext.enableCopilot": true,
  
  // Jira configuration
  "aiDebugContext.jira.enabled": false,
  "aiDebugContext.jira.projectKey": "",
  "aiDebugContext.jira.baseUrl": ""
}
```

## Architecture

```
vscode_v2/
├── src/                    # Extension source code
│   ├── extension.ts        # Main extension entry
│   ├── services/           # Core services
│   ├── webview/            # Webview provider
│   └── types/              # TypeScript definitions
├── webview-ui/             # Angular 18 frontend
│   └── src/app/
│       ├── modules/        # Feature modules
│       ├── components/     # Shared components
│       └── services/       # Angular services
├── docs/                   # Documentation
└── icon/                   # Extension icons
```

## Development

See the [Development Guide](docs/DEVELOPMENT_GUIDE.md) for detailed information on:
- Setting up the development environment
- Running and debugging the extension
- Contributing guidelines
- Code style and best practices

## Documentation

- [User Guide](docs/USER_GUIDE.md) - Comprehensive usage instructions
- [Development Guide](docs/DEVELOPMENT_GUIDE.md) - For contributors
- [Module Documentation](docs/MODULES.md) - Detailed module descriptions
- [Service Documentation](docs/SERVICES.md) - Service API documentation
- [Component Documentation](docs/COMPONENTS.md) - UI component reference

## Support

- **Issues**: [GitHub Issues](https://github.com/gregkdunn/ai_debug_context/issues)
- **Discussions**: [GitHub Discussions](https://github.com/gregkdunn/ai_debug_context/discussions)
- **Documentation**: [Project Wiki](https://github.com/gregkdunn/ai_debug_context/wiki)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built with ❤️ using VS Code Extension API
- UI powered by Angular 18 and Tailwind CSS
- AI features powered by GitHub Copilot
- Terminal-style UI inspired by classic command-line interfaces

---

**Version**: 2.0.0 | **Author**: Greg Dunn | **Last Updated**: December 2024