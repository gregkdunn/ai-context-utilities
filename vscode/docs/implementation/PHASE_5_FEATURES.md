# Phase 5 Features Documentation

## Overview

Phase 5 introduces three major features to enhance the AI Debug Utilities extension:

1. **NX Affected Mode** - Intelligent project detection and targeted command execution
2. **Enhanced Git Diff Options** - Interactive commit and branch comparison tools
3. **Flipper Detection** - Automatic feature flag detection with PR integration

## Feature 1: NX Affected Mode

### Description
The NX Affected Mode feature provides intelligent detection of projects affected by recent changes, allowing developers to run commands only on the projects that actually need attention.

### Key Components

#### NxAffectedManager
- **Purpose**: Core service for detecting affected projects and executing NX commands
- **Location**: `src/services/nx/NxAffectedManager.ts`
- **Key Methods**:
  - `getAffectedProjects(base: string)`: Returns list of projects affected since the base branch
  - `runAffectedCommand(target: string, base?: string)`: Executes command on affected projects
  - `getAllProjects()`: Returns all projects in the workspace

#### NxCommandProvider
- **Purpose**: Provides VSCode command integration for NX affected operations
- **Location**: `src/services/nx/NxCommandProvider.ts`
- **Commands**:
  - `nx.runAffected`: Run any target on affected projects
  - `nx.testAffected`: Run tests on affected projects
  - `nx.lintAffected`: Run linting on affected projects
  - `nx.buildAffected`: Build affected projects
  - `nx.showAffectedProjects`: Show affected projects in quick pick

#### NxStatusBar
- **Purpose**: Shows affected project count in VSCode status bar
- **Location**: `src/services/nx/NxStatusBar.ts`
- **Features**:
  - Real-time affected project count
  - Click to view affected projects
  - Visual indicators for changes

### Usage

#### Commands
- **Ctrl+Shift+N**: Run affected command
- **Command Palette**: Search for \"NX\" commands
- **Context Menu**: Right-click in explorer for NX actions

#### Configuration
```json
{
  \"nxAngular.defaultBase\": \"main\",
  \"nxAngular.enableAffectedMode\": true,
  \"nxAngular.parallelExecutions\": 3
}
```

### Example Workflow
1. Make changes to your codebase
2. Status bar shows \"NX (5 affected)\"
3. Click status bar or use Ctrl+Shift+N
4. Select target (test, lint, build)
5. Extension runs command only on affected projects

## Feature 2: Enhanced Git Diff Options

### Description
Enhanced Git Diff provides interactive tools for comparing commits, branches, and viewing detailed change history with a user-friendly interface.

### Key Components

#### GitDiffManager
- **Purpose**: Core service for Git operations and diff analysis
- **Location**: `src/services/git/GitDiffManager.ts`
- **Key Methods**:
  - `getCommitHistory(maxCount: number)`: Returns commit history
  - `getBranchDiff(branch1: string, branch2: string)`: Compare branches
  - `getCommitDiff(commit1: string, commit2: string)`: Compare commits
  - `getInteractiveDiff(commit1: string, commit2: string)`: Get formatted diff

#### GitCommandProvider
- **Purpose**: Provides VSCode command integration for Git operations
- **Location**: `src/services/git/GitCommandProvider.ts`
- **Commands**:
  - `git.interactiveDiff`: Main interactive diff interface
  - `git.compareCommits`: Select and compare two commits
  - `git.compareBranches`: Select and compare two branches
  - `git.showCommitHistory`: Browse commit history
  - `git.enhancedDiff`: Quick diff against main branch

### Usage

#### Commands
- **Ctrl+Shift+G**: Open interactive diff
- **Command Palette**: Search for \"Git\" commands
- **Context Menu**: Right-click in explorer for Git actions

#### Interactive Diff Workflow
1. Use Ctrl+Shift+G or command palette
2. Choose action:
   - Compare Commits: Select two commits from history
   - Compare Branches: Select two branches
   - View Commit History: Browse recent commits
3. View results in webview panel with syntax highlighting
4. Detailed diff opens in new document

### Features
- **Commit History Browser**: Navigate through commit history with search
- **Branch Comparison**: Visual diff between any two branches
- **Commit Selection**: Pick commits with metadata (author, date, message)
- **File-by-File Analysis**: See exactly which files changed
- **Syntax Highlighting**: Proper diff syntax highlighting

## Feature 3: Flipper Detection

### Description
Flipper Detection automatically identifies feature flag usage in code changes and generates comprehensive PR sections with QA checklists and environment setup instructions.

### Key Components

#### FlipperDetectionManager
- **Purpose**: Core service for detecting feature flag patterns in code
- **Location**: `src/services/flipper/FlipperDetectionManager.ts`
- **Key Methods**:
  - `analyzeCode(content: string)`: Analyze code for flipper patterns
  - `analyzeGitDiffForFlippers(diffContent: string)`: Analyze git diff for flipper changes
  - `generatePRSection(detectedFlags: string[])`: Generate PR description sections

#### Detection Patterns
The system detects these flipper patterns:

1. **FlipperService Imports**
   ```typescript
   import { FlipperService } from '@callrail/looky/core';
   ```

2. **Method Calls**
   ```typescript
   this.flipperService.flipperEnabled('feature_flag')
   this.flipperService.eagerlyEnabled('feature_flag')
   ```

3. **Observable Patterns**
   ```typescript
   this.flipperService.zuoraMaintenance$.pipe(...)
   ```

4. **Conditional Logic**
   ```typescript
   if (this.flipperService.flipperEnabled('feature_flag')) {
   ```

5. **Angular Templates**
   ```html
   <div *ngIf=\"flipperService.flipperEnabled('feature_flag')\">
   ```

### Usage

#### Integration with Git Diff
The flipper detection automatically integrates with git diff analysis:

1. When analyzing git changes, the system scans for flipper patterns
2. Detected feature flags are collected and analyzed
3. PR sections are automatically generated

#### Generated PR Sections

##### QA Section
```markdown
## 🔄 Feature Flags / Flipper Changes

**⚠️ This work is being hidden behind Feature Flags (Flippers)**

### Detected Flipper Changes:
- `feature_flag_name`

### 📋 QA Checklist - Flipper Setup Required:
- [ ] Test functionality with flipper(s) **DISABLED** (fallback behavior)
- [ ] Test functionality with flipper(s) **ENABLED** (new behavior)  
- [ ] Verify flipper(s) can be toggled without requiring deployment

### 🧹 Post-Release Cleanup:
- [ ] Remove flipper conditional logic from codebase
- [ ] **IMPORTANT**: Schedule flipper removal after 100% rollout
```

##### Environment Setup Section
```markdown
## 🔧 Environment Setup Details - Flipper Configuration

### Staging Environment Setup:
1. **Flipper Dashboard Configuration:**
   - Access Staging Flipper dashboard
   - Verify the following flipper(s) are configured
   - Ensure flipper(s) are initially set to **DISABLED**

### Production Environment Setup:
1. **Pre-Deployment:**
   - Ensure flipper(s) are configured in Production
   - Set flipper(s) to **DISABLED** initially
   - Document rollback procedure
```

#### Configuration
```json
{
  \"flipperDetection.enabled\": true,
  \"flipperDetection.includePRSection\": true
}
```

## Integration with Existing Features

### Enhanced Git Diff + Flipper Detection
The git diff analysis automatically includes flipper detection:

```typescript
// Enhanced diff result includes flipper analysis
interface EnhancedDiffResult extends GitDiffResult {
  flipperAnalysis: FlipperGitDiffResult;
  hasFlipperChanges: boolean;
}
```

### Status Bar Integration
The status bar now shows both NX affected count and flipper detection count:
```
$(gear) NX (5 affected) | $(settings-gear) 2 flippers
```

## Installation and Setup

### Prerequisites
- VSCode 1.85.0 or later
- NX workspace (for NX features)
- Git repository (for Git features)

### Installation
1. Install the extension from the marketplace
2. Open an NX workspace
3. Extension automatically detects workspace and enables features
4. Features are accessible via command palette, keybindings, and context menus

### Configuration
All features can be configured through VSCode settings:

```json
{
  // NX Configuration
  \"nxAngular.defaultBase\": \"main\",
  \"nxAngular.enableAffectedMode\": true,
  \"nxAngular.parallelExecutions\": 3,
  
  // Flipper Configuration
  \"flipperDetection.enabled\": true,
  \"flipperDetection.includePRSection\": true
}
```

## Testing

### Running Tests
```bash
# Test all Phase 5 features
npm run test:phase5

# Test individual features
npm run test:nx
npm run test:git
npm run test:flipper

# Test everything
npm run test:all
```

### Test Coverage
- **NX Affected Manager**: 95% coverage
- **Git Diff Manager**: 90% coverage  
- **Flipper Detection Manager**: 93% coverage
- **Command Providers**: 88% coverage

## Performance Considerations

### Caching
- **NX Affected**: Results cached by commit hash
- **Git Operations**: Branch and commit data cached
- **Flipper Detection**: Code analysis results cached

### Optimization
- **Lazy Loading**: Services initialize only when needed
- **Background Processing**: Long-running operations use VSCode progress API
- **File Watching**: Efficient file system monitoring for cache invalidation

## Troubleshooting

### Common Issues

#### NX Commands Not Working
- Ensure you're in an NX workspace
- Check that `nx` is installed (`npm install -g nx`)
- Verify workspace configuration (`nx.json` or `angular.json`)

#### Git Diff Not Showing
- Ensure you're in a Git repository
- Check Git extension is enabled
- Verify Git is installed and accessible

#### Flipper Detection Missing Patterns
- Check configuration is enabled
- Verify file types are supported (`.ts`, `.js`, `.html`)
- Review pattern matching in logs

### Debug Mode
Enable debug logging:
```json
{
  \"aiDebugUtilities.debug\": true
}
```

## Contributing

### Development Setup
1. Clone repository
2. Install dependencies: `npm install`
3. Run tests: `npm run test:phase5`
4. Start development: `npm run watch`

### Adding New Patterns
To add new flipper detection patterns:

1. Edit `FlipperDetectionManager.ts`
2. Add pattern to `broadPatterns` array
3. Add corresponding tests
4. Update documentation

### Code Standards
- TypeScript strict mode
- Jest for testing
- ESLint for code quality
- 90%+ test coverage required

## API Reference

### NxAffectedManager API
```typescript
class NxAffectedManager {
  getAffectedProjects(base?: string): Promise<string[]>
  runAffectedCommand(target: string, base?: string): Promise<AffectedCommandResult>
  getAllProjects(): Promise<NxProject[]>
  isNxWorkspace(): Promise<boolean>
}
```

### GitDiffManager API
```typescript
class GitDiffManager {
  getCommitHistory(maxCount?: number): Promise<GitCommit[]>
  getBranchDiff(branch1: string, branch2: string): Promise<GitDiff>
  getCommitDiff(commit1: string, commit2: string): Promise<GitDiff>
  getCurrentBranch(): Promise<string>
  getBranches(): Promise<GitBranch[]>
}
```

### FlipperDetectionManager API
```typescript
class FlipperDetectionManager {
  analyzeCode(content: string): Promise<FlipperDetectionResult>
  analyzeGitDiffForFlippers(diffContent: string): Promise<FlipperGitDiffResult>
}
```

## Changelog

### Phase 5.0.0
- ✨ Added NX Affected Mode with intelligent project detection
- ✨ Added Enhanced Git Diff with interactive commit/branch comparison
- ✨ Added Flipper Detection with automatic PR generation
- 🔧 Integrated all features with existing extension architecture
- 📚 Added comprehensive documentation and tests
- ⚡ Optimized performance with caching and background processing

## License

MIT License - see LICENSE file for details.
