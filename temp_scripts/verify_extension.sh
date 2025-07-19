#!/bin/bash

cd /Users/gregdunn/src/test/ai_debug_context/vscode_2

echo "🔨 Compiling TypeScript..."
npm run compile
if [ $? -ne 0 ]; then
    echo "❌ TypeScript compilation failed!"
    exit 1
fi

echo "🧪 Running extension tests..."
npm test
if [ $? -ne 0 ]; then
    echo "❌ Tests failed!"
    exit 1
fi

echo "✅ Extension backend compiled and tested successfully!"
echo ""
echo "📦 Extension structure:"
echo "- Activity bar icon: ✓ (configured in package.json)" 
echo "- Webview provider: ✓ (AIDebugWebviewProvider)"
echo "- Basic services: ✓ (Git, NX, Test, Copilot integration stubs)"
echo "- Message communication: ✓ (extension ↔ webview)"
echo ""
echo "🚀 Ready to test in VSCode!"
echo "   1. Open VSCode in this directory"
echo "   2. Press F5 to launch Extension Development Host"
echo "   3. Look for AI Debug Context icon in activity bar"
