"use strict";
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CollaborationPanelComponent = void 0;
const core_1 = require("@angular/core");
const common_1 = require("@angular/common");
const forms_1 = require("@angular/forms");
const webview_service_1 = require("../../services/webview.service");
/**
 * CollaborationPanelComponent - Phase 4.1 Real-time Collaboration UI
 * Provides interface for creating, joining, and managing collaboration sessions
 */
let CollaborationPanelComponent = (() => {
    let _classDecorators = [(0, core_1.Component)({
            selector: 'app-collaboration-panel',
            standalone: true,
            imports: [common_1.CommonModule, forms_1.FormsModule],
            changeDetection: core_1.ChangeDetectionStrategy.OnPush,
            template: `
    <div class="collaboration-panel bg-vscode-editor-background text-vscode-editor-foreground p-4">
      <!-- Header -->
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-semibold flex items-center">
          <span class="mr-2">🤝</span>
          Collaboration
        </h2>
        <button 
          (click)="showCreateSession.set(!showCreateSession())"
          class="px-3 py-1 bg-vscode-button-background hover:bg-vscode-button-hoverBackground 
                 text-vscode-button-foreground rounded text-sm transition-colors"
          [class.bg-vscode-button-hoverBackground]="showCreateSession()">
          {{ showCreateSession() ? 'Cancel' : 'New Session' }}
        </button>
      </div>

      <!-- Create Session Form -->
      @if (showCreateSession()) {
        <div class="mb-4 p-3 border border-vscode-widget-border rounded">
          <h3 class="font-medium mb-2">Create Collaboration Session</h3>
          <form (ngSubmit)="createSession()" class="space-y-3">
            <div>
              <label class="block text-sm font-medium mb-1">Session Name</label>
              <input 
                type="text" 
                [(ngModel)]="newSession.name" 
                name="sessionName"
                class="w-full px-3 py-2 bg-vscode-input-background text-vscode-input-foreground 
                       border border-vscode-input-border rounded text-sm"
                placeholder="Enter session name"
                required>
            </div>
            <div class="flex space-x-2">
              <button 
                type="submit" 
                [disabled]="!newSession.name.trim()"
                class="px-4 py-2 bg-vscode-button-background hover:bg-vscode-button-hoverBackground 
                       text-vscode-button-foreground rounded text-sm transition-colors
                       disabled:opacity-50 disabled:cursor-not-allowed">
                Create Session
              </button>
              <button 
                type="button" 
                (click)="showCreateSession.set(false)"
                class="px-4 py-2 bg-vscode-button-secondaryBackground hover:bg-vscode-button-secondaryHoverBackground 
                       text-vscode-button-secondaryForeground rounded text-sm transition-colors">
                Cancel
              </button>
            </div>
          </form>
        </div>
      }

      <!-- Join Session -->
      <div class="mb-4 p-3 border border-vscode-widget-border rounded">
        <h3 class="font-medium mb-2">Join Session</h3>
        <div class="flex space-x-2">
          <input 
            type="text" 
            [(ngModel)]="joinSessionId" 
            placeholder="Enter session ID"
            class="flex-1 px-3 py-2 bg-vscode-input-background text-vscode-input-foreground 
                   border border-vscode-input-border rounded text-sm">
          <button 
            (click)="joinSession()"
            [disabled]="!joinSessionId.trim()"
            class="px-4 py-2 bg-vscode-button-background hover:bg-vscode-button-hoverBackground 
                   text-vscode-button-foreground rounded text-sm transition-colors
                   disabled:opacity-50 disabled:cursor-not-allowed">
            Join
          </button>
        </div>
      </div>

      <!-- AI Insights Panel -->
      <div class="mb-4 p-3 border border-vscode-widget-border rounded">
        <h3 class="font-medium mb-2 flex items-center">
          <span class="mr-2">🤖</span>
          AI Insights
        </h3>
        
        <!-- Natural Language Query -->
        <div class="mb-3">
          <div class="flex space-x-2">
            <input 
              type="text" 
              [(ngModel)]="aiQuery" 
              placeholder="Ask me anything about your debugging workflow..."
              class="flex-1 px-3 py-2 bg-vscode-input-background text-vscode-input-foreground 
                     border border-vscode-input-border rounded text-sm"
              (keyup.enter)="processAIQuery()">
            <button 
              (click)="processAIQuery()"
              [disabled]="!aiQuery.trim() || isProcessingQuery()"
              class="px-4 py-2 bg-vscode-button-background hover:bg-vscode-button-hoverBackground 
                     text-vscode-button-foreground rounded text-sm transition-colors
                     disabled:opacity-50 disabled:cursor-not-allowed">
              @if (isProcessingQuery()) {
                <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
              } @else {
                Ask
              }
            </button>
          </div>
        </div>

        <!-- AI Response -->
        @if (aiResponse()) {
          <div class="mb-3 p-3 bg-vscode-textCodeBlock-background rounded">
            <p class="text-sm mb-2">{{ aiResponse()?.response }}</p>
            @if (aiResponse()?.suggestedActions?.length > 0) {
              <div class="space-y-1">
                <p class="text-xs font-medium text-vscode-descriptionForeground">Suggested Actions:</p>
                @for (action of aiResponse()?.suggestedActions; track action.id) {
                  <button 
                    (click)="executeAIAction(action)"
                    class="block w-full text-left px-2 py-1 text-xs bg-vscode-button-secondaryBackground 
                           hover:bg-vscode-button-secondaryHoverBackground rounded">
                    <span class="font-medium">{{ action.title }}</span>
                    <span class="text-vscode-descriptionForeground ml-2">{{ action.description }}</span>
                  </button>
                }
              </div>
            }
          </div>
        }

        <!-- Command Suggestions -->
        @if (commandSuggestions().length > 0) {
          <div class="mb-3">
            <p class="text-xs font-medium text-vscode-descriptionForeground mb-2">Smart Suggestions:</p>
            <div class="space-y-1">
              @for (suggestion of commandSuggestions(); track suggestion.command) {
                <div class="flex items-center justify-between p-2 bg-vscode-textCodeBlock-background rounded">
                  <div class="flex-1">
                    <div class="text-sm font-medium">{{ suggestion.command }}</div>
                    <div class="text-xs text-vscode-descriptionForeground">{{ suggestion.reason }}</div>
                  </div>
                  <div class="flex items-center space-x-2">
                    <div class="text-xs">
                      <span class="text-vscode-descriptionForeground">Confidence:</span>
                      <span class="font-medium">{{ (suggestion.confidence * 100).toFixed(0) }}%</span>
                    </div>
                    <button 
                      (click)="executeSuggestion(suggestion)"
                      class="px-2 py-1 bg-vscode-button-background hover:bg-vscode-button-hoverBackground 
                             text-vscode-button-foreground rounded text-xs">
                      Run
                    </button>
                  </div>
                </div>
              }
            </div>
          </div>
        }

        <!-- Demo Insights -->
        <div class="space-y-2">
          <div class="p-2 border-l-4 border-l-orange-500 bg-vscode-textCodeBlock-background rounded">
            <div class="flex items-center mb-1">
              <span class="mr-2">⚡</span>
              <span class="font-medium text-sm">Performance Issue Detected</span>
              <span class="ml-2 px-2 py-0.5 rounded text-xs bg-orange-600 text-white">medium</span>
            </div>
            <p class="text-sm text-vscode-descriptionForeground mb-2">
              Command execution is 40% slower than average. Consider optimizing test selection.
            </p>
            <button class="px-2 py-1 text-xs bg-vscode-button-secondaryBackground hover:bg-vscode-button-secondaryHoverBackground rounded">
              Optimize Tests
            </button>
          </div>
          
          <div class="p-2 border-l-4 border-l-blue-500 bg-vscode-textCodeBlock-background rounded">
            <div class="flex items-center mb-1">
              <span class="mr-2">💡</span>
              <span class="font-medium text-sm">Smart Suggestion</span>
              <span class="ml-2 px-2 py-0.5 rounded text-xs bg-blue-600 text-white">low</span>
            </div>
            <p class="text-sm text-vscode-descriptionForeground mb-2">
              Based on your patterns, consider running prepareToPush after making changes.
            </p>
            <button class="px-2 py-1 text-xs bg-vscode-button-secondaryBackground hover:bg-vscode-button-secondaryHoverBackground rounded">
              Set up Auto-run
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
            styles: [`
    .collaboration-panel {
      height: 100%;
      overflow-y: auto;
    }
    
    .collaboration-panel::-webkit-scrollbar {
      width: 6px;
    }
    
    .collaboration-panel::-webkit-scrollbar-track {
      background: var(--vscode-scrollbarSlider-background);
    }
    
    .collaboration-panel::-webkit-scrollbar-thumb {
      background: var(--vscode-scrollbarSlider-activeBackground);
      border-radius: 3px;
    }
  `]
        })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var CollaborationPanelComponent = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            CollaborationPanelComponent = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        webviewService = (0, core_1.inject)(webview_service_1.WebviewService);
        // Signals for reactive state management
        showCreateSession = (0, core_1.signal)(false);
        joinSessionId = (0, core_1.signal)('');
        aiQuery = (0, core_1.signal)('');
        aiResponse = (0, core_1.signal)(null);
        commandSuggestions = (0, core_1.signal)([]);
        isProcessingQuery = (0, core_1.signal)(false);
        // New session form data
        newSession = {
            name: '',
            description: '',
            maxParticipants: 5,
            duration: 240,
            permissions: {
                canExecuteCommands: true,
                canEditFiles: false,
                canAddAnnotations: true,
                canInviteOthers: true
            },
            autoShareCommands: true
        };
        ngOnInit() {
            this.loadCommandSuggestions();
            // Set up periodic refresh
            setInterval(() => {
                this.loadCommandSuggestions();
            }, 10000);
        }
        ngOnDestroy() {
            // Cleanup handled automatically
        }
        async createSession() {
            if (!this.newSession.name.trim())
                return;
            try {
                await this.webviewService.postMessage('createCollaborationSession', this.newSession);
                // Reset form
                this.newSession.name = '';
                this.newSession.description = '';
                this.showCreateSession.set(false);
                console.log('Collaboration session created successfully');
            }
            catch (error) {
                console.error('Failed to create session:', error);
            }
        }
        async joinSession() {
            const sessionId = this.joinSessionId().trim();
            if (!sessionId)
                return;
            try {
                await this.webviewService.postMessage('joinCollaborationSession', { sessionId });
                this.joinSessionId.set('');
                console.log('Joined collaboration session successfully');
            }
            catch (error) {
                console.error('Failed to join session:', error);
            }
        }
        async processAIQuery() {
            const query = this.aiQuery().trim();
            if (!query)
                return;
            this.isProcessingQuery.set(true);
            try {
                // Simulate AI processing
                await new Promise(resolve => setTimeout(resolve, 1500));
                const mockResponse = {
                    response: this.generateMockResponse(query),
                    suggestedActions: this.generateMockActions(query)
                };
                this.aiResponse.set(mockResponse);
                this.aiQuery.set('');
            }
            catch (error) {
                console.error('Failed to process AI query:', error);
                this.aiResponse.set({
                    response: 'Sorry, I encountered an error processing your query. Please try again.',
                    suggestedActions: []
                });
            }
            finally {
                this.isProcessingQuery.set(false);
            }
        }
        async executeAIAction(action) {
            try {
                await this.webviewService.postMessage('executeAIAction', { action });
                console.log('Executed AI action:', action.title);
            }
            catch (error) {
                console.error('Failed to execute AI action:', error);
            }
        }
        async executeSuggestion(suggestion) {
            try {
                await this.webviewService.postMessage('executeCommandSuggestion', { suggestion });
                console.log('Executed suggestion:', suggestion.command);
            }
            catch (error) {
                console.error('Failed to execute suggestion:', error);
            }
        }
        async loadCommandSuggestions() {
            // Mock suggestions for demo
            const mockSuggestions = [
                {
                    command: 'nxTest',
                    reason: 'Files changed in core module',
                    confidence: 0.85,
                    estimatedImpact: 'high'
                },
                {
                    command: 'gitDiff',
                    reason: 'Uncommitted changes detected',
                    confidence: 0.92,
                    estimatedImpact: 'medium'
                }
            ];
            this.commandSuggestions.set(mockSuggestions);
        }
        generateMockResponse(query) {
            const lowerQuery = query.toLowerCase();
            if (lowerQuery.includes('test')) {
                return 'I can see you\'re asking about tests. Your current test suite has a 94% pass rate with 3 failing tests in the user authentication module. The average test execution time is 2.3 seconds.';
            }
            if (lowerQuery.includes('performance')) {
                return 'Performance analysis shows your debugging workflow is 15% slower than optimal. The main bottleneck is in the test execution phase, taking an average of 45 seconds.';
            }
            if (lowerQuery.includes('error')) {
                return 'I\'ve identified 3 recurring error patterns in your recent sessions. The most frequent is "Module not found" errors, occurring 8 times in the last week.';
            }
            return 'I can help you analyze your debugging patterns, suggest workflow optimizations, and provide insights about your development process. What specific aspect would you like to explore?';
        }
        generateMockActions(query) {
            const lowerQuery = query.toLowerCase();
            if (lowerQuery.includes('test')) {
                return [
                    {
                        id: '1',
                        title: 'Run Failing Tests',
                        description: 'Execute only the 3 failing tests to debug issues'
                    },
                    {
                        id: '2',
                        title: 'Generate Test Report',
                        description: 'Create detailed analysis of test failures'
                    }
                ];
            }
            if (lowerQuery.includes('performance')) {
                return [
                    {
                        id: '3',
                        title: 'Optimize Test Selection',
                        description: 'Run focused tests to reduce execution time'
                    }
                ];
            }
            return [
                {
                    id: '4',
                    title: 'Analyze Patterns',
                    description: 'Generate comprehensive workflow analysis'
                }
            ];
        }
    };
    return CollaborationPanelComponent = _classThis;
})();
exports.CollaborationPanelComponent = CollaborationPanelComponent;
//# sourceMappingURL=collaboration-panel.component.js.map