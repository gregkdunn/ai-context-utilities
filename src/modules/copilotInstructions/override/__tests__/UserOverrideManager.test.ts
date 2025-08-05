import { UserOverrideManager, OverrideContext } from '../UserOverrideManager';
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

// Mock dependencies
jest.mock('fs', () => ({
    existsSync: jest.fn(),
    promises: {
        mkdir: jest.fn(),
        writeFile: jest.fn(),
        readFile: jest.fn()
    }
}));
jest.mock('path');

describe('UserOverrideManager', () => {
    let manager: UserOverrideManager;
    const mockWorkspaceRoot = '/mock/workspace';
    const expectedOverridePath = '/mock/workspace/.github/instructions/user-overrides.instructions.md';

    beforeEach(() => {
        manager = new UserOverrideManager(mockWorkspaceRoot);
        jest.clearAllMocks();
        
        // Mock path.join to return predictable results
        (path.join as jest.Mock).mockImplementation((...args) => args.join('/'));
        (path.dirname as jest.Mock).mockReturnValue('/mock/workspace/.github/instructions');
        
        // Reset fs mocks
        (fs.existsSync as jest.Mock).mockReturnValue(false);
        (fs.promises.mkdir as jest.Mock).mockResolvedValue(undefined);
        (fs.promises.writeFile as jest.Mock).mockResolvedValue(undefined);
        (fs.promises.readFile as jest.Mock).mockResolvedValue('');
    });

    describe('ensureOverrideFileExists', () => {
        it('should create override file when it does not exist', async () => {
            (fs.existsSync as jest.Mock).mockReturnValue(false);
            
            const mockShowInformationMessage = jest.fn().mockResolvedValue(undefined);
            (vscode.window as any) = { showInformationMessage: mockShowInformationMessage };

            await manager.ensureOverrideFileExists();

            expect(fs.promises.mkdir).toHaveBeenCalledWith(
                path.dirname(expectedOverridePath),
                { recursive: true }
            );
            expect(fs.promises.writeFile).toHaveBeenCalledWith(
                expectedOverridePath,
                expect.stringContaining('# User Override Instructions'),
                'utf8'
            );
            expect(mockShowInformationMessage).toHaveBeenCalledWith(
                '📝 User Override Instructions created! Customize your Copilot experience.',
                'Open Override File',
                'Learn More'
            );
        });

        it('should not create file when it already exists', async () => {
            (fs.existsSync as jest.Mock).mockReturnValue(true);

            await manager.ensureOverrideFileExists();

            expect(fs.promises.mkdir).not.toHaveBeenCalled();
            expect(fs.promises.writeFile).not.toHaveBeenCalled();
            // showInformationMessage should not be called
        });
    });

    describe('generateOverrideTemplate', () => {
        it('should generate template with correct structure', async () => {
            (fs.existsSync as jest.Mock).mockReturnValue(false);

            await manager.ensureOverrideFileExists();

            const writeCall = (fs.promises.writeFile as jest.Mock).mock.calls[0];
            const template = writeCall[1];

            expect(template).toContain('---\napplyTo: "**/*"');
            expect(template).toContain('priority: 1000');
            expect(template).toContain('userOverride: true');
            expect(template).toContain('# User Override Instructions');
            expect(template).toContain('📝 CUSTOMIZATION GUIDE');
            expect(template).toContain('🔄 SAFE TO EDIT');
            expect(template).toContain('## Quick Override Examples');
        });

        it('should include current timestamp in template', async () => {
            const mockDate = new Date('2024-01-15T10:30:00Z');
            jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any);
            
            (fs.existsSync as jest.Mock).mockReturnValue(false);

            await manager.ensureOverrideFileExists();

            const writeCall = (fs.promises.writeFile as jest.Mock).mock.calls[0];
            const template = writeCall[1];

            expect(template).toContain('lastModified: "2024-01-15T10:30:00.000Z"');
        });
    });

    describe('openOverrideFile', () => {
        it('should open existing override file', async () => {
            (fs.existsSync as jest.Mock).mockReturnValue(true);
            
            const mockDocument = { uri: 'mock-uri' };
            const mockOpenTextDocument = jest.fn().mockResolvedValue(mockDocument);
            const mockShowTextDocument = jest.fn();
            
            (vscode.workspace as any) = { openTextDocument: mockOpenTextDocument };
            (vscode.window as any) = { showTextDocument: mockShowTextDocument };

            await manager.openOverrideFile();

            expect(mockOpenTextDocument).toHaveBeenCalledWith(expectedOverridePath);
            expect(mockShowTextDocument).toHaveBeenCalledWith(mockDocument);
        });

        it('should handle non-existent file gracefully', async () => {
            (fs.existsSync as jest.Mock).mockReturnValue(false);
            
            const mockOpenTextDocument = jest.fn();
            (vscode.workspace as any) = { openTextDocument: mockOpenTextDocument };

            await manager.openOverrideFile();

            expect(mockOpenTextDocument).not.toHaveBeenCalled();
        });
    });

    describe('loadUserOverrides', () => {
        it('should load existing override file', async () => {
            (fs.existsSync as jest.Mock).mockReturnValue(true);
            const mockContent = '# User Override Instructions\n\nTest content';
            (fs.promises.readFile as jest.Mock).mockResolvedValue(mockContent);

            const result = await manager.loadUserOverrides();

            expect(result).toBe(mockContent);
            expect(fs.promises.readFile).toHaveBeenCalledWith(expectedOverridePath, 'utf8');
        });

        it('should return null for non-existent file', async () => {
            (fs.existsSync as jest.Mock).mockReturnValue(false);

            const result = await manager.loadUserOverrides();

            expect(result).toBeNull();
            expect(fs.promises.readFile).not.toHaveBeenCalled();
        });

        it('should handle read errors gracefully', async () => {
            (fs.existsSync as jest.Mock).mockReturnValue(true);
            (fs.promises.readFile as jest.Mock).mockRejectedValue(new Error('Read error'));

            const result = await manager.loadUserOverrides();

            expect(result).toBeNull();
        });
    });

    describe('generateSpecificRuleOverride', () => {
        it('should generate correct specific rule override template', () => {
            const context: OverrideContext = {
                overrideFilePath: '/mock/path',
                suggestion: 'Use signals for state',
                userPreference: 'Use observables for complex state',
                reason: 'Team expertise',
                whenToApply: 'Complex state management',
                justification: 'Better performance'
            };

            const template = (manager as any).generateSpecificRuleOverride(context);

            expect(template).toContain('### Override: Use signals for state');
            expect(template).toContain('// ❌ Copilot suggested: Use signals for state');
            expect(template).toContain('// ✅ My preference: Use observables for complex state');
            expect(template).toContain('// Reason: Team expertise');
            expect(template).toContain('**When**: Complex state management');
            expect(template).toContain('**Why**: Better performance');
        });
    });

    describe('generateStylePreference', () => {
        it('should generate correct style preference template', () => {
            const context: OverrideContext = {
                overrideFilePath: '/mock/path',
                suggestion: 'Avoid pattern',
                userPreference: 'Preferred pattern',
                reason: 'Team decision context'
            };

            const template = (manager as any).generateStylePreference(context);

            expect(template).toContain('### Style Preference:');
            expect(template).toContain('// ✅ My project style:\nPreferred pattern');
            expect(template).toContain('// ❌ Avoid:\nAvoid pattern');
            expect(template).toContain('**Team decision**: Team decision context');
        });
    });

    describe('generateArchitecturalDecision', () => {
        it('should generate correct architectural decision template', () => {
            const mockDate = new Date('2024-01-15');
            jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any);

            const context: OverrideContext = {
                overrideFilePath: '/mock/path',
                suggestion: 'Error Handling Strategy',
                userPreference: 'Use custom error classes',
                reason: 'Better error tracking',
                justification: 'Improved debugging'
            };

            const template = (manager as any).generateArchitecturalDecision(context);

            expect(template).toContain('### Architecture Decision: Error Handling Strategy');
            expect(template).toContain('**Decision**: Use custom error classes');
            expect(template).toContain('**Status**: Approved');
            expect(template).toContain('**Date**: 2024-01-15');
            expect(template).toContain('**Rationale**: Better error tracking');
            expect(template).toContain('**Consequences**: Improved debugging');
        });
    });

    describe('insertOverrideTemplate', () => {
        let mockEditor: any;
        let mockDocument: any;

        beforeEach(() => {
            mockDocument = {
                getText: jest.fn(),
                positionAt: jest.fn(),
                lineCount: 10
            };

            mockEditor = {
                document: mockDocument,
                edit: jest.fn(),
                selection: null,
                revealRange: jest.fn()
            };
        });

        it('should insert template at language section when found', async () => {
            const documentText = `
# User Override Instructions

## 📚 Override Categories

### Language & Framework Overrides
<!-- Your language-specific preferences -->
`;
            
            mockDocument.getText.mockReturnValue(documentText);
            mockDocument.lineCount = documentText.split('\n').length;
            mockDocument.positionAt.mockImplementation((offset: number) => {
                // Calculate line based on character position in the document
                const lines = documentText.split('\n');
                let currentPos = 0;
                for (let i = 0; i < lines.length; i++) {
                    if (currentPos + lines[i].length >= offset) {
                        return new vscode.Position(i, offset - currentPos);
                    }
                    currentPos += lines[i].length + 1; // +1 for newline
                }
                return new vscode.Position(lines.length - 1, 0);
            });

            const mockEditBuilder = {
                insert: jest.fn()
            };
            mockEditor.edit.mockImplementation((callback: any) => {
                callback(mockEditBuilder);
                return Promise.resolve(true);
            });

            const template = '\n### Test Override\nTest content\n';
            await (manager as any).insertOverrideTemplate(mockEditor, template);

            expect(mockEditBuilder.insert).toHaveBeenCalledTimes(1);
            
            // Get the position that was passed
            const [position] = mockEditBuilder.insert.mock.calls[0];
            expect(position).toHaveProperty('line', 7);
            expect(position).toHaveProperty('character', 0);
        });

        it('should insert template at end when no specific section found', async () => {
            const documentText = '# User Override Instructions\n\nBasic content';
            
            mockDocument.getText.mockReturnValue(documentText);
            mockDocument.lineCount = documentText.split('\n').length;
            mockDocument.positionAt.mockImplementation((offset: number) => {
                const lines = documentText.split('\n');
                let currentPos = 0;
                for (let i = 0; i < lines.length; i++) {
                    if (currentPos + lines[i].length >= offset) {
                        return new vscode.Position(i, offset - currentPos);
                    }
                    currentPos += lines[i].length + 1;
                }
                return new vscode.Position(lines.length - 1, 0);
            });
            
            const mockEditBuilder = {
                insert: jest.fn()
            };
            mockEditor.edit.mockImplementation((callback: any) => {
                callback(mockEditBuilder);
                return Promise.resolve(true);
            });

            const template = '\n### Test Override\nTest content\n';
            await (manager as any).insertOverrideTemplate(mockEditor, template);

            expect(mockEditBuilder.insert).toHaveBeenCalledTimes(1);
            
            // Get the position that was passed (should use document.lineCount which is 3)
            const [position] = mockEditBuilder.insert.mock.calls[0];
            expect(position).toHaveProperty('line', 3);
            expect(position).toHaveProperty('character', 0);
        });
    });
});

describe('InteractiveOverrideCreator', () => {
    let creator: any;
    let mockOverrideManager: jest.Mocked<UserOverrideManager>;

    beforeEach(() => {
        mockOverrideManager = {
            addOverrideEntry: jest.fn()
        } as any;

        const { InteractiveOverrideCreator } = require('../UserOverrideManager');
        creator = new InteractiveOverrideCreator(mockOverrideManager);
        
        jest.clearAllMocks();
    });

    describe('promptForOverride', () => {
        it('should launch wizard when user chooses to create override', async () => {
            const mockShowInformationMessage = jest.fn().mockResolvedValue('Create Override');
            (vscode.window as any) = { 
                showInformationMessage: mockShowInformationMessage,
                showQuickPick: (vscode.window as any).showQuickPick 
            };

            const mockShowQuickPick = jest.fn().mockResolvedValue({
                label: '🎯 Specific Rule Override',
                description: 'Override a specific recommendation'
            });
            (vscode.window as any).showQuickPick = mockShowQuickPick;

            await creator.promptForOverride();

            expect(mockShowInformationMessage).toHaveBeenCalledWith(
                '🤖 Create a custom override for your Copilot instructions?',
                'Create Override',
                'Cancel'
            );
            expect(mockShowQuickPick).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({ label: '🎯 Specific Rule Override' })
                ]),
                expect.objectContaining({ placeHolder: 'What type of override would you like to create?' })
            );
        });

        it('should not launch wizard when user cancels', async () => {
            const mockShowInformationMessage = jest.fn().mockResolvedValue('Cancel');
            (vscode.window as any) = { 
                showInformationMessage: mockShowInformationMessage,
                showQuickPick: (vscode.window as any).showQuickPick 
            };

            const mockShowQuickPick = jest.fn();
            (vscode.window as any).showQuickPick = mockShowQuickPick;

            await creator.promptForOverride();

            expect(mockShowQuickPick).not.toHaveBeenCalled();
        });
    });

    describe('launchOverrideWizard', () => {
        it('should create override entry when type is selected', async () => {
            const mockShowQuickPick = jest.fn().mockResolvedValue({
                label: '📝 Style Preference',
                description: 'Add a coding style preference'
            });
            (vscode.window as any).showQuickPick = mockShowQuickPick;

            await creator['launchOverrideWizard']();

            expect(mockOverrideManager.addOverrideEntry).toHaveBeenCalledWith(
                '📝 Style Preference',
                expect.objectContaining({
                    overrideFilePath: expect.stringContaining('user-overrides.instructions.md')
                })
            );
        });

        it('should not create override when user cancels type selection', async () => {
            const mockShowQuickPick = jest.fn().mockResolvedValue(undefined);
            (vscode.window as any).showQuickPick = mockShowQuickPick;

            await creator['launchOverrideWizard']();

            expect(mockOverrideManager.addOverrideEntry).not.toHaveBeenCalled();
        });
    });
});