#!/bin/bash

echo "=== AI Debug Context VSCode Extension v2 - Simple Build Test ==="
echo "Date: $(date)"
echo ""

PROJECT_DIR="/Users/gregdunn/src/test/ai_debug_context/vscode_2"
cd "$PROJECT_DIR"

echo "🏠 Working directory: $PROJECT_DIR"
echo ""

# Test TypeScript compilation
echo "1️⃣  Testing TypeScript compilation..."
if npx tsc --noEmit; then
    echo "   ✅ TypeScript compilation: SUCCESS"
else
    echo "   ❌ TypeScript compilation: FAILED"
    exit 1
fi

echo ""

# Test extension tests
echo "2️⃣  Running extension tests..."
if npm test -- --silent; then
    echo "   ✅ Extension tests: SUCCESS"
else
    echo "   ❌ Extension tests: FAILED"
    exit 1
fi

echo ""

# Test Angular webview build
echo "3️⃣  Building Angular webview..."
if cd webview-ui && npm run build; then
    echo "   ✅ Angular webview build: SUCCESS"
    cd ..
else
    echo "   ❌ Angular webview build: FAILED"
    exit 1
fi

echo ""

# Test Angular webview tests
echo "4️⃣  Running Angular webview tests..."
if cd webview-ui && npm test -- --watchAll=false; then
    echo "   ✅ Angular webview tests: SUCCESS"
    cd ..
else
    echo "   ❌ Angular webview tests: FAILED"
    cd ..
    exit 1
fi

echo ""

# Final compilation
echo "5️⃣  Final extension compilation..."
if npm run compile; then
    echo "   ✅ Final compilation: SUCCESS"
else
    echo "   ❌ Final compilation: FAILED"
    exit 1
fi

echo ""
echo "🎉 All tests and builds completed successfully!"
echo ""
echo "📋 NEXT STEPS:"
echo "1. Press F5 in VSCode to launch Extension Development Host"
echo "2. Open the AI Debug Context view in the Activity Bar"
echo "3. Test the extension functionality"
echo ""
