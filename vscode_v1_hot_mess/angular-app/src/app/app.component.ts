import { Component, OnInit, signal, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CommandStore } from './stores/command.store';
import { ProjectStore } from './stores/project.store';
import { WebviewService } from './services/webview.service';
import { ToastNotificationComponent, ToastNotificationService } from './components/toast-notification/toast-notification.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, ToastNotificationComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ToastNotificationService],
  template: `
    <div class="app-container h-screen flex flex-col bg-vscode-background text-vscode-foreground"
         [attr.aria-label]="getAppAriaLabel()">
      
      <!-- Header -->
      <header class="flex items-center justify-between p-4 border-b border-vscode-panel-border bg-vscode-panel-background">
        <div class="flex items-center gap-3">
          <h1 class="text-lg font-semibold">{{ title }}</h1>
          <div class="flex items-center gap-2 text-sm">
            <span [class]="getStatusClass()" 
                  [title]="getStatusTitle()">
              {{ getStatusIcon() }}
            </span>
            <span class="text-vscode-foreground opacity-75">
              {{ getStatusTitle() }}
            </span>
          </div>
        </div>
        
        <div class="flex items-center gap-2">
          <button 
            class="px-3 py-1 text-xs bg-vscode-button-background text-vscode-button-foreground rounded hover:bg-vscode-button-hoverBackground transition-colors"
            (click)="refreshData()"
            [title]="getShortcutTitle('Refresh data', 'Ctrl+R')"
            [disabled]="hasActiveCommands()">
            🔄 Refresh
          </button>
          
          @if (hasActiveCommands()) {
            <button 
              class="px-3 py-1 text-xs bg-vscode-error text-white rounded hover:opacity-80 transition-opacity"
              (click)="cancelAllCommands()"
              title="Cancel all running commands">
              ⏹️ Cancel All
            </button>
          }
        </div>
      </header>

      <!-- Main Content -->
      <main class="flex-1 overflow-hidden">
        <div class="h-full p-4">
          <!-- Analytics Toggle -->
          @if (showAnalytics()) {
            <div class="mb-4 p-4 bg-vscode-panel-background border border-vscode-panel-border rounded">
              <h2 class="text-lg font-medium mb-2">Analytics Dashboard</h2>
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div class="text-center">
                  <div class="text-2xl font-bold text-vscode-terminal-ansiGreen">
                    {{ commandStore.successRate() }}%
                  </div>
                  <div class="text-vscode-foreground opacity-75">Success Rate</div>
                </div>
                <div class="text-center">
                  <div class="text-2xl font-bold text-vscode-terminal-ansiBlue">
                    {{ commandStore.activeCommandCount() }}
                  </div>
                  <div class="text-vscode-foreground opacity-75">Active Commands</div>
                </div>
                <div class="text-center">
                  <div class="text-2xl font-bold text-vscode-terminal-ansiYellow">
                    {{ commandStore.queueLength() }}
                  </div>
                  <div class="text-vscode-foreground opacity-75">Queued Commands</div>
                </div>
              </div>
            </div>
          }

          <!-- Status Information -->
          <div class="text-center py-8">
            <div class="text-4xl mb-4">{{ getStatusIcon() }}</div>
            <h2 class="text-xl font-medium mb-2">{{ getStatusTitle() }}</h2>
            <p class="text-vscode-foreground opacity-75 mb-4">
              Workspace: {{ getWorkspaceInfo() }} | Version: {{ getVersionInfo() }}
            </p>
            
            <div class="flex justify-center gap-2 text-sm">
              <button 
                class="px-3 py-1 bg-vscode-button-background text-vscode-button-foreground rounded hover:bg-vscode-button-hoverBackground transition-colors"
                (click)="selectAll()"
                title="Select all content">
                Select All
              </button>
              
              <button 
                class="px-3 py-1 bg-vscode-button-background text-vscode-button-foreground rounded hover:bg-vscode-button-hoverBackground transition-colors"
                (click)="copySystemInfo()"
                title="Copy system information">
                Copy Info
              </button>
              
              @if (showAnalytics()) {
                <button 
                  class="px-3 py-1 bg-vscode-button-background text-vscode-button-foreground rounded hover:bg-vscode-button-hoverBackground transition-colors"
                  (click)="hideAnalytics()"
                  title="Hide analytics">
                  Hide Analytics
                </button>
              } @else {
                <button 
                  class="px-3 py-1 bg-vscode-button-background text-vscode-button-foreground rounded hover:bg-vscode-button-hoverBackground transition-colors"
                  (click)="showProjectAnalytics()"
                  title="Show analytics">
                  Show Analytics
                </button>
              }
            </div>
          </div>
        </div>
      </main>

      <!-- Toast Notifications -->
      <app-toast-notification 
        [toasts]="toastService.toasts()"
        [maxToasts]="5"
        [defaultDuration]="5000"
        (toastDismissed)="onToastDismissed($event)">
      </app-toast-notification>
    </div>
  `,
  styles: [`
    .app-container {
      font-family: var(--vscode-font-family, 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif);
      font-size: var(--vscode-font-size, 13px);
      line-height: 1.4;
    }

    .status-idle {
      color: var(--vscode-foreground);
    }

    .status-running {
      color: var(--vscode-terminal-ansiBlue);
      animation: pulse 2s infinite;
    }

    .status-queued {
      color: var(--vscode-terminal-ansiYellow);
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    button:disabled:hover {
      background-color: var(--vscode-button-background) !important;
    }

    /* Accessibility improvements */
    button:focus {
      outline: 2px solid var(--vscode-focusBorder);
      outline-offset: 2px;
    }

    /* Responsive design */
    @media (max-width: 768px) {
      .app-container header {
        flex-direction: column;
        gap: 12px;
        align-items: flex-start;
      }
      
      .app-container header .flex:last-child {
        align-self: stretch;
        justify-content: space-between;
      }
    }
  `]
})
export class AppComponent implements OnInit {
  // Dependency injection using inject()
  protected readonly commandStore = inject(CommandStore);
  protected readonly projectStore = inject(ProjectStore);
  protected readonly webviewService = inject(WebviewService);
  protected readonly toastService = inject(ToastNotificationService);

  // Component state
  readonly title = 'AI Debug Assistant';
  readonly showAnalytics = signal(false);

  // Computed properties
  readonly currentExecutionId = computed(() => {
    const activeCommands = this.commandStore.activeCommands();
    const commandIds = Object.keys(activeCommands);
    return commandIds.length > 0 ? commandIds[0] : null;
  });

  readonly isStreaming = computed(() => {
    return this.commandStore.activeCommandCount() > 0;
  });

  ngOnInit(): void {
    this.initializeApp();
    this.setupMessageHandlers();
    this.setupKeyboardShortcuts();
  }

  private initializeApp(): void {
    // Get initial state
    this.webviewService.getStatus();
    this.webviewService.getProjects();
    this.webviewService.getWorkspaceInfo();
    
    // Show welcome message
    this.toastService.showInfo(
      'Welcome!',
      'AI Debug Assistant is ready to help you debug your code.',
      [
        {
          label: 'Get Started',
          action: () => this.showProjectSelector()
        }
      ]
    );
  }

  private setupMessageHandlers(): void {
    // Handle state updates from extension
    this.webviewService.onStateUpdate().subscribe(state => {
      // Update stores based on state
      if (state.projects) {
        this.projectStore.setProjects(state.projects);
      }
      if (state.workspaceInfo) {
        this.projectStore.setWorkspaceInfo(state.workspaceInfo);
      }
    });

    // Handle theme changes
    this.webviewService.onThemeChange().subscribe(theme => {
      this.handleThemeChange(theme);
    });

    // Handle command completion
    this.webviewService.onMessage().subscribe(message => {
      if (message.command === 'commandComplete') {
        this.handleCommandComplete(message.result);
      }
    });
  }

  private setupKeyboardShortcuts(): void {
    document.addEventListener('keydown', (event) => {
      this.onKeyDown(event);
    });
  }

  onKeyDown(event: KeyboardEvent): void {
    // Handle keyboard shortcuts
    if (event.ctrlKey || event.metaKey) {
      switch (event.key.toLowerCase()) {
        case 'r':
          event.preventDefault();
          this.refreshData();
          break;
        case 'c':
          if (event.shiftKey) {
            event.preventDefault();
            this.cancelAllCommands();
          }
          break;
        case 'h':
          if (event.shiftKey) {
            event.preventDefault();
            this.clearHistory();
          }
          break;
      }
    }
  }

  // Public action methods
  refreshData(): void {
    this.webviewService.getProjects();
    this.webviewService.getWorkspaceInfo();
    this.toastService.showSuccess('Data Refreshed', 'Project data has been updated');
  }

  selectAll(): void {
    document.execCommand('selectall');
  }

  cancelAllCommands(): void {
    this.commandStore.cancelAllCommands();
    this.webviewService.cancelCommand();
    this.toastService.showWarning('Commands Cancelled', 'All running commands have been cancelled');
  }

  clearHistory(): void {
    this.commandStore.clearHistory();
    this.toastService.showInfo('History Cleared', 'Command history has been cleared');
  }

  showProjectAnalytics(): void {
    this.showAnalytics.set(true);
  }

  hideAnalytics(): void {
    this.showAnalytics.set(false);
  }

  copySystemInfo(): void {
    const info = `Workspace: ${this.getWorkspaceInfo()}\\nVersion: ${this.getVersionInfo()}`;
    navigator.clipboard.writeText(info);
    this.toastService.showInfo('Copied', 'System information copied to clipboard');
  }

  onToastDismissed(toastId: string): void {
    this.toastService.dismissToast(toastId);
  }

  // Private helper methods
  private showProjectSelector(): void {
    // Focus on project selector
    const projectElement = document.querySelector('app-project-selector');
    if (projectElement) {
      (projectElement as HTMLElement).focus();
    }
  }

  private handleThemeChange(theme: string): void {
    document.documentElement.setAttribute('data-theme', theme);
  }

  private handleCommandComplete(result: any): void {
    if (result.success) {
      this.toastService.showSuccess(
        'Command Complete',
        `${result.action} completed successfully for ${result.project}`,
        [
          {
            label: 'View Results',
            action: () => this.showResults(result)
          }
        ]
      );
    } else {
      this.toastService.showError(
        'Command Failed',
        `${result.action} failed: ${result.error}`,
        [
          {
            label: 'Retry',
            action: () => this.retryCommand(result.id)
          }
        ]
      );
    }
  }

  private showResults(result: any): void {
    // Implementation for showing results
    this.toastService.showInfo('Results', 'Results viewer opened');
  }

  private retryCommand(commandId: string): void {
    this.commandStore.retryCommand(commandId);
    this.toastService.showInfo('Retry', 'Command has been queued for retry');
  }

  // Status helper methods
  getStatusClass(): string {
    const status = this.commandStore.currentStatus();
    return `status-${status}`;
  }

  getStatusIcon(): string {
    const status = this.commandStore.currentStatus();
    switch (status) {
      case 'idle': return '⚪';
      case 'running': return '🔄';
      case 'queued': return '⏳';
      default: return '⚪';
    }
  }

  getStatusTitle(): string {
    const status = this.commandStore.currentStatus();
    const activeCount = this.commandStore.activeCommandCount();
    const queueLength = this.commandStore.queueLength();
    
    switch (status) {
      case 'idle': return 'Ready - No commands running';
      case 'running': return `Running ${activeCount} command${activeCount > 1 ? 's' : ''}`;
      case 'queued': return `${queueLength} command${queueLength > 1 ? 's' : ''} queued`;
      default: return 'Unknown status';
    }
  }

  hasActiveCommands(): boolean {
    return this.commandStore.activeCommandCount() > 0;
  }

  getWorkspaceInfo(): string {
    const workspaceInfo = this.projectStore.workspaceInfo();
    return workspaceInfo ? workspaceInfo.name : 'Unknown workspace';
  }

  getVersionInfo(): string {
    return '0.1.0';
  }

  getShortcutTitle(description: string, shortcut: string): string {
    return `${description} (${shortcut})`;
  }

  getAppAriaLabel(): string {
    const projectCount = this.projectStore.projectCount();
    const activeCommands = this.commandStore.activeCommandCount();
    
    return `AI Debug Assistant. ${projectCount} projects available. ${activeCommands} commands running.`;
  }
}
