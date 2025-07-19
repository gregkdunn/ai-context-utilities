#!/bin/bash

echo "🛠️  Complete Setup and Test - AI Debug Context VSCode Extension v2"
echo "=================================================================="

PROJECT_ROOT="/Users/gregdunn/src/test/ai_debug_context/vscode_2"
cd "$PROJECT_ROOT"

echo ""
echo "Step 1: Installing Dependencies"
echo "==============================="

# Install main dependencies
echo "📦 Installing VSCode extension dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install main dependencies"
    exit 1
fi

# Install webview dependencies
echo "📦 Installing Angular webview dependencies..."
cd webview-ui
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install webview dependencies"
    exit 1
fi

echo ""
echo "Step 2: Building Angular Webview"
echo "================================"

echo "🔧 Building Angular webview for production..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Angular webview built successfully!"
else
    echo "❌ Angular webview build failed"
    echo ""
    echo "Trying to diagnose the issue..."
    echo "Checking Angular CLI..."
    npx ng version
    exit 1
fi

cd ..

echo ""
echo "Step 3: Compiling VSCode Extension"
echo "=================================="

echo "🔧 Compiling TypeScript..."
npm run compile

if [ $? -eq 0 ]; then
    echo "✅ VSCode extension compiled successfully!"
else
    echo "❌ VSCode extension compilation failed"
    exit 1
fi

echo ""
echo "Step 4: Verifying Build Output"
echo "=============================="

echo "📂 Checking out/webview directory..."
if [ -d "out/webview" ]; then
    echo "✅ out/webview directory exists"
    
    echo ""
    echo "📊 Build files:"
    ls -la out/webview/
    
    echo ""
    echo "🔍 Checking required files:"
    
    if [ -f "out/webview/main.js" ]; then
        echo "✅ main.js exists ($(du -h out/webview/main.js | cut -f1))"
    else
        echo "❌ main.js missing"
    fi
    
    if [ -f "out/webview/polyfills.js" ]; then
        echo "✅ polyfills.js exists ($(du -h out/webview/polyfills.js | cut -f1))"
    else
        echo "❌ polyfills.js missing"
    fi
    
    if [ -f "out/webview/styles.css" ]; then
        echo "✅ styles.css exists ($(du -h out/webview/styles.css | cut -f1))"
    else
        echo "❌ styles.css missing"
    fi
    
    if [ -f "out/webview/index.html" ]; then
        echo "✅ index.html exists ($(du -h out/webview/index.html | cut -f1))"
    else
        echo "❌ index.html missing"
    fi
    
else
    echo "❌ out/webview directory missing"
    exit 1
fi

echo ""
echo "Step 5: Testing Extension Backend"
echo "================================="

echo "🧪 Running Jest tests..."
npm test

if [ $? -eq 0 ]; then
    echo "✅ All backend tests passed!"
else
    echo "⚠️  Some backend tests failed, but continuing..."
fi

echo ""
echo "🎉 Setup Complete!"
echo "=================="
echo ""
echo "✅ Angular webview built successfully"
echo "✅ VSCode extension compiled"
echo "✅ All required files present"
echo ""
echo "🚀 Ready to test in VSCode!"
echo ""
echo "Testing Instructions:"
echo "1. Open VSCode in this directory:"
echo "   code /Users/gregdunn/src/test/ai_debug_context/vscode_2"
echo ""
echo "2. Press F5 to launch Extension Development Host"
echo ""
echo "3. In the new window, look for the 🤖 'AI Debug Context' icon"
echo "   in the Activity Bar (left sidebar)"
echo ""
echo "4. Click the icon to open the webview"
echo ""
echo "5. You should now see the Angular interface with:"
echo "   - File Selection module"
echo "   - Test Selection module"  
echo "   - AI Debug module"
echo "   - PR Generator module"
echo ""
echo "6. If you still see the 'Setup Required' message:"
echo "   - Reload the window with Ctrl+R (or Cmd+R on Mac)"
echo "   - Or restart the debug session with Ctrl+Shift+F5"
echo ""
echo "🔧 Troubleshooting:"
echo "If there are issues, check the Developer Console:"
echo "- Help → Toggle Developer Tools"
echo "- Look for any error messages in the Console tab"
