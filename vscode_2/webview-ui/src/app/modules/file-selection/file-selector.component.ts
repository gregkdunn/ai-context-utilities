import { Component, Output, EventEmitter, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

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
}

export interface FileSelection {
  mode: 'uncommitted' | 'commit' | 'branch-diff';
  files: FileChange[];
  commit?: GitCommit;
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
          
          @if (uncommittedFiles().length === 0) {
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
          <h4 class="text-vscode-foreground font-medium">Select Commit</h4>
          
          <div class="mb-3">
            <input 
              type="text"
              [(ngModel)]="commitSearch"
              (input)="filterCommits()"
              placeholder="Search commits by message or hash..."
              class="w-full px-3 py-2 bg-vscode-input-background text-vscode-input-foreground border border-vscode-input-border rounded focus:border-vscode-inputOption-activeBorder">
          </div>
          
          @if (filteredCommits().length === 0) {
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
                  class="p-3 rounded hover:bg-vscode-list-hoverBackground cursor-pointer transition-colors"
                  [class.bg-vscode-list-activeSelectionBackground]="selectedCommit()?.hash === commit.hash">
                  <div class="flex items-start gap-3">
                    <span class="text-vscode-descriptionForeground text-xs font-mono mt-1">
                      {{ commit.hash.substring(0, 7) }}
                    </span>
                    <div class="flex-1 min-w-0">
                      <div class="text-vscode-foreground text-sm font-medium truncate">
                        {{ commit.message }}
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
            
            @if (branchDiffStats()) {
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
            }
          </div>
        </div>
      }

      <!-- Action Buttons -->
      <div class="mt-6 flex gap-3 justify-end">
        <button 
          (click)="refreshData()"
          class="px-4 py-2 text-sm bg-vscode-button-secondaryBackground text-vscode-button-secondaryForeground rounded hover:bg-vscode-button-secondaryHoverBackground">
          🔄 Refresh
        </button>
        <button 
          (click)="applySelection()"
          [disabled]="!hasValidSelection()"
          class="px-4 py-2 text-sm bg-vscode-button-background text-vscode-button-foreground rounded hover:bg-vscode-button-hoverBackground disabled:opacity-50 disabled:cursor-not-allowed">
          Apply Selection
        </button>
      </div>
    </div>
  `,
  styles: []
})
export class FileSelectorComponent implements OnInit {
  @Output() selectionChanged = new EventEmitter<FileSelection>();

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
  selectedCommit = signal<GitCommit | null>(null);
  branchDiffStats = signal<{ filesChanged: number; additions: number; deletions: number } | null>(null);
  
  commitSearch = '';

  ngOnInit() {
    this.loadInitialData();
  }

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
    this.selectedCommit.set(commit);
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
        return this.selectedCommit() !== null;
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
        return this.selectedCommit() ? `Commit ${this.selectedCommit()!.hash.substring(0, 7)} selected` : 'No commit selected';
      case 'branch-diff':
        return this.branchDiffStats() ? `${this.branchDiffStats()!.filesChanged} files in diff` : 'Loading diff...';
      default:
        return '';
    }
  }

  refreshData() {
    this.loadInitialData();
  }

  applySelection() {
    this.emitSelection();
  }

  private loadInitialData() {
    // Mock data for now - will be replaced with actual VSCode integration
    this.uncommittedFiles.set([
      { path: 'src/app/components/test.component.ts', status: 'modified', selected: false },
      { path: 'src/app/services/data.service.ts', status: 'added', selected: false },
      { path: 'src/app/models/user.model.ts', status: 'deleted', selected: false }
    ]);

    this.commits.set([
      {
        hash: 'abc123def456',
        message: 'Add new user authentication feature',
        author: 'John Doe',
        date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        files: ['auth.service.ts', 'user.component.ts']
      },
      {
        hash: 'def456ghi789',
        message: 'Fix bug in data processing',
        author: 'Jane Smith',
        date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        files: ['data.service.ts']
      }
    ]);

    this.filteredCommits.set(this.commits());

    this.branchDiffStats.set({
      filesChanged: 7,
      additions: 142,
      deletions: 28
    });
  }

  private emitSelection() {
    const selection: FileSelection = {
      mode: this.currentMode(),
      files: this.currentMode() === 'uncommitted' ? this.uncommittedFiles().filter(f => f.selected) : [],
      commit: this.currentMode() === 'commit' ? (this.selectedCommit() || undefined) : undefined,
      diff: this.getCurrentDiff()
    };

    this.selectionChanged.emit(selection);
  }

  private getCurrentDiff(): string {
    // Mock diff - will be replaced with actual git integration
    switch (this.currentMode()) {
      case 'uncommitted':
        return 'diff --git a/src/app/test.ts b/src/app/test.ts\n+added line\n-removed line';
      case 'commit':
        return this.selectedCommit() ? `Diff for commit ${this.selectedCommit()!.hash}` : '';
      case 'branch-diff':
        return 'Full branch diff content...';
      default:
        return '';
    }
  }
}
