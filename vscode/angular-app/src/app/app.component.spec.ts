import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of } from 'rxjs';

import { AppComponent } from './app.component';
import { WebviewService } from './services/webview.service';
import { CommandStore } from './stores/command.store';
import { ProjectStore } from './stores/project.store';
import { ToastNotificationService } from './components/toast-notification/toast-notification.component';

describe('AppComponent', () => {
  let component: AppComponent;
  let fixture: ComponentFixture<AppComponent>;
  let mockWebviewService: jasmine.SpyObj<WebviewService>;
  let mockCommandStore: jasmine.SpyObj<CommandStore>;
  let mockProjectStore: jasmine.SpyObj<ProjectStore>;
  let mockToastService: jasmine.SpyObj<ToastNotificationService>;

  beforeEach(async () => {
    const webviewServiceSpy = jasmine.createSpyObj('WebviewService', [
      'getStatus', 'getProjects', 'getWorkspaceInfo', 'setProject', 'openFile',
      'onStateUpdate', 'onThemeChange', 'onMessage', 'cancelCommand'
    ]);
    
    const commandStoreSpy = jasmine.createSpyObj('CommandStore', [
      'cancelAllCommands', 'clearHistory', 'retryCommand'
    ], {
      activeCommands: signal({}),
      activeCommandCount: signal(0),
      queueLength: signal(0),
      successRate: signal(85),
      currentStatus: signal('idle')
    });
    
    const projectStoreSpy = jasmine.createSpyObj('ProjectStore', [
      'setProjects', 'setWorkspaceInfo'
    ], {
      projectCount: signal(5),
      workspaceInfo: signal({ name: 'Test Workspace', version: '1.0.0', projects: {}, defaultProject: 'test' })
    });
    
    const toastServiceSpy = jasmine.createSpyObj('ToastNotificationService', [
      'showInfo', 'showSuccess', 'showError', 'showWarning', 'dismissToast'
    ], {
      toasts: signal([])
    });

    // Setup default return values
    webviewServiceSpy.onStateUpdate.and.returnValue(of({}));
    webviewServiceSpy.onThemeChange.and.returnValue(of('dark'));
    webviewServiceSpy.onMessage.and.returnValue(of({ command: 'test' }));

    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        { provide: WebviewService, useValue: webviewServiceSpy },
        { provide: CommandStore, useValue: commandStoreSpy },
        { provide: ProjectStore, useValue: projectStoreSpy },
        { provide: ToastNotificationService, useValue: toastServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
    
    mockWebviewService = TestBed.inject(WebviewService) as jasmine.SpyObj<WebviewService>;
    mockCommandStore = TestBed.inject(CommandStore) as jasmine.SpyObj<CommandStore>;
    mockProjectStore = TestBed.inject(ProjectStore) as jasmine.SpyObj<ProjectStore>;
    mockToastService = TestBed.inject(ToastNotificationService) as jasmine.SpyObj<ToastNotificationService>;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with correct title', () => {
    expect(component.title).toBe('AI Debug Assistant');
  });

  it('should initialize app on ngOnInit', () => {
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

  it('should refresh data when refreshData is called', () => {
    component.refreshData();
    
    expect(mockWebviewService.getProjects).toHaveBeenCalled();
    expect(mockWebviewService.getWorkspaceInfo).toHaveBeenCalled();
    expect(mockToastService.showSuccess).toHaveBeenCalledWith(
      'Data Refreshed', 
      'Project data has been updated'
    );
  });

  it('should cancel all commands when cancelAllCommands is called', () => {
    component.cancelAllCommands();
    
    expect(mockCommandStore.cancelAllCommands).toHaveBeenCalled();
    expect(mockWebviewService.cancelCommand).toHaveBeenCalled();
    expect(mockToastService.showWarning).toHaveBeenCalledWith(
      'Commands Cancelled', 
      'All running commands have been cancelled'
    );
  });

  it('should clear history when clearHistory is called', () => {
    component.clearHistory();
    
    expect(mockCommandStore.clearHistory).toHaveBeenCalled();
    expect(mockToastService.showInfo).toHaveBeenCalledWith(
      'History Cleared', 
      'Command history has been cleared'
    );
  });

  it('should toggle analytics visibility', () => {
    expect(component.showAnalytics()).toBe(false);
    
    component.showProjectAnalytics();
    expect(component.showAnalytics()).toBe(true);
    
    component.hideAnalytics();
    expect(component.showAnalytics()).toBe(false);
  });

  it('should copy system info', () => {
    spyOn(navigator.clipboard, 'writeText');
    
    component.copySystemInfo();
    
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      'Workspace: Test Workspace\\nVersion: 0.1.0'
    );
    expect(mockToastService.showInfo).toHaveBeenCalledWith(
      'Copied', 
      'System information copied to clipboard'
    );
  });

  it('should dismiss toast when onToastDismissed is called', () => {
    component.onToastDismissed('test-toast-id');
    
    expect(mockToastService.dismissToast).toHaveBeenCalledWith('test-toast-id');
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

  it('should get shortcut title', () => {
    const result = component.getShortcutTitle('Refresh', 'Ctrl+R');
    expect(result).toBe('Refresh (Ctrl+R)');
  });

  it('should get app aria label', () => {
    const label = component.getAppAriaLabel();
    expect(label).toContain('AI Debug Assistant');
    expect(label).toContain('5 projects available');
    expect(label).toContain('0 commands running');
  });

  it('should handle keyboard shortcuts', () => {
    spyOn(component, 'refreshData');
    spyOn(component, 'cancelAllCommands');
    spyOn(component, 'clearHistory');

    // Test Ctrl+R
    const refreshEvent = new KeyboardEvent('keydown', { key: 'r', ctrlKey: true });
    spyOn(refreshEvent, 'preventDefault');
    component.onKeyDown(refreshEvent);
    expect(refreshEvent.preventDefault).toHaveBeenCalled();
    expect(component.refreshData).toHaveBeenCalled();

    // Test Ctrl+Shift+C
    const cancelEvent = new KeyboardEvent('keydown', { key: 'c', ctrlKey: true, shiftKey: true });
    spyOn(cancelEvent, 'preventDefault');
    component.onKeyDown(cancelEvent);
    expect(cancelEvent.preventDefault).toHaveBeenCalled();
    expect(component.cancelAllCommands).toHaveBeenCalled();

    // Test Ctrl+Shift+H
    const historyEvent = new KeyboardEvent('keydown', { key: 'h', ctrlKey: true, shiftKey: true });
    spyOn(historyEvent, 'preventDefault');
    component.onKeyDown(historyEvent);
    expect(historyEvent.preventDefault).toHaveBeenCalled();
    expect(component.clearHistory).toHaveBeenCalled();
  });

  it('should compute current execution id', () => {
    // Update the mock to return an active command
    mockCommandStore.activeCommands = signal({
      'test-123': { 
        id: 'test-123', 
        action: 'aiDebug', 
        project: 'test', 
        status: 'running', 
        startTime: new Date(), 
        progress: 50, 
        output: [], 
        priority: 'normal' 
      }
    });
    
    fixture.detectChanges();
    expect(component.currentExecutionId()).toBe('test-123');
  });

  it('should compute isStreaming correctly', () => {
    mockCommandStore.activeCommandCount = signal(1);
    
    fixture.detectChanges();
    expect(component.isStreaming()).toBe(true);
  });

  it('should handle command completion success', () => {
    const result = { success: true, action: 'aiDebug', project: 'test-project' };
    
    // Simulate message from webview service
    mockWebviewService.onMessage.and.returnValue(of({ 
      command: 'commandComplete', 
      result 
    }));
    
    fixture.detectChanges();
    
    expect(mockToastService.showSuccess).toHaveBeenCalledWith(
      'Command Complete',
      'aiDebug completed successfully for test-project',
      jasmine.any(Array)
    );
  });

  it('should handle command completion failure', () => {
    const result = { success: false, action: 'aiDebug', project: 'test-project', error: 'Test error', id: 'test-id' };
    
    // Simulate message from webview service
    mockWebviewService.onMessage.and.returnValue(of({ 
      command: 'commandComplete', 
      result 
    }));
    
    fixture.detectChanges();
    
    expect(mockToastService.showError).toHaveBeenCalledWith(
      'Command Failed',
      'aiDebug failed: Test error',
      jasmine.any(Array)
    );
  });

  it('should handle state updates', () => {
    const stateUpdate = {
      projects: [{ name: 'test', projectType: 'application', sourceRoot: 'src', root: 'apps/test', targets: {} }],
      workspaceInfo: { name: 'New Workspace', version: '2.0.0', projects: {} }
    };
    
    mockWebviewService.onStateUpdate.and.returnValue(of(stateUpdate));
    fixture.detectChanges();
    
    expect(mockProjectStore.setProjects).toHaveBeenCalledWith(stateUpdate.projects);
    expect(mockProjectStore.setWorkspaceInfo).toHaveBeenCalledWith(stateUpdate.workspaceInfo);
  });

  it('should handle theme changes', () => {
    spyOn(document.documentElement, 'setAttribute');
    
    mockWebviewService.onThemeChange.and.returnValue(of('light'));
    fixture.detectChanges();
    
    expect(document.documentElement.setAttribute).toHaveBeenCalledWith('data-theme', 'light');
  });

  it('should select all text when selectAll is called', () => {
    spyOn(document, 'execCommand');
    
    component.selectAll();
    
    expect(document.execCommand).toHaveBeenCalledWith('selectall');
  });
});
