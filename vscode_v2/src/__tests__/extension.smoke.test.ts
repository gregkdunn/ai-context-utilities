import * as vscode from 'vscode';

// Simple smoke test for extension activation
describe('Extension Smoke Test', () => {
  it('should be able to import the extension module', () => {
    // Just test that the module can be loaded without errors
    expect(() => {
      const extension = require('../extension');
      expect(extension.activate).toBeDefined();
      expect(extension.deactivate).toBeDefined();
    }).not.toThrow();
  });

  it('should have proper exports', () => {
    const extension = require('../extension');
    expect(typeof extension.activate).toBe('function');
    expect(typeof extension.deactivate).toBe('function');
  });
});
