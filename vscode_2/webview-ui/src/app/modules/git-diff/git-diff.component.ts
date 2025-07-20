import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, ChangeDetectionStrategy, signal, computed, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { VscodeService } from '../../services/vscode.service';
import { Subscription } from 'rxjs';

export interface GitDiffDisplayData {
  mode: 'uncommitted' | 'commit' | 'branch-diff';
  content: string;
  filePath?: string;
  timestamp: Date;
  status: 'running' | 'complete' | 'error';
  error?: string;
}

@Component({
  selector: 'app-git-diff',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="max-w-6xl mx-auto">
      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-xl font-bold flex items-center gap-3">
          <span class="text-2xl">📋</span>
          Git Diff Output
        </h2>
        
        <div class="flex items-center gap-3">
          @if (diffData()?.status === 'running') {
            <div class="flex items-center gap-2 text-vscode-progressBar-foreground">
              <div class="spinner"></div>
              <span class="text-sm">Generating diff...</span>
            </div>
          }
          
          @if (diffData()?.status === 'complete') {
            <span class="text-sm text-vscode-testing-iconPassed">
              ✅ Diff completed at {{ diffData()?.timestamp | date:'short' }}
            </span>
          }
          
          @if (diffData()?.status === 'error') {
            <span class="text-sm text-vscode-testing-iconFailed">
              ❌ Error generating diff
            </span>
          }
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="flex items-center gap-3 mb-6">
        <button
          (click)="rerunDiff()"
          [disabled]="diffData()?.status === 'running'"
          class="px-4 py-2 bg-vscode-button-background text-vscode-button-foreground rounded hover:bg-vscode-button-hoverBackground disabled:opacity-50 disabled:cursor-not-allowed">
          <span class="flex items-center gap-2">
            <span>🔄</span>
            @if (diffData()?.status === 'running') {
              <span>Running...</span>
            } @else {
              <span>Rerun Diff</span>
            }
          </span>
        </button>

        @if (diffData()?.filePath) {
          <button
            (click)="openDiffFile()"
            class="px-4 py-2 bg-vscode-button-secondaryBackground text-vscode-button-secondaryForeground rounded hover:bg-vscode-button-secondaryHoverBackground">
            <span class="flex items-center gap-2">
              <span>📁</span>
              <span>Open Diff File</span>
            </span>
          </button>
        }

        @if (diffData()?.filePath) {
          <button
            (click)="deleteDiffFile()"
            [disabled]="diffData()?.status === 'running'"
            class="px-4 py-2 bg-vscode-testing-iconErrored text-white rounded hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed">
            <span class="flex items-center gap-2">
              <span>🗑️</span>
              <span>Delete File</span>
            </span>
          </button>
        }

        <button
          (click)="copyToClipboard()"
          [disabled]="!diffData()?.content || diffData()?.status !== 'complete'"
          class="px-4 py-2 bg-vscode-button-secondaryBackground text-vscode-button-secondaryForeground rounded hover:bg-vscode-button-secondaryHoverBackground disabled:opacity-50">
          <span class="flex items-center gap-2">
            <span>📋</span>
            <span>Copy to Clipboard</span>
          </span>
        </button>
      </div>

      <!-- Error Display -->
      @if (diffData()?.status === 'error' && diffData()?.error) {
        <div class="mb-6 p-4 bg-vscode-inputValidation-errorBackground border border-vscode-inputValidation-errorBorder rounded">
          <div class="flex items-center gap-2 mb-2">
            <span class="text-vscode-inputValidation-errorForeground">❌</span>
            <h3 class="font-semibold text-vscode-inputValidation-errorForeground">Error</h3>
          </div>
          <p class="text-vscode-inputValidation-errorForeground text-sm">{{ diffData()?.error }}</p>
        </div>
      }

      <!-- Diff Info -->
      @if (diffData()) {
        <div class="mb-4 p-3 bg-vscode-textBlockQuote-background border border-vscode-panel-border rounded">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span class="font-semibold text-vscode-textBlockQuote-foreground">Mode:</span>
              <span class="ml-2 text-vscode-foreground">{{ getDiffModeLabel() }}</span>
            </div>
            @if (diffData()?.filePath) {
              <div>
                <span class="font-semibold text-vscode-textBlockQuote-foreground">File:</span>
                <span class="ml-2 text-vscode-foreground font-mono text-xs">{{ getFileName() }}</span>
              </div>
            }
            <div>
              <span class="font-semibold text-vscode-textBlockQuote-foreground">Size:</span>
              <span class="ml-2 text-vscode-foreground">{{ getContentSize() }}</span>
            </div>
          </div>
        </div>
      }

      <!-- Real-time Output Stream -->
      @if (streamingOutput() && diffData()?.status === 'running') {
        <div class="mb-6">
          <h3 class="text-lg font-semibold mb-3 flex items-center gap-2">
            <span>📺</span>
            <span>Live Output</span>
          </h3>
          <div 
            #streamingContainer
            class="bg-vscode-terminal-background border border-vscode-panel-border rounded p-4 h-64 overflow-y-auto font-mono text-sm text-vscode-terminal-foreground">
            <pre>{{ streamingOutput() }}</pre>
          </div>
        </div>
      }

      <!-- Diff Content Display -->
      @if (diffData()?.content && diffData()?.status === 'complete') {
        <div>
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-lg font-semibold flex items-center gap-2">
              <span>📄</span>
              <span>Diff Content</span>
            </h3>
            
            <div class="flex items-center gap-2">
              <label class="text-sm text-vscode-descriptionForeground">
                <input 
                  type="checkbox" 
                  [(ngModel)]="wrapLines"
                  class="mr-2">
                Wrap lines
              </label>
            </div>
          </div>
          
          <div 
            class="bg-vscode-editor-background border border-vscode-panel-border rounded overflow-auto"
            [style.max-height.px]="maxHeight()">
            <pre 
              [class.whitespace-pre-wrap]="wrapLines"
              [class.whitespace-pre]="!wrapLines"
              class="p-4 text-sm font-mono text-vscode-editor-foreground">{{ diffData()?.content }}</pre>
          </div>
          
          @if (isTruncated()) {
            <div class="mt-2 text-center">
              <button
                (click)="toggleExpanded()"
                class="px-4 py-2 text-sm bg-vscode-button-secondaryBackground text-vscode-button-secondaryForeground rounded hover:bg-vscode-button-secondaryHoverBackground">
                @if (isExpanded()) {
                  <span>Show Less</span>
                } @else {
                  <span>Show More</span>
                }
              </button>
            </div>
          }
        </div>
      }

      <!-- Empty State -->
      @if (!diffData()) {
        <div class="text-center py-12">
          <div class="text-6xl mb-4">📋</div>
          <h3 class="text-xl font-semibold mb-2">No diff data available</h3>
          <p class="text-vscode-descriptionForeground mb-6">
            No git diff has been generated yet. Use the file selection module to generate a diff.
          </p>
          <button
            (click)="backToFileSelection()"
            class="px-6 py-3 bg-vscode-button-background text-vscode-button-foreground rounded hover:bg-vscode-button-hoverBackground">
            Go to File Selection
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    .spinner {
      border: 2px solid var(--vscode-progressBar-background);
      border-top: 2px solid var(--vscode-progressBar-foreground);
      border-radius: 50%;
      width: 16px;
      height: 16px;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    /* Custom scrollbar for the diff content */
    .overflow-auto {
      scrollbar-width: thin;
      scrollbar-color: var(--vscode-scrollbarSlider-background) var(--vscode-scrollbar-shadow);
    }

    .overflow-auto::-webkit-scrollbar {
      width: 8px;
      height: 8px;
    }

    .overflow-auto::-webkit-scrollbar-track {
      background: var(--vscode-scrollbar-shadow);
    }

    .overflow-auto::-webkit-scrollbar-thumb {
      background: var(--vscode-scrollbarSlider-background);
      border-radius: 4px;
    }

    .overflow-auto::-webkit-scrollbar-thumb:hover {
      background: var(--vscode-scrollbarSlider-hoverBackground);
    }
  `]
})
export class GitDiffComponent implements OnInit, OnDestroy {
  @Input() diffData = signal<GitDiffDisplayData | null>(null);
  @Output() backToOverview = new EventEmitter<void>();
  @ViewChild('streamingContainer') streamingContainer?: ElementRef<HTMLDivElement>;

  private subscription = new Subscription();
  
  // UI state
  streamingOutput = signal<string>('');
  wrapLines = signal<boolean>(false);
  isExpanded = signal<boolean>(false);
  
  // Computed properties
  maxHeight = computed(() => this.isExpanded() ? 800 : 400);
  isTruncated = computed(() => {
    const content = this.diffData()?.content;
    return content ? content.split('\n').length > 20 : false;
  });

  constructor(private vscode: VscodeService) {}

  ngOnInit(): void {
    this.subscription.add(
      this.vscode.onMessage().subscribe(message => {
        this.handleVscodeMessage(message);
      })
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  private handleVscodeMessage(message: any): void {
    switch (message.command) {
      case 'gitDiffProgress':
        this.handleDiffProgress(message.data);
        break;
      case 'gitDiffComplete':
        this.handleDiffComplete(message.data);
        break;
      case 'gitDiffError':
        this.handleDiffError(message.data);
        break;
      case 'gitDiffFileDeleted':
        this.handleFileDeleted();
        break;
    }
  }

  private handleDiffProgress(data: { output: string }): void {
    const current = this.streamingOutput();
    this.streamingOutput.set(current + data.output);
    
    // Auto-scroll to bottom
    setTimeout(() => {
      if (this.streamingContainer) {
        const element = this.streamingContainer.nativeElement;
        element.scrollTop = element.scrollHeight;
      }
    }, 10);
  }

  private handleDiffComplete(data: GitDiffDisplayData): void {
    this.diffData.set(data);
    this.streamingOutput.set(''); // Clear streaming output when complete
  }

  private handleDiffError(data: { error: string; mode: string }): void {
    const errorData: GitDiffDisplayData = {
      mode: data.mode as any,
      content: '',
      timestamp: new Date(),
      status: 'error',
      error: data.error
    };
    this.diffData.set(errorData);
    this.streamingOutput.set(''); // Clear streaming output on error
  }

  private handleFileDeleted(): void {
    const current = this.diffData();
    if (current) {
      this.diffData.set({
        ...current,
        filePath: undefined
      });
    }
  }

  // Action methods
  rerunDiff(): void {
    const current = this.diffData();
    if (!current) return;

    // Reset state
    this.streamingOutput.set('');
    this.diffData.set({
      ...current,
      status: 'running',
      error: undefined
    });

    // Request rerun from backend
    this.vscode.postMessage('rerunGitDiff', { mode: current.mode });
  }

  openDiffFile(): void {
    const filePath = this.diffData()?.filePath;
    if (filePath) {
      this.vscode.postMessage('openDiffFile', { filePath });
    }
  }

  deleteDiffFile(): void {
    const filePath = this.diffData()?.filePath;
    if (filePath) {
      this.vscode.postMessage('deleteDiffFile', { filePath });
    }
  }

  copyToClipboard(): void {
    const content = this.diffData()?.content;
    if (content) {
      navigator.clipboard.writeText(content).then(() => {
        this.vscode.postMessage('showNotification', { 
          message: 'Diff content copied to clipboard!',
          type: 'info'
        });
      }).catch(error => {
        console.error('Failed to copy to clipboard:', error);
        this.vscode.postMessage('showNotification', { 
          message: 'Failed to copy to clipboard',
          type: 'error'
        });
      });
    }
  }

  backToFileSelection(): void {
    this.vscode.postMessage('navigateToModule', { module: 'file-selection' });
  }

  toggleExpanded(): void {
    this.isExpanded.set(!this.isExpanded());
  }

  // Helper methods
  getDiffModeLabel(): string {
    const mode = this.diffData()?.mode;
    switch (mode) {
      case 'uncommitted':
        return 'Uncommitted Changes';
      case 'commit':
        return 'Commit Diff';
      case 'branch-diff':
        return 'Branch to Main Diff';
      default:
        return 'Unknown';
    }
  }

  getFileName(): string {
    const filePath = this.diffData()?.filePath;
    if (!filePath) return '';
    return filePath.split('/').pop() || filePath;
  }

  getContentSize(): string {
    const content = this.diffData()?.content;
    if (!content) return '0 bytes';
    
    const bytes = new Blob([content]).size;
    if (bytes < 1024) return `${bytes} bytes`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }
}
