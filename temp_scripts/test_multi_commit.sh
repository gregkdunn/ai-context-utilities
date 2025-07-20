#!/bin/bash

echo "=== Testing Multiple Commit Selection Feature ==="

# Go to the webview-ui directory
cd /Users/gregdunn/src/test/ai_debug_context/vscode_2/webview-ui

echo "Running file-selector component tests..."
npm test -- --testNamePattern="FileSelectorComponent" --watchAll=false --verbose

echo ""
echo "Testing TypeScript compilation..."
npx tsc --noEmit --project tsconfig.app.json

if [ $? -eq 0 ]; then
    echo "✅ TypeScript compilation successful"
else
    echo "❌ TypeScript compilation failed"
    exit 1
fi

echo ""
echo "✅ Multiple commit selection feature tests completed!"
