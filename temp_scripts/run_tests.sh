#!/bin/bash

# Script to run tests for the VSCode Extension v2
echo "Running tests for AI Debug Context VSCode Extension v2..."

# Change to the webview-ui directory
cd /Users/gregdunn/src/test/ai_debug_context/vscode_2/webview-ui

echo "Current directory: $(pwd)"

# Run Jest tests for the Angular components
echo "Running Angular component tests..."
npm test -- --passWithNoTests --watchAll=false

echo "Angular tests completed."

# Run VSCode extension tests if they exist
echo "Checking for VSCode extension tests..."
cd ../
if [ -f "jest.config.js" ]; then
  echo "Running VSCode extension tests..."
  npm test
else
  echo "No jest.config.js found in main extension directory"
fi

echo "All tests completed."
