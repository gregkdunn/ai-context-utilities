#!/bin/bash

echo "🧪 Testing with Simple Angular Component"
echo "========================================"

PROJECT_ROOT="/Users/gregdunn/src/test/ai_debug_context/vscode_2"
cd "$PROJECT_ROOT/webview-ui/src/app"

echo ""
echo "📋 Creating backup and switching to simple component..."

# Backup the original component
if [ ! -f "app.component.original.ts" ]; then
    cp app.component.ts app.component.original.ts
    echo "✅ Original component backed up"
fi

# Replace with simple component
cp app.component.simple.ts app.component.ts
echo "✅ Switched to simple test component"

cd "$PROJECT_ROOT"

echo ""
echo "🔧 Building with simple component..."
npm run compile

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Build completed successfully!"
    echo ""
    echo "🧪 Test Instructions:"
    echo "===================="
    echo "1. Press F5 in VSCode to launch the extension"
    echo "2. Click the AI Debug Context icon in the Activity Bar"
    echo "3. You should see a simple test page instead of 'Loading...'"
    echo "4. If the simple component works, the issue is with the complex component"
    echo "5. If it still shows 'Loading...', the issue is with Angular/ES module loading"
    echo ""
    echo "🔄 To restore the original component:"
    echo "bash /Users/gregdunn/src/test/ai_debug_context/temp_scripts/restore_original_component.sh"
else
    echo "❌ Build failed with simple component"
    
    # Restore original component on build failure
    cd "$PROJECT_ROOT/webview-ui/src/app"
    cp app.component.original.ts app.component.ts
    echo "🔄 Restored original component due to build failure"
fi
