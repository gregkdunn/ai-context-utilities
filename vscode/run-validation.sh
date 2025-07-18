#!/bin/bash

# Quick test to run the validation script
cd /Users/gregdunn/src/test/ai_debug_context/vscode

# Make the validation script executable
chmod +x validate-typescript-fixes.sh

# Run the validation
echo "🧪 Running TypeScript fixes validation..."
./validate-typescript-fixes.sh

echo ""
echo "📋 Validation complete! Check output above for results."
