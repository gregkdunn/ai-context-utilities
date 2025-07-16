import { FileManager } from '../fileManager';
import { OutputType } from '../../types';
import * as fs from 'fs';
import * as path from 'path';

// Mock fs and path modules
jest.mock('fs');
jest.mock('path');

// Mock vscode module
jest.mock('vscode', () => ({
  workspace: {
    workspaceFolders: [
      { uri: { fsPath: '/test/workspace' } }
    ],
    getConfiguration: jest.fn(() => ({
      get: jest.fn((key: string) => {
        if (key === 'outputDirectory') return '.github/instructions/ai_utilities_context';
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
  const mockOutputDir = '/test/workspace/.github/instructions/ai_utilities_context';

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup path mocks
    mockedPath.join.mockImplementation((...segments) => segments.join('/'));
    mockedPath.basename.mockImplementation((p) => p.split('/').pop() || '');
    
    fileManager = new FileManager();
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
      mockedFs.existsSync.mockReturnValue(true);

      fileManager.ensureOutputDirectory();

      expect(mockedFs.mkdirSync).not.toHaveBeenCalled();
    });
  });

  describe('saveOutput', () => {
    it('should save content to correct file path', async () => {
      const content = 'test content';
      const type: OutputType = 'jest-output';
      
      mockedFs.existsSync.mockReturnValue(false);
      mockedFs.mkdirSync.mockImplementation(() => undefined);
      mockedFs.writeFileSync.mockImplementation(() => undefined);

      const result = await fileManager.saveOutput(type, content);

      expect(result).toBe('/test/workspace/.github/instructions/ai_utilities_context/jest-output.txt');
      expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
        '/test/workspace/.github/instructions/ai_utilities_context/jest-output.txt',
        content,
        'utf8'
      );
    });

    it('should handle file write errors', async () => {
      const content = 'test content';
      const type: OutputType = 'jest-output';
      
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.writeFileSync.mockImplementation(() => {
        throw new Error('Write error');
      });

      await expect(fileManager.saveOutput(type, content)).rejects.toThrow('Failed to save jest-output output: Error: Write error');
    });
  });

  describe('getFileContent', () => {
    it('should read and return file content', async () => {
      const expectedContent = 'file content';
      const type: OutputType = 'ai-debug-context';

      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(expectedContent);

      const result = await fileManager.getFileContent(type);

      expect(result).toBe(expectedContent);
      expect(mockedFs.readFileSync).toHaveBeenCalledWith(
        '/test/workspace/.github/instructions/ai_utilities_context/ai-debug-context.txt',
        'utf8'
      );
    });

    it('should return null if file does not exist', async () => {
      const type: OutputType = 'ai-debug-context';

      mockedFs.existsSync.mockReturnValue(false);

      const result = await fileManager.getFileContent(type);

      expect(result).toBeNull();
      expect(mockedFs.readFileSync).not.toHaveBeenCalled();
    });

    it('should handle read errors gracefully', async () => {
      const type: OutputType = 'ai-debug-context';

      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockImplementation(() => {
        throw new Error('Read error');
      });

      const result = await fileManager.getFileContent(type);

      expect(result).toBeNull();
    });
  });

  describe('getFilePath', () => {
    it('should return correct file paths for all output types', () => {
      const testCases: Array<[OutputType, string]> = [
        ['ai-debug-context', '/test/workspace/.github/instructions/ai_utilities_context/ai-debug-context.txt'],
        ['jest-output', '/test/workspace/.github/instructions/ai_utilities_context/jest-output.txt'],
        ['diff', '/test/workspace/.github/instructions/ai_utilities_context/diff.txt'],
        ['pr-description', '/test/workspace/.github/instructions/ai_utilities_context/pr-description-prompt.txt']
      ];

      testCases.forEach(([type, expectedPath]) => {
        expect(fileManager.getFilePath(type)).toBe(expectedPath);
      });
    });
  });

  describe('fileExists', () => {
    it('should return true when file exists', () => {
      mockedFs.existsSync.mockReturnValue(true);

      const result = fileManager.fileExists('jest-output');

      expect(result).toBe(true);
      expect(mockedFs.existsSync).toHaveBeenCalledWith(
        '/test/workspace/.github/instructions/ai_utilities_context/jest-output.txt'
      );
    });

    it('should return false when file does not exist', () => {
      mockedFs.existsSync.mockReturnValue(false);

      const result = fileManager.fileExists('jest-output');

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
    it('should return metadata for all output file types', () => {
      const mockDate = new Date('2024-01-01');
      
      mockedFs.existsSync.mockImplementation((filePath) => {
        return String(filePath).includes('jest-output.txt') || String(filePath).includes('diff.txt');
      });
      
      mockedFs.statSync.mockReturnValue({ mtime: mockDate } as any);

      const result = fileManager.getAllOutputFiles();

      expect(result).toHaveLength(4);
      expect(result[0]).toEqual({
        type: 'ai-debug-context',
        path: '/test/workspace/.github/instructions/ai_utilities_context/ai-debug-context.txt',
        exists: false,
        modified: undefined
      });
      expect(result[1]).toEqual({
        type: 'jest-output',
        path: '/test/workspace/.github/instructions/ai_utilities_context/jest-output.txt',
        exists: true,
        modified: mockDate
      });
    });
  });

  describe('cleanupOldFiles', () => {
    it('should remove files older than max age', async () => {
      const oldDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000); // 10 days old
      const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days

      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.statSync.mockReturnValue({ mtime: oldDate } as any);
      mockedFs.unlinkSync.mockImplementation(() => undefined);

      await fileManager.cleanupOldFiles(maxAge);

      expect(mockedFs.unlinkSync).toHaveBeenCalledTimes(4); // All 4 file types
    });

    it('should not remove recent files', async () => {
      const recentDate = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000); // 1 day old
      const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days

      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.statSync.mockReturnValue({ mtime: recentDate } as any);

      await fileManager.cleanupOldFiles(maxAge);

      expect(mockedFs.unlinkSync).not.toHaveBeenCalled();
    });

    it('should handle unlink errors gracefully', async () => {
      const oldDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
      const maxAge = 7 * 24 * 60 * 60 * 1000;

      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.statSync.mockReturnValue({ mtime: oldDate } as any);
      mockedFs.unlinkSync.mockImplementation(() => {
        throw new Error('Unlink error');
      });

      // Should not throw
      await expect(fileManager.cleanupOldFiles(maxAge)).resolves.toBeUndefined();
    });
  });

  describe('copyToClipboard', () => {
    it('should copy content to clipboard when file exists', async () => {
      const mockContent = 'file content';
      const vscode = require('vscode');

      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(mockContent);

      await fileManager.copyToClipboard('jest-output');

      expect(vscode.env.clipboard.writeText).toHaveBeenCalledWith(mockContent);
      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith('jest-output content copied to clipboard');
    });

    it('should show warning when file does not exist', async () => {
      const vscode = require('vscode');

      mockedFs.existsSync.mockReturnValue(false);

      await fileManager.copyToClipboard('jest-output');

      expect(vscode.env.clipboard.writeText).not.toHaveBeenCalled();
      expect(vscode.window.showWarningMessage).toHaveBeenCalledWith('No jest-output file found');
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

      expect(vscode.workspace.openTextDocument).toHaveBeenCalledWith({ fsPath: filePath });
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
      const vscode = require('vscode');
      const mockWatcher = {
        onDidChange: jest.fn(),
        onDidCreate: jest.fn(),
        dispose: jest.fn()
      };
      const mockCallback = jest.fn();

      vscode.workspace.createFileSystemWatcher.mockReturnValue(mockWatcher);

      const disposable = fileManager.watchFiles(mockCallback);

      expect(vscode.workspace.createFileSystemWatcher).toHaveBeenCalledWith(
        expect.objectContaining({})
      );
      expect(mockWatcher.onDidChange).toHaveBeenCalled();
      expect(mockWatcher.onDidCreate).toHaveBeenCalled();
    });
  });

  describe('private methods', () => {
    describe('getFileName', () => {
      it('should return correct file names for all output types', () => {
        // Access private method through any casting
        const getFileName = (fileManager as any).getFileName.bind(fileManager);

        expect(getFileName('ai-debug-context')).toBe('ai-debug-context.txt');
        expect(getFileName('jest-output')).toBe('jest-output.txt');
        expect(getFileName('diff')).toBe('diff.txt');
        expect(getFileName('pr-description')).toBe('pr-description-prompt.txt');
      });

      it('should throw error for unknown output type', () => {
        const getFileName = (fileManager as any).getFileName.bind(fileManager);

        expect(() => getFileName('unknown')).toThrow('Unknown output type: unknown');
      });
    });

    describe('getTypeFromFileName', () => {
      it('should return correct types for all file names', () => {
        const getTypeFromFileName = (fileManager as any).getTypeFromFileName.bind(fileManager);

        expect(getTypeFromFileName('ai-debug-context.txt')).toBe('ai-debug-context');
        expect(getTypeFromFileName('jest-output.txt')).toBe('jest-output');
        expect(getTypeFromFileName('diff.txt')).toBe('diff');
        expect(getTypeFromFileName('pr-description-prompt.txt')).toBe('pr-description');
      });

      it('should return null for unknown file names', () => {
        const getTypeFromFileName = (fileManager as any).getTypeFromFileName.bind(fileManager);

        expect(getTypeFromFileName('unknown.txt')).toBeNull();
      });
    });
  });
});
