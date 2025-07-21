import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { 
    FlipperBroadPattern, 
    FlipperDetection, 
    FlipperFileResult, 
    FlipperGitDiffResult, 
    GitFileChange, 
    ParsedGitDiff, 
    FlipperDetectionResult 
} from './FlipperTypes';

export class FlipperDetectionManager {
    private broadPatterns: FlipperBroadPattern[] = [];
    private cache = new Map<string, FlipperDetectionResult>();

    constructor(private context: vscode.ExtensionContext) {
        this.initializeBroadPatterns();
        this.setupFileWatcher();
    }

    private initializeBroadPatterns(): void {
        this.broadPatterns = [
            // 1. FlipperService imports and dependencies
            {
                type: 'import',
                pattern: /import\s+.*FlipperService.*from\s+['"]@callrail\/looky\/core['"]/g,
                description: 'FlipperService import',
                extractFlag: false
            },
            {
                type: 'import',
                pattern: /import\s+.*FlipperFlags.*from.*flipper-flags/g,
                description: 'FlipperFlags type import',
                extractFlag: false
            },
            {
                type: 'injection',
                pattern: /constructor\([^)]*FlipperService[^)]*\)/g,
                description: 'FlipperService dependency injection',
                extractFlag: false
            },
            
            // 2. Direct method calls with flag extraction
            {
                type: 'method_call',
                pattern: /\.flipperEnabled\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g,
                description: 'flipperEnabled() method call',
                extractFlag: true
            },
            {
                type: 'method_call',
                pattern: /\.eagerlyEnabled\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g,
                description: 'eagerlyEnabled() method call',
                extractFlag: true
            },
            
            // 3. Observable patterns from FlipperService
            {
                type: 'observable',
                pattern: /(\w+)\$:\s*Observable<boolean>\s*=\s*this\.flipper\$\.pipe\(/g,
                description: 'Flipper observable declaration',
                extractFlag: true,
                flagIndex: 1
            },
            {
                type: 'observable',
                pattern: /\.pipe\(\s*map\(\s*\([^)]*\)\s*=>\s*[^.]*\.isEnabled\s*\(\s*['"`]([^'"`]+)['"`]\s*\)\s*\)/g,
                description: 'Feature flag check in observable pipe',
                extractFlag: true
            },
            
            // 4. Specific pre-defined observables from actual FlipperService
            {
                type: 'predefined_observable',
                pattern: /(zuoraMaintenance|reportingNoop|acceleratedCallLog|otherHomepage|fullstory|cursorPaginateAcceleratedCallLog)\$/g,
                description: 'Pre-defined flipper observable usage',
                extractFlag: true,
                flagMapping: {
                    'zuoraMaintenance': 'zuora_maintenance',
                    'reportingNoop': 'reporting_noop',
                    'acceleratedCallLog': 'accelerated_call_log',
                    'otherHomepage': 'other_homepage',
                    'fullstory': 'allow_fullstory_tracking',
                    'cursorPaginateAcceleratedCallLog': 'cursor_paginate_accelerated_call_log'
                }
            },
            
            // 5. Configuration and setup patterns
            {
                type: 'configuration',
                pattern: /loadFlippers\s*\([^)]*\)/g,
                description: 'Flipper configuration loading',
                extractFlag: false
            },
            {
                type: 'configuration',
                pattern: /enabledFlippers\s*\([^)]*\)/g,
                description: 'Flipper enablement configuration',
                extractFlag: false
            },
            
            // 6. Feature flag string literals (comprehensive list)
            {
                type: 'flag_literal',
                pattern: /['"`](zuora_maintenance|pendo_resource_center|support_chat|show_cc_link_to_pending|show_call_tracking_migration_alert|ci_forms_incentive|reporting_noop|internal_calling|add_remove_lc_agents_ux|zuora_qa|account_billing_usage|use_inti|use_inti_for_bulk_google_adword|use_inti_for_my_case|use_inti_for_unbounce|apple_business_connect|use_inti_for_triggers|use_inti_for_hub_spot|use_inti_for_slack|use_inti_for_ms_teams|other_homepage|accelerated_call_log|homey_enabled|limit_client_view|rollout_anubis|allow_fullstory_tracking|new_numbers_page|cursor_paginate_accelerated_call_log|homepage_onboarding|ai_alpha_action_items|pre_ten_dlc_in_app_messaging|ai_alpha_new_or_existing_customer|ai_alpha_appointment_scheduled|ai_alpha_ai_coach|override_days_to_renewal|ai_alpha_questions_asked|ai_alpha_caller_details|ai_alpha_follow_up_email|ai_alpha_lead_qualification|ai_alpha_led_to_sale|pendo_segmentation|product_tier|prosperstack_flow|ai_alphas_white_label|kyc_registration_live|accelerated_reports|ai_alpha_lead_score|inbound_call_recording|year_end_metrics|click_to_contact_dynamic|account_deletion_ui|sa_update_plans_looky|automation_rule_new_criterias|business_profile_page|smart-follow-up-message-new-tag|voice_assist_workflow_page|native_10dlc_registration|hubspot_e164|voice_assist_select|voice_assist_test_call|automation_rules_templates)['"`]/g,
                description: 'Feature flag string literal',
                extractFlag: true
            },
            
            // 7. Conditional patterns
            {
                type: 'conditional',
                pattern: /if\s*\([^)]*\.(?:flipperEnabled|eagerlyEnabled|isEnabled)\s*\(\s*['"`]([^'"`]+)['"`]\s*\)[^)]*\)/g,
                description: 'Conditional flipper check',
                extractFlag: true
            },
            
            // 8. Template/HTML patterns
            {
                type: 'template',
                pattern: /\*ngIf\s*=\s*['"`][^'"`]*(?:flipperEnabled|eagerlyEnabled)\s*\(\s*['"`]([^'"`]+)['"`]\s*\)[^'"`]*['"`]/g,
                description: 'Angular template flipper conditional',
                extractFlag: true
            }
        ];
    }

    private setupFileWatcher(): void {
        const watcher = vscode.workspace.createFileSystemWatcher('**/*');
        watcher.onDidChange(() => this.cache.clear());
        watcher.onDidCreate(() => this.cache.clear());
        watcher.onDidDelete(() => this.cache.clear());
        this.context.subscriptions.push(watcher);
    }

    // Main method to integrate with Git Diff analysis
    async analyzeGitDiffForFlippers(diffContent: string): Promise<FlipperGitDiffResult> {
        const parsedDiff = this.parseGitDiff(diffContent);
        const flipperResults: FlipperFileResult[] = [];
        const detectedFlags = new Set<string>();

        for (const file of parsedDiff.files) {
            if (this.shouldAnalyzeFile(file.path)) {
                const fileResult = await this.analyzeFileForFlippers(file);
                if (fileResult.detections.length > 0) {
                    flipperResults.push(fileResult);
                    fileResult.detections.forEach(d => {
                        if (d.flagName) {detectedFlags.add(d.flagName);}
                    });
                }
            }
        }

        const prSections = this.generatePRSection(Array.from(detectedFlags));

        return {
            files: flipperResults,
            detectedFlags: Array.from(detectedFlags),
            summary: this.generateFlipperSummary(flipperResults),
            qaSection: prSections.qaSection,
            detailsSection: prSections.detailsSection
        };
    }

    async analyzeCode(content: string): Promise<FlipperDetectionResult> {
        const cacheKey = this.generateCacheKey(content);
        
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey)!;
        }

        const detections: FlipperDetection[] = [];

        for (const pattern of this.broadPatterns) {
            let match;
            const regex = new RegExp(pattern.pattern.source, pattern.pattern.flags);

            while ((match = regex.exec(content)) !== null) {
                const flagName = this.extractFlagName(match, pattern);

                const detection: FlipperDetection = {
                    type: pattern.type,
                    pattern: pattern.description,
                    line: this.getLineNumber(content, match.index),
                    column: this.getColumnNumber(content, match.index),
                    match: match[0],
                    flagName: flagName,
                    context: this.getContext(content, match.index, 50)
                };

                detections.push(detection);
            }
        }

        const result: FlipperDetectionResult = {
            detections,
            summary: this.generateDetectionSummary(detections)
        };

        this.cache.set(cacheKey, result);
        return result;
    }

    private async analyzeFileForFlippers(file: GitFileChange): Promise<FlipperFileResult> {
        const detections: FlipperDetection[] = [];
        let content = file.content || '';

        // If content is not provided, try to read from file system
        if (!content && file.status !== 'deleted') {
            try {
                const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
                if (workspaceRoot) {
                    const filePath = path.join(workspaceRoot, file.path);
                    if (fs.existsSync(filePath)) {
                        content = fs.readFileSync(filePath, 'utf-8');
                    }
                }
            } catch (error) {
                console.warn(`Failed to read file ${file.path}:`, error);
            }
        }

        if (content) {
            const result = await this.analyzeCode(content);
            detections.push(...result.detections);
        }

        return {
            path: file.path,
            detections,
            changeType: file.status
        };
    }

    private extractFlagName(match: RegExpExecArray, pattern: FlipperBroadPattern): string | undefined {
        if (!pattern.extractFlag) {return undefined;}

        // Handle flag mapping for predefined observables
        if (pattern.flagMapping && match[1]) {
            return pattern.flagMapping[match[1]] || match[1];
        }

        // Extract flag from specified index or default to index 1
        const flagIndex = pattern.flagIndex || 1;
        return match[flagIndex];
    }

    private generatePRSection(detectedFlags: string[]): { qaSection: string, detailsSection: string } {
        if (detectedFlags.length === 0) {return { qaSection: '', detailsSection: '' };}

        const flagList = detectedFlags.map(flag => `- \`${flag}\``).join('\n');

        const qaSection = `## 🔄 Feature Flags / Flipper Changes

**⚠️ This work is being hidden behind Feature Flags (Flippers)**

### Detected Flipper Changes:
${flagList}

### 📋 QA Checklist - Flipper Setup Required:
- [ ] Test functionality with flipper(s) **DISABLED** (fallback behavior)
- [ ] Test functionality with flipper(s) **ENABLED** (new behavior)
- [ ] Verify flipper(s) can be toggled without requiring deployment

### 🧹 Post-Release Cleanup:
- [ ] Remove flipper conditional logic from codebase
- [ ] **IMPORTANT**: Schedule flipper removal after 100% rollout
- [ ] Clean up unused flipper definitions
- [ ] Update documentation to reflect permanent changes`;

        const detailsSection = `## 🔧 Environment Setup Details - Flipper Configuration

### Staging Environment Setup:
1. **Flipper Dashboard Configuration:**
   - Access Staging Flipper dashboard
   - Verify the following flipper(s) are configured:
     ${flagList}
   - Ensure flipper(s) are initially set to **DISABLED**

2. **Testing Protocol:**
   - Deploy to staging with flipper(s) disabled
   - Verify fallback behavior works correctly
   - Enable flipper(s) and test new functionality
   - Confirm flipper(s) can be toggled without redeployment

### Production Environment Setup:
1. **Pre-Deployment:**
   - Ensure flipper(s) are configured in Production Flipper dashboard
   - Set flipper(s) to **DISABLED** initially
   - Document rollback procedure

2. **Rollout Strategy:**
   - Plan gradual rollout (percentage-based or user-based)
   - Monitor metrics and error rates during rollout
   - Have rollback plan ready in case of issues

### 🔗 Resources:
- [Flipper Documentation](https://callrail.atlassian.net/l/c/u7fFhHPM)
- [Flipper Cloud Dashboard](https://www.flippercloud.io/docs/ui)

### 📞 Coordination Required:
- **PR Developer**: Responsible for flipper configuration across environments
- **QA Team**: For testing both enabled/disabled states
- **Product Team**: For rollout strategy and success metrics

> **⚠️ Important**: This feature requires environment setup before deployment. Coordinate with DevOps team early in the development cycle.`;

        return { qaSection, detailsSection };
    }

    private parseGitDiff(diffContent: string): ParsedGitDiff {
        const lines = diffContent.split('\n');
        const files: GitFileChange[] = [];
        let currentFile: GitFileChange | null = null;
        let currentContent = '';

        for (const line of lines) {
            if (line.startsWith('diff --git')) {
                // Save previous file if exists
                if (currentFile) {
                    currentFile.content = currentContent;
                    files.push(currentFile);
                }
                
                // Start new file
                const match = line.match(/diff --git a\/(.+) b\/(.+)/);
                if (match) {
                    currentFile = {
                        path: match[2],
                        status: 'modified',
                        content: ''
                    };
                    currentContent = '';
                }
            } else if (line.startsWith('new file mode')) {
                if (currentFile) {currentFile.status = 'added';}
            } else if (line.startsWith('deleted file mode')) {
                if (currentFile) {currentFile.status = 'deleted';}
            } else if (line.startsWith('rename from')) {
                if (currentFile) {currentFile.status = 'renamed';}
            } else if (line.startsWith('+') && !line.startsWith('+++')) {
                currentContent += line.substring(1) + '\n';
            } else if (line.startsWith(' ')) {
                currentContent += line.substring(1) + '\n';
            }
        }

        // Save last file
        if (currentFile) {
            currentFile.content = currentContent;
            files.push(currentFile);
        }

        return {
            files,
            summary: `${files.length} files changed`
        };
    }

    private shouldAnalyzeFile(filePath: string): boolean {
        const extensions = ['.ts', '.js', '.html', '.component.ts', '.service.ts'];
        return extensions.some(ext => filePath.endsWith(ext));
    }

    private generateFlipperSummary(results: FlipperFileResult[]): string {
        const totalDetections = results.reduce((sum, result) => sum + result.detections.length, 0);
        const flagCount = new Set(results.flatMap(r => r.detections.map(d => d.flagName).filter(Boolean))).size;
        
        return `Found ${totalDetections} flipper references across ${results.length} files, affecting ${flagCount} feature flags`;
    }

    private generateDetectionSummary(detections: FlipperDetection[]): string {
        const flagCount = new Set(detections.map(d => d.flagName).filter(Boolean)).size;
        return `Found ${detections.length} flipper references affecting ${flagCount} feature flags`;
    }

    private getLineNumber(content: string, index: number): number {
        const beforeMatch = content.substring(0, index);
        return beforeMatch.split('\n').length;
    }

    private getColumnNumber(content: string, index: number): number {
        const beforeMatch = content.substring(0, index);
        const lines = beforeMatch.split('\n');
        return lines[lines.length - 1].length;
    }

    private getContext(content: string, index: number, contextSize: number): string {
        const start = Math.max(0, index - contextSize);
        const end = Math.min(content.length, index + contextSize);
        return content.substring(start, end);
    }

    private generateCacheKey(content: string): string {
        // Simple hash function for cache key
        let hash = 0;
        for (let i = 0; i < content.length; i++) {
            const char = content.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString();
    }

    dispose(): void {
        this.cache.clear();
    }
}
