# Changelog

All notable changes to the AI Context Utilities extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.5.1] - 2025-08-04

### 🎯 Enhanced Workspace Support

#### ✨ Workspace-Specific Recent Projects
- **Individual Workspace History**: Recent projects and test history are now isolated per workspace
- **Workspace Key Generation**: Uses workspace name + path hash for unique identification
- **Seamless Switching**: Changing workspaces automatically shows relevant recent projects
- **Backward Compatibility**: Legacy global recent projects preserved during migration
- **Configuration Update**: New `recentProjectsByWorkspace` setting alongside legacy support

#### 🔧 Non-Nx Workspace Support
- **Automatic Nx Detection**: Intelligently detects if Nx is actually installed and available
- **Package.json Fallback**: Falls back to npm scripts when Nx is not available
- **Smart Command Mapping**: Maps affected tests to appropriate alternatives for non-Nx projects
- **User Notifications**: Clear messaging when falling back from Nx to package.json scripts
- **Affected Test Handling**: Graceful degradation when dependency graph analysis unavailable

#### 📋 Improved User Experience
- **Clear Notifications**: Informative popups explain fallback behavior
- **Learn More Links**: Direct links to Nx documentation when affected tests unavailable
- **Session Management**: Notifications shown once per session to avoid spam
- **Configuration Validation**: Better detection of project architecture and capabilities

### 🛠️ Technical Improvements
- **ConfigurationManager Enhancements**: Added `isNxAvailable()`, `getPackageJsonTestScripts()`, and fallback logic
- **Service Consistency**: Unified workspace key generation across all services
- **Storage Optimization**: More efficient workspace-specific data storage
- **Error Handling**: Better error messages for unsupported operations

### 📦 Configuration Changes
- **New Setting**: `aiDebugContext.recentProjectsByWorkspace` (object) - Workspace-keyed recent projects
- **Legacy Support**: `aiDebugContext.recentProjects` (array) - Maintained for backward compatibility
- **Migration Path**: Automatic migration from legacy to new format when switching workspaces

## [3.5.0] - 2025-01-31

### 🎉 Major Features Added - Phase 3.5.0: Advanced Copilot Instructions

#### ✨ ESLint Configuration Parser & Rule Translation
- **Automatic ESLint Rule Translation**: Converts technical ESLint rules into natural language instructions that GitHub Copilot can understand
- **Multi-format Support**: Handles both modern flat config (ESLint 9+) and legacy `.eslintrc.*` formats
- **TypeScript Integration**: Specialized handling for `@typescript-eslint` rules with type-aware configurations
- **Rule Categorization**: Organizes rules into logical categories (Type Safety, Import Organization, Naming Conventions, etc.)
- **Monorepo Support**: Detects and handles complex workspace configurations

#### 🎨 Prettier Configuration Integration
- **Formatting Rule Translation**: Transforms Prettier options into clear coding guidelines
- **File-specific Overrides**: Handles different formatting rules for various file types
- **Configuration Validation**: Validates Prettier configs and provides helpful error messages
- **Multiple Format Support**: Supports all Prettier configuration file formats

#### 👤 User Override System (Priority 1000)
- **Highest Priority Instructions**: User customizations always take precedence over generated content
- **Interactive Override Creation**: Built-in wizard for creating overrides directly in VS Code
- **Safe Editing**: User override file is never automatically modified, guaranteeing customization safety
- **Override Templates**: Pre-built templates for common override scenarios (rule overrides, style preferences, architectural decisions)
- **Team Collaboration**: Version-controllable override files for team consistency

#### 📋 YAML Frontmatter Generation
- **Intelligent Metadata**: Automatically generates YAML frontmatter with file targeting, priorities, and framework information
- **File Targeting**: Uses glob patterns to apply instructions to specific file types
- **Priority Management**: Sophisticated priority system prevents instruction conflicts
- **Framework Detection**: Automatically detects Angular 17+, React 18+, Vue 3+, TypeScript 5+ with confidence scoring
- **Content Validation**: Built-in validation for frontmatter correctness

#### 🏗️ Advanced Framework Detection
- **Angular 17+ Features**: Detects control flow syntax, signals, standalone components
- **React 18+ Features**: Identifies Server Components, concurrent features, modern hooks
- **Vue 3+ Features**: Recognizes Composition API, script setup syntax
- **TypeScript 5+ Features**: Detects decorators, strict mode, advanced type features
- **Confidence Scoring**: Provides detection confidence levels for accurate instruction generation

### 📁 Generated File Structure
```
.github/
├── copilot-instructions.md                     # Main instructions (Priority: 10)
└── instructions/
    ├── user-overrides.instructions.md          # Your customizations (Priority: 1000)
    ├── eslint-rules.instructions.md            # ESLint translations (Priority: 30)
    ├── prettier-formatting.instructions.md     # Prettier guidelines (Priority: 20)
    ├── angular.instructions.md                 # Angular-specific (Priority: 100)
    ├── typescript.instructions.md              # TypeScript rules (Priority: 50)
    └── testing.instructions.md                 # Testing guidelines (Priority: 40)
```

### 🧪 Testing & Quality Assurance
- **117+ Test Cases**: Comprehensive unit and integration test coverage
- **Complete Documentation**: API reference, user guide, and examples
- **Performance Optimization**: Generation speed < 30 seconds, framework detection > 90% accuracy
- **Bundle Size**: 678.17 KB (415 files) - optimized for fast loading

### 💡 Key Benefits
- **Universal ESLint Integration**: Any TypeScript project can generate Copilot instructions from existing ESLint rules
- **User Control**: Complete override system ensures teams maintain full control over AI recommendations
- **Professional Documentation**: Enterprise-ready with comprehensive guides and examples
- **Team Collaboration**: Shareable configurations and architectural decision documentation

## [3.1.0] - 2024-07-29

### Added
- **Re-Run Project Tests** command (`aiDebugContext.rerunProjectTests`) with `Ctrl+Shift+R` keyboard shortcut
  - Analyzes current context documents to determine which project to re-run
  - Extracts project information from test output and AI context files
  - Falls back to affected tests when no specific project found
- **Context-Aware Navigation** - Back button intelligently returns to the menu that opened current view
- **Enhanced Keyboard Shortcuts** - Comprehensive keyboard shortcuts for all major functions
- **Command Palette Integration** - "Test Updated Files" moved from main menu to command palette

### Changed
- Context File Browser now shows "Re-Submit Current Context" instead of "Current Context Actions"
- Main menu no longer displays "Test Updated Files" option (moved to command palette)
- Back button navigation is now context-aware across all menus
- Enhanced Nx Cloud URL pattern matching for better results detection

### Improved
- Better TypeScript type safety throughout the codebase
- Enhanced error handling and user feedback
- Improved test coverage with new unit tests for TestMenuOrchestrator
- Updated documentation with current feature set and keyboard shortcuts

### Technical
- Added `rerunProjectTestsFromContext()` method to TestMenuOrchestrator
- Added `extractProjectFromTestOutput()` and `extractProjectFromContext()` helper methods
- Enhanced CommandRegistry with new command registration
- Improved navigation context system for better user experience

## [3.0.1] - 2024-07-28

### Fixed
- Status bar animation and final status display
- TypeScript compilation errors
- Test mocking and async issues

### Changed
- Updated extension name from "AI Debug Context" to "AI Context Utilities"
- Improved Nx Test Results feature implementation

## [3.0.0] - 2024-07-28

### Added
- Complete rewrite with modern TypeScript architecture
- AI-powered context utilities with Copilot integration
- Real-time test monitoring and intelligent execution
- Smart project discovery and caching
- Enhanced user interface with QuickPick menus
- Comprehensive test coverage and documentation

### Changed
- Migrated from shell scripts to native TypeScript implementation
- New service-based architecture with dependency injection
- Enhanced error handling and user-friendly messages
- Modern VSCode extension patterns and best practices

### Removed
- Legacy shell script dependencies
- Outdated configuration formats
- Deprecated command patterns