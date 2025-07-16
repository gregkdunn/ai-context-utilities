import { ProjectDetector } from '../projectDetector';
import * as fs from 'fs';
import * as path from 'path';

// Mock fs module
jest.mock('fs');
jest.mock('path');

// Mock vscode module
jest.mock('vscode', () => ({
  workspace: {
    workspaceFolders: [
      { uri: { fsPath: '/test/workspace' } }
    ]
  }
}));

const mockedFs = fs as jest.Mocked<typeof fs>;
const mockedPath = path as jest.Mocked<typeof path>;

describe('ProjectDetector', () => {
  let projectDetector: ProjectDetector;

  beforeEach(() => {
    jest.clearAllMocks();
    projectDetector = new ProjectDetector();
    
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
      const nxConfig = {
        projects: {
          'my-app': 'apps/my-app',
          'my-lib': 'libs/my-lib'
        }
      };

      const projectJsonApp = {
        projectType: 'application',
        targets: { build: {}, test: {} }
      };

      const projectJsonLib = {
        projectType: 'library',
        targets: { test: {} }
      };

      mockedFs.existsSync.mockImplementation((filePath) => {
        return filePath === '/test/workspace/nx.json' ||
               filePath === '/test/workspace/apps/my-app/project.json' ||
               filePath === '/test/workspace/libs/my-lib/project.json';
      });

      mockedFs.readFileSync.mockImplementation((filePath) => {
        if (filePath === '/test/workspace/nx.json') {
          return JSON.stringify(nxConfig);
        }
        if (filePath === '/test/workspace/apps/my-app/project.json') {
          return JSON.stringify(projectJsonApp);
        }
        if (filePath === '/test/workspace/libs/my-lib/project.json') {
          return JSON.stringify(projectJsonLib);
        }
        throw new Error('File not found');
      });

      const projects = await projectDetector.getProjects();

      expect(projects).toHaveLength(2);
      expect(projects[0]).toEqual({
        name: 'my-app',
        root: 'apps/my-app',
        projectType: 'application',
        targets: { build: {}, test: {} }
      });
      expect(projects[1]).toEqual({
        name: 'my-lib',
        root: 'libs/my-lib',
        projectType: 'library',
        targets: { test: {} }
      });
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

      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(JSON.stringify(angularConfig));

      // Mock findNxWorkspace to return angular.json path
      jest.spyOn(projectDetector, 'findNxWorkspace').mockResolvedValue('/test/workspace/angular.json');

      const projects = await projectDetector.getProjects();

      expect(projects).toHaveLength(1);
      expect(projects[0]).toEqual({
        name: 'my-app',
        root: 'projects/my-app',
        projectType: 'application',
        targets: { build: {}, test: {} }
      });
    });

    it('should handle inline project configurations', async () => {
      const nxConfig = {
        projects: {
          'inline-project': {
            root: 'apps/inline',
            projectType: 'application',
            targets: { build: {} }
          }
        }
      };

      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(JSON.stringify(nxConfig));

      jest.spyOn(projectDetector, 'findNxWorkspace').mockResolvedValue('/test/workspace/nx.json');

      const projects = await projectDetector.getProjects();

      expect(projects).toHaveLength(1);
      expect(projects[0]).toEqual({
        name: 'inline-project',
        root: 'apps/inline',
        projectType: 'application',
        targets: { build: {} }
      });
    });

    it('should return empty array when no config found', async () => {
      jest.spyOn(projectDetector, 'findNxWorkspace').mockResolvedValue(null);

      const projects = await projectDetector.getProjects();
      expect(projects).toEqual([]);
    });

    it('should handle JSON parsing errors', async () => {
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue('invalid json');

      jest.spyOn(projectDetector, 'findNxWorkspace').mockResolvedValue('/test/workspace/nx.json');

      const projects = await projectDetector.getProjects();
      expect(projects).toEqual([]);
    });
  });

  describe('detectCurrentProject', () => {
    it('should detect project from active file path', async () => {
      const mockProjects = [
        { name: 'my-app', root: 'apps/my-app', projectType: 'application' as const },
        { name: 'my-lib', root: 'libs/my-lib', projectType: 'library' as const }
      ];

      jest.spyOn(projectDetector, 'getProjects').mockResolvedValue(mockProjects);

      // Mock vscode window.activeTextEditor
      const vscode = require('vscode');
      vscode.window.activeTextEditor = {
        document: {
          uri: {
            fsPath: '/test/workspace/apps/my-app/src/main.ts'
          }
        }
      };

      mockedPath.relative.mockReturnValue('apps/my-app/src/main.ts');

      const currentProject = await projectDetector.detectCurrentProject();
      expect(currentProject).toBe('my-app');
    });

    it('should return null when no active editor', async () => {
      const vscode = require('vscode');
      vscode.window.activeTextEditor = null;

      const currentProject = await projectDetector.detectCurrentProject();
      expect(currentProject).toBeNull();
    });

    it('should return null when file is not in any project', async () => {
      const mockProjects = [
        { name: 'my-app', root: 'apps/my-app', projectType: 'application' as const }
      ];

      jest.spyOn(projectDetector, 'getProjects').mockResolvedValue(mockProjects);

      const vscode = require('vscode');
      vscode.window.activeTextEditor = {
        document: {
          uri: {
            fsPath: '/test/workspace/other/file.ts'
          }
        }
      };

      mockedPath.relative.mockReturnValue('other/file.ts');

      const currentProject = await projectDetector.detectCurrentProject();
      expect(currentProject).toBeNull();
    });
  });

  describe('getProject', () => {
    it('should return project by name', async () => {
      const mockProjects = [
        { name: 'my-app', root: 'apps/my-app', projectType: 'application' as const },
        { name: 'my-lib', root: 'libs/my-lib', projectType: 'library' as const }
      ];

      jest.spyOn(projectDetector, 'getProjects').mockResolvedValue(mockProjects);

      const project = await projectDetector.getProject('my-lib');
      expect(project).toEqual(mockProjects[1]);
    });

    it('should return null for non-existent project', async () => {
      jest.spyOn(projectDetector, 'getProjects').mockResolvedValue([]);

      const project = await projectDetector.getProject('non-existent');
      expect(project).toBeNull();
    });
  });

  describe('hasTarget', () => {
    it('should return true when project has target', async () => {
      const mockProject = {
        name: 'my-app',
        root: 'apps/my-app',
        projectType: 'application' as const,
        targets: { build: {}, test: {} }
      };

      jest.spyOn(projectDetector, 'getProject').mockResolvedValue(mockProject);

      const hasTarget = await projectDetector.hasTarget('my-app', 'build');
      expect(hasTarget).toBe(true);
    });

    it('should return false when project does not have target', async () => {
      const mockProject = {
        name: 'my-app',
        root: 'apps/my-app',
        projectType: 'application' as const,
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
        root: 'apps/my-app',
        projectType: 'application' as const
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
