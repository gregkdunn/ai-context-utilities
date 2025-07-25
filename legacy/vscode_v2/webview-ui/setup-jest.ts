import { setupZoneTestEnv } from 'jest-preset-angular/setup-env/zone';

// Setup Zone.js testing environment
setupZoneTestEnv();

// Global test setup
Object.defineProperty(window, 'CSS', { value: null });
Object.defineProperty(window, 'getComputedStyle', {
  value: () => {
    return {
      display: 'none',
      appearance: ['-webkit-appearance']
    };
  }
});

Object.defineProperty(document, 'doctype', {
  value: '<!DOCTYPE html>'
});

Object.defineProperty(document.body.style, 'transform', {
  value: () => {
    return {
      enumerable: true,
      configurable: true
    };
  }
});

// Mock VSCode API for testing - moved to global setup instead of per-test
Object.defineProperty(window, 'acquireVsCodeApi', {
  value: jest.fn(() => ({
    postMessage: jest.fn(),
    getState: jest.fn(() => ({})),
    setState: jest.fn(),
  })),
  writable: true,
  configurable: true
});
