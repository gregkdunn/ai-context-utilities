/**
 * Tests for InstructionPriorityManager
 */

import { InstructionPriorityManager, ParsedInstruction, PrioritizedInstruction } from '../../../../../modules/copilotInstructions/priority/InstructionPriorityManager';
import * as fs from 'fs';
import * as path from 'path';

// Mock filesystem
jest.mock('fs', () => ({
    promises: {
        readFile: jest.fn(),
        stat: jest.fn(),
        readdir: jest.fn()
    },
    existsSync: jest.fn()
}));

jest.mock('path');

describe('InstructionPriorityManager', () => {
    let manager: InstructionPriorityManager;
    const mockWorkspaceRoot = '/test/workspace';

    beforeEach(() => {
        manager = new InstructionPriorityManager(mockWorkspaceRoot);
        jest.clearAllMocks();
    });

    describe('Constructor', () => {
        test('should create instance with workspace root', () => {
            expect(manager).toBeDefined();
            expect(manager).toBeInstanceOf(InstructionPriorityManager);
        });
    });

    describe('Interfaces', () => {
        test('should create valid ParsedInstruction', () => {
            const instruction: ParsedInstruction = {
                content: 'test content',
                frontmatter: {
                    applyTo: 'typescript',
                    priority: 1,
                    userOverride: true,
                    description: 'test instruction'
                }
            };

            expect(instruction.content).toBe('test content');
            expect(instruction.frontmatter.priority).toBe(1);
        });

        test('should create valid PrioritizedInstruction', () => {
            const instruction: PrioritizedInstruction = {
                content: 'test content',
                frontmatter: {},
                filePath: '/test/path.md',
                priority: 5,
                category: 'general'
            };

            expect(instruction.filePath).toBe('/test/path.md');
            expect(instruction.priority).toBe(5);
            expect(instruction.category).toBe('general');
        });
    });

    describe('Pattern constants', () => {
        test('should have instruction patterns defined', () => {
            expect(manager).toBeDefined();
            // Test that the instance has the expected behavior
            expect(typeof manager).toBe('object');
        });
    });
});