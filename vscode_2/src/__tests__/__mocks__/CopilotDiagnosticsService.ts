export class CopilotDiagnosticsService {
  constructor() {}

  public async checkCopilotStatus(): Promise<boolean> {
    return true;
  }

  public async getCopilotVersion(): Promise<string> {
    return '1.0.0';
  }

  public async validateCopilotAccess(): Promise<boolean> {
    return true;
  }
}
