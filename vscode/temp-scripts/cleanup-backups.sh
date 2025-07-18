#!/bin/bash

# Cleanup script for backup files
echo "🧹 Cleaning up backup files..."

cd /Users/gregdunn/src/test/ai_debug_context/vscode/temp-cleanup

# Remove backup files
rm -f run_tests.sh.bak
rm -f simple-test.ts.bak
rm -f test-runner.js.bak
rm -f vscode.js.bak
rm -f vscode.js.map.bak

echo "✅ Backup files removed successfully!"

# Check if temp-cleanup directory is now empty
if [ -z "$(ls -A .)" ]; then
    echo "📁 temp-cleanup directory is now empty"
    cd ..
    rmdir temp-cleanup
    echo "🗑️  Removed empty temp-cleanup directory"
else
    echo "📁 temp-cleanup directory still contains files:"
    ls -la
fi

# Check if temp-test directory is empty after moving files
cd /Users/gregdunn/src/test/ai_debug_context/vscode
if [ -d "temp-test" ]; then
    if [ -z "$(ls -A temp-test)" ]; then
        echo "🗑️  Removing empty temp-test directory"
        rmdir temp-test
        echo "✅ temp-test directory removed"
    else
        echo "📁 temp-test directory still contains files:"
        ls -la temp-test
    fi
fi

echo "🎉 Cleanup completed!"
