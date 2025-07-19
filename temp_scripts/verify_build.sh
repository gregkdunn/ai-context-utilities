#!/bin/bash

echo "=========================================="
echo "AI Debug Context VSCode Extension V2"
echo "Build Status Check"
echo "=========================================="

# Change to the project directory
cd /Users/gregdunn/src/test/ai_debug_context/vscode_2

echo ""
echo "1. Checking project structure..."
if [ -f "package.json" ] && [ -f "src/extension.ts" ] && [ -d "webview-ui" ]; then
    echo "✅ Project structure is valid"
else
    echo "❌ Project structure issues found"
    exit 1
fi

echo ""
echo "2. Installing dependencies..."
npm install --silent
if [ $? -eq 0 ]; then
    echo "✅ Extension dependencies installed"
else
    echo "❌ Extension dependency installation failed"
    exit 1
fi

echo ""
echo "3. Installing Angular dependencies..."
cd webview-ui
npm install --silent
if [ $? -eq 0 ]; then
    echo "✅ Angular dependencies installed"
else
    echo "❌ Angular dependency installation failed"
    exit 1
fi

echo ""
echo "4. Compiling TypeScript..."
cd ..
npm run compile --silent
if [ $? -eq 0 ]; then
    echo "✅ TypeScript compilation successful"
else
    echo "❌ TypeScript compilation failed"
    exit 1
fi

echo ""
echo "5. Building Angular webview..."
npm run build:webview --silent
if [ $? -eq 0 ]; then
    echo "✅ Angular build successful"
else
    echo "❌ Angular build failed"
    exit 1
fi

echo ""
echo "6. Running extension tests..."
npm test --silent
if [ $? -eq 0 ]; then
    echo "✅ Extension tests passed"
else
    echo "❌ Extension tests failed"
fi

echo ""
echo "7. Running Angular tests..."
cd webview-ui
npm test -- --passWithNoTests --silent
if [ $? -eq 0 ]; then
    echo "✅ Angular tests passed"
else
    echo "❌ Angular tests failed"
fi

echo ""
echo "=========================================="
echo "Build status check complete!"
echo ""
echo "To test the extension:"
echo "1. Open VSCode"
echo "2. Press F5 to launch Extension Development Host"
echo "3. Look for 'AI Debug Context' in the Activity Bar"
echo "4. Click the icon to open the webview"
echo "=========================================="
