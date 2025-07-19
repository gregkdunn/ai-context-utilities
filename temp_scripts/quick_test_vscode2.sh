#!/bin/bash

echo "🧪 Quick Test - VSCode Extension v2"
echo "==================================="

cd /Users/gregdunn/src/test/ai_debug_context/vscode_2

echo ""
echo "🔧 Quick TypeScript check..."
npx tsc --noEmit

if [ $? -eq 0 ]; then
    echo "✅ TypeScript compilation looks good!"
else
    echo "❌ TypeScript issues found"
    exit 1
fi

echo ""
echo "🧪 Running Jest tests..."
npm test -- --verbose

echo ""
echo "✅ Quick test completed!"
