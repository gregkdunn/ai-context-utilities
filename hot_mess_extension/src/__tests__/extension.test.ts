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

// Mock additional dependencies
jest.mock('../utils/statusTracker');
jest.mock('../utils/commandCoordinator');
jest.mock('../services/plugins/pluginManager');
jest.mock('../services/plugins/pluginMarketplace');
jest.mock('../services/plugins/pluginDiscovery');
jest.mock('../services/nx/NxAffectedManager');
jest.mock('../services/nx/NxCommandProvider', () => ({
  NxCommandProvider: jest.fn().mockImplementation(() => ({
    register: jest.fn().mockReturnValue([{ dispose: jest.fn() }])
  }))
}));
jest.mock('../services/nx/NxStatusBar');
jest.mock('../services/git/GitDiffManager');
jest.mock('../services/git/GitCommandProvider', () => ({
  GitCommandProvider: jest.fn().mockImplementation(() => ({
    register: jest.fn().mockReturnValue([{ dispose: jest.fn() }])
  }))
}));
jest.mock('../services/flipper/FlipperDetectionManager');

// Mock vscode module
jest.mock('vscode', () => ({
  window: {
    registerWebviewViewProvider: jest.fn(),
    showInformationMessage: jest.fn(() => Promise.resolve(undefined)),
    showWarningMessage: jest.fn(),
    createOutputChannel: jest.fn(() => ({
      appendLine: jest.fn(),
      show: jest.fn()
    }))
  },
  commands: {
    registerCommand: jest.fn(() => ({ dispose: jest.fn() })),
    executeCommand: jest.fn()
  },
  workspace: {
    workspaceFolders: [{ uri: { fsPath: '/test/workspace' } }],
    getConfiguration: jest.fn((section?: string) => ({
      get: jest.fn((key: string) => {
        if (key === 'showNotifications') {
          return true;
        }
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
    mockProjectDetector = new MockedProjectDetector('test-workspace') as jest.Mocked<ProjectDetector>;
    mockCommandRunner = new MockedCommandRunner({} as any) as jest.Mocked<CommandRunner>;
    mockFileManager = new MockedFileManager({} as any) as jest.Mocked<FileManager>;
    
    // Mock methods that are called in the tests
    mockProjectDetector.findNxWorkspace = jest.fn();
    mockProjectDetector.getCurrentProject = jest.fn();
    
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
      expect(vscode.commands.registerCommand).toHaveBeenCalled();
      expect(mockContext.subscriptions.length).toBeGreaterThan(0);
    });

    it('should remain dormant when no NX workspace is detected', async () => {
      const vscode = require('vscode');
      
      // Mock no NX workspace
      mockProjectDetector.findNxWorkspace.mockResolvedValue(null);

      await activate(mockContext);

      expect(vscode.commands.executeCommand).toHaveBeenCalledWith('setContext', 'workspaceHasNxProject', false);
      expect(vscode.window.registerWebviewViewProvider).not.toHaveBeenCalled();
    });

    it('should show welcome notification when notifications are enabled', async () => {
            const vscode = require('vscode');
            
            mockProjectDetector.findNxWorkspace.mockResolvedValue('/workspace/nx.json');
            
            // Create a simple resolved promise for the notification
            vscode.window.showInformationMessage.mockResolvedValue('Open Panel');

            await activate(mockContext);

            expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
                'AI Debug Utilities activated! Open the panel to get started.',
                'Open Panel'
            );
            
            // Give some time for async operations to complete
            await new Promise(resolve => setTimeout(resolve, 10));
            
            expect(vscode.commands.executeCommand).toHaveBeenCalledWith('aiDebugUtilities.openPanel');
    }, 10000);

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
      const openPanelCall = vscode.commands.registerCommand.mock.calls
        .find((call: any) => call[0] === 'aiDebugUtilities.openPanel');
      
      if (openPanelCall && openPanelCall[1]) {
        openPanelCall[1]();
        expect(mockWebviewProvider.show).toHaveBeenCalled();
      }
    });

    it('should register runAiDebug command with project detection', async () => {
      const vscode = require('vscode');
      const runAiDebugCall = vscode.commands.registerCommand.mock.calls
        .find((call: any) => call[0] === 'aiDebugUtilities.runAiDebug');

      mockProjectDetector.getCurrentProject.mockResolvedValue({ 
        name: 'my-app', 
        root: 'apps/my-app', 
        projectType: 'application',
        type: 'nx',
        packageJsonPath: 'apps/my-app/package.json'
      });

      if (runAiDebugCall && runAiDebugCall[1]) {
        await runAiDebugCall[1]();

        expect(mockProjectDetector.getCurrentProject).toHaveBeenCalled();
        expect(mockWebviewProvider.runCommand).toHaveBeenCalledWith('aiDebug', { project: 'my-app' });
      }
    });

    it('should register runAiDebug command and show warning when no project detected', async () => {
      const vscode = require('vscode');
      const runAiDebugCall = vscode.commands.registerCommand.mock.calls
        .find((call: any) => call[0] === 'aiDebugUtilities.runAiDebug');

      mockProjectDetector.getCurrentProject.mockResolvedValue(undefined);

      if (runAiDebugCall && runAiDebugCall[1]) {
        await runAiDebugCall[1]();

        expect(vscode.window.showWarningMessage).toHaveBeenCalledWith(
          'No NX project detected. Please select a project first.'
        );
        expect(mockWebviewProvider.runCommand).not.toHaveBeenCalled();
      }
    });

    it('should register runNxTest command with project detection', async () => {
      const vscode = require('vscode');
      const runNxTestCall = vscode.commands.registerCommand.mock.calls
        .find((call: any) => call[0] === 'aiDebugUtilities.runNxTest');

      mockProjectDetector.getCurrentProject.mockResolvedValue({ 
        name: 'my-lib', 
        root: 'libs/my-lib', 
        projectType: 'library',
        type: 'nx',
        packageJsonPath: 'libs/my-lib/package.json'
      });

      if (runNxTestCall && runNxTestCall[1]) {
        await runNxTestCall[1]();

        expect(mockProjectDetector.getCurrentProject).toHaveBeenCalled();
        expect(mockWebviewProvider.runCommand).toHaveBeenCalledWith('nxTest', { project: 'my-lib' });
      }
    });

    it('should register runNxTest command and show warning when no project detected', async () => {
      const vscode = require('vscode');
      const runNxTestCall = vscode.commands.registerCommand.mock.calls
        .find((call: any) => call[0] === 'aiDebugUtilities.runNxTest');

      mockProjectDetector.getCurrentProject.mockResolvedValue(undefined);

      if (runNxTestCall && runNxTestCall[1]) {
        await runNxTestCall[1]();

        expect(vscode.window.showWarningMessage).toHaveBeenCalledWith(
          'No NX project detected. Please select a project first.'
        );
        expect(mockWebviewProvider.runCommand).not.toHaveBeenCalled();
      }
    });

    it('should register runGitDiff command', async () => {
      const vscode = require('vscode');
      const runGitDiffCall = vscode.commands.registerCommand.mock.calls
        .find((call: any) => call[0] === 'aiDebugUtilities.runGitDiff');

      if (runGitDiffCall && runGitDiffCall[1]) {
        await runGitDiffCall[1]();
        expect(mockWebviewProvider.runCommand).toHaveBeenCalledWith('gitDiff', {});
      }
    });

    it('should register runPrepareToPush command with project detection', async () => {
      const vscode = require('vscode');
      const runPrepareToPushCall = vscode.commands.registerCommand.mock.calls
        .find((call: any) => call[0] === 'aiDebugUtilities.runPrepareToPush');

      mockProjectDetector.getCurrentProject.mockResolvedValue({ 
        name: 'my-app', 
        root: 'apps/my-app', 
        projectType: 'application',
        type: 'nx',
        packageJsonPath: 'apps/my-app/package.json'
      });

      if (runPrepareToPushCall && runPrepareToPushCall[1]) {
        await runPrepareToPushCall[1]();

        expect(mockProjectDetector.getCurrentProject).toHaveBeenCalled();
        expect(mockWebviewProvider.runCommand).toHaveBeenCalledWith('prepareToPush', { project: 'my-app' });
      }
    });

    it('should register runPrepareToPush command and show warning when no project detected', async () => {
      const vscode = require('vscode');
      const runPrepareToPushCall = vscode.commands.registerCommand.mock.calls
        .find((call: any) => call[0] === 'aiDebugUtilities.runPrepareToPush');

      mockProjectDetector.getCurrentProject.mockResolvedValue(undefined);

      if (runPrepareToPushCall && runPrepareToPushCall[1]) {
        await runPrepareToPushCall[1]();

        expect(vscode.window.showWarningMessage).toHaveBeenCalledWith(
          'No NX project detected. Please select a project first.'
        );
        expect(mockWebviewProvider.runCommand).not.toHaveBeenCalled();
      }
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
      
      await activate(mockContext);

      expect(MockedProjectDetector).toHaveBeenCalledTimes(1);
      expect(MockedCommandRunner).toHaveBeenCalledTimes(1);
      expect(MockedFileManager).toHaveBeenCalledTimes(1);
      expect(MockedWebviewProvider).toHaveBeenCalledWith(
      mockContext.extensionUri,
      mockProjectDetector,
      mockCommandRunner,
      mockFileManager,
      expect.anything() // statusTracker
      );
    });

    it('should properly dispose of resources through context subscriptions', async () => {
            mockProjectDetector.findNxWorkspace.mockResolvedValue('/workspace/nx.json');
            
            await activate(mockContext);

            expect(mockContext.subscriptions.length).toBeGreaterThan(0);
            
            // All subscriptions should be disposable objects
            mockContext.subscriptions.forEach(subscription => {
                if (subscription) {
            expect(subscription).toHaveProperty('dispose');
        }
    });
    });
  });
});
