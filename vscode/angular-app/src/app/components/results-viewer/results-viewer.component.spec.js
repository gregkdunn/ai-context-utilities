"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@angular/core/testing");
const core_1 = require("@angular/core");
const results_viewer_component_1 = require("./results-viewer.component");
const command_store_1 = require("../../stores/command.store");
describe('ResultsViewerComponent', () => {
    let component;
    let fixture;
    let mockCommandStore;
    const mockExecution = {
        id: 'test-123',
        action: 'aiDebug',
        project: 'test-project',
        status: 'running',
        startTime: new Date(),
        progress: 50,
        output: ['Line 1', 'Error: Something went wrong', 'Warning: Check this'],
        priority: 'normal'
    };
    beforeEach(async () => {
        const commandStoreSpy = jasmine.createSpyObj('CommandStore', ['activeCommands']);
        commandStoreSpy.activeCommands = (0, core_1.signal)({ 'test-123': mockExecution });
        await testing_1.TestBed.configureTestingModule({
            imports: [results_viewer_component_1.ResultsViewerComponent],
            providers: [
                { provide: command_store_1.CommandStore, useValue: commandStoreSpy }
            ]
        }).compileComponents();
        fixture = testing_1.TestBed.createComponent(results_viewer_component_1.ResultsViewerComponent);
        component = fixture.componentInstance;
        mockCommandStore = testing_1.TestBed.inject(command_store_1.CommandStore);
    });
    it('should create', () => {
        expect(component).toBeTruthy();
    });
    it('should display execution header correctly', () => {
        fixture.componentRef.setInput('executionId', 'test-123');
        fixture.detectChanges();
        expect(component.getHeaderTitle()).toBe('aiDebug - test-project');
    });
    it('should detect line types correctly', () => {
        fixture.componentRef.setInput('executionId', 'test-123');
        fixture.detectChanges();
        const outputLines = component['outputLines']();
        expect(outputLines).toHaveSize(3);
        expect(outputLines[0].type).toBe('normal');
        expect(outputLines[1].type).toBe('error');
        expect(outputLines[2].type).toBe('warning');
    });
    it('should format timestamps correctly', () => {
        const testDate = new Date('2023-01-01T12:00:00Z');
        const formatted = component.formatTimestamp(testDate);
        expect(formatted).toMatch(/^\d{2}:\d{2}:\d{2}$/);
    });
    it('should handle file size formatting', () => {
        expect(component.formatFileSize(0)).toBe('0 B');
        expect(component.formatFileSize(1024)).toBe('1 KB');
        expect(component.formatFileSize(1048576)).toBe('1 MB');
    });
    it('should emit events on actions', () => {
        spyOn(component.outputCleared, 'emit');
        component.clearOutput();
        expect(component.outputCleared.emit).toHaveBeenCalled();
    });
    it('should calculate statistics correctly', () => {
        fixture.componentRef.setInput('executionId', 'test-123');
        fixture.detectChanges();
        expect(component.getErrorCount()).toBe(1);
        expect(component.getWarningCount()).toBe(1);
    });
});
//# sourceMappingURL=results-viewer.component.spec.js.map