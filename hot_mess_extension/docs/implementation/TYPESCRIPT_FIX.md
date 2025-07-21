# TypeScript Configuration Fix

## Issue
The main TypeScript configuration was trying to compile Angular files along with the extension files, causing a `rootDir` conflict.

## Error
```
error TS6059: File '/Users/gregdunn/src/test/ai_debug_context/vscode/angular-app/...' is not under 'rootDir' '/Users/gregdunn/src/test/ai_debug_context/vscode/src'
```

## Solution
Updated `tsconfig.json` to properly separate main extension and Angular app compilation:

### Before (Problematic)
```json
{
  "compilerOptions": {
    "rootDir": "src",
    // ... other options
  },
  "exclude": [
    "node_modules",
    ".vscode-test",
    "out",
    "coverage"
  ]
}
```

### After (Fixed)
```json
{
  "compilerOptions": {
    "rootDir": "src",
    // ... other options
  },
  "include": [
    "src/**/*"
  ],
  "exclude": [
    "node_modules",
    ".vscode-test",
    "out",
    "coverage",
    "angular-app"
  ]
}
```

## Key Changes
1. **Added explicit `include`**: Only includes `src/**/*` files
2. **Added `angular-app` to exclude**: Prevents Angular files from being compiled by main tsconfig
3. **Maintained separation**: Angular app uses its own `angular-app/tsconfig.json`

## Build Process
- **Main extension**: Compiled by root `tsconfig.json` → `out/` directory
- **Angular app**: Compiled by `angular-app/tsconfig.json` → `angular-app/dist/` directory
- **Combined**: `build:angular` script copies Angular build to `out/webview/`

## Testing the Fix
```bash
# Test main TypeScript compilation
npm run compile

# Test Angular TypeScript compilation  
cd angular-app && npx tsc --noEmit

# Test complete build process
npm run build:angular

# Run full test suite
npm run test:all
```

## Now Working
✅ `npm run compile` - Main extension TypeScript compilation
✅ `npm run test` - Jest tests for main extension
✅ `npm run test:angular` - Angular unit tests
✅ `npm run test:all` - Complete test suite
✅ `npm run build:angular` - Angular app build for webview
