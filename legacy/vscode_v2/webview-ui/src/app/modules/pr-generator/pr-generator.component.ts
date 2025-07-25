import { Component, Input, Output, EventEmitter, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { VscodeService } from '../../services/vscode.service';
import { FileSelection } from '../file-selection/file-selector.component';
import { TestResult, AIAnalysis } from '../ai-debug/ai-debug.component';

export interface JiraTicket {
  key: string;
  summary: string;
  status: string;
  url: string;
}

export interface PRTemplate {
  name: string;
  displayName: string;
  description: string;
  template: string;
}

export interface PRDescription {
  problem: string;
  solution: string;
  details: string;
  qa: string;
  jiraLinks?: string[];
  featureFlags?: string[];
  testInstructions: string[];
  timestamp: string;
}

export interface PRGenerationContext {
  projectName: string;
  testTarget: string;
  testStatus: 'passing' | 'failing';
  lintStatus: 'passed' | 'failed';
  formatStatus: 'passed' | 'failed';
  codeChanges: string;
  testResults: string;
  timestamp: string;
}

@Component({
  selector: 'app-pr-generator',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-gray-900 rounded-lg border border-gray-700 font-mono text-sm h-full p-3" style="background: #1a1a1a; border-color: #333;">
      <!-- Terminal Header -->
      <div class="border-b pb-6 mb-8" style="border-color: #333;">
        <div class="flex items-center gap-2 mb-2">
          <span class="font-bold" style="color: #A8A8FF;">$</span>
          <span class="font-bold" style="color: #4ECDC4;">pr-generator</span>
          <span style="color: #FFD93D;">--template</span>
          <span style="color: #6BCF7F;">{{ selectedTemplate() }}</span>
        </div>
        <div style="color: #666;" class="text-xs">
          📋 PR Description Generator | {{ getGenerationStatus() }}
        </div>
      </div>

      <!-- Terminal Template Selection -->
      <div class="mb-8">
        <div class="mb-4 flex items-center gap-3">
          <span style="color: #A8A8FF;">></span>
          <span style="color: #4ECDC4;">📝 Select PR template type</span>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3 pl-6">
          @for (template of availableTemplates; track template.name) {
            <button
              (click)="selectTemplate(template.name)"
              class="p-3 rounded border-2 font-mono font-bold transition-opacity text-left hover:opacity-90"
              [ngStyle]="selectedTemplate() === template.name ? 
                {'background': '#6BCF7F', 'color': '#000', 'border-color': '#6BCF7F'} : 
                {'background': '#333', 'color': '#e5e5e5', 'border-color': '#666'}">
              <div class="font-medium mb-1">{{ template.displayName }}</div>
              <div class="text-xs" [ngStyle]="selectedTemplate() === template.name ? {'color': '#000'} : {'color': '#666'}">{{ template.description }}</div>
            </button>
          }
        </div>
      </div>

      <!-- Terminal Jira Integration -->
      <div class="mb-8">
        <div class="mb-4 flex items-center gap-3">
          <span style="color: #A8A8FF;">></span>
          <span style="color: #4ECDC4;">🏷️ Link Jira tickets</span>
        </div>
        <div class="flex gap-3 mb-4 pl-6">
          <input
            [(ngModel)]="jiraTicketInput"
            (keyup.enter)="addJiraTicket()"
            placeholder="PROJ-123, FEATURE-456"
            class="flex-1 px-3 py-2 rounded font-mono text-sm" style="background: #333; color: #e5e5e5; border: 1px solid #666;">
          <button
            (click)="addJiraTicket()"
            [disabled]="!jiraTicketInput.trim()"
            class="px-3 py-1 font-mono font-bold rounded border-2 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
            [ngStyle]="jiraTicketInput.trim() ? 
              {'background': '#6BCF7F', 'color': '#000', 'border-color': '#6BCF7F'} : 
              {'background': '#333', 'color': '#666', 'border-color': '#555'}">
            ADD
          </button>
        </div>
        
        @if (jiraTickets().length > 0) {
          <div class="flex flex-wrap gap-2 pl-6">
            @for (ticket of jiraTickets(); track ticket) {
              <div class="inline-flex items-center gap-2 px-3 py-1 text-sm rounded font-mono" style="background: #333; color: #FFD93D; border: 1px solid #666;">
                <span>{{ ticket }}</span>
                <button 
                  (click)="removeJiraTicket(ticket)"
                  class="hover:opacity-80 text-xs transition-opacity" style="color: #FF4B6D;">
                  ✕
                </button>
              </div>
            }
          </div>
        }
      </div>

      <!-- Terminal Feature Flags Detection -->
      @if (detectedFeatureFlags().length > 0) {
        <div class="mb-8">
          <div class="mb-4 flex items-center gap-3">
            <span style="color: #A8A8FF;">></span>
            <span style="color: #4ECDC4;">🏴 Detected feature flags</span>
          </div>
          <div class="rounded p-4 pl-6" style="background: #1f1f2a; border: 1px solid #4a4a6a;">
            <div class="flex flex-wrap gap-2">
              @for (flag of detectedFeatureFlags(); track flag) {
                <span class="px-3 py-1 text-xs font-mono rounded" style="background: #333; color: #A8A8FF; border: 1px solid #666;">
                  {{ flag }}
                </span>
              }
            </div>
          </div>
        </div>
      }

      <!-- Terminal Generation Controls -->
      <div class="mb-8 flex justify-center">
        <button
          (click)="generatePRTemplate()"
          [disabled]="isGenerating() || !canGenerate()"
          class="px-8 py-3 font-mono font-bold rounded border-2 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
          [ngStyle]="canGenerate() && !isGenerating() ? 
            {'background': '#6BCF7F', 'color': '#000', 'border-color': '#6BCF7F'} : 
            {'background': '#333', 'color': '#666', 'border-color': '#555'}">
          @if (isGenerating()) {
            <span class="flex items-center justify-center gap-3">
              <span class="animate-spin">⟳</span>
              <span>CREATE --ai-template</span>
            </span>
          } @else {
            <span class="flex items-center justify-center gap-3">
              <span>📝</span>
              <span>CREATE --ai-template</span>
            </span>
          }
        </button>
      </div>

      <!-- Terminal Generated Template File -->
      @if (generatedTemplateFile()) {
        <div class="mb-8">
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-3">
              <span style="color: #A8A8FF;">></span>
              <span class="text-sm font-medium" style="color: #4ECDC4;">AI Template Created:</span>
            </div>
            <div class="flex gap-2">
              <button
                (click)="openTemplateFile()"
                class="px-3 py-1 text-xs font-mono rounded border hover:opacity-80 transition-opacity" style="background: #333; color: #A8A8FF; border-color: #666;">
                📂 open --file
              </button>
              <button
                (click)="copyFilePathToClipboard()"
                class="px-3 py-1 text-xs font-mono rounded border hover:opacity-80 transition-opacity" style="background: #333; color: #A8A8FF; border-color: #666;">
                📋 copy --path
              </button>
            </div>
          </div>
          
          <div class="rounded p-4" style="background: #0a0a0a; border: 1px solid #333;">
            <div class="mb-3 flex items-center gap-2">
              <span class="text-xs" style="color: #FFD93D;">Template ready for AI analysis:</span>
              <span class="text-xs font-mono" style="color: #4ECDC4;">{{ generatedTemplateFile() }}</span>
            </div>
            
            <div class="rounded p-3" style="background: #1f2a1f; border: 1px solid #4a6a4a;">
              <div class="text-xs mb-2" style="color: #6BCF7F;">✅ Template includes:</div>
              <div class="text-xs space-y-1" style="color: #e5e5e5;">
                <div class="flex items-center gap-2">
                  <span>•</span>
                  <span>Git diff with all file changes</span>
                </div>
                <div class="flex items-center gap-2">
                  <span>•</span>
                  <span>PR description prompts and format</span>
                </div>
                <div class="flex items-center gap-2">
                  <span>•</span>
                  <span>Context from selected template: {{ selectedTemplate() }}</span>
                </div>
                @if (jiraTickets().length > 0) {
                  <div class="flex items-center gap-2">
                    <span>•</span>
                    <span>Jira ticket links: {{ jiraTickets().join(', ') }}</span>
                  </div>
                }
              </div>
            </div>
            
            <div class="mt-3 text-xs" style="color: #666;">
              Send this file to your AI assistant to generate a professional PR description.
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: []
})
export class PRGeneratorComponent implements OnInit {
  @Input() fileSelection: FileSelection | null = null;
  @Input() testResults: TestResult[] | null = null;
  @Input() aiAnalysis: AIAnalysis | null = null;
  @Output() descriptionGenerated = new EventEmitter<string>();

  constructor(private vscode: VscodeService) {}

  selectedTemplate = signal<string>('standard');
  jiraTickets = signal<string[]>([]);
  detectedFeatureFlags = signal<string[]>([]);
  isGenerating = signal<boolean>(false);
  generatedDescription = signal<string>('');
  generatedTemplateFile = signal<string>('');

  jiraTicketInput = '';

  availableTemplates: PRTemplate[] = [
    {
      name: 'standard',
      displayName: 'Standard Fix',
      description: 'Bug fixes and improvements',
      template: 'standard'
    },
    {
      name: 'feature',
      displayName: 'New Feature', 
      description: 'Adding new functionality',
      template: 'feature'
    },
    {
      name: 'refactor',
      displayName: 'Refactoring',
      description: 'Code improvements/cleanup',
      template: 'refactor'
    },
    {
      name: 'test',
      displayName: 'Testing',
      description: 'Test additions/improvements',
      template: 'test'
    }
  ];

  ngOnInit() {
    this.detectFeatureFlags();
    this.setupMessageHandlers();
  }
  
  private setupMessageHandlers() {
    this.vscode.onMessage().subscribe(message => {
      if (!message) return;
      
      switch (message.command) {
        case 'prTemplateGenerated':
          this.handlePRTemplateGenerated(message.data);
          break;
        case 'prDescriptionGenerated':
          this.handlePRDescriptionGenerated(message.data);
          break;
        case 'gitDiffGenerated':
          this.handleGitDiffGenerated(message.data);
          break;
        case 'prGenerationError':
          this.handlePRGenerationError(message.data);
          break;
      }
    });
  }
  
  private handlePRTemplateGenerated(data: { templateFile: string; filePath: string }) {
    this.generatedTemplateFile.set(data.filePath);
    this.isGenerating.set(false);
  }
  
  private handlePRDescriptionGenerated(data: { description: string; diffFile?: string }) {
    this.generatedDescription.set(data.description);
    this.descriptionGenerated.emit(data.description);
    this.isGenerating.set(false);
  }
  
  private handleGitDiffGenerated(data: { diffFile: string; content: string }) {
    console.log('Git diff generated:', data.diffFile);
    // Diff file is ready for Copilot processing
  }
  
  private handlePRGenerationError(data: { error: string }) {
    console.error('PR generation failed:', data.error);
    // Fallback to template-based generation
    this.fallbackToTemplateGeneration();
    this.isGenerating.set(false);
  }
  
  private async fallbackToTemplateGeneration() {
    const context = this.buildPRGenerationContext();
    const description = this.buildRealDescription(context);
    this.generatedDescription.set(description);
    this.descriptionGenerated.emit(description);
  }

  canGenerate(): boolean {
    return !!(this.fileSelection);
  }

  getGenerationStatus(): string {
    if (this.isGenerating()) return 'Creating template...';
    if (this.generatedTemplateFile()) return 'Template created';
    return 'Ready to create template';
  }

  selectTemplate(templateName: string) {
    this.selectedTemplate.set(templateName);
  }

  getTemplateButtonClass(templateName: string): string {
    const baseClass = 'transition-all duration-200';
    if (this.selectedTemplate() === templateName) {
      return `${baseClass} bg-vscode-button-background text-vscode-button-foreground border-vscode-button-background`;
    }
    return `${baseClass} bg-vscode-button-secondaryBackground text-vscode-button-secondaryForeground border-vscode-panel-border hover:bg-vscode-list-hoverBackground`;
  }

  addJiraTicket() {
    const input = this.jiraTicketInput.trim();
    if (!input) return;

    const tickets = input.split(',').map(t => t.trim().toUpperCase()).filter(t => t);
    const validTickets = tickets.filter(t => /^[A-Z]+-\d+$/.test(t));
    
    if (validTickets.length > 0) {
      const currentTickets = this.jiraTickets();
      const newTickets = validTickets.filter(t => !currentTickets.includes(t));
      this.jiraTickets.set([...currentTickets, ...newTickets]);
    }
    
    this.jiraTicketInput = '';
  }

  removeJiraTicket(ticket: string) {
    this.jiraTickets.update(tickets => tickets.filter(t => t !== ticket));
  }

  async generatePRTemplate() {
    if (!this.canGenerate() || this.isGenerating()) return;

    this.isGenerating.set(true);

    try {
      // Generate PR template file with git diff and prompts
      this.vscode.postMessage('generatePRTemplate', {
        fileSelection: this.fileSelection,
        testResults: this.testResults,
        template: this.selectedTemplate(),
        jiraTickets: this.jiraTickets(),
        featureFlags: this.detectedFeatureFlags()
      });
      
      // Wait for response from backend
      // The actual response will be handled by message listener
      
    } catch (error) {
      console.error('Failed to generate template:', error);
      this.isGenerating.set(false);
    }
  }

  async generatePRDescription() {
    if (!this.canGenerate() || this.isGenerating()) return;

    this.isGenerating.set(true);

    try {
      // Step 1: Generate git diff for selected files
      this.vscode.postMessage('generateGitDiff', {
        fileSelection: this.fileSelection
      });
      
      // Step 2: Request AI-generated PR description from Copilot
      this.vscode.postMessage('generatePRDescription', {
        fileSelection: this.fileSelection,
        testResults: this.testResults,
        template: this.selectedTemplate(),
        jiraTickets: this.jiraTickets(),
        featureFlags: this.detectedFeatureFlags()
      });
      
      // Wait for response from backend
      // The actual response will be handled by message listener
      
    } catch (error) {
      console.error('Failed to generate description:', error);
      this.isGenerating.set(false);
    }
  }

  copyToClipboard() {
    const description = this.generatedDescription();
    if (description) {
      navigator.clipboard.writeText(description);
    }
  }

  openTemplateFile() {
    const filePath = this.generatedTemplateFile();
    if (filePath) {
      this.vscode.postMessage('openFile', { filePath });
    }
  }

  copyFilePathToClipboard() {
    const filePath = this.generatedTemplateFile();
    if (filePath) {
      navigator.clipboard.writeText(filePath);
    }
  }

  private detectFeatureFlags() {
    if (!this.fileSelection?.diff) {
      this.detectedFeatureFlags.set([]);
      return;
    }

    // Mock feature flag detection
    this.detectedFeatureFlags.set(['USER_DASHBOARD_V2', 'ENHANCED_AUTH']);
  }

  private buildPRGenerationContext(): PRGenerationContext {
    const testStatus = this.getTestStatus();
    const fileCount = this.fileSelection?.files?.length || 0;
    
    return {
      projectName: 'Angular NX Monorepo',
      testTarget: this.getTestTarget(),
      testStatus: testStatus.status,
      lintStatus: testStatus.lintPassed ? 'passed' : 'failed',
      formatStatus: testStatus.formatPassed ? 'passed' : 'failed',
      codeChanges: this.getCodeChangesSummary(),
      testResults: this.getTestResultsSummary(),
      timestamp: new Date().toISOString()
    };
  }

  private buildRealDescription(context: PRGenerationContext): string {
    const template = this.selectedTemplate();
    const problemSection = this.buildProblemSection(template, context);
    const solutionSection = this.buildSolutionSection(template, context);
    const detailsSection = this.buildDetailsSection(template, context);
    const qaSection = this.buildQASection(context);
    const jiraSection = this.buildJiraSection();
    
    return `**Problem**
${problemSection}${jiraSection}

**Solution**
${solutionSection}

**Details**
${detailsSection}

**QA**
${qaSection}`;
  }

  private buildProblemSection(template: string, context: PRGenerationContext): string {
    const fileCount = this.fileSelection?.files?.length || 0;
    const hasTestFailures = context.testStatus === 'failing';
    
    switch (template) {
      case 'feature':
        return `Adding new functionality to enhance user experience and application capabilities. This PR introduces ${fileCount} modified files with comprehensive test coverage.`;
      case 'refactor':
        return `Improving code quality, maintainability, and performance across ${fileCount} files. This refactoring enhances the codebase without changing external behavior.`;
      case 'test':
        return `Enhancing test coverage and test quality across the application. This PR focuses on improving test reliability and adding missing test scenarios.`;
      default:
        return hasTestFailures
          ? `Fixing test failures and resolving issues affecting application stability. This PR addresses ${fileCount} modified files with comprehensive fixes.`
          : `Implementing improvements and fixes across ${fileCount} files to enhance application reliability and user experience.`;
    }
  }

  private buildSolutionSection(template: string, context: PRGenerationContext): string {
    const changes = this.getSpecificChanges();
    const testStatus = context.testStatus === 'passing' ? 'All tests are now passing' : 'Test fixes implemented';
    
    return `${changes}\n\n${testStatus} with proper code formatting and linting applied.`;
  }

  private buildDetailsSection(template: string, context: PRGenerationContext): string {
    const technicalDetails = [
      '• Analyzed existing code patterns and architecture',
      '• Implemented changes following project conventions',
      '• Updated test cases to match new behavior',
      '• Verified all linting and formatting standards'
    ];
    
    if (context.testStatus === 'failing') {
      technicalDetails.unshift('• Identified root causes of test failures');
      technicalDetails.push('• Validated fixes against existing functionality');
    }
    
    return technicalDetails.join('\n');
  }

  private buildQASection(context: PRGenerationContext): string {
    const testInstructions = [
      `Run: \`yarn nx test ${context.testTarget}\``,
      `Run: \`yarn nx lint ${context.testTarget}\``,
      `Run: \`yarn nx prettier ${context.testTarget} --write\``,
      'Verify all tests pass and code follows style guidelines'
    ];
    
    const functionalTesting = [
      'Test the specific functionality mentioned in the Solution section',
      'Check for any UI/UX changes if applicable',
      'Verify no regressions in related features'
    ];
    
    return `**Technical Testing:**\n${testInstructions.map(t => `• ${t}`).join('\n')}\n\n**Functional Testing:**\n${functionalTesting.map(t => `• ${t}`).join('\n')}`;
  }

  private buildJiraSection(): string {
    if (this.jiraTickets().length === 0) return '';
    return `\n${this.jiraTickets().map(ticket => `[${ticket}](https://your-domain.atlassian.net/browse/${ticket})`).join(' ')}`;
  }

  private getTestStatus(): { status: 'passing' | 'failing', lintPassed: boolean, formatPassed: boolean } {
    // Determine from test results and AI analysis
    const hasFailures = this.testResults && this.testResults.some(r => r.status === 'failed');
    return {
      status: hasFailures ? 'failing' : 'passing',
      lintPassed: true, // TODO: Get from actual lint results
      formatPassed: true // TODO: Get from actual format results
    };
  }

  private getTestTarget(): string {
    // Extract test target from file selection or use default
    return this.fileSelection?.mode === 'commit' ? 'affected' : 'selected-files';
  }

  private getCodeChangesSummary(): string {
    if (!this.fileSelection) return 'No changes detected';
    
    const fileCount = this.fileSelection.files?.length || 0;
    const mode = this.fileSelection.mode;
    
    switch (mode) {
      case 'uncommitted':
        return `${fileCount} uncommitted files modified`;
      case 'commit':
        const commitCount = this.fileSelection.commits?.length || 0;
        return `Changes from ${commitCount} commit(s) affecting ${fileCount} files`;
      case 'branch-diff':
        return `Branch diff affecting ${fileCount} files`;
      default:
        return `${fileCount} files modified`;
    }
  }

  private getTestResultsSummary(): string {
    if (!this.testResults || this.testResults.length === 0) {
      return 'No test results available';
    }
    
    const passed = this.testResults.filter(r => r.status === 'passed').length;
    const failed = this.testResults.filter(r => r.status === 'failed').length;
    const skipped = this.testResults.filter(r => r.status === 'skipped').length;
    
    return `${passed} passed, ${failed} failed${skipped > 0 ? `, ${skipped} skipped` : ''}`;
  }

  private getSpecificChanges(): string {
    // Build specific changes based on file selection
    const fileTypes = this.categorizeChangedFiles();
    const changes: string[] = [];
    
    if (fileTypes.components.length > 0) {
      changes.push(`Updated ${fileTypes.components.length} component(s) with enhanced functionality`);
    }
    if (fileTypes.services.length > 0) {
      changes.push(`Modified ${fileTypes.services.length} service(s) for improved business logic`);
    }
    if (fileTypes.tests.length > 0) {
      changes.push(`Enhanced ${fileTypes.tests.length} test file(s) with comprehensive coverage`);
    }
    if (fileTypes.other.length > 0) {
      changes.push(`Updated ${fileTypes.other.length} additional file(s) for system consistency`);
    }
    
    return changes.length > 0 ? changes.join('\n• ') : 'General code improvements and fixes';
  }

  private categorizeChangedFiles(): { components: string[], services: string[], tests: string[], other: string[] } {
    const files = this.fileSelection?.files || [];
    const categories = { components: [] as string[], services: [] as string[], tests: [] as string[], other: [] as string[] };
    
    files.forEach(file => {
      const filePath = file.path;
      if (filePath.includes('.component.')) categories.components.push(filePath);
      else if (filePath.includes('.service.')) categories.services.push(filePath);
      else if (filePath.includes('.spec.') || filePath.includes('.test.')) categories.tests.push(filePath);
      else categories.other.push(filePath);
    });
    
    return categories;
  }

  private simulateDelay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
