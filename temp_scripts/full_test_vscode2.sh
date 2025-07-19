#!/bin/bash

echo "🚀 VSCode Extension v2 - Complete Build and Test"
echo "================================================="

PROJECT_ROOT="/Users/gregdunn/src/test/ai_debug_context/vscode_2"
cd "$PROJECT_ROOT"

echo ""
echo "📦 VSCode Extension Setup"
echo "-------------------------"

# Install main dependencies
echo "Installing VSCode extension dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install VSCode extension dependencies"
    exit 1
fi

echo ""
echo "🔧 Compiling TypeScript (VSCode Extension)"
echo "-------------------------------------------"
npx tsc --noEmit

if [ $? -eq 0 ]; then
    echo "✅ TypeScript compilation successful!"
else
    echo "❌ TypeScript compilation failed"
    exit 1
fi

echo ""
echo "🧪 Running VSCode Extension Tests"
echo "---------------------------------"
npm test

EXTENSION_TEST_EXIT_CODE=$?

echo ""
echo "📱 Angular Webview Setup"
echo "------------------------"

cd "$PROJECT_ROOT/webview-ui"

# Install webview dependencies
echo "Installing Angular webview dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install Angular webview dependencies"
    exit 1
fi

echo ""
echo "🧪 Running Angular Tests"
echo "------------------------"
npm test -- --watch=false

ANGULAR_TEST_EXIT_CODE=$?

echo ""
echo "🔧 Building Angular Webview"
echo "---------------------------"
npm run build

ANGULAR_BUILD_EXIT_CODE=$?

echo ""
echo "📊 Build Summary"
echo "==============="
if [ $EXTENSION_TEST_EXIT_CODE -eq 0 ]; then
    echo "✅ VSCode Extension Tests: PASSED"
else
    echo "❌ VSCode Extension Tests: FAILED"
fi

if [ $ANGULAR_TEST_EXIT_CODE -eq 0 ]; then
    echo "✅ Angular Tests: PASSED"
else
    echo "❌ Angular Tests: FAILED"
fi

if [ $ANGULAR_BUILD_EXIT_CODE -eq 0 ]; then
    echo "✅ Angular Build: SUCCESS"
else
    echo "❌ Angular Build: FAILED"
fi

echo ""
if [ $EXTENSION_TEST_EXIT_CODE -eq 0 ] && [ $ANGULAR_TEST_EXIT_CODE -eq 0 ] && [ $ANGULAR_BUILD_EXIT_CODE -eq 0 ]; then
    echo "🎉 All checks passed! Extension ready for testing."
else
    echo "⚠️  Some checks failed. Please review the output above."
fi

echo ""
echo "📋 Next Steps:"
echo "1. Press F5 in VSCode to run the extension in debug mode"
echo "2. Look for the AI Debug Context icon in the Activity Bar"
echo "3. Test the Angular webview interface"
