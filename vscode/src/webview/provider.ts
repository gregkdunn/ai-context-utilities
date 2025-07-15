import * as vscode from 'vscode';
import { ProjectDetector } from '../utils/projectDetector';
import { CommandRunner } from '../utils/shellRunner';
import { FileManager } from '../utils/fileManager';
import { WebviewMessage, WebviewState, ActionButton, CommandOptions } from '../types';

export class WebviewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'aiDebugUtilities';
    private _view?: vscode.WebviewView;
    private _state: WebviewState;

    constructor(
        private readonly _extensionUri: vscode.Uri,
        private readonly projectDetector: ProjectDetector,
        private readonly commandRunner: CommandRunner,
        private readonly fileManager: FileManager
    ) {
        this._state = {
            projects: [],
            actions: this.initializeActions(),
            outputFiles: {}
        };

        // Initialize projects
        this.initializeProjects();

        // Watch for file changes
        this.fileManager.watchFiles((type, path) => {
            this.updateOutputFile(type, path);
        });
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

        // Update action status to running
        this.updateActionStatus(action, 'running');

        try {
            let result;
            const project = options.project || this._state.currentProject;

            switch (action) {
                case 'aiDebug':
                    if (!project) {
                        throw new Error('No project selected');
                    }
                    result = await this.commandRunner.runAiDebug(project, options);
                    break;

                case 'nxTest':
                    if (!project) {
                        throw new Error('No project selected');
                    }
                    result = await this.commandRunner.runNxTest(project, options);
                    break;

                case 'gitDiff':
                    result = await this.commandRunner.runGitDiff(options);
                    break;

                case 'prepareToPush':
                    if (!project) {
                        throw new Error('No project selected');
                    }
                    result = await this.commandRunner.runPrepareToPush(project);
                    break;

                default:
                    throw new Error(`Unknown action: ${action}`);
            }

            // Update action status based on result
            this.updateActionStatus(action, result.success ? 'success' : 'error');
            this._state.lastRun = {
                action,
                timestamp: new Date(),
                success: result.success
            };

            // Show notification if enabled
            const config = vscode.workspace.getConfiguration('aiDebugUtilities');
            if (config.get('showNotifications')) {
                if (result.success) {
                    vscode.window.showInformationMessage(`${action} completed successfully`);
                } else {
                    vscode.window.showErrorMessage(`${action} failed: ${result.error || 'Unknown error'}`);
                }
            }

        } catch (error) {
            this.updateActionStatus(action, 'error');
            vscode.window.showErrorMessage(`${action} failed: ${error}`);
        }

        this.updateWebview();
    }

    private async handleMessage(message: WebviewMessage) {
        switch (message.command) {
            case 'runCommand':
                if (message.data.action) {
                    await this.runCommand(message.data.action, message.data.options || {});
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
        return {
            aiDebug: {
                id: 'aiDebug',
                label: 'AI Debug Analysis',
                icon: 'debug-alt',
                status: 'idle',
                enabled: true
            },
            nxTest: {
                id: 'nxTest',
                label: 'Run Tests',
                icon: 'beaker',
                status: 'idle',
                enabled: true
            },
            gitDiff: {
                id: 'gitDiff',
                label: 'Analyze Changes',
                icon: 'git-compare',
                status: 'idle',
                enabled: true
            },
            prepareToPush: {
                id: 'prepareToPush',
                label: 'Prepare to Push',
                icon: 'rocket',
                status: 'idle',
                enabled: true
            }
        };
    }

    private updateActionStatus(actionId: string, status: ActionButton['status']) {
        const action = this._state.actions[actionId];
        if (action) {
            action.status = status;
            action.lastRun = new Date();
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
