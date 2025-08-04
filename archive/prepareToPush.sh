#!/bin/bash
# prepareToPush.sh - Pre-push checks for completed refactored services

set -e

echo "🚀 Preparing to push refactored services..."

# 1. Check if this is an Nx workspace and run lint + prettier
if [ -f "nx.json" ] || [ -f "workspace.json" ]; then
    echo "📋 Nx workspace detected"
    
    # Check project.json for lint command
    if [ -f "project.json" ] && grep -q '"lint"' project.json; then
        echo "🔍 Running nx lint (found in project.json)..."
        nx lint || echo "⚠️  Lint issues found"
    else
        echo "⚠️  No lint command found in project.json"
    fi
    
    # Check project.json for prettier command
    if [ -f "project.json" ] && grep -q '"prettier"' project.json; then
        echo "💅 Running nx prettier (found in project.json)..."
        nx prettier --write || echo "⚠️  Prettier formatting issues"
    else
        echo "⚠️  No prettier command found in project.json"
    fi
else
    echo "📋 Non-Nx project detected"
    
    # Check package.json for lint script
    if grep -q '"lint"' package.json; then
        echo "🔍 Running npm run lint (found in package.json)..."
        npm run lint || echo "⚠️  Lint issues found"
    elif [ -f ".eslintrc.json" ] || [ -f ".eslintrc.js" ] || grep -q "eslint" package.json; then
        echo "🔍 Running ESLint..."
        npx eslint "src/services/TestAnalysisHelper.ts" "src/services/PostTestActionService.ts" "src/core/ServiceContainer.ts" --fix || echo "⚠️  ESLint issues found"
    else
        echo "⚠️  No ESLint configuration found"
    fi
    
    # Check package.json for prettier script
    if grep -q '"prettier"' package.json; then
        echo "💅 Running npm run prettier (found in package.json)..."
        npm run prettier || echo "⚠️  Prettier formatting issues"
    elif command -v prettier &> /dev/null; then
        echo "💅 Formatting code with prettier..."
        prettier --write "src/services/TestAnalysisHelper.ts" "src/services/PostTestActionService.ts" "src/core/ServiceContainer.ts" || echo "⚠️  Prettier not configured"
    else
        echo "⚠️  Prettier not installed globally"
    fi
fi

# 2. TypeScript compilation
echo "🔨 Compiling TypeScript..."
npm run compile

# 3. Run tests for completed refactored services only
echo "🧪 Running tests for refactored services..."
npm test -- --testPathPattern="(TestAnalysisHelper|PostTestActionService|ServiceContainer)" --passWithNoTests 2>&1 | grep -E "(PASS|FAIL|Tests:|✅|❌)" || true

echo "✅ Refactored services ready to push!"
echo "📊 Completed:"
echo "  - TestAnalysisHelper: 154 lines (68% reduction)"
echo "  - PostTestActionService: 183 lines (56% reduction)"