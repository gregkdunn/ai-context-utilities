#!/bin/bash

# Run tests to verify the fix
echo "=== Testing AppComponent Fix ==="

cd "/Users/gregdunn/src/test/ai_debug_context/vscode_2/webview-ui"

echo ""
echo "Running AppComponent tests..."
npm run test -- src/app/app.component.spec.ts

echo ""
echo "=== Test completed ==="
