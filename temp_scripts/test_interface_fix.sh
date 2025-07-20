#!/bin/bash

echo "=== Checking TypeScript Compilation After Interface Fix ==="

# Go to the webview-ui directory
cd /Users/gregdunn/src/test/ai_debug_context/vscode_2/webview-ui

echo "Checking TypeScript compilation..."
npx tsc --noEmit --project tsconfig.app.json

if [ $? -eq 0 ]; then
    echo "✅ Angular TypeScript compilation successful"
else
    echo "❌ Angular TypeScript compilation failed"
    exit 1
fi

echo ""
echo "Running unit tests to ensure everything still works..."
npm test -- --watchAll=false --testPathPattern="file-selector|app\.component"

if [ $? -eq 0 ]; then
    echo "✅ Unit tests passed"
else
    echo "❌ Unit tests failed"
    exit 1
fi

echo ""
echo "✅ All TypeScript issues resolved and tests passing!"
