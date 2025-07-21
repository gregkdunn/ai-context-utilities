const { CopilotIntegration } = require('./out/services/CopilotIntegration.js');
console.log('CopilotIntegration:', typeof CopilotIntegration);
console.log('CopilotIntegration methods:', Object.getOwnPropertyNames(CopilotIntegration.prototype));