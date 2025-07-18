// Simple validation test for the Angular setup fixes
describe('Angular Setup Validation', () => {
  it('should be able to import Angular core', () => {
    const core = require('@angular/core');
    expect(core).toBeDefined();
    expect(core.signal).toBeDefined();
  });

  it('should be able to import Angular testing utilities', () => {
    const testing = require('@angular/core/testing');
    expect(testing).toBeDefined();
    expect(testing.TestBed).toBeDefined();
  });

  it('should be able to create a signal', () => {
    const { signal } = require('@angular/core');
    const testSignal = signal('test');
    expect(testSignal()).toBe('test');
  });

  it('should have Jest globals available', () => {
    expect(jest).toBeDefined();
    expect(describe).toBeDefined();
    expect(it).toBeDefined();
    expect(expect).toBeDefined();
  });

  it('should have VSCode API mock available', () => {
    expect(window.acquireVsCodeApi).toBeDefined();
    const vscodeApi = window.acquireVsCodeApi();
    expect(vscodeApi.postMessage).toBeDefined();
    expect(vscodeApi.setState).toBeDefined();
    expect(vscodeApi.getState).toBeDefined();
  });
});
