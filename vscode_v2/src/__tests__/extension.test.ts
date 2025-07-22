import * as vscode from 'vscode';
import { activate, deactivate } from '../extension';
import { createMockExtensionContext } from './test-utils';

// Mock ALL services BEFORE importing extension with complete implementations
const mockGitIntegration = jest.fn().mockImplementation(() => ({}));
const mockNXWorkspaceManager = jest.fn().mockImplementation(() => ({}));
const mockCopilotIntegration = jest.fn().mockImplementation(() => ({}));
const mockTestRunner = jest.fn().mockImplementation(() => ({}));
const mockAIDebugWebviewProvider = jest.fn().mockImplementation(() => ({
  runAITestDebug: jest.fn()
}));

// Mock all service imports
jest.mock('../services/GitIntegration', () => ({
  GitIntegration: mockGitIntegration
}));

jest.mock('../services/NXWorkspaceManager', () => ({
  NXWorkspaceManager: mockNXWorkspaceManager
}));

jest.mock('../services/CopilotIntegration', () => ({
  CopilotIntegration: mockCopilotIntegration
}));

jest.mock('../services/TestRunner', () => ({
  TestRunner: mockTestRunner
}));

jest.mock('../webview/AIDebugWebviewProvider', () => ({
  AIDebugWebviewProvider: mockAIDebugWebviewProvider
}));

// Mock additional services that might be imported
jest.mock('../services/CopilotDiagnosticsService', () => ({
  CopilotDiagnosticsService: jest.fn().mockImplementation(() => ({}))
}));

describe('Extension', () => {
  let mockContext: vscode.ExtensionContext;
  let mockDisposable: vscode.Disposable;

  beforeEach(() => {
    // Reset all mocks first
    jest.clearAllMocks();
    
    mockContext = createMockExtensionContext();
    
    // Mock disposable object
    mockDisposable = {
      dispose: jest.fn()
    };
    
    // Setup VSCode API mocks
    (vscode.window.registerWebviewViewProvider as jest.Mock).mockReturnValue(mockDisposable);
    (vscode.commands.registerCommand as jest.Mock).mockReturnValue(mockDisposable);
    (vscode.commands.executeCommand as jest.Mock).mockResolvedValue(undefined);
    (vscode.window.showErrorMessage as jest.Mock).mockResolvedValue(undefined);
    
    // Reset constructor mocks to prevent side effects
    mockGitIntegration.mockClear();
    mockNXWorkspaceManager.mockClear();
    mockCopilotIntegration.mockClear();
    mockTestRunner.mockClear();
    mockAIDebugWebviewProvider.mockClear();
    
    // Ensure mocks return properly and don't throw
    mockGitIntegration.mockImplementation(() => ({ test: 'git' }));
    mockNXWorkspaceManager.mockImplementation(() => ({ test: 'nx' }));
    mockCopilotIntegration.mockImplementation(() => ({ test: 'copilot' }));
    mockTestRunner.mockImplementation(() => ({ test: 'testRunner' }));
    mockAIDebugWebviewProvider.mockImplementation(() => ({ 
      runAITestDebug: jest.fn(),
      test: 'webview'
    }));
    
    // Mock workspace configuration to prevent issues
    (vscode.workspace as any).getConfiguration = jest.fn().mockReturnValue({
      get: jest.fn().mockReturnValue(true)
    });
    
    // Mock workspace folders
    (vscode.workspace as any).workspaceFolders = [{ uri: { fsPath: '/test' } }];
  });

  describe('activate', () => {
    it('should activate successfully', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      activate(mockContext);

      expect(consoleSpy).toHaveBeenCalledWith('AI Debug Context extension is being activated');
      // Just verify it was called at least once (activation started)
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    it('should attempt extension setup', () => {
      // Just verify the function can be called without throwing
      expect(() => activate(mockContext)).not.toThrow();
    });

    it('should handle activation errors gracefully', () => {
      // Mock a service to throw an error
      mockGitIntegration.mockImplementation(() => {
        throw new Error('Service initialization failed');
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const showErrorSpy = jest.spyOn(vscode.window, 'showErrorMessage').mockImplementation();

      activate(mockContext);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to activate AI Debug Context extension:',
        expect.any(Error)
      );
      expect(showErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to activate AI Debug Context')
      );

      consoleSpy.mockRestore();
      showErrorSpy.mockRestore();
    });
  });

  describe('deactivate', () => {
    it('should log deactivation message', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      deactivate();

      expect(consoleSpy).toHaveBeenCalledWith('AI Debug Context extension is being deactivated');
      
      consoleSpy.mockRestore();
    });
  });
});
