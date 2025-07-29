# Development Guide - AI Debug Context V3

## 🚀 Quick Start

### One-Command Setup
```bash
./scripts/dev-setup.sh
```

This will:
- ✅ Check prerequisites (Node.js 18+)
- 📦 Install dependencies
- 🔨 Compile TypeScript
- 🧪 Run tests
- 🏗️ Create test workspace
- 🔧 Generate VS Code configurations

### Manual Setup
```bash
npm install
npm run compile
npm test
```

## 🏗️ Architecture Overview

### Phase 1.9.1 Refactored Architecture

```
src/
├── core/                          # Core services
│   ├── ServiceContainer.ts        # Dependency injection
│   ├── ConfigurationManager.ts    # YAML config & framework detection
│   └── RefactoredCommandRegistry.ts # Lightweight command registry
├── services/                      # Business logic services
│   ├── TestExecutionService.ts    # Test execution with streaming
│   ├── ProjectSelectionService.ts # Project discovery & UI
│   ├── TestMenuOrchestrator.ts    # Coordinates services
│   └── PostTestActionService.ts   # Post-test actions & integrations
├── utils/                         # Utilities & performance
│   ├── SmartFrameworkDetector.ts  # Universal framework detection
│   ├── BackgroundProjectDiscovery.ts # Background discovery
│   ├── PerformanceMonitor.ts      # Performance tracking
│   └── ProjectCache.ts            # Smart caching
└── __tests__/                     # Comprehensive test suite
    ├── unit/                      # Unit tests
    ├── integration/               # Integration tests
    └── fixtures/                  # Test data
```

### Key Improvements
- **🏗️ Service Architecture**: Clean separation of concerns
- **🎯 Framework Detection**: Supports Angular, React, Vue, Next.js, Vite
- **⚡ Performance**: Background discovery, smart caching, monitoring
- **🧪 Test Coverage**: 85%+ target with comprehensive fixtures
- **👨‍💻 Developer Experience**: One-command setup, debugging tools

## 🧪 Testing

### Run All Tests
```bash
npm test
```

### Run Specific Tests
```bash
# Framework detection tests
npm test -- --testPathPattern="SmartFrameworkDetector"

# Configuration tests  
npm test -- --testPathPattern="ConfigurationManager"

# Quick test subset
./scripts/quick-test.sh
```

### Test Structure
```
src/__tests__/
├── unit/
│   ├── core/
│   │   ├── ConfigurationManager.test.ts
│   │   └── ServiceContainer.test.ts
│   └── utils/
│       ├── SmartFrameworkDetector.test.ts
│       └── PerformanceMonitor.test.ts
├── integration/
│   ├── FullCommandFlow.test.ts
│   └── ErrorHandling.test.ts
└── fixtures/
    └── sample-projects/
        ├── nx-monorepo/
        ├── angular-cli/
        ├── create-react-app/
        ├── vite-react/
        ├── vue-cli/
        └── nextjs/
```

## 🔧 Development Workflow

### 1. VS Code Setup
```bash
# Launch extension in debug mode
F5

# Run tests
Ctrl+Shift+P > "Tasks: Run Test Task"

# Compile TypeScript
Ctrl+Shift+B
```

### 2. Watch Mode
```bash
npm run watch
```

### 3. Performance Monitoring
```bash
./scripts/benchmark.sh
```

## 📊 Performance Guidelines

### Background Discovery
- Projects are discovered in background queues
- Smart caching with 30-minute timeout
- Memory-aware with automatic cleanup

### Performance Monitoring
```typescript
// Track operation performance
await services.performanceMonitor.trackCommand('project-discovery', async () => {
    return await services.projectDiscovery.getAllProjects();
});

// View performance report
services.performanceMonitor.displayReport();
```

### Caching Strategy
```typescript
// Smart cache with workspace structure hashing
const cache = new ProjectCache(workspaceRoot, 30); // 30 min timeout
cache.cacheProjects(projects);

// Background warming
backgroundDiscovery.queueDiscovery(workspaceRoot, 'medium');
```

## 🎯 Framework Detection

### Supported Frameworks
- **Nx** (Priority 10) - Primary framework
- **Angular CLI** (Priority 9) - Full support
- **Next.js** (Priority 8) - SSR detection
- **Vite** (Priority 7) - SPA + Vitest
- **Create React App** (Priority 6) - React apps
- **Vue CLI** (Priority 5) - Vue projects
- **Nuxt.js** (Priority 4) - Vue SSR
- **Jest** (Priority 1) - Generic test runner

### Adding New Frameworks
```typescript
class MyFrameworkDetector implements FrameworkDetector {
    readonly name = 'My Framework';
    readonly priority = 6;

    async detect(root: string): Promise<FrameworkInfo | null> {
        // Detection logic
        if (fs.existsSync(path.join(root, 'my-framework.config.js'))) {
            return {
                name: 'My Framework',
                type: 'spa',
                testCommand: 'my-framework test',
                confidence: 0.9,
                indicators: ['my-framework.config.js']
            };
        }
        return null;
    }
}
```

## 🐛 Debugging

### Extension Debugging
1. Set breakpoints in TypeScript files
2. Press F5 to launch debug instance
3. Test extension in the new VS Code window
4. Breakpoints will hit in original window

### Output Channel
```typescript
services.outputChannel.appendLine('Debug message');
services.outputChannel.show(); // Show output panel
```

### Performance Debugging
```typescript
// Enable verbose performance logging
services.performanceMonitor.recordMetric('operation', duration, success);
services.performanceMonitor.displayReport();
```

## 📝 Code Style

### Service Pattern
```typescript
export class MyService {
    constructor(private services: ServiceContainer) {}
    
    async doSomething(): Promise<Result> {
        return this.services.performanceMonitor.trackCommand('my-operation', async () => {
            // Implementation
        });
    }
}
```

### Error Handling
```typescript
try {
    await operation();
} catch (error) {
    const structuredError = this.services.errorHandler.handleError(error, { 
        command: 'operationName' 
    });
    this.services.errorHandler.showUserError(structuredError, vscode);
}
```

### Configuration Access
```typescript
// Get framework-specific test command
const command = await this.services.configManager.getSmartTestCommand(project);

// Check framework detection
const frameworks = this.services.configManager.getDetectedFrameworks();
```

## 🔄 Continuous Integration

### Pre-commit Checks
```bash
npm run compile  # TypeScript compilation
npm test         # All tests
npm run lint     # ESLint (if configured)
```

### Performance Regression Testing
```bash
./scripts/benchmark.sh
# Check output for performance regressions
```

## 📚 Documentation

### Architecture Decisions
- Service Container pattern for dependency injection
- Background discovery for performance
- Smart framework detection with confidence scoring
- Comprehensive test coverage with real fixtures

### Key Design Principles
1. **Single Responsibility**: Each service has one clear purpose
2. **Dependency Injection**: No global state, clean testing
3. **Performance First**: Background operations, smart caching
4. **Framework Agnostic**: Works with any JS/TS project
5. **Developer Experience**: One-command setup, rich debugging

## 🚀 Contributing

### Pull Request Process
1. Run `./scripts/dev-setup.sh` for setup
2. Create feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Update documentation if needed
6. Submit PR with performance impact assessment

### Performance Guidelines
- Operations >1s should show progress
- Background discovery for non-blocking UI
- Cache expensive operations
- Monitor memory usage in loops

This development guide provides everything needed to contribute effectively to AI Debug Context V3!