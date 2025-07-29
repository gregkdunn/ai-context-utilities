# Changelog

All notable changes to the AI Context Utilities extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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