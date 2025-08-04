# AI Context Util - Copilot Instructions & Intelligent Testing

VSCode extension that automatically generates GitHub Copilot instructions from your ESLint/Prettier configs and provides intelligent test running with AI-friendly context generation.

**Version:** 3.5.1  
**Status:** Production Ready  
**Architecture:** TypeScript  
**Project Support:** Nx, Turborepo, Lerna, Standalone, Workspaces  
**Test Coverage:** 90%+

---

## 🚀 Key Features

### 🤖 GitHub Copilot Instructions
- **Automatic Generation**: Creates `.github/instructions/copilot-instructions.md` from your configs
- **ESLint Translation**: Converts ESLint rules into natural language guidance
- **Prettier Integration**: Generates formatting instructions from Prettier settings
- **Framework Detection**: Supports Angular, React, Vue, TypeScript projects
- **User Overrides**: Priority 1000 custom instructions that override everything

### 📁 Organized Structure
```
.github/instructions/
├── copilot-instructions.md           # Main entry point
├── user-overrides.instructions.md    # Your customizations (Priority: 1000)
└── frameworks/                       # Framework-specific files
    ├── eslint-rules.instructions.md      # ESLint rules translated
    ├── prettier-formatting.instructions.md # Prettier formatting rules
    ├── angular.instructions.md           # Angular best practices
    └── typescript.instructions.md       # TypeScript guidelines
```

### 🔍 Smart Configuration Discovery
- **Nx Workspace Support**: Finds configs in workspace root and project-specific locations
- **Multiple Formats**: Supports all ESLint and Prettier config formats
- **Debug Logging**: Shows exactly which paths were checked for configs
- **Fallback Content**: Generates basic guidelines even with minimal configs

### 🧪 Universal Test Runner
- **Run Affected Tests** (`Cmd+Shift+T`): Smart test detection with automatic project type detection
- **Non-Nx Support**: Automatically falls back to package.json scripts when Nx unavailable
- **Workspace-Specific History**: Recent projects isolated per workspace for better organization
- **Git-Based Testing** (`Cmd+Shift+G`): Test only files changed in git across all project types
- **Re-Run Tests** (`Cmd+Shift+R`): Quickly re-run your last test suite with workspace memory
- **Multi-Project Support**: Nx, Turborepo, Lerna, standalone projects, and workspaces
- **Test Context Generation**: Creates AI-friendly context from test results

### 🏗️ Universal Project Support
- **Automatic Detection**: Intelligently detects Nx, Turborepo, Lerna, workspaces, or standalone projects
- **Smart Fallbacks**: Gracefully handles missing tools with appropriate alternatives
- **Clear Communication**: User notifications explain what's happening and why
- **Workspace Isolation**: Recent projects and test history separated by workspace
- **Configuration Templates**: Optimized settings for different project architectures

### 🚀 Developer Workflow Tools
- **Prepare To Push**: Runs tests on recent projects and checks git status before pushing
- **PR Description Generator**: Auto-generates detailed PR descriptions from git changes
- **Workspace Analysis**: Detects frameworks, dependencies, and project structure

---

## 🎯 Available Commands

### Primary Commands
**🤖 Add Copilot Instruction Contexts**
- Analyzes your workspace configuration
- Generates GitHub Copilot instruction files
- Creates user override template (if missing)
- Links all files for easy discovery

**🧪 Run Affected Tests** (`Cmd+Shift+T`)
- Smart menu for selecting test execution mode
- Auto-detects changed files and affected projects
- Generates test context for AI debugging

### Quick Actions
- **⚡ Test Updated Files** (`Cmd+Shift+G`) - Run tests for git-changed files
- **🔄 Re-Run Project Tests** (`Cmd+Shift+R`) - Re-run last test suite
- **🚀 Prepare To Push** - Pre-push validation with tests
- **📝 PR Description** - Generate PR description from changes
- **📊 Show Workspace Info** - Display project structure
- **🍎 Run Setup Wizard** - Initial configuration

---

## 📋 Example Generated Content

### ESLint Rules Translation
```markdown
# TypeScript Development Guidelines

**Configuration Source**: `/workspace/.eslintrc.json`

## Type Safety
- Always use specific types instead of 'any'. When the type is truly unknown, use 'unknown' and add type guards.
- Always handle all Promises with await, .then(), or .catch(). Unhandled promises can cause silent failures.

## Modern JavaScript  
- Always use 'const' for variables that are never reassigned.
- Always use 'let' or 'const' instead of 'var' for block-scoped variable declarations.
```

### Prettier Formatting Rules
```markdown
# Code Formatting Guidelines

**Configuration Source**: `/workspace/.prettierrc`

## Formatting Rules
- Always add semicolons at the end of statements
- Use single quotes for strings instead of double quotes
- Keep lines under 120 characters
- Add trailing commas where valid in ES5 (objects, arrays, etc)
```

### User Overrides Template
```markdown
# User Override Instructions

> **📝 CUSTOMIZATION GUIDE**  
> This file takes precedence over ALL automatically generated instructions.  
> Add your personal coding preferences, project-specific rules, and overrides here.

## Quick Override Examples

### Override Automated Recommendations
```typescript
// ❌ AI might suggest: Use signals for state management
// ✅ My preference: Continue using RxJS observables for complex state
// Reason: Team expertise and existing patterns
```

### Test Context Output
```markdown
## Test Results Summary
- Total Tests: 142
- Passed: 140 ✅
- Failed: 2 ❌
- Duration: 12.5s

## Failed Tests
1. UserService › should validate email format
   - Expected: valid@email.com
   - Received: invalid-email
   
2. AuthGuard › should redirect unauthorized users
   - Navigation timeout after 5000ms
```

---

## 🛠️ Installation & Usage

1. **Install Extension**: Search for "AI Context Util" in VSCode Extensions
2. **Open Project**: Navigate to your workspace with ESLint/Prettier configs
3. **Run Command**: Press `Cmd+Shift+P` → "🤖 Add Copilot Instruction Contexts"
4. **Include in Copilot**: Add `.github/instructions/copilot-instructions.md` to your Copilot context

---

## 🎨 Logo

The extension features a cheerful atomic debug logo with a friendly face and mustache - because debugging should be fun! The logo represents the atomic structure of your code with intelligent, helpful debugging assistance. The orbital rings and colorful electrons symbolize the dynamic nature of code analysis and testing.

---

## 🔧 Support & Configuration

### Supported Config Files
- **ESLint**: `.eslintrc.json`, `.eslintrc.js`, `eslint.config.js` (flat config)
- **Prettier**: `.prettierrc`, `.prettierrc.json`, `prettier.config.js`, `package.json`
- **Frameworks**: Angular, React, Vue, TypeScript detection

### Supported Test Frameworks
- **Jest** - Automatic detection and parallel execution
- **Vitest** - Modern testing with instant feedback
- **Mocha** - Classic testing framework support
- **Nx** - Monorepo testing with affected detection
- **Custom Scripts** - Any npm test script in package.json

### Debug Information
Enable VS Code Output → "AI Context Utilities" to see detailed configuration discovery logs.

---

## 📚 Version History

### 3.5.0 - Current
- GitHub Copilot instruction generation
- ESLint rule translation to natural language
- Prettier configuration parsing
- User override system with priority 1000
- Nx workspace support
- Framework-specific instruction files
- Intelligent test runner with affected detection
- Prepare to Push workflow automation
- PR description generation from git changes
- Multi-project test orchestration

### 3.4.0 - Previous
- Enhanced test context generation
- Feature flag detection
- Improved error analysis

---

**Transform your development workflow with intelligent GitHub Copilot instructions and smart test automation!** 🚀