# AI Debug Context - V3 VSCode Extension UI Flow Documentation

## Overview

This document provides a comprehensive flow documentation of the AI Debug Context VSCode extension's user interface, including all menus, buttons, popups, and their interactions. This serves as both a reference guide and a prompt for future UI updates.

## Application Architecture

The V3 extension consists of two main UI components:
1. **VSCode Extension UI** - Native VSCode interfaces (status bar, command palette, quick picks, notifications)
2. **Legacy Webview Panel** - Angular-based terminal UI (Phase 2 - currently in legacy folder)

This document focuses on the **VSCode Extension UI** which is the primary interface for V3.

## Core UI Components

### 1. Status Bar Integration

**Location:** Bottom-left of VSCode window
**Service:** `ServiceContainer` manages status bar item

#### Status Bar States
- **Ready:** Default clickable state
- **Processing:** Shows current operation with yellow color
- **Success:** Green checkmark with completion info
- **Error:** Red X with error indication

#### Status Bar Interactions
- **Click Action:** Triggers `aiDebugContext.runAffectedTests` command
- **Tooltip:** "Click to run auto-detect tests"
- **Dynamic Updates:** Real-time status changes during operations

## Command Palette Integration

**Access:** `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (Mac)
**Category:** All commands appear under "AI Debug" category

### Available Commands

#### Primary Commands
1. **⚡ Run My Changed Tests**
   - **Command ID:** `aiDebugContext.runAffectedTests`
   - **Keyboard Shortcut:** `Ctrl+Shift+T` / `Cmd+Shift+T`
   - **Condition:** `editorTextFocus`
   - **Action:** Opens main selection menu
   - **Orchestrator Method:** `showMainMenu()`

2. **👀 Toggle Test Watcher**
   - **Command ID:** `aiDebugContext.startFileWatcher`
   - **Keyboard Shortcut:** `Ctrl+Shift+W` / `Cmd+Shift+W`
   - **Action:** Starts/stops file watching
   - **Orchestrator Method:** `toggleFileWatcher()`

3. **🗑️ Clear Test Cache**
   - **Command ID:** `aiDebugContext.clearTestCache`
   - **Keyboard Shortcut:** `Ctrl+Shift+C` / `Cmd+Shift+C`
   - **Action:** Clears project cache
   - **Orchestrator Method:** `clearTestCache()`

#### Secondary Commands
4. **🍎 Run Setup**
   - **Command ID:** `aiDebugContext.runSetup`
   - **Action:** Launches setup wizard
   - **Orchestrator Method:** `runSetup()`

5. **🎯 Test Specific Project**
   - **Command ID:** `aiDebugContext.selectProject`
   - **Action:** Opens project browser
   - **Orchestrator Method:** `showProjectBrowser()`

6. **📊 Show Workspace Info**
   - **Command ID:** `aiDebugContext.showWorkspaceInfo`
   - **Action:** Displays workspace information
   - **Orchestrator Method:** `showWorkspaceInfo()`

#### Quick Commands
7. **⚡ Run Tests (Skip Analysis)**
   - **Command ID:** `aiDebugContext.runAffectedTestsQuick`
   - **Action:** Fast test execution without detailed analysis
   - **Orchestrator Method:** `runGitAffected()`

8. **🚀 Auto-Detect Projects**
   - **Command ID:** `aiDebugContext.runGitAffected`
   - **Keyboard Shortcut:** `Ctrl+Shift+G` / `Cmd+Shift+G`
   - **Condition:** `!terminalFocus`
   - **Action:** Git-based project detection
   - **Orchestrator Method:** `runGitAffected()`

9. **🎯 Type Project Name**
   - **Command ID:** `aiDebugContext.runManualProject`
   - **Keyboard Shortcut:** `Ctrl+Shift+M` / `Cmd+Shift+M`
   - **Action:** Manual project name input
   - **Orchestrator Method:** `showMainMenu()`

10. **📝 Create Configuration File**
    - **Command ID:** `aiDebugContext.createConfig`
    - **Action:** Creates AI debug configuration
    - **Orchestrator Method:** `createConfig()`

## Main Workflow Flow

### Entry Points
Users can start workflows through:
1. **Status Bar Click** → Main Menu
2. **Command Palette** → Direct command execution
3. **Keyboard Shortcuts** → Direct command execution

### Main Selection Menu Flow

**Trigger:** `aiDebugContext.runAffectedTests` or status bar click
**Service:** `ProjectSelectionService.showMainSelectionMenu()`
**UI Component:** VSCode QuickPick with custom input

#### Menu Structure
```
🧪 AI Debug Context - Test Runner
Type project name or select an option below

Recent Projects:
├─ 📁 [project-name] (last used: timestamp)
├─ 📁 [project-name] (last used: timestamp)

Quick Actions:
├─ 🚀 Auto-Detect Changed Projects
├─ 🔍 Browse All Projects  
├─ 🎯 Run Git-Affected Tests
└─ 📋 View Post-Test Context (if available)
```

#### Menu Interactions
- **Type Project Name:** Custom input → `{ type: 'project', project: 'typed-name' }`
- **Select Recent Project:** Click item → `{ type: 'project', project: 'selected-name' }`
- **Auto-Detect:** → `{ type: 'auto-detect' }`
- **Browse Projects:** → `{ type: 'project', project: 'SHOW_BROWSER' }`
- **Git-Affected:** → `{ type: 'git-affected' }`
- **Post-Test Context:** → `{ type: 'post-test-context' }`
- **Escape/Cancel:** → `{ type: 'cancelled' }`

### Project Browser Flow

**Trigger:** "Browse All Projects" selection or `aiDebugContext.selectProject`
**Service:** `ProjectSelectionService.showProjectBrowser()`
**UI Component:** VSCode QuickPick with categorized projects

#### Browser Structure
```
📁 Select a Project to Test

Applications:
├─ 🎯 app-name-1 (12 tests)
├─ 🎯 app-name-2 (8 tests)

Libraries:
├─ 📚 lib-name-1 (45 tests)
├─ 📚 lib-name-2 (23 tests)

Recently Modified:
├─ ⚡ recent-project-1
└─ ⚡ recent-project-2
```

#### Browser Interactions
- **Select Project:** Click item → Returns project name
- **Search/Filter:** Type to filter projects
- **Escape/Cancel:** → `undefined` (cancellation)

## Notification Patterns

### Success Notifications
**Service:** `UIService.showInfo()` / `vscode.window.showInformationMessage()`
- **Test Completion:** "✅ [project] passed (duration)"
- **Cache Clear:** "🗑️ Test cache cleared"
- **Setup Complete:** "🍎 Setup completed successfully"

### Warning Notifications  
**Service:** `UIService.showWarning()` / `vscode.window.showWarningMessage()`
- **No Tests Found:** "⚠️ No tests found for [project]"
- **File Watcher Issues:** "👀 File watcher encountered issues"

### Error Notifications
**Service:** `UIService.showError()` / `vscode.window.showErrorMessage()`
- **Test Failures:** "❌ [project] failed (duration)"
- **Setup Errors:** "❌ Setup failed: [error-message]"
- **Permission Errors:** "❌ Permission denied: [details]"

### Progress Notifications
**Service:** `UIService.showProgress()` / `vscode.window.withProgress()`
- **Test Execution:** "🧪 Running tests for [project]..."
- **Project Discovery:** "🔍 Discovering projects..."
- **Cache Building:** "📦 Building project cache..."

## Error Handling Patterns

### Error Display Strategy
1. **User-Friendly Message:** Short, actionable error via notification
2. **Technical Details:** Full error in Output Channel
3. **Status Bar Update:** Error state with red color
4. **Recovery Suggestions:** Contextual help when possible

### Error Flow
```
Error Occurs
    ↓
ErrorHandler.handleError()
    ↓
UserFriendlyErrorHandler.showUserError()
    ↓
├─ Notification (user-friendly)
├─ Output Channel (technical)
└─ Status Bar (error state)
```

## State Management

### Extension State
- **File Watcher Status:** Boolean flag in ServiceContainer
- **Recent Projects:** Stored in VSCode configuration
- **Project Cache:** Managed by ProjectCache service
- **Current Operation:** Tracked via status bar updates

### Configuration Storage
**Location:** VSCode settings (`settings.json`)
```json
{
  "aiDebugContext.projectCache": {},
  "aiDebugContext.recentProjects": [...],
  "aiDebugContext.maxCacheAge": 30,
  "aiDebugContext.enableFileWatcher": true,
  "aiDebugContext.enableVerboseLogging": false
}
```

## Service Integration Flow

### Service Dependencies
```
CommandRegistry
    ↓
TestMenuOrchestrator
    ↓
├─ ProjectSelectionService
├─ TestExecutionService  
├─ UIService
└─ ServiceContainer
    ↓
├─ StatusBar Management
├─ Output Channel
├─ Error Handling
└─ Configuration
```

### Workflow Orchestration
1. **Command Triggered** → CommandRegistry
2. **Route to Orchestrator** → TestMenuOrchestrator
3. **Show UI** → ProjectSelectionService / UIService
4. **Execute Action** → TestExecutionService
5. **Update Status** → ServiceContainer
6. **Handle Errors** → ErrorHandler

## Real-Time Feedback

### Status Bar Updates
- **Operation Start:** Yellow with operation name
- **Progress Updates:** Percentage or stage indication
- **Completion:** Green with success info or red with error

### Output Channel
- **Location:** "AI Debug Context" output channel
- **Content:** Detailed logs, command outputs, error traces
- **Access:** View → Output → Select "AI Debug Context"

### Progress Indicators
- **Test Execution:** VSCode progress notification with cancellation
- **Project Discovery:** Progress bar in notification area
- **File Operations:** Background progress with status updates

## Keyboard Shortcuts Summary

| Shortcut | Command | Action |
|----------|---------|---------|
| `Ctrl+Shift+T` | Run My Changed Tests | Main selection menu |
| `Ctrl+Shift+W` | Toggle Test Watcher | Start/stop file watching |
| `Ctrl+Shift+C` | Clear Test Cache | Clear project cache |
| `Ctrl+Shift+G` | Auto-Detect Projects | Git-based detection |
| `Ctrl+Shift+M` | Type Project Name | Manual project input |

*Mac users: Replace `Ctrl` with `Cmd`*

## Future Enhancement Areas

### Planned UI Improvements
1. **Webview Integration:** Legacy Angular webview integration for advanced workflows
2. **Tree View:** Project explorer in sidebar
3. **Test Results Panel:** Dedicated test results view
4. **Context Actions:** Right-click menu integrations

### Configuration UI
1. **Settings Page:** Dedicated extension settings interface
2. **Wizard Integration:** Step-by-step setup guidance
3. **Performance Dashboard:** Visual performance metrics

## Development Notes

### Adding New Commands
1. **Define Command:** Add to `package.json` contributes.commands
2. **Register Handler:** Add to `CommandRegistry.registerAll()`
3. **Implement Logic:** Add method to `TestMenuOrchestrator`
4. **Add Shortcuts:** Define in `package.json` contributes.keybindings
5. **Update Documentation:** Add to this flow document

### UI Service Integration
- **Consistent Styling:** Use `UIService` for all VSCode UI interactions
- **Error Handling:** Route through `ErrorHandler` with user-friendly messages
- **Progress Feedback:** Use `UIService.showProgress()` for long operations
- **Status Updates:** Update via `ServiceContainer.updateStatusBar()`

### Testing UI Components
- **Unit Tests:** Mock VSCode APIs for service testing
- **E2E Tests:** Use VSCode extension test framework
- **User Workflow Tests:** Simulate complete user interactions

---

*This document should be updated whenever UI flows, commands, or interactions change. Use this as a reference for understanding the complete extension UI and as a prompt for AI-assisted development.*