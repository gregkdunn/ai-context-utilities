#!/bin/bash

echo "=== Quick TypeScript Compilation Test ==="
echo "Date: $(date)"
echo ""

PROJECT_DIR="/Users/gregdunn/src/test/ai_debug_context/vscode_2"
cd "$PROJECT_DIR"

echo "🏠 Working directory: $PROJECT_DIR"
echo ""

# Test main extension TypeScript compilation
echo "1️⃣  Testing main extension TypeScript compilation..."
echo "Running: npx tsc --noEmit"
echo ""

npx tsc --noEmit

if [ $? -eq 0 ]; then
    echo ""
    echo "   ✅ Main extension TypeScript compilation: SUCCESS"
else
    echo ""
    echo "   ❌ Main extension TypeScript compilation: FAILED"
    exit 1
fi

echo ""

# Test Angular webview TypeScript compilation
echo "2️⃣  Testing Angular webview TypeScript compilation..."
echo "Running: cd webview-ui && npx ng build --configuration=production"
echo ""

cd webview-ui
npx ng build --configuration=production

if [ $? -eq 0 ]; then
    echo ""
    echo "   ✅ Angular webview compilation: SUCCESS"
    cd ..
else
    echo ""
    echo "   ❌ Angular webview compilation: FAILED"
    cd ..
    exit 1
fi

echo ""
echo "🎉 All TypeScript compilation tests passed!"
echo ""
echo "📋 Files generated:"
echo "Main extension:"
ls -la out/ 2>/dev/null || echo "  No out/ directory yet"
echo ""
echo "Angular webview:"
ls -la out/webview/ 2>/dev/null || echo "  No out/webview/ directory yet"

echo ""
echo "✅ Ready for testing in VSCode Development Host!"
