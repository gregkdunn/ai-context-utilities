import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import {
  AnalysisHistoryItem,
  AnalysisComparison,
  ProjectInsights,
  ComprehensiveAnalysisResult,
  InsightTrend
} from '../../types/analysis';

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const mkdir = promisify(fs.mkdir);
const unlink = promisify(fs.unlink);

/**
 * Service for managing analysis history, comparisons, and insights
 * Provides comprehensive tracking and analytics for AI analysis results
 */
export class AnalysisHistoryService {
  private historyIndexPath: string;
  private analysesDirectory: string;

  constructor(private context: vscode.ExtensionContext) {
    const config = vscode.workspace.getConfiguration('aiDebugContext');
    const outputDirectory = config.get('outputDirectory', '.github/instructions/ai_utilities_context');
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
    
    this.analysesDirectory = path.join(workspaceRoot, outputDirectory, 'copilot-analyses');
    this.historyIndexPath = path.join(this.analysesDirectory, 'analysis-index.json');
    
    this.initializeHistoryIndex();
  }

  /**
   * Initialize the analysis history index
   */
  private async initializeHistoryIndex(): Promise<void> {
    try {
      await mkdir(this.analysesDirectory, { recursive: true });
      
      if (!fs.existsSync(this.historyIndexPath)) {
        const initialIndex = {
          version: '1.0.0',
          created: new Date().toISOString(),
          analyses: [] as AnalysisHistoryItem[]
        };
        await writeFile(this.historyIndexPath, JSON.stringify(initialIndex, null, 2));
      }
    } catch (error) {
      console.error('Failed to initialize analysis history:', error);
    }
  }

  /**
   * Add a new analysis to the history
   */
  async addAnalysis(analysis: ComprehensiveAnalysisResult, filePath: string): Promise<void> {
    try {
      const fileStats = await stat(filePath);
      const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
      const projectName = path.basename(workspaceRoot) || 'Unknown Project';
      
      const historyItem: AnalysisHistoryItem = {
        id: analysis.id,
        timestamp: analysis.timestamp,
        projectName,
        branch: await this.getCurrentBranch(),
        summary: analysis.analysisResults.summary.projectHealth,
        riskLevel: analysis.analysisResults.summary.riskLevel,
        recommendationsCount: this.countRecommendations(analysis),
        implementedCount: 0, // Will be updated as recommendations are implemented
        filePath,
        fileSize: fileStats.size
      };

      await this.updateHistoryIndex(historyItem);
    } catch (error) {
      console.error('Failed to add analysis to history:', error);
    }
  }

  /**
   * Get the complete analysis history
   */
  async getAnalysisHistory(): Promise<AnalysisHistoryItem[]> {
    try {
      const indexContent = await readFile(this.historyIndexPath, 'utf-8');
      const index = JSON.parse(indexContent);
      
      // Sort by timestamp descending (newest first)
      return index.analyses.sort((a: AnalysisHistoryItem, b: AnalysisHistoryItem) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    } catch (error) {
      console.error('Failed to get analysis history:', error);
      return [];
    }
  }

  /**
   * Get analysis history for a specific project
   */
  async getProjectHistory(projectName: string): Promise<AnalysisHistoryItem[]> {
    const allHistory = await this.getAnalysisHistory();
    return allHistory.filter(item => item.projectName === projectName);
  }

  /**
   * Get analysis history for a specific time period
   */
  async getHistoryByDateRange(startDate: Date, endDate: Date): Promise<AnalysisHistoryItem[]> {
    const allHistory = await this.getAnalysisHistory();
    return allHistory.filter(item => {
      const itemDate = new Date(item.timestamp);
      return itemDate >= startDate && itemDate <= endDate;
    });
  }

  /**
   * Load a specific analysis by ID
   */
  async loadAnalysis(analysisId: string): Promise<ComprehensiveAnalysisResult | null> {
    try {
      const history = await this.getAnalysisHistory();
      const historyItem = history.find(item => item.id === analysisId);
      
      if (!historyItem) {
        return null;
      }

      if (!fs.existsSync(historyItem.filePath)) {
        console.warn(`Analysis file not found: ${historyItem.filePath}`);
        return null;
      }

      const analysisContent = await readFile(historyItem.filePath, 'utf-8');
      return JSON.parse(analysisContent);
    } catch (error) {
      console.error(`Failed to load analysis ${analysisId}:`, error);
      return null;
    }
  }

  /**
   * Compare two analyses and generate insights
   */
  async compareAnalyses(analysisId1: string, analysisId2: string): Promise<AnalysisComparison> {
    try {
      const analysis1 = await this.loadAnalysis(analysisId1);
      const analysis2 = await this.loadAnalysis(analysisId2);

      if (!analysis1 || !analysis2) {
        throw new Error('One or both analyses could not be loaded');
      }

      const comparison: AnalysisComparison = {
        analysisId1,
        analysisId2,
        timestamp1: analysis1.timestamp,
        timestamp2: analysis2.timestamp,
        improvements: this.calculateImprovements(analysis1, analysis2),
        metrics: this.calculateMetricsTrends(analysis1, analysis2)
      };

      return comparison;
    } catch (error) {
      console.error('Failed to compare analyses:', error);
      throw error;
    }
  }

  /**
   * Export analyses in various formats
   */
  async exportAnalyses(format: 'json' | 'csv' | 'pdf'): Promise<string> {
    try {
      const history = await this.getAnalysisHistory();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `analysis-export-${timestamp}.${format}`;
      const exportPath = path.join(this.analysesDirectory, fileName);

      switch (format) {
        case 'json':
          await this.exportAsJSON(history, exportPath);
          break;
        case 'csv':
          await this.exportAsCSV(history, exportPath);
          break;
        case 'pdf':
          await this.exportAsPDF(history, exportPath);
          break;
        default:
          throw new Error(`Unsupported export format: ${format}`);
      }

      return exportPath;
    } catch (error) {
      console.error('Failed to export analyses:', error);
      throw error;
    }
  }

  /**
   * Generate project insights and trends
   */
  async getInsightsTrends(): Promise<ProjectInsights> {
    try {
      const history = await this.getAnalysisHistory();
      
      if (history.length < 2) {
        return this.createDefaultInsights(history);
      }

      const insights: ProjectInsights = {
        analysisCount: history.length,
        timespan: {
          first: history[history.length - 1].timestamp,
          last: history[0].timestamp
        },
        trends: await this.calculateTrends(history),
        recommendations: await this.analyzeRecommendationPatterns(history)
      };

      return insights;
    } catch (error) {
      console.error('Failed to generate insights:', error);
      return this.createDefaultInsights([]);
    }
  }

  /**
   * Delete an analysis from history
   */
  async deleteAnalysis(analysisId: string): Promise<void> {
    try {
      const history = await this.getAnalysisHistory();
      const analysisItem = history.find(item => item.id === analysisId);
      
      if (!analysisItem) {
        throw new Error(`Analysis ${analysisId} not found`);
      }

      // Delete the analysis file
      if (fs.existsSync(analysisItem.filePath)) {
        await unlink(analysisItem.filePath);
      }

      // Remove from history index
      const updatedHistory = history.filter(item => item.id !== analysisId);
      await this.saveHistoryIndex(updatedHistory);

      vscode.window.showInformationMessage(`Analysis ${analysisId} deleted successfully`);
    } catch (error) {
      console.error(`Failed to delete analysis ${analysisId}:`, error);
      vscode.window.showErrorMessage(`Failed to delete analysis: ${error}`);
      throw error;
    }
  }

  /**
   * Mark recommendations as implemented
   */
  async markRecommendationsImplemented(
    analysisId: string, 
    implementedCount: number
  ): Promise<void> {
    try {
      const history = await this.getAnalysisHistory();
      const analysisItem = history.find(item => item.id === analysisId);
      
      if (analysisItem) {
        analysisItem.implementedCount = implementedCount;
        await this.saveHistoryIndex(history);
      }
    } catch (error) {
      console.error('Failed to update implementation status:', error);
    }
  }

  /**
   * Get analyses statistics
   */
  async getStatistics(): Promise<{
    totalAnalyses: number;
    averageRiskLevel: string;
    totalRecommendations: number;
    implementationRate: number;
    projectCount: number;
  }> {
    try {
      const history = await this.getAnalysisHistory();
      
      const totalRecommendations = history.reduce((sum, item) => sum + item.recommendationsCount, 0);
      const totalImplemented = history.reduce((sum, item) => sum + item.implementedCount, 0);
      const implementationRate = totalRecommendations > 0 ? (totalImplemented / totalRecommendations) * 100 : 0;
      
      const riskLevels = history.map(item => item.riskLevel);
      const averageRisk = this.calculateAverageRiskLevel(riskLevels);
      
      const uniqueProjects = new Set(history.map(item => item.projectName));

      return {
        totalAnalyses: history.length,
        averageRiskLevel: averageRisk,
        totalRecommendations,
        implementationRate,
        projectCount: uniqueProjects.size
      };
    } catch (error) {
      console.error('Failed to get statistics:', error);
      return {
        totalAnalyses: 0,
        averageRiskLevel: 'unknown',
        totalRecommendations: 0,
        implementationRate: 0,
        projectCount: 0
      };
    }
  }

  // Private helper methods

  private async updateHistoryIndex(newItem: AnalysisHistoryItem): Promise<void> {
    try {
      const history = await this.getAnalysisHistory();
      history.unshift(newItem); // Add to beginning (newest first)
      
      // Keep only the latest 100 analyses to prevent excessive growth
      const trimmedHistory = history.slice(0, 100);
      
      await this.saveHistoryIndex(trimmedHistory);
    } catch (error) {
      console.error('Failed to update history index:', error);
    }
  }

  private async saveHistoryIndex(history: AnalysisHistoryItem[]): Promise<void> {
    const indexData = {
      version: '1.0.0',
      updated: new Date().toISOString(),
      analyses: history
    };
    
    await writeFile(this.historyIndexPath, JSON.stringify(indexData, null, 2));
  }

  private countRecommendations(analysis: ComprehensiveAnalysisResult): number {
    const { codeAnalysis, implementationGuidance } = analysis.analysisResults;
    
    return (
      codeAnalysis.testRecommendations.length +
      codeAnalysis.codeQualityIssues.length +
      codeAnalysis.securityConcerns.length +
      codeAnalysis.technicalDebt.length +
      implementationGuidance.prioritizedTasks.length
    );
  }

  private async getCurrentBranch(): Promise<string> {
    try {
      const { simpleGit } = await import('simple-git');
      const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
      const git = simpleGit(workspaceRoot);
      return await git.revparse(['--abbrev-ref', 'HEAD']);
    } catch (error) {
      return 'main';
    }
  }

  private calculateImprovements(
    analysis1: ComprehensiveAnalysisResult, 
    analysis2: ComprehensiveAnalysisResult
  ): AnalysisComparison['improvements'] {
    const prev = analysis1.analysisResults;
    const curr = analysis2.analysisResults;

    // Calculate risk level change
    const riskLevels = ['low', 'medium', 'high'];
    const prevRisk = riskLevels.indexOf(prev.summary.riskLevel);
    const currRisk = riskLevels.indexOf(curr.summary.riskLevel);
    
    let riskLevelChange: 'improved' | 'degraded' | 'unchanged';
    if (currRisk < prevRisk) {riskLevelChange = 'improved';}
    else if (currRisk > prevRisk) {riskLevelChange = 'degraded';}
    else {riskLevelChange = 'unchanged';}

    // For now, return basic structure - could be enhanced with detailed diff logic
    return {
      riskLevelChange,
      newIssues: [],
      resolvedIssues: [],
      newRecommendations: [],
      implementedRecommendations: []
    };
  }

  private calculateMetricsTrends(
    analysis1: ComprehensiveAnalysisResult,
    analysis2: ComprehensiveAnalysisResult
  ): AnalysisComparison['metrics'] {
    // Simplified trend calculation - could be enhanced with more sophisticated logic
    const prev = analysis1.analysisResults;
    const curr = analysis2.analysisResults;
    
    const prevIssues = prev.codeAnalysis.codeQualityIssues.length;
    const currIssues = curr.codeAnalysis.codeQualityIssues.length;
    
    const codeQualityTrend = currIssues < prevIssues ? 'improving' : 
                           currIssues > prevIssues ? 'declining' : 'stable';

    return {
      codeQualityTrend,
      testCoverageTrend: 'stable', // Would need more data to calculate
      technicalDebtTrend: 'stable'  // Would need more data to calculate
    };
  }

  private async calculateTrends(history: AnalysisHistoryItem[]): Promise<ProjectInsights['trends']> {
    // Simplified trend calculation
    const dataPoints = history.map(item => ({
      timestamp: item.timestamp,
      riskLevel: item.riskLevel,
      recommendationsCount: item.recommendationsCount,
      implementationRate: item.recommendationsCount > 0 ? 
        (item.implementedCount / item.recommendationsCount) * 100 : 0
    }));

    return {
      codeQuality: this.calculateTrend(dataPoints, 'riskLevel'),
      testCoverage: this.calculateTrend(dataPoints, 'implementationRate'),
      technicalDebt: this.calculateTrend(dataPoints, 'recommendationsCount'),
      performance: this.calculateTrend(dataPoints, 'riskLevel'),
      security: this.calculateTrend(dataPoints, 'riskLevel')
    };
  }

  private calculateTrend(dataPoints: any[], metric: string): InsightTrend {
    if (dataPoints.length < 2) {
      return {
        direction: 'stable',
        confidence: 0,
        dataPoints: [],
        prediction: { nextPeriod: 0, confidence: 0 }
      };
    }

    // Simple trend calculation - could be enhanced with linear regression
    const values = dataPoints.map(point => {
      if (metric === 'riskLevel') {
        const riskMap: Record<string, number> = { low: 1, medium: 2, high: 3 };
        return riskMap[point[metric] as string] || 2;
      }
      return point[metric];
    });

    const trend = values[0] - values[values.length - 1];
    const direction = trend > 0.1 ? 'improving' : trend < -0.1 ? 'declining' : 'stable';

    return {
      direction,
      confidence: Math.min(1, Math.abs(trend) / values.length),
      dataPoints: dataPoints.map(point => ({
        timestamp: point.timestamp,
        value: values[0] // Simplified
      })),
      prediction: {
        nextPeriod: values[0] + trend,
        confidence: 0.7
      }
    };
  }

  private async analyzeRecommendationPatterns(
    history: AnalysisHistoryItem[]
  ): Promise<ProjectInsights['recommendations']> {
    // This would analyze actual recommendations from loaded analyses
    // For now, returning mock data
    return {
      mostCommon: [
        'Add unit tests for new functionality',
        'Improve error handling',
        'Update documentation'
      ],
      leastImplemented: [
        'Performance optimizations',
        'Security improvements',
        'Architectural refactoring'
      ],
      highestImpact: [
        'Fix critical security vulnerabilities',
        'Resolve memory leaks',
        'Improve test coverage'
      ]
    };
  }

  private createDefaultInsights(history: AnalysisHistoryItem[]): ProjectInsights {
    return {
      analysisCount: history.length,
      timespan: {
        first: history[history.length - 1]?.timestamp || new Date().toISOString(),
        last: history[0]?.timestamp || new Date().toISOString()
      },
      trends: {
        codeQuality: { direction: 'stable', confidence: 0, dataPoints: [], prediction: { nextPeriod: 0, confidence: 0 } },
        testCoverage: { direction: 'stable', confidence: 0, dataPoints: [], prediction: { nextPeriod: 0, confidence: 0 } },
        technicalDebt: { direction: 'stable', confidence: 0, dataPoints: [], prediction: { nextPeriod: 0, confidence: 0 } },
        performance: { direction: 'stable', confidence: 0, dataPoints: [], prediction: { nextPeriod: 0, confidence: 0 } },
        security: { direction: 'stable', confidence: 0, dataPoints: [], prediction: { nextPeriod: 0, confidence: 0 } }
      },
      recommendations: {
        mostCommon: [],
        leastImplemented: [],
        highestImpact: []
      }
    };
  }

  private calculateAverageRiskLevel(riskLevels: ('low' | 'medium' | 'high')[]): string {
    if (riskLevels.length === 0) {return 'unknown';}
    
    const riskValues = { low: 1, medium: 2, high: 3 };
    const average = riskLevels.reduce((sum, risk) => sum + riskValues[risk], 0) / riskLevels.length;
    
    if (average <= 1.5) {return 'low';}
    if (average <= 2.5) {return 'medium';}
    return 'high';
  }

  private async exportAsJSON(history: AnalysisHistoryItem[], filePath: string): Promise<void> {
    const exportData = {
      exportedAt: new Date().toISOString(),
      totalAnalyses: history.length,
      analyses: history
    };
    
    await writeFile(filePath, JSON.stringify(exportData, null, 2));
  }

  private async exportAsCSV(history: AnalysisHistoryItem[], filePath: string): Promise<void> {
    const headers = [
      'ID',
      'Timestamp',
      'Project',
      'Branch',
      'Summary',
      'Risk Level',
      'Recommendations Count',
      'Implemented Count',
      'Implementation Rate (%)',
      'File Size (bytes)'
    ];

    const rows = history.map(item => [
      item.id,
      item.timestamp,
      item.projectName,
      item.branch,
      item.summary,
      item.riskLevel,
      item.recommendationsCount.toString(),
      item.implementedCount.toString(),
      item.recommendationsCount > 0 ? 
        ((item.implementedCount / item.recommendationsCount) * 100).toFixed(1) : '0',
      item.fileSize.toString()
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    await writeFile(filePath, csvContent);
  }

  private async exportAsPDF(history: AnalysisHistoryItem[], filePath: string): Promise<void> {
    // PDF export would require a PDF library like puppeteer or jsPDF
    // For now, create an HTML file that can be printed to PDF
    const html = this.generateHTMLReport(history);
    const htmlPath = filePath.replace('.pdf', '.html');
    await writeFile(htmlPath, html);
    
    vscode.window.showInformationMessage(
      `PDF export created as HTML file: ${htmlPath}. Use browser "Print to PDF" for final PDF.`
    );
  }

  private generateHTMLReport(history: AnalysisHistoryItem[]): string {
    const stats = history.reduce((acc, item) => {
      acc.totalRecommendations += item.recommendationsCount;
      acc.totalImplemented += item.implementedCount;
      return acc;
    }, { totalRecommendations: 0, totalImplemented: 0 });

    const implementationRate = stats.totalRecommendations > 0 ? 
      (stats.totalImplemented / stats.totalRecommendations * 100).toFixed(1) : '0';

    return `<!DOCTYPE html>
<html>
<head>
    <title>Analysis History Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        h1 { color: #2563eb; }
        .summary { background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
        th { background-color: #f8f9fa; }
        .risk-high { background-color: #fee2e2; }
        .risk-medium { background-color: #fef3c7; }
        .risk-low { background-color: #dcfce7; }
    </style>
</head>
<body>
    <h1>Analysis History Report</h1>
    <div class="summary">
        <h2>Summary Statistics</h2>
        <p><strong>Total Analyses:</strong> ${history.length}</p>
        <p><strong>Total Recommendations:</strong> ${stats.totalRecommendations}</p>
        <p><strong>Implementation Rate:</strong> ${implementationRate}%</p>
        <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
    </div>
    
    <h2>Analysis History</h2>
    <table>
        <thead>
            <tr>
                <th>Date</th>
                <th>Project</th>
                <th>Branch</th>
                <th>Risk Level</th>
                <th>Recommendations</th>
                <th>Implemented</th>
                <th>Rate</th>
            </tr>
        </thead>
        <tbody>
            ${history.map(item => `
                <tr class="risk-${item.riskLevel}">
                    <td>${new Date(item.timestamp).toLocaleDateString()}</td>
                    <td>${item.projectName}</td>
                    <td>${item.branch}</td>
                    <td>${item.riskLevel}</td>
                    <td>${item.recommendationsCount}</td>
                    <td>${item.implementedCount}</td>
                    <td>${item.recommendationsCount > 0 ? 
                      ((item.implementedCount / item.recommendationsCount) * 100).toFixed(1) : '0'}%</td>
                </tr>
            `).join('')}
        </tbody>
    </table>
</body>
</html>`;
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    // Cleanup if needed
  }
}