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
    it('should create provider successfully', () => {
      expect(provider).toBeDefined();
      expect(provider.resolveWebviewView).toBeDefined();
    });

    it('should handle webview setup', () => {
      // Just verify the method can be called without throwing
      expect(() => {
        provider.resolveWebviewView(mockWebviewView, {} as any, {} as any);
      }).not.toThrow();
    });
  });

  describe('runAITestDebug', () => {
    it('should have runAITestDebug method', () => {
      expect(provider.runAITestDebug).toBeDefined();
      expect(typeof provider.runAITestDebug).toBe('function');
    });

    it('should execute without throwing', async () => {
      await expect(provider.runAITestDebug()).resolves.not.toThrow();
    });
  });

  describe('message handling', () => {
    it('should handle message setup', () => {
      // Just verify the provider can handle basic setup
      expect(() => {
        provider.resolveWebviewView(mockWebviewView, {} as any, {} as any);
      }).not.toThrow();
    });
  });
});
