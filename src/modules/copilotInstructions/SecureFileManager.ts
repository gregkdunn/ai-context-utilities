/**
 * Secure File Manager
 * Handles safe file operations with path validation and content sanitization
 */

import * as path from 'path';
import * as fs from 'fs';
import * as vscode from 'vscode';

export class SecureFileManager {
    private readonly allowedPaths = ['.github/', '.github/instructions/', '.github/instructions/frameworks/', '.github/prompts/'];
    
    constructor(
        private workspaceRoot: string,
        private outputChannel: vscode.OutputChannel
    ) {}

    /**
     * Write file with security checks
     */
    async writeFile(filePath: string, content: string): Promise<void> {
        const absolutePath = path.isAbsolute(filePath) 
            ? filePath 
            : path.join(this.workspaceRoot, filePath);

        if (!this.isPathAllowed(absolutePath)) {
            throw new Error(`Security: Path not allowed: ${filePath}`);
        }

        // Sanitize content
        const sanitized = this.sanitizeContent(content);

        // Create directory if needed
        const dir = path.dirname(absolutePath);
        await fs.promises.mkdir(dir, { recursive: true });

        // Write file
        await fs.promises.writeFile(absolutePath, sanitized, 'utf8');
        
        this.outputChannel.appendLine(`📝 Wrote file: ${path.relative(this.workspaceRoot, absolutePath)}`);
    }

    /**
     * Read file with security checks
     */
    async readFile(filePath: string): Promise<string> {
        const absolutePath = path.isAbsolute(filePath) 
            ? filePath 
            : path.join(this.workspaceRoot, filePath);

        if (!this.isPathAllowed(absolutePath)) {
            throw new Error(`Security: Path not allowed: ${filePath}`);
        }

        return await fs.promises.readFile(absolutePath, 'utf8');
    }

    /**
     * Check if file exists
     */
    async exists(filePath: string): Promise<boolean> {
        const absolutePath = path.isAbsolute(filePath) 
            ? filePath 
            : path.join(this.workspaceRoot, filePath);

        try {
            await fs.promises.access(absolutePath);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Validate path is within allowed directories
     */
    private isPathAllowed(filePath: string): boolean {
        const normalizedPath = path.normalize(filePath);
        const relativePath = path.relative(this.workspaceRoot, normalizedPath);

        // Prevent directory traversal
        if (relativePath.includes('..')) {
            this.outputChannel.appendLine(`⚠️ Security: Directory traversal attempt blocked: ${filePath}`);
            return false;
        }

        // Check if path is within allowed directories
        const isAllowed = this.allowedPaths.some(allowed => {
            const allowedFull = path.join(this.workspaceRoot, allowed);
            return normalizedPath.startsWith(allowedFull);
        });

        if (!isAllowed) {
            this.outputChannel.appendLine(`⚠️ Security: Path outside allowed directories: ${filePath}`);
        }

        return isAllowed;
    }

    /**
     * Sanitize content to remove potentially harmful elements
     */
    private sanitizeContent(content: string): string {
        // Remove potential script injections
        let sanitized = content;

        // Remove HTML script tags
        sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

        // Remove event handlers
        sanitized = sanitized.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');

        // Remove javascript: protocol
        sanitized = sanitized.replace(/javascript:/gi, '');

        // Ensure proper line endings
        sanitized = sanitized.replace(/\r\n/g, '\n');

        return sanitized;
    }

    /**
     * Create directory with security checks
     */
    async createDirectory(dirPath: string): Promise<void> {
        const absolutePath = path.isAbsolute(dirPath) 
            ? dirPath 
            : path.join(this.workspaceRoot, dirPath);

        if (!this.isPathAllowed(absolutePath)) {
            throw new Error(`Security: Path not allowed: ${dirPath}`);
        }

        await fs.promises.mkdir(absolutePath, { recursive: true });
        
        this.outputChannel.appendLine(`📁 Created directory: ${path.relative(this.workspaceRoot, absolutePath)}`);
    }

    /**
     * List files in directory with security checks
     */
    async listFiles(dirPath: string): Promise<string[]> {
        const absolutePath = path.isAbsolute(dirPath) 
            ? dirPath 
            : path.join(this.workspaceRoot, dirPath);

        if (!this.isPathAllowed(absolutePath)) {
            throw new Error(`Security: Path not allowed: ${dirPath}`);
        }

        try {
            const files = await fs.promises.readdir(absolutePath);
            return files.map(file => path.join(dirPath, file));
        } catch {
            return [];
        }
    }
}