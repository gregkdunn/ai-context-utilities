# AI Context Util - Copilot Instructions & Intelligent Testing

VSCode extension with Copilot instruction and Test Result context generation for AI analysis.

**Version:** 3.5.2  
**Status:** Somewhat Stable
**Test Coverage:** 90%+
**Last Updated:** Aug 6, 2025
**License:** [MIT](https://opensource.org/licenses/MIT)

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

### 🚀 Enhanced Developer Workflow Tools

#### 📝 **Enhanced PR Description Generator (Phase 3.5.2)**
**Revolutionary AI-powered PR description generation with comprehensive context analysis:**

- **🔍 Intelligent Context Analysis**
  - Comprehensive git diff analysis with Angular component detection
  - Automatic feature flag detection (6+ systems: Flipper, LaunchDarkly, config-based)
  - JIRA ticket extraction from branch names and commit messages
  - Breaking change detection and risk assessment
  - Dependency change analysis

- **📋 Smart Template Detection**
  - Automatically detects existing `.github/PULL_REQUEST_TEMPLATE.md`
  - Preserves exact template structure and formatting
  - Supports markdown headers, bold text, and mixed formats
  - Template quality validation with improvement suggestions

- **🤖 AI-Powered Content Generation**
  - **Business-focused summaries** with user impact analysis
  - **Technical change documentation** with architectural context
  - **Actionable QA instructions** with feature flag testing scenarios
  - **Quality validation system** (6 metrics: completeness, specificity, actionability)

- **⚡ Performance & Reliability**
  - Intelligent caching with git state-based invalidation
  - Graceful fallback to legacy system
  - 95%+ template accuracy with context-aware content

- **Prepare To Push**: Runs tests on recent projects and checks git status before pushing

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
**📝 Enhanced PR Description (Phase 3.5.2)** 
- **AI-powered context analysis** of git changes and code patterns
- **Intelligent template detection** with structure preservation
- **Angular component detection** (services, validators, components)
- **Multi-system feature flag detection** (Flipper, LaunchDarkly, config-based)
- **JIRA ticket extraction** from branches and commit messages
- **Quality-validated content** with business focus and actionable QA steps
- **Performance optimized** with intelligent caching

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

## 🏗️ Enhanced Architecture (Phase 3.5.2)

### Multi-Phase PR Description Pipeline

The enhanced PR description system uses a sophisticated 4-phase approach:

1. **Phase 1: Context Analysis**
   - Comprehensive git diff parsing with smart detection
   - Angular component analysis (@Component, @Injectable, @Directive)
   - Feature flag detection across 6+ systems (Flipper, LaunchDarkly, config-based)
   - JIRA ticket extraction from branch names and commit messages
   - Breaking change identification and risk assessment

2. **Phase 2: Template Detection**
   - Automatic detection of `.github/PULL_REQUEST_TEMPLATE.md`
   - Support for multiple formats (markdown headers, bold text, mixed)
   - Template structure validation and quality assessment
   - Custom field extraction (checkboxes, URLs, placeholders)

3. **Phase 3: Content Generation**
   - Section-specific prompt engineering with context injection
   - Business-focused summary generation with user impact analysis
   - Technical change documentation with architectural context
   - Actionable QA instruction generation with feature flag scenarios

4. **Phase 4: Quality Validation & Enhancement**
   - 6-metric quality scoring system (completeness, specificity, actionability)
   - Automatic content enhancement for low-quality sections
   - Template compliance verification
   - Performance optimization with intelligent caching

### Core Services

- **`GitDiffAnalysisService`**: Intelligent diff analysis with Angular pattern recognition
- **`TemplateDetectionService`**: Smart template structure detection and validation
- **`PromptTemplateEngine`**: Context-aware prompt generation with section specialization
- **`ContentGenerationService`**: AI-powered content creation with quality validation
- **`PRDescriptionCacheService`**: Performance optimization with git state-based caching
- **`EnhancedPRDescriptionService`**: Main orchestrator with graceful fallback

### Performance & Reliability

- **Intelligent Caching**: Git state-based cache keys with automatic invalidation
- **Graceful Degradation**: Seamless fallback to legacy system on errors
- **Quality Assurance**: 95%+ template accuracy with comprehensive validation
- **Error Handling**: Robust error recovery with detailed logging

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
- **`nxTest [project]`** - AI Context test reporting
- **`gitDiff`** - Smart git change analysis

**Quick Setup**:
```bash
# Add to ~/.zshrc
source /path/to/ai-context-util/zsh/index.zsh
```

The CLI tools provide the same AI Context context generation with additional workflow automation for terminal users.

---


## 🔧 Support & Feedback
- **Issues**: [GitHub Issues](https://github.com/gregkdunn/ai-context-utilities/issues)


### Debug Information
Enable VS Code Output → "AI Context Utilities" to see detailed configuration discovery logs.

---

