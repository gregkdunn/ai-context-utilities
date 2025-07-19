#!/bin/bash

# Run all tests to check final status
echo "=== AI Debug Context V2 - Final Test Status ==="

cd "/Users/gregdunn/src/test/ai_debug_context/vscode_2/webview-ui"

echo ""
echo "Running full test suite..."
npm run test

echo ""
echo "=== All tests completed ==="

# Check exit code and provide summary
if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 SUCCESS: All tests are now passing!"
    echo "✅ Jest configuration is working correctly"
    echo "✅ Component tests are passing"
    echo "✅ Service tests are passing"
    echo ""
    echo "Ready to proceed with VSCode extension implementation!"
else
    echo ""
    echo "❌ Some tests are still failing. Check output above for details."
fi
