module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  moduleNameMapper: {
    '^vscode$': '<rootDir>/src/__tests__/__mocks__/vscode.ts',
    '^../services/(.*)$': '<rootDir>/src/__tests__/__mocks__/$1.ts',
    '^../webview/(.*)$': '<rootDir>/src/__tests__/__mocks__/$1.ts'
  },
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts']
};
