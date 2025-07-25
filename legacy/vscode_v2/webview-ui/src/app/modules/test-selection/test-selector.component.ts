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
    <div class="bg-gray-900 rounded-lg border border-gray-700 font-mono text-sm h-full p-3" style="background: #1a1a1a; border-color: #333;">
      <!-- Terminal Header -->
      <div class="border-b pb-6 mb-8" style="border-color: #333;">
        <div class="mb-2">
          <span class="font-bold" style="color: #A8A8FF;">$</span>
          <span class="font-bold" style="color: #4ECDC4;">project-selector</span>
          <span style="color: #FFD93D;">--mode</span>
          <span style="color: #6BCF7F;">{{ testMode() }}</span>
        </div>
        <div style="color: #666;" class="text-xs">
          📂 Project Selection | {{ getConfigurationSummary() }}
        </div>
      </div>

      <!-- Terminal Mode Selection -->
      <div class="mb-8">
        <div class="mb-4">
          <span style="color: #A8A8FF;">></span>
          <span style="color: #4ECDC4;">🎯 Select test execution mode</span>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 pl-6">
          <button
            (click)="selectTestMode('affected')"
            class="p-4 font-mono font-bold border-1 hover:opacity-90 transition-opacity text-left w-full block"
            [ngStyle]="testMode() === 'affected' ? 
              {'background': '#6BCF7F', 'color': '#000', 'border-color': '#6BCF7F'} : 
              {'background': '#333', 'color': '#e5e5e5', 'border-color': '#666'}">
            <div class="mb-2">
              <span class="text-2xl">🎯</span>
              <span class="font-medium">AFFECTED --tests</span>
            </div>
          </button>
          
          <button
            (click)="selectTestMode('project')"
            class="p-4 font-mono font-bold border-1 hover:opacity-90 transition-opacity text-left w-min-full block"
            [ngStyle]="testMode() === 'project' ? 
              {'background': '#6BCF7F', 'color': '#000', 'border-color': '#6BCF7F'} : 
              {'background': '#333', 'color': '#e5e5e5', 'border-color': '#666'}">
            <div class="mb-2">
              <span class="text-2xl">📁</span>
              <span class="font-medium">SPECIFIC --project</span>
            </div>
          </button>
        </div>
      </div>

      <!-- Terminal Affected Tests Configuration -->
      @if (testMode() === 'affected') {
        <div class="space-y-6 mb-8">
          <div class="rounded p-4" style="background: #1f2a1f; border: 1px solid #4a6a4a;">
            <div class="flex items-center gap-3 mb-4">
              <span style="color: #A8A8FF;">></span>
              <span class="text-xl">⚡</span>
              <span style="color: #4ECDC4;">Affected projects detection</span>
            </div>
            <p class="text-sm mb-4 pl-6" style="color: #e5e5e5;">
              NX will automatically detect and run tests for projects affected by your changes.
            </p>
            
            @if (isLoadingAffected()) {
            <div class="text-center py-6 pl-6">
            <div class="text-2xl mb-2 animate-spin" style="color: #FFD93D;">⟳</div>
            <p class="text-sm" style="color: #4ECDC4;">Loading affected projects...</p>
            </div>
            } @else if (affectedProjects().length > 0) {
            <div class="pl-6">
            <p class="text-sm font-medium mb-3 flex items-center gap-2" style="color: #6BCF7F;">
            <span>[✓]</span>
            <span>Affected Projects ({{ affectedProjects().length }}):</span>
            </p>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
            @for (project of affectedProjects(); track project) {
                <div class="items-center gap-3 p-2 rounded w-full block" style="background: #2a2a1a; border: 1px solid #4ECDC4;">
                    <span class="w-2 h-2 rounded-full" style="background: #4ECDC4;"></span>
                      <span class="text-sm font-mono" style="color: #e5e5e5;">{{ project }}</span>
                  </div>
              }
            </div>
            </div>
            } @else {
            <div class="text-center py-6 pl-6">
              <div class="text-2xl mb-2">🔍</div>
              <p class="text-sm" style="color: #666;">No affected projects found</p>
            </div>
          }
          </div>

          <!-- Terminal Base Branch Configuration -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 pl-6">
            <div>
              <label class="text-sm font-medium mb-3 block" style="color: #FFD93D;">
                🌿 Base branch:
              </label>
              <select
                [(ngModel)]="baseBranch"
                (change)="updateAffectedProjects()"
                class="w-full px-3 py-2 rounded font-mono text-sm" style="background: #333; color: #e5e5e5; border: 1px solid #666;">
                <option value="main">main</option>
                <option value="master">master</option>
                <option value="develop">develop</option>
                <option value="HEAD~1">Previous commit</option>
              </select>
            </div>
            
            <div>
              <label class="text-sm font-medium mb-3 block" style="color: #FFD93D;">
                🔗 Include dependencies:
              </label>
              <label class="flex items-center gap-3 cursor-pointer">
                <input 
                  type="checkbox"
                  [(ngModel)]="includeDependencies"
                  (change)="onIncludeDependenciesChange()"
                  class="w-4 h-4 rounded">
                <span class="text-sm" style="color: #e5e5e5;">test --with-deps</span>
              </label>
            </div>
          </div>
        </div>
      }

      <!-- Terminal Project-Specific Configuration -->
      @if (testMode() === 'project') {
        <div class="space-y-6 mb-8">
          <!-- Terminal Project Selection -->
          <div>
            <div class="mb-4 flex items-center gap-3">
              <span style="color: #A8A8FF;">></span>
              <span style="color: #4ECDC4;">📁 Select projects from workspace</span>
            </div>
            
            @if (isLoadingProjects()) {
              <div class="text-center py-8 rounded pl-6" style="border: 1px solid #333; background: #1a1a1a;">
                <div class="text-4xl mb-2 animate-spin" style="color: #FFD93D;">⟳</div>
                <p style="color: #4ECDC4;">{{ projectLoadingStatus().message || 'Loading projects...' }}</p>
                @if (projectLoadingStatus().status === 'cached') {
                  <p class="text-xs" style="color: #6BCF7F;">[✓] Using cached data</p>
                } @else if (projectLoadingStatus().status === 'initializing') {
                  <p class="text-xs" style="color: #FFD93D;">🚀 Setting up project cache for faster loading...</p>
                } @else {
                  <p class="text-xs" style="color: #666;">Discovering NX workspace projects</p>
                }
              </div>
            } @else if (projectGroups().length === 0) {
              <div class="text-center py-8 rounded pl-6" style="border: 1px solid #333; background: #1a1a1a;">
                <div class="text-4xl mb-2">📁</div>
                <p style="color: #e5e5e5;">No projects found</p>
                <p class="text-xs" style="color: #666;">Make sure you're in an NX workspace</p>
              </div>
            } @else {
              <div class="space-y-6 pl-6">
                @for (group of projectGroups(); track group.title) {
                  <div class="space-y-4">
                    <!-- Terminal Group Header -->
                    <div class="items-center gap-3">
                      <span style="color: #A8A8FF;">></span>
                      <span class="text-lg">{{ group.icon }}</span>
                      <div class="p-2">
                        <h4 class="font-medium text-sm" [ngStyle]="group.title === 'Updated Projects' ? {'color': '#6BCF7F'} : {'color': '#4ECDC4'}">
                          {{ group.title }}
                          @if (group.title === 'Updated Projects') {
                            <span class="text-xs ml-2" style="color: #FFD93D;">[RECOMMENDED]</span>
                          }
                        </h4>
                        <p class="text-xs" style="color: #666;">{{ group.description }}</p>
                      </div>
                      <span class="px-2 py-1 rounded text-xs font-mono" [ngStyle]="group.title === 'Updated Projects' ? 
                        {'background': '#2a2a1a', 'color': '#6BCF7F', 'border': '1px solid #6BCF7F'} : 
                        {'background': '#333', 'color': '#FFD93D', 'border': '1px solid #666'}">
                        {{ getSelectedProjectsInGroup(group).length }}/{{ group.projects.length }}
                      </span>
                    </div>
                    
                    <!-- Terminal Dropdown for Applications and Libraries -->
                    @if (group.title === 'Applications' || group.title === 'Libraries') {
                      <div class="relative">
                        <select
                          multiple
                          [value]="getSelectedProjectsInGroup(group)"
                          (change)="onMultipleProjectSelectionChange($event, group)"
                          class="w-full px-3 py-2 rounded font-mono text-sm min-h-20 max-h-32"
                          style="background: #333; color: #e5e5e5; border: 1px solid #666;"
                          [size]="getSelectSize(group.projects.length)">
                          @for (project of group.projects; track project.name) {
                            <option
                              [value]="project.name"
                              [selected]="isProjectSelected(project.name)"
                              class="p-2">
                              {{ project.name }} ({{ project.type }})
                            </option>
                          }
                        </select>
                        <p class="text-xs mt-1" style="color: #666;">
                          <span style="color: #FFD93D;">tip:</span> Hold Ctrl/Cmd to select multiple projects
                        </p>
                      </div>
                    }
                    
                    <!-- Terminal Updated Projects (single click selection) -->
                    @if (group.title === 'Updated Projects') {
                      <div class="grid grid-cols-1 gap-2 rounded p-3 max-h-48 overflow-y-auto" style="border: 2px solid #6BCF7F; background: #1a2a1a; box-shadow: 0 0 10px rgba(107, 207, 127, 0.2);">
                        @for (project of group.projects; track project.name) {
                          <div class="p-2">
                          <label class="items-center gap-3 p-2 rounded cursor-pointer hover:opacity-80 transition-opacity" style="background: #2a2a1a; border: 1px solid #333;">
                            <input
                              type="checkbox"
                              [checked]="isProjectSelected(project.name)"
                              (change)="toggleProjectSelection(project.name)"
                              class="w-4 h-4 rounded">
                            <span class="items-center gap-2">
                              <span class="w-2 h-2 rounded-full" style="background: #6BCF7F;"></span>
                              <span class="font-mono text-sm" style="color: #e5e5e5;">{{ project.name }}</span>
                              <span class="text-xs capitalize" style="color: #666;">{{ project.type }}</span>
                            </span>
                          </label>
                          </div>
                        }
                      </div>
                    }
                  </div>
                }
              </div>
            }
          </div>

          <!-- Terminal Selected Projects Summary -->
          @if (selectedProjects().length > 0) {
            <div class="rounded p-4" style="background: #1f2a1f; border: 1px solid #4a6a4a;">
              <div class="flex items-center gap-3 mb-3">
                <span style="color: #A8A8FF;">></span>
                <span class="font-medium" style="color: #6BCF7F;">Selected Projects ({{ selectedProjects().length }}):</span>
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-6">
                @for (projectName of selectedProjects(); track projectName) {
                  <div class="flex items-center gap-3 p-2 rounded" style="background: #2a2a1a; border: 1px solid #333;">
                    <span class="text-sm font-mono" style="color: #e5e5e5;">{{ projectName }}</span>
                    <div class="flex-1"></div>
                    <button
                      (click)="removeProjectSelection(projectName)"
                      class="text-xs hover:opacity-80 transition-opacity" style="color: #FF4B6D;">
                      ×
                    </button>
                  </div>
                }
              </div>
              <div class="mt-4 flex gap-3 pl-6">
                <button
                  (click)="clearAllProjectSelections()"
                  class="px-3 py-1 text-xs font-mono rounded border hover:opacity-80 transition-opacity" style="background: #333; color: #FF8C42; border-color: #666;">
                  clear --all
                </button>
                <button
                  (click)="loadTestFilesForSelectedProjects()"
                  class="px-3 py-1 text-xs font-mono rounded border hover:opacity-80 transition-opacity" style="background: #333; color: #6BCF7F; border-color: #666;">
                  load --test-files
                </button>
              </div>
            </div>
          }

            <!-- Terminal Test Files Selection -->
            @if (selectedProjects().length > 0) {
              <div>
                <div class="flex items-center justify-between mb-4">
                  <div class="flex items-center gap-3">
                    <span style="color: #A8A8FF;">></span>
                    <span class="text-sm font-medium" style="color: #4ECDC4;">
                      🧪 Test Files ({{ getTotalTestFileCount() }} total):
                    </span>
                  </div>
                  <button 
                    (click)="toggleSelectAllTestFiles()"
                    class="px-2 py-1 text-xs font-mono rounded border hover:opacity-80 transition-opacity" style="background: #333; color: #FFD93D; border-color: #666;">
                    {{ areAllTestFilesSelected() ? 'unselect --all' : 'select --all' }}
                  </button>
                </div>
                
                @if (projectTestFiles().length === 0) {
                  <div class="text-center py-8 rounded pl-6" style="border: 1px solid #333; background: #1a1a1a;">
                    <div class="text-4xl mb-2">🧪</div>
                    <p style="color: #e5e5e5;">No test files loaded</p>
                    <p class="text-xs" style="color: #666;">Click "load --test-files" to discover test files for selected projects</p>
                  </div>
                } @else {
                  <div class="max-h-64 overflow-y-auto rounded p-3 space-y-2 pl-6" style="border: 1px solid #4a4a4a; background: #1f1f1f;">
                    @for (file of projectTestFiles(); track file.path) {
                      <div class="flex items-center gap-3 p-2 rounded hover:opacity-80 transition-opacity" style="background: #2a2a2a; border: 1px solid #333;">
                        <input 
                          type="checkbox"
                          [checked]="file.selected"
                          (change)="toggleTestFile(file)"
                          class="w-4 h-4 rounded">
                        <span class="flex-1 text-sm font-mono truncate" style="color: #e5e5e5;">
                          {{ file.path }}
                        </span>
                        @if (file.testCount) {
                          <span class="text-xs px-2 py-1 rounded" style="color: #FFD93D; background: #333; border: 1px solid #666;">
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

      <!-- Terminal Command Preview -->
      <div class="mt-8 p-4 rounded" style="background: #0a0a0a; border: 1px solid #333;">
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-3">
            <span style="color: #A8A8FF;">></span>
            <span class="text-xs font-medium" style="color: #4ECDC4;">Command preview:</span>
          </div>
          @if (getEstimatedDuration()) {
            <span class="text-xs" style="color: #666;">
              <span style="color: #FFD93D;">est:</span> {{ getEstimatedDuration() }}
            </span>
          }
        </div>
        <code class="text-sm font-mono block break-all pl-6" style="color: #e5e5e5;">
          $ {{ getTestCommand() }}
        </code>
      </div>

      <!-- Terminal Action Buttons -->
      <div class="mt-8 text-right">
        <button 
          (click)="refreshProjects()"
          class="px-4 py-2 text-sm font-mono font-bold rounded border-2 hover:opacity-90 transition-opacity" style="background: #333; color: #4ECDC4; border-color: #666;">
          <span>
            <span>🔄</span>
            <span>REFRESH --projects</span>
          </span>
        </button>
        <button 
          (click)="runTests()"
          [disabled]="!hasValidConfiguration() || testExecution().isRunning"
          class="px-4 py-2 text-sm font-mono font-bold rounded border-2 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
          [ngStyle]="hasValidConfiguration() && !testExecution().isRunning ? 
            {'background': '#6BCF7F', 'color': '#000', 'border-color': '#6BCF7F'} : 
            {'background': '#333', 'color': '#666', 'border-color': '#555'}">
          @if (testExecution().isRunning) {
            <span>
              <span class="animate-spin">⟳</span>
              <span>RUNNING --tests</span>
            </span>
          } @else {
            <span>
              <span>▶</span>
              <span>RUN --tests</span>
            </span>
          }
        </button>
        <button 
          (click)="applyConfiguration()"
          [disabled]="!hasValidConfiguration()"
          class="px-4 py-2 text-sm font-mono font-bold rounded border-2 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity" style="background: #333; color: #FFD93D; border-color: #666;">
          <span>
            <span>✓</span>
            <span>APPLY --config</span>
          </span>
        </button>
      </div>

      <!-- Terminal Test Execution Output -->
      @if (testExecution().isRunning || testExecution().hasResults) {
        <div class="mt-8 rounded-lg" style="border: 1px solid #333;">
          <!-- Terminal Output Header -->
          <div class="flex items-center justify-between p-4 border-b" style="border-color: #333; background: #1a1a1a;">
            <div class="flex items-center gap-3">
              <div class="flex items-center gap-3">
                @if (testExecution().isRunning) {
                  <span class="animate-pulse" style="color: #FFD93D;">[▶]</span>
                } @else if (testExecution().exitCode === 0) {
                  <span style="color: #6BCF7F;">[✓]</span>
                } @else {
                  <span style="color: #FF4B6D;">[✗]</span>
                }
                <span class="font-medium" style="color: #4ECDC4;">test_execution</span>
              </div>
              
              <div class="text-sm" style="color: #666;">
                <span style="color: #FFD93D;">status:</span> {{ getExecutionStatus() }}
                @if (getTestDuration()) {
                  <span style="color: #666;"> | </span>
                  <span style="color: #FFD93D;">time:</span> {{ getTestDuration() }}
                }
              </div>
            </div>
            
            <div class="flex items-center gap-2">
              @if (testExecution().isRunning) {
                <button
                  (click)="cancelTestRun()"
                  class="px-2 py-1 text-xs font-mono rounded border hover:opacity-80 transition-opacity" style="background: #2a1a1a; color: #FF8C42; border-color: #FF8C42;">
                  cancel
                </button>
              } @else {
                @if (testExecution().outputFile) {
                  <button
                    (click)="openOutputFile()"
                    class="px-2 py-1 text-xs font-mono rounded border hover:opacity-80 transition-opacity" style="background: #333; color: #FFD93D; border-color: #666;"
                    title="Open output file in editor">
                    📄 open
                  </button>
                  <button
                    (click)="deleteOutputFile()"
                    class="px-2 py-1 text-xs font-mono rounded border hover:opacity-80 transition-opacity" style="background: #2a1a1a; color: #FF4B6D; border-color: #FF4B6D;"
                    title="Delete output file">
                    🗑️ delete
                  </button>
                }
                <button
                  (click)="copyTestOutput()"
                  class="px-2 py-1 text-xs font-mono rounded border hover:opacity-80 transition-opacity" style="background: #333; color: #A8A8FF; border-color: #666;"
                  title="Copy output to clipboard">
                  📋 copy
                </button>
                <button
                  (click)="runTests()"
                  [disabled]="!hasValidConfiguration()"
                  class="px-2 py-1 text-xs font-mono rounded border hover:opacity-80 disabled:opacity-50 transition-opacity" style="background: #333; color: #6BCF7F; border-color: #666;"
                  title="Rerun tests">
                  🔄 rerun
                </button>
                <button
                  (click)="clearTestOutput()"
                  class="px-2 py-1 text-xs font-mono rounded border hover:opacity-80 transition-opacity" style="background: #333; color: #FF8C42; border-color: #666;"
                  title="Clear output">
                  ✖ clear
                </button>
              }
            </div>
          </div>
          
          <!-- Terminal Output Content -->
          <div class="relative">
            <div class="max-h-96 overflow-y-auto p-4" style="background: #0a0a0a;">
              <pre class="text-sm font-mono whitespace-pre-wrap break-words" style="color: #e5e5e5;">{{ testExecution().output }}</pre>
            </div>
            
            @if (testExecution().isRunning) {
              <div class="absolute bottom-2 right-2">
                <div class="rounded px-2 py-1 text-xs" style="background: #1a1a1a; border: 1px solid #333; color: #FFD93D;">
                  <span class="animate-pulse">[▶]</span> Running...
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
  @Output() navigationRequested = new EventEmitter<void>();

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
  projectLoadingStatus = signal<{ status: string; message: string }>({ status: '', message: '' });

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
    // Clear previous selections first
    this.selectedProject = '';
    this.selectedProjects.set([]);
    this.projectTestFiles.set([]);
    this.affectedProjects.set([]);
    this.baseBranch = 'main';
    this.includeDependencies = false;
    
    // Clear test output when resetting configuration
    this.clearTestOutput();
    
    // Force select affected mode - this will handle mode setting and emit configuration
    // Set it directly first to ensure immediate UI update
    this.testMode.set('affected');
    
    // Log for debugging
    console.log('Test selector reset: Setting mode to affected. Current mode:', this.testMode());
    
    // Then call selectTestMode to handle the rest of the logic
    this.selectTestMode('affected');
    
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
        case 'nxProjectsStatus':
          this.handleNXProjectsStatus(message.data);
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
    this.navigationRequested.emit();
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

  private handleNXProjectsStatus(data: { status: string; message: string }) {
    this.projectLoadingStatus.set(data);
    
    // Update loading state based on status
    switch (data.status) {
      case 'initializing':
      case 'loading':
        this.isLoadingProjects.set(true);
        break;
      case 'cached':
      case 'complete':
      case 'error':
        this.isLoadingProjects.set(false);
        break;
    }
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
