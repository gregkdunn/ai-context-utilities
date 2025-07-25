# AI Debug Context Shell Scripts

## 🐚 **Universal Shell Scripts Foundation**

These shell scripts provide the core functionality for AI Debug Context V3. They are designed to be:
- **Universal**: Compatible with bash, zsh, and fish
- **Fast**: Direct process execution, no compilation needed
- **Reliable**: Battle-tested shell patterns and error handling
- **Standalone**: Work independently or via VSCode extension

## 📁 **Script Structure**

### **Core Scripts**
- **`ai-debug-affected-tests`**: Detect and run only changed test files (90% time savings)
- **`ai-debug-parallel-tests`**: Execute tests in parallel for speed (5-10x improvement)
- **`ai-debug-watch`**: Real-time file watching with test execution (<2s feedback)
- **`ai-debug-pattern-fix`**: Pattern-based auto-fixing for common test failures
- **`ai-debug`**: Main orchestrator script that coordinates all functionality

### **Support Scripts**
- **`ai-debug-install`**: Installation and setup script
- **`ai-debug-config`**: Configuration management
- **`ai-debug-doctor`**: Health check and diagnostics

## 🎯 **Design Principles**

### **POSIX Compatibility**
```bash
# Use POSIX-compatible patterns
if command -v git >/dev/null 2>&1; then
    # Git is available
fi

# Avoid bash-specific features in core logic
# Use portable variable expansion
file="${filename%.ts}.spec.ts"
```

### **Cross-Shell Compatibility**
```bash
# Detect shell and adapt behavior
detect_shell() {
    if [[ -n "$BASH_VERSION" ]]; then
        echo "bash"
    elif [[ -n "$ZSH_VERSION" ]]; then
        echo "zsh"
    elif [[ -n "$FISH_VERSION" ]]; then
        echo "fish"
    else
        echo "unknown"
    fi
}
```

### **Error Handling**
```bash
# Robust error handling patterns
safe_execute() {
    local cmd="$1"
    local error_msg="$2"
    
    if ! $cmd; then
        echo "Error: $error_msg" >&2
        return 1
    fi
}
```

### **Performance Focus**
```bash
# Optimize for speed
# Use built-in commands over external tools when possible
# Minimize subprocess creation
# Cache expensive operations
```

## 🧪 **Testing Strategy**

### **Shell Script Testing with BATS**
```bash
# tests/shell/affected-tests.bats
#!/usr/bin/env bats

@test "should detect affected test files from git changes" {
    # Setup test git repository
    run ./scripts/ai-debug-affected-tests
    [ "$status" -eq 0 ]
    [[ "$output" =~ "test.spec.ts" ]]
}

@test "should handle missing git repository gracefully" {
    cd /tmp
    run ./scripts/ai-debug-affected-tests
    [ "$status" -eq 1 ]
    [[ "$output" =~ "Error: Not a git repository" ]]
}
```

### **Cross-Shell Testing**
```bash
# Test script in different shells
test_cross_shell() {
    for shell in bash zsh fish; do
        if command -v "$shell" >/dev/null 2>&1; then
            echo "Testing with $shell..."
            $shell -c "source ./scripts/ai-debug-affected-tests; main"
        fi
    done
}
```

### **Performance Testing**
```bash
# Benchmark script execution time
benchmark_script() {
    local script="$1"
    local iterations=10
    local total_time=0
    
    for i in $(seq 1 $iterations); do
        start_time=$(date +%s%N)
        ./"$script" >/dev/null 2>&1
        end_time=$(date +%s%N)
        
        execution_time=$((end_time - start_time))
        total_time=$((total_time + execution_time))
    done
    
    average_time=$((total_time / iterations / 1000000))
    echo "Average execution time: ${average_time}ms"
}
```

## 🔧 **Usage Examples**

### **Command Line Usage**
```bash
# Run affected tests only
./scripts/ai-debug-affected-tests

# Run tests in parallel
echo "test1.spec.ts test2.spec.ts" | ./scripts/ai-debug-parallel-tests

# Start file watcher
./scripts/ai-debug-watch /path/to/project

# Full workflow
./scripts/ai-debug /path/to/project
```

### **VSCode Integration**
```typescript
// VSCode extension calls shell scripts
const bridge = new ShellScriptBridge();
await bridge.runAffectedTests();  // Calls ./scripts/ai-debug-affected-tests
await bridge.startFileWatcher();  // Calls ./scripts/ai-debug-watch
```

## 📊 **Performance Targets**

### **Phase 1 Targets**
- **Script startup**: <100ms for any script
- **Test detection**: <500ms for 100+ files  
- **Parallel execution**: 3-5x speedup vs serial
- **File watching**: <2s from change to test results

### **Compatibility Targets**
- **Bash**: 4.0+ (widely available)
- **Zsh**: 5.0+ (macOS default)
- **Fish**: 3.0+ (growing popularity)
- **Platforms**: Linux, macOS, Windows/WSL

## 🛠️ **Development Guidelines**

### **Adding New Scripts**
1. **Create script file** in `scripts/` directory
2. **Add shebang**: `#!/usr/bin/env bash` 
3. **Include header** with script description
4. **Write POSIX-compatible core logic**
5. **Add error handling** for all operations
6. **Create BATS tests** in `tests/shell/`
7. **Test cross-shell compatibility**
8. **Update this README**

### **Code Style**
- **Functions**: lowercase with underscores (`get_changed_files`)
- **Variables**: lowercase with underscores (`test_files`)
- **Constants**: uppercase (`MAX_CONCURRENCY`)
- **Indentation**: 4 spaces (not tabs)
- **Line length**: 80 characters max
- **Comments**: Explain why, not what

### **Error Handling Standards**
- **Always check command success**: `cmd || return 1`
- **Provide helpful error messages**: Clear context and next steps
- **Exit codes**: 0 = success, 1 = error, 2 = usage error
- **Cleanup**: Remove temporary files on exit

---

**Goal**: Provide fast, reliable, universal shell scripts that form the foundation of AI Debug Context V3, with VSCode extension as optional UI layer.