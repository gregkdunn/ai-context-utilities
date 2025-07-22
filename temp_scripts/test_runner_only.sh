#!/bin/bash
set -e

echo "🧪 Testing TestRunner fixes only..."

cd /Users/gregdunn/src/test/ai_debug_context/vscode_2

echo "🎯 Running TestRunner tests specifically..."
npx jest src/__tests__/TestRunner.test.ts --verbose --no-coverage

echo "✅ TestRunner tests completed!"
