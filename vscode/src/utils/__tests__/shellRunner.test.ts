import { CommandRunner } from '../shellRunner';
import { CommandOptions, CommandResult } from '../../types';
import { spawn } from 'child_process';
import { EventEmitter } from 'events';

// Mock child_process
jest.mock('child_process');

// Mock vscode module
jest.mock('vscode', () => ({
  workspace: {
    workspaceFolders: [
      { uri: { fsPath: '/test/workspace' } }
    ],
    getConfiguration: jest.fn(() => ({
      get: jest.fn((key: string) => {
        if (key === 'outputDirectory') return '.github/instructions/ai_utilities_context';
        if (key === 'terminalIntegration') return true;
        return undefined;
      })
    }))
  },
  window: {
    terminals: [],
    createTerminal: jest.fn(() => ({
      name: 'AI Debug Utilities',
      sendText: jest.fn()
    }))
  }
}));

const mockedSpawn = spawn as jest.MockedFunction<typeof spawn>;

class MockChildProcess extends EventEmitter {
  stdout = new EventEmitter();
  stderr = new EventEmitter();
  
  kill = jest.fn();
  
  constructor() {
    super();
  }
}

describe('CommandRunner', () => {
  let commandRunner: CommandRunner;
  let mockProcess: MockChildProcess;

  beforeEach(() => {
    jest.clearAllMocks();
    commandRunner = new CommandRunner();
    mockProcess = new MockChildProcess();
  });

  describe('runAiDebug', () => {
    it('should execute aiDebug command with correct arguments', async () => {
      const project = 'test-project';
      const options: CommandOptions = {
        quick: true,
        fullContext: false,
        focus: 'tests'
      };

      mockedSpawn.mockReturnValue(mockProcess as any);

      // Execute the command in background
      const resultPromise = commandRunner.runAiDebug(project, options);

      // Simulate successful execution
      setTimeout(() => {
        mockProcess.stdout.emit('data', 'Test output');
        mockProcess.emit('close', 0);
      }, 10);

      const result = await resultPromise;

      expect(mockedSpawn).toHaveBeenCalledWith(
        'yarn',
        ['nx', 'test', project, '--verbose'],
        {
          cwd: '/test/workspace',
          shell: true
        }
      );

      expect(result).toEqual({
        success: true,
        exitCode: 0,
        output: 'Test output',
        error: undefined,
        duration: expect.any(Number),
        outputFiles: [
          '.github/instructions/ai_utilities_context/ai-debug-context.txt',
          '.github/instructions/ai_utilities_context/jest-output.txt',
          '.github/instructions/ai_utilities_context/diff.txt'
        ]
      });
    });

    it('should handle command with all options', async () => {
      const project = 'test-project';
      const options: CommandOptions = {
        quick: true,
        fullContext: true,
        noDiff: true,
        focus: 'performance'
      };

      mockedSpawn.mockReturnValue(mockProcess as any);

      const resultPromise = commandRunner.runAiDebug(project, options);

      setTimeout(() => {
        mockProcess.emit('close', 0);
      }, 10);

      await resultPromise;

      // Note: Currently the implementation doesn't use the options,
      // but the test verifies the interface works correctly
      expect(mockedSpawn).toHaveBeenCalled();
    });
  });

  describe('runNxTest', () => {
    it('should execute nxTest command with correct arguments', async () => {
      const project = 'test-project';
      const options: CommandOptions = {
        useExpected: true,
        fullOutput: false
      };

      mockedSpawn.mockReturnValue(mockProcess as any);

      const resultPromise = commandRunner.runNxTest(project, options);

      setTimeout(() => {
        mockProcess.stdout.emit('data', 'Test execution output');
        mockProcess.emit('close', 0);
      }, 10);

      const result = await resultPromise;

      expect(mockedSpawn).toHaveBeenCalledWith(
        'yarn',
        ['nx', 'test', project, '--verbose'],
        {
          cwd: '/test/workspace',
          shell: true
        }
      );

      expect(result.success).toBe(true);
      expect(result.output).toBe('Test execution output');
      expect(result.outputFiles).toEqual([
        '.github/instructions/ai_utilities_context/jest-output.txt'
      ]);
    });
  });

  describe('runGitDiff', () => {
    it('should execute git diff command', async () => {
      mockedSpawn.mockReturnValue(mockProcess as any);

      const resultPromise = commandRunner.runGitDiff();

      setTimeout(() => {
        mockProcess.stdout.emit('data', 'diff output');
        mockProcess.emit('close', 0);
      }, 10);

      const result = await resultPromise;

      expect(mockedSpawn).toHaveBeenCalledWith(
        'git',
        ['diff'],
        {
          cwd: '/test/workspace',
          shell: true
        }
      );

      expect(result.success).toBe(true);
      expect(result.outputFiles).toEqual([
        '.github/instructions/ai_utilities_context/diff.txt'
      ]);
    });
  });

  describe('runPrepareToPush', () => {
    it('should execute prepareToPush command', async () => {
      const project = 'test-project';
      
      mockedSpawn.mockReturnValue(mockProcess as any);

      const resultPromise = commandRunner.runPrepareToPush(project);

      setTimeout(() => {
        mockProcess.stdout.emit('data', 'Linting output');
        mockProcess.emit('close', 0);
      }, 10);

      const result = await resultPromise;

      expect(mockedSpawn).toHaveBeenCalledWith(
        'yarn',
        ['nx', 'lint', project],
        {
          cwd: '/test/workspace',
          shell: true
        }
      );

      expect(result.success).toBe(true);
      expect(result.outputFiles).toEqual([]);
    });
  });

  describe('error handling', () => {
    it('should handle command execution errors', async () => {
      mockedSpawn.mockReturnValue(mockProcess as any);

      const resultPromise = commandRunner.runNxTest('test-project');

      setTimeout(() => {
        mockProcess.emit('error', new Error('Command not found'));
      }, 10);

      const result = await resultPromise;

      expect(result).toEqual({
        success: false,
        exitCode: 1,
        output: '',
        error: 'Command not found',
        duration: expect.any(Number)
      });
    });

    it('should handle non-zero exit codes', async () => {
      mockedSpawn.mockReturnValue(mockProcess as any);

      const resultPromise = commandRunner.runNxTest('test-project');

      setTimeout(() => {
        mockProcess.stderr.emit('data', 'Error message');
        mockProcess.emit('close', 1);
      }, 10);

      const result = await resultPromise;

      expect(result).toEqual({
        success: false,
        exitCode: 1,
        output: '',
        error: 'Error message',
        duration: expect.any(Number),
        outputFiles: [
          '.github/instructions/ai_utilities_context/jest-output.txt'
        ]
      });
    });

    it('should handle both stdout and stderr output', async () => {
      mockedSpawn.mockReturnValue(mockProcess as any);

      const resultPromise = commandRunner.runNxTest('test-project');

      setTimeout(() => {
        mockProcess.stdout.emit('data', 'Normal output');
        mockProcess.stderr.emit('data', 'Warning message');
        mockProcess.emit('close', 0);
      }, 10);

      const result = await resultPromise;

      expect(result.output).toBe('Normal output');
      expect(result.error).toBe('Warning message');
      expect(result.success).toBe(true);
    });
  });

  describe('terminal integration', () => {
    it('should send output to terminal when enabled', async () => {
      const vscode = require('vscode');
      const mockTerminal = {
        name: 'AI Debug Utilities',
        sendText: jest.fn()
      };

      vscode.window.createTerminal.mockReturnValue(mockTerminal);
      mockedSpawn.mockReturnValue(mockProcess as any);

      const resultPromise = commandRunner.runNxTest('test-project');

      setTimeout(() => {
        mockProcess.stdout.emit('data', 'Output to terminal');
        mockProcess.emit('close', 0);
      }, 10);

      await resultPromise;

      expect(mockTerminal.sendText).toHaveBeenCalledWith('Output to terminal', false);
    });

    it('should reuse existing terminal if available', async () => {
      const vscode = require('vscode');
      const existingTerminal = {
        name: 'AI Debug Utilities',
        sendText: jest.fn()
      };

      vscode.window.terminals = [existingTerminal];
      mockedSpawn.mockReturnValue(mockProcess as any);

      const resultPromise = commandRunner.runNxTest('test-project');

      setTimeout(() => {
        mockProcess.stdout.emit('data', 'Reusing terminal');
        mockProcess.emit('close', 0);
      }, 10);

      await resultPromise;

      expect(vscode.window.createTerminal).not.toHaveBeenCalled();
      expect(existingTerminal.sendText).toHaveBeenCalledWith('Reusing terminal', false);
    });
  });

  describe('process management', () => {
    it('should track running process', () => {
      mockedSpawn.mockReturnValue(mockProcess as any);

      expect(commandRunner.isRunning()).toBe(false);

      commandRunner.runNxTest('test-project');

      expect(commandRunner.isRunning()).toBe(true);
    });

    it('should clear process reference when command completes', async () => {
      mockedSpawn.mockReturnValue(mockProcess as any);

      const resultPromise = commandRunner.runNxTest('test-project');

      expect(commandRunner.isRunning()).toBe(true);

      setTimeout(() => {
        mockProcess.emit('close', 0);
      }, 10);

      await resultPromise;

      expect(commandRunner.isRunning()).toBe(false);
    });

    it('should cancel running process', () => {
      mockedSpawn.mockReturnValue(mockProcess as any);

      commandRunner.runNxTest('test-project');

      expect(commandRunner.isRunning()).toBe(true);

      commandRunner.cancel();

      expect(mockProcess.kill).toHaveBeenCalledWith('SIGTERM');
      expect(commandRunner.isRunning()).toBe(false);
    });

    it('should handle cancel when no process is running', () => {
      expect(commandRunner.isRunning()).toBe(false);

      // Should not throw
      expect(() => commandRunner.cancel()).not.toThrow();
    });
  });

  describe('mapToYarnCommands', () => {
    it('should map unknown commands to echo', async () => {
      mockedSpawn.mockReturnValue(mockProcess as any);

      // Access private method through any casting
      const mapToYarnCommands = (commandRunner as any).mapToYarnCommands.bind(commandRunner);
      
      const result = mapToYarnCommands('unknownCommand', ['project']);

      expect(result).toEqual({
        command: 'echo',
        commandArgs: ['Unknown command: unknownCommand']
      });
    });
  });

  describe('getExpectedOutputFiles', () => {
    it('should return correct output files for each command', () => {
      const getExpectedOutputFiles = (commandRunner as any).getExpectedOutputFiles.bind(commandRunner);

      expect(getExpectedOutputFiles('aiDebug')).toEqual([
        '.github/instructions/ai_utilities_context/ai-debug-context.txt',
        '.github/instructions/ai_utilities_context/jest-output.txt',
        '.github/instructions/ai_utilities_context/diff.txt'
      ]);

      expect(getExpectedOutputFiles('nxTest')).toEqual([
        '.github/instructions/ai_utilities_context/jest-output.txt'
      ]);

      expect(getExpectedOutputFiles('gitDiff')).toEqual([
        '.github/instructions/ai_utilities_context/diff.txt'
      ]);

      expect(getExpectedOutputFiles('prepareToPush')).toEqual([]);

      expect(getExpectedOutputFiles('unknown')).toEqual([]);
    });
  });
});
