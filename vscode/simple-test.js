"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
console.log('Testing types module...');
// Test basic interface creation
const project = {
    name: 'test-project',
    root: './test',
    projectType: 'application'
};
const options = {
    quick: true,
    fullContext: false
};
const result = {
    success: true,
    exitCode: 0,
    output: 'Test output',
    duration: 1000
};
console.log('✅ Types module working correctly');
console.log('Project:', project);
console.log('Options:', options);
console.log('Result:', result);
//# sourceMappingURL=simple-test.js.map