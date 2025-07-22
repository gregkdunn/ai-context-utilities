import * as vscode from 'vscode';
import { createMockExtensionContext, createMockWorkspace } from './test-utils';

describe('Test Utilities', () => {
  describe('createMockExtensionContext', () => {
    it('should create a complete mock ExtensionContext', () => {
      const mockContext = createMockExtensionContext();
      
      expect(mockContext).toBeDefined();
      expect(mockContext.subscriptions).toEqual([]);
      expect(mockContext.extensionPath).toBe('/test/path');
      expect(mockContext.workspaceState).toBeDefined();
      expect(mockContext.globalState).toBeDefined();
      expect(mockContext.secrets).toBeDefined();
      expect(mockContext.environmentVariableCollection).toBeDefined();
      expect(mockContext.extensionMode).toBe(vscode.ExtensionMode.Test);
    });

    it('should allow overriding properties', () => {
      const customPath = '/custom/path';
      const mockContext = createMockExtensionContext({
        extensionPath: customPath
      });
      
      expect(mockContext.extensionPath).toBe(customPath);
    });

    it('should have functional state methods', () => {
      const mockContext = createMockExtensionContext();
      
      expect(typeof mockContext.workspaceState.get).toBe('function');
      expect(typeof mockContext.workspaceState.update).toBe('function');
      expect(typeof mockContext.globalState.get).toBe('function');
      expect(typeof mockContext.globalState.update).toBe('function');
    });
  });

  describe('createMockWorkspace', () => {
    it('should create a mock workspace with required properties', () => {
      const mockWorkspace = createMockWorkspace();
      
      expect(mockWorkspace.workspaceFolders).toBeDefined();
      expect(mockWorkspace.getConfiguration).toBeDefined();
      expect(mockWorkspace.findFiles).toBeDefined();
    });

    it('should have a default workspace folder', () => {
      const mockWorkspace = createMockWorkspace();
      
      expect(mockWorkspace.workspaceFolders).toHaveLength(1);
      expect(mockWorkspace.workspaceFolders[0].uri.fsPath).toBe('/test/workspace');
    });
  });
});