import * as vscode from 'vscode';
import { DebugContext, TestAnalysis, TestSuggestions, FalsePositiveAnalysis } from '../types';

export class CopilotIntegrationDebug {
  private models: any[] = [];
  private isEnabled: boolean;
  private debugInfo: string[] = [];

  constructor(private context: vscode.ExtensionContext) {
    this.debugInfo.push('🔍 CopilotIntegration: Starting initialization...');
    
    this.isEnabled = vscode.workspace.getConfiguration('aiDebugContext').get<boolean>('copilot.enabled') ?? true;
    this.debugInfo.push(`📋 CopilotIntegration: Enabled in config: ${this.isEnabled}`);
    
    if (this.isEnabled) {
      this.initializeModels();
    } else {
      this.debugInfo.push('⚠️ CopilotIntegration: Disabled in configuration');
    }
  }

  private async initializeModels() {
    try {
      this.debugInfo.push('🚀 CopilotIntegration: Initializing models...');
      
      // Check if Language Model API is available
      if (typeof vscode.lm === 'undefined') {
        this.debugInfo.push('❌ CopilotIntegration: VSCode Language Model API not available');
        this.debugInfo.push('   - VSCode version may be too old (need 1.85+)');
        this.debugInfo.push('   - Language Model API may not be enabled');
        this.isEnabled = false;
        this.logDebugInfo();
        return;
      }

      this.debugInfo.push('✅ CopilotIntegration: VSCode Language Model API available');

      // Check VSCode version
      const vscodeVersion = vscode.version;
      this.debugInfo.push(`📍 CopilotIntegration: VSCode version: ${vscodeVersion}`);

      // Select appropriate models for different tasks
      this.debugInfo.push('🔍 CopilotIntegration: Selecting Copilot models...');
      const models = await vscode.lm.selectChatModels({ 
        vendor: 'copilot', 
        family: 'gpt-4o' 
      });
      
      this.debugInfo.push(`📊 CopilotIntegration: Found ${models.length} models`);
      
      if (models.length === 0) {
        this.debugInfo.push('❌ CopilotIntegration: No Copilot models available');
        this.debugInfo.push('   - GitHub Copilot extension may not be installed');
        this.debugInfo.push('   - GitHub Copilot may not be authenticated');
        this.debugInfo.push('   - Copilot subscription may be inactive');
        this.debugInfo.push('   - Try: Command Palette → "GitHub Copilot: Sign In"');
        this.isEnabled = false;
        this.logDebugInfo();
        return;
      }
      
      this.models = models;
      this.debugInfo.push(`✅ CopilotIntegration: Successfully initialized ${models.length} models`);
      
      // Test model capabilities
      await this.testModelCapabilities();
      
    } catch (error) {
      this.debugInfo.push(`❌ CopilotIntegration: Failed to initialize models: ${error}`);
      this.debugInfo.push('   - Check GitHub Copilot extension status');
      this.debugInfo.push('   - Check network connectivity');
      this.debugInfo.push('   - Try restarting VSCode');
      this.isEnabled = false;
    }
    
    this.logDebugInfo();
  }

  private async testModelCapabilities() {
    try {
      this.debugInfo.push('🧪 CopilotIntegration: Testing model capabilities...');
      
      const testMessage = [
        vscode.LanguageModelChatMessage.User('Test message: respond with "OK"')
      ];
      
      const model = this.models[0];
      const response = await model.sendRequest(testMessage, {}, new vscode.CancellationTokenSource().token);
      
      let result = '';
      for await (const fragment of response.text) {
        result += fragment;
      }
      
      this.debugInfo.push(`✅ CopilotIntegration: Model test successful, response: "${result.trim()}"`);
      
    } catch (error) {
      this.debugInfo.push(`⚠️ CopilotIntegration: Model test failed: ${error}`);
      this.debugInfo.push('   - Models found but communication failed');
      this.debugInfo.push('   - May indicate authentication or network issues');
    }
  }

  private logDebugInfo() {
    console.log('\n=== COPILOT INTEGRATION DEBUG INFO ===');
    this.debugInfo.forEach(info => console.log(info));
    console.log('=== END DEBUG INFO ===\n');
    
    // Also show in VSCode output channel for easier debugging
    const outputChannel = vscode.window.createOutputChannel('AI Debug Context - Copilot');
    outputChannel.appendLine('\n=== COPILOT INTEGRATION DEBUG INFO ===');
    this.debugInfo.forEach(info => outputChannel.appendLine(info));
    outputChannel.appendLine('=== END DEBUG INFO ===\n');
    outputChannel.show();
  }

  async isAvailable(): Promise<boolean> {
    if (!this.isEnabled) {
      return false;
    }
    
    if (this.models.length === 0) {
      await this.initializeModels();
    }
    
    const available = this.models.length > 0;
    console.log(`🔍 CopilotIntegration.isAvailable(): ${available}`);
    return available;
  }

  getDebugInfo(): string[] {
    return [...this.debugInfo];
  }

  // Include all the other methods from the original service
  async analyzeTestFailures(context: DebugContext): Promise<TestAnalysis> {
    if (!await this.isAvailable()) {
      console.warn('GitHub Copilot not available, returning mock analysis');
      return {
        rootCause: 'Copilot integration not available - using fallback analysis',
        specificFixes: [],
        preventionStrategies: ['Ensure GitHub Copilot extension is installed and active'],
        additionalTests: ['Mock test suggestions would appear here']
      };
    }

    // ... rest of the implementation
    return {
      rootCause: 'Debug mode - analysis would go here',
      specificFixes: [],
      preventionStrategies: [],
      additionalTests: []
    };
  }

  async suggestNewTests(context: DebugContext): Promise<TestSuggestions> {
    if (!await this.isAvailable()) {
      return {
        newTests: [],
        missingCoverage: ['Copilot integration not available'],
        improvements: ['Install and activate GitHub Copilot extension']
      };
    }

    return {
      newTests: [],
      missingCoverage: [],
      improvements: ['Debug mode - suggestions would go here']
    };
  }

  async detectFalsePositives(context: DebugContext): Promise<FalsePositiveAnalysis> {
    if (!await this.isAvailable()) {
      return {
        suspiciousTests: [],
        mockingIssues: [],
        recommendations: ['Install and activate GitHub Copilot extension for AI analysis']
      };
    }

    return {
      suspiciousTests: [],
      mockingIssues: [],
      recommendations: ['Debug mode - analysis would go here']
    };
  }
}
