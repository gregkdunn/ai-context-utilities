#!/bin/bash

echo "🧹 Cleaning up duplicate mock files..."
rm -rf out/test/__mocks__/vscode.js
rm -rf out/test/__mocks__/vscode.js.map

echo "📁 Cleaning up compiled output..."
rm -rf out/

echo "🔨 Compiling TypeScript..."
npx tsc -p ./

echo "🔍 Checking for compilation errors..."
if [ $? -eq 0 ]; then
    echo "✅ TypeScript compilation successful!"
else
    echo "❌ TypeScript compilation failed!"
    exit 1
fi

echo "🧪 Running a quick test to verify fixes..."
npx jest src/services/analytics/engines/__tests__/predictiveAnalyticsEngine.test.ts --testNamePattern="should initialize with default models" --no-coverage
