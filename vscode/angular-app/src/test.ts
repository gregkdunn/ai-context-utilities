import 'jest-preset-angular/setup-jest';
import { TestBed } from '@angular/core/testing';
import { BrowserDynamicTestingModule, platformBrowserDynamicTesting } from '@angular/platform-browser-dynamic/testing';

// Setup test environment
TestBed.initTestEnvironment(
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting()
);

// Mock VSCode API
Object.defineProperty(window, 'acquireVsCodeApi', {
  value: () => ({
    postMessage: jest.fn(),
    setState: jest.fn(),
    getState: jest.fn(() => ({}))
  })
});

// Mock window.addEventListener for messages
const originalAddEventListener = window.addEventListener;
window.addEventListener = jest.fn((event, callback) => {
  if (event === 'message') {
    // Store the callback for testing
    (window as any).messageCallback = callback;
  }
  return originalAddEventListener.call(window, event, callback);
});

// Helper to simulate VSCode messages
(window as any).simulateVSCodeMessage = (data: any) => {
  const callback = (window as any).messageCallback;
  if (callback) {
    callback({ data });
  }
};

// Global test utilities
declare global {
  interface Window {
    simulateVSCodeMessage: (data: any) => void;
  }
}

// Suppress console.log in tests unless explicitly needed
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};

// Mock matchMedia
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
  const computedStyle = originalGetComputedStyle(element);
  return {
    ...computedStyle,
    getPropertyValue: jest.fn((prop) => {
      return mockCSSCustomProperties[prop as keyof typeof mockCSSCustomProperties] || '';
    })
  };
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
