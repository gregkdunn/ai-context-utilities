VSCode Extension Plan: AI Debug Utilities
Extension Overview
Create a VSCode extension that integrates the AI debug utilities from your shell scripts into a dedicated side panel, providing an intuitive GUI for running test analysis, git diff capture, and code quality checks.
Core Architecture
1. Extension Structure
ai-debug-vscode/
├── package.json                 # Extension manifest
├── src/
│   ├── extension.ts            # Main extension entry point
│   ├── webview/
│   │   ├── provider.ts         # Webview panel provider
│   │   └── angular-app/        # Angular 19 application
│   │       ├── src/
│   │       │   ├── app/
│   │       │   │   ├── components/
│   │       │   │   │   ├── action-buttons/
│   │       │   │   │   ├── results-viewer/
│   │       │   │   │   ├── project-selector/
│   │       │   │   │   └── progress-indicator/
│   │       │   │   ├── services/
│   │       │   │   │   ├── command.service.ts
│   │       │   │   │   ├── webview.service.ts
│   │       │   │   │   └── file-manager.service.ts
│   │       │   │   ├── stores/
│   │       │   │   │   ├── app.store.ts
│   │       │   │   │   ├── command.store.ts
│   │       │   │   │   └── project.store.ts
│   │       │   │   ├── models/
│   │       │   │   │   └── interfaces.ts
│   │       │   │   ├── app.component.ts
│   │       │   │   └── app.module.ts
│   │       │   ├── main.ts
│   │       │   ├── index.html
│   │       │   └── styles.scss     # Tailwind CSS + Angular styles
│   │       ├── angular.json
│   │       ├── package.json
│   │       └── tailwind.config.js
│   ├── commands/
│   │   ├── aiDebug.ts          # aiDebug command implementation
│   │   ├── nxTest.ts           # nxTest command implementation
│   │   ├── gitDiff.ts          # gitDiff command implementation
│   │   └── prepareToPush.ts    # prepareToPush command implementation
│   ├── utils/
│   │   ├── fileManager.ts      # Handle output file operations
│   │   ├── projectDetector.ts  # Auto-detect NX projects
│   │   └── shellRunner.ts      # Execute shell commands
│   └── types/
│       └── index.ts            # TypeScript interfaces
2. Side Panel Design
Primary Panel: "AI Debug Assistant"

Project Selector: Dropdown to select NX project
Action Buttons: Four main utilities with status indicators
Results Viewer: Tabbed interface for different outputs
Quick Actions: Context-aware suggestions

Key Features
1. Main Action Buttons
typescriptinterface ActionButton {
  id: 'aiDebug' | 'nxTest' | 'gitDiff' | 'prepareToPush';
  label: string;
  icon: string;
  status: 'idle' | 'running' | 'success' | 'error';
  lastRun?: Date;
}

aiDebug: Full workflow with progress indicators
nxTest: Test execution with real-time output
gitDiff: Git changes analysis
prepareToPush: Code quality validation

2. Results Display

Tabbed Interface: Switch between different output types
File Links: Click to open generated files
Live Output: Stream command output in real-time
AI-Ready Export: One-click copy for AI assistants

3. Smart Features

Auto Project Detection: Scan workspace for NX projects
Git Integration: Show current branch and change status
Status Persistence: Remember last run results
Error Highlighting: Highlight failing tests and lint errors

Implementation Strategy
Phase 1: Core Infrastructure

Set up VSCode extension boilerplate
Create webview provider with basic UI
Implement shell command execution utilities
Add project detection for NX workspaces

Phase 2: Command Integration

Port each shell function to TypeScript
Implement real-time output streaming
Add file management for output files
Create status tracking system

Phase 3: Enhanced UI

Build responsive side panel interface
Add progress indicators and animations
Implement results visualization
Add context menus and shortcuts

**UI Framework Selection:**

*Angular 19 (Selected)*
- Latest stable version (released November 19, 2024)
- Enterprise-grade architecture with dependency injection and services
- Powerful reactive forms for complex configuration interfaces
- Built-in routing for multiple views within extension
- TypeScript-first approach aligns perfectly with VSCode development
- Standalone components for simpler, more modular architecture
- Enhanced bundle optimization for smaller webview payloads
- Strong testing framework with Jasmine/Karma built-in
- Available starter template: `vscode-webview-angular`
- Excellent for complex UI interactions and state management
- **NgRx Signal Store** for complex state management (command execution, project data)
- **Angular Signals** for simple component-level state

*Alternative: React*
- Mature VSCode extension ecosystem with extensive examples
- Lightweight and performant for webview environments
- Strong community support for VSCode extensions
- Works well with modern build tools (esbuild, Vite)

**Styling Framework Options:**

*Tailwind CSS (Recommended)*
- Utility-first approach for rapid UI development
- Works excellently in VSCode webview environments
- Small bundle size when properly purged
- Easy responsive design for different panel sizes
- Setup: Install with PostCSS, compile CSS, serve via webview URI
- Requires proper Content Security Policy configuration
- Example CSP: `style-src ${webview.cspSource} 'unsafe-inline';`

*VSCode Design Tokens*
- Native integration with VSCode themes
- CSS custom properties (`--vscode-*` variables)
- Automatic theme switching (light/dark/high-contrast)
- Smaller overhead for simple UIs
- Best for maintaining consistency with VSCode's native appearance

Phase 4: Advanced Features

AI integration helpers (copy prompts, etc.)
Custom configuration options
Workspace state persistence
Integration with VSCode's terminal

Technical Implementation Details
1. NgRx Signal Store Architecture
```typescript
// App Store - Global Application State
import { signalStore, withState, withMethods, withComputed } from '@ngrx/signals';
import { computed } from '@angular/core';

export interface AppState {
  selectedProject: string;
  connectionStatus: 'connected' | 'disconnected' | 'connecting';
  theme: 'light' | 'dark' | 'high-contrast';
}

const initialAppState: AppState = {
  selectedProject: '',
  connectionStatus: 'disconnected',
  theme: 'dark'
};

export const AppStore = signalStore(
  { providedIn: 'root' },
  withState(initialAppState),
  withComputed(({ selectedProject, connectionStatus }) => ({
    isProjectSelected: computed(() => selectedProject().length > 0),
    isConnected: computed(() => connectionStatus() === 'connected'),
    canExecuteCommands: computed(() => 
      selectedProject().length > 0 && connectionStatus() === 'connected'
    )
  })),
  withMethods((store) => ({
    setSelectedProject(project: string) {
      store.update({ selectedProject: project });
    },
    setConnectionStatus(status: 'connected' | 'disconnected' | 'connecting') {
      store.update({ connectionStatus: status });
    },
    setTheme(theme: 'light' | 'dark' | 'high-contrast') {
      store.update({ theme });
    },
    reset() {
      store.update(initialAppState);
    }
  }))
);

// Command Store - Command Execution State Management
export interface CommandState {
  activeCommands: Record<string, CommandExecution>;
  commandHistory: CommandResult[];
  isExecuting: boolean;
}

export interface CommandExecution {
  id: string;
  action: CommandAction;
  project: string;
  status: 'running' | 'success' | 'error';
  startTime: Date;
  endTime?: Date;
  progress?: number;
  output?: string;
  error?: string;
}

const initialCommandState: CommandState = {
  activeCommands: {},
  commandHistory: [],
  isExecuting: false
};

export const CommandStore = signalStore(
  { providedIn: 'root' },
  withState(initialCommandState),
  withComputed(({ activeCommands, commandHistory }) => ({
    activeCommandCount: computed(() => Object.keys(activeCommands()).length),
    hasActiveCommands: computed(() => Object.keys(activeCommands()).length > 0),
    recentCommands: computed(() => 
      commandHistory().slice(-10).reverse()
    ),
    commandsByProject: computed(() => {
      const history = commandHistory();
      return history.reduce((acc, cmd) => {
        if (!acc[cmd.project]) acc[cmd.project] = [];
        acc[cmd.project].push(cmd);
        return acc;
      }, {} as Record<string, CommandResult[]>);
    })
  })),
  withMethods((store) => ({
    startCommand(command: CommandExecution) {
      store.update(state => ({
        activeCommands: {
          ...state.activeCommands,
          [command.id]: command
        },
        isExecuting: true
      }));
    },
    updateCommandProgress(commandId: string, progress: number, output?: string) {
      store.update(state => {
        const command = state.activeCommands[commandId];
        if (!command) return state;
        
        return {
          activeCommands: {
            ...state.activeCommands,
            [commandId]: { ...command, progress, output }
          }
        };
      });
    },
    completeCommand(commandId: string, result: CommandResult) {
      store.update(state => {
        const { [commandId]: completed, ...remainingCommands } = state.activeCommands;
        
        return {
          activeCommands: remainingCommands,
          commandHistory: [...state.commandHistory, result],
          isExecuting: Object.keys(remainingCommands).length > 0
        };
      });
    },
    failCommand(commandId: string, error: string) {
      store.update(state => {
        const command = state.activeCommands[commandId];
        if (!command) return state;
        
        const { [commandId]: failed, ...remainingCommands } = state.activeCommands;
        const failedResult: CommandResult = {
          id: commandId,
          action: command.action,
          project: command.project,
          status: 'error',
          startTime: command.startTime,
          endTime: new Date(),
          error
        };
        
        return {
          activeCommands: remainingCommands,
          commandHistory: [...state.commandHistory, failedResult],
          isExecuting: Object.keys(remainingCommands).length > 0
        };
      });
    },
    clearHistory() {
      store.update({ commandHistory: [] });
    }
  }))
);

// Project Store - Project Management
export interface ProjectState {
  availableProjects: NxProject[];
  currentWorkspace: string | null;
  projectConfigurations: Record<string, ProjectConfig>;
  isLoading: boolean;
}

const initialProjectState: ProjectState = {
  availableProjects: [],
  currentWorkspace: null,
  projectConfigurations: {},
  isLoading: false
};

export const ProjectStore = signalStore(
  { providedIn: 'root' },
  withState(initialProjectState),
  withComputed(({ availableProjects, currentWorkspace }) => ({
    hasProjects: computed(() => availableProjects().length > 0),
    projectNames: computed(() => availableProjects().map(p => p.name)),
    workspaceProjects: computed(() => 
      currentWorkspace() 
        ? availableProjects().filter(p => p.workspace === currentWorkspace())
        : availableProjects()
    )
  })),
  withMethods((store) => ({
    setProjects(projects: NxProject[]) {
      store.update({ availableProjects: projects, isLoading: false });
    },
    setCurrentWorkspace(workspace: string | null) {
      store.update({ currentWorkspace: workspace });
    },
    setProjectConfiguration(projectName: string, config: ProjectConfig) {
      store.update(state => ({
        projectConfigurations: {
          ...state.projectConfigurations,
          [projectName]: config
        }
      }));
    },
    setLoading(isLoading: boolean) {
      store.update({ isLoading });
    },
    reset() {
      store.update(initialProjectState);
    }
  }))
);
```

2. Component Integration with NgRx Signal Store
```typescript
// Main App Component using NgRx Signal Store
@Component({
  selector: 'app-root',
  imports: [ActionButtonsComponent, ResultsViewerComponent, ProjectSelectorComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col h-full bg-vscode-editor-background">
      <app-project-selector></app-project-selector>
      
      <app-action-buttons></app-action-buttons>
      
      <app-results-viewer 
        class="flex-1">
      </app-results-viewer>
      
      @if (commandStore.isExecuting()) {
        <div class="fixed bottom-4 right-4 bg-vscode-statusBar-background p-2 rounded">
          <span class="text-sm">{{ commandStore.activeCommandCount() }} commands running...</span>
        </div>
      }
    </div>
  `
})
export class AppComponent {
  // Inject NgRx Signal Stores
  protected readonly appStore = inject(AppStore);
  protected readonly commandStore = inject(CommandStore);
  protected readonly projectStore = inject(ProjectStore);
  
  private readonly webviewService = inject(WebviewService);
  
  constructor() {
    // Initialize store state from VSCode context
    this.initializeStores();
  }
  
  private async initializeStores(): Promise<void> {
    this.appStore.setConnectionStatus('connecting');
    
    try {
      // Load available projects
      this.projectStore.setLoading(true);
      const projects = await this.webviewService.getAvailableProjects();
      this.projectStore.setProjects(projects);
      
      // Set connection status
      this.appStore.setConnectionStatus('connected');
      
      // Load theme from VSCode
      const theme = await this.webviewService.getCurrentTheme();
      this.appStore.setTheme(theme);
      
    } catch (error) {
      this.appStore.setConnectionStatus('disconnected');
      console.error('Failed to initialize stores:', error);
    }
  }
}

// Action Buttons Component with NgRx Signal Store
@Component({
  selector: 'app-action-buttons',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="grid grid-cols-2 gap-4 p-4">
      @for (action of actions; track action.id) {
        <button 
          [class]="getButtonClasses(action)"
          [disabled]="!appStore.canExecuteCommands() || isCommandRunning(action.id)"
          (click)="executeCommand(action)">
          
          @if (isCommandRunning(action.id)) {
            <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            <span class="ml-2">{{ getCommandProgress(action.id) }}%</span>
          } @else {
            <span class="text-lg">{{ action.icon }}</span>
            <span class="ml-2">{{ action.label }}</span>
          }
          
          @if (getLastRun(action.id); as lastRun) {
            <span class="text-xs opacity-75 ml-auto">
              {{ formatLastRun(lastRun) }}
            </span>
          }
        </button>
      }
    </div>
  `
})
export class ActionButtonsComponent {
  // Inject stores
  protected readonly appStore = inject(AppStore);
  protected readonly commandStore = inject(CommandStore);
  
  private readonly commandService = inject(CommandService);
  
  readonly actions: ActionButton[] = [
    { id: 'aiDebug', label: 'AI Debug', icon: '🤖' },
    { id: 'nxTest', label: 'NX Test', icon: '🧪' },
    { id: 'gitDiff', label: 'Git Diff', icon: '📋' },
    { id: 'prepareToPush', label: 'Prepare to Push', icon: '🚀' }
  ];
  
  isCommandRunning(actionId: string): boolean {
    const activeCommands = this.commandStore.activeCommands();
    return Object.values(activeCommands).some(cmd => 
      cmd.action === actionId && cmd.status === 'running'
    );
  }
  
  getCommandProgress(actionId: string): number {
    const activeCommands = this.commandStore.activeCommands();
    const command = Object.values(activeCommands).find(cmd => cmd.action === actionId);
    return command?.progress ?? 0;
  }
  
  getLastRun(actionId: string): Date | null {
    const history = this.commandStore.commandHistory();
    const lastCommand = history
      .filter(cmd => cmd.action === actionId)
      .sort((a, b) => b.endTime!.getTime() - a.endTime!.getTime())[0];
    return lastCommand?.endTime ?? null;
  }
  
  async executeCommand(action: ActionButton): Promise<void> {
    const selectedProject = this.appStore.selectedProject();
    if (!selectedProject) return;
    
    const commandId = `${action.id}-${Date.now()}`;
    const execution: CommandExecution = {
      id: commandId,
      action: action.id as CommandAction,
      project: selectedProject,
      status: 'running',
      startTime: new Date()
    };
    
    // Start command in store
    this.commandStore.startCommand(execution);
    
    try {
      const result = await this.commandService.executeCommand(
        action.id as CommandAction,
        selectedProject,
        {},
        (progress, output) => {
          // Update progress in store
          this.commandStore.updateCommandProgress(commandId, progress, output);
        }
      );
      
      // Complete command in store
      this.commandStore.completeCommand(commandId, result);
      
    } catch (error) {
      // Fail command in store
      this.commandStore.failCommand(commandId, error.message);
    }
  }
  
  getButtonClasses(action: ActionButton): string {
    const baseClasses = 'flex items-center p-3 rounded-lg transition-all duration-200';
    const isRunning = this.isCommandRunning(action.id);
    
    if (isRunning) {
      return `${baseClasses} bg-yellow-600 cursor-not-allowed`;
    }
    
    return `${baseClasses} bg-vscode-button-background hover:bg-vscode-button-hoverBackground`;
  }
  
  formatLastRun(date: Date): string {
    return new Intl.RelativeTimeFormatter('en', { numeric: 'auto' })
      .format(Math.round((date.getTime() - Date.now()) / 60000), 'minute');
  }
}
```

2. Service-Based Communication with Best Practices
```typescript
// Webview Communication Service - Single Responsibility
@Injectable({ providedIn: 'root' })
export class WebviewService {
  private vscode = (window as any).acquireVsCodeApi();
  private messageSubject = new Subject<WebviewMessage>();
  
  // Use signals for reactive state
  private connectionStatusSignal = signal<'connected' | 'disconnected'>('disconnected');
  connectionStatus = this.connectionStatusSignal.asReadonly();
  
  message$ = this.messageSubject.asObservable();

  constructor() {
    this.initializeMessageListener();
  }

  postMessage(command: string, data: any): void {
    this.vscode.postMessage({ command, data });
  }

  private initializeMessageListener(): void {
    window.addEventListener('message', (event) => {
      this.messageSubject.next(event.data);
      this.connectionStatusSignal.set('connected');
    });
  }
}

// Command Execution Service - Single Responsibility
@Injectable({ providedIn: 'root' })
export class CommandService {
  private webviewService = inject(WebviewService);
  
  // Use signals for command state tracking
  private activeCommandsSignal = signal<Set<string>>(new Set());
  activeCommands = this.activeCommandsSignal.asReadonly();
  
  // Use computed() for derived state
  hasActiveCommands = computed(() => this.activeCommands().size > 0);

  async runCommand(
    action: CommandAction,
    project: string,
    options: CommandOptions
  ): Promise<CommandResult> {
    const commandId = `${action}-${Date.now()}`;
    
    // Track active command
    this.activeCommandsSignal.update(commands => {
      const newCommands = new Set(commands);
      newCommands.add(commandId);
      return newCommands;
    });

    try {
      this.webviewService.postMessage('runCommand', {
        id: commandId,
        action,
        project,
        options
      });

      // Return observable for real-time updates
      const result = await this.webviewService.message$.pipe(
        filter(msg => msg.command === 'commandResult' && msg.data.id === commandId),
        map(msg => msg.data as CommandResult),
        take(1),
        timeout(300000) // 5 minute timeout
      ).toPromise();

      return result!;
    } finally {
      // Clean up active command tracking
      this.activeCommandsSignal.update(commands => {
        const newCommands = new Set(commands);
        newCommands.delete(commandId);
        return newCommands;
      });
    }
  }
}

// File Management Service - Single Responsibility
@Injectable({ providedIn: 'root' })
export class FileManagerService {
  private webviewService = inject(WebviewService);
  
  async openFile(filePath: string): Promise<void> {
    this.webviewService.postMessage('openFile', { path: filePath });
  }
  
  async getFileContent(filePath: string): Promise<string> {
    this.webviewService.postMessage('getFileContent', { path: filePath });
    
    return this.webviewService.message$.pipe(
      filter(msg => msg.command === 'fileContent' && msg.data.path === filePath),
      map(msg => msg.data.content),
      take(1)
    ).toPromise() as Promise<string>;
  }
  
  async saveOutputFile(type: OutputType, content: string): Promise<string> {
    this.webviewService.postMessage('saveOutput', { type, content });
    
    return this.webviewService.message$.pipe(
      filter(msg => msg.command === 'fileSaved' && msg.data.type === type),
      map(msg => msg.data.path),
      take(1)
    ).toPromise() as Promise<string>;
  }
}
```

3. File Naming and Structure Conventions
```
angular-app/
├── src/
│   ├── app/
│   │   ├── components/
│   │   │   ├── action-buttons/
│   │   │   │   ├── action-buttons.component.ts
│   │   │   │   ├── action-buttons.component.html
│   │   │   │   ├── action-buttons.component.scss
│   │   │   │   └── action-buttons.component.spec.ts
│   │   │   ├── results-viewer/
│   │   │   │   ├── results-viewer.component.ts
│   │   │   │   ├── results-viewer.component.html
│   │   │   │   ├── results-viewer.component.scss
│   │   │   │   └── results-viewer.component.spec.ts
│   │   │   ├── project-selector/
│   │   │   │   ├── project-selector.component.ts
│   │   │   │   ├── project-selector.component.html
│   │   │   │   ├── project-selector.component.scss
│   │   │   │   └── project-selector.component.spec.ts
│   │   │   └── progress-indicator/
│   │   │       ├── progress-indicator.component.ts
│   │   │       ├── progress-indicator.component.html
│   │   │       ├── progress-indicator.component.scss
│   │   │       └── progress-indicator.component.spec.ts
│   │   ├── services/
│   │   │   ├── command.service.ts
│   │   │   ├── command.service.spec.ts
│   │   │   ├── webview.service.ts
│   │   │   ├── webview.service.spec.ts
│   │   │   ├── file-manager.service.ts
│   │   │   └── file-manager.service.spec.ts
│   │   ├── stores/
│   │   │   ├── command.store.ts
│   │   │   ├── command.store.spec.ts
│   │   │   ├── project.store.ts
│   │   │   └── project.store.spec.ts
│   │   ├── models/
│   │   │   ├── command-result.interface.ts
│   │   │   ├── action-button.interface.ts
│   │   │   └── webview-message.interface.ts
│   │   ├── app.component.ts
│   │   ├── app.component.html
│   │   ├── app.component.scss
│   │   └── app.component.spec.ts
│   ├── main.ts
│   ├── index.html
│   └── styles.scss
├── angular.json
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── jest.config.js
```
4. Angular Best Practices Implementation

**Component Design Patterns:**
- Use standalone components (default in Angular 19)
- Implement `ChangeDetectionStrategy.OnPush` for performance
- Use `input()` and `output()` functions instead of decorators
- Prefer inline templates for small components
- Use native control flow (`@if`, `@for`, `@switch`) instead of structural directives

**State Management Strategy:**

- Use signals for all component state
- Use `computed()` for derived state
- Keep state transformations pure and predictable
- Use `asReadonly()` for public signal exposure
- **NgRx Signal Store** for complex, cross-component state (command execution, project data)
- **Angular Signals** for simple UI state (hover, selection, form input)

**Service Architecture:**
- Design services around single responsibility
- Use `providedIn: 'root'` for singleton services
- Use `inject()` function instead of constructor injection
- Implement proper error handling and timeouts
- Services coordinate between simple signals and complex stores

**Testing Strategy:**
```typescript
// Testing NgRx Signal Store
describe('CommandStore', () => {
  let store: InstanceType<typeof CommandStore>;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    store = TestBed.inject(CommandStore);
  });

  it('should manage command execution lifecycle', () => {
    // Arrange
    const execution: CommandExecution = {
      id: 'test-1',
      action: 'aiDebug',
      project: 'test-project',
      status: 'running',
      startTime: new Date(),
      progress: 0,
      output: []
    };

    // Act
    store.startCommand(execution);

    // Assert
    expect(store.activeCommandCount()).toBe(1);
    expect(store.isExecuting()).toBe(true);
    
    // Act - Update progress
    store.updateProgress('test-1', 50, 'Processing...');
    
    // Assert
    const activeCommands = store.activeCommands();
    expect(activeCommands['test-1'].progress).toBe(50);
    expect(activeCommands['test-1'].output).toContain('Processing...');
  });

  it('should calculate success rate correctly', () => {
    // Arrange - Add some completed commands
    const successResult: CommandResult = {
      id: 'success-1',
      action: 'aiDebug',
      project: 'test',
      status: 'success',
      startTime: new Date(),
      endTime: new Date()
    };
    
    const errorResult: CommandResult = {
      id: 'error-1', 
      action: 'nxTest',
      project: 'test',
      status: 'error',
      startTime: new Date(),
      endTime: new Date(),
      error: 'Test failed'
    };

    // Act
    store.completeCommand('success-1', successResult);
    store.completeCommand('error-1', errorResult);

    // Assert
    expect(store.successRate()).toBe(50); // 1 success out of 2 total
  });
});

// Testing Component with Simple Signals
describe('ActionButtonsComponent', () => {
  let component: ActionButtonsComponent;
  let commandStore: jasmine.SpyObj<InstanceType<typeof CommandStore>>;
  let commandService: jasmine.SpyObj<CommandService>;

  beforeEach(() => {
    const commandStoreSpy = jasmine.createSpyObj('CommandStore', 
      ['activeCommands', 'isExecuting'], 
      {
        activeCommands: signal({}),
        isExecuting: signal(false)
      }
    );
    
    const commandServiceSpy = jasmine.createSpyObj('CommandService', 
      ['executeCommand']
    );

    TestBed.configureTestingModule({
      imports: [ActionButtonsComponent],
      providers: [
        { provide: CommandStore, useValue: commandStoreSpy },
        { provide: CommandService, useValue: commandServiceSpy }
      ]
    });

    const fixture = TestBed.createComponent(ActionButtonsComponent);
    component = fixture.componentInstance;
    commandStore = TestBed.inject(CommandStore) as jasmine.SpyObj<InstanceType<typeof CommandStore>>;
    commandService = TestBed.inject(CommandService) as jasmine.SpyObj<CommandService>;
  });

  it('should show tooltip on hover', () => {
    // Act
    component['hoveredAction'].set('aiDebug');
    component['showTooltip'].set(true);

    // Assert
    expect(component['tooltipText']()).toContain('AI Debug');
  });

  it('should disable buttons when no project selected', () => {
    // Arrange
    component['selectedProject'].set('');

    // Act & Assert
    expect(component['canExecute']()).toBe(false);
  });
});
```
3. File Management
typescriptclass OutputFileManager {
  getOutputDirectory(): string;
  saveOutput(type: OutputType, content: string): Promise<string>;
  openFile(path: string): Promise<void>;
  getFileContent(path: string): Promise<string>;
}
4. Project Detection
typescriptclass NxProjectDetector {
  findNxWorkspace(): Promise<string | null>;
  getProjects(): Promise<NxProject[]>;
  detectCurrentProject(): Promise<string | null>;
}
UI/UX Design
1. Side Panel Layout
┌─────────────────────────┐
│ AI Debug Assistant      │
├─────────────────────────┤
│ Project: [Dropdown ▼]   │
├─────────────────────────┤
│ 🤖 aiDebug       [Run]  │
│ 🧪 nxTest        [Run]  │
│ 📋 gitDiff       [Run]  │
│ 🚀 prepareToPush [Run]  │
├─────────────────────────┤
│ Results:                │
│ [Output][Diff][PR] tabs │
│                         │
│ [Content Area]          │
│                         │
├─────────────────────────┤
│ 📎 Copy for AI          │
│ 📁 Open Output Dir      │
└─────────────────────────┘
2. Status Indicators

Idle: Gray icon with "Run" button
Running: Spinner with "Cancel" option
Success: Green checkmark with timestamp
Error: Red X with error count

3. Results Tabs

Test Output: Formatted test results with failure highlighting
Git Changes: Diff view with file tree
PR Description: Generated PR prompts
Raw Output: Full command output

Configuration Options
1. Extension Settings
json{
  "aiDebugUtilities.outputDirectory": ".github/instructions/ai_utilities_context",
  "aiDebugUtilities.autoDetectProject": true,
  "aiDebugUtilities.showNotifications": true,
  "aiDebugUtilities.terminalIntegration": true
}
2. Per-Project Settings

Default test arguments
Custom output paths
Lint configuration preferences
AI prompt templates

Integration Points
1. VSCode APIs

Webview API: For the side panel UI
Terminal API: For command execution
File System API: For reading/writing outputs
Workspace API: For project detection
Commands API: For keyboard shortcuts

2. External Dependencies

Node.js child_process: For shell command execution
Chokidar: For file watching
Ansi-to-html: For terminal output formatting
Git API: For repository information

Success Metrics
1. Functionality

All four utility functions work correctly
Real-time output streaming
File generation and management
Project auto-detection accuracy

2. User Experience

Fast command execution (<2s startup)
Intuitive UI navigation
Clear error messages and guidance
Seamless AI workflow integration

3. Reliability

Handles edge cases gracefully
Proper error recovery
Consistent state management
Cross-platform compatibility

Future Enhancements

AI Assistant Integration: Direct integration with ChatGPT/Claude APIs
Custom Templates: User-defined command templates
Team Sharing: Share configurations across team
CI Integration: Connect with GitHub Actions
Advanced Analytics: Test performance tracking over time

This plan provides a comprehensive roadmap for creating a VSCode extension that brings your AI debug utilities into a modern, user-friendly interface while maintaining all the powerful functionality of the original shell scripts.