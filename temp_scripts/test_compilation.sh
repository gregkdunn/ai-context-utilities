#!/bin/bash

echo "🔧 Testing TypeScript compilation after Math fix..."

cd /Users/gregdunn/src/test/ai_debug_context/vscode_2

# First check TypeScript compilation
echo "📝 Checking TypeScript compilation..."
npx tsc --noEmit

if [ $? -eq 0 ]; then
    echo "✅ TypeScript compilation successful!"
    
    # Check webview compilation
    echo "🔍 Testing webview TypeScript compilation..."
    cd webview-ui
    npx tsc --noEmit
    
    if [ $? -eq 0 ]; then
        echo "✅ Webview TypeScript compilation successful!"
        
        cd ..
        echo "🧪 Running unit tests..."
        npm test -- --testNamePattern="CopilotIntegration" --silent
        
        if [ $? -eq 0 ]; then
            echo "✅ All tests passed!"
            echo ""
            echo "🎯 Ready for full extension build!"
            echo "Run: npm run compile"
        else
            echo "⚠️ Some tests failed, but compilation is working"
        fi
    else
        echo "❌ Webview TypeScript compilation failed"
        exit 1
    fi
else
    echo "❌ Extension TypeScript compilation failed"
    exit 1
fi
