import { Component, Output, EventEmitter, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { VscodeService } from '../../services/vscode.service';

export interface NXProject {
  name: string;
  type: 'application' | 'library';
  root: string;
  sourceRoot: string;
  tags?: string[];
  isUpdated?: boolean; // Added to track if project is affected by changes
}

export interface ProjectGroup {
  title: string;
  icon: string;
  projects: NXProject[];
  description: string;
}

export interface TestFile {
  path: string;
  selected: boolean;
  testCount?: number;
}

export interface TestConfiguration {
  mode: 'project' | 'affected';
  project?: string;
  projects?: string[];  // Added for multiple project selection
  testFiles: TestFile[];
  command: string;
  estimatedDuration?: number;
}

export interface TestExecutionState {
  isRunning: boolean;
  output: string;
  outputFile?: string;
  startTime?: Date;
  endTime?: Date;
  exitCode?: number;
  hasResults: boolean;
}

@Component({
  selector: 'app-test-selector',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-vscode-editor-background p-4 rounded-lg border border-vscode-panel-border">
      <div class="flex items-center justify-between mb-6">
        <h3 class="text-vscode-foreground text-lg font-semibold">Test Selection</h3>
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
            
            @if (isLoadingAffected()) {
            <div class="text-vscode-descriptionForeground text-center py-4">
            <div class="text-2xl mb-2 animate-spin">⏳</div>
            <p class="text-sm">Loading affected projects...</p>
            </div>
            } @else if (affectedProjects().length > 0) {
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
              <p class="text-sm">No affected projects found</p>
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
                  (change)="onIncludeDependenciesChange()"
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
          <!-- Project Selection with Dropdowns -->
          <div>
            <label class="text-vscode-foreground text-sm font-medium mb-3 block">
              Select Projects:
            </label>
            
            @if (isLoadingProjects()) {
              <div class="text-vscode-descriptionForeground text-center py-8 border border-vscode-panel-border rounded">
                <div class="text-4xl mb-2 animate-spin">⏳</div>
                <p>Loading projects...</p>
                <p class="text-xs">Discovering NX workspace projects</p>
              </div>
            } @else if (projectGroups().length === 0) {
              <div class="text-vscode-descriptionForeground text-center py-8 border border-vscode-panel-border rounded">
                <div class="text-4xl mb-2">📁</div>
                <p>No projects found</p>
                <p class="text-xs">Make sure you're in an NX workspace</p>
              </div>
            } @else {
              <div class="space-y-4">
                @for (group of projectGroups(); track group.title) {
                  <div class="space-y-2">
                    <!-- Group Header with Dropdown -->
                    <div class="flex items-center gap-2">
                      <span class="text-lg">{{ group.icon }}</span>
                      <div class="flex-1">
                        <h4 class="text-vscode-foreground font-medium text-sm">{{ group.title }}</h4>
                        <p class="text-vscode-descriptionForeground text-xs">{{ group.description }}</p>
                      </div>
                      <span class="text-vscode-badge-background bg-vscode-badge-background text-vscode-badge-foreground px-2 py-1 rounded text-xs">
                        {{ getSelectedProjectsInGroup(group).length }}/{{ group.projects.length }}
                      </span>
                    </div>
                    
                    <!-- Dropdown for Applications and Libraries -->
                    @if (group.title === 'Applications' || group.title === 'Libraries') {
                      <div class="relative">
                        <select
                          multiple
                          [value]="getSelectedProjectsInGroup(group)"
                          (change)="onMultipleProjectSelectionChange($event, group)"
                          class="w-full px-3 py-2 bg-vscode-dropdown-background text-vscode-dropdown-foreground border border-vscode-dropdown-border rounded focus:border-vscode-inputOption-activeBorder min-h-20 max-h-32"
                          [size]="getSelectSize(group.projects.length)">
                          @for (project of group.projects; track project.name) {
                            <option
                              [value]="project.name"
                              [selected]="isProjectSelected(project.name)"
                              class="p-2 hover:bg-vscode-list-hoverBackground">
                              {{ project.name }} ({{ project.type }})
                            </option>
                          }
                        </select>
                        <p class="text-vscode-descriptionForeground text-xs mt-1">
                          Hold Ctrl/Cmd to select multiple projects
                        </p>
                      </div>
                    }
                    
                    <!-- Updated Projects (single click selection) -->
                    @if (group.title === 'Updated Projects') {
                      <div class="grid grid-cols-1 gap-1 border border-vscode-panel-border rounded p-2 max-h-32 overflow-y-auto">
                        @for (project of group.projects; track project.name) {
                          <label class="flex items-center gap-3 p-2 hover:bg-vscode-list-hoverBackground rounded cursor-pointer">
                            <input
                              type="checkbox"
                              [checked]="isProjectSelected(project.name)"
                              (change)="toggleProjectSelection(project.name)"
                              class="w-4 h-4 rounded border-vscode-checkbox-border bg-vscode-checkbox-background">
                            <div class="flex items-center gap-2">
                              <span class="w-2 h-2 bg-vscode-gitDecoration-modifiedResourceForeground rounded-full"></span>
                              <span class="font-mono text-sm">{{ project.name }}</span>
                            </div>
                            <div class="flex-1"></div>
                            <span class="text-vscode-descriptionForeground text-xs capitalize">{{ project.type }}</span>
                          </label>
                        }
                      </div>
                    }
                  </div>
                }
              </div>
            }
          </div>

          <!-- Selected Projects Summary -->
          @if (selectedProjects().length > 0) {
            <div class="bg-vscode-textBlockQuote-background border border-vscode-panel-border rounded p-4">
              <h4 class="text-vscode-foreground font-medium mb-2">Selected Projects ({{ selectedProjects().length }}):</h4>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                @for (projectName of selectedProjects(); track projectName) {
                  <div class="flex items-center gap-2 p-2 bg-vscode-list-hoverBackground rounded">
                    <span class="text-vscode-foreground text-sm font-mono">{{ projectName }}</span>
                    <div class="flex-1"></div>
                    <button
                      (click)="removeProjectSelection(projectName)"
                      class="text-vscode-descriptionForeground hover:text-vscode-errorForeground text-xs">
                      ×
                    </button>
                  </div>
                }
              </div>
              <div class="mt-3 flex gap-2">
                <button
                  (click)="clearAllProjectSelections()"
                  class="px-3 py-1 text-xs bg-vscode-button-secondaryBackground text-vscode-button-secondaryForeground rounded hover:bg-vscode-button-secondaryHoverBackground">
                  Clear All
                </button>
                <button
                  (click)="loadTestFilesForSelectedProjects()"
                  class="px-3 py-1 text-xs bg-vscode-button-background text-vscode-button-foreground rounded hover:bg-vscode-button-hoverBackground">
                  Load Test Files
                </button>
              </div>
            </div>
          }

            <!-- Test Files Selection -->
            @if (selectedProjects().length > 0) {
              <div>
                <div class="flex items-center justify-between mb-3">
                  <label class="text-vscode-foreground text-sm font-medium">
                    Test Files ({{ getTotalTestFileCount() }} total):
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
                    <p>No test files loaded</p>
                    <p class="text-xs">Click "Load Test Files" to discover test files for selected projects</p>
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
          (click)="runTests()"
          [disabled]="!hasValidConfiguration() || testExecution().isRunning"
          class="px-4 py-2 text-sm bg-vscode-button-background text-vscode-button-foreground rounded hover:bg-vscode-button-hoverBackground disabled:opacity-50 disabled:cursor-not-allowed">
          @if (testExecution().isRunning) {
            🔄 Running Tests...
          } @else {
            ▶️ Run Tests
          }
        </button>
        <button 
          (click)="applyConfiguration()"
          [disabled]="!hasValidConfiguration()"
          class="px-4 py-2 text-sm bg-vscode-button-secondaryBackground text-vscode-button-secondaryForeground rounded hover:bg-vscode-button-secondaryHoverBackground disabled:opacity-50 disabled:cursor-not-allowed">
          Apply Configuration
        </button>
      </div>

      <!-- Test Execution Output -->
      @if (testExecution().isRunning || testExecution().hasResults) {
        <div class="mt-6 border border-vscode-panel-border rounded-lg">
          <!-- Output Header -->
          <div class="flex items-center justify-between p-4 border-b border-vscode-panel-border bg-vscode-editor-background">
            <div class="flex items-center gap-3">
              <div class="flex items-center gap-2">
                @if (testExecution().isRunning) {
                  <div class="w-3 h-3 bg-vscode-progressBar-background rounded-full animate-pulse"></div>
                } @else if (testExecution().exitCode === 0) {
                  <div class="w-3 h-3 bg-vscode-gitDecoration-addedResourceForeground rounded-full"></div>
                } @else {
                  <div class="w-3 h-3 bg-vscode-gitDecoration-deletedResourceForeground rounded-full"></div>
                }
                <h4 class="text-vscode-foreground font-medium">Test Execution</h4>
              </div>
              
              <div class="text-vscode-descriptionForeground text-sm">
                {{ getExecutionStatus() }}
                @if (getTestDuration()) {
                  • {{ getTestDuration() }}
                }
              </div>
            </div>
            
            <div class="flex items-center gap-2">
              @if (testExecution().isRunning) {
                <button
                  (click)="cancelTestRun()"
                  class="px-3 py-1 text-xs bg-vscode-button-secondaryBackground text-vscode-button-secondaryForeground rounded hover:bg-vscode-button-secondaryHoverBackground">
                  Cancel
                </button>
              } @else {
                @if (testExecution().outputFile) {
                  <button
                    (click)="openOutputFile()"
                    class="px-3 py-1 text-xs bg-vscode-button-secondaryBackground text-vscode-button-secondaryForeground rounded hover:bg-vscode-button-secondaryHoverBackground"
                    title="Open output file in editor">
                    📄 Open File
                  </button>
                  <button
                    (click)="deleteOutputFile()"
                    class="px-3 py-1 text-xs bg-vscode-button-secondaryBackground text-vscode-button-secondaryForeground rounded hover:bg-vscode-button-secondaryHoverBackground"
                    title="Delete output file">
                    🗑️ Delete
                  </button>
                }
                <button
                  (click)="copyTestOutput()"
                  class="px-3 py-1 text-xs bg-vscode-button-secondaryBackground text-vscode-button-secondaryForeground rounded hover:bg-vscode-button-secondaryHoverBackground"
                  title="Copy output to clipboard">
                  📋 Copy
                </button>
                <button
                  (click)="runTests()"
                  [disabled]="!hasValidConfiguration()"
                  class="px-3 py-1 text-xs bg-vscode-button-background text-vscode-button-foreground rounded hover:bg-vscode-button-hoverBackground disabled:opacity-50"
                  title="Rerun tests">
                  🔄 Rerun
                </button>
                <button
                  (click)="clearTestOutput()"
                  class="px-3 py-1 text-xs bg-vscode-button-secondaryBackground text-vscode-button-secondaryForeground rounded hover:bg-vscode-button-secondaryHoverBackground"
                  title="Clear output">
                  ✖️ Clear
                </button>
              }
            </div>
          </div>
          
          <!-- Output Content -->
          <div class="relative">
            <div class="max-h-96 overflow-y-auto p-4 bg-vscode-textCodeBlock-background">
              <pre class="text-vscode-textPreformat-foreground text-sm font-mono whitespace-pre-wrap break-words">{{ testExecution().output }}</pre>
            </div>
            
            @if (testExecution().isRunning) {
              <div class="absolute bottom-2 right-2">
                <div class="bg-vscode-editor-background border border-vscode-panel-border rounded px-2 py-1 text-xs text-vscode-descriptionForeground">
                  Running...
                </div>
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: []
})
export class TestSelectorComponent implements OnInit {
  @Output() configurationChanged = new EventEmitter<TestConfiguration>();

  testMode = signal<'project' | 'affected'>('affected');
  projects = signal<NXProject[]>([]);
  selectedProject = '';  // Keep for single selection mode
  selectedProjects = signal<string[]>([]);  // Added for multiple selection
  projectTestFiles = signal<TestFile[]>([]);
  affectedProjects = signal<string[]>([]);
  baseBranch = 'main';
  includeDependencies = false;

  // Loading states
  isLoadingProjects = signal<boolean>(false);
  isLoadingAffected = signal<boolean>(false);

  // Test execution state
  testExecution = signal<TestExecutionState>({
    isRunning: false,
    output: '',
    hasResults: false
  });

  // Computed signals for organized project groups
  projectGroups = computed(() => {
    const allProjects = this.projects();
    const affected = this.affectedProjects();
    
    // Mark projects as updated if they're in the affected list
    const projectsWithUpdates = allProjects.map(project => ({
      ...project,
      isUpdated: affected.includes(project.name)
    }));
    
    // Create groups
    const updatedProjects = projectsWithUpdates
      .filter(p => p.isUpdated)
      .sort((a, b) => a.name.localeCompare(b.name));
    
    const apps = projectsWithUpdates
      .filter(p => p.type === 'application')
      .sort((a, b) => a.name.localeCompare(b.name));
    
    const libraries = projectsWithUpdates
      .filter(p => p.type === 'library')
      .sort((a, b) => a.name.localeCompare(b.name));
    
    const groups: ProjectGroup[] = [];
    
    if (updatedProjects.length > 0) {
      groups.push({
        title: 'Updated Projects',
        icon: '🔄',
        projects: updatedProjects,
        description: 'Projects affected by your changes'
      });
    }
    
    if (apps.length > 0) {
      groups.push({
        title: 'Applications',
        icon: '📱',
        projects: apps,
        description: 'Deployable applications'
      });
    }
    
    if (libraries.length > 0) {
      groups.push({
        title: 'Libraries',
        icon: '📚',
        projects: libraries,
        description: 'Shared libraries and utilities'
      });
    }
    
    return groups;
  });

  ngOnInit() {
    this.setupMessageHandlers();
    this.loadProjects();
    this.updateAffectedProjects();
  }

  // Reset method for when file selection changes
  resetConfiguration() {
    this.testMode.set('affected'); // Default to affected
    this.selectedProject = '';
    this.selectedProjects.set([]);
    this.projectTestFiles.set([]);
    this.affectedProjects.set([]);
    this.baseBranch = 'main';
    this.includeDependencies = false;
    
    // Clear test output when resetting configuration
    this.clearTestOutput();
    
    // Reload data
    this.loadProjects();
    this.updateAffectedProjects();
  }

  constructor(private vscode: VscodeService) {}

  private setupMessageHandlers() {
    this.vscode.onMessage().subscribe(message => {
      if (!message) return;
      
      switch (message.command) {
        case 'nxProjects':
          this.handleNXProjectsResponse(message.data);
          break;
        case 'affectedProjects':
          this.handleAffectedProjectsResponse(message.data);
          break;
        case 'nxWorkspaceStatus':
          this.handleNXWorkspaceStatus(message.data);
          break;
        case 'testResults':
          this.handleTestResults(message.data);
          break;
        case 'multipleProjectTestFiles':
          this.handleMultipleProjectTestFilesResponse(message.data);
          break;
        case 'projectTestFiles':
          this.handleProjectTestFilesResponse(message.data);
          break;
        case 'workflowError':
          this.handleError(message.data?.error);
          break;
        case 'testExecutionStarted':
          this.handleTestExecutionStarted(message.data);
          break;
        case 'testExecutionOutput':
          this.handleTestExecutionOutput(message.data);
          break;
        case 'testExecutionCompleted':
          this.handleTestExecutionCompleted(message.data);
          break;
        case 'testExecutionError':
          this.handleTestExecutionError(message.data);
          break;
      }
    });
  }

  selectTestMode(mode: 'project' | 'affected') {
    this.testMode.set(mode);
    this.clearTestOutput(); // Clear output when switching modes
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
    this.clearTestOutput(); // Clear output when project selection changes
    this.emitConfiguration();
  }

  getSelectedProjectDetails(): NXProject | null {
    // For backward compatibility, return details of first selected project
    if (this.selectedProjects().length > 0) {
      return this.projects().find(p => p.name === this.selectedProjects()[0]) || null;
    }
    return this.projects().find(p => p.name === this.selectedProject) || null;
  }

  toggleTestFile(file: TestFile) {
    const files = this.projectTestFiles();
    const index = files.findIndex(f => f.path === file.path);
    if (index !== -1) {
      files[index].selected = !files[index].selected;
      this.projectTestFiles.set([...files]);
      this.clearTestOutput(); // Clear output when test file selection changes
      this.emitConfiguration();
    }
  }

  toggleSelectAllTestFiles() {
    const files = this.projectTestFiles();
    const allSelected = this.areAllTestFilesSelected();
    files.forEach(f => f.selected = !allSelected);
    this.projectTestFiles.set([...files]);
    this.clearTestOutput(); // Clear output when test file selection changes
    this.emitConfiguration();
  }

  areAllTestFilesSelected(): boolean {
    const files = this.projectTestFiles();
    return files.length > 0 && files.every(f => f.selected);
  }

  updateAffectedProjects() {
    this.isLoadingAffected.set(true);
    this.clearTestOutput(); // Clear output when updating affected projects
    // Request real affected projects from NX
    this.vscode.postMessage('getAffectedProjects', { baseBranch: this.baseBranch });
  }

  onIncludeDependenciesChange() {
    // Clear test output when dependency inclusion changes as it affects which tests run
    this.clearTestOutput();
    this.emitConfiguration();
  }

  getTestCommand(): string {
    if (this.testMode() === 'affected') {
      let command = `npx nx affected --target=test --base=${this.baseBranch}`;
      if (this.includeDependencies) {
        command += ' --with-deps';
      }
      return command;
    } else if (this.selectedProjects().length > 0) {
      if (this.selectedProjects().length === 1) {
        const selectedFiles = this.projectTestFiles().filter(f => f.selected);
        if (selectedFiles.length === 0) {
          return `npx nx test ${this.selectedProjects()[0]}`;
        } else {
          return `npx nx test ${this.selectedProjects()[0]} --testPathPattern="${selectedFiles.map(f => f.path).join('|')}"`;
        }
      } else {
        return `npx nx run-many --target=test --projects=${this.selectedProjects().join(',')}`;
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
    } else if (this.selectedProjects().length > 0) {
      const projectCount = this.selectedProjects().length;
      const selectedFiles = this.projectTestFiles().filter(f => f.selected);
      if (selectedFiles.length > 0) {
        const testCount = selectedFiles.reduce((sum, f) => sum + (f.testCount || 0), 0);
        const seconds = Math.max(30, testCount * 5);
        return seconds > 60 ? `${Math.ceil(seconds / 60)}min` : `${seconds}s`;
      } else {
        const minutes = Math.max(1, projectCount * 3);
        return `${minutes}min`;
      }
    }
    return null;
  }

  hasValidConfiguration(): boolean {
    if (this.testMode() === 'affected') {
      return this.affectedProjects().length > 0;
    } else {
      return this.selectedProjects().length > 0;
    }
  }

  getConfigurationSummary(): string {
    if (this.testMode() === 'affected') {
      const count = this.affectedProjects().length;
      return count > 0 ? `${count} affected project(s)` : 'Scanning...';
    } else {
      const projectCount = this.selectedProjects().length;
      if (projectCount === 0) return 'No projects selected';
      const selectedFiles = this.projectTestFiles().filter(f => f.selected).length;
      const totalFiles = this.projectTestFiles().length;
      if (totalFiles > 0) {
        return `${projectCount} project(s), ${selectedFiles}/${totalFiles} test files`;
      } else {
        return `${projectCount} project(s) selected`;
      }
    }
  }

  refreshProjects() {
    this.loadProjects();
    this.updateAffectedProjects();
  }

  applyConfiguration() {
    this.emitConfiguration();
  }

  // Test execution methods
  runTests() {
    if (!this.hasValidConfiguration()) {
      return;
    }

    const config = this.getCurrentConfiguration();
    this.vscode.postMessage('runTests', config);
  }

  cancelTestRun() {
    this.vscode.postMessage('cancelTestRun');
  }

  openOutputFile() {
    const execution = this.testExecution();
    if (execution.outputFile) {
      this.vscode.postMessage('openOutputFile', { filePath: execution.outputFile });
    }
  }

  deleteOutputFile() {
    const execution = this.testExecution();
    if (execution.outputFile) {
      this.vscode.postMessage('deleteOutputFile', { filePath: execution.outputFile });
    }
  }

  copyTestOutput() {
    const output = this.testExecution().output;
    if (output) {
      navigator.clipboard.writeText(output).then(() => {
        // Could show a toast notification here
      });
    }
  }

  clearTestOutput() {
    // Clear test output when configuration changes to prevent confusion
    // between different test runs and configurations
    this.testExecution.set({
      isRunning: false,
      output: '',
      hasResults: false
    });
  }

  getTestDuration(): string {
    const execution = this.testExecution();
    if (execution.startTime && execution.endTime) {
      const duration = execution.endTime.getTime() - execution.startTime.getTime();
      const seconds = Math.floor(duration / 1000);
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      
      if (minutes > 0) {
        return `${minutes}m ${remainingSeconds}s`;
      } else {
        return `${seconds}s`;
      }
    }
    return '';
  }

  getExecutionStatus(): string {
    const execution = this.testExecution();
    if (execution.isRunning) {
      return 'Running...';
    } else if (execution.exitCode !== undefined) {
      return execution.exitCode === 0 ? 'Completed Successfully' : `Failed (Exit Code: ${execution.exitCode})`;
    } else if (execution.hasResults) {
      return 'Completed';
    }
    return 'Ready';
  }

  private getCurrentConfiguration(): TestConfiguration {
    return {
      mode: this.testMode(),
      project: this.selectedProjects().length === 1 ? this.selectedProjects()[0] : undefined,
      projects: this.selectedProjects().length > 0 ? this.selectedProjects() : undefined,
      testFiles: this.projectTestFiles().filter(f => f.selected),
      command: this.getTestCommand(),
      estimatedDuration: this.getEstimatedDuration() ? parseInt(this.getEstimatedDuration()!.replace(/\D/g, '')) : undefined
    };
  }

  // New methods for multiple project selection
  getSelectedProjectsInGroup(group: ProjectGroup): string[] {
    return group.projects
      .filter(project => this.isProjectSelected(project.name))
      .map(project => project.name);
  }

  isProjectSelected(projectName: string): boolean {
    return this.selectedProjects().includes(projectName);
  }

  onMultipleProjectSelectionChange(event: Event, group: ProjectGroup) {
    const selectElement = event.target as HTMLSelectElement;
    const selectedOptions = Array.from(selectElement.selectedOptions);
    const selectedProjectNames = selectedOptions.map(option => option.value);
    
    // Remove all projects from this group first
    const currentSelected = this.selectedProjects();
    const groupProjectNames = group.projects.map(p => p.name);
    const withoutGroupProjects = currentSelected.filter(name => !groupProjectNames.includes(name));
    
    // Add the newly selected projects from this group
    const newSelection = [...withoutGroupProjects, ...selectedProjectNames];
    this.selectedProjects.set(newSelection);
    
    this.clearTestOutput(); // Clear output when project selection changes
    this.emitConfiguration();
  }

  toggleProjectSelection(projectName: string) {
    const currentSelected = this.selectedProjects();
    if (currentSelected.includes(projectName)) {
      this.selectedProjects.set(currentSelected.filter(name => name !== projectName));
    } else {
      this.selectedProjects.set([...currentSelected, projectName]);
    }
    this.clearTestOutput(); // Clear output when project selection changes
    this.emitConfiguration();
  }

  removeProjectSelection(projectName: string) {
    const currentSelected = this.selectedProjects();
    this.selectedProjects.set(currentSelected.filter(name => name !== projectName));
    this.clearTestOutput(); // Clear output when project selection changes
    this.emitConfiguration();
  }

  clearAllProjectSelections() {
    this.selectedProjects.set([]);
    this.projectTestFiles.set([]);
    this.clearTestOutput(); // Clear output when clearing all selections
    this.emitConfiguration();
  }

  loadTestFilesForSelectedProjects() {
    if (this.selectedProjects().length === 0) return;
    
    // Request test files for all selected projects
    this.vscode.postMessage('getMultipleProjectTestFiles', { 
      projectNames: this.selectedProjects() 
    });
  }

  getTotalTestFileCount(): number {
    return this.projectTestFiles().length;
  }

  // Helper method for template to calculate select size
  getSelectSize(projectCount: number): number {
    return Math.min(projectCount, 5);
  }

  // Legacy methods for backward compatibility
  selectProject(project: NXProject) {
    // Convert to multiple selection
    this.selectedProjects.set([project.name]);
    this.onProjectChange();
  }

  isProjectDisabled(project: NXProject, groupTitle: string): boolean {
    // Disable projects in Apps/Libraries groups if they're already shown in Updated group
    if (groupTitle !== 'Updated Projects' && project.isUpdated) {
      return true;
    }
    return false;
  }

  getProjectButtonClass(project: NXProject, groupTitle: string): string {
    const baseClass = 'transition-all duration-200';
    const isSelected = this.selectedProject === project.name;
    const isDisabled = this.isProjectDisabled(project, groupTitle);
    
    if (isDisabled) {
      return `${baseClass} bg-vscode-list-inactiveSelectionBackground text-vscode-descriptionForeground border-vscode-panel-border opacity-60`;
    }
    
    if (isSelected) {
      return `${baseClass} bg-vscode-list-activeSelectionBackground text-vscode-list-activeSelectionForeground border-vscode-button-background`;
    }
    
    return `${baseClass} bg-vscode-list-inactiveSelectionBackground text-vscode-foreground border-vscode-panel-border hover:bg-vscode-list-hoverBackground hover:border-vscode-button-background`;
  }

  getProjectPrimaryGroup(project: NXProject): string {
    if (project.isUpdated) {
      return 'Updated Projects';
    }
    return project.type === 'application' ? 'Applications' : 'Libraries';
  }

  private loadProjects() {
    this.isLoadingProjects.set(true);
    // Request real projects from NX
    this.vscode.postMessage('getNXProjects');
  }

  private loadProjectTestFiles() {
    // Handle both single and multiple project selection
    if (this.selectedProjects().length > 0) {
      this.loadTestFilesForSelectedProjects();
    } else if (this.selectedProject) {
      // Legacy single project support
      this.vscode.postMessage('getProjectTestFiles', { projectName: this.selectedProject });
    } else {
      this.projectTestFiles.set([]);
    }
  }

  private handleNXProjectsResponse(projects: NXProject[]) {
    this.projects.set(projects);
    this.isLoadingProjects.set(false);
  }

  private handleAffectedProjectsResponse(data: { projects: string[]; baseBranch: string }) {
    this.affectedProjects.set(data.projects);
    this.isLoadingAffected.set(false);
    this.emitConfiguration();
  }

  private handleNXWorkspaceStatus(data: { isNXWorkspace: boolean }) {
    if (!data.isNXWorkspace) {
      console.warn('Current workspace is not an NX workspace');
      // Show warning in UI or disable NX features
    }
  }

  private handleTestResults(data: any) {
    console.log('Test results received:', data);
    // Handle test results - could show them in a modal or update UI
  }

  private handleProjectTestFilesResponse(data: { projectName: string; testFiles: TestFile[] }) {
    // Handle single project response (legacy)
    if (data.projectName === this.selectedProject) {
      this.projectTestFiles.set(data.testFiles);
    }
  }

  private handleMultipleProjectTestFilesResponse(data: { projectNames: string[]; testFiles: TestFile[] }) {
    // Handle multiple projects response
    const selectedProjectNames = this.selectedProjects();
    const hasMatchingProjects = data.projectNames.some(name => selectedProjectNames.includes(name));
    
    if (hasMatchingProjects) {
      this.projectTestFiles.set(data.testFiles);
    }
  }

  private handleError(error: string) {
    console.error('NX operation failed:', error);
    // Show error in UI
  }

  private handleTestExecutionStarted(data: { command: string; startTime: string; outputFile?: string }) {
    this.testExecution.set({
      isRunning: true,
      output: `Starting test execution: ${data.command}\n`,
      outputFile: data.outputFile,
      startTime: new Date(data.startTime),
      hasResults: false
    });
  }

  private handleTestExecutionOutput(data: { output: string; append?: boolean }) {
    const current = this.testExecution();
    const newOutput = data.append ? current.output + data.output : data.output;
    
    this.testExecution.set({
      ...current,
      output: newOutput
    });
  }

  private handleTestExecutionCompleted(data: { 
    exitCode: number; 
    endTime: string; 
    outputFile?: string;
    results?: any[];
  }) {
    const current = this.testExecution();
    
    this.testExecution.set({
      ...current,
      isRunning: false,
      exitCode: data.exitCode,
      endTime: new Date(data.endTime),
      outputFile: data.outputFile || current.outputFile,
      hasResults: true
    });
  }

  private handleTestExecutionError(data: { error: string; endTime: string }) {
    const current = this.testExecution();
    
    this.testExecution.set({
      ...current,
      isRunning: false,
      output: current.output + `\n\nError: ${data.error}`,
      endTime: new Date(data.endTime),
      exitCode: 1,
      hasResults: true
    });
  }

  private emitConfiguration() {
    const config: TestConfiguration = {
      mode: this.testMode(),
      project: this.selectedProjects().length === 1 ? this.selectedProjects()[0] : undefined,
      projects: this.selectedProjects().length > 0 ? this.selectedProjects() : undefined,
      testFiles: this.projectTestFiles().filter(f => f.selected),
      command: this.getTestCommand(),
      estimatedDuration: this.getEstimatedDuration() ? parseInt(this.getEstimatedDuration()!.replace(/\D/g, '')) : undefined
    };

    this.configurationChanged.emit(config);
  }
}
