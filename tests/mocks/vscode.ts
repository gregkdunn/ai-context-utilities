// Mock VSCode API for testing

export class Position {
  line: number;
  character: number;
  
  constructor(line: number, character: number) {
    this.line = line;
    this.character = character;
  }
}

export class Range {
  start: Position;
  end: Position;
  
  constructor(startLine: number, startCharacter: number, endLine: number, endCharacter: number);
  constructor(start: Position, end: Position);
  constructor(startOrStart: number | Position, endOrCharacter?: number | Position, endLine?: number, endCharacter?: number) {
    if (typeof startOrStart === 'number') {
      this.start = new Position(startOrStart, endOrCharacter as number);
      this.end = new Position(endLine!, endCharacter!);
    } else {
      this.start = startOrStart;
      this.end = endOrCharacter as Position;
    }
  }
}

export class Selection extends Range {
  active: Position;
  anchor: Position;
  
  constructor(anchorLine: number, anchorCharacter: number, activeLine: number, activeCharacter: number);
  constructor(anchor: Position, active: Position);
  constructor(anchorOrLine: number | Position, activeOrCharacter?: number | Position, activeLine?: number, activeCharacter?: number) {
    if (typeof anchorOrLine === 'number') {
      super(anchorOrLine, activeOrCharacter as number, activeLine!, activeCharacter!);
      this.anchor = new Position(anchorOrLine, activeOrCharacter as number);
      this.active = new Position(activeLine!, activeCharacter!);
    } else {
      super(anchorOrLine, activeOrCharacter as Position);
      this.anchor = anchorOrLine;
      this.active = activeOrCharacter as Position;
    }
  }
}

export const workspace = {
  workspaceFolders: [
    {
      uri: {
        fsPath: '/mock/workspace/path'
      }
    }
  ],
  getWorkspaceFolder: jest.fn((uri: any) => ({
    uri: { fsPath: '/mock/workspace/path' },
    name: 'mock-workspace',
    index: 0
  })),
  onDidSaveTextDocument: jest.fn(),
  getConfiguration: jest.fn(() => ({
    get: jest.fn()
  })),
  findFiles: jest.fn()
};

export const window = {
  showInformationMessage: jest.fn().mockImplementation((message: string, ...items: string[]) => {
    // Return a proper thenable promise
    return Promise.resolve(items.length > 0 ? items[0] : undefined);
  }),
  showErrorMessage: jest.fn().mockResolvedValue(undefined),
  showWarningMessage: jest.fn().mockResolvedValue(undefined),
  showQuickPick: jest.fn(),
  createQuickPick: jest.fn(() => {
    const quickPick = {
      title: '',
      placeholder: '',
      ignoreFocusOut: false,
      items: [],
      activeItems: [],
      value: '',
      onDidAccept: jest.fn((callback) => {
        setTimeout(() => callback(), 0);
        return { dispose: jest.fn() };
      }),
      onDidHide: jest.fn(() => ({ dispose: jest.fn() })),
      show: jest.fn(),
      hide: jest.fn(),
      dispose: jest.fn()
    };
    return quickPick;
  }),
  createStatusBarItem: jest.fn(() => ({
    text: '',
    tooltip: '',
    command: '',
    color: undefined,
    show: jest.fn(),
    hide: jest.fn(),
    dispose: jest.fn()
  })),
  createOutputChannel: jest.fn(() => ({
    appendLine: jest.fn(),
    append: jest.fn(),
    show: jest.fn(),
    hide: jest.fn(),
    clear: jest.fn(),
    dispose: jest.fn(),
    name: 'AI Context Utilities'
  })),
  withProgress: jest.fn((options, callback) => {
    const progress = { report: jest.fn() };
    const token = { isCancellationRequested: false };
    return callback(progress, token);
  }),
  activeTextEditor: {
    document: {
      lineCount: 10,
      positionAt: jest.fn((offset: number) => new Position(Math.floor(offset / 80), offset % 80)),
      getText: jest.fn(() => 'mock document content'),
      uri: { fsPath: '/mock/file.ts' }
    },
    edit: jest.fn(() => Promise.resolve(true)),
    selection: new Selection(0, 0, 0, 0)
  }
};

export const commands = {
  executeCommand: jest.fn(),
  registerCommand: jest.fn(() => ({ dispose: jest.fn() }))
};

export const env = {
  clipboard: {
    writeText: jest.fn()
  },
  openExternal: jest.fn().mockResolvedValue(undefined)
};

export const Uri = {
  file: jest.fn((path: string) => ({
    fsPath: path,
    path: path
  })),
  parse: jest.fn((uri: string) => ({
    scheme: 'https',
    authority: '',
    path: uri,
    query: '',
    fragment: ''
  }))
};

export const EventEmitter = jest.fn(() => ({
  event: jest.fn(),
  fire: jest.fn()
}));

export const Disposable = {
  from: jest.fn()
};

export const QuickPickItemKind = {
  Separator: -1
};

export const StatusBarAlignment = {
  Left: 1,
  Right: 2
};

export const ThemeColor = jest.fn();

export const ProgressLocation = {
  Notification: 15,
  Window: 10,
  SourceControl: 1
};