#!/bin/bash

# Comprehensive test runner for AI Debug VSCode Extension
# This script runs all tests and validates the fixes

echo "🚀 Starting comprehensive test validation..."

# Navigate to project directory
cd /Users/gregdunn/src/test/ai_debug_context/vscode

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to log success
log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

# Function to log error
log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Function to log info
log_info() {
    echo -e "${YELLOW}ℹ️  $1${NC}"
}

# Step 1: Check TypeScript compilation
log_info "Step 1: Checking TypeScript compilation..."
npx tsc --noEmit --pretty
if [ $? -eq 0 ]; then
    log_success "TypeScript compilation successful!"
else
    log_error "TypeScript compilation failed!"
    exit 1
fi

# Step 2: Run linting
log_info "Step 2: Running ESLint..."
npm run lint
if [ $? -eq 0 ]; then
    log_success "Linting successful!"
else
    log_error "Linting failed!"
    exit 1
fi

# Step 3: Run specific tests for fixed components
log_info "Step 3: Running predictive analytics tests..."
npx jest --testPathPattern=predictiveAnalyticsEngine
if [ $? -eq 0 ]; then
    log_success "Predictive analytics tests passed!"
else
    log_error "Predictive analytics tests failed!"
    exit 1
fi

# Step 4: Run streaming integration tests
log_info "Step 4: Running streaming integration tests..."
npx jest --testPathPattern=streaming.integration
if [ $? -eq 0 ]; then
    log_success "Streaming integration tests passed!"
else
    log_error "Streaming integration tests failed!"
    exit 1
fi

# Step 5: Run analytics engine tests
log_info "Step 5: Running analytics engine tests..."
npx jest --testPathPattern=analytics
if [ $? -eq 0 ]; then
    log_success "Analytics engine tests passed!"
else
    log_error "Analytics engine tests failed!"
    exit 1
fi

# Step 6: Run full test suite
log_info "Step 6: Running full test suite..."
npm test
if [ $? -eq 0 ]; then
    log_success "Full test suite passed!"
else
    log_error "Full test suite failed!"
    exit 1
fi

# Step 7: Test coverage (optional)
if [ "$1" = "--coverage" ]; then
    log_info "Step 7: Running test coverage..."
    npm run test:coverage
    if [ $? -eq 0 ]; then
        log_success "Test coverage analysis completed!"
    else
        log_error "Test coverage analysis failed!"
        exit 1
    fi
fi

log_success "All tests and validations completed successfully! 🎉"
log_info "Summary of fixes applied:"
echo "  • Fixed TypeScript null/undefined checks in streaming.integration.test.ts"
echo "  • Fixed confidence property handling in predictiveAnalyticsEngine.ts"
echo "  • Fixed ForecastResult type compatibility with required properties"
echo "  • Added comprehensive test coverage for PredictiveAnalyticsEngine"
echo "  • All TypeScript compilation errors resolved"
