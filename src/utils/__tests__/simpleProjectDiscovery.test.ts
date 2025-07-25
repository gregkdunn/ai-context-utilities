/**
 * Tests for simple project discovery
 */

import { SimpleProjectDiscovery, ProjectInfo } from '../simpleProjectDiscovery';
import * as vscode from 'vscode';
import { promises as fs } from 'fs';
import * as path from 'path';

// Mock vscode
jest.mock('vscode', () => ({
    workspace: {
        getConfiguration: jest.fn()
    }
}));

// Mock fs
jest.mock('fs', () => ({
    promises: {
        readdir: jest.fn(),
        readFile: jest.fn()
    }
}));

// Mock path
jest.mock('path');

describe('SimpleProjectDiscovery', () => {
    let discovery: SimpleProjectDiscovery;
    let mockOutputChannel: any;
    let mockWorkspaceConfig: any;

    beforeEach(() => {
        mockOutputChannel = {
            appendLine: jest.fn()
        };

        mockWorkspaceConfig = {
            get: jest.fn(),
            update: jest.fn()
        };

        (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue(mockWorkspaceConfig);

        discovery = new SimpleProjectDiscovery('/test/workspace', mockOutputChannel);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('getAllProjects', () => {
        it('should return cached projects when cache is valid', async () => {
            const cachedProjects = {
                projects: [
                    { name: 'app1', type: 'application', path: 'apps/app1', projectJsonPath: '/test/apps/app1/project.json' }
                ],
                lastUpdated: new Date().toISOString(),
                workspaceRoot: '/test/workspace',
                version: '1.0'
            };

            mockWorkspaceConfig.get.mockReturnValue(cachedProjects);

            const result = await discovery.getAllProjects();

            expect(result).toEqual(cachedProjects.projects);
            expect(mockOutputChannel.appendLine).toHaveBeenCalledWith('📋 Using cached projects (1 found)');
        });

        it('should discover projects when cache is invalid', async () => {
            mockWorkspaceConfig.get.mockReturnValue(null);

            // Mock file system discovery
            (fs.readdir as jest.Mock)
                .mockResolvedValueOnce([
                    { name: 'apps', isDirectory: () => true },
                    { name: 'libs', isDirectory: () => true }
                ])
                .mockResolvedValueOnce([
                    { name: 'app1', isDirectory: () => true }
                ])
                .mockResolvedValueOnce([
                    { name: 'project.json', isDirectory: () => false }
                ])
                .mockResolvedValueOnce([
                    { name: 'lib1', isDirectory: () => true }
                ])
                .mockResolvedValueOnce([
                    { name: 'project.json', isDirectory: () => false }
                ]);

            (fs.readFile as jest.Mock)
                .mockResolvedValueOnce(JSON.stringify({
                    name: 'app1',
                    targets: { serve: {}, build: {} }
                }))
                .mockResolvedValueOnce(JSON.stringify({
                    name: 'lib1',
                    targets: { build: {} }
                }));

            (path.join as jest.Mock)
                .mockReturnValueOnce('/test/workspace/apps')
                .mockReturnValueOnce('/test/workspace/libs')
                .mockReturnValueOnce('/test/workspace/apps/app1')
                .mockReturnValueOnce('/test/workspace/apps/app1/project.json')
                .mockReturnValueOnce('/test/workspace/libs/lib1')
                .mockReturnValueOnce('/test/workspace/libs/lib1/project.json');

            (path.dirname as jest.Mock)
                .mockReturnValueOnce('/test/workspace/apps/app1')
                .mockReturnValueOnce('/test/workspace/libs/lib1');

            (path.relative as jest.Mock)
                .mockReturnValueOnce('apps/app1')
                .mockReturnValueOnce('libs/lib1');

            const result = await discovery.getAllProjects();

            expect(result).toHaveLength(2);
            expect(result[0].name).toBe('app1');
            expect(result[0].type).toBe('application');
            expect(result[1].name).toBe('lib1');
            expect(result[1].type).toBe('library');
        });
    });

    describe('getProjectsForFiles', () => {
        it('should find projects for given files', async () => {
            const projects: ProjectInfo[] = [
                { name: 'app1', type: 'application', path: 'apps/app1', projectJsonPath: '/test/apps/app1/project.json' },
                { name: 'lib1', type: 'library', path: 'libs/lib1', projectJsonPath: '/test/libs/lib1/project.json' }
            ];

            // Mock getAllProjects to return our test projects
            jest.spyOn(discovery, 'getAllProjects').mockResolvedValue(projects);

            const files = ['apps/app1/src/main.ts', 'libs/lib1/src/index.ts'];
            const result = await discovery.getProjectsForFiles(files);

            expect(result).toEqual(['app1', 'lib1']);
        });

        it('should handle files not in any project', async () => {
            const projects: ProjectInfo[] = [
                { name: 'app1', type: 'application', path: 'apps/app1', projectJsonPath: '/test/apps/app1/project.json' }
            ];

            jest.spyOn(discovery, 'getAllProjects').mockResolvedValue(projects);

            const files = ['root-file.ts', 'other/file.ts'];
            const result = await discovery.getProjectsForFiles(files);

            expect(result).toEqual([]);
        });
    });

    describe('project type determination', () => {
        it('should identify applications by serve target', async () => {
            const projectJson = {
                name: 'my-app',
                targets: {
                    serve: { executor: '@angular-devkit/build-angular:dev-server' },
                    build: { executor: '@angular-devkit/build-angular:browser' }
                }
            };

            // Use private method via any cast for testing
            const type = (discovery as any).determineProjectType(projectJson);
            expect(type).toBe('application');
        });

        it('should identify libraries by build-only targets', async () => {
            const projectJson = {
                name: 'my-lib',
                targets: {
                    build: { executor: '@nrwl/angular:ng-packagr-lite' },
                    test: { executor: '@nrwl/jest:jest' }
                }
            };

            const type = (discovery as any).determineProjectType(projectJson);
            expect(type).toBe('library');
        });

        it('should use explicit projectType when available', async () => {
            const projectJson = {
                name: 'my-project',
                projectType: 'library',
                targets: {
                    serve: { executor: 'something' } // This would normally indicate app
                }
            };

            const type = (discovery as any).determineProjectType(projectJson);
            expect(type).toBe('library');
        });

        it('should default to unknown for unclear projects', async () => {
            const projectJson = {
                name: 'my-project',
                targets: {
                    'custom-task': { executor: 'custom:executor' }
                }
            };

            const type = (discovery as any).determineProjectType(projectJson);
            expect(type).toBe('unknown');
        });
    });

    describe('directory skipping', () => {
        it('should skip common directories', () => {
            const shouldSkip = (discovery as any).shouldSkipDirectory;
            
            expect(shouldSkip('node_modules')).toBe(true);
            expect(shouldSkip('.git')).toBe(true);
            expect(shouldSkip('dist')).toBe(true);
            expect(shouldSkip('.nx')).toBe(true);
            expect(shouldSkip('coverage')).toBe(true);
            expect(shouldSkip('.hidden')).toBe(true);
            
            expect(shouldSkip('apps')).toBe(false);
            expect(shouldSkip('libs')).toBe(false);
            expect(shouldSkip('src')).toBe(false);
        });
    });

    describe('cache management', () => {
        it('should clear cache successfully', async () => {
            await discovery.clearCache();

            expect(mockWorkspaceConfig.update).toHaveBeenCalledWith(
                'projectDiscoveryCache',
                undefined,
                true
            );
            expect(mockOutputChannel.appendLine).toHaveBeenCalledWith('🗑️ Project cache cleared');
        });

        it('should handle cache clear errors gracefully', async () => {
            mockWorkspaceConfig.update.mockRejectedValue(new Error('Cache error'));

            await discovery.clearCache();

            expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
                expect.stringContaining('⚠️ Failed to clear cache')
            );
        });
    });

    describe('project filtering', () => {
        it('should filter projects by type', async () => {
            const projects: ProjectInfo[] = [
                { name: 'app1', type: 'application', path: 'apps/app1', projectJsonPath: '/test/apps/app1/project.json' },
                { name: 'lib1', type: 'library', path: 'libs/lib1', projectJsonPath: '/test/libs/lib1/project.json' },
                { name: 'app2', type: 'application', path: 'apps/app2', projectJsonPath: '/test/apps/app2/project.json' }
            ];

            jest.spyOn(discovery, 'getAllProjects').mockResolvedValue(projects);

            const apps = await discovery.getProjectsByType('application');
            const libs = await discovery.getProjectsByType('library');

            expect(apps).toHaveLength(2);
            expect(apps.every(p => p.type === 'application')).toBe(true);
            expect(libs).toHaveLength(1);
            expect(libs[0].type).toBe('library');
        });

        it('should search projects by pattern', async () => {
            const projects: ProjectInfo[] = [
                { name: 'user-app', type: 'application', path: 'apps/user-app', projectJsonPath: '/test/apps/user-app/project.json' },
                { name: 'user-lib', type: 'library', path: 'libs/user-lib', projectJsonPath: '/test/libs/user-lib/project.json' },
                { name: 'admin-app', type: 'application', path: 'apps/admin-app', projectJsonPath: '/test/apps/admin-app/project.json' }
            ];

            jest.spyOn(discovery, 'getAllProjects').mockResolvedValue(projects);

            const userProjects = await discovery.searchProjects('user');
            const appProjects = await discovery.searchProjects('app');

            expect(userProjects).toHaveLength(2);
            expect(userProjects.every(p => p.name.includes('user'))).toBe(true);
            expect(appProjects).toHaveLength(2);
            expect(appProjects.every(p => p.name.includes('app'))).toBe(true);
        });
    });
});