# AI Debug Context - Development Guide

## Table of Contents
1. [Development Setup](#development-setup)
2. [Project Structure](#project-structure)
3. [Development Workflow](#development-workflow)
4. [Architecture Overview](#architecture-overview)
5. [Adding New Features](#adding-new-features)
6. [Testing](#testing)
7. [Debugging](#debugging)
8. [Building and Packaging](#building-and-packaging)
9. [Contributing Guidelines](#contributing-guidelines)
10. [Code Style and Standards](#code-style-and-standards)

## Development Setup

### Prerequisites
- Node.js 18.x or higher
- npm 9.x or higher
- VS Code 1.74.0 or higher
- Git
- Angular CLI (for webview development)

### Initial Setup

1. **Clone the repository**
```bash
git clone https://github.com/gregkdunn/ai_debug_context.git
cd ai_debug_context/vscode_v2
```

2. **Install dependencies**
```bash
# This installs dependencies for both extension and webview
npm run setup
```

3. **Open in VS Code**
```bash
code .
```

### Development Dependencies
The project uses:
- TypeScript 5.0+
- Angular 18
- Jest for testing
- ESLint for linting
- Prettier for formatting

## Project Structure

### Extension Structure (`src/`)
```
src/
├── extension.ts              # Main extension entry point
├── services/                 # Core business logic
│   ├── CopilotIntegration.ts    # GitHub Copilot integration
│   ├── GitIntegration.ts         # Git operations
│   ├── NXWorkspaceManager.ts     # NX workspace management
│   ├── TestRunner.ts             # Test execution
│   └── copilot-submission/       # Copilot context submission
├── webview/                  # Webview provider
│   └── AIDebugWebviewProvider.ts # Main webview provider
├── types/                    # TypeScript type definitions
└── __tests__/               # Unit tests
```

### Webview UI Structure (`webview-ui/`)
```
webview-ui/src/app/
├── modules/                  # Feature modules
│   ├── ai-debug/            # AI debugging interface
│   ├── git-diff/            # Git diff viewer
│   ├── test-selection/      # Test selector
│   ├── pr-generator/        # PR description generator
│   ├── file-selection/      # File selector
│   └── analysis-dashboard/  # Analysis dashboard
├── components/              # Shared components
├── services/               # Angular services
└── styles/                 # Global styles
```

## Development Workflow

### 1. Running in Development Mode

**Terminal 1 - Extension Development:**
```bash
# Watch extension TypeScript files
npm run watch
```

**Terminal 2 - Webview Development:**
```bash
# Run Angular dev server
npm run dev:webview
```

**Terminal 3 - Launch Extension:**
1. Press `F5` in VS Code to launch a new Extension Development Host
2. The extension will be available in the new window

### 2. Making Changes

#### Extension Changes (TypeScript)
1. Edit files in `src/`
2. Changes are automatically compiled by the watcher
3. Reload the Extension Development Host (`Ctrl+R` / `Cmd+R`)

#### Webview Changes (Angular)
1. Edit files in `webview-ui/`
2. Angular dev server auto-reloads
3. Refresh the webview panel in VS Code

### 3. Hot Reload Tips
- Extension code requires manual reload of the host
- Webview code hot-reloads automatically
- Use VS Code's Developer Tools (`Help > Toggle Developer Tools`) for debugging

## Architecture Overview

### Extension Architecture

The extension follows a service-oriented architecture:

```
┌─────────────────┐
│   Extension.ts  │  ← Entry point, registers commands
└────────┬────────┘
         │
┌────────▼────────┐
│ WebviewProvider │  ← Manages webview lifecycle
└────────┬────────┘
         │
┌────────▼────────┐
│    Services     │  ← Business logic layer
├─────────────────┤
│ • Copilot       │
│ • Git           │
│ • NX Workspace  │
│ • Test Runner   │
└─────────────────┘
```

### Communication Flow

```
VS Code API ←→ Extension ←→ Webview (Angular) ←→ User
                  ↓
              Services
                  ↓
          External Tools
         (Git, NX, etc.)
```

### Message Protocol
Communication between extension and webview uses VS Code's message passing:

```typescript
// From Extension to Webview
webview.postMessage({
  type: 'command',
  command: 'updateStatus',
  data: { status: 'ready' }
});

// From Webview to Extension
vscode.postMessage({
  type: 'request',
  command: 'runTests',
  data: { projects: ['app1', 'app2'] }
});
```

## Adding New Features

### 1. Adding a New Module

1. **Create module structure:**
```bash
# In webview-ui/src/app/modules/
mkdir new-feature
cd new-feature
ng generate module new-feature
ng generate component new-feature
```

2. **Add routing:**
```typescript
// In app-routing.module.ts
{
  path: 'new-feature',
  loadChildren: () => import('./modules/new-feature/new-feature.module')
    .then(m => m.NewFeatureModule)
}
```

3. **Create service in extension:**
```typescript
// src/services/NewFeatureService.ts
export class NewFeatureService {
  // Implementation
}
```

### 2. Adding a New Command

1. **Define command in package.json:**
```json
{
  "contributes": {
    "commands": [{
      "command": "aiDebugContext.newCommand",
      "title": "AI Debug Context: New Command"
    }]
  }
}
```

2. **Register in extension.ts:**
```typescript
context.subscriptions.push(
  vscode.commands.registerCommand(
    'aiDebugContext.newCommand',
    () => handleNewCommand()
  )
);
```

### 3. Adding a New Service

1. **Create service file:**
```typescript
// src/services/MyNewService.ts
export class MyNewService {
  constructor(private context: vscode.ExtensionContext) {}
  
  async doSomething(): Promise<void> {
    // Implementation
  }
}
```

2. **Add tests:**
```typescript
// src/__tests__/services/MyNewService.test.ts
describe('MyNewService', () => {
  // Tests
});
```

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run extension tests only
npm run test:extension

# Run webview tests only
npm run test:webview

# Run with coverage
npm run test:coverage
```

### Writing Tests

#### Extension Tests
```typescript
// src/__tests__/example.test.ts
import { MyService } from '../services/MyService';

describe('MyService', () => {
  let service: MyService;
  
  beforeEach(() => {
    service = new MyService();
  });
  
  it('should do something', async () => {
    const result = await service.doSomething();
    expect(result).toBe(expected);
  });
});
```

#### Webview Tests
```typescript
// webview-ui/src/app/example.spec.ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MyComponent } from './my.component';

describe('MyComponent', () => {
  let component: MyComponent;
  let fixture: ComponentFixture<MyComponent>;
  
  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [MyComponent]
    });
    fixture = TestBed.createComponent(MyComponent);
    component = fixture.componentInstance;
  });
  
  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
```

### Integration Testing

Use the integration test checklist:
```bash
# Run through all test scenarios
cat integration_test_checklist.md

# Test with the debug script
node debug-test.js
```

## Debugging

### Extension Debugging

1. **Set breakpoints** in VS Code
2. **Press F5** to start debugging
3. **Use Debug Console** for inspection

### Webview Debugging

1. **Open Developer Tools** in the Extension Development Host
2. **Use Chrome DevTools** features
3. **Check Console** for errors

### Common Debugging Commands

```typescript
// Log to Extension output channel
const outputChannel = vscode.window.createOutputChannel('AI Debug Context');
outputChannel.appendLine('Debug message');

// Log to Webview console
console.log('Webview debug message');

// Show information message
vscode.window.showInformationMessage('Debug info');
```

## Building and Packaging

### Development Build
```bash
# Build extension
npm run compile

# Build webview
npm run build:webview

# Build everything
npm run build
```

### Production Build
```bash
# Create production build
npm run build:prod

# Package extension
npm run package

# Output: ai-debug-context-{version}.vsix
```

### Publishing
```bash
# Login to VS Code Marketplace
vsce login <publisher>

# Publish
vsce publish
```

## Contributing Guidelines

### Code Style

Follow the established patterns:
- Use TypeScript strict mode
- Follow Angular style guide for webview
- Use async/await over promises
- Implement proper error handling

### Commit Messages

Follow conventional commits:
```
feat: add new file selection feature
fix: resolve test runner memory leak
docs: update API documentation
refactor: simplify service architecture
test: add integration tests for diff module
```

### Pull Request Process

1. **Create feature branch**
```bash
git checkout -b feature/my-feature
```

2. **Make changes and test**
3. **Update documentation**
4. **Submit PR with:**
   - Clear description
   - Link to related issues
   - Test results
   - Screenshots (if UI changes)

### Code Review Checklist
- [ ] Tests pass
- [ ] Documentation updated
- [ ] No console.log statements
- [ ] Error handling implemented
- [ ] TypeScript types properly defined
- [ ] Follows established patterns

## Code Style and Standards

### TypeScript Guidelines
```typescript
// Use interfaces for data structures
interface TestResult {
  passed: boolean;
  message: string;
  duration: number;
}

// Use classes for services
export class TestRunner {
  constructor(private workspace: NXWorkspaceManager) {}
  
  async runTests(projects: string[]): Promise<TestResult[]> {
    // Implementation
  }
}

// Use enums for constants
enum ModuleType {
  DIFF = 'diff',
  TEST = 'test',
  AI_DEBUG = 'ai-debug',
  PR_DESC = 'pr-desc'
}
```

### Angular Guidelines
```typescript
// Use standalone components (Angular 14+)
@Component({
  selector: 'app-example',
  standalone: true,
  imports: [CommonModule],
  template: ``
})
export class ExampleComponent {}

// Use signals for state management
count = signal(0);
doubleCount = computed(() => this.count() * 2);

// Use OnPush change detection
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush
})
```

### CSS/Styling Guidelines
Follow the Terminal Style Guide:
- Use Tailwind CSS utilities
- Follow the terminal theme color palette
- Maintain consistent spacing and typography

```css
/* Example terminal-style component */
.terminal-window {
  @apply bg-gray-900 text-green-400 font-mono p-4 rounded-lg;
  box-shadow: 0 0 20px rgba(0, 255, 0, 0.1);
}
```

---

For more information, see:
- [User Guide](USER_GUIDE.md)
- [Module Documentation](MODULES.md)
- [API Reference](SERVICES.md)