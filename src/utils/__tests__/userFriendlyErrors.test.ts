/**
 * Tests for user-friendly error messages
 */

import { UserFriendlyErrors } from '../userFriendlyErrors';

describe('UserFriendlyErrors', () => {
    describe('git errors', () => {
        it('should provide actionable git not found message', () => {
            const result = UserFriendlyErrors.gitNotFound();
            expect(result).toContain('git init');
            expect(result).not.toContain('undefined');
        });

        it('should provide actionable no changes message', () => {
            const result = UserFriendlyErrors.noGitChanges();
            expect(result).toContain('Make a change');
            expect(result).not.toContain('failed');
        });
    });

    describe('project errors', () => {
        it('should suggest available projects when project not found', () => {
            const available = ['project1', 'project2', 'project3'];
            const result = UserFriendlyErrors.projectNotFound('missing-project', available);
            expect(result).toContain('missing-project');
            expect(result).toContain('project1');
        });

        it('should limit suggestions to 5 projects', () => {
            const many = Array.from({length: 10}, (_, i) => `project${i}`);
            const result = UserFriendlyErrors.projectNotFound('missing', many);
            const projectCount = (result.match(/project\d/g) || []).length;
            expect(projectCount).toBeLessThanOrEqual(5);
        });
    });

    describe('test failures', () => {
        it('should provide clear test failure message with count', () => {
            const result = UserFriendlyErrors.testsFailed('my-project', 3, 10);
            expect(result).toContain('my-project');
            expect(result).toContain('3');
            expect(result).toContain('10');
            expect(result).toContain('failed');
        });

        it('should handle singular vs plural test failures', () => {
            const single = UserFriendlyErrors.testsFailed('project', 1);
            const multiple = UserFriendlyErrors.testsFailed('project', 2);
            
            expect(single).toContain('1 test failed');
            expect(multiple).toContain('2 tests failed');
        });
    });

    describe('makeActionable', () => {
        it('should identify file not found errors', () => {
            const result = UserFriendlyErrors.makeActionable('ENOENT: no such file');
            expect(result).toContain('File or directory not found');
            expect(result).toContain('Check');
        });

        it('should identify permission errors', () => {
            const result = UserFriendlyErrors.makeActionable('EACCES: permission denied');
            expect(result).toContain('Permission denied');
            expect(result).toContain('administrator');
        });

        it('should identify port conflicts', () => {
            const result = UserFriendlyErrors.makeActionable('EADDRINUSE: address already in use 127.0.0.1:4211');
            expect(result).toContain('Port already in use');
            expect(result).toContain('Close other applications');
        });

        it('should provide context when available', () => {
            const result = UserFriendlyErrors.makeActionable('some error', 'Test execution');
            expect(result).toContain('Test execution');
        });

        it('should identify timeout errors', () => {
            const result = UserFriendlyErrors.makeActionable('Operation timed out after 30 seconds');
            expect(result).toContain('Operation timed out');
            expect(result).toContain('increase timeout');
        });

        it('should identify network errors', () => {
            const result = UserFriendlyErrors.makeActionable('Network connection failed');
            expect(result).toContain('Network connection failed');
            expect(result).toContain('Check internet connection');
        });

        it('should identify module not found errors', () => {
            const result = UserFriendlyErrors.makeActionable('Cannot find module "some-module"');
            expect(result).toContain('Module or command not found');
            expect(result).toContain('Install missing dependencies');
        });

        it('should provide fallback for unknown errors', () => {
            const result = UserFriendlyErrors.makeActionable('Unknown error occurred');
            expect(result).toContain('Unknown error occurred');
            expect(result).toContain('Check configuration');
        });
    });

    describe('git command errors', () => {
        it('should provide actionable git command failed message', () => {
            const result = UserFriendlyErrors.gitCommandFailed('git status');
            expect(result).toContain('git status');
            expect(result).toContain('git repository');
            expect(result).toContain('permissions');
        });
    });

    describe('workspace errors', () => {
        it('should provide actionable no projects found message', () => {
            const result = UserFriendlyErrors.noProjectsFound();
            expect(result).toContain('No projects found');
            expect(result).toContain('Nx workspace');
            expect(result).toContain('project.json');
        });

        it('should provide actionable project discovery failed message', () => {
            const result = UserFriendlyErrors.projectDiscoveryFailed();
            expect(result).toContain('Failed to discover projects');
            expect(result).toContain('workspace structure');
            expect(result).toContain('setup');
        });

        it('should provide actionable workspace not found message', () => {
            const result = UserFriendlyErrors.workspaceNotFound();
            expect(result).toContain('Workspace not found');
            expect(result).toContain('package.json');
            expect(result).toContain('nx.json');
        });

        it('should provide actionable nx workspace not detected message', () => {
            const result = UserFriendlyErrors.nxWorkspaceNotDetected();
            expect(result).toContain('Nx workspace not detected');
            expect(result).toContain('nx.json');
            expect(result).toContain('create-nx-workspace');
        });
    });

    describe('test execution errors', () => {
        it('should provide actionable tests timed out message', () => {
            const result = UserFriendlyErrors.testsTimedOut('my-project', 30);
            expect(result).toContain('my-project');
            expect(result).toContain('timed out after 30s');
            expect(result).toContain('smaller subset');
            expect(result).toContain('increase timeout');
        });

        it('should provide actionable nx command not found message', () => {
            const result = UserFriendlyErrors.nxCommandNotFound();
            expect(result).toContain('Nx command not found');
            expect(result).toContain('npm install -g nx');
            expect(result).toContain('dependencies');
        });

        it('should provide actionable test command failed message', () => {
            const result = UserFriendlyErrors.testCommandFailed('my-project', 'npm test');
            expect(result).toContain('my-project');
            expect(result).toContain('npm test');
            expect(result).toContain('configuration');
            expect(result).toContain('dependencies');
        });
    });

    describe('dependency errors', () => {
        it('should provide actionable missing dependencies message', () => {
            const missing = ['react', 'typescript', 'jest'];
            const result = UserFriendlyErrors.missingDependencies(missing);
            expect(result).toContain('Missing dependencies');
            expect(result).toContain('react, typescript, jest');
            expect(result).toContain('npm install');
        });
    });

    describe('file system errors', () => {
        it('should provide actionable file not found message', () => {
            const result = UserFriendlyErrors.fileNotFound('/path/to/file.txt');
            expect(result).toContain('File not found');
            expect(result).toContain('/path/to/file.txt');
            expect(result).toContain('Check the path');
            expect(result).toContain('permissions');
        });

        it('should provide actionable directory not found message', () => {
            const result = UserFriendlyErrors.directoryNotFound('/path/to/dir');
            expect(result).toContain('Directory not found');
            expect(result).toContain('/path/to/dir');
            expect(result).toContain('Check the path');
            expect(result).toContain('permissions');
        });

        it('should provide actionable permission denied message', () => {
            const result = UserFriendlyErrors.permissionDenied('/protected/path');
            expect(result).toContain('Permission denied');
            expect(result).toContain('/protected/path');
            expect(result).toContain('Check file/directory permissions');
        });
    });

    describe('auto-detection errors', () => {
        it('should provide actionable auto detection failed message without reason', () => {
            const result = UserFriendlyErrors.autoDetectionFailed();
            expect(result).toContain('Auto-detection failed');
            expect(result).toContain('manual project selection');
            expect(result).toContain('tracked files');
        });

        it('should provide actionable auto detection failed message with reason', () => {
            const result = UserFriendlyErrors.autoDetectionFailed('No git changes detected');
            expect(result).toContain('Auto-detection failed');
            expect(result).toContain('No git changes detected');
            expect(result).toContain('manual project selection');
            expect(result).toContain('tracked files');
        });

        it('should provide actionable no changed files message', () => {
            const result = UserFriendlyErrors.noChangedFiles();
            expect(result).toContain('No changed files detected');
            expect(result).toContain('Make some changes');
            expect(result).toContain('save files');
            expect(result).toContain('affected tests');
        });
    });

    describe('command execution errors', () => {
        it('should provide actionable command timeout message', () => {
            const result = UserFriendlyErrors.commandTimeout('npm install', 120);
            expect(result).toContain('Command timed out');
            expect(result).toContain('npm install');
            expect(result).toContain('120s');
            expect(result).toContain('specific command');
            expect(result).toContain('increase timeout');
        });

        it('should provide actionable command not found message', () => {
            const result = UserFriendlyErrors.commandNotFound('missing-command');
            expect(result).toContain('Command not found');
            expect(result).toContain('missing-command');
            expect(result).toContain('installed');
            expect(result).toContain('PATH');
        });
    });

    describe('shell script errors', () => {
        it('should provide actionable shell script not found message', () => {
            const result = UserFriendlyErrors.shellScriptNotFound('test-script.sh');
            expect(result).toContain('Script not found');
            expect(result).toContain('test-script.sh');
            expect(result).toContain('reinstalling');
            expect(result).toContain('updating');
        });

        it('should provide actionable shell script permission denied message', () => {
            const result = UserFriendlyErrors.shellScriptPermissionDenied('test-script.sh');
            expect(result).toContain('Permission denied');
            expect(result).toContain('test-script.sh');
            expect(result).toContain('file permissions');
            expect(result).toContain('administrator');
        });
    });

    describe('cache and state errors', () => {
        it('should provide actionable cache corrupted message', () => {
            const result = UserFriendlyErrors.cacheCorrupted();
            expect(result).toContain('cache is corrupted');
            expect(result).toContain('Clear cache');
            expect(result).toContain('try again');
        });

        it('should provide actionable state reset required message', () => {
            const result = UserFriendlyErrors.stateResetRequired();
            expect(result).toContain('state needs reset');
            expect(result).toContain('Clear cache');
            expect(result).toContain('restart VS Code');
        });
    });
});