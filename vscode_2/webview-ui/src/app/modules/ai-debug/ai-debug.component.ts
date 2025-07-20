import { Component, Input, Output, EventEmitter, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { VscodeService } from '../../services/vscode.service';
import { CopilotDiagnosticsComponent } from '../../components/copilot-diagnostics/copilot-diagnostics.component';
import { FileSelection } from '../file-selection/file-selector.component';
import { TestConfiguration } from '../test-selection/test-selector.component';

export interface TestResult {
  name: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  file: string;
  error?: string;
  stackTrace?: string;
}

export interface AIAnalysis {
  type: 'failure-analysis' | 'success-analysis';
  rootCause?: string;
  suggestedFixes?: string[];
  newTestSuggestions?: string[];
  falsePositiveWarnings?: string[];
  codeImprovements?: string[];
}

export interface DebugWorkflowState {
  phase: 'idle' | 'collecting-context' | 'running-tests' | 'analyzing-results' | 'generating-report' | 'complete' | 'error';
  progress: number;
  message: string;
  testResults?: TestResult[];
  aiAnalysis?: AIAnalysis;
  error?: string;
}

@Component({
  selector: 'app-ai-debug',
  standalone: true,
  imports: [CommonModule, FormsModule, CopilotDiagnosticsComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-vscode-editor-background p-4 rounded-lg border border-vscode-panel-border">
      <div class="flex items-center justify-between mb-6">
        <h3 class="text-vscode-foreground text-lg font-semibold flex items-center gap-2">
          <span class="text-2xl">🤖</span>
          AI Test Debug
        </h3>
        <div class="text-vscode-descriptionForeground text-sm">
          {{ getStatusSummary() }}
        </div>
      </div>

      <!-- Enhanced Copilot Status Section -->
      <div class="mb-6 space-y-3">
        <h4 class="text-vscode-foreground font-medium">Prerequisites</h4>
        <div class="grid gap-2">
          <div class="flex items-center gap-2 text-sm">
            <span [class]="fileSelection ? 'text-green-500' : 'text-red-500'">
              {{ fileSelection ? '✅' : '❌' }}
            </span>
            <span class="text-vscode-foreground">File selection configured</span>
            @if (fileSelection) {
              <span class="text-vscode-descriptionForeground text-xs">
                ({{ fileSelection.mode }}: {{ getFileSelectionSummary() }})
              </span>
            }
          </div>
          
          <div class="flex items-center gap-2 text-sm">
            <span [class]="testConfiguration ? 'text-green-500' : 'text-red-500'">
              {{ testConfiguration ? '✅' : '❌' }}
            </span>
            <span class="text-vscode-foreground">Test configuration set</span>
            @if (testConfiguration) {
              <span class="text-vscode-descriptionForeground text-xs">
                ({{ testConfiguration.mode }}: {{ getTestConfigSummary() }})
              </span>
            }
          </div>
          
          <div class="flex items-center gap-2 text-sm">
            <span [class]="copilotAvailable() ? 'text-green-500' : 'text-yellow-500'">
              {{ copilotAvailable() ? '✅' : '⚠️' }}
            </span>
            <span class="text-vscode-foreground">GitHub Copilot</span>
            <span class="text-vscode-descriptionForeground text-xs">
              {{ copilotAvailable() ? 'Available' : 'Not available - will use fallback analysis' }}
            </span>
            @if (!copilotAvailable()) {
              <button 
                (click)="showDiagnostics = !showDiagnostics"
                class="ml-2 px-2 py-1 text-xs bg-vscode-button-secondaryBackground text-vscode-button-secondaryForeground rounded hover:bg-vscode-button-secondaryHoverBackground">
                {{ showDiagnostics ? 'Hide' : 'Diagnose' }}
              </button>
            }
          </div>
        </div>
      </div>

      <!-- Copilot Diagnostics Section -->
      @if (showDiagnostics && !copilotAvailable()) {
        <div class="mb-6">
          <app-copilot-diagnostics></app-copilot-diagnostics>
        </div>
      }

      <!-- Main Action Button -->
      @if (workflowState().phase === 'idle') {
        <div class="mb-6 text-center">
          <button 
            (click)="startAIDebugWorkflow()"
            [disabled]="!canStartWorkflow()"
            class="px-8 py-4 bg-vscode-button-background text-vscode-button-foreground rounded-lg font-medium text-lg hover:bg-vscode-button-hoverBackground disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200">
            <span class="flex items-center gap-3">
              <span class="text-2xl">🚀</span>
              <span>Run AI Test Debug</span>
            </span>
          </button>
          
          @if (!canStartWorkflow()) {
            <p class="text-vscode-descriptionForeground text-sm mt-2">
              Complete file selection and test configuration to continue
            </p>
          }
        </div>
      }

      <!-- Workflow Progress -->
      @if (workflowState().phase !== 'idle') {
        <div class="mb-6">
          <!-- Progress Bar -->
          <div class="mb-4">
            <div class="flex justify-between items-center mb-2">
              <span class="text-vscode-foreground text-sm font-medium">
                {{ getPhaseDisplayName() }}
              </span>
              <span class="text-vscode-descriptionForeground text-xs">
                {{ workflowState().progress }}%
              </span>
            </div>
            <div class="w-full bg-vscode-progressBar-background rounded-full h-2">
              <div 
                class="bg-vscode-progressBar-foreground h-2 rounded-full transition-all duration-300"
                [style.width.%]="workflowState().progress">
              </div>
            </div>
            <p class="text-vscode-descriptionForeground text-xs mt-2">
              {{ workflowState().message }}
            </p>
          </div>

          <!-- Phase Indicators -->
          <div class="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            @for (phase of workflowPhases; track phase.key) {
              <div class="flex items-center gap-2 p-2 rounded" [class]="getPhaseIndicatorClass(phase.key)">
                <span>{{ phase.icon }}</span>
                <span>{{ phase.label }}</span>
              </div>
            }
          </div>
        </div>
      }

      <!-- Test Results -->
      @if (workflowState().testResults && workflowState().testResults!.length > 0) {
        <div class="mb-6">
          <h4 class="text-vscode-foreground font-medium mb-3">Test Results</h4>
          
          <!-- Test Summary -->
          <div class="grid grid-cols-3 gap-4 mb-4">
            <div class="bg-green-50 border border-green-200 rounded p-3 text-center">
              <div class="text-green-600 text-xl font-bold">{{ getPassedTestsCount() }}</div>
              <div class="text-green-700 text-sm">Passed</div>
            </div>
            <div class="bg-red-50 border border-red-200 rounded p-3 text-center">
              <div class="text-red-600 text-xl font-bold">{{ getFailedTestsCount() }}</div>
              <div class="text-red-700 text-sm">Failed</div>
            </div>
            <div class="bg-yellow-50 border border-yellow-200 rounded p-3 text-center">
              <div class="text-yellow-600 text-xl font-bold">{{ getSkippedTestsCount() }}</div>
              <div class="text-yellow-700 text-sm">Skipped</div>
            </div>
          </div>

          <!-- Failed Tests Details -->
          @if (getFailedTests().length > 0) {
            <div class="space-y-2 max-h-64 overflow-y-auto border border-vscode-panel-border rounded p-2">
              @for (test of getFailedTests(); track test.name) {
                <div class="bg-red-50 border border-red-200 rounded p-3">
                  <div class="flex items-start justify-between">
                    <div class="flex-1">
                      <div class="font-medium text-red-800">{{ test.name }}</div>
                      <div class="text-red-600 text-sm font-mono">{{ test.file }}</div>
                      @if (test.error) {
                        <div class="text-red-700 text-sm mt-2">{{ test.error }}</div>
                      }
                    </div>
                    <div class="text-red-500 text-xs">{{ test.duration }}ms</div>
                  </div>
                </div>
              }
            </div>
          }
        </div>
      }

      <!-- AI Analysis Results -->
      @if (workflowState().aiAnalysis) {
        <div class="mb-6">
          <h4 class="text-vscode-foreground font-medium mb-3">AI Analysis</h4>
          
          @if (workflowState().aiAnalysis!.type === 'failure-analysis') {
            <!-- Failure Analysis -->
            <div class="space-y-4">
              @if (workflowState().aiAnalysis!.rootCause) {
                <div class="bg-vscode-textBlockQuote-background border-l-4 border-red-400 p-4 rounded">
                  <h5 class="text-vscode-foreground font-medium mb-2">🔍 Root Cause Analysis</h5>
                  <p class="text-vscode-textBlockQuote-foreground text-sm">
                    {{ workflowState().aiAnalysis!.rootCause }}
                  </p>
                </div>
              }

              @if (workflowState().aiAnalysis!.suggestedFixes && workflowState().aiAnalysis!.suggestedFixes!.length > 0) {
                <div class="bg-vscode-textBlockQuote-background border-l-4 border-blue-400 p-4 rounded">
                  <h5 class="text-vscode-foreground font-medium mb-2">🔧 Suggested Fixes</h5>
                  <ul class="space-y-2">
                    @for (fix of workflowState().aiAnalysis!.suggestedFixes!; track fix) {
                      <li class="text-vscode-textBlockQuote-foreground text-sm flex items-start gap-2">
                        <span class="text-blue-500 mt-1">•</span>
                        <span>{{ fix }}</span>
                      </li>
                    }
                  </ul>
                </div>
              }
            </div>
          } @else {
            <!-- Success Analysis -->
            <div class="space-y-4">
              @if (workflowState().aiAnalysis!.falsePositiveWarnings && workflowState().aiAnalysis!.falsePositiveWarnings!.length > 0) {
                <div class="bg-vscode-textBlockQuote-background border-l-4 border-yellow-400 p-4 rounded">
                  <h5 class="text-vscode-foreground font-medium mb-2">⚠️ Potential False Positives</h5>
                  <ul class="space-y-2">
                    @for (warning of workflowState().aiAnalysis!.falsePositiveWarnings!; track warning) {
                      <li class="text-vscode-textBlockQuote-foreground text-sm flex items-start gap-2">
                        <span class="text-yellow-500 mt-1">•</span>
                        <span>{{ warning }}</span>
                      </li>
                    }
                  </ul>
                </div>
              }

              @if (workflowState().aiAnalysis!.codeImprovements && workflowState().aiAnalysis!.codeImprovements!.length > 0) {
                <div class="bg-vscode-textBlockQuote-background border-l-4 border-green-400 p-4 rounded">
                  <h5 class="text-vscode-foreground font-medium mb-2">💡 Code Improvements</h5>
                  <ul class="space-y-2">
                    @for (improvement of workflowState().aiAnalysis!.codeImprovements!; track improvement) {
                      <li class="text-vscode-textBlockQuote-foreground text-sm flex items-start gap-2">
                        <span class="text-green-500 mt-1">•</span>
                        <span>{{ improvement }}</span>
                      </li>
                    }
                  </ul>
                </div>
              }
            </div>
          }

          <!-- Test Suggestions (always shown) -->
          @if (workflowState().aiAnalysis!.newTestSuggestions && workflowState().aiAnalysis!.newTestSuggestions!.length > 0) {
            <div class="bg-vscode-textBlockQuote-background border-l-4 border-purple-400 p-4 rounded">
              <h5 class="text-vscode-foreground font-medium mb-2">🧪 New Test Suggestions</h5>
              <ul class="space-y-2">
                @for (suggestion of workflowState().aiAnalysis!.newTestSuggestions!; track suggestion) {
                  <li class="text-vscode-textBlockQuote-foreground text-sm flex items-start gap-2">
                    <span class="text-purple-500 mt-1">•</span>
                    <span>{{ suggestion }}</span>
                  </li>
                }
              </ul>
            </div>
          }
        </div>
      }

      <!-- Error State -->
      @if (workflowState().phase === 'error') {
        <div class="mb-6">
          <div class="bg-red-50 border border-red-200 rounded p-4">
            <h4 class="text-red-800 font-medium mb-2">❌ Error Occurred</h4>
            <p class="text-red-700 text-sm">
              {{ workflowState().error || 'An unexpected error occurred during the AI debug workflow.' }}
            </p>
            <button 
              (click)="resetWorkflow()"
              class="mt-3 px-4 py-2 bg-red-600 text-white rounded text-sm hover:bg-red-700">
              Try Again
            </button>
          </div>
        </div>
      }

      <!-- Complete State -->
      @if (workflowState().phase === 'complete') {
        <div class="mb-6">
          <div class="bg-green-50 border border-green-200 rounded p-4 text-center">
            <h4 class="text-green-800 font-medium mb-2">✅ Analysis Complete</h4>
            <p class="text-green-700 text-sm mb-4">
              AI debug workflow completed successfully. Review the analysis above.
            </p>
            <div class="flex gap-3 justify-center">
              <button 
                (click)="exportResults()"
                class="px-4 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700">
                📄 Export Results
              </button>
              <button 
                (click)="resetWorkflow()"
                class="px-4 py-2 bg-vscode-button-secondaryBackground text-vscode-button-secondaryForeground rounded text-sm hover:bg-vscode-button-secondaryHoverBackground">
                🔄 New Analysis
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: []
})
export class AIDebugComponent implements OnInit {
  @Input() fileSelection: FileSelection | null = null;
  @Input() testConfiguration: TestConfiguration | null = null;
  @Output() workflowComplete = new EventEmitter<{ testResults: TestResult[]; aiAnalysis: AIAnalysis }>();

  workflowState = signal<DebugWorkflowState>({
    phase: 'idle',
    progress: 0,
    message: 'Ready to start AI debug workflow'
  });

  copilotAvailable = signal<boolean>(false);
  showDiagnostics = false;

  workflowPhases = [
    { key: 'collecting-context', label: 'Context', icon: '📁' },
    { key: 'running-tests', label: 'Tests', icon: '🧪' },
    { key: 'analyzing-results', label: 'Analysis', icon: '🤖' },
    { key: 'generating-report', label: 'Report', icon: '📄' }
  ];

  constructor(private vscode: VscodeService) {}

  ngOnInit() {
    this.checkCopilotAvailability();
    this.setupMessageHandlers();
  }

  private setupMessageHandlers() {
    // Listen for messages from the backend
    this.vscode.onMessage().subscribe(message => {
      if (!message) return;
      
      switch (message.command) {
        case 'copilotAvailability':
          console.log('Received Copilot availability:', message.data);
          this.copilotAvailable.set(message.data?.available || false);
          break;
        case 'copilotDiagnosticsComplete':
          console.log('Received Copilot diagnostics:', message.data);
          // Update availability based on diagnostic results - use same logic as CopilotDiagnosticsComponent
          if (message.data?.modelsAvailable > 0) {
            this.copilotAvailable.set(true);
            console.log('Copilot is available: models found =', message.data.modelsAvailable);
          } else {
            this.copilotAvailable.set(false);
            console.log('Copilot not available: models found =', message.data?.modelsAvailable || 0);
          }
          break;
        case 'workflowStateUpdate':
          // Handle workflow state updates from backend
          this.handleWorkflowStateUpdate(message.data);
          break;
        case 'aiAnalysisComplete':
          // Handled in performAIAnalysis method
          break;
        case 'testResults':
          // Handled in runTests method
          break;
        case 'workflowError':
          // Handle errors
          console.error('Workflow error:', message.data?.error);
          break;
      }
    });
  }

  private handleWorkflowStateUpdate(data: any) {
    // Update local workflow state based on backend updates
    if (data.step && data.progress !== undefined) {
      this.updateWorkflowState({
        phase: this.mapBackendStepToPhase(data.step),
        progress: data.progress,
        message: data.message
      });
    }
  }

  private mapBackendStepToPhase(step: string): DebugWorkflowState['phase'] {
    switch (step) {
      case 'collecting-context':
        return 'collecting-context';
      case 'running-tests':
        return 'running-tests';
      case 'analyzing-with-ai':
        return 'analyzing-results';
      case 'generating-pr':
        return 'generating-report';
      case 'complete':
        return 'complete';
      case 'error':
        return 'error';
      default:
        return 'idle';
    }
  }

  canStartWorkflow(): boolean {
    return !!(this.fileSelection && this.testConfiguration);
  }

  getStatusSummary(): string {
    const state = this.workflowState();
    switch (state.phase) {
      case 'idle':
        return 'Ready to start';
      case 'complete':
        return 'Analysis complete';
      case 'error':
        return 'Error occurred';
      default:
        return `${state.progress}% complete`;
    }
  }

  getFileSelectionSummary(): string {
    if (!this.fileSelection) return '';
    
    switch (this.fileSelection.mode) {
      case 'uncommitted':
        return `${this.fileSelection.files.length} files`;
      case 'commit':
        const selectedCommits = this.fileSelection.commits;
        if (selectedCommits && selectedCommits.length > 0) {
          if (selectedCommits.length === 1) {
            return selectedCommits[0].hash.substring(0, 7);
          } else {
            return `${selectedCommits.length} commits`;
          }
        }
        return 'No commits';
      case 'branch-diff':
        return 'Branch to main';
      default:
        return '';
    }
  }

  getTestConfigSummary(): string {
    if (!this.testConfiguration) return '';
    
    if (this.testConfiguration.mode === 'affected') {
      return 'Affected tests';
    } else {
      return this.testConfiguration.project || 'No project';
    }
  }

  getPhaseDisplayName(): string {
    const state = this.workflowState();
    switch (state.phase) {
      case 'collecting-context':
        return 'Collecting Context';
      case 'running-tests':
        return 'Running Tests';
      case 'analyzing-results':
        return 'Analyzing with AI';
      case 'generating-report':
        return 'Generating Report';
      default:
        return 'Processing';
    }
  }

  getPhaseIndicatorClass(phaseKey: string): string {
    const currentPhase = this.workflowState().phase;
    const phases = ['collecting-context', 'running-tests', 'analyzing-results', 'generating-report'];
    const currentIndex = phases.indexOf(currentPhase);
    const phaseIndex = phases.indexOf(phaseKey);

    if (phaseIndex < currentIndex) {
      return 'bg-green-100 text-green-800 border border-green-200';
    } else if (phaseIndex === currentIndex) {
      return 'bg-blue-100 text-blue-800 border border-blue-200';
    } else {
      return 'bg-gray-100 text-gray-600 border border-gray-200';
    }
  }

  getPassedTestsCount(): number {
    return this.workflowState().testResults?.filter(t => t.status === 'passed').length || 0;
  }

  getFailedTestsCount(): number {
    return this.workflowState().testResults?.filter(t => t.status === 'failed').length || 0;
  }

  getSkippedTestsCount(): number {
    return this.workflowState().testResults?.filter(t => t.status === 'skipped').length || 0;
  }

  getFailedTests(): TestResult[] {
    return this.workflowState().testResults?.filter(t => t.status === 'failed') || [];
  }

  async startAIDebugWorkflow() {
    if (!this.canStartWorkflow()) return;

    try {
      // Phase 1: Collecting Context
      this.updateWorkflowState({
        phase: 'collecting-context',
        progress: 10,
        message: 'Collecting file changes and test configuration...'
      });

      await this.simulateDelay(1000);

      // Phase 2: Running Tests
      this.updateWorkflowState({
        phase: 'running-tests',
        progress: 30,
        message: 'Executing test suite...'
      });

      const testResults = await this.runTests();
      
      // Phase 3: Analyzing Results
      this.updateWorkflowState({
        phase: 'analyzing-results',
        progress: 70,
        message: 'Analyzing test results with AI...',
        testResults
      });

      const aiAnalysis = await this.performAIAnalysis(testResults);

      // Phase 4: Generating Report
      this.updateWorkflowState({
        phase: 'generating-report',
        progress: 90,
        message: 'Generating final report...',
        testResults,
        aiAnalysis
      });

      await this.simulateDelay(1000);

      // Complete
      this.updateWorkflowState({
        phase: 'complete',
        progress: 100,
        message: 'AI debug workflow completed successfully',
        testResults,
        aiAnalysis
      });

      this.workflowComplete.emit({ testResults, aiAnalysis });

    } catch (error) {
      this.updateWorkflowState({
        phase: 'error',
        progress: 0,
        message: 'Error occurred during workflow',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  resetWorkflow() {
    this.workflowState.set({
      phase: 'idle',
      progress: 0,
      message: 'Ready to start AI debug workflow'
    });
  }

  exportResults() {
    const state = this.workflowState();
    if (state.testResults && state.aiAnalysis) {
      // This would trigger a download or save the results
      console.log('Exporting results:', { testResults: state.testResults, aiAnalysis: state.aiAnalysis });
    }
  }

  private updateWorkflowState(updates: Partial<DebugWorkflowState>) {
    this.workflowState.update(current => ({ ...current, ...updates }));
  }

  private async checkCopilotAvailability(): Promise<void> {
    try {
      // Request real Copilot availability check from backend
      this.vscode.postMessage('checkCopilotAvailability', {});
      
      // Also get diagnostic information for better troubleshooting
      this.vscode.postMessage('runCopilotDiagnostics', {});
      
      // Add a small delay then request diagnostics again to ensure we get the latest status
      setTimeout(() => {
        this.vscode.postMessage('runCopilotDiagnostics', {});
      }, 1000);
    } catch (error) {
      console.error('Failed to check Copilot availability:', error);
      this.copilotAvailable.set(false);
    }
  }

  private async runTests(): Promise<TestResult[]> {
    // Request real test execution from backend
    return new Promise((resolve, reject) => {
      // Set up message listener for test results
      const subscription = this.vscode.onMessage().subscribe(message => {
        if (message?.command === 'testResults') {
          subscription.unsubscribe();
          
          // Convert backend test results to component format
          const testResults: TestResult[] = message.data.results.map((result: any) => ({
            name: result.name || 'Unknown test',
            status: result.status || 'failed',
            duration: result.duration || 0,
            file: result.file || 'Unknown file',
            error: result.error,
            stackTrace: result.stackTrace
          }));
          
          resolve(testResults);
        } else if (message?.command === 'workflowError') {
          subscription.unsubscribe();
          reject(new Error(message.data?.error || 'Test execution failed'));
        }
      });

      // Request test execution based on configuration
      if (this.testConfiguration?.mode === 'affected') {
        this.vscode.postMessage('runAffectedTests', { baseBranch: 'main' });
      } else if (this.testConfiguration?.project) {
        // Run tests for single project  
        this.vscode.postMessage('runProjectTests', { 
          projectName: this.testConfiguration.project 
        });
      } else {
        subscription.unsubscribe();
        reject(new Error('No valid test configuration found'));
      }

      // Set timeout to prevent hanging
      setTimeout(() => {
        subscription.unsubscribe();
        reject(new Error('Test execution timeout'));
      }, 300000); // 5 minute timeout
    });
  }

  private async performAIAnalysis(testResults: TestResult[]): Promise<AIAnalysis> {
    // Request real AI analysis from backend
    return new Promise((resolve, reject) => {
      // Set up message listener for AI analysis results
      const subscription = this.vscode.onMessage().subscribe(message => {
        if (message?.command === 'aiAnalysisComplete') {
          subscription.unsubscribe();
          
          const { type, analysis, falsePositives, suggestions } = message.data;
          
          // Convert backend analysis to component format
          const aiAnalysis: AIAnalysis = {
            type: type === 'failure-analysis' ? 'failure-analysis' : 'success-analysis'
          };

          if (type === 'failure-analysis' && analysis) {
            aiAnalysis.rootCause = analysis.rootCause;
            aiAnalysis.suggestedFixes = analysis.specificFixes?.map((fix: any) => 
              `${fix.file}:${fix.lineNumber} - ${fix.explanation}`
            ) || analysis.preventionStrategies || [];
          } else if (type === 'success-analysis') {
            aiAnalysis.falsePositiveWarnings = falsePositives?.recommendations || [];
            aiAnalysis.codeImprovements = falsePositives?.suspiciousTests?.map((test: any) => 
              `${test.file}: ${test.suggestion}`
            ) || [];
          }

          // Add test suggestions
          aiAnalysis.newTestSuggestions = suggestions?.newTests?.map((test: any) => 
            `${test.testName}: ${test.reasoning}`
          ) || suggestions?.improvements || [];
          
          resolve(aiAnalysis);
        } else if (message?.command === 'workflowError') {
          subscription.unsubscribe();
          reject(new Error(message.data?.error || 'AI analysis failed'));
        }
      });

      // Get git diff for analysis
      let gitDiff = '';
      
      // Prepare git diff based on file selection
      if (this.fileSelection?.mode === 'uncommitted') {
        this.vscode.postMessage('getGitDiff'); // This will be used in the analysis
        gitDiff = 'uncommitted-changes'; // Placeholder
      } else if (this.fileSelection?.mode === 'commit' && this.fileSelection.commits) {
        gitDiff = `commit-${this.fileSelection.commits[0]?.hash || 'unknown'}`;
      } else if (this.fileSelection?.mode === 'branch-diff') {
        gitDiff = 'branch-diff';
      }

      // Request AI analysis with context
      this.vscode.postMessage('runAIAnalysis', {
        gitDiff,
        testResults,
        analysisType: testResults.some(test => test.status === 'failed') ? 'failure' : 'success'
      });

      // Set timeout to prevent hanging
      setTimeout(() => {
        subscription.unsubscribe();
        reject(new Error('AI analysis timeout'));
      }, 120000); // 2 minute timeout
    });
  }

  private simulateDelay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
