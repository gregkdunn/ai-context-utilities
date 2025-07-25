#!/usr/bin/env node
/**
 * Test ANSI cleaning and improved failure detection
 */

const { TestResultParser } = require('./out/utils/testResultParser');

// Mock output similar to what you experienced
const mockFailedOutput = `
> nx run settings-voice-assist-feature:test

 [1m● [22mTest suite failed to run

    InjectionComponent 

    PromptModalComponent

    This component

    InjectionComponent

    ZoneDelegate

 [1m● [22mTest suite failed to run

    Your test suite must contain at least one test.

      at node_modules/jest-runner/build/runTest.js:409:38

Test Suites: 0 passed, 1 failed, 1 total
Tests:       0 total  
Time:        17.893s
Ran all test suites.
`;

console.log('🧪 Testing ANSI Cleaning and Failure Detection\n');
console.log('===============================================\n');

console.log('📋 Raw Output (with ANSI codes):');
console.log('--------------------------------');
console.log(mockFailedOutput);

console.log('\n🔧 Parsed Test Results:');
console.log('----------------------');

const result = TestResultParser.parseJestOutput(mockFailedOutput, 'settings-voice-assist-feature');

console.log(`Project: ${result.project}`);
console.log(`Success: ${result.success}`);
console.log(`Passed: ${result.passed}`);
console.log(`Failed: ${result.failed}`);
console.log(`Total: ${result.total}`);
console.log(`Duration: ${result.duration}s`);
console.log(`Failures Count: ${result.failures.length}`);

if (result.failures.length > 0) {
    console.log('\n💥 Failure Details:');
    console.log('------------------');
    result.failures.forEach((failure, index) => {
        console.log(`${index + 1}. ${failure.test}`);
        console.log(`   Suite: ${failure.suite}`);
        console.log(`   Error: ${failure.error}`);
        console.log('');
    });
}

console.log('\n✅ Expected Results:');
console.log('-------------------');
console.log('• Success: false (should be failed)');
console.log('• Failed: 1 (should detect compilation failure)');  
console.log('• Failures: 1 (should have compilation error)');
console.log('• Error message: Should explain "test suite must contain at least"');

console.log('\n🎯 Key Improvements:');
console.log('-------------------');
console.log('• ANSI codes cleaned from [1m● [22m patterns');
console.log('• "Test suite must contain at least" error detected');
console.log('• Exit code 1 forces failure status');
console.log('• Helpful error message explaining the issue');

const isCorrect = !result.success && result.failed > 0 && result.failures.length > 0;
console.log(`\n${isCorrect ? '✅' : '❌'} Parsing ${isCorrect ? 'CORRECT' : 'INCORRECT'}`);

if (isCorrect) {
    console.log('🎉 The extension will now correctly identify this as a failed test!');
} else {
    console.log('❌ Still needs debugging...');
}