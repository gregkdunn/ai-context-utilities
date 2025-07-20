#!/bin/bash

# Test Current Status Script
echo "=== AI Debug Context VSCode Extension - Current Test Status ==="
echo "Date: $(date)"
echo ""

cd /Users/gregdunn/src/test/ai_debug_context/vscode_2

echo "=== Checking Node.js version ==="
node --version
echo ""

echo "=== Checking npm version ==="
npm --version
echo ""

echo "=== Running Extension Tests ==="
echo "Running: npm test"
npm test

echo ""
echo "=== Running Webview Tests ==="
cd webview-ui
echo "Running: npm test"
npm test

echo ""
echo "=== Test Status Complete ==="
