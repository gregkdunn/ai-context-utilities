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
  createOutputChannel: jest.fn(() => ({
    appendLine: jest.fn(),
    show: jest.fn(),
    clear: jest.fn()
  }))
};

export const commands = {
  executeCommand: jest.fn()
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