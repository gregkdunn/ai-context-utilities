#!/bin/bash

# Test script for VSCode Extension v2
cd "/Users/gregdunn/src/test/ai_debug_context/vscode_2"

echo "=== AI Debug Context VSCode Extension v2 Test ==="
echo "Current directory: $(pwd)"

# Check if node_modules exist
if [ ! -d "node_modules" ]; then
    echo "Installing root dependencies..."
    npm install
fi

# Check webview node_modules
if [ ! -d "webview-ui/node_modules" ]; then
    echo "Installing webview dependencies..."
    cd webview-ui && npm install && cd ..
fi

echo ""
echo "=== TypeScript Compilation Test ==="
npx tsc --noEmit
if [ $? -eq 0 ]; then
    echo "✅ TypeScript compilation successful"
else
    echo "❌ TypeScript compilation failed"
    exit 1
fi

echo ""
echo "=== Angular Component Tests ==="
cd webview-ui
npm test -- --passWithNoTests --watch=false
if [ $? -eq 0 ]; then
    echo "✅ Angular tests passed"
else
    echo "❌ Angular tests failed"
    cd ..
    exit 1
fi
cd ..

echo ""
echo "=== VSCode Extension Tests ==="
npm test
if [ $? -eq 0 ]; then
    echo "✅ Extension tests passed"
else
    echo "❌ Extension tests failed"
    exit 1
fi

echo ""
echo "=== Build Angular UI ==="
cd webview-ui && npm run build && cd ..
if [ $? -eq 0 ]; then
    echo "✅ Angular build successful"
else
    echo "❌ Angular build failed"
    exit 1
fi

echo ""
echo "=== Compile Extension ==="
npm run compile
if [ $? -eq 0 ]; then
    echo "✅ Extension compilation successful"
else
    echo "❌ Extension compilation failed"
    exit 1
fi

echo ""
echo "🎉 All tests passed! Extension is ready for VSCode testing."
echo ""
echo "To test in VSCode:"
echo "1. Open this project in VSCode"
echo "2. Press F5 to launch Extension Development Host"
echo "3. Look for AI Debug Context icon in Activity Panel"
echo "4. Test all 4 modules: DIFF, NX TEST, AI DEBUG, PR DESC"
