import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { VscodeService } from './services/vscode.service';
import { BehaviorSubject } from 'rxjs';

// Create a simple mock class for VscodeService
class MockVscodeService {
  postMessage = jest.fn();
  onMessage = jest.fn(() => new BehaviorSubject(null));
  getState = jest.fn(() => ({}));
  setState = jest.fn();
}

describe('AppComponent', () => {
  let component: AppComponent;
  let fixture: ComponentFixture<AppComponent>;
  let mockVscodeService: MockVscodeService;

  beforeEach(async () => {
    mockVscodeService = new MockVscodeService();

    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        { provide: VscodeService, useValue: mockVscodeService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with overview module', () => {
    expect(component.activeModule()).toBe('overview');
  });

  it('should navigate between modules', () => {
    component.showModule('file-selection');
    expect(component.activeModule()).toBe('file-selection');
    expect(mockVscodeService.setState).toHaveBeenCalled();

    component.showOverview();
    expect(component.activeModule()).toBe('overview');
  });

  it('should handle file selection changes', () => {
    const fileSelection = {
      mode: 'uncommitted' as const,
      files: [{ path: 'test.ts', status: 'modified' as const, selected: true }]
    };

    // Set initial test configuration
    const initialTestConfig = {
      mode: 'affected' as const,
      testFiles: [],
      command: 'nx affected --target=test'
    };
    component.testConfiguration.set(initialTestConfig);

    component.onFileSelectionChanged(fileSelection);
    
    expect(component.fileSelection()).toEqual(fileSelection);
    expect(component.testConfiguration()).toBeNull(); // Should be reset
    expect(mockVscodeService.postMessage).toHaveBeenCalledWith('fileSelectionChanged', fileSelection);
    expect(mockVscodeService.setState).toHaveBeenCalled();
  });

  it('should reset test configuration when file selection changes', () => {
    // Set initial test configuration
    const testConfig = {
      mode: 'project' as const,
      project: 'test-project',
      testFiles: [],
      command: 'nx test test-project'
    };
    component.testConfiguration.set(testConfig);
    expect(component.testConfiguration()).toEqual(testConfig);

    // Change file selection
    const fileSelection = {
      mode: 'commit' as const,
      files: [],
      commits: [{
        hash: 'abc123',
        message: 'test commit',
        author: 'test author',
        date: new Date(),
        files: [],
        selected: true
      }]
    };

    component.onFileSelectionChanged(fileSelection);
    
    expect(component.testConfiguration()).toBeNull();
  });

  it('should handle test configuration changes', () => {
    const testConfig = {
      mode: 'affected' as const,
      testFiles: [],
      command: 'nx affected --target=test'
    };

    component.onTestConfigurationChanged(testConfig);
    
    expect(component.testConfiguration()).toEqual(testConfig);
    expect(mockVscodeService.postMessage).toHaveBeenCalledWith('testConfigurationChanged', testConfig);
  });

  it('should provide correct status messages', () => {
    // File selection status
    expect(component.getFileSelectionStatus()).toBe('Not configured');
    
    component.fileSelection.set({
      mode: 'uncommitted',
      files: [{ path: 'test.ts', status: 'modified', selected: true }]
    });
    expect(component.getFileSelectionStatus()).toBe('1 uncommitted files');

    // Test selection status (updated name)
    expect(component.getTestConfigStatus()).toBe('Not configured');
    
    component.testConfiguration.set({
      mode: 'affected',
      testFiles: [],
      command: 'nx affected --target=test'
    });
    expect(component.getTestConfigStatus()).toBe('Affected tests');

    // PR generator status
    expect(component.getPRGeneratorStatus()).toBe('Ready to generate');
  });

  it('should determine if AI debug can run', () => {
    expect(component.canRunAIDebug()).toBe(false);

    component.fileSelection.set({
      mode: 'uncommitted',
      files: [{ path: 'test.ts', status: 'modified', selected: true }]
    });
    expect(component.canRunAIDebug()).toBe(false);

    component.testConfiguration.set({
      mode: 'affected',
      testFiles: [],
      command: 'nx affected --target=test'
    });
    expect(component.canRunAIDebug()).toBe(true);
  });

  it('should handle AI debug completion', () => {
    const result = {
      testResults: [
        { name: 'test1', status: 'passed' as const, duration: 100, file: 'test.spec.ts' }
      ],
      aiAnalysis: {
        type: 'success-analysis' as const,
        newTestSuggestions: ['Add more tests']
      }
    };

    component.onAIDebugComplete(result);
    
    expect(component.testResults()).toEqual(result.testResults);
    expect(component.aiAnalysis()).toEqual(result.aiAnalysis);
    expect(mockVscodeService.postMessage).toHaveBeenCalledWith('aiDebugComplete', result);
  });

  it('should handle PR description generation', () => {
    const description = 'Generated PR description';
    
    component.onPRDescriptionGenerated(description);
    
    expect(component.prDescription()).toBe(description);
    expect(mockVscodeService.postMessage).toHaveBeenCalledWith('prDescriptionGenerated', description);
  });

  it('should save and restore state', () => {
    // Clear any previous calls
    mockVscodeService.setState.mockClear();
    
    // Set some state by simulating the proper workflow
    component.showModule('file-selection');
    
    // Simulate file selection change through the proper method
    const fileSelection = {
      mode: 'uncommitted' as const,
      files: [{ path: 'test.ts', status: 'modified' as const, selected: true }]
    };
    component.onFileSelectionChanged(fileSelection);

    // Verify state is saved (check the last call since saveState is called multiple times)
    expect(mockVscodeService.setState).toHaveBeenCalled();
    const lastCallIndex = mockVscodeService.setState.mock.calls.length - 1;
    const savedState = mockVscodeService.setState.mock.calls[lastCallIndex][0];
    expect(savedState.activeModule).toBe('file-selection');
    expect(savedState.fileSelection).toBeTruthy();
    expect(savedState.fileSelection).toEqual(fileSelection);
  });

  it('should reset all state', () => {
    // Set some state first
    component.showModule('ai-debug');
    component.fileSelection.set({
      mode: 'uncommitted',
      files: [{ path: 'test.ts', status: 'modified', selected: true }]
    });

    // Reset
    component.handleVscodeMessage({ command: 'resetState' });

    // Verify reset
    expect(component.activeModule()).toBe('overview');
    expect(component.fileSelection()).toBeNull();
    expect(component.testConfiguration()).toBeNull();
    expect(component.testResults()).toBeNull();
    expect(component.aiAnalysis()).toBeNull();
    expect(component.prDescription()).toBeNull();
  });
});
