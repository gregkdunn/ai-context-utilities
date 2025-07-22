import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { CopilotIntegration } from '../CopilotIntegration';
import { PriorityRequestQueue } from './PriorityRequestQueue';
import {
  AnalysisSchema,
  EnrichedContext,
  ContextChunk,
  ChunkAnalysisResult,
  ComprehensiveAnalysisResult,
  AnalysisStorageResult,
  SubmissionOptions,
  ProjectMetadata,
  AnalysisObjective,
  QueueConfig
} from '../../types/analysis';

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);
const stat = promisify(fs.stat);

/**
 * Advanced Copilot API Submission Service
 * Handles comprehensive context analysis with intelligent chunking,
 * parallel processing, and multi-format result storage
 */
export class CopilotContextSubmissionService {
  private static readonly ANALYSIS_SCHEMA: AnalysisSchema = {
    timestamp: 'string',
    summary: {
      projectHealth: 'string',
      riskLevel: 'low' as const,
      recommendedActions: []
    },
    codeAnalysis: {
      testRecommendations: [],
      codeQualityIssues: [],
      performanceConsiderations: [],
      securityConcerns: [],
      technicalDebt: []
    },
    prGeneration: {
      suggestedTitle: 'string',
      problem: 'string',
      solution: 'string',
      details: [],
      qaChecklist: [],
      riskAssessment: 'string'
    },
    implementationGuidance: {
      prioritizedTasks: [],
      dependencies: [],
      estimatedEffort: 'string',
      successCriteria: []
    },
    futureConsiderations: {
      technicalImprovements: [],
      architecturalRecommendations: [],
      monitoringPoints: []
    }
  };

  private requestQueue: PriorityRequestQueue;
  private outputDirectory: string;

  constructor(
    private context: vscode.ExtensionContext,
    private copilotIntegration: CopilotIntegration
  ) {
    const queueConfig: QueueConfig = {
      maxConcurrent: 3,
      minInterval: 1000,
      backoffMultiplier: 2,
      maxRetries: 3,
      timeout: 60000
    };
    
    this.requestQueue = new PriorityRequestQueue(queueConfig);
    
    // Get output directory from configuration
    const config = vscode.workspace.getConfiguration('aiDebugContext');
    this.outputDirectory = config.get('outputDirectory', '.github/instructions/ai_utilities_context');
  }

  /**
   * Primary method: Submit complete AI context document for comprehensive analysis
   */
  async submitContextForAnalysis(
    contextFilePath: string,
    options: SubmissionOptions = {}
  ): Promise<ComprehensiveAnalysisResult> {
    const startTime = performance.now();
    let totalTokensUsed = 0;
    let apiCallsMade = 0;

    try {
      // Phase 1: Context Preparation
      vscode.window.showInformationMessage('🚀 Preparing context for comprehensive analysis...');
      const contextContent = await this.prepareContextForSubmission(contextFilePath);
      
      // Phase 2: Intelligent Chunking
      vscode.window.showInformationMessage('🧩 Intelligently chunking context for optimal processing...');
      const chunks = await this.intelligentlyChunkContext(contextContent, options);
      
      // Phase 3: Parallel Analysis with Rate Limiting
      vscode.window.showInformationMessage(
        `🔄 Analyzing ${chunks.length} context chunks in parallel...`
      );
      const analysisResults = await this.analyzeContextChunks(chunks, options);
      
      // Update metrics
      totalTokensUsed = analysisResults.reduce((sum, result) => sum + result.metadata.tokenUsage, 0);
      apiCallsMade = analysisResults.length;
      
      // Phase 4: Result Synthesis
      vscode.window.showInformationMessage('🧠 Synthesizing analysis results with AI assistance...');
      const synthesizedAnalysis = await this.synthesizeAnalysisResults(analysisResults);
      
      // Phase 5: Structured Storage
      vscode.window.showInformationMessage('💾 Saving analysis in multiple formats...');
      const savedResults = await this.persistAnalysisResults(synthesizedAnalysis);
      
      // Add processing metrics
      const totalProcessingTime = performance.now() - startTime;
      synthesizedAnalysis.processingMetrics = {
        totalProcessingTime,
        totalTokensUsed,
        chunksProcessed: chunks.length,
        apiCallsmade: apiCallsMade
      };

      // Phase 6: UI Integration
      await this.updateUIWithResults(synthesizedAnalysis);
      
      vscode.window.showInformationMessage(
        `✅ Analysis complete! Processed ${chunks.length} chunks in ${Math.round(totalProcessingTime / 1000)}s`
      );

      return synthesizedAnalysis;
    } catch (error) {
      console.error('===== COPILOT SUBMISSION SERVICE ERROR =====');
      console.error('Error type:', typeof error);
      console.error('Error instanceof Error:', error instanceof Error);
      console.error('Error message:', error instanceof Error ? error.message : String(error));
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      console.error('Context file path:', contextFilePath);
      console.error('Options:', JSON.stringify(options, null, 2));
      console.error('============================================');
      
      const errorMessage = `Analysis failed: ${error instanceof Error ? error.message : String(error)}`;
      vscode.window.showErrorMessage(errorMessage);
      return this.handleSubmissionError(error as Error, contextFilePath);
    }
  }

  /**
   * Enhanced context preparation with metadata enrichment
   */
  private async prepareContextForSubmission(contextFilePath: string): Promise<EnrichedContext> {
    const rawContext = await readFile(contextFilePath, 'utf-8');
    
    // Enrich with additional metadata
    const enrichedContext: EnrichedContext = {
      timestamp: new Date().toISOString(),
      projectMetadata: await this.gatherProjectMetadata(),
      contextContent: rawContext,
      analysisObjectives: this.defineAnalysisObjectives(),
      expectedOutputFormat: CopilotContextSubmissionService.ANALYSIS_SCHEMA
    };
    
    return enrichedContext;
  }

  /**
   * Gather comprehensive project metadata
   */
  private async gatherProjectMetadata(): Promise<ProjectMetadata> {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
    
    try {
      // Read package.json for project info
      const packageJsonPath = path.join(workspaceRoot, 'package.json');
      let packageJson: any = {};
      
      try {
        const packageContent = await readFile(packageJsonPath, 'utf-8');
        packageJson = JSON.parse(packageContent);
      } catch {
        // Package.json not found or invalid
      }

      return {
        name: packageJson.name || path.basename(workspaceRoot),
        framework: this.detectFramework(packageJson),
        language: this.detectLanguage(workspaceRoot),
        packageManager: this.detectPackageManager(workspaceRoot),
        testFramework: this.detectTestFramework(packageJson),
        lintingTools: this.detectLintingTools(packageJson),
        dependencies: {
          production: Object.keys(packageJson.dependencies || {}).length,
          development: Object.keys(packageJson.devDependencies || {}).length,
          outdated: [] // Would need npm outdated check
        },
        gitMetadata: await this.gatherGitMetadata(workspaceRoot),
        nxMetadata: await this.gatherNXMetadata(workspaceRoot)
      };
    } catch (error) {
      console.warn('Failed to gather project metadata:', error);
      return {
        name: 'Unknown Project',
        framework: 'Unknown',
        language: 'TypeScript',
        packageManager: 'npm',
        testFramework: 'Jest',
        lintingTools: [],
        dependencies: { production: 0, development: 0, outdated: [] },
        gitMetadata: {
          currentBranch: 'main',
          lastCommit: 'Unknown',
          uncommittedChanges: 0,
          stashEntries: 0
        }
      };
    }
  }

  /**
   * Define analysis objectives based on context
   */
  private defineAnalysisObjectives(): AnalysisObjective[] {
    return [
      {
        type: 'code-quality',
        priority: 'high',
        description: 'Analyze code quality issues, maintainability, and best practices'
      },
      {
        type: 'test-coverage',
        priority: 'high',
        description: 'Review test coverage, test quality, and suggest improvements'
      },
      {
        type: 'security',
        priority: 'medium',
        description: 'Identify potential security vulnerabilities and risks'
      },
      {
        type: 'performance',
        priority: 'medium',
        description: 'Analyze performance bottlenecks and optimization opportunities'
      },
      {
        type: 'maintainability',
        priority: 'high',
        description: 'Assess technical debt and architectural improvements'
      }
    ];
  }

  /**
   * Intelligent context chunking to handle large documents
   */
  private async intelligentlyChunkContext(
    context: EnrichedContext,
    options: SubmissionOptions
  ): Promise<ContextChunk[]> {
    const MAX_TOKENS = 15000; // Leave room for response
    const tokenCount = this.estimateTokenCount(context.contextContent);
    
    // If content fits in one chunk, return as comprehensive analysis
    if (tokenCount <= MAX_TOKENS) {
      return [{ 
        id: 'complete',
        content: context,
        priority: 'high',
        analysisType: 'comprehensive'
      }];
    }
    
    // Smart chunking by logical sections
    const chunks: ContextChunk[] = [];
    
    // Always include executive summary
    chunks.push({
      id: 'summary',
      content: this.extractSummarySection(context),
      priority: 'critical',
      analysisType: 'executive-summary'
    });

    // Add test-focused chunk if we have test data
    if (context.contextContent.includes('TEST RESULTS') || context.contextContent.includes('🧪')) {
      chunks.push({
        id: 'test-analysis',
        content: this.extractTestSection(context),
        priority: 'high',
        analysisType: 'test-focused'
      });
    }

    // Add code-focused chunk if we have git diff
    if (context.contextContent.includes('GIT DIFF') || context.contextContent.includes('📋')) {
      chunks.push({
        id: 'code-changes',
        content: this.extractCodeSection(context),
        priority: 'high',
        analysisType: 'code-focused'
      });
    }

    // Always include recommendations chunk
    chunks.push({
      id: 'recommendations',
      content: this.createRecommendationContext(context),
      priority: 'medium',
      analysisType: 'future-planning'
    });

    return chunks;
  }

  /**
   * Extract summary section from context
   */
  private extractSummarySection(context: EnrichedContext): string {
    const lines = context.contextContent.split('\n');
    const summaryStart = lines.findIndex(line => 
      line.includes('ANALYSIS REQUEST') || line.includes('🎯')
    );
    const summaryEnd = lines.findIndex((line, index) => 
      index > summaryStart + 10 && line.includes('====')
    );

    if (summaryStart === -1) {
      return context.contextContent.substring(0, 2000);
    }

    const summarySection = lines.slice(summaryStart, summaryEnd > -1 ? summaryEnd : summaryStart + 50);
    return `Project: ${context.projectMetadata.name}\n` +
           `Framework: ${context.projectMetadata.framework}\n` +
           `Analysis Timestamp: ${context.timestamp}\n\n` +
           summarySection.join('\n');
  }

  /**
   * Extract test-related sections
   */
  private extractTestSection(context: EnrichedContext): string {
    const content = context.contextContent;
    const testSectionRegex = /==.*TEST.*==([\s\S]*?)(?===.*==|$)/gi;
    const matches = content.match(testSectionRegex) || [];
    
    return `Project: ${context.projectMetadata.name}\n` +
           `Test Framework: ${context.projectMetadata.testFramework}\n` +
           `Analysis Focus: Test Results and Recommendations\n\n` +
           matches.join('\n\n');
  }

  /**
   * Extract code-related sections
   */
  private extractCodeSection(context: EnrichedContext): string {
    const content = context.contextContent;
    const codeSectionRegex = /==.*(?:DIFF|CHANGE|CODE).*==([\s\S]*?)(?===.*==|$)/gi;
    const matches = content.match(codeSectionRegex) || [];
    
    return `Project: ${context.projectMetadata.name}\n` +
           `Language: ${context.projectMetadata.language}\n` +
           `Analysis Focus: Code Changes and Quality\n\n` +
           matches.join('\n\n');
  }

  /**
   * Create recommendation-focused context
   */
  private createRecommendationContext(context: EnrichedContext): string {
    return `Project: ${context.projectMetadata.name}\n` +
           `Current State Summary:\n` +
           `- Framework: ${context.projectMetadata.framework}\n` +
           `- Dependencies: ${context.projectMetadata.dependencies.production} prod, ${context.projectMetadata.dependencies.development} dev\n` +
           `- Git Branch: ${context.projectMetadata.gitMetadata?.currentBranch}\n\n` +
           `Analysis Objectives:\n` +
           context.analysisObjectives.map(obj => `- ${obj.type}: ${obj.description}`).join('\n') +
           `\n\nPlease provide comprehensive recommendations for improvement, future planning, and architectural considerations.`;
  }

  /**
   * Parallel chunk analysis with sophisticated rate limiting
   */
  private async analyzeContextChunks(
    chunks: ContextChunk[],
    options: SubmissionOptions
  ): Promise<ChunkAnalysisResult[]> {
    const analysisPromises = chunks.map(chunk => 
      this.requestQueue.add(
        () => this.analyzeChunk(chunk, options),
        chunk.priority
      )
    );

    const results = await Promise.allSettled(analysisPromises);
    return this.processChunkResults(results);
  }

  /**
   * Individual chunk analysis with structured prompting
   */
  private async analyzeChunk(
    chunk: ContextChunk,
    options: SubmissionOptions
  ): Promise<ChunkAnalysisResult> {
    const startTime = performance.now();
    const structuredPrompt = this.buildStructuredPrompt(chunk);
    
    const messages = [
      vscode.LanguageModelChatMessage.User(structuredPrompt)
    ];
    
    const response = await (this.copilotIntegration as any).sendRequest(messages);
    
    return {
      chunkId: chunk.id,
      analysisType: chunk.analysisType,
      rawResponse: response,
      structuredResult: await this.parseStructuredResponse(response, chunk.analysisType),
      metadata: {
        timestamp: new Date().toISOString(),
        tokenUsage: this.estimateTokenUsage(response),
        processingTime: performance.now() - startTime,
        modelUsed: options.apiOptions?.model || 'copilot-gpt-4'
      }
    };
  }

  /**
   * Build structured prompt for chunk analysis
   */
  private buildStructuredPrompt(chunk: ContextChunk): string {
    const basePrompt = `You are an expert software architect and code analyst. Analyze the following ${chunk.analysisType} context and provide structured insights.

ANALYSIS TYPE: ${chunk.analysisType}
PRIORITY: ${chunk.priority}

Please respond in a structured format that includes:
1. Executive Summary
2. Specific Findings
3. Actionable Recommendations
4. Risk Assessment
5. Implementation Guidance

CONTEXT TO ANALYZE:
${typeof chunk.content === 'string' ? chunk.content : JSON.stringify(chunk.content, null, 2)}

Focus on providing practical, actionable insights that can improve code quality, testing, and maintainability.`;

    return basePrompt;
  }

  /**
   * Parse structured response from AI
   */
  private async parseStructuredResponse(
    response: string,
    analysisType: string
  ): Promise<Partial<AnalysisSchema>> {
    try {
      // Try to extract structured data from response
      const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1]);
      }

      // Fallback: parse text response into structured format
      return this.parseTextResponse(response, analysisType);
    } catch (error) {
      console.warn('Failed to parse structured response:', error);
      return this.createFallbackStructure(response, analysisType);
    }
  }

  /**
   * Parse text response into structured format
   */
  private parseTextResponse(response: string, analysisType: string): Partial<AnalysisSchema> {
    const lines = response.split('\n');
    const structure: Partial<AnalysisSchema> = {};

    // Extract different sections based on headers
    let currentSection = '';
    let currentContent: string[] = [];

    for (const line of lines) {
      if (line.match(/^#+\s*(.*)/)) {
        // Process previous section
        if (currentSection && currentContent.length > 0) {
          this.addToStructure(structure, currentSection, currentContent.join('\n'));
        }
        
        // Start new section
        currentSection = line.replace(/^#+\s*/, '').toLowerCase();
        currentContent = [];
      } else if (currentSection) {
        currentContent.push(line);
      }
    }

    // Process final section
    if (currentSection && currentContent.length > 0) {
      this.addToStructure(structure, currentSection, currentContent.join('\n'));
    }

    return structure;
  }

  /**
   * Add parsed content to structure
   */
  private addToStructure(structure: any, section: string, content: string): void {
    if (section.includes('summary') || section.includes('executive')) {
      structure.summary = {
        projectHealth: this.extractProjectHealth(content),
        riskLevel: this.extractRiskLevel(content),
        recommendedActions: this.extractRecommendations(content)
      };
    } else if (section.includes('test') || section.includes('recommendation')) {
      if (!structure.codeAnalysis) {structure.codeAnalysis = {};}
      structure.codeAnalysis.testRecommendations = this.extractTestRecommendations(content);
    } else if (section.includes('code') || section.includes('quality')) {
      if (!structure.codeAnalysis) {structure.codeAnalysis = {};}
      structure.codeAnalysis.codeQualityIssues = this.extractCodeIssues(content);
    }
    // Add more section parsing as needed
  }

  /**
   * Extract project health from content
   */
  private extractProjectHealth(content: string): string {
    const healthKeywords = {
      excellent: ['excellent', 'great', 'outstanding', 'perfect'],
      good: ['good', 'solid', 'stable', 'healthy'],
      fair: ['fair', 'average', 'moderate', 'okay'],
      poor: ['poor', 'bad', 'concerning', 'problematic']
    };

    const lowerContent = content.toLowerCase();
    
    for (const [level, keywords] of Object.entries(healthKeywords)) {
      if (keywords.some(keyword => lowerContent.includes(keyword))) {
        return level.charAt(0).toUpperCase() + level.slice(1);
      }
    }
    
    return 'Good';
  }

  /**
   * Extract risk level from content
   */
  private extractRiskLevel(content: string): 'low' | 'medium' | 'high' {
    const lowerContent = content.toLowerCase();
    
    if (lowerContent.includes('high risk') || lowerContent.includes('critical')) {
      return 'high';
    } else if (lowerContent.includes('medium risk') || lowerContent.includes('moderate')) {
      return 'medium';
    }
    
    return 'low';
  }

  /**
   * Extract recommendations from content
   */
  private extractRecommendations(content: string): string[] {
    const recommendations: string[] = [];
    const lines = content.split('\n');
    
    for (const line of lines) {
      if (line.match(/^[-•*]\s+/) || line.match(/^\d+\.\s+/)) {
        const cleaned = line.replace(/^[-•*\d.\s]+/, '').trim();
        if (cleaned.length > 10) {
          recommendations.push(cleaned);
        }
      }
    }
    
    return recommendations.slice(0, 10); // Limit to top 10
  }

  /**
   * Extract test recommendations from content
   */
  private extractTestRecommendations(content: string): any[] {
    // This would parse test-specific recommendations
    // For now, return basic structure
    return [];
  }

  /**
   * Extract code issues from content
   */
  private extractCodeIssues(content: string): any[] {
    // This would parse code quality issues
    // For now, return basic structure
    return [];
  }

  /**
   * Create fallback structure for unparseable responses
   */
  private createFallbackStructure(response: string, analysisType: string): Partial<AnalysisSchema> {
    return {
      summary: {
        projectHealth: 'Analysis completed',
        riskLevel: 'medium' as const,
        recommendedActions: [`Review ${analysisType} analysis results`]
      }
    };
  }

  /**
   * Process chunk results from Promise.allSettled
   */
  private processChunkResults(
    results: PromiseSettledResult<ChunkAnalysisResult>[]
  ): ChunkAnalysisResult[] {
    const successful: ChunkAnalysisResult[] = [];
    
    for (const result of results) {
      if (result.status === 'fulfilled') {
        successful.push(result.value);
      } else {
        console.error('Chunk analysis failed:', result.reason);
      }
    }
    
    return successful;
  }

  /**
   * Advanced result synthesis using AI-assisted merging
   */
  private async synthesizeAnalysisResults(
    chunkResults: ChunkAnalysisResult[]
  ): Promise<ComprehensiveAnalysisResult> {
    if (chunkResults.length === 1) {
      // Single chunk - ensure complete structure with defaults
      const singleResult = chunkResults[0].structuredResult;
      return {
        id: this.generateUUID(),
        timestamp: new Date().toISOString(),
        analysisResults: {
          timestamp: new Date().toISOString(),
          summary: singleResult.summary || {
            projectHealth: 'Analysis completed',
            riskLevel: 'medium' as const,
            recommendedActions: ['Review analysis results']
          },
          codeAnalysis: singleResult.codeAnalysis || {
            testRecommendations: [],
            codeQualityIssues: [],
            performanceConsiderations: [],
            securityConcerns: [],
            technicalDebt: []
          },
          prGeneration: singleResult.prGeneration || {
            suggestedTitle: 'Code Analysis Results',
            problem: 'Analysis generated based on provided context',
            solution: 'Comprehensive analysis completed',
            details: [],
            qaChecklist: [],
            riskAssessment: 'Medium risk - review recommendations'
          },
          implementationGuidance: singleResult.implementationGuidance || {
            prioritizedTasks: [],
            dependencies: [],
            estimatedEffort: 'To be determined',
            successCriteria: []
          },
          futureConsiderations: singleResult.futureConsiderations || {
            technicalImprovements: [],
            architecturalRecommendations: [],
            monitoringPoints: []
          }
        },
        chunkSummaries: chunkResults.map(r => r.metadata),
        qualityScore: 0.9,
        recommendationsImplemented: false,
        processingMetrics: {
          totalProcessingTime: chunkResults[0]?.metadata?.processingTime || 0,
          totalTokensUsed: chunkResults[0]?.metadata?.tokenUsage || 0,
          chunksProcessed: 1,
          apiCallsmade: 1
        }
      };
    }

    // Multi-chunk synthesis
    const synthesisPrompt = this.buildSynthesisPrompt(chunkResults);
    
    const synthesisResponse = await (this.copilotIntegration as any).sendRequest([
      vscode.LanguageModelChatMessage.User(synthesisPrompt)
    ]);
    
    return {
      id: this.generateUUID(),
      timestamp: new Date().toISOString(),
      analysisResults: await this.parseComprehensiveAnalysis(synthesisResponse),
      chunkSummaries: chunkResults.map(r => r.metadata),
      qualityScore: this.calculateAnalysisQuality(synthesisResponse),
      recommendationsImplemented: false,
      processingMetrics: {
        totalProcessingTime: 0,
        totalTokensUsed: 0,
        chunksProcessed: 0,
        apiCallsmade: 0
      }
    };
  }

  /**
   * Build synthesis prompt
   */
  private buildSynthesisPrompt(chunkResults: ChunkAnalysisResult[]): string {
    const chunkSummaries = chunkResults.map(result => `
CHUNK: ${result.chunkId} (${result.analysisType})
ANALYSIS: ${result.rawResponse.substring(0, 1000)}...
`).join('\n');

    return `You are synthesizing multiple analysis results into a comprehensive report. 
Combine and consolidate the following analysis chunks into a single, coherent assessment:

${chunkSummaries}

Please provide a unified analysis that:
1. Combines all findings without duplication
2. Prioritizes recommendations by impact
3. Provides an overall project health assessment
4. Identifies the most critical next steps

Respond in a structured format covering all aspects of the analysis schema.`;
  }

  /**
   * Parse comprehensive analysis from synthesis
   */
  private async parseComprehensiveAnalysis(response: string): Promise<AnalysisSchema> {
    try {
      const parsed = await this.parseStructuredResponse(response, 'comprehensive');
      
      // Ensure all required fields are present
      return {
        timestamp: new Date().toISOString(),
        summary: parsed.summary || {
          projectHealth: 'Analysis completed',
          riskLevel: 'medium' as const,
          recommendedActions: []
        },
        codeAnalysis: parsed.codeAnalysis || {
          testRecommendations: [],
          codeQualityIssues: [],
          performanceConsiderations: [],
          securityConcerns: [],
          technicalDebt: []
        },
        prGeneration: parsed.prGeneration || {
          suggestedTitle: '',
          problem: '',
          solution: '',
          details: [],
          qaChecklist: [],
          riskAssessment: ''
        },
        implementationGuidance: parsed.implementationGuidance || {
          prioritizedTasks: [],
          dependencies: [],
          estimatedEffort: '',
          successCriteria: []
        },
        futureConsiderations: parsed.futureConsiderations || {
          technicalImprovements: [],
          architecturalRecommendations: [],
          monitoringPoints: []
        }
      };
    } catch (error) {
      console.error('Failed to parse comprehensive analysis:', error);
      return this.createDefaultAnalysisSchema();
    }
  }

  /**
   * Create default analysis schema
   */
  private createDefaultAnalysisSchema(): AnalysisSchema {
    return {
      timestamp: new Date().toISOString(),
      summary: {
        projectHealth: 'Analysis completed',
        riskLevel: 'medium',
        recommendedActions: ['Review analysis results', 'Address identified issues']
      },
      codeAnalysis: {
        testRecommendations: [],
        codeQualityIssues: [],
        performanceConsiderations: [],
        securityConcerns: [],
        technicalDebt: []
      },
      prGeneration: {
        suggestedTitle: 'Code Analysis and Improvements',
        problem: 'Identified areas for improvement',
        solution: 'Implement recommended changes',
        details: [],
        qaChecklist: [],
        riskAssessment: 'Medium risk changes'
      },
      implementationGuidance: {
        prioritizedTasks: [],
        dependencies: [],
        estimatedEffort: 'To be determined',
        successCriteria: []
      },
      futureConsiderations: {
        technicalImprovements: [],
        architecturalRecommendations: [],
        monitoringPoints: []
      }
    };
  }

  /**
   * Calculate quality score for analysis
   */
  private calculateAnalysisQuality(response: string): number {
    let score = 0.5; // Base score
    
    // Check for structured content
    if (response.includes('summary') || response.includes('Summary')) {score += 0.1;}
    if (response.includes('recommendation') || response.includes('Recommendation')) {score += 0.1;}
    if (response.includes('implementation') || response.includes('Implementation')) {score += 0.1;}
    
    // Check for specific insights
    if (response.length > 1000) {score += 0.1;}
    if (response.includes('test') && response.includes('code quality')) {score += 0.1;}
    
    return Math.min(1.0, score);
  }

  /**
   * Multi-format persistent storage
   */
  private async persistAnalysisResults(
    analysis: ComprehensiveAnalysisResult
  ): Promise<AnalysisStorageResult> {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
    const baseDir = path.join(workspaceRoot, this.outputDirectory, 'copilot-analyses');
    
    try {
      await mkdir(baseDir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }
    
    // Save in multiple formats for different use cases
    const results: AnalysisStorageResult = {
      jsonPath: await this.saveAsJSON(analysis, baseDir),
      markdownPath: await this.saveAsMarkdown(analysis, baseDir),
      htmlPath: await this.saveAsHTML(analysis, baseDir),
      csvPath: await this.saveAsCSV(analysis, baseDir),
      timestamp: analysis.timestamp,
      analysisId: analysis.id,
      fileSize: {
        json: 0,
        markdown: 0,
        html: 0,
        csv: 0
      }
    };
    
    // Calculate file sizes
    for (const [format, filePath] of Object.entries(results)) {
      if (typeof filePath === 'string' && filePath.endsWith(`.${format}`)) {
        try {
          const stats = await stat(filePath);
          results.fileSize[format as keyof typeof results.fileSize] = stats.size;
        } catch {
          // File size calculation failed
        }
      }
    }
    
    return results;
  }

  /**
   * Save analysis as JSON
   */
  private async saveAsJSON(analysis: ComprehensiveAnalysisResult, baseDir: string): Promise<string> {
    const fileName = 'copilot-analysis.json';
    const filePath = path.join(baseDir, fileName);
    
    await writeFile(filePath, JSON.stringify(analysis, null, 2), 'utf-8');
    return filePath;
  }

  /**
   * Save analysis as Markdown
   */
  private async saveAsMarkdown(analysis: ComprehensiveAnalysisResult, baseDir: string): Promise<string> {
    const fileName = 'copilot-analysis.md';
    const filePath = path.join(baseDir, fileName);
    
    const markdown = this.formatAnalysisAsMarkdown(analysis);
    await writeFile(filePath, markdown, 'utf-8');
    return filePath;
  }

  /**
   * Format analysis as Markdown
   */
  private formatAnalysisAsMarkdown(analysis: ComprehensiveAnalysisResult): string {
    const { analysisResults } = analysis;
    
    return `# Comprehensive AI Analysis Report

**Generated**: ${analysis.timestamp}  
**Analysis ID**: ${analysis.id}  
**Quality Score**: ${analysis.qualityScore.toFixed(2)}

## 📊 Executive Summary

**Project Health**: ${analysisResults.summary.projectHealth}  
**Risk Level**: ${analysisResults.summary.riskLevel}

### Recommended Actions
${analysisResults.summary.recommendedActions.map(action => `- ${action}`).join('\n')}

## 🔍 Code Analysis

### Test Recommendations
${analysisResults.codeAnalysis.testRecommendations.map(rec => `- **${rec.title}**: ${rec.description}`).join('\n')}

### Code Quality Issues
${analysisResults.codeAnalysis.codeQualityIssues.map(issue => `- **${issue.title}**: ${issue.description}`).join('\n')}

### Performance Considerations
${analysisResults.codeAnalysis.performanceConsiderations.map(perf => `- ${perf}`).join('\n')}

### Security Concerns
${analysisResults.codeAnalysis.securityConcerns.map(sec => `- **${sec.title}**: ${sec.description}`).join('\n')}

### Technical Debt
${analysisResults.codeAnalysis.technicalDebt.map(debt => `- **${debt.title}**: ${debt.description}`).join('\n')}

## 🚀 Implementation Guidance

### Prioritized Tasks
${analysisResults.implementationGuidance.prioritizedTasks.map(task => `- **${task.title}**: ${task.description} (Priority: ${task.priority})`).join('\n')}

### Dependencies
${analysisResults.implementationGuidance.dependencies.map(dep => `- ${dep}`).join('\n')}

**Estimated Effort**: ${analysisResults.implementationGuidance.estimatedEffort}

### Success Criteria
${analysisResults.implementationGuidance.successCriteria.map(criteria => `- ${criteria}`).join('\n')}

## 🔮 Future Considerations

### Technical Improvements
${analysisResults.futureConsiderations.technicalImprovements.map(improvement => `- ${improvement}`).join('\n')}

### Architectural Recommendations
${analysisResults.futureConsiderations.architecturalRecommendations.map(rec => `- ${rec}`).join('\n')}

### Monitoring Points
${analysisResults.futureConsiderations.monitoringPoints.map(point => `- ${point}`).join('\n')}

---

*Generated by AI Debug Context Extension - Copilot API Submission Module*
`;
  }

  /**
   * Save analysis as HTML
   */
  private async saveAsHTML(analysis: ComprehensiveAnalysisResult, baseDir: string): Promise<string> {
    const fileName = 'copilot-analysis.html';
    const filePath = path.join(baseDir, fileName);
    
    const html = this.formatAnalysisAsHTML(analysis);
    await writeFile(filePath, html, 'utf-8');
    return filePath;
  }

  /**
   * Format analysis as HTML
   */
  private formatAnalysisAsHTML(analysis: ComprehensiveAnalysisResult): string {
    // Convert markdown to basic HTML
    const markdown = this.formatAnalysisAsMarkdown(analysis);
    const html = markdown
      .replace(/^# (.*)/gm, '<h1>$1</h1>')
      .replace(/^## (.*)/gm, '<h2>$1</h2>')
      .replace(/^### (.*)/gm, '<h3>$1</h3>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/^- (.*)/gm, '<li>$1</li>')
      .replace(/\n\n/g, '</ul><p>')
      .replace(/<li>/g, '<ul><li>');
    
    return `<!DOCTYPE html>
<html>
<head>
    <title>AI Analysis Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        h1 { color: #2563eb; }
        h2 { color: #dc2626; margin-top: 30px; }
        h3 { color: #059669; }
        ul { margin: 10px 0; }
        li { margin: 5px 0; }
        .metadata { background: #f3f4f6; padding: 15px; border-radius: 5px; }
    </style>
</head>
<body>
    ${html}
</body>
</html>`;
  }

  /**
   * Save analysis as CSV
   */
  private async saveAsCSV(analysis: ComprehensiveAnalysisResult, baseDir: string): Promise<string> {
    const fileName = 'copilot-analysis.csv';
    const filePath = path.join(baseDir, fileName);
    
    // Create CSV with key metrics
    const csvContent = [
      'Category,Item,Priority,Description,File,Line',
      // Test recommendations
      ...analysis.analysisResults.codeAnalysis.testRecommendations.map(rec => 
        `Test,${rec.title},${rec.priority},"${rec.description}",${rec.file || ''},${rec.lineNumber || ''}`
      ),
      // Code quality issues
      ...analysis.analysisResults.codeAnalysis.codeQualityIssues.map(issue => 
        `Quality,${issue.title},${issue.severity},"${issue.description}",${issue.file || ''},${issue.lineNumber || ''}`
      ),
      // Security concerns
      ...analysis.analysisResults.codeAnalysis.securityConcerns.map(sec => 
        `Security,${sec.title},${sec.severity},"${sec.description}",${sec.file || ''},${sec.lineNumber || ''}`
      )
    ].join('\n');
    
    await writeFile(filePath, csvContent, 'utf-8');
    return filePath;
  }

  /**
   * Update UI with analysis results
   */
  private async updateUIWithResults(analysis: ComprehensiveAnalysisResult): Promise<void> {
    // This would trigger UI updates in the Angular components
    // For now, just show a notification
    const summary = analysis.analysisResults.summary;
    const message = `Analysis complete! Project health: ${summary.projectHealth}, Risk: ${summary.riskLevel}`;
    
    vscode.window.showInformationMessage(message, 'View Results', 'Open Dashboard')
      .then(selection => {
        if (selection === 'View Results') {
          // Open analysis file
          vscode.commands.executeCommand('vscode.open', vscode.Uri.file(analysis.id));
        } else if (selection === 'Open Dashboard') {
          // Open analysis dashboard
          vscode.commands.executeCommand('ai-debug-context.openAnalysisDashboard');
        }
      });
  }

  /**
   * Handle submission errors
   */
  private handleSubmissionError(error: Error, contextFilePath: string): ComprehensiveAnalysisResult {
    console.error('Context submission failed:', error);
    
    return {
      id: this.generateUUID(),
      timestamp: new Date().toISOString(),
      analysisResults: {
        timestamp: new Date().toISOString(),
        summary: {
          projectHealth: 'Analysis failed',
          riskLevel: 'high',
          recommendedActions: [
            'Check internet connection',
            'Verify Copilot availability',
            'Retry analysis'
          ]
        },
        codeAnalysis: {
          testRecommendations: [],
          codeQualityIssues: [],
          performanceConsiderations: [],
          securityConcerns: [],
          technicalDebt: []
        },
        prGeneration: {
          suggestedTitle: 'Analysis Error',
          problem: error.message,
          solution: 'Retry the analysis',
          details: [],
          qaChecklist: [],
          riskAssessment: 'Unable to assess'
        },
        implementationGuidance: {
          prioritizedTasks: [],
          dependencies: [],
          estimatedEffort: 'Unknown',
          successCriteria: []
        },
        futureConsiderations: {
          technicalImprovements: [],
          architecturalRecommendations: [],
          monitoringPoints: []
        }
      },
      chunkSummaries: [],
      qualityScore: 0.0,
      recommendationsImplemented: false,
      processingMetrics: {
        totalProcessingTime: 0,
        totalTokensUsed: 0,
        chunksProcessed: 0,
        apiCallsmade: 0
      }
    };
  }

  // Utility methods

  private generateUUID(): string {
    return 'analysis_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  private estimateTokenCount(text: string): number {
    // Rough estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  private estimateTokenUsage(response: string): number {
    return this.estimateTokenCount(response);
  }

  private detectFramework(packageJson: any): string {
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    if (deps['@angular/core']) {return 'Angular';}
    if (deps['react']) {return 'React';}
    if (deps['vue']) {return 'Vue';}
    if (deps['@nestjs/core']) {return 'NestJS';}
    if (deps['express']) {return 'Express';}
    
    return 'Unknown';
  }

  private detectLanguage(workspaceRoot: string): string {
    // Simple detection based on file existence
    try {
      if (fs.existsSync(path.join(workspaceRoot, 'tsconfig.json'))) {return 'TypeScript';}
      if (fs.existsSync(path.join(workspaceRoot, 'package.json'))) {return 'JavaScript';}
    } catch {
      // Ignore errors
    }
    
    return 'TypeScript';
  }

  private detectPackageManager(workspaceRoot: string): string {
    try {
      if (fs.existsSync(path.join(workspaceRoot, 'yarn.lock'))) {return 'yarn';}
      if (fs.existsSync(path.join(workspaceRoot, 'pnpm-lock.yaml'))) {return 'pnpm';}
      if (fs.existsSync(path.join(workspaceRoot, 'package-lock.json'))) {return 'npm';}
    } catch {
      // Ignore errors
    }
    
    return 'npm';
  }

  private detectTestFramework(packageJson: any): string {
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    if (deps['jest']) {return 'Jest';}
    if (deps['mocha']) {return 'Mocha';}
    if (deps['jasmine']) {return 'Jasmine';}
    if (deps['vitest']) {return 'Vitest';}
    
    return 'Jest';
  }

  private detectLintingTools(packageJson: any): string[] {
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
    const tools: string[] = [];
    
    if (deps['eslint']) {tools.push('ESLint');}
    if (deps['prettier']) {tools.push('Prettier');}
    if (deps['tslint']) {tools.push('TSLint');}
    if (deps['stylelint']) {tools.push('Stylelint');}
    
    return tools;
  }

  private async gatherGitMetadata(workspaceRoot: string): Promise<ProjectMetadata['gitMetadata']> {
    try {
      const { simpleGit } = await import('simple-git');
      const git = simpleGit(workspaceRoot);
      
      const currentBranch = await git.revparse(['--abbrev-ref', 'HEAD']);
      const lastCommit = await git.log({ maxCount: 1 });
      const status = await git.status();
      
      return {
        currentBranch,
        lastCommit: lastCommit.latest?.hash.substring(0, 8) || 'Unknown',
        uncommittedChanges: status.files.length,
        stashEntries: 0 // Would need to implement stash.list()
      };
    } catch (error) {
      return {
        currentBranch: 'main',
        lastCommit: 'Unknown',
        uncommittedChanges: 0,
        stashEntries: 0
      };
    }
  }

  private async gatherNXMetadata(workspaceRoot: string): Promise<ProjectMetadata['nxMetadata'] | undefined> {
    try {
      const nxJsonPath = path.join(workspaceRoot, 'nx.json');
      if (!fs.existsSync(nxJsonPath)) {
        return undefined;
      }

      const nxJson = JSON.parse(await readFile(nxJsonPath, 'utf-8'));
      
      // Basic NX metadata - could be enhanced
      return {
        version: 'Unknown', // Would need to check package.json
        projects: 0, // Would need to count projects
        affectedProjects: [] // Would need to run nx affected
      };
    } catch (error) {
      return undefined;
    }
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    this.requestQueue.dispose();
  }
}