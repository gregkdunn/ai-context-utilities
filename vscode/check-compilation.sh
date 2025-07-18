#!/bin/bash

# Script to check TypeScript compilation
echo "Starting TypeScript compilation check..."

# Navigate to the project directory
cd /Users/gregdunn/src/test/ai_debug_context/vscode

# Run TypeScript compilation
echo "Running: npx tsc --noEmit"
npx tsc --noEmit

# Check the exit code
if [ $? -eq 0 ]; then
    echo "✅ TypeScript compilation successful!"
else
    echo "❌ TypeScript compilation failed!"
    exit 1
fi

# Run linting
echo "Running: npm run lint"
npm run lint

if [ $? -eq 0 ]; then
    echo "✅ Linting successful!"
else
    echo "❌ Linting failed!"
    exit 1
fi

echo "All checks passed!"
