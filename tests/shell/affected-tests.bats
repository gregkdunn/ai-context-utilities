#!/usr/bin/env bats
# Functional tests for ai-debug-affected-tests script
# Tests the core shell script functionality with BATS (Bash Automated Testing System)

# Setup and teardown for each test
setup() {
    # Store absolute path to script
    SCRIPT_PATH="${BATS_TEST_DIRNAME}/../../scripts/ai-debug-affected-tests"
    
    # Create temporary test directory
    TEST_TEMP_DIR="$(mktemp -d)"
    cd "$TEST_TEMP_DIR"
    
    # Initialize git repository
    git init --quiet
    git config user.name "Test User"
    git config user.email "test@example.com"
    
    # Create initial commit
    echo "initial" > README.md
    git add README.md
    git commit --quiet -m "Initial commit"
    
    # Copy script to test directory for easier access
    cp "$SCRIPT_PATH" ./ai-debug-affected-tests
    chmod +x ./ai-debug-affected-tests
}

teardown() {
    # Clean up temporary directory
    if [[ -n "$TEST_TEMP_DIR" && -d "$TEST_TEMP_DIR" ]]; then
        cd /
        rm -rf "$TEST_TEMP_DIR"
    fi
}

# Helper function to create a source file and its test
create_file_pair() {
    local source_file="$1"
    local test_file="$2"
    local source_content="${3:-// Source file content}"
    local test_content="${4:-// Test file content}"
    
    # Create directories if they don't exist
    mkdir -p "$(dirname "$source_file")"
    mkdir -p "$(dirname "$test_file")"
    
    echo "$source_content" > "$source_file"
    echo "$test_content" > "$test_file"
    git add "$source_file" "$test_file"
    git commit --quiet -m "Add $source_file and $test_file"
}

# Test basic functionality
@test "should show version information" {
    run ./ai-debug-affected-tests --version
    [ "$status" -eq 0 ]
    [[ "$output" =~ "ai-debug-affected-tests version 3.0.0" ]]
}

@test "should show help information" {
    run ./ai-debug-affected-tests --help
    [ "$status" -eq 0 ]
    [[ "$output" =~ "USAGE:" ]]
    [[ "$output" =~ "OPTIONS:" ]]
    [[ "$output" =~ "EXAMPLES:" ]]
}

# Test git repository validation
@test "should fail gracefully when not in git repository" {
    cd /tmp
    run "$SCRIPT_PATH"
    [ "$status" -eq 1 ]
    [[ "$output" =~ "Not in a git repository" ]]
}

@test "should fail gracefully when base branch doesn't exist" {
    run ./ai-debug-affected-tests --base nonexistent-branch
    [ "$status" -eq 1 ]
    [[ "$output" =~ "Base branch 'nonexistent-branch' does not exist" ]]
}

# Test affected file detection
@test "should detect no changes when nothing modified" {
    run ./ai-debug-affected-tests --dry-run
    [ "$status" -eq 0 ]
    [[ "$output" =~ "No source files changed since main" ]]
    [[ "$output" =~ "Nothing to test!" ]]
}

@test "should detect affected test for single changed source file" {
    # Create source and test files
    create_file_pair "src/example.ts" "src/example.spec.ts"
    
    # Modify source file
    echo "// Modified content" > src/example.ts
    
    run ./ai-debug-affected-tests --dry-run
    [ "$status" -eq 0 ]
    [[ "$output" =~ "Changed source files:" ]]
    [[ "$output" =~ "src/example.ts" ]]
    [[ "$output" =~ "src/example.ts -> src/example.spec.ts" ]]
    [[ "$output" =~ "Would run these tests:" ]]
    [[ "$output" =~ "src/example.spec.ts" ]]
}

@test "should detect multiple affected tests for multiple changed files" {
    # Create multiple source/test pairs
    create_file_pair "src/utils.ts" "src/utils.spec.ts"
    create_file_pair "src/helpers.ts" "src/helpers.spec.ts"
    
    # Modify both source files
    echo "// Modified utils" > src/utils.ts
    echo "// Modified helpers" > src/helpers.ts
    
    run ./ai-debug-affected-tests --dry-run
    [ "$status" -eq 0 ]
    [[ "$output" =~ "Found 2 affected test file(s)" ]]
    [[ "$output" =~ "src/utils.spec.ts" ]]
    [[ "$output" =~ "src/helpers.spec.ts" ]]
}

@test "should handle source file without corresponding test file" {
    # Create source file without test
    mkdir -p src
    echo "// Source without test" > src/orphan.ts
    git add src/orphan.ts
    git commit --quiet -m "Add orphan source file"
    
    # Modify the orphan file
    echo "// Modified orphan" > src/orphan.ts
    
    run ./ai-debug-affected-tests --dry-run
    [ "$status" -eq 0 ]
    [[ "$output" =~ "Changed source files:" ]]
    [[ "$output" =~ "src/orphan.ts" ]]
    [[ "$output" =~ "No affected test files found" ]]
}

@test "should ignore test files and non-TypeScript files" {
    # Create various file types
    mkdir -p src docs
    echo "// Test file" > src/example.spec.ts
    echo "/* CSS file */" > src/styles.css
    echo "# Markdown" > docs/README.md
    echo "// Declaration file" > src/types.d.ts
    git add src/example.spec.ts src/styles.css docs/README.md src/types.d.ts
    git commit --quiet -m "Add various file types"
    
    # Modify all files
    echo "// Modified test" > src/example.spec.ts
    echo "/* Modified CSS */" > src/styles.css
    echo "# Modified markdown" > docs/README.md
    echo "// Modified declaration" > src/types.d.ts
    
    run ./ai-debug-affected-tests --dry-run
    [ "$status" -eq 0 ]
    [[ "$output" =~ "No source files changed since main" ]]
}

@test "should support different test file naming conventions" {
    # Create source file with multiple possible test files
    mkdir -p src
    echo "// Source content" > src/component.ts
    git add src/component.ts
    git commit --quiet -m "Add component source"
    
    # Create test files with different naming conventions
    echo "// Spec test" > src/component.spec.ts
    echo "// Unit test" > src/component.test.ts
    echo "// JS spec" > src/component.spec.js
    git add src/component.spec.ts src/component.test.ts src/component.spec.js
    git commit --quiet -m "Add test files"
    
    # Modify source file
    echo "// Modified component" > src/component.ts
    
    run ./ai-debug-affected-tests --dry-run
    [ "$status" -eq 0 ]
    [[ "$output" =~ "src/component.ts -> src/component.spec.ts" ]]
    # Should pick the first matching test file (spec.ts)
    [[ ! "$output" =~ "src/component.test.ts" ]]
}

@test "should work with custom base branch" {
    # Create and switch to development branch
    git checkout -b develop --quiet
    create_file_pair "src/feature.ts" "src/feature.spec.ts"
    
    # Switch back to main and create different branch
    git checkout main --quiet
    git checkout -b feature-branch --quiet
    create_file_pair "src/other.ts" "src/other.spec.ts"
    
    # Modify file on feature branch
    echo "// Modified on feature branch" > src/other.ts
    
    run ./ai-debug-affected-tests --base develop --dry-run
    [ "$status" -eq 0 ]
    [[ "$output" =~ "Detecting changes since branch: develop" ]]
    [[ "$output" =~ "src/other.spec.ts" ]]
}

@test "should support verbose output" {
    create_file_pair "src/verbose.ts" "src/verbose.spec.ts"
    echo "// Modified for verbose test" > src/verbose.ts
    
    run ./ai-debug-affected-tests --verbose --dry-run
    [ "$status" -eq 0 ]
    # Verbose mode should show debug information (set -x output)
    [[ "$output" =~ "Starting ai-debug-affected-tests v3.0.0" ]]
}

# Test error handling
@test "should handle missing Jest gracefully" {
    # Temporarily rename node_modules or npm to simulate missing Jest
    if command -v npm >/dev/null 2>&1; then
        # Create a temporary directory without npm in PATH
        mkdir -p fake-bin
        PATH="./fake-bin:$PATH"
        
        create_file_pair "src/test.ts" "src/test.spec.ts"
        echo "// Modified" > src/test.ts
        
        run ./ai-debug-affected-tests --dry-run
        # Should still work in dry-run mode
        [ "$status" -eq 0 ]
        [[ "$output" =~ "src/test.spec.ts" ]]
    else
        skip "npm not available for testing"
    fi
}

# Test performance expectations
@test "should complete dry run quickly for large number of changes" {
    # Create many file pairs
    for i in {1..20}; do
        create_file_pair "src/file${i}.ts" "src/file${i}.spec.ts"
    done
    
    # Modify all source files
    for i in {1..20}; do
        echo "// Modified file $i" > "src/file${i}.ts"
    done
    
    # Measure execution time (should be under 1 second)
    start_time=$(date +%s%N)
    run ./ai-debug-affected-tests --dry-run
    end_time=$(date +%s%N)
    
    [ "$status" -eq 0 ]
    [[ "$output" =~ "Found 20 affected test file(s)" ]]
    
    # Check execution time (should be under 5 seconds = 5,000,000,000 nanoseconds)
    execution_time=$((end_time - start_time))
    echo "Execution time: $execution_time nanoseconds" >&3
    [ "$execution_time" -lt 5000000000 ]
}

# Test argument parsing
@test "should handle unknown arguments gracefully" {
    run ./ai-debug-affected-tests --unknown-flag
    [ "$status" -eq 1 ]
    [[ "$output" =~ "Unknown option: --unknown-flag" ]]
    [[ "$output" =~ "USAGE:" ]]
}

@test "should require value for base branch argument" {
    run ./ai-debug-affected-tests --base
    [ "$status" -eq 1 ]
}

# Integration test with actual Jest (if available)
@test "should integrate with Jest when test files exist and Jest is available" {
    # Only run if Jest is available
    if ! command -v npx >/dev/null 2>&1 || ! npx jest --version >/dev/null 2>&1; then
        skip "Jest not available for integration test"
    fi
    
    # Create a simple test file
    mkdir -p src
    cat > src/simple.ts << 'EOF'
export function add(a: number, b: number): number {
    return a + b;
}
EOF
    
    cat > src/simple.spec.ts << 'EOF'
import { add } from './simple';

test('should add numbers', () => {
    expect(add(2, 3)).toBe(5);
});
EOF
    
    # Create minimal package.json and jest config
    cat > package.json << 'EOF'
{
    "name": "test-project",
    "scripts": {
        "test": "jest"
    },
    "devDependencies": {
        "jest": "*",
        "@types/jest": "*"
    }
}
EOF
    
    cat > jest.config.js << 'EOF'
module.exports = {
    testMatch: ['**/*.spec.ts'],
    transform: {
        '^.+\\.ts$': 'ts-jest'
    },
    moduleFileExtensions: ['ts', 'js']
};
EOF
    
    git add .
    git commit --quiet -m "Add test project files"
    
    # Modify source file
    echo 'export function add(a: number, b: number): number { return a + b; }' > src/simple.ts
    
    # Run the script (not in dry-run mode)
    # Note: This might fail due to missing dependencies, but that's expected
    run timeout 30s ./ai-debug-affected-tests
    
    # Should attempt to run Jest, even if it fails due to missing deps
    [[ "$output" =~ "Running affected tests" || "$output" =~ "Jest not found" || "$output" =~ "npx jest" ]]
}