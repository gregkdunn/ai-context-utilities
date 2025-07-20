#!/bin/bash

# Build and test the Copilot integration
echo "🚀 Building AI Debug Context Extension with Copilot Integration..."

cd /Users/gregdunn/src/test/ai_debug_context/vscode_2

echo "📦 Installing webview dependencies..."
npm run install:webview

echo "🔨 Building webview UI..."
npm run build:webview

echo "🏗️ Compiling TypeScript extension..."
npm run compile:ts-only

echo "🧪 Running tests for services..."
npm test

echo "✅ Build completed! Extension ready for testing."
echo ""
echo "🎯 Next steps:"
echo "1. Open VSCode in the extension directory"
echo "2. Press F5 to launch Extension Development Host"
echo "3. Open the AI Debug Context panel from the Activity Bar"
echo "4. Test the Copilot integration with your workflows"
