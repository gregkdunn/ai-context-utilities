#!/bin/bash

echo "=== Testing AI Debug Context VSCode Extension v2 ==="
echo "Current directory: $(pwd)"

# Change to project directory
cd /Users/gregdunn/src/test/ai_debug_context/vscode_2

echo "=== Step 1: Testing Angular Components ==="
cd webview-ui

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
  echo "Installing webview-ui dependencies..."
  npm install
fi

echo "Running Angular component tests..."
npm test -- --watchAll=false 2>&1

echo ""
echo "=== Step 2: Testing TypeScript Compilation ==="
echo "Checking Angular TypeScript compilation..."
npx tsc --noEmit --project tsconfig.app.json 2>&1

echo ""
echo "=== Step 3: Testing VSCode Extension ==="
cd ..

# Check if node_modules exists for extension
if [ ! -d "node_modules" ]; then
  echo "Installing extension dependencies..."
  npm install
fi

echo "Testing VSCode extension TypeScript compilation..."
npx tsc --noEmit 2>&1

echo ""
echo "=== Test Summary ==="
echo "All tests completed!"
