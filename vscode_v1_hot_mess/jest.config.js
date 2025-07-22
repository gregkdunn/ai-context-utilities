module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  
  // Performance optimizations
  maxWorkers: '50%',
  cache: true,
  cacheDirectory: '<rootDir>/.jest-cache',
  
  // Test file discovery - ONLY look in src directory
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.test.ts',
    '<rootDir>/src/**/*.test.ts'
  ],
  
  // Ignore compiled output directory completely
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/out/',
    '<rootDir>/.git/',
    '<rootDir>/angular-app/',
    '<rootDir>/temp-test/',
    '<rootDir>/scripts/'
  ],
  
  // Skip expensive operations in watch mode
  watchPathIgnorePatterns: [
    'node_modules',
    'out',
    '.git',
    '.jest-cache',
    'angular-app',
    'temp-test'
  ],
  
  // Faster feedback
  verbose: false,
  silent: false,
  
  // Coverage settings (disable in development)
  collectCoverage: false,
  
  // Module resolution
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  
  // Transform settings - only process TypeScript in src
  transform: {
    '^.+\\.ts$': 'ts-jest'
  },
  
  // Module file extensions
  moduleFileExtensions: ['ts', 'js', 'json'],
  
  // Test timeout
  testTimeout: 15000,
  
  // Root directories for module resolution
  roots: ['<rootDir>/src'],
  
  // Setup files
  setupFilesAfterEnv: [],
  
  // Mock file resolution - ONLY use TypeScript mocks
  modulePathIgnorePatterns: [
    '<rootDir>/out/'
  ]
};
