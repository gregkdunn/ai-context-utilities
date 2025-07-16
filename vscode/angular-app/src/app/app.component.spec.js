"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@angular/core/testing");
const core_1 = require("@angular/core");
const rxjs_1 = require("rxjs");
const app_component_1 = require("./app.component");
const webview_service_1 = require("./services/webview.service");
const command_service_1 = require("./services/command.service");
const project_store_1 = require("./stores/project.store");
const command_store_1 = require("./stores/command.store");
const toast_notification_component_1 = require("./components/toast-notification/toast-notification.component");
describe('AppComponent', () => {
    let component;
    let fixture;
    let mockWebviewService;
    let mockCommandService;
    let mockProjectStore;
    let mockCommandStore;
    let mockToastService;
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
        webviewServiceSpy.onStateUpdate.and.returnValue((0, rxjs_1.of)({}));
        webviewServiceSpy.onThemeChange.and.returnValue((0, rxjs_1.of)('dark'));
        commandServiceSpy.onCommandComplete.and.returnValue((0, rxjs_1.of)({ success: true, action: 'test' }));
        projectStoreSpy.projectCount = (0, core_1.signal)(5);
        projectStoreSpy.workspaceInfo = (0, core_1.signal)({ name: 'Test Workspace', version: '1.0.0', projects: {}, defaultProject: 'test' });
        commandStoreSpy.activeCommands = (0, core_1.signal)({});
        commandStoreSpy.activeCommandCount = (0, core_1.signal)(0);
        commandStoreSpy.queueLength = (0, core_1.signal)(0);
        commandStoreSpy.successRate = (0, core_1.signal)(85);
        commandStoreSpy.currentStatus = (0, core_1.signal)('idle');
        toastServiceSpy.toasts = (0, core_1.signal)([]);
        await testing_1.TestBed.configureTestingModule({
            imports: [app_component_1.AppComponent],
            providers: [
                { provide: webview_service_1.WebviewService, useValue: webviewServiceSpy },
                { provide: command_service_1.CommandService, useValue: commandServiceSpy },
                { provide: project_store_1.ProjectStore, useValue: projectStoreSpy },
                { provide: command_store_1.CommandStore, useValue: commandStoreSpy },
                { provide: toast_notification_component_1.ToastNotificationService, useValue: toastServiceSpy }
            ]
        }).compileComponents();
        fixture = testing_1.TestBed.createComponent(app_component_1.AppComponent);
        component = fixture.componentInstance;
        mockWebviewService = testing_1.TestBed.inject(webview_service_1.WebviewService);
        mockCommandService = testing_1.TestBed.inject(command_service_1.CommandService);
        mockProjectStore = testing_1.TestBed.inject(project_store_1.ProjectStore);
        mockCommandStore = testing_1.TestBed.inject(command_store_1.CommandStore);
        mockToastService = testing_1.TestBed.inject(toast_notification_component_1.ToastNotificationService);
    });
    it('should create', () => {
        expect(component).toBeTruthy();
    });
    it('should initialize app and show welcome toast', () => {
        fixture.detectChanges();
        expect(mockWebviewService.getStatus).toHaveBeenCalled();
        expect(mockWebviewService.getProjects).toHaveBeenCalled();
        expect(mockWebviewService.getWorkspaceInfo).toHaveBeenCalled();
        expect(mockToastService.showInfo).toHaveBeenCalledWith('Welcome!', 'AI Debug Assistant is ready to help you debug your code.', jasmine.any(Array));
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
        mockCommandStore.activeCommands = (0, core_1.signal)({
            'test-123': { id: 'test-123', action: 'aiDebug', project: 'test', status: 'running', startTime: new Date(), progress: 50, output: [], priority: 'normal' }
        });
        fixture.detectChanges();
        expect(component.currentExecutionId()).toBe('test-123');
    });
    it('should compute isStreaming correctly', () => {
        mockCommandStore.activeCommands = (0, core_1.signal)({
            'test-123': { id: 'test-123', action: 'aiDebug', project: 'test', status: 'running', startTime: new Date(), progress: 50, output: [], priority: 'normal' }
        });
        fixture.detectChanges();
        expect(component.isStreaming()).toBe(true);
    });
    it('should handle command completion success', () => {
        const result = { success: true, action: 'aiDebug', project: 'test-project' };
        component['handleCommandComplete'](result);
        expect(mockToastService.showSuccess).toHaveBeenCalledWith('Command Complete', 'aiDebug completed successfully for test-project', jasmine.any(Array));
    });
    it('should handle command completion failure', () => {
        const result = { success: false, action: 'aiDebug', project: 'test-project', error: 'Test error' };
        component['handleCommandComplete'](result);
        expect(mockToastService.showError).toHaveBeenCalledWith('Command Failed', 'aiDebug failed: Test error', jasmine.any(Array));
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
//# sourceMappingURL=app.component.spec.js.map