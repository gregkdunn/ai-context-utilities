import * as vscode from 'vscode';
import { ProjectDetector } from '../utils/projectDetector';
import { CommandRunner } from '../utils/shellRunner';
import { FileManager } from '../utils/fileManager';
import { StatusTracker } from '../utils/statusTracker';
import { WebviewMessage, StreamingMessage } from '../types';

export class WebviewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'aiDebugUtilities';
    
    private _view?: vscode.WebviewView;
    private _disposables: vscode.Disposable[] = [];

    constructor(
        private readonly _extensionUri: vscode.Uri,
        private readonly _projectDetector: ProjectDetector,
        private readonly _commandRunner: CommandRunner,
        private readonly _fileManager: FileManager,
        private readonly _statusTracker: StatusTracker
    ) {}

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        webviewView.webview.onDidReceiveMessage(
            async (data: WebviewMessage) => {
                // FIX: Properly handle async message processing
                try {
                    await this._handleMessage(data);
                } catch (error) {
                    console.error('Error handling webview message:', error);
                    this._postMessage({ 
                        type: 'error', 
                        data: { error: (error as Error).message } 
                    });
                }
            },
            undefined,
            this._disposables
        );

        // Set up file watcher
        try {
            this._fileManager.watchFiles((filePath: string, eventType: string) => {
                this._postMessage({ type: 'fileChanged', data: { filePath, eventType } });
            });
        } catch (error) {
            console.error('Error setting up file watcher:', error);
        }
    }

    // FIX: Make _handleMessage async and add proper error handling
    private async _handleMessage(data: WebviewMessage): Promise<void> {
        try {
            switch (data.command) {
                case 'runCommand':
                    await this._handleRunCommand(data.data);
                    break;
                case 'getProjects':
                    await this._handleGetProjects();
                    break;
                case 'openFile':
                    await this._handleOpenFile(data.data);
                    break;
                case 'clearOutput':
                    await this._handleClearOutput();
                    break;
                default:
                    console.warn('Unknown message command:', data.command);
            }
        } catch (error) {
            console.error(`Error handling command ${data.command}:`, error);
            this._postMessage({ 
                type: 'commandError', 
                data: { 
                    command: data.command, 
                    error: (error as Error).message 
                } 
            });
        }
    }

    private async _handleRunCommand(data: any) {
        const { action, project, options } = data;
        
        try {
            let result;
            
            switch (action) {
                case 'aiDebug':
                    result = await this._commandRunner.runAiDebug(project, options);
                    break;
                case 'nxTest':
                    result = await this._commandRunner.runNxTest(project, options);
                    break;
                case 'gitDiff':
                    result = await this._commandRunner.runGitDiff(options);
                    break;
                case 'prepareToPush':
                    result = await this._commandRunner.runPrepareToPush(project, options);
                    break;
                default:
                    throw new Error(`Unknown action: ${action}`);
            }
            
            this._postMessage({ 
                type: 'commandResult', 
                data: { action, result } 
            });
        } catch (error) {
            console.error(`Error executing command ${action}:`, error);
            this._postMessage({ 
                type: 'commandError', 
                data: { action, error: (error as Error).message } 
            });
        }
    }

    private async _handleGetProjects() {
        try {
            const projects = await this._projectDetector.getProjects();
            this._postMessage({ 
                type: 'projects', 
                data: { projects } 
            });
        } catch (error) {
            console.error('Error getting projects:', error);
            this._postMessage({ 
                type: 'error', 
                data: { error: (error as Error).message } 
            });
        }
    }

    private async _handleOpenFile(data: any) {
        const { filePath } = data;
        
        try {
            await this._fileManager.openFile(filePath);
            this._postMessage({ 
                type: 'fileOpened', 
                data: { filePath } 
            });
        } catch (error) {
            console.error(`Error opening file ${filePath}:`, error);
            this._postMessage({ 
                type: 'error', 
                data: { error: (error as Error).message } 
            });
        }
    }

    // FIX: Make _handleClearOutput async for consistency
    private async _handleClearOutput(): Promise<void> {
        try {
            // Clear output in status tracker or file manager
            this._statusTracker.clearHistory();
            this._postMessage({ 
                type: 'outputCleared', 
                data: {} 
            });
        } catch (error) {
            console.error('Error clearing output:', error);
            this._postMessage({ 
                type: 'error', 
                data: { error: (error as Error).message } 
            });
        }
    }

    // Public methods for external use
    public show(): void {
        if (this._view) {
            try {
                this._view.show();
            } catch (error) {
                console.error('Error showing webview:', error);
            }
        }
    }

    // FIX: Ensure runCommand is properly async
    public async runCommand(action: string, data: any): Promise<void> {
        try {
            await this._handleRunCommand({ action, ...data });
        } catch (error) {
            console.error(`Error running command ${action}:`, error);
            throw error;
        }
    }

    private _postMessage(message: any): void {
        if (this._view) {
            try {
                this._view.webview.postMessage(message);
            } catch (error) {
                console.error('Error posting message to webview:', error);
            }
        }
    }

    private _getHtmlForWebview(webview: vscode.Webview): string {
        const scriptUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'out', 'webview', 'main.js')
        );

        const styleUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'out', 'webview', 'styles.css')
        );

        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <link href="${styleUri}" rel="stylesheet">
            <title>AI Debug Utilities</title>
        </head>
        <body>
            <div id="root"></div>
            <script src="${scriptUri}"></script>
        </body>
        </html>`;
    }

    public setupStreamingListeners() {
        // Method for streaming integration - placeholder implementation
        // This method would set up listeners for streaming events
    }

    public dispose() {
        this._disposables.forEach(d => d.dispose());
    }
}