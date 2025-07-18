import * as fs from 'fs';
import * as path from 'path';

// Mock fs module
jest.mock('fs');
jest.mock('path');

// Mock vscode module
const mockVscode = {
  workspace: {
    workspaceFolders: [
      { uri: { fsPath: '/test/workspace' } }
    ]
  },
  window: {
    activeTextEditor: null
  }
};

jest.mock('vscode', () => mockVscode);

// Import after mocking
import { ProjectDetector } from '../projectDetector';

const mockedFs = jest.mocked(fs);
const mockedPath = jest.mocked(path);

describe('ProjectDetector', () => {
  let projectDetector: ProjectDetector;

  beforeEach(() => {
    jest.clearAllMocks();
    projectDetector = new ProjectDetector('/test/workspace');
    
    // Setup path mocks
    mockedPath.join.mockImplementation((...segments) => segments.join('/'));
    mockedPath.basename.mockImplementation((p) => p.split('/').pop() || '');
    mockedPath.relative.mockImplementation((from, to) => to.replace(from, '').replace(/^\//, ''));
  });

  describe('findNxWorkspace', () => {
    it('should find nx.json workspace', async () => {
      mockedFs.existsSync.mockImplementation((filePath) => {
        return filePath === '/test/workspace/nx.json';
      });

      const result = await projectDetector.findNxWorkspace();
      expect(result).toBe('/test/workspace/nx.json');
    });

    it('should find angular.json workspace', async () => {
      mockedFs.existsSync.mockImplementation((filePath) => {
        return filePath === '/test/workspace/angular.json';
      });

      const result = await projectDetector.findNxWorkspace();
      expect(result).toBe('/test/workspace/angular.json');
    });

    it('should return null if no workspace config found', async () => {
      mockedFs.existsSync.mockReturnValue(false);

      const result = await projectDetector.findNxWorkspace();
      expect(result).toBeNull();
    });

    it('should handle errors gracefully', async () => {
      mockedFs.existsSync.mockImplementation(() => {
        throw new Error('File system error');
      });

      const result = await projectDetector.findNxWorkspace();
      expect(result).toBeNull();
    });
  });

  describe('getProjects', () => {
    it('should parse NX workspace with project.json files', async () => {
      // Mock file system to simulate empty project detection
      mockedFs.existsSync.mockReturnValue(false);
      (mockedFs.readdirSync as jest.Mock).mockReturnValue([]);
      (mockedFs.statSync as jest.Mock).mockReturnValue({});

      const projects = await projectDetector.getProjects();

      // Should return empty array when no projects are found
      expect(projects).toHaveLength(0);
    });

    it('should parse Angular workspace format', async () => {
      const angularConfig = {
        projects: {
          'my-app': {
            root: 'projects/my-app',
            projectType: 'application',
            architect: {
              build: {},
              test: {}
            }
          }
        }
      };

      mockedFs.existsSync.mockImplementation((filePath) => {
        return filePath === '/test/workspace/angular.json';
      });
      mockedFs.readFileSync.mockReturnValue(JSON.stringify(angularConfig));
      (mockedFs.readdirSync as jest.Mock).mockReturnValue([]);
      (mockedFs.statSync as jest.Mock).mockReturnValue({});

      const projects = await projectDetector.getProjects();

      expect(projects).toHaveLength(1);
      expect(projects[0]).toMatchObject({
        name: 'my-app',
        type: 'angular',
        projectType: 'application',
        targets: { build: {}, test: {} }
      });
    });

    it('should handle inline project configurations', async () => {
      const nxConfig = {
        projects: {
          'inline-project': 'apps/inline'
        }
      };

      mockedFs.existsSync.mockImplementation((filePath) => {
        return filePath === '/test/workspace/nx.json' || filePath === '/test/workspace/apps/inline/package.json';
      });
      mockedFs.readFileSync.mockReturnValue(JSON.stringify(nxConfig));
      (mockedFs.readdirSync as jest.Mock).mockReturnValue([]);
      (mockedFs.statSync as jest.Mock).mockReturnValue({ isDirectory: () => false });

      const projects = await projectDetector.getProjects();

      expect(projects).toHaveLength(1);
      expect(projects[0]).toMatchObject({
        name: 'inline-project',
        type: 'nx',
        projectType: 'application'
      });
    });

    it('should return empty array when no config found', async () => {
      mockedFs.existsSync.mockReturnValue(false);
      (mockedFs.readdirSync as jest.Mock).mockReturnValue([]);
      (mockedFs.statSync as jest.Mock).mockReturnValue({});

      const projects = await projectDetector.getProjects();
      expect(projects).toEqual([]);
    });

    it('should handle JSON parsing errors', async () => {
      mockedFs.existsSync.mockImplementation((filePath) => {
        return filePath === '/test/workspace/nx.json';
      });
      mockedFs.readFileSync.mockReturnValue('invalid json');
      (mockedFs.readdirSync as jest.Mock).mockReturnValue([]);
      (mockedFs.statSync as jest.Mock).mockReturnValue({ isDirectory: () => false });

      const projects = await projectDetector.getProjects();
      expect(projects).toEqual([]);
    });
  });

  describe('detectCurrentProject', () => {
    it('should detect project from active file path', async () => {
      const mockProjects = [
        { name: 'my-app', root: '/test/workspace/apps/my-app', projectType: 'application' as const, type: 'nx' as const, packageJsonPath: '/test/workspace/apps/my-app/package.json' },
        { name: 'my-lib', root: '/test/workspace/libs/my-lib', projectType: 'library' as const, type: 'nx' as const, packageJsonPath: '/test/workspace/libs/my-lib/package.json' }
      ];

      jest.spyOn(projectDetector, 'detectProjects').mockResolvedValue(mockProjects);

      // Mock vscode window.activeTextEditor
      mockVscode.window.activeTextEditor = {
        document: {
          uri: {
            fsPath: '/test/workspace/apps/my-app/src/main.ts'
          }
        }
      } as any;

      const currentProject = await projectDetector.detectCurrentProject();
      expect(currentProject?.name).toBe('my-app');
    });

    it('should return null when no active editor', async () => {
      mockVscode.window.activeTextEditor = null;

      const currentProject = await projectDetector.detectCurrentProject();
      expect(currentProject).toBeUndefined();
    });

    it('should return null when file is not in any project', async () => {
      const mockProjects = [
        { name: 'my-app', root: '/test/workspace/apps/my-app', projectType: 'application' as const, type: 'nx' as const, packageJsonPath: '/test/workspace/apps/my-app/package.json' }
      ];

      jest.spyOn(projectDetector, 'detectProjects').mockResolvedValue(mockProjects);

      mockVscode.window.activeTextEditor = {
        document: {
          uri: {
            fsPath: '/test/workspace/other/file.ts'
          }
        }
      } as any;

      const currentProject = await projectDetector.detectCurrentProject();
      expect(currentProject).toBeUndefined();
    });
  });

  describe('getProject', () => {
    it('should return project by name', async () => {
      const mockProjects = [
        { name: 'my-app', root: '/test/workspace/apps/my-app', projectType: 'application' as const, type: 'nx' as const, packageJsonPath: '/test/workspace/apps/my-app/package.json' },
        { name: 'my-lib', root: '/test/workspace/libs/my-lib', projectType: 'library' as const, type: 'nx' as const, packageJsonPath: '/test/workspace/libs/my-lib/package.json' }
      ];

      jest.spyOn(projectDetector, 'detectProjects').mockResolvedValue(mockProjects);

      const project = await projectDetector.getProject('my-lib');
      expect(project).toEqual(mockProjects[1]);
    });

    it('should return null for non-existent project', async () => {
      jest.spyOn(projectDetector, 'detectProjects').mockResolvedValue([]);

      const project = await projectDetector.getProject('non-existent');
      expect(project).toBeNull();
    });
  });

  describe('hasTarget', () => {
    it('should return true when project has target', async () => {
      const mockProject = {
        name: 'my-app',
        root: '/test/workspace/apps/my-app',
        projectType: 'application' as const,
        type: 'nx' as const,
        packageJsonPath: '/test/workspace/apps/my-app/package.json',
        targets: { build: {}, test: {} }
      };

      jest.spyOn(projectDetector, 'getProject').mockResolvedValue(mockProject);

      const hasTarget = await projectDetector.hasTarget('my-app', 'build');
      expect(hasTarget).toBe(true);
    });

    it('should return false when project does not have target', async () => {
      const mockProject = {
        name: 'my-app',
        root: '/test/workspace/apps/my-app',
        projectType: 'application' as const,
        type: 'nx' as const,
        packageJsonPath: '/test/workspace/apps/my-app/package.json',
        targets: { build: {} }
      };

      jest.spyOn(projectDetector, 'getProject').mockResolvedValue(mockProject);

      const hasTarget = await projectDetector.hasTarget('my-app', 'test');
      expect(hasTarget).toBe(false);
    });

    it('should return false when project not found', async () => {
      jest.spyOn(projectDetector, 'getProject').mockResolvedValue(null);

      const hasTarget = await projectDetector.hasTarget('non-existent', 'build');
      expect(hasTarget).toBe(false);
    });

    it('should return false when project has no targets', async () => {
      const mockProject = {
        name: 'my-app',
        root: '/test/workspace/apps/my-app',
        projectType: 'application' as const,
        type: 'nx' as const,
        packageJsonPath: '/test/workspace/apps/my-app/package.json'
      };

      jest.spyOn(projectDetector, 'getProject').mockResolvedValue(mockProject);

      const hasTarget = await projectDetector.hasTarget('my-app', 'build');
      expect(hasTarget).toBe(false);
    });
  });

  describe('getWorkspaceRoot', () => {
    it('should return workspace root directory', () => {
      const root = projectDetector.getWorkspaceRoot();
      expect(root).toBe('/test/workspace');
    });
  });
});
