import { Injectable, inject } from '@angular/core';
import { Subject, Observable, fromEvent, filter, map } from 'rxjs';
import { WebviewMessage, StreamingMessage } from '../models';

// VSCode API type definitions
declare const acquireVsCodeApi: () => {
  postMessage: (message: any) => void;
  setState: (state: any) => void;
  getState: () => any;
};

@Injectable({
  providedIn: 'root'
})
export class WebviewService {
  private vscode: ReturnType<typeof acquireVsCodeApi>;
  private messageSubject = new Subject<any>();
  private streamingSubject = new Subject<StreamingMessage>();

  constructor() {
    this.vscode = acquireVsCodeApi();
    this.setupMessageListener();
  }

  private setupMessageListener(): void {
    window.addEventListener('message', (event) => {
      const message = event.data;
      
      switch (message.command) {
        case 'updateState':
          this.messageSubject.next(message);
          break;
          
        case 'streamingUpdate':
          this.streamingSubject.next(message.message);
          break;
          
        default:
          this.messageSubject.next(message);
      }
    });
  }

  // Message sending
  sendMessage(command: string, data?: any): void {
    this.vscode.postMessage({
      command,
      data
    });
  }

  // Legacy postMessage method for backward compatibility
  async postMessage(command: string, data?: any): Promise<void> {
    this.sendMessage(command, data);
  }

  // State management
  setState(state: any): void {
    this.vscode.setState(state);
  }

  getState(): any {
    return this.vscode.getState();
  }

  // Message observables
  onMessage(): Observable<any> {
    return this.messageSubject.asObservable();
  }

  onStreamingMessage(): Observable<StreamingMessage> {
    return this.streamingSubject.asObservable();
  }

  // Specific message types
  onStateUpdate(): Observable<any> {
    return this.messageSubject.asObservable().pipe(
      filter(msg => msg.command === 'updateState'),
      map(msg => msg.state)
    );
  }

  // Command execution
  runCommand(action: string, project?: string, options?: any): void {
    this.sendMessage('runCommand', {
      action,
      project,
      options
    });
  }

  cancelCommand(action?: string): void {
    this.sendMessage('cancelCommand', { action });
  }

  // Project operations
  getProjects(): void {
    this.sendMessage('getProjects');
  }

  setProject(project: string): void {
    this.sendMessage('setProject', { project });
  }

  // File operations
  openFile(filePath: string): void {
    this.sendMessage('openFile', { filePath });
  }

  // Status operations
  getStatus(): void {
    this.sendMessage('getStatus');
  }

  clearOutput(): void {
    this.sendMessage('clearOutput');
  }

  // Utility methods
  copyToClipboard(text: string): void {
    this.sendMessage('copyToClipboard', { text });
  }

  showNotification(message: string, type: 'info' | 'warning' | 'error' = 'info'): void {
    this.sendMessage('showNotification', { message, type });
  }

  // Configuration
  getConfiguration(key: string): void {
    this.sendMessage('getConfiguration', { key });
  }

  setConfiguration(key: string, value: any): void {
    this.sendMessage('setConfiguration', { key, value });
  }

  // Workspace operations
  getWorkspaceInfo(): void {
    this.sendMessage('getWorkspaceInfo');
  }

  // Debug operations
  enableDebugMode(): void {
    this.sendMessage('enableDebugMode');
  }

  disableDebugMode(): void {
    this.sendMessage('disableDebugMode');
  }

  getDebugLogs(): void {
    this.sendMessage('getDebugLogs');
  }

  // Theme operations
  getCurrentTheme(): void {
    this.sendMessage('getCurrentTheme');
  }

  onThemeChange(): Observable<string> {
    return this.messageSubject.asObservable().pipe(
      filter(msg => msg.command === 'themeChanged'),
      map(msg => msg.theme)
    );
  }

  // Extension lifecycle
  onExtensionReady(): Observable<void> {
    return this.messageSubject.asObservable().pipe(
      filter(msg => msg.command === 'extensionReady'),
      map(() => void 0)
    );
  }

  // Error handling
  reportError(error: any): void {
    this.sendMessage('reportError', {
      error: error.message || error.toString(),
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }

  // Performance monitoring
  reportPerformance(metric: string, value: number): void {
    this.sendMessage('reportPerformance', {
      metric,
      value,
      timestamp: new Date().toISOString()
    });
  }

  // Feature flags
  getFeatureFlags(): void {
    this.sendMessage('getFeatureFlags');
  }

  onFeatureFlagsUpdate(): Observable<Record<string, boolean>> {
    return this.messageSubject.asObservable().pipe(
      filter(msg => msg.command === 'featureFlagsUpdate'),
      map(msg => msg.flags)
    );
  }

  // Telemetry
  trackEvent(event: string, properties?: Record<string, any>): void {
    this.sendMessage('trackEvent', {
      event,
      properties,
      timestamp: new Date().toISOString()
    });
  }

  // Cleanup
  dispose(): void {
    this.messageSubject.complete();
    this.streamingSubject.complete();
  }
}
