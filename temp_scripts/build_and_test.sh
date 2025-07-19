#!/bin/bash

# AI Debug Context VSCode Extension - Build and Test Script
# This script builds and tests the extension to ensure it's working properly

set -e  # Exit on any error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" &> /dev/null && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")/vscode_2"

echo "🚀 AI Debug Context - Build and Test"
echo "====================================="
echo "Project directory: $PROJECT_DIR"
echo ""

cd "$PROJECT_DIR"

# Step 1: Install dependencies if needed
echo "📦 Checking dependencies..."
if [ ! -d "node_modules" ]; then
    echo "Installing main project dependencies..."
    npm install
fi

if [ ! -d "webview-ui/node_modules" ]; then
    echo "Installing webview dependencies..."
    cd webview-ui
    npm install
    cd ..
fi

# Step 2: TypeScript compilation
echo ""
echo "🔨 Compiling TypeScript..."
npm run compile
if [ $? -ne 0 ]; then
    echo "❌ TypeScript compilation failed!"
    exit 1
fi
echo "✅ TypeScript compilation successful"

# Step 3: Run tests
echo ""
echo "🧪 Running tests..."
npm test
if [ $? -ne 0 ]; then
    echo "❌ Tests failed!"
    exit 1
fi
echo "✅ All tests passed"

# Step 4: Build Angular webview
echo ""
echo "🌐 Building Angular webview..."
npm run build:webview
if [ $? -ne 0 ]; then
    echo "❌ Angular build failed!"
    exit 1
fi
echo "✅ Angular webview built successfully"

# Step 5: Check build outputs
echo ""
echo "📁 Checking build outputs..."

if [ -f "out/extension.js" ]; then
    echo "✅ Extension compiled: out/extension.js"
else
    echo "❌ Extension compilation missing: out/extension.js"
    exit 1
fi

if [ -d "out/webview" ]; then
    echo "✅ Webview built: out/webview/"
    ls -la out/webview/ | head -10
else
    echo "❌ Webview build missing: out/webview/"
    exit 1
fi

# Step 6: Validate package.json
echo ""
echo "📋 Validating package.json..."
if command -v jq >/dev/null 2>&1; then
    # Check if required fields exist
    name=$(jq -r '.name' package.json)
    version=$(jq -r '.version' package.json)
    main=$(jq -r '.main' package.json)
    
    echo "  Name: $name"
    echo "  Version: $version"
    echo "  Main: $main"
    
    if [ "$main" != "./out/extension.js" ]; then
        echo "❌ Main entry point should be './out/extension.js'"
        exit 1
    fi
else
    echo "⚠️  jq not available, skipping JSON validation"
fi

echo ""
echo "🎉 BUILD AND TEST SUCCESSFUL!"
echo ""
echo "Next steps:"
echo "1. Open VSCode"
echo "2. Press F5 to launch Extension Development Host"
echo "3. Look for 'AI Debug Context' in the Activity Bar"
echo "4. Test the extension functionality"
echo ""
echo "Available commands in VSCode:"
echo "- Ctrl/Cmd + Shift + P: 'AI Test Debug'"
echo "- Activity Bar: Click the debug icon to open the main view"
