#!/bin/bash

cd /Users/gregdunn/src/test/ai_debug_context/vscode_2

echo "Testing individual test files to diagnose issues..."

echo "1. Testing GitIntegration..."
npx jest src/__tests__/GitIntegration.test.ts --verbose

echo -e "\n2. Testing CopilotIntegration..."  
npx jest src/__tests__/CopilotIntegration.test.ts --verbose

echo -e "\n3. Testing Extension..."
npx jest src/__tests__/extension.test.ts --verbose

echo -e "\n4. Testing TestRunner..."
npx jest src/__tests__/TestRunner.test.ts --verbose
