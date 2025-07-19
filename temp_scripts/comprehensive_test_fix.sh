#!/bin/bash

cd /Users/gregdunn/src/test/ai_debug_context/vscode_2

echo "🔧 Comprehensive Test Fixes"
echo "============================"

# Clean and compile
echo "1. 🧹 Clean build..."
rm -rf out/*
npm run compile
if [ $? -ne 0 ]; then
    echo "❌ Compilation failed!"
    exit 1
fi

# Test individual files
echo ""
echo "2. 🧪 Testing individual files..."

files=("GitIntegration" "TestRunner" "extension" "AIDebugWebviewProvider")

for file in "${files[@]}"; do
    echo "   Testing $file..."
    npx jest "src/__tests__/${file}.test.ts" --silent
    if [ $? -eq 0 ]; then
        echo "   ✅ $file tests passing"
    else
        echo "   ❌ $file tests failing - running with details:"
        npx jest "src/__tests__/${file}.test.ts" --verbose
        echo "   Continuing to next test..."
    fi
done

echo ""
echo "3. 🧪 Running full test suite..."
npm test
if [ $? -eq 0 ]; then
    echo "✅ All tests passing!"
else
    echo "❌ Some tests still failing"
    exit 1
fi

echo ""
echo "🎉 All test fixes complete!"
