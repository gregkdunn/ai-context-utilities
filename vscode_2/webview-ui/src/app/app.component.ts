import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, signal, computed, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VscodeService } from './services/vscode.service';
import { Subscription } from 'rxjs';
import { FileSelectorComponent, FileSelection } from './modules/file-selection/file-selector.component';
import { TestSelectorComponent, TestConfiguration } from './modules/test-selection/test-selector.component';
import { AIDebugComponent, TestResult, AIAnalysis } from './modules/ai-debug/ai-debug.component';
import { PRGeneratorComponent } from './modules/pr-generator/pr-generator.component';

export interface WorkflowState {
  step: 'idle' | 'collecting-context' | 'running-tests' | 'analyzing-with-ai' | 'generating-pr' | 'complete' | 'error';
  progress?: number;
  message?: string;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FileSelectorComponent, TestSelectorComponent, AIDebugComponent, PRGeneratorComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen bg-vscode-background text-vscode-foreground p-4">
      <!-- Header -->
      <header class="flex items-center justify-between mb-6 pb-4 border-b border-vscode-panel-border">
        <h1 class="flex items-center gap-3 text-2xl font-bold">
          <span class="text-3xl">🤖</span>
          AI Debug Context
        </h1>
        @if (activeModule() !== 'overview') {
          <button
            (click)="showOverview()"
            class="px-4 py-2 bg-vscode-button-secondaryBackground text-vscode-button-secondaryForeground rounded hover:bg-vscode-button-secondaryHoverBackground">
            ← Back to Overview
          </button>
        }
      </header>

      <!-- Module Overview -->
      @if (activeModule() === 'overview') {
        <main class="max-w-4xl mx-auto">
          <!-- Status Summary -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div class="bg-vscode-editor-background border border-vscode-panel-border rounded-lg p-4">
              <div class="flex items-center gap-2 mb-2">
                <span class="text-xl">📁</span>
                <h3 class="font-semibold">File Selection</h3>
              </div>
              <p class="text-sm text-vscode-descriptionForeground mb-3">{{ getFileSelectionStatus() }}</p>
              <button
                (click)="showModule('file-selection')"
                class="w-full px-3 py-2 bg-vscode-button-background text-vscode-button-foreground rounded hover:bg-vscode-button-hoverBackground">
                Configure
              </button>
            </div>

            <div class="bg-vscode-editor-background border border-vscode-panel-border rounded-lg p-4">
              <div class="flex items-center gap-2 mb-2">
                <span class="text-xl">🧪</span>
                <h3 class="font-semibold">Test Selection</h3>
              </div>
              <p class="text-sm text-vscode-descriptionForeground mb-3">{{ getTestConfigStatus() }}</p>
              <button
                (click)="showModule('test-selection')"
                class="w-full px-3 py-2 bg-vscode-button-background text-vscode-button-foreground rounded hover:bg-vscode-button-hoverBackground">
                Configure
              </button>
            </div>

            <div class="bg-vscode-editor-background border border-vscode-panel-border rounded-lg p-4">
              <div class="flex items-center gap-2 mb-2">
                <span class="text-xl">📋</span>
                <h3 class="font-semibold">PR Generator</h3>
              </div>
              <p class="text-sm text-vscode-descriptionForeground mb-3">{{ getPRGeneratorStatus() }}</p>
              <button
                (click)="showModule('pr-generator')"
                [disabled]="!fileSelection()"
                class="w-full px-3 py-2 bg-vscode-button-background text-vscode-button-foreground rounded hover:bg-vscode-button-hoverBackground disabled:opacity-50">
                Configure
              </button>
            </div>
          </div>

          <!-- Main AI Debug Action -->
          <div class="bg-vscode-editor-background border border-vscode-panel-border rounded-lg p-6 text-center">
            <div class="flex items-center justify-center gap-3 mb-4">
              <span class="text-4xl">🚀</span>
              <h2 class="text-xl font-bold">AI Test Debug</h2>
            </div>
            <p class="text-vscode-descriptionForeground mb-6 max-w-md mx-auto">
              Run the complete AI-powered test debugging workflow with your configured settings.
            </p>
            <button
              (click)="showModule('ai-debug')"
              [disabled]="!canRunAIDebug()"
              class="px-8 py-4 bg-vscode-button-background text-vscode-button-foreground rounded-lg font-semibold text-lg hover:bg-vscode-button-hoverBackground disabled:opacity-50 disabled:cursor-not-allowed">
              @if (!canRunAIDebug()) {
                <span class="flex items-center gap-2">
                  <span>⚠️</span>
                  Configure Prerequisites First
                </span>
              } @else {
                <span class="flex items-center gap-2">
                  <span>🤖</span>
                  Run AI Test Debug
                </span>
              }
            </button>
            @if (!canRunAIDebug()) {
              <p class="text-vscode-descriptionForeground text-sm mt-3">
                Complete file selection and test selection to continue
              </p>
            }
          </div>
        </main>
      }

      <!-- File Selection Module -->
      @if (activeModule() === 'file-selection') {
        <app-file-selector
          (selectionChanged)="onFileSelectionChanged($event)">
        </app-file-selector>
      }

      <!-- Test Selection Module -->
      @if (activeModule() === 'test-selection') {
        <app-test-selector
          #testSelector
          (configurationChanged)="onTestConfigurationChanged($event)">
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

      <!-- PR Generator Module -->
      @if (activeModule() === 'pr-generator') {
        <app-pr-generator
          [fileSelection]="fileSelection()"
          [testResults]="testResults()"
          [aiAnalysis]="aiAnalysis()"
          (descriptionGenerated)="onPRDescriptionGenerated($event)">
        </app-pr-generator>
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
  activeModule = signal<'overview' | 'file-selection' | 'test-selection' | 'ai-debug' | 'pr-generator'>('overview');
  
  // Module data
  fileSelection = signal<FileSelection | null>(null);
  testConfiguration = signal<TestConfiguration | null>(null);
  testResults = signal<TestResult[] | null>(null);
  aiAnalysis = signal<AIAnalysis | null>(null);
  prDescription = signal<string | null>(null);

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

  showModule(module: 'file-selection' | 'test-selection' | 'ai-debug' | 'pr-generator') {
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

  getTestConfigStatus(): string {
    const config = this.testConfiguration();
    if (!config) return 'Not configured';
    
    if (config.mode === 'affected') {
      return 'Affected tests';
    } else {
      return config.project ? `Project: ${config.project}` : 'Project mode';
    }
  }

  getPRGeneratorStatus(): string {
    if (!this.fileSelection()) return 'Requires file selection';
    if (this.prDescription()) return 'Description generated';
    return 'Ready to generate';
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
  }

  onPRDescriptionGenerated(description: string) {
    this.prDescription.set(description);
    this.saveState();
    this.vscode.postMessage('prDescriptionGenerated', description);
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
      // Note: gitDiffGenerated is now handled within file-selection module
      // No need to navigate to separate git-diff module
    }
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
      prDescription: this.prDescription()
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
  }

  private resetAllState() {
    this.activeModule.set('overview');
    this.fileSelection.set(null);
    this.testConfiguration.set(null);
    this.testResults.set(null);
    this.aiAnalysis.set(null);
    this.prDescription.set(null);
    this.saveState();
  }
}
