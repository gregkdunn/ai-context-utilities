# VSCode Extension Development Setup

Quick guide to get the AI Debug Utilities VSCode extension up and running.

## Prerequisites

- Node.js 18+
- VSCode 1.85.0+
- An Angular NX workspace for testing

## Setup Steps

1. **Navigate to the VSCode extension directory:**
   ```bash
   cd vscode/
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Open in VSCode:**
   ```bash
   code .
   ```

4. **Start development:**
   - Press `F5` to launch the Extension Development Host
   - Or use `Ctrl+Shift+P` → "Debug: Start Debugging"

5. **Test the extension:**
   - In the Extension Development Host, open an Angular NX workspace
   - The extension should automatically activate
   - Use `Ctrl+Shift+D` to open the AI Debug panel

## Development Workflow

### Making Changes
1. Edit TypeScript files in `src/`
2. The watch task will automatically recompile
3. Reload the Extension Development Host window (`Ctrl+R`)

### Debugging
- Set breakpoints in TypeScript files
- Use the VSCode debugger normally
- Console output appears in the original VSCode instance

### Testing
- Always test with a real NX workspace
- Try different project types (apps vs libraries)
- Test error scenarios and edge cases

## Current Status

### ✅ Working Features
- Extension activation in NX workspaces
- Side panel UI with project selection
- Basic command execution framework
- File management and output handling
- VSCode theming and responsive design

### 🚧 In Development
- Shell function porting to TypeScript
- AI-optimized output generation
- Enhanced error handling
- Real command implementations

### 📋 Next Steps
1. **Port Shell Functions**: Replace placeholder commands with full implementations
2. **Add Copilot Integration**: Implement GitHub Copilot chat features
3. **Enhanced UI**: Add more interactive features and better error handling
4. **Testing**: Add comprehensive test suite

## File Structure

```
src/
├── extension.ts              # Main extension entry point
├── types/index.ts           # TypeScript interfaces
├── utils/
│   ├── projectDetector.ts   # NX project detection
│   ├── shellRunner.ts       # Command execution
│   └── fileManager.ts       # Output file management  
└── webview/
    ├── provider.ts          # Webview panel logic
    ├── main.js             # Frontend JavaScript
    └── styles.css          # VSCode-themed styles
```

## Building for Distribution

```bash
# Compile TypeScript
npm run compile

# Package extension
npm run package

# This creates a .vsix file you can install
```

## Troubleshooting

### Extension Not Activating
- Ensure you're in an NX workspace (contains `nx.json` or `angular.json`)
- Check the Output panel for error messages
- Reload the Extension Development Host window

### Commands Not Working  
- Check that placeholder implementations are being called
- Look for errors in the Debug Console
- Verify project selection is working

### UI Issues
- Ensure webview files are being compiled to `out/`
- Check browser console in webview (F12 when focused on panel)
- Verify CSS variables are loading correctly

## Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly with real NX workspaces
4. Update documentation as needed
5. Submit a pull request

The extension is designed to be extensible, so adding new features should be straightforward following the existing patterns.
