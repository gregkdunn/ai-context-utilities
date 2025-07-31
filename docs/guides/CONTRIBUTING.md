# Contributing to AI Debug Context V3.4.0

Welcome to the AI Debug Context V3 project! This guide will help you get started with contributing to this VS Code extension that transforms testing workflows from minutes to seconds.

## 🚀 Quick Start (< 5 minutes)

### Prerequisites
- **Node.js** 18+ and **npm** 
- **VS Code** 1.80+  
- **Git** for version control
- Basic **TypeScript** knowledge

### Setup
```bash
# 1. Clone and install
git clone <repository-url>
cd ai-debug-context
npm install

# 2. Open in VS Code
code .

# 3. Start development
# Press F5 or use "Run Extension" from Debug panel
# This opens a new VS Code window with your extension loaded

# 4. Verify setup
npm test
```

That's it! You're ready to contribute.

## 🏗️ Architecture Overview

### Core Philosophy
**Service-Oriented Architecture with Dependency Injection**

The extension is built around a central `ServiceContainer` that manages all dependencies and provides clean separation of concerns.

### Directory Structure
```
src/
├── core/                   # Dependency injection & configuration
│   ├── ServiceContainer.ts # Central DI container
│   └── ConfigurationManager.ts
├── services/               # Business logic services  
│   ├── TestExecutionService.ts
│   ├── TestMenuOrchestrator.ts
│   └── ProjectSelectionService.ts
├── utils/                  # Framework detection & utilities
│   ├── SmartFrameworkDetector.ts
│   ├── TestResultCache.ts
│   └── UserFriendlyErrorHandler.ts
├── modules/                # Phase 2.0+ modular features
│   ├── gitDiff/
│   ├── testOutput/
│   └── aiContext/
├── ai/                     # Copilot integration & test analysis
└── __tests__/              # Comprehensive test suite
```

### Key Design Patterns

#### 1. Service Container Pattern
```typescript
// All services are registered in ServiceContainer
export class ServiceContainer {
    constructor(config: ServiceConfiguration) {
        this.configManager = new ConfigurationManager(config.workspaceRoot);
        this.testExecution = new TestExecutionService(this);
        this.projectSelection = new ProjectSelectionService(this);
    }
}
```

#### 2. Clean Service Dependencies
```typescript
// Services receive ServiceContainer, not individual dependencies
export class TestExecutionService {
    constructor(private services: ServiceContainer) {
        // Access any service through this.services
    }
}
```

#### 3. User-Friendly Error Handling
```typescript
// Transform technical errors into actionable messages
const friendlyError = UserFriendlyErrorHandler.transformError(error);
await UserFriendlyErrorHandler.showError(error, 'Test execution');
```

## 🧪 Testing Strategy

### Test Categories
1. **Unit Tests** - Individual service testing
2. **Integration Tests** - Service interaction testing  
3. **E2E Tests** - Complete user workflow testing

### Running Tests
```bash
# All tests
npm test

# Specific test file
npm test -- TestExecutionService

# Watch mode
npm test -- --watch

# Coverage report
npm test -- --coverage
```

### Writing Tests
```typescript
// Follow existing patterns in __tests__/
describe('ServiceName', () => {
    let service: ServiceName;
    let mockServices: MockedServiceContainer;

    beforeEach(() => {
        mockServices = createMockServices();
        service = new ServiceName(mockServices);
    });

    test('should handle expected behavior', async () => {
        // Arrange
        mockServices.someService.someMethod.mockResolvedValue(expectedValue);
        
        // Act
        const result = await service.performAction();
        
        // Assert
        expect(result).toEqual(expectedResult);
        expect(mockServices.someService.someMethod).toHaveBeenCalledWith(expectedArgs);
    });
});
```

## 🔄 Development Workflow

### Adding New Features

#### 1. Plan Your Feature
- Create an issue describing the feature
- Consider how it fits into the service architecture
- Identify which services need to be modified/created

#### 2. Implement the Service
```typescript
// Create new service following the pattern
export class NewFeatureService {
    constructor(private services: ServiceContainer) {}
    
    async performFeature(): Promise<FeatureResult> {
        // Implementation
    }
}
```

#### 3. Register in ServiceContainer
```typescript
// Add to ServiceContainer constructor
this.newFeature = new NewFeatureService(this);

// Add getter
get newFeature(): NewFeatureService {
    return this._newFeature;
}
```

#### 4. Add Comprehensive Tests
```typescript
// Create __tests__/NewFeatureService.test.ts
// Include unit, integration, and error scenarios
```

#### 5. Update Documentation
- Add to this CONTRIBUTING.md if architectural
- Update README.md if user-facing
- Document any new configuration options

### Code Style Guidelines

#### TypeScript Best Practices
```typescript
// ✅ Good - Explicit types and error handling
async getUserProjects(userId: string): Promise<Project[]> {
    try {
        const projects = await this.services.projectDiscovery.getProjectsByUser(userId);
        return projects.filter(p => p.isActive);
    } catch (error) {
        throw UserFriendlyErrorHandler.withContext(error, 'Get user projects', { userId });
    }
}

// ❌ Bad - No types, poor error handling
async getUserProjects(userId) {
    const projects = await this.services.projectDiscovery.getProjectsByUser(userId);
    return projects.filter(p => p.isActive);
}
```

#### Service Integration Patterns
```typescript
// ✅ Good - Use services through ServiceContainer
export class MyService {
    constructor(private services: ServiceContainer) {}
    
    async doWork(): Promise<void> {
        const config = await this.services.configManager.getTestConfig();
        const projects = await this.services.projectDiscovery.getAllProjects();
        // Work with them
    }
}

// ❌ Bad - Direct service instantiation
export class MyService {
    private configManager = new ConfigurationManager();
    private projectDiscovery = new ProjectDiscovery();
    // Hard to test, tight coupling
}
```

#### Error Handling Patterns
```typescript
// ✅ Good - User-friendly errors with context
try {
    await this.executeTests(project);
} catch (error) {
    await UserFriendlyErrorHandler.showError(error, `Testing ${project}`);
    this.services.outputChannel.appendLine(
        UserFriendlyErrorHandler.formatForLogging(error, 'executeTests')
    );
}

// ❌ Bad - Technical error exposed to user
try {
    await this.executeTests(project);
} catch (error) {
    vscode.window.showErrorMessage(error.message); // Technical error
}
```

## 🐛 Debugging Guide

### VS Code Extension Debugging
1. **F5** starts Extension Development Host
2. **Ctrl+Shift+I** opens DevTools in Extension Host  
3. **Console logs** appear in original VS Code Debug Console
4. **Breakpoints** work in TypeScript files

### Common Issues

#### "Command not found" errors
```typescript
// Ensure commands are registered in package.json AND extension.ts
// package.json
"contributes": {
    "commands": [
        {
            "command": "aiDebugContext.newCommand",
            "title": "New Command"
        }
    ]
}

// extension.ts  
const disposable = vscode.commands.registerCommand('aiDebugContext.newCommand', () => {
    // Implementation
});
context.subscriptions.push(disposable);
```

#### Service injection issues
```typescript  
// Always use ServiceContainer for dependencies
export class MyService {
    constructor(private services: ServiceContainer) {
        // ✅ Access services through container
        this.configManager = services.configManager;
    }
}
```

### Performance Debugging
```typescript
// Use built-in performance tracking
await this.services.performanceTracker.trackCommand('operationName', async () => {
    // Your operation
});

// Check cache statistics
const stats = this.services.testExecution.getCacheStats();
```

## 📋 Pull Request Process

### Before Submitting
- [ ] All tests pass (`npm test`)
- [ ] Code follows style guidelines
- [ ] New features have comprehensive tests
- [ ] Documentation updated if needed
- [ ] Performance impact considered

### PR Description Template
```markdown
## Summary
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature  
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests pass
- [ ] Manually tested in VS Code

## Performance Impact
- [ ] No performance impact
- [ ] Improves performance
- [ ] Potential performance impact (explain)
```

### Review Process
1. **Automated Checks** - Tests and linting must pass
2. **Code Review** - Focus on architecture, patterns, user experience
3. **Manual Testing** - Verify in actual VS Code environment
4. **Documentation Review** - Ensure docs stay current

## 🎯 Focus Areas for Contributors

### High-Impact Areas
1. **Framework Support** - Add new test frameworks (Vitest, Playwright, etc.)
2. **User Experience** - Improve error messages and workflows
3. **Performance** - Optimize test discovery and execution
4. **Documentation** - Help other developers contribute

### Framework Integration Example
```typescript
// Add new framework to SmartFrameworkDetector
export class SmartFrameworkDetector {
    private static readonly FRAMEWORK_DETECTORS = {
        'playwright': {
            files: ['playwright.config.ts', 'playwright.config.js'],
            testCommand: 'npx playwright test',
            testPattern: '**/*.spec.ts'
        },
        // Add your framework here
    };
}
```

## 🚨 Common Pitfalls to Avoid

### 1. Breaking Service Container Pattern
```typescript
// ❌ Don't instantiate services directly
const configManager = new ConfigurationManager();

// ✅ Use dependency injection
constructor(private services: ServiceContainer) {
    const config = this.services.configManager;
}
```

### 2. Poor Error Handling
```typescript
// ❌ Don't show technical errors to users
catch (error) {
    vscode.window.showErrorMessage(error.stack);
}

// ✅ Use user-friendly error handler
catch (error) {
    await UserFriendlyErrorHandler.showError(error, 'Operation context');
}
```

### 3. Missing Tests
```typescript
// ❌ Don't ship untested code
export class NewService {
    async doSomething() {
        // Complex logic without tests
    }
}

// ✅ Write tests first or alongside
describe('NewService', () => {
    test('should handle expected scenarios', () => {
        // Test implementation
    });
});
```

### 4. Ignoring Performance
```typescript
// ❌ Don't block the UI thread
for (const project of manyProjects) {
    await this.processProject(project); // Blocks UI
}

// ✅ Use progress indicators and make operations cancellable
await vscode.window.withProgress({
    location: vscode.ProgressLocation.Notification,
    title: 'Processing projects',
    cancellable: true
}, async (progress, token) => {
    // Process with progress reporting and cancellation support
});
```

## 📞 Getting Help

### Questions & Discussion
- **GitHub Issues** - Bug reports and feature requests
- **Code Review** - Tag maintainers in PRs for guidance

### Documentation
- **README.md** - User-facing documentation
- **ARCHITECTURE.md** - Technical architecture details
- **PHASE_2.0.1_IMPROVEMENTS.md** - Recent improvements and roadmap

## 🎉 Recognition

Contributors are recognized in:
- **README.md** contributors section
- **CHANGELOG.md** for significant contributions
- **GitHub Releases** notes

Thank you for contributing to AI Debug Context V3! Your efforts help developers worldwide save time and focus on what matters most - building great software.

---

## Quick Reference Commands

```bash
# Development
npm install          # Install dependencies
npm test            # Run all tests
npm run compile     # Compile TypeScript
npx vsce package    # Package extension

# Debugging  
F5                  # Start Extension Development Host
Ctrl+Shift+I        # Open DevTools
Ctrl+Shift+P        # Command Palette (test commands)

# Git workflow
git checkout -b feature/my-feature
git add .
git commit -m "feat: add my feature"
git push origin feature/my-feature
# Create PR on GitHub
```