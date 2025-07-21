# State Management

## Overview
The AI Debug Utilities extension uses a hybrid state management approach combining NgRx Signal Store for complex cross-component state and Angular Signals for simple component-level state.

## NgRx Signal Stores

### CommandStore
Manages command execution lifecycle, queue management, and analytics.

**Location:** `src/app/stores/command.store.ts`

**State Interface:**
```typescript
interface CommandState {
  activeCommands: Record<string, CommandExecution>;
  commandHistory: CommandResult[];
  executionQueue: QueuedCommand[];
  isExecuting: boolean;
  currentStatus: 'idle' | 'running' | 'queued';
}
```

**Key Computed Properties:**
```typescript
// Get active command count
const activeCommandCount = computed(() => Object.keys(activeCommands()).length);

// Check if any commands are executing
const hasActiveCommands = computed(() => activeCommandCount() > 0);

// Get recent command history (last 10)
const recentCommands = computed(() => 
  commandHistory().slice(-10).reverse()
);

// Group commands by project
const commandsByProject = computed(() => {
  return commandHistory().reduce((acc, cmd) => {
    if (!acc[cmd.project]) acc[cmd.project] = [];
    acc[cmd.project].push(cmd);
    return acc;
  }, {} as Record<string, CommandResult[]>);
});

// Calculate success rate
const successRate = computed(() => {
  const total = commandHistory().length;
  if (total === 0) return 0;
  const successful = commandHistory().filter(cmd => cmd.status === 'success').length;
  return (successful / total) * 100;
});

// Get average execution time
const averageExecutionTime = computed(() => {
  const completed = commandHistory().filter(cmd => cmd.duration > 0);
  if (completed.length === 0) return 0;
  const total = completed.reduce((sum, cmd) => sum + cmd.duration, 0);
  return total / completed.length;
});
```

**Key Methods:**
```typescript
// Start a new command
startCommand(command: CommandExecution): void

// Update command progress
updateCommandProgress(commandId: string, progress: number, output?: string): void

// Complete a command
completeCommand(commandId: string, result: CommandResult): void

// Fail a command
failCommand(commandId: string, error: string): void

// Cancel a command
cancelCommand(commandId: string): void

// Queue a command
queueCommand(command: QueuedCommand): void

// Process command queue
processQueue(): void

// Clear command history
clearHistory(): void

// Get execution statistics
getExecutionStats(): ExecutionStats
```

**Usage Example:**
```typescript
@Component({...})
export class ActionButtonsComponent {
  private readonly commandStore = inject(CommandStore);
  
  // Access computed properties
  readonly activeCommands = this.commandStore.activeCommandCount;
  readonly isExecuting = this.commandStore.hasActiveCommands;
  readonly successRate = this.commandStore.successRate;
  
  async executeCommand(actionId: string, project: string) {
    const commandId = `${actionId}-${Date.now()}`;
    
    // Start command in store
    this.commandStore.startCommand({
      id: commandId,
      action: actionId,
      project,
      status: 'running',
      startTime: new Date(),
      progress: 0
    });
    
    try {
      // Execute command logic...
      const result = await this.executeCommandLogic(actionId, project);
      
      // Complete command in store
      this.commandStore.completeCommand(commandId, result);
    } catch (error) {
      // Fail command in store
      this.commandStore.failCommand(commandId, error.message);
    }
  }
}
```

---

### ProjectStore
Handles project detection, configuration, and workspace management.

**Location:** `src/app/stores/project.store.ts`

**State Interface:**
```typescript
interface ProjectState {
  availableProjects: NxProject[];
  currentProject: string | null;
  projectConfigurations: Record<string, ProjectConfig>;
  workspaceInfo: WorkspaceInfo | null;
  isLoading: boolean;
  lastUpdated: Date | null;
}
```

**Key Computed Properties:**
```typescript
// Get project names
const projectNames = computed(() => availableProjects().map(p => p.name));

// Check if projects are available
const hasProjects = computed(() => availableProjects().length > 0);

// Get current project object
const currentProjectObject = computed(() => {
  const current = currentProject();
  return current ? availableProjects().find(p => p.name === current) : null;
});

// Group projects by type
const projectsByType = computed(() => {
  return availableProjects().reduce((acc, project) => {
    const type = project.projectType || 'unknown';
    if (!acc[type]) acc[type] = [];
    acc[type].push(project);
    return acc;
  }, {} as Record<string, NxProject[]>);
});

// Check if data is stale
const isStale = computed(() => {
  const lastUpdated = lastUpdated();
  if (!lastUpdated) return true;
  return Date.now() - lastUpdated.getTime() > 300000; // 5 minutes
});
```

**Key Methods:**
```typescript
// Load projects from workspace
setProjects(projects: NxProject[]): void

// Set current active project
setCurrentProject(projectName: string): void

// Update project configuration
updateProjectConfig(projectName: string, config: ProjectConfig): void

// Set workspace information
setWorkspaceInfo(info: WorkspaceInfo): void

// Set loading state
setLoading(isLoading: boolean): void

// Refresh projects
refreshProjects(): void

// Get project statistics
getProjectStats(): ProjectStats
```

**Usage Example:**
```typescript
@Component({...})
export class ProjectSelectorComponent {
  private readonly projectStore = inject(ProjectStore);
  
  // Access computed properties
  readonly projects = this.projectStore.availableProjects;
  readonly currentProject = this.projectStore.currentProject;
  readonly isLoading = this.projectStore.isLoading;
  readonly hasProjects = this.projectStore.hasProjects;
  
  onProjectSelect(projectName: string) {
    this.projectStore.setCurrentProject(projectName);
  }
  
  onRefresh() {
    this.projectStore.refreshProjects();
  }
}
```

---

### UIStore (Optional)
Manages global UI state like themes, panel visibility, and user preferences.

**Location:** `src/app/stores/ui.store.ts`

**State Interface:**
```typescript
interface UIState {
  theme: 'light' | 'dark' | 'auto';
  sidebarVisible: boolean;
  analyticsVisible: boolean;
  notificationsEnabled: boolean;
  keyboardShortcutsEnabled: boolean;
  autoSaveEnabled: boolean;
}
```

## Angular Signals

### Component-Level State
For simple UI state that doesn't need to be shared across components, use Angular Signals.

**Common Patterns:**

```typescript
@Component({...})
export class ExampleComponent {
  // Form state
  private readonly selectedOption = signal<string>('');
  private readonly isFormValid = signal(false);
  private readonly formErrors = signal<string[]>([]);
  
  // UI state
  private readonly isLoading = signal(false);
  private readonly showTooltip = signal(false);
  private readonly hoveredItem = signal<string | null>(null);
  
  // Computed properties
  readonly canSubmit = computed(() => 
    this.isFormValid() && !this.isLoading()
  );
  
  readonly tooltipText = computed(() => {
    const hovered = this.hoveredItem();
    return hovered ? `Information about ${hovered}` : '';
  });
  
  // Effects for side effects
  constructor() {
    effect(() => {
      const errors = this.formErrors();
      this.isFormValid.set(errors.length === 0);
    });
  }
  
  // Methods to update signals
  setSelectedOption(option: string) {
    this.selectedOption.set(option);
  }
  
  addError(error: string) {
    this.formErrors.update(errors => [...errors, error]);
  }
  
  clearErrors() {
    this.formErrors.set([]);
  }
}
```

### Signal Patterns

**Read-only Signals:**
```typescript
// Private signal with public read-only accessor
private readonly _data = signal<Data[]>([]);
readonly data = this._data.asReadonly();

// Or use computed for derived read-only state
readonly filteredData = computed(() => 
  this._data().filter(item => item.active)
);
```

**Signal Updates:**
```typescript
// Set new value
this.count.set(10);

// Update based on current value
this.count.update(current => current + 1);

// Mutate arrays/objects
this.items.mutate(items => {
  items.push(newItem);
  items.sort((a, b) => a.name.localeCompare(b.name));
});
```

**Computed Signals:**
```typescript
// Simple computed
readonly doubledCount = computed(() => this.count() * 2);

// Complex computed with multiple dependencies
readonly summary = computed(() => {
  const items = this.items();
  const filter = this.filter();
  const sort = this.sortBy();
  
  return items
    .filter(item => item.name.includes(filter))
    .sort((a, b) => a[sort].localeCompare(b[sort]))
    .slice(0, 10);
});
```

**Effects for Side Effects:**
```typescript
constructor() {
  // React to signal changes
  effect(() => {
    const theme = this.theme();
    document.body.className = `theme-${theme}`;
  });
  
  // Cleanup effect
  effect((onCleanup) => {
    const subscription = this.dataService.getData().subscribe(data => {
      this.data.set(data);
    });
    
    onCleanup(() => subscription.unsubscribe());
  });
}
```

## State Management Best Practices

### When to Use NgRx Signal Store
- **Cross-component state** that needs to be shared
- **Complex business logic** with multiple related pieces of state
- **Persistent state** that should survive component destruction
- **Analytics and metrics** that aggregate data over time
- **Command execution** and queue management
- **Configuration and settings** used across the application

### When to Use Angular Signals
- **Component-specific UI state** (loading, hover, selection)
- **Form state** that doesn't need to be shared
- **Temporary state** that can be recreated easily
- **Derived state** that's computed from other signals
- **Simple toggles** and boolean flags

### Signal Store Integration

**Injecting Stores in Components:**
```typescript
@Component({...})
export class MyComponent {
  // Inject stores using inject() function
  private readonly commandStore = inject(CommandStore);
  private readonly projectStore = inject(ProjectStore);
  
  // Access store state directly
  readonly commands = this.commandStore.activeCommands;
  readonly projects = this.projectStore.availableProjects;
  
  // Use store methods
  executeCommand(action: string) {
    this.commandStore.startCommand({
      id: `${action}-${Date.now()}`,
      action,
      project: this.projectStore.currentProject() || '',
      status: 'running',
      startTime: new Date()
    });
  }
}
```

**Store-to-Store Communication:**
```typescript
// In CommandStore, react to project changes
export const CommandStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withMethods((store) => {
    const projectStore = inject(ProjectStore);
    
    // React to project changes
    effect(() => {
      const currentProject = projectStore.currentProject();
      if (currentProject) {
        // Filter commands by current project
        store.updateActiveCommands(currentProject);
      }
    });
    
    return {
      // Store methods...
    };
  })
);
```

### Testing Signals and Stores

**Testing Angular Signals:**
```typescript
describe('Component Signals', () => {
  let component: MyComponent;
  
  beforeEach(() => {
    component = TestBed.createComponent(MyComponent).componentInstance;
  });
  
  it('should update computed signal when dependency changes', () => {
    // Arrange
    component['count'].set(5);
    
    // Act & Assert
    expect(component.doubledCount()).toBe(10);
    
    // Act
    component['count'].set(10);
    
    // Assert
    expect(component.doubledCount()).toBe(20);
  });
  
  it('should trigger effect when signal changes', () => {
    // Arrange
    const spy = jasmine.createSpy('effectSpy');
    
    // Create effect that calls spy
    TestBed.runInInjectionContext(() => {
      effect(() => {
        component['theme']();
        spy();
      });
    });
    
    // Act
    component['theme'].set('dark');
    
    // Assert
    expect(spy).toHaveBeenCalled();
  });
});
```

**Testing NgRx Signal Stores:**
```typescript
describe('CommandStore', () => {
  let store: InstanceType<typeof CommandStore>;
  
  beforeEach(() => {
    TestBed.configureTestingModule({});
    store = TestBed.inject(CommandStore);
  });
  
  it('should update active command count when command is started', () => {
    // Arrange
    const command: CommandExecution = {
      id: 'test-1',
      action: 'nxTest',
      project: 'my-app',
      status: 'running',
      startTime: new Date()
    };
    
    // Act
    store.startCommand(command);
    
    // Assert
    expect(store.activeCommandCount()).toBe(1);
    expect(store.hasActiveCommands()).toBe(true);
  });
  
  it('should calculate success rate correctly', () => {
    // Arrange - Add some completed commands
    store.completeCommand('cmd-1', {
      id: 'cmd-1',
      action: 'nxTest',
      project: 'app',
      status: 'success',
      duration: 1000,
      startTime: new Date(),
      endTime: new Date()
    });
    
    store.completeCommand('cmd-2', {
      id: 'cmd-2',
      action: 'nxTest', 
      project: 'app',
      status: 'error',
      duration: 500,
      startTime: new Date(),
      endTime: new Date(),
      error: 'Test failed'
    });
    
    // Assert
    expect(store.successRate()).toBe(50); // 1 success out of 2 total
  });
});
```

### Performance Considerations

**Signal Optimization:**
```typescript
// Use computed() for expensive calculations
readonly expensiveCalculation = computed(() => {
  const data = this.data();
  // This only recalculates when data changes
  return data.map(item => this.processItem(item));
});

// Avoid creating signals in templates
// Bad:
// {{ createSignal(data) }}

// Good:
readonly processedData = computed(() => this.processData(this.data()));
// {{ processedData() }}
```

**Store Optimization:**
```typescript
// Use batch updates to avoid multiple change notifications
store.update(state => ({
  ...state,
  // Update multiple properties at once
  property1: newValue1,
  property2: newValue2,
  property3: newValue3
}));

// Instead of:
// store.updateProperty1(newValue1);
// store.updateProperty2(newValue2);
// store.updateProperty3(newValue3);
```

### Migration from RxJS

If migrating from RxJS-based state management:

**Before (RxJS):**
```typescript
private dataSubject = new BehaviorSubject<Data[]>([]);
data$ = this.dataSubject.asObservable();

loadData() {
  this.dataService.getData().subscribe(data => {
    this.dataSubject.next(data);
  });
}
```

**After (Signals):**
```typescript
private readonly data = signal<Data[]>([]);
readonly dataSignal = this.data.asReadonly();

loadData() {
  this.dataService.getData().subscribe(data => {
    this.data.set(data);
  });
}
```

## State Debugging

**Angular DevTools:**
The Angular DevTools extension supports signal inspection and can help debug signal changes.

**Custom Debugging:**
```typescript
// Add debug effects to track signal changes
effect(() => {
  const value = this.debugSignal();
  console.log('Signal changed:', value);
}, { allowSignalWrites: false });

// Store debugging
export const CommandStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withMethods((store) => ({
    // Debug method to log current state
    debugState() {
      console.log('Current store state:', {
        activeCommands: store.activeCommands(),
        commandHistory: store.commandHistory(),
        isExecuting: store.isExecuting()
      });
    }
  }))
);
```

This hybrid approach provides the best of both worlds: powerful stores for complex state management and simple signals for component-level reactive programming.
