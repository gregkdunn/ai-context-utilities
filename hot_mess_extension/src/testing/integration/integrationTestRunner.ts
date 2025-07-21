import { EventEmitter } from 'events';
import { 
    AnalyticsEvent, 
    CommandResult, 
    WebviewMessage, 
    StreamingMessage,
    TestResult,
    PerformanceMetric,
    CommandOptions
} from '../../types';

export interface IntegrationTestSuite {
    id: string;
    name: string;
    description: string;
    tests: IntegrationTest[];
    setup?: () => Promise<void>;
    teardown?: () => Promise<void>;
    timeout: number;
    retryCount: number;
    parallel: boolean;
    dependencies: string[];
    tags: string[];
}

export interface IntegrationTest {
    id: string;
    name: string;
    description: string;
    execute: (context: TestContext) => Promise<TestResult>;
    timeout: number;
    retryCount: number;
    setup?: () => Promise<void>;
    teardown?: () => Promise<void>;
    expectations: TestExpectation[];
    metadata: Record<string, any>;
}

export interface TestContext {
    analytics: MockAnalyticsEngine;
    webview: MockWebviewProvider;
    fileSystem: MockFileSystemProvider;
    commands: MockCommandRunner;
    streaming: MockStreamingService;
    session: TestSession;
    logger: TestLogger;
    metrics: TestMetricsCollector;
    environment: TestEnvironment;
}

export interface TestExpectation {
    type: 'analytics-event' | 'command-result' | 'webview-message' | 'file-change' | 'performance-metric';
    condition: (data: any) => boolean;
    timeout: number;
    description: string;
    optional: boolean;
}

export interface TestSession {
    id: string;
    startTime: Date;
    endTime?: Date;
    duration?: number;
    status: 'running' | 'completed' | 'failed' | 'cancelled';
    results: TestResult[];
    metrics: PerformanceMetric[];
    events: AnalyticsEvent[];
    errors: Error[];
}

export interface TestEnvironment {
    variables: Record<string, string>;
    features: Record<string, boolean>;
    limits: Record<string, number>;
    cleanup: () => Promise<void>;
}

class IntegrationTestRunner extends EventEmitter {
    private suites: Map<string, IntegrationTestSuite> = new Map();
    private sessions: Map<string, TestSession> = new Map();
    private isRunning = false;
    private currentSession?: TestSession;

    constructor(private config: IntegrationTestConfig) {
        super();
    }

    public registerSuite(suite: IntegrationTestSuite): void {
        this.suites.set(suite.id, suite);
        this.emit('suiteRegistered', { suiteId: suite.id, name: suite.name });
    }

    public async runSuite(suiteId: string, options: TestRunOptions = {}): Promise<TestSession> {
        const suite = this.suites.get(suiteId);
        if (!suite) {
            throw new Error(`Test suite not found: ${suiteId}`);
        }

        const session = await this.createSession(suite, options);
        this.currentSession = session;
        this.isRunning = true;

        try {
            this.emit('sessionStarted', { sessionId: session.id, suiteId });

            // Setup phase
            if (suite.setup) {
                await this.executeWithTimeout(suite.setup, suite.timeout);
            }

            // Execute tests
            const testResults = await this.executeTests(suite, session, options);
            session.results = testResults;

            // Teardown phase
            if (suite.teardown) {
                await this.executeWithTimeout(suite.teardown, suite.timeout);
            }

            session.endTime = new Date();
            session.duration = session.endTime.getTime() - session.startTime.getTime();
            session.status = testResults.every(r => r.status === 'passed') ? 'completed' : 'failed';

            this.emit('sessionCompleted', { sessionId: session.id, status: session.status });
            return session;

        } catch (error) {
            session.errors.push(error as Error);
            session.status = 'failed';
            session.endTime = new Date();
            session.duration = session.endTime.getTime() - session.startTime.getTime();

            this.emit('sessionFailed', { sessionId: session.id, error: (error as Error).message });
            throw error;
        } finally {
            this.isRunning = false;
            this.currentSession = undefined;
        }
    }

    private async createSession(suite: IntegrationTestSuite, options: TestRunOptions): Promise<TestSession> {
        const session: TestSession = {
            id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            startTime: new Date(),
            status: 'running',
            results: [],
            metrics: [],
            events: [],
            errors: []
        };

        this.sessions.set(session.id, session);
        return session;
    }

    private async executeTests(
        suite: IntegrationTestSuite, 
        session: TestSession, 
        options: TestRunOptions
    ): Promise<TestResult[]> {
        const results: TestResult[] = [];

        if (suite.parallel && !options.sequential) {
            // Parallel execution
            const testPromises = suite.tests.map(test => 
                this.executeTest(test, session, options)
            );
            const testResults = await Promise.allSettled(testPromises);
            
            testResults.forEach((result, index) => {
                if (result.status === 'fulfilled') {
                    results.push(result.value);
                } else {
                    results.push({
                        suite: suite.name,
                        test: suite.tests[index].name,
                        status: 'failed',
                        duration: 0,
                        error: result.reason?.message || 'Unknown error',
                        timestamp: new Date()
                    });
                }
            });
        } else {
            // Sequential execution
            for (const test of suite.tests) {
                try {
                    const result = await this.executeTest(test, session, options);
                    results.push(result);
                    
                    // Stop on first failure if configured
                    if (options.stopOnFirstFailure && result.status === 'failed') {
                        break;
                    }
                } catch (error) {
                    results.push({
                        suite: suite.name,
                        test: test.name,
                        status: 'failed',
                        duration: 0,
                        error: (error as Error).message,
                        timestamp: new Date()
                    });
                    
                    if (options.stopOnFirstFailure) {
                        break;
                    }
                }
            }
        }

        return results;
    }

    private async executeTest(
        test: IntegrationTest, 
        session: TestSession, 
        options: TestRunOptions
    ): Promise<TestResult> {
        const startTime = Date.now();
        
        try {
            this.emit('testStarted', { testId: test.id, sessionId: session.id });

            // Create test context
            const context = await this.createTestContext(session, options);

            // Setup test
            if (test.setup) {
                await this.executeWithTimeout(test.setup, test.timeout);
            }

            // Execute test with retries
            let lastError: Error | null = null;
            let attempts = 0;
            const maxAttempts = test.retryCount + 1;

            while (attempts < maxAttempts) {
                try {
                    const result = await this.executeWithTimeout(
                        () => test.execute(context),
                        test.timeout
                    );

                    // Verify expectations
                    await this.verifyExpectations(test.expectations, context);

                    // Success
                    const duration = Date.now() - startTime;
                    this.emit('testCompleted', { testId: test.id, sessionId: session.id, duration });
                    
                    return {
                        suite: session.id,
                        test: test.name,
                        status: 'passed',
                        duration,
                        timestamp: new Date()
                    };

                } catch (error) {
                    lastError = error as Error;
                    attempts++;
                    
                    if (attempts < maxAttempts) {
                        this.emit('testRetry', { testId: test.id, attempt: attempts, error: (error as Error).message });
                        await this.delay(1000 * attempts); // Exponential backoff
                    }
                }
            }

            // All attempts failed
            const duration = Date.now() - startTime;
            this.emit('testFailed', { testId: test.id, sessionId: session.id, error: lastError?.message });
            
            return {
                suite: session.id,
                test: test.name,
                status: 'failed',
                duration,
                error: lastError?.message || 'Unknown error',
                timestamp: new Date()
            };

        } finally {
            // Cleanup test
            if (test.teardown) {
                try {
                    await this.executeWithTimeout(test.teardown, test.timeout);
                } catch (error) {
                    this.emit('testTeardownError', { testId: test.id, error: (error as Error).message });
                }
            }
        }
    }

    private async createTestContext(session: TestSession, options: TestRunOptions): Promise<TestContext> {
        const environment = await this.createTestEnvironment(options);
        
        return {
            analytics: new MockAnalyticsEngine(),
            webview: new MockWebviewProvider(),
            fileSystem: new MockFileSystemProvider(),
            commands: new MockCommandRunner(),
            streaming: new MockStreamingService(),
            session,
            logger: new TestLogger(session.id),
            metrics: new TestMetricsCollector(),
            environment
        };
    }

    private async createTestEnvironment(options: TestRunOptions): Promise<TestEnvironment> {
        return {
            variables: {
                NODE_ENV: 'test',
                TEST_MODE: 'integration',
                ...options.environment
            },
            features: {
                analytics: true,
                streaming: true,
                ...options.features
            },
            limits: {
                timeout: 30000,
                memory: 512 * 1024 * 1024, // 512MB
                ...options.limits
            },
            cleanup: async () => {
                // Cleanup test resources
            }
        };
    }

    private async verifyExpectations(expectations: TestExpectation[], context: TestContext): Promise<void> {
        const verificationPromises = expectations.map(expectation => 
            this.verifyExpectation(expectation, context)
        );

        const results = await Promise.allSettled(verificationPromises);
        
        const failures = results
            .map((result, index) => ({ result, expectation: expectations[index] }))
            .filter(({ result, expectation }) => 
                result.status === 'rejected' && !expectation.optional
            );

        if (failures.length > 0) {
            const failureMessages = failures.map(({ result, expectation }) => 
                `${expectation.description}: ${result.status === 'rejected' ? result.reason : 'Unknown error'}`
            );
            throw new Error(`Expectations failed: ${failureMessages.join(', ')}`);
        }
    }

    private async verifyExpectation(expectation: TestExpectation, context: TestContext): Promise<void> {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error(`Expectation timed out: ${expectation.description}`));
            }, expectation.timeout);

            // Set up listeners based on expectation type
            switch (expectation.type) {
                case 'analytics-event':
                    context.analytics.on('event', (event: AnalyticsEvent) => {
                        if (expectation.condition(event)) {
                            clearTimeout(timeout);
                            resolve();
                        }
                    });
                    break;
                    
                case 'command-result':
                    context.commands.on('result', (result: CommandResult) => {
                        if (expectation.condition(result)) {
                            clearTimeout(timeout);
                            resolve();
                        }
                    });
                    break;
                    
                case 'webview-message':
                    context.webview.on('message', (message: WebviewMessage) => {
                        if (expectation.condition(message)) {
                            clearTimeout(timeout);
                            resolve();
                        }
                    });
                    break;
                    
                case 'performance-metric':
                    context.metrics.on('metric', (metric: PerformanceMetric) => {
                        if (expectation.condition(metric)) {
                            clearTimeout(timeout);
                            resolve();
                        }
                    });
                    break;
                    
                default:
                    reject(new Error(`Unknown expectation type: ${expectation.type}`));
            }
        });
    }

    private async executeWithTimeout<T>(fn: () => Promise<T>, timeout: number): Promise<T> {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                reject(new Error(`Operation timed out after ${timeout}ms`));
            }, timeout);

            fn().then(resolve).catch(reject).finally(() => {
                clearTimeout(timer);
            });
        });
    }

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    public getSession(sessionId: string): TestSession | undefined {
        return this.sessions.get(sessionId);
    }

    public getAllSessions(): TestSession[] {
        return Array.from(this.sessions.values());
    }

    public cancelSession(sessionId: string): void {
        const session = this.sessions.get(sessionId);
        if (session && session.status === 'running') {
            session.status = 'cancelled';
            session.endTime = new Date();
            session.duration = session.endTime.getTime() - session.startTime.getTime();
            this.emit('sessionCancelled', { sessionId });
        }
    }

    public clearSessions(): void {
        this.sessions.clear();
    }
}

// Mock implementations for testing
class MockAnalyticsEngine extends EventEmitter {
    private events: AnalyticsEvent[] = [];

    public trackEvent(event: AnalyticsEvent): void {
        this.events.push(event);
        this.emit('event', event);
    }

    public getEvents(): AnalyticsEvent[] {
        return [...this.events];
    }

    public clearEvents(): void {
        this.events = [];
    }
}

class MockWebviewProvider extends EventEmitter {
    private messages: WebviewMessage[] = [];

    public postMessage(message: WebviewMessage): void {
        this.messages.push(message);
        this.emit('message', message);
    }

    public getMessages(): WebviewMessage[] {
        return [...this.messages];
    }

    public clearMessages(): void {
        this.messages = [];
    }
}

class MockFileSystemProvider extends EventEmitter {
    private files: Map<string, string> = new Map();

    public writeFile(path: string, content: string): void {
        this.files.set(path, content);
        this.emit('fileChange', { path, content, type: 'write' });
    }

    public readFile(path: string): string | undefined {
        return this.files.get(path);
    }

    public deleteFile(path: string): void {
        this.files.delete(path);
        this.emit('fileChange', { path, type: 'delete' });
    }

    public getFiles(): Map<string, string> {
        return new Map(this.files);
    }
}

class MockCommandRunner extends EventEmitter {
    private results: CommandResult[] = [];

    public async executeCommand(command: string, options: CommandOptions): Promise<CommandResult> {
        const result: CommandResult = {
            success: true,
            exitCode: 0,
            output: `Mock output for: ${command}`,
            duration: Math.random() * 1000,
            outputFiles: []
        };

        this.results.push(result);
        this.emit('result', result);
        return result;
    }

    public getResults(): CommandResult[] {
        return [...this.results];
    }
}

class MockStreamingService extends EventEmitter {
    public startStream(action: string): void {
        this.emit('stream', { type: 'status', data: { status: 'started', actionId: action } });
    }

    public sendMessage(message: StreamingMessage): void {
        this.emit('message', message);
    }

    public endStream(action: string): void {
        this.emit('stream', { type: 'complete', data: { status: 'completed', actionId: action } });
    }
}

class TestLogger {
    private logs: Array<{ level: string; message: string; timestamp: Date }> = [];

    constructor(private sessionId: string) {}

    public info(message: string): void {
        this.logs.push({ level: 'info', message, timestamp: new Date() });
    }

    public warn(message: string): void {
        this.logs.push({ level: 'warn', message, timestamp: new Date() });
    }

    public error(message: string): void {
        this.logs.push({ level: 'error', message, timestamp: new Date() });
    }

    public getLogs(): Array<{ level: string; message: string; timestamp: Date }> {
        return [...this.logs];
    }
}

class TestMetricsCollector extends EventEmitter {
    private metrics: PerformanceMetric[] = [];

    public recordMetric(metric: PerformanceMetric): void {
        this.metrics.push(metric);
        this.emit('metric', metric);
    }

    public getMetrics(): PerformanceMetric[] {
        return [...this.metrics];
    }
}

// Configuration interfaces
export interface IntegrationTestConfig {
    timeout: number;
    retryCount: number;
    parallel: boolean;
    stopOnFirstFailure: boolean;
    reportFormat: 'json' | 'junit' | 'html';
    outputDir: string;
    enableMetrics: boolean;
    enableProfiling: boolean;
}

export interface TestRunOptions {
    sequential?: boolean;
    stopOnFirstFailure?: boolean;
    timeout?: number;
    retryCount?: number;
    environment?: Record<string, string>;
    features?: Record<string, boolean>;
    limits?: Record<string, number>;
    tags?: string[];
    pattern?: string;
}

export { IntegrationTestRunner };
