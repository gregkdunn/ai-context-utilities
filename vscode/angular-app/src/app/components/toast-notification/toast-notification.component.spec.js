"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@angular/core/testing");
const toast_notification_component_1 = require("./toast-notification.component");
describe('ToastNotificationComponent', () => {
    let component;
    let fixture;
    const mockToasts = [
        {
            id: 'toast-1',
            type: 'success',
            title: 'Success',
            message: 'Operation completed successfully',
            duration: 3000
        },
        {
            id: 'toast-2',
            type: 'error',
            title: 'Error',
            message: 'Something went wrong',
            duration: 0,
            actions: [
                {
                    label: 'Retry',
                    action: () => console.log('Retry clicked')
                }
            ]
        }
    ];
    beforeEach(async () => {
        await testing_1.TestBed.configureTestingModule({
            imports: [toast_notification_component_1.ToastNotificationComponent]
        }).compileComponents();
        fixture = testing_1.TestBed.createComponent(toast_notification_component_1.ToastNotificationComponent);
        component = fixture.componentInstance;
    });
    it('should create', () => {
        expect(component).toBeTruthy();
    });
    it('should display toasts correctly', () => {
        fixture.componentRef.setInput('toasts', mockToasts);
        fixture.detectChanges();
        expect(component.visibleToasts()).toHaveSize(2);
        expect(component.visibleToasts()[0].title).toBe('Success');
        expect(component.visibleToasts()[1].title).toBe('Error');
    });
    it('should limit visible toasts to maxToasts', () => {
        const manyToasts = Array(10).fill(null).map((_, i) => ({
            id: `toast-${i}`,
            type: 'info',
            title: `Toast ${i}`,
            message: `Message ${i}`,
            duration: 3000
        }));
        fixture.componentRef.setInput('toasts', manyToasts);
        fixture.componentRef.setInput('maxToasts', 3);
        fixture.detectChanges();
        expect(component.visibleToasts()).toHaveSize(3);
    });
    it('should get correct toast icon', () => {
        expect(component.getToastIcon('info')).toBe('ℹ️');
        expect(component.getToastIcon('success')).toBe('✅');
        expect(component.getToastIcon('warning')).toBe('⚠️');
        expect(component.getToastIcon('error')).toBe('❌');
    });
    it('should get correct toast classes', () => {
        const toast = mockToasts[0];
        const classes = component.getToastClasses(toast);
        expect(classes).toContain('toast-item');
        expect(classes).toContain('success');
        expect(classes).toContain('entered');
    });
    it('should get correct progress bar class', () => {
        expect(component.getProgressBarClass('success')).toBe('bg-vscode-success');
        expect(component.getProgressBarClass('error')).toBe('bg-vscode-error');
        expect(component.getProgressBarClass('warning')).toBe('bg-vscode-warning');
        expect(component.getProgressBarClass('info')).toBe('bg-vscode-info');
    });
    it('should emit toastDismissed when dismissing toast', () => {
        spyOn(component.toastDismissed, 'emit');
        component.dismissToast('toast-1');
        expect(component.toastDismissed.emit).toHaveBeenCalledWith('toast-1');
    });
    it('should emit actionExecuted when executing action', () => {
        const action = mockToasts[1].actions[0];
        spyOn(component.actionExecuted, 'emit');
        spyOn(component, 'dismissToast');
        component.executeAction(action, 'toast-2');
        expect(component.actionExecuted.emit).toHaveBeenCalledWith({ action, toastId: 'toast-2' });
        expect(component.dismissToast).toHaveBeenCalledWith('toast-2');
    });
    it('should handle pause and resume timer', () => {
        fixture.componentRef.setInput('toasts', mockToasts);
        fixture.detectChanges();
        component.pauseTimer('toast-1');
        expect(component['pausedTimers']().has('toast-1')).toBe(true);
        component.resumeTimer('toast-1');
        expect(component['pausedTimers']().has('toast-1')).toBe(false);
    });
});
describe('ToastNotificationService', () => {
    let service;
    beforeEach(() => {
        service = new toast_notification_component_1.ToastNotificationService();
    });
    it('should create', () => {
        expect(service).toBeTruthy();
    });
    it('should show toast', () => {
        const toast = {
            type: 'info',
            title: 'Test',
            message: 'Test message',
            duration: 3000
        };
        service.showToast(toast);
        expect(service.toasts().length).toBe(1);
        expect(service.toasts()[0].title).toBe('Test');
        expect(service.toasts()[0].id).toBeTruthy();
    });
    it('should dismiss toast', () => {
        service.showToast({
            type: 'info',
            title: 'Test',
            message: 'Test message'
        });
        const toastId = service.toasts()[0].id;
        service.dismissToast(toastId);
        expect(service.toasts().length).toBe(0);
    });
    it('should clear all toasts', () => {
        service.showToast({ type: 'info', title: 'Test 1', message: 'Message 1' });
        service.showToast({ type: 'info', title: 'Test 2', message: 'Message 2' });
        expect(service.toasts().length).toBe(2);
        service.clearAllToasts();
        expect(service.toasts().length).toBe(0);
    });
    it('should show success toast with correct properties', () => {
        service.showSuccess('Success', 'Operation completed');
        const toast = service.toasts()[0];
        expect(toast.type).toBe('success');
        expect(toast.title).toBe('Success');
        expect(toast.message).toBe('Operation completed');
        expect(toast.duration).toBe(3000);
    });
    it('should show error toast with no auto-dismiss', () => {
        service.showError('Error', 'Something went wrong');
        const toast = service.toasts()[0];
        expect(toast.type).toBe('error');
        expect(toast.duration).toBe(0);
    });
    it('should show warning toast with correct duration', () => {
        service.showWarning('Warning', 'Check this');
        const toast = service.toasts()[0];
        expect(toast.type).toBe('warning');
        expect(toast.duration).toBe(5000);
    });
    it('should show info toast with correct duration', () => {
        service.showInfo('Info', 'FYI');
        const toast = service.toasts()[0];
        expect(toast.type).toBe('info');
        expect(toast.duration).toBe(4000);
    });
    it('should increment id counter for each toast', () => {
        service.showToast({ type: 'info', title: 'Test 1', message: 'Message 1' });
        service.showToast({ type: 'info', title: 'Test 2', message: 'Message 2' });
        const toasts = service.toasts();
        expect(toasts[0].id).toBe('toast-1');
        expect(toasts[1].id).toBe('toast-2');
    });
});
//# sourceMappingURL=toast-notification.component.spec.js.map