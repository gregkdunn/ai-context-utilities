# VSCode Extension v2 - Webview Build Troubleshooting

## The Issue

You're seeing this message in the VSCode extension:

```
Setup Required: Please build the webview UI first.
Build Command: npm run build:webview
```

## Why This Happens

The VSCode extension checks for Angular build files in the `out/webview/` directory. When these files don't exist, it shows a placeholder interface with setup instructions instead of the full Angular webview.

## Quick Fix

### Option 1: Run the Build Command
```bash
cd /Users/gregdunn/src/test/ai_debug_context/vscode_2
npm run build:webview
```

### Option 2: Use the Fix Script
```bash
bash /Users/gregdunn/src/test/ai_debug_context/temp_scripts/fix_webview.sh
```

### Option 3: Complete Setup
```bash
bash /Users/gregdunn/src/test/ai_debug_context/temp_scripts/complete_setup.sh
```

## What Should Happen

1. **Angular Build**: The command builds the Angular app to `out/webview/`
2. **File Detection**: The extension detects `main.js`, `polyfills.js`, and `styles.css`
3. **Interface Switch**: The placeholder is replaced with the full Angular webview
4. **Module Access**: You can now use all four modules (File Selection, Test Selection, AI Debug, PR Generator)

## Expected Files After Build

```
out/webview/
├── main.js          # Angular app bundle
├── polyfills.js     # Browser polyfills  
├── styles.css       # Compiled Tailwind styles
├── index.html       # Angular index file
└── [other assets]   # Favicon, etc.
```

## Verification Steps

After running the build:

1. **Check Files Exist**:
   ```bash
   ls -la out/webview/
   ```

2. **Restart Extension**: 
   - In VSCode, press `Ctrl+Shift+F5` (or `Cmd+Shift+F5` on Mac) to restart the debug session

3. **Reload Window**: 
   - Or press `Ctrl+R` (or `Cmd+R` on Mac) in the Extension Development Host

4. **Check Developer Console**:
   - Help → Toggle Developer Tools
   - Look for any error messages

## Common Issues and Solutions

### Issue: "npm command not found"
**Solution**: Make sure you're in the correct directory:
```bash
cd /Users/gregdunn/src/test/ai_debug_context/vscode_2
```

### Issue: "ng: command not found" 
**Solution**: Install dependencies first:
```bash
cd webview-ui
npm install
```

### Issue: Build succeeds but still shows setup message
**Solution**: 
1. Check that files exist in `out/webview/`
2. Restart the VSCode debug session completely
3. Check Developer Console for errors

### Issue: Angular build errors
**Solution**: 
1. Install all dependencies:
   ```bash
   npm install && cd webview-ui && npm install
   ```
2. Check for TypeScript errors:
   ```bash
   cd webview-ui && npx ng build
   ```

### Issue: TypeScript compilation errors
**Solution**: Check the specific errors and fix imports or type issues

## After Successful Build

You should see the full Angular interface with:

- **📁 File Selection**: Choose from uncommitted changes, git commits, or branch diffs
- **🧪 Test Selection**: Configure project or affected tests
- **🤖 AI Debug**: Run the complete AI debugging workflow  
- **📋 PR Generator**: Generate PR descriptions with templates

## Manual Testing

Once the webview loads:

1. **File Selection**: Try selecting different file change modes
2. **Test Selection**: Switch between project and affected test modes
3. **Navigation**: Use the "Back to Overview" button to return to the main interface
4. **State Persistence**: Changes should be saved when switching between modules

## Need More Help?

If the build still fails or the interface doesn't load:

1. Check the complete setup script output
2. Look at the VSCode Developer Console for specific errors
3. Verify all dependencies are installed correctly
4. Try building the Angular app independently: `cd webview-ui && npm run build`

The extension is designed to gracefully handle missing webview files, so the placeholder mode with backend testing should always work even if the Angular build fails.
