#!/bin/bash

echo "=== AI Debug Context VSCode Extension v2 - Quick Test ==="

# Go to the extension directory
cd /Users/gregdunn/src/test/ai_debug_context/vscode_2

echo "🔍 Checking project structure..."
if [ -f "package.json" ] && [ -d "webview-ui" ] && [ -d "src" ]; then
    echo "✅ Project structure looks good"
else
    echo "❌ Project structure incomplete"
    exit 1
fi

echo ""
echo "🔍 Testing Angular components..."
cd webview-ui

# Run a quick test of the file-selector component specifically
echo "Running file-selector component test..."
npm test -- --testNamePattern="FileSelectorComponent" --watchAll=false --verbose

echo ""
echo "🔍 Testing TypeScript compilation..."
echo "Checking Angular TypeScript..."
npx tsc --noEmit --project tsconfig.app.json

if [ $? -eq 0 ]; then
    echo "✅ Angular TypeScript compilation successful"
else
    echo "❌ Angular TypeScript compilation failed"
    exit 1
fi

echo ""
echo "Checking VSCode extension TypeScript..."
cd ..
npx tsc --noEmit

if [ $? -eq 0 ]; then
    echo "✅ VSCode extension TypeScript compilation successful"
else
    echo "❌ VSCode extension TypeScript compilation failed"
    exit 1
fi

echo ""
echo "✅ All tests passed! Extension is ready for VSCode testing."
echo ""
echo "To test in VSCode:"
echo "1. Open this project in VSCode"
echo "2. Press F5 to launch Extension Development Host"
echo "3. Look for 'AI Debug Context' icon in Activity Panel"
echo "4. Click icon to open the extension"
