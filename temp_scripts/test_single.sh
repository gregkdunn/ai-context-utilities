#!/bin/bash

cd /Users/gregdunn/src/test/ai_debug_context/vscode_2

echo "Testing VSCode Extension Backend..."

# Just run one test file to verify setup
npx jest src/__tests__/GitIntegration.test.ts --verbose

echo "Test completed."
