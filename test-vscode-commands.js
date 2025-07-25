#!/usr/bin/env node
/**
 * Test VSCode command registration for AI Debug Context V3
 */

const { readFileSync } = require('fs');
const path = require('path');

function testCommandRegistration() {
    console.log('🎯 Testing VSCode Command Registration\n');
    
    try {
        // Read package.json to check contributed commands
        const packageJsonPath = path.join(__dirname, 'package.json');
        const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
        
        const contributedCommands = packageJson.contributes?.commands || [];
        console.log(`📋 Found ${contributedCommands.length} contributed commands in package.json:`);
        
        contributedCommands.forEach((cmd, index) => {
            console.log(`  ${index + 1}. ${cmd.command} - "${cmd.title}"`);
        });
        
        // Read CommandRegistry.ts to check registered commands
        console.log('\n🔍 Checking CommandRegistry.ts...');
        
        const commandRegistryPath = path.join(__dirname, 'src/core/CommandRegistry.ts');
        const commandRegistryContent = readFileSync(commandRegistryPath, 'utf8');
        
        // Extract command registrations
        const commandRegex = /vscode\.commands\.registerCommand\('([^']+)'/g;
        const registeredCommands = [];
        let match;
        
        while ((match = commandRegex.exec(commandRegistryContent)) !== null) {
            registeredCommands.push(match[1]);
        }
        
        console.log(`📋 Found ${registeredCommands.length} registered commands in CommandRegistry:`);
        registeredCommands.forEach((cmd, index) => {
            console.log(`  ${index + 1}. ${cmd}`);
        });
        
        // Check if all contributed commands are registered
        console.log('\n✅ Verification:');
        
        const contributedCommandIds = contributedCommands.map(c => c.command);
        const missingCommands = contributedCommandIds.filter(cmd => !registeredCommands.includes(cmd));
        const extraCommands = registeredCommands.filter(cmd => !contributedCommandIds.includes(cmd));
        
        if (missingCommands.length === 0 && extraCommands.length === 0) {
            console.log('✅ All commands properly registered!');
        } else {
            if (missingCommands.length > 0) {
                console.log(`❌ Missing registrations: ${missingCommands.join(', ')}`);
            }
            if (extraCommands.length > 0) {
                console.log(`⚠️ Extra registrations: ${extraCommands.join(', ')}`);
            }
        }
        
        return {
            contributedCommands: contributedCommandIds,
            registeredCommands,
            missingCommands,
            extraCommands
        };
        
    } catch (error) {
        console.error('❌ Command registration test failed:', error.message);
        return null;
    }
}

// Run test
const result = testCommandRegistration();

if (result && result.missingCommands.length === 0) {
    console.log('\n🎉 Command registration test PASSED!');
    process.exit(0);
} else {
    console.log('\n💥 Command registration test FAILED!');
    process.exit(1);
}