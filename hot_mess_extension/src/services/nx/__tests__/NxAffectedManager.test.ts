import { NxAffectedManager } from '../NxAffectedManager';
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';

// Mock dependencies
jest.mock('vscode');
jest.mock('fs');
jest.mock('child_process');

describe('NxAffectedManager', () => {
    let nxManager: NxAffectedManager;
    let mockContext: vscode.ExtensionContext;
    let mockSpawn: jest.Mock;

    beforeEach(() => {
        // Setup mocks
        mockContext = {
            subscriptions: [],
            extensionUri: vscode.Uri.file('/test')
        } as any;

        mockSpawn = spawn as jest.Mock;
        
        // Mock vscode.workspace
        (vscode.workspace as any).workspaceFolders = [{ uri: { fsPath: '/test/workspace' } }];
        (vscode.workspace as any).createFileSystemWatcher = jest.fn().mockReturnValue({
            onDidChange: jest.fn(),
            onDidCreate: jest.fn(),
            onDidDelete: jest.fn(),
            dispose: jest.fn()
        });

        // Mock fs
        (fs.existsSync as jest.Mock).mockReturnValue(true);
        (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify({
            projects: {
                'test-app': { root: 'apps/test-app' },
                'test-lib': { root: 'libs/test-lib' }
            }
        }));

        nxManager = new NxAffectedManager(mockContext);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('getAffectedProjects', () => {
        it('should return affected projects for a given base branch', async () => {
            // Mock spawn to return affected projects
            mockSpawn.mockImplementation(() => {
                const mockChild = {
                    stdout: {
                        on: (event: string, callback: (data: any) => void) => {
                            if (event === 'data') {
                                callback(Buffer.from('test-app\ntest-lib\n'));
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

            const result = await nxManager.getAffectedProjects('main');
            
            expect(result).toEqual(['test-app', 'test-lib']);
            expect(mockSpawn).toHaveBeenCalledWith('npx', ['nx', 'show', 'projects', '--affected', '--base', 'main'], expect.any(Object));
        });

        it('should return empty array when no affected projects', async () => {
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

            const result = await nxManager.getAffectedProjects('main');
            
            expect(result).toEqual([]);
        });

        it('should handle command errors gracefully', async () => {
            mockSpawn.mockImplementation(() => {
                const mockChild = {
                    stdout: {
                        on: jest.fn()
                    },
                    stderr: {
                        on: (event: string, callback: (data: any) => void) => {
                            if (event === 'data') {
                                callback(Buffer.from('Command failed'));
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

            const result = await nxManager.getAffectedProjects('main');
            
            expect(result).toEqual([]);
        });
    });

    describe('runAffectedCommand', () => {
        it('should successfully run affected command', async () => {
            // Mock getAffectedProjects to return test projects
            jest.spyOn(nxManager, 'getAffectedProjects').mockResolvedValue(['test-app', 'test-lib']);

            mockSpawn.mockImplementation(() => {
                const mockChild = {
                    stdout: {
                        on: (event: string, callback: (data: any) => void) => {
                            if (event === 'data') {
                                callback(Buffer.from('Tests passed successfully'));
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

            const result = await nxManager.runAffectedCommand('test', 'main');
            
            expect(result.success).toBe(true);
            expect(result.projects).toEqual(['test-app', 'test-lib']);
            expect(result.output).toContain('Tests passed successfully');
        });

        it('should handle no affected projects', async () => {
            jest.spyOn(nxManager, 'getAffectedProjects').mockResolvedValue([]);

            const result = await nxManager.runAffectedCommand('test', 'main');
            
            expect(result.success).toBe(true);
            expect(result.projects).toEqual([]);
            expect(result.output).toBe('No affected projects found');
        });

        it('should handle command failures', async () => {
            jest.spyOn(nxManager, 'getAffectedProjects').mockResolvedValue(['test-app']);

            mockSpawn.mockImplementation(() => {
                const mockChild = {
                    stdout: {
                        on: jest.fn()
                    },
                    stderr: {
                        on: (event: string, callback: (data: any) => void) => {
                            if (event === 'data') {
                                callback(Buffer.from('Test failed'));
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

            const result = await nxManager.runAffectedCommand('test', 'main');
            
            expect(result.success).toBe(false);
            expect(result.errors).toBeDefined();
            expect(result.errors![0]).toContain('Test failed');
        });
    });

    describe('getProjectConfiguration', () => {
        it('should return project configuration', async () => {
            mockSpawn.mockImplementation(() => {
                const mockChild = {
                    stdout: {
                        on: (event: string, callback: (data: any) => void) => {
                            if (event === 'data') {
                                callback(Buffer.from(JSON.stringify({
                                    root: 'apps/test-app',
                                    targets: {
                                        serve: { executor: '@angular-devkit/build-angular:dev-server' },
                                        build: { executor: '@angular-devkit/build-angular:browser' }
                                    }
                                })));
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

            const result = await nxManager.getProjectConfiguration('test-app');
            
            expect(result.name).toBe('test-app');
            expect(result.root).toBe('apps/test-app');
            expect(result.type).toBe('application');
            expect(result.targets.serve).toBeDefined();
        });

        it('should infer library type correctly', async () => {
            mockSpawn.mockImplementation(() => {
                const mockChild = {
                    stdout: {
                        on: (event: string, callback: (data: any) => void) => {
                            if (event === 'data') {
                                callback(Buffer.from(JSON.stringify({
                                    root: 'libs/test-lib',
                                    targets: {
                                        build: { executor: '@angular-devkit/build-angular:ng-packagr' }
                                    }
                                })));
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

            const result = await nxManager.getProjectConfiguration('test-lib');
            
            expect(result.type).toBe('library');
        });
    });

    describe('isNxWorkspace', () => {
        it('should return true for NX workspace', async () => {
            (fs.existsSync as jest.Mock).mockReturnValue(true);
            
            const result = await nxManager.isNxWorkspace();
            
            expect(result).toBe(true);
        });

        it('should return false for non-NX workspace', async () => {
            (fs.existsSync as jest.Mock).mockReturnValue(false);
            
            const result = await nxManager.isNxWorkspace();
            
            expect(result).toBe(false);
        });
    });

    describe('caching', () => {
        it('should cache affected projects results', async () => {
            // Mock git command for HEAD commit
            mockSpawn.mockImplementation((command, args) => {
                const mockChild = {
                    stdout: {
                        on: (event: string, callback: (data: any) => void) => {
                            if (event === 'data') {
                                if (args.includes('rev-parse')) {
                                    callback(Buffer.from('abc123'));
                                } else {
                                    callback(Buffer.from('test-app\n'));
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

            // First call
            const result1 = await nxManager.getAffectedProjects('main');
            
            // Second call should use cache
            const result2 = await nxManager.getAffectedProjects('main');
            
            expect(result1).toEqual(result2);
            expect(result1).toEqual(['test-app']);
        });
    });
});
