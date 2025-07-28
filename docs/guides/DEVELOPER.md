# AI Debug Context V3 - Developer Guide

## 🚀 Quick Start

### One-Click Setup

Choose your preferred setup method:

**Option 1: Node.js Script (Recommended)**
```bash
npm run dev:setup
```

**Option 2: Shell Script**
```bash
npm run dev:setup:shell
# or directly: ./scripts/dev-setup.sh
```

**Option 3: Manual Setup**
```bash
npm ci
npm run compile
npm test
```

## 📦 Development Commands

### Core Development
```bash
# Start development (watch mode)
npm run dev

# Compile TypeScript
npm run compile

# Clean build artifacts
npm run clean
```

### Testing
```bash
# Run all tests
npm test

# Run specific test suites
npm run test:unit
npm run test:integration

# Watch mode for tests
npm run test:watch

# Generate coverage report
npm run test:coverage
```

### Extension Development
```bash
# Package extension
npm run package

# Publish to marketplace
npm run publish

# Performance benchmarking
npm run benchmark
```

## 🏗️ Project Structure

```
ai-debug-context/
├── src/
│   ├── core/               # Service container & DI
│   │   ├── ServiceContainer.ts
│   │   ├── ConfigurationManager.ts
│   │   └── CommandRegistry.ts
│   ├── services/           # Business logic services
│   │   ├── TestMenuOrchestrator.ts
│   │   ├── TestExecutionService.ts
│   │   └── ProjectSelectionService.ts
│   ├── utils/              # Utility services
│   │   ├── PerformanceMonitor.ts
│   │   ├── BackgroundProjectDiscovery.ts
│   │   └── SmartFrameworkDetector.ts
│   └── __tests__/          # Test suites
│       ├── unit/           # Unit tests
│       └── integration/    # Integration tests
├── scripts/                # Development scripts
│   ├── dev-setup.js        # Node.js setup script
│   ├── dev-setup.sh        # Shell setup script
│   └── benchmark.js        # Performance benchmarking
└── docs/                   # Documentation
    ├── README.md           # User documentation
    ├── ARCHITECTURE.md     # Technical architecture
    └── DEVELOPER.md        # This file
```

## 🧪 Testing Strategy

### Test Organization

- **Unit Tests** (`src/__tests__/unit/`): Test individual services in isolation
- **Integration Tests** (`src/__tests__/integration/`): Test service interactions
- **Smoke Tests**: Basic functionality validation

### Running Tests

```bash
# All tests
npm test

# Specific test file
npm test -- ConfigurationManager.test.ts

# Tests matching pattern
npm test -- --testNamePattern="should handle errors"

# Coverage report
npm run test:coverage
```

### Writing Tests

Example unit test:
```typescript
describe('ServiceName', () => {
    let service: ServiceName;
    let mockDependency: jest.Mocked<DependencyType>;

    beforeEach(() => {
        mockDependency = {
            method: jest.fn()
        };
        service = new ServiceName(mockDependency);
    });

    test('should do something', () => {
        // Arrange
        const input = 'test';
        mockDependency.method.mockReturnValue('expected');

        // Act
        const result = service.doSomething(input);

        // Assert
        expect(result).toBe('expected');
        expect(mockDependency.method).toHaveBeenCalledWith(input);
    });
});
```

## 🔧 VS Code Development

### Debugging Extension

1. Open project in VS Code
2. Press `F5` to launch Extension Development Host
3. In the new window, open a workspace with `project.json` files
4. Use `Cmd+Shift+P` → "AI Debug Context: Run Tests"

### Launch Configurations

The setup script creates `.vscode/launch.json` with:

- **Run Extension**: Launch extension in debug mode
- **Extension Tests**: Run extension tests with debugging

### Debugging Tips

1. **Breakpoints**: Set breakpoints in TypeScript source files
2. **Console Logging**: Use `outputChannel.appendLine()` for extension logs
3. **Error Handling**: Check VS Code Developer Tools (`Help > Toggle Developer Tools`)
4. **Extension Host**: Reload extension host (`Cmd+R`) after code changes

## 📊 Performance Monitoring

### Using PerformanceMonitor

```typescript
// In your service
const result = await this.performanceMonitor.trackCommand(
    'operation-name',
    async () => {
        // Your operation here
        return await someAsyncOperation();
    },
    { metadata: 'for context' }
);
```

### Performance Dashboard

Access via Command Palette → "AI Debug Context: Run Tests" → "Performance Dashboard"

### Benchmarking

```bash
# Run performance benchmarks
npm run benchmark

# View performance in extension
# 1. Launch extension (F5)
# 2. Command Palette → "AI Debug Context: Run Tests" 
# 3. Select "Performance Dashboard"
```

## 🏗️ Architecture Patterns

### Service Container Pattern

All services are managed by `ServiceContainer`:

```typescript
// Service registration
const serviceContainer = await ServiceContainer.create(
    workspaceRoot,
    extensionPath,
    context
);

// Service access
const testService = new TestExecutionService(serviceContainer);
```

### Dependency Injection

```typescript
export class MyService {
    constructor(private services: ServiceContainer) {}

    async doSomething() {
        // Access other services
        const config = this.services.configManager.getTestCommand();
        await this.services.performanceMonitor.trackCommand(/*...*/);
    }
}
```

### Error Handling

```typescript
try {
    await this.doSomething();
} catch (error) {
    const errorInfo = this.services.errorHandler.handleError(error, 'operation-name');
    this.services.updateStatusBar(`❌ ${errorInfo.userMessage}`, 'red');
    throw error;
}
```

## 🔄 Development Workflow

### 1. Feature Development

```bash
# 1. Create feature branch
git checkout -b feature/my-feature

# 2. Start development
npm run dev

# 3. Run tests continuously
npm run test:watch

# 4. Test in VS Code (F5)
```

### 2. Adding New Service

1. **Create Service Class** in appropriate directory
2. **Add to ServiceContainer** initialization
3. **Write Unit Tests** in `__tests__/unit/`
4. **Add Integration Tests** if needed
5. **Update Architecture Documentation**

### 3. Adding Framework Support

1. **Update SmartFrameworkDetector**:
   ```typescript
   // Add detection patterns
   private readonly frameworks = {
       'MyFramework': {
           patterns: ['my-framework.config.js', 'package.json'],
           testCommand: 'my-framework test'
       }
   };
   ```

2. **Update ConfigurationManager**:
   ```typescript
   // Add framework-specific logic
   getTestCommand(mode: string): string {
       if (this.frameworkName === 'MyFramework') {
           return `my-framework test ${mode}`;
       }
   }
   ```

3. **Add Tests** for framework detection
4. **Update Documentation**

## 🐛 Troubleshooting

### Common Issues

**Extension not loading:**
```bash
# Check compilation errors
npm run compile

# Check extension logs
# VS Code → Output → "AI Debug Context"
```

**Tests failing:**
```bash
# Run specific test with verbose output
npm test -- --verbose TestName.test.ts

# Check Jest configuration
cat jest.config.js
```

**Performance issues:**
```bash
# Check performance metrics
npm run benchmark

# Enable verbose logging
# In extension: Command Palette → "AI Debug Context" → Performance Dashboard
```

### Debug Logging

Enable verbose logging in VS Code:
1. Command Palette → "Preferences: Open Settings (JSON)"
2. Add: `"aiDebugContext.enableVerboseLogging": true`
3. Reload extension

### Memory Issues

```bash
# Check memory usage
npm run benchmark

# Monitor in extension
# Performance Dashboard shows memory snapshots
```

## 📝 Contributing

### Code Style

- **TypeScript**: Strict mode enabled
- **Formatting**: Use VS Code auto-formatting
- **Naming**: PascalCase for classes, camelCase for methods
- **Comments**: JSDoc for public APIs

### Pull Request Process

1. **Feature Branch**: Create from `main`
2. **Tests**: Ensure all tests pass
3. **Coverage**: Maintain or improve test coverage
4. **Documentation**: Update relevant docs
5. **Performance**: Check no performance regressions

### Release Process

1. **Version Bump**: Update version in `package.json`
2. **Changelog**: Update with new features
3. **Package**: `npm run package`
4. **Test**: Manual testing in VS Code
5. **Publish**: `npm run publish`

## 📖 Resources

- **VS Code Extension API**: https://code.visualstudio.com/api
- **Jest Testing**: https://jestjs.io/docs/getting-started
- **TypeScript**: https://www.typescriptlang.org/docs/

---

*Happy coding! 🎯*