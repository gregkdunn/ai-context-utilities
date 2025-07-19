#!/bin/bash

echo "🧪 Testing VSCode Extension Version 2"
echo "======================================"

cd /Users/gregdunn/src/test/ai_debug_context/vscode_2

echo ""
echo "📦 Installing dependencies..."
npm install

echo ""
echo "🔧 Compiling TypeScript..."
npm run compile

echo ""
echo "🧪 Running tests..."
npm test

echo ""
echo "✅ Build completed!"
