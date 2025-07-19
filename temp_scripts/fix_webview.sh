#!/bin/bash

echo "🔧 Quick Fix: Building Webview for AI Debug Context"
echo "=================================================="

cd /Users/gregdunn/src/test/ai_debug_context/vscode_2

echo ""
echo "Running the build command as suggested by the extension..."
echo ""

# Run the exact command that the extension suggests
npm run build:webview

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Webview build completed successfully!"
    echo ""
    echo "📂 Build output location: out/webview/"
    
    # Show what was built
    if [ -d "out/webview" ]; then
        echo ""
        echo "📊 Generated files:"
        ls -la out/webview/ | grep -E '\.(js|css|html)$'
    fi
    
    echo ""
    echo "🎉 The extension should now show the Angular interface!"
    echo ""
    echo "Next steps:"
    echo "1. Go back to VSCode"
    echo "2. Click the AI Debug Context icon in the Activity Bar"
    echo "3. You should now see the Angular webview instead of the setup message"
    echo "4. If you still see the setup message, try:"
    echo "   - Reload the Extension Development Host window (Ctrl+R or Cmd+R)"
    echo "   - Or restart the debugging session (Ctrl+Shift+F5)"
    
else
    echo ""
    echo "❌ Build failed!"
    echo ""
    echo "Try these troubleshooting steps:"
    echo "1. Install dependencies first:"
    echo "   cd webview-ui && npm install"
    echo "2. Then run the build again:"
    echo "   npm run build"
fi
