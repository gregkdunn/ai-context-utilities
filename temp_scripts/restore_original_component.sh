#!/bin/bash

echo "🔄 Restoring Original Angular Component"
echo "======================================="

PROJECT_ROOT="/Users/gregdunn/src/test/ai_debug_context/vscode_2"
cd "$PROJECT_ROOT/webview-ui/src/app"

if [ -f "app.component.original.ts" ]; then
    cp app.component.original.ts app.component.ts
    echo "✅ Original component restored"
    
    cd "$PROJECT_ROOT"
    echo ""
    echo "🔧 Rebuilding with original component..."
    npm run compile
    
    if [ $? -eq 0 ]; then
        echo "✅ Build completed successfully!"
    else
        echo "❌ Build failed"
    fi
else
    echo "❌ No backup found (app.component.original.ts)"
fi
