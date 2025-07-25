#!/usr/bin/env node
/**
 * Manual test script for AI Debug Context V3 Extension
 * Tests all major functionality after Phase 1.8 refactoring
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const workspaceRoot = __dirname;
const testResults = [];

function log(message, type = 'info') {
    const prefix = {
        'info': '📋',
        'success': '✅',
        'error': '❌',
        'warning': '⚠️'
    }[type] || '📋';
    
    console.log(`${prefix} ${message}`);
    testResults.push({ message, type, timestamp: new Date().toISOString() });
}

async function runCommand(command, args = []) {
    return new Promise((resolve) => {
        log(`Running: ${command} ${args.join(' ')}`);
        
        const child = spawn(command, args, {
            cwd: workspaceRoot,
            stdio: ['ignore', 'pipe', 'pipe']
        });
        
        let stdout = '';
        let stderr = '';
        
        child.stdout?.on('data', (data) => stdout += data.toString());
        child.stderr?.on('data', (data) => stderr += data.toString());
        
        child.on('close', (code) => {
            resolve({
                success: code === 0,
                stdout,
                stderr,
                code
            });
        });
    });
}

async function testProjectDiscovery() {
    log('\n🔍 Testing Project Discovery...\n');
    
    try {
        // Check if project.json files exist
        const projectJsonFiles = [];
        
        function findProjectJsonFiles(dir) {
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                
                if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
                    findProjectJsonFiles(fullPath);
                } else if (entry.name === 'project.json') {
                    projectJsonFiles.push(fullPath);
                }
            }
        }
        
        findProjectJsonFiles(workspaceRoot);
        
        if (projectJsonFiles.length > 0) {
            log(`Found ${projectJsonFiles.length} project.json files`, 'success');
            projectJsonFiles.forEach(file => {
                log(`  - ${path.relative(workspaceRoot, file)}`);
            });
        } else {
            log('No project.json files found - expected for non-Nx workspace', 'warning');
        }
        
        return projectJsonFiles.length;
        
    } catch (error) {
        log(`Project discovery test failed: ${error.message}`, 'error');
        return 0;
    }
}

async function testShellScripts() {
    log('\n🐚 Testing Shell Scripts...\n');
    
    const scriptsDir = path.join(workspaceRoot, 'scripts');
    const requiredScripts = [
        'ai-debug-affected-tests',
        'ai-debug-parallel-tests', 
        'ai-debug-watch'
    ];
    
    try {
        if (!fs.existsSync(scriptsDir)) {
            log(`Scripts directory not found at ${scriptsDir}`, 'error');
            return false;
        }
        
        let allScriptsExist = true;
        
        for (const script of requiredScripts) {
            const scriptPath = path.join(scriptsDir, script);
            if (fs.existsSync(scriptPath)) {
                log(`Found: ${script}`, 'success');
                
                // Check if executable
                try {
                    fs.accessSync(scriptPath, fs.constants.X_OK);
                    log(`  - Executable: YES`, 'success');
                } catch {
                    log(`  - Executable: NO (may need chmod +x)`, 'warning');
                }
            } else {
                log(`Missing: ${script}`, 'error');
                allScriptsExist = false;
            }
        }
        
        return allScriptsExist;
        
    } catch (error) {
        log(`Shell scripts test failed: ${error.message}`, 'error');
        return false;
    }
}

async function testGitIntegration() {
    log('\n🔀 Testing Git Integration...\n');
    
    try {
        // Check if we're in a git repo
        const gitStatus = await runCommand('git', ['status', '--porcelain']);
        
        if (gitStatus.success) {
            log('Git repository detected', 'success');
            
            // Get changed files
            const gitDiff = await runCommand('git', ['diff', '--name-only', 'HEAD~1']);
            
            if (gitDiff.success) {
                const changedFiles = gitDiff.stdout.trim().split('\n').filter(f => f.length > 0);
                log(`Found ${changedFiles.length} changed files`, 'success');
                
                if (changedFiles.length > 0) {
                    log('Changed files:', 'info');
                    changedFiles.slice(0, 5).forEach(file => log(`  - ${file}`));
                    if (changedFiles.length > 5) {
                        log(`  ... and ${changedFiles.length - 5} more`);
                    }
                }
            }
            
            return true;
        } else {
            log('Not in a git repository', 'warning');
            return false;
        }
        
    } catch (error) {
        log(`Git integration test failed: ${error.message}`, 'error');
        return false;
    }
}

async function testNxIntegration() {
    log('\n🚀 Testing Nx Integration...\n');
    
    try {
        // Check if nx.json exists
        const nxJsonPath = path.join(workspaceRoot, 'nx.json');
        
        if (fs.existsSync(nxJsonPath)) {
            log('Nx workspace detected (nx.json found)', 'success');
            
            // Try to run nx list
            const nxList = await runCommand('npx', ['nx', 'list']);
            
            if (nxList.success) {
                log('Nx command available', 'success');
                return true;
            } else {
                log('Nx command failed - may need to install dependencies', 'warning');
                return false;
            }
        } else {
            log('Not an Nx workspace (nx.json not found)', 'info');
            return false;
        }
        
    } catch (error) {
        log(`Nx integration test failed: ${error.message}`, 'error');
        return false;
    }
}

async function testTypeScriptCompilation() {
    log('\n📦 Testing TypeScript Compilation...\n');
    
    try {
        const tscResult = await runCommand('npx', ['tsc', '--noEmit']);
        
        if (tscResult.success) {
            log('TypeScript compilation successful', 'success');
            return true;
        } else {
            log('TypeScript compilation failed', 'error');
            if (tscResult.stderr) {
                log('Errors:', 'error');
                console.log(tscResult.stderr);
            }
            return false;
        }
        
    } catch (error) {
        log(`TypeScript test failed: ${error.message}`, 'error');
        return false;
    }
}

async function testExtensionStructure() {
    log('\n🏗️ Testing Extension Structure...\n');
    
    const requiredFiles = [
        'src/extension.ts',
        'src/core/ServiceContainer.ts',
        'src/core/CommandRegistry.ts',
        'src/utils/simpleProjectDiscovery.ts',
        'package.json',
        'tsconfig.json'
    ];
    
    let allFilesExist = true;
    
    for (const file of requiredFiles) {
        const filePath = path.join(workspaceRoot, file);
        if (fs.existsSync(filePath)) {
            log(`Found: ${file}`, 'success');
            
            // Check file size for extension.ts
            if (file === 'src/extension.ts') {
                const stats = fs.statSync(filePath);
                const lines = fs.readFileSync(filePath, 'utf8').split('\n').length;
                log(`  - Lines: ${lines} (target: <100)`, lines < 100 ? 'success' : 'warning');
            }
        } else {
            log(`Missing: ${file}`, 'error');
            allFilesExist = false;
        }
    }
    
    return allFilesExist;
}

async function generateTestReport() {
    log('\n📊 Test Summary\n');
    
    const successCount = testResults.filter(r => r.type === 'success').length;
    const errorCount = testResults.filter(r => r.type === 'error').length;
    const warningCount = testResults.filter(r => r.type === 'warning').length;
    
    log(`Total checks: ${testResults.length}`);
    log(`✅ Success: ${successCount}`);
    log(`❌ Errors: ${errorCount}`);
    log(`⚠️ Warnings: ${warningCount}`);
    
    // Save detailed report
    const reportPath = path.join(workspaceRoot, 'test-report.json');
    fs.writeFileSync(reportPath, JSON.stringify({
        timestamp: new Date().toISOString(),
        summary: {
            total: testResults.length,
            success: successCount,
            errors: errorCount,
            warnings: warningCount
        },
        results: testResults
    }, null, 2));
    
    log(`\nDetailed report saved to: ${reportPath}`, 'info');
}

// Main test runner
async function runAllTests() {
    console.log('🧪 AI Debug Context V3 - Extension Test Suite');
    console.log('============================================\n');
    
    await testExtensionStructure();
    await testTypeScriptCompilation();
    await testProjectDiscovery();
    await testShellScripts();
    await testGitIntegration();
    await testNxIntegration();
    
    await generateTestReport();
}

// Run tests
runAllTests().catch(error => {
    console.error('Test suite failed:', error);
    process.exit(1);
});