#!/bin/bash

echo "🔧 Testing Integrated Build Process - AI Debug Context VSCode Extension v2"
echo "=========================================================================="

PROJECT_ROOT="/Users/gregdunn/src/test/ai_debug_context/vscode_2"
cd "$PROJECT_ROOT"

echo ""
echo "📋 What Changed:"
echo "==============="
echo "✅ Updated 'compile' script to include webview build"
echo "✅ Added 'compile:ts-only' for TypeScript-only compilation"
echo "✅ Updated 'watch' script to watch both webview and TypeScript"
echo "✅ Added 'concurrently' dependency for parallel watching"
echo "✅ Simplified 'vscode:prepublish' to just run compile"
echo ""

echo "📦 Installing updated dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo ""
echo "🧪 Testing the new integrated compile command..."
echo ""
echo "This should now:"
echo "1. Build the Angular webview first"
echo "2. Then compile the TypeScript extension code"
echo ""

npm run compile

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Integrated compile completed successfully!"
    echo ""
    echo "📂 Verifying output files:"
    echo ""
    
    echo "VSCode Extension files:"
    if [ -f "out/extension.js" ]; then
        echo "✅ out/extension.js exists"
    else
        echo "❌ out/extension.js missing"
    fi
    
    echo ""
    echo "Angular Webview files:"
    if [ -d "out/webview" ]; then
        echo "✅ out/webview/ directory exists"
        
        if [ -f "out/webview/main.js" ]; then
            echo "✅ out/webview/main.js exists"
        else
            echo "❌ out/webview/main.js missing"
        fi
        
        if [ -f "out/webview/polyfills.js" ]; then
            echo "✅ out/webview/polyfills.js exists"
        else
            echo "❌ out/webview/polyfills.js missing"
        fi
        
        if [ -f "out/webview/styles.css" ]; then
            echo "✅ out/webview/styles.css exists"
        else
            echo "❌ out/webview/styles.css missing"
        fi
    else
        echo "❌ out/webview/ directory missing"
    fi
    
else
    echo "❌ Integrated compile failed"
    exit 1
fi

echo ""
echo "🎉 Integration Test Complete!"
echo "============================="
echo ""
echo "📋 Script Summary:"
echo "• compile: Now builds webview + TypeScript automatically"
echo "• watch: Watches both webview and TypeScript in parallel"
echo "• F5 in VSCode: Will now automatically build everything"
echo ""
echo "🚀 Ready to test in VSCode!"
echo ""
echo "Now when you press F5 in VSCode:"
echo "1. It runs 'npm run compile' as the preLaunchTask"
echo "2. This builds the Angular webview first"
echo "3. Then compiles the TypeScript extension"
echo "4. Launches the Extension Development Host"
echo "5. The webview should load immediately with no setup message!"
echo ""
echo "🔄 For development, use 'npm run watch' to:"
echo "• Watch Angular files and rebuild webview automatically"
echo "• Watch TypeScript files and recompile extension automatically"
