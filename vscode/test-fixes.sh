#!/bin/bash

# Test script to verify fixes for corrupted TypeScript files

echo "Testing VSCode Extension after fixes..."

# Change to the project directory
cd /Users/gregdunn/src/test/ai_debug_context/vscode

echo "1. Testing TypeScript compilation..."

# Check if TypeScript can compile the main project
npx tsc --noEmit
if [ $? -eq 0 ]; then
    echo "✅ Main TypeScript compilation successful"
else
    echo "❌ Main TypeScript compilation failed"
fi

echo ""
echo "2. Testing Angular compilation..."

# Check if Angular app can compile
cd angular-app
npm run build 2>/dev/null
if [ $? -eq 0 ]; then
    echo "✅ Angular compilation successful"
else
    echo "❌ Angular compilation failed"
fi

cd ..

echo ""
echo "3. Testing Jest tests..."

# Run Jest tests
npm run test 2>/dev/null
if [ $? -eq 0 ]; then
    echo "✅ Jest tests passed"
else
    echo "❌ Jest tests failed"
fi

echo ""
echo "4. Testing specific files..."

# Test specific files that were corrupted
echo "Testing collaboration-panel.component.ts..."
npx tsc --noEmit angular-app/src/app/components/collaboration-panel/collaboration-panel.component.ts
if [ $? -eq 0 ]; then
    echo "✅ collaboration-panel.component.ts compiles successfully"
else
    echo "❌ collaboration-panel.component.ts compilation failed"
fi

echo "Testing phase42Implementation.test.ts..."
npx tsc --noEmit src/services/ai-insights/__tests__/phase42Implementation.test.ts
if [ $? -eq 0 ]; then
    echo "✅ phase42Implementation.test.ts compiles successfully"
else
    echo "❌ phase42Implementation.test.ts compilation failed"
fi

echo "Testing pluginManager.test.ts..."
npx tsc --noEmit src/services/plugins/__tests__/pluginManager.test.ts
if [ $? -eq 0 ]; then
    echo "✅ pluginManager.test.ts compiles successfully"
else
    echo "❌ pluginManager.test.ts compilation failed"
fi

echo ""
echo "✅ All tests completed!"
