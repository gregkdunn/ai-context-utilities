#!/bin/bash

# New Chat Setup - AI Debug Context VSCode Extension v2
# Run this at the start of any new chat to get oriented quickly

PROJECT_ROOT="/Users/gregdunn/src/test/ai_debug_context/vscode_2"

echo "🚀 AI Debug Context - New Chat Setup"
echo "===================================="

# Navigate to project
cd "$PROJECT_ROOT" || {
    echo "❌ Error: Cannot find project directory at $PROJECT_ROOT"
    exit 1
}

echo "📍 Current location: $(pwd)"
echo ""

# Display quick context
if [ -f "QUICK_CONTEXT.md" ]; then
    echo "📋 Quick Context:"
    echo "=================="
    head -20 QUICK_CONTEXT.md | grep -E "^#|^-|^\*|^[0-9]" | head -15
    echo ""
fi

# Run health check
echo "🏥 Running Health Check..."
echo "=========================="
if [ -f "../temp_scripts/health_check.sh" ]; then
    chmod +x "../temp_scripts/health_check.sh"
    "../temp_scripts/health_check.sh" | head -20
else
    echo "⚠️ Health check script not found"
fi

echo ""
echo "📊 Project Status:"
echo "=================="

# Check key indicators
if [ -f "out/extension.js" ]; then
    echo "✅ Extension compiled"
else
    echo "⚠️ Extension needs compilation (run: npm run compile)"
fi

if [ -f "out/webview/index.html" ]; then
    echo "✅ Angular UI built"
else
    echo "⚠️ Angular UI needs build (run: cd webview-ui && npm run build)"
fi

if npx tsc --noEmit >/dev/null 2>&1; then
    echo "✅ TypeScript compilation clean"
else
    echo "❌ TypeScript errors (run: npx tsc --noEmit)"
fi

echo ""
echo "🎯 Recommended Next Actions:"
echo "============================"
echo "1. Read STATUS_DASHBOARD.md for detailed context"
echo "2. If all ✅ above: Test in VSCode (open project, press F5)"
echo "3. If any ❌/⚠️: Run full test suite (temp_scripts/full_test_vscode2.sh)"
echo "4. Continue with next development phase based on results"

echo ""
echo "📁 Key Documentation:"
echo "====================="
echo "• STATUS_DASHBOARD.md - Current status and quick commands"
echo "• docs/implementation/current_status.md - Detailed progress"
echo "• docs/implementation/next_steps.md - Next phase roadmap"
echo "• docs/IMPLEMENTATION_LOG.md - Complete development history"

echo ""
echo "Ready to continue development! 🚀"
