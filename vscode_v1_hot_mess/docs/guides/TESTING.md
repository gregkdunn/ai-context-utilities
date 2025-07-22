# Testing Guide - AI Debug Utilities VSCode Extension

## 🚀 Quick Start

### **Run All Tests (Recommended)**
```bash
cd /Users/gregdunn/src/test/ai_debug_context/vscode
npm run test:all
```

This single command runs:
- Main Jest tests
- Phase 5 service tests (NX, Git, Flipper)
- Angular app tests

### **Comprehensive Test Suite**
```bash
chmod +x run-all-tests.sh
./run-all-tests.sh
```

This runs a detailed test suite with color-coded output and comprehensive reporting.

## 🔧 TypeScript Configuration

### **Separate Build Processes**
The project uses **separate TypeScript configurations** for different parts:

- **Main Extension**: `tsconfig.json` (compiles `src/` → `out/`)
- **Angular App**: `angular-app/tsconfig.json` (compiles `angular-app/src/` → `angular-app/dist/`)

### **Build Commands**
```bash
# Main extension compilation
npm run compile

# Angular app compilation
npm run build:angular

# Complete build process
npm run vscode:prepublish
```

### **TypeScript Verification**
```bash
# Test TypeScript configuration fix
chmod +x test-typescript-fix.sh
./test-typescript-fix.sh

# Manual verification
npm run compile                    # Main extension
cd angular-app && npx tsc --noEmit # Angular app
```

## 📋 Available Test Commands

### **Main Test Commands**
```bash
# Run all tests (Jest + Phase 5 + Angular)
npm run test:all

# Run main Jest suite
npm run test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode (for development)
npm run test:watch

# Pre-test setup (compile + lint)
npm run pretest
```

### **Specific Test Categories**
```bash
# Command tests
npm run test:commands

# Integration tests
npm run test:integration

# Unit tests only
npm run test:unit

# Streaming tests
npm run test:streaming

# Webview tests
npm run test:webview

# Utils tests
npm run test:utils

# File manager tests
npm run test:filemanager

# Enhanced functionality tests
npm run test:enhanced

# Batch operation tests
npm run test:batch
```

### **Service-Specific Tests (Phase 5)**
```bash
# NX service tests
npm run test:nx

# Git service tests
npm run test:git

# Flipper service tests
npm run test:flipper

# All Phase 5 services combined
npm run test:phase5
```

### **Angular Tests**
```bash
# Angular unit tests
npm run test:angular

# Angular with coverage
npm run test:angular:coverage
```

## 🔧 Development Testing

### **Watch Mode**
For active development, use watch mode to automatically re-run tests when files change:
```bash
npm run test:watch
```

### **Specific Component Testing**
When working on specific components:
```bash
# If working on commands
npm run test:commands

# If working on webview
npm run test:webview

# If working on NX integration
npm run test:nx
```

### **Pre-commit Testing**
Before committing changes:
```bash
npm run pretest && npm run test:all
```

## 📊 Understanding Test Output

### **Jest Test Results**
- ✅ **PASS**: All assertions passed
- ❌ **FAIL**: One or more assertions failed
- **Suites**: Test file groups
- **Tests**: Individual test cases
- **Coverage**: Code coverage percentages

### **Angular Test Results**
- **Karma**: Test runner for Angular
- **Jasmine**: Testing framework
- **Chrome Headless**: Browser for running tests
- **Coverage**: Generated in `angular-app/coverage/`

### **Coverage Reports**
Coverage reports show:
- **Lines**: Percentage of code lines executed
- **Functions**: Percentage of functions called
- **Branches**: Percentage of code branches taken
- **Statements**: Percentage of statements executed

**Coverage Locations:**
- Jest coverage: `coverage/`
- Angular coverage: `angular-app/coverage/`

## 🔍 Debugging Failed Tests

### **TypeScript Compilation Issues**
```bash
# Check main extension compilation
npm run compile

# Check Angular compilation
cd angular-app && npx tsc --noEmit

# Test TypeScript configuration
./test-typescript-fix.sh
```

### **Jest Tests**
```bash
# Run specific test file
npm run test -- src/commands/__tests__/specific-test.test.ts

# Run with verbose output
npm run test -- --verbose

# Run with debugging info
npm run test -- --detectOpenHandles

# Run single test by pattern
npm run test -- --testNamePattern="specific test name"
```

### **Angular Tests**
```bash
# Run Angular tests in watch mode
cd angular-app && npm run test

# Run specific test file
cd angular-app && npm run test -- --include="**/specific.spec.ts"

# Run with no cache
cd angular-app && npm run test -- --no-cache
```

### **Common Debug Commands**
```bash
# Check TypeScript compilation
npm run compile

# Run linting
npm run lint

# Increase test timeout
npm run test -- --testTimeout=30000

# Run with limited workers (if memory issues)
npm run test -- --maxWorkers=2
```

## 🛠️ Test Setup and Configuration

### **Prerequisites**
Before running tests, ensure:
1. Dependencies are installed: `npm install`
2. Angular dependencies: `cd angular-app && npm install`
3. TypeScript compiles: `npm run compile`
4. Linting passes: `npm run lint`

### **Quick Health Check**
Use the provided script to verify your setup:
```bash
chmod +x quick-test-check.sh
./quick-test-check.sh
```

### **Test Configuration Files**
- `jest.config.js` - Jest configuration (main extension)
- `angular-app/karma.conf.js` - Angular test configuration
- `tsconfig.json` - Main extension TypeScript configuration
- `angular-app/tsconfig.json` - Angular app TypeScript configuration
- `.eslintrc.js` - ESLint configuration

## 📈 Project Structure

### **TypeScript Configuration Structure**
```
vscode/
├── tsconfig.json              # Main extension config (src/ → out/)
├── src/                       # Main extension source
│   ├── commands/
│   ├── services/
│   └── utils/
├── angular-app/
│   ├── tsconfig.json          # Angular app config
│   └── src/                   # Angular app source
└── out/                       # Compiled output
    ├── extension.js           # Main extension
    └── webview/               # Angular app build
```

### **Jest Tests (Main Extension)**
```
src/
├── commands/__tests__/          # Command functionality tests
├── services/
│   ├── nx/__tests__/           # NX service tests
│   ├── git/__tests__/          # Git service tests
│   ├── flipper/__tests__/      # Flipper service tests
│   └── ai-insights/__tests__/  # AI insights tests
├── utils/__tests__/            # Utility function tests
└── webview/__tests__/          # Webview tests
```

### **Angular Tests**
```
angular-app/src/
├── app/
│   ├── components/
│   │   └── **/*.spec.ts        # Component tests
│   └── services/
│       └── **/*.spec.ts        # Service tests
```

## ⚡ Performance Tips

1. **Use watch mode** during development:
   ```bash
   npm run test:watch
   ```

2. **Run specific tests** instead of full suite:
   ```bash
   npm run test:commands  # Only command tests
   ```

3. **Skip coverage** for faster runs:
   ```bash
   npm run test -- --coverage=false
   ```

4. **Parallel execution** is already configured in Jest

5. **Use test patterns** to run related tests:
   ```bash
   npm run test -- --testPathPattern=commands
   ```

## 🚨 Common Issues & Solutions

### **TypeScript Compilation Errors**
```bash
# Error: Files not under rootDir
# Solution: Check tsconfig.json separation
npm run compile                    # Should only compile src/
cd angular-app && npx tsc --noEmit # Should only check angular-app/

# If still failing:
./test-typescript-fix.sh
```

### **Tests Timeout**
```bash
# Increase timeout globally
npm run test -- --testTimeout=30000

# Or in specific test file:
jest.setTimeout(30000);
```

### **Memory Issues**
```bash
# Reduce parallel workers
npm run test -- --maxWorkers=2

# Or increase Node memory
NODE_OPTIONS="--max-old-space-size=4096" npm run test
```

### **Angular Tests Fail**
```bash
# Clear Angular cache
cd angular-app && npm run test -- --no-cache

# Reinstall dependencies
cd angular-app && rm -rf node_modules && npm install
```

### **VSCode API Mocking Issues**
- Check that `@types/vscode` is installed
- Verify mock configurations in test files
- Ensure VSCode API mocks are properly set up

### **File Path Issues**
- Use absolute paths in test configurations
- Check that test files are in correct directories
- Verify file naming conventions (*.test.ts, *.spec.ts)

## 📋 Test Checklist

Before considering tests complete:

- [ ] TypeScript compilation successful (main extension)
- [ ] Angular TypeScript compilation successful
- [ ] All Jest tests pass
- [ ] All Angular tests pass
- [ ] Coverage reports are generated
- [ ] No linting errors
- [ ] Integration tests pass
- [ ] Service tests pass
- [ ] No memory leaks or open handles

## 🎯 Best Practices

1. **Test Naming**: Use descriptive test names
2. **Test Structure**: Follow Arrange-Act-Assert pattern
3. **Mocking**: Mock external dependencies properly
4. **Coverage**: Aim for >80% coverage
5. **Performance**: Keep tests fast and focused
6. **Isolation**: Tests should be independent
7. **Documentation**: Document complex test scenarios
8. **TypeScript**: Keep main extension and Angular app configurations separate

## 🔄 Continuous Integration

For CI/CD pipelines:
```bash
# Full test suite for CI
npm run pretest && npm run test:all

# With coverage reporting
npm run test:coverage && npm run test:angular:coverage

# Complete build verification
npm run vscode:prepublish
```

## 📞 Getting Help

If tests are failing:
1. Run `./quick-test-check.sh` to verify setup
2. Run `./test-typescript-fix.sh` to verify TypeScript configuration
3. Check the specific error messages
4. Review the debugging section above
5. Ensure all dependencies are properly installed
6. Check that the corrupted files were properly fixed
7. Verify TypeScript configuration separation is working

---

**Happy Testing! 🧪**

Run `npm run test:all` to get started with the complete test suite.
