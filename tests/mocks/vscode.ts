// Mock VSCode API for testing

export const workspace = {
  workspaceFolders: [
    {
      uri: {
        fsPath: '/mock/workspace/path'
      }
    }
  ],
  onDidSaveTextDocument: jest.fn(),
  getConfiguration: jest.fn(() => ({
    get: jest.fn()
  })),
  findFiles: jest.fn()
};

export const window = {
  showInformationMessage: jest.fn(),
  showErrorMessage: jest.fn(),
  showWarningMessage: jest.fn(),
  showQuickPick: jest.fn(),
  createQuickPick: jest.fn(() => {
    const quickPick = {
      title: '',
      placeholder: '',
      ignoreFocusOut: false,
      items: [],
      activeItems: [],
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
  })
};

export const commands = {
  executeCommand: jest.fn(),
  registerCommand: jest.fn(() => ({ dispose: jest.fn() }))
};

export const env = {
  clipboard: {
    writeText: jest.fn()
  }
};

export const Uri = {
  file: jest.fn((path: string) => ({
    fsPath: path,
    path: path
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