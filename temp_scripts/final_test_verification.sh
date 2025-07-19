#!/bin/bash

cd /Users/gregdunn/src/test/ai_debug_context/vscode_2

echo "🎯 Final Test Verification After All Fixes"
echo "=========================================="

# Clean and compile
echo "1. 🧹 Clean compile..."
rm -rf out/*
npm run compile
if [ $? -ne 0 ]; then
    echo "❌ TypeScript compilation failed!"
    exit 1
fi
echo "✅ TypeScript compilation successful"

# Run individual test files to pinpoint any remaining issues
echo ""
echo "2. 🧪 Testing each file individually..."

test_files=(
    "src/__tests__/GitIntegration.test.ts"
    "src/__tests__/TestRunner.test.ts" 
    "src/__tests__/extension.test.ts"
    "src/__tests__/AIDebugWebviewProvider.test.ts"
)

all_passed=true
for test_file in "${test_files[@]}"; do
    echo "   Testing $(basename $test_file .test.ts)..."
    npx jest "$test_file" --silent --passWithNoTests
    if [ $? -eq 0 ]; then
        echo "   ✅ $(basename $test_file .test.ts) - PASSED"
    else
        echo "   ❌ $(basename $test_file .test.ts) - FAILED"
        all_passed=false
    fi
done

if [ "$all_passed" = false ]; then
    echo ""
    echo "🔍 Some tests failed. Running with verbose output for debugging..."
    npm test -- --verbose
    exit 1
fi

# Run full test suite
echo ""
echo "3. 🧪 Running full test suite..."
npm test -- --silent
if [ $? -ne 0 ]; then
    echo "❌ Full test suite failed!"
    echo "Running with details..."
    npm test
    exit 1
fi

echo ""
echo "🎉 ALL TESTS PASSING!"
echo "===================="
echo ""
echo "✅ Jest configuration fixed"
echo "✅ VSCode API mocks complete"
echo "✅ TypeScript compilation working"
echo "✅ All unit tests passing"
echo "✅ Extension backend ready"
echo ""
echo "🚀 Extension is ready for VSCode testing!"
echo "   1. Open this directory in VSCode"
echo "   2. Press F5 to launch Extension Development Host"
echo "   3. Look for AI Debug Context icon in activity bar"
echo ""
echo "💡 Next steps:"
echo "   • Test extension in VSCode"
echo "   • Build Angular webview: npm run build:webview"
echo "   • Implement AI features"
echo ""
echo "✅ Backend implementation complete and verified!"
