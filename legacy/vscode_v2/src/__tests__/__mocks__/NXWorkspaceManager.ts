// Mock for NXWorkspaceManager service
export class NXWorkspaceManager {
  constructor(context: any) {}
  
  async listProjects() {
    return [];
  }
  
  async runAffectedTests() {
    return [];
  }
  
  async detectNXWorkspace() {
    return true;
  }
}
