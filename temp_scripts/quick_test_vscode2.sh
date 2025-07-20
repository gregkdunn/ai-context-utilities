#!/bin/bash

# Quick test for VSCode Extension v2 - Updated version
cd "/Users/gregdunn/src/test/ai_debug_context/vscode_2"

echo "=== AI Debug Context VSCode Extension v2 Quick Test ==="
echo "Current directory: $(pwd)"

# Function to check if command succeeded
check_result() {
    if [ $? -eq 0 ]; then
        echo "✅ $1 - SUCCESS"
    else
        echo "❌ $1 - FAILED"
        return 1
    fi
}

# Check if node_modules exist, install if needed
if [ ! -d "node_modules" ]; then
    echo "Installing root dependencies..."
    npm install
    check_result "Root dependencies installation"
fi

# Check webview node_modules
if [ ! -d "webview-ui/node_modules" ]; then
    echo "Installing webview dependencies..."
    cd webview-ui && npm install && cd ..
    check_result "Webview dependencies installation"
fi

echo ""
echo "=== Angular Unit Tests Only ==="
cd webview-ui
npm test -- --passWithNoTests --watch=false --verbose
check_result "Angular unit tests"
cd ..

echo ""
echo "=== TypeScript Compilation Check ==="
npx tsc --noEmit
check_result "TypeScript compilation"

echo ""
echo "=== Extension Build ==="
npm run compile
check_result "Extension compilation"

echo ""
if [ $? -eq 0 ]; then
    echo "🎉 All tests passed! Extension is ready for VSCode testing."
    echo ""
    echo "Next steps to test in VSCode:"
    echo "1. Open this project in VSCode"
    echo "2. Press F5 to launch Extension Development Host"
    echo "3. Look for AI Debug Context icon in Activity Panel"
    echo "4. Test all modules: File Selection, Test Selection, AI Debug, PR Generator"
else
    echo "❌ Some tests failed. Please fix issues before testing in VSCode."
    exit 1
fi
