import * as vscode from 'vscode';

export class CopilotCommandHelper {
  
  /**
   * Get all available Copilot-related commands in the current VSCode instance
   */
  static async getAvailableCopilotCommands(): Promise<string[]> {
    try {
      // Get all available commands
      const allCommands = await vscode.commands.getCommands();
      
      // Filter for Copilot-related commands
      const copilotCommands = allCommands.filter(command => 
        command.toLowerCase().includes('copilot') || 
        command.toLowerCase().includes('github.copilot')
      );
      
      return copilotCommands.sort();
    } catch (error) {
      console.error('Failed to get available commands:', error);
      return [];
    }
  }

  /**
   * Try to execute a Copilot command with fallbacks
   */
  static async executeWithFallbacks(
    primaryCommand: string, 
    fallbackCommands: string[] = []
  ): Promise<{ success: boolean; command?: string; error?: string }> {
    
    const commandsToTry = [primaryCommand, ...fallbackCommands];
    
    for (const command of commandsToTry) {
      try {
        await vscode.commands.executeCommand(command);
        return { success: true, command };
      } catch (error) {
        // Command not found or failed, try next one
        continue;
      }
    }
    
    return { 
      success: false, 
      error: `None of the commands worked: ${commandsToTry.join(', ')}` 
    };
  }

  /**
   * Get the status of GitHub Copilot extension
   */
  static async getCopilotExtensionStatus(): Promise<{
    installed: boolean;
    active: boolean;
    version?: string;
    commands: string[];
  }> {
    try {
      const copilotExtension = vscode.extensions.getExtension('GitHub.copilot');
      
      if (!copilotExtension) {
        return {
          installed: false,
          active: false,
          commands: []
        };
      }

      // Get available Copilot commands
      const availableCommands = await this.getAvailableCopilotCommands();
      
      return {
        installed: true,
        active: copilotExtension.isActive,
        version: copilotExtension.packageJSON?.version,
        commands: availableCommands
      };
    } catch (error) {
      return {
        installed: false,
        active: false,
        commands: []
      };
    }
  }

  /**
   * Generate a helpful message about Copilot status
   */
  static async generateStatusMessage(): Promise<string> {
    const status = await this.getCopilotExtensionStatus();
    
    if (!status.installed) {
      return '❌ GitHub Copilot extension is not installed. Install it from the VSCode marketplace.';
    }
    
    if (!status.active) {
      return '⚠️ GitHub Copilot extension is installed but not active. Try restarting VSCode.';
    }
    
    if (status.commands.length === 0) {
      return '⚠️ GitHub Copilot extension is active but no commands are available. The extension may still be loading.';
    }
    
    // Check Language Model API
    if (typeof vscode.lm === 'undefined') {
      return '❌ VSCode Language Model API is not available. Update VSCode to version 1.85.0 or higher.';
    }
    
    try {
      const models = await vscode.lm.selectChatModels({ vendor: 'copilot' });
      if (models.length > 0) {
        return `✅ GitHub Copilot is ready! Found ${models.length} model(s). Available commands: ${status.commands.slice(0, 3).join(', ')}${status.commands.length > 3 ? '...' : ''}`;
      } else {
        return '⚠️ GitHub Copilot extension is active but no AI models are available. Please sign in to GitHub Copilot.';
      }
    } catch (error) {
      return '⚠️ GitHub Copilot extension is active but authentication is needed. Please sign in to GitHub Copilot.';
    }
  }

  /**
   * Try to find and execute the most appropriate Copilot status command
   */
  static async checkStatus(): Promise<{ success: boolean; message: string; commands: string[] }> {
    const status = await this.getCopilotExtensionStatus();
    
    if (!status.installed) {
      return {
        success: false,
        message: 'GitHub Copilot extension is not installed',
        commands: []
      };
    }

    // Try to execute a status command
    const statusCommands = status.commands.filter(cmd => 
      cmd.includes('status') || cmd.includes('check')
    );

    if (statusCommands.length > 0) {
      const result = await this.executeWithFallbacks(statusCommands[0], statusCommands.slice(1));
      return {
        success: result.success,
        message: result.success 
          ? `Status command executed: ${result.command}` 
          : `Status commands failed: ${result.error}`,
        commands: status.commands
      };
    }

    // No status command found, generate manual status
    const statusMessage = await this.generateStatusMessage();
    return {
      success: true,
      message: statusMessage,
      commands: status.commands
    };
  }

  /**
   * Try to find and execute the most appropriate Copilot sign-in command
   */
  static async signIn(): Promise<{ success: boolean; message: string; commands: string[] }> {
    const status = await this.getCopilotExtensionStatus();
    
    if (!status.installed) {
      return {
        success: false,
        message: 'GitHub Copilot extension is not installed',
        commands: []
      };
    }

    // Try to execute a sign-in command
    const signInCommands = status.commands.filter(cmd => 
      cmd.includes('signin') || cmd.includes('signIn') || cmd.includes('login') || cmd.includes('auth')
    );

    if (signInCommands.length > 0) {
      const result = await this.executeWithFallbacks(signInCommands[0], signInCommands.slice(1));
      return {
        success: result.success,
        message: result.success 
          ? `Sign-in command executed: ${result.command}` 
          : `Sign-in commands failed: ${result.error}`,
        commands: status.commands
      };
    }

    // No sign-in command found, try opening command palette
    try {
      await vscode.commands.executeCommand('workbench.action.quickOpen', '>GitHub Copilot');
      return {
        success: true,
        message: 'Opened command palette with GitHub Copilot commands. Look for sign-in options.',
        commands: status.commands
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to open command palette for Copilot commands',
        commands: status.commands
      };
    }
  }
}
