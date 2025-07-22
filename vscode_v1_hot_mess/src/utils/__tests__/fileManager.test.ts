import { FileManager } from '../fileManager';
import { OutputType } from '../../types';
import * as fs from 'fs';
import * as path from 'path';

// Mock fs and path modules
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  readdirSync: jest.fn(),
  statSync: jest.fn(),
  watch: jest.fn(),
  promises: {
    writeFile: jest.fn(),
    readFile: jest.fn(),
    mkdir: jest.fn(),
    unlink: jest.fn(),
    stat: jest.fn(),
    access: jest.fn(),
    readdir: jest.fn(),
    copyFile: jest.fn()
  }
}));
jest.mock('path');

// Mock vscode module
jest.mock('vscode', () => ({
  workspace: {
    workspaceFolders: [
      { uri: { fsPath: '/test/workspace' } }
    ],
    getConfiguration: jest.fn(() => ({
      get: jest.fn((key: string) => {
        if (key === 'outputDirectory') {return '.github/instructions/ai_utilities_context';}
        return undefined;
      })
    })),
    onDidChangeConfiguration: jest.fn(),
    createFileSystemWatcher: jest.fn(() => ({
      onDidChange: jest.fn(),
      onDidCreate: jest.fn(),
      dispose: jest.fn()
    })),
    openTextDocument: jest.fn()
  },
  window: {
    showTextDocument: jest.fn(),
    showErrorMessage: jest.fn(),
    showInformationMessage: jest.fn(),
    showWarningMessage: jest.fn()
  },
  env: {
    clipboard: {
      writeText: jest.fn()
    }
  },
  Uri: {
    file: jest.fn((path: string) => ({ fsPath: path }))
  },
  RelativePattern: jest.fn()
}));

const mockedFs = fs as jest.Mocked<typeof fs>;
const mockedPath = path as jest.Mocked<typeof path>;

describe('FileManager', () => {
  let fileManager: FileManager;
  const mockWorkspaceRoot = '/test/workspace';
  const mockOutputDir = '/test/workspace/.ai-debug-output';

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup path mocks
    mockedPath.join.mockImplementation((...segments) => segments.join('/'));
    mockedPath.basename.mockImplementation((p) => p.split('/').pop() || '');
    
    // Create mock output channel
    const mockOutputChannel = {
      appendLine: jest.fn(),
      show: jest.fn(),
      hide: jest.fn(),
      dispose: jest.fn(),
      name: 'Test Output Channel'
    } as any;
    
    fileManager = new FileManager(mockOutputChannel);
  });

  describe('constructor', () => {
    it('should initialize with correct workspace root and output directory', () => {
      expect(fileManager.getOutputDirectory()).toBe(mockOutputDir);
    });
  });

  describe('ensureOutputDirectory', () => {
    it('should create directory if it does not exist', () => {
      mockedFs.existsSync.mockReturnValue(false);
      mockedFs.mkdirSync.mockImplementation(() => undefined);

      fileManager.ensureOutputDirectory();

      expect(mockedFs.mkdirSync).toHaveBeenCalledWith(mockOutputDir, { recursive: true });
    });

    it('should not create directory if it already exists', () => {
      // Since constructor calls ensureOutputDirectory, we need to clear the mock
      jest.clearAllMocks();
      mockedFs.existsSync.mockReturnValue(true);

      fileManager.ensureOutputDirectory();

      expect(mockedFs.mkdirSync).not.toHaveBeenCalled();
    });
  });

  describe('saveOutput', () => {
    it('should save content to correct file path', async () => {
      const content = 'test content';
      const type: OutputType = 'jest-output';
      
      (mockedFs.promises.writeFile as jest.Mock).mockResolvedValue(undefined);

      const result = await fileManager.saveOutput(type, content);

      expect(result).toBe('/test/workspace/.ai-debug-output/jest-output.txt');
      expect(mockedFs.promises.writeFile).toHaveBeenCalledWith(
        '/test/workspace/.ai-debug-output/jest-output.txt',
        content,
        'utf8'
      );
    });

    it('should handle file write errors', async () => {
      const content = 'test content';
      const type: OutputType = 'jest-output';
      
      (mockedFs.promises.writeFile as jest.Mock).mockRejectedValue(new Error('Write error'));

      await expect(fileManager.saveOutput(type, content)).rejects.toThrow('Failed to save jest-output output: Error: Write error');
    });
  });

  describe('getFileContent', () => {
    it('should read and return file content', async () => {
      const expectedContent = 'file content';
      const type: OutputType = 'ai-debug-context';

      mockedFs.existsSync.mockReturnValue(true);
      (mockedFs.promises.readFile as jest.Mock).mockResolvedValue(expectedContent);

      const result = await fileManager.getFileContent(type);

      expect(result).toBe(expectedContent);
      expect(mockedFs.promises.readFile).toHaveBeenCalledWith(
        '/test/workspace/.ai-debug-output/ai-debug-context.txt',
        'utf8'
      );
    });

    it('should return empty string if file does not exist', async () => {
      const type: OutputType = 'ai-debug-context';

      mockedFs.existsSync.mockReturnValue(false);

      const result = await fileManager.getFileContent(type);

      expect(result).toBe('');
    });

    it('should handle read errors gracefully', async () => {
      const type: OutputType = 'ai-debug-context';

      mockedFs.existsSync.mockReturnValue(true);
      (mockedFs.promises.readFile as jest.Mock).mockRejectedValue(new Error('Read error'));

      const result = await fileManager.getFileContent(type);

      expect(result).toBe('');
    });
  });

  describe('getFilePath', () => {
    it('should return correct file paths for all output types', () => {
      const testCases: Array<[OutputType, string]> = [
        ['ai-debug-context', '/test/workspace/.ai-debug-output/ai-debug-context.txt'],
        ['jest-output', '/test/workspace/.ai-debug-output/jest-output.txt'],
        ['diff', '/test/workspace/.ai-debug-output/diff.txt'],
        ['pr-description', '/test/workspace/.ai-debug-output/pr-description.txt'],
        ['pr-description-prompt', '/test/workspace/.ai-debug-output/pr-description-prompt.txt']
      ];

      testCases.forEach(([type, expectedPath]) => {
        expect(fileManager.getFilePath(type)).toBe(expectedPath);
      });
    });
  });

  describe('fileExists', () => {
    it('should return true when file exists', async () => {
      (mockedFs.promises.access as jest.Mock).mockResolvedValue(undefined);
      
      const result = await fileManager.fileExists('jest-output.txt');

      expect(result).toBe(true);
    });

    it('should return false when file does not exist', async () => {
      (mockedFs.promises.access as jest.Mock).mockRejectedValue(new Error('File not found'));
      
      const result = await fileManager.fileExists('nonexistent.txt');

      expect(result).toBe(false);
    });
  });

  describe('getFileModTime', () => {
    it('should return modification time when file exists', () => {
      const mockDate = new Date('2024-01-01');
      const mockStats = { mtime: mockDate };

      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.statSync.mockReturnValue(mockStats as any);

      const result = fileManager.getFileModTime('jest-output');

      expect(result).toBe(mockDate);
    });

    it('should return null when file does not exist', () => {
      mockedFs.existsSync.mockReturnValue(false);

      const result = fileManager.getFileModTime('jest-output');

      expect(result).toBeNull();
    });

    it('should handle stat errors gracefully', () => {
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.statSync.mockImplementation(() => {
        throw new Error('Stat error');
      });

      const result = fileManager.getFileModTime('jest-output');

      expect(result).toBeNull();
    });
  });

  describe('getAllOutputFiles', () => {
    it('should return dictionary of output files', () => {
      mockedFs.readdirSync.mockReturnValue(['jest-output.txt', 'diff.txt'] as any);

      const result = fileManager.getAllOutputFiles();

      expect(result).toEqual({
        'jest-output': '/test/workspace/.ai-debug-output/jest-output.txt',
        'diff': '/test/workspace/.ai-debug-output/diff.txt'
      });
    });

    it('should handle empty directory', () => {
      mockedFs.readdirSync.mockReturnValue([] as any);

      const result = fileManager.getAllOutputFiles();

      expect(result).toEqual({});
    });
  });

  describe('cleanupOldFiles', () => {
    it('should remove files older than max age', async () => {
      const oldDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000); // 10 days old
      const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days

      mockedFs.readdirSync.mockReturnValue(['old-file.txt', 'another-old.txt'] as any);
      mockedFs.statSync.mockReturnValue({ mtime: oldDate } as any);
      (mockedFs.promises.unlink as jest.Mock).mockResolvedValue(undefined);

      await fileManager.cleanupOldFiles(maxAge);

      expect(mockedFs.promises.unlink).toHaveBeenCalledTimes(2);
    });

    it('should not remove recent files', async () => {
      const recentDate = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000); // 1 day old
      const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days

      mockedFs.readdirSync.mockReturnValue(['recent-file.txt'] as any);
      mockedFs.statSync.mockReturnValue({ mtime: recentDate } as any);
      (mockedFs.promises.unlink as jest.Mock).mockResolvedValue(undefined);

      await fileManager.cleanupOldFiles(maxAge);

      expect(mockedFs.promises.unlink).not.toHaveBeenCalled();
    });

    it('should handle unlink errors gracefully', async () => {
      const oldDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
      const maxAge = 7 * 24 * 60 * 60 * 1000;

      mockedFs.readdirSync.mockReturnValue(['error-file.txt'] as any);
      mockedFs.statSync.mockReturnValue({ mtime: oldDate } as any);
      (mockedFs.promises.unlink as jest.Mock).mockRejectedValue(new Error('Unlink error'));

      // Should not throw
      await expect(fileManager.cleanupOldFiles(maxAge)).resolves.toBeUndefined();
    });
  });

  describe('copyToClipboard', () => {
    it('should copy content to clipboard when file exists', async () => {
      const mockContent = 'file content';
      const vscode = require('vscode');

      // Mock the getFileContent method
      jest.spyOn(fileManager, 'getFileContent').mockResolvedValue(mockContent);

      await fileManager.copyToClipboard('jest-output');

      expect(vscode.env.clipboard.writeText).toHaveBeenCalledWith(mockContent);
      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith('jest-output content copied to clipboard');
    });

    it('should handle errors gracefully', async () => {
      const vscode = require('vscode');

      // Mock the getFileContent method to throw an error
      jest.spyOn(fileManager, 'getFileContent').mockRejectedValue(new Error('Read error'));

      await fileManager.copyToClipboard('jest-output');

      expect(vscode.env.clipboard.writeText).not.toHaveBeenCalled();
      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith('Failed to copy jest-output to clipboard: Error: Read error');
    });
  });

  describe('openFile', () => {
    it('should open file in VSCode editor', async () => {
      const filePath = '/test/file.txt';
      const vscode = require('vscode');
      const mockDocument = { uri: { fsPath: filePath } };

      vscode.workspace.openTextDocument.mockResolvedValue(mockDocument);
      vscode.window.showTextDocument.mockResolvedValue(undefined);

      await fileManager.openFile(filePath);

      expect(vscode.workspace.openTextDocument).toHaveBeenCalledWith(filePath);
      expect(vscode.window.showTextDocument).toHaveBeenCalledWith(mockDocument);
    });

    it('should handle errors when opening file', async () => {
      const filePath = '/test/file.txt';
      const vscode = require('vscode');

      vscode.workspace.openTextDocument.mockRejectedValue(new Error('Open error'));

      await fileManager.openFile(filePath);

      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith('Failed to open file: Error: Open error');
    });
  });

  describe('watchFiles', () => {
    it('should create file system watcher and handle file changes', () => {
      const mockCallback = jest.fn();
      const mockFs = require('fs');
      
      // Mock fs.watch
      const mockWatcher = {
        close: jest.fn()
      };
      mockFs.watch = jest.fn().mockReturnValue(mockWatcher);

      const disposable = fileManager.watchFiles(mockCallback);

      expect(mockFs.watch).toHaveBeenCalledWith(
        '/test/workspace/.ai-debug-output',
        expect.any(Function)
      );
      
      // Test disposable
      disposable.dispose();
      expect(mockWatcher.close).toHaveBeenCalled();
    });
  });
});
