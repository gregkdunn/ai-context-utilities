#!/bin/bash

echo "🔍 Quick TypeScript Check"
echo "========================"

# Run TypeScript compilation check
echo "Running tsc --noEmit..."
npx tsc --noEmit

if [ $? -eq 0 ]; then
    echo "✅ TypeScript compilation successful!"
else
    echo "❌ TypeScript compilation failed"
    exit 1
fi
