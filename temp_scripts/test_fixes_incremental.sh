#!/bin/bash

cd /Users/gregdunn/src/test/ai_debug_context/vscode_2

echo "🔧 Testing the fixes..."

# Test just one file first to verify the fix
echo "Testing Jest configuration and VSCode mocks..."
npx jest src/__tests__/GitIntegration.test.ts --verbose

if [ $? -ne 0 ]; then
    echo "❌ Basic test still failing"
    exit 1
fi

echo "✅ Basic test working, now testing webview provider..."
npx jest src/__tests__/AIDebugWebviewProvider.test.ts --verbose

if [ $? -ne 0 ]; then
    echo "❌ Webview provider test still failing"
    exit 1
fi

echo "✅ All fixes working!"
