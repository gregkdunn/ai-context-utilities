# AI Context Util - Copilot Instructions & Intelligent Testing

VSCode extension with Copilot instruction and Test Result context generation for AI analysis.

**Version:** 3.5.1  
**Status:** Somewhat stable. I mean, what is stable these days?
**Architecture:** TypeScript  
**Project Support:** Nx, Angular, React, Vue, TypeScript
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

### 🧪 Test Runner with Copilot Analysis
- **Run Affected Tests** (`Cmd+Shift+T`): Smart test detection with automatic project type detection
- **Git-Based Testing** (`Cmd+Shift+G`): Test only files changed in git across all project types
- **Re-Run Tests** (`Cmd+Shift+R`): Quickly re-run your last test run
- **Non-Nx Support**: Automatically falls back to package.json scripts when Nx unavailable
- **Test Context Generation**: Test results and Git Diff are sent to Copilot for analysis

### 🚀 Developer Workflow Tools
- **Prepare To Push**: Runs tests on recent projects and checks git status before pushing
- **PR Description Generator**: Auto-generates detailed PR descriptions from git changes

---

## 🎯 Available Commands

### Primary Commands

#### Copilot Instructions
**🤖 Add Copilot Instruction Contexts**
- Analyzes your workspace configuration
- Generates GitHub Copilot instruction files
- Creates user override template (if missing)

#### Testing Commands
**🧪 Run Affected Tests** (`Cmd+Shift+T`)
- Smart menu for selecting test execution mode
- Auto-detects changed files and affected projects
- Generates test context for AI debugging
**⚡ Test Updated Files** (`Cmd+Shift+G`) 
- Run tests for git-changed files
**🔄 Re-Run Project Tests** (`Cmd+Shift+R`) 
- Re-run last test suite

### PR Workflow Commands
**🚀 Prepare To Push** 
- Runs lint and prettier checks
- Runs affected tests across all projects
**📝 PR Description** 
- Generate PR description from changes
- Checks for Flippers in code changes
- Checks for Jira ticket number in branch name

**🔧 Setup Commands**
**🍎 Run Setup**
- Initial configuration
**📊 Show Workspace Info**
- Display project language, framework, and config details
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

### VSCode Extension (Recommended)
1. **Install Extension**: Search for "AI Context Util" in VSCode Extensions   
1. Install the beta version located in the 'beta-builds' directory of this repository
   - **Open Command Palette**: Press `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux)
   - **Install from VSIX**: Select "Install from VSIX..." and choose the downloaded `.vsix` file
   More info at [docs/guides/BETA_INSTALLATION_GUIDE.md](docs/guides/BETA_INSTALLATION_GUIDE.md)

2. **Open Project**: Navigate to your workspace with ESLint/Prettier configs
3. **Run Command**: Press `Cmd+Shift+P` → "🤖 Add Copilot Instruction Contexts"


### CLI Alternative (Zsh Scripts)
If you prefer command line tools, check out the [ZSH CLI scripts](zsh/README.md) in the `zsh/` directory:

- **`aiDebug [project]`** - Complete development workflow in one command
- **`prepareToPush [project]`** - Code quality validation before commits
- **`nxTest [project]`** - AI-optimized test reporting
- **`gitDiff`** - Smart git change analysis

**Quick Setup**:
```bash
# Add to ~/.zshrc
source /path/to/ai-context-util/zsh/index.zsh
```

The CLI tools provide the same AI-optimized context generation with additional workflow automation for terminal users.

---


## 🔧 Support & Feedback
- **Issues**: [GitHub Issues](https://github.com/gregkdunn/ai-context-util/issues)


### Debug Information
Enable VS Code Output → "AI Context Utilities" to see detailed configuration discovery logs.

---

