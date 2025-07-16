// Mock VSCode API for unit tests
export const Uri = {
  file: jest.fn((path: string) => ({ fsPath: path })),
  joinPath: jest.fn((...paths: any[]) => ({ fsPath: paths.join('/') }))
};

export const workspace = {
  workspaceFolders: [
    { uri: { fsPath: '/test/workspace' } }
  ],
  getConfiguration: jest.fn(() => ({
    get: jest.fn((key: string) => {
      const config: Record<string, any> = {
        'outputDirectory': '.github/instructions/ai_utilities_context',
        'autoDetectProject': true,
        'showNotifications': true,
        'terminalIntegration': true
      };
      return config[key];
    })
  })),
  onDidChangeConfiguration: jest.fn(),
  createFileSystemWatcher: jest.fn(() => ({
    onDidChange: jest.fn(),
    onDidCreate: jest.fn(),
    dispose: jest.fn()
  })),
  openTextDocument: jest.fn(),
  fs: {
    readFile: jest.fn(),
    writeFile: jest.fn()
  }
};

// Create a mutable window object
const windowMock = {
  showInformationMessage: jest.fn(),
  showWarningMessage: jest.fn(),
  showErrorMessage: jest.fn(),
  activeTextEditor: null,
  terminals: [],
  createTerminal: jest.fn(() => ({
    name: 'Test Terminal',
    sendText: jest.fn()
  })),
  registerWebviewViewProvider: jest.fn(() => ({ dispose: jest.fn() })),
  showTextDocument: jest.fn()
};

export const window = windowMock;

export const commands = {
  registerCommand: jest.fn(() => ({ dispose: jest.fn() })),
  executeCommand: jest.fn()
};

export const env = {
  clipboard: {
    writeText: jest.fn()
  }
};

export const ExtensionContext = jest.fn();

export const WebviewView = jest.fn();

export const CancellationToken = jest.fn();

export const Disposable = jest.fn();

export const RelativePattern = jest.fn();

// Configuration namespace
export const ConfigurationTarget = {
  Global: 1,
  Workspace: 2,
  WorkspaceFolder: 3
};

// Event emitter mock
export class EventEmitter {
  private listeners: Record<string, Function[]> = {};

  on(event: string, listener: Function) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(listener);
  }

  fire(event: string, ...args: any[]) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(listener => listener(...args));
    }
  }
}

// Mock webview
export const createWebviewMock = () => ({
  html: '',
  options: {},
  postMessage: jest.fn(),
  onDidReceiveMessage: jest.fn(),
  asWebviewUri: jest.fn((uri: any) => uri)
});

export default {
  Uri,
  workspace,
  window,
  commands,
  env,
  ExtensionContext,
  WebviewView,
  CancellationToken,
  Disposable,
  RelativePattern,
  ConfigurationTarget,
  EventEmitter,
  createWebviewMock
};
