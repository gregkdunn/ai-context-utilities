import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { Component, signal } from '@angular/core';
import { TestSelectorComponent, TestConfiguration, TestExecutionState } from './test-selector.component';
import { VscodeService } from '../../services/vscode.service';
import { of, Subject } from 'rxjs';

describe('TestSelectorComponent', () => {
  let component: TestSelectorComponent;
  let fixture: ComponentFixture<TestSelectorComponent>;
  let vscodeService: jasmine.SpyObj<VscodeService>;
  let messageSubject: Subject<any>;

  beforeEach(async () => {
    messageSubject = new Subject();
    vscodeService = jasmine.createSpyObj('VscodeService', ['postMessage', 'onMessage']);
    vscodeService.onMessage.and.returnValue(messageSubject.asObservable());

    await TestBed.configureTestingModule({
      imports: [TestSelectorComponent, FormsModule],
      providers: [
        { provide: VscodeService, useValue: vscodeService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(TestSelectorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Test Mode Selection', () => {
    it('should default to affected mode', () => {
      expect(component.testMode()).toBe('affected');
    });

    it('should switch test modes', () => {
      component.selectTestMode('project');
      expect(component.testMode()).toBe('project');

      component.selectTestMode('affected');
      expect(component.testMode()).toBe('affected');
    });

    it('should emit configuration when mode changes', () => {
      spyOn(component.configurationChanged, 'emit');

      component.selectTestMode('project');

      expect(component.configurationChanged.emit).toHaveBeenCalled();
    });
  });

  describe('Project Selection', () => {
    beforeEach(() => {
      component.projects.set([
        { name: 'app1', type: 'application', root: 'apps/app1', sourceRoot: 'apps/app1/src' },
        { name: 'lib1', type: 'library', root: 'libs/lib1', sourceRoot: 'libs/lib1/src' },
        { name: 'lib2', type: 'library', root: 'libs/lib2', sourceRoot: 'libs/lib2/src' }
      ]);
    });

    it('should handle project selection', () => {
      component.toggleProjectSelection('app1');
      expect(component.selectedProjects()).toContain('app1');

      component.toggleProjectSelection('app1');
      expect(component.selectedProjects()).not.toContain('app1');
    });

    it('should handle multiple project selection', () => {
      component.toggleProjectSelection('app1');
      component.toggleProjectSelection('lib1');

      expect(component.selectedProjects()).toEqual(['app1', 'lib1']);
    });

    it('should clear all project selections', () => {
      component.toggleProjectSelection('app1');
      component.toggleProjectSelection('lib1');

      component.clearAllProjectSelections();

      expect(component.selectedProjects()).toEqual([]);
      expect(component.projectTestFiles()).toEqual([]);
    });
  });

  describe('Test Execution', () => {
    beforeEach(() => {
      component.selectedProjects.set(['app1']);
      component.projectTestFiles.set([
        { path: 'app.component.spec.ts', selected: true, testCount: 5 },
        { path: 'service.spec.ts', selected: true, testCount: 3 }
      ]);
    });

    it('should run tests when configuration is valid', () => {
      component.runTests();

      expect(vscodeService.postMessage).toHaveBeenCalledWith('runTests', jasmine.objectContaining({
        mode: 'affected',
        projects: ['app1'],
        command: jasmine.any(String)
      }));
    });

    it('should not run tests when configuration is invalid', () => {
      component.selectedProjects.set([]);
      component.testMode.set('project');

      component.runTests();

      expect(vscodeService.postMessage).not.toHaveBeenCalled();
    });

    it('should cancel test run', () => {
      component.cancelTestRun();

      expect(vscodeService.postMessage).toHaveBeenCalledWith('cancelTestRun');
    });

    it('should handle test execution started', () => {
      const startData = {
        command: 'npx nx test app1',
        startTime: new Date().toISOString(),
        outputFile: '/path/to/output.log'
      };

      messageSubject.next({
        command: 'testExecutionStarted',
        data: startData
      });

      const execution = component.testExecution();
      expect(execution.isRunning).toBe(true);
      expect(execution.outputFile).toBe(startData.outputFile);
      expect(execution.output).toContain('Starting test execution');
    });

    it('should handle test execution output', () => {
      // Start execution first
      component.testExecution.set({
        isRunning: true,
        output: 'Initial output\n',
        hasResults: false
      });

      messageSubject.next({
        command: 'testExecutionOutput',
        data: { output: 'New output line\n', append: true }
      });

      const execution = component.testExecution();
      expect(execution.output).toBe('Initial output\nNew output line\n');
    });

    it('should handle test execution completion', () => {
      const completionData = {
        exitCode: 0,
        endTime: new Date().toISOString(),
        outputFile: '/path/to/output.log',
        results: [
          { name: 'test1', status: 'passed', duration: 100, file: 'app.spec.ts' }
        ]
      };

      messageSubject.next({
        command: 'testExecutionCompleted',
        data: completionData
      });

      const execution = component.testExecution();
      expect(execution.isRunning).toBe(false);
      expect(execution.exitCode).toBe(0);
      expect(execution.hasResults).toBe(true);
    });

    it('should handle test execution error', () => {
      const errorData = {
        error: 'Test execution failed',
        endTime: new Date().toISOString()
      };

      messageSubject.next({
        command: 'testExecutionError',
        data: errorData
      });

      const execution = component.testExecution();
      expect(execution.isRunning).toBe(false);
      expect(execution.exitCode).toBe(1);
      expect(execution.output).toContain('Error: Test execution failed');
    });
  });

  describe('Test Output Management', () => {
    beforeEach(() => {
      component.testExecution.set({
        isRunning: false,
        output: 'Test output content',
        outputFile: '/path/to/output.log',
        hasResults: true,
        exitCode: 0
      });
    });

    it('should open output file', () => {
      component.openOutputFile();

      expect(vscodeService.postMessage).toHaveBeenCalledWith('openOutputFile', {
        filePath: '/path/to/output.log'
      });
    });

    it('should delete output file', () => {
      component.deleteOutputFile();

      expect(vscodeService.postMessage).toHaveBeenCalledWith('deleteOutputFile', {
        filePath: '/path/to/output.log'
      });
    });

    it('should copy test output to clipboard', async () => {
      const mockWriteText = jasmine.createSpy().and.returnValue(Promise.resolve());
      (navigator as any).clipboard = { writeText: mockWriteText };

      await component.copyTestOutput();

      expect(mockWriteText).toHaveBeenCalledWith('Test output content');
    });

    it('should clear test output', () => {
      component.clearTestOutput();

      const execution = component.testExecution();
      expect(execution.isRunning).toBe(false);
      expect(execution.output).toBe('');
      expect(execution.hasResults).toBe(false);
    });
  });

  describe('Test Duration Calculation', () => {
    it('should calculate duration in seconds', () => {
      const startTime = new Date('2024-01-01T10:00:00Z');
      const endTime = new Date('2024-01-01T10:00:30Z');

      component.testExecution.set({
        isRunning: false,
        output: '',
        hasResults: true,
        startTime,
        endTime
      });

      expect(component.getTestDuration()).toBe('30s');
    });

    it('should calculate duration in minutes and seconds', () => {
      const startTime = new Date('2024-01-01T10:00:00Z');
      const endTime = new Date('2024-01-01T10:02:30Z');

      component.testExecution.set({
        isRunning: false,
        output: '',
        hasResults: true,
        startTime,
        endTime
      });

      expect(component.getTestDuration()).toBe('2m 30s');
    });

    it('should return empty string when times are not available', () => {
      component.testExecution.set({
        isRunning: false,
        output: '',
        hasResults: true
      });

      expect(component.getTestDuration()).toBe('');
    });
  });

  describe('Execution Status', () => {
    it('should show running status', () => {
      component.testExecution.set({
        isRunning: true,
        output: '',
        hasResults: false
      });

      expect(component.getExecutionStatus()).toBe('Running...');
    });

    it('should show success status', () => {
      component.testExecution.set({
        isRunning: false,
        output: '',
        hasResults: true,
        exitCode: 0
      });

      expect(component.getExecutionStatus()).toBe('Completed Successfully');
    });

    it('should show failure status', () => {
      component.testExecution.set({
        isRunning: false,
        output: '',
        hasResults: true,
        exitCode: 1
      });

      expect(component.getExecutionStatus()).toBe('Failed (Exit Code: 1)');
    });

    it('should show ready status by default', () => {
      component.testExecution.set({
        isRunning: false,
        output: '',
        hasResults: false
      });

      expect(component.getExecutionStatus()).toBe('Ready');
    });
  });

  describe('Command Generation', () => {
    it('should generate affected tests command', () => {
      component.testMode.set('affected');
      component.baseBranch = 'main';

      const command = component.getTestCommand();

      expect(command).toBe('npx nx affected --target=test --base=main');
    });

    it('should generate project test command', () => {
      component.testMode.set('project');
      component.selectedProjects.set(['app1']);

      const command = component.getTestCommand();

      expect(command).toBe('npx nx test app1');
    });

    it('should generate multiple projects command', () => {
      component.testMode.set('project');
      component.selectedProjects.set(['app1', 'lib1']);

      const command = component.getTestCommand();

      expect(command).toBe('npx nx run-many --target=test --projects=app1,lib1');
    });

    it('should include dependencies in affected command', () => {
      component.testMode.set('affected');
      component.baseBranch = 'main';
      component.includeDependencies = true;

      const command = component.getTestCommand();

      expect(command).toBe('npx nx affected --target=test --base=main --with-deps');
    });
  });

  describe('Configuration Validation', () => {
    it('should validate affected mode configuration', () => {
      component.testMode.set('affected');
      component.affectedProjects.set(['app1', 'lib1']);

      expect(component.hasValidConfiguration()).toBe(true);
    });

    it('should validate project mode configuration', () => {
      component.testMode.set('project');
      component.selectedProjects.set(['app1']);

      expect(component.hasValidConfiguration()).toBe(true);
    });

    it('should invalidate empty project selection', () => {
      component.testMode.set('project');
      component.selectedProjects.set([]);

      expect(component.hasValidConfiguration()).toBe(false);
    });

    it('should invalidate empty affected projects', () => {
      component.testMode.set('affected');
      component.affectedProjects.set([]);

      expect(component.hasValidConfiguration()).toBe(false);
    });
  });

  describe('Test Output Clearing', () => {
    beforeEach(() => {
      // Set up some test output
      component.testExecution.set({
        isRunning: false,
        output: 'Previous test output',
        hasResults: true,
        exitCode: 0
      });
    });

    it('should clear output when switching test modes', () => {
      component.selectTestMode('project');
      
      const execution = component.testExecution();
      expect(execution.output).toBe('');
      expect(execution.hasResults).toBe(false);
    });

    it('should clear output when toggling project selection', () => {
      component.toggleProjectSelection('app1');
      
      const execution = component.testExecution();
      expect(execution.output).toBe('');
      expect(execution.hasResults).toBe(false);
    });

    it('should clear output when removing project selection', () => {
      component.selectedProjects.set(['app1']);
      component.removeProjectSelection('app1');
      
      const execution = component.testExecution();
      expect(execution.output).toBe('');
      expect(execution.hasResults).toBe(false);
    });

    it('should clear output when clearing all project selections', () => {
      component.selectedProjects.set(['app1', 'lib1']);
      component.clearAllProjectSelections();
      
      const execution = component.testExecution();
      expect(execution.output).toBe('');
      expect(execution.hasResults).toBe(false);
    });

    it('should clear output when updating affected projects', () => {
      component.updateAffectedProjects();
      
      const execution = component.testExecution();
      expect(execution.output).toBe('');
      expect(execution.hasResults).toBe(false);
    });

    it('should clear output when include dependencies changes', () => {
      component.onIncludeDependenciesChange();
      
      const execution = component.testExecution();
      expect(execution.output).toBe('');
      expect(execution.hasResults).toBe(false);
    });

    it('should clear output when test file selection changes', () => {
      component.projectTestFiles.set([
        { path: 'test.spec.ts', selected: false, testCount: 1 }
      ]);
      
      component.toggleTestFile(component.projectTestFiles()[0]);
      
      const execution = component.testExecution();
      expect(execution.output).toBe('');
      expect(execution.hasResults).toBe(false);
    });

    it('should clear output when toggling all test files', () => {
      component.projectTestFiles.set([
        { path: 'test1.spec.ts', selected: false, testCount: 1 },
        { path: 'test2.spec.ts', selected: false, testCount: 2 }
      ]);
      
      component.toggleSelectAllTestFiles();
      
      const execution = component.testExecution();
      expect(execution.output).toBe('');
      expect(execution.hasResults).toBe(false);
    });

    it('should clear output when resetting configuration', () => {
      spyOn(component, 'loadProjects' as any);
      spyOn(component, 'updateAffectedProjects');
      
      component.resetConfiguration();
      
      const execution = component.testExecution();
      expect(execution.output).toBe('');
      expect(execution.hasResults).toBe(false);
    });

    it('should clear output when multiple project selection changes', () => {
      const mockGroup: any = {
        projects: [{ name: 'app1' }, { name: 'app2' }]
      };
      
      const mockEvent = {
        target: {
          selectedOptions: [{ value: 'app1' }]
        }
      } as any;
      
      component.onMultipleProjectSelectionChange(mockEvent, mockGroup);
      
      const execution = component.testExecution();
      expect(execution.output).toBe('');
      expect(execution.hasResults).toBe(false);
    });
  });

  describe('Reset Configuration', () => {
    beforeEach(() => {
      component.testMode.set('project');
      component.selectedProjects.set(['app1']);
      component.projectTestFiles.set([
        { path: 'test.spec.ts', selected: true, testCount: 1 }
      ]);
    });

    it('should reset all configuration and clear test output', () => {
      component.testMode.set('project');
      component.selectedProjects.set(['app1']);
      component.projectTestFiles.set([
        { path: 'test.spec.ts', selected: true, testCount: 1 }
      ]);
      component.testExecution.set({
        isRunning: false,
        output: 'Previous output',
        hasResults: true
      });

      component.resetConfiguration();

      expect(component.testMode()).toBe('affected');
      expect(component.selectedProjects()).toEqual([]);
      expect(component.projectTestFiles()).toEqual([]);
      expect(component.affectedProjects()).toEqual([]);
      
      // Verify test output is also cleared
      const execution = component.testExecution();
      expect(execution.output).toBe('');
      expect(execution.hasResults).toBe(false);
    });

    it('should reload data after reset', () => {
      spyOn(component, 'loadProjects' as any);
      spyOn(component, 'updateAffectedProjects');

      component.resetConfiguration();

      expect(component['loadProjects']).toHaveBeenCalled();
      expect(component.updateAffectedProjects).toHaveBeenCalled();
    });
  });
});
