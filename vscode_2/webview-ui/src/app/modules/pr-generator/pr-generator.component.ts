import { Component, Input, Output, EventEmitter, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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

@Component({
  selector: 'app-pr-generator',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-vscode-editor-background p-4 rounded-lg border border-vscode-panel-border">
      <div class="flex items-center justify-between mb-6">
        <h3 class="text-vscode-foreground text-lg font-semibold flex items-center gap-2">
          <span class="text-2xl">📋</span>
          PR Description Generator
        </h3>
        <div class="text-vscode-descriptionForeground text-sm">
          {{ getGenerationStatus() }}
        </div>
      </div>

      <!-- Template Selection -->
      <div class="mb-6">
        <label class="text-vscode-foreground text-sm font-medium mb-3 block">
          PR Template:
        </label>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          @for (template of availableTemplates; track template.name) {
            <button
              (click)="selectTemplate(template.name)"
              [class]="getTemplateButtonClass(template.name)"
              class="p-3 rounded border transition-all duration-200 text-left">
              <div class="font-medium mb-1">{{ template.displayName }}</div>
              <div class="text-xs opacity-75">{{ template.description }}</div>
            </button>
          }
        </div>
      </div>

      <!-- Jira Integration -->
      <div class="mb-6">
        <label class="text-vscode-foreground text-sm font-medium mb-3 block">
          Jira Tickets:
        </label>
        <div class="flex gap-2 mb-3">
          <input
            [(ngModel)]="jiraTicketInput"
            (keyup.enter)="addJiraTicket()"
            placeholder="PROJ-123, FEATURE-456"
            class="flex-1 px-3 py-2 bg-vscode-input-background text-vscode-input-foreground border border-vscode-input-border rounded focus:border-vscode-inputOption-activeBorder">
          <button
            (click)="addJiraTicket()"
            [disabled]="!jiraTicketInput.trim()"
            class="px-4 py-2 bg-vscode-button-background text-vscode-button-foreground rounded hover:bg-vscode-button-hoverBackground disabled:opacity-50">
            Add
          </button>
        </div>
        
        @if (jiraTickets().length > 0) {
          <div class="flex flex-wrap gap-2">
            @for (ticket of jiraTickets(); track ticket) {
              <div class="inline-flex items-center gap-2 px-3 py-1 bg-vscode-badge-background text-vscode-badge-foreground text-sm rounded border">
                <span>{{ ticket }}</span>
                <button 
                  (click)="removeJiraTicket(ticket)"
                  class="text-vscode-badge-foreground hover:text-red-500 text-xs">
                  ✕
                </button>
              </div>
            }
          </div>
        }
      </div>

      <!-- Feature Flags Detection -->
      @if (detectedFeatureFlags().length > 0) {
        <div class="mb-6">
          <label class="text-vscode-foreground text-sm font-medium mb-3 block">
            Detected Feature Flags:
          </label>
          <div class="bg-vscode-textBlockQuote-background border border-vscode-panel-border rounded p-3">
            <div class="flex flex-wrap gap-2">
              @for (flag of detectedFeatureFlags(); track flag) {
                <span class="px-2 py-1 bg-vscode-textPreformat-background text-vscode-textPreformat-foreground text-xs font-mono rounded border">
                  {{ flag }}
                </span>
              }
            </div>
          </div>
        </div>
      }

      <!-- Generation Controls -->
      <div class="mb-6 flex gap-3">
        <button
          (click)="generatePRDescription()"
          [disabled]="isGenerating() || !canGenerate()"
          class="flex-1 px-4 py-3 bg-vscode-button-background text-vscode-button-foreground rounded font-medium hover:bg-vscode-button-hoverBackground disabled:opacity-50 disabled:cursor-not-allowed">
          @if (isGenerating()) {
            <span class="flex items-center justify-center gap-2">
              <span class="animate-spin">⏳</span>
              Generating...
            </span>
          } @else {
            <span class="flex items-center justify-center gap-2">
              <span>🤖</span>
              Generate PR Description
            </span>
          }
        </button>
      </div>

      <!-- Generated Description -->
      @if (generatedDescription()) {
        <div class="mb-6">
          <div class="flex items-center justify-between mb-3">
            <label class="text-vscode-foreground text-sm font-medium">Generated PR Description:</label>
            <button
              (click)="copyToClipboard()"
              class="px-3 py-1 text-xs bg-vscode-button-secondaryBackground text-vscode-button-secondaryForeground rounded hover:bg-vscode-button-secondaryHoverBackground">
              📋 Copy
            </button>
          </div>
          
          <div class="bg-vscode-editor-background border border-vscode-panel-border rounded p-4">
            <pre class="text-vscode-editor-foreground text-sm whitespace-pre-wrap font-sans leading-relaxed">{{ generatedDescription() }}</pre>
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

  selectedTemplate = signal<string>('standard');
  jiraTickets = signal<string[]>([]);
  detectedFeatureFlags = signal<string[]>([]);
  isGenerating = signal<boolean>(false);
  generatedDescription = signal<string>('');

  jiraTicketInput = '';

  availableTemplates: PRTemplate[] = [
    {
      name: 'standard',
      displayName: 'Standard PR',
      description: 'General purpose template',
      template: 'Standard PR template'
    },
    {
      name: 'feature',
      displayName: 'Feature PR', 
      description: 'For new features',
      template: 'Feature PR template'
    },
    {
      name: 'bugfix',
      displayName: 'Bug Fix PR',
      description: 'For bug fixes',
      template: 'Bug fix PR template'
    },
    {
      name: 'hotfix',
      displayName: 'Hotfix PR',
      description: 'For urgent fixes',
      template: 'Hotfix PR template'
    }
  ];

  ngOnInit() {
    this.detectFeatureFlags();
  }

  canGenerate(): boolean {
    return !!(this.fileSelection);
  }

  getGenerationStatus(): string {
    if (this.isGenerating()) return 'Generating...';
    if (this.generatedDescription()) return 'Generated';
    return 'Ready to generate';
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

  async generatePRDescription() {
    if (!this.canGenerate() || this.isGenerating()) return;

    this.isGenerating.set(true);

    try {
      // Mock generation - would use Copilot API
      await this.simulateDelay(2000);
      
      const description = this.buildMockDescription();
      this.generatedDescription.set(description);
      this.descriptionGenerated.emit(description);
    } catch (error) {
      console.error('Failed to generate description:', error);
    } finally {
      this.isGenerating.set(false);
    }
  }

  copyToClipboard() {
    const description = this.generatedDescription();
    if (description) {
      navigator.clipboard.writeText(description);
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

  private buildMockDescription(): string {
    const template = this.selectedTemplate();
    const jiraSection = this.jiraTickets().length > 0 
      ? `\n\n## Related Issues\n${this.jiraTickets().map(t => `- ${t}`).join('\n')}`
      : '';
    
    const flagSection = this.detectedFeatureFlags().length > 0
      ? `\n\n## Feature Flags\n${this.detectedFeatureFlags().map(f => `- \`${f}\``).join('\n')}`
      : '';

    return `## Summary
This PR implements ${template} changes based on the selected file modifications.

## Changes Made
- Updated components and services
- Enhanced test coverage
- Improved error handling

## Testing
- All automated tests passing
- Manual testing completed${jiraSection}${flagSection}

## Deployment Notes
Standard deployment process applies.`;
  }

  private simulateDelay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
