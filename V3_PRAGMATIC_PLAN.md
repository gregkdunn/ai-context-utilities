# AI Debug Context V3: Pragmatic Implementation Plan

## 🎯 **CORE MISSION**
**Reduce test-fix-test cycle time from 60-120 seconds to <10 seconds**

## 🏗️ **ARCHITECTURE FOUNDATION**
**Shell-First Design**: Universal shell scripts (bash/zsh/fish) with VSCode as optional UI layer

### **Why Shell-First**
- **Universal**: Works in any terminal, any platform, any IDE
- **Fast**: No TypeScript compilation, no complex dependencies
- **Reliable**: Shell scripts are battle-tested, process spawning is simple
- **Extensible**: VSCode extension becomes thin wrapper over shell commands
- **Maintainable**: Single implementation, multiple interfaces

## 🚨 **KEY INSIGHTS FROM BRUTAL REVIEW**
1. **Current bottleneck**: Test execution time, not project discovery
2. **Real need**: Fast, reliable test feedback, not elaborate AI
3. **User reality**: Developers want simple tools that work, not complex architectures
4. **Success metric**: Actual time savings, not feature completeness
5. **Architecture insight**: Shell scripts + thin UI layer = 90% less code to maintain

---

## 📋 **PHASE 1: SHELL SCRIPT FOUNDATION (2 weeks)**
**Goal**: 80% reduction in test-fix-test cycle time with universal shell scripts

## 📝 **CODE QUALITY REQUIREMENTS**

### **Shell Script Testing**
- **Functional tests** for all shell script commands
- **Cross-shell compatibility** testing (bash/zsh/fish)
- **Error handling** validation for all edge cases
- **Performance benchmarks** for speed improvements

### **VSCode Extension Testing**
- **95% Branch Coverage**: All TypeScript code paths tested
- **Integration tests**: VSCode ↔ shell script communication
- **CI/CD Integration**: Tests run automatically on every commit

---

### **Week 1: Core Shell Scripts**

#### **Day 1-3: Affected Test Detection Script**
```bash
#!/usr/bin/env bash
# ai-debug-affected-tests - Detect and run only changed test files

# POSIX-compatible core function
get_changed_files() {
    # Get changed files from git
    git diff --name-only HEAD 2>/dev/null || {
        echo "Error: Not a git repository or git command failed" >&2
        return 1
    }
}

get_affected_tests() {
    local changed_files="$1"
    
    # Map source files to test files
    echo "$changed_files" | while IFS= read -r file; do
        if [[ "$file" == *.ts && "$file" != *.spec.ts ]]; then
            test_file="${file%.ts}.spec.ts"
            if [[ -f "$test_file" ]]; then
                echo "$test_file"
            fi
        fi
    done
}

run_affected_tests() {
    local test_files="$1"
    local test_count
    test_count=$(echo "$test_files" | wc -l)
    
    if [[ -z "$test_files" || "$test_count" -eq 0 ]]; then
        echo "No affected tests found"
        return 0
    fi
    
    echo "Running $test_count affected test files..."
    echo "$test_files" | xargs npx jest --passWithNoTests
}

# Main execution
main() {
    local changed_files test_files
    
    changed_files=$(get_changed_files) || return 1
    test_files=$(get_affected_tests "$changed_files")
    run_affected_tests "$test_files"
}

# Run if executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
```

**Success Metric**: Test execution time < 10 seconds for typical changes

**🧪 Testing Requirements**:
- Functional tests in `tests/shell/affected-tests.bats`
- Cross-shell compatibility (bash 4+, zsh 5+, fish 3+)
- Error handling for git failures, missing files, invalid projects

#### **Day 4-5: Parallel Test Execution Script**
```bash
#!/usr/bin/env bash
# ai-debug-parallel-tests - Run tests in parallel for speed

# Determine optimal concurrency based on system
get_optimal_concurrency() {
    local cpu_count
    
    # Cross-platform CPU detection
    if command -v nproc >/dev/null 2>&1; then
        cpu_count=$(nproc)
    elif [[ -f /proc/cpuinfo ]]; then
        cpu_count=$(grep -c ^processor /proc/cpuinfo)
    elif command -v sysctl >/dev/null 2>&1; then
        cpu_count=$(sysctl -n hw.ncpu 2>/dev/null || echo "4")
    else
        cpu_count=4  # Safe default
    fi
    
    # Use half of available cores, minimum 2, maximum 8
    local concurrency=$((cpu_count / 2))
    [[ $concurrency -lt 2 ]] && concurrency=2
    [[ $concurrency -gt 8 ]] && concurrency=8
    
    echo "$concurrency"
}

# Split test files into chunks for parallel execution
chunk_test_files() {
    local test_files="$1"
    local chunk_count="$2"
    local chunk_size
    local file_count
    
    file_count=$(echo "$test_files" | wc -l)
    chunk_size=$(( (file_count + chunk_count - 1) / chunk_count ))
    
    echo "$test_files" | split -l "$chunk_size" - chunk_
}

# Run a chunk of tests
run_test_chunk() {
    local chunk_file="$1"
    local chunk_id="$2"
    
    if [[ ! -f "$chunk_file" ]]; then
        return 0
    fi
    
    echo "Starting test chunk $chunk_id..."
    
    # Run Jest with the test files in this chunk
    cat "$chunk_file" | xargs npx jest \
        --json \
        --outputFile="test_results_chunk_${chunk_id}.json" \
        --passWithNoTests \
        --silent
    
    echo "Completed test chunk $chunk_id"
}

# Main parallel execution
run_tests_parallel() {
    local test_files="$1"
    local concurrency
    local chunk_files
    local pids=()
    
    if [[ -z "$test_files" ]]; then
        echo "No test files to run"
        return 0
    fi
    
    concurrency=$(get_optimal_concurrency)
    echo "Running tests with concurrency: $concurrency"
    
    # Create chunks
    chunk_test_files "$test_files" "$concurrency"
    
    # Start parallel execution
    local chunk_id=0
    for chunk_file in chunk_*; do
        if [[ -f "$chunk_file" ]]; then
            run_test_chunk "$chunk_file" "$chunk_id" &
            pids+=($!)
            ((chunk_id++))
        fi
    done
    
    # Wait for all chunks to complete
    for pid in "${pids[@]}"; do
        wait "$pid"
    done
    
    # Cleanup chunk files
    rm -f chunk_*
    
    # Aggregate results
    echo "All test chunks completed"
}

# Main execution
main() {
    local test_files="$1"
    
    if [[ -z "$test_files" ]]; then
        echo "Usage: $0 <test_files>"
        echo "Example: echo 'test1.spec.ts test2.spec.ts' | $0"
        return 1
    fi
    
    run_tests_parallel "$test_files"
}

# Run if executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    if [[ $# -eq 0 ]]; then
        # Read from stdin if no arguments
        test_files=$(cat)
    else
        test_files="$*"
    fi
    main "$test_files"
fi
```

**Success Metric**: 5-10x speed improvement over full test suite

**🧪 Testing Requirements**:
- Performance tests comparing serial vs parallel execution
- Cross-shell compatibility testing
- Resource usage validation (CPU, memory limits)

### **Week 2: Real-Time Feedback & Integration**

#### **Day 6-8: File Watching Script**
```bash
#!/usr/bin/env bash
# ai-debug-watch - Real-time test execution on file changes

# Cross-platform file watching
setup_file_watcher() {
    local watch_dir="${1:-.}"
    local debounce_time="${2:-2}"
    
    # Detect available file watching tool
    if command -v inotifywait >/dev/null 2>&1; then
        # Linux - inotify-tools
        watch_with_inotify "$watch_dir" "$debounce_time"
    elif command -v fswatch >/dev/null 2>&1; then
        # macOS/BSD - fswatch
        watch_with_fswatch "$watch_dir" "$debounce_time"
    else
        # Fallback - polling
        watch_with_polling "$watch_dir" "$debounce_time"
    fi
}

# Linux file watching
watch_with_inotify() {
    local watch_dir="$1"
    local debounce_time="$2"
    
    echo "Watching for file changes in $watch_dir (using inotify)..."
    
    inotifywait -m -r -e modify,create,delete \
        --include '\.(ts|js)$' \
        --exclude '\.spec\.(ts|js)$' \
        "$watch_dir" 2>/dev/null | while read path action file; do
        
        handle_file_change "$path$file" "$debounce_time"
    done
}

# macOS file watching
watch_with_fswatch() {
    local watch_dir="$1" 
    local debounce_time="$2"
    
    echo "Watching for file changes in $watch_dir (using fswatch)..."
    
    fswatch -r "$watch_dir" \
        --include='\.(ts|js)$' \
        --exclude='\.spec\.(ts|js)$' | while read file; do
        
        handle_file_change "$file" "$debounce_time"
    done
}

# Fallback polling
watch_with_polling() {
    local watch_dir="$1"
    local debounce_time="$2"
    local last_check
    
    echo "Watching for file changes in $watch_dir (using polling)..."
    last_check=$(date +%s)
    
    while true; do
        # Find recently modified files
        find "$watch_dir" -name "*.ts" -not -name "*.spec.ts" \
            -newer "/tmp/last_check_$$" 2>/dev/null | while read file; do
            handle_file_change "$file" "$debounce_time"
        done
        
        touch "/tmp/last_check_$$"
        sleep "$debounce_time"
    done
}

# Handle file change with debouncing
handle_file_change() {
    local changed_file="$1"
    local debounce_time="$2"
    local lockfile="/tmp/ai_debug_watch_$$.lock"
    
    # Simple debouncing with lockfile
    if [[ -f "$lockfile" ]]; then
        return 0
    fi
    
    echo "File changed: $changed_file"
    touch "$lockfile"
    
    # Wait for debounce period
    sleep "$debounce_time"
    
    # Run affected tests
    if [[ -f "$changed_file" ]]; then
        echo "$changed_file" | ./ai-debug-affected-tests
    fi
    
    rm -f "$lockfile"
}

# Main execution
main() {
    local watch_dir="${1:-.}"
    local debounce_time="${2:-2}"
    
    if [[ ! -d "$watch_dir" ]]; then
        echo "Error: Directory '$watch_dir' does not exist" >&2
        return 1
    fi
    
    echo "Starting AI Debug file watcher..."
    echo "Directory: $watch_dir"
    echo "Debounce: ${debounce_time}s"
    echo "Press Ctrl+C to stop"
    
    setup_file_watcher "$watch_dir" "$debounce_time"
}

# Cleanup on exit
cleanup() {
    echo -e "\nStopping file watcher..."
    rm -f /tmp/ai_debug_watch_$$.lock
    rm -f /tmp/last_check_$$
    exit 0
}

trap cleanup INT TERM

# Run if executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
```

**Success Metric**: Test results appear <2 seconds after file save

**🧪 Testing Requirements**:
- Cross-platform compatibility (Linux, macOS, Windows/WSL)
- File watching accuracy and debouncing
- Resource usage validation during continuous watching

#### **Day 9-10: VSCode Extension Bridge**
```typescript
// VSCode extension that calls shell scripts - thin wrapper only
import { spawn, ChildProcess } from 'child_process';
import * as vscode from 'vscode';

/**
 * Shell script executor for AI Debug Context commands
 */
export class ShellScriptBridge {
  private workspaceRoot: string;
  private currentProcess: ChildProcess | null = null;

  constructor() {
    this.workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
  }

  /**
   * Execute affected tests using shell script
   */
  async runAffectedTests(): Promise<void> {
    return this.executeScript('./scripts/ai-debug-affected-tests');
  }

  /**
   * Start file watching using shell script
   */
  async startFileWatcher(): Promise<void> {
    return this.executeScript('./scripts/ai-debug-watch', [this.workspaceRoot]);
  }

  /**
   * Execute parallel tests using shell script
   */
  async runParallelTests(testFiles: string[]): Promise<void> {
    const testFileList = testFiles.join('\n');
    return this.executeScriptWithInput('./scripts/ai-debug-parallel-tests', testFileList);
  }

  /**
   * Generic shell script executor
   */
  private async executeScript(scriptPath: string, args: string[] = []): Promise<void> {
    return new Promise((resolve, reject) => {
      const process = spawn(scriptPath, args, {
        cwd: this.workspaceRoot,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      this.currentProcess = process;

      process.stdout?.on('data', (data) => {
        const output = data.toString();
        this.showOutput(output);
      });

      process.stderr?.on('data', (data) => {
        const error = data.toString();
        this.showError(error);
      });

      process.on('close', (code) => {
        this.currentProcess = null;
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Script exited with code ${code}`));
        }
      });

      process.on('error', (error) => {
        this.currentProcess = null;
        reject(error);
      });
    });
  }

  /**
   * Execute shell script with stdin input
   */
  private async executeScriptWithInput(scriptPath: string, input: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const process = spawn(scriptPath, [], {
        cwd: this.workspaceRoot,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      this.currentProcess = process;

      // Send input to script
      process.stdin?.write(input);
      process.stdin?.end();

      process.stdout?.on('data', (data) => {
        this.showOutput(data.toString());
      });

      process.stderr?.on('data', (data) => {
        this.showError(data.toString());
      });

      process.on('close', (code) => {
        this.currentProcess = null;
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Script exited with code ${code}`));
        }
      });
    });
  }

  /**
   * Show output in VSCode output panel
   */
  private showOutput(output: string): void {
    const outputChannel = vscode.window.createOutputChannel('AI Debug Context');
    outputChannel.appendLine(output);
    outputChannel.show();
  }

  /**
   * Show error in VSCode
   */
  private showError(error: string): void {
    vscode.window.showErrorMessage(`AI Debug Context: ${error}`);
  }

  /**
   * Cancel current script execution
   */
  public cancelExecution(): void {
    if (this.currentProcess) {
      this.currentProcess.kill('SIGTERM');
      this.currentProcess = null;
    }
  }
}
```

**Success Metric**: VSCode commands execute shell scripts reliably

**🧪 Testing Requirements**:
- 95% branch coverage for TypeScript bridge code
- Integration tests: VSCode ↔ shell script communication
- Error handling for shell script failures

---

## 📋 **PHASE 2: ADD AI WHEN PROVEN (4 weeks)**
**Only proceed if Phase 1 achieves 80% cycle time reduction**

### **Week 3-4: Single AI Provider Integration**

#### **GitHub Copilot Integration Only**
```typescript
// Simple, direct Copilot integration - no abstractions
class CopilotTestFixer {
  async getCopilotSuggestion(
    testFailure: TestFailure,
    codeContext: string
  ): Promise<FixSuggestion> {
    const prompt = this.buildSimplePrompt(testFailure, codeContext)
    
    // Direct paste to Copilot Chat (already designed in V3 plan)
    await this.pasteToGitHubCopilotChat(prompt)
    
    return {
      type: 'copilot_chat_opened',
      message: 'Context pasted to GitHub Copilot Chat for analysis',
      timestamp: new Date().toISOString()
    }
  }

  private buildSimplePrompt(failure: TestFailure, context: string): string {
    return `Fix this test failure:

Test: ${failure.testName}
Error: ${failure.errorMessage}

Code Context:
\`\`\`typescript
${context}
\`\`\`

Please provide specific code changes to fix this test.`
  }
}
```

#### **Simple Learning System**
```typescript
// Track which suggestions work - basic feedback loop
class FixLearningSystem {
  private fixDatabase = new Map<string, FixPattern>()

  recordFixSuccess(
    originalError: string,
    suggestedFix: string,
    actualFix: string,
    worked: boolean
  ): void {
    const pattern = this.extractPattern(originalError)
    const existing = this.fixDatabase.get(pattern) || {
      pattern,
      successfulFixes: [],
      failedFixes: [],
      successRate: 0
    }

    if (worked) {
      existing.successfulFixes.push(actualFix)
    } else {
      existing.failedFixes.push(suggestedFix)
    }

    existing.successRate = existing.successfulFixes.length / 
      (existing.successfulFixes.length + existing.failedFixes.length)

    this.fixDatabase.set(pattern, existing)
  }

  getBestFix(errorMessage: string): FixPattern | null {
    const pattern = this.extractPattern(errorMessage)
    const stored = this.fixDatabase.get(pattern)
    
    if (stored && stored.successRate > 0.7) {
      return stored
    }
    
    return null
  }
}
```

**Success Metric**: 70% of AI suggestions work without modification

**🧪 Unit Test Requirement**: 95% branch coverage for `CopilotTestFixer` and `FixLearningSystem`
**📝 Documentation**: JSDoc comments for public methods

### **Week 5-6: Optimize What Works**

#### **Test Result Caching**
```typescript
// Cache test results to avoid re-running unchanged tests
class TestResultCache {
  private cache = new Map<string, CachedResult>()

  async getOrRunTest(testFile: string): Promise<TestResult> {
    const fileHash = await this.getFileHash(testFile)
    const cached = this.cache.get(testFile)

    if (cached && cached.fileHash === fileHash) {
      return cached.result // 100% time savings for unchanged tests
    }

    const result = await this.runTest(testFile)
    this.cache.set(testFile, {
      fileHash,
      result,
      timestamp: Date.now()
    })

    return result
  }

  private async getFileHash(file: string): Promise<string> {
    const content = await fs.readFile(file, 'utf8')
    return crypto.createHash('md5').update(content).digest('hex')
  }
}
```

**Success Metric**: 50% cache hit rate, reducing test execution time

**🧪 Unit Test Requirement**: 95% branch coverage for `TestResultCache`
**📝 Documentation**: JSDoc comments for public methods

---

## 📋 **PHASE 3: SCALE WHAT WORKS (6 weeks)**
**Only proceed if users are actively using Phases 1 & 2**

### **Week 7-8: Team Knowledge Sharing**
- Share successful fix patterns across team
- Build collaborative pattern database
- Team-wide test optimization strategies

### **Week 9-10: Advanced Test Optimization**
- Intelligent test prioritization based on failure history
- Smart test suite organization
- Advanced caching strategies

### **Week 11-12: Production Hardening**
- Comprehensive error handling
- Performance monitoring
- User analytics and feedback collection

---

## 🎯 **IMPLEMENTATION STRATEGY**

### **Technology Choices**
- **Primary Platform**: Universal shell scripts (bash/zsh/fish compatible)
- **Secondary Platform**: VSCode Extension (thin TypeScript wrapper)
- **Test Runner**: Jest/Vitest (whatever project uses)
- **AI Integration**: GitHub Copilot only (no abstractions)
- **File Watching**: Cross-platform (inotify/fswatch/polling)
- **Architecture**: Shell scripts do the work, VSCode provides UI

### **What We're NOT Building**
- ❌ Multiple AI provider support  
- ❌ Elaborate UI with multiple modes
- ❌ Complex configuration systems
- ❌ Advanced analytics dashboards
- ❌ TypeScript reimplementation of shell functionality

### **What We ARE Building**
- ✅ Universal shell scripts (bash/zsh/fish compatible)
- ✅ Fast test execution for changed files only
- ✅ Real-time test feedback on file save  
- ✅ VSCode extension as thin UI wrapper
- ✅ Direct Copilot integration when needed

### **Success Metrics**
1. **Phase 1**: 80% reduction in test-fix-test cycle time
2. **Phase 2**: 70% of AI suggestions work without modification
3. **Phase 3**: Daily active usage by entire development team

### **Validation Approach**
- Build for one real project first
- Measure actual time savings with stopwatch
- Get feedback from 3-5 developers using it daily
- Only add features that solve real, measured problems

---

## 🔥 **WHY THIS PLAN WILL WORK**

### **Focused on Real Problems**
- Solves the actual bottleneck (test execution time)
- Provides immediate, measurable value
- No complex abstractions that can break

### **Evidence-Based Development**
- Each phase must prove value before moving to next
- Real user feedback drives feature decisions
- Metrics-driven development approach

### **Pragmatic Technology Choices**
- Use VSCode's built-in capabilities
- Leverage existing tools (Jest, Git)
- Simple, reliable implementations over clever abstractions

### **Risk Mitigation**
- Start small and prove value early
- Each phase can stand alone if needed
- No complex dependencies or architectural commitments

---

## 🔧 **CI/CD SETUP FOR 95% COVERAGE**

### **Required Tooling**
```bash
# Install coverage tooling
npm install --save-dev jest @types/jest
npm install --save-dev c8  # or nyc for coverage

# Add to package.json scripts
"test": "jest",
"test:coverage": "c8 --reporter=lcov --reporter=text jest",
"test:ci": "c8 --reporter=lcov --check-coverage --branches 95 jest"
```

### **CI Configuration**
```yaml
# .github/workflows/test.yml
name: Test Coverage
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test:ci  # Fails if <95% branch coverage
```

### **Coverage Gate**
- **All PRs blocked** if branch coverage <95%
- **No exceptions** - every code path must be tested
- **CI fails** automatically if coverage drops

**Bottom Line**: This plan focuses on solving the real problem (slow tests) with simple, reliable tools that provide immediate value to developers, backed by comprehensive documentation and testing to ensure quality and maintainability.