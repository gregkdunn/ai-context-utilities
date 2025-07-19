#!/bin/bash

# Run tests to verify the final fix
echo "=== Testing the AppComponent fix ==="

cd "/Users/gregdunn/src/test/ai_debug_context/vscode_2/webview-ui"

echo ""
echo "Running tests..."
npm run test -- --testNamePattern="should save and restore state" --verbose

echo ""
echo "=== Test completed ==="
