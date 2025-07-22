# 🔧 GitHub Copilot Integration Troubleshooting Guide

## Step-by-Step Diagnosis

### Step 1: Check GitHub Copilot Extension Status

1. **Open VSCode Extensions**
   - Press `Ctrl+Shift+X` (or `Cmd+Shift+X` on Mac)
   - Search for "GitHub Copilot"
   - Verify it shows as **Installed** and **Enabled**

2. **Check Copilot Status**
   - Open Command Palette (`Ctrl+Shift+P`)
   - Run: `GitHub Copilot: Check Status`
   - Should show "GitHub Copilot is ready"

3. **Check Authentication**
   - Command Palette → `GitHub Copilot: Sign In`
   - Complete authentication if prompted
   - Verify you have an active Copilot subscription

### Step 2: Verify VSCode Version

Our extension requires **VSCode 1.85.0 or higher** for the Language Model API.

1. **Check Version**
   - Help → About
   - Should show version 1.85.0 or higher

2. **Update if Needed**
   - Download latest VSCode from https://code.visualstudio.com/
   - The Language Model API is a newer feature

### Step 3: Test Our Extension's Copilot Detection

1. **Use Debug Version**
   ```bash
   cd /Users/gregdunn/src/test/ai_debug_context/vscode_2
   
   # Run diagnostic script
   chmod +x /Users/gregdunn/src/test/ai_debug_context/temp_scripts/diagnose_copilot.sh
   ./temp_scripts/diagnose_copilot.sh
   ```

2. **Enable Debug Mode**
   - Temporarily replace `CopilotIntegration` with `CopilotIntegrationDebug` in extension.ts
   - Rebuild and test
   - Check VSCode Output panel for detailed diagnostics

### Step 4: Common Issues and Solutions

#### Issue: "VSCode Language Model API not available"
**Cause**: VSCode version too old or API not enabled
**Solution**: 
- Update to VSCode 1.85+
- Enable Language Model API in settings if available

#### Issue: "No Copilot models available"
**Cause**: GitHub Copilot not properly installed/authenticated
**Solution**:
1. Install GitHub Copilot extension
2. Run `GitHub Copilot: Sign In`
3. Verify subscription is active
4. Check status bar for Copilot icon

#### Issue: "Authentication failed"
**Cause**: GitHub authentication expired or invalid
**Solution**:
1. `GitHub Copilot: Sign Out`
2. `GitHub Copilot: Sign In`
3. Complete authentication flow
4. Restart VSCode

#### Issue: "Network connectivity"
**Cause**: Firewall or network blocking Copilot
**Solution**:
- Check firewall settings
- Verify corporate network allows GitHub/OpenAI connections
- Try different network

### Step 5: Extension-Specific Checks

1. **Check Extension Settings**
   ```json
   {
     "aiDebugContext.copilot.enabled": true
   }
   ```

2. **View Extension Logs**
   - Open Developer Tools (F12) in Extension Development Host
   - Check Console for initialization messages
   - Look for our debug output

3. **Test with Simple Code**
   - Open a JavaScript/TypeScript file
   - Type a comment like `// function to add two numbers`
   - Copilot should suggest code
   - If this works, Copilot is functional

### Step 6: Alternative Testing

If Copilot still doesn't work, you can test our extension with the fallback mode:

1. **Disable Copilot Integration**
   ```json
   {
     "aiDebugContext.copilot.enabled": false
   }
   ```

2. **Test Fallback Behavior**
   - Extension should work with mock responses
   - UI should show "Copilot unavailable" warning
   - Workflow should complete with fallback analysis

### Step 7: Report Debugging Info

If issues persist, gather this information:

1. **VSCode Version**: Help → About
2. **Extension Status**: GitHub Copilot extension enabled?
3. **Authentication**: `GitHub Copilot: Check Status` output
4. **Our Extension Logs**: Console output from Extension Development Host
5. **Network**: Any corporate firewall/proxy?

## Quick Fix Commands

```bash
# Navigate to extension directory
cd /Users/gregdunn/src/test/ai_debug_context/vscode_2

# Run comprehensive build
npm run compile

# Test extension
code .  # Press F5 to launch Extension Development Host

# Check if Copilot works in general
# Open any .ts file and type: // function to calculate factorial
# Copilot should suggest code completion
```

## Expected Behavior When Working

When GitHub Copilot is properly integrated:

1. **Extension loads** without "Copilot not available" warning
2. **Green checkmark** appears next to Copilot status
3. **AI Debug workflow** provides real analysis instead of fallback messages
4. **Console shows** "Initialized X Copilot models" message
5. **Test failures** get detailed AI analysis with specific fixes

## Fallback Mode (When Copilot Unavailable)

Even without Copilot, the extension provides:
- ⚠️ Warning that Copilot is unavailable
- 📝 Basic fallback analysis messages
- 🔧 Suggestions to enable Copilot
- ✅ Complete workflow functionality

The extension is designed to be useful even without AI integration!
