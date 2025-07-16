import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of } from 'rxjs';

import { AppComponent } from './app.component';
import { WebviewService } from './services/webview.service';
import { CommandService } from './services/command.service';
import { ProjectStore } from './stores/project.store';
import { CommandStore } from './stores/command.store';
import { ToastNotificationService } from './components/toast-notification/toast-notification.component';

describe('AppComponent', () => {
  let component: AppComponent;
  let fixture: ComponentFixture<AppComponent>;
  let mockWebviewService: jasmine.SpyObj<WebviewService>;
  let mockCommandService: jasmine.SpyObj<CommandService>;
  let mockProjectStore: jasmine.SpyObj<ProjectStore>;
  let mockCommandStore: jasmine.SpyObj<CommandStore>;
  let mockToastService: jasmine.SpyObj<ToastNotificationService>;

  beforeEach(async () => {
    const webviewServiceSpy = jasmine.createSpyObj('WebviewService', [
      'getStatus', 'getProjects', 'getWorkspaceInfo', 'setProject', 'openFile',
      'onStateUpdate', 'onThemeChange'
    ]);
    const commandServiceSpy = jasmine.createSpyObj('CommandService', [
      'executeCommand', 'cancelAllCommands', 'onCommandComplete'
    ]);
    const projectStoreSpy = jasmine.createSpyObj('ProjectStore', ['loadProjects', 'projectCount', 'workspaceInfo']);
    const commandStoreSpy = jasmine.createSpyObj('CommandStore', [
      'activeCommands', 'activeCommandCount', 'queueLength', 'successRate',
      'currentStatus', 'clearHistory'
    ]);
    const toastServiceSpy = jasmine.createSpyObj('ToastNotificationService', [
      'showInfo', 'showSuccess', 'showError', 'showWarning', 'dismissToast', 'toasts'
    ]);

    // Setup default return values
    webviewServiceSpy.onStateUpdate.and.returnValue(of({}));
    webviewServiceSpy.onThemeChange.and.returnValue(of('dark'));
    commandServiceSpy.onCommandComplete.and.returnValue(of({ success: true, action: 'test' }));
    
    projectStoreSpy.projectCount = signal(5);
    projectStoreSpy.workspaceInfo = signal({ name: 'Test Workspace', version: '1.0.0', projects: {}, defaultProject: 'test' });
    
    commandStoreSpy.activeCommands = signal({});
    commandStoreSpy.activeCommandCount = signal(0);
    commandStoreSpy.queueLength = signal(0);
    commandStoreSpy.successRate = signal(85);
    commandStoreSpy.currentStatus = signal('idle');
    
    toastServiceSpy.toasts = signal([]);

    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        { provide: WebviewService, useValue: webviewServiceSpy },
        { provide: CommandService, useValue: commandServiceSpy },
        { provide: ProjectStore, useValue: projectStoreSpy },
        { provide: CommandStore, useValue: commandStoreSpy },
        { provide: ToastNotificationService, useValue: toastServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
    
    mockWebviewService = TestBed.inject(WebviewService) as jasmine.SpyObj<WebviewService>;
    mockCommandService = TestBed.inject(CommandService) as jasmine.SpyObj<CommandService>;
    mockProjectStore = TestBed.inject(ProjectStore) as jasmine.SpyObj<ProjectStore>;
    mockCommandStore = TestBed.inject(CommandStore) as jasmine.SpyObj<CommandStore>;
    mockToastService = TestBed.inject(ToastNotificationService) as jasmine.SpyObj<ToastNotificationService>;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize app and show welcome toast', () => {
    fixture.detectChanges();
    
    expect(mockWebviewService.getStatus).toHaveBeenCalled();
    expect(mockWebviewService.getProjects).toHaveBeenCalled();
    expect(mockWebviewService.getWorkspaceInfo).toHaveBeenCalled();
    expect(mockToastService.showInfo).toHaveBeenCalledWith(
      'Welcome!',
      'AI Debug Assistant is ready to help you debug your code.',
      jasmine.any(Array)
    );
  });

  it('should handle project selection', () => {
    component.onProjectSelected('test-project');
    
    expect(mockWebviewService.setProject).toHaveBeenCalledWith('test-project');
    expect(mockToastService.showInfo).toHaveBeenCalledWith('Project Selected', 'Switched to test-project');
  });

  it('should handle file opening', () => {
    const fileEvent = { name: 'test.ts', path: '/path/to/test.ts' };
    component.onFileOpened(fileEvent);
    
    expect(mockWebviewService.openFile).toHaveBeenCalledWith('/path/to/test.ts');
    expect(mockToastService.showSuccess).toHaveBeenCalledWith('File Opened', 'Opened test.ts');
  });

  it('should handle file download', () => {
    const fileEvent = { name: 'test.txt', content: 'test content' };
    
    // Mock URL methods
    spyOn(URL, 'createObjectURL').and.returnValue('blob:test');
    spyOn(URL, 'revokeObjectURL');
    
    component.onFileDownloaded(fileEvent);
    
    expect(mockToastService.showSuccess).toHaveBeenCalledWith('File Downloaded', 'Downloaded test.txt');
  });

  it('should handle output clearing', () => {
    component.onOutputCleared();
    
    expect(mockToastService.showInfo).toHaveBeenCalledWith('Output Cleared', 'Command output has been cleared');
  });

  it('should cancel all commands', () => {
    component.cancelAllCommands();
    
    expect(mockCommandService.cancelAllCommands).toHaveBeenCalled();
    expect(mockToastService.showWarning).toHaveBeenCalledWith('Commands Cancelled', 'All running commands have been cancelled');
  });

  it('should refresh data', async () => {
    await component.refreshData();
    
    expect(mockWebviewService.getProjects).toHaveBeenCalled();
    expect(mockWebviewService.getWorkspaceInfo).toHaveBeenCalled();
    expect(mockToastService.showSuccess).toHaveBeenCalledWith('Data Refreshed', 'Project data has been updated');
  });

  it('should clear history', () => {
    component.clearHistory();
    
    expect(mockCommandStore.clearHistory).toHaveBeenCalled();
    expect(mockToastService.showInfo).toHaveBeenCalledWith('History Cleared', 'Command history has been cleared');
  });

  it('should get correct status class', () => {
    expect(component.getStatusClass()).toBe('status-idle');
  });

  it('should get correct status icon', () => {
    expect(component.getStatusIcon()).toBe('⚪');
  });

  it('should get correct status title', () => {
    expect(component.getStatusTitle()).toBe('Ready - No commands running');
  });

  it('should check if has active commands', () => {
    expect(component.hasActiveCommands()).toBe(false);
  });

  it('should get workspace info', () => {
    expect(component.getWorkspaceInfo()).toBe('Test Workspace');
  });

  it('should get version info', () => {
    expect(component.getVersionInfo()).toBe('0.1.0');
  });

  it('should handle keyboard shortcuts', () => {
    spyOn(component, 'refreshData');
    spyOn(component, 'cancelAllCommands');
    spyOn(component, 'clearHistory');

    // Test Ctrl+R
    const refreshEvent = new KeyboardEvent('keydown', { key: 'r', ctrlKey: true });
    component.onKeyDown(refreshEvent);
    expect(component.refreshData).toHaveBeenCalled();

    // Test Ctrl+Shift+C
    const cancelEvent = new KeyboardEvent('keydown', { key: 'c', ctrlKey: true, shiftKey: true });
    component.onKeyDown(cancelEvent);
    expect(component.cancelAllCommands).toHaveBeenCalled();

    // Test Ctrl+Shift+H
    const historyEvent = new KeyboardEvent('keydown', { key: 'h', ctrlKey: true, shiftKey: true });
    component.onKeyDown(historyEvent);
    expect(component.clearHistory).toHaveBeenCalled();
  });

  it('should compute current execution id', () => {
    mockCommandStore.activeCommands = signal({
      'test-123': { id: 'test-123', action: 'aiDebug', project: 'test', status: 'running', startTime: new Date(), progress: 50, output: [], priority: 'normal' }
    });
    
    fixture.detectChanges();
    expect(component.currentExecutionId()).toBe('test-123');
  });

  it('should compute isStreaming correctly', () => {
    mockCommandStore.activeCommands = signal({
      'test-123': { id: 'test-123', action: 'aiDebug', project: 'test', status: 'running', startTime: new Date(), progress: 50, output: [], priority: 'normal' }
    });
    
    fixture.detectChanges();
    expect(component.isStreaming()).toBe(true);
  });

  it('should handle command completion success', () => {
    const result = { success: true, action: 'aiDebug', project: 'test-project' };
    component['handleCommandComplete'](result);
    
    expect(mockToastService.showSuccess).toHaveBeenCalledWith(
      'Command Complete',
      'aiDebug completed successfully for test-project',
      jasmine.any(Array)
    );
  });

  it('should handle command completion failure', () => {
    const result = { success: false, action: 'aiDebug', project: 'test-project', error: 'Test error' };
    component['handleCommandComplete'](result);
    
    expect(mockToastService.showError).toHaveBeenCalledWith(
      'Command Failed',
      'aiDebug failed: Test error',
      jasmine.any(Array)
    );
  });

  it('should handle toast dismissal', () => {
    component.onToastDismissed('toast-123');
    
    expect(mockToastService.dismissToast).toHaveBeenCalledWith('toast-123');
  });

  it('should handle theme change', () => {
    spyOn(document.documentElement, 'setAttribute');
    
    component['handleThemeChange']('light');
    
    expect(document.documentElement.setAttribute).toHaveBeenCalledWith('data-theme', 'light');
  });

  it('should get app aria label', () => {
    const label = component.getAppAriaLabel();
    expect(label).toContain('AI Debug Assistant');
    expect(label).toContain('5 projects available');
    expect(label).toContain('0 commands running');
  });
});
