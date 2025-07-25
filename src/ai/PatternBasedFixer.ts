/**
 * PatternBasedFixer - Automatic fixes for common test failure patterns
 * 
 * Provides immediate automated fixes for well-known test failure patterns
 * without requiring AI assistance. Works as a first line of defense before
 * escalating to Copilot integration.
 * 
 * @version 3.0.0
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { TestFailure } from './TestFailureAnalyzer';

/**
 * Represents an automatic fix that can be applied
 */
export interface AutoFix {
    readonly id: string;
    readonly title: string;
    readonly description: string;
    readonly filePath: string;
    readonly edits: vscode.TextEdit[];
    readonly confidence: number;
    readonly category: 'import' | 'assertion' | 'mock' | 'type' | 'syntax' | 'other';
}

/**
 * Represents the result of applying fixes
 */
export interface FixResult {
    readonly applied: AutoFix[];
    readonly failed: Array<{ fix: AutoFix; error: string }>;
    readonly skipped: AutoFix[];
}

/**
 * Pattern-based automatic fix generation and application
 */
export class PatternBasedFixer {
    private readonly outputChannel: vscode.OutputChannel;

    constructor() {
        this.outputChannel = vscode.window.createOutputChannel('AI Debug Context - Auto Fixes');
    }

    /**
     * Analyze a test failure and generate possible automatic fixes
     */
    async generateFixes(failure: TestFailure): Promise<AutoFix[]> {
        const fixes: AutoFix[] = [];

        try {
            // Load the test file to analyze
            const testDocument = await this.loadDocument(failure.testFile);
            if (!testDocument) {
                return fixes;
            }

            // Generate fixes based on error patterns
            fixes.push(...await this.generateImportFixes(failure, testDocument));
            fixes.push(...await this.generateAssertionFixes(failure, testDocument));
            fixes.push(...await this.generateMockFixes(failure, testDocument));
            fixes.push(...await this.generateTypeFixes(failure, testDocument));

            // Sort by confidence (highest first)
            fixes.sort((a, b) => b.confidence - a.confidence);

        } catch (error) {
            this.showOutput(`Error generating fixes for ${failure.testName}: ${error}`);
        }

        return fixes;
    }

    /**
     * Apply selected fixes to the codebase
     */
    async applyFixes(fixes: AutoFix[], options: { confirm?: boolean } = {}): Promise<FixResult> {
        const result: FixResult = {
            applied: [],
            failed: [],
            skipped: []
        };

        for (const fix of fixes) {
            try {
                // Ask for confirmation if requested
                if (options.confirm) {
                    const selection = await vscode.window.showInformationMessage(
                        `Apply fix: ${fix.title}?`,
                        { detail: fix.description },
                        'Apply',
                        'Skip',
                        'Cancel'
                    );

                    if (selection === 'Cancel') {
                        result.skipped.push(...fixes.slice(fixes.indexOf(fix)));
                        break;
                    }

                    if (selection === 'Skip') {
                        result.skipped.push(fix);
                        continue;
                    }
                }

                // Apply the fix
                await this.applyFix(fix);
                result.applied.push(fix);
                this.showOutput(`Applied fix: ${fix.title}`);

            } catch (error) {
                result.failed.push({ fix, error: String(error) });
                this.showOutput(`Failed to apply fix ${fix.title}: ${error}`);
            }
        }

        return result;
    }

    /**
     * Generate fixes for missing imports
     */
    private async generateImportFixes(failure: TestFailure, document: vscode.TextDocument): Promise<AutoFix[]> {
        const fixes: AutoFix[] = [];

        // Pattern: Module not found or import errors
        if (failure.errorMessage.match(/module.*not found|cannot resolve module/i)) {
            const moduleMatch = failure.errorMessage.match(/module\s+['"`]([^'"`]+)['"`]/i);
            if (moduleMatch) {
                const moduleName = moduleMatch[1];
                
                // Suggest common import fixes
                fixes.push(...this.generateImportSuggestions(moduleName, document));
            }
        }

        // Pattern: ReferenceError for undefined variables
        if (failure.errorMessage.match(/(\w+) is not defined/i)) {
            const variableMatch = failure.errorMessage.match(/(\w+) is not defined/i);
            if (variableMatch) {
                const variableName = variableMatch[1];
                fixes.push(...this.generateVariableImportSuggestions(variableName, document));
            }
        }

        return fixes;
    }

    /**
     * Generate fixes for assertion failures
     */
    private async generateAssertionFixes(failure: TestFailure, document: vscode.TextDocument): Promise<AutoFix[]> {
        const fixes: AutoFix[] = [];

        // Pattern: toEqual vs toBe confusion
        if (failure.errorMessage.match(/expected.*toEqual.*expected|toEqual.*received.*object/i)) {
            const fix = this.generateToBeReferenceFix(failure, document);
            if (fix) fixes.push(fix);
        }

        // Pattern: Async expectation without await
        if (failure.errorMessage.match(/promise.*received.*not.*resolved/i)) {
            fixes.push(...this.generateAsyncExpectationFixes(failure, document));
        }

        // Pattern: Snapshot mismatch
        if (failure.errorMessage.match(/snapshot.*mismatch|snapshot.*failed/i)) {
            fixes.push(this.generateSnapshotUpdateFix(failure, document));
        }

        return fixes.filter(fix => fix !== null) as AutoFix[];
    }

    /**
     * Generate fixes for mock-related issues
     */
    private async generateMockFixes(failure: TestFailure, document: vscode.TextDocument): Promise<AutoFix[]> {
        const fixes: AutoFix[] = [];

        // Pattern: Mock not called expected number of times
        if (failure.errorMessage.match(/expected.*to be called.*times/i)) {
            const fix = this.generateMockCallCountFix(failure, document);
            if (fix) fixes.push(fix);
        }

        // Pattern: Mock implementation missing
        if (failure.errorMessage.match(/mock.*implementation.*not.*provided/i)) {
            fixes.push(...this.generateMockImplementationFixes(failure, document));
        }

        return fixes.filter(fix => fix !== null) as AutoFix[];
    }

    /**
     * Generate fixes for TypeScript type errors
     */
    private async generateTypeFixes(failure: TestFailure, document: vscode.TextDocument): Promise<AutoFix[]> {
        const fixes: AutoFix[] = [];

        // Pattern: Type not assignable errors
        if (failure.errorMessage.match(/type.*not assignable to type/i)) {
            fixes.push(...this.generateTypeAssignmentFixes(failure, document));
        }

        // Pattern: Property does not exist on type
        if (failure.errorMessage.match(/property.*does not exist on type/i)) {
            fixes.push(...this.generatePropertyExistsFixes(failure, document));
        }

        return fixes.filter(fix => fix !== null) as AutoFix[];
    }

    /**
     * Generate import suggestions for missing modules
     */
    private generateImportSuggestions(moduleName: string, document: vscode.TextDocument): AutoFix[] {
        const fixes: AutoFix[] = [];
        const importLine = 0; // Insert at top

        // Common module patterns
        const commonImports: Record<string, string> = {
            'react': "import React from 'react';",
            'lodash': "import _ from 'lodash';",
            'jest': "import { jest } from '@jest/globals';",
            'testing-library/react': "import { render, screen } from '@testing-library/react';",
            'testing-library/jest-dom': "import '@testing-library/jest-dom';"
        };

        if (commonImports[moduleName]) {
            fixes.push({
                id: `import-${moduleName}`,
                title: `Add import for ${moduleName}`,
                description: `Import the ${moduleName} module`,
                filePath: document.uri.fsPath,
                edits: [
                    vscode.TextEdit.insert(new vscode.Position(importLine, 0), commonImports[moduleName] + '\n')
                ],
                confidence: 0.8,
                category: 'import'
            });
        }

        // Relative import suggestions
        if (moduleName.startsWith('./') || moduleName.startsWith('../')) {
            const possibleExtensions = ['.ts', '.tsx', '.js', '.jsx'];
            
            for (const ext of possibleExtensions) {
                fixes.push({
                    id: `import-relative-${moduleName}-${ext}`,
                    title: `Add import for ${moduleName}${ext}`,
                    description: `Import from relative path ${moduleName}${ext}`,
                    filePath: document.uri.fsPath,
                    edits: [
                        vscode.TextEdit.insert(
                            new vscode.Position(importLine, 0),
                            `import { /* TODO: specify imports */ } from '${moduleName}${ext}';\n`
                        )
                    ],
                    confidence: 0.6,
                    category: 'import'
                });
            }
        }

        return fixes;
    }

    /**
     * Generate import suggestions for undefined variables
     */
    private generateVariableImportSuggestions(variableName: string, document: vscode.TextDocument): AutoFix[] {
        const fixes: AutoFix[] = [];

        // Common test utilities
        const commonTestImports: Record<string, string> = {
            'describe': "import { describe } from '@jest/globals';",
            'it': "import { it } from '@jest/globals';",
            'expect': "import { expect } from '@jest/globals';",
            'beforeEach': "import { beforeEach } from '@jest/globals';",
            'afterEach': "import { afterEach } from '@jest/globals';",
            'jest': "import { jest } from '@jest/globals';"
        };

        if (commonTestImports[variableName]) {
            fixes.push({
                id: `import-test-${variableName}`,
                title: `Add ${variableName} import`,
                description: `Import ${variableName} from Jest globals`,
                filePath: document.uri.fsPath,
                edits: [
                    vscode.TextEdit.insert(new vscode.Position(0, 0), commonTestImports[variableName] + '\n')
                ],
                confidence: 0.9,
                category: 'import'
            });
        }

        return fixes;
    }

    /**
     * Generate fix for toEqual vs toBe confusion
     */
    private generateToBeReferenceFix(failure: TestFailure, document: vscode.TextDocument): AutoFix | null {
        const text = document.getText();
        const toEqualMatches = text.matchAll(/\.toEqual\(/g);
        
        const edits: vscode.TextEdit[] = [];
        for (const match of toEqualMatches) {
            if (match.index !== undefined) {
                const pos = document.positionAt(match.index);
                const range = new vscode.Range(pos, document.positionAt(match.index + 8)); // '.toEqual'.length
                edits.push(vscode.TextEdit.replace(range, '.toBe'));
            }
        }

        if (edits.length > 0) {
            return {
                id: 'fix-tobe-vs-toequal',
                title: 'Replace toEqual with toBe for primitive values',
                description: 'Use toBe() for primitive value comparisons instead of toEqual()',
                filePath: document.uri.fsPath,
                edits,
                confidence: 0.7,
                category: 'assertion'
            };
        }

        return null;
    }

    /**
     * Generate fixes for async expectation issues
     */
    private generateAsyncExpectationFixes(failure: TestFailure, document: vscode.TextDocument): AutoFix[] {
        const fixes: AutoFix[] = [];
        const text = document.getText();
        
        // Find expect() calls that might need await
        const expectMatches = text.matchAll(/expect\([^)]+\)/g);
        
        for (const match of expectMatches) {
            if (match.index !== undefined) {
                const pos = document.positionAt(match.index);
                
                fixes.push({
                    id: `fix-async-expect-${match.index}`,
                    title: 'Add await to async expectation',
                    description: 'Add await keyword before expect() for async operations',
                    filePath: document.uri.fsPath,
                    edits: [
                        vscode.TextEdit.insert(pos, 'await ')
                    ],
                    confidence: 0.6,
                    category: 'assertion'
                });
            }
        }

        return fixes;
    }

    /**
     * Generate snapshot update fix
     */
    private generateSnapshotUpdateFix(failure: TestFailure, document: vscode.TextDocument): AutoFix {
        return {
            id: 'fix-snapshot-update',
            title: 'Update test snapshots',
            description: 'Run Jest with --updateSnapshot to update failing snapshots',
            filePath: document.uri.fsPath,
            edits: [], // This is a command-based fix, not a text edit
            confidence: 0.8,
            category: 'other'
        };
    }

    /**
     * Generate mock call count fix
     */
    private generateMockCallCountFix(failure: TestFailure, document: vscode.TextDocument): AutoFix | null {
        // This would analyze the test code to suggest mock call adjustments
        // Implementation would depend on specific test patterns
        return null;
    }

    /**
     * Generate mock implementation fixes
     */
    private generateMockImplementationFixes(failure: TestFailure, document: vscode.TextDocument): AutoFix[] {
        // This would suggest mock implementations based on usage patterns
        return [];
    }

    /**
     * Generate type assignment fixes
     */
    private generateTypeAssignmentFixes(failure: TestFailure, document: vscode.TextDocument): AutoFix[] {
        // This would suggest type casts or interface updates
        return [];
    }

    /**
     * Generate property exists fixes
     */
    private generatePropertyExistsFixes(failure: TestFailure, document: vscode.TextDocument): AutoFix[] {
        // This would suggest interface extensions or optional chaining
        return [];
    }

    /**
     * Apply a single fix to the document
     */
    private async applyFix(fix: AutoFix): Promise<void> {
        if (fix.edits.length === 0) {
            // Handle command-based fixes
            if (fix.id === 'fix-snapshot-update') {
                await this.runSnapshotUpdate();
            }
            return;
        }

        const document = await this.loadDocument(fix.filePath);
        if (!document) {
            throw new Error(`Could not load document: ${fix.filePath}`);
        }

        const edit = new vscode.WorkspaceEdit();
        edit.set(document.uri, fix.edits);
        
        const success = await vscode.workspace.applyEdit(edit);
        if (!success) {
            throw new Error('Failed to apply workspace edit');
        }

        // Save the document
        await document.save();
    }

    /**
     * Run snapshot update command
     */
    private async runSnapshotUpdate(): Promise<void> {
        const terminal = vscode.window.createTerminal('AI Debug - Snapshot Update');
        terminal.sendText('npm test -- --updateSnapshot');
        terminal.show();
    }

    /**
     * Load a document from file path
     */
    private async loadDocument(filePath: string): Promise<vscode.TextDocument | null> {
        try {
            return await vscode.workspace.openTextDocument(filePath);
        } catch (error) {
            this.showOutput(`Could not load document ${filePath}: ${error}`);
            return null;
        }
    }

    /**
     * Show output message
     */
    private showOutput(message: string): void {
        const timestamp = new Date().toLocaleTimeString();
        this.outputChannel.appendLine(`${timestamp} [INFO] ${message}`);
    }

    /**
     * Dispose of resources
     */
    dispose(): void {
        this.outputChannel.dispose();
    }
}