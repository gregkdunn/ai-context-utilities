# AI Debug Context - Consolidated Project Knowledge

## Project Overview

**Project Name**: AI Debug Context VSCode Extension  
**Purpose**: AI-powered debugging and code quality tools for Angular NX monorepos  
**Goal**: Make AI-assisted debugging seamless and efficient for Angular NX developers by providing the right context in the right format at the right time.

## Architecture

### Repository Structure
```
ai_debug_context/
├── docs/                          # Documentation and specifications
├── zsh/                           # Shell function implementation (v1)
├── vscode/                        # VSCode extension v1 (deprecated)
├── vscode_2/                      # VSCode extension v2 (current)
└── .github/instructions/          # Best practices and guidelines
```

### Core Technologies
- **Backend**: TypeScript, VSCode Extension API
- **Frontend**: Angular + Tailwind CSS (webview UI)
- **Testing**: Jest
- **AI Integration**: GitHub Copilot API
- **Version Control**: Git integration
- **Build System**: NX Workspace support

## Core Features & Modules

### 1. DIFF Module (File Selection)
**Purpose**: Smart git change analysis and file selection

**Capabilities**:
- Auto-detects best diff strategy (unstaged → staged → last commit)
- File selection modes:
  - Current uncommitted changes
  - Previous git commits
  - Git diff from current branch to main branch
- Change categorization by file type and impact
- AI-friendly formatting with change summaries
- Highlights test-related files and potential breaking changes

**Output**: `diff.txt` with AI-optimized git changes analysis

### 2. TEST Module (formerly nxTest)
**Purpose**: AI-optimized test runner for NX projects

**Capabilities**:
- Project selection or NX affected testing
- Jest test execution with enhanced output formatting
- Filters out noise and focuses on key information
- Highlights TypeScript errors and test failures
- Provides performance insights for slow tests
- Structured for AI analysis

**Output**: `jest-output.txt` with AI-optimized test results

### 3. AI TEST DEBUG Module (Main Workflow)
**Purpose**: Complete development workflow with AI analysis

**Test Failures Workflow**:
1. Root cause analysis of failing tests
2. Concrete fixes with exact code changes
3. Fix existing failing tests first
4. Implementation guidance
5. New test suggestions (after fixes)

**Tests Passing Workflow**:
1. Code quality analysis
2. Mock data validation (critical - check for false positives)
3. Test coverage analysis for new functionality
4. Enhancement recommendations
5. Robustness improvements

**Output**: `ai-debug-context.txt` with complete debugging context

### 4. PR DESC Module
**Purpose**: Generate GitHub PR descriptions with AI

**Features**:
- Template-based PR generation
- Jira ticket integration and validation
- Feature flag detection from diff output
- AI-powered description generation
- Copilot integration for comprehensive descriptions

**Template Format**:
```markdown
**Problem**
What is the problem you're solving or feature you're implementing?
[Jira Link if applicable]

**Solution**
Describe the feature or bug fix -- what's changing?

**Details**
Include a brief overview of the technical process.

**QA**
Provide technical details needed to test this change.
```

**Output**: `pr-description-prompt.txt` with GitHub PR description prompts

## Technical Requirements

### VSCode Extension Requirements
- **VSCode**: 1.85.0+
- **Node.js**: v18+
- **Angular**: Latest standalone components
- **Tailwind CSS**: For UI styling
- **TypeScript**: Strict type checking

### Angular NX Monorepo Requirements
- Jest testing framework
- Yarn package manager
- Git version control
- Standard NX commands support:
  - `yarn nx test [project]`
  - `yarn nx lint [project]`
  - `yarn nx prettier [project] --write`

## Implementation Guidelines

### Angular Best Practices
- Use standalone components (no NgModules)
- Don't use explicit `standalone: true` (implied by default)
- Use signals for state management
- Implement `input()` and `output()` functions instead of decorators
- Use `computed()` for derived state
- Set `changeDetection: ChangeDetectionStrategy.OnPush`
- Use native control flow (`@if`, `@for`, `@switch`)
- Use `inject()` function instead of constructor injection

### TypeScript Best Practices
- Use strict type checking
- Prefer type inference when obvious
- Avoid `any` type; use `unknown` when uncertain
- Readability over cleverness

### Testing Strategy
- Use Jest for unit tests
- Avoid TestBed unless Signal Inputs/Outputs
- Don't directly call private methods in tests
- Follow project ESLint rules
- Write tests for all new functionality
- Focus on changed code based on git diff

## User Interface Design

### Activity Panel Integration
- Icon in VSCode Activity Bar
- Side panel UI with tabbed interface
- Real-time command execution with progress indicators
- Project auto-detection and selection
- File management with click-to-open functionality

### Workflow UI Components
1. **File Selection Component**
   - Mode selection (uncommitted/commit/branch-diff)
   - File tree with checkboxes
   - Change statistics and preview

2. **Test Selection Component**
   - Project dropdown selection
   - Affected tests vs specific project
   - Test file filtering and selection

3. **AI Analysis Component**
   - Progress indicators
   - Real-time output streaming
   - Results tabbed interface

4. **PR Generation Component**
   - Template selection
   - Jira ticket input
   - Feature flag detection display
   - Generated description preview

## AI Integration Patterns

### GitHub Copilot Integration
- Use VSCode Language Model Chat API
- Structured prompts for different scenarios
- Context-aware analysis requests
- Streaming responses for real-time feedback

### Prompt Templates
- **Test Failure Analysis**: Root cause + specific fixes
- **Test Success Analysis**: Mock validation + new test suggestions
- **PR Description**: Template-based with context injection
- **Code Quality**: Improvement recommendations

## File Output Specifications

All modules generate files in configured output directory (default: `.github/instructions/ai_utilities_context/`):

- **`ai-debug-context.txt`**: Complete debugging context for AI analysis
- **`jest-output.txt`**: AI-optimized test results
- **`diff.txt`**: Git changes with intelligent analysis  
- **`pr-description-prompt.txt`**: GitHub PR description generation prompts

## Configuration Options

```json
{
  "aiDebugUtilities.outputDirectory": ".github/instructions/ai_utilities_context",
  "aiDebugUtilities.autoDetectProject": true,
  "aiDebugUtilities.showNotifications": true,
  "aiDebugUtilities.terminalIntegration": true,
  "aiDebugUtilities.copilotIntegration": true
}
```

## Development Phases

### Phase 1: Foundation ✅
- Extension boilerplate and manifest
- Angular + Tailwind UI setup
- Basic VSCode integration

### Phase 2: Core Modules (Current)
- DIFF module implementation
- TEST module implementation
- AI TEST DEBUG workflow
- PR DESC generation

### Phase 3: Advanced Features (Planned)
- Enhanced Copilot integration
- Advanced UI components
- Configuration management
- Performance optimization

## Quality Assurance

### Testing Requirements
- Unit tests for all modules
- Extension integration tests
- UI component tests
- E2E workflow tests

### Code Quality
- ESLint compliance
- TypeScript strict mode
- Comprehensive error handling
- Logging and debugging support

### Performance Targets
- Fast file change detection
- Efficient git operations
- Optimized bundle size
- Responsive UI interactions

## Security Considerations
- Proper Content Security Policy for webviews
- Input sanitization for all user data
- Secure AI prompt construction
- No sensitive information exposure
- Safe communication between extension and webview

This consolidated document serves as the single source of truth for the AI Debug Context VSCode Extension project, encompassing all technical requirements, implementation guidelines, and architectural decisions.
