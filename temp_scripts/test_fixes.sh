#!/bin/bash

cd /Users/gregdunn/src/test/ai_debug_context/vscode_2

echo "🧪 Testing GitIntegration fixes..."
npx jest src/__tests__/GitIntegration.test.ts --no-coverage --verbose

echo -e "\n🧪 Testing Extension fixes..."
npx jest src/__tests__/extension.test.ts --no-coverage --verbose

echo -e "\n🧪 Testing CopilotIntegration fixes..."
npx jest src/__tests__/CopilotIntegration.test.ts --no-coverage --verbose

echo -e "\n🧪 Testing TestRunner fixes..."
npx jest src/__tests__/TestRunner.test.ts --no-coverage --verbose
