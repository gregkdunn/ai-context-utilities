import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AIDebugComponent } from './ai-debug.component';

describe('AIDebugComponent', () => {
  let component: AIDebugComponent;
  let fixture: ComponentFixture<AIDebugComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AIDebugComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(AIDebugComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should start in idle state', () => {
    expect(component.workflowState().phase).toBe('idle');
  });

  it('should not allow workflow start without prerequisites', () => {
    expect(component.canStartWorkflow()).toBeFalsy();
  });

  it('should allow workflow start with valid inputs', () => {
    component.fileSelection = {
      mode: 'uncommitted',
      files: [{ path: 'test.ts', status: 'modified', selected: true }]
    };
    component.testConfiguration = {
      mode: 'affected',
      testFiles: [],
      command: 'nx affected --target=test'
    };
    
    expect(component.canStartWorkflow()).toBeTruthy();
  });

  it('should calculate test counts correctly', () => {
    component.workflowState.set({
      phase: 'complete',
      progress: 100,
      message: 'Done',
      testResults: [
        { name: 'test1', status: 'passed', duration: 100, file: 'test.spec.ts' },
        { name: 'test2', status: 'failed', duration: 200, file: 'test.spec.ts' },
        { name: 'test3', status: 'skipped', duration: 0, file: 'test.spec.ts' }
      ]
    });

    expect(component.getPassedTestsCount()).toBe(1);
    expect(component.getFailedTestsCount()).toBe(1);
    expect(component.getSkippedTestsCount()).toBe(1);
  });
});
