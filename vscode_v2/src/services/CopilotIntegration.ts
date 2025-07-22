import * as vscode from 'vscode';
import { DebugContext, TestAnalysis, TestSuggestions, FalsePositiveAnalysis } from '../types';

export class CopilotIntegration {
  private models: any[] = [];
  private isEnabled: boolean;

  constructor(private context: vscode.ExtensionContext) {
    this.isEnabled = vscode.workspace.getConfiguration('aiDebugContext').get<boolean>('copilot.enabled') ?? true;
    if (this.isEnabled) {
      this.initializeModels();
    }
  }

  private async initializeModels() {
    console.log('CopilotIntegration.initializeModels() - Starting model initialization');
    
    try {
      // Check if Language Model API is available
      if (typeof vscode.lm === 'undefined') {
        console.warn('VSCode Language Model API not available. Copilot integration disabled.');
        this.isEnabled = false;
        return;
      }

      console.log('VSCode Language Model API is available');

      // Try different model selection strategies
      let models: any[] = [];
      
      // Strategy 1: Try to get all available models first
      try {
        console.log('Strategy 1: Attempting to get all available models...');
        models = await vscode.lm.selectChatModels();
        console.log(`Strategy 1 Success: Found ${models.length} total available models`);
        if (models.length > 0) {
          models.forEach((model, index) => {
            console.log(`Model ${index}: vendor=${model.vendor}, family=${model.family}, name=${model.name}`);
          });
        }
      } catch (error) {
        console.warn('Strategy 1 Failed - Could not get all models:', error);
        
        // Check for specific error types that might indicate permission issues
        if (error instanceof Error) {
          if (error.message.includes('consent') || error.message.includes('permission')) {
            console.warn('Permission/consent issue detected - user may need to approve Copilot usage');
          } else if (error.message.includes('not available') || error.message.includes('disabled')) {
            console.warn('Copilot may be disabled or not available');
          }
        }
      }
      
      // Strategy 2: If no models found or we want Copilot specifically, try Copilot vendor
      if (models.length === 0) {
        try {
          console.log('Strategy 2: Attempting to get Copilot vendor models...');
          models = await vscode.lm.selectChatModels({ vendor: 'copilot' });
          console.log(`Strategy 2 Success: Found ${models.length} Copilot models`);
          if (models.length > 0) {
            models.forEach((model, index) => {
              console.log(`Copilot Model ${index}: vendor=${model.vendor}, family=${model.family}, name=${model.name}`);
            });
          }
        } catch (error) {
          console.warn('Strategy 2 Failed - Could not get Copilot models:', error);
        }
      }
      
      // Strategy 3: Try other common configurations
      if (models.length === 0) {
        const strategies = [
          { vendor: 'copilot', family: 'gpt-4' },
          { vendor: 'copilot', family: 'gpt-3.5-turbo' },
          { family: 'gpt-4' },
          { family: 'gpt-3.5-turbo' }
        ];
        
        for (const strategy of strategies) {
          try {
            models = await vscode.lm.selectChatModels(strategy);
            if (models.length > 0) {
              console.log(`Found ${models.length} models with strategy:`, strategy);
              break;
            }
          } catch (error) {
            console.warn(`Strategy ${JSON.stringify(strategy)} failed:`, error);
          }
        }
      }
      
      if (models.length === 0) {
        console.warn('No language models available. Please ensure GitHub Copilot is active and you have access to language models.');
        this.isEnabled = false;
        return;
      }
      
      this.models = models;
      console.log(`Successfully initialized ${models.length} language models`);
      
      // Log model details for debugging
      models.forEach((model, index) => {
        console.log(`Model ${index}: vendor=${model.vendor}, family=${model.family}, name=${model.name}`);
      });
      
    } catch (error) {
      console.error('Failed to initialize language models:', error);
      this.isEnabled = false;
    }
  }

  async isAvailable(): Promise<boolean> {
    console.log('CopilotIntegration.isAvailable() - Starting check', {
      isEnabled: this.isEnabled,
      modelsLength: this.models.length
    });
    
    if (!this.isEnabled) {
      console.log('CopilotIntegration.isAvailable() - Not enabled');
      return false;
    }
    
    if (this.models.length === 0) {
      console.log('CopilotIntegration.isAvailable() - No models found, reinitializing...');
      await this.initializeModels();
      console.log('CopilotIntegration.isAvailable() - After reinitialization, models length:', this.models.length);
    }
    
    const available = this.models.length > 0;
    console.log('CopilotIntegration.isAvailable() - Final result:', available);
    
    return available;
  }

  /**
   * Force refresh of Copilot models - useful for diagnostic refresh
   */
  async refresh(): Promise<boolean> {
    console.log('CopilotIntegration.refresh() - Force refreshing Copilot models');
    this.models = []; // Clear cached models
    await this.initializeModels();
    const available = this.models.length > 0;
    console.log('CopilotIntegration.refresh() - Refresh completed, available:', available);
    return available;
  }

  async getDiagnostics(): Promise<any> {
    const diagnostics: any = {
      isEnabled: this.isEnabled,
      modelsAvailable: this.models.length,
      vscodeLmApiAvailable: typeof vscode.lm !== 'undefined',
      models: this.models.map(m => ({
        vendor: m.vendor,
        family: m.family,
        name: m.name
      }))
    };
    
    // Try to get all available models for debugging
    try {
      const allModels = await vscode.lm.selectChatModels();
      diagnostics.allAvailableModels = allModels.map(m => ({
        vendor: m.vendor,
        family: m.family,
        name: m.name
      }));
    } catch (error) {
      diagnostics.allModelsError = error instanceof Error ? error.message : String(error);
    }
    
    return diagnostics;
  }

  async analyzeTestFailures(context: DebugContext): Promise<TestAnalysis> {
    if (!await this.isAvailable()) {
      // Return mock response for now
      console.warn('GitHub Copilot not available, returning fallback analysis');
      const diagnostics = await this.getDiagnostics();
      return {
        rootCause: 'GitHub Copilot Not available - will use fallback analysis',
        specificFixes: [],
        preventionStrategies: [
          'Ensure GitHub Copilot extension is installed and active',
          'Check that you have access to language models in VSCode',
          `Diagnostics: ${JSON.stringify(diagnostics, null, 2)}`
        ],
        additionalTests: ['Fallback test suggestions based on common patterns']
      };
    }

    const prompt = this.createTestAnalysisPrompt(context);
    const response = await this.sendRequest(prompt);
    return this.parseTestAnalysis(response);
  }

  private createTestAnalysisPrompt(context: DebugContext): vscode.LanguageModelChatMessage[] {
    const systemPrompt = `You are an expert test debugging assistant. Analyze test failures and provide actionable solutions.
    
    Response Format (use this exact JSON structure):
    {
      "rootCause": "Brief explanation of why tests are failing",
      "specificFixes": [
        {
          "file": "path/to/file.ts",
          "lineNumber": 42,
          "oldCode": "existing code",
          "newCode": "corrected code",
          "explanation": "why this change fixes the issue"
        }
      ],
      "preventionStrategies": ["strategy1", "strategy2"],
      "additionalTests": ["test description 1", "test description 2"]
    }`;

    const userPrompt = `## Test Debugging Context

### Git Diff
\`\`\`diff
${context.gitDiff}
\`\`\`

### Test Results Summary
- Total Tests: ${context.testResults?.length || 0}
- Passed: ${context.testResults?.filter(t => t.status === 'passed').length || 0}
- Failed: ${context.testResults?.filter(t => t.status === 'failed').length || 0}
- Skipped: ${context.testResults?.filter(t => t.status === 'skipped').length || 0}

### Failed Tests Details
${context.testResults
  ?.filter(t => t.status === 'failed')
  ?.map(t => `
**${t.name}**
- File: ${t.file}
- Error: ${t.error || 'No error message available'}
- Stack: ${t.stackTrace || 'No stack trace available'}
`)?.join('\n') || 'No failed tests'}

Please analyze these test failures and provide solutions in the exact JSON format specified.`;

    return [
      vscode.LanguageModelChatMessage.User(systemPrompt),
      vscode.LanguageModelChatMessage.User(userPrompt)
    ];
  }

  async suggestNewTests(context: DebugContext): Promise<TestSuggestions> {
    if (!await this.isAvailable()) {
      // Return mock response for now
      console.warn('GitHub Copilot not available, returning fallback suggestions');
      return {
        newTests: [],
        missingCoverage: ['AI analysis not available - using fallback'],
        improvements: [
          'Install and activate GitHub Copilot extension',
          'Ensure you have access to VSCode Language Models',
          'Check extension logs for more details'
        ]
      };
    }

    const prompt = this.createTestSuggestionPrompt(context);
    const response = await this.sendRequest(prompt);
    return this.parseTestSuggestions(response);
  }

  private createTestSuggestionPrompt(context: DebugContext): vscode.LanguageModelChatMessage[] {
    const systemPrompt = `You are an expert test engineer. Suggest new tests based on code changes.
    
    Response Format (use this exact JSON structure):
    {
      "newTests": [
        {
          "file": "path/to/test-file.spec.ts",
          "testName": "should test specific behavior",
          "testCode": "it('should test specific behavior', () => { ... });",
          "reasoning": "why this test is needed"
        }
      ],
      "missingCoverage": ["area1", "area2"],
      "improvements": ["improvement1", "improvement2"]
    }`;

    const userPrompt = `## Test Suggestion Context

### Git Diff
\`\`\`diff
${context.gitDiff}
\`\`\`

### Existing Test Results
${context.testResults?.map(t => `- ${t.name} (${t.status})`).join('\n') || 'No test results available'}

Based on the code changes, suggest new tests that should be added to ensure comprehensive coverage.`;

    return [
      vscode.LanguageModelChatMessage.User(systemPrompt),
      vscode.LanguageModelChatMessage.User(userPrompt)
    ];
  }

  async detectFalsePositives(context: DebugContext): Promise<FalsePositiveAnalysis> {
    if (!await this.isAvailable()) {
      // Return mock response for now
      console.warn('GitHub Copilot not available, returning fallback analysis');
      return {
        suspiciousTests: [],
        mockingIssues: [],
        recommendations: [
          'Install and activate GitHub Copilot extension for AI analysis',
          'Ensure you have access to VSCode Language Models',
          'Fallback analysis: Review tests manually for over-mocking'
        ]
      };
    }

    const prompt = this.createFalsePositivePrompt(context);
    const response = await this.sendRequest(prompt);
    return this.parseFalsePositiveAnalysis(response);
  }

  private createFalsePositivePrompt(context: DebugContext): vscode.LanguageModelChatMessage[] {
    const systemPrompt = `You are an expert test reviewer. Analyze passing tests for potential false positives.
    
    Response Format (use this exact JSON structure):
    {
      "suspiciousTests": [
        {
          "file": "path/to/file.spec.ts",
          "testName": "test name",
          "issue": "description of the issue",
          "suggestion": "how to fix it"
        }
      ],
      "mockingIssues": [
        {
          "file": "path/to/file.spec.ts",
          "mock": "mock description",
          "issue": "what's wrong with the mock",
          "fix": "how to fix the mock"
        }
      ],
      "recommendations": ["recommendation1", "recommendation2"]
    }`;

    const userPrompt = `## False Positive Detection Context

### Git Diff
\`\`\`diff
${context.gitDiff}
\`\`\`

### Passing Tests
${context.testResults
  ?.filter(t => t.status === 'passed')
  .map(t => `- ${t.name} (${t.file})`)
  .join('\n') || 'No passing tests available'}

Analyze the passing tests for potential false positives, especially focusing on:
1. Over-mocked dependencies that might hide real issues
2. Tests that don't actually verify the behavior they claim to test
3. Tests that might pass due to incorrect assertions`;

    return [
      vscode.LanguageModelChatMessage.User(systemPrompt),
      vscode.LanguageModelChatMessage.User(userPrompt)
    ];
  }

  private async sendRequest(messages: vscode.LanguageModelChatMessage[]): Promise<string> {
    if (this.models.length === 0) {
      throw new Error('No Copilot models available');
    }

    try {
      const model = this.models[0];
      const response = await model.sendRequest(messages, {}, new vscode.CancellationTokenSource().token);
      
      let result = '';
      for await (const fragment of response.text) {
        result += fragment;
      }
      
      return result;
    } catch (error) {
      console.error('Failed to send request to Copilot:', error);
      return 'Error communicating with Copilot API';
    }
  }

  private parseTestAnalysis(response: string): TestAnalysis {
    try {
      // Try to extract JSON from the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          rootCause: parsed.rootCause || 'Unknown root cause',
          specificFixes: parsed.specificFixes || [],
          preventionStrategies: parsed.preventionStrategies || [],
          additionalTests: parsed.additionalTests || []
        };
      }
    } catch (error) {
      console.error('Failed to parse test analysis response:', error);
    }

    // Fallback: parse plain text response
    return {
      rootCause: 'Analysis completed but could not parse structured response',
      specificFixes: [],
      preventionStrategies: [],
      additionalTests: [response]
    };
  }

  private parseTestSuggestions(response: string): TestSuggestions {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          newTests: parsed.newTests || [],
          missingCoverage: parsed.missingCoverage || [],
          improvements: parsed.improvements || []
        };
      }
    } catch (error) {
      console.error('Failed to parse test suggestions response:', error);
    }

    return {
      newTests: [],
      missingCoverage: [],
      improvements: [response]
    };
  }

  private parseFalsePositiveAnalysis(response: string): FalsePositiveAnalysis {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          suspiciousTests: parsed.suspiciousTests || [],
          mockingIssues: parsed.mockingIssues || [],
          recommendations: parsed.recommendations || []
        };
      }
    } catch (error) {
      console.error('Failed to parse false positive analysis response:', error);
    }

    return {
      suspiciousTests: [],
      mockingIssues: [],
      recommendations: [response]
    };
  }

  async generatePRDescription(context: { gitDiff: string; testResults: any[]; template: string; jiraTickets: string[]; featureFlags: string[] }): Promise<string> {
    if (!await this.isAvailable()) {
      console.warn('GitHub Copilot not available, using fallback PR description');
      return this.generateFallbackPRDescription(context);
    }

    const prompt = this.createPRDescriptionPrompt(context);
    const response = await this.sendRequest(prompt);
    return this.parsePRDescription(response);
  }

  private createPRDescriptionPrompt(context: { gitDiff: string; testResults: any[]; template: string; jiraTickets: string[]; featureFlags: string[] }): vscode.LanguageModelChatMessage[] {
    const systemPrompt = `You are an expert at writing professional GitHub PR descriptions. Generate a comprehensive PR description based on code changes and test results.
    
    Use this exact format:
    **Problem**
    What is the problem you're solving or feature you're implementing? Please include a link to any related discussion or tasks in Jira if applicable.
    [Jira Link if applicable]
    
    **Solution**
    Describe the feature or bug fix -- what's changing?
    
    **Details**
    Include a brief overview of the technical process you took (or are going to take!) to get from the problem to the solution.
    
    **QA**
    Provide any technical details needed to test this change and/or parts that you wish to have tested.`;

    const testResultsSummary = context.testResults.length > 0 ? 
      `### Test Results:\n${context.testResults.map(t => `- ${t.name}: ${t.status}`).join('\n')}` :
      'No test results available';

    const jiraSection = context.jiraTickets.length > 0 ? 
      `### Related Jira Tickets:\n${context.jiraTickets.map(ticket => `- ${ticket}`).join('\n')}` :
      '';

    const featureFlagSection = context.featureFlags.length > 0 ? 
      `### Feature Flags:\n${context.featureFlags.map(flag => `- ${flag}`).join('\n')}` :
      '';

    const userPrompt = `Generate a professional PR description for these changes:

    ### Code Changes:
    \`\`\`diff
    ${context.gitDiff}
    \`\`\`
    
    ${testResultsSummary}
    
    ${jiraSection}
    
    ${featureFlagSection}
    
    Template type: ${context.template}
    
    Please provide a clear, professional PR description that follows the exact format specified above.`;

    return [
      vscode.LanguageModelChatMessage.User(systemPrompt),
      vscode.LanguageModelChatMessage.User(userPrompt)
    ];
  }

  private parsePRDescription(response: string): string {
    // Clean up the response and return it
    return response.trim();
  }

  private generateFallbackPRDescription(context: { gitDiff: string; testResults: any[]; template: string; jiraTickets: string[]; featureFlags: string[] }): string {
    const jiraSection = context.jiraTickets.length > 0 ? 
      `\n${context.jiraTickets.map(ticket => `[${ticket}](https://your-domain.atlassian.net/browse/${ticket})`).join(' ')}` : '';
    
    const featureSection = context.featureFlags.length > 0 ? 
      `\n\n**Feature Flags**\n${context.featureFlags.map(f => `- \`${f}\``).join('\n')}` : '';

    const testStatus = context.testResults.length > 0 ? 
      `Tests: ${context.testResults.filter(t => t.status === 'passed').length} passed, ${context.testResults.filter(t => t.status === 'failed').length} failed` : 
      'No test results available';

    return `**Problem**
Implementing code improvements and enhancements to improve application functionality and reliability.${jiraSection}

**Solution**
Updated code components with enhanced functionality, improved error handling, and comprehensive test coverage.

**Details**
• Analyzed existing code patterns and architecture
• Implemented changes following project conventions  
• Updated test cases to match new behavior
• Verified all code quality standards

**QA**
**Technical Testing:**
• Run automated test suite
• Verify linting and formatting standards
• Check code coverage metrics

**Functional Testing:**
• Test the specific functionality changes
• Verify no regressions in related features
• Check for any UI/UX impacts

**Test Status:** ${testStatus}${featureSection}`;
  }
}