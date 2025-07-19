#!/bin/bash

cd /Users/gregdunn/src/test/ai_debug_context/vscode_2

echo "🔧 Testing fixes for TypeScript and package.json issues..."
echo ""

# Compile TypeScript to check for errors
echo "1. 🔨 Compiling TypeScript..."
npm run compile
if [ $? -ne 0 ]; then
    echo "❌ TypeScript compilation failed!"
    exit 1
fi
echo "✅ TypeScript compiled successfully"

# Run tests to verify the fixes
echo ""
echo "2. 🧪 Running tests..."
npm test
if [ $? -ne 0 ]; then
    echo "❌ Tests failed!"
    exit 1
fi
echo "✅ All tests passed"

echo ""
echo "🎉 All issues fixed successfully!"
echo "   ✓ TypeScript type error resolved"
echo "   ✓ Package.json activation event cleaned up"
echo "   ✓ Extension ready for testing"
