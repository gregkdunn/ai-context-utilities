#!/bin/bash

echo "🔧 Building Angular Webview for VSCode Extension v2"
echo "=================================================="

PROJECT_ROOT="/Users/gregdunn/src/test/ai_debug_context/vscode_2"
cd "$PROJECT_ROOT"

echo ""
echo "📦 Ensuring dependencies are installed..."

# Install main dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing VSCode extension dependencies..."
    npm install
fi

# Install webview dependencies if needed
cd webview-ui
if [ ! -d "node_modules" ]; then
    echo "Installing Angular webview dependencies..."
    npm install
fi

echo ""
echo "🧪 Running quick Angular test first..."
npm test -- --watch=false

if [ $? -ne 0 ]; then
    echo "⚠️  Angular tests failed, but continuing with build..."
fi

echo ""
echo "🔧 Building Angular webview for production..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Angular webview built successfully!"
    
    # Check if output files exist
    cd ..
    echo ""
    echo "📂 Checking build output..."
    if [ -d "out/webview" ]; then
        echo "✅ out/webview directory exists"
        
        if [ -f "out/webview/main.js" ]; then
            echo "✅ main.js exists"
        else
            echo "❌ main.js missing"
        fi
        
        if [ -f "out/webview/polyfills.js" ]; then
            echo "✅ polyfills.js exists"
        else
            echo "❌ polyfills.js missing"
        fi
        
        if [ -f "out/webview/styles.css" ]; then
            echo "✅ styles.css exists"
        else
            echo "❌ styles.css missing"
        fi
        
        echo ""
        echo "📊 Build files:"
        ls -la out/webview/
        
    else
        echo "❌ out/webview directory missing"
    fi
    
else
    echo "❌ Angular webview build failed"
    exit 1
fi

echo ""
echo "🔧 Compiling VSCode extension..."
npm run compile

if [ $? -eq 0 ]; then
    echo "✅ VSCode extension compiled successfully!"
else
    echo "❌ VSCode extension compilation failed"
    exit 1
fi

echo ""
echo "🎉 Build Complete!"
echo "=================="
echo "✅ Angular webview built to out/webview/"
echo "✅ VSCode extension compiled to out/"
echo ""
echo "🚀 Ready to test in VSCode!"
echo ""
echo "Instructions:"
echo "1. Open VSCode in this directory: code ."
echo "2. Press F5 to launch Extension Development Host"
echo "3. Look for the AI Debug Context icon in the Activity Bar"
echo "4. Click to see the Angular webview instead of placeholder"
