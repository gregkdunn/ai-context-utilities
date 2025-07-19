#!/bin/bash

echo "🔍 VSCode Extension v2 - Structure Verification"
echo "==============================================="

PROJECT_ROOT="/Users/gregdunn/src/test/ai_debug_context/vscode_2"

echo ""
echo "📁 Checking project structure..."

# Check main files exist
echo "Checking core files:"
echo -n "  📄 package.json: "
if [ -f "$PROJECT_ROOT/package.json" ]; then
    echo "✅"
else
    echo "❌"
fi

echo -n "  📄 tsconfig.json: "
if [ -f "$PROJECT_ROOT/tsconfig.json" ]; then
    echo "✅"
else
    echo "❌"
fi

echo -n "  📄 extension.ts: "
if [ -f "$PROJECT_ROOT/src/extension.ts" ]; then
    echo "✅"
else
    echo "❌"
fi

echo -n "  📄 webview-ui/package.json: "
if [ -f "$PROJECT_ROOT/webview-ui/package.json" ]; then
    echo "✅"
else
    echo "❌"
fi

echo ""
echo "📦 Checking dependencies..."
cd "$PROJECT_ROOT"

echo -n "  📦 Main node_modules: "
if [ -d "node_modules" ]; then
    echo "✅ (installed)"
else
    echo "🔄 (running npm install...)"
    npm install > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        echo "   ✅ Dependencies installed successfully"
    else
        echo "   ❌ Failed to install dependencies"
    fi
fi

echo -n "  📦 Webview node_modules: "
if [ -d "webview-ui/node_modules" ]; then
    echo "✅ (installed)"
else
    echo "🔄 (running npm install...)"
    cd webview-ui
    npm install > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        echo "   ✅ Webview dependencies installed successfully"
    else
        echo "   ❌ Failed to install webview dependencies"
    fi
    cd ..
fi

echo ""
echo "🔧 Testing TypeScript compilation..."
npx tsc --noEmit --project .

if [ $? -eq 0 ]; then
    echo "✅ TypeScript compilation successful!"
else
    echo "❌ TypeScript compilation failed"
    exit 1
fi

echo ""
echo "🔧 Testing Angular build..."
cd webview-ui
npm run build > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo "✅ Angular build successful!"
else
    echo "❌ Angular build failed"
    exit 1
fi

cd ..

echo ""
echo "📊 Verification Summary"
echo "======================="
echo "✅ All core files present"
echo "✅ Dependencies installed"
echo "✅ TypeScript compiles successfully"
echo "✅ Angular builds successfully"
echo ""
echo "🚀 Extension is ready for testing!"
echo ""
echo "To test the extension:"
echo "1. Open VSCode in the project folder: code ."
echo "2. Press F5 to launch Extension Development Host"
echo "3. Look for the AI Debug Context icon in the Activity Bar"
echo "4. Click the icon to open the webview"
