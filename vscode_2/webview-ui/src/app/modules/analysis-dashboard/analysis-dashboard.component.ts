import { Component, signal, computed, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { VscodeService } from '../../services/vscode.service';
import { 
  ComprehensiveAnalysisResult, 
  AnalysisHistoryItem,
  AnalysisDashboardProps,
  AnalysisSchema 
} from '../../../../../src/types/analysis';

interface AnalysisSection {
  id: string;
  title: string;
  icon: string;
  data: any;
  priority: 'high' | 'medium' | 'low';
  expanded: boolean;
}

interface RecommendationItem {
  id: string;
  title: string;
  description: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  implemented: boolean;
  estimatedEffort?: string;
}

@Component({
  selector: 'app-analysis-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="analysis-dashboard">
      <!-- Dashboard Header -->
      <div class="dashboard-header">
        <div class="header-content">
          <h2 class="dashboard-title">
            <span class="title-icon">🧠</span>
            AI Analysis Dashboard
          </h2>
          <div class="header-stats" *ngIf="currentAnalysis()">
            <div class="stat-item">
              <span class="stat-label">Health</span>
              <span class="stat-value" [ngClass]="healthClass()">
                {{ currentAnalysis()?.analysisResults?.summary?.projectHealth }}
              </span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Risk</span>
              <span class="stat-value" [ngClass]="riskClass()">
                {{ currentAnalysis()?.analysisResults?.summary?.riskLevel }}
              </span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Quality</span>
              <span class="stat-value">
                {{ (currentAnalysis()?.qualityScore || 0) * 100 | number:'1.0-0' }}%
              </span>
            </div>
          </div>
        </div>
        
        <div class="action-buttons">
          <button 
            class="btn-primary"
            (click)="submitFullContext()" 
            [disabled]="isSubmitting() || !contextReady()"
            [class.loading]="isSubmitting()">
            <span class="btn-icon">🚀</span>
            {{ isSubmitting() ? 'Analyzing...' : 'Submit to Copilot' }}
          </button>
          <button 
            class="btn-secondary"
            (click)="generateFromExistingFiles()"
            [disabled]="isSubmitting()">
            <span class="btn-icon">📄</span>
            Use Existing Files
          </button>
          <button class="btn-secondary" (click)="viewHistory()">
            <span class="btn-icon">📊</span>
            History
          </button>
          <button class="btn-secondary" (click)="exportAnalysis()" *ngIf="currentAnalysis()">
            <span class="btn-icon">💾</span>
            Export
          </button>
        </div>
      </div>

      <!-- Progress Indicator -->
      <div class="progress-container" *ngIf="isSubmitting()">
        <div class="progress-bar">
          <div class="progress-fill" [style.width.%]="submissionProgress()"></div>
        </div>
        <div class="progress-text">{{ submissionStatus() }}</div>
      </div>

      <!-- Error Display Panel -->
      <div class="error-panel" *ngIf="lastError() && !isSubmitting()">
        <div class="error-header">
          <div class="error-title">
            <span class="error-icon">❌</span>
            <h3>Analysis Failed</h3>
            <span class="error-timestamp" *ngIf="lastError()?.timestamp">
              {{ lastError()?.timestamp | date:'short' }}
            </span>
          </div>
          <button class="btn-dismiss" (click)="dismissError()">
            <span>×</span>
          </button>
        </div>
        
        <div class="error-content">
          <div class="error-message">
            {{ lastError()?.message }}
          </div>
          
          <div class="error-details" *ngIf="lastError()?.details">
            <details>
              <summary>Technical Details</summary>
              <pre class="error-stack">{{ lastError()?.details }}</pre>
            </details>
          </div>
        </div>
      </div>

      <!-- Diagnostic Status Panel -->
      <div class="diagnostic-panel" *ngIf="!isSubmitting()">
        <div class="diagnostic-header">
          <div class="diagnostic-title">
            <span class="diagnostic-icon">🔧</span>
            <h3>System Diagnostics</h3>
            <span class="readiness-badge" [ngClass]="{
              'ready': systemReadiness().ready,
              'not-ready': !systemReadiness().ready,
              'loading': isDiagnosticLoading()
            }">
              {{ isDiagnosticLoading() ? 'CHECKING...' : (systemReadiness().ready ? 'READY' : 'NOT READY') }}
            </span>
          </div>
          <div class="diagnostic-actions">
            <button class="btn-diagnostic" (click)="toggleDiagnostics()">
              <span class="btn-icon">{{ showDiagnostics() ? '▲' : '▼' }}</span>
              {{ showDiagnostics() ? 'Hide' : 'Show' }}
            </button>
            <button class="btn-diagnostic" (click)="refreshDiagnostics()">
              <span class="btn-icon">🔄</span>
              Refresh
            </button>
          </div>
        </div>

        <!-- Compact Status Summary -->
        <div class="diagnostic-summary" *ngIf="!showDiagnostics() && diagnosticStatus()">
          <div class="status-checks">
            <div class="status-item" [ngClass]="{ 'passed': diagnosticStatus()?.copilot?.available, 'failed': !diagnosticStatus()?.copilot?.available }">
              <span class="status-icon">{{ diagnosticStatus()?.copilot?.available ? '✓' : '✗' }}</span>
              <span class="status-label">github_copilot</span>
              <span class="status-value">{{ diagnosticStatus()?.copilot?.available ? 'AVAILABLE' : 'UNAVAILABLE' }}</span>
              <span class="status-model" *ngIf="diagnosticStatus()?.copilot?.model">({{ diagnosticStatus()?.copilot?.model }})</span>
            </div>
            <div class="status-item" [ngClass]="{ 'passed': diagnosticStatus()?.contextFile?.exists, 'failed': !diagnosticStatus()?.contextFile?.exists }">
              <span class="status-icon">{{ diagnosticStatus()?.contextFile?.exists ? '✓' : '✗' }}</span>
              <span class="status-label">ai_context</span>
              <span class="status-value">{{ diagnosticStatus()?.contextFile?.exists ? 'READY' : 'MISSING' }}</span>
            </div>
            <div class="status-item" [ngClass]="{ 'passed': diagnosticStatus()?.workspace?.hasWorkspace, 'failed': !diagnosticStatus()?.workspace?.hasWorkspace }">
              <span class="status-icon">{{ diagnosticStatus()?.workspace?.hasWorkspace ? '✓' : '✗' }}</span>
              <span class="status-label">workspace</span>
              <span class="status-value">{{ diagnosticStatus()?.workspace?.hasWorkspace ? 'AVAILABLE' : 'UNAVAILABLE' }}</span>
            </div>
          </div>
          <div class="readiness-score">
            <span class="score-label">System Score:</span>
            <span class="score-value" [ngClass]="{
              'score-high': systemReadiness().score >= 80,
              'score-medium': systemReadiness().score >= 60 && systemReadiness().score < 80,
              'score-low': systemReadiness().score < 60
            }">{{ systemReadiness().score }}%</span>
          </div>
        </div>

        <!-- Detailed Diagnostics -->
        <div class="diagnostic-details" *ngIf="showDiagnostics() && diagnosticStatus()">
          <div class="details-grid">
            <!-- Copilot Status -->
            <div class="detail-card">
              <div class="card-header">
                <span class="card-icon" [ngClass]="{ 'success': diagnosticStatus()?.copilot?.available, 'error': !diagnosticStatus()?.copilot?.available }">
                  {{ diagnosticStatus()?.copilot?.available ? '✅' : '❌' }}
                </span>
                <h4>GitHub Copilot</h4>
              </div>
              <div class="card-content">
                <p><strong>Status:</strong> {{ diagnosticStatus()?.copilot?.available ? 'Available' : 'Unavailable' }}</p>
                <p *ngIf="diagnosticStatus()?.copilot?.model"><strong>Model:</strong> {{ diagnosticStatus()?.copilot?.model }}</p>
                <p *ngIf="diagnosticStatus()?.copilot?.error" class="error-text"><strong>Error:</strong> {{ diagnosticStatus()?.copilot?.error }}</p>
                
                <!-- Troubleshooting Actions for Copilot -->
                <div class="troubleshooting-actions" *ngIf="!diagnosticStatus()?.copilot?.available">
                  <div class="mb-2 mt-3">
                    <span style="color: #A8A8FF;">></span>
                    <span style="color: #4ECDC4;">🔧 Quick fixes to resolve Copilot issues</span>
                  </div>
                  <div class="troubleshoot-grid">
                    <a 
                      (click)="troubleshootCopilot('check-extension')"
                      class="troubleshoot-card"
                      [ngStyle]="{'background': '#333', 'color': '#e5e5e5', 'border-color': '#666'}">
                      <div>
                        <span>🔍</span>
                        <span>Check Extension</span>
                      </div>
                      <div class="text-xs mt-1" style="color: #999;">Verify GitHub Copilot is installed</div>
                    </a>
                    
                    <a 
                      (click)="troubleshootCopilot('sign-in')"
                      class="troubleshoot-card"
                      [ngStyle]="{'background': '#333', 'color': '#e5e5e5', 'border-color': '#666'}">
                      <div>
                        <span>🔑</span>
                        <span>Sign In</span>
                      </div>
                      <div class="text-xs mt-1" style="color: #999;">Authenticate with GitHub</div>
                    </a>
                    
                    <a 
                      (click)="troubleshootCopilot('check-status')"
                      class="troubleshoot-card"
                      [ngStyle]="{'background': '#333', 'color': '#e5e5e5', 'border-color': '#666'}">
                      <div>
                        <span>📊</span>
                        <span>Check Status</span>
                      </div>
                      <div class="text-xs mt-1" style="color: #999;">View subscription status</div>
                    </a>
                    
                    <a 
                      (click)="troubleshootCopilot('reload-window')"
                      class="troubleshoot-card"
                      [ngStyle]="{'background': '#333', 'color': '#e5e5e5', 'border-color': '#666'}">
                      <div>
                        <span>🔄</span>
                        <span>Reload VSCode</span>
                      </div>
                      <div class="text-xs mt-1" style="color: #999;">Refresh all extensions</div>
                    </a>
                    
                    <a 
                      (click)="troubleshootCopilot('view-logs')"
                      class="troubleshoot-card"
                      [ngStyle]="{'background': '#333', 'color': '#e5e5e5', 'border-color': '#666'}">
                      <div>
                        <span>📋</span>
                        <span>View Logs</span>
                      </div>
                      <div class="text-xs mt-1" style="color: #999;">Show diagnostic details</div>
                    </a>
                    
                    <a 
                      (click)="troubleshootCopilot('help')"
                      class="troubleshoot-card"
                      [ngStyle]="{'background': '#333', 'color': '#e5e5e5', 'border-color': '#666'}">
                      <div>
                        <span>❓</span>
                        <span>More Help</span>
                      </div>
                      <div class="text-xs mt-1" style="color: #999;">Open troubleshooting docs</div>
                    </a>
                  </div>
                </div>
              </div>
            </div>

            <!-- Context File Status -->
            <div class="detail-card">
              <div class="card-header">
                <span class="card-icon" [ngClass]="{ 'success': diagnosticStatus()?.contextFile?.exists, 'error': !diagnosticStatus()?.contextFile?.exists }">
                  {{ diagnosticStatus()?.contextFile?.exists ? '✅' : '❌' }}
                </span>
                <h4>AI Context File</h4>
              </div>
              <div class="card-content">
                <p><strong>Status:</strong> {{ diagnosticStatus()?.contextFile?.exists ? 'Found' : 'Not found' }}</p>
                <p *ngIf="diagnosticStatus()?.contextFile?.path"><strong>Path:</strong> {{ diagnosticStatus()?.contextFile?.path }}</p>
                <p *ngIf="diagnosticStatus()?.contextFile?.size"><strong>Size:</strong> {{ (diagnosticStatus()?.contextFile?.size! / 1024) | number:'1.0-1' }} KB</p>
              </div>
            </div>

            <!-- Workspace Status -->
            <div class="detail-card">
              <div class="card-header">
                <span class="card-icon" [ngClass]="{ 'success': diagnosticStatus()?.workspace?.hasWorkspace, 'error': !diagnosticStatus()?.workspace?.hasWorkspace }">
                  {{ diagnosticStatus()?.workspace?.hasWorkspace ? '✅' : '❌' }}
                </span>
                <h4>Workspace</h4>
              </div>
              <div class="card-content">
                <p><strong>Workspace:</strong> {{ diagnosticStatus()?.workspace?.hasWorkspace ? 'Available' : 'Not available' }}</p>
                <p><strong>Git Repo:</strong> {{ diagnosticStatus()?.workspace?.gitRepo ? 'Yes' : 'No' }}</p>
              </div>
            </div>

            <!-- Permissions Status -->
            <div class="detail-card">
              <div class="card-header">
                <span class="card-icon" [ngClass]="{ 'success': diagnosticStatus()?.permissions?.canWrite && diagnosticStatus()?.permissions?.canExecute, 'warning': diagnosticStatus()?.permissions?.canWrite && !diagnosticStatus()?.permissions?.canExecute, 'error': !diagnosticStatus()?.permissions?.canWrite }">
                  {{ diagnosticStatus()?.permissions?.canWrite ? (diagnosticStatus()?.permissions?.canExecute ? '✅' : '⚠️') : '❌' }}
                </span>
                <h4>Permissions</h4>
              </div>
              <div class="card-content">
                <p><strong>Write:</strong> {{ diagnosticStatus()?.permissions?.canWrite ? 'Yes' : 'No' }}</p>
                <p><strong>Execute:</strong> {{ diagnosticStatus()?.permissions?.canExecute ? 'Yes' : 'No' }}</p>
              </div>
            </div>
          </div>

          <!-- Issues Panel -->
          <div class="issues-panel" *ngIf="systemReadiness().issues.length > 0">
            <h4>⚠️ Issues Found</h4>
            <ul class="issues-list">
              <li *ngFor="let issue of systemReadiness().issues">{{ issue }}</li>
            </ul>
          </div>
        </div>
      </div>

      <!-- No Analysis State -->
      <div class="no-analysis-state" *ngIf="!currentAnalysis() && !isSubmitting()">
        <div class="empty-state-icon">🔍</div>
        <h3>No Analysis Available</h3>
        <p>Submit your AI context to Copilot for comprehensive analysis</p>
        <div class="context-status">
          <div class="status-item" [ngClass]="{ 'ready': contextReady() }">
            <span class="status-icon">{{ contextReady() ? '✅' : '⏳' }}</span>
            AI Context Document
          </div>
        </div>
      </div>

      <!-- Analysis Content -->
      <div class="analysis-content" *ngIf="currentAnalysis() && !isSubmitting()">
        <!-- Executive Summary -->
        <div class="analysis-summary">
          <h3>
            <span class="section-icon">📋</span>
            Executive Summary
          </h3>
          <div class="summary-grid">
            <div class="summary-card health" [ngClass]="healthClass()">
              <div class="card-header">
                <span class="card-icon">💚</span>
                Project Health
              </div>
              <div class="card-value">{{ currentAnalysis()?.analysisResults?.summary?.projectHealth }}</div>
            </div>
            
            <div class="summary-card risk" [ngClass]="riskClass()">
              <div class="card-header">
                <span class="card-icon">⚠️</span>
                Risk Level
              </div>
              <div class="card-value">{{ currentAnalysis()?.analysisResults?.summary?.riskLevel }}</div>
            </div>

            <div class="summary-card recommendations">
              <div class="card-header">
                <span class="card-icon">💡</span>
                Recommendations
              </div>
              <div class="card-value">{{ totalRecommendations() }}</div>
            </div>

            <div class="summary-card processing">
              <div class="card-header">
                <span class="card-icon">⚡</span>
                Processing Time
              </div>
              <div class="card-value">
                {{ formatProcessingTime() }}s
              </div>
            </div>
          </div>
          
          <!-- Quick Actions -->
          <div class="quick-actions" *ngIf="currentAnalysis()?.analysisResults?.summary?.recommendedActions?.length">
            <h4>🎯 Quick Actions</h4>
            <div class="action-list">
              <div 
                class="action-item" 
                *ngFor="let action of currentAnalysis()?.analysisResults?.summary?.recommendedActions?.slice(0, 3)"  
              >
                <span class="action-bullet">•</span>
                {{ action }}
              </div>
            </div>
          </div>
        </div>

        <!-- Analysis Sections -->
        <div class="analysis-sections">
          <div class="section-tabs">
            <button 
              *ngFor="let section of analysisSections()"
              class="tab-button"
              [class.active]="activeSection() === section.id"
              (click)="setActiveSection(section.id)">
              <span class="tab-icon">{{ section.icon }}</span>
              {{ section.title }}
              <span class="tab-count" *ngIf="getSectionCount(section.id) > 0">
                {{ getSectionCount(section.id) }}
              </span>
            </button>
          </div>

          <div class="section-content">
            <div *ngFor="let section of analysisSections()" 
                 [style.display]="activeSection() === section.id ? 'block' : 'none'">
              
              <!-- Code Analysis Section -->
              <div *ngIf="section.id === 'code-analysis'" class="section-panel">
                <div class="panel-grid">
                  <!-- Test Recommendations -->
                  <div class="panel-card" *ngIf="getTestRecommendations().length > 0">
                    <h4>🧪 Test Recommendations</h4>
                    <div class="recommendation-list">
                      <div 
                        *ngFor="let rec of getTestRecommendations().slice(0, 5)" 
                        class="recommendation-item"
                        [ngClass]="'priority-' + rec.priority">
                        <div class="rec-header">
                          <span class="rec-title">{{ rec.title }}</span>
                          <span class="rec-priority">{{ rec.priority }}</span>
                        </div>
                        <div class="rec-description">{{ rec.description }}</div>
                        <div class="rec-actions">
                          <button class="btn-implement" (click)="implementRecommendation(rec)">
                            ✅ Implement
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Code Quality Issues -->
                  <div class="panel-card" *ngIf="getCodeIssues().length > 0">
                    <h4>🔍 Code Quality Issues</h4>
                    <div class="issue-list">
                      <div 
                        *ngFor="let issue of getCodeIssues().slice(0, 5)" 
                        class="issue-item"
                        [ngClass]="'severity-' + issue.severity">
                        <div class="issue-header">
                          <span class="issue-title">{{ issue.title }}</span>
                          <span class="issue-severity">{{ issue.severity }}</span>
                        </div>
                        <div class="issue-description">{{ issue.description }}</div>
                        <div class="issue-file" *ngIf="issue.file">
                          📁 {{ issue.file }}{{ issue.lineNumber ? ':' + issue.lineNumber : '' }}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Performance & Security -->
                <div class="panel-grid" style="margin-top: 1rem;">
                  <div class="panel-card" *ngIf="getPerformanceConsiderations().length > 0">
                    <h4>⚡ Performance</h4>
                    <ul class="simple-list">
                      <li *ngFor="let perf of getPerformanceConsiderations().slice(0, 3)">{{ perf }}</li>
                    </ul>
                  </div>

                  <div class="panel-card" *ngIf="getSecurityConcerns().length > 0">
                    <h4>🔒 Security</h4>
                    <div class="security-list">
                      <div *ngFor="let sec of getSecurityConcerns().slice(0, 3)" class="security-item">
                        <div class="security-title">{{ sec.title }}</div>
                        <div class="security-description">{{ sec.description }}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Implementation Guidance Section -->
              <div *ngIf="section.id === 'implementation'" class="section-panel">
                <div class="implementation-content">
                  <div class="tasks-section" *ngIf="getPrioritizedTasks().length > 0">
                    <h4>📋 Prioritized Tasks</h4>
                    <div class="task-list">
                      <div 
                        *ngFor="let task of getPrioritizedTasks()" 
                        class="task-item"
                        [ngClass]="'priority-' + task.priority">
                        <div class="task-header">
                          <span class="task-title">{{ task.title }}</span>
                          <div class="task-meta">
                            <span class="task-priority">{{ task.priority }}</span>
                            <span class="task-effort" *ngIf="task.estimatedHours">{{ task.estimatedHours }}h</span>
                          </div>
                        </div>
                        <div class="task-description">{{ task.description }}</div>
                        <div class="task-criteria" *ngIf="task.acceptanceCriteria.length > 0">
                          <strong>Success Criteria:</strong>
                          <ul>
                            <li *ngFor="let criteria of task.acceptanceCriteria.slice(0, 2)">{{ criteria }}</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div class="guidance-meta">
                    <div class="meta-item" *ngIf="getEstimatedEffort()">
                      <strong>Estimated Effort:</strong> {{ getEstimatedEffort() }}
                    </div>
                    <div class="meta-item" *ngIf="getDependencies().length > 0">
                      <strong>Dependencies:</strong>
                      <ul>
                        <li *ngFor="let dep of getDependencies()">{{ dep }}</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Future Considerations Section -->
              <div *ngIf="section.id === 'future'" class="section-panel">
                <div class="future-content">
                  <div class="future-grid">
                    <div class="future-card" *ngIf="getTechnicalImprovements().length > 0">
                      <h4>🔧 Technical Improvements</h4>
                      <ul class="improvement-list">
                        <li *ngFor="let improvement of getTechnicalImprovements()">{{ improvement }}</li>
                      </ul>
                    </div>

                    <div class="future-card" *ngIf="getArchitecturalRecommendations().length > 0">
                      <h4>🏗️ Architectural Recommendations</h4>
                      <ul class="improvement-list">
                        <li *ngFor="let rec of getArchitecturalRecommendations()">{{ rec }}</li>
                      </ul>
                    </div>

                    <div class="future-card" *ngIf="getMonitoringPoints().length > 0">
                      <h4>📊 Monitoring Points</h4>
                      <ul class="improvement-list">
                        <li *ngFor="let point of getMonitoringPoints()">{{ point }}</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              <!-- PR Generation Section -->
              <div *ngIf="section.id === 'pr-generation'" class="section-panel">
                <div class="pr-content">
                  <div class="pr-preview">
                    <h4>📝 Generated PR Description</h4>
                    <div class="pr-template">
                      <div class="pr-section">
                        <strong>Problem:</strong>
                        <div class="pr-text">{{ getPRProblem() }}</div>
                      </div>
                      <div class="pr-section">
                        <strong>Solution:</strong>
                        <div class="pr-text">{{ getPRSolution() }}</div>
                      </div>
                      <div class="pr-section" *ngIf="getPRDetails().length > 0">
                        <strong>Details:</strong>
                        <ul>
                          <li *ngFor="let detail of getPRDetails()">{{ detail }}</li>
                        </ul>
                      </div>
                      <div class="pr-section" *ngIf="getPRQAChecklist().length > 0">
                        <strong>QA Checklist:</strong>
                        <ul class="qa-checklist">
                          <li *ngFor="let item of getPRQAChecklist()">
                            <input type="checkbox"> {{ item }}
                          </li>
                        </ul>
                      </div>
                    </div>
                    <div class="pr-actions">
                      <button class="btn-primary" (click)="copyPRDescription()">
                        📋 Copy to Clipboard
                      </button>
                      <button class="btn-secondary" (click)="savePRTemplate()">
                        💾 Save Template
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Analysis History Panel -->
      <div class="analysis-history" *ngIf="showHistory()">
        <div class="history-header">
          <h3>📊 Analysis History</h3>
          <button class="btn-close" (click)="closeHistory()">×</button>
        </div>
        
        <div class="history-content">
          <div class="history-filters">
            <input 
              type="text" 
              placeholder="Search analyses..." 
              class="search-input"
              [(ngModel)]="searchTerm"
              #searchInput>
          </div>
          
          <div class="history-list">
            <div 
              *ngFor="let analysis of filteredHistory()" 
              class="history-item"
              [class.selected]="selectedHistory() === analysis.id"
              (click)="selectHistoryItem(analysis)">
              <div class="history-header-row">
                <span class="history-date">{{ formatDate(analysis.timestamp) }}</span>
                <span class="history-risk" [ngClass]="'risk-' + analysis.riskLevel">
                  {{ analysis.riskLevel }}
                </span>
              </div>
              <div class="history-project">{{ analysis.projectName }}</div>
              <div class="history-summary">{{ analysis.summary }}</div>
              <div class="history-stats">
                {{ analysis.recommendationsCount }} recommendations
                • {{ analysis.implementedCount }} implemented
              </div>
            </div>
          </div>
        </div>

        <div class="history-actions">
          <button class="btn-secondary" (click)="compareAnalyses()" *ngIf="canCompare()">
            🔄 Compare
          </button>
          <button class="btn-secondary" (click)="exportHistory()">
            📊 Export
          </button>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./analysis-dashboard.component.css']
})
export class AnalysisDashboardComponent implements OnInit, OnDestroy {
  private vscodeService = inject(VscodeService);

  // Core state
  currentAnalysis = signal<ComprehensiveAnalysisResult | null>(null);
  analysisHistory = signal<AnalysisHistoryItem[]>([]);
  isSubmitting = signal(false);
  submissionProgress = signal(0);
  submissionStatus = signal('');
  
  // UI state
  activeSection = signal('code-analysis');
  showHistoryPanel = signal(false);
  selectedHistory = signal<string | null>(null);
  searchTerm = '';
  
  // Error state
  lastError = signal<{ message: string; details?: string; timestamp?: string } | null>(null);
  
  // Diagnostic state
  diagnosticStatus = signal<{
    copilot: { available: boolean; model?: string; error?: string };
    contextFile: { exists: boolean; path?: string; size?: number };
    workspace: { hasWorkspace: boolean; gitRepo: boolean };
    permissions: { canWrite: boolean; canExecute: boolean };
  } | null>(null);
  isDiagnosticLoading = signal(false);
  showDiagnostics = signal(false);

  // Computed properties
  contextReady = computed(() => {
    const diagnostic = this.diagnosticStatus();
    if (!diagnostic) return false;
    
    return diagnostic.copilot.available && 
           diagnostic.contextFile.exists && 
           diagnostic.workspace.hasWorkspace &&
           diagnostic.permissions.canWrite;
  });

  systemReadiness = computed(() => {
    const diagnostic = this.diagnosticStatus();
    if (!diagnostic) return { ready: false, score: 0, issues: [] };

    const checks = [
      { name: 'GitHub Copilot', passed: diagnostic.copilot.available, critical: true },
      { name: 'AI Context File', passed: diagnostic.contextFile.exists, critical: true },
      { name: 'Workspace Available', passed: diagnostic.workspace.hasWorkspace, critical: true },
      { name: 'Git Repository', passed: diagnostic.workspace.gitRepo, critical: false },
      { name: 'Write Permissions', passed: diagnostic.permissions.canWrite, critical: true },
      { name: 'Execute Permissions', passed: diagnostic.permissions.canExecute, critical: false }
    ];

    const criticalPassed = checks.filter(c => c.critical && c.passed).length;
    const criticalTotal = checks.filter(c => c.critical).length;
    const totalPassed = checks.filter(c => c.passed).length;
    
    const ready = criticalPassed === criticalTotal;
    const score = Math.round((totalPassed / checks.length) * 100);
    const issues = checks.filter(c => !c.passed).map(c => c.name);

    return { ready, score, issues, checks };
  });

  healthClass = computed(() => {
    const health = this.currentAnalysis()?.analysisResults?.summary?.projectHealth?.toLowerCase();
    return {
      'health-excellent': health?.includes('excellent') || health?.includes('great'),
      'health-good': health?.includes('good') || health?.includes('healthy'),
      'health-fair': health?.includes('fair') || health?.includes('average'),
      'health-poor': health?.includes('poor') || health?.includes('bad')
    };
  });

  riskClass = computed(() => {
    const risk = this.currentAnalysis()?.analysisResults?.summary?.riskLevel;
    return {
      'risk-low': risk === 'low',
      'risk-medium': risk === 'medium',
      'risk-high': risk === 'high'
    };
  });

  totalRecommendations = computed(() => {
    const analysis = this.currentAnalysis()?.analysisResults?.codeAnalysis;
    if (!analysis) return 0;
    
    return (
      (analysis.testRecommendations?.length || 0) +
      (analysis.codeQualityIssues?.length || 0) +
      (analysis.securityConcerns?.length || 0) +
      (analysis.technicalDebt?.length || 0)
    );
  });

  analysisSections = computed((): AnalysisSection[] => [
    {
      id: 'code-analysis',
      title: 'Code Analysis',
      icon: '🔍',
      data: this.currentAnalysis()?.analysisResults?.codeAnalysis,
      priority: 'high',
      expanded: true
    },
    {
      id: 'implementation',
      title: 'Implementation',
      icon: '🚀',
      data: this.currentAnalysis()?.analysisResults?.implementationGuidance,
      priority: 'high',
      expanded: false
    },
    {
      id: 'pr-generation',
      title: 'PR Description',
      icon: '📝',
      data: this.currentAnalysis()?.analysisResults?.prGeneration,
      priority: 'medium',
      expanded: false
    },
    {
      id: 'future',
      title: 'Future Considerations',
      icon: '🔮',
      data: this.currentAnalysis()?.analysisResults?.futureConsiderations,
      priority: 'low',
      expanded: false
    }
  ]);

  filteredHistory = computed(() => {
    const history = this.analysisHistory();
    if (!this.searchTerm) return history;
    
    const search = this.searchTerm.toLowerCase();
    return history.filter(item => 
      item.projectName.toLowerCase().includes(search) ||
      item.summary.toLowerCase().includes(search) ||
      item.branch.toLowerCase().includes(search)
    );
  });

  canCompare = computed(() => {
    return this.analysisHistory().length >= 2;
  });

  showHistory = computed(() => this.showHistoryPanel());

  ngOnInit() {
    this.loadAnalysisHistory();
    this.setupMessageHandlers();
    this.runDiagnostics();
  }

  ngOnDestroy() {
    // Cleanup if needed
  }

  // Main actions
  async submitFullContext() {
    if (this.isSubmitting()) return;

    // Clear any previous errors
    this.lastError.set(null);
    
    this.isSubmitting.set(true);
    this.submissionProgress.set(0);
    this.submissionStatus.set('Initializing analysis...');

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        const current = this.submissionProgress();
        if (current < 90) {
          this.submissionProgress.set(current + 10);
          this.updateProgressStatus(current + 10);
        }
      }, 2000);

      const result = await this.vscodeService.submitContextForAnalysis({
        timeout: 120000,
        analysisDepth: 'comprehensive'
      });

      clearInterval(progressInterval);
      this.submissionProgress.set(100);
      this.submissionStatus.set('Analysis complete!');
      
      this.currentAnalysis.set(result.analysis);
      await this.refreshHistory();
      
      // Show success message
      setTimeout(() => {
        this.isSubmitting.set(false);
        this.submissionProgress.set(0);
        this.submissionStatus.set('');
      }, 1000);

    } catch (error) {
      console.error('Analysis submission failed:', error);
      this.isSubmitting.set(false);
      this.submissionProgress.set(0);
      this.submissionStatus.set('');
      // Show error notification
    }
  }

  async generateFromExistingFiles() {
    if (this.isSubmitting()) return;

    this.isSubmitting.set(true);
    this.submissionProgress.set(0);
    this.submissionStatus.set('Checking for existing files...');

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        const current = this.submissionProgress();
        if (current < 90) {
          this.submissionProgress.set(current + 15);
          this.updateExistingFilesProgressStatus(current + 15);
        }
      }, 1500);

      // Call the VSCode service to generate from existing files
      this.vscodeService.generateAIContextFromExistingFiles();

      // Wait for the analysis completion message
      // Note: The actual completion will be handled by the message handler
      // This is just a placeholder for the UI flow
      setTimeout(() => {
        clearInterval(progressInterval);
        this.submissionProgress.set(100);
        this.submissionStatus.set('Generated from existing files!');
        
        setTimeout(() => {
          this.isSubmitting.set(false);
          this.submissionProgress.set(0);
          this.submissionStatus.set('');
        }, 1000);
      }, 8000);

    } catch (error) {
      console.error('Generate from existing files failed:', error);
      this.isSubmitting.set(false);
      this.submissionProgress.set(0);
      this.submissionStatus.set('');
      // Show error notification
    }
  }

  private updateExistingFilesProgressStatus(progress: number) {
    const statusMessages = [
      'Checking for existing files...',
      'Found diff.txt, processing...',
      'Found test output, processing...',
      'Combining existing context...',
      'Generating AI context...',
      'Validating content...',
      'Finalizing context file...'
    ];
    
    const index = Math.min(Math.floor(progress / 15), statusMessages.length - 1);
    this.submissionStatus.set(statusMessages[index]);
  }

  private updateProgressStatus(progress: number) {
    const statusMessages = [
      'Preparing context...',
      'Chunking content...',
      'Submitting to Copilot...',
      'Analyzing code quality...',
      'Generating recommendations...',
      'Processing test insights...',
      'Creating implementation guide...',
      'Finalizing analysis...',
      'Saving results...'
    ];
    
    const index = Math.min(Math.floor(progress / 12), statusMessages.length - 1);
    this.submissionStatus.set(statusMessages[index]);
  }

  // UI Actions
  setActiveSection(sectionId: string) {
    this.activeSection.set(sectionId);
  }

  viewHistory() {
    this.showHistoryPanel.set(true);
  }

  closeHistory() {
    this.showHistoryPanel.set(false);
  }

  selectHistoryItem(item: AnalysisHistoryItem) {
    this.selectedHistory.set(item.id);
    // Load the selected analysis
    this.loadAnalysisById(item.id);
  }

  async exportAnalysis() {
    if (!this.currentAnalysis()) return;
    
    try {
      await this.vscodeService.exportAnalysis('json');
      // Show success message
    } catch (error) {
      console.error('Export failed:', error);
    }
  }

  async exportHistory() {
    try {
      await this.vscodeService.exportAnalysisHistory('csv');
    } catch (error) {
      console.error('History export failed:', error);
    }
  }

  dismissError() {
    this.lastError.set(null);
  }

  async compareAnalyses() {
    // Implementation for comparing analyses
    console.log('Compare analyses feature - to be implemented');
  }

  // Diagnostic Methods
  
  async runDiagnostics() {
    if (this.isDiagnosticLoading()) return;
    
    this.isDiagnosticLoading.set(true);
    try {
      const diagnostics = await this.vscodeService.runSystemDiagnostics();
      this.diagnosticStatus.set(diagnostics);
    } catch (error) {
      console.error('Diagnostic check failed:', error);
      // Set fallback diagnostic status
      this.diagnosticStatus.set({
        copilot: { available: false, error: 'Check failed' },
        contextFile: { exists: false },
        workspace: { hasWorkspace: false, gitRepo: false },
        permissions: { canWrite: false, canExecute: false }
      });
    } finally {
      this.isDiagnosticLoading.set(false);
    }
  }

  toggleDiagnostics() {
    this.showDiagnostics.set(!this.showDiagnostics());
  }

  async refreshDiagnostics() {
    await this.runDiagnostics();
  }

  onTroubleshootHover(action: string | null): void {
    // Optional: Add hover tracking if needed for analytics
  }

  async troubleshootCopilot(action: string) {
    try {
      switch (action) {
        case 'check-extension':
          // Open extensions view and search for GitHub Copilot
          await this.vscodeService.executeCommand('workbench.extensions.search', '@installed GitHub Copilot');
          break;
          
        case 'sign-in':
          // Trigger GitHub Copilot sign in
          await this.vscodeService.executeCommand('github.copilot.signIn');
          break;
          
        case 'check-status':
          // Check GitHub Copilot status
          await this.vscodeService.executeCommand('github.copilot.checkStatus');
          break;
          
        case 'reload-window':
          // Reload VSCode window
          await this.vscodeService.executeCommand('workbench.action.reloadWindow');
          break;
          
        case 'view-logs':
          // Open output panel and show extension logs
          await this.vscodeService.executeCommand('workbench.action.output.show');
          await this.vscodeService.showDiagnosticLogs();
          break;
          
        case 'help':
          // Open troubleshooting documentation
          await this.vscodeService.openExternalUrl('https://docs.github.com/en/copilot/troubleshooting-github-copilot');
          break;
          
        default:
          console.warn('Unknown troubleshooting action:', action);
      }
      
      // After certain actions, refresh diagnostics with force refresh
      if (['sign-in', 'check-status'].includes(action)) {
        console.log('Refreshing diagnostics after action:', action);
        setTimeout(() => {
          console.log('Running diagnostic refresh...');
          this.runDiagnostics();
        }, 3000); // Increased timeout to allow for sign-in completion
      }
    } catch (error) {
      console.error('Troubleshooting action failed:', error);
      // Show error notification
      this.vscodeService.showErrorMessage(`Failed to execute troubleshooting action: ${action}`);
    }
  }

  // Recommendation actions
  implementRecommendation(recommendation: any) {
    // This would trigger implementation of the recommendation
    console.log('Implementing recommendation:', recommendation);
  }

  // PR Actions
  copyPRDescription() {
    const prData = this.currentAnalysis()?.analysisResults.prGeneration;
    if (!prData) return;

    const description = this.formatPRDescription(prData);
    navigator.clipboard.writeText(description);
    // Show success notification
  }

  savePRTemplate() {
    // Save PR template to file
    this.vscodeService.savePRTemplate();
  }

  // Data getters
  getTestRecommendations() {
    return this.currentAnalysis()?.analysisResults?.codeAnalysis?.testRecommendations || [];
  }

  getCodeIssues() {
    return this.currentAnalysis()?.analysisResults?.codeAnalysis?.codeQualityIssues || [];
  }

  getPerformanceConsiderations() {
    return this.currentAnalysis()?.analysisResults?.codeAnalysis?.performanceConsiderations || [];
  }

  getSecurityConcerns() {
    return this.currentAnalysis()?.analysisResults?.codeAnalysis?.securityConcerns || [];
  }

  getPrioritizedTasks() {
    return this.currentAnalysis()?.analysisResults?.implementationGuidance?.prioritizedTasks || [];
  }

  getEstimatedEffort() {
    return this.currentAnalysis()?.analysisResults?.implementationGuidance?.estimatedEffort || '';
  }

  getDependencies() {
    return this.currentAnalysis()?.analysisResults?.implementationGuidance?.dependencies || [];
  }

  getTechnicalImprovements() {
    return this.currentAnalysis()?.analysisResults?.futureConsiderations?.technicalImprovements || [];
  }

  getArchitecturalRecommendations() {
    return this.currentAnalysis()?.analysisResults?.futureConsiderations?.architecturalRecommendations || [];
  }

  getMonitoringPoints() {
    return this.currentAnalysis()?.analysisResults?.futureConsiderations?.monitoringPoints || [];
  }

  getPRProblem() {
    return this.currentAnalysis()?.analysisResults?.prGeneration?.problem || '';
  }

  getPRSolution() {
    return this.currentAnalysis()?.analysisResults?.prGeneration?.solution || '';
  }

  getPRDetails() {
    return this.currentAnalysis()?.analysisResults?.prGeneration?.details || [];
  }

  getPRQAChecklist() {
    return this.currentAnalysis()?.analysisResults?.prGeneration?.qaChecklist || [];
  }

  getSectionCount(sectionId: string): number {
    switch (sectionId) {
      case 'code-analysis':
        return this.totalRecommendations();
      case 'implementation':
        return this.getPrioritizedTasks().length;
      case 'future':
        return this.getTechnicalImprovements().length + 
               this.getArchitecturalRecommendations().length;
      default:
        return 0;
    }
  }

  formatProcessingTime(): string {
    const time = this.currentAnalysis()?.processingMetrics?.totalProcessingTime || 0;
    return (time / 1000).toFixed(1);
  }

  formatDate(timestamp: string): string {
    return new Date(timestamp).toLocaleDateString();
  }

  // Private methods
  private async loadAnalysisHistory() {
    try {
      const history = await this.vscodeService.getAnalysisHistory();
      this.analysisHistory.set(history);
    } catch (error) {
      console.error('Failed to load analysis history:', error);
    }
  }

  private async refreshHistory() {
    await this.loadAnalysisHistory();
  }

  private async loadAnalysisById(analysisId: string) {
    try {
      const analysis = await this.vscodeService.loadAnalysis(analysisId);
      if (analysis) {
        this.currentAnalysis.set(analysis);
      }
    } catch (error) {
      console.error('Failed to load analysis:', error);
    }
  }

  private formatPRDescription(prData: any): string {
    return `## Problem
${prData.problem}

## Solution
${prData.solution}

## Details
${prData.details.map((detail: string) => `- ${detail}`).join('\n')}

## QA Checklist
${prData.qaChecklist.map((item: string) => `- [ ] ${item}`).join('\n')}

## Risk Assessment
${prData.riskAssessment}
`;
  }

  private setupMessageHandlers() {
    // Setup message handlers for VSCode communication
    this.vscodeService.onMessage().subscribe(message => {
      if (!message) return;
      
      switch (message.command) {
        case 'analysisComplete':
          this.handleAnalysisComplete(message.data);
          break;
        case 'analysisError':
          this.handleAnalysisError(message.data);
          break;
        case 'submissionStarted':
          this.handleSubmissionStarted(message.data);
          break;
      }
    });
  }

  private handleAnalysisComplete(data: any) {
    console.log('Analysis completed:', data);
    this.currentAnalysis.set(data);
    this.isSubmitting.set(false);
    this.submissionProgress.set(100);
    this.submissionStatus.set('Analysis complete!');
    
    // Clear submission state after a short delay
    setTimeout(() => {
      this.submissionProgress.set(0);
      this.submissionStatus.set('');
    }, 2000);
  }

  private handleAnalysisError(data: { error: string; details?: string; timestamp?: string }) {
    console.error('Analysis failed:', data.error);
    console.error('Error details:', data.details);
    console.error('Error timestamp:', data.timestamp);
    
    // Store error for detailed display
    this.lastError.set({
      message: data.error,
      details: data.details,
      timestamp: data.timestamp
    });
    
    // Show detailed error in the UI
    this.isSubmitting.set(false);
    this.submissionProgress.set(0);
    this.submissionStatus.set(`❌ ${data.error}`);
    
    // Show error notification via VSCode
    this.vscodeService.showErrorMessage(`Analysis failed: ${data.error}`);
    
    // Keep error visible for longer to allow user to read troubleshooting info
    setTimeout(() => {
      this.submissionStatus.set('');
    }, 15000);
  }

  private handleSubmissionStarted(data: { progress: number; status: string }) {
    console.log('Submission started:', data);
    this.submissionProgress.set(data.progress);
    this.submissionStatus.set(data.status);
  }
}