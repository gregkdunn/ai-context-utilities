import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ProgressIndicatorComponent } from './progress-indicator.component';
import { CommandStore } from '../../stores/command.store';
import { CommandExecution, QueuedCommand } from '../../models';

// Create a mock type that matches the CommandStore interface
interface MockCommandStore {
  activeCommands: ReturnType<typeof signal>;
  executionQueue: ReturnType<typeof signal>;
  commandHistory: ReturnType<typeof signal>;
}

describe('ProgressIndicatorComponent', () => {
  let component: ProgressIndicatorComponent;
  let fixture: ComponentFixture<ProgressIndicatorComponent>;
  let mockCommandStore: MockCommandStore;

  const mockActiveCommand: CommandExecution = {
    id: 'active-1',
    action: 'aiDebug',
    project: 'test-project',
    status: 'running',
    startTime: new Date(Date.now() - 30000), // 30 seconds ago
    progress: 75,
    output: ['Starting...'],
    priority: 'normal'
  };

  const mockQueuedCommand: QueuedCommand = {
    id: 'queued-1',
    action: 'nxTest',
    project: 'test-project',
    priority: 'high',
    options: {},
    timestamp: new Date()
  };

  beforeEach(async () => {
    // Create mock for CommandStore
    mockCommandStore = {
      activeCommands: signal({ 'active-1': mockActiveCommand }),
      executionQueue: signal([mockQueuedCommand]),
      commandHistory: signal([])
    };

    await TestBed.configureTestingModule({
      imports: [ProgressIndicatorComponent],
      providers: [
        { provide: CommandStore, useValue: mockCommandStore }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ProgressIndicatorComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should calculate active commands count', () => {
    expect(component.activeCount()).toBe(1);
    expect(component.hasActiveCommands()).toBe(true);
  });

  it('should calculate queue length', () => {
    expect(component.queueLength()).toBe(1);
  });

  it('should calculate overall progress', () => {
    expect(component.overallProgress()).toBe(75);
  });

  it('should format duration correctly', () => {
    expect(component.formatDuration(0)).toBe('0s');
    expect(component.formatDuration(30000)).toBe('30s');
    expect(component.formatDuration(90000)).toBe('1m 30s');
    expect(component.formatDuration(3600000)).toBe('1h 0m');
  });

  it('should get correct command icon', () => {
    expect(component.getCommandIcon('aiDebug')).toBe('🤖');
    expect(component.getCommandIcon('nxTest')).toBe('🧪');
    expect(component.getCommandIcon('gitDiff')).toBe('📋');
    expect(component.getCommandIcon('prepareToPush')).toBe('🚀');
  });

  it('should calculate command duration', () => {
    const duration = component.getCommandDuration(mockActiveCommand);
    expect(duration).toBeGreaterThan(25000); // At least 25 seconds
    expect(duration).toBeLessThan(35000); // Less than 35 seconds
  });

  it('should get correct progress bar class', () => {
    expect(component.getProgressBarClass('running')).toBe('bg-vscode-progress running');
    expect(component.getProgressBarClass('success')).toBe('bg-vscode-success');
    expect(component.getProgressBarClass('error')).toBe('bg-vscode-error');
  });

  it('should get status message for running command', () => {
    const message = component.getStatusMessage(mockActiveCommand);
    expect(message).toBeTruthy();
    expect(typeof message).toBe('string');
  });

  it('should format ETA correctly', () => {
    expect(component.formatETA(500)).toBe('ETA: <1s');
    expect(component.formatETA(30000)).toBe('ETA: 30s');
    expect(component.formatETA(90000)).toBe('ETA: 1m 30s');
  });

  it('should show statistics when enabled', () => {
    fixture.componentRef.setInput('showStatistics', true);
    fixture.detectChanges();
    
    expect(component.showStats()).toBe(true);
  });

  it('should calculate success rate', () => {
    // Mock command history with some results
    mockCommandStore.commandHistory = signal([
      { id: '1', action: 'aiDebug', project: 'test', status: 'success', startTime: new Date(), endTime: new Date(), duration: 1000, success: true, output: [] },
      { id: '2', action: 'nxTest', project: 'test', status: 'error', startTime: new Date(), endTime: new Date(), duration: 1000, success: false, output: [] }
    ]);
    
    fixture.detectChanges();
    expect(component.successRate()).toBe(50);
  });
});
