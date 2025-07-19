import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

declare global {
  interface Window {
    acquireVsCodeApi(): any;
  }
}

export interface VscodeMessage {
  command: string;
  data?: any;
}

@Injectable({
  providedIn: 'root'
})
export class VscodeService {
  private vscode: any;
  private messageSubject = new BehaviorSubject<VscodeMessage | null>(null);

  constructor() {
    try {
      this.vscode = window.acquireVsCodeApi();
      this.setupMessageListener();
    } catch (error) {
      console.warn('VSCode API not available (likely in development mode)');
      // Mock VSCode API for development
      this.vscode = {
        postMessage: (message: any) => console.log('Mock VSCode message:', message),
        getState: () => ({}),
        setState: (state: any) => console.log('Mock VSCode state:', state)
      };
    }
  }

  private setupMessageListener(): void {
    window.addEventListener('message', (event) => {
      const message = event.data;
      if (message.command) {
        this.messageSubject.next(message);
      }
    });
  }

  postMessage(command: string, data?: any): void {
    this.vscode.postMessage({ command, data });
  }

  onMessage(): Observable<VscodeMessage | null> {
    return this.messageSubject.asObservable();
  }

  getState(): any {
    return this.vscode.getState() || {};
  }

  setState(state: any): void {
    this.vscode.setState(state);
  }
}