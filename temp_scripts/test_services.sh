#!/bin/bash

echo "🧪 Running tests for the extension services..."

cd /Users/gregdunn/src/test/ai_debug_context/vscode_2

# Run just the TypeScript compilation to check for errors
echo "📝 Checking TypeScript compilation..."
npx tsc --noEmit

echo "🔍 Testing CopilotIntegration service..."
npm test -- --testNamePattern="CopilotIntegration"

echo "✅ Tests completed!"
