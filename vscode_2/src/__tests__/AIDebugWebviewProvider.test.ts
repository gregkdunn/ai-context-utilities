import * as vscode from 'vscode';
import { AIDebugWebviewProvider } from '../webview/AIDebugWebviewProvider';
import { GitIntegration } from '../services/GitIntegration';
import { NXWorkspaceManager } from '../services/NXWorkspaceManager';
import { CopilotIntegration } from '../services/CopilotIntegration';
import { TestRunner } from '../services/TestRunner';
import { TestResult } from '../types';
import { createMockExtensionContext } from './test-utils';

// Mock all services
jest.mock('../services/GitIntegration');
jest.mock('../services/NXWorkspaceManager');
jest.mock('../services/CopilotIntegration');
jest.mock('../services/TestRunner');

// Mock fs for the webview provider
jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(false) // Default to no Angular files
}));

describe('AIDebugWebviewProvider', () => {
  let provider: AIDebugWebviewProvider;
  let mockContext: vscode.ExtensionContext;
  let mockWebviewView: any;
  let mockGitIntegration: jest.Mocked<GitIntegration>;
  let mockNXManager: jest.Mocked<NXWorkspaceManager>;
  let mockCopilot: jest.Mocked<CopilotIntegration>;
  let mockTestRunner: jest.Mocked<TestRunner>;

  beforeEach(() => {
    mockContext = createMockExtensionContext();
    
    // Create mocked services
    mockGitIntegration = new GitIntegration(mockContext) as jest.Mocked<GitIntegration>;
    mockNXManager = new NXWorkspaceManager(mockContext) as jest.Mocked<NXWorkspaceManager>;
    mockCopilot = new CopilotIntegration(mockContext) as jest.Mocked<CopilotIntegration>;
    mockTestRunner = new TestRunner(mockContext) as jest.Mocked<TestRunner>;

    // Mock service methods
    mockGitIntegration.getUncommittedChanges = jest.fn().mockResolvedValue([]);
    mockGitIntegration.getDiffForUncommittedChanges = jest.fn().mockResolvedValue('test diff');
    mockTestRunner.runAffectedTests = jest.fn().mockResolvedValue([]);

    provider = new AIDebugWebviewProvider(
      mockContext,
      mockGitIntegration,
      mockNXManager,
      mockCopilot,
      mockTestRunner
    );

    // Mock webview view
    mockWebviewView = {
      webview: {
        options: {},
        html: '',
        postMessage: jest.fn(),
        onDidReceiveMessage: jest.fn(),
        asWebviewUri: jest.fn((uri) => {
          // Return a mock URI with the same path
          return {
            scheme: 'vscode-webview',
            authority: 'mock',
            path: uri.path,
            query: '',
            fragment: '',
            fsPath: uri.path,
            toString: () => `vscode-webview://mock${uri.path}`
          };
        }),
        cspSource: 'vscode-webview:'
      },
      onDidChangeVisibility: jest.fn(),
      visible: true
    };
  });

  describe('resolveWebviewView', () => {
    it('should configure webview options correctly', () => {
      provider.resolveWebviewView(mockWebviewView, {} as any, {} as any);

      expect(mockWebviewView.webview.options).toMatchObject({
        enableScripts: true,
        localResourceRoots: expect.any(Array)
      });
    });

    it('should set HTML content', () => {
      provider.resolveWebviewView(mockWebviewView, {} as any, {} as any);

      expect(mockWebviewView.webview.html).toBeTruthy();
      expect(mockWebviewView.webview.html).toContain('AI Debug Context');
    });

    it('should register message handler', () => {
      provider.resolveWebviewView(mockWebviewView, {} as any, {} as any);

      expect(mockWebviewView.webview.onDidReceiveMessage).toHaveBeenCalled();
    });
  });

  describe('runAITestDebug', () => {
    beforeEach(() => {
      provider.resolveWebviewView(mockWebviewView, {} as any, {} as any);
    });

    it('should execute workflow steps', async () => {
      await provider.runAITestDebug();

      expect(mockGitIntegration.getUncommittedChanges).toHaveBeenCalled();
      expect(mockGitIntegration.getDiffForUncommittedChanges).toHaveBeenCalled();
      expect(mockTestRunner.runAffectedTests).toHaveBeenCalled();
      expect(mockWebviewView.webview.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          command: 'workflowComplete',
          data: { success: true }
        })
      );
    });

    it('should handle test failures', async () => {
      const failedTests: TestResult[] = [
        { name: 'test1', status: 'failed', duration: 100, file: 'test.spec.ts' }
      ];
      mockTestRunner.runAffectedTests.mockResolvedValue(failedTests);

      await provider.runAITestDebug();

      expect(mockWebviewView.webview.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          command: 'testFailures'
        })
      );
    });

    it('should handle errors gracefully', async () => {
      mockGitIntegration.getUncommittedChanges.mockRejectedValue(new Error('Git error'));

      await provider.runAITestDebug();

      expect(mockWebviewView.webview.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          command: 'workflowStateUpdate',
          data: expect.objectContaining({
            step: 'error'
          })
        })
      );
    });
  });

  describe('message handling', () => {
    beforeEach(() => {
      provider.resolveWebviewView(mockWebviewView, {} as any, {} as any);
    });

    it('should handle runFullWorkflow message', async () => {
      const handler = mockWebviewView.webview.onDidReceiveMessage.mock.calls[0][0];
      
      await handler({ command: 'runFullWorkflow' });

      expect(mockGitIntegration.getUncommittedChanges).toHaveBeenCalled();
    });

    it('should handle getGitDiff message', async () => {
      const handler = mockWebviewView.webview.onDidReceiveMessage.mock.calls[0][0];
      
      await handler({ command: 'getGitDiff' });

      expect(mockGitIntegration.getDiffForUncommittedChanges).toHaveBeenCalled();
      expect(mockWebviewView.webview.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          command: 'gitDiff'
        })
      );
    });

    it('should handle unknown commands gracefully', async () => {
      const handler = mockWebviewView.webview.onDidReceiveMessage.mock.calls[0][0];
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      await handler({ command: 'unknownCommand' });

      expect(consoleSpy).toHaveBeenCalledWith('Unknown webview message command:', 'unknownCommand');
      consoleSpy.mockRestore();
    });
  });
});
