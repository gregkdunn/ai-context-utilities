import { Component, Output, EventEmitter, signal, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { VscodeService } from '../../services/vscode.service';

export interface FileChange {
  path: string;
  status: 'added' | 'modified' | 'deleted';
  selected: boolean;
}

export interface GitCommit {
  hash: string;
  message: string;
  author: string;
  date: Date;
  files: string[];
  selected: boolean;
}

export interface FileSelection {
  mode: 'uncommitted' | 'commit' | 'branch-diff';
  files: FileChange[];
  commits?: GitCommit[];  // Changed from single commit to multiple commits
  diff?: string;
}

@Component({
  selector: 'app-file-selector',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-vscode-editor-background p-4 rounded-lg border border-vscode-panel-border">
      <div class="flex items-center justify-between mb-6">
        <h3 class="text-vscode-foreground text-lg font-semibold">File Selection</h3>
        <div class="text-vscode-descriptionForeground text-sm">
          {{ getSelectionSummary() }}
        </div>
      </div>

      <!-- Mode Selection -->
      <div class="mb-6">
        <label class="text-vscode-foreground text-sm font-medium mb-3 block">
          Select Changes From:
        </label>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
          @for (mode of selectionModes; track mode.type) {
            <button 
              (click)="selectMode(mode.type)"
              [class]="getModeButtonClass(mode.type)"
              class="px-4 py-3 rounded text-sm font-medium transition-colors">
              <div class="flex items-center gap-2">
                <span>{{ mode.icon }}</span>
                <span>{{ mode.label }}</span>
              </div>
              <div class="text-xs opacity-75 mt-1">{{ mode.description }}</div>
            </button>
          }
        </div>
      </div>

      <!-- Uncommitted Changes View -->
      @if (currentMode() === 'uncommitted') {
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <h4 class="text-vscode-foreground font-medium">Uncommitted Changes</h4>
            <button 
              (click)="toggleSelectAll()"
              class="text-vscode-button-background hover:text-vscode-button-hoverBackground text-sm">
              {{ areAllSelected() ? 'Unselect All' : 'Select All' }}
            </button>
          </div>
          
          @if (isLoadingData()) {
            <div class="text-vscode-descriptionForeground text-center py-8">
              <div class="text-2xl mb-2 animate-spin">⏳</div>
              <p>Loading uncommitted changes...</p>
            </div>
          } @else if (uncommittedFiles().length === 0) {
            <div class="text-vscode-descriptionForeground text-center py-8">
              <div class="text-4xl mb-2">📝</div>
              <p>No uncommitted changes found</p>
              <p class="text-xs">Make some changes to see them here</p>
            </div>
          } @else {
            <div class="space-y-2 max-h-64 overflow-y-auto border border-vscode-panel-border rounded p-2">
              @for (file of uncommittedFiles(); track file.path) {
                <div class="flex items-center gap-3 p-2 rounded hover:bg-vscode-list-hoverBackground">
                  <input 
                    type="checkbox" 
                    [checked]="file.selected"
                    (change)="toggleFileSelection(file)"
                    class="w-4 h-4 rounded border-vscode-checkbox-border bg-vscode-checkbox-background">
                  <span class="flex-1 text-vscode-foreground text-sm font-mono truncate">
                    {{ file.path }}
                  </span>
                  <span [class]="getStatusBadgeClass(file.status)" class="px-2 py-1 text-xs rounded font-medium">
                    {{ file.status.toUpperCase() }}
                  </span>
                </div>
              }
            </div>
          }
        </div>
      }

      <!-- Commit Selection View -->
      @if (currentMode() === 'commit') {
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <h4 class="text-vscode-foreground font-medium">Select Commits</h4>
            @if (selectedCommits().length > 0) {
              <button 
                (click)="clearCommitSelection()"
                class="text-vscode-button-background hover:text-vscode-button-hoverBackground text-sm">
                Clear Selection ({{ selectedCommits().length }})
              </button>
            }
          </div>
          
          <div class="bg-vscode-textBlockQuote-background border border-vscode-panel-border rounded p-3 text-xs">
            <p class="text-vscode-textBlockQuote-foreground">
              <span class="font-semibold">💡 Multi-commit selection:</span>
              Click a commit to select all commits from that point to the latest.
              Click a selected commit to deselect it and all commits after it.
            </p>
          </div>
          
          <div class="mb-3">
            <input 
              type="text"
              [(ngModel)]="commitSearch"
              (input)="filterCommits()"
              placeholder="Search commits by message or hash..."
              class="w-full px-3 py-2 bg-vscode-input-background text-vscode-input-foreground border border-vscode-input-border rounded focus:border-vscode-inputOption-activeBorder">
          </div>
          
          @if (isLoadingData()) {
            <div class="text-vscode-descriptionForeground text-center py-8">
              <div class="text-2xl mb-2 animate-spin">⏳</div>
              <p>Loading commit history...</p>
            </div>
          } @else if (filteredCommits().length === 0) {
            <div class="text-vscode-descriptionForeground text-center py-8">
              <div class="text-4xl mb-2">🔍</div>
              <p>No commits found</p>
              @if (commitSearch) {
                <p class="text-xs">Try a different search term</p>
              }
            </div>
          } @else {
            <div class="space-y-2 max-h-64 overflow-y-auto border border-vscode-panel-border rounded p-2">
              @for (commit of filteredCommits(); track commit.hash) {
                <div 
                  (click)="selectCommit(commit)"
                  class="p-3 rounded hover:bg-vscode-list-hoverBackground cursor-pointer transition-colors border-l-4"
                  [class.bg-vscode-list-activeSelectionBackground]="commit.selected"
                  [class.border-l-vscode-button-background]="commit.selected"
                  [class.border-l-transparent]="!commit.selected">
                  <div class="flex items-start gap-3">
                    <span class="text-vscode-descriptionForeground text-xs font-mono mt-1">
                      {{ commit.hash.substring(0, 7) }}
                    </span>
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center gap-2">
                        @if (commit.selected) {
                          <span class="text-vscode-button-background text-sm">✓</span>
                        }
                        <div class="text-vscode-foreground text-sm font-medium truncate">
                          {{ commit.message }}
                        </div>
                      </div>
                      <div class="text-vscode-descriptionForeground text-xs mt-1 flex items-center gap-4">
                        <span>{{ commit.author }}</span>
                        <span>{{ formatDate(commit.date) }}</span>
                        @if (commit.files.length > 0) {
                          <span>{{ commit.files.length }} file(s)</span>
                        }
                      </div>
                    </div>
                  </div>
                </div>
              }
            </div>
          }
        </div>
      }

      <!-- Branch Diff View -->
      @if (currentMode() === 'branch-diff') {
        <div class="space-y-3">
          <h4 class="text-vscode-foreground font-medium">Branch to Main Diff</h4>
          
          <div class="bg-vscode-textBlockQuote-background border border-vscode-panel-border rounded p-4">
            <div class="flex items-center gap-2 mb-3">
              <span class="text-2xl">🌿</span>
              <div>
                <p class="text-vscode-textBlockQuote-foreground text-sm font-medium">
                  Comparing current branch to main
                </p>
                <p class="text-vscode-descriptionForeground text-xs">
                  All changes from your branch will be included
                </p>
              </div>
            </div>
            
            @if (isLoadingData()) {
              <div class="text-center py-4">
                <div class="text-xl mb-2 animate-spin">⏳</div>
                <p class="text-xs">Loading branch diff...</p>
              </div>
            } @else if (branchDiffStats()) {
              <div class="flex flex-wrap gap-4 text-xs">
                <span class="text-vscode-foreground">
                  <span class="font-semibold">{{ branchDiffStats()!.filesChanged }}</span> files changed
                </span>
                <span class="text-vscode-gitDecoration-addedResourceForeground">
                  +{{ branchDiffStats()!.additions }} additions
                </span>
                <span class="text-vscode-gitDecoration-deletedResourceForeground">
                  -{{ branchDiffStats()!.deletions }} deletions
                </span>
              </div>
            } @else {
              <div class="text-center py-4">
                <p class="text-xs text-vscode-descriptionForeground">No diff available</p>
              </div>
            }
          </div>
        </div>
      }

      <!-- Action Buttons -->
      <div class="mt-6 flex gap-3 justify-end">
        <button 
          (click)="refreshData()"
          [disabled]="isLoadingData()"
          class="px-4 py-2 text-sm bg-vscode-button-secondaryBackground text-vscode-button-secondaryForeground rounded hover:bg-vscode-button-secondaryHoverBackground disabled:opacity-50">
          @if (isLoadingData()) {
            <span class="animate-spin">⏳</span> Loading
          } @else {
            🔄 Refresh
          }
        </button>
        <button 
          (click)="generateAndViewDiff()"
          [disabled]="!hasValidSelection() || isGeneratingDiff()"
          class="px-4 py-2 text-sm bg-vscode-button-background text-vscode-button-foreground rounded hover:bg-vscode-button-hoverBackground disabled:opacity-50 disabled:cursor-not-allowed">
          @if (isGeneratingDiff()) {
            <span class="animate-spin">⏳</span> Generating...
          } @else {
            📄 View Diff
          }
        </button>
        <button 
          (click)="applySelection()"
          [disabled]="!hasValidSelection()"
          class="px-4 py-2 text-sm bg-vscode-button-background text-vscode-button-foreground rounded hover:bg-vscode-button-hoverBackground disabled:opacity-50 disabled:cursor-not-allowed">
          Apply Selection
        </button>
      </div>

      <!-- Integrated Git Diff Display -->
      @if (showDiffDisplay()) {
        <div class="mt-6 border-t border-vscode-panel-border pt-6">
          <div class="flex items-center justify-between mb-4">
            <h4 class="text-vscode-foreground font-semibold flex items-center gap-2">
              <span>📄</span>
              <span>Git Diff Output</span>
            </h4>
            
            <div class="flex items-center gap-2">
              @if (isGeneratingDiff()) {
                <div class="flex items-center gap-2 text-vscode-progressBar-foreground">
                  <div class="spinner"></div>
                  <span class="text-sm">Generating diff...</span>
                </div>
              } @else if (diffDisplayData()?.status === 'complete') {
                <span class="text-sm text-vscode-testing-iconPassed">
                  ✅ Diff completed at {{ diffDisplayData()?.timestamp | date:'short' }}
                </span>
              } @else if (diffDisplayData()?.status === 'error') {
                <span class="text-sm text-vscode-testing-iconFailed">
                  ❌ Error generating diff
                </span>
              }
              
              <button
                (click)="closeDiffDisplay()"
                class="px-2 py-1 text-xs bg-vscode-button-secondaryBackground text-vscode-button-secondaryForeground rounded hover:bg-vscode-button-secondaryHoverBackground">
                × Close
              </button>
            </div>
          </div>

          <!-- Diff Action Buttons -->
          <div class="flex items-center gap-2 mb-4">
            <button
              (click)="rerunDiff()"
              [disabled]="isGeneratingDiff()"
              class="px-3 py-1 text-sm bg-vscode-button-background text-vscode-button-foreground rounded hover:bg-vscode-button-hoverBackground disabled:opacity-50">
              <span class="flex items-center gap-1">
                <span>🔄</span>
                @if (isGeneratingDiff()) {
                  <span>Running...</span>
                } @else {
                  <span>Rerun</span>
                }
              </span>
            </button>

            @if (diffDisplayData()?.filePath) {
              <button
                (click)="openDiffFile()"
                class="px-3 py-1 text-sm bg-vscode-button-secondaryBackground text-vscode-button-secondaryForeground rounded hover:bg-vscode-button-secondaryHoverBackground">
                <span class="flex items-center gap-1">
                  <span>📁</span>
                  <span>Open File</span>
                </span>
              </button>
            }

            <button
              (click)="copyDiffToClipboard()"
              [disabled]="!diffDisplayData()?.content || diffDisplayData()?.status !== 'complete'"
              class="px-3 py-1 text-sm bg-vscode-button-secondaryBackground text-vscode-button-secondaryForeground rounded hover:bg-vscode-button-secondaryHoverBackground disabled:opacity-50">
              <span class="flex items-center gap-1">
                <span>📋</span>
                <span>Copy</span>
              </span>
            </button>

            @if (diffDisplayData()?.filePath) {
              <button
                (click)="deleteDiffFile()"
                [disabled]="isGeneratingDiff()"
                class="px-3 py-1 text-sm bg-vscode-testing-iconErrored text-white rounded hover:bg-red-600 disabled:opacity-50">
                <span class="flex items-center gap-1">
                  <span>🗑️</span>
                  <span>Delete</span>
                </span>
              </button>
            }
          </div>

          <!-- Error Display -->
          @if (diffDisplayData()?.status === 'error' && diffDisplayData()?.error) {
            <div class="mb-4 p-3 bg-vscode-inputValidation-errorBackground border border-vscode-inputValidation-errorBorder rounded">
              <div class="flex items-center gap-2 mb-2">
                <span class="text-vscode-inputValidation-errorForeground">❌</span>
                <h5 class="font-medium text-vscode-inputValidation-errorForeground">Error</h5>
              </div>
              <p class="text-vscode-inputValidation-errorForeground text-sm">{{ diffDisplayData()?.error }}</p>
            </div>
          }

          <!-- Streaming Output Display -->
          @if (streamingOutput() && isGeneratingDiff()) {
            <div class="mb-4">
              <h5 class="text-sm font-medium mb-2 flex items-center gap-2">
                <span>📺</span>
                <span>Live Output</span>
              </h5>
              <div class="bg-vscode-terminal-background border border-vscode-panel-border rounded p-3 h-48 overflow-y-auto font-mono text-sm text-vscode-terminal-foreground">
                <pre>{{ streamingOutput() }}</pre>
              </div>
            </div>
          }

          <!-- Diff Content Display -->
          @if (diffDisplayData()?.content && diffDisplayData()?.status === 'complete') {
            <div>
              <div class="flex items-center justify-between mb-3">
                <h5 class="text-sm font-medium flex items-center gap-2">
                  <span>📄</span>
                  <span>Diff Content ({{ getDiffModeLabel() }})</span>
                </h5>
                
                <div class="flex items-center gap-2 text-xs">
                  <label class="text-vscode-descriptionForeground">
                    <input 
                      type="checkbox" 
                      [(ngModel)]="wrapLines"
                      class="mr-1">
                    Wrap lines
                  </label>
                  
                  @if (diffDisplayData()?.filePath) {
                    <span class="text-vscode-descriptionForeground">
                      Size: {{ getContentSize() }}
                    </span>
                  }
                </div>
              </div>
              
              <div 
                class="bg-vscode-editor-background border border-vscode-panel-border rounded overflow-auto"
                [style.max-height.px]="maxDiffHeight()">
                <pre 
                  [class.whitespace-pre-wrap]="wrapLines"
                  [class.whitespace-pre]="!wrapLines"
                  class="p-3 text-sm font-mono text-vscode-editor-foreground">{{ diffDisplayData()?.content }}</pre>
              </div>
              
              @if (isDiffTruncated()) {
                <div class="mt-2 text-center">
                  <button
                    (click)="toggleDiffExpanded()"
                    class="px-3 py-1 text-sm bg-vscode-button-secondaryBackground text-vscode-button-secondaryForeground rounded hover:bg-vscode-button-secondaryHoverBackground">
                    @if (isDiffExpanded()) {
                      <span>Show Less</span>
                    } @else {
                      <span>Show More</span>
                    }
                  </button>
                </div>
              }
            </div>
          }
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
  `]
})
export class FileSelectorComponent implements OnInit, OnDestroy {
  @Output() selectionChanged = new EventEmitter<FileSelection>();
  
  private subscriptions = new Subscription();
  isLoadingData = signal<boolean>(false);
  isGeneratingDiff = signal<boolean>(false);
  showDiffDisplay = signal<boolean>(false);
  diffDisplayData = signal<any>(null);
  streamingOutput = signal<string>('');
  wrapLines = signal<boolean>(false);
  isDiffExpanded = signal<boolean>(false);

  selectionModes = [
    { 
      type: 'uncommitted' as const, 
      label: 'Uncommitted', 
      icon: '📝',
      description: 'Changes not yet committed'
    },
    { 
      type: 'commit' as const, 
      label: 'Previous Commit', 
      icon: '📚',
      description: 'Select from git history'
    },
    { 
      type: 'branch-diff' as const, 
      label: 'Branch Diff', 
      icon: '🌿',
      description: 'All changes from current branch'
    }
  ];

  currentMode = signal<'uncommitted' | 'commit' | 'branch-diff'>('uncommitted');
  uncommittedFiles = signal<FileChange[]>([]);
  commits = signal<GitCommit[]>([]);
  filteredCommits = signal<GitCommit[]>([]);
  selectedCommits = signal<GitCommit[]>([]);  // Changed to array for multiple selection
  branchDiffStats = signal<{ filesChanged: number; additions: number; deletions: number } | null>(null);
  
  commitSearch = '';

  ngOnInit() {
    this.setupMessageHandlers();
    this.loadInitialData();
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  constructor(private vscode: VscodeService) {}

  selectMode(mode: 'uncommitted' | 'commit' | 'branch-diff') {
    this.currentMode.set(mode);
    this.emitSelection();
  }

  getModeButtonClass(mode: string): string {
    const baseClass = 'border transition-all duration-200';
    if (this.currentMode() === mode) {
      return `${baseClass} bg-vscode-button-background text-vscode-button-foreground border-vscode-button-background`;
    }
    return `${baseClass} bg-vscode-button-secondaryBackground text-vscode-button-secondaryForeground border-vscode-panel-border hover:bg-vscode-list-hoverBackground`;
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'added':
        return 'bg-green-100 text-green-800 border border-green-200';
      case 'modified':
        return 'bg-blue-100 text-blue-800 border border-blue-200';
      case 'deleted':
        return 'bg-red-100 text-red-800 border border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border border-gray-200';
    }
  }

  toggleFileSelection(file: FileChange) {
    const files = this.uncommittedFiles();
    const index = files.findIndex(f => f.path === file.path);
    if (index !== -1) {
      files[index].selected = !files[index].selected;
      this.uncommittedFiles.set([...files]);
      this.emitSelection();
    }
  }

  toggleSelectAll() {
    const files = this.uncommittedFiles();
    const allSelected = this.areAllSelected();
    files.forEach(f => f.selected = !allSelected);
    this.uncommittedFiles.set([...files]);
    this.emitSelection();
  }

  areAllSelected(): boolean {
    const files = this.uncommittedFiles();
    return files.length > 0 && files.every(f => f.selected);
  }

  selectCommit(commit: GitCommit) {
    const commits = this.filteredCommits();
    const clickedIndex = commits.findIndex(c => c.hash === commit.hash);
    
    if (clickedIndex === -1) return;
    
    // If commit is already selected, deselect it and all commits after it
    if (commit.selected) {
      this.deselectCommitAndAfter(clickedIndex);
    } else {
      // Select from this commit to the latest (index 0)
      this.selectCommitRange(0, clickedIndex);
    }
    
    this.updateSelectedCommits();
    this.emitSelection();
  }
  
  private selectCommitRange(startIndex: number, endIndex: number) {
    const commits = this.filteredCommits();
    
    // Clear all selections first
    commits.forEach(c => c.selected = false);
    
    // Select range from start to end (inclusive)
    for (let i = startIndex; i <= endIndex; i++) {
      if (commits[i]) {
        commits[i].selected = true;
      }
    }
    
    this.filteredCommits.set([...commits]);
    
    // Also update the main commits array if they're different
    if (this.commitSearch) {
      const allCommits = this.commits();
      commits.forEach(filteredCommit => {
        const mainCommit = allCommits.find(c => c.hash === filteredCommit.hash);
        if (mainCommit) {
          mainCommit.selected = filteredCommit.selected;
        }
      });
      this.commits.set([...allCommits]);
    }
  }
  
  private deselectCommitAndAfter(fromIndex: number) {
    const commits = this.filteredCommits();
    
    // Deselect from clicked commit to the end
    for (let i = fromIndex; i < commits.length; i++) {
      if (commits[i]) {
        commits[i].selected = false;
      }
    }
    
    this.filteredCommits.set([...commits]);
    
    // Also update the main commits array if they're different
    if (this.commitSearch) {
      const allCommits = this.commits();
      commits.forEach(filteredCommit => {
        const mainCommit = allCommits.find(c => c.hash === filteredCommit.hash);
        if (mainCommit) {
          mainCommit.selected = filteredCommit.selected;
        }
      });
      this.commits.set([...allCommits]);
    }
  }
  
  private updateSelectedCommits() {
    const selectedCommits = this.filteredCommits().filter(c => c.selected);
    this.selectedCommits.set(selectedCommits);
  }
  
  clearCommitSelection() {
    const commits = this.filteredCommits();
    commits.forEach(c => c.selected = false);
    this.filteredCommits.set([...commits]);
    
    const allCommits = this.commits();
    allCommits.forEach(c => c.selected = false);
    this.commits.set([...allCommits]);
    
    this.selectedCommits.set([]);
    this.emitSelection();
  }

  filterCommits() {
    const search = this.commitSearch.toLowerCase();
    const filtered = this.commits().filter(commit => 
      commit.message.toLowerCase().includes(search) ||
      commit.hash.toLowerCase().includes(search) ||
      commit.author.toLowerCase().includes(search)
    );
    this.filteredCommits.set(filtered);
  }

  formatDate(date: Date): string {
    return new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
      .format(Math.floor((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24)), 'day');
  }

  hasValidSelection(): boolean {
    switch (this.currentMode()) {
      case 'uncommitted':
        return this.uncommittedFiles().some(f => f.selected);
      case 'commit':
        return this.selectedCommits().length > 0;
      case 'branch-diff':
        return this.branchDiffStats() !== null;
      default:
        return false;
    }
  }

  getSelectionSummary(): string {
    switch (this.currentMode()) {
      case 'uncommitted':
        const selected = this.uncommittedFiles().filter(f => f.selected).length;
        const total = this.uncommittedFiles().length;
        return `${selected}/${total} files selected`;
      case 'commit':
        const selectedCommits = this.selectedCommits();
        if (selectedCommits.length === 0) {
          return 'No commits selected';
        } else if (selectedCommits.length === 1) {
          return `1 commit selected: ${selectedCommits[0].hash.substring(0, 7)}`;
        } else {
          const latest = selectedCommits[0].hash.substring(0, 7);
          const oldest = selectedCommits[selectedCommits.length - 1].hash.substring(0, 7);
          return `${selectedCommits.length} commits selected: ${latest}...${oldest}`;
        }
      case 'branch-diff':
        return this.branchDiffStats() ? `${this.branchDiffStats()!.filesChanged} files in diff` : 'Loading diff...';
      default:
        return '';
    }
  }

  refreshData() {
    // Clear current data
    this.uncommittedFiles.set([]);
    this.commits.set([]);
    this.filteredCommits.set([]);
    this.branchDiffStats.set(null);
    this.selectedCommits.set([]);
    
    // Reload from Git
    this.loadInitialData();
  }

  applySelection() {
    this.emitSelection();
  }

  generateAndViewDiff() {
    if (!this.hasValidSelection()) return;

    this.isGeneratingDiff.set(true);
    this.showDiffDisplay.set(true);
    this.streamingOutput.set('');
    
    const mode = this.currentMode();
    let diffData: any = { mode };

    // Add specific data based on mode
    switch (mode) {
      case 'commit':
        const selectedCommits = this.selectedCommits();
        if (selectedCommits.length === 1) {
          diffData.commitHash = selectedCommits[0].hash;
        } else if (selectedCommits.length > 1) {
          // For multiple commits, use the oldest commit hash
          diffData.commitHash = selectedCommits[selectedCommits.length - 1].hash;
        }
        break;
      case 'uncommitted':
      case 'branch-diff':
        // No additional data needed
        break;
    }

    // Send message to generate diff
    this.vscode.postMessage('generateGitDiff', diffData);
  }

  closeDiffDisplay() {
    this.showDiffDisplay.set(false);
    this.diffDisplayData.set(null);
    this.streamingOutput.set('');
  }

  rerunDiff() {
    if (!this.diffDisplayData()) return;
    
    const mode = this.currentMode();
    let diffData: any = { mode };

    // Add specific data based on mode
    switch (mode) {
      case 'commit':
        const selectedCommits = this.selectedCommits();
        if (selectedCommits.length === 1) {
          diffData.commitHash = selectedCommits[0].hash;
        } else if (selectedCommits.length > 1) {
          diffData.commitHash = selectedCommits[selectedCommits.length - 1].hash;
        }
        break;
      case 'uncommitted':
      case 'branch-diff':
        break;
    }

    this.isGeneratingDiff.set(true);
    this.streamingOutput.set('');
    this.vscode.postMessage('generateGitDiff', diffData);
  }

  openDiffFile() {
    const filePath = this.diffDisplayData()?.filePath;
    if (filePath) {
      this.vscode.postMessage('openDiffFile', { filePath });
    }
  }

  deleteDiffFile() {
    const filePath = this.diffDisplayData()?.filePath;
    if (filePath) {
      this.vscode.postMessage('deleteDiffFile', { filePath });
    }
  }

  copyDiffToClipboard() {
    const content = this.diffDisplayData()?.content;
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

  toggleDiffExpanded() {
    this.isDiffExpanded.set(!this.isDiffExpanded());
  }

  // Helper methods for diff display
  getDiffModeLabel(): string {
    const mode = this.currentMode();
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

  getContentSize(): string {
    const content = this.diffDisplayData()?.content;
    if (!content) return '0 bytes';
    
    const bytes = new Blob([content]).size;
    if (bytes < 1024) return `${bytes} bytes`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  maxDiffHeight(): number {
    return this.isDiffExpanded() ? 600 : 300;
  }

  isDiffTruncated(): boolean {
    const content = this.diffDisplayData()?.content;
    return content ? content.split('\n').length > 20 : false;
  }

  private setupMessageHandlers() {
    this.subscriptions.add(
      this.vscode.onMessage().subscribe(message => {
        if (!message) return;
        
        switch (message.command) {
          case 'uncommittedChanges':
            this.handleUncommittedChangesResponse(message.data);
            break;
          case 'commitHistory':
            this.handleCommitHistoryResponse(message.data);
            break;
          case 'branchDiff':
            this.handleBranchDiffResponse(message.data);
            break;
          case 'gitDiffProgress':
            this.handleGitDiffProgress(message.data);
            break;
          case 'gitDiffComplete':
            this.handleGitDiffComplete(message.data);
            break;
          case 'gitDiffError':
            this.handleGitDiffError(message.data);
            break;
          case 'gitDiffFileDeleted':
            this.handleGitDiffFileDeleted(message.data);
            break;
          case 'workflowError':
            this.handleError(message.data?.error);
            break;
        }
      })
    );
  }

  private loadInitialData() {
    this.isLoadingData.set(true);
    
    // Request real data from VSCode extension
    this.vscode.postMessage('getUncommittedChanges');
    this.vscode.postMessage('getCommitHistory', { limit: 50 });
    this.vscode.postMessage('getBranchDiff');
  }

  private handleUncommittedChangesResponse(changes: any[]) {
    const fileChanges: FileChange[] = changes.map(change => ({
      path: change.path,
      status: change.status,
      selected: true  // Default to selected for all uncommitted files
    }));
    
    this.uncommittedFiles.set(fileChanges);
    this.isLoadingData.set(false);
    
    // Auto-emit selection if we have data and current mode is uncommitted
    if (this.currentMode() === 'uncommitted') {
      this.emitSelection();
    }
  }

  private handleCommitHistoryResponse(commits: any[]) {
    const gitCommits: GitCommit[] = commits.map(commit => ({
      hash: commit.hash,
      message: commit.message,
      author: commit.author,
      date: new Date(commit.date),
      files: commit.files || [],
      selected: false  // Initialize all commits as unselected
    }));
    
    this.commits.set(gitCommits);
    this.filteredCommits.set(gitCommits);
    this.isLoadingData.set(false);
  }

  private handleBranchDiffResponse(data: { diff: string; stats: any }) {
    this.branchDiffStats.set({
      filesChanged: data.stats.filesChanged,
      additions: data.stats.additions,
      deletions: data.stats.deletions
    });
    this.isLoadingData.set(false);
    
    // Auto-emit selection if current mode is branch-diff
    if (this.currentMode() === 'branch-diff') {
      this.emitSelection();
    }
  }

  private handleGitDiffProgress(data: { output: string }) {
    const current = this.streamingOutput();
    this.streamingOutput.set(current + data.output);
  }

  private handleGitDiffComplete(data: any) {
    this.isGeneratingDiff.set(false);
    this.diffDisplayData.set(data);
    this.streamingOutput.set(''); // Clear streaming output when complete
    console.log('Git diff generated successfully:', data);
  }

  private handleGitDiffError(data: any) {
    this.isGeneratingDiff.set(false);
    this.diffDisplayData.set({
      mode: data.mode,
      content: '',
      timestamp: new Date(),
      status: 'error',
      error: data.error
    });
    this.streamingOutput.set(''); // Clear streaming output on error
    console.error('Git diff generation failed:', data.error);
  }

  private handleGitDiffFileDeleted(data: any) {
    const current = this.diffDisplayData();
    if (current) {
      this.diffDisplayData.set({
        ...current,
        filePath: undefined
      });
    }
  }

  private handleError(error: string) {
    console.error('Git operation failed:', error);
    this.isLoadingData.set(false);
    this.isGeneratingDiff.set(false);
    
    // Set empty data on error
    this.uncommittedFiles.set([]);
    this.commits.set([]);
    this.filteredCommits.set([]);
    this.branchDiffStats.set(null);
    this.selectedCommits.set([]);
  }

  private emitSelection() {
    const selection: FileSelection = {
      mode: this.currentMode(),
      files: this.currentMode() === 'uncommitted' ? this.uncommittedFiles().filter(f => f.selected) : [],
      commits: this.currentMode() === 'commit' ? this.selectedCommits() : undefined,
      diff: this.getCurrentDiff()
    };

    this.selectionChanged.emit(selection);
  }

  private getCurrentDiff(): string {
    // For now, return a placeholder - diff will be fetched when needed
    switch (this.currentMode()) {
      case 'uncommitted':
        return 'uncommitted-changes-diff';
      case 'commit':
        const selected = this.selectedCommits();
        if (selected.length === 0) return '';
        if (selected.length === 1) {
          return `commit-${selected[0].hash}-diff`;
        }
        // For multiple commits, create a range diff
        const latest = selected[0].hash;
        const oldest = selected[selected.length - 1].hash;
        return `commit-range-${oldest}-to-${latest}-diff`;
      case 'branch-diff':
        return 'branch-diff';
      default:
        return '';
    }
  }
}
