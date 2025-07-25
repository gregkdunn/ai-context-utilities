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
    });
});