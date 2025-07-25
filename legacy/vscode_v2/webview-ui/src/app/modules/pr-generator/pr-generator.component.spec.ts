import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PRGeneratorComponent } from './pr-generator.component';

describe('PRGeneratorComponent', () => {
  let component: PRGeneratorComponent;
  let fixture: ComponentFixture<PRGeneratorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PRGeneratorComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(PRGeneratorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should start with standard template', () => {
    expect(component.selectedTemplate()).toBe('standard');
  });

  it('should not allow generation without file selection', () => {
    expect(component.canGenerate()).toBeFalsy();
  });

  it('should allow generation with file selection', () => {
    component.fileSelection = {
      mode: 'uncommitted',
      files: [{ path: 'test.ts', status: 'modified', selected: true }]
    };
    
    expect(component.canGenerate()).toBeTruthy();
  });

  it('should add valid Jira tickets', () => {
    component.jiraTicketInput = 'PROJ-123, FEATURE-456';
    component.addJiraTicket();
    
    expect(component.jiraTickets()).toEqual(['PROJ-123', 'FEATURE-456']);
    expect(component.jiraTicketInput).toBe('');
  });

  it('should filter invalid Jira tickets', () => {
    component.jiraTicketInput = 'PROJ-123, invalid, FEATURE-456';
    component.addJiraTicket();
    
    expect(component.jiraTickets()).toEqual(['PROJ-123', 'FEATURE-456']);
  });

  it('should remove Jira tickets', () => {
    component.jiraTickets.set(['PROJ-123', 'FEATURE-456']);
    component.removeJiraTicket('PROJ-123');
    
    expect(component.jiraTickets()).toEqual(['FEATURE-456']);
  });

  it('should change templates correctly', () => {
    component.selectTemplate('feature');
    expect(component.selectedTemplate()).toBe('feature');
  });
});
