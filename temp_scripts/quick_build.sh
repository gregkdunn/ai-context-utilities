#!/bin/bash
cd /Users/gregdunn/src/test/ai_debug_context/vscode_2

echo "=== Checking TypeScript compilation ==="
npx tsc --noEmit

echo "=== Building Angular webview ==="
cd webview-ui
npm run build

echo "=== Compiling extension ==="
cd ..
npm run compile:ts-only

echo "=== Build complete ==="
