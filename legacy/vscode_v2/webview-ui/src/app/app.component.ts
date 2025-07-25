import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, signal, computed, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VscodeService } from './services/vscode.service';
import { Subscription } from 'rxjs';
import { FileSelectorComponent, FileSelection } from './modules/file-selection/file-selector.component';
import { TestSelectorComponent, TestConfiguration } from './modules/test-selection/test-selector.component';
import { AIDebugComponent, TestResult, AIAnalysis } from './modules/ai-debug/ai-debug.component';
// import { PRGeneratorComponent } from './modules/pr-generator/pr-generator.component'; // Hidden for demo
import { PrepareToPushComponent, PrepareToPushResult } from './modules/prepare-to-push/prepare-to-push.component';
import { AnalysisDashboardComponent } from './modules/analysis-dashboard/analysis-dashboard.component';

export interface WorkflowState {
  step: 'idle' | 'collecting-context' | 'running-tests' | 'analyzing-with-ai' | 'generating-pr' | 'complete' | 'error' | 'generating-context' | 'saving-context' | 'analyzing-results' | 'generating-report';
  progress?: number;
  message?: string;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FileSelectorComponent, TestSelectorComponent, AIDebugComponent, /* PRGeneratorComponent, */ PrepareToPushComponent, AnalysisDashboardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen font-mono text-sm p-3" style="background: #1a1a1a; color: #e5e5e5; padding: 16px;">
      <!-- Terminal Header -->
      <header class="items-center justify-between mb-8 pb-6 border-b" style="border-color: #333;padding: 3px;">
        <div>
          <span style="color: #A8A8FF;">$</span>
          <span class="font-bold" style="color: #4ECDC4;">ai-debug-context</span>
          <span style="color: #FFD93D;">--module</span>
          <span style="color: #6BCF7F;">{{ activeModule() }}</span>
        </div>
        @if (activeModule() !== 'overview') {
          <button
            (click)="showOverview()"
            class="px-3 py-2 font-mono font-bold rounded border-2 hover:opacity-90 transition-opacity" style="background: #333; color: #FFD93D; border-color: #666;">
            <span>
              <span>←</span>
              <span>BACK --overview</span>
            </span>
          </button>
        }
      </header>

      <!-- Terminal Module Overview -->
      @if (activeModule() === 'overview') {
        <main class="max-w-5xl mx-auto">
          <!-- Terminal Config Section -->
          <div class="mb-12">
            <div class="mb-6">
              <span style="color: #A8A8FF;">$</span>
              <span class="text-2xl">⚙️</span>
              <h2 class="text-xl font-bold" style="color: #4ECDC4;">config</h2>
              <span style="color: #FFD93D;">--workspace-setup</span>
            </div>
            
            <!-- Config Cards -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div class="rounded-lg p-4" style="background: #1a1a2a; border: 1px solid #4a4a6a;">
                <div class="mb-3">
                  <span style="color: #9b9bff;">></span>
                  <span class="text-lg">📁</span>
                  <h3 class="font-semibold" style="color: #7c7cfc;">file_selector</h3>
                </div>
                <p class="text-sm mb-4" style="color: #8888aa;">{{ getFileSelectionStatus() }}</p>
                <button
                  (click)="showModule('file-selection')"
                  class="w-full px-3 py-2 font-mono font-bold rounded border-2 hover:opacity-90 transition-opacity" style="background: #3a3a5a; color: #c9c9ff; border-color: #5a5a7a;">
                  config --files
                </button>
              </div>

              <div class="rounded-lg p-4" style="background: #1a1a2a; border: 1px solid #4a4a6a;">
                <div class="mb-3">
                  <span style="color: #9b9bff;">></span>
                  <span class="text-lg">📂</span>
                  <h3 class="font-semibold" style="color: #7c7cfc;">project_selector</h3>
                </div>
                <p class="text-sm mb-4" style="color: #8888aa;">{{ getProjectConfigStatus() }}</p>
                <button
                  (click)="showModule('test-selection')"
                  class="w-full px-3 py-2 font-mono font-bold rounded border-2 hover:opacity-90 transition-opacity" style="background: #3a3a5a; color: #c9c9ff; border-color: #5a5a7a;">
                  config --projects
                </button>
              </div>
            </div>
          </div>

          <!-- Terminal Actions Section -->
          <div class="mb-12">
            <div class="mb-6">
              <span style="color: #A8A8FF;">$</span>
              <span class="text-2xl">⚡</span>
              <h2 class="text-xl font-bold" style="color: #4ECDC4;">actions</h2>
              <span style="color: #FFD93D;">--workflow-execution</span>
            </div>
            
            <!-- AI Debug Action -->
            <div class="rounded-lg p-8 text-center mb-6" style="background: #1a1a1a; border: 1px solid #333;">
              <div class="text-center mb-6">
                <span style="color: #A8A8FF;">$</span>
                <span class="text-4xl">🚀</span>
                <h3 class="text-xl font-bold" style="color: #4ECDC4;">ai_debug_workflow</h3>
                <span style="color: #FFD93D;">--full</span>
              </div>
              <p class="mb-8 max-w-md mx-auto" style="color: #666;">
                Build a context file so AI can analyze your code changes for testing recommendations.
              </p>
              <div class="text-xs mb-4" style="color: #666;">
                Status: {{ getAIDebugStatus() }}
              </div>
              <button
                (click)="showModule('ai-debug')"
                [disabled]="!canRunAIDebug()"
                class="px-8 py-4 rounded-lg font-mono font-bold text-lg border-2 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                [ngStyle]="canRunAIDebug() ? 
                  {'background': '#6BCF7F', 'color': '#000', 'border-color': '#6BCF7F'} : 
                  {'background': '#333', 'color': '#666', 'border-color': '#555'}">
                @if (!canRunAIDebug()) {
                  <span>
                    <span>[✗]</span>
                    <span>CONFIG --missing-prerequisites</span>
                  </span>
                } @else {
                  <span>
                    <span>🤖</span>
                    <span>EXECUTE --ai-debug-workflow</span>
                  </span>
                }
              </button>
              @if (!canRunAIDebug()) {
                <div class="mt-4 p-3 rounded" style="background: #2a1a1a; border: 1px solid #FF4B6D;">
                  <p class="text-sm" style="color: #FF8C42;">
                    <span style="color: #FF4B6D;">ERROR:</span> Complete file selection and project selection to continue
                  </p>
                </div>
              }
            </div>
            
            <!-- PR Generator Action - Hidden for demo -->
            <!-- TODO: Uncomment when PR Generator feature is ready for release
            <div class="rounded-lg p-6 text-center mb-6" style="background: #1a1a1a; border: 1px solid #333;">
              <div class="text-center mb-4">
                <span style="color: #A8A8FF;">$</span>
                <span class="text-2xl">📋</span>
                <h3 class="text-lg font-bold" style="color: #4ECDC4;">pr_generator</h3>
                <span style="color: #FFD93D;">--description</span>
              </div>
              <p class="mb-6 max-w-lg mx-auto text-sm" style="color: #666;">
                Generate professional GitHub PR descriptions using AI analysis of your code changes and test results.
              </p>
              <div class="text-xs mb-4" style="color: #666;">
                Status: {{ getPRGeneratorStatus() }}
              </div>
              <button
                (click)="showModule('pr-generator')"
                [disabled]="!fileSelection()"
                class="px-6 py-3 font-mono font-bold text-sm rounded border-2 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                [ngStyle]="fileSelection() ? 
                  {'background': '#333', 'color': '#FFD93D', 'border-color': '#666'} : 
                  {'background': '#333', 'color': '#555', 'border-color': '#444'}">
                @if (!fileSelection()) {
                  <span>
                    <span>[✗]</span>
                    <span>REQUIRES --file-selection</span>
                  </span>
                } @else {
                  <span>
                    <span>📝</span>
                    <span>GENERATE --pr-description</span>
                  </span>
                }
              </button>
            </div>
            -->

            <!-- Analysis Dashboard Action -->
            <div class="rounded-lg p-6 text-center mb-6" style="background: #1a1a1a; border: 1px solid #333;">
              <div class="text-center mb-4">
                <span style="color: #A8A8FF;">$</span>
                <span class="text-2xl">🧠</span>
                <h3 class="text-lg font-bold" style="color: #4ECDC4;">analysis_dashboard</h3>
                <span style="color: #FFD93D;">--comprehensive</span>
              </div>
              <p class="mb-6 max-w-lg mx-auto text-sm" style="color: #666;">
                Submit your complete AI context to Copilot for comprehensive analysis, insights, and recommendations with persistent results.
              </p>
              <div class="text-xs mb-4" style="color: #666;">
                Status: Ready for comprehensive analysis
              </div>
              <button
                (click)="showModule('analysis-dashboard')"
                class="px-6 py-3 font-mono font-bold text-sm rounded border-2 hover:opacity-90 transition-opacity"
                style="background: #333; color: #4ECDC4; border-color: #666;">
                <span>
                  <span>🚀</span>
                  <span>LAUNCH --analysis-dashboard</span>
                </span>
              </button>
            </div>

            <!-- Prepare to Push Action -->
            <div class="rounded-lg p-6 text-center" style="background: #1a1a1a; border: 1px solid #333;">
              <div class="text-center mb-4">
                <span style="color: #A8A8FF;">$</span>
                <span class="text-2xl">🚀</span>
                <h3 class="text-lg font-bold" style="color: #4ECDC4;">prepare_to_push</h3>
                <span style="color: #FFD93D;">--validate</span>
              </div>
              <p class="mb-6 max-w-lg mx-auto text-sm" style="color: #666;">
                Run linting and formatting on your selected projects to ensure code quality before pushing.
              </p>
              <div class="text-xs mb-4" style="color: #666;">
                Status: {{ getPrepareToPushStatus() }}
              </div>
              <button
                (click)="showModule('prepare-to-push')"
                [disabled]="!testConfiguration()"
                class="px-6 py-3 font-mono font-bold text-sm rounded border-2 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                [ngStyle]="testConfiguration() ? 
                  {'background': '#333', 'color': '#FFD93D', 'border-color': '#666'} : 
                  {'background': '#333', 'color': '#555', 'border-color': '#444'}">
                @if (!testConfiguration()) {
                  <span>
                    <span>[✗]</span>
                    <span>REQUIRES --project-selection</span>
                  </span>
                } @else {
                  <span>
                    <span>✨</span>
                    <span>VALIDATE --code-quality</span>
                  </span>
                }
              </button>
            </div>
          </div>
        </main>
      }

      <!-- File Selection Module -->
      @if (activeModule() === 'file-selection') {
        <app-file-selector
          (selectionChanged)="onFileSelectionChanged($event)"
          (navigationRequested)="showOverview()">
        </app-file-selector>
      }

      <!-- Project Selection Module -->
      @if (activeModule() === 'test-selection') {
        <app-test-selector
          #testSelector
          (configurationChanged)="onTestConfigurationChanged($event)"
          (navigationRequested)="showOverview()">
        </app-test-selector>
      }

      <!-- AI Debug Module -->
      @if (activeModule() === 'ai-debug') {
        <app-ai-debug
          [fileSelection]="fileSelection()"
          [testConfiguration]="testConfiguration()"
          (workflowComplete)="onAIDebugComplete($event)">
        </app-ai-debug>
      }

      <!-- Prepare To Push Module -->
      @if (activeModule() === 'prepare-to-push') {
        <app-prepare-to-push
          [testConfiguration]="testConfiguration()"
          (prepareToPushComplete)="onPrepareToPushComplete($event)">
        </app-prepare-to-push>
      }

      <!-- PR Generator Module - Hidden for demo -->
      <!-- TODO: Uncomment when PR Generator feature is ready for release
      @if (activeModule() === 'pr-generator') {
        <app-pr-generator
          [fileSelection]="fileSelection()"
          [testResults]="testResults()"
          [aiAnalysis]="aiAnalysis()"
          (descriptionGenerated)="onPRDescriptionGenerated($event)">
        </app-pr-generator>
      }
      -->

      <!-- Analysis Dashboard Module -->
      @if (activeModule() === 'analysis-dashboard') {
        <app-analysis-dashboard></app-analysis-dashboard>
      }
    </div>
  `,
  styles: [`
    /* Minimal component-specific styles */
    .spinner {
      border: 2px solid var(--vscode-progressBar-background);
      border-top: 2px solid var(--vscode-progressBar-foreground);
      border-radius: 50%;
      width: 16px;
      height: 16px;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `]
})
export class AppComponent implements OnInit, OnDestroy {
  private subscription = new Subscription();
  
  @ViewChild('testSelector') testSelector?: TestSelectorComponent;
  
  // Module navigation
  activeModule = signal<'overview' | 'file-selection' | 'test-selection' | 'ai-debug' | 'prepare-to-push' | 'pr-generator' | 'analysis-dashboard'>('overview');
  
  // Module data
  fileSelection = signal<FileSelection | null>(null);
  testConfiguration = signal<TestConfiguration | null>(null);
  testResults = signal<TestResult[] | null>(null);
  aiAnalysis = signal<AIAnalysis | null>(null);
  prDescription = signal<string | null>(null);
  prepareToPushResult = signal<PrepareToPushResult | null>(null);

  constructor(private vscode: VscodeService) {}

  ngOnInit(): void {
    this.subscription.add(
      this.vscode.onMessage().subscribe(message => {
        if (message) {
          this.internalHandleVscodeMessage(message);
        }
      })
    );

    // Load any saved state
    const savedState = this.vscode.getState();
    if (savedState) {
      this.restoreState(savedState);
    }
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  // Navigation methods
  showOverview() {
    this.activeModule.set('overview');
    this.saveState();
  }

  showModule(module: 'file-selection' | 'test-selection' | 'ai-debug' | 'prepare-to-push' | 'pr-generator' | 'analysis-dashboard') {
    // Temporarily disable PR Generator for demo
    if (module === 'pr-generator') {
      console.log('PR Generator module is temporarily disabled for demo');
      return;
    }
    
    this.activeModule.set(module);
    this.saveState();
  }

  // Status methods
  getFileSelectionStatus(): string {
    const selection = this.fileSelection();
    if (!selection) return 'Not configured';
    
    switch (selection.mode) {
      case 'uncommitted':
        return `${selection.files.length} uncommitted files`;
      case 'commit':
        const selectedCommits = selection.commits;
        if (selectedCommits && selectedCommits.length > 0) {
          if (selectedCommits.length === 1) {
            return `Commit: ${selectedCommits[0].hash.substring(0, 7)}`;
          } else {
            return `${selectedCommits.length} commits selected`;
          }
        }
        return 'No commits selected';
      case 'branch-diff':
        return 'Branch to main diff';
      default:
        return 'Configured';
    }
  }

  getProjectConfigStatus(): string {
    const config = this.testConfiguration();
    if (!config) return 'Not configured';
    
    if (config.mode === 'affected') {
      return 'Affected tests';
    } else {
      return config.project ? `Project: ${config.project}` : 'Project mode';
    }
  }

  getAIDebugStatus(): string {
    if (!this.canRunAIDebug()) return 'Requires configuration';
    if (this.aiAnalysis()) return 'Analysis complete';
    if (this.testResults()) return 'Tests complete, ready for analysis';
    return 'Ready to run';
  }

  getPRGeneratorStatus(): string {
    if (!this.fileSelection()) return 'Requires file selection';
    if (this.prDescription()) return 'Description generated';
    if (this.testResults() && this.aiAnalysis()) return 'Ready with analysis data';
    return 'Ready to generate';
  }

  getPrepareToPushStatus(): string {
    if (!this.testConfiguration()) return 'Requires test configuration';
    if (this.prepareToPushResult()) {
      const result = this.prepareToPushResult()!;
      return result.success ? 'Code quality validated' : 'Validation failed';
    }
    return 'Ready to validate';
  }

  canRunAIDebug(): boolean {
    return !!(this.fileSelection() && this.testConfiguration());
  }

  // Event handlers
  onFileSelectionChanged(selection: FileSelection) {
    this.fileSelection.set(selection);
    
    // Reset test configuration when file selection changes
    this.testConfiguration.set(null);
    if (this.testSelector) {
      this.testSelector.resetConfiguration();
    }
    
    this.saveState();
    this.vscode.postMessage('fileSelectionChanged', selection);
  }

  onTestConfigurationChanged(config: TestConfiguration) {
    this.testConfiguration.set(config);
    this.saveState();
    this.vscode.postMessage('testConfigurationChanged', config);
  }

  onAIDebugComplete(result: { testResults: TestResult[]; aiAnalysis: AIAnalysis }) {
    this.testResults.set(result.testResults);
    this.aiAnalysis.set(result.aiAnalysis);
    this.saveState();
    this.vscode.postMessage('aiDebugComplete', result);
    
    // Automatically generate PR template if we have file selection
    if (this.fileSelection()) {
      this.generatePRTemplate();
    }
  }

  private generatePRTemplate() {
    // Generate PR template file with current context
    this.vscode.postMessage('generatePRTemplate', {
      fileSelection: this.fileSelection(),
      testResults: this.testResults(),
      aiAnalysis: this.aiAnalysis(),
      template: 'standard', // default template
      jiraTickets: [],
      featureFlags: []
    });
  }

  onPRDescriptionGenerated(description: string) {
    this.prDescription.set(description);
    this.saveState();
    this.vscode.postMessage('prDescriptionGenerated', description);
  }

  onPrepareToPushComplete(result: PrepareToPushResult) {
    this.prepareToPushResult.set(result);
    this.saveState();
    this.vscode.postMessage('prepareToPushComplete', result);
  }

  private internalHandleVscodeMessage(message: any): void {
    switch (message.command) {
      case 'showModule':
        if (message.data?.moduleType) {
          this.showModule(message.data.moduleType);
        }
        break;
      case 'resetState':
        this.resetAllState();
        break;
      case 'navigateToModule':
        if (message.data?.module) {
          this.showModule(message.data.module);
        }
        break;
      case 'prTemplateGenerated':
        this.handlePRTemplateGenerated(message.data);
        break;
      // Note: gitDiffGenerated is now handled within file-selection module
      // No need to navigate to separate git-diff module
    }
  }

  private handlePRTemplateGenerated(data: { templateFile: string; filePath: string }) {
    console.log('PR template generated:', data.filePath);
    // Show a notification or update UI to indicate template is ready
    // Could potentially navigate to PR generator module to show the generated template
  }

  // Public method for testing
  handleVscodeMessage(message: any): void {
    this.internalHandleVscodeMessage(message);
  }

  private saveState() {
    const state = {
      activeModule: this.activeModule(),
      fileSelection: this.fileSelection(),
      testConfiguration: this.testConfiguration(),
      testResults: this.testResults(),
      aiAnalysis: this.aiAnalysis(),
      prDescription: this.prDescription(),
      prepareToPushResult: this.prepareToPushResult()
    };
    this.vscode.setState(state);
  }

  private restoreState(state: any) {
    if (state.activeModule) this.activeModule.set(state.activeModule);
    if (state.fileSelection) this.fileSelection.set(state.fileSelection);
    if (state.testConfiguration) this.testConfiguration.set(state.testConfiguration);
    if (state.testResults) this.testResults.set(state.testResults);
    if (state.aiAnalysis) this.aiAnalysis.set(state.aiAnalysis);
    if (state.prDescription) this.prDescription.set(state.prDescription);
    if (state.prepareToPushResult) this.prepareToPushResult.set(state.prepareToPushResult);
  }

  private resetAllState() {
    this.activeModule.set('overview');
    this.fileSelection.set(null);
    this.testConfiguration.set(null);
    this.testResults.set(null);
    this.aiAnalysis.set(null);
    this.prDescription.set(null);
    this.prepareToPushResult.set(null);
    this.saveState();
  }
}
