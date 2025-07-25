# AI Debug Context - Components Documentation

## Overview

The AI Debug Context extension utilizes a component-based architecture built with Angular 18. Components follow a consistent terminal-themed design pattern with reactive state management using Angular signals. This document provides comprehensive documentation for all UI components in the system.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Main Application Component](#main-application-component)
3. [Shared Components](#shared-components)
4. [Module-Specific Components](#module-specific-components)
5. [Component Patterns](#component-patterns)
6. [Styling Guidelines](#styling-guidelines)
7. [State Management](#state-management)
8. [Integration Guidelines](#integration-guidelines)

## Architecture Overview

### Component Hierarchy

```
AppComponent (Root)
├── Shared Components
│   └── CopilotDiagnosticsComponent
├── Feature Module Components
│   ├── AIDebugComponent
│   ├── FileSelectorComponent
│   ├── TestSelectorComponent
│   ├── GitDiffComponent
│   ├── PRGeneratorComponent
│   ├── PrepareToPushComponent
│   └── AnalysisDashboardComponent
└── Service Layer
    └── VscodeService
```

### Design Principles

1. **Standalone Components**: All components use Angular 14+ standalone architecture
2. **Signal-Based State**: Reactive state management using Angular signals
3. **Terminal Theme**: Consistent command-line interface aesthetic
4. **Type Safety**: Comprehensive TypeScript interfaces
5. **OnPush Change Detection**: Optimized performance strategy

## Main Application Component

### AppComponent

**Location**: `webview-ui/src/app/app.component.ts`

**Purpose**: Root component that orchestrates the entire extension UI, managing module navigation and workflow coordination.

#### Key Features
- Module routing and navigation
- Global state management
- Workflow orchestration
- Terminal-style UI shell

#### Component Structure

```typescript
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, /* Feature Components */],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<!-- Terminal-style template -->`
})
export class AppComponent implements OnInit, OnDestroy {
  // State Management
  activeModule = signal<string>('overview');
  fileSelection = signal<FileSelection | null>(null);
  testConfiguration = signal<TestConfiguration | null>(null);
  workflowState = signal<WorkflowState>({ step: 'idle' });
  
  // Module Status Tracking
  isModuleReady = computed(() => /* validation logic */);
  
  // Navigation Methods
  showModule(module: string): void
  showOverview(): void
  
  // Workflow Management
  async startWorkflow(): Promise<void>
  handleWorkflowComplete(data: any): void
}
```

#### Data Flow
```
User Action → AppComponent → Module Component → VscodeService → Extension Backend
                    ↑                                    ↓
                    └────────── State Updates ←─────────┘
```

## Shared Components

### CopilotDiagnosticsComponent

**Location**: `webview-ui/src/app/components/copilot-diagnostics/copilot-diagnostics.component.ts`

**Purpose**: Comprehensive diagnostics display for GitHub Copilot integration with real-time health monitoring.

#### Key Features
- System health visualization
- Real-time diagnostic checks
- Automated remediation actions
- Debug information display
- Quick action buttons

#### Component API

```typescript
@Component({
  selector: 'app-copilot-diagnostics',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CopilotDiagnosticsComponent implements OnInit {
  // State
  diagnostics = signal<CopilotDiagnostics | null>(null);
  isRunning = signal<boolean>(false);
  availableCommands = signal<string[]>([]);
  
  // Methods
  runDiagnostics(): void
  executeAction(action: string): void
  
  // UI Helpers
  getOverallStatusClass(): string
  getCheckStatusClass(status: string): string
  getCheckIcon(status: string): string
}
```

#### Visual States
- **Healthy**: Green indicators, all checks passed
- **Warning**: Yellow indicators, some issues detected
- **Error**: Red indicators, critical problems found
- **Checking**: Blue indicators with loading animation

## Module-Specific Components

### AIDebugComponent

**Location**: `webview-ui/src/app/modules/ai-debug/ai-debug.component.ts`

**Purpose**: Orchestrates the complete AI-powered debugging workflow with multi-phase execution.

#### Key Features
- Multi-phase workflow management
- Real-time progress tracking
- File artifact generation
- Copilot integration with fallback
- Terminal-style output display

#### Component API

```typescript
@Component({
  selector: 'app-ai-debug',
  standalone: true,
  imports: [CommonModule, FormsModule, CopilotDiagnosticsComponent]
})
export class AIDebugComponent implements OnInit {
  // Inputs/Outputs
  @Input() fileSelection: FileSelection | null = null;
  @Input() testConfiguration: TestConfiguration | null = null;
  @Output() workflowComplete = new EventEmitter<any>();
  
  // State
  workflowState = signal<DebugWorkflowState>({
    phase: 'idle',
    progress: 0,
    message: ''
  });
  
  // Workflow Control
  async startDebugWorkflow(): Promise<void>
  cancelWorkflow(): void
  
  // Phase Management
  private collectContext(): Promise<void>
  private runTests(): Promise<void>
  private analyzeResults(): Promise<void>
  private generateReport(): Promise<void>
}
```

### FileSelectorComponent

**Location**: `webview-ui/src/app/modules/file-selection/file-selector.component.ts`

**Purpose**: Advanced file selection interface with Git integration for context gathering.

#### Key Features
- Multi-mode file selection (uncommitted, commits, branch)
- Interactive commit timeline
- Real-time diff preview
- Search and filtering
- Batch operations

#### Component API

```typescript
@Component({
  selector: 'app-file-selector',
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class FileSelectorComponent implements OnInit {
  // Outputs
  @Output() selectionComplete = new EventEmitter<FileSelection>();
  
  // State
  mode = signal<SelectionMode>('uncommitted');
  files = signal<FileInfo[]>([]);
  commits = signal<GitCommit[]>([]);
  selectedFiles = signal<Set<string>>(new Set());
  
  // File Operations
  selectFiles(files: string[]): void
  toggleFileSelection(file: string): void
  
  // Mode Management
  switchMode(mode: SelectionMode): void
  
  // Git Operations
  loadCommitHistory(): Promise<void>
  generateDiff(): Promise<void>
}
```

### TestSelectorComponent

**Location**: `webview-ui/src/app/modules/test-selection/test-selector.component.ts`

**Purpose**: NX workspace project selection and test configuration interface.

#### Key Features
- Project discovery and categorization
- Multi-project selection support
- Affected project detection
- Real-time loading states
- Smart caching

#### Component API

```typescript
@Component({
  selector: 'app-test-selector',
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class TestSelectorComponent implements OnInit {
  // Outputs
  @Output() configurationComplete = new EventEmitter<TestConfiguration>();
  
  // State
  projects = signal<ProjectInfo[]>([]);
  selectedProjects = signal<Set<string>>(new Set());
  testMode = signal<TestMode>('single');
  isLoading = signal<boolean>(false);
  
  // Project Management
  loadProjects(): Promise<void>
  selectProject(project: string): void
  runAffectedDetection(): Promise<void>
  
  // Configuration
  getConfiguration(): TestConfiguration
}
```

### GitDiffComponent

**Location**: `webview-ui/src/app/modules/git-diff/git-diff.component.ts`

**Purpose**: Git diff visualization with streaming output and file management.

#### Key Features
- Real-time diff streaming
- Syntax highlighting
- File operations (open, delete)
- Progress tracking
- Export capabilities

#### Component API

```typescript
@Component({
  selector: 'app-git-diff',
  standalone: true,
  imports: [CommonModule]
})
export class GitDiffComponent implements OnInit {
  // State
  diffContent = signal<string>('');
  isGenerating = signal<boolean>(false);
  diffFilePath = signal<string | null>(null);
  
  // Diff Operations
  generateDiff(options: DiffOptions): Promise<void>
  clearDiff(): void
  
  // File Management
  openDiffFile(): void
  deleteDiffFile(): void
  copyToClipboard(): void
}
```

### PRGeneratorComponent

**Location**: `webview-ui/src/app/modules/pr-generator/pr-generator.component.ts`

**Purpose**: AI-powered PR description generation with template support.

#### Key Features
- Template selection and customization
- Jira integration
- Feature flag detection
- Preview and editing
- Multi-format export

#### Component API

```typescript
@Component({
  selector: 'app-pr-generator',
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class PRGeneratorComponent {
  // State
  template = signal<string>('standard');
  includeJira = signal<boolean>(false);
  description = signal<PRDescription | null>(null);
  isGenerating = signal<boolean>(false);
  
  // Generation
  generateDescription(): Promise<void>
  
  // Template Management
  loadTemplate(name: string): void
  saveCustomTemplate(): void
  
  // Export
  exportDescription(format: 'markdown' | 'html'): void
}
```

### AnalysisDashboardComponent

**Location**: `webview-ui/src/app/modules/analysis-dashboard/analysis-dashboard.component.ts`

**Purpose**: Comprehensive analysis dashboard with history, trends, and diagnostics.

#### Key Features
- Analysis history management
- Trend visualization
- Multi-format export
- System diagnostics
- Copilot Chat integration

#### Component API

```typescript
@Component({
  selector: 'app-analysis-dashboard',
  standalone: true,
  imports: [CommonModule, CopilotDiagnosticsComponent]
})
export class AnalysisDashboardComponent implements OnInit {
  // State
  analyses = signal<AnalysisHistoryItem[]>([]);
  selectedAnalyses = signal<Set<string>>(new Set());
  exportFormat = signal<ExportFormat>('json');
  showDiagnostics = signal<boolean>(false);
  
  // Analysis Operations
  loadAnalysisHistory(): Promise<void>
  compareAnalyses(): void
  exportAnalyses(): Promise<void>
  
  // Diagnostics
  toggleDiagnostics(): void
  openCopilotChat(): void
}
```

### PrepareToPushComponent

**Location**: `webview-ui/src/app/modules/prepare-to-push/prepare-to-push.component.ts`

**Purpose**: Pre-push code quality validation with multi-step pipeline execution.

#### Key Features
- Quality check pipeline
- Real-time execution feedback
- Error reporting and remediation
- Multi-project support
- Progress visualization

#### Component API

```typescript
@Component({
  selector: 'app-prepare-to-push',
  standalone: true,
  imports: [CommonModule]
})
export class PrepareToPushComponent {
  // Inputs
  @Input() projects: string[] = [];
  
  // State
  pipelineSteps = signal<PipelineStep[]>([]);
  currentStep = signal<number>(0);
  isRunning = signal<boolean>(false);
  
  // Pipeline Control
  startPipeline(): Promise<void>
  pausePipeline(): void
  resumePipeline(): void
  
  // Step Management
  private executeStep(step: PipelineStep): Promise<StepResult>
}
```

## Component Patterns

### 1. State Management Pattern

All components use Angular signals for reactive state:

```typescript
// State Declaration
private readonly state = signal<ComponentState>(initialState);

// Computed Values
readonly derivedValue = computed(() => 
  this.state().items.filter(item => item.active)
);

// State Updates
updateState(changes: Partial<ComponentState>) {
  this.state.update(current => ({ ...current, ...changes }));
}
```

### 2. Message Handling Pattern

Components communicate with the extension backend via VscodeService:

```typescript
ngOnInit() {
  this.vscode.onMessage().subscribe(message => {
    switch (message.command) {
      case 'dataUpdate':
        this.handleDataUpdate(message.data);
        break;
      case 'error':
        this.handleError(message.error);
        break;
    }
  });
}

sendCommand(command: string, data?: any) {
  this.vscode.postMessage(command, data);
}
```

### 3. Loading State Pattern

Consistent loading state management:

```typescript
async performOperation() {
  this.isLoading.set(true);
  this.error.set(null);
  
  try {
    const result = await this.service.operation();
    this.handleSuccess(result);
  } catch (error) {
    this.error.set(error.message);
  } finally {
    this.isLoading.set(false);
  }
}
```

## Styling Guidelines

### Terminal Theme Colors

Components use a consistent terminal-inspired color palette:

```scss
// Primary Colors
$terminal-bg: #1a1a1a;
$terminal-fg: #e5e5e5;
$terminal-prompt: #A8A8FF;
$terminal-command: #4ECDC4;
$terminal-flag: #FFD93D;
$terminal-success: #6BCF7F;
$terminal-error: #FF6B6B;

// Status Colors
$status-healthy: #10b981;
$status-warning: #f59e0b;
$status-error: #ef4444;
$status-info: #3b82f6;
```

### Component Styling Pattern

```typescript
@Component({
  template: `
    <div class="terminal-window">
      <div class="terminal-header">
        <span class="prompt">$</span>
        <span class="command">component-name</span>
        <span class="flag">--status</span>
        <span class="value">{{ status() }}</span>
      </div>
      <div class="terminal-content">
        <!-- Content -->
      </div>
    </div>
  `,
  styles: [`
    .terminal-window {
      @apply bg-gray-900 text-green-400 font-mono p-4 rounded-lg;
      box-shadow: 0 0 20px rgba(0, 255, 0, 0.1);
    }
    
    .terminal-header {
      @apply flex items-center gap-2 mb-4 pb-2 border-b border-gray-700;
    }
    
    .prompt { color: #A8A8FF; }
    .command { color: #4ECDC4; }
    .flag { color: #FFD93D; }
    .value { color: #6BCF7F; }
  `]
})
```

## State Management

### Component State Structure

```typescript
interface ComponentState {
  // UI State
  isLoading: boolean;
  error: string | null;
  
  // Data State
  data: DataType[];
  selectedItems: Set<string>;
  
  // Configuration
  options: ComponentOptions;
  
  // Workflow State
  phase: WorkflowPhase;
  progress: number;
}
```

### State Update Patterns

```typescript
// Atomic Updates
this.state.update(state => ({
  ...state,
  isLoading: true
}));

// Batch Updates
this.state.set({
  ...this.state(),
  isLoading: false,
  data: newData,
  error: null
});

// Computed State
readonly hasErrors = computed(() => 
  this.state().error !== null
);
```

## Integration Guidelines

### 1. Component Communication

```typescript
// Parent to Child - Input Binding
<app-child-component [data]="parentData()" />

// Child to Parent - Event Emission
<app-child-component (dataChange)="handleDataChange($event)" />

// Service-Based Communication
constructor(private sharedService: SharedService) {
  this.sharedService.data$.subscribe(data => {
    this.updateLocalState(data);
  });
}
```

### 2. Extension Integration

```typescript
// Receiving Messages from Extension
ngOnInit() {
  this.messageSubscription = this.vscode.onMessage()
    .subscribe(this.handleMessage.bind(this));
}

// Sending Commands to Extension
executeCommand(command: string, payload?: any) {
  this.vscode.postMessage(command, payload);
}
```

### 3. Error Handling

```typescript
// Component-Level Error Handling
handleError(error: Error) {
  console.error(`Component Error: ${error.message}`, error);
  this.error.set(error.message);
  
  // Notify user
  this.vscode.postMessage('showError', {
    message: error.message,
    detail: error.stack
  });
}

// Global Error Boundary
@Component({
  template: `
    @if (hasError()) {
      <div class="error-boundary">
        <h3>Something went wrong</h3>
        <p>{{ errorMessage() }}</p>
        <button (click)="retry()">Retry</button>
      </div>
    } @else {
      <ng-content />
    }
  `
})
```

### 4. Performance Optimization

```typescript
// Use OnPush Change Detection
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush
})

// Memoize Expensive Computations
readonly expensiveComputation = computed(() => {
  const data = this.largeDataset();
  return this.processData(data);
});

// Lazy Load Heavy Components
const routes: Routes = [{
  path: 'heavy-feature',
  loadComponent: () => import('./heavy.component')
    .then(m => m.HeavyComponent)
}];
```

---

This component architecture provides a robust, scalable foundation for the AI Debug Context extension UI. Each component is designed to be reusable, testable, and maintainable while following consistent patterns and styling guidelines. The terminal-themed design creates a cohesive user experience that aligns with the developer-focused nature of the extension.