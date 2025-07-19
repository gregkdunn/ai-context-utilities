import * as vscode from 'vscode';
import { TestRunner } from '../services/TestRunner';
import { createMockExtensionContext } from './test-utils';

// Mock child_process
jest.mock('child_process', () => ({
  spawn: jest.fn()
}));

describe('TestRunner', () => {
  let testRunner: TestRunner;
  let mockContext: vscode.ExtensionContext;
  let mockSpawn: jest.Mock;

  beforeEach(() => {
    // Setup mocks
    mockContext = createMockExtensionContext();

    // Mock spawn
    const { spawn } = require('child_process');
    mockSpawn = spawn as jest.Mock;

    testRunner = new TestRunner(mockContext);
  });

  describe('runAffectedTests', () => {
    it('should parse successful test results', async () => {
      const mockProcess = {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn()
      };

      mockSpawn.mockReturnValue(mockProcess);

      // Simulate successful test output
      const testOutput = `
        PASS src/app/component.spec.ts
        ✓ should create (25ms)
        ✓ should render title (15ms)
      `;

      const resultPromise = testRunner.runAffectedTests();

      // Simulate stdout data
      const stdoutCallback = mockProcess.stdout.on.mock.calls.find(call => call[0] === 'data')[1];
      stdoutCallback(testOutput);

      // Simulate process close
      const closeCallback = mockProcess.on.mock.calls.find(call => call[0] === 'close')[1];
      closeCallback(0);

      const result = await resultPromise;

      expect(result).toEqual([
        {
          name: 'should create',
          status: 'passed',
          duration: 25,
          file: 'src/app/component.spec.ts'
        },
        {
          name: 'should render title',
          status: 'passed',
          duration: 15,
          file: 'src/app/component.spec.ts'
        }
      ]);
    });

    it('should handle test failures', async () => {
      const mockProcess = {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn()
      };

      mockSpawn.mockReturnValue(mockProcess);

      const testOutput = `
        FAIL src/app/component.spec.ts
        ✗ should fail (30ms)
      `;

      const resultPromise = testRunner.runAffectedTests();

      // Simulate stdout data
      const stdoutCallback = mockProcess.stdout.on.mock.calls.find(call => call[0] === 'data')[1];
      stdoutCallback(testOutput);

      // Simulate process close with non-zero exit code
      const closeCallback = mockProcess.on.mock.calls.find(call => call[0] === 'close')[1];
      closeCallback(1);

      const result = await resultPromise;

      expect(result).toEqual([
        {
          name: 'should fail',
          status: 'failed',
          duration: 30,
          file: 'src/app/component.spec.ts'
        }
      ]);
    });

    it('should handle process spawn errors', async () => {
      const mockProcess = {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn()
      };

      mockSpawn.mockReturnValue(mockProcess);

      const resultPromise = testRunner.runAffectedTests();

      // Simulate process error
      const errorCallback = mockProcess.on.mock.calls.find(call => call[0] === 'error')[1];
      errorCallback(new Error('Command not found'));

      await expect(resultPromise).rejects.toThrow('Failed to start test process');
    });
  });

  describe('isNXWorkspace', () => {
    it('should return true when nx.json exists', async () => {
      (vscode.workspace.findFiles as jest.Mock).mockResolvedValue([{ fsPath: '/test/nx.json' }]);

      const result = await testRunner.isNXWorkspace();

      expect(result).toBe(true);
    });

    it('should return false when nx.json does not exist', async () => {
      (vscode.workspace.findFiles as jest.Mock).mockResolvedValue([]);

      const result = await testRunner.isNXWorkspace();

      expect(result).toBe(false);
    });

    it('should handle errors gracefully', async () => {
      (vscode.workspace.findFiles as jest.Mock).mockRejectedValue(new Error('File system error'));

      const result = await testRunner.isNXWorkspace();

      expect(result).toBe(false);
    });
  });
});