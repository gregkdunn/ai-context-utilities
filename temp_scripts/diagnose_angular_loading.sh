#!/bin/bash

echo "🔍 Diagnosing Angular Webview Loading Issue"
echo "==========================================="

PROJECT_ROOT="/Users/gregdunn/src/test/ai_debug_context/vscode_2"
cd "$PROJECT_ROOT"

echo ""
echo "📊 Current Build Status:"
echo "========================"

# Clean and rebuild
echo "🧹 Cleaning and rebuilding..."
rm -rf out/webview
npm run compile

echo ""
echo "📂 Generated Files Check:"
echo "========================="

if [ -d "out/webview" ]; then
    echo "✅ out/webview directory exists"
    echo ""
    echo "📋 File listing:"
    ls -la out/webview/
    
    echo ""
    echo "🔍 Key Files Analysis:"
    
    if [ -f "out/webview/main.js" ]; then
        echo "✅ main.js exists ($(du -h out/webview/main.js | cut -f1))"
        echo "   First few lines:"
        head -5 out/webview/main.js
    else
        echo "❌ main.js missing"
    fi
    
    echo ""
    if [ -f "out/webview/polyfills.js" ]; then
        echo "✅ polyfills.js exists ($(du -h out/webview/polyfills.js | cut -f1))"
    else
        echo "❌ polyfills.js missing"
    fi
    
    echo ""
    if [ -f "out/webview/runtime.js" ]; then
        echo "✅ runtime.js exists ($(du -h out/webview/runtime.js | cut -f1))"
    else
        echo "⚠️  runtime.js missing (might be needed for ES modules)"
    fi
    
    echo ""
    if [ -f "out/webview/index.html" ]; then
        echo "✅ index.html exists"
        echo "   Content preview:"
        echo "   ================"
        head -20 out/webview/index.html
    else
        echo "❌ index.html missing"
    fi
    
else
    echo "❌ out/webview directory missing"
    exit 1
fi

echo ""
echo "🔧 Angular Version Check:"
echo "========================="
cd webview-ui
echo "Angular CLI version:"
npx ng version --skip-git 2>/dev/null | head -10

echo ""
echo "📋 Package.json Angular version:"
grep "@angular" package.json

echo ""
echo "🎯 Potential Issues:"
echo "==================="
echo "1. ES Modules: Angular 15+ uses ES modules by default"
echo "2. New Control Flow: @if/@for syntax requires Angular 17+"
echo "3. VSCode Webview: May have compatibility issues with ES modules"
echo "4. CSP: Content Security Policy might be blocking module imports"

echo ""
echo "🛠️  Suggested Fixes:"
echo "==================="
echo "1. Try building with --target=es2017 for better compatibility"
echo "2. Check if runtime.js is needed and being loaded"
echo "3. Update CSP to allow ES module imports"
echo "4. Consider downgrading to template-driven syntax if needed"

echo ""
echo "🧪 Next Steps:"
echo "=============="
echo "1. Test the updated webview provider with better ES module support"
echo "2. Check browser console in VSCode Developer Tools for errors"
echo "3. Try loading the index.html directly in a browser to isolate issues"

cd ..
