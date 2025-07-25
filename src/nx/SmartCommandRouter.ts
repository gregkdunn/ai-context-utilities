/**
 * SmartCommandRouter - Intelligent workspace-aware command routing
 * 
 * Automatically detects workspace type (Nx monorepo vs standard project)
 * and routes commands to the appropriate execution strategy for optimal
 * performance and developer experience.
 * 
 * @version 3.0.0 - Phase 1.6
 */

import * as vscode from 'vscode';
import { NxWorkspaceManager, NxWorkspaceInfo, NxTestOptions } from './NxWorkspaceManager';
import { ShellScriptBridge, ScriptOptions, ScriptResult } from '../ShellScriptBridge';

/**
 * Workspace detection result
 */
export interface WorkspaceDetectionResult {
    readonly type: 'nx' | 'jest' | 'unknown';
    readonly nxInfo?: NxWorkspaceInfo;
    readonly confidence: number; // 0-1, how confident we are in the detection
    readonly reasons: string[];
}

/**
 * Unified test execution options
 */
export interface UnifiedTestOptions {
    readonly baseBranch?: string;
    readonly parallel?: boolean;
    readonly maxParallel?: number;
    readonly skipCache?: boolean;
    readonly verbose?: boolean;
    readonly dryRun?: boolean;
    readonly projects?: string[];
    readonly configuration?: string;
    readonly timeout?: number;
}

/**
 * Test execution result with workspace-specific metadata
 */
export interface UnifiedTestResult extends ScriptResult {
    readonly workspaceType: 'nx' | 'jest';
    readonly projectsAffected?: number;
    readonly cacheHits?: number;
    readonly executionStrategy: string;
}

/**
 * Smart command router that automatically detects workspace type
 * and executes tests using the most appropriate strategy.
 * 
 * Key Features:
 * - Automatic Nx vs Jest detection
 * - Intelligent fallback strategies  
 * - Performance optimization based on workspace size
 * - Unified API across different workspace types
 * - Comprehensive error handling and user feedback
 */
export class SmartCommandRouter {
    private workspaceDetection: WorkspaceDetectionResult | null = null;
    private nxManager: NxWorkspaceManager | null = null;
    private fallbackBridge: ShellScriptBridge;
    
    constructor(
        private readonly workspaceRoot: string,
        private readonly outputChannel: vscode.OutputChannel,
        extensionPath?: string
    ) {
        // Always initialize fallback bridge for non-Nx workspaces with shared output channel
        this.fallbackBridge = new ShellScriptBridge(extensionPath, this.outputChannel);
    }

    /**
     * Detect workspace type and initialize appropriate managers
     * 
     * This method performs comprehensive workspace analysis to determine
     * the best execution strategy. It caches results for performance.
     * 
     * @param forceRefresh - Force re-detection even if cached
     * @returns Promise resolving to workspace detection result
     */
    async detectWorkspace(forceRefresh: boolean = false): Promise<WorkspaceDetectionResult> {
        if (this.workspaceDetection && !forceRefresh) {
            return this.workspaceDetection;
        }
        
        this.outputChannel.appendLine('🔍 Smart workspace detection starting...');
        this.outputChannel.appendLine(`⏱️  Timestamp: ${new Date().toLocaleTimeString()}`);
        
        const detectionStart = Date.now();
        
        const reasons: string[] = [];
        let confidence = 0;
        let type: 'nx' | 'jest' | 'unknown' = 'unknown';
        let nxInfo: NxWorkspaceInfo | null = null;
        
        try {
            // Step 1: Try Nx detection first (most specific)
            this.nxManager = new NxWorkspaceManager(this.workspaceRoot, this.outputChannel);
            nxInfo = await this.nxManager.detectWorkspace();
            
            if (nxInfo) {
                type = 'nx';
                confidence = 0.95; // High confidence for Nx workspaces
                reasons.push(`Nx workspace detected (v${nxInfo.nxVersion})`);
                reasons.push(`Found ${nxInfo.projects.size} projects`);
                
                if (nxInfo.hasNxCloud) {
                    reasons.push('Nx Cloud integration detected');
                    confidence = 0.98; // Even higher confidence with cloud
                }
                
                this.outputChannel.appendLine(`   ✅ Nx workspace detected with ${confidence * 100}% confidence`);
            } else {
                // Step 2: Check for Jest indicators
                const jestIndicators = await this.checkJestIndicators();
                
                if (jestIndicators.length > 0) {
                    type = 'jest';
                    confidence = Math.min(0.8, jestIndicators.length * 0.2); // Max 80% confidence
                    reasons.push(...jestIndicators);
                    
                    this.outputChannel.appendLine(`   ✅ Jest workspace detected with ${confidence * 100}% confidence`);
                } else {
                    // Step 3: Unknown workspace type
                    type = 'unknown';
                    confidence = 0.1;
                    reasons.push('No clear workspace indicators found');
                    reasons.push('Will attempt fallback strategies');
                    
                    this.outputChannel.appendLine('   ⚠️ Unknown workspace type - using fallback strategies');
                }
            }
            
        } catch (error) {
            this.outputChannel.appendLine(`   ❌ Workspace detection failed: ${error}`);
            type = 'unknown';
            confidence = 0;
            reasons.push(`Detection error: ${error}`);
        }
        
        this.workspaceDetection = {
            type,
            nxInfo: nxInfo || undefined,
            confidence,
            reasons
        };
        
        // Log detection summary with timing
        const detectionTime = Date.now() - detectionStart;
        this.outputChannel.appendLine(`📊 Workspace Detection Summary:`);
        this.outputChannel.appendLine(`   Type: ${type.toUpperCase()}`);
        this.outputChannel.appendLine(`   Confidence: ${Math.round(confidence * 100)}%`);
        this.outputChannel.appendLine(`   Detection time: ${detectionTime}ms`);
        reasons.forEach(reason => {
            this.outputChannel.appendLine(`   - ${reason}`);
        });
        
        // Warn if detection is slow
        if (detectionTime > 2000) {
            this.outputChannel.appendLine(`   ⚠️ Detection took longer than expected (${detectionTime}ms)`);
        }
        
        return this.workspaceDetection;
    }

    /**
     * Execute affected tests using optimal strategy for detected workspace
     * 
     * Automatically routes to Nx or Jest execution based on workspace detection.
     * Provides unified interface regardless of underlying implementation.
     * 
     * @param options - Unified test execution options
     * @returns Promise resolving to test execution result
     */
    async runAffectedTests(options: UnifiedTestOptions = {}): Promise<UnifiedTestResult> {
        const detection = await this.detectWorkspace();
        
        this.outputChannel.appendLine(`🚀 Executing affected tests using ${detection.type.toUpperCase()} strategy...`);
        
        try {
            switch (detection.type) {
                case 'nx':
                    return await this.executeNxTests(options);
                    
                case 'jest':
                    return await this.executeJestTests(options);
                    
                case 'unknown':
                default:
                    return await this.executeWithFallback(options);
            }
        } catch (error) {
            this.outputChannel.appendLine(`❌ Test execution failed with ${detection.type} strategy: ${error}`);
            
            // For Nx failures, always try Jest fallback
            if (detection.type === 'nx') {
                this.outputChannel.appendLine('🔄 Nx command failed, attempting standard Jest execution...');
                try {
                    return await this.executeJestTests(options);
                } catch (jestError) {
                    this.outputChannel.appendLine(`Jest fallback also failed: ${jestError}`);
                    // Return original Nx error as it's likely more relevant
                    throw error;
                }
            }
            
            throw error;
        }
    }

    /**
     * Get available projects for project-specific testing
     * 
     * Returns project list appropriate for the detected workspace type.
     * For Nx workspaces, returns actual project names. For Jest, returns
     * inferred project structure.
     * 
     * @returns Promise resolving to available projects
     */
    async getAvailableProjects(): Promise<string[]> {
        const detection = await this.detectWorkspace();
        
        if (detection.type === 'nx' && detection.nxInfo) {
            return Array.from(detection.nxInfo.projects.keys());
        }
        
        // For Jest workspaces, try to infer projects from directory structure
        return await this.inferJestProjects();
    }

    /**
     * Show workspace-specific impact analysis
     * 
     * Provides detailed analysis of what will be affected by running tests,
     * tailored to the workspace type and available information.
     * 
     * @param baseBranch - Base branch for impact analysis
     * @returns Promise resolving to impact analysis
     */
    async showImpactAnalysis(baseBranch: string = 'main'): Promise<void> {
        const detection = await this.detectWorkspace();
        
        this.outputChannel.appendLine(`\n📊 Impact Analysis Starting...`);
        this.outputChannel.appendLine(`   Workspace: ${detection.type.toUpperCase()}`);
        this.outputChannel.appendLine(`   Base branch: ${baseBranch}`);
        this.outputChannel.appendLine(`   Time: ${new Date().toLocaleTimeString()}\n`);
        
        if (detection.type === 'nx' && this.nxManager) {
            try {
                this.outputChannel.appendLine(`🔄 Running Nx affected analysis...`);
                const analysisStart = Date.now();
                const affected = await this.nxManager.getAffectedProjects(baseBranch);
                
                this.outputChannel.appendLine(`   Base branch: ${affected.baseBranch}`);
                this.outputChannel.appendLine(`   Affected projects: ${affected.affectedProjects.length}/${affected.totalProjects}`);
                this.outputChannel.appendLine(`   Libraries: ${affected.impactAnalysis.librariesAffected}`);
                this.outputChannel.appendLine(`   Applications: ${affected.impactAnalysis.applicationsAffected}`);
                
                if (affected.impactAnalysis.crossProjectDependencies.size > 0) {
                    this.outputChannel.appendLine(`   Cross-project dependencies detected:`);
                    for (const [project, deps] of affected.impactAnalysis.crossProjectDependencies) {
                        this.outputChannel.appendLine(`     ${project} → ${deps.join(', ')}`);
                    }
                }
                
                if (affected.affectedProjects.length === 0) {
                    this.outputChannel.appendLine('   🎉 No affected projects - all tests should be cached!');
                }
                
            } catch (error) {
                this.outputChannel.appendLine(`   ❌ Failed to analyze Nx impact: ${error}`);
            }
        } else {
            // Standard Jest impact analysis
            this.outputChannel.appendLine('   Using Git diff analysis for affected files');
            this.outputChannel.appendLine('   Consider upgrading to Nx for better impact analysis');
        }
    }

    /**
     * Get workspace information for UI display
     */
    getWorkspaceInfo(): WorkspaceDetectionResult | null {
        return this.workspaceDetection;
    }

    /**
     * Check if workspace supports specific features
     */
    supportsFeature(feature: 'parallel' | 'caching' | 'projects' | 'dependencies'): boolean {
        if (!this.workspaceDetection) return false;
        
        switch (feature) {
            case 'parallel':
                return this.workspaceDetection.type === 'nx';
            case 'caching':
                return this.workspaceDetection.type === 'nx';
            case 'projects':
                return this.workspaceDetection.type === 'nx';
            case 'dependencies':
                return this.workspaceDetection.type === 'nx';
            default:
                return false;
        }
    }

    // Private implementation methods

    private async executeNxTests(options: UnifiedTestOptions): Promise<UnifiedTestResult> {
        if (!this.nxManager) {
            throw new Error('Nx manager not initialized');
        }
        
        const nxOptions: NxTestOptions = {
            parallel: options.parallel,
            maxParallel: options.maxParallel,
            skipCache: options.skipCache,
            verbose: options.verbose,
            configuration: options.configuration,
            projects: options.projects
        };
        
        const startTime = Date.now();
        const result = await this.nxManager.executeProjectTests(options.projects || [], nxOptions);
        const endTime = Date.now();
        
        return {
            exitCode: result.exitCode,
            stdout: result.output,
            stderr: '',
            duration: endTime - startTime,
            success: result.exitCode === 0,
            workspaceType: 'nx',
            projectsAffected: options.projects?.length || 0,
            executionStrategy: 'Nx native test execution'
        };
    }

    private async executeJestTests(options: UnifiedTestOptions): Promise<UnifiedTestResult> {
        const scriptOptions: ScriptOptions = {
            verbose: options.verbose,
            timeout: options.timeout,
            args: []
        };
        
        if (options.baseBranch) {
            scriptOptions.args?.push('--base', options.baseBranch);
        }
        
        if (options.verbose) {
            scriptOptions.args?.push('--verbose');
        }
        
        const result = await this.fallbackBridge.runAffectedTests(scriptOptions);
        
        return {
            ...result,
            workspaceType: 'jest',
            executionStrategy: 'Jest direct execution'
        };
    }

    private async executeWithFallback(options: UnifiedTestOptions): Promise<UnifiedTestResult> {
        this.outputChannel.appendLine('⚠️ Using fallback execution strategy...');
        
        // Try Jest first, then npm test, then generic test command
        try {
            return await this.executeJestTests(options);
        } catch (jestError) {
            this.outputChannel.appendLine(`Jest fallback failed: ${jestError}`);
            
            // Try npm test as last resort
            try {
                const result = await this.fallbackBridge.executeScript('npm test');
                return {
                    ...result,
                    workspaceType: 'jest',
                    executionStrategy: 'npm test fallback'
                };
            } catch (npmError) {
                throw new Error(`All fallback strategies failed. Jest: ${jestError}, npm: ${npmError}`);
            }
        }
    }

    private async checkJestIndicators(): Promise<string[]> {
        const indicators: string[] = [];
        
        try {
            const fs = await import('fs');
            const path = await import('path');
            
            // Check for Jest config files
            const jestConfigFiles = [
                'jest.config.js',
                'jest.config.ts',
                'jest.config.json',
                'jest.config.mjs'
            ];
            
            for (const configFile of jestConfigFiles) {
                if (fs.existsSync(path.join(this.workspaceRoot, configFile))) {
                    indicators.push(`Found ${configFile}`);
                }
            }
            
            // Check package.json for Jest configuration
            const packageJsonPath = path.join(this.workspaceRoot, 'package.json');
            if (fs.existsSync(packageJsonPath)) {
                const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
                
                if (packageJson.devDependencies?.jest || packageJson.dependencies?.jest) {
                    indicators.push('Jest found in package.json dependencies');
                }
                
                if (packageJson.jest) {
                    indicators.push('Jest configuration found in package.json');
                }
                
                if (packageJson.scripts?.test?.includes('jest')) {
                    indicators.push('Jest test script found in package.json');
                }
            }
            
            // Check for common test directory structures
            const testDirs = ['__tests__', 'test', 'tests', 'spec'];
            for (const testDir of testDirs) {
                if (fs.existsSync(path.join(this.workspaceRoot, testDir))) {
                    indicators.push(`Found ${testDir} directory`);
                }
            }
            
        } catch (error) {
            this.outputChannel.appendLine(`Failed to check Jest indicators: ${error}`);
        }
        
        return indicators;
    }

    private async inferJestProjects(): Promise<string[]> {
        // For Jest workspaces, try to infer projects from directory structure
        // This is a best-effort approach for non-Nx workspaces
        
        const projects: string[] = [];
        
        try {
            const fs = await import('fs');
            const path = await import('path');
            
            // Look for common project directory patterns
            const possibleProjectDirs = ['apps', 'packages', 'libs', 'modules', 'services'];
            
            for (const dir of possibleProjectDirs) {
                const dirPath = path.join(this.workspaceRoot, dir);
                if (fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory()) {
                    const subDirs = fs.readdirSync(dirPath)
                        .filter(item => fs.statSync(path.join(dirPath, item)).isDirectory());
                    
                    projects.push(...subDirs.map(subDir => `${dir}/${subDir}`));
                }
            }
            
            // If no clear structure, return root as single project
            if (projects.length === 0) {
                projects.push('root');
            }
            
        } catch (error) {
            this.outputChannel.appendLine(`Failed to infer Jest projects: ${error}`);
            return ['root']; // Fallback to single project
        }
        
        return projects;
    }
}