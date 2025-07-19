import * as vscode from 'vscode';
import { activate, deactivate } from '../extension';
import { createMockExtensionContext } from './test-utils';

// Mock all service imports
jest.mock('../webview/AIDebugWebviewProvider');
jest.mock('../services/GitIntegration');
jest.mock('../services/NXWorkspaceManager');
jest.mock('../services/CopilotIntegration');
jest.mock('../services/TestRunner');

describe('Extension', () => {
  let mockContext: vscode.ExtensionContext;

  beforeEach(() => {
    mockContext = createMockExtensionContext();
    
    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('activate', () => {
    it('should activate successfully', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      activate(mockContext);

      expect(consoleSpy).toHaveBeenCalledWith('AI Debug Context extension is being activated');
      expect(consoleSpy).toHaveBeenCalledWith('AI Debug Context extension activated successfully');
      
      consoleSpy.mockRestore();
    });

    it('should register webview provider', () => {
      activate(mockContext);

      expect(vscode.window.registerWebviewViewProvider).toHaveBeenCalledWith(
        'ai-debug-context.mainView',
        expect.any(Object),
        expect.objectContaining({
          webviewOptions: {
            retainContextWhenHidden: true
          }
        })
      );
    });

    it('should register commands', () => {
      activate(mockContext);

      expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
        'ai-debug-context.runAITestDebug',
        expect.any(Function)
      );
      expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
        'ai-debug-context.openMainView',
        expect.any(Function)
      );
    });

    it('should add subscriptions to context', () => {
      activate(mockContext);

      expect(mockContext.subscriptions.push).toHaveBeenCalled();
    });

    it('should handle activation errors gracefully', () => {
      // Mock a service to throw an error
      const { GitIntegration } = require('../services/GitIntegration');
      GitIntegration.mockImplementation(() => {
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
