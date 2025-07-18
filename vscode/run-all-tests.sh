#!/bin/bash
# Complete Test Suite Runner for AI Debug Utilities VSCode Extension

echo "🧪 Running Complete Test Suite for AI Debug Utilities"
echo "=================================================="

# Navigate to project directory
cd /Users/gregdunn/src/test/ai_debug_context/vscode

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to run tests and report results
run_test() {
    local test_name="$1"
    local test_command="$2"
    
    echo -e "\n${YELLOW}Running $test_name...${NC}"
    echo "Command: $test_command"
    echo "----------------------------------------"
    
    if eval "$test_command"; then
        echo -e "${GREEN}✅ $test_name PASSED${NC}"
        return 0
    else
        echo -e "${RED}❌ $test_name FAILED${NC}"
        return 1
    fi
}

# Initialize counters
passed=0
failed=0

# 1. Pre-test setup
echo -e "${BLUE}📋 Pre-test Setup${NC}"
echo "=================="
run_test "TypeScript Compilation" "npm run compile"
if [ $? -eq 0 ]; then ((passed++)); else ((failed++)); fi

run_test "Linting" "npm run lint"
if [ $? -eq 0 ]; then ((passed++)); else ((failed++)); fi

# 2. Main Jest Tests
echo -e "\n${BLUE}🧪 Main Jest Tests${NC}"
echo "=================="
run_test "Core Jest Tests" "npm run test"
if [ $? -eq 0 ]; then ((passed++)); else ((failed++)); fi

# 3. Specific Test Categories
echo -e "\n${BLUE}🎯 Specific Test Categories${NC}"
echo "=========================="
run_test "Command Tests" "npm run test:commands"
if [ $? -eq 0 ]; then ((passed++)); else ((failed++)); fi

run_test "Integration Tests" "npm run test:integration"
if [ $? -eq 0 ]; then ((passed++)); else ((failed++)); fi

run_test "Utils Tests" "npm run test:utils"
if [ $? -eq 0 ]; then ((passed++)); else ((failed++)); fi

run_test "Webview Tests" "npm run test:webview"
if [ $? -eq 0 ]; then ((passed++)); else ((failed++)); fi

run_test "File Manager Tests" "npm run test:filemanager"
if [ $? -eq 0 ]; then ((passed++)); else ((failed++)); fi

run_test "Enhanced Tests" "npm run test:enhanced"
if [ $? -eq 0 ]; then ((passed++)); else ((failed++)); fi

run_test "Batch Tests" "npm run test:batch"
if [ $? -eq 0 ]; then ((passed++)); else ((failed++)); fi

run_test "Streaming Tests" "npm run test:streaming"
if [ $? -eq 0 ]; then ((passed++)); else ((failed++)); fi

# 4. Service Tests (Phase 5)
echo -e "\n${BLUE}⚙️ Service Tests (Phase 5)${NC}"
echo "=========================="
run_test "NX Service Tests" "npm run test:nx"
if [ $? -eq 0 ]; then ((passed++)); else ((failed++)); fi

run_test "Git Service Tests" "npm run test:git"
if [ $? -eq 0 ]; then ((passed++)); else ((failed++)); fi

run_test "Flipper Service Tests" "npm run test:flipper"
if [ $? -eq 0 ]; then ((passed++)); else ((failed++)); fi

# 5. Angular Tests
echo -e "\n${BLUE}🅰️ Angular Tests${NC}"
echo "==============="
run_test "Angular Unit Tests" "npm run test:angular"
if [ $? -eq 0 ]; then ((passed++)); else ((failed++)); fi

# 6. Coverage Reports
echo -e "\n${BLUE}📊 Coverage Reports${NC}"
echo "=================="
run_test "Jest Coverage" "npm run test:coverage"
if [ $? -eq 0 ]; then ((passed++)); else ((failed++)); fi

run_test "Angular Coverage" "npm run test:angular:coverage"
if [ $? -eq 0 ]; then ((passed++)); else ((failed++)); fi

# Final Results
echo -e "\n${BLUE}🎉 Test Results Summary${NC}"
echo "======================="
echo -e "✅ Tests Passed: ${GREEN}$passed${NC}"
echo -e "❌ Tests Failed: ${RED}$failed${NC}"
echo -e "📊 Total Tests: $((passed + failed))"

if [ $failed -eq 0 ]; then
    echo -e "\n🎊 ${GREEN}ALL TESTS PASSED!${NC} 🎊"
    echo "Your VSCode extension is ready for deployment!"
    exit 0
else
    echo -e "\n⚠️  ${RED}SOME TESTS FAILED${NC} ⚠️"
    echo "Please check the failed tests above and fix them before proceeding."
    exit 1
fi
