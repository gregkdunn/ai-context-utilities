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
    <div class="bg-gray-900 rounded-lg border border-gray-700 font-mono text-sm h-full p-3" style="background: #1a1a1a; border-color: #333;">
      <!-- Terminal Header -->
      <div class="border-b pb-6 mb-8" style="border-color: #333;">
        <div class="mb-2">
          <span class="font-bold" style="color: #A8A8FF;">$</span>
          <span class="font-bold" style="color: #4ECDC4;">file-selector</span>
          <span style="color: #FFD93D;">--mode</span>
          <span style="color: #6BCF7F;">{{ currentMode() }}</span>
        </div>
        <div style="color: #666;" class="text-xs">
          📁 File Selection | {{ getSelectionSummary() }}
        </div>
      </div>

      <!-- Terminal Mode Selection -->
      <div class="mb-8">
        <div class="mb-4">
          <span style="color: #A8A8FF;">></span>
          <span style="color: #4ECDC4;">🔍 Select changes from source</span>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 pl-6">
          @for (mode of selectionModes; track mode.type) {
            <a 
              (click)="selectMode(mode.type)"
              class="px-4 py-3 border-gray-100 font-mono font-bold border-2 hover:opacity-90 transition-opacity"
              [ngStyle]="currentMode() === mode.type ? 
                {'background': '#6BCF7F', 'color': '#000', 'border-color': '#6BCF7F'} : 
                {'background': '#333', 'color': '#e5e5e5', 'border-color': '#666'}">
              <div>
                <span>{{ mode.icon }}</span>
                <span>{{ mode.label }}</span>
              </div>
              <div class="text-xs mt-1" style="color: #666;">{{ mode.description }}</div>
          </a>
          }
        </div>
      </div>

      <!-- Uncommitted Changes View -->
      @if (currentMode() === 'uncommitted') {
        <div class="space-y-6 mb-8">
          <div class="mb-4">
            <span style="color: #A8A8FF;">></span>
            <span style="color: #4ECDC4;">📝 Uncommitted changes detected</span>
            <button 
              (click)="toggleSelectAll()"
              class="px-3 py-1 rounded text-xs font-mono hover:opacity-80"
              style="background: #333; color: #FFD93D; border: 1px solid #666; float: right;">
              {{ areAllSelected() ? '✗ Unselect All' : '✓ Select All' }}
            </button>
          </div>
          
          <div class="pl-6">
            @if (isLoadingData()) {
              <div class="text-center py-8">
                <div class="text-2xl mb-2 animate-spin" style="color: #FFD93D;">⟳</div>
                <p style="color: #4ECDC4;">Loading uncommitted changes...</p>
              </div>
            } @else if (uncommittedFiles().length === 0) {
              <div class="text-center py-8">
                <div class="text-4xl mb-2">📝</div>
                <p style="color: #e5e5e5;">No uncommitted changes found</p>
                <p class="text-xs" style="color: #666;">Make some changes to see them here</p>
              </div>
            } @else {
              <div class="space-y-3 max-h-64 overflow-y-auto rounded p-4" style="border: 1px solid #4a4a4a; background: #1f1f1f;">
                @for (file of uncommittedFiles(); track file.path) {
                  <div class="p-2 rounded hover:opacity-80 py-1">
                    <input 
                      type="checkbox" 
                      [checked]="file.selected"
                      (change)="toggleFileSelection(file)"
                      class="w-4 h-4 rounded">
                    <span class="text-sm font-mono truncate" style="color: #e5e5e5;">
                      {{ file.path }}
                    </span>
                    <span class="px-2 py-1 text-xs rounded font-medium" [ngStyle]="getTerminalStatusBadgeStyle(file.status)">
                      {{ getStatusIcon(file.status) }} {{ file.status.toUpperCase() }}
                    </span>
                  </div>
                }
              </div>
            }
          </div>
        </div>
      }

      <!-- Commit Selection View -->
      @if (currentMode() === 'commit') {
        <div class="space-y-6 mb-8">
          <div class="mb-4 flex items-center gap-3">
            <span style="color: #A8A8FF;">></span>
            <span style="color: #4ECDC4;">📚 Select commits from history</span>
            @if (selectedCommits().length > 0) {
              <button 
                (click)="clearCommitSelection()"
                class="ml-auto px-3 py-1 rounded text-xs font-mono hover:opacity-80"
                style="background: #333; color: #FF8C42; border: 1px solid #666;">
                ✗ Clear ({{ selectedCommits().length }})
              </button>
            }
          </div>
          
          <div class="rounded p-4 text-xs pl-6" style="background: #2a2a1a; border: 1px solid #4a4a2a;">
            <p style="color: #e5e5e5;">
              <span class="font-semibold" style="color: #FFD93D;">💡 Multi-commit selection:</span>
              Click a commit to select all commits from that point to the latest.
              Click a selected commit to deselect it and all commits after it.
            </p>
          </div>
          
          <div class="mb-4 pl-6">
            <input 
              type="text"
              [(ngModel)]="commitSearch"
              (input)="filterCommits()"
              placeholder="🔍 Search commits by message or hash..."
              class="w-full px-3 py-2 rounded font-mono text-sm" style="background: #333; color: #e5e5e5; border: 1px solid #666;">
          </div>
          
          @if (isLoadingData()) {
            <div class="text-center py-8 pl-6">
              <div class="text-2xl mb-2 animate-spin" style="color: #FFD93D;">⟳</div>
              <p style="color: #4ECDC4;">Loading commit history...</p>
            </div>
          } @else if (filteredCommits().length === 0) {
            <div class="text-center py-8 pl-6">
              <div class="text-4xl mb-2">🔍</div>
              <p style="color: #e5e5e5;">No commits found</p>
              @if (commitSearch) {
                <p class="text-xs" style="color: #666;">Try a different search term</p>
              }
            </div>
          } @else {
            <div class="space-y-3 max-h-64 overflow-y-auto rounded p-4 pl-6" style="border: 1px solid #4a4a4a; background: #1f1f1f;">
              @for (commit of filteredCommits(); track commit.hash) {
                <div 
                  (click)="selectCommit(commit)"
                  class="p-3 rounded hover:opacity-80 cursor-pointer transition-opacity border-l-4"
                  [ngStyle]="commit.selected ? {'background': '#2a2a1a', 'border-left-color': '#6BCF7F'} : {'background': '#1a1a1a', 'border-left-color': 'transparent'}"
                  style="border: 1px solid #333;">
                  <div class="flex items-start gap-3">
                    <span class="text-xs font-mono mt-1" style="color: #666;">
                      {{ commit.hash.substring(0, 7) }}
                    </span>
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center gap-2">
                        @if (commit.selected) {
                          <span class="text-sm" style="color: #6BCF7F;">✓</span>
                        }
                        <div class="text-sm font-medium truncate" style="color: #e5e5e5;">
                          {{ commit.message }}
                        </div>
                      </div>
                      <div class="text-xs mt-1 flex items-center gap-4" style="color: #666;">
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
        <div class="space-y-6 mb-8">
          <div class="mb-4 flex items-center gap-3">
            <span style="color: #A8A8FF;">></span>
            <span style="color: #4ECDC4;">🌿 Branch to main comparison</span>
          </div>
          
          <div class="rounded p-4 pl-6" style="background: #1f2a1f; border: 1px solid #4a6a4a;">
            <div class="flex items-center gap-3 mb-4">
              <span class="text-2xl">🌿</span>
              <div>
                <p class="text-sm font-medium" style="color: #6BCF7F;">
                  Comparing current branch to main
                </p>
                <p class="text-xs" style="color: #666;">
                  All changes from your branch will be included
                </p>
              </div>
            </div>
            
            @if (isLoadingData()) {
              <div class="text-center py-4">
                <div class="text-xl mb-2 animate-spin" style="color: #FFD93D;">⟳</div>
                <p class="text-xs" style="color: #4ECDC4;">Loading branch diff...</p>
              </div>
            } @else if (branchDiffStats()) {
              <div class="flex flex-wrap gap-4 text-xs">
                <span style="color: #e5e5e5;">
                  <span class="font-semibold">{{ branchDiffStats()!.filesChanged }}</span> files changed
                </span>
                <span style="color: #6BCF7F;">
                  +{{ branchDiffStats()!.additions }} additions
                </span>
                <span style="color: #FF4B6D;">
                  -{{ branchDiffStats()!.deletions }} deletions
                </span>
              </div>
            } @else {
              <div class="text-center py-4">
                <p class="text-xs" style="color: #666;">No diff available</p>
              </div>
            }
          </div>
        </div>
      }

      <!-- Terminal Action Buttons -->
      <div class="mt-8 text-right">
        <button 
          (click)="refreshData()"
          [disabled]="isLoadingData()"
          class="px-4 py-2 text-sm font-mono font-bold rounded border-2 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
          style="background: #333; color: #4ECDC4; border-color: #666;">
          @if (isLoadingData()) {
            <span class="animate-spin">⟳</span>
            <span class="ml-2">REFRESH --loading</span>
          } @else {
            <span>
              <span>🔄</span>
              <span>REFRESH --data</span>
            </span>
          }
        </button>
        <button 
          (click)="generateAndViewDiff()"
          [disabled]="!hasValidSelection() || isGeneratingDiff()"
          class="px-4 py-2 text-sm font-mono font-bold rounded border-2 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
          style="background: #333; color: #FFD93D; border-color: #666;">
          @if (isGeneratingDiff()) {
            <span class="animate-spin">⟳</span>
            <span class="ml-2">VIEW --generating</span>
          } @else {
            <span>
              <span>📄</span>
              <span>VIEW --diff</span>
            </span>
          }
        </button>
        <button 
          (click)="applySelection()"
          [disabled]="!hasValidSelection()"
          class="px-6 py-2 text-sm font-mono font-bold rounded border-2 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
          [ngStyle]="hasValidSelection() ? 
            {'background': '#6BCF7F', 'color': '#000', 'border-color': '#6BCF7F'} : 
            {'background': '#333', 'color': '#666', 'border-color': '#555'}">
          <span>
            <span>✓</span>
            <span>APPLY --selection</span>
          </span>
        </button>
      </div>

      <!-- Terminal Git Diff Display -->
      @if (showDiffDisplay()) {
        <div class="mt-8 border-t pt-8" style="border-color: #333;">
          <div class="flex items-center justify-between mb-6">
            <div class="flex items-center gap-3">
              <span style="color: #A8A8FF;">></span>
              <span style="color: #4ECDC4;">📄 Git diff output</span>
            </div>
            
            <div class="flex items-center gap-3">
              @if (isGeneratingDiff()) {
                <div class="flex items-center gap-2">
                  <span class="text-sm animate-spin" style="color: #FFD93D;">⟳</span>
                  <span class="text-sm" style="color: #FFD93D;">Generating diff...</span>
                </div>
              } @else if (diffDisplayData()?.status === 'complete') {
                <span class="text-sm flex items-center gap-1" style="color: #6BCF7F;">
                  <span>[✓]</span>
                  <span>Diff completed at {{ diffDisplayData()?.timestamp | date:'short' }}</span>
                </span>
              } @else if (diffDisplayData()?.status === 'error') {
                <span class="text-sm flex items-center gap-1" style="color: #FF4B6D;">
                  <span>[✗]</span>
                  <span>Error generating diff</span>
                </span>
              }
              
              <button
                (click)="closeDiffDisplay()"
                class="px-2 py-1 text-xs rounded font-mono hover:opacity-80 transition-opacity"
                style="background: #333; color: #FF8C42; border: 1px solid #666;">
                × close
              </button>
            </div>
          </div>

          <!-- Terminal Diff Action Buttons -->
          <div class="flex items-center gap-3 mb-6 pl-6">
            <button
              (click)="rerunDiff()"
              [disabled]="isGeneratingDiff()"
              class="px-3 py-1 text-xs font-mono rounded border hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
              style="background: #333; color: #4ECDC4; border-color: #666;">
              <span class="flex items-center gap-2">
                <span>🔄</span>
                @if (isGeneratingDiff()) {
                  <span>rerun --running</span>
                } @else {
                  <span>rerun --diff</span>
                }
              </span>
            </button>

            @if (diffDisplayData()?.filePath) {
              <button
                (click)="openDiffFile()"
                class="px-3 py-1 text-xs font-mono rounded border hover:opacity-80 transition-opacity"
                style="background: #333; color: #FFD93D; border-color: #666;">
                <span class="flex items-center gap-2">
                  <span>📁</span>
                  <span>open --file</span>
                </span>
              </button>
            }

            <button
              (click)="copyDiffToClipboard()"
              [disabled]="!diffDisplayData()?.content || diffDisplayData()?.status !== 'complete'"
              class="px-3 py-1 text-xs font-mono rounded border hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
              style="background: #333; color: #A8A8FF; border-color: #666;">
              <span class="flex items-center gap-2">
                <span>📋</span>
                <span>copy --clipboard</span>
              </span>
            </button>

            @if (diffDisplayData()?.filePath) {
              <button
                (click)="deleteDiffFile()"
                [disabled]="isGeneratingDiff()"
                class="px-3 py-1 text-xs font-mono rounded border hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                style="background: #2a1a1a; color: #FF4B6D; border-color: #FF4B6D;">
                <span class="flex items-center gap-2">
                  <span>🗑️</span>
                  <span>delete --file</span>
                </span>
              </button>
            }

            <button
              (click)="cleanupAllDiffFiles()"
              [disabled]="isGeneratingDiff()"
              class="px-3 py-1 text-xs font-mono rounded border hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
              style="background: #2a2a1a; color: #FF8C42; border-color: #FF8C42;">
              <span class="flex items-center gap-2">
                <span>🧹</span>
                <span>cleanup --all</span>
              </span>
            </button>
          </div>

          <!-- Terminal Error Display -->
          @if (diffDisplayData()?.status === 'error' && diffDisplayData()?.error) {
            <div class="mb-6 p-4 rounded font-mono" style="background: #2a1a1a; border: 1px solid #FF4B6D;">
              <div class="flex items-center gap-3 mb-3">
                <span style="color: #FF4B6D;">[✗]</span>
                <span class="font-bold" style="color: #FF4B6D;">ERROR</span>
                <span style="color: #666;">|</span>
                <span style="color: #FFD93D;">exit_code=1</span>
              </div>
              <div class="pl-4 text-sm" style="color: #FF8C42;">
                {{ diffDisplayData()?.error }}
              </div>
            </div>
          }

          <!-- Terminal Streaming Output Display -->
          @if (streamingOutput() && isGeneratingDiff()) {
            <div class="mb-6">
              <div class="flex items-center gap-3 mb-3">
                <span style="color: #A8A8FF;">></span>
                <span style="color: #4ECDC4;">📺 Live terminal output</span>
              </div>
              <div class="rounded p-4 h-48 overflow-y-auto font-mono text-sm pl-6" style="background: #0a0a0a; border: 1px solid #333; color: #e5e5e5;">
                <pre>{{ streamingOutput() }}</pre>
              </div>
            </div>
          }

          <!-- Terminal Diff Content Display -->
          @if (diffDisplayData()?.content && diffDisplayData()?.status === 'complete') {
            <div>
              <div class="flex items-center justify-between mb-4">
                <div class="flex items-center gap-3">
                  <span style="color: #A8A8FF;">></span>
                  <span style="color: #4ECDC4;">📄 {{ getDiffModeLabel() }} content</span>
                </div>
                
                <div class="flex items-center gap-4 text-xs">
                  <label class="flex items-center gap-2" style="color: #666;">
                    <input 
                      type="checkbox" 
                      [checked]="wrapLines()"
                      (change)="wrapLines.set(!wrapLines())"
                      class="w-3 h-3">
                    <span>wrap --lines</span>
                  </label>
                  
                  @if (diffDisplayData()?.filePath) {
                    <span style="color: #666;">
                      <span style="color: #FFD93D;">size:</span> {{ getContentSize() }}
                    </span>
                  }
                </div>
              </div>
              
              <div 
                class="rounded overflow-auto font-mono text-sm" 
                [style.max-height.px]="maxDiffHeight()"
                style="background: #0a0a0a; border: 1px solid #333;">
                <pre 
                  [class.whitespace-pre-wrap]="wrapLines()"
                  [class.whitespace-pre]="!wrapLines()"
                  class="p-4" style="color: #e5e5e5;">{{ diffDisplayData()?.content }}</pre>
              </div>
              
              @if (isDiffTruncated()) {
                <div class="mt-3 text-center">
                  <button
                    (click)="toggleDiffExpanded()"
                    class="px-3 py-1 text-xs font-mono rounded border hover:opacity-80 transition-opacity"
                    style="background: #333; color: #4ECDC4; border-color: #666;">
                    @if (isDiffExpanded()) {
                      <span>show --less</span>
                    } @else {
                      <span>show --more</span>
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
  @Output() navigationRequested = new EventEmitter<void>();
  
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
    this.clearDiffDisplayOnSelectionChange();
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

  getTerminalStatusBadgeStyle(status: string): any {
    switch (status) {
      case 'added':
        return { 'background': '#1a2a1a', 'color': '#6BCF7F', 'border': '1px solid #6BCF7F' };
      case 'modified':
        return { 'background': '#1a2a2a', 'color': '#4ECDC4', 'border': '1px solid #4ECDC4' };
      case 'deleted':
        return { 'background': '#2a1a1a', 'color': '#FF4B6D', 'border': '1px solid #FF4B6D' };
      default:
        return { 'background': '#2a2a2a', 'color': '#e5e5e5', 'border': '1px solid #666' };
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'added':
        return '✚';
      case 'modified':
        return '⚡';
      case 'deleted':
        return '✗';
      default:
        return '?';
    }
  }

  toggleFileSelection(file: FileChange) {
    const files = this.uncommittedFiles();
    const index = files.findIndex(f => f.path === file.path);
    if (index !== -1) {
      files[index].selected = !files[index].selected;
      this.uncommittedFiles.set([...files]);
      this.clearDiffDisplayOnSelectionChange();
      this.emitSelection();
    }
  }

  toggleSelectAll() {
    const files = this.uncommittedFiles();
    const allSelected = this.areAllSelected();
    files.forEach(f => f.selected = !allSelected);
    this.uncommittedFiles.set([...files]);
    this.clearDiffDisplayOnSelectionChange();
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
    this.clearDiffDisplayOnSelectionChange();
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
    this.clearDiffDisplayOnSelectionChange();
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
    
    // Clear any existing diff display
    this.clearDiffDisplayOnSelectionChange();
    
    // Reload from Git
    this.loadInitialData();
  }

  applySelection() {
    this.emitSelection();
    this.navigationRequested.emit();
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

  clearDiffDisplayOnSelectionChange() {
    // Only clear if there's currently a diff displayed
    if (this.showDiffDisplay()) {
      this.showDiffDisplay.set(false);
      this.diffDisplayData.set(null);
      this.streamingOutput.set('');
      
      // Show a subtle notification that diff was cleared due to selection change
      this.vscode.postMessage('showNotification', { 
        message: 'Git diff cleared due to selection change',
        type: 'info'
      });
      
      console.log('Git diff cleared due to selection change');
    }
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

  cleanupAllDiffFiles() {
    this.vscode.postMessage('cleanupAllDiffFiles');
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
          case 'allDiffFilesDeleted':
            this.handleAllDiffFilesDeleted(message.data);
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

  private handleAllDiffFilesDeleted(data: { deleted: number; errors: string[] }) {
    // Clear current diff display since all files were deleted
    this.showDiffDisplay.set(false);
    this.diffDisplayData.set(null);
    this.streamingOutput.set('');
    
    console.log(`All diff files cleaned up: ${data.deleted} deleted, ${data.errors.length} errors`);
    if (data.errors.length > 0) {
      console.warn('Cleanup errors:', data.errors);
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
