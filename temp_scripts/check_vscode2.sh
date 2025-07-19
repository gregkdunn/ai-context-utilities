#!/bin/bash

echo "🔧 VSCode Extension v2 - Compilation Check"
echo "=========================================="

cd /Users/gregdunn/src/test/ai_debug_context/vscode_2

echo ""
echo "📦 Installing dependencies if needed..."
if [ ! -d "node_modules" ]; then
    npm install
else
    echo "✅ Dependencies already installed"
fi

echo ""
echo "🔧 Compiling TypeScript..."
npx tsc --noEmit

if [ $? -eq 0 ]; then
    echo "✅ TypeScript compilation successful!"
else
    echo "❌ TypeScript compilation failed"
    exit 1
fi

echo ""
echo "🧪 Running tests..."
npm test

echo ""
echo "📦 Installing webview dependencies..."
cd webview-ui
if [ ! -d "node_modules" ]; then
    npm install
else
    echo "✅ Webview dependencies already installed"
fi

echo ""
echo "🔧 Building webview..."
npm run build

echo ""
echo "✅ All checks completed!"
