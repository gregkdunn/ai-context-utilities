#!/bin/bash

# AI Debug Context - Quick Health Check
# Run this at the start of any new chat to verify project state

PROJECT_ROOT="/Users/gregdunn/src/test/ai_debug_context/vscode_2"
cd "$PROJECT_ROOT"

echo "🏥 AI Debug Context - Health Check"
echo "=================================="
echo "Timestamp: $(date)"
echo "Project: $(pwd)"
echo ""

# Quick status indicators
SUCCESS="✅"
WARNING="⚠️"
ERROR="❌"
INFO="ℹ️"

# Function to check and report
check_item() {
    local description="$1"
    local command="$2"
    local expected_result="$3"
    
    if eval "$command" >/dev/null 2>&1; then
        if [ "$expected_result" = "should_fail" ]; then
            echo "$ERROR $description - UNEXPECTED SUCCESS"
            return 1
        else
            echo "$SUCCESS $description"
            return 0
        fi
    else
        if [ "$expected_result" = "should_fail" ]; then
            echo "$SUCCESS $description"
            return 0
        else
            echo "$ERROR $description - FAILED"
            return 1
        fi
    fi
}

# Core health checks
echo "🔍 Core Project Health:"
check_item "Project directory exists" "[ -d . ]"
check_item "package.json exists" "[ -f package.json ]"
check_item "Extension source exists" "[ -f src/extension.ts ]"
check_item "Angular source exists" "[ -d webview-ui/src ]"

echo ""
echo "📦 Dependencies:"
check_item "Root node_modules" "[ -d node_modules ]"
check_item "Angular node_modules" "[ -d webview-ui/node_modules ]"

echo ""
echo "🔨 Build Status:"
check_item "TypeScript compilation" "npx tsc --noEmit"
check_item "Extension compiled" "[ -f out/extension.js ]"
check_item "Angular built" "[ -f out/webview/index.html ]"

echo ""
echo "🧪 Test Status:"
check_item "Angular tests configured" "[ -f webview-ui/jest.config.js ]"
check_item "Extension tests configured" "[ -f jest.config.js ]"

echo ""
echo "📚 Documentation:"
check_item "Status dashboard" "[ -f docs/STATUS_DASHBOARD.md ]"
check_item "Current status doc" "[ -f docs/implementation/current_status.md ]"
check_item "Next steps doc" "[ -f docs/implementation/next_steps.md ]"

echo ""
echo "🛠️ Quick Actions Available:"
echo "$INFO Run full test suite: ../temp_scripts/full_test_vscode2.sh"
echo "$INFO Quick TypeScript check: npx tsc --noEmit"
echo "$INFO Test in VSCode: Open project, press F5"
echo "$INFO Angular tests: cd webview-ui && npm test"

echo ""
echo "📊 Current Status Summary:"
echo "Phase: Ready for VSCode Development Host Testing"
echo "Completion: 85% - All UI and infrastructure complete"
echo "Next: Live testing and real integrations (Git, NX, Copilot)"

echo ""
echo "🎯 Quick Start for New Chat:"
echo "1. Run this health check"
echo "2. If all ✅, proceed to VSCode testing"
echo "3. If any ❌, run full test suite to identify issues"
echo "4. Reference STATUS_DASHBOARD.md for detailed context"

echo ""
echo "Health check complete! 🏥"
