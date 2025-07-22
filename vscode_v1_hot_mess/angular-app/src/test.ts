import { setupZoneTestEnv } from 'jest-preset-angular/setup-env/zone';

// Setup test environment with new API
setupZoneTestEnv();

// Setup test timeouts to prevent hanging
beforeEach(() => {
  jest.setTimeout(15000); // 15 second timeout per test
});

// Clear all timers after each test to prevent hanging
afterEach(() => {
  jest.clearAllTimers();
  jest.clearAllMocks();
});

// Extend Jest matchers
expect.extend({
  toHaveSize(received: any[], expectedSize: number) {
    const pass = received.length === expectedSize;
    return {
      message: () => `expected array to have size ${expectedSize}, but got ${received.length}`,
      pass,
    };
  },
});

// Add type declaration for Jest matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toHaveSize(expectedSize: number): R;
    }
  }
  
  interface Window {
    acquireVsCodeApi: () => {
      postMessage: (message: any) => void;
      setState: (state: any) => void;
      getState: () => any;
    };
    simulateVSCodeMessage: (data: any) => void;
  }
}

// Mock VSCode API - simple implementation to avoid conflicts
Object.defineProperty(window, 'acquireVsCodeApi', {
  value: () => ({
    postMessage: jest.fn(),
    setState: jest.fn(),
    getState: jest.fn(() => ({}))
  }),
  writable: true,
  configurable: true
});

// Mock window.addEventListener for messages - simplified
const originalAddEventListener = window.addEventListener;
window.addEventListener = jest.fn((event, callback) => {
  if (event === 'message') {
    // Store the callback for testing without actually setting up listeners
    (window as any).messageCallback = callback;
  }
  // Don't call original to avoid actual event listeners
});

// Helper to simulate VSCode messages
(window as any).simulateVSCodeMessage = (data: any) => {
  const callback = (window as any).messageCallback;
  if (callback) {
    callback({ data });
  }
};

// Suppress console.log in tests unless explicitly needed
const originalConsole = global.console;
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: originalConsole.error // Keep error for debugging
};

// Mock IntersectionObserver
(global as any).IntersectionObserver = class {
  root: Element | null = null;
  rootMargin: string = '';
  thresholds: ReadonlyArray<number> = [];

  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
};

// Mock ResizeObserver
(global as any).ResizeObserver = class {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};

// Mock matchMedia with simpler implementation
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock performance API
Object.defineProperty(window, 'performance', {
  value: {
    now: jest.fn(() => Date.now()),
    mark: jest.fn(),
    measure: jest.fn(),
    getEntriesByType: jest.fn(() => []),
    getEntriesByName: jest.fn(() => [])
  }
});

// Mock clipboard API to prevent errors
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: jest.fn().mockResolvedValue(undefined),
    readText: jest.fn().mockResolvedValue(''),
    write: jest.fn().mockResolvedValue(undefined),
    read: jest.fn().mockResolvedValue([])
  }
});

// Mock document.execCommand to prevent errors
document.execCommand = jest.fn().mockReturnValue(true);

// Setup default CSS custom properties for testing
const mockCSSCustomProperties = {
  '--vscode-font-family': 'monospace',
  '--vscode-font-size': '13px',
  '--vscode-foreground': '#cccccc',
  '--vscode-background': '#1e1e1e',
  '--vscode-editor-background': '#1e1e1e',
  '--vscode-button-background': '#0e639c',
  '--vscode-button-foreground': '#ffffff',
  '--vscode-button-hoverBackground': '#1177bb',
  '--vscode-input-background': '#3c3c3c',
  '--vscode-input-foreground': '#cccccc',
  '--vscode-input-border': '#3c3c3c',
  '--vscode-panel-background': '#252526',
  '--vscode-panel-border': '#2d2d30',
  '--vscode-selection-background': '#264f78',
  '--vscode-progressBar-background': '#0e70c0',
  '--vscode-terminal-ansiGreen': '#16c60c',
  '--vscode-terminal-ansiRed': '#cd3131',
  '--vscode-terminal-ansiYellow': '#e5e510',
  '--vscode-terminal-ansiBlue': '#2472c8'
};

// Mock getComputedStyle
const originalGetComputedStyle = window.getComputedStyle;
window.getComputedStyle = jest.fn((element) => {
  return {
    getPropertyValue: jest.fn((prop) => {
      return mockCSSCustomProperties[prop as keyof typeof mockCSSCustomProperties] || '';
    })
  } as any;
});

// Mock setTimeout and setInterval to prevent hanging
const originalSetTimeout = global.setTimeout;
const originalSetInterval = global.setInterval;
const originalClearTimeout = global.clearTimeout;
const originalClearInterval = global.clearInterval;

// Keep track of active timers
const activeTimers = new Set<NodeJS.Timeout>();

global.setTimeout = jest.fn((callback: Function, delay?: number) => {
  const timer = originalSetTimeout(() => {
    activeTimers.delete(timer);
    callback();
  }, Math.min(delay || 0, 1000)); // Cap delays at 1 second in tests
  
  activeTimers.add(timer);
  return timer;
});

global.setInterval = jest.fn((callback: Function, delay?: number) => {
  const timer = originalSetInterval(callback, Math.min(delay || 0, 1000)); // Cap intervals at 1 second
  activeTimers.add(timer);
  return timer;
});

global.clearTimeout = jest.fn((timer: NodeJS.Timeout) => {
  activeTimers.delete(timer);
  return originalClearTimeout(timer);
});

global.clearInterval = jest.fn((timer: NodeJS.Timeout) => {
  activeTimers.delete(timer);
  return originalClearInterval(timer);
});

// Clear all active timers after each test
afterEach(() => {
  activeTimers.forEach(timer => {
    try {
      clearTimeout(timer);
      clearInterval(timer);
    } catch (e) {
      // Ignore errors when clearing timers
    }
  });
  activeTimers.clear();
});

// Test utilities
export const createMockVSCodeApi = () => ({
  postMessage: jest.fn(),
  setState: jest.fn(),
  getState: jest.fn(() => ({}))
});

export const createMockWebviewState = () => ({
  projects: [],
  currentProject: '',
  actions: {},
  outputFiles: {},
  isStreaming: false,
  currentOutput: '',
  lastRun: undefined
});

export const createMockProject = (overrides: any = {}) => ({
  name: 'test-project',
  projectType: 'application',
  sourceRoot: 'src',
  root: 'apps/test-project',
  targets: {
    build: {},
    test: {},
    lint: {}
  },
  ...overrides
});

export const createMockCommand = (overrides: any = {}) => ({
  id: 'test-command-1',
  action: 'aiDebug',
  project: 'test-project',
  status: 'running',
  startTime: new Date(),
  progress: 0,
  output: [],
  priority: 'normal',
  ...overrides
});

export const waitForSignalUpdate = async () => {
  await new Promise(resolve => setTimeout(resolve, 0));
};
