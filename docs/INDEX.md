# AI Context Utilities v3.5.1 Documentation

**Last Updated**: August 4, 2025  
**Version**: 3.5.1  
**Status**: Production Ready

## 📚 Current Documentation

### Core Documentation
- **[README.md](../README.md)** - Main project documentation and feature overview
- **[CHANGELOG.md](../CHANGELOG.md)** - Version history and feature updates

### Development Documentation
- **[Technical Specifications](development/TECHNICAL_SPECIFICATIONS.md)** - Comprehensive technical documentation
- **[UI Specifications](development/UI_SPECIFICATIONS_v3_5_1.md)** - User interface reference and design specifications

### User Guides  
- **[Beta Installation Guide](guides/BETA_INSTALLATION_GUIDE.md)** - Installation guide for beta testers
- **[Quick Start Guide](guides/QUICK_START_GUIDE.md)** - Get started quickly with common workflows
- **[Full User Guide](guides/FULL_USER_GUIDE.md)** - Comprehensive feature documentation

### Planning & Architecture
- **[v3.6.0 Feature Plan](planning/v3_6_0_FEATURE_PLAN.md)** - Future non-Nx project support roadmap

### Archived Documentation


## 🎯 Key Features (v3.5.1)

### 🤖 GitHub Copilot Instructions
- **Automatic Generation**: Creates comprehensive instruction files from project configuration
- **ESLint Translation**: Converts technical rules into natural language guidance
- **Prettier Integration**: Generates formatting instructions from configuration
- **Framework Detection**: Angular, React, Vue, TypeScript with confidence scoring
- **User Override System**: Priority-based customization system (Priority 1000)

### 🏗️ Universal Project Support
- **Multi-Architecture Support**: Nx, Turborepo, Lerna, workspaces, standalone projects
- **Intelligent Detection**: Automatically identifies project type and capabilities
- **Smart Fallbacks**: Graceful degradation when expected tools unavailable
- **Workspace Isolation**: Recent projects and history separated per workspace

### 🧪 Intelligent Test Execution
- **Universal Test Runner**: Works across all project types with appropriate command translation
- **Real-Time Monitoring**: Live test output with progress tracking and error detection
- **Workspace-Specific History**: Recent test projects isolated per workspace
- **Performance Caching**: Test result caching with intelligent invalidation

### 🚀 Enhanced Developer Workflow
- **Prepare to Push**: Automated pre-push testing and validation
- **PR Description Generation**: Template-aware descriptions with JIRA integration
- **Feature Flag Detection**: 10+ systems supported with QA checklist generation
- **Workspace Analysis**: Comprehensive project structure and dependency analysis

## 📁 Generated File Structure

### Copilot Instructions
**Location:** `.github/instructions/`

```
.github/instructions/
├── copilot-instructions.md           # Main entry point (Priority: 200)
├── user-overrides.instructions.md    # User customizations (Priority: 1000)
└── frameworks/                       # Framework-specific files
    ├── eslint-rules.instructions.md      # ESLint rules translated (Priority: 30)
    ├── prettier-formatting.instructions.md # Prettier settings (Priority: 20)
    ├── angular-context.instructions.md    # Angular official docs (Priority: 900)
    ├── angular.instructions.md            # Angular patterns (Priority: 100)
    └── typescript.instructions.md         # TypeScript guidelines (Priority: 50)
```

### Context Files
**Location:** `.github/instructions/ai-utilities-context/`

- **`ai-debug-context.txt`** - Test context for debugging and code review
- **`pr-description.txt`** - PR descriptions based on git diff analysis
- **`test-output.txt`** - Raw test execution output and results
- **`diff.txt`** - Git changes and affected files

## 🚀 Quick Links

- **New Users**: Start with [Beta Installation Guide](guides/BETA_INSTALLATION_GUIDE.md)
- **Quick Setup**: Follow [Quick Start Guide](guides/QUICK_START_GUIDE.md)
- **Complete Reference**: See [Full User Guide](guides/FULL_USER_GUIDE.md)
- **Technical Details**: Review [Technical Specifications](development/TECHNICAL_SPECIFICATIONS.md)
- **Latest Updates**: Check [CHANGELOG.md](../CHANGELOG.md) for recent features
- **Future Planning**: See [v3.6.0 Feature Plan](planning/v3_6_0_FEATURE_PLAN.md)

## 🔄 Recent Updates (v3.5.1)

### ✨ New Features
- **Workspace-Specific Recent Projects**: Each workspace maintains its own test history
- **Non-Nx Project Support**: Automatic detection and fallback to package.json scripts
- **Enhanced Notifications**: Clear messaging when falling back from Nx to alternatives
- **Universal Command Translation**: Smart mapping of test commands across project types

### 📦 Configuration Updates
- **New Setting**: `recentProjectsByWorkspace` for workspace-isolated history
- **Backward Compatibility**: Legacy `recentProjects` setting preserved
- **Automatic Migration**: Seamless transition from global to workspace-specific storage

---

**Documentation Principle**: Comprehensive, accurate, and up-to-date technical documentation with clear examples and migration guidance.