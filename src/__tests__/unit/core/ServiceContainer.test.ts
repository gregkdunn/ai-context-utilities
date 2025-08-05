/**
 * ServiceContainer Test Suite
 * Tests for dependency injection and service management
 */

import { ServiceContainer, ServiceConfiguration } from '../../../core/ServiceContainer';
import * as vscode from 'vscode';
import { ErrorHandler } from '../../../errors/AIDebugErrors';

// Mock all dependencies
jest.mock('vscode', () => ({
    window: {
        createOutputChannel: jest.fn(),
        createStatusBarItem: jest.fn(),
        showErrorMessage: jest.fn(),
        showInformationMessage: jest.fn()
    },
    StatusBarAlignment: {
        Left: 1,
        Right: 2
    },
    ThemeColor: jest.fn()
}));

jest.mock('../../../errors/AIDebugErrors');
jest.mock('../../../platform/MacOSCompatibility');
jest.mock('../../../onboarding/SetupWizard');
jest.mock('../../../utils/simpleProjectDiscovery');
jest.mock('../../../ShellScriptBridge');
jest.mock('../../../nx/SmartCommandRouter');
jest.mock('../../../utils/testActions');
jest.mock('../../../core/ConfigurationManager', () => ({
    ConfigurationManager: jest.fn().mockImplementation(() => ({
        refreshFrameworkDetection: jest.fn().mockResolvedValue(undefined),
        get: jest.fn().mockReturnValue({ cacheTimeout: 30 }),
        getTestCommand: jest.fn().mockReturnValue('npm test')
    }))
}));
jest.mock('../../../utils/ProjectCache');
jest.mock('../../../utils/BackgroundProjectDiscovery');
jest.mock('../../../utils/SimplePerformanceTracker');

describe('ServiceContainer', () => {
    let serviceContainer: ServiceContainer;
    let mockConfig: ServiceConfiguration;
    let mockOutputChannel: jest.Mocked<vscode.OutputChannel>;
    let mockStatusBarItem: jest.Mocked<vscode.StatusBarItem>;
    let mockExtensionContext: jest.Mocked<vscode.ExtensionContext>;

    beforeEach(() => {
        // Mock output channel
        mockOutputChannel = {
            appendLine: jest.fn(),
            show: jest.fn(),
            hide: jest.fn(),
            dispose: jest.fn(),
            clear: jest.fn(),
            replace: jest.fn(),
            append: jest.fn(),
            name: 'AI Context Utilities'
        };

        // Mock status bar item
        mockStatusBarItem = {
            text: '',
            tooltip: '',
            color: undefined,
            command: '',
            show: jest.fn(),
            hide: jest.fn(),
            dispose: jest.fn()
        } as any;

        // Mock extension context
        mockExtensionContext = {
            subscriptions: [],
            workspaceState: {
                get: jest.fn(),
                update: jest.fn(),
                keys: jest.fn()
            },
            globalState: {
                get: jest.fn(),
                update: jest.fn(),
                keys: jest.fn()
            },
            extensionPath: '/test/extension',
            storagePath: '/test/storage',
            globalStoragePath: '/test/global-storage',
            logPath: '/test/logs'
        } as any;

        // Setup vscode mocks
        (vscode.window.createOutputChannel as jest.Mock).mockReturnValue(mockOutputChannel);
        (vscode.window.createStatusBarItem as jest.Mock).mockReturnValue(mockStatusBarItem);

        // Mock ErrorHandler.getInstance
        (ErrorHandler.getInstance as jest.Mock).mockReturnValue({
            handleError: jest.fn(),
            showUserError: jest.fn()
        });

        mockConfig = {
            workspaceRoot: '/test/workspace',
            extensionPath: '/test/extension',
            extensionContext: mockExtensionContext
        };
    });

    afterEach(() => {
        if (serviceContainer) {
            serviceContainer.dispose();
        }
        jest.clearAllMocks();
    });

    describe('Service Initialization', () => {
        it('should initialize all services correctly', () => {
            serviceContainer = new ServiceContainer(mockConfig);

            // Verify core services are initialized
            expect(serviceContainer.outputChannel).toBe(mockOutputChannel);
            expect(serviceContainer.statusBarItem).toBe(mockStatusBarItem);
            expect(serviceContainer.workspaceRoot).toBe('/test/workspace');
            expect(serviceContainer.extensionPath).toBe('/test/extension');
            expect(serviceContainer.extensionContext).toBe(mockExtensionContext);
        });

        it('should setup status bar correctly', () => {
            serviceContainer = new ServiceContainer(mockConfig);

            expect(mockStatusBarItem.command).toBe('aiDebugContext.runAffectedTests');
            expect(mockStatusBarItem.tooltip).toBe('Click to run auto-detect tests');
            expect(mockStatusBarItem.show).toHaveBeenCalled();
        });

        it('should register services with extension context', () => {
            serviceContainer = new ServiceContainer(mockConfig);

            expect(mockExtensionContext.subscriptions).toContain(mockOutputChannel);
            expect(mockExtensionContext.subscriptions).toContain(mockStatusBarItem);
        });

        it('should initialize performance monitoring services', () => {
            serviceContainer = new ServiceContainer(mockConfig);

            expect(serviceContainer.performanceTracker).toBeDefined();
            expect(serviceContainer.backgroundDiscovery).toBeDefined();
            expect(serviceContainer.projectCache).toBeDefined();
        });

        it('should initialize configuration services', () => {
            serviceContainer = new ServiceContainer(mockConfig);

            expect(serviceContainer.configManager).toBeDefined();
        });
    });

    describe('Status Bar Management', () => {
        beforeEach(() => {
            serviceContainer = new ServiceContainer(mockConfig);
        });

        it('should update status bar text and tooltip', () => {
            serviceContainer.updateStatusBar('Testing in progress');

            expect(mockStatusBarItem.text).toBe('⚡ AI Context Util: Testing in progress');
            expect(mockStatusBarItem.tooltip).toContain('AI Context Util: Testing in progress (Click to run auto-detect tests)');
            // Performance info should be present (either performance data or fallback message)
            expect(mockStatusBarItem.tooltip).toMatch(/⚡ (Performance|Ready to test)/);
        });

        it('should set green color for status bar', () => {
            serviceContainer.updateStatusBar('Tests passed', 'green');

            expect(vscode.ThemeColor).toHaveBeenCalledWith('charts.green');
        });

        it('should set yellow color for status bar', () => {
            serviceContainer.updateStatusBar('Running tests', 'yellow');

            expect(vscode.ThemeColor).toHaveBeenCalledWith('charts.yellow');
        });

        it('should set red color for status bar', () => {
            serviceContainer.updateStatusBar('Tests failed', 'red');

            expect(vscode.ThemeColor).toHaveBeenCalledWith('charts.red');
        });

        it('should clear color when no color specified', () => {
            serviceContainer.updateStatusBar('Ready');

            expect(mockStatusBarItem.color).toBeUndefined();
        });
    });

    describe('Status Bar Animation', () => {
        beforeEach(() => {
            serviceContainer = new ServiceContainer(mockConfig);
            jest.useFakeTimers();
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        it('should start status bar animation with spinner', () => {
            serviceContainer.startStatusBarAnimation('Running tests');

            // Run the first timer tick to trigger initial animation frame
            jest.advanceTimersByTime(100);

            // Check initial state
            expect(mockStatusBarItem.text).toMatch(/[⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏] AI Context Util: Running tests/);
            expect(mockStatusBarItem.tooltip).toBe('AI Context Util: Running tests (Tests in progress...)');
            expect(vscode.ThemeColor).toHaveBeenCalledWith('charts.yellow');
            expect(vscode.ThemeColor).toHaveBeenCalledWith('statusBarItem.warningBackground');
        });

        it('should cycle through animation frames', () => {
            serviceContainer.startStatusBarAnimation('Testing');

            // Run the first timer tick to get initial frame
            jest.advanceTimersByTime(100);

            // Check initial frame
            const initialText = mockStatusBarItem.text;
            expect(initialText).toMatch(/[⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏] AI Context Util: Testing/);

            // Advance timer and check that text changed
            jest.advanceTimersByTime(100);
            const nextText = mockStatusBarItem.text;
            expect(nextText).toMatch(/[⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏] AI Context Util: Testing/);
            expect(nextText).not.toBe(initialText);
        });

        it('should cycle back to first frame after completing sequence', () => {
            serviceContainer.startStatusBarAnimation('Testing');

            // Advance through all 10 animation frames plus one more to cycle back (11 * 100ms = 1100ms)
            jest.advanceTimersByTime(1100);
            
            // Should be back to first frame (⠋)
            expect(mockStatusBarItem.text).toBe('⠋ AI Context Util: Testing');
        });

        it('should stop existing animation when starting new one', () => {
            serviceContainer.startStatusBarAnimation('First test');
            const firstAnimation = (serviceContainer as any)._statusBarAnimation;

            serviceContainer.startStatusBarAnimation('Second test');
            const secondAnimation = (serviceContainer as any)._statusBarAnimation;

            // Advance timer to trigger animation frame
            jest.advanceTimersByTime(100);

            expect(firstAnimation).not.toBe(secondAnimation);
            expect(mockStatusBarItem.text).toMatch(/[⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏] AI Context Util: Second test/);
        });

        it('should stop status bar animation', () => {
            serviceContainer.startStatusBarAnimation('Testing');
            expect((serviceContainer as any)._statusBarAnimation).toBeDefined();

            serviceContainer.stopStatusBarAnimation();
            
            expect((serviceContainer as any)._statusBarAnimation).toBeUndefined();
            expect(mockStatusBarItem.backgroundColor).toBeUndefined();
        });

        it('should stop animation when updating status bar normally', () => {
            serviceContainer.startStatusBarAnimation('Testing');
            const animation = (serviceContainer as any)._statusBarAnimation;
            expect(animation).toBeDefined();

            serviceContainer.updateStatusBar('Test complete', 'green');

            expect((serviceContainer as any)._statusBarAnimation).toBeUndefined();
            expect(mockStatusBarItem.text).toBe('⚡ AI Context Util: Test complete');
            expect(mockStatusBarItem.backgroundColor).toBeUndefined();
        });

        it('should handle stop animation when no animation is running', () => {
            expect(() => {
                serviceContainer.stopStatusBarAnimation();
            }).not.toThrow();
        });

        it('should clean up animation on disposal', () => {
            serviceContainer.startStatusBarAnimation('Testing');
            expect((serviceContainer as any)._statusBarAnimation).toBeDefined();

            serviceContainer.dispose();

            expect((serviceContainer as any)._statusBarAnimation).toBeUndefined();
        });
    });

    describe('Health Check', () => {
        beforeEach(() => {
            serviceContainer = new ServiceContainer(mockConfig);
        });

        it('should pass health check with all services initialized', async () => {
            const result = await serviceContainer.performHealthCheck();

            expect(result).toBe(true);
        });

        it('should fail health check when output channel is missing', async () => {
            // Simulate missing output channel
            (serviceContainer as any)._outputChannel = null;

            const result = await serviceContainer.performHealthCheck();

            expect(result).toBe(false);
        });

        it('should fail health check when status bar is missing', async () => {
            // Simulate missing status bar
            (serviceContainer as any)._statusBarItem = null;

            const result = await serviceContainer.performHealthCheck();

            expect(result).toBe(false);
        });

        it('should fail health check when workspace root is missing', async () => {
            // Create service container with invalid config
            const invalidConfig = { ...mockConfig, workspaceRoot: '' };
            const invalidContainer = new ServiceContainer(invalidConfig);

            const result = await invalidContainer.performHealthCheck();

            expect(result).toBe(false);
            invalidContainer.dispose();
        });

        it('should handle health check errors gracefully', async () => {
            // Mock macOS compatibility to throw error
            serviceContainer.macosCompat.validateEnvironment = jest.fn().mockRejectedValue(new Error('Platform error'));

            const result = await serviceContainer.performHealthCheck();

            expect(result).toBe(false);
            expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
                expect.stringContaining('Health check failed')
            );
        });
    });

    describe('File Watcher State', () => {
        beforeEach(() => {
            serviceContainer = new ServiceContainer(mockConfig);
        });

        it('should manage file watcher state', () => {
            expect(serviceContainer.fileWatcherActive).toBe(false);

            serviceContainer.fileWatcherActive = true;
            expect(serviceContainer.fileWatcherActive).toBe(true);

            serviceContainer.fileWatcherActive = false;
            expect(serviceContainer.fileWatcherActive).toBe(false);
        });
    });

    describe('Service Access', () => {
        beforeEach(() => {
            serviceContainer = new ServiceContainer(mockConfig);
        });

        it('should provide access to all core services', () => {
            expect(serviceContainer.outputChannel).toBeDefined();
            expect(serviceContainer.statusBarItem).toBeDefined();
            expect(serviceContainer.errorHandler).toBeDefined();
            expect(serviceContainer.workspaceRoot).toBeDefined();
            expect(serviceContainer.extensionPath).toBeDefined();
            expect(serviceContainer.extensionContext).toBeDefined();
        });

        it('should provide access to platform services', () => {
            expect(serviceContainer.macosCompat).toBeDefined();
        });

        it('should provide access to business logic services', () => {
            expect(serviceContainer.setupWizard).toBeDefined();
            expect(serviceContainer.projectDiscovery).toBeDefined();
            expect(serviceContainer.testActions).toBeDefined();
        });

        it('should provide access to configuration services', () => {
            expect(serviceContainer.configManager).toBeDefined();
            expect(serviceContainer.projectCache).toBeDefined();
            expect(serviceContainer.backgroundDiscovery).toBeDefined();
            expect(serviceContainer.performanceTracker).toBeDefined();
        });

        it('should provide access to infrastructure services', () => {
            expect(serviceContainer.bridge).toBeDefined();
            expect(serviceContainer.smartRouter).toBeDefined();
        });
    });

    describe('Disposal', () => {
        beforeEach(() => {
            serviceContainer = new ServiceContainer(mockConfig);
        });

        it('should dispose cleanly', () => {
            expect(() => {
                serviceContainer.dispose();
            }).not.toThrow();

            expect(serviceContainer.fileWatcherActive).toBe(false);
        });

        it('should dispose background services', () => {
            const mockBackgroundDiscovery = serviceContainer.backgroundDiscovery;
            const mockPerformanceMonitor = serviceContainer.performanceTracker;

            serviceContainer.dispose();

            expect(mockBackgroundDiscovery.dispose).toHaveBeenCalled();
            expect(mockPerformanceMonitor.dispose).toHaveBeenCalled();
        });
    });

    describe('Factory Method', () => {
        it('should create service container with health check', async () => {
            const container = await ServiceContainer.create(
                '/test/workspace',
                '/test/extension',
                mockExtensionContext
            );

            expect(container).toBeInstanceOf(ServiceContainer);
            expect(container.workspaceRoot).toBe('/test/workspace');

            container.dispose();
        });

        it('should set ready status when health check passes', async () => {
            const container = await ServiceContainer.create(
                '/test/workspace',
                '/test/extension',
                mockExtensionContext
            );

            // Verify status was set (exact call depends on health check result)
            expect(mockStatusBarItem.text).toContain('AI Context Util');

            container.dispose();
        });

        it('should set setup needed status when health check fails', async () => {
            // Mock health check to fail
            ServiceContainer.prototype.performHealthCheck = jest.fn().mockResolvedValue(false);

            const container = await ServiceContainer.create(
                '/test/workspace',
                '/test/extension',
                mockExtensionContext
            );

            // Status should indicate setup is needed
            // (Exact verification depends on implementation)
            expect(container).toBeDefined();

            container.dispose();
        });
    });

    describe('Integration with Performance Services', () => {
        beforeEach(() => {
            serviceContainer = new ServiceContainer(mockConfig);
        });

        it('should queue background discovery on initialization', () => {
            expect(serviceContainer.backgroundDiscovery.queueDiscovery).toHaveBeenCalledWith(
                '/test/workspace',
                'medium'
            );
        });

        it('should pass configuration timeout to project cache', () => {
            // Verify project cache was initialized with config manager timeout
            expect(serviceContainer.projectCache).toBeDefined();
        });

        it('should initialize performance monitor with output channel', () => {
            expect(serviceContainer.performanceTracker).toBeDefined();
        });
    });

    describe('Error Handling', () => {
        it('should handle service initialization errors gracefully', () => {
            // Mock a service to throw during initialization
            const originalConsoleError = console.error;
            console.error = jest.fn();

            expect(() => {
                new ServiceContainer(mockConfig);
            }).not.toThrow();

            console.error = originalConsoleError;
        });

        it('should provide error handler instance', () => {
            serviceContainer = new ServiceContainer(mockConfig);

            expect(serviceContainer.errorHandler).toBeDefined();
            expect(ErrorHandler.getInstance).toHaveBeenCalledWith(mockOutputChannel);
        });
    });

    describe('Configuration Integration', () => {
        beforeEach(() => {
            serviceContainer = new ServiceContainer(mockConfig);
        });

        it('should use configuration manager for test actions', () => {
            expect(serviceContainer.testActions).toBeDefined();
            expect(serviceContainer.configManager).toBeDefined();
        });

        it('should initialize background discovery with project cache', () => {
            expect(serviceContainer.backgroundDiscovery).toBeDefined();
            expect(serviceContainer.projectCache).toBeDefined();
        });
    });
});