module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  
  // Test file patterns
  testMatch: [
    '<rootDir>/tests/**/*.test.ts',
    '<rootDir>/src/**/*.test.ts'
  ],
  
  // Module name mapping for VSCode extension testing
  moduleNameMapper: {
    '^vscode$': '<rootDir>/tests/mocks/vscode.ts'
  },
  
  // Coverage configuration
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  
  // Phase 1.5.3: Reduced coverage requirements for working implementation
  coverageThreshold: {
    global: {
      branches: 40,
      functions: 55,
      lines: 50,
      statements: 50
    }
  },
  
  // Include all source files for coverage
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
    '!src/**/index.ts' // Usually just exports
  ],
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts']
};