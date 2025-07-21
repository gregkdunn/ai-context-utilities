import { Component, ChangeDetectionStrategy, inject, signal, computed, effect, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CommandStore } from '../../stores/command.store';
import { CommandExecution, QueuedCommand, ProgressInfo } from '../../models';

@Component({
  selector: 'app-progress-indicator',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="progress-indicator bg-vscode-panel-background border border-vscode-panel-border rounded-md p-vscode-md">
      <!-- Overall Progress Header -->
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-2">
          <h3 class="text-sm font-medium text-vscode-foreground">Progress</h3>
          @if (hasActiveCommands()) {
            <div class="flex items-center gap-1">
              <div class="w-2 h-2 bg-vscode-progress rounded-full animate-pulse"></div>
              <span class="text-xs text-vscode-progress">{{ activeCount() }} active</span>
            </div>
          }
        </div>
        
        <div class="flex items-center gap-2 text-xs text-vscode-foreground opacity-75">
          @if (queueLength() > 0) {
            <span>{{ queueLength() }} queued</span>
          }
          @if (totalDuration() > 0) {
            <span>{{ formatDuration(totalDuration()) }} total</span>
          }
        </div>
      </div>

      <!-- Overall Progress Bar -->
      @if (hasActiveCommands() || queueLength() > 0) {
        <div class="overall-progress mb-4">
          <div class="flex justify-between items-center mb-2">
            <span class="text-xs text-vscode-foreground">Overall Progress</span>
            <span class="text-xs text-vscode-foreground">{{ Math.round(overallProgress()) }}%</span>
          </div>
          <div class="w-full h-2 bg-vscode-input-background border border-vscode-input-border rounded-full overflow-hidden">
            <div 
              class="h-full bg-gradient-to-r from-vscode-progress to-vscode-success transition-all duration-300"
              [style.width.%]="overallProgress()">
            </div>
          </div>
          <div class="flex justify-between text-xs text-vscode-foreground opacity-75 mt-1">
            <span>{{ completedCount() }} completed</span>
            <span>{{ formatETA(estimatedTimeRemaining()) }}</span>
          </div>
        </div>
      }

      <!-- Active Commands -->
      @if (hasActiveCommands()) {
        <div class="active-commands mb-4">
          <h4 class="text-sm font-medium text-vscode-foreground mb-2">Active Commands</h4>
          <div class="space-y-2">
            @for (command of activeCommands(); track command.id) {
              <div class="command-item bg-vscode-input-background border border-vscode-input-border rounded-md p-3">
                <div class="flex items-center justify-between mb-2">
                  <div class="flex items-center gap-2">
                    <span class="text-lg">{{ getCommandIcon(command.action) }}</span>
                    <div>
                      <div class="text-sm font-medium text-vscode-foreground">{{ command.action }}</div>
                      <div class="text-xs text-vscode-foreground opacity-75">{{ command.project }}</div>
                    </div>
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="text-xs text-vscode-foreground">{{ command.progress }}%</span>
                    @if (command.status === 'running') {
                      <div class="w-4 h-4 border-2 border-vscode-progress border-t-transparent rounded-full animate-spin"></div>
                    }
                  </div>
                </div>
                
                <!-- Individual progress bar -->
                <div class="progress-bar mb-2">
                  <div class="w-full h-1.5 bg-vscode-panel-border rounded-full overflow-hidden">
                    <div 
                      class="h-full transition-all duration-300"
                      [class]="getProgressBarClass(command.status)"
                      [style.width.%]="command.progress">
                    </div>
                  </div>
                </div>
                
                <!-- Command details -->
                <div class="flex items-center justify-between text-xs">
                  <div class="flex items-center gap-3">
                    <span class="text-vscode-foreground opacity-75">
                      Started: {{ formatTime(command.startTime) }}
                    </span>
                    <span class="text-vscode-foreground opacity-75">
                      Duration: {{ formatDuration(getCommandDuration(command)) }}
                    </span>
                  </div>
                  <div class="flex items-center gap-1">
                    <span class="priority-badge" [class]="getPriorityClass(command.priority)">
                      {{ command.priority }}
                    </span>
                  </div>
                </div>
                
                <!-- Status indicator -->
                @if (command.status === 'running') {
                  <div class="status-indicator mt-2 text-xs text-vscode-progress">
                    <span class="animate-pulse">● </span>
                    {{ getStatusMessage(command) }}
                  </div>
                }
              </div>
            }
          </div>
        </div>
      }

      <!-- Queue -->
      @if (queueLength() > 0) {
        <div class="queue-section mb-4">
          <div class="flex items-center justify-between mb-2">
            <h4 class="text-sm font-medium text-vscode-foreground">Queue</h4>
            <span class="text-xs text-vscode-foreground opacity-75">{{ queueLength() }} waiting</span>
          </div>
          
          <div class="queue-items space-y-1">
            @for (item of queuedCommands(); track item.id; let i = $index) {
              <div class="queue-item flex items-center justify-between p-2 bg-vscode-input-background border border-vscode-input-border rounded hover:bg-vscode-hover transition-colors">
                <div class="flex items-center gap-2">
                  <span class="text-xs text-vscode-foreground opacity-50">{{ i + 1 }}</span>
                  <span class="text-sm">{{ getCommandIcon(item.action) }}</span>
                  <div>
                    <div class="text-sm text-vscode-foreground">{{ item.action }}</div>
                    <div class="text-xs text-vscode-foreground opacity-75">{{ item.project }}</div>
                  </div>
                </div>
                
                <div class="flex items-center gap-2">
                  <span class="priority-badge" [class]="getPriorityClass(item.priority)">
                    {{ item.priority }}
                  </span>
                  <span class="text-xs text-vscode-foreground opacity-75">
                    {{ formatTime(item.timestamp) }}
                  </span>
                </div>
              </div>
            }
          </div>
        </div>
      }

      <!-- Statistics -->
      @if (showStats()) {
        <div class="statistics">
          <h4 class="text-sm font-medium text-vscode-foreground mb-2">Statistics</h4>
          <div class="grid grid-cols-2 gap-3">
            <div class="stat-item bg-vscode-input-background border border-vscode-input-border rounded p-2">
              <div class="text-xs text-vscode-foreground opacity-75">Success Rate</div>
              <div class="text-lg font-medium text-vscode-success">{{ successRate() }}%</div>
            </div>
            <div class="stat-item bg-vscode-input-background border border-vscode-input-border rounded p-2">
              <div class="text-xs text-vscode-foreground opacity-75">Avg Duration</div>
              <div class="text-lg font-medium text-vscode-foreground">{{ formatDuration(averageDuration()) }}</div>
            </div>
            <div class="stat-item bg-vscode-input-background border border-vscode-input-border rounded p-2">
              <div class="text-xs text-vscode-foreground opacity-75">Total Runs</div>
              <div class="text-lg font-medium text-vscode-info">{{ totalRuns() }}</div>
            </div>
            <div class="stat-item bg-vscode-input-background border border-vscode-input-border rounded p-2">
              <div class="text-xs text-vscode-foreground opacity-75">Queue Time</div>
              <div class="text-lg font-medium text-vscode-warning">{{ formatDuration(averageQueueTime()) }}</div>
            </div>
          </div>
        </div>
      }

      <!-- Empty State -->
      @if (!hasActiveCommands() && queueLength() === 0 && !showStats()) {
        <div class="empty-state text-center py-8 text-vscode-foreground opacity-50">
          <div class="text-3xl mb-2">⏳</div>
          <div class="text-sm">No active commands</div>
          <div class="text-xs mt-1">Progress will appear here when commands are running</div>
        </div>
      }
    </div>
  `,
  styles: [`
    .progress-indicator {
      font-family: var(--vscode-font-family);
    }
    
    .command-item {
      transition: all 0.2s ease-in-out;
    }
    
    .command-item:hover {
      transform: translateY(-1px);
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
    
    .progress-bar {
      position: relative;
    }
    
    .progress-bar::after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
      animation: shimmer 2s infinite;
      opacity: 0;
    }
    
    .progress-bar.running::after {
      opacity: 1;
    }
    
    @keyframes shimmer {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(100%); }
    }
    
    .priority-badge {
      @apply text-xs px-2 py-1 rounded;
    }
    
    .priority-badge.high {
      @apply bg-vscode-error text-white;
    }
    
    .priority-badge.normal {
      @apply bg-vscode-info text-white;
    }
    
    .priority-badge.low {
      @apply bg-vscode-foreground bg-opacity-20 text-vscode-foreground;
    }
    
    .status-indicator {
      @apply flex items-center gap-1;
    }
    
    .queue-item {
      @apply cursor-pointer;
    }
    
    .stat-item {
      @apply text-center;
    }
    
    .overall-progress {
      @apply relative;
    }
    
    .overall-progress::after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
      animation: progressShimmer 3s infinite;
      pointer-events: none;
    }
    
    @keyframes progressShimmer {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(100%); }
    }
  `]
})
export class ProgressIndicatorComponent {
  // Inputs
  readonly compact = input<boolean>(false);
  readonly showQueue = input<boolean>(true);
  readonly showStatistics = input<boolean>(true);

  // Injected services
  private readonly commandStore = inject(CommandStore);

  // Computed properties
  readonly activeCommands = computed(() => {
    return Object.values(this.commandStore.activeCommands());
  });

  readonly queuedCommands = computed(() => {
    return this.commandStore.executionQueue();
  });

  readonly hasActiveCommands = computed(() => {
    return this.activeCommands().length > 0;
  });

  readonly activeCount = computed(() => {
    return this.activeCommands().length;
  });

  readonly queueLength = computed(() => {
    return this.queuedCommands().length;
  });

  readonly completedCount = computed(() => {
    return this.commandStore.commandHistory().length;
  });

  readonly totalRuns = computed(() => {
    return this.commandStore.commandHistory().length + this.activeCount();
  });

  readonly overallProgress = computed(() => {
    const active = this.activeCommands();
    if (active.length === 0) return 0;
    
    const totalProgress = active.reduce((sum, cmd) => sum + cmd.progress, 0);
    return totalProgress / active.length;
  });

  readonly totalDuration = computed(() => {
    const active = this.activeCommands();
    return active.reduce((sum, cmd) => sum + this.getCommandDuration(cmd), 0);
  });

  readonly estimatedTimeRemaining = computed(() => {
    const active = this.activeCommands();
    let totalETA = 0;
    
    active.forEach(cmd => {
      const duration = this.getCommandDuration(cmd);
      const progress = Math.max(cmd.progress, 1);
      const estimatedTotal = (duration * 100) / progress;
      totalETA += Math.max(0, estimatedTotal - duration);
    });
    
    return totalETA;
  });

  readonly successRate = computed(() => {
    const history = this.commandStore.commandHistory();
    if (history.length === 0) return 0;
    
    const successful = history.filter(cmd => cmd.status === 'success').length;
    return Math.round((successful / history.length) * 100);
  });

  readonly averageDuration = computed(() => {
    const history = this.commandStore.commandHistory();
    if (history.length === 0) return 0;
    
    const totalDuration = history.reduce((sum, cmd) => sum + cmd.duration, 0);
    return totalDuration / history.length;
  });

  readonly averageQueueTime = computed(() => {
    const history = this.commandStore.commandHistory();
    if (history.length === 0) return 0;
    
    // Mock queue time calculation
    return 5000; // 5 seconds average
  });

  readonly showStats = computed(() => {
    return this.showStatistics() && this.totalRuns() > 0;
  });

  // Helper methods
  getCommandIcon(action: string): string {
    const iconMap: Record<string, string> = {
      'aiDebug': '🤖',
      'nxTest': '🧪',
      'gitDiff': '📋',
      'prepareToPush': '🚀'
    };
    
    return iconMap[action] || '📄';
  }

  getCommandDuration(command: CommandExecution): number {
    const endTime = command.endTime || new Date();
    return endTime.getTime() - command.startTime.getTime();
  }

  getProgressBarClass(status: string): string {
    switch (status) {
      case 'running':
        return 'bg-vscode-progress running';
      case 'success':
        return 'bg-vscode-success';
      case 'error':
        return 'bg-vscode-error';
      case 'cancelled':
        return 'bg-vscode-warning';
      default:
        return 'bg-vscode-panel-border';
    }
  }

  getPriorityClass(priority: string): string {
    return priority;
  }

  getStatusMessage(command: CommandExecution): string {
    const messages: Record<string, string[]> = {
      'aiDebug': [
        'Analyzing code structure...',
        'Running tests...',
        'Generating context...',
        'Preparing AI debug session...'
      ],
      'nxTest': [
        'Setting up test environment...',
        'Running unit tests...',
        'Collecting coverage...',
        'Generating test report...'
      ],
      'gitDiff': [
        'Analyzing git changes...',
        'Generating diff summary...',
        'Preparing change analysis...'
      ],
      'prepareToPush': [
        'Running linter...',
        'Formatting code...',
        'Running tests...',
        'Generating PR description...'
      ]
    };
    
    const actionMessages = messages[command.action] || ['Processing...'];
    const progressStep = Math.floor((command.progress / 100) * actionMessages.length);
    return actionMessages[Math.min(progressStep, actionMessages.length - 1)];
  }

  formatTime(date: Date): string {
    return date.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }

  formatDuration(ms: number): string {
    if (ms < 1000) return '0s';
    
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  formatETA(ms: number): string {
    if (ms < 1000) return 'ETA: <1s';
    
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    
    if (minutes > 0) {
      return `ETA: ${minutes}m ${seconds % 60}s`;
    } else {
      return `ETA: ${seconds}s`;
    }
  }

  // Expose Math for template
  Math = Math;
}
