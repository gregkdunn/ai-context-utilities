#!/bin/bash
# Quick Test Verification Script

echo "🔍 Quick Test Verification"
echo "========================="

cd /Users/gregdunn/src/test/ai_debug_context/vscode

echo "1. Checking if dependencies are installed..."
if [ ! -d "node_modules" ]; then
    echo "❌ node_modules not found. Running npm install..."
    npm install
else
    echo "✅ Dependencies are installed"
fi

echo ""
echo "2. Checking TypeScript compilation..."
npm run compile 2>/dev/null
if [ $? -eq 0 ]; then
    echo "✅ TypeScript compilation successful"
else
    echo "❌ TypeScript compilation failed"
fi

echo ""
echo "3. Checking if Angular dependencies are installed..."
cd angular-app
if [ ! -d "node_modules" ]; then
    echo "❌ Angular node_modules not found. Running npm install..."
    npm install
else
    echo "✅ Angular dependencies are installed"
fi

cd ..

echo ""
echo "4. Quick syntax check on fixed files..."
files_to_check=(
    "angular-app/src/app/components/collaboration-panel/collaboration-panel.component.ts"
    "src/services/ai-insights/__tests__/phase42Implementation.test.ts"
    "src/services/plugins/__tests__/pluginManager.test.ts"
)

for file in "${files_to_check[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file exists"
        # Check if file starts with proper import
        first_line=$(head -n 1 "$file")
        if [[ "$first_line" == import* ]]; then
            echo "   ✅ Has proper import statement"
        else
            echo "   ❌ Import statement issue: $first_line"
        fi
    else
        echo "❌ $file not found"
    fi
done

echo ""
echo "5. Jest configuration check..."
if [ -f "jest.config.js" ]; then
    echo "✅ Jest configuration found"
else
    echo "❌ Jest configuration not found"
fi

echo ""
echo "=== Ready to run tests ==="
echo "Use one of these commands:"
echo "  npm run test:all          # Run all tests"
echo "  ./run-all-tests.sh        # Run comprehensive test suite"
echo "  npm run test              # Run main Jest tests"
echo "  npm run test:coverage     # Run with coverage"
