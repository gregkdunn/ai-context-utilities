import { Component, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VscodeService } from '../../services/vscode.service';

export interface DiagnosticCheck {
  name: string;
  status: 'checking' | 'passed' | 'failed' | 'warning';
  message: string;
  solution?: string;
  action?: string;
}

export interface CopilotDiagnostics {
  vscodeVersion: string;
  languageModelApi: boolean;
  copilotExtension: boolean;
  copilotAuthenticated: boolean;
  modelsAvailable: number;
  lastError?: string;
  checks: DiagnosticCheck[];
}

@Component({
  selector: 'app-copilot-diagnostics',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-vscode-editor-background p-4 rounded-lg border border-vscode-panel-border">
      <div class="flex items-center justify-between mb-6">
        <h3 class="text-vscode-foreground text-lg font-semibold flex items-center gap-2">
          <span class="text-2xl">🔍</span>
          Copilot Diagnostics
        </h3>
        <button 
          (click)="runDiagnostics()"
          [disabled]="isRunning()"
          class="px-4 py-2 bg-vscode-button-background text-vscode-button-foreground rounded hover:bg-vscode-button-hoverBackground disabled:opacity-50">
          {{ isRunning() ? 'Running...' : 'Run Diagnostics' }}
        </button>
      </div>

      @if (diagnostics()) {
        <div class="space-y-4">
          <!-- Overall Status -->
          <div class="p-4 rounded border" [class]="getOverallStatusClass()">
            <div class="flex items-center gap-2 mb-2">
              <span class="text-xl">{{ getOverallStatusIcon() }}</span>
              <span class="font-medium">{{ getOverallStatusMessage() }}</span>
            </div>
            <p class="text-sm opacity-75">{{ getOverallDescription() }}</p>
          </div>

          <!-- System Information -->
          <div class="bg-vscode-textBlockQuote-background border border-vscode-panel-border rounded p-4">
            <h4 class="text-vscode-foreground font-medium mb-3">System Information</h4>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div>
                <span class="text-vscode-descriptionForeground">VSCode Version:</span>
                <span class="text-vscode-foreground ml-2 font-mono">{{ diagnostics()!.vscodeVersion }}</span>
              </div>
              <div>
                <span class="text-vscode-descriptionForeground">Language Model API:</span>
                <span class="ml-2" [class]="diagnostics()!.languageModelApi ? 'text-green-500' : 'text-red-500'">
                  {{ diagnostics()!.languageModelApi ? 'Available' : 'Not Available' }}
                </span>
              </div>
              <div>
                <span class="text-vscode-descriptionForeground">Copilot Extension:</span>
                <span class="ml-2" [class]="diagnostics()!.copilotExtension ? 'text-green-500' : 'text-red-500'">
                  {{ diagnostics()!.copilotExtension ? 'Installed' : 'Not Installed' }}
                </span>
              </div>
              <div>
                <span class="text-vscode-descriptionForeground">Available Models:</span>
                <span class="text-vscode-foreground ml-2 font-mono">{{ diagnostics()!.modelsAvailable }}</span>
              </div>
            </div>
          </div>

          <!-- Diagnostic Checks -->
          <div class="space-y-3">
            <h4 class="text-vscode-foreground font-medium">Diagnostic Checks</h4>
            @for (check of diagnostics()!.checks; track check.name) {
              <div class="border rounded p-3" [class]="getCheckStatusClass(check.status)">
                <div class="flex items-start gap-3">
                  <span class="text-lg mt-1">{{ getCheckIcon(check.status) }}</span>
                  <div class="flex-1">
                    <div class="flex items-center justify-between">
                      <h5 class="font-medium">{{ check.name }}</h5>
                      <span class="text-xs px-2 py-1 rounded" [class]="getCheckBadgeClass(check.status)">
                        {{ check.status.toUpperCase() }}
                      </span>
                    </div>
                    <p class="text-sm mt-1 opacity-75">{{ check.message }}</p>
                    
                    @if (check.solution) {
                      <div class="mt-2 p-2 bg-vscode-textCodeBlock-background rounded">
                        <p class="text-xs text-vscode-textPreformat-foreground">
                          <strong>Solution:</strong> {{ check.solution }}
                        </p>
                      </div>
                    }
                    
                    @if (check.action) {
                      <button 
                        (click)="executeAction(check.action)"
                        class="mt-2 px-3 py-1 text-xs bg-vscode-button-secondaryBackground text-vscode-button-secondaryForeground rounded hover:bg-vscode-button-secondaryHoverBackground">
                        {{ getActionLabel(check.action) }}
                      </button>
                    }
                  </div>
                </div>
              </div>
            }
          </div>

          <!-- Quick Actions -->
          <div class="bg-vscode-textBlockQuote-background border border-vscode-panel-border rounded p-4">
            <h4 class="text-vscode-foreground font-medium mb-3">Quick Actions</h4>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button 
                (click)="executeAction('check-copilot-status')"
                class="px-3 py-2 text-sm bg-vscode-button-secondaryBackground text-vscode-button-secondaryForeground rounded hover:bg-vscode-button-secondaryHoverBackground">
                Check Copilot Status
              </button>
              <button 
                (click)="executeAction('sign-in-copilot')"
                class="px-3 py-2 text-sm bg-vscode-button-secondaryBackground text-vscode-button-secondaryForeground rounded hover:bg-vscode-button-secondaryHoverBackground">
                Sign In to Copilot
              </button>
              <button 
                (click)="executeAction('install-copilot')"
                class="px-3 py-2 text-sm bg-vscode-button-secondaryBackground text-vscode-button-secondaryForeground rounded hover:bg-vscode-button-secondaryHoverBackground">
                Install Copilot Extension
              </button>
              <button 
                (click)="executeAction('test-copilot')"
                class="px-3 py-2 text-sm bg-vscode-button-background text-vscode-button-foreground rounded hover:bg-vscode-button-hoverBackground">
                Test Copilot Integration
              </button>
            </div>
          </div>

          <!-- Available Commands Debug Info -->
          @if (diagnostics()!.lastError || diagnostics()!.modelsAvailable === 0) {
            <div class="bg-vscode-textBlockQuote-background border border-vscode-panel-border rounded p-4">
              <h4 class="text-vscode-foreground font-medium mb-3">Debug Information</h4>
              <div class="text-xs text-vscode-descriptionForeground space-y-2">
                <div>
                  <strong>Available Copilot Commands:</strong>
                  <div class="mt-1 max-h-32 overflow-y-auto bg-vscode-textCodeBlock-background p-2 rounded">
                    <div class="text-vscode-textPreformat-foreground font-mono">
                      @if (availableCommands().length > 0) {
                        @for (command of availableCommands(); track command) {
                          <div class="py-1">{{ command }}</div>
                        }
                      } @else {
                        <div class="text-yellow-500">No Copilot commands found</div>
                      }
                    </div>
                  </div>
                </div>
                <div>
                  <strong>Troubleshooting Tips:</strong>
                  <ul class="mt-1 space-y-1 text-xs">
                    <li>• If no commands are shown, the Copilot extension may not be installed</li>
                    <li>• Try restarting VSCode after installing Copilot</li>
                    <li>• Check if you have an active GitHub Copilot subscription</li>
                    <li>• Make sure you're signed in to GitHub in VSCode</li>
                  </ul>
                </div>
              </div>
            </div>
          }
        </div>
      } @else {
        <div class="text-center py-8">
          <div class="text-4xl mb-2">🔍</div>
          <p class="text-vscode-descriptionForeground">Click "Run Diagnostics" to check Copilot integration</p>
        </div>
      }
    </div>
  `,
  styles: []
})
export class CopilotDiagnosticsComponent implements OnInit {
  diagnostics = signal<CopilotDiagnostics | null>(null);
  isRunning = signal<boolean>(false);
  availableCommands = signal<string[]>([]);

  constructor(private vscode: VscodeService) {}

  ngOnInit() {
    this.setupMessageHandlers();
    // Run diagnostics automatically on component load
    this.runDiagnostics();
  }

  private setupMessageHandlers() {
    this.vscode.onMessage().subscribe(message => {
      if (!message) return;
      
      switch (message.command) {
        case 'copilotDiagnosticsComplete':
          this.diagnostics.set(message.data);
          this.isRunning.set(false);
          break;
        case 'copilotCommandsAvailable':
          this.availableCommands.set(message.data.commands || []);
          break;
        case 'copilotActionComplete':
          this.handleActionComplete(message.data);
          break;
        case 'workflowError':
          this.isRunning.set(false);
          console.error('Diagnostics error:', message.data?.error);
          break;
      }
    });
  }

  runDiagnostics() {
    this.isRunning.set(true);
    this.vscode.postMessage('runCopilotDiagnostics');
    // Also request available commands for debugging
    this.vscode.postMessage('getCopilotCommands');
  }

  executeAction(action: string) {
    this.vscode.postMessage('executeCopilotAction', { action });
  }

  private handleActionComplete(data: any) {
    // Refresh diagnostics after action
    setTimeout(() => this.runDiagnostics(), 1000);
  }

  getOverallStatusClass(): string {
    const diag = this.diagnostics();
    if (!diag) return '';
    
    if (diag.modelsAvailable > 0) {
      return 'bg-green-50 border-green-200 text-green-800';
    } else if (diag.copilotExtension && diag.languageModelApi) {
      return 'bg-yellow-50 border-yellow-200 text-yellow-800';
    } else {
      return 'bg-red-50 border-red-200 text-red-800';
    }
  }

  getOverallStatusIcon(): string {
    const diag = this.diagnostics();
    if (!diag) return '🔍';
    
    if (diag.modelsAvailable > 0) return '✅';
    if (diag.copilotExtension && diag.languageModelApi) return '⚠️';
    return '❌';
  }

  getOverallStatusMessage(): string {
    const diag = this.diagnostics();
    if (!diag) return 'Checking...';
    
    if (diag.modelsAvailable > 0) {
      return `Copilot Ready (${diag.modelsAvailable} models available)`;
    } else if (diag.copilotExtension && diag.languageModelApi) {
      return 'Copilot Installed but Not Available';
    } else {
      return 'Copilot Not Available';
    }
  }

  getOverallDescription(): string {
    const diag = this.diagnostics();
    if (!diag) return '';
    
    if (diag.modelsAvailable > 0) {
      return 'GitHub Copilot is properly configured and ready for AI-powered analysis.';
    } else if (diag.copilotExtension && diag.languageModelApi) {
      return 'Copilot extension is installed but authentication or subscription may be needed.';
    } else {
      return 'GitHub Copilot integration requires installation and configuration.';
    }
  }

  getCheckStatusClass(status: string): string {
    switch (status) {
      case 'passed': return 'border-green-200 bg-green-50';
      case 'failed': return 'border-red-200 bg-red-50';
      case 'warning': return 'border-yellow-200 bg-yellow-50';
      case 'checking': return 'border-blue-200 bg-blue-50';
      default: return 'border-vscode-panel-border bg-vscode-textBlockQuote-background';
    }
  }

  getCheckIcon(status: string): string {
    switch (status) {
      case 'passed': return '✅';
      case 'failed': return '❌';
      case 'warning': return '⚠️';
      case 'checking': return '⏳';
      default: return '🔍';
    }
  }

  getCheckBadgeClass(status: string): string {
    switch (status) {
      case 'passed': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'warning': return 'bg-yellow-100 text-yellow-800';
      case 'checking': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  getActionLabel(action: string): string {
    switch (action) {
      case 'check-copilot-status': return 'Check Status';
      case 'sign-in-copilot': return 'Sign In';
      case 'install-copilot': return 'Install Extension';
      case 'test-copilot': return 'Test Integration';
      case 'update-vscode': return 'Update VSCode';
      default: return 'Execute';
    }
  }
}
