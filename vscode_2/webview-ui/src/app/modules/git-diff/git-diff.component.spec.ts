import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GitDiffComponent, GitDiffDisplayData } from './git-diff.component';
import { VscodeService } from '../../services/vscode.service';
import { of, Subject } from 'rxjs';

describe('GitDiffComponent', () => {
  let component: GitDiffComponent;
  let fixture: ComponentFixture<GitDiffComponent>;
  let mockVscodeService: jasmine.SpyObj<VscodeService>;
  let messageSubject: Subject<any>;

  beforeEach(async () => {
    messageSubject = new Subject();
    mockVscodeService = jasmine.createSpyObj('VscodeService', ['postMessage', 'onMessage']);
    mockVscodeService.onMessage.and.returnValue(messageSubject.asObservable());

    await TestBed.configureTestingModule({
      imports: [GitDiffComponent],
      providers: [
        { provide: VscodeService, useValue: mockVscodeService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(GitDiffComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    messageSubject.complete();
  });

  describe('Component Initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize with default signals', () => {
      expect(component.diffData()).toBeNull();
      expect(component.streamingOutput()).toBe('');
      expect(component.wrapLines()).toBe(false);
      expect(component.isExpanded()).toBe(false);
    });

    it('should subscribe to vscode messages', () => {
      expect(mockVscodeService.onMessage).toHaveBeenCalled();
    });
  });

  describe('Diff Data Display', () => {
    it('should display diff mode label correctly', () => {
      const testData: GitDiffDisplayData = {
        mode: 'uncommitted',
        content: 'test diff content',
        timestamp: new Date(),
        status: 'complete'
      };
      
      component.diffData.set(testData);
      fixture.detectChanges();

      expect(component.getDiffModeLabel()).toBe('Uncommitted Changes');
    });

    it('should display branch-diff mode correctly', () => {
      const testData: GitDiffDisplayData = {
        mode: 'branch-diff',
        content: 'test diff content',
        timestamp: new Date(),
        status: 'complete'
      };
      
      component.diffData.set(testData);
      expect(component.getDiffModeLabel()).toBe('Branch to Main Diff');
    });

    it('should display commit mode correctly', () => {
      const testData: GitDiffDisplayData = {
        mode: 'commit',
        content: 'test diff content',
        timestamp: new Date(),
        status: 'complete'
      };
      
      component.diffData.set(testData);
      expect(component.getDiffModeLabel()).toBe('Commit Diff');
    });

    it('should calculate content size correctly', () => {
      const testData: GitDiffDisplayData = {
        mode: 'uncommitted',
        content: 'test'.repeat(100), // 400 bytes
        timestamp: new Date(),
        status: 'complete'
      };
      
      component.diffData.set(testData);
      const size = component.getContentSize();
      expect(size).toContain('bytes');
    });

    it('should extract filename from path correctly', () => {
      const testData: GitDiffDisplayData = {
        mode: 'uncommitted',
        content: 'test diff content',
        filePath: '/path/to/diff/file.diff',
        timestamp: new Date(),
        status: 'complete'
      };
      
      component.diffData.set(testData);
      expect(component.getFileName()).toBe('file.diff');
    });
  });

  describe('Status Display', () => {
    it('should show running status correctly', () => {
      const testData: GitDiffDisplayData = {
        mode: 'uncommitted',
        content: '',
        timestamp: new Date(),
        status: 'running'
      };
      
      component.diffData.set(testData);
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      expect(compiled.textContent).toContain('Generating diff...');
    });

    it('should show complete status correctly', () => {
      const testData: GitDiffDisplayData = {
        mode: 'uncommitted',
        content: 'diff content',
        timestamp: new Date(),
        status: 'complete'
      };
      
      component.diffData.set(testData);
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      expect(compiled.textContent).toContain('Diff completed');
    });

    it('should show error status correctly', () => {
      const testData: GitDiffDisplayData = {
        mode: 'uncommitted',
        content: '',
        timestamp: new Date(),
        status: 'error',
        error: 'Test error message'
      };
      
      component.diffData.set(testData);
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      expect(compiled.textContent).toContain('Error generating diff');
      expect(compiled.textContent).toContain('Test error message');
    });
  });

  describe('Message Handling', () => {
    it('should handle gitDiffProgress messages', () => {
      const progressMessage = {
        command: 'gitDiffProgress',
        data: { output: 'new output line\n' }
      };

      messageSubject.next(progressMessage);

      expect(component.streamingOutput()).toBe('new output line\n');
    });

    it('should accumulate streaming output', () => {
      component.streamingOutput.set('existing output\n');
      
      const progressMessage = {
        command: 'gitDiffProgress',
        data: { output: 'new output line\n' }
      };

      messageSubject.next(progressMessage);

      expect(component.streamingOutput()).toBe('existing output\nnew output line\n');
    });

    it('should handle gitDiffComplete messages', () => {
      const completeMessage = {
        command: 'gitDiffComplete',
        data: {
          mode: 'uncommitted',
          content: 'final diff content',
          timestamp: new Date(),
          status: 'complete'
        }
      };

      messageSubject.next(completeMessage);

      expect(component.diffData()).toEqual(completeMessage.data);
      expect(component.streamingOutput()).toBe(''); // Should clear streaming output
    });

    it('should handle gitDiffError messages', () => {
      const errorMessage = {
        command: 'gitDiffError',
        data: { error: 'Git command failed', mode: 'uncommitted' }
      };

      messageSubject.next(errorMessage);

      const diffData = component.diffData();
      expect(diffData?.status).toBe('error');
      expect(diffData?.error).toBe('Git command failed');
      expect(diffData?.mode).toBe('uncommitted');
    });

    it('should handle gitDiffFileDeleted messages', () => {
      const testData: GitDiffDisplayData = {
        mode: 'uncommitted',
        content: 'test content',
        filePath: '/path/to/file.diff',
        timestamp: new Date(),
        status: 'complete'
      };
      
      component.diffData.set(testData);

      const deleteMessage = {
        command: 'gitDiffFileDeleted',
        data: {}
      };

      messageSubject.next(deleteMessage);

      expect(component.diffData()?.filePath).toBeUndefined();
    });
  });

  describe('User Actions', () => {
    beforeEach(() => {
      const testData: GitDiffDisplayData = {
        mode: 'uncommitted',
        content: 'test diff content',
        filePath: '/path/to/diff.txt',
        timestamp: new Date(),
        status: 'complete'
      };
      component.diffData.set(testData);
    });

    it('should send rerunDiff message when rerun button clicked', () => {
      component.rerunDiff();

      expect(mockVscodeService.postMessage).toHaveBeenCalledWith('rerunGitDiff', { mode: 'uncommitted' });
    });

    it('should update status to running when rerunning diff', () => {
      component.rerunDiff();

      expect(component.diffData()?.status).toBe('running');
      expect(component.streamingOutput()).toBe('');
    });

    it('should send openDiffFile message when open file button clicked', () => {
      component.openDiffFile();

      expect(mockVscodeService.postMessage).toHaveBeenCalledWith('openDiffFile', { filePath: '/path/to/diff.txt' });
    });

    it('should send deleteDiffFile message when delete button clicked', () => {
      component.deleteDiffFile();

      expect(mockVscodeService.postMessage).toHaveBeenCalledWith('deleteDiffFile', { filePath: '/path/to/diff.txt' });
    });

    it('should send navigation message when back to file selection clicked', () => {
      component.backToFileSelection();

      expect(mockVscodeService.postMessage).toHaveBeenCalledWith('navigateToModule', { module: 'file-selection' });
    });

    it('should toggle expanded state', () => {
      expect(component.isExpanded()).toBe(false);
      
      component.toggleExpanded();
      expect(component.isExpanded()).toBe(true);
      
      component.toggleExpanded();
      expect(component.isExpanded()).toBe(false);
    });
  });

  describe('Clipboard Operations', () => {
    beforeEach(() => {
      // Mock clipboard API
      const mockClipboard = {
        writeText: jasmine.createSpy('writeText').and.returnValue(Promise.resolve())
      };
      Object.defineProperty(navigator, 'clipboard', {
        value: mockClipboard,
        writable: true
      });
    });

    it('should copy content to clipboard successfully', async () => {
      const testData: GitDiffDisplayData = {
        mode: 'uncommitted',
        content: 'test diff content to copy',
        timestamp: new Date(),
        status: 'complete'
      };
      component.diffData.set(testData);

      component.copyToClipboard();

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('test diff content to copy');
    });

    it('should handle clipboard copy failure', async () => {
      const testData: GitDiffDisplayData = {
        mode: 'uncommitted',
        content: 'test diff content',
        timestamp: new Date(),
        status: 'complete'
      };
      component.diffData.set(testData);

      // Mock clipboard failure
      (navigator.clipboard.writeText as jasmine.Spy).and.returnValue(Promise.reject('Copy failed'));

      component.copyToClipboard();

      // Wait for promise to resolve
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockVscodeService.postMessage).toHaveBeenCalledWith('showNotification', {
        message: 'Failed to copy to clipboard',
        type: 'error'
      });
    });
  });

  describe('UI State Management', () => {
    it('should compute max height based on expanded state', () => {
      expect(component.maxHeight()).toBe(400); // Default collapsed height
      
      component.isExpanded.set(true);
      expect(component.maxHeight()).toBe(800); // Expanded height
    });

    it('should detect truncated content correctly', () => {
      const shortContent = 'line1\nline2\nline3';
      const longContent = Array.from({ length: 25 }, (_, i) => `line${i + 1}`).join('\n');

      // Short content should not be truncated
      component.diffData.set({
        mode: 'uncommitted',
        content: shortContent,
        timestamp: new Date(),
        status: 'complete'
      });
      expect(component.isTruncated()).toBe(false);

      // Long content should be truncated
      component.diffData.set({
        mode: 'uncommitted',
        content: longContent,
        timestamp: new Date(),
        status: 'complete'
      });
      expect(component.isTruncated()).toBe(true);
    });
  });

  describe('Component Cleanup', () => {
    it('should unsubscribe on destroy', () => {
      spyOn(component['subscription'], 'unsubscribe');
      
      component.ngOnDestroy();
      
      expect(component['subscription'].unsubscribe).toHaveBeenCalled();
    });
  });
});
