# 🔧 Phase 2.1 API Reference

## 📋 Table of Contents
- [TestOutputCapture API](#testoutputcapture-api)
- [GitDiffCapture API](#gitdiffcapture-api)
- [ContextCompiler API](#contextcompiler-api)
- [Integration Workflows](#integration-workflows)
- [Error Handling](#error-handling)
- [Examples](#examples)

---

## 📊 TestOutputCapture API

### Class: `TestOutputCapture`

Captures and processes Jest test output into AI-optimized reports matching legacy `nxTest.zsh` format.

#### Constructor

```typescript
constructor(options: TestOutputOptions)
```

**Parameters:**
- `options: TestOutputOptions` - Configuration object

```typescript
interface TestOutputOptions {
  workspaceRoot: string;        // Absolute path to workspace
  outputChannel: vscode.OutputChannel;  // VS Code output channel
}
```

#### Methods

##### `startCapture(command: string, project?: string): void`

Initializes test output capture session.

**Parameters:**
- `command: string` - Test command being executed (e.g., "yarn nx test my-project")
- `project?: string` - Optional project name for context

**Example:**
```typescript
testCapture.startCapture('yarn nx test settings-voice-assist-feature', 'settings-voice-assist-feature');
```

##### `appendOutput(line: string): void`

Appends a line of test output to the capture buffer.

**Parameters:**
- `line: string` - Single line of test output

**Features:**
- Automatic ANSI code stripping
- Incremental processing
- Memory-efficient buffering

**Example:**
```typescript
testCapture.appendOutput('Test Suites: 2 failed, 4 passed, 6 total');
testCapture.appendOutput('FAIL src/app/component.spec.ts');
```

##### `stopCapture(exitCode: number, summary?: any): Promise<boolean>`

Finalizes capture and generates AI-optimized report.

**Parameters:**
- `exitCode: number` - Test process exit code (0 = success, non-zero = failure)
- `summary?: any` - Optional additional test summary data

**Returns:**
- `Promise<boolean>` - True if file was successfully written

**Generated Sections:**
- 🤖 Test Analysis Report header
- 📊 Executive Summary with statistics
- 💥 Failure Analysis (if tests failed)
- 🧪 Test Results Summary
- ⚡ Performance Insights

**Example:**
```typescript
const success = await testCapture.stopCapture(1, { failedTests: 3 });
if (success) {
  console.log('Test report generated successfully');
}
```

##### `outputExists(): Promise<boolean>`

Checks if test output file exists.

**Returns:**
- `Promise<boolean>` - True if file exists

##### `getOutputFilePath(): string`

Returns the full path to the test output file.

**Returns:**
- `string` - Absolute path to `test-output.txt`

##### `clearOutput(): Promise<void>`

Removes the test output file.

**Example:**
```typescript
await testCapture.clearOutput();
```

##### `getCapturedOutput(): string`

Returns the current captured output as a string.

**Returns:**
- `string` - Raw captured output

---

## 🔍 GitDiffCapture API

### Class: `GitDiffCapture`

Captures git changes with intelligent detection logic matching `gitDiff.zsh` behavior.

#### Constructor

```typescript
constructor(options: GitDiffOptions)
```

**Parameters:**
- `options: GitDiffOptions` - Configuration object

```typescript
interface GitDiffOptions {
  workspaceRoot: string;        // Absolute path to workspace
  outputChannel: vscode.OutputChannel;  // VS Code output channel
}
```

#### Methods

##### `captureDiff(): Promise<boolean>`

Captures git diff using smart detection logic.

**Returns:**
- `Promise<boolean>` - True if diff was successfully captured

**Smart Detection Priority:**
1. **Unstaged changes** → `git diff`
2. **Staged changes** → `git diff --cached`
3. **Last commit** → `git diff HEAD~1..HEAD`

**Generated Sections:**
- 🔍 AI-Optimized Git Diff Analysis header
- 📊 Change Summary with file counts
- 🏷️ File Type Analysis
- 📋 Detailed Changes with file markers
- 🤖 AI Analysis Context

**Example:**
```typescript
const success = await gitCapture.captureDiff();
if (success) {
  console.log('Git diff captured and formatted');
}
```

##### `diffExists(): Promise<boolean>`

Checks if diff file exists.

**Returns:**
- `Promise<boolean>` - True if file exists

##### `getDiffFilePath(): string`

Returns the full path to the diff file.

**Returns:**
- `string` - Absolute path to `diff.txt`

##### `clearDiff(): Promise<void>`

Removes the diff file.

**Example:**
```typescript
await gitCapture.clearDiff();
```

---

## 🤖 ContextCompiler API

### Class: `ContextCompiler`

Compiles test output and git diff into comprehensive AI context files matching `aiDebug.zsh` format.

#### Constructor

```typescript
constructor(options: ContextCompilerOptions)
```

**Parameters:**
- `options: ContextCompilerOptions` - Configuration object

```typescript
interface ContextCompilerOptions {
  workspaceRoot: string;        // Absolute path to workspace
  outputChannel: vscode.OutputChannel;  // VS Code output channel
}
```

#### Types

```typescript
type ContextType = 'debug' | 'new-tests' | 'pr-description';
```

#### Methods

##### `compileContext(type: ContextType, testPassed: boolean): Promise<string | null>`

Compiles comprehensive AI context from available input files.

**Parameters:**
- `type: ContextType` - Type of analysis context to generate
- `testPassed: boolean` - Whether tests are currently passing

**Returns:**
- `Promise<string | null>` - Compiled context string, or null if compilation failed

**Context Types:**

**`debug`** - General debugging analysis
- Root cause analysis for failures
- Concrete fix recommendations
- Implementation guidance

**`new-tests`** - Test coverage analysis
- Missing test coverage identification
- Edge case recommendations
- Test improvement suggestions

**`pr-description`** - Pull request documentation
- Change summary generation
- Impact assessment
- Review checklist

**Generated Sections:**
- 🤖 AI Debug Context header with project info
- 🎯 Analysis Request with context-specific prompts
- 🧪 Test Results Analysis
- 🔧 Code Quality Results
- 📋 Code Changes Analysis
- 🚀 AI Assistant Guidance

**Example:**
```typescript
const context = await compiler.compileContext('debug', false);
if (context) {
  console.log('AI context generated successfully');
  console.log(`Context size: ${context.length} characters`);
}
```

##### `copyToClipboard(context: string): Promise<boolean>`

Copies generated context to system clipboard.

**Parameters:**
- `context: string` - Context string to copy

**Returns:**
- `Promise<boolean>` - True if successfully copied

**Example:**
```typescript
const context = await compiler.compileContext('debug', false);
if (context) {
  const copied = await compiler.copyToClipboard(context);
  if (copied) {
    console.log('Context copied to clipboard');
  }
}
```

##### `clearContext(): Promise<void>`

Removes all context-related files.

**Files Cleared:**
- `ai_debug_context.txt`
- `diff.txt`
- `test-output.txt`

**Example:**
```typescript
await compiler.clearContext();
```

---

## 🔄 Integration Workflows

### Complete Test and Analysis Workflow

```typescript
async function runCompleteAnalysis(
  workspaceRoot: string,
  testCommand: string,
  project?: string
): Promise<string | null> {
  const outputChannel = vscode.window.createOutputChannel('AI Debug Context');
  const options = { workspaceRoot, outputChannel };
  
  // Initialize services
  const testCapture = new TestOutputCapture(options);
  const gitCapture = new GitDiffCapture(options);
  const compiler = new ContextCompiler(options);
  
  try {
    // Step 1: Capture git diff
    outputChannel.appendLine('📝 Capturing git changes...');
    await gitCapture.captureDiff();
    
    // Step 2: Run tests with capture
    outputChannel.appendLine('🧪 Running tests...');
    testCapture.startCapture(testCommand, project);
    
    const testResult = await runTestCommand(testCommand, (line) => {
      testCapture.appendOutput(line);
    });
    
    const testSuccess = await testCapture.stopCapture(testResult.exitCode);
    
    // Step 3: Compile AI context
    outputChannel.appendLine('🤖 Compiling AI context...');
    const context = await compiler.compileContext('debug', testResult.exitCode === 0);
    
    if (context) {
      outputChannel.appendLine('✅ Analysis complete!');
      return context;
    } else {
      outputChannel.appendLine('❌ Failed to compile context');
      return null;
    }
    
  } catch (error) {
    outputChannel.appendLine(`❌ Workflow error: ${error}`);
    return null;
  }
}
```

### Copilot Integration Workflow

```typescript
async function debugWithCopilot(
  workspaceRoot: string,
  testCommand: string,
  project?: string
): Promise<void> {
  const context = await runCompleteAnalysis(workspaceRoot, testCommand, project);
  
  if (context) {
    // Copy to clipboard for manual pasting
    await vscode.env.clipboard.writeText(context);
    
    // Try to open Copilot Chat
    try {
      await vscode.commands.executeCommand('workbench.action.chat.open', {
        query: context
      });
    } catch (error) {
      // Fallback: show message with clipboard status
      vscode.window.showInformationMessage(
        'AI context copied to clipboard. Open Copilot Chat and paste for analysis.',
        'Open Copilot Chat'
      ).then((selection) => {
        if (selection === 'Open Copilot Chat') {
          vscode.commands.executeCommand('workbench.action.chat.open');
        }
      });
    }
  }
}
```

### Selective Analysis Workflow

```typescript
async function analyzeSpecificAspect(
  workspaceRoot: string,
  analysisType: ContextType,
  includeTests: boolean = true,
  includeDiff: boolean = true
): Promise<string | null> {
  const outputChannel = vscode.window.createOutputChannel('AI Debug Context');
  const options = { workspaceRoot, outputChannel };
  
  const compiler = new ContextCompiler(options);
  
  // Optionally skip test or diff capture based on parameters
  if (includeDiff) {
    const gitCapture = new GitDiffCapture(options);
    await gitCapture.captureDiff();
  }
  
  if (includeTests) {
    // Assume tests have been run previously
    const testCapture = new TestOutputCapture(options);
    const testOutputExists = await testCapture.outputExists();
    
    if (!testOutputExists) {
      outputChannel.appendLine('⚠️ No test output found. Run tests first.');
      return null;
    }
  }
  
  return await compiler.compileContext(analysisType, true);
}
```

---

## ❌ Error Handling

### Common Error Patterns

#### File System Errors

```typescript
try {
  await testCapture.stopCapture(exitCode);
} catch (error) {
  if (error.code === 'EACCES') {
    outputChannel.appendLine('❌ Permission denied. Check file permissions.');
  } else if (error.code === 'ENOSPC') {
    outputChannel.appendLine('❌ No space left on device.');
  } else {
    outputChannel.appendLine(`❌ File system error: ${error.message}`);
  }
  return false;
}
```

#### Git Command Errors

```typescript
try {
  await gitCapture.captureDiff();
} catch (error) {
  if (error.message.includes('not a git repository')) {
    outputChannel.appendLine('⚠️ Not in a git repository. Initialize git first.');
  } else if (error.message.includes('Permission denied')) {
    outputChannel.appendLine('❌ Git permission error. Check repository access.');
  } else {
    outputChannel.appendLine(`❌ Git error: ${error.message}`);
  }
  return false;
}
```

#### Context Compilation Errors

```typescript
const context = await compiler.compileContext('debug', testPassed);
if (!context) {
  outputChannel.appendLine('❌ Failed to compile context. Check input files.');
  
  // Diagnostic information
  const testCapture = new TestOutputCapture(options);
  const gitCapture = new GitDiffCapture(options);
  
  const testExists = await testCapture.outputExists();
  const diffExists = await gitCapture.diffExists();
  
  outputChannel.appendLine(`Test output exists: ${testExists}`);
  outputChannel.appendLine(`Diff exists: ${diffExists}`);
  
  return null;
}
```

### Error Recovery Strategies

#### Graceful Degradation

```typescript
async function captureWithFallback(
  testCapture: TestOutputCapture,
  gitCapture: GitDiffCapture,
  compiler: ContextCompiler
): Promise<string | null> {
  let hasTestOutput = false;
  let hasDiff = false;
  
  // Try to capture test output
  try {
    await testCapture.stopCapture(exitCode);
    hasTestOutput = await testCapture.outputExists();
  } catch (error) {
    outputChannel.appendLine(`⚠️ Test output capture failed: ${error.message}`);
  }
  
  // Try to capture diff
  try {
    await gitCapture.captureDiff();
    hasDiff = await gitCapture.diffExists();
  } catch (error) {
    outputChannel.appendLine(`⚠️ Git diff capture failed: ${error.message}`);
  }
  
  // Compile with available data
  if (hasTestOutput || hasDiff) {
    return await compiler.compileContext('debug', exitCode === 0);
  } else {
    outputChannel.appendLine('❌ No input data available for context compilation');
    return null;
  }
}
```

#### Retry Logic

```typescript
async function captureWithRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T | null> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === maxRetries) {
        outputChannel.appendLine(`❌ Operation failed after ${maxRetries} attempts: ${error.message}`);
        return null;
      }
      
      outputChannel.appendLine(`⚠️ Attempt ${attempt} failed, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  return null;
}

// Usage
const result = await captureWithRetry(async () => {
  return await gitCapture.captureDiff();
});
```

---

## 💡 Examples

### Basic Usage

```typescript
import { TestOutputCapture, GitDiffCapture, ContextCompiler } from './modules';

async function basicExample() {
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
  const outputChannel = vscode.window.createOutputChannel('AI Debug Context');
  const options = { workspaceRoot, outputChannel };
  
  // Create instances
  const testCapture = new TestOutputCapture(options);
  const gitCapture = new GitDiffCapture(options);
  const compiler = new ContextCompiler(options);
  
  // Capture git diff
  await gitCapture.captureDiff();
  
  // Simulate test run
  testCapture.startCapture('yarn nx test my-project', 'my-project');
  testCapture.appendOutput('Test Suites: 1 failed, 2 passed, 3 total');
  testCapture.appendOutput('Tests: 5 failed, 25 passed, 30 total');
  await testCapture.stopCapture(1);
  
  // Compile context
  const context = await compiler.compileContext('debug', false);
  
  if (context) {
    // Copy to clipboard
    await compiler.copyToClipboard(context);
    console.log('Context generated and copied to clipboard');
  }
}
```

### Advanced Integration

```typescript
import { ServiceContainer } from './core/ServiceContainer';

class AIDebugService {
  constructor(private container: ServiceContainer) {}
  
  async runIntelligentAnalysis(testCommand: string, project?: string): Promise<void> {
    const testCapture = this.container.get<TestOutputCapture>('testOutputCapture');
    const gitCapture = this.container.get<GitDiffCapture>('gitCapture');
    const compiler = this.container.get<ContextCompiler>('contextCompiler');
    const outputChannel = this.container.get<vscode.OutputChannel>('outputChannel');
    
    try {
      // Pre-analysis checks
      outputChannel.appendLine('🔍 Starting intelligent analysis...');
      
      // Check git repository status
      const isGitRepo = await this.checkGitRepository();
      if (!isGitRepo) {
        outputChannel.appendLine('⚠️ Not a git repository. Some features will be limited.');
      }
      
      // Capture current state
      if (isGitRepo) {
        outputChannel.appendLine('📝 Capturing git changes...');
        const diffCaptured = await gitCapture.captureDiff();
        if (diffCaptured) {
          outputChannel.appendLine('✅ Git diff captured successfully');
        }
      }
      
      // Run tests with real-time capture
      outputChannel.appendLine('🧪 Running tests with intelligent capture...');
      await this.runTestsWithCapture(testCapture, testCommand, project);
      
      // Analyze test results
      const testOutputExists = await testCapture.outputExists();
      if (testOutputExists) {
        outputChannel.appendLine('📊 Test output captured successfully');
      }
      
      // Compile comprehensive context
      outputChannel.appendLine('🤖 Compiling AI context...');
      const testPassed = await this.determineTestStatus();
      const context = await compiler.compileContext('debug', testPassed);
      
      if (context) {
        outputChannel.appendLine('✅ Analysis complete!');
        
        // Show options to user
        const action = await vscode.window.showInformationMessage(
          'AI context generated successfully. What would you like to do?',
          'Copy to Clipboard',
          'Open in Copilot',
          'Save to File',
          'View Results'
        );
        
        await this.handleUserAction(action, context, compiler);
      } else {
        outputChannel.appendLine('❌ Failed to generate AI context');
      }
      
    } catch (error) {
      outputChannel.appendLine(`❌ Analysis failed: ${error.message}`);
      
      // Show error recovery options
      const recovery = await vscode.window.showErrorMessage(
        'Analysis failed. Would you like to try recovery options?',
        'Retry Analysis',
        'View Logs',
        'Clear Cache'
      );
      
      await this.handleRecovery(recovery);
    }
  }
  
  private async runTestsWithCapture(
    testCapture: TestOutputCapture,
    command: string,
    project?: string
  ): Promise<void> {
    testCapture.startCapture(command, project);
    
    // Execute test command and stream output
    const testProcess = spawn('yarn', ['nx', 'test', project || ''], {
      cwd: this.container.get<string>('workspaceRoot'),
      stdio: 'pipe'
    });
    
    testProcess.stdout.on('data', (data) => {
      const lines = data.toString().split('\n');
      lines.forEach(line => {
        if (line.trim()) {
          testCapture.appendOutput(line);
        }
      });
    });
    
    return new Promise((resolve, reject) => {
      testProcess.on('close', async (code) => {
        try {
          await testCapture.stopCapture(code || 0);
          resolve();
        } catch (error) {
          reject(error);
        }
      });
      
      testProcess.on('error', reject);
    });
  }
  
  private async handleUserAction(
    action: string | undefined,
    context: string,
    compiler: ContextCompiler
  ): Promise<void> {
    switch (action) {
      case 'Copy to Clipboard':
        await compiler.copyToClipboard(context);
        vscode.window.showInformationMessage('Context copied to clipboard');
        break;
        
      case 'Open in Copilot':
        try {
          await vscode.commands.executeCommand('workbench.action.chat.open', {
            query: context
          });
        } catch (error) {
          await compiler.copyToClipboard(context);
          vscode.window.showInformationMessage(
            'Copilot not available. Context copied to clipboard.'
          );
        }
        break;
        
      case 'Save to File':
        const uri = await vscode.window.showSaveDialog({
          defaultUri: vscode.Uri.file('ai_debug_context.txt'),
          filters: { 'Text files': ['txt'] }
        });
        
        if (uri) {
          await vscode.workspace.fs.writeFile(uri, Buffer.from(context, 'utf8'));
          vscode.window.showInformationMessage('Context saved to file');
        }
        break;
        
      case 'View Results':
        const document = await vscode.workspace.openTextDocument({
          content: context,
          language: 'markdown'
        });
        await vscode.window.showTextDocument(document);
        break;
    }
  }
}
```

This comprehensive API reference provides all the necessary information for integrating and using the Phase 2.1 modules effectively.