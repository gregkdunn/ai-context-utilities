#!/bin/bash
set -e

echo "🔧 Starting automated fix workflow..."

# Step 1: Fix linting issues
echo "1. Fixing lint issues..."
npm run lint:fix

# Step 2: Compile TypeScript
echo "2. Compiling TypeScript..."
npm run compile

# Step 3: Run tests
echo "3. Running tests..."
npm run test:utils

echo "✅ Fix workflow completed successfully!"
