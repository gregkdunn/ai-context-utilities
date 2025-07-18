import { GitDiffManager } from '../GitDiffManager';
import * as vscode from 'vscode';
import { spawn } from 'child_process';

// Mock dependencies
jest.mock('vscode');
jest.mock('child_process');

describe('GitDiffManager', () => {
    let gitManager: GitDiffManager;
    let mockContext: vscode.ExtensionContext;
    let mockSpawn: jest.Mock;

    beforeEach(() => {
        mockContext = {
            subscriptions: [],
            extensionUri: vscode.Uri.file('/test')
        } as any;

        mockSpawn = spawn as jest.Mock;
        
        // Mock vscode.workspace
        (vscode.workspace as any).workspaceFolders = [{ uri: { fsPath: '/test/workspace' } }];
        
        // Mock vscode.extensions
        (vscode.extensions as any).getExtension = jest.fn().mockReturnValue({
            isActive: true,
            exports: {
                getAPI: jest.fn().mockReturnValue({
                    repositories: [{ mockRepo: true }]
                })
            }
        });

        gitManager = new GitDiffManager(mockContext);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('getCommitHistory', () => {
        it('should return commit history', async () => {
            mockSpawn.mockImplementation(() => {
                const mockChild = {
                    stdout: {
                        on: (event: string, callback: (data: any) => void) => {
                            if (event === 'data') {
                                callback(Buffer.from('abc123|Initial commit|John Doe|2023-01-01|def456\n'));
                            }
                        }
                    },
                    stderr: {
                        on: jest.fn()
                    },
                    on: (event: string, callback: (code: number) => void) => {
                        if (event === 'close') {
                            callback(0);
                        }
                    }
                };
                return mockChild;
            });

            const result = await gitManager.getCommitHistory(10);
            
            expect(result).toHaveLength(1);
            expect(result[0]).toEqual({
                hash: 'abc123',
                message: 'Initial commit',
                author: 'John Doe',
                date: '2023-01-01',
                parents: ['def456']
            });
        });

        it('should handle empty commit history', async () => {
            mockSpawn.mockImplementation(() => {
                const mockChild = {
                    stdout: {
                        on: (event: string, callback: (data: any) => void) => {
                            if (event === 'data') {
                                callback(Buffer.from(''));
                            }
                        }
                    },
                    stderr: {
                        on: jest.fn()
                    },
                    on: (event: string, callback: (code: number) => void) => {
                        if (event === 'close') {
                            callback(0);
                        }
                    }
                };
                return mockChild;
            });

            const result = await gitManager.getCommitHistory(10);
            
            expect(result).toEqual([]);
        });

        it('should handle git command errors', async () => {
            mockSpawn.mockImplementation(() => {
                const mockChild = {
                    stdout: {
                        on: jest.fn()
                    },
                    stderr: {
                        on: (event: string, callback: (data: any) => void) => {
                            if (event === 'data') {
                                callback(Buffer.from('fatal: not a git repository'));
                            }
                        }
                    },
                    on: (event: string, callback: (code: number) => void) => {
                        if (event === 'close') {
                            callback(1);
                        }
                    }
                };
                return mockChild;
            });

            const result = await gitManager.getCommitHistory(10);
            
            expect(result).toEqual([]);
        });
    });

    describe('getBranches', () => {
        it('should return local and remote branches', async () => {
            mockSpawn.mockImplementation((command, args) => {
                const mockChild = {
                    stdout: {
                        on: (event: string, callback: (data: any) => void) => {
                            if (event === 'data') {
                                if (args.includes('-r')) {
                                    // Remote branches
                                    callback(Buffer.from('  origin/main\n  origin/develop\n'));
                                } else {
                                    // Local branches
                                    callback(Buffer.from('* main\n  feature-branch\n'));
                                }
                            }
                        }
                    },
                    stderr: {
                        on: jest.fn()
                    },
                    on: (event: string, callback: (code: number) => void) => {
                        if (event === 'close') {
                            callback(0);
                        }
                    }
                };
                return mockChild;
            });

            const result = await gitManager.getBranches();
            
            expect(result).toHaveLength(3);
            expect(result).toContainEqual({ name: 'main', isRemote: false, isHead: true });
            expect(result).toContainEqual({ name: 'feature-branch', isRemote: false, isHead: false });
            expect(result).toContainEqual({ name: 'develop', isRemote: true, isHead: false });
        });
    });

    describe('getBranchDiff', () => {
        it('should return diff between branches', async () => {
            mockSpawn.mockImplementation((command, args) => {
                const mockChild = {
                    stdout: {
                        on: (event: string, callback: (data: any) => void) => {
                            if (event === 'data') {
                                if (args.includes('--name-status')) {
                                    callback(Buffer.from('M\tsrc/app/app.component.ts\nA\tsrc/app/new-file.ts\n'));
                                } else if (args.includes('--stat')) {
                                    callback(Buffer.from('2 files changed, 10 insertions(+), 5 deletions(-)\n'));
                                }
                            }
                        }
                    },
                    stderr: {
                        on: jest.fn()
                    },
                    on: (event: string, callback: (code: number) => void) => {
                        if (event === 'close') {
                            callback(0);
                        }
                    }
                };
                return mockChild;
            });

            const result = await gitManager.getBranchDiff('main', 'feature-branch');
            
            expect(result.files).toHaveLength(2);
            expect(result.files[0]).toEqual({ path: 'src/app/app.component.ts', status: 'modified' });
            expect(result.files[1]).toEqual({ path: 'src/app/new-file.ts', status: 'added' });
            expect(result.additions).toBe(10);
            expect(result.deletions).toBe(5);
        });
    });

    describe('getInteractiveDiff', () => {
        it('should return formatted diff output', async () => {
            const diffOutput = `diff --git a/src/app/app.component.ts b/src/app/app.component.ts
index 1234567..abcdefg 100644
--- a/src/app/app.component.ts
+++ b/src/app/app.component.ts
@@ -1,4 +1,4 @@
-const oldCode = 'old';
+const newCode = 'new';`;

            mockSpawn.mockImplementation(() => {
                const mockChild = {
                    stdout: {
                        on: (event: string, callback: (data: any) => void) => {
                            if (event === 'data') {
                                callback(Buffer.from(diffOutput));
                            }
                        }
                    },
                    stderr: {
                        on: jest.fn()
                    },
                    on: (event: string, callback: (code: number) => void) => {
                        if (event === 'close') {
                            callback(0);
                        }
                    }
                };
                return mockChild;
            });

            const result = await gitManager.getInteractiveDiff('commit1', 'commit2');
            
            expect(result).toContain('diff --git');
            expect(result).toContain('const newCode = \'new\';');
        });
    });

    describe('getCurrentBranch', () => {
        it('should return current branch name', async () => {
            mockSpawn.mockImplementation(() => {
                const mockChild = {
                    stdout: {
                        on: (event: string, callback: (data: any) => void) => {
                            if (event === 'data') {
                                callback(Buffer.from('feature-branch\n'));
                            }
                        }
                    },
                    stderr: {
                        on: jest.fn()
                    },
                    on: (event: string, callback: (code: number) => void) => {
                        if (event === 'close') {
                            callback(0);
                        }
                    }
                };
                return mockChild;
            });

            const result = await gitManager.getCurrentBranch();
            
            expect(result).toBe('feature-branch');
        });

        it('should return default branch on error', async () => {
            mockSpawn.mockImplementation(() => {
                const mockChild = {
                    stdout: {
                        on: jest.fn()
                    },
                    stderr: {
                        on: (event: string, callback: (data: any) => void) => {
                            if (event === 'data') {
                                callback(Buffer.from('fatal: not a git repository'));
                            }
                        }
                    },
                    on: (event: string, callback: (code: number) => void) => {
                        if (event === 'close') {
                            callback(1);
                        }
                    }
                };
                return mockChild;
            });

            const result = await gitManager.getCurrentBranch();
            
            expect(result).toBe('main');
        });
    });

    describe('isGitRepository', () => {
        it('should return true for git repository', async () => {
            mockSpawn.mockImplementation(() => {
                const mockChild = {
                    stdout: {
                        on: (event: string, callback: (data: any) => void) => {
                            if (event === 'data') {
                                callback(Buffer.from('.git\n'));
                            }
                        }
                    },
                    stderr: {
                        on: jest.fn()
                    },
                    on: (event: string, callback: (code: number) => void) => {
                        if (event === 'close') {
                            callback(0);
                        }
                    }
                };
                return mockChild;
            });

            const result = await gitManager.isGitRepository();
            
            expect(result).toBe(true);
        });

        it('should return false for non-git repository', async () => {
            mockSpawn.mockImplementation(() => {
                const mockChild = {
                    stdout: {
                        on: jest.fn()
                    },
                    stderr: {
                        on: (event: string, callback: (data: any) => void) => {
                            if (event === 'data') {
                                callback(Buffer.from('fatal: not a git repository'));
                            }
                        }
                    },
                    on: (event: string, callback: (code: number) => void) => {
                        if (event === 'close') {
                            callback(1);
                        }
                    }
                };
                return mockChild;
            });

            const result = await gitManager.isGitRepository();
            
            expect(result).toBe(false);
        });
    });
});
