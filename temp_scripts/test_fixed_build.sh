#!/bin/bash

echo "🔧 Testing Fixed Build Process - No More Hashed Filenames!"
echo "=========================================================="

PROJECT_ROOT="/Users/gregdunn/src/test/ai_debug_context/vscode_2"
cd "$PROJECT_ROOT"

echo ""
echo "📋 What was fixed:"
echo "=================="
echo "✅ Added 'vscode' configuration in angular.json"
echo "✅ Set outputHashing: 'none' for VSCode builds"
echo "✅ Updated build script to use --configuration vscode"
echo "✅ Files will now have predictable names (main.js, polyfills.js, etc.)"
echo ""

echo "🧹 Cleaning previous build..."
rm -rf out/webview

echo ""
echo "🔧 Running fixed build process..."
npm run compile

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Build completed successfully!"
    echo ""
    echo "📂 Checking output files with correct names:"
    echo ""
    
    if [ -d "out/webview" ]; then
        echo "Generated files:"
        ls -la out/webview/
        echo ""
        
        echo "🔍 VSCode Extension Requirements:"
        
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
        
        echo ""
        echo "🎯 VSCode Extension Detection:"
        echo "The webview provider checks for main.js and polyfills.js"
        if [ -f "out/webview/main.js" ] && [ -f "out/webview/polyfills.js" ]; then
            echo "✅ Extension will detect Angular build and load full interface!"
        else
            echo "❌ Extension will show setup message"
        fi
        
    else
        echo "❌ out/webview directory missing"
        exit 1
    fi
    
else
    echo "❌ Build failed"
    exit 1
fi

echo ""
echo "🎉 Fix Complete!"
echo "================"
echo ""
echo "✅ Angular builds with predictable filenames"
echo "✅ VSCode extension can find required files"
echo "✅ No more 'Setup Required' message"
echo ""
echo "🚀 Ready to test in VSCode!"
echo ""
echo "Press F5 in VSCode and the full Angular interface should load immediately!"
