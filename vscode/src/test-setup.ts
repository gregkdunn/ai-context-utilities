// Test setup utilities
import * as fs from 'fs';
import * as path from 'path';

export const setupFsMocks = () => {
  const mockedFs = jest.mocked(fs);
  
  mockedFs.existsSync = jest.fn();
  mockedFs.readFileSync = jest.fn();
  mockedFs.readdirSync = jest.fn();
  mockedFs.statSync = jest.fn() as any;
  
  return mockedFs;
};

export const setupPathMocks = () => {
  const mockedPath = jest.mocked(path);
  
  mockedPath.join = jest.fn().mockImplementation((...segments) => segments.join('/'));
  mockedPath.basename = jest.fn().mockImplementation((p) => p.split('/').pop() || '');
  mockedPath.relative = jest.fn().mockImplementation((from, to) => to.replace(from, '').replace(/^\//, ''));
  
  return mockedPath;
};

export const createMockVscode = () => ({
  workspace: {
    workspaceFolders: [
      { uri: { fsPath: '/test/workspace' } }
    ]
  },
  window: {
    activeTextEditor: null
  }
});
