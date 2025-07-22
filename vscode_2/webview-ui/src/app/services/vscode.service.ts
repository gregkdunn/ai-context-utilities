import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { 
  ComprehensiveAnalysisResult, 
  AnalysisHistoryItem,
  SubmissionOptions 
} from '../../../../src/types/analysis';

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

  // Diagnostic Methods
  
  /**
   * Check GitHub Copilot availability
   */
  async checkCopilotAvailability(): Promise<{ available: boolean; model?: string; error?: string }> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('Copilot availability check timeout'));
      }, 10000);

      const subscription = this.onMessage().subscribe(message => {
        if (message?.command === 'copilotAvailabilityResponse') {
          clearTimeout(timeoutId);
          subscription.unsubscribe();
          resolve(message.data);
        }
      });

      this.postMessage('checkCopilotAvailability');
    });
  }

  /**
   * Check if AI context file exists
   */
  async checkContextFileExists(): Promise<{ exists: boolean; path?: string; size?: number }> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('Context file check timeout'));
      }, 5000);

      const subscription = this.onMessage().subscribe(message => {
        if (message?.command === 'contextFileCheckResponse') {
          clearTimeout(timeoutId);
          subscription.unsubscribe();
          resolve(message.data);
        }
      });

      this.postMessage('checkContextFile');
    });
  }

  /**
   * Run comprehensive system diagnostics
   */
  async runSystemDiagnostics(): Promise<{
    copilot: { available: boolean; model?: string; error?: string };
    contextFile: { exists: boolean; path?: string; size?: number };
    workspace: { hasWorkspace: boolean; gitRepo: boolean };
    permissions: { canWrite: boolean; canExecute: boolean };
  }> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('System diagnostics timeout'));
      }, 15000);

      const subscription = this.onMessage().subscribe(message => {
        if (message?.command === 'systemDiagnosticsResponse') {
          clearTimeout(timeoutId);
          subscription.unsubscribe();
          resolve(message.data);
        }
      });

      this.postMessage('runSystemDiagnostics');
    });
  }

  // Analysis Dashboard Methods
  
  /**
   * Submit AI context for comprehensive analysis
   */
  async submitContextForAnalysis(options?: SubmissionOptions): Promise<{ analysis: ComprehensiveAnalysisResult }> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('Analysis submission timeout'));
      }, options?.timeout || 120000);

      // Listen for response
      const subscription = this.onMessage().subscribe(message => {
        if (message?.command === 'analysisComplete') {
          clearTimeout(timeoutId);
          subscription.unsubscribe();
          resolve({ analysis: message.data });
        } else if (message?.command === 'analysisError') {
          clearTimeout(timeoutId);
          subscription.unsubscribe();
          reject(new Error(message.data?.error || 'Analysis failed'));
        }
      });

      // Send the request
      this.postMessage('submitContextForAnalysis', options);
    });
  }

  /**
   * Get analysis history
   */
  async getAnalysisHistory(): Promise<AnalysisHistoryItem[]> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('Request timeout'));
      }, 10000);

      const subscription = this.onMessage().subscribe(message => {
        if (message?.command === 'analysisHistoryResponse') {
          clearTimeout(timeoutId);
          subscription.unsubscribe();
          resolve(message.data || []);
        }
      });

      this.postMessage('getAnalysisHistory');
    });
  }

  /**
   * Load a specific analysis by ID
   */
  async loadAnalysis(analysisId: string): Promise<ComprehensiveAnalysisResult | null> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('Request timeout'));
      }, 10000);

      const subscription = this.onMessage().subscribe(message => {
        if (message?.command === 'loadAnalysisResponse') {
          clearTimeout(timeoutId);
          subscription.unsubscribe();
          resolve(message.data);
        }
      });

      this.postMessage('loadAnalysis', { analysisId });
    });
  }

  /**
   * Export analysis in specified format
   */
  async exportAnalysis(format: 'json' | 'csv' | 'pdf'): Promise<void> {
    this.postMessage('exportAnalysis', { format });
  }

  /**
   * Export analysis history
   */
  async exportAnalysisHistory(format: 'json' | 'csv' | 'pdf'): Promise<void> {
    this.postMessage('exportAnalysisHistory', { format });
  }

  /**
   * Save PR template
   */
  savePRTemplate(): void {
    this.postMessage('savePRTemplate');
  }

  /**
   * Mark recommendations as implemented
   */
  markRecommendationsImplemented(analysisId: string, implementedCount: number): void {
    this.postMessage('markRecommendationsImplemented', { analysisId, implementedCount });
  }

  /**
   * Compare two analyses
   */
  async compareAnalyses(analysisId1: string, analysisId2: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('Request timeout'));
      }, 15000);

      const subscription = this.onMessage().subscribe(message => {
        if (message?.command === 'compareAnalysesResponse') {
          clearTimeout(timeoutId);
          subscription.unsubscribe();
          resolve(message.data);
        }
      });

      this.postMessage('compareAnalyses', { analysisId1, analysisId2 });
    });
  }

  /**
   * Get analysis insights and trends
   */
  async getAnalysisInsights(): Promise<any> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('Request timeout'));
      }, 10000);

      const subscription = this.onMessage().subscribe(message => {
        if (message?.command === 'analysisInsightsResponse') {
          clearTimeout(timeoutId);
          subscription.unsubscribe();
          resolve(message.data);
        }
      });

      this.postMessage('getAnalysisInsights');
    });
  }

  /**
   * Delete an analysis
   */
  async deleteAnalysis(analysisId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('Request timeout'));
      }, 10000);

      const subscription = this.onMessage().subscribe(message => {
        if (message?.command === 'deleteAnalysisResponse') {
          clearTimeout(timeoutId);
          subscription.unsubscribe();
          if (message.data?.success) {
            resolve();
          } else {
            reject(new Error(message.data?.error || 'Delete failed'));
          }
        }
      });

      this.postMessage('deleteAnalysis', { analysisId });
    });
  }

  /**
   * Execute VSCode command
   */
  async executeCommand(command: string, args?: any): Promise<void> {
    this.postMessage('executeCommand', { command, args });
  }

  /**
   * Open external URL
   */
  async openExternalUrl(url: string): Promise<void> {
    this.postMessage('openExternalUrl', { url });
  }

  /**
   * Show diagnostic logs
   */
  async showDiagnosticLogs(): Promise<void> {
    this.postMessage('showDiagnosticLogs');
  }

  /**
   * Show error message
   */
  showErrorMessage(message: string): void {
    this.postMessage('showErrorMessage', { message });
  }

  /**
   * Generate AI context from existing files
   */
  generateAIContextFromExistingFiles(): void {
    this.postMessage('generateAIContextFromExistingFiles');
  }
}