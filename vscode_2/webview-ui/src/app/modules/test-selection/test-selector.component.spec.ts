import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TestSelectorComponent } from './test-selector.component';

describe('TestSelectorComponent', () => {
  let component: TestSelectorComponent;
  let fixture: ComponentFixture<TestSelectorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestSelectorComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(TestSelectorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should start with affected mode', () => {
    expect(component.testMode()).toBe('affected');
  });

  it('should switch test modes correctly', () => {
    component.selectTestMode('project');
    expect(component.testMode()).toBe('project');
  });

  it('should emit configuration changes', () => {
    jest.spyOn(component.configurationChanged, 'emit');
    component.selectTestMode('project');
    expect(component.configurationChanged.emit).toHaveBeenCalled();
  });

  it('should generate correct test command for affected mode', () => {
    component.selectTestMode('affected');
    const command = component.getTestCommand();
    expect(command).toContain('nx affected --target=test --base=main');
  });

  it('should validate configuration correctly', () => {
    // Affected mode should be valid when projects are loaded
    component.selectTestMode('affected');
    // Mock having affected projects
    component.affectedProjects.set(['test-project']);
    expect(component.hasValidConfiguration()).toBeTruthy();
  });
});
