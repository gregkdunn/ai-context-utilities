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
    try {
      // Check if Language Model API is available
      if (typeof vscode.lm === 'undefined') {
        console.warn('VSCode Language Model API not available. Copilot integration disabled.');
        this.isEnabled = false;
        return;
      }

      // Select appropriate models for different tasks
      const models = await vscode.lm.selectChatModels({ 
        vendor: 'copilot', 
        family: 'gpt-4o' 
      });
      
      if (models.length === 0) {
        console.warn('No Copilot models available. Please ensure GitHub Copilot is active.');
        this.isEnabled = false;
        return;
      }
      
      this.models = models;
      console.log(`Initialized ${models.length} Copilot models`);
    } catch (error) {
      console.error('Failed to initialize Copilot models:', error);
      this.isEnabled = false;
    }
  }

  async isAvailable(): Promise<boolean> {
    if (!this.isEnabled) {
      return false;
    }
    
    if (this.models.length === 0) {
      await this.initializeModels();
    }
    
    return this.models.length > 0;
  }

  async analyzeTestFailures(context: DebugContext): Promise<TestAnalysis> {
    if (!await this.isAvailable()) {
      // Return mock response for now
      console.warn('GitHub Copilot not available, returning mock analysis');
      return {
        rootCause: 'Copilot integration not available - using fallback analysis',
        specificFixes: [],
        preventionStrategies: ['Ensure GitHub Copilot extension is installed and active'],
        additionalTests: ['Mock test suggestions would appear here']
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
- Total Tests: ${context.testResults.length}
- Passed: ${context.testResults.filter(t => t.status === 'passed').length}
- Failed: ${context.testResults.filter(t => t.status === 'failed').length}
- Skipped: ${context.testResults.filter(t => t.status === 'skipped').length}

### Failed Tests Details
${context.testResults
  .filter(t => t.status === 'failed')
  .map(t => `
**${t.name}**
- File: ${t.file}
- Error: ${t.error || 'No error message available'}
- Stack: ${t.stackTrace || 'No stack trace available'}
`).join('\n')}

Please analyze these test failures and provide solutions in the exact JSON format specified.`;

    return [
      vscode.LanguageModelChatMessage.User(systemPrompt),
      vscode.LanguageModelChatMessage.User(userPrompt)
    ];
  }

  async suggestNewTests(context: DebugContext): Promise<TestSuggestions> {
    if (!await this.isAvailable()) {
      // Return mock response for now
      console.warn('GitHub Copilot not available, returning mock suggestions');
      return {
        newTests: [],
        missingCoverage: ['Copilot integration not available'],
        improvements: ['Install and activate GitHub Copilot extension']
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
${context.testResults.map(t => `- ${t.name} (${t.status})`).join('\n')}

Based on the code changes, suggest new tests that should be added to ensure comprehensive coverage.`;

    return [
      vscode.LanguageModelChatMessage.User(systemPrompt),
      vscode.LanguageModelChatMessage.User(userPrompt)
    ];
  }

  async detectFalsePositives(context: DebugContext): Promise<FalsePositiveAnalysis> {
    if (!await this.isAvailable()) {
      // Return mock response for now
      console.warn('GitHub Copilot not available, returning mock analysis');
      return {
        suspiciousTests: [],
        mockingIssues: [],
        recommendations: ['Install and activate GitHub Copilot extension for AI analysis']
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
  .filter(t => t.status === 'passed')
  .map(t => `- ${t.name} (${t.file})`)
  .join('\n')}

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
}