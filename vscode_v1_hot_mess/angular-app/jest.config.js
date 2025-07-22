const { pathsToModuleNameMapper } = require('ts-jest');
const { compilerOptions } = require('./tsconfig.json');

module.exports = {
  preset: 'jest-preset-angular',
  
  // Basic setup
  roots: ['<rootDir>/src/'],
  testMatch: ['**/+(*.)+(spec).+(ts)'],
  setupFilesAfterEnv: ['<rootDir>/src/test.ts'],
  
  // Performance optimizations
  maxWorkers: '50%',
  collectCoverage: false,
  testTimeout: 15000,
  
  // Let jest-preset-angular handle transforms with minimal override
  transform: {
    '^.+\\.(ts|js|html)$': [
      'jest-preset-angular',
      {
        tsconfig: 'tsconfig.spec.json',
        stringifyContentPathRegex: '\\.(html|svg)$'
      }
    ]
  },
  
  // Module resolution
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    ...pathsToModuleNameMapper(compilerOptions.paths || {}, {
      prefix: '<rootDir>/'
    })
  },
  
  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/',
    '/out-tsc/',
    '\\.js$',
    '\\.js.map$'
  ],
  
  // Environment
  testEnvironment: 'jsdom',
  
  // File extensions
  moduleFileExtensions: ['ts', 'html', 'js', 'json', 'mjs'],
  
  // Prevent hanging
  forceExit: true,
  detectOpenHandles: false,
  
  // Cache
  cache: true,
  cacheDirectory: '<rootDir>/node_modules/.cache/jest',
  
  // Coverage (when enabled)
  coverageDirectory: 'coverage',
  coverageReporters: ['html', 'text-summary', 'lcov'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.spec.ts',
    '!src/test.ts',
    '!src/main.ts'
  ],
  
  // Mock cleanup
  clearMocks: true,
  restoreMocks: true
};
