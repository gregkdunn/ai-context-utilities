/**
 * Unit tests for AngularContextDownloader
 */

import { AngularContextDownloader } from '../../../../modules/copilotInstructions/AngularContextDownloader';
import { SecureFileManager } from '../../../../modules/copilotInstructions/SecureFileManager';
import * as vscode from 'vscode';

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
    existsSync: jest.fn(),
    statSync: jest.fn()
}));

// Mock SecureFileManager
jest.mock('../../../../modules/copilotInstructions/SecureFileManager');

// Mock fetch
global.fetch = jest.fn();

describe('AngularContextDownloader', () => {
    let downloader: AngularContextDownloader;
    let mockOutputChannel: any;
    let mockFileManager: jest.Mocked<SecureFileManager>;

    beforeEach(() => {
        mockOutputChannel = {
            appendLine: jest.fn(),
            show: jest.fn(),
            dispose: jest.fn()
        };

        mockFileManager = new SecureFileManager('/test/workspace', mockOutputChannel) as jest.Mocked<SecureFileManager>;
        mockFileManager.writeFile = jest.fn().mockResolvedValue(undefined);

        downloader = new AngularContextDownloader('/test/workspace', mockOutputChannel, mockFileManager);

        jest.clearAllMocks();
    });

    describe('downloadAngularContext', () => {
        test('should successfully download Angular context files', async () => {
            // Mock successful fetch responses
            (global.fetch as jest.Mock)
                .mockResolvedValueOnce({
                    ok: true,
                    text: jest.fn().mockResolvedValue('Angular LLM context content')
                })
                .mockResolvedValueOnce({
                    ok: true,
                    text: jest.fn().mockResolvedValue('# Angular Best Practices\n\nContent here...')
                });

            const result = await downloader.downloadAngularContext();

            expect(result.success).toBe(true);
            expect(result.downloadedFiles).toHaveLength(2);
            expect(result.downloadedFiles).toContain('.github/instructions/frameworks/angular-llm-context.txt');
            expect(result.downloadedFiles).toContain('.github/instructions/frameworks/angular-best-practices.md');

            // Verify files were written
            expect(mockFileManager.writeFile).toHaveBeenCalledTimes(2);
            expect(mockFileManager.writeFile).toHaveBeenCalledWith(
                '.github/instructions/frameworks/angular-llm-context.txt',
                expect.stringContaining('Angular LLM context content')
            );
            expect(mockFileManager.writeFile).toHaveBeenCalledWith(
                '.github/instructions/frameworks/angular-best-practices.md',
                expect.stringContaining('Angular Best Practices')
            );

            // Verify output messages
            expect(mockOutputChannel.appendLine).toHaveBeenCalledWith('🔍 Downloading Angular context files...');
            expect(mockOutputChannel.appendLine).toHaveBeenCalledWith('✅ Downloaded: Comprehensive Angular context for LLMs');
            expect(mockOutputChannel.appendLine).toHaveBeenCalledWith('✅ Downloaded: Angular best practices and guidelines');
        });

        test('should handle download failures gracefully', async () => {
            // Mock failed fetch and failed https fallback
            (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));
            
            // Mock https module to also fail
            const mockHttps = {
                get: jest.fn((url: string, callback: any) => {
                    const mockRequest: any = {
                        on: jest.fn((event: string, handler: any): any => {
                            if (event === 'error') {
                                // Simulate network error
                                setTimeout(() => handler(new Error('HTTPS fallback failed')), 0);
                            }
                            return mockRequest;
                        })
                    };
                    return mockRequest;
                })
            };
            
            jest.doMock('https', () => mockHttps);

            const result = await downloader.downloadAngularContext();

            expect(result.success).toBe(false);
            expect(result.downloadedFiles).toHaveLength(0);
            expect(mockFileManager.writeFile).not.toHaveBeenCalled();
            expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
                expect.stringContaining('❌ Error downloading')
            );
        });

        test('should handle HTTP errors', async () => {
            // Mock HTTP error response and failed https fallback
            (global.fetch as jest.Mock).mockResolvedValue({
                ok: false,
                status: 404,
                statusText: 'Not Found'
            });
            
            // Mock https module to also fail
            const mockHttps = {
                get: jest.fn((url: string, callback: any) => {
                    const mockRequest: any = {
                        on: jest.fn((event: string, handler: any): any => {
                            if (event === 'error') {
                                setTimeout(() => handler(new Error('HTTPS fallback failed')), 0);
                            }
                            return mockRequest;
                        })
                    };
                    return mockRequest;
                })
            };
            
            jest.doMock('https', () => mockHttps);

            const result = await downloader.downloadAngularContext();

            expect(result.success).toBe(false);
            expect(result.downloadedFiles).toHaveLength(0);
        });

        test('should add header comments to downloaded files', async () => {
            (global.fetch as jest.Mock)
                .mockResolvedValueOnce({
                    ok: true,
                    text: jest.fn().mockResolvedValue('content')
                })
                .mockResolvedValueOnce({
                    ok: true,
                    text: jest.fn().mockResolvedValue('content')
                });

            await downloader.downloadAngularContext();

            // Check that header comments were added
            const txtCall = (mockFileManager.writeFile as jest.Mock).mock.calls.find(
                call => call[0].endsWith('.txt')
            );
            const mdCall = (mockFileManager.writeFile as jest.Mock).mock.calls.find(
                call => call[0].endsWith('.md')
            );

            expect(txtCall[1]).toMatch(/^# Comprehensive Angular context for LLMs/);
            expect(txtCall[1]).toContain('Source: https://angular.dev/context/llm-files/llms-full.txt');
            expect(txtCall[1]).toContain('Auto-generated by AI Context Util');

            expect(mdCall[1]).toMatch(/^<!--/);
            expect(mdCall[1]).toContain('Source: https://angular.dev/assets/context/best-practices.md');
            expect(mdCall[1]).toContain('Auto-generated by AI Context Util');
        });
    });

    describe('areContextFilesUpToDate', () => {
        test('should return false if files do not exist', async () => {
            const fs = require('fs');
            (fs.existsSync as jest.Mock).mockReturnValue(false);

            const result = await downloader.areContextFilesUpToDate();

            expect(result).toBe(false);
        });

        test('should return false if files are older than 7 days', async () => {
            const fs = require('fs');
            (fs.existsSync as jest.Mock).mockReturnValue(true);
            (fs.statSync as jest.Mock).mockReturnValue({
                mtime: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000) // 8 days ago
            });

            const result = await downloader.areContextFilesUpToDate();

            expect(result).toBe(false);
        });

        test('should return true if files exist and are recent', async () => {
            const fs = require('fs');
            (fs.existsSync as jest.Mock).mockReturnValue(true);
            (fs.statSync as jest.Mock).mockReturnValue({
                mtime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2 days ago
            });

            const result = await downloader.areContextFilesUpToDate();

            expect(result).toBe(true);
        });
    });

    describe('generateAngularContextInstructions', () => {
        test('should generate instructions linking to Angular context files', () => {
            const instructions = downloader.generateAngularContextInstructions();

            expect(instructions).toContain('# Angular Framework Context');
            expect(instructions).toContain('angular-llm-context.txt');
            expect(instructions).toContain('angular-best-practices.md');
            expect(instructions).toContain('https://angular.dev/context/llm-files/llms-full.txt');
            expect(instructions).toContain('https://angular.dev/assets/context/best-practices.md');
            expect(instructions).toContain('automatically downloaded from angular.dev');
        });
    });

    describe('getAngularContextPaths', () => {
        test('should return list of Angular context file paths', () => {
            const paths = downloader.getAngularContextPaths();

            expect(paths).toHaveLength(2);
            expect(paths).toContain('.github/instructions/frameworks/angular-llm-context.txt');
            expect(paths).toContain('.github/instructions/frameworks/angular-best-practices.md');
        });
    });
});