// Mock for GitIntegration service
export class GitIntegration {
  constructor(context: any) {}
  
  async getUncommittedChanges() {
    return [];
  }
  
  async getCommitHistory() {
    return [];
  }
  
  async getDiffFromMainBranch() {
    return '';
  }
  
  async getDiffForCommit() {
    return '';
  }
  
  async getDiffForUncommittedChanges() {
    return '';
  }
  
  async getCurrentBranch() {
    return 'main';
  }
  
  async isGitRepository() {
    return true;
  }
  
  getWorkspaceRoot() {
    return '/test/workspace';
  }
}
