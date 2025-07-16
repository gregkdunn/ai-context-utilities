import * as vscode from 'vscode';
import { ProjectDetector } from '../utils/projectDetector';
import { CommandRunner } from '../utils/shellRunner';
import { FileManager } from '../utils/fileManager';
import { StatusTracker } from '../utils/statusTracker';
import { CommandCoordinator } from '../utils/commandCoordinator';
import { WebviewMessage, WebviewState, ActionButton, CommandOptions, StreamingMessage } from '../types';

export class WebviewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'aiDebugUtilities';
    private _view?: vscode.WebviewView;
    private _state: WebviewState;

    constructor(
        private readonly _extensionUri: vscode.Uri,
        private readonly projectDetector: ProjectDetector,
        private readonly commandRunner: CommandRunner,
        private readonly fileManager: FileManager,
        private readonly statusTracker: StatusTracker,
        private readonly commandCoordinator: CommandCoordinator
    ) {
        this._state = {
            projects: [],
            actions: this.initializeActions(),
            outputFiles: {},
            isStreaming: false,
            currentOutput: ''
        };

        // Initialize projects (but don't await in constructor)
        this.initializeProjects();

        // Watch for file changes
        this.fileManager.watchFiles((type, path) => {
            this.updateOutputFile(type, path);
        });

        // Set up status tracking event handlers
        this.setupStatusTracking();
        
        // Set up streaming event handlers
        this.setupStreamingHandlers();
    }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                this._extensionUri
            ]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        // Handle messages from webview
        webviewView.webview.onDidReceiveMessage(async (message: WebviewMessage) => {
            await this.handleMessage(message);
        });

        // Send initial state
        this.updateWebview();
    }

    public show() {
        if (this._view) {
            this._view.show?.(true);
        }
    }

    public async runCommand(action: string, options: { project?: string } & CommandOptions) {
        const actionButton = this._state.actions[action];
        if (!actionButton) {
            return;
        }

        try {
            const project = options.project || this._state.currentProject;
            
            // Remove project from options to avoid passing it twice
            const { project: _, ...cleanOptions } = options;

            // Start streaming mode
            this._state.isStreaming = true;
            this._state.currentAction = action;
            this._state.currentOutput = '';
            this.updateWebview();

            let args: string[] = [];
            let commandOptions = {
                project,
                commandOptions: cleanOptions,
                cwd: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath
            };

            // Prepare command arguments based on action type
            switch (action) {
                case 'aiDebug':
                    if (!project) {
                        throw new Error('No project selected');
                    }
                    // Use the existing aiDebug implementation through command coordinator
                    args = [project];
                    break;

                case 'nxTest':
                    if (!project) {
                        throw new Error('No project selected');
                    }
                    args = [project];
                    if (cleanOptions.quick) args.push('--quick');
                    if (cleanOptions.focus) args.push(`--focus=${cleanOptions.focus}`);
                    break;

                case 'gitDiff':
                    args = [];
                    if (cleanOptions.noDiff) args.push('--no-diff');
                    break;

                case 'prepareToPush':
                    if (!project) {
                        throw new Error('No project selected');
                    }
                    args = [project];
                    break;

                default:
                    throw new Error(`Unknown action: ${action}`);
            }

            // Execute command through coordinator with streaming
            const result = await this.commandCoordinator.executeCommand(
                action as any,
                args,
                commandOptions
            );

            // Update last run info
            this._state.lastRun = {
                action,
                timestamp: new Date(),
                success: result.success
            };

        } catch (error) {
            vscode.window.showErrorMessage(`${action} failed: ${error}`);
        } finally {
            // End streaming mode
            this._state.isStreaming = false;
            this._state.currentAction = undefined;
            this.updateWebview();
        }
    }

    private async handleMessage(message: WebviewMessage) {
        switch (message.command) {
            case 'runCommand':
                if (message.data.action) {
                    const options = {
                        ...message.data.options,
                        project: message.data.project
                    };
                    await this.runCommand(message.data.action, options);
                }
                break;

            case 'getStatus':
                this.updateWebview();
                break;

            case 'openFile':
                if (message.data.filePath) {
                    await this.fileManager.openFile(message.data.filePath);
                }
                break;

            case 'getProjects':
                await this.initializeProjects();
                this.updateWebview();
                break;

            case 'setProject':
            if (message.data.project) {
            this._state.currentProject = message.data.project;
            this.updateWebview();
            }
            break;

            case 'cancelCommand':
                if (message.data.action) {
                    // Find and cancel the running command
                    const runningCommands = this.statusTracker.getRunningCommands();
                    const commandToCancel = runningCommands.find(cmd => cmd.command === message.data.action);
                    if (commandToCancel) {
                        this.commandCoordinator.cancelCommand(commandToCancel.id);
                    }
                }
                break;

            case 'clearOutput':
                this._state.currentOutput = '';
                this.updateWebview();
                break;
        }
    }

    private async initializeProjects() {
        try {
            this._state.projects = await this.projectDetector.getProjects();
            
            // Auto-detect current project if none selected
            if (!this._state.currentProject && this._state.projects.length > 0) {
                const currentProject = await this.projectDetector.detectCurrentProject();
                this._state.currentProject = currentProject || this._state.projects[0].name;
            }
        } catch (error) {
            console.error('Failed to initialize projects:', error);
        }
    }

    private initializeActions(): Record<string, ActionButton> {
        // Get initial action states from status tracker
        return this.statusTracker.toActionButtons();
    }

    private setupStatusTracking(): void {
        // Listen for status changes and update action buttons
        this.statusTracker.on('status_change', (event) => {
            this._state.actions = this.statusTracker.toActionButtons();
            this.updateWebview();
        });

        // Listen for history updates
        this.statusTracker.on('history_updated', (entry) => {
            // Could show notifications or update UI
            this.updateWebview();
        });
    }

    private setupStreamingHandlers(): void {
        // Listen for streaming messages from command coordinator
        this.commandCoordinator.on('streaming_message', (message: StreamingMessage) => {
            this.handleStreamingMessage(message);
        });

        // Listen for queue updates
        this.commandCoordinator.on('queue_update', (data) => {
            // Could update UI to show queue status
            this.updateWebview();
        });
    }

    private handleStreamingMessage(message: StreamingMessage): void {
        switch (message.type) {
            case 'output':
                if (message.data.text) {
                    this._state.currentOutput += message.data.text;
                }
                break;

            case 'error':
                if (message.data.text) {
                    this._state.currentOutput += `ERROR: ${message.data.text}`;
                }
                break;

            case 'progress':
                // Progress is handled by status tracker
                break;

            case 'status':
                // Status updates are handled by status tracker
                break;

            case 'complete':
                // Command completion is handled by status tracker
                break;
        }

        // Send streaming update to webview
        if (this._view) {
            this._view.webview.postMessage({
                command: 'streamingUpdate',
                message
            });
        }
    }



    private async updateOutputFile(type: string, path: string) {
        try {
            const content = await this.fileManager.getFileContent(type as any);
            if (content) {
                this._state.outputFiles[type] = content;
                this.updateWebview();
            }
        } catch (error) {
            console.error(`Failed to update output file ${type}:`, error);
        }
    }

    private updateWebview() {
        if (this._view) {
            this._view.webview.postMessage({
                command: 'updateState',
                state: this._state
            });
        }
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'out', 'webview', 'main.js'));
        const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'out', 'webview', 'styles.css'));

        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <link href="${styleUri}" rel="stylesheet">
                <title>AI Debug Utilities</title>
            </head>
            <body>
                <div id="app">
                    <div class="header">
                        <h2>🤖 AI Debug Assistant</h2>
                    </div>
                    
                    <div class="project-selector">
                        <label for="project-select">Project:</label>
                        <select id="project-select">
                            <option value="">Select a project...</option>
                        </select>
                    </div>

                    <div class="actions">
                        <div class="action-buttons">
                            <!-- Action buttons will be populated by JavaScript -->
                        </div>
                    </div>

                    <!-- Real-time output section -->
                    <div class="streaming-output" id="streaming-section" style="display: none;">
                        <div class="output-header">
                            <h3>🔄 Live Output</h3>
                            <div class="output-controls">
                                <button id="cancel-command" class="cancel-button">❌ Cancel</button>
                                <button id="clear-output" class="clear-button">🗑️ Clear</button>
                            </div>
                        </div>
                        <div class="progress-container">
                            <div class="progress-bar">
                                <div id="progress-fill" class="progress-fill"></div>
                            </div>
                            <div id="progress-text" class="progress-text">Initializing...</div>
                        </div>
                        <div class="live-output" id="live-output">
                            <!-- Real-time output will appear here -->
                        </div>
                    </div>

                    <!-- Status tracking section -->
                    <div class="status-section">
                        <div class="status-summary">
                            <span id="status-indicator" class="status-idle">⚪ Ready</span>
                            <span id="queue-status" style="display: none;">Queue: 0</span>
                        </div>
                    </div>

                    <div class="results">
                        <div class="tabs">
                            <button class="tab-button active" data-tab="output">Output</button>
                            <button class="tab-button" data-tab="files">Files</button>
                            <button class="tab-button" data-tab="help">Help</button>
                        </div>
                        
                        <div class="tab-content">
                            <div id="output-tab" class="tab-pane active">
                                <div id="output-content">
                                    <p>Run a command to see results here...</p>
                                </div>
                            </div>
                            
                            <div id="files-tab" class="tab-pane">
                                <div id="files-content">
                                    <!-- Output files will be listed here -->
                                </div>
                            </div>
                            
                            <div id="help-tab" class="tab-pane">
                                <div class="help-content">
                                    <h3>AI Debug Utilities</h3>
                                    <p>This extension provides AI-optimized debugging tools for Angular NX projects with advanced status tracking and real-time streaming.</p>
                                    
                                    <h4>Commands:</h4>
                                    <ul>
                                        <li><strong>AI Debug Analysis:</strong> Complete workflow with test analysis</li>
                                        <li><strong>Run Tests:</strong> Execute Jest tests with AI-optimized output</li>
                                        <li><strong>Analyze Changes:</strong> Smart git diff analysis</li>
                                        <li><strong>Prepare to Push:</strong> Lint and format code</li>
                                    </ul>
                                    
                                    <h4>Status Tracking Features:</h4>
                                    <ul>
                                        <li><strong>Real-time Progress:</strong> See command progress with visual indicators</li>
                                        <li><strong>Command History:</strong> Track execution history and success rates</li>
                                        <li><strong>Concurrent Execution:</strong> Run multiple commands simultaneously</li>
                                        <li><strong>Queue Management:</strong> Commands are queued when at capacity</li>
                                        <li><strong>Status Bar Integration:</strong> See active commands in VS Code status bar</li>
                                        <li><strong>Cancellation Support:</strong> Stop long-running operations anytime</li>
                                    </ul>
                                    
                                    <h4>Streaming Features:</h4>
                                    <ul>
                                        <li><strong>Live Output:</strong> See command output in real-time</li>
                                        <li><strong>Progress Tracking:</strong> Visual progress bars with status messages</li>
                                        <li><strong>Error Highlighting:</strong> Immediate feedback on errors</li>
                                        <li><strong>Output Management:</strong> Clear output, cancel commands</li>
                                    </ul>
                                    
                                    <h4>Tips:</h4>
                                    <ul>
                                        <li>Select a project before running commands</li>
                                        <li>Use Ctrl+Shift+D to open this panel</li>
                                        <li>Watch the live output for real-time feedback</li>
                                        <li>Cancel commands anytime if they take too long</li>
                                        <li>Check status bar for active command count</li>
                                        <li>Output files are saved to your configured directory</li>
                                        <li>Click on file names to open them in the editor</li>
                                        <li>Multiple commands can run concurrently (up to 3 by default)</li>
                                        <li>Commands are queued when hitting the concurrent limit</li>
                                    </ul>
                                    
                                    <h4>Status Indicators:</h4>
                                    <ul>
                                        <li><strong>⚪ Ready:</strong> No commands running</li>
                                        <li><strong>🔄 Running:</strong> Commands actively executing</li>
                                        <li><strong>✅ Success:</strong> Last command completed successfully</li>
                                        <li><strong>❌ Error:</strong> Last command failed</li>
                                        <li><strong>🟡 Queued:</strong> Commands waiting to execute</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="footer">
                        <button id="copy-for-ai" class="secondary-button">📎 Copy for AI</button>
                        <button id="open-output-dir" class="secondary-button">📁 Open Output Dir</button>
                    </div>
                </div>

                <script src="${scriptUri}"></script>
            </body>
            </html>`;
    }
}">
                    <div class="header">
                        <h2>🤖 AI Debug Assistant</h2>
                    </div>
                    
                    <div class="project-selector">
                        <label for="project-select">Project:</label>
                        <select id="project-select">
                            <option value="">Select a project...</option>
                        </select>
                    </div>

                    <div class="actions">
                        <div class="action-buttons">
                            <!-- Action buttons will be populated by JavaScript -->
                        </div>
                    </div>

                    <div class="results">
                        <div class="tabs">
                            <button class="tab-button active" data-tab="output">Output</button>
                            <button class="tab-button" data-tab="files">Files</button>
                            <button class="tab-button" data-tab="help">Help</button>
                        </div>
                        
                        <div class="tab-content">
                            <div id="output-tab" class="tab-pane active">
                                <div id="output-content">
                                    <p>Run a command to see results here...</p>
                                </div>
                            </div>
                            
                            <div id="files-tab" class="tab-pane">
                                <div id="files-content">
                                    <!-- Output files will be listed here -->
                                </div>
                            </div>
                            
                            <div id="help-tab" class="tab-pane">
                                <div class="help-content">
                                    <h3>AI Debug Utilities</h3>
                                    <p>This extension provides AI-optimized debugging tools for Angular NX projects.</p>
                                    
                                    <h4>Commands:</h4>
                                    <ul>
                                        <li><strong>AI Debug Analysis:</strong> Complete workflow with test analysis</li>
                                        <li><strong>Run Tests:</strong> Execute Jest tests with AI-optimized output</li>
                                        <li><strong>Analyze Changes:</strong> Smart git diff analysis</li>
                                        <li><strong>Prepare to Push:</strong> Lint and format code</li>
                                    </ul>
                                    
                                    <h4>Tips:</h4>
                                    <ul>
                                        <li>Select a project before running commands</li>
                                        <li>Use Ctrl+Shift+D to open this panel</li>
                                        <li>Output files are saved to your configured directory</li>
                                        <li>Click on file names to open them in the editor</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="footer">
                        <button id="copy-for-ai" class="secondary-button">📎 Copy for AI</button>
                        <button id="open-output-dir" class="secondary-button">📁 Open Output Dir</button>
                    </div>
                </div>

                <script src="${scriptUri}"></script>
            </body>
            </html>`;
    }
}
