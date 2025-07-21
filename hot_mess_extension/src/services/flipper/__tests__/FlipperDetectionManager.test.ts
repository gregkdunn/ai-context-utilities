import { FlipperDetectionManager } from '../FlipperDetectionManager';
import * as vscode from 'vscode';

// Mock dependencies
jest.mock('vscode');

describe('FlipperDetectionManager', () => {
    let flipperManager: FlipperDetectionManager;
    let mockContext: vscode.ExtensionContext;

    beforeEach(() => {
        mockContext = {
            subscriptions: [],
            extensionUri: vscode.Uri.file('/test')
        } as any;

        // Mock vscode.workspace
        (vscode.workspace as any).createFileSystemWatcher = jest.fn().mockReturnValue({
            onDidChange: jest.fn(),
            onDidCreate: jest.fn(),
            onDidDelete: jest.fn(),
            dispose: jest.fn()
        });

        flipperManager = new FlipperDetectionManager(mockContext);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('analyzeCode', () => {
        it('should detect FlipperService imports', async () => {
            const code = `import { FlipperService } from '@callrail/looky/core';`;
            
            const result = await flipperManager.analyzeCode(code);
            
            expect(result.detections).toHaveLength(1);
            expect(result.detections[0].type).toBe('import');
            expect(result.detections[0].pattern).toContain('FlipperService import');
        });

        it('should detect and extract flag names from flipperEnabled calls', async () => {
            const code = `if (this.flipperService.flipperEnabled('zuora_maintenance')) {`;
            
            const result = await flipperManager.analyzeCode(code);
            
            expect(result.detections).toHaveLength(3); // method_call, flag_literal, conditional
            const methodCallDetection = result.detections.find(d => d.type === 'method_call');
            expect(methodCallDetection).toBeDefined();
            expect(methodCallDetection!.flagName).toBe('zuora_maintenance');
        });

        it('should detect predefined observable usage', async () => {
            const code = `
                return this.flipperService.zuoraMaintenance$.pipe(
                    switchMap(enabled => enabled ? this.processPayment() : of(false))
                );
            `;
            
            const result = await flipperManager.analyzeCode(code);
            
            expect(result.detections.length).toBeGreaterThan(0);
            expect(result.detections.some(d => d.flagName === 'zuora_maintenance')).toBe(true);
        });

        it('should detect multiple different patterns in same code', async () => {
            const code = `
                import { FlipperService } from '@callrail/looky/core';
                
                export class TestService {
                    constructor(private flipperService: FlipperService) {}
                    
                    test() {
                        if (this.flipperService.flipperEnabled('test_flag')) {
                            return this.flipperService.eagerlyEnabled('another_flag');
                        }
                        return this.flipperService.zuoraMaintenance$.pipe(map(x => x));
                    }
                }
            `;
            
            const result = await flipperManager.analyzeCode(code);
            
            expect(result.detections.length).toBeGreaterThan(3);
            
            // Check for different types of detections
            const types = result.detections.map(d => d.type);
            expect(types).toContain('import');
            expect(types).toContain('injection');
            expect(types).toContain('method_call');
            expect(types).toContain('predefined_observable');
        });

        it('should detect Angular template patterns', async () => {
            const code = `<div *ngIf="flipperService.flipperEnabled('ui_feature')">Content</div>`;
            
            const result = await flipperManager.analyzeCode(code);
            
            expect(result.detections).toHaveLength(2); // method_call and template
            const templateDetection = result.detections.find(d => d.type === 'template');
            expect(templateDetection).toBeDefined();
            expect(templateDetection!.flagName).toBe('ui_feature');
        });

        it('should detect flag literals', async () => {
            const code = `const flag = 'zuora_maintenance';`;
            
            const result = await flipperManager.analyzeCode(code);
            
            expect(result.detections).toHaveLength(1);
            expect(result.detections[0].type).toBe('flag_literal');
            expect(result.detections[0].flagName).toBe('zuora_maintenance');
        });

        it('should provide context for detections', async () => {
            const code = `
                const someCode = 'before';
                if (this.flipperService.flipperEnabled('test_flag')) {
                    console.log('feature enabled');
                }
                const moreCode = 'after';
            `;
            
            const result = await flipperManager.analyzeCode(code);
            
            expect(result.detections).toHaveLength(2); // method_call and conditional
            const methodCallDetection = result.detections.find(d => d.type === 'method_call');
            expect(methodCallDetection).toBeDefined();
            expect(methodCallDetection!.context).toContain('flipperEnabled');
            expect(methodCallDetection!.context).toContain('test_flag');
        });

        it('should calculate line and column numbers correctly', async () => {
            const code = `line 1
line 2
if (this.flipperService.flipperEnabled('test_flag')) {
line 4`;
            
            const result = await flipperManager.analyzeCode(code);
            
            expect(result.detections).toHaveLength(2); // method_call and conditional
            const methodCallDetection = result.detections.find(d => d.type === 'method_call');
            expect(methodCallDetection).toBeDefined();
            expect(methodCallDetection!.line).toBe(3);
            expect(methodCallDetection!.column).toBeGreaterThan(0);
        });
    });

    describe('analyzeGitDiffForFlippers', () => {
        it('should analyze git diff and detect flipper changes', async () => {
            const mockDiff = `
diff --git a/src/app/services/billing.service.ts b/src/app/services/billing.service.ts
index 1234567..abcdefg 100644
--- a/src/app/services/billing.service.ts
+++ b/src/app/services/billing.service.ts
@@ -1,4 +1,8 @@
+import { FlipperService } from '@callrail/looky/core';
+
 export class BillingService {
+  constructor(private flipperService: FlipperService) {}
+  
+  isZuoraMaintenance = this.flipperService.flipperEnabled('zuora_maintenance');
   canProcessPayment(): Observable<boolean> {
     return of(true);
   }
            `;
            
            const result = await flipperManager.analyzeGitDiffForFlippers(mockDiff);
            
            expect(result.detectedFlags).toContain('zuora_maintenance');
            expect(result.files).toHaveLength(1);
            expect(result.files[0].path).toBe('src/app/services/billing.service.ts');
            expect(result.files[0].detections.length).toBeGreaterThan(0);
        });

        it('should generate QA section for PR', async () => {
            const mockDiff = `
diff --git a/src/app/test.ts b/src/app/test.ts
+  if (this.flipperService.flipperEnabled('new_feature')) {
+    // New feature implementation
+  }
            `;
            
            const result = await flipperManager.analyzeGitDiffForFlippers(mockDiff);
            
            expect(result.qaSection).toContain('🔄 Feature Flags / Flipper Changes');
            expect(result.qaSection).toContain('QA Checklist - Flipper Setup Required');
            expect(result.qaSection).toContain('new_feature');
            expect(result.qaSection).toContain('Schedule flipper removal');
        });

        it('should generate details section for environment setup', async () => {
            const mockDiff = `
diff --git a/src/app/test.ts b/src/app/test.ts
+  if (this.flipperService.flipperEnabled('test_flag')) {
+    return true;
+  }
            `;
            
            const result = await flipperManager.analyzeGitDiffForFlippers(mockDiff);
            
            expect(result.detailsSection).toContain('Environment Setup Details');
            expect(result.detailsSection).toContain('Staging Environment Setup');
            expect(result.detailsSection).toContain('Production Environment Setup');
            expect(result.detailsSection).toContain('test_flag');
        });

        it('should return empty sections when no flippers detected', async () => {
            const mockDiff = `
diff --git a/src/app/test.ts b/src/app/test.ts
+  const normalCode = 'no flippers here';
            `;
            
            const result = await flipperManager.analyzeGitDiffForFlippers(mockDiff);
            
            expect(result.detectedFlags).toHaveLength(0);
            expect(result.qaSection).toBe('');
            expect(result.detailsSection).toBe('');
        });

        it('should only analyze relevant file types', async () => {
            const mockDiff = `
diff --git a/README.md b/README.md
+  # This contains flipperEnabled('test') but should be ignored
diff --git a/src/app/test.ts b/src/app/test.ts
+  if (this.flipperService.flipperEnabled('real_flag')) {
            `;
            
            const result = await flipperManager.analyzeGitDiffForFlippers(mockDiff);
            
            expect(result.files).toHaveLength(1);
            expect(result.files[0].path).toBe('src/app/test.ts');
            expect(result.detectedFlags).toEqual(['real_flag']);
        });
    });

    describe('caching', () => {
        it('should cache analysis results', async () => {
            const code = `if (this.flipperService.flipperEnabled('test_flag')) {}`;
            
            // First call
            const result1 = await flipperManager.analyzeCode(code);
            
            // Second call should use cache
            const result2 = await flipperManager.analyzeCode(code);
            
            expect(result1).toEqual(result2);
            expect(result1.detections).toHaveLength(2); // method_call and conditional
        });
    });

    describe('flag mapping', () => {
        it('should map predefined observables to correct flag names', async () => {
            const code = `return this.flipperService.zuoraMaintenance$.pipe(map(x => x));`;
            
            const result = await flipperManager.analyzeCode(code);
            
            expect(result.detections.some(d => d.flagName === 'zuora_maintenance')).toBe(true);
        });

        it('should handle all predefined observable mappings', async () => {
            const code = `
                this.flipperService.zuoraMaintenance$.subscribe();
                this.flipperService.reportingNoop$.subscribe();
                this.flipperService.acceleratedCallLog$.subscribe();
                this.flipperService.otherHomepage$.subscribe();
                this.flipperService.fullstory$.subscribe();
                this.flipperService.cursorPaginateAcceleratedCallLog$.subscribe();
            `;
            
            const result = await flipperManager.analyzeCode(code);
            
            const expectedFlags = [
                'zuora_maintenance',
                'reporting_noop',
                'accelerated_call_log',
                'other_homepage',
                'allow_fullstory_tracking',
                'cursor_paginate_accelerated_call_log'
            ];
            
            const detectedFlags = result.detections.map(d => d.flagName).filter(Boolean);
            expectedFlags.forEach(flag => {
                expect(detectedFlags).toContain(flag);
            });
        });
    });
});
