#!/bin/bash

# Fix ESLint warnings in predictiveAnalyticsEngine.ts
cd /Users/gregdunn/src/test/ai_debug_context/vscode

# Run ESLint with --fix flag
npx eslint src/services/analytics/engines/predictiveAnalyticsEngine.ts --fix

echo "ESLint auto-fix completed"
