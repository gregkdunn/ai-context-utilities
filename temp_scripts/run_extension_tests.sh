#!/bin/bash

echo "=== Running VSCode Extension Tests ==="
cd /Users/gregdunn/src/test/ai_debug_context/vscode_2

echo "1. Checking if node_modules exists..."
if [ -d "node_modules" ]; then
    echo "✓ node_modules found"
else
    echo "✗ node_modules not found - running npm install"
    npm install
fi

echo ""
echo "2. Running TypeScript compilation check..."
npx tsc --noEmit

echo ""
echo "3. Running Jest tests..."
npm test

echo ""
echo "=== Extension Tests Complete ==="
