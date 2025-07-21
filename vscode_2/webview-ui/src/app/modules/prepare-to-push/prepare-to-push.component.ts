import { Component, Input, Output, EventEmitter, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VscodeService } from '../../services/vscode.service';
import { TestConfiguration } from '../test-selection/test-selector.component';

export interface PrepareToPushExecutionState {
  isRunning: boolean;
  currentStep: 'idle' | 'linting' | 'formatting' | 'complete' | 'error';
  lintStatus: 'pending' | 'running' | 'passed' | 'failed';
  formatStatus: 'pending' | 'running' | 'passed' | 'failed';
  output: string;
  startTime?: Date;
  endTime?: Date;
  exitCode?: number;
}

export interface PrepareToPushResult {
  success: boolean;
  lintPassed: boolean;
  formatPassed: boolean;
  duration: number;
  nextSteps: string[];
}

@Component({
  selector: 'app-prepare-to-push',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-gray-900 rounded-lg border border-gray-700 font-mono text-sm h-full p-3" style="background: #1a1a1a; border-color: #333;">
      <!-- Terminal Header -->
      <div class="border-b pb-6 mb-8" style="border-color: #333;">
        <div class="flex items-center gap-2 mb-2">
          <span class="font-bold" style="color: #A8A8FF;">$</span>
          <span class="font-bold" style="color: #4ECDC4;">prepare-to-push</span>
          <span style="color: #FFD93D;">--project</span>
          <span style="color: #6BCF7F;">{{ getTargetProject() }}</span>
        </div>
        <div style="color: #666;" class="text-xs">
          🚀 Code Quality Validation | {{ getExecutionStatus() }}
        </div>
      </div>

      <!-- Terminal Project Configuration -->
      <div class="mb-8">
        <div class="mb-4 flex items-center gap-3">
          <span style="color: #A8A8FF;">></span>
          <span style="color: #4ECDC4;">📋 Configuration from project selector</span>
        </div>
        
        @if (testConfiguration) {
          <div class="rounded p-4 pl-6" style="background: #1f2a1f; border: 1px solid #4a6a4a;">
            <div class="flex items-center gap-3 mb-3">
              <span style="color: #6BCF7F;">[✓]</span>
              <span class="font-medium" style="color: #4ECDC4;">Ready to validate code quality</span>
            </div>
            
            <!-- Mode Display -->
            <div class="mb-3">
              <span class="text-xs" style="color: #FFD93D;">Mode:</span>
              <span class="text-sm ml-2" style="color: #e5e5e5;">{{ testConfiguration!.mode }}</span>
            </div>
            
            <!-- Project/Target Display -->
            @if (testConfiguration!.mode === 'project') {
              <div class="mb-3">
                <span class="text-xs" style="color: #FFD93D;">Projects ({{ getProjectCount() }}):</span>
                <div class="mt-2 space-y-1">
                  @for (project of getSelectedProjects(); track project) {
                    <div class="flex items-center gap-2 text-sm">
                      <span class="w-2 h-2 rounded-full" style="background: #4ECDC4;"></span>
                      <span style="color: #e5e5e5;">{{ project }}</span>
                    </div>
                  }
                </div>
              </div>
            } @else {
              <div class="mb-3">
                <span class="text-xs" style="color: #FFD93D;">Target:</span>
                <span class="text-sm ml-2" style="color: #e5e5e5;">Affected projects</span>
              </div>
            }
            
            <!-- Command Preview -->
            <div class="mt-4 p-3 rounded" style="background: #0a0a0a; border: 1px solid #333;">
              <div class="text-xs mb-2" style="color: #4ECDC4;">Commands to execute:</div>
              @for (command of getPreviewCommands(); track command) {
                <div class="text-xs font-mono" style="color: #e5e5e5;">$ {{ command }}</div>
              }
            </div>
          </div>
        } @else {
          <div class="rounded p-4 pl-6" style="background: #2a1a1a; border: 1px solid #FF4B6D;">
            <div class="flex items-center gap-3 mb-3">
              <span style="color: #FF4B6D;">[✗]</span>
              <span class="font-medium" style="color: #FF8C42;">No test configuration available</span>
            </div>
            <p class="text-sm" style="color: #666;">
              Please configure project selection first to specify which projects to validate.
            </p>
          </div>
        }
      </div>

      <!-- Terminal Execution Steps -->
      <div class="mb-8">
        <div class="mb-4 flex items-center gap-3">
          <span style="color: #A8A8FF;">></span>
          <span style="color: #4ECDC4;">⚡ Execution pipeline</span>
        </div>
        <div class="space-y-3 pl-6">
          <!-- Step 1: Linting -->
          <div class="flex items-center gap-4 p-3 rounded" style="border: 1px solid #333; background: #1a1a1a;">
            <div class="flex items-center gap-2">
              @if (execution().lintStatus === 'pending') {
                <span style="color: #666;">[○]</span>
              } @else if (execution().lintStatus === 'running') {
                <span class="animate-spin" style="color: #FFD93D;">[⟳]</span>
              } @else if (execution().lintStatus === 'passed') {
                <span style="color: #6BCF7F;">[✓]</span>
              } @else if (execution().lintStatus === 'failed') {
                <span style="color: #FF4B6D;">[✗]</span>
              }
              <span class="text-sm font-medium" style="color: #4ECDC4;">🔍 Linting</span>
            </div>
            <div class="flex-1 text-xs" style="color: #666;">
              Check code quality and style issues
            </div>
          </div>

          <!-- Step 2: Formatting -->
          <div class="flex items-center gap-4 p-3 rounded" style="border: 1px solid #333; background: #1a1a1a;">
            <div class="flex items-center gap-2">
              @if (execution().formatStatus === 'pending') {
                <span style="color: #666;">[○]</span>
              } @else if (execution().formatStatus === 'running') {
                <span class="animate-spin" style="color: #FFD93D;">[⟳]</span>
              } @else if (execution().formatStatus === 'passed') {
                <span style="color: #6BCF7F;">[✓]</span>
              } @else if (execution().formatStatus === 'failed') {
                <span style="color: #FF4B6D;">[✗]</span>
              }
              <span class="text-sm font-medium" style="color: #4ECDC4;">✨ Formatting</span>
            </div>
            <div class="flex-1 text-xs" style="color: #666;">
              Apply consistent code formatting
            </div>
          </div>
        </div>
      </div>

      <!-- Terminal Action Buttons -->
      <div class="mb-8 flex gap-3 justify-center">
        <button 
          (click)="runPrepareToPush()"
          [disabled]="!canRun() || execution().isRunning"
          class="px-6 py-3 font-mono font-bold rounded border-2 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
          [ngStyle]="canRun() && !execution().isRunning ? 
            {'background': '#6BCF7F', 'color': '#000', 'border-color': '#6BCF7F'} : 
            {'background': '#333', 'color': '#666', 'border-color': '#555'}">
          @if (execution().isRunning) {
            <span class="flex items-center gap-3">
              <span class="animate-spin">⟳</span>
              <span>RUNNING --prepare</span>
            </span>
          } @else {
            <span class="flex items-center gap-3">
              <span>🚀</span>
              <span>EXECUTE --prepare-to-push</span>
            </span>
          }
        </button>
      </div>

      <!-- Terminal Execution Output -->
      @if (execution().output || execution().isRunning) {
        <div class="mb-8">
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-3">
              <span style="color: #A8A8FF;">></span>
              <span class="text-sm font-medium" style="color: #4ECDC4;">Execution output:</span>
            </div>
            <div class="flex items-center gap-2">
              @if (execution().currentStep !== 'idle') {
                <span class="text-xs px-2 py-1 rounded" style="background: #333; color: #FFD93D; border: 1px solid #666;">
                  {{ getStepLabel() }}
                </span>
              }
              @if (execution().endTime && execution().startTime) {
                <span class="text-xs" style="color: #666;">
                  {{ getDuration() }}
                </span>
              }
            </div>
          </div>
          
          <div class="rounded" style="border: 1px solid #333;">
            <div class="max-h-96 overflow-y-auto p-4" style="background: #0a0a0a;">
              <pre class="text-sm font-mono whitespace-pre-wrap break-words" style="color: #e5e5e5;">{{ execution().output }}</pre>
            </div>
          </div>
        </div>
      }

      <!-- Terminal Success Summary -->
      @if (execution().currentStep === 'complete') {
        <div class="rounded p-6 text-center" style="background: #1f2a1f; border: 1px solid #6BCF7F;">
          <div class="text-4xl mb-4">🎉</div>
          <h3 class="text-lg font-bold mb-4" style="color: #6BCF7F;">Ready to Push!</h3>
          
          <div class="grid grid-cols-2 gap-4 mb-6">
            <div class="flex items-center justify-center gap-2">
              <span style="color: #6BCF7F;">[✓]</span>
              <span class="text-sm">Linting: Passed</span>
            </div>
            <div class="flex items-center justify-center gap-2">
              <span style="color: #6BCF7F;">[✓]</span>
              <span class="text-sm">Formatting: Applied</span>
            </div>
          </div>

          <div class="text-left">
            <div class="text-sm mb-3" style="color: #FFD93D;">📋 Suggested next steps:</div>
            @for (step of getNextSteps(); track step) {
              <div class="text-xs mb-1 flex items-start gap-2">
                <span style="color: #4ECDC4;">•</span>
                <span style="color: #e5e5e5;">{{ step }}</span>
              </div>
            }
          </div>
        </div>
      }

      <!-- Terminal Error Summary -->
      @if (execution().currentStep === 'error') {
        <div class="rounded p-6" style="background: #2a1a1a; border: 1px solid #FF4B6D;">
          <div class="flex items-center gap-3 mb-4">
            <span class="text-2xl">❌</span>
            <h3 class="text-lg font-bold" style="color: #FF4B6D;">Code Quality Check Failed</h3>
          </div>
          
          <div class="grid grid-cols-2 gap-4 mb-4">
            <div class="flex items-center justify-center gap-2">
              @if (execution().lintStatus === 'failed') {
                <span style="color: #FF4B6D;">[✗]</span>
                <span class="text-sm" style="color: #FF8C42;">Linting: Failed</span>
              } @else {
                <span style="color: #6BCF7F;">[✓]</span>
                <span class="text-sm">Linting: Passed</span>
              }
            </div>
            <div class="flex items-center justify-center gap-2">
              @if (execution().formatStatus === 'failed') {
                <span style="color: #FF4B6D;">[✗]</span>
                <span class="text-sm" style="color: #FF8C42;">Formatting: Failed</span>
              } @else {
                <span style="color: #6BCF7F;">[✓]</span>
                <span class="text-sm">Formatting: Applied</span>
              }
            </div>
          </div>

          <div class="text-left">
            <div class="text-sm mb-3" style="color: #FFD93D;">💡 Next steps:</div>
            @for (step of getErrorSteps(); track step) {
              <div class="text-xs mb-1 flex items-start gap-2">
                <span style="color: #FF8C42;">•</span>
                <span style="color: #e5e5e5;">{{ step }}</span>
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: []
})
export class PrepareToPushComponent implements OnInit {
  @Input() testConfiguration: TestConfiguration | null = null;
  @Output() prepareToPushComplete = new EventEmitter<PrepareToPushResult>();

  execution = signal<PrepareToPushExecutionState>({
    isRunning: false,
    currentStep: 'idle',
    lintStatus: 'pending',
    formatStatus: 'pending',
    output: ''
  });

  constructor(private vscode: VscodeService) {}

  ngOnInit() {
    this.setupMessageHandlers();
  }

  private setupMessageHandlers() {
    this.vscode.onMessage().subscribe(message => {
      if (!message) return;
      
      switch (message.command) {
        case 'prepareToPushStarted':
          this.handlePrepareToPushStarted(message.data);
          break;
        case 'prepareToPushProgress':
          this.handlePrepareToPushProgress(message.data);
          break;
        case 'prepareToPushCompleted':
          this.handlePrepareToPushCompleted(message.data);
          break;
        case 'prepareToPushError':
          this.handlePrepareToPushError(message.data);
          break;
      }
    });
  }

  canRun(): boolean {
    return !!(this.testConfiguration && !this.execution().isRunning);
  }

  getTargetProject(): string {
    if (!this.testConfiguration) return 'none';
    
    if (this.testConfiguration.mode === 'affected') {
      return 'affected';
    } else if (this.testConfiguration.projects && this.testConfiguration.projects.length > 0) {
      return this.testConfiguration.projects.length === 1 
        ? this.testConfiguration.projects[0] 
        : `${this.testConfiguration.projects.length} projects`;
    } else if (this.testConfiguration.project) {
      return this.testConfiguration.project;
    }
    
    return 'none';
  }

  getExecutionStatus(): string {
    const exec = this.execution();
    if (exec.isRunning) {
      return `Running ${exec.currentStep}...`;
    } else if (exec.currentStep === 'complete') {
      return 'Completed successfully';
    } else if (exec.currentStep === 'error') {
      return 'Failed - needs attention';
    }
    return 'Ready to run';
  }

  getProjectCount(): number {
    if (!this.testConfiguration) return 0;
    return this.testConfiguration.projects?.length || 1;
  }

  getSelectedProjects(): string[] {
    if (!this.testConfiguration) return [];
    return this.testConfiguration.projects || (this.testConfiguration.project ? [this.testConfiguration.project] : []);
  }

  getPreviewCommands(): string[] {
    if (!this.testConfiguration) return [];
    
    const commands: string[] = [];
    
    if (this.testConfiguration.mode === 'affected') {
      commands.push('yarn nx affected --target=lint');
      commands.push('yarn nx affected --target=prettier --write');
    } else {
      const projects = this.getSelectedProjects();
      if (projects.length === 1) {
        commands.push(`yarn nx lint ${projects[0]}`);
        commands.push(`yarn nx prettier ${projects[0]} --write`);
      } else if (projects.length > 1) {
        commands.push(`yarn nx run-many --target=lint --projects=${projects.join(',')}`);
        commands.push(`yarn nx run-many --target=prettier --projects=${projects.join(',')} --write`);
      }
    }
    
    return commands;
  }

  getStepLabel(): string {
    switch (this.execution().currentStep) {
      case 'linting': return 'Linting...';
      case 'formatting': return 'Formatting...';
      case 'complete': return 'Complete';
      case 'error': return 'Failed';
      default: return 'Preparing...';
    }
  }

  getDuration(): string {
    const exec = this.execution();
    if (exec.startTime && exec.endTime) {
      const duration = exec.endTime.getTime() - exec.startTime.getTime();
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

  getNextSteps(): string[] {
    const projectName = this.getTargetProject();
    return [
      'Review any formatting changes made by prettier',
      `Run AI debug workflow to ensure tests still pass`,
      'Commit your changes: git add . && git commit -m "Your message"',
      'Push to your branch: git push'
    ];
  }

  getErrorSteps(): string[] {
    const exec = this.execution();
    const steps: string[] = [];
    
    if (exec.lintStatus === 'failed') {
      steps.push('Fix the linting errors shown in the output above');
      steps.push('Some errors may be auto-fixable with --fix flag');
    }
    
    if (exec.formatStatus === 'failed') {
      steps.push('Check the prettier errors shown above');
      steps.push('Ensure all files have valid syntax');
    }
    
    steps.push('Re-run prepare-to-push after fixing the issues');
    
    return steps;
  }

  runPrepareToPush() {
    if (!this.canRun()) return;

    // Send the test configuration to backend for processing
    this.vscode.postMessage('runPrepareToPush', {
      testConfiguration: this.testConfiguration
    });
  }

  private handlePrepareToPushStarted(data: { startTime: string; output?: string }) {
    this.execution.set({
      ...this.execution(),
      isRunning: true,
      currentStep: 'linting',
      lintStatus: 'running',
      formatStatus: 'pending',
      startTime: new Date(data.startTime),
      output: data.output || 'Starting prepare-to-push workflow...\n'
    });
  }

  private handlePrepareToPushProgress(data: { step: string; status: string; output: string; append?: boolean }) {
    const current = this.execution();
    const newOutput = data.append ? current.output + data.output : data.output;
    
    let updates: Partial<PrepareToPushExecutionState> = {
      output: newOutput
    };

    // Update step-specific status
    if (data.step === 'lint') {
      updates.currentStep = 'linting';
      updates.lintStatus = data.status as any;
      if (data.status === 'passed') {
        updates.formatStatus = 'running';
        updates.currentStep = 'formatting';
      }
    } else if (data.step === 'format') {
      updates.currentStep = 'formatting';
      updates.formatStatus = data.status as any;
    }
    
    this.execution.set({ ...current, ...updates });
  }

  private handlePrepareToPushCompleted(data: { 
    success: boolean; 
    lintPassed: boolean; 
    formatPassed: boolean; 
    endTime: string; 
    duration: number;
    output?: string;
  }) {
    const current = this.execution();
    
    this.execution.set({
      ...current,
      isRunning: false,
      currentStep: data.success ? 'complete' : 'error',
      lintStatus: data.lintPassed ? 'passed' : 'failed',
      formatStatus: data.formatPassed ? 'passed' : 'failed',
      endTime: new Date(data.endTime),
      output: data.output ? current.output + data.output : current.output
    });

    // Emit completion event
    this.prepareToPushComplete.emit({
      success: data.success,
      lintPassed: data.lintPassed,
      formatPassed: data.formatPassed,
      duration: data.duration,
      nextSteps: data.success ? this.getNextSteps() : this.getErrorSteps()
    });
  }

  private handlePrepareToPushError(data: { error: string; step?: string }) {
    const current = this.execution();
    
    this.execution.set({
      ...current,
      isRunning: false,
      currentStep: 'error',
      output: current.output + `\n\nError: ${data.error}`,
      endTime: new Date()
    });
  }
}