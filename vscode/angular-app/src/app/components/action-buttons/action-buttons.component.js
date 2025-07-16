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
exports.ActionButtonsComponent = void 0;
const core_1 = require("@angular/core");
const common_1 = require("@angular/common");
const command_service_1 = require("../../services/command.service");
const project_store_1 = require("../../stores/project.store");
const command_store_1 = require("../../stores/command.store");
let ActionButtonsComponent = (() => {
    let _classDecorators = [(0, core_1.Component)({
            selector: 'app-action-buttons',
            standalone: true,
            imports: [common_1.CommonModule],
            changeDetection: core_1.ChangeDetectionStrategy.OnPush,
            template: `
    <div class="grid grid-cols-2 gap-vscode-md p-vscode-md">
      @for (action of actions; track action.id) {
        <button 
          [class]="getButtonClasses(action)"
          [disabled]="!canExecute() || isActionRunning(action.id)"
          (click)="executeCommand(action)"
          (mouseenter)="hoveredAction.set(action.id)"
          (mouseleave)="hoveredAction.set(null)"
          [attr.aria-label]="getActionDescription(action)"
          [attr.data-action]="action.id">
          
          <div class="flex items-center justify-between w-full">
            <div class="flex items-center gap-2">
              @if (isActionRunning(action.id)) {
                <div class="action-spinner">
                  <div class="w-4 h-4 border-2 border-vscode-progress border-t-transparent rounded-full animate-spin"></div>
                </div>
              } @else {
                <span class="text-lg" [attr.aria-hidden]="true">{{ getActionIcon(action.id) }}</span>
              }
              
              <span class="font-medium text-sm">{{ action.label }}</span>
            </div>
            
            @if (getActionProgress(action.id) > 0 && isActionRunning(action.id)) {
              <div class="flex items-center gap-1">
                <div class="w-16 h-1 bg-vscode-panel-border rounded-full overflow-hidden">
                  <div 
                    class="h-full bg-vscode-progress transition-all duration-300"
                    [style.width.%]="getActionProgress(action.id)">
                  </div>
                </div>
                <span class="text-xs text-vscode-foreground opacity-75">
                  {{ getActionProgress(action.id) }}%
                </span>
              </div>
            }
          </div>
          
          @if (hoveredAction() === action.id && getLastRun(action.id); as lastRun) {
            <div class="text-xs text-vscode-foreground opacity-75 mt-1 text-left">
              Last run: {{ formatLastRun(lastRun) }}
            </div>
          }
        </button>
      }
    </div>
    
    @if (showTooltip()) {
      <div class="absolute z-50 px-2 py-1 text-xs bg-vscode-tooltip-background text-vscode-tooltip-foreground rounded shadow-lg pointer-events-none"
           [style.transform]="tooltipPosition()">
        {{ tooltipText() }}
      </div>
    }
  `,
            styles: [`
    .action-button {
      @apply relative p-3 rounded-md border transition-all duration-200 ease-in-out;
      @apply bg-vscode-button-background text-vscode-button-foreground;
      @apply border-vscode-button-background;
      @apply hover:bg-vscode-button-hover;
      @apply focus:outline-none focus:ring-2 focus:ring-vscode-selection;
      @apply disabled:opacity-50 disabled:cursor-not-allowed;
    }
    
    .action-button.running {
      @apply bg-vscode-progress bg-opacity-20;
      @apply border-vscode-progress;
    }
    
    .action-button.success {
      @apply bg-vscode-success bg-opacity-20;
      @apply border-vscode-success;
    }
    
    .action-button.error {
      @apply bg-vscode-error bg-opacity-20;
      @apply border-vscode-error;
    }
    
    .action-spinner {
      @apply flex items-center justify-center;
    }
    
    .tooltip {
      @apply absolute z-50 px-2 py-1 text-xs;
      @apply bg-vscode-tooltip-background text-vscode-tooltip-foreground;
      @apply rounded shadow-lg pointer-events-none;
      @apply transform -translate-x-1/2 -translate-y-full;
      @apply top-0 left-1/2;
      @apply mt-1;
    }
  `]
        })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var ActionButtonsComponent = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            ActionButtonsComponent = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        // Simple signals for UI state
        hoveredAction = (0, core_1.signal)(null);
        showTooltip = (0, core_1.signal)(false);
        selectedProject = (0, core_1.signal)('');
        tooltipPosition = (0, core_1.signal)('translate(-50%, -100%)');
        // Inject services and stores
        commandService = (0, core_1.inject)(command_service_1.CommandService);
        projectStore = (0, core_1.inject)(project_store_1.ProjectStore);
        commandStore = (0, core_1.inject)(command_store_1.CommandStore);
        // Action configuration
        actions = [
            {
                id: 'aiDebug',
                label: 'AI Debug',
                icon: 'debug-alt',
                enabled: true,
                status: 'idle',
                description: 'Run complete AI debug analysis with test execution and context generation'
            },
            {
                id: 'nxTest',
                label: 'NX Test',
                icon: 'beaker',
                enabled: true,
                status: 'idle',
                description: 'Execute NX tests with AI-optimized output formatting'
            },
            {
                id: 'gitDiff',
                label: 'Git Diff',
                icon: 'git-compare',
                enabled: true,
                status: 'idle',
                description: 'Analyze git changes and generate smart diff summary'
            },
            {
                id: 'prepareToPush',
                label: 'Prepare to Push',
                icon: 'rocket',
                enabled: true,
                status: 'idle',
                description: 'Lint, format, and prepare code for push with PR description generation'
            }
        ];
        // Computed properties
        canExecute = (0, core_1.computed)(() => {
            const hasProject = this.selectedProject().length > 0;
            const isNotOverloaded = this.commandStore.activeCommandCount() < 3;
            const queueNotFull = this.commandStore.queueLength() < 5;
            return hasProject && (isNotOverloaded || queueNotFull);
        });
        tooltipText = (0, core_1.computed)(() => {
            const hovered = this.hoveredAction();
            if (!hovered)
                return '';
            const action = this.actions.find(a => a.id === hovered);
            return action?.description || '';
        });
        constructor() {
            // Auto-select first project when projects are loaded
            (0, core_1.effect)(() => {
                const projects = this.projectStore.availableProjects();
                if (projects.length > 0 && !this.selectedProject()) {
                    this.selectedProject.set(projects[0].name);
                }
            });
            // Update tooltip visibility
            (0, core_1.effect)(() => {
                const hovered = this.hoveredAction();
                this.showTooltip.set(!!hovered);
            });
        }
        // Action execution
        async executeCommand(action) {
            const project = this.selectedProject();
            if (!project && action.id !== 'gitDiff') {
                this.showError('Please select a project first');
                return;
            }
            if (!this.canExecute()) {
                this.showError('Cannot execute command: queue is full or no project selected');
                return;
            }
            try {
                await this.commandService.executeCommand(action.id, project, { priority: 'normal' });
            }
            catch (error) {
                this.showError(`Failed to execute ${action.label}: ${error}`);
            }
        }
        // UI state helpers
        isActionRunning(actionId) {
            const activeCommands = this.commandStore.activeCommands();
            return Object.values(activeCommands).some(cmd => cmd.action === actionId && cmd.status === 'running');
        }
        getActionProgress(actionId) {
            const activeCommands = this.commandStore.activeCommands();
            const command = Object.values(activeCommands).find(cmd => cmd.action === actionId);
            return command?.progress || 0;
        }
        getActionStatus(actionId) {
            if (this.isActionRunning(actionId))
                return 'running';
            const recentActivity = this.commandStore.recentActivity();
            const lastRun = recentActivity.find(cmd => cmd.action === actionId);
            if (!lastRun)
                return 'idle';
            return lastRun.status === 'success' ? 'success' : 'error';
        }
        getLastRun(actionId) {
            const recentActivity = this.commandStore.recentActivity();
            const lastRun = recentActivity.find(cmd => cmd.action === actionId);
            return lastRun?.startTime || null;
        }
        getButtonClasses(action) {
            const baseClasses = 'action-button';
            const status = this.getActionStatus(action.id);
            return `${baseClasses} ${status}`;
        }
        getActionIcon(actionId) {
            const iconMap = {
                'aiDebug': '🤖',
                'nxTest': '🧪',
                'gitDiff': '📋',
                'prepareToPush': '🚀'
            };
            return iconMap[actionId] || '📄';
        }
        getActionDescription(action) {
            const status = this.getActionStatus(action.id);
            const progress = this.getActionProgress(action.id);
            if (status === 'running') {
                return `${action.description} (${progress}% complete)`;
            }
            return action.description;
        }
        formatLastRun(lastRun) {
            const now = new Date();
            const diff = now.getTime() - lastRun.getTime();
            const seconds = Math.floor(diff / 1000);
            const minutes = Math.floor(seconds / 60);
            const hours = Math.floor(minutes / 60);
            if (hours > 0)
                return `${hours}h ago`;
            if (minutes > 0)
                return `${minutes}m ago`;
            return `${seconds}s ago`;
        }
        // Error handling
        showError(message) {
            console.error(message);
            // Toast notification would be handled by a toast service
        }
        // Keyboard navigation
        onKeyDown(event, action) {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                this.executeCommand(action);
            }
        }
        // Accessibility
        getActionState(actionId) {
            const status = this.getActionStatus(actionId);
            const progress = this.getActionProgress(actionId);
            switch (status) {
                case 'running':
                    return `Running, ${progress}% complete`;
                case 'success':
                    return 'Last run succeeded';
                case 'error':
                    return 'Last run failed';
                default:
                    return 'Ready to run';
            }
        }
    };
    return ActionButtonsComponent = _classThis;
})();
exports.ActionButtonsComponent = ActionButtonsComponent;
//# sourceMappingURL=action-buttons.component.js.map