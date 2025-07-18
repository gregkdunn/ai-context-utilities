#!/bin/bash

# Remove duplicate compiled vscode mock files to avoid Jest conflicts
echo "Cleaning duplicate vscode mock files..."

# Remove compiled mock files
if [ -f "out/test/__mocks__/vscode.js" ]; then
    rm -f out/test/__mocks__/vscode.js
    echo "Removed out/test/__mocks__/vscode.js"
fi

if [ -f "out/test/__mocks__/vscode.js.map" ]; then
    rm -f out/test/__mocks__/vscode.js.map
    echo "Removed out/test/__mocks__/vscode.js.map"
fi

# Remove any backup files
if [ -f "out/__mocks__/vscode.js.bak" ]; then
    rm -f out/__mocks__/vscode.js.bak
    echo "Removed out/__mocks__/vscode.js.bak"
fi

if [ -f "out/__mocks__/vscode.js.map.bak" ]; then
    rm -f out/__mocks__/vscode.js.map.bak
    echo "Removed out/__mocks__/vscode.js.map.bak"
fi

echo "Mock file cleanup complete!"
