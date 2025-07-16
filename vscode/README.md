# AI Debug Utilities - VSCode Extension

AI-powered debugging and code quality tools for Angular NX monorepos, now available directly in VSCode!

## Features

- **🤖 AI Debug Analysis**: Complete development workflow with test analysis, git changes, and code quality checks
- **🧪 NX Test Runner**: Execute Jest tests with AI-optimized output formatting
- **📋 Smart Git Diff**: Intelligent git change analysis with file categorization
- **🚀 Prepare to Push**: Automated linting and code formatting validation
- **📝 GitHub Copilot Integration**: Auto-trigger Copilot analysis for test failures and code review

## Installation

1. Install the extension from the VSCode marketplace
2. Open an Angular NX workspace
3. The extension will automatically activate and show the AI Debug panel

## Quick Start

1. **Open the Panel**: Use `Ctrl+Shift+D` (or `Cmd+Shift+D` on Mac) to open the AI Debug panel
2. **Select a Project**: Choose your NX project from the dropdown
3. **Run Analysis**: Click any of the action buttons to start analysis
4. **View Results**: Check the output files and use them with AI assistants

## Commands

### AI Debug Analysis (`aiDebug`)
Complete development workflow that:
- Runs tests with AI-optimized output
- Captures git changes with smart analysis
- Performs code quality checks (lint + format)
- Generates PR description prompts when ready
- Provides structured context for AI debugging

**Options:**
- `--quick`: Skip detailed analysis for faster iteration
- `--full-context`: Include verbose test output
- `--focus=area`: Focus on specific area (tests|types|performance)

### Run Tests (`nxTest`)
Execute Jest tests with AI-optimized reporting:
- Filters out noise and focuses on key information
- Highlights failures with clear error categorization
- Provides performance insights for slow tests
- Generates structured output for AI analysis

### Analyze Changes (`gitDiff`)
Smart git change analysis:
- Auto-detects best diff strategy (unstaged → staged → last commit)
- Categorizes changes by file type and impact
- Provides AI-friendly formatting with change summaries
- Highlights test-related files and potential breaking changes

### Prepare to Push (`prepareToPush`)
Code quality validation:
- Runs ESLint/TSLint with clear error reporting
- Applies Prettier formatting automatically
- Validates code meets project standards
- Provides clear next steps for any issues

## Configuration

The extension can be configured through VSCode settings:

```json
{
  "aiDebugUtilities.outputDirectory": ".github/instructions/ai_utilities_context",
  "aiDebugUtilities.autoDetectProject": true,
  "aiDebugUtilities.showNotifications": true,
  "aiDebugUtilities.terminalIntegration": true,
  "aiDebugUtilities.copilot.autoAnalyze": true,
  "aiDebugUtilities.copilot.analyzeOnFailure": true,
  "aiDebugUtilities.copilot.generatePR": true
}
```

## Output Files

The extension generates AI-optimized files in your configured output directory:

- **`ai-debug-context.txt`**: Complete debugging context for AI analysis
- **`jest-output.txt`**: AI-optimized test results
- **`diff.txt`**: Git changes with intelligent analysis
- **`pr-description-prompt.txt`**: GitHub PR description generation prompts

## GitHub Copilot Integration

When GitHub Copilot is available, the extension provides enhanced AI assistance:

### Automatic Analysis
- **Test Failures**: Auto-triggers Copilot analysis when tests fail
- **Code Review**: Suggests improvements when tests pass
- **PR Generation**: Creates GitHub PR descriptions from your changes

### Manual Analysis
- Click "Analyze with Copilot" buttons for targeted AI assistance
- Custom chat participant: `@aidebug analyze failures`
- Context-aware prompts based on your specific codebase

## Keyboard Shortcuts

- `Ctrl+Shift+D` / `Cmd+Shift+D`: Open AI Debug panel
- `Ctrl+Shift+A` / `Cmd+Shift+A`: Run AI Debug Analysis on current project

## Workflow Example

1. **Make Code Changes**: Modify your Angular/NX project
2. **Run AI Debug**: Click "AI Debug Analysis" or use `Ctrl+Shift+A`
3. **If Tests Fail**: Extension auto-opens Copilot with failure analysis
4. **If Tests Pass**: Extension runs lint + format, generates PR prompts
5. **Review Results**: Check output files and follow AI suggestions
6. **Push Changes**: Code is ready for commit and PR creation

## Requirements

- **VSCode**: Version 1.85.0 or higher
- **Angular NX**: Monorepo with `nx.json` or `angular.json`
- **Node.js**: Version 18 or higher
- **Yarn**: Package manager (npm support coming soon)

## Supported Project Types

- Angular applications and libraries
- NX monorepos with Jest testing
- TypeScript projects with ESLint/TSLint
- Projects using Prettier for formatting

## Development & Testing

### Running Unit Tests

The extension includes a comprehensive test suite to ensure reliability and maintainability. All tests are written using Jest and include extensive mocking of VSCode APIs.

#### Test Structure

```
src/
├── __tests__/           # Extension integration tests
│   └── extension.test.ts
├── types/
│   └── __tests__/       # Type definition tests
│       └── index.test.ts
├── utils/
│   └── __tests__/       # Utility module tests
│       ├── fileManager.test.ts
│       ├── projectDetector.test.ts
│       └── shellRunner.test.ts
├── webview/
│   └── __tests__/       # Webview provider tests
│       └── provider.test.ts
└── test/
    ├── setup.ts         # Jest test setup
    └── __mocks__/       # VSCode API mocks
        └── vscode.ts
```

#### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run specific test file
npm test -- fileManager.test.ts

# Run tests matching a pattern
npm test -- --testNamePattern="should handle errors"
```

#### Test Coverage

The test suite maintains high coverage across all modules:

- **Extension Integration**: 95%+ coverage of activation, command registration, and lifecycle
- **Type Definitions**: 100% coverage of all interfaces and type safety
- **File Manager**: 95%+ coverage of file operations, error handling, and VSCode integration
- **Project Detector**: 95%+ coverage of NX workspace detection and project analysis
- **Shell Runner**: 95%+ coverage of command execution and process management  
- **Webview Provider**: 95%+ coverage of UI state management and message handling

#### Test Categories

**Unit Tests**: Test individual functions and classes in isolation
- Mock all external dependencies (VSCode API, file system, child processes)
- Focus on business logic and error handling
- Fast execution for development feedback

**Integration Tests**: Test component interactions and workflows
- Test extension activation and command registration
- Verify proper dependency injection and lifecycle management
- Test end-to-end command execution flows

**Type Safety Tests**: Validate TypeScript interface definitions
- Ensure all interfaces work correctly together
- Test optional and required properties
- Validate enum values and type constraints

#### Mock Strategy

The test suite uses comprehensive mocking to isolate units under test:

**VSCode API Mocking**: Complete mock of the VSCode extension API
- Window operations (notifications, terminal, webview)
- Workspace operations (configuration, file watching)
- Command registration and execution
- Extension context and lifecycle

**File System Mocking**: Mock all file system operations
- File reading/writing operations
- Directory creation and traversal
- File watching and change detection
- Error scenarios and edge cases

**Process Mocking**: Mock child process execution
- Command execution with stdout/stderr capture
- Process lifecycle management
- Error handling and timeout scenarios
- Terminal integration testing

#### Writing New Tests

When adding new functionality, follow these testing guidelines:

1. **Test Structure**: Use descriptive `describe` blocks and `it` statements
2. **Mocking**: Mock all external dependencies consistently
3. **Error Handling**: Test both success and failure scenarios
4. **Edge Cases**: Test boundary conditions and unusual inputs
5. **Async Operations**: Properly handle promises and async/await patterns

Example test structure:
```typescript
describe('MyNewFeature', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Setup test state
  });

  it('should handle successful execution', async () => {
    // Arrange
    const mockInput = 'test-input';
    
    // Act
    const result = await myNewFeature(mockInput);
    
    // Assert
    expect(result).toEqual(expectedOutput);
    expect(mockDependency).toHaveBeenCalledWith(mockInput);
  });

  it('should handle error scenarios gracefully', async () => {
    // Arrange
    mockDependency.mockRejectedValue(new Error('Test error'));
    
    // Act & Assert
    await expect(myNewFeature('input')).rejects.toThrow('Test error');
  });
});
```

#### Debugging Tests

For debugging failing tests:

```bash
# Run single test with verbose output
npm test -- --verbose fileManager.test.ts

# Run with debug logging
DEBUG=* npm test

# Run with Jest debugger
node --inspect-brk node_modules/.bin/jest --runInBand

# Generate coverage report
npm run test:coverage
open coverage/lcov-report/index.html
```

### Development Setup

1. **Clone the repository**
2. **Install dependencies**: `npm install`
3. **Run tests**: `npm test`
4. **Build extension**: `npm run compile`
5. **Debug**: Press F5 to launch Extension Development Host

### Continuous Integration

The project uses GitHub Actions for CI/CD:

- **Pull Request Validation**: Runs all tests and linting
- **Coverage Reporting**: Generates and reports test coverage
- **Build Verification**: Ensures extension packages correctly
- **Release Automation**: Automated publishing to marketplace

## Troubleshooting

### Extension Not Activating
- Ensure your workspace contains `nx.json` or `angular.json`
- Check that you're in the root directory of your NX workspace
- Reload VSCode window (`Ctrl+Shift+P` → "Developer: Reload Window")

### Commands Not Working
- Verify your project has the required targets in `project.json`
- Check that Yarn is installed and accessible
- Review VSCode output panel for error messages

### Output Files Not Generated
- Check the configured output directory exists and is writable
- Ensure commands complete successfully (check terminal output)
- Verify file permissions in your workspace

### Test Failures
- Run `npm test` to see detailed error messages
- Check that all dependencies are installed: `npm install`
- Ensure you're using Node.js 18 or higher
- Clear Jest cache: `npm test -- --clearCache`

## Contributing

This extension is based on the AI Debug Utilities shell functions. To contribute:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. **Add tests** for new functionality
5. **Run the test suite**: `npm test`
6. Test with a real NX workspace
7. Submit a pull request

### Code Quality Standards

- **Test Coverage**: Maintain 95%+ coverage for all new code
- **TypeScript**: Use strict type checking
- **Linting**: Follow ESLint configuration
- **Documentation**: Update README and inline comments
- **Error Handling**: Implement comprehensive error handling

## License

MIT License - see LICENSE file for details

## Support

For issues and feature requests, please use the GitHub repository issues page.
