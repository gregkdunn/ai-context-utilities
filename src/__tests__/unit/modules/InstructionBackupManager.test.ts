/**
 * Unit tests for InstructionBackupManager - Date parsing fix
 */

import { InstructionBackupManager } from '../../../modules/copilotInstructions/InstructionBackupManager';
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

// Mock vscode
jest.mock('vscode', () => ({
    window: {
        createOutputChannel: jest.fn(() => ({
            appendLine: jest.fn(),
            show: jest.fn(),
            dispose: jest.fn()
        }))
    }
}));

// Mock fs
jest.mock('fs', () => ({
    promises: {
        mkdir: jest.fn(),
        readdir: jest.fn(),
        copyFile: jest.fn(),
        unlink: jest.fn(),
        stat: jest.fn()
    },
    existsSync: jest.fn()
}));

describe('InstructionBackupManager - Date Parsing Fix', () => {
    let backupManager: InstructionBackupManager;
    let mockOutputChannel: any;

    beforeEach(() => {
        mockOutputChannel = {
            appendLine: jest.fn(),
            show: jest.fn(),
            dispose: jest.fn()
        };

        backupManager = new InstructionBackupManager('/test/workspace', mockOutputChannel);
        jest.clearAllMocks();
    });

    describe('listBackups timestamp parsing', () => {
        test('should correctly parse backup timestamps in new format', async () => {
            // Mock fileExists 
            backupManager['fileExists'] = jest.fn().mockResolvedValue(true);
            
            // Mock readdir to return backup directories with timestamp format (Dirent objects)
            (fs.promises.readdir as jest.Mock).mockResolvedValue([
                { name: '2024-01-15T10-30-45-123Z', isDirectory: () => true },
                { name: '2024-01-16T14-22-33-456Z', isDirectory: () => true },
                { name: '2024-01-17T09-15-28-789Z', isDirectory: () => true }
            ]);

            // Mock findFilesRecursive (we'll need to add this mock)
            backupManager['findFilesRecursive'] = jest.fn().mockResolvedValue([
                '/backup/copilot-instructions.md'
            ]);

            const backups = await backupManager.listBackups();

            expect(backups).toHaveLength(3);
            
            // Check that timestamps are valid dates
            backups.forEach(backup => {
                expect(backup.timestamp).toBeInstanceOf(Date);
                expect(isNaN(backup.timestamp.getTime())).toBe(false);
            });

            // Check specific dates
            expect(backups[0].timestamp.toISOString()).toBe('2024-01-17T09:15:28.789Z');
            expect(backups[1].timestamp.toISOString()).toBe('2024-01-16T14:22:33.456Z');
            expect(backups[2].timestamp.toISOString()).toBe('2024-01-15T10:30:45.123Z');
        });

        test('should skip backups with invalid timestamps', async () => {
            // Mock fileExists
            backupManager['fileExists'] = jest.fn().mockResolvedValue(true);
            
            // Mock readdir to return mix of valid and invalid backup directories
            (fs.promises.readdir as jest.Mock).mockResolvedValue([
                { name: '2024-01-15T10-30-45-123Z', isDirectory: () => true }, // Valid
                { name: 'invalid-backup-name', isDirectory: () => true },        // Invalid
                { name: '2024-13-45T99-99-99-999Z', isDirectory: () => true },  // Invalid date
                { name: '2024-01-16T14-22-33-456Z', isDirectory: () => true }   // Valid
            ]);

            backupManager['findFilesRecursive'] = jest.fn().mockResolvedValue([
                '/backup/copilot-instructions.md'
            ]);

            const backups = await backupManager.listBackups();

            // Should only return valid backups
            expect(backups).toHaveLength(2);
            
            // Check that all returned backups have valid timestamps
            backups.forEach(backup => {
                expect(backup.timestamp).toBeInstanceOf(Date);
                expect(isNaN(backup.timestamp.getTime())).toBe(false);
            });

            // Should log warnings for invalid timestamps
            expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
                expect.stringContaining('Skipping backup with invalid timestamp: invalid-backup-name')
            );
            expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
                expect.stringContaining('Skipping backup with invalid timestamp: 2024-13-45T99-99-99-999Z')
            );
        });

        test('should handle empty backup directory', async () => {
            (fs.promises.readdir as jest.Mock).mockResolvedValue([]);

            const backups = await backupManager.listBackups();

            expect(backups).toHaveLength(0);
        });

        test('should sort backups by timestamp newest first', async () => {
            // Mock fileExists
            backupManager['fileExists'] = jest.fn().mockResolvedValue(true);
            
            // Mock readdir with unsorted timestamps
            (fs.promises.readdir as jest.Mock).mockResolvedValue([
                { name: '2024-01-15T10-30-45-123Z', isDirectory: () => true }, // Oldest
                { name: '2024-01-17T09-15-28-789Z', isDirectory: () => true }, // Newest
                { name: '2024-01-16T14-22-33-456Z', isDirectory: () => true }  // Middle
            ]);

            backupManager['findFilesRecursive'] = jest.fn().mockResolvedValue([
                '/backup/copilot-instructions.md'
            ]);

            const backups = await backupManager.listBackups();

            expect(backups).toHaveLength(3);
            
            // Should be sorted newest first
            expect(backups[0].id).toBe('2024-01-17T09-15-28-789Z');
            expect(backups[1].id).toBe('2024-01-16T14-22-33-456Z');
            expect(backups[2].id).toBe('2024-01-15T10-30-45-123Z');
        });
    });

    describe('createBackup timestamp format', () => {
        test('should create backup with correct timestamp format', async () => {
            // Mock filesystem operations
            (fs.promises.mkdir as jest.Mock).mockResolvedValue(undefined);
            (fs.promises.copyFile as jest.Mock).mockResolvedValue(undefined);

            const testFiles = ['/test/copilot-instructions.md'];
            
            const result = await backupManager.createBackup(testFiles);

            expect(result.success).toBe(true);
            
            // Check that backup ID follows the expected format
            expect(result.backupId).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z$/);
            
            // Verify the backup ID can be parsed back correctly
            const isoString = result.backupId.replace(/T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z$/, 'T$1:$2:$3.$4Z');
            const parsedDate = new Date(isoString);
            
            expect(isNaN(parsedDate.getTime())).toBe(false);
        });
    });
});