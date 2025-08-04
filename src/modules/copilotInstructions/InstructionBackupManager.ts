/**
 * Instruction Backup Manager
 * Handles backup, restore, and removal of Copilot instruction files
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export interface ExistingInstructions {
    exists: boolean;
    files: string[];
    hasBackup: boolean;
}

export interface Backup {
    id: string;
    timestamp: Date;
    files: string[];
}

export interface BackupResult {
    success: boolean;
    backupId: string;
    backupPath: string;
}

export class InstructionBackupManager {
    private readonly backupDir: string;
    private readonly instructionsDir: string;
    private readonly mainInstructionFile = 'copilot-instructions.md';

    constructor(
        private workspaceRoot: string,
        private outputChannel: vscode.OutputChannel
    ) {
        this.instructionsDir = path.join(workspaceRoot, '.github', 'instructions');
        this.backupDir = path.join(this.instructionsDir, '.backups');
    }

    /**
     * Check for existing Copilot instruction files
     */
    async checkExistingInstructions(): Promise<ExistingInstructions> {
        const mainFile = path.join(this.instructionsDir, this.mainInstructionFile);
        const exists = await this.fileExists(mainFile);
        
        let files: string[] = [];
        if (exists) {
            files = await this.findInstructionFiles();
        }

        const backups = await this.listBackups();
        const hasBackup = backups.length > 0;

        return { exists, files, hasBackup };
    }

    /**
     * Create a timestamped backup of instruction files
     */
    async createBackup(files: string[]): Promise<BackupResult> {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupId = timestamp;
        const backupPath = path.join(this.backupDir, backupId);

        try {
            // Create backup directory
            await fs.promises.mkdir(backupPath, { recursive: true });

            // Copy each file to backup
            for (const file of files) {
                const relativePath = path.relative(this.instructionsDir, file);
                const backupFilePath = path.join(backupPath, relativePath);
                
                // Create subdirectories if needed
                await fs.promises.mkdir(path.dirname(backupFilePath), { recursive: true });
                
                // Copy file
                await fs.promises.copyFile(file, backupFilePath);
            }

            this.outputChannel.appendLine(`📦 Created backup: ${backupId}`);
            
            return {
                success: true,
                backupId,
                backupPath
            };
        } catch (error) {
            this.outputChannel.appendLine(`❌ Backup failed: ${error}`);
            throw error;
        }
    }

    /**
     * Restore files from a specific backup
     */
    async restoreFromBackup(backupId: string): Promise<void> {
        const backupPath = path.join(this.backupDir, backupId);
        
        if (!await this.fileExists(backupPath)) {
            throw new Error(`Backup not found: ${backupId}`);
        }

        try {
            // Get all files in backup
            const backupFiles = await this.findFilesRecursive(backupPath);
            
            // Restore each file
            for (const backupFile of backupFiles) {
                const relativePath = path.relative(backupPath, backupFile);
                const targetPath = path.join(this.instructionsDir, relativePath);
                
                // Create directories if needed
                await fs.promises.mkdir(path.dirname(targetPath), { recursive: true });
                
                // Copy file back
                await fs.promises.copyFile(backupFile, targetPath);
            }

            this.outputChannel.appendLine(`✅ Restored from backup: ${backupId}`);
        } catch (error) {
            this.outputChannel.appendLine(`❌ Restore failed: ${error}`);
            throw error;
        }
    }

    /**
     * List all available backups
     */
    async listBackups(): Promise<Backup[]> {
        if (!await this.fileExists(this.backupDir)) {
            return [];
        }

        try {
            const entries = await fs.promises.readdir(this.backupDir, { withFileTypes: true });
            const backups: Backup[] = [];

            for (const entry of entries) {
                if (entry.isDirectory()) {
                    const backupPath = path.join(this.backupDir, entry.name);
                    const files = await this.findFilesRecursive(backupPath);
                    
                    // Parse timestamp from directory name
                    // Convert back from backup format (2024-01-15T10-30-45-123Z) to ISO string
                    const isoString = entry.name.replace(/T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z$/, 'T$1:$2:$3.$4Z');
                    const timestamp = new Date(isoString);
                    
                    // Skip invalid timestamps
                    if (isNaN(timestamp.getTime())) {
                        this.outputChannel.appendLine(`⚠️ Skipping backup with invalid timestamp: ${entry.name}`);
                        continue;
                    }
                    
                    backups.push({
                        id: entry.name,
                        timestamp,
                        files: files.map(f => path.relative(backupPath, f))
                    });
                }
            }

            // Sort by timestamp, newest first
            return backups.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        } catch (error) {
            this.outputChannel.appendLine(`⚠️ Failed to list backups: ${error}`);
            return [];
        }
    }

    /**
     * Remove instruction files after creating backup
     */
    async removeAndBackup(files: string[]): Promise<void> {
        // First create backup
        const backup = await this.createBackup(files);
        
        if (!backup.success) {
            throw new Error('Failed to create backup before removal');
        }

        // Then remove files
        try {
            for (const file of files) {
                await fs.promises.unlink(file);
            }

            // Clean up empty directories
            await this.cleanupEmptyDirs();

            this.outputChannel.appendLine('🗑️ Removed instruction files (backup preserved)');
        } catch (error) {
            this.outputChannel.appendLine(`❌ Removal failed: ${error}`);
            throw error;
        }
    }

    /**
     * Find all instruction files in the instructions directory
     */
    private async findInstructionFiles(): Promise<string[]> {
        const files: string[] = [];
        
        // Main instruction file
        const mainFile = path.join(this.instructionsDir, this.mainInstructionFile);
        if (await this.fileExists(mainFile)) {
            files.push(mainFile);
        }

        // Framework-specific directories
        const frameworkDirs = ['angular', 'react', 'vue', 'typescript', 'jest'];
        for (const dir of frameworkDirs) {
            const dirPath = path.join(this.instructionsDir, dir);
            if (await this.fileExists(dirPath)) {
                const dirFiles = await this.findFilesRecursive(dirPath);
                files.push(...dirFiles);
            }
        }

        return files.filter(f => !f.includes('.backups'));
    }

    /**
     * Recursively find all files in a directory
     */
    private async findFilesRecursive(dir: string): Promise<string[]> {
        const files: string[] = [];
        
        try {
            const entries = await fs.promises.readdir(dir, { withFileTypes: true });
            
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                
                if (entry.isDirectory()) {
                    const subFiles = await this.findFilesRecursive(fullPath);
                    files.push(...subFiles);
                } else if (entry.isFile()) {
                    files.push(fullPath);
                }
            }
        } catch (error) {
            // Directory might not exist
        }

        return files;
    }

    /**
     * Clean up empty directories
     */
    private async cleanupEmptyDirs(): Promise<void> {
        const frameworkDirs = ['angular', 'react', 'vue', 'typescript', 'jest'];
        
        for (const dir of frameworkDirs) {
            const dirPath = path.join(this.instructionsDir, dir);
            try {
                const entries = await fs.promises.readdir(dirPath);
                if (entries.length === 0) {
                    await fs.promises.rmdir(dirPath);
                }
            } catch {
                // Directory doesn't exist or not empty
            }
        }
    }

    /**
     * Check if a file or directory exists
     */
    private async fileExists(filePath: string): Promise<boolean> {
        try {
            await fs.promises.access(filePath);
            return true;
        } catch {
            return false;
        }
    }
}