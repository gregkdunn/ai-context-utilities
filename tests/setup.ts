// Jest setup file for AI Debug Context V3 tests

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
};

// Global test timeout (increase for integration tests if needed)
jest.setTimeout(10000);

// Mock timers for testing time-dependent code
beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => {
  jest.useRealTimers();
});