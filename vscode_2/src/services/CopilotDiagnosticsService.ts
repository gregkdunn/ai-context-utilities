import * as vscode from 'vscode';
import { CopilotIntegration } from './CopilotIntegration';
import { CopilotCommandHelper } from './CopilotCommandHelper';

export interface DiagnosticCheck {
  name: string;
  status: 'checking' | 'passed' | 'failed' | 'warning';
  message: string;
  solution?: string;
  action?: string;
}

export interface CopilotDiagnostics {
  vscodeVersion: string;
  languageModelApi: boolean;
  copilotExtension: boolean;
  copilotAuthenticated: boolean;
  modelsAvailable: number;
  lastError?: string;
  checks: DiagnosticCheck[];
}

export class CopilotDiagnosticsService {
  constructor(
    private context: vscode.ExtensionContext,
    private copilot: CopilotIntegration
  ) {}

  async runDiagnostics(): Promise<CopilotDiagnostics> {
    const diagnostics: CopilotDiagnostics = {
      vscodeVersion: vscode.version,
      languageModelApi: false,
      copilotExtension: false,
      copilotAuthenticated: false,
      modelsAvailable: 0,
      checks: []
    };

    try {
      // Check 1: VSCode Version
      await this.checkVSCodeVersion(diagnostics);
      
      // Check 2: Language Model API
      await this.checkLanguageModelAPI(diagnostics);
      
      // Check 3: Copilot Extension
      await this.checkCopilotExtension(diagnostics);
      
      // Check 4: Copilot Models
      await this.checkCopilotModels(diagnostics);
      
      // Check 5: Test Copilot Communication
      await this.testCopilotCommunication(diagnostics);
      
    } catch (error) {
      diagnostics.lastError = error instanceof Error ? error.message : 'Unknown error during diagnostics';
    }

    return diagnostics;
  }

  private async checkVSCodeVersion(diagnostics: CopilotDiagnostics): Promise<void> {
    const version = vscode.version;
    const majorMinor = version.split('.').slice(0, 2).join('.');
    const isCompatible = this.isVersionCompatible(version, '1.85.0');
    
    diagnostics.checks.push({
      name: 'VSCode Version',
      status: isCompatible ? 'passed' : 'failed',
      message: isCompatible 
        ? `VSCode ${version} supports Language Model API`
        : `VSCode ${version} is too old. Need 1.85.0 or higher.`,
      solution: isCompatible ? undefined : 'Update VSCode to the latest version',
      action: isCompatible ? undefined : 'update-vscode'
    });
  }

  private async checkLanguageModelAPI(diagnostics: CopilotDiagnostics): Promise<void> {
    const apiAvailable = typeof vscode.lm !== 'undefined';
    diagnostics.languageModelApi = apiAvailable;
    
    diagnostics.checks.push({
      name: 'Language Model API',
      status: apiAvailable ? 'passed' : 'failed',
      message: apiAvailable 
        ? 'VSCode Language Model API is available'
        : 'VSCode Language Model API is not available',
      solution: apiAvailable ? undefined : 'Update VSCode to version 1.85.0 or higher',
      action: apiAvailable ? undefined : 'update-vscode'
    });
  }

  private async checkCopilotExtension(diagnostics: CopilotDiagnostics): Promise<void> {
    try {
      // Try to get the GitHub Copilot extension
      const copilotExtension = vscode.extensions.getExtension('GitHub.copilot');
      const isInstalled = copilotExtension !== undefined;
      const isActive = copilotExtension?.isActive ?? false;
      
      diagnostics.copilotExtension = isInstalled && isActive;
      
      if (!isInstalled) {
        diagnostics.checks.push({
          name: 'GitHub Copilot Extension',
          status: 'failed',
          message: 'GitHub Copilot extension is not installed',
          solution: 'Install the GitHub Copilot extension from the VSCode marketplace',
          action: 'install-copilot'
        });
      } else if (!isActive) {
        diagnostics.checks.push({
          name: 'GitHub Copilot Extension',
          status: 'warning',
          message: 'GitHub Copilot extension is installed but not active',
          solution: 'Enable the GitHub Copilot extension',
          action: 'check-copilot-status'
        });
      } else {
        diagnostics.checks.push({
          name: 'GitHub Copilot Extension',
          status: 'passed',
          message: 'GitHub Copilot extension is installed and active'
        });
      }
    } catch (error) {
      diagnostics.checks.push({
        name: 'GitHub Copilot Extension',
        status: 'failed',
        message: `Error checking Copilot extension: ${error}`,
        solution: 'Check VSCode extensions panel manually'
      });
    }
  }

  private async checkCopilotModels(diagnostics: CopilotDiagnostics): Promise<void> {
    if (!diagnostics.languageModelApi) {
      diagnostics.checks.push({
        name: 'Copilot Models',
        status: 'failed',
        message: 'Cannot check models - Language Model API not available',
        solution: 'Fix Language Model API availability first'
      });
      return;
    }

    try {
      const models = await vscode.lm.selectChatModels({ 
        vendor: 'copilot', 
        family: 'gpt-4o' 
      });
      
      diagnostics.modelsAvailable = models.length;
      
      if (models.length === 0) {
        diagnostics.checks.push({
          name: 'Copilot Models',
          status: 'failed',
          message: 'No Copilot models available',
          solution: 'Sign in to GitHub Copilot and verify your subscription',
          action: 'sign-in-copilot'
        });
      } else {
        diagnostics.checks.push({
          name: 'Copilot Models',
          status: 'passed',
          message: `${models.length} Copilot model(s) available`
        });
      }
    } catch (error) {
      diagnostics.checks.push({
        name: 'Copilot Models',
        status: 'failed',
        message: `Error accessing Copilot models: ${error}`,
        solution: 'Check GitHub Copilot authentication and subscription',
        action: 'sign-in-copilot'
      });
    }
  }

  private async testCopilotCommunication(diagnostics: CopilotDiagnostics): Promise<void> {
    if (diagnostics.modelsAvailable === 0) {
      diagnostics.checks.push({
        name: 'Copilot Communication',
        status: 'failed',
        message: 'Cannot test communication - no models available',
        solution: 'Fix model availability first'
      });
      return;
    }

    try {
      const testMessage = [
        vscode.LanguageModelChatMessage.User('Test: respond with "OK"')
      ];
      
      const models = await vscode.lm.selectChatModels({ 
        vendor: 'copilot', 
        family: 'gpt-4o' 
      });
      
      if (models.length > 0) {
        const model = models[0];
        const response = await model.sendRequest(testMessage, {}, new vscode.CancellationTokenSource().token);
        
        let result = '';
        for await (const fragment of response.text) {
          result += fragment;
        }
        
        diagnostics.copilotAuthenticated = true;
        diagnostics.checks.push({
          name: 'Copilot Communication',
          status: 'passed',
          message: `Communication test successful. Response: "${result.trim()}"`
        });
      }
    } catch (error) {
      diagnostics.checks.push({
        name: 'Copilot Communication',
        status: 'failed',
        message: `Communication test failed: ${error}`,
        solution: 'Check network connectivity and Copilot authentication',
        action: 'sign-in-copilot'
      });
    }
  }

  async executeAction(action: string): Promise<{ success: boolean; message: string }> {
    try {
      switch (action) {
        case 'check-copilot-status':
          return await this.checkCopilotStatusAction();
          
        case 'sign-in-copilot':
          return await this.signInCopilotAction();
          
        case 'install-copilot':
          await vscode.commands.executeCommand('workbench.extensions.search', 'GitHub.copilot');
          return { success: true, message: 'Opened Copilot extension in marketplace' };
          
        case 'test-copilot':
          const isAvailable = await this.copilot.isAvailable();
          return { 
            success: isAvailable, 
            message: isAvailable ? 'Copilot integration test passed' : 'Copilot integration test failed' 
          };
          
        case 'update-vscode':
          await vscode.commands.executeCommand('update.showCurrentReleaseNotes');
          return { success: true, message: 'Opened VSCode update information' };
          
        default:
          return { success: false, message: `Unknown action: ${action}` };
      }
    } catch (error) {
      return { 
        success: false, 
        message: `Action failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  private async checkCopilotStatusAction(): Promise<{ success: boolean; message: string }> {
    try {
      const result = await CopilotCommandHelper.checkStatus();
      return {
        success: result.success,
        message: result.message + (result.commands.length > 0 ? ` (${result.commands.length} commands available)` : '')
      };
    } catch (error) {
      return { 
        success: false, 
        message: `Status check failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  private async signInCopilotAction(): Promise<{ success: boolean; message: string }> {
    try {
      const result = await CopilotCommandHelper.signIn();
      return result;
    } catch (error) {
      return { 
        success: false, 
        message: `Sign-in failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  private isVersionCompatible(current: string, required: string): boolean {
    const currentParts = current.split('.').map(Number);
    const requiredParts = required.split('.').map(Number);
    
    for (let i = 0; i < Math.max(currentParts.length, requiredParts.length); i++) {
      const currentPart = currentParts[i] || 0;
      const requiredPart = requiredParts[i] || 0;
      
      if (currentPart > requiredPart) {
        return true;
      }
      if (currentPart < requiredPart) {
        return false;
      }
    }
    
    return true; // Equal versions
  }
}
