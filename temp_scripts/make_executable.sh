#!/bin/bash

echo "=== Making test scripts executable ==="

chmod +x /Users/gregdunn/src/test/ai_debug_context/temp_scripts/*.sh

echo "✅ Scripts are now executable"
echo ""
echo "Available test scripts:"
echo "1. compile_test.sh - Quick TypeScript compilation test"
echo "2. test_build.sh - Full build and test suite"
echo "3. build_and_test.sh - Comprehensive build verification"
echo ""
echo "Run with: bash /Users/gregdunn/src/test/ai_debug_context/temp_scripts/[script_name]"
