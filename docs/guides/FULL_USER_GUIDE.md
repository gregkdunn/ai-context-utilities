# Full User Guide - AI Context Utilities v3.5.1

**Last Updated**: August 4, 2025  
**Version**: 3.5.1  
**Audience**: All users from beginners to advanced

---

## 📚 Table of Contents

1. [Overview & Philosophy](#overview--philosophy)
2. [Installation & Setup](#installation--setup)
3. [Core Features](#core-features)
4. [GitHub Copilot Instructions](#github-copilot-instructions)
5. [Universal Test Runner](#universal-test-runner)
6. [Project Type Support](#project-type-support)
7. [Workspace Management](#workspace-management)
8. [Configuration](#configuration)
9. [Advanced Features](#advanced-features)
10. [Troubleshooting](#troubleshooting)
11. [Best Practices](#best-practices)
12. [Team Collaboration](#team-collaboration)

---

## Overview & Philosophy

### What is AI Context Utilities?

AI Context Utilities is a VSCode extension that bridges the gap between your project's configuration and AI-powered development tools. It automatically generates GitHub Copilot instructions from your ESLint/Prettier configs and provides intelligent test execution across different project architectures.

### Core Philosophy
- **Universal Support**: Works with any project type (Nx, Turborepo, Lerna, standalone)
- **Intelligent Adaptation**: Automatically detects and adapts to your project structure
- **Team-Centric**: Prioritizes team decisions and customizations
- **AI-First**: Optimizes for AI assistant integration and context generation

### Key Benefits
- **Reduced Context Switching**: All tools accessible from single interface
- **Consistent AI Responses**: Standardized instructions improve Copilot accuracy
- **Team Alignment**: Shared configurations and overrides across team members
- **Workflow Optimization**: Intelligent test execution based on project changes

---

## Installation & Setup

### Prerequisites
- **Visual Studio Code**: 1.74.0 or later
- **Node.js**: 16.0+ (for npm-based projects)
- **Git**: Required for git-based features
- **GitHub Copilot**: Recommended for AI instruction features

### Installation Methods

#### Option 1: VS Code Marketplace (When Available)
1. Open VS Code Extensions panel (`Ctrl+Shift+X`)
2. Search for "AI Context Utilities"
3. Click "Install"
4. Restart VS Code when prompted

#### Option 2: Beta Installation (Current)
1. Download VSIX from GitHub releases
2. Open Command Palette (`Ctrl+Shift+P`)
3. Run `Extensions: Install from VSIX...`
4. Select downloaded file
5. Restart VS Code

### First-Time Setup

#### Automatic Setup Wizard
The extension automatically runs setup on first use:

```
🍎 AI Context Util Setup - Welcome!

Step 1/6: Environment Detection
✅ Visual Studio Code 1.85.0
✅ Node.js 18.17.0  
✅ Git 2.41.0
✅ npm 9.6.7

Step 2/6: Project Analysis  
🔍 Analyzing project structure...
✅ Project Type: Angular Standalone Application
✅ Test Framework: Jest 29.0.0
✅ Package Manager: npm

Step 3/6: Tool Validation
✅ Angular CLI available
✅ TypeScript compiler available
⚠️ Nx not detected (using npm scripts)

Step 4/6: Configuration Creation
📝 Generating .aiDebugContext.yml...
✅ Configuration template applied

Step 5/6: Validation
✅ Test commands verified
✅ File patterns validated
✅ Performance settings optimized

Step 6/6: Setup Complete!
🎉 AI Context Utilities is ready to use!
```

#### Manual Configuration
Create `.aiDebugContext.yml` in your project root:

```yaml
# Basic configuration for standalone project
framework: standalone
testCommands:
  default: npm test
  watch: npm run test:watch
  coverage: npm run test:coverage

patterns:
  test: ["**/*.spec.ts", "**/*.test.ts"]
  source: ["src/**/*.ts"]
  ignore: ["node_modules/**", "dist/**"]

performance:
  parallel: true
  cache: true
  cacheTimeout: 30

output:
  verbose: true
  format: legacy
  showTiming: true
```

---

## Core Features

### Command Palette Integration

#### Primary Commands
| Command | Shortcut | Description |
|---------|----------|-------------|
| `🧪 Open Testing Menu` | `Ctrl+Shift+T` | Main test interface |
| `🤖 Add Copilot Instruction Contexts` | None | Generate AI instructions |
| `🍎 Setup` | None | Configuration wizard |
| `📊 Show Workspace Info` | None | Project analysis |

#### Secondary Commands
| Command | Description |
|---------|-------------|
| `🎯 Git Context: Test Changed Files` | Test only changed files |
| `🔄 Re-run Last Test` | Repeat previous test |
| `📝 Generate PR Description` | Create PR description from git changes |
| `🚀 Prepare to Push` | Pre-push validation |

### Status Bar Integration

The status bar provides real-time feedback:

#### Status Indicators
- **Ready**: `⚡ AI Context Util: Ready (ProjectType)`
- **Running**: `⚡ AI Context Util: 🧪 Running tests...` (yellow)
- **Success**: `⚡ AI Context Util: ✅ Tests passed` (green)
- **Error**: `⚡ AI Context Util: ❌ Tests failed` (red)

#### Interactive Features
- **Click status bar** to open test menu
- **Tooltip shows** recent activity and performance info
- **Color coding** indicates current state

---

## GitHub Copilot Instructions

### Automatic Generation

The extension creates comprehensive GitHub Copilot instructions from your project configuration.

#### Generated File Structure
```
.github/instructions/
├── copilot-instructions.md           # Main entry point
├── user-overrides.instructions.md    # Team customizations (Priority: 1000)
└── frameworks/                       # Framework-specific guidance
    ├── eslint-rules.instructions.md      # ESLint rules (Priority: 30)
    ├── prettier-formatting.instructions.md # Formatting (Priority: 20)
    ├── angular-context.instructions.md    # Angular docs (Priority: 900)
    ├── angular.instructions.md            # Angular patterns (Priority: 100)
    └── typescript.instructions.md         # TypeScript guidelines (Priority: 50)
```

### Priority System

The extension uses a sophisticated priority system to ensure the right guidance takes precedence:

| Priority | File Type | Purpose | Example |
|----------|-----------|---------|---------|
| 1000 | User Overrides | Team decisions | "Use functional components only" |
| 900 | Official Docs | Framework authority | Angular.dev context files |
| 200 | Project Main | Workspace guidelines | Project-specific patterns |
| 100 | Framework | Language/library patterns | React hooks best practices |
| 50 | Language | Language-specific rules | TypeScript strict mode |
| 30 | Code Quality | Linting rules | ESLint rule translations |
| 20 | Formatting | Style consistency | Prettier configuration |

### ESLint Rule Translation

The extension converts technical ESLint rules into natural language guidance:

#### Technical Rule
```json
{
  "@typescript-eslint/no-unused-vars": "error",
  "prefer-const": "error",
  "@typescript-eslint/explicit-function-return-type": "warn"
}
```

#### Generated Instruction
```markdown
## Type Safety
- Remove unused variables and imports to keep code clean
- Use const for variables that are never reassigned  
- Consider adding explicit return types to functions for better documentation

## Code Quality  
- Avoid unused variables and imports
- Prefer immutable variable declarations
- Use explicit typing for better code documentation
```

### Prettier Integration

Prettier configurations are translated into readable formatting guidelines:

#### Prettier Config
```json
{
  "semi": false,
  "singleQuote": true,
  "trailingComma": "es5",
  "tabWidth": 2
}
```

#### Generated Instruction
```markdown
## Code Formatting Guidelines

- **Semicolons**: Do not use semicolons at the end of statements
- **Quotes**: Use single quotes for strings
- **Trailing Commas**: Add trailing commas where valid in ES5
- **Indentation**: Use 2 spaces for indentation
```

### Framework Detection

The extension automatically detects and generates framework-specific instructions:

#### Angular Detection
```typescript
// Detected features
{
  name: 'Angular',
  version: '17.0.0',
  confidence: 0.95,
  features: ['standalone-components', 'signals', 'control-flow'],
  dependencies: ['@angular/core', '@angular/common']
}
```

#### Generated Angular Instructions
```markdown
# Angular 17+ Development Guidelines

## Modern Angular Features
- **Standalone Components**: Use standalone: true by default
- **Signals**: Prefer signals for reactive state management
- **Control Flow**: Use @if, @for, @switch instead of structural directives

## Component Architecture
- Use OnPush change detection strategy
- Implement proper lifecycle hooks
- Leverage dependency injection patterns
```

### User Override System

The user override system allows teams to customize and override any generated instruction:

#### User Override Template
```markdown
---
applyTo: "**/*"
priority: 1000
userOverride: true
---

# User Override Instructions

## Project-Specific Rules

### Angular Overrides
- **Do NOT use explicit `standalone: true`** (implied by default in this project)
- **Only call component methods in templates when necessary**
- **Use `trackBy` with `*ngFor` to optimize rendering**

### Testing Philosophy  
- **Avoid TestBed unless component contains Signal Inputs/Outputs**
- **Do not directly call private methods in tests**
- **Write specs for newly added code, don't rewrite existing specs**

### Team Conventions
- **Use descriptive commit messages** following conventional commits
- **Document all public APIs** with JSDoc comments
- **Keep functions small and focused** on single responsibility
```

---

## Universal Test Runner

### Project Type Detection

The extension automatically detects your project architecture and adapts test execution accordingly:

#### Detection Matrix
| Project Type | Detection Criteria | Test Strategy |
|-------------|-------------------|---------------|
| **Nx Workspace** | `nx.json` + `@nx/*` deps | `nx affected:test` |
| **Turborepo** | `turbo.json` + `turbo` dep | `turbo test --filter=[SINCE]` |
| **Lerna** | `lerna.json` + `lerna` dep | `lerna run test --since` |
| **Yarn Workspaces** | `workspaces` in package.json | `yarn workspaces foreach run test` |
| **npm Workspaces** | `workspaces` in package.json | `npm test --workspaces` |
| **Standalone** | Single `package.json` | `npm test` |

### Test Execution Modes

#### Affected Tests
**Nx Projects**:
```bash
npx nx affected:test --base=main
```

**Turborepo Projects**:
```bash
turbo test --filter=[SINCE]
```

**Non-monorepo Projects**:
```bash
npm test  # Runs all tests (no affected concept)
```

#### Watch Mode
All project types support watch mode with appropriate commands:
```bash
# Nx
npx nx test my-app --watch

# Standalone  
npm run test:watch

# Custom
yarn test --watch
```

#### Coverage Reports
```bash
# Nx
npx nx test my-app --coverage

# Standalone
npm run test:coverage

# Jest
npx jest --coverage
```

### Real-Time Test Monitoring

The extension provides live feedback during test execution:

#### Output Processing
```
🧪 Running tests for my-component...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚡ Running my-component.spec.ts...
✅ should create component
✅ should render title
⚠️ should handle click events (slow: 2.1s)

📊 Test Results:
✅ Passed: 15 tests
❌ Failed: 2 tests  
⚠️ Slow: 1 test
⏱️ Duration: 3.2s

🔗 View detailed results: file:///.../test-results.html
```

#### Performance Tracking
- **Execution time** for each test file
- **Slow test warnings** (>2s by default)
- **Cache hit/miss** statistics
- **Memory usage** monitoring

### Workspace-Specific Test History

Each workspace maintains its own test history and recent projects:

#### Recent Projects Display
```
🧪 AI Context Util - Test Runner (my-workspace)

🚀 Test Recent: user-service          Last tested: 5 minutes ago ✅
   └── 23 tests passed in 2.1s
   
Recent Projects (This Workspace):
• admin-dashboard                     Last tested: 1 hour ago ✅
• shared-components                   Last tested: yesterday ⚠️
• api-client                         Never tested
```

#### Workspace Isolation
- **Separate history** per workspace
- **Independent configuration** per workspace
- **Automatic context switching** when changing workspaces
- **Preserved state** across VS Code sessions

---

## Project Type Support

### Nx Workspaces

#### Full Feature Support
- **Affected tests**: Leverages Nx dependency graph
- **Project discovery**: Automatic project.json detection
- **Caching**: Integrates with Nx cache system
- **Parallel execution**: Uses Nx parallel processing

#### Nx-Specific Features
```yaml
# .aiDebugContext.yml for Nx
framework: nx
testCommands:
  default: npx nx test {project}
  affected: npx nx affected:test
  watch: npx nx test {project} --watch
  coverage: npx nx test {project} --coverage
  
performance:
  parallel: true
  cache: true
  maxWorkers: 4
```

#### When Nx is Unavailable
The extension automatically detects when Nx is configured but not available:

```
ℹ️ Nx is not installed, falling back to project test script

The extension detected this is configured as an Nx workspace, but Nx tools 
are not available. Using package.json scripts instead.

[Learn More] [Dismiss]
```

### Turborepo Projects

#### Turborepo Integration
- **Pipeline awareness**: Uses `turbo.json` pipeline configuration
- **Affected detection**: `--filter=[SINCE]` for changed packages
- **Cache integration**: Leverages Turborepo's remote caching
- **Parallel execution**: Respects pipeline dependencies

#### Configuration Example
```yaml
framework: turborepo
testCommands:
  default: turbo test --filter={project}
  affected: turbo test --filter=[SINCE]
  watch: turbo test --filter={project} --watch
```

### Lerna Projects

#### Lerna Support
- **Package discovery**: Automatic `packages/` and `apps/` detection
- **Version awareness**: Integrates with Lerna versioning
- **Scope filtering**: `--scope` for specific packages
- **Since filtering**: `--since` for changed packages

#### Configuration Example
```yaml
framework: lerna
testCommands:
  default: lerna run test --scope={project}
  affected: lerna run test --since
  watch: lerna run test:watch --scope={project}
```

### Workspace Projects

#### npm/Yarn Workspaces
- **Workspace protocol**: Supports `workspace:` dependencies
- **Package discovery**: Finds packages via workspaces config
- **Cross-package testing**: Handles workspace dependencies

#### Configuration Example
```yaml
framework: workspace
testCommands:
  default: npm test --workspace={project}
  affected: npm test --workspaces  # Limited affected support
  watch: npm run test:watch --workspace={project}
```

### Standalone Projects

#### Single Package Support
- **Simple configuration**: Minimal setup required
- **npm/yarn scripts**: Direct script execution
- **No affected tests**: Runs all tests (no dependency graph)

#### Configuration Example
```yaml
framework: standalone
testCommands:
  default: npm test
  watch: npm run test:watch
  coverage: npm run test:coverage
```

---

## Workspace Management

### Workspace-Specific State

The extension maintains separate state for each workspace:

#### Workspace Key Generation
```typescript
// Workspace key format: {name}-{hash}
// Example: my-project-a1b2c3d4

function generateWorkspaceKey(workspacePath: string): string {
  const pathParts = workspacePath.split(/[/\\]/);
  const workspaceName = pathParts[pathParts.length - 1];
  const pathHash = simpleHash(workspacePath);
  return `${workspaceName}-${pathHash}`;
}
```

#### Storage Structure
```json
{
  "aiDebugContext.recentProjectsByWorkspace": {
    "my-frontend-a1b2c3d4": [
      {
        "name": "user-dashboard",
        "lastUsed": "2025-08-04T15:30:00Z",
        "testCount": 15,
        "lastUsedTimestamp": 1722780600000
      }
    ],
    "my-backend-e5f6g7h8": [
      {
        "name": "api-service",
        "lastUsed": "2025-08-04T14:20:00Z", 
        "testCount": 8,
        "lastUsedTimestamp": 1722776400000
      }
    ]
  }
}
```

### Workspace Switching

#### Automatic Detection
When you switch workspaces, the extension:
1. **Detects workspace change** via VS Code API
2. **Loads workspace-specific state** (recent projects, config)
3. **Updates UI** to show relevant context
4. **Preserves previous workspace** state

#### Visual Feedback
```
🔄 Workspace changed: Loading projects for new-workspace...
⚡ AI Context Util: 🔄 Loading workspace... (2-3 seconds)
⚡ AI Context Util: Ready (Nx) (stable state)
```

### Multi-Workspace Workflows

#### Scenario: Frontend + Backend Development
```
Workspace 1: /projects/my-app-frontend (Angular)
Recent Projects: [dashboard, shared-ui, user-auth]

Workspace 2: /projects/my-app-backend (NestJS)  
Recent Projects: [api-gateway, user-service, auth-service]
```

Each workspace maintains independent:
- **Recent project lists**
- **Test execution history**
- **Configuration settings**
- **Performance metrics**

#### Scenario: Multiple Client Projects
```
Client A: /clients/acme-corp (React + Jest)
Client B: /clients/globex-inc (Angular + Karma)
Client C: /clients/initech-llc (Vue + Vitest)
```

The extension automatically adapts to each client's:
- **Testing framework**
- **Project structure** 
- **Coding standards**
- **Team preferences**

---

## Configuration

### Configuration File Structure

#### Primary Configuration: `.aiDebugContext.yml`
```yaml
# Project architecture type
framework: nx | turborepo | lerna | workspace | standalone

# Test commands for different scenarios
testCommands:
  default: npm test              # Standard test execution
  affected: nx affected:test     # Test only affected projects
  watch: npm run test:watch      # Watch mode
  coverage: npm run test:coverage # Coverage collection
  debug: npm run test:debug      # Debug mode

# File patterns for discovery
patterns:
  test: 
    - "**/*.spec.ts"
    - "**/*.test.ts"
    - "**/*.spec.js"
  source:
    - "src/**/*.ts"
    - "lib/**/*.ts"
  ignore:
    - "node_modules/**"
    - "dist/**"
    - "coverage/**"

# Performance optimizations  
performance:
  parallel: true        # Enable parallel execution
  maxWorkers: 4         # Limit concurrent workers
  cache: true           # Enable result caching
  cacheTimeout: 30      # Cache expiration (minutes)

# Output preferences
output:
  verbose: true         # Detailed output
  format: legacy        # Output format (legacy/minimal/detailed)
  preserveAnsi: false   # Keep color codes
  showTiming: true      # Show execution timing
```

### Framework-Specific Configurations

#### Nx Workspace Configuration
```yaml
framework: nx
testCommands:
  default: npx nx test {project}
  affected: npx nx affected:test --base=main
  watch: npx nx test {project} --watch
  coverage: npx nx test {project} --coverage
  debug: npx nx test {project} --inspect

patterns:
  test: ["**/*.spec.ts", "**/*.spec.js"]
  source: ["src/**/*.ts", "libs/**/*.ts", "apps/**/*.ts"]
  ignore: ["node_modules/**", "dist/**", "tmp/**"]

performance:
  parallel: true
  maxWorkers: 8  # Higher for monorepos
  cache: true
  cacheTimeout: 60  # Longer for complex projects
```

#### Standalone Project Configuration
```yaml
framework: standalone
testCommands:
  default: npm test
  watch: npm run test:watch
  coverage: npm run test:coverage

patterns:
  test: ["**/*.test.ts", "**/*.spec.ts"]
  source: ["src/**/*.ts"]
  ignore: ["node_modules/**", "build/**"]

performance:
  parallel: false  # Simpler projects
  cache: true
  cacheTimeout: 15  # Shorter cache
```

### VS Code Settings Integration

#### Extension Settings
```json
{
  // Workspace behavior
  "aiDebugContext.enableWorkspaceIsolation": true,
  "aiDebugContext.maxRecentProjects": 8,
  
  // Test execution
  "aiDebugContext.showFallbackNotifications": true,
  "aiDebugContext.enableTestResultCaching": true,
  "aiDebugContext.defaultTestTimeout": 30000,
  
  // Output and UI
  "aiDebugContext.output.verbose": true,
  "aiDebugContext.output.preserveAnsi": false,
  "aiDebugContext.statusBar.showProjectType": true,
  
  // Copilot Instructions
  "aiDebugContext.copilot.autoGenerateInstructions": true,
  "aiDebugContext.copilot.includeESLintTranslation": true,
  "aiDebugContext.copilot.includePrettierConfig": true,
  "aiDebugContext.copilot.downloadAngularContext": true,
  
  // Performance
  "aiDebugContext.performance.enableMetrics": true,
  "aiDebugContext.performance.cacheSize": 100,
  "aiDebugContext.performance.parallelWorkers": 4
}
```

### Configuration Templates

The extension provides templates for common project types:

#### Template Selection
```
📋 Choose Configuration Template

Available Templates:
🎯 Nx Workspace (Recommended for monorepos)
   ├── Optimized for affected testing
   ├── Parallel execution enabled
   └── Advanced caching configuration

⚙️ Turborepo (For Turborepo projects)
   ├── Pipeline-aware execution
   ├── Filter-based testing
   └── Remote cache integration

🔧 Standalone Project (For single packages)
   ├── Simple npm script execution
   ├── Basic file patterns
   └── Minimal configuration

🛠️ Custom Configuration
   ├── Define your own commands
   ├── Custom file patterns
   └── Advanced options
```

---

## Advanced Features

### Performance Optimization

#### Test Result Caching
The extension caches test results to improve performance:

```typescript
interface CacheEntry {
  projectName: string;
  affectedFiles: string[];
  testConfig: TestConfiguration;
  result: TestResult;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}
```

#### Cache Invalidation Rules
- **File changes**: Cache invalidated when test or source files change
- **Configuration changes**: Cache cleared when test config changes
- **Time-based**: Automatic expiration after configured timeout
- **Manual**: User can clear cache via command palette

#### Performance Metrics
```json
{
  "performanceMetrics": {
    "testExecution": {
      "totalRuns": 157,
      "averageTime": "2.3s",
      "cacheHitRate": 0.78,
      "slowTests": 3
    },
    "projectDiscovery": {
      "averageTime": "243ms",
      "projectCount": 12,
      "lastRun": "2025-08-04T15:30:00Z"
    },
    "configurationLoading": {
      "averageTime": "87ms",
      "cacheHits": 45,
      "cacheMisses": 12
    }
  }
}
```

### Real-Time Test Monitoring

#### Live Output Processing
The extension processes test output in real-time to provide immediate feedback:

```typescript
interface TestOutputProcessor {
  // Detect test file execution
  processTestStart(line: string): void;
  
  // Process individual test results  
  processTestResult(line: string): TestResult | null;
  
  // Detect compilation errors
  processError(line: string): TestError | null;
  
  // Update progress indicators
  updateProgress(progress: TestProgress): void;
}
```

#### Progress Visualization
```
🧪 Running tests for user-dashboard...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Running Tests: [████████████████████     ] 75%

Recently Completed:
✅ user.component.spec.ts (12 tests, 1.2s)
✅ auth.service.spec.ts (8 tests, 0.8s)
🔄 dashboard.component.spec.ts (running...)

Queue: 2 files remaining
Estimated completion: 15 seconds
```

### AI Context Generation

#### Advanced Framework Detection
The extension uses multiple strategies to detect frameworks and their versions:

```typescript
interface FrameworkDetectionStrategy {
  // Package.json dependency analysis
  analyzePackageDependencies(packageJson: PackageJson): FrameworkInfo[];
  
  // Configuration file detection
  detectConfigFiles(workspaceRoot: string): ConfigFileInfo[];
  
  // Source code analysis
  analyzeSourceCode(files: string[]): CodePatternInfo[];
  
  // Build tool detection
  detectBuildTools(workspaceRoot: string): BuildToolInfo[];
}
```

#### Confidence Scoring
```typescript
interface FrameworkDetection {
  name: string;
  version: string;
  confidence: number; // 0.0 to 1.0
  evidence: DetectionEvidence[];
  features: string[];
}

interface DetectionEvidence {
  type: 'dependency' | 'config' | 'source' | 'build';
  source: string;
  weight: number;
}
```

#### Example Detection Result
```json
{
  "angular": {
    "name": "Angular",
    "version": "17.0.0",
    "confidence": 0.95,
    "evidence": [
      {
        "type": "dependency",
        "source": "@angular/core@17.0.0",
        "weight": 0.8
      },
      {
        "type": "config", 
        "source": "angular.json",
        "weight": 0.3
      },
      {
        "type": "source",
        "source": "standalone components detected",
        "weight": 0.15
      }
    ],
    "features": [
      "standalone-components",
      "signals", 
      "control-flow-syntax",
      "ssr-support"
    ]
  }
}
```

### Custom Command Integration

#### User-Defined Commands
Users can define custom test commands in configuration:

```yaml
framework: custom
testCommands:
  default: yarn test
  affected: yarn test:affected
  watch: yarn test:watch  
  coverage: yarn test:coverage
  lint: yarn lint
  e2e: yarn e2e
  
customCommands:
  "test:unit": yarn jest --testMatch="**/*.unit.test.*"
  "test:integration": yarn jest --testMatch="**/*.integration.test.*"  
  "test:visual": yarn chromatic --exit-zero-on-changes
```

#### Command Execution
```typescript
interface CustomCommandExecution {
  name: string;
  command: string;
  description: string;
  category: 'test' | 'lint' | 'build' | 'deploy' | 'custom';
  async: boolean;
  timeout?: number;
}
```

---

## Troubleshooting

### Common Issues & Solutions

#### Extension Not Loading
```
Problem: Extension appears installed but commands don't work
Symptoms: 
- Commands not in palette
- Status bar not showing
- No keyboard shortcuts working

Solutions:
1. Check VS Code version (requires 1.74.0+)
2. Restart VS Code completely
3. Check VS Code Developer Tools console for errors
4. Disable other extensions temporarily to check for conflicts
5. Reinstall extension

Debug Steps:
- Open Command Palette → "Developer: Reload Window"
- Check Help → About for VS Code version
- View → Output → "AI Context Util" for error messages
```

#### Test Commands Not Working
```
Problem: Test menu opens but tests don't run
Symptoms:
- "Command failed" errors
- No test output
- Status bar shows errors

Solutions:
1. Verify Node.js is installed and accessible
2. Check that npm/yarn commands work in terminal
3. Ensure package.json has test scripts
4. Run setup wizard: Command Palette → "AI Context Util: Setup"
5. Check project permissions

Debug Steps:
- Test manually: npm test (in terminal)
- Check .aiDebugContext.yml configuration
- View Output panel for detailed error messages
- Verify project structure matches expected patterns
```

#### Project Detection Issues
```
Problem: Extension doesn't detect project type correctly
Symptoms:
- Wrong project type in status bar
- Inappropriate test commands
- Missing features

Solutions:
1. Ensure project indicators are present:
   - Nx: nx.json file
   - Turborepo: turbo.json file  
   - Lerna: lerna.json file
   - Standalone: package.json with test scripts
   
2. Run project analysis: Command Palette → "Show Workspace Info"
3. Manual configuration in .aiDebugContext.yml
4. Clear extension cache and restart

Debug Steps:
- Check workspace root for configuration files
- Verify package.json dependencies
- Run setup wizard to reconfigure
- Check output panel for detection logs
```

#### Copilot Instructions Generation Fails  
```
Problem: Instruction generation throws errors
Symptoms:
- No files in .github/instructions/
- Permission errors
- Generation hangs

Solutions:
1. Check file system permissions
2. Ensure .github directory can be created
3. Verify disk space availability  
4. Close other applications using files
5. Run VS Code as administrator (Windows)

Debug Steps:
- Check workspace permissions: create .github folder manually
- Verify ESLint/Prettier configs are readable
- Clear temporary files and retry
- Check output panel for specific error messages
```

#### Performance Issues
```
Problem: Extension is slow or unresponsive
Symptoms:
- Long delays opening menus
- Slow test execution
- High CPU/memory usage
- UI freezing

Solutions:
1. Check project size (very large projects may be slower)
2. Reduce maxWorkers in configuration
3. Enable caching for better performance
4. Close other resource-intensive applications
5. Update to latest VS Code version

Performance Tuning:
# .aiDebugContext.yml
performance:
  parallel: true
  maxWorkers: 2      # Reduce for slower systems
  cache: true
  cacheTimeout: 60   # Longer cache retention

# VS Code settings.json  
{
  "aiDebugContext.performance.enableMetrics": false,
  "aiDebugContext.output.verbose": false
}
```

### Debugging Tools

#### Output Panel Analysis
The extension provides detailed logging in the VS Code Output panel:

```
View → Output → Select "AI Context Util"

Example Output:
🔍 [2025-08-04 15:30:15] Project detection started
📊 [2025-08-04 15:30:15] Found package.json at /project/package.json
🔍 [2025-08-04 15:30:15] Checking for nx.json... not found
🔍 [2025-08-04 15:30:15] Checking for turbo.json... not found  
✅ [2025-08-04 15:30:15] Project type: standalone
⚙️ [2025-08-04 15:30:16] Configuration loaded successfully
🧪 [2025-08-04 15:30:20] Test execution started: npm test
✅ [2025-08-04 15:30:23] Test execution completed (exit code: 0)
```

#### Configuration Validation
```
Command Palette → "AI Context Util: Validate Configuration"

Validation Results:
✅ Configuration file: .aiDebugContext.yml (valid YAML)
✅ Framework setting: 'standalone' matches detected project
⚠️ Test command: 'npm test' - script not found in package.json
   Suggestion: Add "test": "echo \"No test specified\"" to package.json
✅ File patterns: All patterns are valid glob expressions
⚠️ Performance: maxWorkers (8) exceeds available cores (4)
   Suggestion: Reduce to 4 for optimal performance

Overall Score: 85% (Good)
```

#### Reset Extension State
If extension gets into corrupted state:

```
Command Palette → "Developer: Restart Extension Host"

Or manual reset:
1. Close VS Code
2. Delete: ~/.vscode/extensions/ai-context-util-*/globalStorage/
3. Delete: workspace/.vscode/settings.json (extension settings only)
4. Restart VS Code
5. Run setup wizard again
```

---

## Best Practices

### Team Configuration

#### Shared Configuration Strategy
```
Project Structure:
my-project/
├── .aiDebugContext.yml          # Shared team configuration
├── .github/instructions/
│   ├── copilot-instructions.md   # Generated main file  
│   ├── user-overrides.instructions.md  # Team customizations
│   └── frameworks/              # Auto-generated guidelines
└── .vscode/
    └── settings.json            # Team VS Code settings
```

#### Version Control Best Practices
```gitignore
# .gitignore - Include these for team sharing
.aiDebugContext.yml
.github/instructions/user-overrides.instructions.md

# Exclude generated files (can be regenerated)
.github/instructions/frameworks/
.github/instructions/copilot-instructions.md

# VS Code settings (team decision)
.vscode/settings.json    # Include for team consistency
```

#### Team Override Guidelines
Create team-specific overrides in `user-overrides.instructions.md`:

```markdown
# Team Conventions

## Architecture Decisions
✅ **Use functional components** with hooks for all new React code
❌ **Avoid class components** except for error boundaries
✅ **Prefer TypeScript strict mode** for type safety
✅ **Use absolute imports** with path mapping

## Testing Standards  
✅ **Write tests for all new features** before code review
✅ **Use descriptive test names** that explain expected behavior
❌ **Don't test implementation details** - focus on behavior
✅ **Mock external dependencies** in unit tests

## Code Review Process
✅ **All PRs require approval** from at least one team member
✅ **Run tests locally** before pushing
✅ **Update documentation** for API changes
✅ **Follow conventional commit** message format
```

### Performance Optimization

#### Large Project Optimization
```yaml
# .aiDebugContext.yml for large projects
performance:
  parallel: true
  maxWorkers: 6          # Balance between speed and resource usage
  cache: true
  cacheTimeout: 120      # Longer cache for stability
  
# Optimize file patterns
patterns:
  test: 
    - "src/**/*.spec.ts"   # More specific patterns
    - "!src/**/node_modules/**"  # Explicit exclusions
  ignore:
    - "node_modules/**"
    - "dist/**" 
    - "build/**"
    - ".next/**"
    - "coverage/**"
```

#### Monorepo Best Practices
```yaml
# Nx monorepo optimization
framework: nx
testCommands:
  affected: npx nx affected:test --base=main --head=HEAD
  
performance:
  parallel: true
  maxWorkers: 8
  cache: true
  cacheTimeout: 240      # 4 hours for complex builds

# Use Nx-specific patterns  
patterns:
  test: ["apps/**/*.spec.ts", "libs/**/*.spec.ts"]
  source: ["apps/**/src/**/*.ts", "libs/**/src/**/*.ts"]
```

### Workflow Integration

#### CI/CD Integration
```yaml
# .github/workflows/test.yml
name: Test with AI Context Util

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      # Use same commands as local development
      - name: Install dependencies
        run: npm ci
        
      - name: Run affected tests
        run: |
          if [ -f "nx.json" ]; then
            npx nx affected:test --base=origin/main
          else
            npm test
          fi
```

#### Pre-commit Hooks
```json
// package.json
{
  "husky": {
    "hooks": {
      "pre-commit": "npm run test:affected && npm run lint"
    }
  },
  "scripts": {
    "test:affected": "npx nx affected:test --uncommitted || npm test"
  }
}
```

#### Developer Onboarding
Create onboarding checklist for new team members:

```markdown
# Developer Setup Checklist

## Environment Setup
- [ ] Install VS Code 1.74.0+  
- [ ] Install Node.js 18+
- [ ] Install Git
- [ ] Clone project repository

## Extension Setup
- [ ] Install AI Context Utilities extension
- [ ] Run setup wizard (`Ctrl+Shift+P` → "AI Context Util: Setup")
- [ ] Verify test menu works (`Ctrl+Shift+T`)
- [ ] Generate Copilot instructions (`Ctrl+Shift+P` → "Add Copilot Instruction Contexts")

## Team Configuration
- [ ] Review `.aiDebugContext.yml` configuration
- [ ] Read `user-overrides.instructions.md` for team conventions  
- [ ] Set up IDE integrations (ESLint, Prettier)
- [ ] Run first test to verify setup

## Verification
- [ ] Can run tests successfully
- [ ] Copilot provides context-aware suggestions
- [ ] Status bar shows correct project type
- [ ] Recent projects persist between sessions
```

---

## Team Collaboration

### Shared Configurations

#### Configuration Synchronization
Teams can share configurations across all members:

```yaml
# .aiDebugContext.yml (committed to repository)
# This configuration is shared across all team members
framework: nx
testCommands:
  default: npx nx test {project}
  affected: npx nx affected:test --base=main

# Team-specific performance settings
performance:
  parallel: true
  maxWorkers: 4  # Optimized for team's typical hardware
  cache: true
  cacheTimeout: 60

# Agreed-upon file patterns
patterns:
  test: ["**/*.spec.ts", "**/*.test.ts"]
  source: ["src/**/*.ts", "libs/**/*.ts", "apps/**/*.ts"]
  ignore: ["node_modules/**", "dist/**", "coverage/**"]
```

#### User Override Collaboration
```markdown
<!-- .github/instructions/user-overrides.instructions.md -->
<!-- Shared team overrides (committed to repository) -->

# Team Override Instructions

## Shared Team Decisions

### Architecture Standards
- **Component Architecture**: Use standalone components for Angular 17+
- **State Management**: Prefer NgRx for complex state, signals for simple state
- **Testing Strategy**: Unit tests for logic, integration tests for workflows

### Code Style (Beyond ESLint/Prettier)
- **Naming**: Use descriptive names that explain intent
- **Comments**: Document why, not what
- **Imports**: Group and sort imports consistently

### Review Requirements
- **Test Coverage**: Maintain >90% coverage for new code
- **Documentation**: Update docs for public API changes  
- **Performance**: Consider performance impact of changes
```

### Multiple Environment Support

#### Development vs Production Configuration
```yaml
# .aiDebugContext.yml (base configuration)
framework: nx
testCommands:
  default: npx nx test {project}
  
# Development optimizations
performance:
  parallel: true
  cache: true
  verbose: true
  
output:
  format: detailed
  showTiming: true
```

```yaml
# .aiDebugContext.prod.yml (production/CI overrides)
extends: .aiDebugContext.yml

# CI-specific optimizations
performance:
  maxWorkers: 2  # Limited CI resources
  cache: false   # Fresh builds in CI
  
testCommands:
  default: npx nx test {project} --watch=false --ci
  
output:
  format: minimal  # Less verbose in CI
  verbose: false
```

#### Environment Detection
```typescript
// Automatic environment detection
const isCI = process.env.CI === 'true';
const isDevelopment = process.env.NODE_ENV === 'development';

const configFile = isCI 
  ? '.aiDebugContext.prod.yml'
  : '.aiDebugContext.yml';
```

### Knowledge Sharing

#### Team Documentation Integration
```markdown
<!-- .github/instructions/user-overrides.instructions.md -->

# Team Knowledge Base

## Project Conventions
Document decisions made during team discussions:

### Recent Architectural Decisions
- **2025-08-01**: Adopted signals for reactive state (replacing BehaviorSubject)
  - Rationale: Better performance, simpler debugging
  - Migration: Gradual replacement over Q4 2025

- **2025-07-15**: Standardized on standalone components
  - Rationale: Improved tree-shaking, simpler testing
  - Implementation: All new components use standalone: true

### Debugging Guidelines  
- **Performance Issues**: Use Angular DevTools profiler first
- **State Issues**: Check NgRx DevTools timeline
- **Template Issues**: Enable Angular strict templates

### Learning Resources
- **Angular**: Internal Angular style guide (wiki/angular-guide)
- **Testing**: Team testing best practices (wiki/testing-guide)  
- **Architecture**: System design documents (confluence/architecture)
```

#### Onboarding Automation
```json
// .vscode/tasks.json (team onboarding)
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Team Onboarding: Setup AI Context Util",
      "type": "shell",
      "command": "code",
      "args": ["--install-extension", "ai-context-util"],
      "group": "build",
      "presentation": {
        "echo": true,
        "reveal": "always"
      }
    },
    {
      "label": "Team Onboarding: Generate Instructions", 
      "type": "shell",
      "command": "echo",
      "args": ["Run: Ctrl+Shift+P → 'Add Copilot Instruction Contexts'"],
      "group": "build"
    }
  ]
}
```

#### Code Review Integration
```markdown
<!-- Pull Request Template -->
## AI Context Util Checklist

- [ ] Tests run successfully with `Ctrl+Shift+T`
- [ ] Generated Copilot instructions reviewed for accuracy
- [ ] User overrides updated if team conventions changed
- [ ] Configuration changes documented in PR description

## Copilot Instructions Review
- [ ] New patterns added to user overrides if needed
- [ ] Framework detection still accurate  
- [ ] ESLint rule translations make sense
- [ ] Team-specific rules still take precedence
```

---

## 🎓 Conclusion

AI Context Utilities v3.5.1 provides comprehensive support for modern development workflows across all project types. By automatically generating AI-optimized instructions and providing intelligent test execution, it bridges the gap between project configuration and AI-powered development tools.

### Key Takeaways
- **Universal Support**: Works with any project architecture
- **Team-Centric**: Prioritizes team decisions and customizations  
- **AI-Optimized**: Generates context specifically for GitHub Copilot
- **Workflow-Integrated**: Seamlessly fits into existing development processes

### Next Steps
- Explore the **[Technical Specifications](../TECHNICAL_SPECIFICATIONS.md)** for implementation details
- Review **[UI Specifications](../UI_SPECIFICATIONS_v3_5_1.md)** for interface documentation
- Check **[v3.6.0 Planning](../planning/v3.6.0-non-nx-support.md)** for upcoming features
- Join the community for support and feedback

---

*For additional support, visit our [GitHub repository](https://github.com/your-org/ai-context-util) or check the [Beta Installation Guide](BETA_INSTALLATION_GUIDE.md) for troubleshooting.*