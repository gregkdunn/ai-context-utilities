import * as vscode from 'vscode';
import { GitIntegration } from '../services/GitIntegration';
import { createMockExtensionContext } from './test-utils';

// Mock simple-git
jest.mock('simple-git', () => {
  return {
    simpleGit: jest.fn()
  };
});

describe('GitIntegration', () => {
  let gitIntegration: GitIntegration;
  let mockContext: vscode.ExtensionContext;
  let mockGit: any;

  beforeEach(() => {
    // Setup mocks
    mockContext = createMockExtensionContext();

    // Mock simple-git
    mockGit = {
      status: jest.fn(),
      log: jest.fn(),
      diff: jest.fn(),
      show: jest.fn(),
      revparse: jest.fn()
    };

    const { simpleGit } = require('simple-git');
    (simpleGit as jest.Mock).mockReturnValue(mockGit);

    gitIntegration = new GitIntegration(mockContext);
  });

  describe('getUncommittedChanges', () => {
    it('should return formatted file changes', async () => {
      mockGit.status.mockResolvedValue({
        modified: ['file1.ts', 'file2.ts'],
        created: ['file3.ts'],
        deleted: ['file4.ts']
      });

      const result = await gitIntegration.getUncommittedChanges();

      expect(result).toEqual([
        { path: 'file1.ts', status: 'modified' },
        { path: 'file2.ts', status: 'modified' },
        { path: 'file3.ts', status: 'added' },
        { path: 'file4.ts', status: 'deleted' }
      ]);
    });

    it('should handle git status errors', async () => {
      mockGit.status.mockRejectedValue(new Error('Git error'));

      await expect(gitIntegration.getUncommittedChanges()).rejects.toThrow('Failed to get uncommitted changes');
    });
  });

  describe('getCommitHistory', () => {
    it('should return formatted commit history', async () => {
      mockGit.log.mockResolvedValue({
        all: [
          {
            hash: 'abc123',
            message: 'Test commit',
            author_name: 'Test Author',
            date: '2024-01-01T00:00:00.000Z'
          }
        ]
      });

      const result = await gitIntegration.getCommitHistory();

      expect(result).toEqual([
        {
          hash: 'abc123',
          message: 'Test commit',
          author: 'Test Author',
          date: new Date('2024-01-01T00:00:00.000Z'),
          files: []
        }
      ]);
    });

    it('should handle missing author names', async () => {
      mockGit.log.mockResolvedValue({
        all: [
          {
            hash: 'abc123',
            message: 'Test commit',
            author_name: null,
            date: '2024-01-01T00:00:00.000Z'
          }
        ]
      });

      const result = await gitIntegration.getCommitHistory();

      expect(result[0].author).toBe('Unknown');
    });
  });

  describe('getCurrentBranch', () => {
    it('should return current branch name', async () => {
      mockGit.revparse.mockResolvedValue('feature-branch');

      const result = await gitIntegration.getCurrentBranch();

      expect(result).toBe('feature-branch');
    });

    it('should return unknown on error', async () => {
      mockGit.revparse.mockRejectedValue(new Error('Git error'));

      const result = await gitIntegration.getCurrentBranch();

      expect(result).toBe('unknown');
    });
  });

  describe('isGitRepository', () => {
    it('should return true for valid git repository', async () => {
      mockGit.revparse.mockResolvedValue('.git');

      const result = await gitIntegration.isGitRepository();

      expect(result).toBe(true);
    });

    it('should return false for invalid git repository', async () => {
      mockGit.revparse.mockRejectedValue(new Error('Not a git repository'));

      const result = await gitIntegration.isGitRepository();

      expect(result).toBe(false);
    });
  });
});