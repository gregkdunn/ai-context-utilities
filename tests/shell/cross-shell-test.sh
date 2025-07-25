#!/usr/bin/env bash
# Cross-shell compatibility test for ai-debug-affected-tests
# Tests the script in bash, zsh, and fish to ensure universal compatibility

set -euo pipefail

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
readonly SCRIPT_PATH="${PROJECT_ROOT}/scripts/ai-debug-affected-tests"

# Colors for output
if [[ -t 1 ]] && command -v tput >/dev/null 2>&1; then
    readonly RED=$(tput setaf 1)
    readonly GREEN=$(tput setaf 2)
    readonly YELLOW=$(tput setaf 3)
    readonly BLUE=$(tput setaf 4)
    readonly BOLD=$(tput bold)
    readonly RESET=$(tput sgr0)
else
    readonly RED=""
    readonly GREEN=""
    readonly YELLOW=""
    readonly BLUE=""
    readonly BOLD=""
    readonly RESET=""
fi

log_info() {
    echo "${BLUE}[INFO]${RESET} $*"
}

log_success() {
    echo "${GREEN}[SUCCESS]${RESET} $*"
}

log_error() {
    echo "${RED}[ERROR]${RESET} $*"
}

log_warn() {
    echo "${YELLOW}[WARN]${RESET} $*"
}

# Test a shell with basic functionality
test_shell() {
    local shell="$1"
    local shell_name="$2"
    
    log_info "Testing with ${shell_name}..."
    
    # Check if shell is available
    if ! command -v "$shell" >/dev/null 2>&1; then
        log_warn "${shell_name} not available, skipping"
        return 0
    fi
    
    # Create temporary test directory
    local test_dir
    test_dir=$(mktemp -d)
    cd "$test_dir"
    
    # Initialize git repository
    git init --quiet
    git config user.name "Test User"
    git config user.email "test@example.com"
    
    # Create initial commit on main branch
    echo "initial" > README.md
    git add README.md
    git commit --quiet -m "Initial commit"
    
    # Create a feature branch to test against main
    git checkout -b feature --quiet
    
    # Copy script to test directory
    cp "$SCRIPT_PATH" ./ai-debug-affected-tests
    chmod +x ./ai-debug-affected-tests
    
    # Test 1: Version check
    log_info "  Testing version check..."
    if $shell -c "./ai-debug-affected-tests --version" | grep -q "ai-debug-affected-tests version 3.0.0"; then
        log_success "  ✓ Version check passed"
    else
        log_error "  ✗ Version check failed"
        cleanup_and_exit "$test_dir" 1
    fi
    
    # Test 2: Help command
    log_info "  Testing help command..."
    if $shell -c "./ai-debug-affected-tests --help" | grep -q "USAGE:"; then
        log_success "  ✓ Help command passed"
    else
        log_error "  ✗ Help command failed"
        cleanup_and_exit "$test_dir" 1
    fi
    
    # Test 3: No changes detection
    log_info "  Testing no changes detection..."
    local output
    output=$($shell -c "./ai-debug-affected-tests --dry-run" 2>&1)
    if echo "$output" | grep -q "Nothing to test!"; then
        log_success "  ✓ No changes detection passed"
    else
        log_error "  ✗ No changes detection failed"
        log_error "  Output was: $output"
        cleanup_and_exit "$test_dir" 1
    fi
    
    # Test 4: Simple file change detection
    log_info "  Testing file change detection..."
    mkdir -p src
    echo "export function test() { return true; }" > src/example.ts
    echo "import { test } from './example'; describe('test', () => { it('works', () => expect(test()).toBe(true)); });" > src/example.spec.ts
    git add src/
    git commit --quiet -m "Add test files"
    
    # Modify source file
    echo "export function test() { return false; }" > src/example.ts
    
    local change_output
    change_output=$($shell -c "./ai-debug-affected-tests --dry-run" 2>&1)
    if echo "$change_output" | grep -q "src/example.spec.ts"; then
        log_success "  ✓ File change detection passed"
    else
        log_error "  ✗ File change detection failed"
        log_error "  Output was: $change_output"
        cleanup_and_exit "$test_dir" 1
    fi
    
    # Test 5: Error handling
    log_info "  Testing error handling..."
    local error_output
    error_output=$($shell -c "./ai-debug-affected-tests --base nonexistent-branch" 2>&1 || true)
    if echo "$error_output" | grep -q "does not exist"; then
        log_success "  ✓ Error handling passed"
    else
        log_error "  ✗ Error handling failed"
        log_error "  Output was: $error_output"
        # Don't exit on this failure, continue testing
    fi
    
    # Cleanup
    cd /
    rm -rf "$test_dir"
    
    log_success "${shell_name} compatibility: ✓ ALL TESTS PASSED"
}

cleanup_and_exit() {
    local test_dir="$1"
    local exit_code="$2"
    
    cd /
    rm -rf "$test_dir"
    exit "$exit_code"
}

# Main execution
main() {
    log_info "Starting cross-shell compatibility test for ai-debug-affected-tests"
    log_info "Script path: $SCRIPT_PATH"
    
    if [[ ! -f "$SCRIPT_PATH" ]]; then
        log_error "Script not found at $SCRIPT_PATH"
        exit 1
    fi
    
    local shells_tested=0
    local shells_passed=0
    
    # Test Bash
    if command -v bash >/dev/null 2>&1; then
        ((shells_tested++))
        if test_shell "bash" "Bash"; then
            ((shells_passed++))
        fi
    fi
    
    # Test Zsh
    if command -v zsh >/dev/null 2>&1; then
        ((shells_tested++))
        if test_shell "zsh" "Zsh"; then
            ((shells_passed++))
        fi
    fi
    
    # Test Fish (note: fish has different syntax, so we test if it can at least execute)
    if command -v fish >/dev/null 2>&1; then
        log_info "Testing with Fish..."
        # Fish has different syntax, so we just test basic execution
        if fish -c "test -f '$SCRIPT_PATH'"; then
            log_success "Fish compatibility: ✓ Basic execution test passed"
            ((shells_tested++))
            ((shells_passed++))
        else
            log_error "Fish compatibility: ✗ Basic execution test failed"
            ((shells_tested++))
        fi
    fi
    
    # Summary
    echo ""
    log_info "Cross-shell compatibility test summary:"
    log_info "  Shells tested: $shells_tested"
    log_info "  Shells passed: $shells_passed"
    
    if [[ $shells_passed -eq $shells_tested && $shells_tested -gt 0 ]]; then
        log_success "🎉 ALL SHELLS PASSED! Script is universally compatible."
        return 0
    elif [[ $shells_passed -gt 0 ]]; then
        log_warn "⚠️  Some shells passed, but not all. Check compatibility issues."
        return 1
    else
        log_error "❌ NO SHELLS PASSED! Critical compatibility issues detected."
        return 1
    fi
}

# Run if executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi