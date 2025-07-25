import * as vscode from 'vscode';

/**
 * Creates a mock VSCode ExtensionContext for testing
 */
export function createMockExtensionContext(overrides: Partial<vscode.ExtensionContext> = {}): vscode.ExtensionContext {
  const mockSubscriptions = {
    push: jest.fn(),
    length: 0,
    splice: jest.fn(),
    indexOf: jest.fn(),
    forEach: jest.fn()
  } as any;

  const mockContext: vscode.ExtensionContext = {
    subscriptions: mockSubscriptions,
    extensionUri: { fsPath: '/test/path', scheme: 'file', authority: '', path: '/test/path', query: '', fragment: '' } as vscode.Uri,
    extensionPath: '/test/path',
    storagePath: '/test/storage',
    globalStoragePath: '/test/global-storage',
    logPath: '/test/log',
    asAbsolutePath: jest.fn((relativePath: string) => `/test/path/${relativePath}`),
    workspaceState: {
      get: jest.fn(),
      update: jest.fn(),
      keys: jest.fn(() => [])
    } as any,
    globalState: {
      get: jest.fn(),
      update: jest.fn(),
      setKeysForSync: jest.fn(),
      keys: jest.fn(() => [])
    } as any,
    secrets: {
      get: jest.fn(),
      store: jest.fn(),
      delete: jest.fn(),
      onDidChange: jest.fn()
    } as any,
    environmentVariableCollection: {
      persistent: true,
      description: 'test',
      replace: jest.fn(),
      append: jest.fn(),
      prepend: jest.fn(),
      get: jest.fn(),
      forEach: jest.fn(),
      delete: jest.fn(),
      clear: jest.fn()
    } as any,
    storageUri: undefined,
    globalStorageUri: { fsPath: '/test/global', scheme: 'file', authority: '', path: '/test/global', query: '', fragment: '' } as vscode.Uri,
    logUri: { fsPath: '/test/log', scheme: 'file', authority: '', path: '/test/log', query: '', fragment: '' } as vscode.Uri,
    extensionMode: vscode.ExtensionMode.Test,
    extension: {} as any,
    languageModelAccessInformation: {} as any,
    ...overrides
  };

  return mockContext;
}

/**
 * Creates a mock VSCode workspace configuration
 */
export function createMockWorkspace() {
  return {
    workspaceFolders: [{ 
      uri: { 
        fsPath: '/test/workspace',
        scheme: 'file',
        authority: '',
        path: '/test/workspace',
        query: '',
        fragment: ''
      } as vscode.Uri 
    }],
    getConfiguration: jest.fn().mockReturnValue({
      get: jest.fn().mockReturnValue('main')
    }),
    findFiles: jest.fn()
  };
}