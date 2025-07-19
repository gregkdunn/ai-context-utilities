#!/bin/bash

echo "🔧 Enabling Angular 17+ Control Flow Syntax (@if/@for)"
echo "======================================================"

PROJECT_ROOT="/Users/gregdunn/src/test/ai_debug_context/vscode_2"
cd "$PROJECT_ROOT/webview-ui"

echo ""
echo "📋 Current Angular Version:"
npx ng version --skip-git | grep "Angular CLI"

echo ""
echo "🚀 Running Angular control flow migration..."
echo ""

# Run the Angular control flow migration
npx ng generate @angular/core:control-flow

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Control flow migration completed!"
    echo ""
    echo "📋 What this does:"
    echo "• Enables the new @if, @for, @switch syntax"
    echo "• Updates Angular compiler to support block syntax"
    echo "• Allows modern control flow in templates"
    
    cd "$PROJECT_ROOT"
    echo ""
    echo "🔧 Testing build with new syntax..."
    npm run compile
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "✅ Build successful with new control flow syntax!"
        echo ""
        echo "🎉 You can now use:"
        echo "• @if (condition) { ... } @else { ... }"
        echo "• @for (item of items; track item.id) { ... }"
        echo "• @switch (value) { @case (1) { ... } @default { ... } }"
        
    else
        echo ""
        echo "❌ Build failed with new syntax"
        echo "The migration might need manual fixes"
    fi
    
else
    echo ""
    echo "❌ Migration failed"
    echo ""
    echo "🔧 Manual approach:"
    echo "1. Make sure you're using Angular 17+"
    echo "2. Update tsconfig.json with experimental flags"
    echo "3. Or use traditional *ngIf/*ngFor syntax"
fi

echo ""
echo "📚 Documentation:"
echo "https://angular.io/guide/control_flow"
