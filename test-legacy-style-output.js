#!/usr/bin/env node
/**
 * Test the legacy style formatter output
 */

const { LegacyStyleFormatter } = require('./out/utils/legacyStyleFormatter');

// Mock test result for demonstration
const mockPassedResult = {
    project: 'user-settings',
    passed: 15,
    failed: 0,
    skipped: 2,
    total: 17,
    duration: 3.245,
    success: true,
    failures: []
};

const mockFailedResult = {
    project: 'shopping-cart',
    passed: 8,
    failed: 3,
    skipped: 0,
    total: 11,
    duration: 5.678,
    success: false,
    failures: [
        {
            test: 'should calculate total price correctly',
            suite: 'CartCalculations',
            error: 'Expected: 29.99\nReceived: 25.99\nDifference in tax calculation',
            file: 'src/cart/calculations.spec.ts',
            line: 45
        },
        {
            test: 'should handle empty cart',
            suite: 'CartState',
            error: 'TypeError: Cannot read property length of undefined',
            file: 'src/cart/state.spec.ts',
            line: 23
        }
    ]
};

const mockRawOutput = `
PASS src/settings/user-settings.spec.ts
FAIL src/cart/shopping-cart.spec.ts
  CartCalculations
    ✓ should add items correctly (125 ms)
    ✗ should calculate total price correctly (1045 ms)
  CartState  
    ✓ should initialize empty (15 ms)
    ✗ should handle empty cart (234 ms)

Test Suites: 1 failed, 1 passed, 2 total
Tests: 3 failed, 8 passed, 11 total
Time: 5.678s
`;

console.log('🎨 Legacy Style Formatter Demo\n');
console.log('===============================================\n');

console.log('📊 EXAMPLE 1: Successful Test Run');
console.log('=================================\n');

const passedReport = LegacyStyleFormatter.formatTestReport(mockPassedResult, {
    command: 'npx nx test user-settings',
    exitCode: 0,
    rawOutput: 'PASS src/settings/user-settings.spec.ts\nTests: 15 passed, 2 skipped, 17 total\nTime: 3.245s',
    optimized: true
});

console.log(passedReport);

console.log('\n\n📊 EXAMPLE 2: Failed Test Run');
console.log('=============================\n');

const failedReport = LegacyStyleFormatter.formatTestReport(mockFailedResult, {
    command: 'npx nx test shopping-cart',
    exitCode: 1,
    rawOutput: mockRawOutput,
    optimized: true
});

console.log(failedReport);

console.log('\n\n📊 EXAMPLE 3: Quick Status Banner');
console.log('=================================\n');

const statusBanner = LegacyStyleFormatter.createStatusBanner(mockFailedResult);
console.log(statusBanner);

console.log('\n\n📊 EXAMPLE 4: Failures Only');
console.log('===========================\n');

const failuresOnly = LegacyStyleFormatter.formatFailuresOnly(mockFailedResult.failures);
console.log(failuresOnly);

console.log('\n🎯 This matches the style from legacy/zsh/functions/nxTest.zsh!');
console.log('✨ Extension updated with beautiful, structured output formatting.');