import { Component, ChangeDetectionStrategy, inject, signal, computed, effect, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProjectStore } from '../../stores/project.store';
import { CommandStore } from '../../stores/command.store';
import { WebviewService } from '../../services/webview.service';
import { NxProject } from '../../models';

@Component({
  selector: 'app-project-selector',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="project-selector-container">
      <div class="flex items-center gap-2 mb-2">
        <label 
          for="project-select" 
          class="text-sm font-medium text-vscode-foreground">
          Project:
        </label>
        
        @if (projectStore.isLoading()) {
          <div class="w-4 h-4 border-2 border-vscode-progress border-t-transparent rounded-full animate-spin"></div>
        }
        
        @if (projectStore.isStale()) {
          <button 
            type="button"
            class="refresh-button"
            (click)="refreshProjects()"
            [disabled]="projectStore.isLoading()"
            aria-label="Refresh projects">
            🔄
          </button>
        }
      </div>
      
      <div class="relative">
        <select 
          id="project-select"
          class="project-select"
          [value]="selectedProject()"
          (change)="onProjectChange($event)"
          [disabled]="projectStore.isLoading() || !hasProjects()"
          [attr.aria-describedby]="'project-info'"
          [attr.aria-expanded]="showProjectInfo()">
          
          <option value="" disabled>
            @if (projectStore.isLoading()) {
              Loading projects...
            } @else if (!hasProjects()) {
              No projects found
            } @else {
              Select a project...
            }
          </option>
          
          @for (project of sortedProjects(); track project.name) {
            <option 
              [value]="project.name"
              [attr.data-project-type]="project.projectType">
              {{ project.name }} ({{ project.projectType }})
            </option>
          }
        </select>
        
        @if (selectedProject() && selectedProjectInfo(); as project) {
          <button 
            type="button"
            class="info-button"
            (click)="toggleProjectInfo()"
            [attr.aria-expanded]="showProjectInfo()"
            aria-label="Toggle project information">
            ℹ️
          </button>
        }
      </div>
      
      @if (showProjectInfo() && selectedProjectInfo(); as project) {
        <div 
          id="project-info"
          class="project-info animate-fade-in"
          role="region"
          aria-label="Project information">
          
          <div class="project-info-grid">
            <div class="info-item">
              <span class="info-label">Type:</span>
              <span class="info-value">{{ project.projectType }}</span>
            </div>
            
            <div class="info-item">
              <span class="info-label">Root:</span>
              <span class="info-value">{{ project.root }}</span>
            </div>
            
            <div class="info-item">
              <span class="info-label">Source:</span>
              <span class="info-value">{{ project.sourceRoot }}</span>
            </div>
          </div>
          
          @if (getProjectCapabilities(project); as capabilities) {
            <div class="capabilities-section">
              <h4 class="capabilities-title">Available Commands:</h4>
              <div class="capabilities-grid">
                @for (capability of capabilities; track capability.name) {
                  <div class="capability-item" [class.available]="capability.available">
                    <span class="capability-icon">
                      {{ capability.available ? '✅' : '❌' }}
                    </span>
                    <span class="capability-name">{{ capability.name }}</span>
                  </div>
                }
              </div>
            </div>
          }
          
          @if (getProjectStats(project.name); as stats) {
            <div class="stats-section">
              <h4 class="stats-title">Recent Activity:</h4>
              <div class="stats-grid">
                <div class="stat-item">
                  <span class="stat-label">Total Runs:</span>
                  <span class="stat-value">{{ stats.totalRuns }}</span>
                </div>
                
                <div class="stat-item">
                  <span class="stat-label">Success Rate:</span>
                  <span class="stat-value" [class.success]="stats.successRate > 80" [class.warning]="stats.successRate <= 80">
                    {{ stats.successRate.toFixed(1) }}%
                  </span>
                </div>
                
                <div class="stat-item">
                  <span class="stat-label">Avg. Time:</span>
                  <span class="stat-value">{{ formatDuration(stats.averageTime) }}</span>
                </div>
              </div>
            </div>
          }
        </div>
      }
      
      @if (error()) {
        <div class="error-message" role="alert">
          {{ error() }}
        </div>
      }
    </div>
  `,
  styles: [`
    .project-selector-container {
      @apply w-full;
    }
    
    .project-select {
      @apply w-full px-3 py-2 text-sm;
      @apply bg-vscode-input-background text-vscode-input-foreground;
      @apply border border-vscode-input-border rounded;
      @apply focus:outline-none focus:ring-2 focus:ring-vscode-selection;
      @apply disabled:opacity-50 disabled:cursor-not-allowed;
    }
    
    .refresh-button {
      @apply px-2 py-1 text-xs;
      @apply bg-vscode-button-background text-vscode-button-foreground;
      @apply border border-vscode-button-background rounded;
      @apply hover:bg-vscode-button-hover;
      @apply focus:outline-none focus:ring-2 focus:ring-vscode-selection;
      @apply disabled:opacity-50 disabled:cursor-not-allowed;
      @apply transition-colors duration-200;
    }
    
    .info-button {
      @apply absolute right-2 top-1/2 transform -translate-y-1/2;
      @apply w-6 h-6 text-xs;
      @apply bg-transparent hover:bg-vscode-hover;
      @apply border-none rounded-full;
      @apply focus:outline-none focus:ring-2 focus:ring-vscode-selection;
      @apply transition-colors duration-200;
    }
    
    .project-info {
      @apply mt-2 p-3 rounded;
      @apply bg-vscode-panel-background;
      @apply border border-vscode-panel-border;
    }
    
    .project-info-grid {
      @apply grid grid-cols-1 gap-2 mb-3;
    }
    
    .info-item {
      @apply flex justify-between items-center;
    }
    
    .info-label {
      @apply text-xs font-medium text-vscode-foreground opacity-75;
    }
    
    .info-value {
      @apply text-xs font-mono text-vscode-foreground;
    }
    
    .capabilities-section {
      @apply mb-3;
    }
    
    .capabilities-title {
      @apply text-xs font-medium text-vscode-foreground mb-2;
    }
    
    .capabilities-grid {
      @apply grid grid-cols-2 gap-1;
    }
    
    .capability-item {
      @apply flex items-center gap-2 px-2 py-1 rounded;
      @apply text-xs;
    }
    
    .capability-item.available {
      @apply bg-vscode-success bg-opacity-20;
    }
    
    .capability-icon {
      @apply text-xs;
    }
    
    .capability-name {
      @apply text-xs;
    }
    
    .stats-section {
      @apply mb-0;
    }
    
    .stats-title {
      @apply text-xs font-medium text-vscode-foreground mb-2;
    }
    
    .stats-grid {
      @apply grid grid-cols-3 gap-2;
    }
    
    .stat-item {
      @apply text-center;
    }
    
    .stat-label {
      @apply block text-xs text-vscode-foreground opacity-75;
    }
    
    .stat-value {
      @apply block text-xs font-medium text-vscode-foreground;
    }
    
    .stat-value.success {
      @apply text-vscode-success;
    }
    
    .stat-value.warning {
      @apply text-vscode-warning;
    }
    
    .error-message {
      @apply mt-2 p-2 text-xs;
      @apply bg-vscode-error bg-opacity-20;
      @apply text-vscode-error;
      @apply border border-vscode-error;
      @apply rounded;
    }
  `]
})
export class ProjectSelectorComponent {
  // Inject services and stores
  readonly projectStore = inject(ProjectStore);
  private readonly commandStore = inject(CommandStore);
  private readonly webviewService = inject(WebviewService);

  // Component state
  private selectedProject = signal<string>('');
  private showProjectInfo = signal(false);
  private error = signal<string>('');

  // Output events
  projectSelected = output<string>();

  // Computed properties
  private hasProjects = computed(() => this.projectStore.hasProjects());
  
  private sortedProjects = computed(() => {
    const projects = this.projectStore.availableProjects();
    return [...projects].sort((a, b) => {
      // Sort by type first (applications before libraries), then by name
      if (a.projectType !== b.projectType) {
        return a.projectType === 'application' ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
  });

  private selectedProjectInfo = computed(() => {
    const projectName = this.selectedProject();
    return projectName ? this.projectStore.getProjectByName(projectName) : null;
  });

  constructor() {
    // Auto-select default project
    effect(() => {
      const defaultProject = this.projectStore.defaultProject();
      if (defaultProject && !this.selectedProject()) {
        this.selectedProject.set(defaultProject.name);
        this.projectSelected.emit(defaultProject.name);
      }
    });

    // Clear error when projects change
    effect(() => {
      this.projectStore.availableProjects();
      this.error.set('');
    });

    // Load projects on initialization
    this.loadProjects();
  }

  // Project selection
  onProjectChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const projectName = target.value;
    
    if (projectName) {
      this.selectedProject.set(projectName);
      this.projectSelected.emit(projectName);
      this.webviewService.setProject(projectName);
      this.showProjectInfo.set(false);
    }
  }

  // Project info toggle
  toggleProjectInfo(): void {
    this.showProjectInfo.update(show => !show);
  }

  // Project refresh
  refreshProjects(): void {
    this.projectStore.refreshProjects();
    this.loadProjects();
  }

  private async loadProjects(): Promise<void> {
    try {
      this.webviewService.getProjects();
    } catch (error) {
      this.error.set('Failed to load projects. Please try refreshing.');
      console.error('Failed to load projects:', error);
    }
  }

  // Project capabilities
  getProjectCapabilities(project: NxProject): Array<{name: string, available: boolean}> {
    return [
      { name: 'Test', available: !!project.targets?.['test'] },
      { name: 'Build', available: !!project.targets?.['build'] },
      { name: 'Lint', available: !!project.targets?.['lint'] },
      { name: 'Serve', available: !!project.targets?.['serve'] },
      { name: 'E2E', available: !!project.targets?.['e2e'] }
    ];
  }

  // Project statistics
  getProjectStats(projectName: string): {
    totalRuns: number;
    successRate: number;
    averageTime: number;
  } {
    const projectCommands = this.commandStore.commandsByProject()[projectName] || [];
    
    if (projectCommands.length === 0) {
      return { totalRuns: 0, successRate: 0, averageTime: 0 };
    }

    const totalRuns = projectCommands.length;
    const successfulRuns = projectCommands.filter(cmd => cmd.status === 'success').length;
    const successRate = (successfulRuns / totalRuns) * 100;
    
    const completedCommands = projectCommands.filter(cmd => cmd.endTime);
    const averageTime = completedCommands.length > 0
      ? completedCommands.reduce((sum, cmd) => sum + cmd.duration, 0) / completedCommands.length
      : 0;

    return { totalRuns, successRate, averageTime };
  }

  // Utility methods
  formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  }

  // Keyboard navigation
  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.showProjectInfo.set(false);
    }
  }

  // Accessibility
  getSelectionAnnouncement(): string {
    const selected = this.selectedProject();
    const project = this.selectedProjectInfo();
    
    if (!selected || !project) return 'No project selected';
    
    const capabilities = this.getProjectCapabilities(project);
    const availableCommands = capabilities.filter(c => c.available).map(c => c.name);
    
    return `Selected ${project.name}, ${project.projectType} project. Available commands: ${availableCommands.join(', ')}`;
  }

  // Public API for parent components
  getSelectedProject(): string {
    return this.selectedProject();
  }

  setSelectedProject(projectName: string): void {
    if (this.projectStore.getProjectByName(projectName)) {
      this.selectedProject.set(projectName);
      this.projectSelected.emit(projectName);
    }
  }

  clearSelection(): void {
    this.selectedProject.set('');
    this.showProjectInfo.set(false);
  }
}
