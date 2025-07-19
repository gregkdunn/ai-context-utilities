#!/bin/bash

# Build the VSCode extension with webview
cd /Users/gregdunn/src/test/ai_debug_context/vscode_2

echo "Building webview UI..."
cd webview-ui
npm run build
if [ $? -ne 0 ]; then
    echo "Webview build failed!"
    exit 1
fi

echo "Building extension..."
cd ..
npm run compile
if [ $? -ne 0 ]; then
    echo "Extension build failed!"
    exit 1
fi

echo "Running extension tests..."
npm test
if [ $? -ne 0 ]; then
    echo "Extension tests failed!"
    exit 1
fi

echo "✅ Extension built and tests passed successfully!"
