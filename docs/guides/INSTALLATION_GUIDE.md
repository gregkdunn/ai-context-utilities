# AI Debug Context V3.4.0 - Installation Guide

## 🚀 Extension Ready for Production!

**Current Version:** 3.4.0 (Phase 3.4.0 - Enhanced AI Context Generation)  
**Status:** Production Ready with Streamlined Context Generation  
**Features:** Multi-System Feature Flag Detection, Pattern-Based Test Analysis

## 📦 Installation Methods

### Method 1: VSCode Command Palette (Recommended)

1. **Open VSCode**
2. **Press** `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux)
3. **Type:** `Extensions: Install from VSIX...`
4. **Select:** `ai-debug-context-v3-3.0.0.vsix` from your file browser
5. **Click:** Install
6. **Restart** VSCode when prompted

### Method 2: Command Line Installation

```bash
# Navigate to the extension directory
cd /Users/gregdunn/src/test/ai_debug_context

# Install the extension
code --install-extension ai-debug-context-v3-3.0.0.vsix
```

### Method 3: Drag & Drop

1. **Open VSCode**
2. **Drag** `ai-debug-context-v3-3.0.0.vsix` into the VSCode window
3. **Click** Install when prompted
4. **Restart** VSCode

## 🎯 Verification Steps

After installation, verify the extension is working:

### 1. Check Extension is Loaded
- **Go to:** VSCode Extensions panel (`Cmd+Shift+X`)
- **Search:** "AI Debug Context V3"
- **Status:** Should show as "Enabled"

### 2. Verify Commands are Available
- **Press:** `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux)
- **Type:** "AI Debug"
- **Should see 9 commands:**
  - ⚡ Run My Changed Tests
  - 👀 Toggle Test Watcher
  - 🗑️ Clear Test Cache
  - 🍎 Run Setup
  - 🎯 Test Specific Project
  - 📊 Show Workspace Info
  - ⚡ Run Tests (Skip Analysis)
  - 🚀 Auto-Detect Projects
  - 🎯 Type Project Name

### 3. Check Status Bar
- **Look for:** AI Debug Context status in the bottom status bar
- **Should show:** "Ready" or setup prompts

### 4. Test Basic Functionality
- **Command:** `AI Debug: Show Workspace Info`
- **Expected:** Information popup about your workspace
- **Command:** `AI Debug: Run Setup` 
- **Expected:** Setup wizard if needed

## 🔧 Testing Features

### Core Features to Test:

#### 1. Project Discovery
- **Test:** Open a workspace with multiple folders
- **Command:** `AI Debug: Test Specific Project`
- **Expected:** List of detected projects

#### 2. Git Integration  
- **Test:** In a git repository with changes
- **Command:** `AI Debug: Run My Changed Tests`
- **Expected:** Auto-detection of changed files

#### 3. File Watcher
- **Command:** `AI Debug: Toggle Test Watcher`
- **Expected:** File watching status changes

#### 4. Cache Management
- **Command:** `AI Debug: Clear Test Cache`
- **Expected:** Cache cleared successfully message

## 🐛 Troubleshooting

### If Extension Doesn't Load:
1. **Check Developer Console:**
   - `Help > Toggle Developer Tools`
   - Look for error messages in Console tab

2. **Check Extension Host Log:**
   - `View > Output`
   - Select "Extension Host" from dropdown
   - Look for AI Debug Context errors

### If Commands Don't Appear:
1. **Restart VSCode** completely
2. **Check workspace** - some features require open folder
3. **Verify permissions** - especially for shell script execution

### If Shell Scripts Fail:
1. **Check script permissions:**
   ```bash
   ls -la scripts/
   # Should show -rwxr-xr-x for scripts
   ```

2. **Make executable if needed:**
   ```bash
   chmod +x scripts/ai-debug-*
   ```

## 🎉 Phase 1.8 Features

This build includes all Phase 1.8 improvements:

- ✅ **Clean Architecture:** 94% reduction in extension.ts size
- ✅ **ServiceContainer:** Proper dependency injection
- ✅ **CommandRegistry:** Centralized command management  
- ✅ **SimpleProjectDiscovery:** Fast project detection
- ✅ **Improved Error Handling:** User-friendly error messages
- ✅ **Better Performance:** Optimized file operations

## 📝 Feedback

If you encounter any issues during testing:

1. **Check Output Panel:** `View > Output > AI Debug Context`
2. **Check Developer Console:** `Help > Toggle Developer Tools`
3. **Test with different workspaces:** Empty, Git repo, Nx workspace, etc.
4. **Try all 9 commands** to verify functionality

## 🔄 Development Mode (Optional)

For development/debugging:

```bash
# Clone and run in development mode
cd /Users/gregdunn/src/test/ai_debug_context
npm run compile
# Then F5 in VSCode to launch Extension Development Host
```

---

**Extension Package:** `/Users/gregdunn/src/test/ai_debug_context/ai-debug-context-v3-3.0.0.vsix`  
**Size:** 215 KB  
**Files Included:** 119 files (compiled TypeScript, shell scripts, icons, etc.)

Ready for testing! 🚀