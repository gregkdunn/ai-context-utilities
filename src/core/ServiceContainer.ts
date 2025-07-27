/**
 * Service Container for Dependency Injection
 * Part of Phase 1.8 architectural refactoring
 * 
 * Manages all extension services with proper dependency injection,
 * replacing the global variable anti-pattern in extension.ts
 */

import * as vscode from 'vscode';
import { ShellScriptBridge } from '../ShellScriptBridge';
import { SmartCommandRouter } from '../nx/SmartCommandRouter';
import { ErrorHandler } from '../errors/AIDebugErrors';
import { SetupWizard } from '../onboarding/SetupWizard';
import { MacOSCompatibility } from '../platform/MacOSCompatibility';
import { SimpleProjectDiscovery } from '../utils/simpleProjectDiscovery';
import { TestActions } from '../utils/testActions';
import { ConfigurationManager } from './ConfigurationManager';
import { ProjectCache } from '../utils/ProjectCache';
import { BackgroundProjectDiscovery } from '../utils/BackgroundProjectDiscovery';
import { SimplePerformanceTracker } from '../utils/SimplePerformanceTracker';
import { RealPerformanceTracker } from '../utils/RealPerformanceTracker';
import { DeveloperDebuggingTools } from '../utils/DeveloperDebuggingTools';
import { ComprehensiveErrorHandler } from '../utils/ComprehensiveErrorHandler';
import { ContributorOnboardingTools } from '../utils/ContributorOnboardingTools';
import { TestFrameworkDetector, MonorepoDetector } from '../utils/ModernFrameworkDetector';
import { TestOutputIntelligence } from '../utils/TestOutputIntelligence';
import { IntelligentContextFilter } from '../modules/aiContext/IntelligentContextFilter';
import { TestIntelligenceEngine } from './TestIntelligenceEngine';
import { RealTimeTestMonitor } from '../services/RealTimeTestMonitor';
import { AITestAssistant } from '../services/AITestAssistant';
import { NativeTestRunner } from '../services/NativeTestRunner';

export interface ServiceConfiguration {
    workspaceRoot: string;
    extensionPath: string;
    extensionContext: vscode.ExtensionContext;
}

/**
 * Central service container managing all extension dependencies
 */
export class ServiceContainer {
    private _outputChannel!: vscode.OutputChannel;
    private _statusBarItem!: vscode.StatusBarItem;
    private _errorHandler!: ErrorHandler;
    private _macosCompat!: MacOSCompatibility;
    private _setupWizard!: SetupWizard;
    private _projectDiscovery!: SimpleProjectDiscovery;
    private _bridge!: ShellScriptBridge;
    private _smartRouter!: SmartCommandRouter;
    private _testActions!: TestActions;
    private _configManager!: ConfigurationManager;
    private _projectCache!: ProjectCache;
    private _backgroundDiscovery!: BackgroundProjectDiscovery;
    private _performanceTracker!: SimplePerformanceTracker;
    private _realPerformanceTracker!: RealPerformanceTracker;
    private _debuggingTools!: DeveloperDebuggingTools;
    private _comprehensiveErrorHandler!: ComprehensiveErrorHandler;
    private _onboardingTools!: ContributorOnboardingTools;
    private _testFrameworkDetector!: TestFrameworkDetector;
    private _testIntelligence!: TestOutputIntelligence;
    private _contextFilter!: IntelligentContextFilter;
    private _testIntelligenceEngine!: TestIntelligenceEngine;
    private _realTimeTestMonitor!: RealTimeTestMonitor;
    private _aiTestAssistant!: AITestAssistant;
    private _nativeTestRunner!: NativeTestRunner;
    private _fileWatcherActive: boolean = false;

    constructor(private config: ServiceConfiguration) {
        this.initializeServices();
    }

    /**
     * Initialize all services in proper dependency order
     */
    private initializeServices(): void {
        // Core services first
        this._outputChannel = vscode.window.createOutputChannel('AI Debug Context');
        this._statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
        
        // Configure status bar to be clickable
        this._statusBarItem.command = 'aiDebugContext.runAffectedTests';
        this._statusBarItem.tooltip = 'Click to run auto-detect tests';
        this._statusBarItem.show();

        // Error handling
        this._errorHandler = ErrorHandler.getInstance(this._outputChannel);

        // Platform services
        this._macosCompat = new MacOSCompatibility();

        // Performance monitoring (Phase 1.9.1 + 2.0.2)
        this._performanceTracker = new SimplePerformanceTracker(this._outputChannel);
        this._realPerformanceTracker = new RealPerformanceTracker(this._outputChannel, this.config.workspaceRoot);
        
        // Phase 2.0.2 Enhanced Services
        this._comprehensiveErrorHandler = new ComprehensiveErrorHandler(this._outputChannel, this.config.workspaceRoot);
        this._debuggingTools = new DeveloperDebuggingTools(this, this._outputChannel);
        this._onboardingTools = new ContributorOnboardingTools(this._outputChannel, this.config.workspaceRoot);
        this._contextFilter = new IntelligentContextFilter(this.config.workspaceRoot);

        // Phase 2.0.3 - Real Test Intelligence
        this._testIntelligenceEngine = new TestIntelligenceEngine(this.config.workspaceRoot, this._outputChannel);
        this._realTimeTestMonitor = new RealTimeTestMonitor(this._testIntelligenceEngine, this._outputChannel);
        this._aiTestAssistant = new AITestAssistant(this._testIntelligenceEngine, this.config.workspaceRoot, this._outputChannel);
        this._nativeTestRunner = new NativeTestRunner(
            this.config.workspaceRoot,
            this._outputChannel,
            this._testIntelligenceEngine,
            this._realTimeTestMonitor,
            this._aiTestAssistant
        );

        // Configuration services (Phase 1.9)
        this._configManager = new ConfigurationManager(this.config.workspaceRoot);
        this._projectCache = new ProjectCache(
            this.config.workspaceRoot, 
            this._configManager.get('performance')?.cacheTimeout || 30
        );

        // Background services (Phase 1.9.1)
        this._backgroundDiscovery = new BackgroundProjectDiscovery(
            this._outputChannel,
            this._projectCache
        );

        // Business logic services
        this._setupWizard = new SetupWizard(this.config.workspaceRoot, this._outputChannel);
        this._projectDiscovery = new SimpleProjectDiscovery(
            this.config.workspaceRoot, 
            this._outputChannel,
            this._projectCache
        );

        // Infrastructure services
        this._bridge = new ShellScriptBridge(this.config.extensionPath, this._outputChannel);
        this._smartRouter = new SmartCommandRouter(
            this.config.workspaceRoot, 
            this._outputChannel, 
            this.config.extensionPath
        );

        // Utility services - now uses configuration
        const testCommand = this._configManager.getTestCommand('default');
        this._testActions = new TestActions({
            outputChannel: this._outputChannel,
            workspaceRoot: this.config.workspaceRoot,
            testCommand: testCommand
        });

        // Start background discovery for current workspace
        this._backgroundDiscovery.queueDiscovery(this.config.workspaceRoot, 'medium');

        // Register disposables
        this.config.extensionContext.subscriptions.push(
            this._outputChannel,
            this._bridge,
            this._statusBarItem,
            this._backgroundDiscovery,
            this._performanceTracker
        );
    }

    /**
     * Core services - always available
     */
    get outputChannel(): vscode.OutputChannel {
        return this._outputChannel;
    }

    get statusBarItem(): vscode.StatusBarItem {
        return this._statusBarItem;
    }

    get errorHandler(): ErrorHandler {
        return this._errorHandler;
    }

    get workspaceRoot(): string {
        return this.config.workspaceRoot;
    }

    get extensionPath(): string {
        return this.config.extensionPath;
    }

    get extensionContext(): vscode.ExtensionContext {
        return this.config.extensionContext;
    }

    /**
     * Platform services
     */
    get macosCompat(): MacOSCompatibility {
        return this._macosCompat;
    }

    /**
     * Business logic services
     */
    get setupWizard(): SetupWizard {
        return this._setupWizard;
    }

    get projectDiscovery(): SimpleProjectDiscovery {
        return this._projectDiscovery;
    }

    get testActions(): TestActions {
        return this._testActions;
    }

    /**
     * Configuration services (Phase 1.9)
     */
    get configManager(): ConfigurationManager {
        return this._configManager;
    }

    get projectCache(): ProjectCache {
        return this._projectCache;
    }

    get backgroundDiscovery(): BackgroundProjectDiscovery {
        return this._backgroundDiscovery;
    }

    get performanceTracker(): SimplePerformanceTracker {
        return this._performanceTracker;
    }

    get realPerformanceTracker(): RealPerformanceTracker {
        return this._realPerformanceTracker;
    }

    get debuggingTools(): DeveloperDebuggingTools {
        return this._debuggingTools;
    }

    get comprehensiveErrorHandler(): ComprehensiveErrorHandler {
        return this._comprehensiveErrorHandler;
    }

    get onboardingTools(): ContributorOnboardingTools {
        return this._onboardingTools;
    }

    get contextFilter(): IntelligentContextFilter {
        return this._contextFilter;
    }

    /**
     * Phase 2.0.3 - Real Test Intelligence Services
     */
    get testIntelligenceEngine(): TestIntelligenceEngine {
        return this._testIntelligenceEngine;
    }

    get realTimeTestMonitor(): RealTimeTestMonitor {
        return this._realTimeTestMonitor;
    }

    get aiTestAssistant(): AITestAssistant {
        return this._aiTestAssistant;
    }

    get nativeTestRunner(): NativeTestRunner {
        return this._nativeTestRunner;
    }

    /**
     * Infrastructure services
     */
    get bridge(): ShellScriptBridge {
        return this._bridge;
    }

    get smartRouter(): SmartCommandRouter {
        return this._smartRouter;
    }

    /**
     * State management
     */
    get fileWatcherActive(): boolean {
        return this._fileWatcherActive;
    }

    set fileWatcherActive(active: boolean) {
        this._fileWatcherActive = active;
    }

    /**
     * Status bar helper methods
     */
    updateStatusBar(text: string, color?: 'green' | 'yellow' | 'red'): void {
        // Get performance info for tooltip
        const performanceInfo = this.getPerformanceTooltip();
        
        this._statusBarItem.text = `⚡ AI Debug Context: ${text}`;
        this._statusBarItem.tooltip = `AI Debug Context: ${text} (Click to run auto-detect tests)\n\n${performanceInfo}`;
        
        // Set color based on status
        if (color === 'green') {
            this._statusBarItem.color = new vscode.ThemeColor('charts.green');
        } else if (color === 'yellow') {
            this._statusBarItem.color = new vscode.ThemeColor('charts.yellow');
        } else if (color === 'red') {
            this._statusBarItem.color = new vscode.ThemeColor('charts.red');
        } else {
            this._statusBarItem.color = undefined;
        }
    }

    /**
     * Get performance information for status bar tooltip
     */
    private getPerformanceTooltip(): string {
        try {
            const performanceSummary = this._performanceTracker.getStatusSummary();
            const queueStatus = this._backgroundDiscovery.getQueueStatus();
            
            return [
                `⚡ Performance: ${performanceSummary}`,
                `📋 Queue: ${queueStatus.queueLength} pending, ${queueStatus.isRunning ? 'running' : 'idle'}`
            ].join('\n');
        } catch (error) {
            return '⚡ Ready to test';
        }
    }

    /**
     * Health check - verify all services are properly initialized
     */
    async performHealthCheck(): Promise<boolean> {
        try {
            // Check core services
            if (!this._outputChannel || !this._statusBarItem) {
                return false;
            }

            // Check workspace
            if (!this.config.workspaceRoot) {
                return false;
            }

            // Platform check
            await this._macosCompat.validateEnvironment();

            // Service initialization check
            const services = [
                this._errorHandler,
                this._setupWizard,
                this._projectDiscovery,
                this._bridge,
                this._smartRouter,
                this._testActions
            ];

            return services.every(service => service !== null && service !== undefined);

        } catch (error) {
            this._outputChannel.appendLine(`Health check failed: ${error}`);
            return false;
        }
    }

    /**
     * Graceful disposal of all services
     */
    dispose(): void {
        // Services are automatically disposed via extensionContext.subscriptions
        // but we can add custom cleanup here if needed
        this._fileWatcherActive = false;
        this._backgroundDiscovery?.dispose();
        this._performanceTracker?.dispose();
        this._realPerformanceTracker?.dispose();
        this._debuggingTools?.dispose();
        this._comprehensiveErrorHandler?.dispose();
        this._onboardingTools?.dispose();
        
        // Phase 2.0.3 - Test Intelligence cleanup
        this._realTimeTestMonitor?.stopMonitoring();
        this._nativeTestRunner?.stop();
        
        // Note: TestIntelligenceEngine and AITestAssistant don't have explicit dispose methods
        // as they only manage memory and file operations
    }

    /**
     * Factory method for creating service container
     */
    static async create(
        workspaceRoot: string, 
        extensionPath: string, 
        extensionContext: vscode.ExtensionContext
    ): Promise<ServiceContainer> {
        const config: ServiceConfiguration = {
            workspaceRoot,
            extensionPath,
            extensionContext
        };

        const container = new ServiceContainer(config);
        
        // Perform health check after initialization
        const healthOk = await container.performHealthCheck();
        if (!healthOk) {
            container.updateStatusBar('Setup needed', 'yellow');
        } else {
            container.updateStatusBar('Ready');
        }

        return container;
    }
}