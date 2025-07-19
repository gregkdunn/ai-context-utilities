# Angular Webview Loading Issue - Debugging Guide

## 🔍 **Current Issue**

The VSCode extension is showing "Loading AI Debug Context..." and never progresses to the actual Angular interface.

## 🎯 **Likely Causes**

### 1. **ES Module Loading Issues**
Angular 15+ uses ES modules by default, which might not load properly in VSCode webviews.

### 2. **Missing Runtime Dependencies**
The Angular build generates `runtime.js` that might not be loaded by the webview provider.

### 3. **Content Security Policy (CSP)**
Restrictive CSP might block ES module imports or Angular's dynamic loading.

### 4. **Angular 17+ Control Flow Syntax**
The `@if` and `@for` syntax requires Angular 17+ and might not be compatible.

### 5. **Component Import Dependencies**
Complex component imports might fail in the webview context.

## 🛠️ **Debugging Steps**

### Step 1: Run Diagnostic Script
```bash
bash /Users/gregdunn/src/test/ai_debug_context/temp_scripts/diagnose_angular_loading.sh
```

This will show:
- Generated files and their sizes
- Angular version information
- Potential compatibility issues

### Step 2: Test with Simple Component
```bash
bash /Users/gregdunn/src/test/ai_debug_context/temp_scripts/test_simple_component.sh
```

This replaces the complex Angular component with a simple test component to isolate the issue.

**If Simple Component Works:**
- Issue is with complex component structure
- Likely import dependencies or new syntax

**If Simple Component Doesn't Work:**
- Issue is with Angular/ES module loading
- Need to fix webview provider or build configuration

### Step 3: Check Browser Console
1. Press F5 in VSCode to launch extension
2. Open Developer Tools: Help → Toggle Developer Tools
3. Look for JavaScript errors in Console tab
4. Check Network tab for failed resource loads

### Step 4: Restore Original Component
```bash
bash /Users/gregdunn/src/test/ai_debug_context/temp_scripts/restore_original_component.sh
```

## 🔧 **Quick Fixes Applied**

### Updated Webview Provider
- Reads Angular-generated `index.html` directly
- Properly handles ES modules with `type="module"`
- Includes `runtime.js` in script loading
- Updated CSP to allow `'unsafe-eval'` for ES modules
- Added proper nonce handling for all scripts

### Enhanced Build Configuration
- Added `aot: true` for better compatibility
- Set `bundleDependencies: false` to avoid module conflicts
- Maintained `outputHashing: none` for predictable filenames

## 🎯 **Expected Results**

### If Working Correctly:
- No "Loading AI Debug Context..." message
- Full Angular interface with four modules visible
- Module navigation working
- VSCode theme colors applied

### If Still Loading:
- Check console for specific errors
- ES module loading might be the issue
- May need to downgrade to CommonJS modules

## 🔄 **Alternative Solutions**

If the current approach doesn't work:

### Option 1: Downgrade to CommonJS
```json
// In angular.json vscode configuration
"target": "es5",
"module": "system"
```

### Option 2: Simplify Component Syntax
Replace `@if`/`@for` with `*ngIf`/`*ngFor` for broader compatibility.

### Option 3: Bundle Everything
Use a single-file build that includes all dependencies.

## 📊 **Files Modified**

1. **`AIDebugWebviewProvider.ts`**: Enhanced ES module support
2. **`angular.json`**: Added VSCode-specific build configuration  
3. **Test Scripts**: Created diagnostic and testing tools

## 🧪 **Testing Workflow**

1. **Run Diagnostic**: See what's actually being generated
2. **Test Simple**: Isolate Angular vs component issues  
3. **Check Console**: Look for specific JavaScript errors
4. **Try Fixes**: Based on console error messages
5. **Restore**: Go back to original if needed

The updated webview provider should handle ES modules better, but if there are still issues, the diagnostic tools will help identify the specific problem.
