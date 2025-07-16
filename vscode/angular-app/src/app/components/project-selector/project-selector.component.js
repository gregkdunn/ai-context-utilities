"use strict";
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectSelectorComponent = void 0;
const core_1 = require("@angular/core");
const common_1 = require("@angular/common");
const forms_1 = require("@angular/forms");
const project_store_1 = require("../../stores/project.store");
const command_store_1 = require("../../stores/command.store");
const webview_service_1 = require("../../services/webview.service");
let ProjectSelectorComponent = (() => {
    let _classDecorators = [(0, core_1.Component)({
            selector: 'app-project-selector',
            standalone: true,
            imports: [common_1.CommonModule, forms_1.FormsModule],
            changeDetection: core_1.ChangeDetectionStrategy.OnPush,
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
        })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var ProjectSelectorComponent = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            ProjectSelectorComponent = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        // Inject services and stores
        projectStore = (0, core_1.inject)(project_store_1.ProjectStore);
        commandStore = (0, core_1.inject)(command_store_1.CommandStore);
        webviewService = (0, core_1.inject)(webview_service_1.WebviewService);
        // Component state
        selectedProject = (0, core_1.signal)('');
        showProjectInfo = (0, core_1.signal)(false);
        error = (0, core_1.signal)('');
        // Output events
        projectSelected = (0, core_1.output)();
        // Computed properties
        hasProjects = (0, core_1.computed)(() => this.projectStore.hasProjects());
        sortedProjects = (0, core_1.computed)(() => {
            const projects = this.projectStore.availableProjects();
            return [...projects].sort((a, b) => {
                // Sort by type first (applications before libraries), then by name
                if (a.projectType !== b.projectType) {
                    return a.projectType === 'application' ? -1 : 1;
                }
                return a.name.localeCompare(b.name);
            });
        });
        selectedProjectInfo = (0, core_1.computed)(() => {
            const projectName = this.selectedProject();
            return projectName ? this.projectStore.getProjectByName(projectName) : null;
        });
        constructor() {
            // Auto-select default project
            (0, core_1.effect)(() => {
                const defaultProject = this.projectStore.defaultProject();
                if (defaultProject && !this.selectedProject()) {
                    this.selectedProject.set(defaultProject.name);
                    this.projectSelected.emit(defaultProject.name);
                }
            });
            // Clear error when projects change
            (0, core_1.effect)(() => {
                this.projectStore.availableProjects();
                this.error.set('');
            });
            // Load projects on initialization
            this.loadProjects();
        }
        // Project selection
        onProjectChange(event) {
            const target = event.target;
            const projectName = target.value;
            if (projectName) {
                this.selectedProject.set(projectName);
                this.projectSelected.emit(projectName);
                this.webviewService.setProject(projectName);
                this.showProjectInfo.set(false);
            }
        }
        // Project info toggle
        toggleProjectInfo() {
            this.showProjectInfo.update(show => !show);
        }
        // Project refresh
        refreshProjects() {
            this.projectStore.refreshProjects();
            this.loadProjects();
        }
        async loadProjects() {
            try {
                this.webviewService.getProjects();
            }
            catch (error) {
                this.error.set('Failed to load projects. Please try refreshing.');
                console.error('Failed to load projects:', error);
            }
        }
        // Project capabilities
        getProjectCapabilities(project) {
            return [
                { name: 'Test', available: !!project.targets?.test },
                { name: 'Build', available: !!project.targets?.build },
                { name: 'Lint', available: !!project.targets?.lint },
                { name: 'Serve', available: !!project.targets?.serve },
                { name: 'E2E', available: !!project.targets?.e2e }
            ];
        }
        // Project statistics
        getProjectStats(projectName) {
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
        formatDuration(ms) {
            if (ms < 1000)
                return `${ms}ms`;
            if (ms < 60000)
                return `${(ms / 1000).toFixed(1)}s`;
            return `${(ms / 60000).toFixed(1)}m`;
        }
        // Keyboard navigation
        onKeyDown(event) {
            if (event.key === 'Escape') {
                this.showProjectInfo.set(false);
            }
        }
        // Accessibility
        getSelectionAnnouncement() {
            const selected = this.selectedProject();
            const project = this.selectedProjectInfo();
            if (!selected || !project)
                return 'No project selected';
            const capabilities = this.getProjectCapabilities(project);
            const availableCommands = capabilities.filter(c => c.available).map(c => c.name);
            return `Selected ${project.name}, ${project.projectType} project. Available commands: ${availableCommands.join(', ')}`;
        }
        // Public API for parent components
        getSelectedProject() {
            return this.selectedProject();
        }
        setSelectedProject(projectName) {
            if (this.projectStore.getProjectByName(projectName)) {
                this.selectedProject.set(projectName);
                this.projectSelected.emit(projectName);
            }
        }
        clearSelection() {
            this.selectedProject.set('');
            this.showProjectInfo.set(false);
        }
    };
    return ProjectSelectorComponent = _classThis;
})();
exports.ProjectSelectorComponent = ProjectSelectorComponent;
//# sourceMappingURL=project-selector.component.js.map