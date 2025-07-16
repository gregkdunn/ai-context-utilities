// Global test setup
global.console = {
  ...console,
  // Mock console.log to avoid noise in tests
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Setup process.env for tests
process.env.NODE_ENV = 'test';
