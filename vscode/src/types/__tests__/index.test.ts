import * as types from '../index';

describe('Types Module - Interface Definitions', () => {
    
    describe('NxProject Interface', () => {
        it('should have required properties with correct types', () => {
            const mockProject: types.NxProject = {
                name: 'test-project',
                root: './apps/test-project',
                projectType: 'application'
            };

            expect(mockProject.name).toBe('test-project');
            expect(mockProject.root).toBe('./apps/test-project');
            expect(mockProject.projectType).toBe('application');
        });

        it('should accept valid projectType values', () => {
            const appProject: types.NxProject = {
                name: 'app',
                root: './apps/app',
                projectType: 'application'
            };

            const libProject: types.NxProject = {
                name: 'lib',
                root: './libs/lib',
                projectType: 'library'
            };

            expect(appProject.projectType).toBe('application');
            expect(libProject.projectType).toBe('library');
        });

        it('should allow optional targets property', () => {
            const projectWithTargets: types.NxProject = {
                name: 'test',
                root: './test',
                projectType: 'application',
                targets: {
                    build: { executor: '@nx/webpack:webpack' },
                    test: { executor: '@nx/jest:jest' }
                }
            };

            const projectWithoutTargets: types.NxProject = {
                name: 'test',
                root: './test',
                projectType: 'application'
            };

            expect(projectWithTargets.targets).toBeDefined();
            expect(projectWithoutTargets.targets).toBeUndefined();
        });
    });

    describe('CommandOptions Interface', () => {
        it('should have all optional properties with correct types', () => {
            const options: types.CommandOptions = {
                project: 'my-project',
                quick: true,
                fullContext: false,
                noDiff: true,
                focus: 'tests',
                useExpected: false,
                fullOutput: true
            };

            expect(typeof options.project).toBe('string');
            expect(typeof options.quick).toBe('boolean');
            expect(typeof options.fullContext).toBe('boolean');
            expect(typeof options.noDiff).toBe('boolean');
            expect(options.focus).toBe('tests');
            expect(typeof options.useExpected).toBe('boolean');
            expect(typeof options.fullOutput).toBe('boolean');
        });

        it('should accept valid focus values', () => {
            const testsFocus: types.CommandOptions = { focus: 'tests' };
            const typesFocus: types.CommandOptions = { focus: 'types' };
            const perfFocus: types.CommandOptions = { focus: 'performance' };

            expect(testsFocus.focus).toBe('tests');
            expect(typesFocus.focus).toBe('types');
            expect(perfFocus.focus).toBe('performance');
        });

        it('should work with empty options', () => {
            const emptyOptions: types.CommandOptions = {};
            
            expect(emptyOptions.project).toBeUndefined();
            expect(emptyOptions.quick).toBeUndefined();
            expect(emptyOptions.fullContext).toBeUndefined();
        });
    });

    describe('CommandResult Interface', () => {
        it('should have required properties with correct types', () => {
            const result: types.CommandResult = {
                success: true,
                exitCode: 0,
                output: 'Command executed successfully',
                duration: 1500
            };

            expect(typeof result.success).toBe('boolean');
            expect(typeof result.exitCode).toBe('number');
            expect(typeof result.output).toBe('string');
            expect(typeof result.duration).toBe('number');
        });

        it('should allow optional error and outputFiles properties', () => {
            const resultWithError: types.CommandResult = {
                success: false,
                exitCode: 1,
                output: 'Command failed',
                error: 'Error details',
                duration: 800
            };

            const resultWithOutputFiles: types.CommandResult = {
                success: true,
                exitCode: 0,
                output: 'Success',
                outputFiles: ['test-results.json', 'coverage.html'],
                duration: 2000
            };

            expect(resultWithError.error).toBe('Error details');
            expect(resultWithOutputFiles.outputFiles).toEqual(['test-results.json', 'coverage.html']);
        });
    });

    describe('ActionButton Interface', () => {
        it('should have required properties with correct types', () => {
            const button: types.ActionButton = {
                id: 'aiDebug',
                label: 'AI Debug',
                icon: 'debug',
                status: 'idle',
                enabled: true
            };

            expect(button.id).toBe('aiDebug');
            expect(typeof button.label).toBe('string');
            expect(typeof button.icon).toBe('string');
            expect(button.status).toBe('idle');
            expect(typeof button.enabled).toBe('boolean');
        });

        it('should accept valid id values', () => {
            const aiDebugButton: types.ActionButton = {
                id: 'aiDebug',
                label: 'AI Debug',
                icon: 'debug',
                status: 'idle',
                enabled: true
            };

            const nxTestButton: types.ActionButton = {
                id: 'nxTest',
                label: 'Run Tests',
                icon: 'test',
                status: 'running',
                enabled: true
            };

            const gitDiffButton: types.ActionButton = {
                id: 'gitDiff',
                label: 'Git Diff',
                icon: 'diff',
                status: 'success',
                enabled: true
            };

            const prepareToPushButton: types.ActionButton = {
                id: 'prepareToPush',
                label: 'Prepare to Push',
                icon: 'push',
                status: 'error',
                enabled: false
            };

            expect(aiDebugButton.id).toBe('aiDebug');
            expect(nxTestButton.id).toBe('nxTest');
            expect(gitDiffButton.id).toBe('gitDiff');
            expect(prepareToPushButton.id).toBe('prepareToPush');
        });

        it('should accept valid status values', () => {
            const statuses: types.ActionButton['status'][] = ['idle', 'running', 'success', 'error'];
            
            statuses.forEach(status => {
                const button: types.ActionButton = {
                    id: 'aiDebug',
                    label: 'Test',
                    icon: 'test',
                    status: status,
                    enabled: true
                };
                expect(button.status).toBe(status);
            });
        });

        it('should allow optional lastRun property', () => {
            const buttonWithLastRun: types.ActionButton = {
                id: 'aiDebug',
                label: 'AI Debug',
                icon: 'debug',
                status: 'success',
                lastRun: new Date('2024-01-01T12:00:00Z'),
                enabled: true
            };

            expect(buttonWithLastRun.lastRun).toBeInstanceOf(Date);
        });
    });

    describe('WebviewMessage Interface', () => {
        it('should have required properties with correct types', () => {
            const message: types.WebviewMessage = {
                command: 'runCommand',
                data: {
                    action: 'aiDebug',
                    project: 'test-project'
                }
            };

            expect(message.command).toBe('runCommand');
            expect(typeof message.data).toBe('object');
        });

        it('should accept valid command values', () => {
            const commands: types.WebviewMessage['command'][] = [
                'runCommand', 'getStatus', 'openFile', 'getProjects', 'setProject'
            ];

            commands.forEach(command => {
                const message: types.WebviewMessage = {
                    command: command,
                    data: {}
                };
                expect(message.command).toBe(command);
            });
        });

        it('should allow optional data properties', () => {
            const messageWithAllData: types.WebviewMessage = {
                command: 'runCommand',
                data: {
                    action: 'nxTest',
                    project: 'my-project',
                    options: { quick: true },
                    filePath: './src/test.ts'
                }
            };

            expect(messageWithAllData.data.action).toBe('nxTest');
            expect(messageWithAllData.data.project).toBe('my-project');
            expect(messageWithAllData.data.options).toEqual({ quick: true });
            expect(messageWithAllData.data.filePath).toBe('./src/test.ts');
        });
    });

    describe('WebviewState Interface', () => {
        it('should have required properties with correct types', () => {
            const state: types.WebviewState = {
                projects: [
                    { name: 'project1', root: './apps/project1', projectType: 'application' }
                ],
                actions: {
                    'aiDebug': {
                        id: 'aiDebug',
                        label: 'AI Debug',
                        icon: 'debug',
                        status: 'idle',
                        enabled: true
                    }
                },
                outputFiles: {
                    'test-results': 'test output content'
                }
            };

            expect(Array.isArray(state.projects)).toBe(true);
            expect(typeof state.actions).toBe('object');
            expect(typeof state.outputFiles).toBe('object');
        });

        it('should allow optional properties', () => {
            const stateWithOptionals: types.WebviewState = {
                currentProject: 'selected-project',
                projects: [],
                actions: {},
                outputFiles: {},
                lastRun: {
                    action: 'aiDebug',
                    timestamp: new Date(),
                    success: true
                }
            };

            expect(stateWithOptionals.currentProject).toBe('selected-project');
            expect(stateWithOptionals.lastRun).toBeDefined();
            expect(stateWithOptionals.lastRun!.action).toBe('aiDebug');
            expect(stateWithOptionals.lastRun!.timestamp).toBeInstanceOf(Date);
            expect(stateWithOptionals.lastRun!.success).toBe(true);
        });
    });

    describe('OutputType Type', () => {
        it('should accept valid output type values', () => {
            const outputTypes: types.OutputType[] = [
                'ai-debug-context',
                'jest-output',
                'diff',
                'pr-description'
            ];

            outputTypes.forEach(outputType => {
                const type: types.OutputType = outputType;
                expect(type).toBe(outputType);
            });
        });
    });

    describe('DebugContext Interface', () => {
        it('should have required properties with correct types', () => {
            const context: types.DebugContext = {
                testStatus: 'passing',
                hasFailures: false,
                changedFiles: ['src/app.ts', 'src/utils.ts'],
                lintStatus: 'passed',
                formatStatus: 'passed'
            };

            expect(context.testStatus).toBe('passing');
            expect(typeof context.hasFailures).toBe('boolean');
            expect(Array.isArray(context.changedFiles)).toBe(true);
            expect(context.lintStatus).toBe('passed');
            expect(context.formatStatus).toBe('passed');
        });

        it('should accept valid status values', () => {
            const testStatuses: types.DebugContext['testStatus'][] = ['passing', 'failing', 'unknown'];
            const lintStatuses: types.DebugContext['lintStatus'][] = ['passed', 'failed', 'unknown'];
            const formatStatuses: types.DebugContext['formatStatus'][] = ['passed', 'failed', 'unknown'];

            testStatuses.forEach(status => {
                const context: types.DebugContext = {
                    testStatus: status,
                    hasFailures: false,
                    changedFiles: [],
                    lintStatus: 'passed',
                    formatStatus: 'passed'
                };
                expect(context.testStatus).toBe(status);
            });

            lintStatuses.forEach(status => {
                const context: types.DebugContext = {
                    testStatus: 'passing',
                    hasFailures: false,
                    changedFiles: [],
                    lintStatus: status,
                    formatStatus: 'passed'
                };
                expect(context.lintStatus).toBe(status);
            });

            formatStatuses.forEach(status => {
                const context: types.DebugContext = {
                    testStatus: 'passing',
                    hasFailures: false,
                    changedFiles: [],
                    lintStatus: 'passed',
                    formatStatus: status
                };
                expect(context.formatStatus).toBe(status);
            });
        });
    });

    describe('PRContext Interface', () => {
        it('should have required properties with correct types', () => {
            const context: types.PRContext = {
                testsPassing: true,
                lintPassing: true,
                formatApplied: true,
                changedFiles: ['src/feature.ts'],
                projectName: 'my-project'
            };

            expect(typeof context.testsPassing).toBe('boolean');
            expect(typeof context.lintPassing).toBe('boolean');
            expect(typeof context.formatApplied).toBe('boolean');
            expect(Array.isArray(context.changedFiles)).toBe(true);
            expect(typeof context.projectName).toBe('string');
        });

        it('should work with different boolean combinations', () => {
            const allPassingContext: types.PRContext = {
                testsPassing: true,
                lintPassing: true,
                formatApplied: true,
                changedFiles: [],
                projectName: 'test'
            };

            const mixedContext: types.PRContext = {
                testsPassing: false,
                lintPassing: true,
                formatApplied: false,
                changedFiles: ['file1.ts', 'file2.ts'],
                projectName: 'test'
            };

            expect(allPassingContext.testsPassing).toBe(true);
            expect(mixedContext.testsPassing).toBe(false);
            expect(mixedContext.changedFiles).toHaveLength(2);
        });
    });

    describe('Type Compatibility and Integration', () => {
        it('should work together in realistic scenarios', () => {
            // Simulate a complete workflow
            const project: types.NxProject = {
                name: 'my-app',
                root: './apps/my-app',
                projectType: 'application',
                targets: {
                    build: { executor: '@nx/webpack:webpack' },
                    test: { executor: '@nx/jest:jest' }
                }
            };

            const options: types.CommandOptions = {
                project: project.name,
                quick: false,
                fullContext: true,
                focus: 'tests'
            };

            const result: types.CommandResult = {
                success: true,
                exitCode: 0,
                output: 'Tests passed',
                outputFiles: ['test-results.json'],
                duration: 5000
            };

            const button: types.ActionButton = {
                id: 'nxTest',
                label: 'Run Tests',
                icon: 'test',
                status: 'success',
                lastRun: new Date(),
                enabled: true
            };

            const message: types.WebviewMessage = {
                command: 'runCommand',
                data: {
                    action: 'nxTest',
                    project: project.name,
                    options: options
                }
            };

            const state: types.WebviewState = {
                currentProject: project.name,
                projects: [project],
                actions: { [button.id]: button },
                outputFiles: { 'test-results': result.output },
                lastRun: {
                    action: button.id,
                    timestamp: new Date(),
                    success: result.success
                }
            };

            // Verify the integration works
            expect(state.currentProject).toBe(project.name);
            expect(state.projects[0].name).toBe(project.name);
            expect(state.actions[button.id].status).toBe('success');
            expect(message.data.project).toBe(project.name);
            expect(message.data.options).toEqual(options);
        });

        it('should handle error scenarios properly', () => {
            const failedResult: types.CommandResult = {
                success: false,
                exitCode: 1,
                output: 'Test failed',
                error: 'Test suite failed with 3 errors',
                duration: 3000
            };

            const errorButton: types.ActionButton = {
                id: 'nxTest',
                label: 'Run Tests',
                icon: 'test',
                status: 'error',
                lastRun: new Date(),
                enabled: true
            };

            const debugContext: types.DebugContext = {
                testStatus: 'failing',
                hasFailures: true,
                changedFiles: ['src/broken.ts'],
                lintStatus: 'failed',
                formatStatus: 'unknown'
            };

            const prContext: types.PRContext = {
                testsPassing: false,
                lintPassing: false,
                formatApplied: false,
                changedFiles: debugContext.changedFiles,
                projectName: 'failing-project'
            };

            expect(failedResult.success).toBe(false);
            expect(errorButton.status).toBe('error');
            expect(debugContext.hasFailures).toBe(true);
            expect(prContext.testsPassing).toBe(false);
        });
    });

    describe('Type Safety and Edge Cases', () => {
        it('should prevent invalid enum values at compile time', () => {
            // These should compile successfully
            const validProjectType: types.NxProject['projectType'] = 'application';
            const validStatus: types.ActionButton['status'] = 'running';
            const validCommand: types.WebviewMessage['command'] = 'getProjects';
            const validOutputType: types.OutputType = 'diff';

            expect(validProjectType).toBe('application');
            expect(validStatus).toBe('running');
            expect(validCommand).toBe('getProjects');
            expect(validOutputType).toBe('diff');
        });

        it('should handle optional properties correctly', () => {
            // Interface with only required properties
            const minimalProject: types.NxProject = {
                name: 'minimal',
                root: './minimal',
                projectType: 'library'
            };

            const minimalOptions: types.CommandOptions = {};

            const minimalState: types.WebviewState = {
                projects: [],
                actions: {},
                outputFiles: {}
            };

            expect(minimalProject.targets).toBeUndefined();
            expect(Object.keys(minimalOptions)).toHaveLength(0);
            expect(minimalState.currentProject).toBeUndefined();
        });

        it('should handle complex nested structures', () => {
            const complexState: types.WebviewState = {
                currentProject: 'main-app',
                projects: [
                    {
                        name: 'main-app',
                        root: './apps/main-app',
                        projectType: 'application',
                        targets: {
                            build: { executor: '@nx/webpack:webpack' },
                            test: { executor: '@nx/jest:jest' },
                            lint: { executor: '@nx/linter:eslint' }
                        }
                    },
                    {
                        name: 'shared-lib',
                        root: './libs/shared-lib',
                        projectType: 'library'
                    }
                ],
                actions: {
                    aiDebug: { id: 'aiDebug', label: 'AI Debug', icon: 'debug', status: 'idle', enabled: true },
                    nxTest: { id: 'nxTest', label: 'Test', icon: 'test', status: 'success', enabled: true },
                    gitDiff: { id: 'gitDiff', label: 'Diff', icon: 'diff', status: 'idle', enabled: true },
                    prepareToPush: { id: 'prepareToPush', label: 'Push', icon: 'push', status: 'error', enabled: false }
                },
                outputFiles: {
                    'test-results': 'All tests passed',
                    'lint-results': 'No linting errors',
                    'build-log': 'Build completed successfully'
                },
                lastRun: {
                    action: 'nxTest',
                    timestamp: new Date('2024-01-01T10:00:00Z'),
                    success: true
                }
            };

            expect(complexState.projects).toHaveLength(2);
            expect(Object.keys(complexState.actions)).toHaveLength(4);
            expect(complexState.projects[0].targets).toBeDefined();
            expect(complexState.projects[1].targets).toBeUndefined();
            expect(complexState.actions.prepareToPush.enabled).toBe(false);
        });
    });
});
