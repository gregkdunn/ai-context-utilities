#!/bin/bash

echo "🔍 Diagnosing GitHub Copilot Integration Issues..."

cd /Users/gregdunn/src/test/ai_debug_context/vscode_2

echo "1️⃣ Checking VSCode version requirements..."
echo "Required: VSCode 1.85.0 or higher"
echo "Language Model API required for Copilot integration"

echo ""
echo "2️⃣ Testing Copilot Integration Service..."

# Create a simple test script to check Copilot availability
cat > test_copilot_availability.js << 'EOF'
const vscode = require('vscode');

async function testCopilotAvailability() {
    console.log('🔍 Testing Copilot Availability...');
    
    // Check if Language Model API exists
    if (typeof vscode.lm === 'undefined') {
        console.log('❌ VSCode Language Model API not available');
        console.log('   - Check VSCode version (need 1.85+)');
        console.log('   - Update VSCode to latest version');
        return false;
    }
    
    console.log('✅ VSCode Language Model API available');
    
    try {
        // Try to get Copilot models
        const models = await vscode.lm.selectChatModels({ 
            vendor: 'copilot', 
            family: 'gpt-4o' 
        });
        
        if (models.length === 0) {
            console.log('❌ No Copilot models available');
            console.log('   - Check GitHub Copilot extension is installed');
            console.log('   - Check GitHub Copilot authentication');
            console.log('   - Verify Copilot subscription is active');
            return false;
        }
        
        console.log(`✅ Found ${models.length} Copilot model(s)`);
        return true;
        
    } catch (error) {
        console.log('❌ Error accessing Copilot models:', error.message);
        console.log('   - Check GitHub Copilot extension status');
        console.log('   - Try signing out and back in to Copilot');
        return false;
    }
}

// Export for use in extension
module.exports = { testCopilotAvailability };
EOF

echo "✅ Created Copilot availability test script"

echo ""
echo "3️⃣ Manual Checks to Perform:"
echo ""
echo "In VSCode:"
echo "  1. Check Extensions → GitHub Copilot (should be installed & enabled)"
echo "  2. Command Palette → 'GitHub Copilot: Check Status'"
echo "  3. Command Palette → 'GitHub Copilot: Sign In' (if needed)"
echo "  4. Check bottom-right status bar for Copilot icon"
echo ""
echo "In our Extension:"
echo "  1. Open Extension Development Host (F5)"
echo "  2. Open Developer Tools (F12)"
echo "  3. Check Console for Copilot initialization messages"
echo "  4. Look for 'VSCode Language Model API' messages"
echo ""
echo "4️⃣ Quick Verification Commands:"
echo ""
echo "# Check if extension compiles without errors"
echo "npm run compile:ts-only"
echo ""
echo "# Run Copilot integration tests"
echo "npm test -- --testNamePattern='CopilotIntegration'"
echo ""
echo "# Launch extension for testing"
echo "code . # Then press F5"
