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
  copilotAnalysis?: CopilotAnalysisResult;
  gitDiffFilePath?: string;
  testResultsFilePath?: string;
  error?: string;
}

export interface CopilotAnalysisResult {
  type: 'failure-analysis' | 'success-analysis';
  analysisFilePath?: string;
  rootCause?: string;
  specificFixes?: Array<{
    file: string;
    lineNumber: number;
    oldCode: string;
    newCode: string;
    explanation: string;
  }>;
  preventionStrategies?: string[];
  suspiciousTests?: Array<{
    file: string;
    testName: string;
    issue: string;
    suggestion: string;
  }>;
  recommendations?: string[];
}

@Component({
  selector: 'app-ai-debug',
  standalone: true,
  imports: [CommonModule, FormsModule, CopilotDiagnosticsComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-gray-900 rounded-lg border border-gray-700 font-mono text-sm h-full" style="background: #1a1a1a; border-color: #333; padding: 3px;">
      <!-- Terminal Header -->
      <div class="border-b border-gray-700 pb-6 mb-8">
        <div class="mb-2">
          <span style="color: #A8A8FF;">$</span>
          <span style="color: #4ECDC4;" class="font-bold">ai-debug</span>
          <span style="color: #FFD93D;">--mode</span>
          <span style="color: #6BCF7F;">interactive</span>
          <span style="color: #FF8C42;">{{ getStatusSummary() }}</span>
        </div>
        <div style="color: #666;" class="text-xs">
          GitHub Copilot AI Test Debug Session | Status: {{ workflowState().phase }}
        </div>
      </div>

      <!-- Terminal Prerequisites Check -->
      <div class="mb-8">
        <div class="mb-4 flex items-center gap-2">
          <span style="color: #A8A8FF;">></span>
          <span style="color: #4ECDC4;">🔍 Checking prerequisites...</span>
        </div>
        <div class="space-y-6 pl-6">
          <div class="flex items-center gap-3 py-1">
            <span [ngStyle]="{'color': fileSelection ? '#6BCF7F' : '#FF4B6D'}">
              {{ fileSelection ? '[✓]' : '[✗]' }}
            </span>
            <span style="color: #e5e5e5;">file_selection</span>
            @if (fileSelection) {
              <span style="color: #666;">→</span>
              <span style="color: #FFD93D;">{{ fileSelection.mode }}</span>
              <span style="color: #4ECDC4;">{{ getFileSelectionSummary() }}</span>
            } @else {
              <span style="color: #FF8C42;">REQUIRED</span>
            }
          </div>
          
          <div class="flex items-center gap-3 py-1">
            <span [ngStyle]="{'color': testConfiguration ? '#6BCF7F' : '#FF4B6D'}">
              {{ testConfiguration ? '[✓]' : '[✗]' }}
            </span>
            <span style="color: #e5e5e5;">test_config</span>
            @if (testConfiguration) {
              <span style="color: #666;">→</span>
              <span style="color: #FFD93D;">{{ testConfiguration.mode }}</span>
              <span style="color: #4ECDC4;">{{ getTestConfigSummary() }}</span>
            } @else {
              <span style="color: #FF8C42;">REQUIRED</span>
            }
          </div>
          
          <div class="flex items-center gap-3 py-1">
            <span [ngStyle]="{'color': copilotAvailable() ? '#6BCF7F' : '#FFD93D'}">
              {{ copilotAvailable() ? '[✓]' : '[!]' }}
            </span>
            <span style="color: #e5e5e5;">github_copilot</span>
            <span style="color: #666;">→</span>
            <span [ngStyle]="{'color': copilotAvailable() ? '#6BCF7F' : '#FF8C42'}">
              {{ copilotAvailable() ? 'AVAILABLE' : 'FALLBACK_MODE' }}
            </span>
            @if (!copilotAvailable()) {
              <button 
                (click)="showDiagnostics = !showDiagnostics"
                class="ml-2 px-2 py-1 text-xs rounded hover:opacity-80"
                style="background: #333; color: #FFD93D; border: 1px solid #666;">
                {{ showDiagnostics ? 'hide' : 'diagnose' }}
              </button>
            }
          </div>
        </div>
      </div>

      <!-- Copilot Diagnostics Section -->
      @if (showDiagnostics && !copilotAvailable()) {
        <div class="mb-8">
          <app-copilot-diagnostics></app-copilot-diagnostics>
        </div>
      }

      <!-- Terminal Execute Command -->
      @if (workflowState().phase === 'idle') {
        <div class="mb-8">
          <div class="mb-4 p-3 flex items-center gap-3">
            <span style="color: #A8A8FF;">></span>
            <span style="color: #4ECDC4;">⚡ Ready to execute workflow</span>
          </div>
          <div class="pl-6">
            <button 
              (click)="startAIDebugWorkflow()"
              [disabled]="!canStartWorkflow()"
              class="px-6 py-3 rounded font-mono font-bold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              [ngStyle]="canStartWorkflow() ? 
                {'background': '#6BCF7F', 'color': '#000', 'border': '2px solid #6BCF7F'} : 
                {'background': '#333', 'color': '#666', 'border': '2px solid #555'}">
              <span class="flex items-center gap-3">
                <span class="text-lg">🚀</span>
                <span>EXECUTE ai-debug --full-workflow</span>
              </span>
            </button>
            
            @if (!canStartWorkflow()) {
              <div class="mt-4 pl-8" style="color: #FF8C42;">
                <span>ERROR: Missing required parameters</span>
                <div style="color: #666;" class="text-xs mt-1">
                  Configure file selection and test settings above
                </div>
              </div>
            }
          </div>
        </div>
      }

      <!-- Terminal Workflow Output -->
      @if (workflowState().phase !== 'idle') {
        <div class="mb-8">
          <!-- Terminal Progress Header -->
          <div class="mb-5 py-1 flex items-center gap-3">
            <span style="color: #A8A8FF;">></span>
            <span style="color: #4ECDC4;">{{ getPhaseDisplayName() }}</span>
            <span style="color: #666;">|</span>
            <span style="color: #FFD93D;">{{ workflowState().progress }}%</span>
            @if (workflowState().phase === 'complete') {
              <span style="color: #6BCF7F;">DONE</span>
            } @else if (workflowState().phase === 'error') {
              <span style="color: #FF4B6D;">ERROR</span>
            } @else {
              <span style="color: #FF8C42;">RUNNING</span>
            }
          </div>

          <!-- Terminal Progress Bar -->
          <div class="mb-5 pl-6">
            <div class="flex items-center gap-2 mb-2">
              <span style="color: #666;">[</span>
              @for (i of getProgressBars().filled; track $index) {
                <span style="color: #6BCF7F;">█</span>
              }
              @for (i of getProgressBars().empty; track $index) {
                <span style="color: #333;">█</span>
              }
              <span style="color: #666;">]</span>
              <span style="color: #4ECDC4;" class="text-xs ml-2">{{ workflowState().message }}</span>
            </div>
          </div>

          <!-- Terminal Pipeline Status -->
          <div class="pl-6 space-y-5">
            @for (phase of workflowPhases; track phase.key) {
              <div class="flex items-center gap-3 py-1" [ngStyle]="getTerminalPhaseStyle(phase.key)">
                <span>{{ getTerminalPhaseStatus(phase.key) }}</span>
                <span>{{ phase.label }}_pipeline</span>
                <span style="color: #666;">→</span>
                <span>{{ getTerminalPhaseLabel(phase.key) }}</span>
              </div>
            }
          </div>

          <!-- Terminal File Access -->
          @if (workflowState().gitDiffFilePath || workflowState().testResultsFilePath) {
            <div class="mt-8 border-t border-gray-700 pt-6">
              <div class="mb-4 py-1 flex items-center gap-3">
                <span style="color: #A8A8FF;">></span>
                <span style="color: #4ECDC4;">📁 Generated artifacts available</span>
              </div>
              <div class="pl-6 space-y-6">
                @if (workflowState().gitDiffFilePath) {
                  <div class="flex items-center gap-3 py-1">
                    <span style="color: #6BCF7F;">📄 [FILE]</span>
                    <button 
                      (click)="openGitDiffFile()"
                      class="font-mono hover:opacity-80"
                      style="background: #333; color: #FFD93D; text-decoration: underline;">
                      git_diff.txt
                    </button>
                    <button 
                      (click)="copyGitDiffFilePath()"
                      class="px-2 py-1 rounded text-xs hover:opacity-80"
                      style="background: #333; color: #4ECDC4; border: 1px solid #666;"
                      title="Copy file path">
                      📋 cp
                    </button>
                  </div>
                }
                @if (workflowState().testResultsFilePath) {
                  <div class="flex items-center gap-3 py-1">
                    <span style="color: #6BCF7F;">📄 [FILE]</span>
                    <button 
                      (click)="openTestResultsFile()"
                      class="font-mono hover:opacity-80"
                      style="background: #333; color: #FFD93D; text-decoration: underline;">
                      test_results.txt
                    </button>
                    <button 
                      (click)="copyTestResultsFilePath()"
                      class="px-2 py-1 rounded text-xs hover:opacity-80"
                      style="background: #333; color: #4ECDC4; border: 1px solid #666;"
                      title="Copy file path">
                      📋 cp
                    </button>
                  </div>
                }
              </div>
            </div>
          }
        </div>
      }

      <!-- Test Results -->
      @if (workflowState().testResults && workflowState().testResults!.length > 0) {
        <div class="mb-8">
          <div class="mb-4 py-1 flex items-center gap-3">
            <span style="color: #A8A8FF;">></span>
            <span style="color: #4ECDC4;">Test execution results</span>
          </div>
          
          <!-- Test Summary -->
          <div class="grid grid-cols-3 gap-6 mb-6 pl-6">
            <div class="rounded p-4 text-center" style="background: #2a2a2a; border: 1px solid #4a4a4a;">
              <div class="text-xl font-bold" style="color: #6BCF7F;">{{ getPassedTestsCount() }}</div>
              <div class="text-sm" style="color: #4ECDC4;">Passed</div>
            </div>
            <div class="rounded p-4 text-center" style="background: #2a2a2a; border: 1px solid #4a4a4a;">
              <div class="text-xl font-bold" style="color: #FF4B6D;">{{ getFailedTestsCount() }}</div>
              <div class="text-sm" style="color: #4ECDC4;">Failed</div>
            </div>
            <div class="rounded p-4 text-center" style="background: #2a2a2a; border: 1px solid #4a4a4a;">
              <div class="text-xl font-bold" style="color: #FFD93D;">{{ getSkippedTestsCount() }}</div>
              <div class="text-sm" style="color: #4ECDC4;">Skipped</div>
            </div>
          </div>

          <!-- Failed Tests Details -->
          @if (getFailedTests().length > 0) {
            <div class="space-y-5 max-h-64 overflow-y-auto rounded p-4 pl-6" style="border: 1px solid #4a4a4a; background: #1f1f1f;">
              @for (test of getFailedTests(); track test.name) {
                <div class="rounded p-4" style="background: #2a1a1a; border: 1px solid #4a2a2a;">
                  <div class="flex items-start justify-between">
                    <div class="flex-1">
                      <div class="font-medium" style="color: #FF4B6D;">{{ test.name }}</div>
                      <div class="text-sm font-mono" style="color: #FF8C42;">{{ test.file }}</div>
                      @if (test.error) {
                        <div class="text-sm mt-2" style="color: #FFD93D;">{{ test.error }}</div>
                      }
                    </div>
                    <div class="text-xs" style="color: #A8A8FF;">{{ test.duration }}ms</div>
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
            <div class="space-y-6">
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
                  <ul class="space-y-4">
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
            <div class="space-y-6">
              @if (workflowState().aiAnalysis!.falsePositiveWarnings && workflowState().aiAnalysis!.falsePositiveWarnings!.length > 0) {
                <div class="bg-vscode-textBlockQuote-background border-l-4 border-yellow-400 p-4 rounded">
                  <h5 class="text-vscode-foreground font-medium mb-2">⚠️ Potential False Positives</h5>
                  <ul class="space-y-4">
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
                  <ul class="space-y-4">
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
              <ul class="space-y-4">
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

      <!-- Copilot Analysis Results -->
      @if (workflowState().copilotAnalysis) {
        <div class="mb-6">
          <h4 class="text-vscode-foreground font-medium mb-3">🤖 GitHub Copilot Analysis</h4>
          
          @if (workflowState().copilotAnalysis!.type === 'failure-analysis') {
            <!-- Test Failure Analysis -->
            <div class="space-y-6">
              @if (workflowState().copilotAnalysis!.rootCause) {
                <div class="bg-vscode-textBlockQuote-background border-l-4 border-red-400 p-4 rounded">
                  <h5 class="text-vscode-foreground font-medium mb-2">🔍 Root Cause</h5>
                  <p class="text-vscode-textBlockQuote-foreground text-sm">
                    {{ workflowState().copilotAnalysis!.rootCause }}
                  </p>
                </div>
              }

              @if (workflowState().copilotAnalysis!.specificFixes && workflowState().copilotAnalysis!.specificFixes!.length > 0) {
                <div class="bg-vscode-textBlockQuote-background border-l-4 border-blue-400 p-4 rounded">
                  <h5 class="text-vscode-foreground font-medium mb-2">🛠️ Specific Fixes</h5>
                  <div class="space-y-5">
                    @for (fix of workflowState().copilotAnalysis!.specificFixes!; track fix.file + fix.lineNumber) {
                      <div class="border-l-2 border-blue-300 pl-3">
                        <div class="text-vscode-foreground text-sm font-medium">{{ fix.file }}:{{ fix.lineNumber }}</div>
                        <div class="text-vscode-textBlockQuote-foreground text-xs mt-1">{{ fix.explanation }}</div>
                      </div>
                    }
                  </div>
                </div>
              }

              @if (workflowState().copilotAnalysis!.preventionStrategies && workflowState().copilotAnalysis!.preventionStrategies!.length > 0) {
                <div class="bg-vscode-textBlockQuote-background border-l-4 border-yellow-400 p-4 rounded">
                  <h5 class="text-vscode-foreground font-medium mb-2">🚀 Prevention Strategies</h5>
                  <ul class="space-y-4">
                    @for (strategy of workflowState().copilotAnalysis!.preventionStrategies!; track strategy) {
                      <li class="text-vscode-textBlockQuote-foreground text-sm flex items-start gap-2">
                        <span class="text-yellow-500 mt-1">•</span>
                        <span>{{ strategy }}</span>
                      </li>
                    }
                  </ul>
                </div>
              }
            </div>
          } @else {
            <!-- Success Analysis -->
            <div class="space-y-6">
              @if (workflowState().copilotAnalysis!.suspiciousTests && workflowState().copilotAnalysis!.suspiciousTests!.length > 0) {
                <div class="bg-vscode-textBlockQuote-background border-l-4 border-yellow-400 p-4 rounded">
                  <h5 class="text-vscode-foreground font-medium mb-2">⚠️ Suspicious Tests</h5>
                  <div class="space-y-5">
                    @for (test of workflowState().copilotAnalysis!.suspiciousTests!; track test.file + test.testName) {
                      <div class="border-l-2 border-yellow-300 pl-3">
                        <div class="text-vscode-foreground text-sm font-medium">{{ test.file }}</div>
                        <div class="text-vscode-textBlockQuote-foreground text-xs">{{ test.testName }}</div>
                        <div class="text-vscode-textBlockQuote-foreground text-xs mt-1">
                          <span class="font-medium">Issue:</span> {{ test.issue }}
                        </div>
                        <div class="text-vscode-textBlockQuote-foreground text-xs">
                          <span class="font-medium">Suggestion:</span> {{ test.suggestion }}
                        </div>
                      </div>
                    }
                  </div>
                </div>
              }
            </div>
          }

          @if (workflowState().copilotAnalysis!.recommendations && workflowState().copilotAnalysis!.recommendations!.length > 0) {
            <div class="bg-vscode-textBlockQuote-background border-l-4 border-purple-400 p-4 rounded mt-4">
              <h5 class="text-vscode-foreground font-medium mb-2">📋 Recommendations</h5>
              <ul class="space-y-2">
                @for (rec of workflowState().copilotAnalysis!.recommendations!; track rec) {
                  <li class="text-vscode-textBlockQuote-foreground text-sm flex items-start gap-2">
                    <span class="text-purple-500 mt-1">•</span>
                    <span>{{ rec }}</span>
                  </li>
                }
              </ul>
            </div>
          }

          @if (workflowState().copilotAnalysis!.analysisFilePath) {
            <div class="mt-4 text-center">
              <button 
                (click)="openCopilotAnalysisFile()"
                class="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">
                📄 View Full Analysis Report
              </button>
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

      <!-- Terminal Success State -->
      @if (workflowState().phase === 'complete') {
        <div class="mb-6 border-t border-gray-700 pt-6">
          <div class="mb-4 items-center gap-2">
            <span style="color: #A8A8FF;">></span>
            <span style="color: #6BCF7F;">✅ Workflow completed successfully</span>
            <span style="color: #666;">|</span>
            <span style="color: #FFD93D;">exit_code=0</span>
          </div>
          <div class="pl-4 mb-6">
            <div style="color: #4ECDC4; padding-top: 12px;" class="mb-[12px]">Generated outputs ready for analysis:</div>
            <div class="space-y-5">
              <!-- Terminal File Listing -->
              <div class="space-y-5">
                <div class="flex items-center gap-3 py-1">
                  <span style="color: #6BCF7F;">📄 [MAIN]</span>
                  <button 
                    (click)="openContextFile()"
                    class="font-mono hover:opacity-80"
                    style="background: #333;color: #FFD93D; text-decoration: underline;">
                    ai_debug_context.txt
                  </button>
                  <button 
                    (click)="copyContextFilePath()"
                    class="px-2 py-1 rounded text-xs hover:opacity-80"
                    style="background: #333; color: #4ECDC4; border: 1px solid #666;"
                    title="Copy path">
                    📋 cp
                  </button>
                </div>
                
                @if (workflowState().copilotAnalysis) {
                  <div class="flex items-center gap-3 py-1">
                    <span style="color: #A8A8FF;">🤖 [AI]</span>
                    <button 
                      (click)="openCopilotAnalysisFile()"
                      class="font-mono hover:opacity-80"
                      style="background: #333;color: #FFD93D; text-decoration: underline;">
                      copilot_analysis.md
                    </button>
                    <button 
                      (click)="copyCopilotAnalysisFilePath()"
                      class="px-2 py-1 rounded text-xs hover:opacity-80"
                      style="background: #333; color: #4ECDC4; border: 1px solid #666;"
                      title="Copy path">
                      📋 cp
                    </button>
                  </div>
                }
              </div>
              
              <!-- Terminal Restart Command -->
              <div class="pt-4 border-t" style="border-color: #333;">
                <button 
                  (click)="resetWorkflow()"
                  class="px-4 py-2 font-mono font-bold rounded hover:opacity-90"
                  style="background: #333; color: #FF8C42; border: 2px solid #666;">
                  <span class="flex items-center gap-2">
                    <span>🔄</span>
                    <span>RESTART --new-session</span>
                  </span>
                </button>
              </div>
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
          this.updateWorkflowState({
            phase: 'error',
            progress: 0,
            message: 'Error occurred during workflow',
            error: message.data?.error || 'Unknown error'
          });
          break;
        case 'workflowComplete':
          // Handle completion of AI debug workflow
          this.handleAIDebugComplete(message.data);
          break;
        case 'aiAnalysisComplete':
          // Handle Copilot analysis results
          this.handleCopilotAnalysisComplete(message.data);
          break;
        case 'gitDiffComplete':
          // Handle git diff completion
          this.handleGitDiffComplete(message.data);
          break;
        case 'testResultsComplete':
          // Handle test results completion
          this.handleTestResultsComplete(message.data);
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

  private handleAIDebugComplete(data: any) {
    // Update workflow state to complete
    this.updateWorkflowState({
      phase: 'complete',
      progress: 100,
      message: 'AI debug workflow completed successfully'
    });
    
    // If we have analysis results, emit workflow complete event
    if (data?.analysis) {
      const aiAnalysis: AIAnalysis = {
        type: data.analysis.type || 'failure-analysis',
        rootCause: data.analysis.rootCause,
        suggestedFixes: data.analysis.suggestedFixes,
        newTestSuggestions: data.analysis.newTestSuggestions,
        falsePositiveWarnings: data.analysis.falsePositiveWarnings,
        codeImprovements: data.analysis.codeImprovements
      };
      
      this.workflowComplete.emit({ 
        testResults: data.testResults || [], 
        aiAnalysis 
      });
    }
  }

  private handleCopilotAnalysisComplete(data: any) {
    // Extract Copilot analysis from the data
    const copilotAnalysis: CopilotAnalysisResult = {
      type: data.type,
      analysisFilePath: data.analysisFilePath,
      rootCause: data.analysis?.rootCause,
      specificFixes: data.analysis?.specificFixes,
      preventionStrategies: data.analysis?.preventionStrategies,
      suspiciousTests: data.falsePositives?.suspiciousTests,
      recommendations: data.falsePositives?.recommendations || data.analysis?.preventionStrategies
    };

    // Update workflow state with Copilot analysis
    this.updateWorkflowState({
      copilotAnalysis
    });
  }

  private mapBackendStepToPhase(step: string): DebugWorkflowState['phase'] {
    switch (step) {
      case 'collecting-context':
      case 'generating-context':
        return 'collecting-context';
      case 'running-tests':
        return 'running-tests';
      case 'analyzing-with-ai':
        return 'analyzing-results';
      case 'generating-pr':
      case 'saving-context':
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

  getTerminalPhaseStatus(phaseKey: string): string {
    const currentPhase = this.workflowState().phase;
    const phases = ['collecting-context', 'running-tests', 'analyzing-results', 'generating-report'];
    const currentIndex = phases.indexOf(currentPhase);
    const phaseIndex = phases.indexOf(phaseKey);

    if (phaseIndex < currentIndex) {
      return '[✓]';
    } else if (phaseIndex === currentIndex) {
      return '[▶]';
    } else {
      return '[·]';
    }
  }

  getTerminalPhaseStyle(phaseKey: string): any {
    const currentPhase = this.workflowState().phase;
    const phases = ['collecting-context', 'running-tests', 'analyzing-results', 'generating-report'];
    const currentIndex = phases.indexOf(currentPhase);
    const phaseIndex = phases.indexOf(phaseKey);

    if (phaseIndex < currentIndex) {
      return { color: '#6BCF7F' }; // Green for completed
    } else if (phaseIndex === currentIndex) {
      return { color: '#FFD93D' }; // Yellow for current
    } else {
      return { color: '#666' }; // Gray for pending
    }
  }

  getTerminalPhaseLabel(phaseKey: string): string {
    const currentPhase = this.workflowState().phase;
    const phases = ['collecting-context', 'running-tests', 'analyzing-results', 'generating-report'];
    const currentIndex = phases.indexOf(currentPhase);
    const phaseIndex = phases.indexOf(phaseKey);

    if (phaseIndex < currentIndex) {
      return 'COMPLETE';
    } else if (phaseIndex === currentIndex) {
      return 'ACTIVE';
    } else {
      return 'PENDING';
    }
  }

  getProgressBars(): { filled: number[]; empty: number[] } {
    const progress = this.workflowState().progress;
    const filledBars = Math.floor(progress / 5);
    const emptyBars = 20 - filledBars;
    
    return {
      filled: Array.from({ length: filledBars }, (_, i) => i),
      empty: Array.from({ length: emptyBars }, (_, i) => i)
    };
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
      // Initialize workflow state
      this.updateWorkflowState({
        phase: 'collecting-context',
        progress: 10,
        message: 'Starting AI Test Debug workflow...'
      });

      // Send request to backend to run the real AI Test Debug workflow
      this.vscode.postMessage('runFullWorkflow', {
        fileSelection: this.fileSelection,
        testConfiguration: this.testConfiguration
      });

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

  openContextFile() {
    // Send message to backend to open the context file in VSCode editor
    this.vscode.postMessage('openContextFile', {});
  }

  openCopilotAnalysisFile() {
    // Send message to backend to open the Copilot analysis file in VSCode editor
    this.vscode.postMessage('openCopilotAnalysisFile', {});
  }

  openGitDiffFile() {
    // Send message to backend to open the git diff file in VSCode editor
    this.vscode.postMessage('openGitDiffFile', {});
  }

  openTestResultsFile() {
    // Send message to backend to open the test results file in VSCode editor
    this.vscode.postMessage('openTestResultsFile', {});
  }

  copyContextFilePath() {
    // Send message to backend to copy the context file path to clipboard
    this.vscode.postMessage('copyContextFilePath', {});
  }

  copyGitDiffFilePath() {
    // Send message to backend to copy the git diff file path to clipboard
    this.vscode.postMessage('copyGitDiffFilePath', {});
  }

  copyTestResultsFilePath() {
    // Send message to backend to copy the test results file path to clipboard
    this.vscode.postMessage('copyTestResultsFilePath', {});
  }

  copyCopilotAnalysisFilePath() {
    // Send message to backend to copy the Copilot analysis file path to clipboard
    this.vscode.postMessage('copyCopilotAnalysisFilePath', {});
  }

  private handleGitDiffComplete(data: any) {
    // Update workflow state with git diff file path
    this.updateWorkflowState({
      gitDiffFilePath: data.filePath
    });
  }

  private handleTestResultsComplete(data: any) {
    // Update workflow state with test results file path
    this.updateWorkflowState({
      testResultsFilePath: data.filePath
    });
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

}
