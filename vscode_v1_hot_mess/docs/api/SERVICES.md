# Services API

## Overview
The AI Debug Utilities extension uses a service-oriented architecture with specialized services handling different aspects of the application. Services coordinate between components, stores, and external systems.

## Core Services

### WebviewService
VSCode webview communication layer for message passing between extension and Angular app.

**Responsibilities:** VSCode API communication, message serialization, connection status management

**Key Methods:**
```typescript
initialize(): void
sendMessage(command: string, data?: any): void
onMessage(): Observable<WebviewMessage>
getCurrentTheme(): Promise<VSCodeTheme>
getAvailableProjects(): Promise<NxProject[]>
```

### CommandService
Coordinates command execution between UI components and the VSCode extension.

**Responsibilities:** Command orchestration, progress tracking, error handling, result processing

**Key Methods:**
```typescript
executeCommand(action: CommandAction, project: string, options: CommandOptions): Promise<CommandResult>
executeBatch(commands: BatchCommand[], options: BatchOptions): Promise<BatchResult>
cancelCommand(commandId: string): Promise<void>
getActiveCommands(): CommandExecution[]
```

### FileManagerService
Handles file operations, output management, and file system interactions.

**Responsibilities:** Output file management, file content retrieval, file operations

**Key Methods:**
```typescript
saveOutput(type: OutputType, content: string, project?: string): Promise<string>
getFileContent(type: OutputType, project?: string): Promise<string>
openFile(filePath: string): Promise<void>
downloadFile(filePath: string, fileName?: string): Promise<void>
listOutputFiles(project?: string): Promise<OutputFile[]>
```

### ConfigurationService
Manages extension settings and user preferences.

**Responsibilities:** Settings management, user preference storage, configuration validation

**Key Methods:**
```typescript
get<T>(key: string, defaultValue?: T): T
set(key: string, value: any): Promise<void>
update(config: Record<string, any>): Promise<void>
onConfigurationChanged(): Observable<ConfigurationChange>
```

### AnalyticsService
Collects and analyzes usage data and performance metrics.

**Responsibilities:** Usage tracking, performance monitoring, data aggregation, report generation

**Key Methods:**
```typescript
trackCommandExecution(command: CommandExecution): void
getUsageStats(timeRange?: TimeRange): UsageStats
getPerformanceMetrics(timeRange?: TimeRange): PerformanceMetrics
exportData(format: 'json' | 'csv'): Promise<string>
```

### NotificationService
Manages user notifications, toasts, and feedback messages.

**Responsibilities:** Toast notifications, system notifications, user feedback collection

**Key Methods:**
```typescript
showSuccess(title: string, message?: string, actions?: NotificationAction[]): void
showError(title: string, message?: string, actions?: NotificationAction[]): void
showToast(message: string, type: ToastType, options?: ToastOptions): void
clearAll(): void
```

## Service Architecture

### Dependency Injection
Services use Angular's inject() function for clean dependency management:

```typescript
@Injectable({ providedIn: 'root' })
export class CommandService {
  private readonly webview = inject(WebviewService);
  private readonly fileManager = inject(FileManagerService);
  private readonly notifications = inject(NotificationService);
}
```

### Error Handling
Centralized error handling with user-friendly messages and recovery actions.

### Testing
Comprehensive unit testing with mocked dependencies and async operation handling.

## Integration Examples

### Service Communication
```typescript
// Command execution workflow
async executeCommand(action: string, project: string) {
  try {
    const result = await this.commandService.executeCommand(action, project, {});
    await this.fileManager.saveOutput('result', result.data);
    this.notifications.showSuccess('Command completed');
  } catch (error) {
    this.notifications.showError('Command failed', error.message);
  }
}
```

### Store Integration
Services coordinate with NgRx Signal Stores for state management:

```typescript
// Update store based on service results
this.commandService.executeCommand('nxTest', project).then(result => {
  this.commandStore.completeCommand(commandId, result);
});
```

For detailed implementation examples and API specifications, see the individual service files in the `src/app/services/` directory.
