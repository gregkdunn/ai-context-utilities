/**
 * Unit tests for PatternBasedFixer
 * 
 * Tests automatic fix generation for common test failure patterns,
 * including import fixes, assertion fixes, mock fixes, and type fixes.
 * 
 * @version 3.0.0
 */

import * as vscode from 'vscode';
import { PatternBasedFixer, AutoFix, FixResult } from '../PatternBasedFixer';
import { TestFailure } from '../TestFailureAnalyzer';

// Mock VSCode API
jest.mock('vscode', () => ({
    window: {
        createOutputChannel: jest.fn(() => ({
            appendLine: jest.fn(),
            show: jest.fn(),
            dispose: jest.fn()
        })),
        showInformationMessage: jest.fn(),
        createTerminal: jest.fn(() => ({
            sendText: jest.fn(),
            show: jest.fn()
        }))
    },
    workspace: {
        openTextDocument: jest.fn(),
        applyEdit: jest.fn()
    },
    TextEdit: {
        insert: jest.fn((position, text) => ({ position, text, type: 'insert' })),
        replace: jest.fn((range, text) => ({ range, text, type: 'replace' }))
    },
    Position: jest.fn((line, char) => ({ line, char })),
    Range: jest.fn((start, end) => ({ start, end })),
    WorkspaceEdit: jest.fn(() => ({
        set: jest.fn()
    }))
}));

describe('PatternBasedFixer', () => {
    let fixer: PatternBasedFixer;
    let mockOutputChannel: any;
    let mockDocument: any;

    beforeEach(() => {
        jest.clearAllMocks();
        
        mockOutputChannel = {
            appendLine: jest.fn(),
            show: jest.fn(),
            dispose: jest.fn()
        };
        
        mockDocument = {
            uri: { fsPath: '/path/to/test.spec.ts' },
            getText: jest.fn(),
            save: jest.fn(),
            positionAt: jest.fn((offset: number) => ({ line: 0, character: offset }))
        };
        
        (vscode.window.createOutputChannel as jest.Mock).mockReturnValue(mockOutputChannel);
        (vscode.workspace.openTextDocument as jest.Mock).mockResolvedValue(mockDocument);
        (vscode.workspace.applyEdit as jest.Mock).mockResolvedValue(true);
        
        fixer = new PatternBasedFixer();
    });

    afterEach(() => {
        fixer.dispose();
    });

    describe('generateFixes', () => {
        it('should generate import fixes for missing module errors', async () => {
            const failure: TestFailure = {
                testName: 'import test',
                testFile: '/path/to/test.spec.ts',
                errorMessage: "Module 'react' not found",
                errorType: 'missing_import',
                stackTrace: []
            };

            mockDocument.getText.mockReturnValue('describe("test", () => {});');

            const fixes = await fixer.generateFixes(failure);

            expect(fixes).toContainEqual(expect.objectContaining({
                id: 'import-react',
                title: 'Add import for react',
                category: 'import',
                confidence: 0.8
            }));
        });

        it('should generate variable import fixes for undefined errors', async () => {
            const failure: TestFailure = {
                testName: 'undefined variable test',
                testFile: '/path/to/test.spec.ts',
                errorMessage: 'describe is not defined',
                errorType: 'unknown',
                stackTrace: []
            };

            mockDocument.getText.mockReturnValue('describe("test", () => {});');

            const fixes = await fixer.generateFixes(failure);

            expect(fixes).toContainEqual(expect.objectContaining({
                id: 'import-test-describe',
                title: 'Add describe import',
                category: 'import',
                confidence: 0.9
            }));
        });

        it('should generate assertion fixes for toEqual vs toBe confusion', async () => {
            const failure: TestFailure = {
                testName: 'assertion test',
                testFile: '/path/to/test.spec.ts',
                errorMessage: 'expect(received).toEqual(expected) - Received object',
                errorType: 'assertion_mismatch',
                stackTrace: []
            };

            mockDocument.getText.mockReturnValue('expect(value).toEqual(5);');

            const fixes = await fixer.generateFixes(failure);

            expect(fixes).toContainEqual(expect.objectContaining({
                id: 'fix-tobe-vs-toequal',
                title: 'Replace toEqual with toBe for primitive values',
                category: 'assertion'
            }));
        });

        it('should generate async expectation fixes', async () => {
            const failure: TestFailure = {
                testName: 'async test',
                testFile: '/path/to/test.spec.ts',
                errorMessage: 'Promise received but not resolved',
                errorType: 'unknown',
                stackTrace: []
            };

            mockDocument.getText.mockReturnValue('expect(asyncFunction()).toBe(true);');

            const fixes = await fixer.generateFixes(failure);

            expect(fixes.length).toBeGreaterThan(0);
            expect(fixes[0].category).toBe('assertion');
        });

        it('should generate snapshot update fix', async () => {
            const failure: TestFailure = {
                testName: 'snapshot test',
                testFile: '/path/to/test.spec.ts',
                errorMessage: 'Snapshot test failed',
                errorType: 'unknown',
                stackTrace: []
            };

            mockDocument.getText.mockReturnValue('expect(component).toMatchSnapshot();');

            const fixes = await fixer.generateFixes(failure);

            expect(fixes).toContainEqual(expect.objectContaining({
                id: 'fix-snapshot-update',
                title: 'Update test snapshots',
                category: 'other'
            }));
        });

        it('should handle document load failures gracefully', async () => {
            (vscode.workspace.openTextDocument as jest.Mock).mockRejectedValue(new Error('File not found'));

            const failure: TestFailure = {
                testName: 'test',
                testFile: '/path/to/missing.spec.ts',
                errorMessage: 'test error',
                errorType: 'unknown',
                stackTrace: []
            };

            const fixes = await fixer.generateFixes(failure);

            expect(fixes).toEqual([]);
            expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
                expect.stringContaining('Could not load document')
            );
        });

        it('should sort fixes by confidence (highest first)', async () => {
            const failure: TestFailure = {
                testName: 'test',
                testFile: '/path/to/test.spec.ts',
                errorMessage: 'describe is not defined',
                errorType: 'unknown',
                stackTrace: []
            };

            mockDocument.getText.mockReturnValue('describe("test", () => {});');

            const fixes = await fixer.generateFixes(failure);

            // Verify fixes are sorted by confidence
            for (let i = 1; i < fixes.length; i++) {
                expect(fixes[i - 1].confidence).toBeGreaterThanOrEqual(fixes[i].confidence);
            }
        });
    });

    describe('applyFixes', () => {
        it('should apply fixes without confirmation', async () => {
            const fixes: AutoFix[] = [
                {
                    id: 'fix-1',
                    title: 'Fix 1',
                    description: 'Description 1',
                    filePath: '/path/to/file.ts',
                    edits: [{ type: 'insert' } as any],
                    confidence: 0.9,
                    category: 'import'
                }
            ];

            mockDocument.save.mockResolvedValue(true);

            const result = await fixer.applyFixes(fixes);

            expect(result.applied).toHaveLength(1);
            expect(result.failed).toHaveLength(0);
            expect(result.skipped).toHaveLength(0);
            expect(vscode.workspace.applyEdit).toHaveBeenCalled();
            expect(mockDocument.save).toHaveBeenCalled();
        });

        it('should handle confirmation dialog', async () => {
            const fixes: AutoFix[] = [
                {
                    id: 'fix-1',
                    title: 'Fix 1',
                    description: 'Description 1',
                    filePath: '/path/to/file.ts',
                    edits: [{ type: 'insert' } as any],
                    confidence: 0.9,
                    category: 'import'
                }
            ];

            (vscode.window.showInformationMessage as jest.Mock)
                .mockResolvedValueOnce('Apply');

            const result = await fixer.applyFixes(fixes, { confirm: true });

            expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
                'Apply fix: Fix 1?',
                { detail: 'Description 1' },
                'Apply',
                'Skip',
                'Cancel'
            );
            expect(result.applied).toHaveLength(1);
        });

        it('should handle skip option in confirmation', async () => {
            const fixes: AutoFix[] = [
                {
                    id: 'fix-1',
                    title: 'Fix 1',
                    description: 'Description 1',
                    filePath: '/path/to/file.ts',
                    edits: [],
                    confidence: 0.9,
                    category: 'import'
                }
            ];

            (vscode.window.showInformationMessage as jest.Mock)
                .mockResolvedValueOnce('Skip');

            const result = await fixer.applyFixes(fixes, { confirm: true });

            expect(result.skipped).toHaveLength(1);
            expect(result.applied).toHaveLength(0);
        });

        it('should handle cancel option in confirmation', async () => {
            const fixes: AutoFix[] = [
                {
                    id: 'fix-1',
                    title: 'Fix 1',
                    description: 'Description 1',
                    filePath: '/path/to/file.ts',
                    edits: [],
                    confidence: 0.9,
                    category: 'import'
                },
                {
                    id: 'fix-2',
                    title: 'Fix 2',
                    description: 'Description 2',
                    filePath: '/path/to/file.ts',
                    edits: [],
                    confidence: 0.8,
                    category: 'assertion'
                }
            ];

            (vscode.window.showInformationMessage as jest.Mock)
                .mockResolvedValueOnce('Cancel');

            const result = await fixer.applyFixes(fixes, { confirm: true });

            expect(result.skipped).toHaveLength(2); // Both fixes should be skipped
            expect(result.applied).toHaveLength(0);
        });

        it('should handle apply failures', async () => {
            const fixes: AutoFix[] = [
                {
                    id: 'fix-1',
                    title: 'Fix 1',
                    description: 'Description 1',
                    filePath: '/path/to/file.ts',
                    edits: [{ type: 'insert' } as any],
                    confidence: 0.9,
                    category: 'import'
                }
            ];

            (vscode.workspace.applyEdit as jest.Mock).mockResolvedValue(false);

            const result = await fixer.applyFixes(fixes);

            expect(result.failed).toHaveLength(1);
            expect(result.failed[0].error).toContain('Failed to apply workspace edit');
        });

        it('should handle command-based fixes (snapshot update)', async () => {
            const mockTerminal = {
                sendText: jest.fn(),
                show: jest.fn()
            };
            (vscode.window.createTerminal as jest.Mock).mockReturnValue(mockTerminal);

            const fixes: AutoFix[] = [
                {
                    id: 'fix-snapshot-update',
                    title: 'Update test snapshots',
                    description: 'Run Jest with --updateSnapshot',
                    filePath: '/path/to/file.ts',
                    edits: [], // Empty edits indicate command-based fix
                    confidence: 0.8,
                    category: 'other'
                }
            ];

            const result = await fixer.applyFixes(fixes);

            expect(result.applied).toHaveLength(1);
            expect(vscode.window.createTerminal).toHaveBeenCalledWith('AI Debug - Snapshot Update');
            expect(mockTerminal.sendText).toHaveBeenCalledWith('npm test -- --updateSnapshot');
            expect(mockTerminal.show).toHaveBeenCalled();
        });
    });

    describe('specific fix generators', () => {
        it('should generate multiple import suggestions for relative paths', async () => {
            const failure: TestFailure = {
                testName: 'relative import test',
                testFile: '/path/to/test.spec.ts',
                errorMessage: "Module './utils' not found",
                errorType: 'missing_import',
                stackTrace: []
            };

            mockDocument.getText.mockReturnValue('import { helper } from "./utils";');

            const fixes = await fixer.generateFixes(failure);

            const relativeImportFixes = fixes.filter(f => f.id.includes('import-relative'));
            expect(relativeImportFixes.length).toBeGreaterThan(0);
            
            // Should suggest different extensions
            const extensions = ['.ts', '.tsx', '.js', '.jsx'];
            extensions.forEach(ext => {
                expect(relativeImportFixes).toContainEqual(
                    expect.objectContaining({
                        id: expect.stringContaining(`./utils-${ext}`),
                        confidence: 0.6
                    })
                );
            });
        });

        it('should generate common test utility imports', async () => {
            const testUtilities = ['describe', 'it', 'expect', 'beforeEach', 'afterEach', 'jest'];
            
            for (const utility of testUtilities) {
                const failure: TestFailure = {
                    testName: `${utility} import test`,
                    testFile: '/path/to/test.spec.ts',
                    errorMessage: `${utility} is not defined`,
                    errorType: 'unknown',
                    stackTrace: []
                };

                mockDocument.getText.mockReturnValue(`${utility}("test", () => {});`);

                const fixes = await fixer.generateFixes(failure);

                expect(fixes).toContainEqual(expect.objectContaining({
                    id: `import-test-${utility}`,
                    title: `Add ${utility} import`,
                    confidence: 0.9
                }));
            }
        });

        it('should handle toEqual/toBe replacement with multiple occurrences', async () => {
            const failure: TestFailure = {
                testName: 'multiple assertions',
                testFile: '/path/to/test.spec.ts',
                errorMessage: 'toEqual received object instead of primitive',
                errorType: 'assertion_mismatch',
                stackTrace: []
            };

            mockDocument.getText.mockReturnValue(`
                expect(value1).toEqual(5);
                expect(value2).toEqual(10);
                expect(value3).toEqual("string");
            `);

            mockDocument.positionAt.mockImplementation((offset: number) => ({
                line: Math.floor(offset / 30),
                character: offset % 30
            }));

            const fixes = await fixer.generateFixes(failure);

            const toBefix = fixes.find(f => f.id === 'fix-tobe-vs-toequal');
            expect(toBefix).toBeDefined();
            expect(toBefix!.edits.length).toBe(3); // Should replace all occurrences
        });

        it('should generate fixes for missing mock calls', async () => {
            const failure: TestFailure = {
                testName: 'mock test',
                testFile: '/path/to/test.spec.ts',
                errorMessage: 'Expected mock to be called 2 times but was called 0 times',
                errorType: 'mock_assertion',
                stackTrace: []
            };

            mockDocument.getText.mockReturnValue('expect(mockFn).toHaveBeenCalledTimes(2);');

            const fixes = await fixer.generateFixes(failure);

            // Currently returns null, but structure is in place for future implementation
            expect(fixes).toEqual([]);
        });

        it('should handle type assignment errors', async () => {
            const failure: TestFailure = {
                testName: 'type test',
                testFile: '/path/to/test.spec.ts',
                errorMessage: "Type 'string' is not assignable to type 'number'",
                errorType: 'type_error',
                stackTrace: []
            };

            mockDocument.getText.mockReturnValue('const num: number = "string";');

            const fixes = await fixer.generateFixes(failure);

            // Currently returns empty array, but structure is in place
            expect(Array.isArray(fixes)).toBe(true);
        });

        it('should handle property existence errors', async () => {
            const failure: TestFailure = {
                testName: 'property test',
                testFile: '/path/to/test.spec.ts',
                errorMessage: "Property 'foo' does not exist on type 'Bar'",
                errorType: 'type_error',
                stackTrace: []
            };

            mockDocument.getText.mockReturnValue('const value = bar.foo;');

            const fixes = await fixer.generateFixes(failure);

            // Currently returns empty array, but structure is in place
            expect(Array.isArray(fixes)).toBe(true);
        });
    });

    describe('error handling', () => {
        it('should handle document save failures', async () => {
            const fixes: AutoFix[] = [
                {
                    id: 'fix-1',
                    title: 'Fix 1',
                    description: 'Description 1',
                    filePath: '/path/to/file.ts',
                    edits: [{ type: 'insert' } as any],
                    confidence: 0.9,
                    category: 'import'
                }
            ];

            mockDocument.save.mockRejectedValue(new Error('Save failed'));

            const result = await fixer.applyFixes(fixes);

            expect(result.failed).toHaveLength(1);
            expect(result.failed[0].error).toContain('Save failed');
        });

        it('should handle missing document during apply', async () => {
            const fixes: AutoFix[] = [
                {
                    id: 'fix-1',
                    title: 'Fix 1',
                    description: 'Description 1',
                    filePath: '/path/to/missing.ts',
                    edits: [{ type: 'insert' } as any],
                    confidence: 0.9,
                    category: 'import'
                }
            ];

            (vscode.workspace.openTextDocument as jest.Mock)
                .mockRejectedValue(new Error('File not found'));

            const result = await fixer.applyFixes(fixes);

            expect(result.failed).toHaveLength(1);
            expect(result.failed[0].error).toContain('Could not load document');
        });
    });
});