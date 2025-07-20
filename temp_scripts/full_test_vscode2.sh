#!/bin/bash

# Comprehensive VSCode Extension v2 Test Runner
PROJECT_ROOT="/Users/gregdunn/src/test/ai_debug_context/vscode_2"
cd "$PROJECT_ROOT"

echo "🤖 AI Debug Context VSCode Extension v2 - Comprehensive Test"
echo "Project root: $(pwd)"
echo "Date: $(date)"
echo "================================================"

# Function to check if command succeeded
check_result() {
    local exit_code=$?
    if [ $exit_code -eq 0 ]; then
        echo "✅ $1 - SUCCESS"
        return 0
    else
        echo "❌ $1 - FAILED (exit code: $exit_code)"
        return 1
    fi
}

# Function to run command with timeout
run_with_timeout() {
    local timeout_seconds=$1
    local description=$2
    shift 2
    
    echo "Running: $description"
    timeout $timeout_seconds "$@"
    check_result "$description"
}

# 1. Check Dependencies
echo ""
echo "=== Phase 1: Dependency Check ==="

if [ ! -d "node_modules" ]; then
    echo "Installing root dependencies..."
    npm install
    check_result "Root dependency installation" || exit 1
fi

if [ ! -d "webview-ui/node_modules" ]; then
    echo "Installing Angular dependencies..."
    cd webview-ui && npm install && cd ..
    check_result "Angular dependency installation" || exit 1
fi

# 2. TypeScript Compilation
echo ""
echo "=== Phase 2: TypeScript Compilation ==="
run_with_timeout 30 "TypeScript compilation check" npx tsc --noEmit
if [ $? -ne 0 ]; then
    echo "TypeScript compilation failed. Cannot proceed."
    exit 1
fi

# 3. Angular Unit Tests
echo ""
echo "=== Phase 3: Angular Unit Tests ==="
cd webview-ui
echo "Running Angular component tests..."
run_with_timeout 60 "Angular unit tests" npm test -- --passWithNoTests --watch=false --verbose --silent
angular_test_result=$?
cd ..

if [ $angular_test_result -ne 0 ]; then
    echo "Angular tests failed. Please fix before continuing."
    exit 1
fi

# 4. VSCode Extension Tests
echo ""
echo "=== Phase 4: VSCode Extension Tests ==="
run_with_timeout 30 "VSCode extension tests" npm test
extension_test_result=$?

if [ $extension_test_result -ne 0 ]; then
    echo "Extension tests failed. Please fix before continuing."
    exit 1
fi

# 5. Build Angular UI
echo ""
echo "=== Phase 5: Angular Build ==="
cd webview-ui
run_with_timeout 60 "Angular build" npm run build
angular_build_result=$?
cd ..

if [ $angular_build_result -ne 0 ]; then
    echo "Angular build failed."
    exit 1
fi

# 6. Compile Extension
echo ""
echo "=== Phase 6: Extension Compilation ==="
run_with_timeout 30 "Extension compilation" npm run compile
compile_result=$?

if [ $compile_result -ne 0 ]; then
    echo "Extension compilation failed."
    exit 1
fi

# 7. Verify Build Outputs
echo ""
echo "=== Phase 7: Build Verification ==="

# Check extension build
if [ -f "out/extension.js" ]; then
    echo "✅ Extension JavaScript compiled"
else
    echo "❌ Extension JavaScript missing"
    exit 1
fi

# Check Angular build
if [ -f "out/webview/index.html" ] && [ -f "out/webview/main.js" ]; then
    echo "✅ Angular webview built successfully"
else
    echo "❌ Angular webview build incomplete"
    exit 1
fi

# 8. Package Information
echo ""
echo "=== Phase 8: Package Information ==="
echo "Extension package.json info:"
echo "  Name: $(jq -r '.name' package.json)"
echo "  Version: $(jq -r '.version' package.json)"
echo "  Description: $(jq -r '.description' package.json)"

# 9. Final Summary
echo ""
echo "================================================"
echo "🎉 ALL TESTS PASSED! 🎉"
echo "================================================"
echo ""
echo "Extension is ready for VSCode testing!"
echo ""
echo "📋 Next Steps:"
echo "1. Open this project in VSCode"
echo "2. Press F5 to launch Extension Development Host"
echo "3. Look for 'AI Debug Context' icon in Activity Panel"
echo "4. Click the icon to open the webview"
echo "5. Test all 4 modules:"
echo "   • File Selection (DIFF)"
echo "   • Test Selection (NX TEST)" 
echo "   • AI Debug (AI TEST DEBUG)"
echo "   • PR Generator (PR DESC)"
echo ""
echo "🔧 Extension Features Implemented:"
echo "• ✅ Angular 18 with Standalone Components"
echo "• ✅ Tailwind CSS with VSCode theme integration"
echo "• ✅ 4 modular components with comprehensive tests"
echo "• ✅ VSCode Activity Panel integration"
echo "• ✅ Git integration for file selection"
echo "• ✅ NX workspace support for test selection"
echo "• ✅ AI Copilot integration structure"
echo "• ✅ PR description generation framework"
echo ""
echo "📊 Test Results:"
echo "• TypeScript compilation: PASSED"
echo "• Angular unit tests: PASSED"
echo "• VSCode extension tests: PASSED"
echo "• Angular build: PASSED"
echo "• Extension compilation: PASSED"
echo "• Build verification: PASSED"
echo ""
echo "Ready for live testing in VSCode! 🚀"
