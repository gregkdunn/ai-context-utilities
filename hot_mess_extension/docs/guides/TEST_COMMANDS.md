# VSCode Extension Test Commands

## 🚀 Quick Start

### Run All Tests (Recommended)
```bash
cd /Users/gregdunn/src/test/ai_debug_context/vscode
npm run test:all
```

### Run Comprehensive Test Suite
```bash
chmod +x run-all-tests.sh
./run-all-tests.sh
```

### Quick Health Check
```bash
chmod +x quick-test-check.sh
./quick-test-check.sh
```

## 🔧 TypeScript Configuration

### Verify TypeScript Setup
```bash
chmod +x test-typescript-fix.sh
./test-typescript-fix.sh
```

### Manual TypeScript Verification
```bash
# Main extension compilation
npm run compile

# Angular app compilation check
cd angular-app && npx tsc --noEmit
```

## 📋 Individual Test Commands

### Main Tests
- `npm run test` - Run main Jest test suite
- `npm run test:coverage` - Run with coverage report
- `npm run test:watch` - Run in watch mode

### Specific Categories
- `npm run test:commands` - Command tests
- `npm run test:integration` - Integration tests
- `npm run test:utils` - Utility tests
- `npm run test:webview` - Webview tests

### Service Tests
- `npm run test:nx` - NX service tests
- `npm run test:git` - Git service tests
- `npm run test:flipper` - Flipper service tests
- `npm run test:phase5` - All Phase 5 services

### Angular Tests
- `npm run test:angular` - Angular unit tests
- `npm run test:angular:coverage` - Angular with coverage

## 🏗️ Build Commands

### Development
- `npm run compile` - Compile main extension
- `npm run watch` - Watch mode for TypeScript
- `npm run build:angular:watch` - Watch mode for Angular

### Production
- `npm run build:angular` - Build Angular app
- `npm run vscode:prepublish` - Complete build for publishing

## 📊 Coverage Reports
Coverage reports are generated in:
- `coverage/` - Jest coverage
- `angular-app/coverage/` - Angular coverage

## 🔍 Build Process Overview

### Separate TypeScript Configurations
- **Main Extension**: `tsconfig.json` (compiles `src/` → `out/`)
- **Angular App**: `angular-app/tsconfig.json` (compiles `angular-app/src/` → `angular-app/dist/`)

### Build Flow
1. `npm run compile` - Compiles main extension
2. `npm run build:angular` - Builds Angular app and copies to `out/webview/`
3. `npm run vscode:prepublish` - Complete build process

## 🧪 Test Verification Scripts

### Available Scripts
- `test-typescript-fix.sh` - Verify TypeScript configuration
- `quick-test-check.sh` - Quick health check
- `run-all-tests.sh` - Comprehensive test suite

### Make Scripts Executable
```bash
chmod +x test-typescript-fix.sh
chmod +x quick-test-check.sh
chmod +x run-all-tests.sh
```

## 🚨 Common Issues

### TypeScript Compilation Errors
- Run `./test-typescript-fix.sh` to verify configuration
- Ensure Angular app is excluded from main tsconfig
- Check that both configs compile independently

### Dependency Issues
- Run `npm install` in root directory
- Run `npm install` in `angular-app` directory
- Clear `node_modules` and reinstall if needed

### Test Failures
- Check that all files were properly fixed from corruption
- Verify TypeScript compilation works
- Run health check script first

## 📝 Documentation References
- [Testing Guide](docs/guides/TESTING.md) - Complete testing documentation
- [Getting Started](docs/guides/GETTING_STARTED.md) - Development setup
- [TYPESCRIPT_FIX.md](TYPESCRIPT_FIX.md) - TypeScript configuration fix details
