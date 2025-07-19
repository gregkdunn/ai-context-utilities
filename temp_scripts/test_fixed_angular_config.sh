#!/bin/bash

echo "🔧 Testing Fixed Angular Build Configuration"
echo "=========================================="

PROJECT_ROOT="/Users/gregdunn/src/test/ai_debug_context/vscode_2"
cd "$PROJECT_ROOT"

echo ""
echo "📋 What was fixed:"
echo "=================="
echo "❌ Removed invalid 'bundleDependencies' property from angular.json"
echo "✅ Kept valid Angular build options for VSCode compatibility"
echo ""

echo "🔧 Testing build..."
npm run compile

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Build completed successfully!"
    echo ""
    echo "📂 Checking generated files:"
    if [ -d "out/webview" ]; then
        echo "Generated files:"
        ls -la out/webview/
        
        echo ""
        echo "🔍 Key files check:"
        
        if [ -f "out/webview/main.js" ]; then
            echo "✅ main.js: $(du -h out/webview/main.js | cut -f1)"
        else
            echo "❌ main.js missing"
        fi
        
        if [ -f "out/webview/polyfills.js" ]; then
            echo "✅ polyfills.js: $(du -h out/webview/polyfills.js | cut -f1)"
        else
            echo "❌ polyfills.js missing"
        fi
        
        if [ -f "out/webview/runtime.js" ]; then
            echo "✅ runtime.js: $(du -h out/webview/runtime.js | cut -f1)"
        else
            echo "❌ runtime.js missing"
        fi
        
        if [ -f "out/webview/styles.css" ]; then
            echo "✅ styles.css: $(du -h out/webview/styles.css | cut -f1)"
        else
            echo "❌ styles.css missing"
        fi
        
        if [ -f "out/webview/index.html" ]; then
            echo "✅ index.html: $(du -h out/webview/index.html | cut -f1)"
        else
            echo "❌ index.html missing"
        fi
        
    else
        echo "❌ out/webview directory missing"
    fi
    
    echo ""
    echo "🚀 Ready to test in VSCode!"
    echo "=========================="
    echo "1. Press F5 in VSCode to launch the extension"
    echo "2. Click the AI Debug Context icon in the Activity Bar"
    echo "3. The updated webview provider should now load the Angular app correctly"
    echo ""
    echo "If you still see 'Loading AI Debug Context...', check the browser console:"
    echo "Help → Toggle Developer Tools → Console tab"
    
else
    echo ""
    echo "❌ Build failed!"
    echo ""
    echo "Check the error messages above for Angular build issues."
fi
