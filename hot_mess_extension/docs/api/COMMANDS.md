# Commands API

## Overview
The AI Debug Utilities extension provides four main commands that can be executed through the UI or programmatically. Each command has specific parameters, return values, and output formats.

## Available Commands

### aiDebug
Complete debugging workflow with AI-optimized analysis.

**Command ID:** `aiDebugUtilities.runAiDebug`

**Description:** Orchestrates a complete debugging workflow by running tests, generating git diffs, and creating AI-ready analysis files.

**Parameters:**
```typescript
interface AiDebugOptions {
  project: string;           // NX project name
  focusAreas?: string[];     // Areas to focus analysis on
  includeCoverage?: boolean; // Include test coverage data
  generatePR?: boolean;      // Generate PR description
}
```

**Output Files:**
- `jest-output.md` - Formatted test results with failure analysis
- `git-diff.md` - Structured git changes analysis  
- `ai-debug-context.md` - Combined context for AI assistants
- `pr-description.md` - Generated pull request description

**Return Value:**
```typescript
interface CommandResult {
  success: boolean;
  duration: number;
  outputFiles: string[];
  summary: string;
  recommendations?: string[];
}
```

**Example Usage:**
```typescript
const result = await vscode.commands.executeCommand('aiDebugUtilities.runAiDebug', {
  project: 'my-app',
  focusAreas: ['tests', 'performance'],
  includeCoverage: true,
  generatePR: true
});
```

---

### nxTest
Execute NX tests with enhanced output parsing and insights.

**Command ID:** `aiDebugUtilities.runNxTest`

**Description:** Runs NX test command with enhanced output formatting, failure analysis, and performance insights.

**Parameters:**
```typescript
interface NxTestOptions {
  project: string;           // NX project name
  watchMode?: boolean;       // Run in watch mode
  coverage?: boolean;        // Generate coverage report
  testFile?: string;         // Specific test file to run
  jestArgs?: string[];       // Additional Jest arguments
}
```

**Output Files:**
- `jest-output.md` - Formatted test results
- `test-coverage.md` - Coverage report (if enabled)
- `test-performance.md` - Performance analysis

**Return Value:**
```typescript
interface TestResult extends CommandResult {
  testsRun: number;
  testsPassed: number;
  testsFailed: number;
  coverage?: CoverageData;
  failureDetails: TestFailure[];
}
```

**Example Usage:**
```typescript
const result = await vscode.commands.executeCommand('aiDebugUtilities.runNxTest', {
  project: 'my-lib',
  coverage: true,
  jestArgs: ['--verbose']
});
```

---

### gitDiff
Generate comprehensive git diff analysis for AI review.

**Command ID:** `aiDebugUtilities.runGitDiff`

**Description:** Analyzes git changes and generates structured diff output optimized for AI review and code analysis.

**Parameters:**
```typescript
interface GitDiffOptions {
  project?: string;          // Focus on specific project
  compareWith?: string;      // Branch/commit to compare with
  includeStaged?: boolean;   // Include staged changes
  includeUnstaged?: boolean; // Include unstaged changes
  fileTypes?: string[];      // Filter by file types
}
```

**Output Files:**
- `git-diff.md` - Structured diff analysis
- `change-summary.md` - High-level change summary
- `file-analysis.md` - Per-file change analysis

**Return Value:**
```typescript
interface GitDiffResult extends CommandResult {
  filesChanged: number;
  insertions: number;
  deletions: number;
  filesByType: Record<string, number>;
  changeCategories: ChangeCategory[];
}
```

**Example Usage:**
```typescript
const result = await vscode.commands.executeCommand('aiDebugUtilities.runGitDiff', {
  project: 'my-app',
  compareWith: 'main',
  includeStaged: true
});
```

---

### prepareToPush
Run comprehensive code quality checks before pushing.

**Command ID:** `aiDebugUtilities.runPrepareToPush`

**Description:** Executes linting, formatting, and code quality checks to ensure code is ready for commit/push.

**Parameters:**
```typescript
interface PrepareToPushOptions {
  project?: string;          // Focus on specific project
  autoFix?: boolean;         // Automatically fix issues where possible
  skipLinting?: boolean;     // Skip ESLint checks
  skipFormatting?: boolean;  // Skip Prettier formatting
  checkTypes?: boolean;      // Run TypeScript type checking
}
```

**Output Files:**
- `lint-results.md` - ESLint results and issues
- `format-results.md` - Prettier formatting results
- `quality-report.md` - Overall code quality report

**Return Value:**
```typescript
interface QualityCheckResult extends CommandResult {
  lintIssues: LintIssue[];
  formatIssues: FormatIssue[];
  typeErrors: TypeIssue[];
  fixedIssues: number;
  remainingIssues: number;
}
```

**Example Usage:**
```typescript
const result = await vscode.commands.executeCommand('aiDebugUtilities.runPrepareToPush', {
  project: 'my-app',
  autoFix: true,
  checkTypes: true
});
```

## Command Execution Status

### Status Types
```typescript
type CommandStatus = 'idle' | 'queued' | 'running' | 'success' | 'error' | 'cancelled';
```

### Progress Tracking
```typescript
interface CommandProgress {
  commandId: string;
  status: CommandStatus;
  progress: number;        // 0-100
  currentStep: string;
  totalSteps: number;
  currentStepIndex: number;
  elapsedTime: number;
  estimatedTimeRemaining?: number;
}
```

### Command Events
Commands emit events during execution that can be subscribed to:

```typescript
// Listen for command progress
vscode.commands.executeCommand('aiDebugUtilities.onCommandProgress', (progress: CommandProgress) => {
  console.log(`Command ${progress.commandId} is ${progress.progress}% complete`);
});

// Listen for command completion
vscode.commands.executeCommand('aiDebugUtilities.onCommandComplete', (result: CommandResult) => {
  console.log(`Command completed with status: ${result.success ? 'success' : 'failure'}`);
});

// Listen for streaming output
vscode.commands.executeCommand('aiDebugUtilities.onCommandOutput', (output: string) => {
  console.log('Command output:', output);
});
```

## Batch Operations

### Execute Multiple Commands
```typescript
interface BatchCommandOptions {
  commands: Array<{
    command: string;
    options: any;
  }>;
  sequential?: boolean;    // Run commands sequentially vs parallel
  stopOnError?: boolean;   // Stop batch if any command fails
}

const batchResult = await vscode.commands.executeCommand('aiDebugUtilities.runBatch', {
  commands: [
    { command: 'nxTest', options: { project: 'my-app' } },
    { command: 'gitDiff', options: { project: 'my-app' } },
    { command: 'prepareToPush', options: { project: 'my-app' } }
  ],
  sequential: true,
  stopOnError: false
});
```

## Command Cancellation

### Cancel Single Command
```typescript
// Cancel a specific command by ID
await vscode.commands.executeCommand('aiDebugUtilities.cancelCommand', commandId);
```

### Cancel All Commands
```typescript
// Cancel all running commands
await vscode.commands.executeCommand('aiDebugUtilities.cancelAllCommands');
```

## Output File Management

### File Operations
```typescript
// Open output file
await vscode.commands.executeCommand('aiDebugUtilities.openOutputFile', {
  type: 'jest-output',
  project: 'my-app'
});

// Get file content
const content = await vscode.commands.executeCommand('aiDebugUtilities.getFileContent', {
  type: 'git-diff',
  project: 'my-app'
});

// Save custom output
await vscode.commands.executeCommand('aiDebugUtilities.saveOutput', {
  type: 'custom-analysis',
  content: 'My analysis...',
  project: 'my-app'
});
```

### File Types
```typescript
type OutputType = 
  | 'jest-output'
  | 'git-diff' 
  | 'ai-debug-context'
  | 'pr-description'
  | 'lint-results'
  | 'format-results'
  | 'quality-report'
  | 'test-coverage'
  | 'test-performance'
  | 'change-summary'
  | 'file-analysis'
  | 'custom-analysis';
```

## Configuration API

### Get Configuration
```typescript
const config = await vscode.commands.executeCommand('aiDebugUtilities.getConfiguration');
```

### Update Configuration
```typescript
await vscode.commands.executeCommand('aiDebugUtilities.updateConfiguration', {
  'aiDebugUtilities.outputDirectory': './my-output',
  'aiDebugUtilities.autoBackup': true
});
```

## Project Management

### Get Available Projects
```typescript
const projects = await vscode.commands.executeCommand('aiDebugUtilities.getProjects');
```

### Set Current Project
```typescript
await vscode.commands.executeCommand('aiDebugUtilities.setCurrentProject', 'my-app');
```

### Refresh Project List
```typescript
await vscode.commands.executeCommand('aiDebugUtilities.refreshProjects');
```

## Analytics and Reporting

### Get Command History
```typescript
const history = await vscode.commands.executeCommand('aiDebugUtilities.getCommandHistory', {
  limit: 50,
  project?: 'my-app',
  dateRange?: { start: Date, end: Date }
});
```

### Get Performance Metrics
```typescript
const metrics = await vscode.commands.executeCommand('aiDebugUtilities.getPerformanceMetrics');
```

### Export Analytics Data
```typescript
const analyticsData = await vscode.commands.executeCommand('aiDebugUtilities.exportAnalytics', {
  format: 'json' | 'csv',
  includeHistory: boolean,
  includeMetrics: boolean
});
```

## Error Handling

### Error Types
```typescript
interface CommandError {
  code: string;
  message: string;
  details?: any;
  stack?: string;
  recoverable: boolean;
}

// Common error codes
type ErrorCode = 
  | 'PROJECT_NOT_FOUND'
  | 'COMMAND_FAILED'
  | 'PERMISSION_DENIED'
  | 'TIMEOUT'
  | 'NETWORK_ERROR'
  | 'VALIDATION_ERROR'
  | 'CONFIGURATION_ERROR';
```

### Error Recovery
```typescript
try {
  const result = await vscode.commands.executeCommand('aiDebugUtilities.runAiDebug', options);
} catch (error) {
  if (error.recoverable) {
    // Attempt recovery
    const retryResult = await vscode.commands.executeCommand('aiDebugUtilities.retryCommand', {
      commandId: error.commandId,
      options: error.originalOptions
    });
  }
}
```

## Extension Events

### Subscribe to Events
```typescript
// Extension ready
vscode.commands.executeCommand('aiDebugUtilities.onReady', () => {
  console.log('AI Debug Utilities extension is ready');
});

// Project changed
vscode.commands.executeCommand('aiDebugUtilities.onProjectChanged', (project: string) => {
  console.log('Current project changed to:', project);
});

// Configuration changed
vscode.commands.executeCommand('aiDebugUtilities.onConfigurationChanged', (config: any) => {
  console.log('Configuration updated:', config);
});
```

## Integration Examples

### Custom Command Integration
```typescript
// Register a custom command that uses AI Debug Utilities
vscode.commands.registerCommand('myExtension.customDebug', async () => {
  // Run AI Debug analysis
  const debugResult = await vscode.commands.executeCommand('aiDebugUtilities.runAiDebug', {
    project: 'my-app',
    focusAreas: ['tests', 'performance']
  });
  
  // Process results in custom way
  if (debugResult.success) {
    const aiContext = await vscode.commands.executeCommand('aiDebugUtilities.getFileContent', {
      type: 'ai-debug-context',
      project: 'my-app'
    });
    
    // Send to custom AI service
    await sendToCustomAI(aiContext);
  }
});
```

### Task Integration
```typescript
// Create VSCode task that runs AI Debug
const task = new vscode.Task(
  { type: 'ai-debug' },
  vscode.TaskScope.Workspace,
  'AI Debug Analysis',
  'ai-debug-utilities',
  new vscode.ShellExecution('echo', ['Running AI Debug...'])
);

// Override task execution to use extension
task.execution = {
  execute: async () => {
    return await vscode.commands.executeCommand('aiDebugUtilities.runAiDebug', {
      project: 'my-app'
    });
  }
};
```

## TypeScript Definitions

For full TypeScript support, import the extension's type definitions:

```typescript
import { 
  CommandResult,
  CommandProgress,
  AiDebugOptions,
  NxTestOptions,
  GitDiffOptions,
  PrepareToPushOptions,
  OutputType,
  CommandStatus
} from 'ai-debug-utilities';
```

## Versioning

The API follows semantic versioning. Check the extension version before using newer features:

```typescript
const version = await vscode.commands.executeCommand('aiDebugUtilities.getVersion');
if (version >= '1.2.0') {
  // Use newer API features
}
```
