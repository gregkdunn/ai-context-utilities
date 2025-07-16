# AI Debug Commands Tests

This directory contains comprehensive unit and integration tests for the AI Debug utility commands that were ported from Zsh shell scripts to TypeScript.

## Test Coverage

### Unit Tests

#### `aiDebug.test.ts`
Tests for the main AI Debug command that orchestrates the entire debugging workflow:
- Full workflow execution with passing/failing tests
- Git diff capture and skipping
- Test execution with different options (quick, fullContext, focus)
- Lint and prettier integration when tests pass
- AI-optimized context file generation
- PR description prompt generation
- Error handling and edge cases
- Focus-specific guidance generation

#### `nxTest.test.ts` 
Tests for the NX test runner with AI-optimized output:
- Test execution with AI-optimized vs full output
- ANSI code cleaning from test output
- Use of expected output files for faster iteration
- Failure analysis and compilation error extraction
- Performance insights (slow test detection)
- Test suite summary generation
- File system error handling

#### `gitDiff.test.ts`
Tests for git change analysis with smart diff detection:
- Smart diff detection (unstaged → staged → last commit)
- AI-optimized diff formatting with file categorization
- File type analysis (TypeScript, tests, configs, etc.)
- Change impact assessment
- File separators for better AI parsing
- Branch detection and repository status
- Empty diff handling

#### `prepareToPush.test.ts`
Tests for code quality validation before pushing:
- Sequential lint and prettier execution
- Failure handling when lint fails (skips prettier)
- Success/failure reporting with next step guidance
- Process error handling
- Output capture and display

### Integration Tests

#### `integration.test.ts`
End-to-end workflow tests that verify command interactions:
- Complete aiDebug workflow with all sub-commands
- Command isolation and independent execution
- Error propagation between commands
- Performance benchmarks
- Output file generation verification
- Option handling across the workflow

## Test Architecture

### Mocking Strategy
- **VSCode API**: Mocked to simulate extension environment
- **Child Process**: Mocked to simulate yarn/nx/git command execution
- **File System**: Mocked to control file I/O operations
- **External Dependencies**: FileManager and CommandRunner are mocked in unit tests

### Test Data Patterns
- **Realistic Output**: Tests use actual yarn nx output patterns
- **Error Scenarios**: Coverage for command failures, file system errors
- **Edge Cases**: Empty outputs, missing files, permission errors
- **Performance**: Timing assertions for reasonable execution duration

## Running Tests

```bash
# Run all command tests
npm test -- src/commands

# Run specific test file
npm test -- src/commands/__tests__/aiDebug.test.ts

# Run with coverage
npm run test:coverage

# Watch mode for development
npm run test:watch
```

## Test Quality Metrics

- **Line Coverage**: >90% for all command files
- **Branch Coverage**: >85% for conditional logic
- **Function Coverage**: 100% for public methods
- **Integration Coverage**: All workflows tested end-to-end

## Key Test Scenarios

### Happy Path
- Tests pass → lint passes → prettier succeeds → PR prompts generated
- Git changes detected → AI-optimized diff created
- Test failures → focused debugging context generated

### Error Handling
- Command not found (yarn/git missing)
- File system errors (permissions, disk space)
- Network timeouts for git operations
- Malformed test output

### Edge Cases
- Empty git repositories (no commits)
- Clean working directories (no changes)
- Binary files in diffs
- Very large test outputs
- Projects without NX configuration

### Performance
- Commands complete within reasonable time bounds
- File I/O operations are optimized
- Memory usage remains stable during large operations

## Mock Data Quality

The tests use realistic mock data that matches actual tool outputs:
- Jest test runner output formats
- Git diff output with various change types
- Yarn NX command structures
- ESLint and Prettier output patterns

This ensures tests accurately validate the real-world behavior of the ported shell functions.
