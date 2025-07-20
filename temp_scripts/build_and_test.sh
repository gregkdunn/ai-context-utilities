#!/bin/bash

echo "=== AI Debug Context VSCode Extension v2 - Build and Test ==="
echo "Date: $(date)"
echo ""

# Set the working directory
PROJECT_DIR="/Users/gregdunn/src/test/ai_debug_context/vscode_2"
cd "$PROJECT_DIR"

echo "🏠 Working directory: $PROJECT_DIR"
echo ""

# Function to run command and show output
run_command() {
    local cmd="$1"
    local desc="$2"
    echo "▶️  $desc"
    echo "   Command: $cmd"
    echo "   ----------------------------------------"
    
    if eval "$cmd"; then
        echo "   ✅ SUCCESS"
    else
        echo "   ❌ FAILED (exit code: $?)"
        return 1
    fi
    echo ""
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Are we in the right directory?"
    exit 1
fi

echo "1️⃣  Installing Extension Dependencies"
run_command "npm install" "Installing main extension dependencies"

echo "2️⃣  Installing Webview Dependencies"
run_command "cd webview-ui && npm install && cd .." "Installing Angular webview dependencies"

echo "3️⃣  Running TypeScript Compilation Check"
run_command "npx tsc --noEmit" "Checking TypeScript compilation"

echo "4️⃣  Running Extension Tests"
run_command "npm test" "Running Jest tests for extension"

echo "5️⃣  Building Angular Webview"
run_command "cd webview-ui && npm run build && cd .." "Building Angular webview for VSCode"

echo "6️⃣  Running Webview Tests"
run_command "cd webview-ui && npm test -- --watchAll=false && cd .." "Running Angular component tests"

echo "7️⃣  Compiling Extension"
run_command "npm run compile" "Compiling full extension"

echo ""
echo "🎯 BUILD AND TEST SUMMARY"
echo "========================="

# Check if build artifacts exist
if [ -d "out" ]; then
    echo "✅ Extension compiled successfully (out/ directory exists)"
else
    echo "❌ Extension compilation failed (out/ directory missing)"
fi

if [ -d "out/webview" ]; then
    echo "✅ Angular webview built successfully (out/webview/ directory exists)"
    echo "   Files in webview build:"
    ls -la out/webview/ | head -10
else
    echo "❌ Angular webview build failed (out/webview/ directory missing)"
fi

if [ -f "out/extension.js" ]; then
    echo "✅ Main extension file exists"
else
    echo "❌ Main extension file missing"
fi

echo ""
echo "📋 NEXT STEPS:"
echo "1. Press F5 in VSCode to launch Extension Development Host"
echo "2. Open the AI Debug Context view in the Activity Bar"
echo "3. Test the extension functionality"
echo ""
echo "=== Build and Test Complete ==="
