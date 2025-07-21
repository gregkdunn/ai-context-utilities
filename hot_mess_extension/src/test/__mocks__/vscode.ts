import { EventEmitter as NodeEventEmitter } from 'events';

// Mock VSCode API for testing
const mockStatusBarItem = {
    show: jest.fn(),
    hide: jest.fn(),
    dispose: jest.fn(),
    text: '',
    tooltip: '',
    command: '',
    alignment: 1,
    priority: 100
};

const mockWebview = {
    html: '',
    options: {},
    onDidReceiveMessage: jest.fn(),
    postMessage: jest.fn(),
    asWebviewUri: jest.fn().mockReturnValue({ toString: () => 'mock://uri' })
};

const mockWebviewView = {
    webview: mockWebview,
    show: jest.fn(),
    title: '',
    description: '',
    onDidDispose: jest.fn(),
    onDidChangeVisibility: jest.fn()
};

const mockDocument = {
    uri: { fsPath: '/mock/path' },
    getText: jest.fn().mockReturnValue('mock text'),
    save: jest.fn(),
    lineCount: 10
};

const mockTerminal = {
    sendText: jest.fn(),
    show: jest.fn(),
    hide: jest.fn(),
    dispose: jest.fn(),
    name: 'Mock Terminal'
};

export const StatusBarAlignment = {
    Left: 1,
    Right: 2
};

export const ViewColumn = {
    Active: -1,
    Beside: -2,
    One: 1,
    Two: 2,
    Three: 3
};

export const Uri = {
    file: jest.fn().mockReturnValue({ toString: () => 'mock://file' }),
    parse: jest.fn().mockReturnValue({ toString: () => 'mock://uri' }),
    joinPath: jest.fn().mockReturnValue({ toString: () => 'mock://joined' })
};

export const workspace = {
    workspaceFolders: [{ uri: { fsPath: '/test/workspace' } }],
    getConfiguration: jest.fn().mockReturnValue({
        get: jest.fn().mockReturnValue(true),
        update: jest.fn(),
        has: jest.fn().mockReturnValue(true),
        inspect: jest.fn()
    }),
    openTextDocument: jest.fn().mockResolvedValue(mockDocument),
    findFiles: jest.fn().mockResolvedValue([]),
    createFileSystemWatcher: jest.fn().mockReturnValue({
        onDidCreate: jest.fn(),
        onDidChange: jest.fn(),
        onDidDelete: jest.fn(),
        dispose: jest.fn()
    }),
    fs: {
        readFile: jest.fn(),
        writeFile: jest.fn(),
        stat: jest.fn(),
        readDirectory: jest.fn()
    }
};

export const window = {
    createStatusBarItem: jest.fn().mockReturnValue(mockStatusBarItem),
    registerWebviewViewProvider: jest.fn(),
    showInformationMessage: jest.fn(),
    showWarningMessage: jest.fn(),
    showErrorMessage: jest.fn(),
    showQuickPick: jest.fn(),
    showInputBox: jest.fn(),
    showTextDocument: jest.fn(),
    createOutputChannel: jest.fn().mockReturnValue({
        append: jest.fn(),
        appendLine: jest.fn(),
        show: jest.fn(),
        hide: jest.fn(),
        dispose: jest.fn()
    }),
    createTerminal: jest.fn().mockReturnValue(mockTerminal),
    terminals: [],
    activeTextEditor: null,
    visibleTextEditors: [],
    onDidChangeActiveTextEditor: jest.fn(),
    onDidChangeVisibleTextEditors: jest.fn()
};

export const commands = {
    registerCommand: jest.fn(),
    executeCommand: jest.fn(),
    getCommands: jest.fn().mockResolvedValue([])
};

export const extensions = {
    getExtension: jest.fn().mockReturnValue({
        isActive: true,
        exports: {
            getAPI: jest.fn().mockReturnValue({
                getRepository: jest.fn().mockReturnValue({
                    getCommits: jest.fn().mockResolvedValue([]),
                    getBranches: jest.fn().mockResolvedValue([]),
                    getDiff: jest.fn().mockResolvedValue('')
                })
            })
        }
    })
};

export const env = {
    clipboard: {
        readText: jest.fn(),
        writeText: jest.fn()
    },
    openExternal: jest.fn(),
    machineId: 'mock-machine-id',
    sessionId: 'mock-session-id'
};

export const languages = {
    createDiagnosticCollection: jest.fn(),
    registerCompletionItemProvider: jest.fn(),
    registerHoverProvider: jest.fn()
};

export const debug = {
    startDebugging: jest.fn(),
    stopDebugging: jest.fn(),
    onDidStartDebugSession: jest.fn(),
    onDidTerminateDebugSession: jest.fn()
};

export const tasks = {
    executeTask: jest.fn(),
    fetchTasks: jest.fn(),
    onDidStartTask: jest.fn(),
    onDidEndTask: jest.fn()
};

export const TreeItemCollapsibleState = {
    None: 0,
    Collapsed: 1,
    Expanded: 2
};

export const ConfigurationTarget = {
    Global: 1,
    Workspace: 2,
    WorkspaceFolder: 3
};

export const DiagnosticSeverity = {
    Error: 0,
    Warning: 1,
    Information: 2,
    Hint: 3
};

export const Range = class MockRange {
    constructor(
        public start: any,
        public end: any
    ) {}
};

export const Position = class MockPosition {
    constructor(
        public line: number,
        public character: number
    ) {}
};

export const Selection = class MockSelection extends Range {
    constructor(
        public anchor: any,
        public active: any
    ) {
        super(anchor, active);
    }
};

export const Location = class MockLocation {
    constructor(
        public uri: any,
        public range: any
    ) {}
};

export const Diagnostic = class MockDiagnostic {
    constructor(
        public range: any,
        public message: string,
        public severity?: any
    ) {}
};

export const EventEmitter = class MockEventEmitter<T> {
    private _event = new NodeEventEmitter();
    
    fire(data: T) {
        this._event.emit('event', data);
    }
    
    get event() {
        return (listener: (data: T) => void) => {
            this._event.on('event', listener);
            return { dispose: () => this._event.removeListener('event', listener) };
        };
    }
    
    dispose() {
        this._event.removeAllListeners();
    }
};

// Create a mock that can be used by individual tests
export const createMockWebviewView = () => ({
    webview: {
        html: '',
        options: {},
        onDidReceiveMessage: jest.fn(),
        postMessage: jest.fn(),
        asWebviewUri: jest.fn().mockReturnValue({ toString: () => 'mock://uri' })
    },
    show: jest.fn(),
    title: '',
    description: '',
    onDidDispose: jest.fn(),
    onDidChangeVisibility: jest.fn()
});

export const createMockContext = () => ({
    subscriptions: [],
    workspaceState: {
        get: jest.fn(),
        update: jest.fn(),
        keys: jest.fn().mockReturnValue([])
    },
    globalState: {
        get: jest.fn(),
        update: jest.fn(),
        keys: jest.fn().mockReturnValue([])
    },
    extensionUri: Uri.parse('mock://extension'),
    extensionPath: '/mock/extension/path',
    storagePath: '/mock/storage/path',
    globalStoragePath: '/mock/global/storage/path',
    logPath: '/mock/log/path',
    environmentVariableCollection: {
        persistent: true,
        replace: jest.fn(),
        append: jest.fn(),
        prepend: jest.fn(),
        get: jest.fn(),
        forEach: jest.fn(),
        delete: jest.fn(),
        clear: jest.fn()
    }
});

export default {
    StatusBarAlignment,
    ViewColumn,
    Uri,
    workspace,
    window,
    commands,
    extensions,
    env,
    languages,
    debug,
    tasks,
    TreeItemCollapsibleState,
    ConfigurationTarget,
    DiagnosticSeverity,
    Range,
    Position,
    Selection,
    Location,
    Diagnostic,
    EventEmitter,
    createMockWebviewView,
    createMockContext
};
