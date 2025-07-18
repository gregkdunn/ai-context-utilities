#!/bin/bash

# Test the TypeScript fixes
echo "🧪 Testing TypeScript fixes..."

# Make the fix script executable
chmod +x fix-typescript-errors.sh

# Run the compilation check
echo "📝 Running TypeScript compilation check..."
npm run compile

if [ $? -eq 0 ]; then
    echo "✅ TypeScript compilation successful!"
    echo "🏃 Running tests..."
    
    # Run the test suites
    npm run test
    
    if [ $? -eq 0 ]; then
        echo "✅ All tests passed!"
    else
        echo "❌ Some tests failed. Check the output above."
    fi
else
    echo "❌ TypeScript compilation failed. Please check the errors above."
fi

echo "🎉 Test complete!"
