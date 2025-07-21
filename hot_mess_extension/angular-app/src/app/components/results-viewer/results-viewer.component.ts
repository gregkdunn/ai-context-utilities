import { Component, ChangeDetectionStrategy, inject, signal, computed, effect, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CommandStore } from '../../stores/command.store';
import { CommandResult, CommandExecution, StreamingMessage } from '../../models';

@Component({
  selector: 'app-results-viewer',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="results-viewer h-full flex flex-col bg-vscode-panel-background border border-vscode-panel-border rounded-md">
      <!-- Header -->
      <div class="flex items-center justify-between p-vscode-md border-b border-vscode-panel-border">
        <div class="flex items-center gap-2">
          <h3 class="text-sm font-medium text-vscode-foreground">
            {{ getHeaderTitle() }}
          </h3>
          @if (isLive()) {
            <div class="flex items-center gap-1">
              <div class="w-2 h-2 bg-vscode-success rounded-full animate-pulse"></div>
              <span class="text-xs text-vscode-success">Live</span>
            </div>
          }
        </div>
        
        <div class="flex items-center gap-2">
          <!-- View mode toggle -->
          <div class="flex bg-vscode-input-background border border-vscode-input-border rounded-md p-1">
            <button
              class="px-2 py-1 text-xs rounded transition-colors"
              [class.bg-vscode-button-background]="viewMode() === 'output'"
              [class.text-vscode-button-foreground]="viewMode() === 'output'"
              (click)="viewMode.set('output')"
              [attr.aria-pressed]="viewMode() === 'output'">
              Output
            </button>
            <button
              class="px-2 py-1 text-xs rounded transition-colors"
              [class.bg-vscode-button-background]="viewMode() === 'files'"
              [class.text-vscode-button-foreground]="viewMode() === 'files'"
              (click)="viewMode.set('files')"
              [attr.aria-pressed]="viewMode() === 'files'">
              Files
            </button>
            <button
              class="px-2 py-1 text-xs rounded transition-colors"
              [class.bg-vscode-button-background]="viewMode() === 'summary'"
              [class.text-vscode-button-foreground]="viewMode() === 'summary'"
              (click)="viewMode.set('summary')"
              [attr.aria-pressed]="viewMode() === 'summary'">
              Summary
            </button>
          </div>
          
          <!-- Action buttons -->
          <div class="flex gap-1">
            <button
              class="p-1 text-xs text-vscode-foreground hover:bg-vscode-hover rounded"
              (click)="clearOutput()"
              [disabled]="!hasOutput()"
              title="Clear output">
              🗑️
            </button>
            <button
              class="p-1 text-xs text-vscode-foreground hover:bg-vscode-hover rounded"
              (click)="downloadOutput()"
              [disabled]="!hasOutput()"
              title="Download output">
              💾
            </button>
            <button
              class="p-1 text-xs text-vscode-foreground hover:bg-vscode-hover rounded"
              (click)="toggleAutoScroll()"
              [class.text-vscode-success]="autoScroll()"
              title="Toggle auto-scroll">
              {{ autoScroll() ? '⏸️' : '▶️' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Content -->
      <div class="flex-1 min-h-0 relative">
        @switch (viewMode()) {
          @case ('output') {
            <div class="h-full relative">
              <!-- Output content -->
              <div 
                #outputContainer
                class="h-full overflow-y-auto font-mono text-vscode-xs p-vscode-md"
                [class.pb-8]="isStreaming()"
                (scroll)="onScroll($event)">
                
                @if (outputLines().length === 0) {
                  <div class="flex items-center justify-center h-full text-vscode-foreground opacity-50">
                    <div class="text-center">
                      <div class="text-2xl mb-2">📄</div>
                      <div class="text-sm">No output yet</div>
                      <div class="text-xs mt-1">Run a command to see results here</div>
                    </div>
                  </div>
                } @else {
                  @for (line of outputLines(); track line.id) {
                    <div 
                      class="output-line"
                      [class]="getLineClass(line)"
                      [attr.data-line-type]="line.type"
                      [attr.data-timestamp]="line.timestamp">
                      
                      <span class="timestamp text-vscode-foreground opacity-50 mr-2">
                        {{ formatTimestamp(line.timestamp) }}
                      </span>
                      
                      @if (line.type === 'error') {
                        <span class="line-prefix text-vscode-error">❌</span>
                      } @else if (line.type === 'warning') {
                        <span class="line-prefix text-vscode-warning">⚠️</span>
                      } @else if (line.type === 'success') {
                        <span class="line-prefix text-vscode-success">✅</span>
                      } @else if (line.type === 'info') {
                        <span class="line-prefix text-vscode-info">ℹ️</span>
                      }
                      
                      <span class="line-content" [innerHTML]="formatOutputLine(line.content)"></span>
                    </div>
                  }
                }
              </div>
              
              <!-- Auto-scroll indicator -->
              @if (isStreaming() && autoScroll()) {
                <div class="absolute bottom-2 left-1/2 transform -translate-x-1/2 bg-vscode-progress text-white px-2 py-1 rounded text-xs">
                  Auto-scrolling...
                </div>
              }
            </div>
          }
          
          @case ('files') {
            <div class="h-full overflow-y-auto p-vscode-md">
              @if (outputFiles().length === 0) {
                <div class="flex items-center justify-center h-full text-vscode-foreground opacity-50">
                  <div class="text-center">
                    <div class="text-2xl mb-2">📁</div>
                    <div class="text-sm">No files generated</div>
                    <div class="text-xs mt-1">Files created by commands will appear here</div>
                  </div>
                </div>
              } @else {
                <div class="space-y-3">
                  @for (file of outputFiles(); track file.name) {
                    <div class="file-item border border-vscode-panel-border rounded-md p-3 hover:bg-vscode-hover transition-colors">
                      <div class="flex items-center justify-between mb-2">
                        <div class="flex items-center gap-2">
                          <span class="text-lg">{{ getFileIcon(file.name) }}</span>
                          <span class="text-sm font-medium text-vscode-foreground">{{ file.name }}</span>
                          <span class="text-xs text-vscode-foreground opacity-75">{{ formatFileSize(file.size) }}</span>
                        </div>
                        <div class="flex gap-1">
                          <button
                            class="p-1 text-xs text-vscode-foreground hover:bg-vscode-button-hover rounded"
                            (click)="openFile(file)"
                            title="Open file">
                            👁️
                          </button>
                          <button
                            class="p-1 text-xs text-vscode-foreground hover:bg-vscode-button-hover rounded"
                            (click)="downloadFile(file)"
                            title="Download file">
                            💾
                          </button>
                        </div>
                      </div>
                      <div class="text-xs text-vscode-foreground opacity-75 mb-2">
                        Created: {{ formatTimestamp(file.created) }}
                      </div>
                      @if (file.preview) {
                        <div class="bg-vscode-input-background border border-vscode-input-border rounded p-2 text-xs font-mono max-h-32 overflow-y-auto">
                          {{ file.preview }}
                        </div>
                      }
                    </div>
                  }
                </div>
              }
            </div>
          }
          
          @case ('summary') {
            <div class="h-full overflow-y-auto p-vscode-md">
              @if (currentExecution()) {
                <div class="space-y-4">
                  <!-- Execution Info -->
                  <div class="bg-vscode-input-background border border-vscode-input-border rounded-md p-3">
                    <h4 class="text-sm font-medium text-vscode-foreground mb-2">Execution Details</h4>
                    <div class="space-y-1 text-xs">
                      <div class="flex justify-between">
                        <span class="text-vscode-foreground opacity-75">Command:</span>
                        <span class="text-vscode-foreground">{{ currentExecution()?.action }}</span>
                      </div>
                      <div class="flex justify-between">
                        <span class="text-vscode-foreground opacity-75">Project:</span>
                        <span class="text-vscode-foreground">{{ currentExecution()?.project }}</span>
                      </div>
                      <div class="flex justify-between">
                        <span class="text-vscode-foreground opacity-75">Status:</span>
                        <span [class]="getStatusClass(currentExecution()?.status)">
                          {{ currentExecution()?.status }}
                        </span>
                      </div>
                      <div class="flex justify-between">
                        <span class="text-vscode-foreground opacity-75">Duration:</span>
                        <span class="text-vscode-foreground">{{ getDuration() }}</span>
                      </div>
                    </div>
                  </div>
                  
                  <!-- Statistics -->
                  <div class="bg-vscode-input-background border border-vscode-input-border rounded-md p-3">
                    <h4 class="text-sm font-medium text-vscode-foreground mb-2">Statistics</h4>
                    <div class="grid grid-cols-2 gap-2 text-xs">
                      <div class="flex justify-between">
                        <span class="text-vscode-foreground opacity-75">Total Lines:</span>
                        <span class="text-vscode-foreground">{{ outputLines().length }}</span>
                      </div>
                      <div class="flex justify-between">
                        <span class="text-vscode-foreground opacity-75">Files Created:</span>
                        <span class="text-vscode-foreground">{{ outputFiles().length }}</span>
                      </div>
                      <div class="flex justify-between">
                        <span class="text-vscode-foreground opacity-75">Errors:</span>
                        <span class="text-vscode-error">{{ getErrorCount() }}</span>
                      </div>
                      <div class="flex justify-between">
                        <span class="text-vscode-foreground opacity-75">Warnings:</span>
                        <span class="text-vscode-warning">{{ getWarningCount() }}</span>
                      </div>
                    </div>
                  </div>
                  
                  <!-- Key Insights -->
                  @if (insights().length > 0) {
                    <div class="bg-vscode-input-background border border-vscode-input-border rounded-md p-3">
                      <h4 class="text-sm font-medium text-vscode-foreground mb-2">Key Insights</h4>
                      <ul class="space-y-1 text-xs">
                        @for (insight of insights(); track insight) {
                          <li class="flex items-start gap-2">
                            <span class="text-vscode-info">•</span>
                            <span class="text-vscode-foreground">{{ insight }}</span>
                          </li>
                        }
                      </ul>
                    </div>
                  }
                </div>
              } @else {
                <div class="flex items-center justify-center h-full text-vscode-foreground opacity-50">
                  <div class="text-center">
                    <div class="text-2xl mb-2">📊</div>
                    <div class="text-sm">No execution data</div>
                    <div class="text-xs mt-1">Run a command to see summary information</div>
                  </div>
                </div>
              }
            </div>
          }
        }
      </div>
    </div>
  `,
  styles: [`
    .results-viewer {
      font-family: var(--vscode-font-family);
    }
    
    .output-line {
      @apply py-0.5 px-1 rounded hover:bg-vscode-hover transition-colors;
      @apply flex items-start gap-1;
      @apply border-l-2 border-transparent;
    }
    
    .output-line.error {
      @apply border-l-vscode-error bg-vscode-error bg-opacity-5;
    }
    
    .output-line.warning {
      @apply border-l-vscode-warning bg-vscode-warning bg-opacity-5;
    }
    
    .output-line.success {
      @apply border-l-vscode-success bg-vscode-success bg-opacity-5;
    }
    
    .output-line.info {
      @apply border-l-vscode-info bg-vscode-info bg-opacity-5;
    }
    
    .timestamp {
      @apply text-xs font-mono;
      @apply min-w-max flex-shrink-0;
    }
    
    .line-prefix {
      @apply text-sm flex-shrink-0;
    }
    
    .line-content {
      @apply break-words;
    }
    
    .file-item {
      @apply cursor-pointer;
    }
    
    .file-item:hover {
      @apply shadow-sm;
    }
    
    /* Scrollbar styling */
    ::-webkit-scrollbar {
      width: 8px;
    }
    
    ::-webkit-scrollbar-track {
      @apply bg-vscode-panel-background;
    }
    
    ::-webkit-scrollbar-thumb {
      @apply bg-vscode-panel-border rounded;
    }
    
    ::-webkit-scrollbar-thumb:hover {
      @apply bg-vscode-foreground opacity-50;
    }
  `]
})
export class ResultsViewerComponent {
  // Inputs
  readonly executionId = input<string>('');
  readonly isStreaming = input<boolean>(false);
  
  // Outputs
  readonly fileOpened = output<{ name: string; path: string }>();
  readonly fileDownloaded = output<{ name: string; content: string }>();
  readonly outputCleared = output<void>();

  // Signals for UI state
  private readonly viewMode = signal<'output' | 'files' | 'summary'>('output');
  private readonly autoScroll = signal(true);
  private readonly lastScrollTop = signal(0);
  private readonly searchTerm = signal('');

  // Injected services
  private readonly commandStore = inject(CommandStore);

  // Computed properties
  private readonly currentExecution = computed(() => {
    const id = this.executionId();
    if (!id) return null;
    return this.commandStore.activeCommands()[id] || null;
  });

  private readonly outputLines = computed(() => {
    const execution = this.currentExecution();
    if (!execution) return [];
    
    return execution.output.map((line, index) => ({
      id: `${execution.id}-${index}`,
      content: line,
      type: this.detectLineType(line),
      timestamp: new Date(execution.startTime.getTime() + (index * 100)), // Approximate timestamps
    }));
  });

  private readonly outputFiles = computed(() => {
    const execution = this.currentExecution();
    if (!execution) return [];
    
    // Extract file references from output
    const files: any[] = [];
    execution.output.forEach((line, index) => {
      const fileMatch = line.match(/^(Created|Generated|Saved):\s*(.+)$/i);
      if (fileMatch) {
        const filename = fileMatch[2].trim();
        files.push({
          name: filename,
          path: filename,
          size: Math.floor(Math.random() * 10000) + 1000, // Mock size
          created: new Date(execution.startTime.getTime() + (index * 100)),
          preview: this.getFilePreview(filename, execution.output.slice(index + 1, index + 6))
        });
      }
    });
    
    return files;
  });

  private readonly insights = computed(() => {
    const execution = this.currentExecution();
    if (!execution) return [];
    
    const insights: string[] = [];
    
    // Generate insights based on output analysis
    const errorCount = this.getErrorCount();
    const warningCount = this.getWarningCount();
    const duration = this.getDurationMs();
    
    if (errorCount === 0 && execution.status === 'success') {
      insights.push('✅ Execution completed successfully with no errors');
    }
    
    if (warningCount > 0) {
      insights.push(`⚠️ ${warningCount} warnings found - review recommended`);
    }
    
    if (duration > 30000) {
      insights.push('⏱️ Long execution time - consider optimization');
    }
    
    if (this.outputFiles().length > 0) {
      insights.push(`📁 ${this.outputFiles().length} files generated`);
    }
    
    return insights;
  });

  constructor() {
    // Auto-scroll effect
    effect(() => {
      if (this.autoScroll() && this.isStreaming()) {
        setTimeout(() => this.scrollToBottom(), 100);
      }
    });
  }

  // Header methods
  getHeaderTitle(): string {
    const execution = this.currentExecution();
    if (!execution) return 'Results';
    
    return `${execution.action} - ${execution.project}`;
  }

  isLive(): boolean {
    const execution = this.currentExecution();
    return execution?.status === 'running' || false;
  }

  hasOutput(): boolean {
    return this.outputLines().length > 0;
  }

  // Output formatting
  private detectLineType(line: string): 'error' | 'warning' | 'success' | 'info' | 'normal' {
    const lower = line.toLowerCase();
    
    if (lower.includes('error') || lower.includes('fail') || lower.includes('❌')) {
      return 'error';
    }
    
    if (lower.includes('warning') || lower.includes('warn') || lower.includes('⚠️')) {
      return 'warning';
    }
    
    if (lower.includes('success') || lower.includes('pass') || lower.includes('✅') || lower.includes('completed')) {
      return 'success';
    }
    
    if (lower.includes('info') || lower.includes('note') || lower.includes('ℹ️')) {
      return 'info';
    }
    
    return 'normal';
  }

  getLineClass(line: any): string {
    const baseClass = 'output-line';
    return line.type === 'normal' ? baseClass : `${baseClass} ${line.type}`;
  }

  formatOutputLine(content: string): string {
    // Basic HTML formatting for output
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code class="bg-vscode-input-background px-1 rounded">$1</code>')
      .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" class="text-vscode-info underline">$1</a>');
  }

  formatTimestamp(timestamp: Date): string {
    return timestamp.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
  }

  // File methods
  getFileIcon(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    
    const iconMap: Record<string, string> = {
      'js': '📄',
      'ts': '📘',
      'json': '⚙️',
      'html': '🌐',
      'css': '🎨',
      'scss': '🎨',
      'md': '📝',
      'txt': '📄',
      'log': '📋',
      'xml': '📄',
      'yaml': '📄',
      'yml': '📄'
    };
    
    return iconMap[ext || ''] || '📄';
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  getFilePreview(filename: string, outputLines: string[]): string {
    // Generate preview from subsequent output lines
    const preview = outputLines
      .filter(line => line.trim().length > 0)
      .slice(0, 3)
      .join('\n');
    
    return preview || 'No preview available';
  }

  // Summary methods
  getStatusClass(status: string | undefined): string {
    switch (status) {
      case 'success':
        return 'text-vscode-success';
      case 'error':
        return 'text-vscode-error';
      case 'running':
        return 'text-vscode-progress';
      case 'cancelled':
        return 'text-vscode-warning';
      default:
        return 'text-vscode-foreground';
    }
  }

  getDuration(): string {
    const execution = this.currentExecution();
    if (!execution) return '0s';
    
    const duration = this.getDurationMs();
    const seconds = Math.floor(duration / 1000);
    const minutes = Math.floor(seconds / 60);
    
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    
    return `${seconds}s`;
  }

  private getDurationMs(): number {
    const execution = this.currentExecution();
    if (!execution) return 0;
    
    const endTime = execution.endTime || new Date();
    return endTime.getTime() - execution.startTime.getTime();
  }

  getErrorCount(): number {
    return this.outputLines().filter(line => line.type === 'error').length;
  }

  getWarningCount(): number {
    return this.outputLines().filter(line => line.type === 'warning').length;
  }

  // Action methods
  clearOutput(): void {
    this.outputCleared.emit();
  }

  downloadOutput(): void {
    const execution = this.currentExecution();
    if (!execution) return;
    
    const content = execution.output.join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `${execution.action}-${execution.project}-${Date.now()}.txt`;
    a.click();
    
    URL.revokeObjectURL(url);
  }

  toggleAutoScroll(): void {
    this.autoScroll.update(value => !value);
  }

  openFile(file: any): void {
    this.fileOpened.emit({ name: file.name, path: file.path });
  }

  downloadFile(file: any): void {
    this.fileDownloaded.emit({ name: file.name, content: file.preview });
  }

  // Scroll handling
  onScroll(event: Event): void {
    const target = event.target as HTMLElement;
    this.lastScrollTop.set(target.scrollTop);
    
    // Disable auto-scroll if user scrolls up
    const isAtBottom = target.scrollTop + target.clientHeight >= target.scrollHeight - 10;
    if (!isAtBottom && this.autoScroll()) {
      this.autoScroll.set(false);
    }
  }

  private scrollToBottom(): void {
    const containers = document.querySelectorAll('[data-component="results-viewer"] .overflow-y-auto');
    containers.forEach(container => {
      container.scrollTop = container.scrollHeight;
    });
  }
}
