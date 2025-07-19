#!/bin/bash

# Change to vscode_2 directory
cd /Users/gregdunn/src/test/ai_debug_context/vscode_2

echo "=== Running VSCode Extension Tests ==="
npm test

echo ""
echo "=== Running Angular Webview Tests ==="
cd webview-ui
npm test -- --passWithNoTests

echo ""
echo "=== Build Status Check ==="
cd ..
npm run compile

echo ""
echo "=== Webview Build Check ==="
npm run build:webview
