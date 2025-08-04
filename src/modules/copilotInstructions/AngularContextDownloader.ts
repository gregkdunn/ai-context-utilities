/**
 * Angular Context Downloader
 * Downloads and saves Angular-specific context files from angular.dev
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { SecureFileManager } from './SecureFileManager';

export interface AngularContextFile {
    url: string;
    localPath: string;
    description: string;
}

export class AngularContextDownloader {
    private readonly angularContextFiles: AngularContextFile[] = [
        {
            url: 'https://angular.dev/context/llm-files/llms-full.txt',
            localPath: '.github/instructions/frameworks/angular-llm-context.txt',
            description: 'Comprehensive Angular context for LLMs'
        },
        {
            url: 'https://angular.dev/assets/context/best-practices.md',
            localPath: '.github/instructions/frameworks/angular-best-practices.md',
            description: 'Angular best practices and guidelines'
        }
    ];

    constructor(
        private workspaceRoot: string,
        private outputChannel: vscode.OutputChannel,
        private fileManager: SecureFileManager
    ) {}

    /**
     * Download and save Angular context files if Angular is detected
     */
    async downloadAngularContext(): Promise<{ success: boolean; downloadedFiles: string[] }> {
        const downloadedFiles: string[] = [];

        try {
            this.outputChannel.appendLine('🔍 Downloading Angular context files...');

            for (const contextFile of this.angularContextFiles) {
                try {
                    const content = await this.downloadFile(contextFile.url);
                    
                    if (content) {
                        // Add header comment to the file
                        const headerComment = this.getHeaderComment(contextFile);
                        const finalContent = headerComment + '\n\n' + content;
                        
                        await this.fileManager.writeFile(contextFile.localPath, finalContent);
                        downloadedFiles.push(contextFile.localPath);
                        
                        this.outputChannel.appendLine(`✅ Downloaded: ${contextFile.description}`);
                        this.outputChannel.appendLine(`   Saved to: ${contextFile.localPath}`);
                    } else {
                        this.outputChannel.appendLine(`⚠️ Failed to download: ${contextFile.url}`);
                    }
                } catch (error) {
                    this.outputChannel.appendLine(`❌ Error downloading ${contextFile.url}: ${error}`);
                }
            }

            if (downloadedFiles.length > 0) {
                this.outputChannel.appendLine(`🎉 Successfully downloaded ${downloadedFiles.length} Angular context files`);
                return { success: true, downloadedFiles };
            } else {
                this.outputChannel.appendLine(`⚠️ No Angular context files were downloaded`);
                return { success: false, downloadedFiles: [] };
            }

        } catch (error) {
            this.outputChannel.appendLine(`❌ Angular context download failed: ${error}`);
            return { success: false, downloadedFiles: [] };
        }
    }

    /**
     * Check if Angular context files already exist and are recent
     */
    async areContextFilesUpToDate(): Promise<boolean> {
        try {
            const fs = require('fs');
            const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
            const now = Date.now();

            for (const contextFile of this.angularContextFiles) {
                const absolutePath = path.join(this.workspaceRoot, contextFile.localPath);
                
                if (!fs.existsSync(absolutePath)) {
                    return false; // File doesn't exist
                }

                const stats = fs.statSync(absolutePath);
                const fileAge = now - stats.mtime.getTime();
                
                if (fileAge > maxAge) {
                    return false; // File is older than 7 days
                }
            }

            return true; // All files exist and are recent
        } catch (error) {
            this.outputChannel.appendLine(`⚠️ Could not check Angular context file ages: ${error}`);
            return false;
        }
    }

    /**
     * Download file content from URL
     */
    private async downloadFile(url: string): Promise<string | null> {
        try {
            // Use VS Code's built-in HTTP capabilities if available
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const content = await response.text();
            return content;

        } catch (error) {
            // Fallback to Node.js https module
            try {
                return await this.downloadWithNodeHttps(url);
            } catch (fallbackError) {
                this.outputChannel.appendLine(`❌ Both fetch and HTTPS fallback failed for ${url}`);
                this.outputChannel.appendLine(`   Fetch error: ${error}`);
                this.outputChannel.appendLine(`   HTTPS error: ${fallbackError}`);
                return null;
            }
        }
    }

    /**
     * Fallback download using Node.js HTTPS module
     */
    private async downloadWithNodeHttps(url: string): Promise<string> {
        return new Promise((resolve, reject) => {
            const https = require('https');
            
            https.get(url, (response: any) => {
                if (response.statusCode !== 200) {
                    reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
                    return;
                }

                let data = '';
                response.on('data', (chunk: string) => {
                    data += chunk;
                });

                response.on('end', () => {
                    resolve(data);
                });

            }).on('error', (error: Error) => {
                reject(error);
            });
        });
    }

    /**
     * Generate header comment for downloaded files
     */
    private getHeaderComment(contextFile: AngularContextFile): string {
        const now = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
        
        if (contextFile.localPath.endsWith('.md')) {
            return `<!--
${contextFile.description}
Source: ${contextFile.url}
Downloaded: ${now}
Auto-generated by AI Context Util v3.5.0 - Copilot Instructions Module

This file is automatically downloaded when Angular is detected in the project.
It provides comprehensive Angular context for GitHub Copilot and other LLMs.
-->`;
        } else {
            return `# ${contextFile.description}
# Source: ${contextFile.url}
# Downloaded: ${now}
# Auto-generated by AI Context Util v3.5.0 - Copilot Instructions Module
#
# This file is automatically downloaded when Angular is detected in the project.
# It provides comprehensive Angular context for GitHub Copilot and other LLMs.`;
        }
    }

    /**
     * Get list of Angular context files that should be created
     */
    getAngularContextPaths(): string[] {
        return this.angularContextFiles.map(file => file.localPath);
    }

    /**
     * Generate instruction content linking to Angular context files
     */
    generateAngularContextInstructions(): string {
        const sections = [];

        sections.push('# Angular Framework Context');
        sections.push('');
        sections.push('**HIGH PRIORITY**: This project uses Angular. The following official Angular context files provide authoritative framework guidance:');
        sections.push('');

        for (const contextFile of this.angularContextFiles) {
            const fileName = contextFile.localPath.split('/').pop() || contextFile.localPath;
            const relativePath = contextFile.localPath.startsWith('.github/instructions/') 
                ? contextFile.localPath.substring('.github/instructions/'.length)
                : contextFile.localPath;

            sections.push(`## ${contextFile.description}`);
            sections.push('');
            sections.push(`**File**: [${fileName}](./${relativePath})`);
            sections.push(`**Source**: ${contextFile.url}`);
            sections.push('');
            sections.push(`This file contains ${contextFile.description.toLowerCase()} and is automatically downloaded from angular.dev.`);
            sections.push('');
        }

        sections.push('## Usage');
        sections.push('');
        sections.push('These files are automatically included in your Copilot context when working with Angular projects.');
        sections.push('They provide up-to-date Angular best practices, patterns, and API documentation.');
        sections.push('');
        sections.push('### Key Benefits');
        sections.push('');
        sections.push('- **Official Source**: Direct from Angular team at angular.dev (highest authority)');
        sections.push('- **High Priority**: Takes precedence over generic framework guidelines');
        sections.push('- **Current Information**: Downloaded from official Angular documentation');
        sections.push('- **Comprehensive Coverage**: Includes patterns, best practices, and API guidance');
        sections.push('- **Automatic Updates**: Files are refreshed weekly when generating instructions');
        sections.push('- **LLM Optimized**: Content is specifically formatted for language model consumption');
        sections.push('');
        sections.push('### Priority Order');
        sections.push('');
        sections.push('1. **User Overrides** (Priority 1000) - Your team decisions override everything');
        sections.push('2. **Angular Official Docs** (Priority 900) - These files take precedence over other framework guidance');
        sections.push('3. **Framework Guidelines** (Priority 100) - General Angular patterns and practices');
        sections.push('4. **Code Quality Rules** (Priority 30-50) - ESLint, TypeScript, and formatting guidelines');
        sections.push('');

        return sections.join('\n');
    }
}