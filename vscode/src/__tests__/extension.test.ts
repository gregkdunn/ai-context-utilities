import * as vscode from 'vscode';
import { activate, deactivate } from '../extension';
import { WebviewProvider } from '../webview/provider';
import { ProjectDetector } from '../utils/projectDetector';
import { CommandRunner } from '../utils/shellRunner';
import { FileManager } from '../utils/fileManager';

// Mock all dependencies
jest.mock('../webview/provider');
jest.mock('../utils/projectDetector');
jest.mock('../utils/shellRunner');
jest.mock('../utils/fileManager');

// Mock vscode module
jest.mock('vscode', () => ({
  window: {
    registerWebviewViewProvider: jest.fn(),
    showInformationMessage: jest.fn(() => Promise.resolve(undefined)),
    showWarningMessage: jest.fn()
  },
  commands: {
    registerCommand: jest.fn(),
    executeCommand: jest.fn()
  },
  workspace: {
    getConfiguration: jest.fn(() => ({
      get: jest.fn((key: string) => {
        if (key === 'showNotifications') return true;
        return undefined;
      })
    }))
  }
}));

const MockedWebviewProvider = WebviewProvider as jest.MockedClass<typeof WebviewProvider>;
const MockedProjectDetector = ProjectDetector as jest.MockedClass<typeof ProjectDetector>;
const MockedCommandRunner = CommandRunner as jest.MockedClass<typeof CommandRunner>;
const MockedFileManager = FileManager as jest.MockedClass<typeof FileManager>;

describe('Extension', () => {
  let mockContext: vscode.ExtensionContext;
  let mockProjectDetector: jest.Mocked<ProjectDetector>;
  let mockCommandRunner: jest.Mocked<CommandRunner>;
  let mockFileManager: jest.Mocked<FileManager>;
  let mockWebviewProvider: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock context
    mockContext = {
      subscriptions: [],
      extensionUri: { fsPath: '/extension/path' }
    } as any;

    // Setup mock instances
    mockProjectDetector = new MockedProjectDetector() as jest.Mocked<ProjectDetector>;
    mockCommandRunner = new MockedCommandRunner() as jest.Mocked<CommandRunner>;
    mockFileManager = new MockedFileManager() as jest.Mocked<FileManager>;
    
    // Setup mock return values for constructors
    MockedProjectDetector.mockImplementation(() => mockProjectDetector);
    MockedCommandRunner.mockImplementation(() => mockCommandRunner);
    MockedFileManager.mockImplementation(() => mockFileManager);
    
    // Create a mock webview provider that will be returned by the constructor
    mockWebviewProvider = {
      show: jest.fn(),
      runCommand: jest.fn(),
      resolveWebviewView: jest.fn()
    } as any;
    
    MockedWebviewProvider.mockImplementation(() => mockWebviewProvider);
  });

  describe('activate', () => {
    it('should activate extension when NX workspace is detected', async () => {
      const vscode = require('vscode');
      
      // Mock NX workspace detection
      mockProjectDetector.findNxWorkspace.mockResolvedValue('/workspace/nx.json');

      await activate(mockContext);

      expect(vscode.commands.executeCommand).toHaveBeenCalledWith('setContext', 'workspaceHasNxProject', true);
      expect(vscode.window.registerWebviewViewProvider).toHaveBeenCalledWith('aiDebugUtilities', mockWebviewProvider);
      expect(vscode.commands.registerCommand).toHaveBeenCalledTimes(5);
      expect(mockContext.subscriptions).toHaveLength(6); // 5 commands + 1 webview provider
    });

    it('should remain dormant when no NX workspace is detected', async () => {
      const vscode = require('vscode');
      
      // Mock no NX workspace
      mockProjectDetector.findNxWorkspace.mockResolvedValue(null);

      await activate(mockContext);

      expect(vscode.commands.executeCommand).toHaveBeenCalledWith('setContext', 'workspaceHasNxProject', false);
      expect(vscode.window.registerWebviewViewProvider).not.toHaveBeenCalled();
      expect(vscode.commands.registerCommand).not.toHaveBeenCalled();
      expect(mockContext.subscriptions).toHaveLength(0);
    });

    it('should show welcome notification when notifications are enabled', async () => {
      const vscode = require('vscode');
      
      mockProjectDetector.findNxWorkspace.mockResolvedValue('/workspace/nx.json');
      vscode.window.showInformationMessage.mockResolvedValue('Open Panel');

      await activate(mockContext);

      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
        'AI Debug Utilities activated! Open the panel to get started.',
        'Open Panel'
      );
      expect(vscode.commands.executeCommand).toHaveBeenCalledWith('aiDebugUtilities.openPanel');
    });

    it('should register all required commands', async () => {
      const vscode = require('vscode');
      
      mockProjectDetector.findNxWorkspace.mockResolvedValue('/workspace/nx.json');

      await activate(mockContext);

      const registeredCommands = vscode.commands.registerCommand.mock.calls.map((call: any) => call[0]);
      
      expect(registeredCommands).toContain('aiDebugUtilities.openPanel');
      expect(registeredCommands).toContain('aiDebugUtilities.runAiDebug');
      expect(registeredCommands).toContain('aiDebugUtilities.runNxTest');
      expect(registeredCommands).toContain('aiDebugUtilities.runGitDiff');
      expect(registeredCommands).toContain('aiDebugUtilities.runPrepareToPush');
    });
  });

  describe('registered commands', () => {
    beforeEach(async () => {
      const vscode = require('vscode');
      mockProjectDetector.findNxWorkspace.mockResolvedValue('/workspace/nx.json');
      await activate(mockContext);
    });

    it('should register openPanel command', async () => {
      const vscode = require('vscode');
      const openPanelCommand = vscode.commands.registerCommand.mock.calls
        .find((call: any) => call[0] === 'aiDebugUtilities.openPanel')[1];

      openPanelCommand();

      expect(mockWebviewProvider.show).toHaveBeenCalled();
    });

    it('should register runAiDebug command with project detection', async () => {
      const vscode = require('vscode');
      const runAiDebugCommand = vscode.commands.registerCommand.mock.calls
        .find((call: any) => call[0] === 'aiDebugUtilities.runAiDebug')[1];

      mockProjectDetector.detectCurrentProject.mockResolvedValue('my-app');

      await runAiDebugCommand();

      expect(mockProjectDetector.detectCurrentProject).toHaveBeenCalled();
      expect(mockWebviewProvider.runCommand).toHaveBeenCalledWith('aiDebug', { project: 'my-app' });
    });

    it('should register runAiDebug command and show warning when no project detected', async () => {
      const vscode = require('vscode');
      const runAiDebugCommand = vscode.commands.registerCommand.mock.calls
        .find((call: any) => call[0] === 'aiDebugUtilities.runAiDebug')[1];

      mockProjectDetector.detectCurrentProject.mockResolvedValue(null);

      await runAiDebugCommand();

      expect(vscode.window.showWarningMessage).toHaveBeenCalledWith(
        'No NX project detected. Please select a project first.'
      );
      expect(mockWebviewProvider.runCommand).not.toHaveBeenCalled();
    });

    it('should register runNxTest command with project detection', async () => {
      const vscode = require('vscode');
      const runNxTestCommand = vscode.commands.registerCommand.mock.calls
        .find((call: any) => call[0] === 'aiDebugUtilities.runNxTest')[1];

      mockProjectDetector.detectCurrentProject.mockResolvedValue('my-lib');

      await runNxTestCommand();

      expect(mockProjectDetector.detectCurrentProject).toHaveBeenCalled();
      expect(mockWebviewProvider.runCommand).toHaveBeenCalledWith('nxTest', { project: 'my-lib' });
    });

    it('should register runNxTest command and show warning when no project detected', async () => {
      const vscode = require('vscode');
      const runNxTestCommand = vscode.commands.registerCommand.mock.calls
        .find((call: any) => call[0] === 'aiDebugUtilities.runNxTest')[1];

      mockProjectDetector.detectCurrentProject.mockResolvedValue(null);

      await runNxTestCommand();

      expect(vscode.window.showWarningMessage).toHaveBeenCalledWith(
        'No NX project detected. Please select a project first.'
      );
      expect(mockWebviewProvider.runCommand).not.toHaveBeenCalled();
    });

    it('should register runGitDiff command', async () => {
      const vscode = require('vscode');
      const runGitDiffCommand = vscode.commands.registerCommand.mock.calls
        .find((call: any) => call[0] === 'aiDebugUtilities.runGitDiff')[1];

      await runGitDiffCommand();

      expect(mockWebviewProvider.runCommand).toHaveBeenCalledWith('gitDiff', {});
    });

    it('should register runPrepareToPush command with project detection', async () => {
      const vscode = require('vscode');
      const runPrepareToPushCommand = vscode.commands.registerCommand.mock.calls
        .find((call: any) => call[0] === 'aiDebugUtilities.runPrepareToPush')[1];

      mockProjectDetector.detectCurrentProject.mockResolvedValue('my-app');

      await runPrepareToPushCommand();

      expect(mockProjectDetector.detectCurrentProject).toHaveBeenCalled();
      expect(mockWebviewProvider.runCommand).toHaveBeenCalledWith('prepareToPush', { project: 'my-app' });
    });

    it('should register runPrepareToPush command and show warning when no project detected', async () => {
      const vscode = require('vscode');
      const runPrepareToPushCommand = vscode.commands.registerCommand.mock.calls
        .find((call: any) => call[0] === 'aiDebugUtilities.runPrepareToPush')[1];

      mockProjectDetector.detectCurrentProject.mockResolvedValue(null);

      await runPrepareToPushCommand();

      expect(vscode.window.showWarningMessage).toHaveBeenCalledWith(
        'No NX project detected. Please select a project first.'
      );
      expect(mockWebviewProvider.runCommand).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle workspace detection errors gracefully', async () => {
      const vscode = require('vscode');
      
      mockProjectDetector.findNxWorkspace.mockRejectedValue(new Error('Workspace detection failed'));

      await activate(mockContext);
      
      // The extension should set context to false when workspace detection fails
      expect(vscode.commands.executeCommand).toHaveBeenCalledWith('setContext', 'workspaceHasNxProject', false);
    });

    it('should handle command registration errors gracefully', async () => {
      const vscode = require('vscode');
      
      mockProjectDetector.findNxWorkspace.mockResolvedValue('/workspace/nx.json');
      vscode.commands.registerCommand.mockImplementation(() => {
        throw new Error('Command registration failed');
      });

      await activate(mockContext);
      
      // The extension should set context to false when command registration fails
      expect(vscode.commands.executeCommand).toHaveBeenCalledWith('setContext', 'workspaceHasNxProject', false);
    });
  });

  describe('deactivate', () => {
    it('should deactivate extension cleanly', () => {
      // Should not throw
      expect(() => deactivate()).not.toThrow();
    });
  });

  describe('integration', () => {
    it('should create all necessary instances with correct dependencies', async () => {
      // Clear previous mock calls
      MockedProjectDetector.mockClear();
      MockedCommandRunner.mockClear();
      MockedFileManager.mockClear();
      MockedWebviewProvider.mockClear();
      
      mockProjectDetector.findNxWorkspace.mockResolvedValue('/workspace/nx.json');
      
      // Reset the mock to normal behavior for this test
      const vscode = require('vscode');
      vscode.commands.registerCommand.mockImplementation(() => ({ dispose: jest.fn() }));

      await activate(mockContext);

      expect(MockedProjectDetector).toHaveBeenCalledTimes(1);
      expect(MockedCommandRunner).toHaveBeenCalledTimes(1);
      expect(MockedFileManager).toHaveBeenCalledTimes(1);
      expect(MockedWebviewProvider).toHaveBeenCalledWith(
        mockContext.extensionUri,
        mockProjectDetector,
        mockCommandRunner,
        mockFileManager
      );
    });

    it('should properly dispose of resources through context subscriptions', async () => {
      // Clear previous mock calls
      MockedProjectDetector.mockClear();
      MockedCommandRunner.mockClear();
      MockedFileManager.mockClear();
      MockedWebviewProvider.mockClear();
      
      mockProjectDetector.findNxWorkspace.mockResolvedValue('/workspace/nx.json');
      
      // Reset the mock to normal behavior for this test
      const vscode = require('vscode');
      vscode.commands.registerCommand.mockImplementation(() => ({ dispose: jest.fn() }));
      vscode.window.registerWebviewViewProvider.mockImplementation(() => ({ dispose: jest.fn() }));

      await activate(mockContext);

      expect(mockContext.subscriptions).toHaveLength(6);
      
      // All subscriptions should be disposable objects
      mockContext.subscriptions.forEach(subscription => {
        expect(subscription).toHaveProperty('dispose');
      });
    });
  });
});
