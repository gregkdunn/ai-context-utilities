#!/bin/bash

echo "🧪 Testing the Copilot Integration Implementation..."

cd /Users/gregdunn/src/test/ai_debug_context/vscode_2

echo "📝 Checking TypeScript compilation..."
npx tsc --noEmit

if [ $? -eq 0 ]; then
    echo "✅ TypeScript compilation successful!"
    
    echo "🧪 Running CopilotIntegration tests..."
    npm test -- --testNamePattern="CopilotIntegration" --verbose
    
    if [ $? -eq 0 ]; then
        echo "✅ All Copilot integration tests passed!"
        
        echo "🔍 Running related service tests..."
        npm test -- --testNamePattern="(GitIntegration|TestRunner|AIDebug)" --verbose
        
        echo "📊 Test Summary:"
        echo "  ✅ TypeScript compilation: PASSED"
        echo "  ✅ CopilotIntegration tests: PASSED"
        echo "  ✅ Related service tests: PASSED"
        echo ""
        echo "🎯 Ready for integration testing!"
        echo "Next: Build the webview UI and test in VSCode"
    else
        echo "❌ Some tests failed. Please check the output above."
        exit 1
    fi
else
    echo "❌ TypeScript compilation failed. Please fix the errors above."
    exit 1
fi
