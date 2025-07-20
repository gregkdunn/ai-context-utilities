import { CopilotIntegration } from '../services/CopilotIntegration';
import { DebugContext, TestAnalysis, TestSuggestions, FalsePositiveAnalysis } from '../types';
import * as vscode from 'vscode';

// Mock VSCode APIs
jest.mock('vscode', () => ({
  workspace: {
    getConfiguration: jest.fn().mockReturnValue({
      get: jest.fn().mockReturnValue(true)
    })
  },
  lm: {
    selectChatModels: jest.fn()
  },
  LanguageModelChatMessage: {
    User: jest.fn().mockImplementation((content) => ({ content, role: 'user' }))
  },
  CancellationTokenSource: jest.fn().mockImplementation(() => ({
    token: {}
  }))
}));

describe('CopilotIntegration', () => {
  let copilotIntegration: CopilotIntegration;
  let mockContext: vscode.ExtensionContext;

  beforeEach(() => {
    mockContext = {
      subscriptions: [],
      workspaceState: {
        get: jest.fn(),
        update: jest.fn()
      },
      globalState: {
        get: jest.fn(),
        update: jest.fn()
      }
    } as any;

    // Reset mocks
    jest.clearAllMocks();
    
    copilotIntegration = new CopilotIntegration(mockContext);
  });

  describe('initialization', () => {
    it('should initialize with default enabled state', () => {
      expect(vscode.workspace.getConfiguration).toHaveBeenCalledWith('aiDebugContext');
    });

    it('should handle missing VSCode Language Model API gracefully', async () => {
      // Mock the Language Model API as undefined
      (vscode as any).lm = undefined;
      
      const integration = new CopilotIntegration(mockContext);
      const isAvailable = await integration.isAvailable();
      
      expect(isAvailable).toBe(false);
    });
  });

  describe('isAvailable', () => {
    it('should return false when Copilot is disabled in configuration', async () => {
      (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
        get: jest.fn().mockReturnValue(false)
      });
      
      const integration = new CopilotIntegration(mockContext);
      const isAvailable = await integration.isAvailable();
      
      expect(isAvailable).toBe(false);
    });

    it('should return false when no models are available', async () => {
      (vscode.lm.selectChatModels as jest.Mock).mockResolvedValue([]);
      
      const isAvailable = await copilotIntegration.isAvailable();
      
      expect(isAvailable).toBe(false);
    });

    it('should return true when models are available', async () => {
      const mockModel = {
        sendRequest: jest.fn().mockResolvedValue({
          text: (async function* () {
            yield 'Mock response';
          })()
        })
      };
      
      (vscode.lm.selectChatModels as jest.Mock).mockResolvedValue([mockModel]);
      
      const isAvailable = await copilotIntegration.isAvailable();
      
      expect(isAvailable).toBe(true);
    });
  });

  describe('analyzeTestFailures', () => {
    const mockDebugContext: DebugContext = {
      gitDiff: 'mock git diff content',
      testResults: [
        {
          name: 'should test something',
          status: 'failed',
          duration: 100,
          file: 'test.spec.ts',
          error: 'Expected true to be false',
          stackTrace: 'at Object.toBe (test.spec.ts:10:20)'
        }
      ],
      projectInfo: {
        name: 'Test Project',
        type: 'Angular',
        framework: 'Angular',
        testFramework: 'Jest',
        dependencies: ['@angular/core']
      }
    };

    it('should return mock analysis when Copilot is not available', async () => {
      const analysis = await copilotIntegration.analyzeTestFailures(mockDebugContext);
      
      expect(analysis).toEqual({
        rootCause: 'Copilot integration not available - using fallback analysis',
        specificFixes: [],
        preventionStrategies: ['Ensure GitHub Copilot extension is installed and active'],
        additionalTests: ['Mock test suggestions would appear here']
      });
    });

    it('should call Copilot API when available', async () => {
      const mockModel = {
        sendRequest: jest.fn().mockResolvedValue({
          text: (async function* () {
            yield JSON.stringify({
              rootCause: 'Test assertion mismatch',
              specificFixes: [{
                file: 'test.spec.ts',
                lineNumber: 10,
                oldCode: 'expect(true).toBe(false)',
                newCode: 'expect(false).toBe(false)',
                explanation: 'Fix the assertion'
              }],
              preventionStrategies: ['Use proper test setup'],
              additionalTests: ['Add edge case tests']
            });
          })()
        })
      };
      
      (vscode.lm.selectChatModels as jest.Mock).mockResolvedValue([mockModel]);
      
      // Re-initialize to pick up the new mock
      copilotIntegration = new CopilotIntegration(mockContext);
      
      const analysis = await copilotIntegration.analyzeTestFailures(mockDebugContext);
      
      expect(mockModel.sendRequest).toHaveBeenCalled();
      expect(analysis.rootCause).toBe('Test assertion mismatch');
      expect(analysis.specificFixes).toHaveLength(1);
    });

    it('should handle JSON parsing errors gracefully', async () => {
      const mockModel = {
        sendRequest: jest.fn().mockResolvedValue({
          text: (async function* () {
            yield 'Invalid JSON response';
          })()
        })
      };
      
      (vscode.lm.selectChatModels as jest.Mock).mockResolvedValue([mockModel]);
      copilotIntegration = new CopilotIntegration(mockContext);
      
      const analysis = await copilotIntegration.analyzeTestFailures(mockDebugContext);
      
      expect(analysis.rootCause).toBe('Analysis completed but could not parse structured response');
      expect(analysis.additionalTests).toContain('Invalid JSON response');
    });
  });

  describe('suggestNewTests', () => {
    const mockDebugContext: DebugContext = {
      gitDiff: 'mock git diff content',
      testResults: [
        {
          name: 'should test something',
          status: 'passed',
          duration: 100,
          file: 'test.spec.ts'
        }
      ],
      projectInfo: {
        name: 'Test Project',
        type: 'Angular',
        framework: 'Angular',
        testFramework: 'Jest',
        dependencies: ['@angular/core']
      }
    };

    it('should return mock suggestions when Copilot is not available', async () => {
      const suggestions = await copilotIntegration.suggestNewTests(mockDebugContext);
      
      expect(suggestions).toEqual({
        newTests: [],
        missingCoverage: ['Copilot integration not available'],
        improvements: ['Install and activate GitHub Copilot extension']
      });
    });

    it('should call Copilot API for test suggestions when available', async () => {
      const mockModel = {
        sendRequest: jest.fn().mockResolvedValue({
          text: (async function* () {
            yield JSON.stringify({
              newTests: [{
                file: 'component.spec.ts',
                testName: 'should handle error cases',
                testCode: 'it("should handle error cases", () => { ... });',
                reasoning: 'Error handling is not tested'
              }],
              missingCoverage: ['Error handling', 'Edge cases'],
              improvements: ['Add more descriptive test names']
            });
          })()
        })
      };
      
      (vscode.lm.selectChatModels as jest.Mock).mockResolvedValue([mockModel]);
      copilotIntegration = new CopilotIntegration(mockContext);
      
      const suggestions = await copilotIntegration.suggestNewTests(mockDebugContext);
      
      expect(mockModel.sendRequest).toHaveBeenCalled();
      expect(suggestions.newTests).toHaveLength(1);
      expect(suggestions.newTests[0].testName).toBe('should handle error cases');
    });
  });

  describe('detectFalsePositives', () => {
    const mockDebugContext: DebugContext = {
      gitDiff: 'mock git diff content',
      testResults: [
        {
          name: 'should test mocked behavior',
          status: 'passed',
          duration: 50,
          file: 'mocked.spec.ts'
        }
      ],
      projectInfo: {
        name: 'Test Project',
        type: 'Angular',
        framework: 'Angular',
        testFramework: 'Jest',
        dependencies: ['@angular/core']
      }
    };

    it('should return mock analysis when Copilot is not available', async () => {
      const analysis = await copilotIntegration.detectFalsePositives(mockDebugContext);
      
      expect(analysis).toEqual({
        suspiciousTests: [],
        mockingIssues: [],
        recommendations: ['Install and activate GitHub Copilot extension for AI analysis']
      });
    });

    it('should analyze passing tests for false positives when Copilot is available', async () => {
      const mockModel = {
        sendRequest: jest.fn().mockResolvedValue({
          text: (async function* () {
            yield JSON.stringify({
              suspiciousTests: [{
                file: 'mocked.spec.ts',
                testName: 'should test mocked behavior',
                issue: 'Over-mocked dependencies',
                suggestion: 'Use real implementations where possible'
              }],
              mockingIssues: [{
                file: 'mocked.spec.ts',
                mock: 'service.getData()',
                issue: 'Mock always returns same value',
                fix: 'Test with different return values'
              }],
              recommendations: ['Reduce mocking', 'Add integration tests']
            });
          })()
        })
      };
      
      (vscode.lm.selectChatModels as jest.Mock).mockResolvedValue([mockModel]);
      copilotIntegration = new CopilotIntegration(mockContext);
      
      const analysis = await copilotIntegration.detectFalsePositives(mockDebugContext);
      
      expect(mockModel.sendRequest).toHaveBeenCalled();
      expect(analysis.suspiciousTests).toHaveLength(1);
      expect(analysis.mockingIssues).toHaveLength(1);
    });
  });

  describe('error handling', () => {
    it('should handle sendRequest failures gracefully', async () => {
      const mockModel = {
        sendRequest: jest.fn().mockRejectedValue(new Error('Network error'))
      };
      
      (vscode.lm.selectChatModels as jest.Mock).mockResolvedValue([mockModel]);
      copilotIntegration = new CopilotIntegration(mockContext);
      
      const mockDebugContext: DebugContext = {
        gitDiff: 'mock diff',
        testResults: [],
        projectInfo: {
          name: 'Test Project',
          type: 'Angular',
          framework: 'Angular',
          testFramework: 'Jest',
          dependencies: []
        }
      };
      
      const analysis = await copilotIntegration.analyzeTestFailures(mockDebugContext);
      
      expect(analysis.rootCause).toBe('Analysis completed but could not parse structured response');
      expect(analysis.additionalTests).toContain('Error communicating with Copilot API');
    });
  });
});
