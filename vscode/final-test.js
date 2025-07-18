const { execSync } = require('child_process');

console.log('🔧 Final TypeScript Compilation Test');
console.log('====================================');

const projectRoot = '/Users/gregdunn/src/test/ai_debug_context/vscode';
process.chdir(projectRoot);

console.log(`📁 Testing directory: ${process.cwd()}`);
console.log('');

try {
    console.log('🔍 Running TypeScript compilation...');
    console.log('Command: npx tsc --noEmit');
    console.log('');
    
    const result = execSync('npx tsc --noEmit', { 
        encoding: 'utf8',
        stdio: 'pipe'
    });
    
    console.log('✅ SUCCESS: TypeScript compilation passed!');
    console.log('🎉 All TypeScript errors have been resolved!');
    console.log('');
    console.log('📊 Final Fix Summary:');
    console.log('  ✅ Fixed git analyzer test method signatures');
    console.log('  ✅ Enhanced AI provider null safety');
    console.log('  ✅ Fixed test analyzer selection handling');
    console.log('  ✅ Resolved plugin discovery type imports');
    console.log('  ✅ Fixed regex syntax error');
    console.log('  ✅ Completed plugin manager API implementation');
    console.log('  ✅ Added all missing interface methods');
    
} catch (error) {
    console.log('❌ TypeScript compilation still has errors:');
    console.log('Exit code:', error.status);
    console.log('');
    
    const errorOutput = error.stdout || error.stderr || '';
    console.log('🐛 Error details:');
    console.log(errorOutput);
    
    const errorCount = (errorOutput.match(/error TS\d+:/g) || []).length;
    console.log('');
    console.log(`📝 Remaining errors: ${errorCount}`);
    
    // Show file breakdown
    const fileErrors = {};
    const lines = errorOutput.split('\n');
    for (const line of lines) {
        const match = line.match(/^([^:]+):\d+:\d+ - error/);
        if (match) {
            const file = match[1];
            fileErrors[file] = (fileErrors[file] || 0) + 1;
        }
    }
    
    console.log('');
    console.log('📁 Errors by file:');
    for (const [file, count] of Object.entries(fileErrors)) {
        console.log(`  • ${file}: ${count} error(s)`);
    }
    
    process.exit(1);
}

console.log('');
console.log('🚀 Next Steps:');
console.log('  1. Run unit tests: npm test');
console.log('  2. Run plugin tests: npm run test:phase5');
console.log('  3. Build extension: npm run compile');
console.log('  4. Package extension: npm run package');
console.log('');
console.log('✨ The codebase is now fully type-safe and ready for development!');
