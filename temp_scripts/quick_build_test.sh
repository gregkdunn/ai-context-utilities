#!/bin/bash

# Quick Build Test for AI Debug Context VSCode Extension
# This script performs a quick verification of the build process

set -e  # Exit on any error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" &> /dev/null && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")/vscode_2"

echo "🧪 AI Debug Context - Quick Build Test"
echo "======================================"
echo "Project directory: $PROJECT_DIR"
echo ""

cd "$PROJECT_DIR"

# Step 1: Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ package.json not found! Are we in the right directory?"
    exit 1
fi

echo "✅ Found package.json"

# Step 2: Check TypeScript compilation
echo ""
echo "🔨 Testing TypeScript compilation..."
npx tsc --noEmit
if [ $? -eq 0 ]; then
    echo "✅ TypeScript compilation successful (no emit)"
else
    echo "❌ TypeScript compilation failed!"
    echo "Fix TypeScript errors before proceeding."
    exit 1
fi

# Step 3: Quick compile test
echo ""
echo "🏗️  Quick compile test..."
npm run compile
if [ $? -eq 0 ]; then
    echo "✅ Extension compilation successful"
else
    echo "❌ Extension compilation failed!"
    exit 1
fi

# Step 4: Check if Angular can build
echo ""
echo "🌐 Testing Angular webview build..."
cd webview-ui
npx ng build --configuration production --output-path ../out/webview-test
if [ $? -eq 0 ]; then
    echo "✅ Angular build successful"
    # Clean up test build
    rm -rf ../out/webview-test
else
    echo "❌ Angular build failed!"
    cd ..
    exit 1
fi
cd ..

# Step 5: Run tests
echo ""
echo "🧪 Running tests..."
npm test
if [ $? -eq 0 ]; then
    echo "✅ All tests passed"
else
    echo "❌ Tests failed!"
    exit 1
fi

echo ""
echo "🎉 QUICK BUILD TEST SUCCESSFUL!"
echo ""
echo "✅ TypeScript compiles without errors"
echo "✅ Extension builds successfully"  
echo "✅ Angular webview builds successfully"
echo "✅ All tests pass"
echo ""
echo "📋 Ready for VSCode testing:"
echo "1. Open this folder in VSCode"
echo "2. Press F5 to launch Extension Development Host"
echo "3. Look for 'AI Debug Context' icon in Activity Bar"
echo "4. Test the webview functionality"
echo ""
echo "🚀 Next steps: Full integration testing and feature implementation"
