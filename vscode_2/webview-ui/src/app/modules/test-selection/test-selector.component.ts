import { Component, Output, EventEmitter, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface NXProject {
  name: string;
  type: 'application' | 'library';
  root: string;
  sourceRoot: string;
  tags?: string[];
}

export interface TestFile {
  path: string;
  selected: boolean;
  testCount?: number;
}

export interface TestConfiguration {
  mode: 'project' | 'affected';
  project?: string;
  testFiles: TestFile[];
  command: string;
  estimatedDuration?: number;
}

@Component({
  selector: 'app-test-selector',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-vscode-editor-background p-4 rounded-lg border border-vscode-panel-border">
      <div class="flex items-center justify-between mb-6">
        <h3 class="text-vscode-foreground text-lg font-semibold">Test Configuration</h3>
        <div class="text-vscode-descriptionForeground text-sm">
          {{ getConfigurationSummary() }}
        </div>
      </div>

      <!-- Test Mode Selection -->
      <div class="mb-6">
        <label class="text-vscode-foreground text-sm font-medium mb-3 block">
          Test Execution Mode:
        </label>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            (click)="selectTestMode('affected')"
            [class]="getModeButtonClass('affected')"
            class="p-4 rounded border transition-all duration-200 text-left">
            <div class="flex items-center gap-3 mb-2">
              <span class="text-2xl">🎯</span>
              <span class="font-medium">Affected Tests</span>
            </div>
            <p class="text-xs opacity-75">
              Run tests for projects affected by your changes
            </p>
            <div class="text-xs mt-2 opacity-60">
              Recommended • Faster execution
            </div>
          </button>
          
          <button
            (click)="selectTestMode('project')"
            [class]="getModeButtonClass('project')"
            class="p-4 rounded border transition-all duration-200 text-left">
            <div class="flex items-center gap-3 mb-2">
              <span class="text-2xl">📁</span>
              <span class="font-medium">Specific Project</span>
            </div>
            <p class="text-xs opacity-75">
              Run tests for a specific project
            </p>
            <div class="text-xs mt-2 opacity-60">
              Full control • Longer execution
            </div>
          </button>
        </div>
      </div>

      <!-- Affected Tests Configuration -->
      @if (testMode() === 'affected') {
        <div class="space-y-4">
          <div class="bg-vscode-textBlockQuote-background border border-vscode-panel-border rounded p-4">
            <div class="flex items-center gap-2 mb-3">
              <span class="text-xl">⚡</span>
              <h4 class="text-vscode-textBlockQuote-foreground font-medium">Affected Projects Detection</h4>
            </div>
            <p class="text-vscode-textBlockQuote-foreground text-sm mb-3">
              NX will automatically detect and run tests for projects affected by your changes.
            </p>
            
            @if (affectedProjects().length > 0) {
              <div>
                <p class="text-vscode-foreground text-sm font-medium mb-2">
                  Affected Projects ({{ affectedProjects().length }}):
                </p>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  @for (project of affectedProjects(); track project) {
                    <div class="flex items-center gap-2 p-2 bg-vscode-list-hoverBackground rounded">
                      <span class="w-2 h-2 bg-vscode-gitDecoration-modifiedResourceForeground rounded-full"></span>
                      <span class="text-vscode-foreground text-sm font-mono">{{ project }}</span>
                    </div>
                  }
                </div>
              </div>
            } @else {
              <div class="text-vscode-descriptionForeground text-center py-4">
                <div class="text-2xl mb-2">🔍</div>
                <p class="text-sm">Scanning for affected projects...</p>
              </div>
            }
          </div>

          <!-- Base Branch Configuration -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="text-vscode-foreground text-sm font-medium mb-2 block">
                Base Branch:
              </label>
              <select
                [(ngModel)]="baseBranch"
                (change)="updateAffectedProjects()"
                class="w-full px-3 py-2 bg-vscode-dropdown-background text-vscode-dropdown-foreground border border-vscode-dropdown-border rounded focus:border-vscode-inputOption-activeBorder">
                <option value="main">main</option>
                <option value="master">master</option>
                <option value="develop">develop</option>
                <option value="HEAD~1">Previous commit</option>
              </select>
            </div>
            
            <div>
              <label class="text-vscode-foreground text-sm font-medium mb-2 block">
                Include Dependencies:
              </label>
              <label class="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox"
                  [(ngModel)]="includeDependencies"
                  class="w-4 h-4 rounded border-vscode-checkbox-border bg-vscode-checkbox-background">
                <span class="text-vscode-foreground text-sm">Test dependent projects</span>
              </label>
            </div>
          </div>
        </div>
      }

      <!-- Project-Specific Configuration -->
      @if (testMode() === 'project') {
        <div class="space-y-4">
          <!-- Project Selection -->
          <div>
            <label class="text-vscode-foreground text-sm font-medium mb-2 block">
              Select Project:
            </label>
            <select
              [(ngModel)]="selectedProject"
              (change)="onProjectChange()"
              class="w-full px-3 py-2 bg-vscode-dropdown-background text-vscode-dropdown-foreground border border-vscode-dropdown-border rounded focus:border-vscode-inputOption-activeBorder">
              <option value="">-- Select a project --</option>
              @for (project of projects(); track project.name) {
                <option [value]="project.name">
                  {{ project.name }} ({{ project.type }})
                </option>
              }
            </select>
          </div>

          <!-- Project Details -->
          @if (selectedProject) {
            <div class="bg-vscode-textBlockQuote-background border border-vscode-panel-border rounded p-4">
              @if (getSelectedProjectDetails()) {
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span class="text-vscode-descriptionForeground">Type:</span>
                    <span class="text-vscode-foreground ml-2 capitalize">{{ getSelectedProjectDetails()!.type }}</span>
                  </div>
                  <div>
                    <span class="text-vscode-descriptionForeground">Root:</span>
                    <span class="text-vscode-foreground ml-2 font-mono">{{ getSelectedProjectDetails()!.root }}</span>
                  </div>
                  <div>
                    <span class="text-vscode-descriptionForeground">Test Files:</span>
                    <span class="text-vscode-foreground ml-2">{{ projectTestFiles().length }}</span>
                  </div>
                </div>
              }
            </div>

            <!-- Test Files Selection -->
            <div>
              <div class="flex items-center justify-between mb-3">
                <label class="text-vscode-foreground text-sm font-medium">
                  Test Files:
                </label>
                <button 
                  (click)="toggleSelectAllTestFiles()"
                  class="text-vscode-button-background hover:text-vscode-button-hoverBackground text-sm">
                  {{ areAllTestFilesSelected() ? 'Unselect All' : 'Select All' }}
                </button>
              </div>
              
              @if (projectTestFiles().length === 0) {
                <div class="text-vscode-descriptionForeground text-center py-8 border border-vscode-panel-border rounded">
                  <div class="text-4xl mb-2">🧪</div>
                  <p>No test files found</p>
                  <p class="text-xs">Select a project to see available test files</p>
                </div>
              } @else {
                <div class="max-h-64 overflow-y-auto border border-vscode-panel-border rounded p-2 space-y-1">
                  @for (file of projectTestFiles(); track file.path) {
                    <div class="flex items-center gap-3 p-2 hover:bg-vscode-list-hoverBackground rounded">
                      <input 
                        type="checkbox"
                        [checked]="file.selected"
                        (change)="toggleTestFile(file)"
                        class="w-4 h-4 rounded border-vscode-checkbox-border bg-vscode-checkbox-background">
                      <span class="flex-1 text-vscode-foreground text-sm font-mono truncate">
                        {{ file.path }}
                      </span>
                      @if (file.testCount) {
                        <span class="text-vscode-descriptionForeground text-xs bg-vscode-badge-background px-2 py-1 rounded">
                          {{ file.testCount }} tests
                        </span>
                      }
                    </div>
                  }
                </div>
              }
            </div>
          }
        </div>
      }

      <!-- Command Preview -->
      <div class="mt-6 p-4 bg-vscode-textCodeBlock-background border border-vscode-panel-border rounded">
        <div class="flex items-center justify-between mb-2">
          <label class="text-vscode-descriptionForeground text-xs font-medium">
            Command Preview:
          </label>
          @if (getEstimatedDuration()) {
            <span class="text-vscode-descriptionForeground text-xs">
              Est. {{ getEstimatedDuration() }}
            </span>
          }
        </div>
        <code class="text-vscode-textPreformat-foreground text-sm font-mono block break-all">
          {{ getTestCommand() }}
        </code>
      </div>

      <!-- Action Buttons -->
      <div class="mt-6 flex gap-3 justify-end">
        <button 
          (click)="refreshProjects()"
          class="px-4 py-2 text-sm bg-vscode-button-secondaryBackground text-vscode-button-secondaryForeground rounded hover:bg-vscode-button-secondaryHoverBackground">
          🔄 Refresh
        </button>
        <button 
          (click)="applyConfiguration()"
          [disabled]="!hasValidConfiguration()"
          class="px-4 py-2 text-sm bg-vscode-button-background text-vscode-button-foreground rounded hover:bg-vscode-button-hoverBackground disabled:opacity-50 disabled:cursor-not-allowed">
          Apply Configuration
        </button>
      </div>
    </div>
  `,
  styles: []
})
export class TestSelectorComponent implements OnInit {
  @Output() configurationChanged = new EventEmitter<TestConfiguration>();

  testMode = signal<'project' | 'affected'>('affected');
  projects = signal<NXProject[]>([]);
  selectedProject = '';
  projectTestFiles = signal<TestFile[]>([]);
  affectedProjects = signal<string[]>([]);
  baseBranch = 'main';
  includeDependencies = false;

  ngOnInit() {
    this.loadProjects();
    this.updateAffectedProjects();
  }

  selectTestMode(mode: 'project' | 'affected') {
    this.testMode.set(mode);
    this.emitConfiguration();
  }

  getModeButtonClass(mode: string): string {
    const baseClass = 'text-left transition-all duration-200';
    if (this.testMode() === mode) {
      return `${baseClass} bg-vscode-button-background text-vscode-button-foreground border-vscode-button-background`;
    }
    return `${baseClass} bg-vscode-button-secondaryBackground text-vscode-button-secondaryForeground border-vscode-panel-border hover:bg-vscode-list-hoverBackground`;
  }

  onProjectChange() {
    this.loadProjectTestFiles();
    this.emitConfiguration();
  }

  getSelectedProjectDetails(): NXProject | null {
    return this.projects().find(p => p.name === this.selectedProject) || null;
  }

  toggleTestFile(file: TestFile) {
    const files = this.projectTestFiles();
    const index = files.findIndex(f => f.path === file.path);
    if (index !== -1) {
      files[index].selected = !files[index].selected;
      this.projectTestFiles.set([...files]);
      this.emitConfiguration();
    }
  }

  toggleSelectAllTestFiles() {
    const files = this.projectTestFiles();
    const allSelected = this.areAllTestFilesSelected();
    files.forEach(f => f.selected = !allSelected);
    this.projectTestFiles.set([...files]);
    this.emitConfiguration();
  }

  areAllTestFilesSelected(): boolean {
    const files = this.projectTestFiles();
    return files.length > 0 && files.every(f => f.selected);
  }

  updateAffectedProjects() {
    // Mock data - will be replaced with actual NX integration
    setTimeout(() => {
      this.affectedProjects.set(['user-app', 'auth-lib', 'shared-utils']);
      this.emitConfiguration();
    }, 1000);
  }

  getTestCommand(): string {
    if (this.testMode() === 'affected') {
      let command = `npx nx affected --target=test --base=${this.baseBranch}`;
      if (this.includeDependencies) {
        command += ' --with-deps';
      }
      return command;
    } else if (this.selectedProject) {
      const selectedFiles = this.projectTestFiles().filter(f => f.selected);
      if (selectedFiles.length === 0) {
        return `npx nx test ${this.selectedProject}`;
      } else {
        return `npx nx test ${this.selectedProject} --testPathPattern="${selectedFiles.map(f => f.path).join('|')}"`;
      }
    }
    return '-- No test configuration selected --';
  }

  getEstimatedDuration(): string | null {
    if (this.testMode() === 'affected') {
      const projectCount = this.affectedProjects().length;
      if (projectCount === 0) return null;
      const minutes = Math.max(1, projectCount * 2);
      return `${minutes}min`;
    } else if (this.selectedProject) {
      const selectedFiles = this.projectTestFiles().filter(f => f.selected);
      const testCount = selectedFiles.reduce((sum, f) => sum + (f.testCount || 0), 0);
      if (testCount === 0) return null;
      const seconds = Math.max(30, testCount * 5);
      return seconds > 60 ? `${Math.ceil(seconds / 60)}min` : `${seconds}s`;
    }
    return null;
  }

  hasValidConfiguration(): boolean {
    if (this.testMode() === 'affected') {
      return this.affectedProjects().length > 0;
    } else {
      return !!this.selectedProject;
    }
  }

  getConfigurationSummary(): string {
    if (this.testMode() === 'affected') {
      const count = this.affectedProjects().length;
      return count > 0 ? `${count} affected project(s)` : 'Scanning...';
    } else {
      if (!this.selectedProject) return 'No project selected';
      const selectedFiles = this.projectTestFiles().filter(f => f.selected).length;
      const totalFiles = this.projectTestFiles().length;
      return `${selectedFiles}/${totalFiles} test files`;
    }
  }

  refreshProjects() {
    this.loadProjects();
    this.updateAffectedProjects();
  }

  applyConfiguration() {
    this.emitConfiguration();
  }

  private loadProjects() {
    // Mock data - will be replaced with actual NX integration
    this.projects.set([
      { name: 'user-app', type: 'application', root: 'apps/user-app', sourceRoot: 'apps/user-app/src' },
      { name: 'admin-app', type: 'application', root: 'apps/admin-app', sourceRoot: 'apps/admin-app/src' },
      { name: 'auth-lib', type: 'library', root: 'libs/auth', sourceRoot: 'libs/auth/src' },
      { name: 'shared-utils', type: 'library', root: 'libs/shared/utils', sourceRoot: 'libs/shared/utils/src' },
      { name: 'ui-components', type: 'library', root: 'libs/ui-components', sourceRoot: 'libs/ui-components/src' }
    ]);
  }

  private loadProjectTestFiles() {
    if (!this.selectedProject) {
      this.projectTestFiles.set([]);
      return;
    }

    // Mock data - will be replaced with actual file system integration
    const mockFiles: TestFile[] = [
      { path: `${this.selectedProject}/src/app/app.component.spec.ts`, selected: false, testCount: 5 },
      { path: `${this.selectedProject}/src/app/services/data.service.spec.ts`, selected: false, testCount: 12 },
      { path: `${this.selectedProject}/src/app/components/user.component.spec.ts`, selected: false, testCount: 8 },
      { path: `${this.selectedProject}/src/app/utils/helpers.spec.ts`, selected: false, testCount: 15 }
    ];

    this.projectTestFiles.set(mockFiles);
  }

  private emitConfiguration() {
    const config: TestConfiguration = {
      mode: this.testMode(),
      project: this.selectedProject || undefined,
      testFiles: this.projectTestFiles().filter(f => f.selected),
      command: this.getTestCommand(),
      estimatedDuration: this.getEstimatedDuration() ? parseInt(this.getEstimatedDuration()!.replace(/\D/g, '')) : undefined
    };

    this.configurationChanged.emit(config);
  }
}
