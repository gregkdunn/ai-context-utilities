import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FileSelectorComponent } from './file-selector.component';

describe('FileSelectorComponent', () => {
  let component: FileSelectorComponent;
  let fixture: ComponentFixture<FileSelectorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FileSelectorComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(FileSelectorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should start with uncommitted mode', () => {
    expect(component.currentMode()).toBe('uncommitted');
  });

  it('should switch modes correctly', () => {
    component.selectMode('commit');
    expect(component.currentMode()).toBe('commit');
  });

  it('should emit selection changes', () => {
    jest.spyOn(component.selectionChanged, 'emit');
    component.selectMode('branch-diff');
    expect(component.selectionChanged.emit).toHaveBeenCalled();
  });

  it('should validate selection correctly', () => {
    // Initially no files selected
    expect(component.hasValidSelection()).toBeFalsy();
    
    // Switch to branch-diff mode which should be valid
    component.selectMode('branch-diff');
    expect(component.hasValidSelection()).toBeTruthy();
  });
});
