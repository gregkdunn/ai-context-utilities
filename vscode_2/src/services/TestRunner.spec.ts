import { TestRunner, TestExecutionOptions } from './TestRunner';
import * as vscode from 'vscode';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// Mock dependencies
jest.mock('vscode');
jest.mock('child_process');
jest.mock('fs');
jest.mock('path');

describe('TestRunner', () => {
  let testRunner: TestRunner;
  let mockContext: jest.Mocked<vscode.ExtensionContext>;
  let mockProcess: any;
  let mockWorkspace: any;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Mock VSCode workspace
    mockWorkspace = {
      workspaceFolders: [{ uri: { fsPath: '/test/workspace' } }],
      getConfiguration: jest.fn().mockReturnValue({
        get: jest.fn().mockReturnValue('.github/instructions/ai_utilities_context')
      })
    };
    (vscode.workspace as any) = mockWorkspace;

    // Mock context
    mockContext = {} as jest.Mocked<vscode.ExtensionContext>;

    // Mock child process
    mockProcess = {
      stdout: { on: jest.fn() },
      stderr: { on: jest.fn() },
      on: jest.fn(),
      kill: jest.fn()
    };
    (spawn as jest.Mock).mockReturnValue(mockProcess);

    // Mock filesystem
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.mkdirSync as jest.Mock).mockImplementation();
    (fs.writeFileSync as jest.Mock).mockImplementation();
    (fs.appendFileSync as jest.Mock).mockImplementation();
    (fs.unlinkSync as jest.Mock).mockImplementation();

    // Mock path
    (path.join as jest.Mock).mockImplementation((...args) => args.join('/'));
    (path.dirname as jest.Mock).mockImplementation((p) => p.split('/').slice(0, -1).join('/'));

    testRunner = new TestRunner(mockContext);
  });

  describe('Constructor', () => {
    it('should initialize with workspace path', () => {
      expect(testRunner).toBeDefined();
    });

    it('should get output directory from configuration', () => {
      expect(mockWorkspace.getConfiguration).toHaveBeenCalledWith('aiDebugContext');
    });
  });

  describe('executeTests', () => {
    let outputCallback: jest.Mock;
    let options: TestExecutionOptions;

    beforeEach(() => {
      outputCallback = jest.fn();
      options = {
        command: 'npx nx test app1',
        mode: 'project',
        projects: ['app1'],
        outputCallback,
        saveToFile: true
      };
    });

    it('should spawn process with correct arguments', async () => {
      // Setup process completion
      mockProcess.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'close') {
          setTimeout(() => callback(0), 10);
        }
      });

      const promise = testRunner.executeTests(options);
      
      // Wait a bit for setup
      await new Promise(resolve => setTimeout(resolve, 5));

      expect(spawn).toHaveBeenCalledWith('npx', ['nx', 'test', 'app1'], {
        cwd: '/test/workspace',
        stdio: 'pipe'
      });

      await promise;
    });

    it('should create output file when saveToFile is true', async () => {
      mockProcess.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'close') {
          setTimeout(() => callback(0), 10);
        }
      });

      const promise = testRunner.executeTests(options);
      await new Promise(resolve => setTimeout(resolve, 5));

      expect(fs.mkdirSync).toHaveBeenCalled();
      expect(fs.writeFileSync).toHaveBeenCalled();

      await promise;
    });

    it('should stream output to callback', async () => {
      mockProcess.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'close') {
          setTimeout(() => callback(0), 10);
        }
      });

      mockProcess.stdout.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'data') {
          setTimeout(() => callback(Buffer.from('Test output')), 5);
        }
      });

      const promise = testRunner.executeTests(options);
      await new Promise(resolve => setTimeout(resolve, 15));

      expect(outputCallback).toHaveBeenCalledWith('Test output');

      await promise;
    });

    it('should handle stderr output', async () => {
      mockProcess.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'close') {
          setTimeout(() => callback(0), 10);
        }
      });

      mockProcess.stderr.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'data') {
          setTimeout(() => callback(Buffer.from('Error output')), 5);
        }
      });

      const promise = testRunner.executeTests(options);
      await new Promise(resolve => setTimeout(resolve, 15));

      expect(outputCallback).toHaveBeenCalledWith('[ERROR] Error output');

      await promise;
    });

    it('should return results with exit code', async () => {
      const testOutput = `
        PASS  apps/app1/src/app/app.component.spec.ts
        ✓ should create (123ms)
      `;

      mockProcess.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'close') {
          setTimeout(() => callback(0), 10);
        }
      });

      mockProcess.stdout.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'data') {
          setTimeout(() => callback(Buffer.from(testOutput)), 5);
        }
      });

      const result = await testRunner.executeTests(options);

      expect(result.exitCode).toBe(0);
      expect(result.results).toBeDefined();
      expect(result.outputFile).toBeDefined();
    });

    it('should handle process errors', async () => {
      mockProcess.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'error') {
          setTimeout(() => callback(new Error('Process failed')), 10);
        }
      });

      await expect(testRunner.executeTests(options)).rejects.toThrow('Failed to start test process: Process failed');
    });
  });

  describe('cancelCurrentExecution', () => {
    it('should cancel running process', async () => {
      const options: TestExecutionOptions = {
        command: 'npx nx test app1',
        mode: 'project'
      };

      // Start a test execution
      const promise = testRunner.executeTests(options);
      await new Promise(resolve => setTimeout(resolve, 5));

      // Cancel it
      const cancelled = testRunner.cancelCurrentExecution();

      expect(cancelled).toBe(true);
      expect(mockProcess.kill).toHaveBeenCalledWith('SIGTERM');
    });

    it('should return false when no process is running', () => {
      const cancelled = testRunner.cancelCurrentExecution();
      expect(cancelled).toBe(false);
    });
  });

  describe('isExecutionRunning', () => {
    it('should return true when process is running', async () => {
      const options: TestExecutionOptions = {
        command: 'npx nx test app1',
        mode: 'project'
      };

      const promise = testRunner.executeTests(options);
      await new Promise(resolve => setTimeout(resolve, 5));

      expect(testRunner.isExecutionRunning()).toBe(true);
    });

    it('should return false when no process is running', () => {
      expect(testRunner.isExecutionRunning()).toBe(false);
    });
  });

  describe('runAffectedTests', () => {
    it('should call executeTestsWithCleanup with affected configuration', async () => {
      const spy = jest.spyOn(testRunner, 'executeTestsWithCleanup').mockResolvedValue({
        results: [],
        exitCode: 0
      });

      await testRunner.runAffectedTests('develop');

      expect(spy).toHaveBeenCalledWith({
        command: 'npx nx affected --target=test --base=develop --head=HEAD --output-style=stream',
        mode: 'affected',
        saveToFile: true
      });
    });
  });

  describe('runProjectTests', () => {
    it('should call executeTestsWithCleanup with project configuration', async () => {
      const spy = jest.spyOn(testRunner, 'executeTestsWithCleanup').mockResolvedValue({
        results: [],
        exitCode: 0
      });

      await testRunner.runProjectTests('app1');

      expect(spy).toHaveBeenCalledWith({
        command: 'npx nx test app1',
        mode: 'project',
        projects: ['app1'],
        saveToFile: true
      });
    });
  });

  describe('runMultipleProjectTests', () => {
    it('should call executeTestsWithCleanup with multiple projects configuration', async () => {
      const spy = jest.spyOn(testRunner, 'executeTestsWithCleanup').mockResolvedValue({
        results: [],
        exitCode: 0
      });

      await testRunner.runMultipleProjectTests(['app1', 'lib1']);

      expect(spy).toHaveBeenCalledWith({
        command: 'npx nx run-many --target=test --projects=app1,lib1',
        mode: 'project',
        projects: ['app1', 'lib1'],
        saveToFile: true
      });
    });
  });

  describe('File Operations', () => {
    const testFilePath = '/test/output.log';

    describe('openOutputFile', () => {
      it('should open file in VSCode', async () => {
        const mockDocument = {};
        const mockUri = vscode.Uri.file(testFilePath);
        
        (vscode.Uri.file as jest.Mock).mockReturnValue(mockUri);
        (vscode.workspace.openTextDocument as jest.Mock).mockResolvedValue(mockDocument);
        (vscode.window.showTextDocument as jest.Mock).mockResolvedValue(undefined);

        await testRunner.openOutputFile(testFilePath);

        expect(vscode.Uri.file).toHaveBeenCalledWith(testFilePath);
        expect(vscode.workspace.openTextDocument).toHaveBeenCalledWith(mockUri);
        expect(vscode.window.showTextDocument).toHaveBeenCalledWith(mockDocument);
      });

      it('should handle errors when opening file', async () => {
        (vscode.workspace.openTextDocument as jest.Mock).mockRejectedValue(new Error('File not found'));

        await expect(testRunner.openOutputFile(testFilePath)).rejects.toThrow('Failed to open output file: Error: File not found');
      });
    });

    describe('deleteOutputFile', () => {
      it('should delete existing file', async () => {
        (fs.existsSync as jest.Mock).mockReturnValue(true);

        await testRunner.deleteOutputFile(testFilePath);

        expect(fs.existsSync).toHaveBeenCalledWith(testFilePath);
        expect(fs.unlinkSync).toHaveBeenCalledWith(testFilePath);
      });

      it('should not throw error if file does not exist', async () => {
        (fs.existsSync as jest.Mock).mockReturnValue(false);

        await expect(testRunner.deleteOutputFile(testFilePath)).resolves.not.toThrow();
        expect(fs.unlinkSync).not.toHaveBeenCalled();
      });

      it('should handle deletion errors', async () => {
        (fs.existsSync as jest.Mock).mockReturnValue(true);
        (fs.unlinkSync as jest.Mock).mockImplementation(() => {
          throw new Error('Permission denied');
        });

        await expect(testRunner.deleteOutputFile(testFilePath)).rejects.toThrow('Failed to delete output file: Error: Permission denied');
      });
    });
  });

  describe('Directory Management', () => {
    describe('getOutputDirectory', () => {
      it('should return full output directory path', () => {
        const result = testRunner.getOutputDirectory();
        expect(result).toBe('/test/workspace/.github/instructions/ai_utilities_context');
      });
    });

    describe('setOutputDirectory', () => {
      it('should update output directory', () => {
        testRunner.setOutputDirectory('new/output/dir');
        const result = testRunner.getOutputDirectory();
        expect(result).toBe('/test/workspace/new/output/dir');
      });
    });
  });

  describe('isNXWorkspace', () => {
    it('should return true when nx.json exists', async () => {
      (vscode.workspace.findFiles as jest.Mock).mockResolvedValue([{ uri: 'nx.json' }]);

      const result = await testRunner.isNXWorkspace();

      expect(result).toBe(true);
      expect(vscode.workspace.findFiles).toHaveBeenCalledWith('nx.json', null, 1);
    });

    it('should return false when nx.json does not exist', async () => {
      (vscode.workspace.findFiles as jest.Mock).mockResolvedValue([]);

      const result = await testRunner.isNXWorkspace();

      expect(result).toBe(false);
    });

    it('should return false on error', async () => {
      (vscode.workspace.findFiles as jest.Mock).mockRejectedValue(new Error('Search failed'));

      const result = await testRunner.isNXWorkspace();

      expect(result).toBe(false);
    });
  });

  describe('parseTestResults', () => {
    it('should parse Jest test output', async () => {
      const jestOutput = `
        PASS  src/app.component.spec.ts
        ✓ should create (123ms)
        ✓ should render title (45ms)
        FAIL  src/service.spec.ts
        ✗ should handle error (67ms)
      `;

      mockProcess.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'close') {
          setTimeout(() => callback(0), 10);
        }
      });

      mockProcess.stdout.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'data') {
          setTimeout(() => callback(Buffer.from(jestOutput)), 5);
        }
      });

      const options: TestExecutionOptions = {
        command: 'npx nx test app1',
        mode: 'project'
      };

      const result = await testRunner.executeTests(options);

      expect(result.results).toHaveLength(2); // Should parse PASS/FAIL as suite results
      expect(result.results[0].status).toBe('passed');
      expect(result.results[1].status).toBe('failed');
    });

    it('should handle empty output', async () => {
      mockProcess.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'close') {
          setTimeout(() => callback(0), 10);
        }
      });

      mockProcess.stdout.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'data') {
          setTimeout(() => callback(Buffer.from('')), 5);
        }
      });

      const options: TestExecutionOptions = {
        command: 'npx nx test app1',
        mode: 'project'
      };

      const result = await testRunner.executeTests(options);

      expect(result.results).toEqual([]);
    });
  });
});
