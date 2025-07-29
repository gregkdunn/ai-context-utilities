# AI Context Utilities - Menus and Popups Documentation

This document provides a comprehensive overview of all user interface elements, menus, and popups in the AI Context Util VSCode extension.

## Table of Contents
1. [Command Palette Commands](#command-palette-commands)
2. [Status Bar Interface](#status-bar-interface)
3. [Main Test Menu](#main-test-menu)
4. [Project Selection Menu](#project-selection-menu)
5. [Post-Test Action Menus](#post-test-action-menus)
6. [Context File Browser](#context-file-browser)
7. [Information/Warning/Error Messages](#informationwarningerror-messages)
8. [Copilot Integration Messages](#copilot-integration-messages)

---

## Command Palette Commands

These commands are available via `Ctrl+Shift+P` (Cmd+Shift+P on Mac):

### Primary Commands
- **`AI Context Util: 🍎 Run Setup Wizard`** (`aiDebugContext.runSetup`)
  - Opens setup wizard for new users
  - Icon: `$(settings-gear)`

- **`AI Context Util: 📊 Show Workspace Info`** (`aiDebugContext.showWorkspaceInfo`)
  - Displays workspace information including projects found, frameworks detected, file watcher status
  - Icon: `$(info)`

- **`AI Context Util: 🤖 Add Copilot Instruction Contexts`** (`aiDebugContext.runCopilotInstructionContexts`)
  - Selects framework and language instruction files for Copilot to follow
  - Based on Context7 llms project files to add context to Copilot and Angular llms doc files to add context to Copilot
  - Adds copilot instruction files to the workspace and copies framework/library/language specific files for the framework/library/language used in the repo and links to them in the main copilot instruction file
  - Icon: `$(copilot)`

- **`AI Context Util: ⚡ Test Updated Files`** (`aiDebugContext.runGitAffected`)
  - Test only updated files based on git changes
  - Fast targeted testing approach
  - Icon: `$(git-pull-request)`

- **`AI Context Util: 🔄 Re-Run Project Tests`** (`aiDebugContext.rerunProjectTests`)
  - Re-run tests for the project from current context documents
  - Analyzes context files to determine which project to test
  - Keyboard shortcut: `Ctrl+Shift+R` (Windows/Linux), `Cmd+Shift+R` (Mac)
  - Icon: `$(refresh)`

### Additional Available Commands
- `aiDebugContext.runAffectedTests` - Launches main test menu
- `aiDebugContext.startFileWatcher` - Toggle file watcher
- `aiDebugContext.clearTestCache` - Clear test result cache
- `aiDebugContext.selectProject` - Project selection interface
- `aiDebugContext.createConfig` - Create configuration file
- `aiDebugContext.openContextBrowser` - Internal command for context navigation

---

## Keyboard Shortcuts

The extension provides the following keyboard shortcuts for quick access:

### Primary Commands
- **`Ctrl+Shift+T` / `Cmd+Shift+T`** - Run Affected Tests (main menu)
- **`Ctrl+Shift+R` / `Cmd+Shift+R`** - Re-Run Project Tests (from context)
- **`Ctrl+Shift+G` / `Cmd+Shift+G`** - Test Updated Files (git affected) 
- **`Ctrl+Shift+W` / `Cmd+Shift+W`** - Toggle File Watcher
- **`Ctrl+Shift+C` / `Cmd+Shift+C`** - Clear Test Cache

### Context Requirements
- Most shortcuts require editor focus (`when: editorTextFocus`)
- Some shortcuts avoid conflicts with terminal (`when: !terminalFocus`)

---

## Status Bar Interface

### Status Bar Item
**Location:** Left side of VSCode status bar  
**Text:** `⚡ AI Context Util: [status]`  
**Behavior:** Clickable - triggers main test menu (`aiDebugContext.runAffectedTests`)

### Status Messages
- **Ready**: `⚡ AI Context Util: Ready`
- **Testing**: `[spinner] AI Context Util: Testing [project]...` (animated)
- **Success**: `⚡ AI Context Util: ✅ [project] passed ([time]s)` (green)
- **Failure**: `⚡ AI Context Util: ❌ [project] failed ([time]s)` (red)
- **Setup Needed**: `⚡ AI Context Util: Setup needed` (yellow)
- **Loading**: `⚡ AI Context Util: Loading workspace info...` (yellow)
- **Error States**: `⚡ AI Context Util: ❌ Error` (red)

### Tooltip Information
Shows performance and queue status:
```
AI Context Util: [status] (Click to run auto-detect tests)

⚡ Performance: [summary]
📋 Queue: [count] pending, [running/idle]
```

### Animation System
- Status bar uses spinning animation frames during test execution
- 10 different spinner characters: `['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']`
- Cycles every 100ms for smooth animation
- Yellow color during active testing, green/red for final status

---

## Main Test Menu

**Trigger:** Command palette (`aiDebugContext.runAffectedTests`) or status bar click  
**Title:** `🧪 AI Context Util - Test Runner`  
**Placeholder:** `Type project name or select an option below`  
**Type:** QuickPick with typing support

### Menu Options

#### Recent Projects Section (if available)
- **`$(play-circle) Run Recent: [ProjectName]`**
  - **Detail:** `Last tested: [timestamp] $(check)`
  - **Description:** `$(star-full) Most Recent`

#### Main Actions Section
- **`$(zap) Test Affected Projects`**
  - **Detail:** `Test all files in affected projects ⭐ RECOMMENDED`
  - **Description:** `$(star-full) Default`

- **`$(folder-library) Select Project`**
  - **Detail:** `Select a specific project to test`
  - **Description:** `$(list-tree) Browse`


#### Context Section (if context files exist)
- **`📖 Current Context`**
  - **Detail:** `View generated AI context files`
  - **Description:** `Browse files`

### Menu Behavior
- Supports typing project names directly
- Uses separators between sections
- Auto-detects available context files
- Shows recent projects if any exist

---

## Project Selection Menu

**Trigger:** "Select Project" option from main menu  
**Title:** `Select Project to Test`  
**Placeholder:** `Select a project to test`  
**Type:** Standard QuickPick with search support

### Menu Options
- **`← Back`**
  - **Detail:** (empty)
  - **Description:** (empty)
  - **Action:** Returns to main test menu

### Project Sections
1. **Recent Projects** (if available)
   - `📌 Recent Projects` (separator)
   - Shows up to 3 most recently used projects

2. **Applications** (if any exist)
   - `📱 Applications` (separator)
   - Sorted alphabetically

3. **Libraries** (if any exist)
   - `📚 Libraries` (separator)  
   - Sorted alphabetically

4. **Other Projects** (if any exist)
   - `📦 Other Projects` (separator)
   - Sorted alphabetically

### Project Items Format
- **Label:** `[icon] [ProjectName]`
- **Detail:** `[relativePath] • [type] • [fileCount] files`
- **Description:** `[projectName]` (for selection)

### Icons by Project Type
- `📱` - Applications
- `📚` - Libraries  
- `📦` - Other/Generic projects
- Additional framework-specific icons may be used

---

## Context File Browser Menu

**Trigger:** "Current Context" option from main menu  
**Title:** `📖 Current Context Files`  
**Placeholder:** `Select a context file to view`  
**Type:** QuickPick

### Menu Options

#### Navigation
- **`$(arrow-left) Back`**
  - **Detail:** (empty)
  - **Description:** (empty)
  - **Action:** Returns to main test menu

#### Actions
- **`Re-Submit Current Context`**
  - **Detail:** `Apply your context files`
  - **Description:** `✅❌`
  - **Action:** Analyzes context and shows appropriate test result menu

#### Context Files Section
Files are dynamically discovered and displayed with:
- **Icons:** Based on file type
  - `$(file-text)` - General text files
  - `$(git-compare)` - Diff files
  - `$(beaker)` - Test output files
  - `$(note)` - AI context files
- **Label:** `[icon] [filename]`
- **Detail:** `[size] KB • Modified: [date]`
- **Description:** File purpose
  - `Git changes` - for diff files
  - `Test output` - for test files
  - `AI context` - for context files
  - `Test summary` - for summary files
  - `Failure analysis` - for failure files
  - `Context file` - for other files

### File Actions
- Clicking a file opens it in VSCode editor
- Files are sorted by name
- Empty files are excluded from display
- Hidden files (starting with `.`) are excluded

---

## Post-Test Action Menus


### Test Success Menu

**Trigger:** When tests pass successfully  
**Title:** `✅ [project] tests passed!`  
**Placeholder:** `What would you like to do next?`  
**Type:** QuickPick  

**Automatic Actions:**
1. Automatically triggers Copilot analysis for successful tests
2. Compiles context focused on missing test cases and PR description
3. Shows follow-up options immediately

#### Menu Options
- **`$(arrow-left) Back`**
  - **Detail:** (empty)
  - **Description:** (empty)
  - **Action:** Returns to main test menu

- **`$(rocket) Prepare to Push`**
  - **Detail:** `Run prepare-to-push workflow (lint & format)`
  - **Description:** `Lint & Format`
  - **Action:** Runs lint and format commands automatically

- **`$(git-pull-request) PR Description`**
  - **Detail:** `Generate PR description via Copilot`
  - **Description:** `Generate PR`
  - **Action:** Compiles context and generates PR description via Copilot

---

### Test Failure Menu

**Trigger:** When tests fail  
**Title:** `❌ [project] tests failed ([count] failures)`  
**Placeholder:** `What would you like to do next?`  
**Type:** QuickPick

**Automatic Actions:**
1. Automatically triggers Copilot debug analysis
2. Compiles context focused on failed test resolution
3. Shows follow-up options immediately

#### Menu Options
- **`$(arrow-left) Back`**
  - **Detail:** (empty)
  - **Description:** (empty)
  - **Action:** Returns to main test menu

- **`$(refresh) Re-Test Project`**
  - **Detail:** `Test run with last configuration`
  - **Description:** `Rerun project tests`
  - **Action:** Re-runs all tests for the project

- **`$(link-external) Nx Test Results`** (conditional)
  - **Detail:** `Opens browser link to Nx Cloud results from test run`
  - **Description:** `Nx Cloud`
  - **Action:** Opens Nx Cloud URL in browser
  - **Visibility:** Only shown if Nx Cloud URL is available from test run

---

## Information/Warning/Error Messages

### Success Messages
- **Test Completion:**
  - `✅ Code is ready to push! Linting and formatting completed.`
  - `✅ Code linted successfully! Ready to push.`
  - `✅ Code formatted successfully! Ready to push.`

- **Cache Operations:**
  - `Test cache cleared successfully`

- **File Operations:**
  - `📖 Context opened` (green status)

### Warning Messages
- **Missing Content:**
  - `No current context files found.`
  - `No current context files available.`
  - `⚠️ No lint/format commands found. Please check manually before pushing.`

- **Network Issues:**
  - `Network issue detected. Please check your internet connection.`

### Error Messages
- **Activation Errors:**
  - `AI Context Util requires an open workspace folder`
  - `Failed to activate AI Context Util: [error]`

- **Operation Failures:**
  - `Failed to start Copilot debug session`
  - `Failed to generate test recommendations`
  - `Failed to generate PR description`
  - `Failed to run prepare to push workflow`

- **Test Execution Errors:**
  - `❌ [project] test execution failed: [reason]`

### Message Types
- **Modal Dialogs:** Never used - all messages are non-modal
- **Status Messages:** Shown via `vscode.window.showInformationMessage` (non-modal)
- **Error Messages:** Shown via `vscode.window.showErrorMessage`
- **Warning Messages:** Shown via `vscode.window.showWarningMessage`

---

## Copilot Integration Messages

### Automatic Integration Success
- **`🚀 Test analysis sent to Copilot Chat!`** (non-modal)
  - Shown when automatic paste and submit succeeds
  - For both success and failure scenarios

### Manual Fallback Messages
- **`📋 Copilot Chat ready. Content in clipboard - paste (Ctrl+V/Cmd+V) and press Enter.`** (non-modal)
  - When auto-submit fails but paste succeeds

- **`✅ Content pasted! Press Enter to submit to Copilot Chat.`** (non-modal)
  - When paste succeeds but auto-submit fails

### Integration Process
1. **Context Compilation:** Uses `ContextCompiler` to create formatted AI context
2. **Clipboard Copy:** Always copies content to clipboard first
3. **Copilot Chat Opening:** Attempts to open and focus Copilot Chat
4. **Automatic Paste:** Tries multiple paste commands
5. **Automatic Submit:** Attempts multiple submit methods
6. **Fallback Notifications:** Shows appropriate message based on success level

### Context Types
- **Test Failures:** Focuses on failed test resolution and debugging
- **Test Success:** Focuses on missing test coverage and PR description generation
- **PR Description:** Filtered context excluding AI analysis sections

---

## User Flow Diagrams

### Main Test Flow
```
Status Bar Click → Main Menu → [Project Selection OR Auto-Detect] → Test Execution → Post-Test Menu
                      ↓
                  Current Context → Context Browser → Test Result Actions
```

### Copilot Integration Flow
```
Test Completion → Auto Context Compilation → Copilot Chat Opening → Auto Paste → Auto Submit → Success Notification
                                                ↓
                                          [If fails] Manual Fallback Message
```

### Context Processing Flow
```
Test Success → Debug Context (missing coverage focus) → PR/Test Recommendation Context → Copilot Chat
Test Failure → Debug Context (failure resolution focus) → Error Analysis Context → Copilot Chat
```

### Navigation Flow
```
All Menus → Back Button → Returns to Previous Menu (context-aware navigation)
   Main Menu (default) ← Project Browser Menu ← Context Browser Menu
```

### Back Button Navigation System
The Back button now intelligently returns to the previously viewed menu:
- From test result menus: Returns to the menu that triggered the test
- From project browser: Returns to main menu
- From context browser: Returns to main menu  
- From test success/failure menus after context actions: Returns to context browser

---

## Technical Implementation Details

### Popup Prevention System
- Uses `currentPopupPromise` to prevent multiple overlapping popups
- Implements `lastPopupTime` with 1-second cooldown between popups
- `shouldShowPopup()` method controls popup timing

### Menu Architecture
- **Main Menu:** `ProjectSelectionService.showMainSelectionMenu()`
- **Project Browser:** `ProjectSelectionService.showProjectBrowser()`
- **Context Browser:** `TestMenuOrchestrator.openPostTestContext()`
- **Success Menu:** `TestActions.showTestSuccessMenu()`
- **Failure Menu:** `TestActions.showTestFailureMenu()`

### Navigation System
- All "Back" buttons execute `aiDebugContext.runAffectedTests` command
- Command routes to `TestMenuOrchestrator.showMainMenu()`
- Consistent navigation pattern across all menus

### QuickPick Configuration
- `ignoreFocusOut: true` - Prevents accidental dismissal
- Proper disposal handling with `onDidHide` events
- Support for separators and icons using VSCode icon library

### Accessibility Features
- All menus support keyboard navigation
- Items include detailed descriptions and context
- Icons use standard VSCode icon library (`$(icon-name)`)
- Focus management respects VSCode accessibility settings
- No modal dialogs used to maintain accessibility

---

## Extension Information

**Extension Name:** AI Context Util  
**Version:** 3.1.0  
**Publisher:** ai-context-util  
**Display Name:** AI Context Util  

**Categories:**
- Testing
- Other

**Main Features:**
- Auto-detect changed tests and smart project discovery
- Real-time test watching and monitoring
- AI-powered context utilities with Copilot integration
- Intelligent test result analysis and recommendations

---

*This documentation covers all user-facing interface elements as of Version 3.1.0. For technical implementation details, refer to the source code in the respective service files.*

## Version 3.1.0 Changes

### New Features
- **Command Palette Integration:** "Test Updated Files" moved from main menu to command palette for better accessibility
- **Enhanced Navigation:** Context-aware Back button navigation - returns to the menu that opened the current menu
- **Improved Context Menu:** "Re-Submit Current Context" option for clearer action labeling
- **Enhanced Nx Cloud Integration:** Improved URL pattern matching for better Nx Cloud results detection
- **Context-Based Re-Run:** "Re-Run Project Tests" command with `Ctrl+Shift+R` shortcut that analyzes context files to re-run the appropriate project tests

### Code Quality Improvements
- **Utility Classes:** New utility classes for consistent UI patterns:
  - `QuickPickUtils` - Centralized QuickPick creation and management
  - `CopilotUtils` - Comprehensive Copilot Chat integration with fallbacks
  - `MessageUtils` - Consistent non-modal message patterns
- **DRY Principle:** Eliminated ~150+ lines of duplicate code across 8 files
- **Maintainability:** Single source of truth for common UI patterns

### Menu Changes
- Main menu no longer shows "Test Updated Files" option (moved to command palette)
- Context File Browser shows "Re-Submit Current Context" instead of "Current Context Actions"
- Back button navigation is now context-aware across all menus
- All QuickPick menus now use standardized creation and behavior

### Technical Improvements
- Enhanced error handling and user feedback
- Improved test coverage with comprehensive utility class tests
- Better TypeScript type safety throughout the codebase
- Centralized Copilot integration with 6 fallback methods for reliability
- Consistent non-modal message patterns across all user interactions