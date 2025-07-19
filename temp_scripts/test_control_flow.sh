#!/bin/bash

echo "🔧 Testing New Angular Control Flow Syntax"
echo "=========================================="

PROJECT_ROOT="/Users/gregdunn/src/test/ai_debug_context/vscode_2"
cd "$PROJECT_ROOT"

echo ""
echo "📋 Angular Version Check:"
cd webview-ui
npx ng version --skip-git 2>/dev/null | head -5

echo ""
echo "🔧 Attempting build with @if/@for syntax..."
cd "$PROJECT_ROOT"

# Clean build to ensure fresh start
rm -rf out/webview

# Try to build
npm run compile

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Build successful! New control flow syntax is working!"
    echo ""
    echo "📂 Generated files:"
    if [ -d "out/webview" ]; then
        ls -la out/webview/ | grep -E '\.(js|css|html)$'
    fi
    
else
    echo ""
    echo "❌ Build failed with @if/@for syntax"
    echo ""
    echo "🔧 This could be due to:"
    echo "1. Angular version compatibility"
    echo "2. Missing compiler flags"
    echo "3. TypeScript configuration"
    echo ""
    echo "💡 Solutions:"
    echo "1. Try running the control flow migration:"
    echo "   bash /Users/gregdunn/src/test/ai_debug_context/temp_scripts/enable_control_flow.sh"
    echo ""
    echo "2. Or temporarily use traditional syntax (*ngIf/*ngFor) until we can enable it"
    echo ""
    echo "📚 Reference: https://angular.io/guide/control_flow"
fi
