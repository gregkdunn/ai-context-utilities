#!/bin/bash

# Clean up compiled files that interfere with Jest
echo "🧹 Cleaning up compiled mock and test files that interfere with Jest..."

# Remove all compiled mock files from out directory
if [ -d "out/test/__mocks__" ]; then
    echo "Removing compiled mock files..."
    rm -rf out/test/__mocks__/*
    echo "✅ Compiled mock files removed"
fi

if [ -d "out/__mocks__" ]; then
    echo "Removing additional compiled mock files..."
    rm -rf out/__mocks__/*
    echo "✅ Additional compiled mock files removed"
fi

# Keep the out directory structure but remove problematic files
# VSCode extension needs the compiled .js files for runtime, but not the mock files

echo "🔧 Cleaning Jest cache..."
if [ -d ".jest-cache" ]; then
    rm -rf .jest-cache
    echo "✅ Jest cache cleared"
fi

echo "🏗️ Recompiling TypeScript..."
npm run compile

echo ""
echo "✅ Cleanup complete! The setup now:"
echo "   - Tests run from TypeScript source files in src/"
echo "   - Compiled JS files go to out/ (for VSCode extension runtime)"
echo "   - Jest ignores the out/ directory completely"
echo "   - No more duplicate mock file conflicts"
echo ""
echo "Next steps:"
echo "1. npm run lint -- --fix"
echo "2. npm run test"
