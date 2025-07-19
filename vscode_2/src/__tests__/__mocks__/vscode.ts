// Mock implementation of VSCode API for testing

export enum ExtensionMode {
  Production = 1,
  Development = 2,
  Test = 3
}

export enum ConfigurationTarget {
  Global = 1,
  Workspace = 2,
  WorkspaceFolder = 3
}

export class Uri {
  static file(path: string): Uri {
    return new Uri('file', '', path, '', '');
  }

  static parse(value: string): Uri {
    return new Uri('file', '', value, '', '');
  }

  static joinPath(base: Uri, ...pathSegments: string[]): Uri {
    const joinedPath = [base.path, ...pathSegments].join('/');
    return new Uri(base.scheme, base.authority, joinedPath, base.query, base.fragment);
  }

  constructor(
    public scheme: string,
    public authority: string,
    public path: string,
    public query: string,
    public fragment: string
  ) {}

  get fsPath(): string {
    return this.path;
  }

  toString(): string {
    return `${this.scheme}://${this.authority}${this.path}`;
  }
}

export const workspace = {
  workspaceFolders: [{ uri: Uri.file('/test/workspace') }],
  getConfiguration: jest.fn().mockReturnValue({
    get: jest.fn().mockReturnValue('main'),
    update: jest.fn()
  }),
  findFiles: jest.fn().mockResolvedValue([]),
  createFileSystemWatcher: jest.fn().mockReturnValue({
    onDidCreate: jest.fn(),
    onDidChange: jest.fn(),
    onDidDelete: jest.fn(),
    dispose: jest.fn()
  })
};

export const window = {
  showInformationMessage: jest.fn().mockResolvedValue(undefined),
  showWarningMessage: jest.fn().mockResolvedValue(undefined),
  showErrorMessage: jest.fn().mockResolvedValue(undefined),
  showQuickPick: jest.fn().mockResolvedValue(undefined),
  showInputBox: jest.fn().mockResolvedValue(undefined),
  registerWebviewViewProvider: jest.fn(),
  createOutputChannel: jest.fn().mockReturnValue({
    append: jest.fn(),
    appendLine: jest.fn(),
    clear: jest.fn(),
    show: jest.fn(),
    hide: jest.fn(),
    dispose: jest.fn()
  })
};

export const commands = {
  registerCommand: jest.fn(),
  executeCommand: jest.fn().mockResolvedValue(undefined)
};

export const languages = {
  registerCodeActionsProvider: jest.fn(),
  registerDocumentFormattingEditProvider: jest.fn()
};

export class Position {
  constructor(public line: number, public character: number) {}
}

export class Range {
  constructor(public start: Position, public end: Position) {}
}

export class Selection extends Range {
  constructor(start: Position, end: Position) {
    super(start, end);
  }
}

export class Disposable {
  static from(...disposables: { dispose(): any }[]): Disposable {
    return new Disposable(() => {
      disposables.forEach(d => d.dispose());
    });
  }

  constructor(private callOnDispose: () => any) {}

  dispose(): any {
    return this.callOnDispose();
  }
}

export const env = {
  clipboard: {
    readText: jest.fn().mockResolvedValue(''),
    writeText: jest.fn().mockResolvedValue(undefined)
  },
  openExternal: jest.fn().mockResolvedValue(true)
};

// WebView API mocks
export class WebviewPanel {
  constructor(
    public viewType: string,
    public title: string,
    public viewColumn: any,
    public options: any
  ) {}

  get webview() {
    return {
      html: '',
      postMessage: jest.fn(),
      onDidReceiveMessage: jest.fn()
    };
  }

  dispose = jest.fn();
  onDidDispose = jest.fn();
  onDidChangeViewState = jest.fn();
}

export const debug = {
  startDebugging: jest.fn().mockResolvedValue(true),
  registerDebugConfigurationProvider: jest.fn()
};

export const extensions = {
  getExtension: jest.fn().mockReturnValue({
    isActive: true,
    activate: jest.fn().mockResolvedValue(undefined),
    exports: {}
  })
};

// Additional mocks that might be needed
export const EventEmitter = jest.fn().mockImplementation(() => ({
  event: jest.fn(),
  fire: jest.fn(),
  dispose: jest.fn()
}));

export const CancellationTokenSource = jest.fn().mockImplementation(() => ({
  token: {
    isCancellationRequested: false,
    onCancellationRequested: jest.fn()
  },
  cancel: jest.fn(),
  dispose: jest.fn()
}));
