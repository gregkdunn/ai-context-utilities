import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FileSelectorComponent } from './file-selector.component';
import { VscodeService } from '../../services/vscode.service';
import { of } from 'rxjs';

describe('FileSelectorComponent', () => {
  let component: FileSelectorComponent;
  let fixture: ComponentFixture<FileSelectorComponent>;
  let mockVscodeService: jest.Mocked<VscodeService>;

  beforeEach(async () => {
    // Create mock VSCode service
    mockVscodeService = {
      postMessage: jest.fn(),
      onMessage: jest.fn(() => of(null)),
      getState: jest.fn(() => ({})),
      setState: jest.fn()
    } as any;

    await TestBed.configureTestingModule({
      imports: [FileSelectorComponent],
      providers: [
        { provide: VscodeService, useValue: mockVscodeService }
      ]
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
    // Mock some uncommitted files with default selection
    const mockChanges = [
      { path: 'test.ts', status: 'modified' }
    ];
    component['handleUncommittedChangesResponse'](mockChanges);
    
    // Should be valid because files are selected by default
    expect(component.hasValidSelection()).toBeTruthy();
    
    // Mock branch diff stats
    component.branchDiffStats.set({ filesChanged: 5, additions: 10, deletions: 3 });
    
    // Switch to branch-diff mode which should be valid
    component.selectMode('branch-diff');
    expect(component.hasValidSelection()).toBeTruthy();
  });

  it('should request git data on initialization', () => {
    // Component should have called VSCode service on init
    expect(mockVscodeService.postMessage).toHaveBeenCalledWith('getUncommittedChanges');
    expect(mockVscodeService.postMessage).toHaveBeenCalledWith('getCommitHistory', { limit: 50 });
    expect(mockVscodeService.postMessage).toHaveBeenCalledWith('getBranchDiff');
  });

  it('should handle uncommitted changes response with default selection', () => {
    const mockChanges = [
      { path: 'test.ts', status: 'modified' },
      { path: 'another.ts', status: 'added' }
    ];

    // Simulate receiving uncommitted changes
    component['handleUncommittedChangesResponse'](mockChanges);

    expect(component.uncommittedFiles().length).toBe(2);
    expect(component.uncommittedFiles()[0].path).toBe('test.ts');
    expect(component.uncommittedFiles()[0].status).toBe('modified');
    expect(component.uncommittedFiles()[0].selected).toBe(true);  // Should default to selected
    expect(component.uncommittedFiles()[1].selected).toBe(true);  // All files should be selected by default
  });

  it('should have valid selection when files are loaded by default', () => {
    const mockChanges = [
      { path: 'test.ts', status: 'modified' },
      { path: 'another.ts', status: 'added' }
    ];

    // Simulate receiving uncommitted changes
    component['handleUncommittedChangesResponse'](mockChanges);

    // Should have valid selection because all files are selected by default
    expect(component.hasValidSelection()).toBe(true);
    expect(component.getSelectionSummary()).toBe('2/2 files selected');
  });

  it('should handle commit history response', () => {
    const mockCommits = [
      {
        hash: 'abc123',
        message: 'Test commit',
        author: 'Test Author',
        date: '2024-01-01T00:00:00.000Z',
        files: []
      }
    ];

    // Simulate receiving commit history
    component['handleCommitHistoryResponse'](mockCommits);

    expect(component.commits().length).toBe(1);
    expect(component.commits()[0].hash).toBe('abc123');
    expect(component.commits()[0].message).toBe('Test commit');
    expect(component.commits()[0].selected).toBe(false);  // Should start unselected
  });

  it('should refresh data correctly', () => {
    // Set some initial data
    component.uncommittedFiles.set([{ path: 'test.ts', status: 'modified', selected: true }]);
    component.commits.set([{ hash: 'abc', message: 'test', author: 'test', date: new Date(), files: [], selected: false }]);
    
    // Clear mock calls
    mockVscodeService.postMessage.mockClear();
    
    // Refresh data
    component.refreshData();
    
    // Should clear existing data
    expect(component.uncommittedFiles().length).toBe(0);
    expect(component.commits().length).toBe(0);
    expect(component.selectedCommits().length).toBe(0);
    
    // Should request new data
    expect(mockVscodeService.postMessage).toHaveBeenCalledWith('getUncommittedChanges');
    expect(mockVscodeService.postMessage).toHaveBeenCalledWith('getCommitHistory', { limit: 50 });
    expect(mockVscodeService.postMessage).toHaveBeenCalledWith('getBranchDiff');
  });

  // Multiple Commit Selection Tests
  describe('Multiple Commit Selection', () => {
    beforeEach(() => {
      // Setup test commits
      const testCommits = [
        { hash: 'commit1', message: 'Latest commit', author: 'Author', date: new Date('2024-01-03'), files: [], selected: false },
        { hash: 'commit2', message: 'Middle commit', author: 'Author', date: new Date('2024-01-02'), files: [], selected: false },
        { hash: 'commit3', message: 'Oldest commit', author: 'Author', date: new Date('2024-01-01'), files: [], selected: false }
      ];
      component.commits.set(testCommits);
      component.filteredCommits.set(testCommits);
      component.selectMode('commit');
    });

    it('should select single commit correctly', () => {
      const commits = component.filteredCommits();
      
      // Select middle commit
      component.selectCommit(commits[1]);
      
      // Should select commit1 and commit2 (from latest to selected)
      expect(commits[0].selected).toBe(true);  // commit1
      expect(commits[1].selected).toBe(true);  // commit2
      expect(commits[2].selected).toBe(false); // commit3
      
      expect(component.selectedCommits().length).toBe(2);
      expect(component.hasValidSelection()).toBe(true);
    });

    it('should select range from oldest commit to latest', () => {
      const commits = component.filteredCommits();
      
      // Select oldest commit
      component.selectCommit(commits[2]);
      
      // Should select all commits
      expect(commits[0].selected).toBe(true);  // commit1
      expect(commits[1].selected).toBe(true);  // commit2
      expect(commits[2].selected).toBe(true);  // commit3
      
      expect(component.selectedCommits().length).toBe(3);
    });

    it('should deselect commits correctly', () => {
      const commits = component.filteredCommits();
      
      // First, select all commits
      component.selectCommit(commits[2]);
      expect(component.selectedCommits().length).toBe(3);
      
      // Then deselect from middle commit
      component.selectCommit(commits[1]);
      
      // Should keep only the latest commit selected
      expect(commits[0].selected).toBe(true);  // commit1
      expect(commits[1].selected).toBe(false); // commit2
      expect(commits[2].selected).toBe(false); // commit3
      
      expect(component.selectedCommits().length).toBe(1);
    });

    it('should clear all selections', () => {
      const commits = component.filteredCommits();
      
      // Select some commits first
      component.selectCommit(commits[1]);
      expect(component.selectedCommits().length).toBe(2);
      
      // Clear selection
      component.clearCommitSelection();
      
      // All should be deselected
      expect(commits[0].selected).toBe(false);
      expect(commits[1].selected).toBe(false);
      expect(commits[2].selected).toBe(false);
      expect(component.selectedCommits().length).toBe(0);
      expect(component.hasValidSelection()).toBe(false);
    });

    it('should generate correct selection summary', () => {
      const commits = component.filteredCommits();
      
      // No selection
      expect(component.getSelectionSummary()).toBe('No commits selected');
      
      // Single commit
      component.selectCommit(commits[0]);
      expect(component.getSelectionSummary()).toBe('1 commit selected: commit1');
      
      // Multiple commits
      component.selectCommit(commits[2]);
      expect(component.getSelectionSummary()).toBe('3 commits selected: commit1...commit3');
    });

    it('should emit correct selection data', () => {
      jest.spyOn(component.selectionChanged, 'emit');
      const commits = component.filteredCommits();
      
      component.selectCommit(commits[1]);
      
      expect(component.selectionChanged.emit).toHaveBeenCalledWith({
        mode: 'commit',
        files: [],
        commits: expect.arrayContaining([
          expect.objectContaining({ hash: 'commit1', selected: true }),
          expect.objectContaining({ hash: 'commit2', selected: true })
        ]),
        diff: 'commit-range-commit2-to-commit1-diff'
      });
    });
  });

  // File Selection Tests
  describe('File Selection Behavior', () => {
    it('should toggle select all correctly with default selection', () => {
      const mockChanges = [
        { path: 'test.ts', status: 'modified' },
        { path: 'another.ts', status: 'added' }
      ];

      // Simulate receiving uncommitted changes (all selected by default)
      component['handleUncommittedChangesResponse'](mockChanges);
      
      // All should be selected by default
      expect(component.areAllSelected()).toBe(true);
      expect(component.uncommittedFiles().every(f => f.selected)).toBe(true);
      
      // Toggle to unselect all
      component.toggleSelectAll();
      expect(component.areAllSelected()).toBe(false);
      expect(component.uncommittedFiles().every(f => !f.selected)).toBe(true);
      
      // Toggle back to select all
      component.toggleSelectAll();
      expect(component.areAllSelected()).toBe(true);
      expect(component.uncommittedFiles().every(f => f.selected)).toBe(true);
    });

    it('should toggle individual file selection correctly', () => {
      const mockChanges = [
        { path: 'test.ts', status: 'modified' },
        { path: 'another.ts', status: 'added' }
      ];

      // Simulate receiving uncommitted changes (all selected by default)
      component['handleUncommittedChangesResponse'](mockChanges);
      
      const files = component.uncommittedFiles();
      expect(files[0].selected).toBe(true);
      
      // Deselect first file
      component.toggleFileSelection(files[0]);
      expect(component.uncommittedFiles()[0].selected).toBe(false);
      expect(component.areAllSelected()).toBe(false);
      
      // Select it back
      component.toggleFileSelection(files[0]);
      expect(component.uncommittedFiles()[0].selected).toBe(true);
      expect(component.areAllSelected()).toBe(true);
    });
  });
});
