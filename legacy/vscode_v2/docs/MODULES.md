# AI Debug Context - Module Documentation

## Overview

The AI Debug Context extension consists of several modular components that work together to provide a comprehensive development workflow enhancement. Each module is designed to handle specific aspects of the development process while maintaining seamless integration with the overall system.

## Table of Contents

1. [DIFF Module - Git Diff Generation](#diff-module---git-diff-generation)
2. [TEST Module - Test Execution](#test-module---test-execution)
3. [AI DEBUG Module - AI-Powered Debugging](#ai-debug-module---ai-powered-debugging)
4. [PR DESC Module - PR Description Generation](#pr-desc-module---pr-description-generation)
5. [File Selection Module - File Management](#file-selection-module---file-management)
6. [Analysis Dashboard Module - System Analytics](#analysis-dashboard-module---system-analytics)
7. [Prepare to Push Module - Code Quality](#prepare-to-push-module---code-quality)

## DIFF Module - Git Diff Generation

**Location**: `webview-ui/src/app/modules/git-diff/`
**Main Component**: `git-diff.component.ts`

### Purpose
Provides comprehensive Git diff generation and visualization capabilities with real-time streaming output and file management.

### Key Features

#### 1. **Git Diff Visualization**
- Syntax-highlighted diff display
- Support for unified diff format
- Interactive file expansion and collapse
- Line-by-line change tracking

#### 2. **Multi-Mode Support**
- **Uncommitted Changes**: Shows current working directory changes
- **Commit Comparison**: Compare specific commits or commit ranges
- **Branch Comparison**: Compare current branch with target branch
- **Custom Diff**: User-defined diff parameters

#### 3. **Real-Time Streaming**
- Live git command output streaming
- Progress indicators during diff generation
- Terminal-style output with color coding
- Error handling and recovery

#### 4. **File Management**
- Automatic diff file creation and saving
- Integration with VS Code file system
- Diff file opening in editor
- Cleanup and deletion capabilities

### API Interface
```typescript
interface GitDiffConfig {
  mode: 'uncommitted' | 'commit' | 'branch' | 'custom';
  commits?: string[];
  branch?: string;
  includeBinary?: boolean;
  contextLines?: number;
}

interface DiffResult {
  content: string;
  files: string[];
  stats: {
    additions: number;
    deletions: number;
    files: number;
  };
}
```

### Integration Points
- **VscodeService**: Git operations and file management
- **Extension Backend**: Git command execution
- **File System**: Diff file storage and retrieval

## TEST Module - Test Execution

**Location**: `webview-ui/src/app/modules/test-selection/`
**Main Component**: `test-selector.component.ts`

### Purpose
Comprehensive NX workspace test execution with project management, affected test detection, and real-time output streaming.

### Key Features

#### 1. **NX Workspace Integration**
- Automatic project discovery and categorization
- Support for applications, libraries, and tools
- Project dependency graph analysis
- Workspace configuration parsing

#### 2. **Test Execution Modes**
- **Single Project**: Run tests for individual project
- **Multiple Projects**: Batch test execution across selected projects
- **Affected Tests**: Automatic detection of tests affected by changes
- **All Tests**: Comprehensive test suite execution

#### 3. **Project Management**
- Project grouping and organization
- Search and filtering capabilities
- Project status tracking (loading, ready, executing)
- Caching for improved performance

#### 4. **Real-Time Monitoring**
- Live test output streaming
- Progress tracking per project
- Execution time monitoring
- Success/failure status tracking

### API Interface
```typescript
interface ProjectInfo {
  name: string;
  type: 'application' | 'library' | 'tool';
  root: string;
  targets: string[];
  status: 'loading' | 'ready' | 'executing' | 'completed';
}

interface TestExecutionConfig {
  projects: string[];
  mode: 'single' | 'multiple' | 'affected' | 'all';
  watch?: boolean;
  coverage?: boolean;
  bail?: boolean;
}
```

### Integration Points
- **NX Workspace**: Project detection and test execution
- **VscodeService**: Command execution and output streaming
- **Extension Backend**: NX command orchestration

## AI DEBUG Module - AI-Powered Debugging

**Location**: `webview-ui/src/app/modules/ai-debug/`
**Main Component**: `ai-debug.component.ts`

### Purpose
Orchestrates AI-powered test debugging workflows using GitHub Copilot integration with comprehensive context gathering and analysis.

### Key Features

#### 1. **AI Workflow Orchestration**
- Multi-phase debugging process
- Context collection and preparation
- Test execution and failure analysis
- AI-powered solution generation

#### 2. **GitHub Copilot Integration**
- Copilot availability detection and diagnostics
- API-based analysis submission
- Fallback to clipboard mode when API unavailable
- Copilot Chat integration for interactive debugging

#### 3. **Context Management**
- File selection and context building
- Test result integration
- Git diff context inclusion
- Artifact file generation and management

#### 4. **Progress Tracking**
- Real-time phase progress indicators
- Terminal-style status updates
- Error handling and recovery options
- Detailed execution logs

### API Interface
```typescript
interface AIDebugWorkflow {
  phase: 'preparation' | 'execution' | 'analysis' | 'completion';
  status: 'pending' | 'running' | 'completed' | 'error';
  context: {
    files: string[];
    testResults: TestResult[];
    gitDiff: string;
  };
}

interface AIAnalysisResult {
  suggestions: string[];
  rootCause: string;
  fixes: CodeFix[];
  confidence: number;
}
```

### Integration Points
- **GitHub Copilot**: AI analysis and suggestions
- **VscodeService**: File operations and Copilot communication
- **Extension Backend**: Context collection and artifact management

## PR DESC Module - PR Description Generation

**Location**: `webview-ui/src/app/modules/pr-generator/`
**Main Component**: `pr-generator.component.ts`

### Purpose
Generates comprehensive PR descriptions using AI analysis with template support and external integration capabilities.

### Key Features

#### 1. **AI-Powered Generation**
- Intelligent analysis of code changes
- Context-aware description generation
- Template-based formatting
- Feature flag detection and documentation

#### 2. **Template System**
- Multiple predefined templates
- Customizable template structure
- Template validation and processing
- Dynamic content insertion

#### 3. **External Integrations**
- **Jira Integration**: Automatic ticket linking and validation
- **GitHub Integration**: PR metadata extraction
- **Custom Integrations**: Extensible integration framework

#### 4. **Content Management**
- Rich text editing capabilities
- Preview and review functionality
- Template file generation
- Export and sharing options

### API Interface
```typescript
interface PRDescriptionConfig {
  template: string;
  includeJira?: boolean;
  includeFeatureFlags?: boolean;
  customFields?: Record<string, any>;
}

interface PRDescription {
  title: string;
  summary: string;
  changes: string[];
  testingNotes: string;
  breakingChanges?: string[];
  relatedTickets?: string[];
}
```

### Integration Points
- **Jira API**: Ticket information retrieval
- **GitHub API**: PR metadata and context
- **VscodeService**: AI analysis and file operations

## File Selection Module - File Management

**Location**: `webview-ui/src/app/modules/file-selection/`
**Main Component**: `file-selector.component.ts`

### Purpose
Advanced file selection interface with Git integration for context gathering and diff generation across multiple selection modes.

### Key Features

#### 1. **Multi-Mode Selection**
- **Uncommitted Changes**: Current working directory files
- **Commit History**: Historical commit selection with diff preview
- **Branch Comparison**: Cross-branch file comparison
- **Custom Selection**: User-defined file sets

#### 2. **Git Integration**
- Real-time git status monitoring
- Interactive commit timeline
- Diff preview and visualization
- File status indicators (modified, added, deleted)

#### 3. **Selection Management**
- Multi-select capabilities with visual feedback
- Search and filtering across file lists
- Selection persistence across sessions
- Batch operations on selected files

#### 4. **Diff Generation**
- Live diff generation and display
- Multiple diff formats support
- File-specific diff viewing
- Export and sharing capabilities

### API Interface
```typescript
interface FileSelectionMode {
  type: 'uncommitted' | 'commits' | 'branch' | 'custom';
  config: {
    commits?: string[];
    branch?: string;
    paths?: string[];
  };
}

interface SelectedFile {
  path: string;
  status: 'modified' | 'added' | 'deleted' | 'renamed';
  changes: number;
  selected: boolean;
}
```

### Integration Points
- **Git CLI**: File status and diff operations
- **VscodeService**: File system operations
- **Extension Backend**: Git command execution

## Analysis Dashboard Module - System Analytics

**Location**: `webview-ui/src/app/modules/analysis-dashboard/`
**Main Component**: `analysis-dashboard.component.ts`

### Purpose
Comprehensive system analytics and diagnostics dashboard with AI analysis history and health monitoring capabilities.

### Key Features

#### 1. **System Diagnostics**
- Real-time system health monitoring
- GitHub Copilot availability checks
- Extension performance metrics
- Troubleshooting automation

#### 2. **Analysis History**
- Persistent analysis storage
- Historical trend analysis
- Analysis comparison tools
- Export and reporting capabilities

#### 3. **Multi-Format Export**
- JSON export for programmatic access
- CSV export for spreadsheet analysis
- PDF reports for documentation
- Custom format support

#### 4. **AI Integration**
- Direct Copilot Chat access
- Analysis submission optimization
- Intelligent diagnostic suggestions
- Performance optimization recommendations

### API Interface
```typescript
interface SystemDiagnostics {
  copilotStatus: 'available' | 'unavailable' | 'error';
  extensionHealth: 'healthy' | 'warning' | 'error';
  performance: {
    responseTime: number;
    memoryUsage: number;
    errorRate: number;
  };
}

interface AnalysisHistory {
  timestamp: Date;
  type: string;
  status: 'completed' | 'failed';
  duration: number;
  results: any;
}
```

### Integration Points
- **System APIs**: Performance and health monitoring
- **Storage APIs**: History persistence
- **GitHub Copilot**: Direct chat integration

## Prepare to Push Module - Code Quality

**Location**: `webview-ui/src/app/modules/prepare-to-push/`
**Main Component**: `prepare-to-push.component.ts`

### Purpose
Automated code quality validation pipeline with multi-step execution and comprehensive error reporting before code submission.

### Key Features

#### 1. **Quality Pipeline**
- Automated linting and formatting
- Test execution validation
- Build verification
- Security scanning

#### 2. **Multi-Project Support**
- Single project validation
- Multi-project batch processing
- Affected project detection
- Selective quality checks

#### 3. **Real-Time Feedback**
- Live execution progress tracking
- Detailed error reporting with context
- Actionable remediation suggestions
- Performance optimization recommendations

#### 4. **Integration Support**
- Pre-commit hook integration
- CI/CD pipeline preparation
- Custom quality rule definition
- External tool integration

### API Interface
```typescript
interface QualityPipeline {
  steps: QualityStep[];
  projects: string[];
  config: {
    strict?: boolean;
    autoFix?: boolean;
    skipTests?: boolean;
  };
}

interface QualityStep {
  name: string;
  status: 'pending' | 'running' | 'passed' | 'failed';
  duration: number;
  errors?: string[];
  warnings?: string[];
}
```

### Integration Points
- **Linting Tools**: ESLint, TSLint, Prettier
- **Test Runners**: Jest, Karma, Cypress
- **Build Tools**: Angular CLI, Webpack, NX
- **VscodeService**: Command execution and output streaming

---

## Module Integration Architecture

### Communication Flow
```
User Interface (Angular)
         ↓
    Module Components
         ↓
    VscodeService (Angular)
         ↓
    VS Code Message API
         ↓
    Extension Services (TypeScript)
         ↓
    External Tools (Git, NX, AI)
```

### Shared Dependencies
- **VscodeService**: Common service for VS Code communication
- **Terminal Styling**: Consistent UI theme across all modules
- **State Management**: Angular signals for reactive state
- **Error Handling**: Standardized error processing
- **Progress Tracking**: Common progress indication patterns

### Module Lifecycle
1. **Initialization**: Module registration and setup
2. **Activation**: User selection and configuration
3. **Execution**: Core functionality processing
4. **Monitoring**: Progress tracking and status updates
5. **Completion**: Results display and cleanup

Each module follows this consistent lifecycle while maintaining independence and extensibility for future enhancements.