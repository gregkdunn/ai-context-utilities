// Mock for AIDebugWebviewProvider
export class AIDebugWebviewProvider {
  constructor(...args: any[]) {}
  
  resolveWebviewView() {
    return {};
  }
  
  runAITestDebug() {
    return Promise.resolve();
  }
}
