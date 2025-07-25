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

        // Business logic services
        this._setupWizard = new SetupWizard(this.config.workspaceRoot, this._outputChannel);
        this._projectDiscovery = new SimpleProjectDiscovery(this.config.workspaceRoot, this._outputChannel);

        // Infrastructure services
        this._bridge = new ShellScriptBridge(this.config.extensionPath, this._outputChannel);
        this._smartRouter = new SmartCommandRouter(
            this.config.workspaceRoot, 
            this._outputChannel, 
            this.config.extensionPath
        );

        // Utility services
        this._testActions = new TestActions({
            outputChannel: this._outputChannel,
            workspaceRoot: this.config.workspaceRoot,
            testCommand: 'npx nx test'
        });

        // Register disposables
        this.config.extensionContext.subscriptions.push(
            this._outputChannel,
            this._bridge,
            this._statusBarItem
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
        this._statusBarItem.text = `⚡ AI Debug Context: ${text}`;
        this._statusBarItem.tooltip = `AI Debug Context: ${text} (Click to run auto-detect tests)`;
        
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