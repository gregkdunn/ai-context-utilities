#!/bin/bash

cd /Users/gregdunn/src/test/ai_debug_context/vscode_2

echo "🧪 Testing individual test files after fixes..."
echo ""

# Test GitIntegration first (should pass)
echo "1. Testing GitIntegration..."
npx jest src/__tests__/GitIntegration.test.ts --silent
if [ $? -eq 0 ]; then
    echo "✅ GitIntegration tests passing"
else
    echo "❌ GitIntegration tests failing"
    exit 1
fi

# Test extension.ts
echo ""
echo "2. Testing Extension..."
npx jest src/__tests__/extension.test.ts --silent
if [ $? -eq 0 ]; then
    echo "✅ Extension tests passing"
else
    echo "❌ Extension tests failing"
    exit 1
fi

# Test the webview provider
echo ""
echo "3. Testing AIDebugWebviewProvider..."
npx jest src/__tests__/AIDebugWebviewProvider.test.ts --silent
if [ $? -eq 0 ]; then
    echo "✅ AIDebugWebviewProvider tests passing"
else
    echo "❌ AIDebugWebviewProvider tests failing - let's see the details"
    npx jest src/__tests__/AIDebugWebviewProvider.test.ts --verbose
    exit 1
fi

echo ""
echo "🎉 All tests fixed and passing!"
