// Mock AnalysisHistoryService
export class AnalysisHistoryService {
  constructor(private context: any) {}

  async getAnalysisHistory(): Promise<any[]> {
    return [
      {
        id: 'test-history-1',
        timestamp: new Date().toISOString(),
        projectName: 'test-project',
        summary: 'Test analysis',
        riskLevel: 'low',
        recommendationsCount: 5,
        implementedCount: 2,
        branch: 'main'
      }
    ];
  }

  async loadAnalysis(analysisId: string): Promise<any | null> {
    if (analysisId === 'test-analysis-id') {
      return {
        id: 'test-analysis-id',
        timestamp: new Date().toISOString(),
        analysisResults: {
          summary: {
            projectHealth: 'good',
            riskLevel: 'low',
            recommendedActions: []
          }
        }
      };
    }
    return null;
  }

  async exportAnalyses(format: 'json' | 'csv' | 'pdf'): Promise<string> {
    return `/tmp/test-export.${format}`;
  }

  async deleteAnalysis(analysisId: string): Promise<void> {
    // Mock implementation
  }

  async compareAnalyses(analysisId1: string, analysisId2: string): Promise<any> {
    return {
      comparison: 'Test comparison result'
    };
  }

  async markRecommendationsImplemented(analysisId: string, implementedCount: number): Promise<void> {
    // Mock implementation
  }

  async getInsightsTrends(): Promise<any> {
    return {
      trends: 'Test insights'
    };
  }
}