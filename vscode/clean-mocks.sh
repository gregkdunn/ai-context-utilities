#!/bin/bash

# Clean up compiled mock files to resolve duplicate mock issue
echo "Cleaning up compiled mock files..."

# Remove the compiled out directory mock files
rm -rf /Users/gregdunn/src/test/ai_debug_context/vscode/out/test/__mocks__

# Clean and rebuild
cd /Users/gregdunn/src/test/ai_debug_context/vscode
npm run compile

echo "Clean up completed"
