# AI Debug Context Extension - Copilot Integration Test Plan

## Overview

This document outlines the comprehensive testing strategy for the GitHub Copilot integration in the AI Debug Context VSCode extension.

## Pre-Test Setup

### Prerequisites
- ✅ VSCode with GitHub Copilot extension installed and active
- ✅ NX workspace with Angular projects
- ✅ Git repository with some uncommitted changes or recent commits
- ✅ Jest test files in the workspace
- ✅ Extension built and ready for testing

### Environment Preparation
```bash
# Navigate to extension directory
cd /Users/gregdunn/src/test/ai_debug_context/vscode_2

# Ensure everything is built
npm run compile

# Launch VSCode for testing
code .
```

## Test Scenarios

### 1. Extension Activation and UI Loading

**Test Steps:**
1. Open VSCode Extension Development Host (F5)
2. Open an NX workspace
3. Click on AI Debug Context icon in Activity Bar
4. Verify webview loads successfully

**Expected Results:**
- ✅ Extension activates without errors
- ✅ Activity bar icon appears
- ✅ Webview loads with Angular UI
- ✅ No console errors in Developer Tools

### 2. Copilot Availability Detection

**Test Steps:**
1. Navigate to AI Debug module
2. Check Copilot availability indicator
3. Toggle GitHub Copilot extension on/off
4. Refresh and verify indicator changes

**Expected Results:**
- ✅ Shows green checkmark when Copilot is available
- ✅ Shows warning when Copilot is unavailable
- ✅ Fallback message displayed when disabled

**Test Coverage:**
- [x] Copilot enabled and active
- [x] Copilot disabled in settings
- [x] GitHub Copilot extension not installed
- [x] Network connectivity issues

### 3. File Selection Integration

**Test Steps:**
1. Select "Uncommitted Changes" mode
2. Verify git diff is collected
3. Select "Previous Commit" mode
4. Choose a recent commit
5. Select "Branch to Main" mode

**Expected Results:**
- ✅ File changes detected correctly
- ✅ Git diff content available for AI analysis
- ✅ UI updates with selection summary
- ✅ Prerequisites check shows file selection completed

### 4. Test Configuration Integration

**Test Steps:**
1. Choose "Affected Tests" mode
2. Verify affected projects detected
3. Switch to "Specific Project" mode
4. Select multiple projects
5. Load test files for selected projects

**Expected Results:**
- ✅ NX affected detection works
- ✅ Project list populates correctly
- ✅ Test files discovered and countable
- ✅ Test command preview generates correctly

### 5. AI Debug Workflow - Test Failures

**Test Steps:**
1. Create a failing test in the workspace
2. Configure file selection (uncommitted changes)
3. Configure test selection (project with failing test)
4. Click "Run AI Test Debug"
5. Wait for analysis completion

**Expected Results:**
- ✅ Workflow progresses through all phases
- ✅ Tests execute and failures detected
- ✅ Copilot analysis request sent
- ✅ Root cause analysis displayed
- ✅ Specific fixes with file/line numbers
- ✅ Prevention strategies listed
- ✅ New test suggestions provided

**Copilot Integration Points:**
- ✅ Structured JSON prompt sent to Copilot
- ✅ Response parsed correctly
- ✅ UI displays analysis results
- ✅ Error handling for malformed responses

### 6. AI Debug Workflow - All Tests Passing

**Test Steps:**
1. Ensure all tests are passing
2. Configure file selection and test selection
3. Run AI Test Debug workflow
4. Verify success analysis

**Expected Results:**
- ✅ Tests execute successfully
- ✅ False positive analysis requested
- ✅ Suspicious tests identified
- ✅ Mocking issues highlighted
- ✅ Test improvement recommendations
- ✅ New test suggestions based on changes

### 7. Error Handling and Fallbacks

**Test Steps:**
1. Disable GitHub Copilot mid-workflow
2. Test with invalid git repository
3. Test with no NX workspace
4. Test with network connectivity issues
5. Test with very large git diffs

**Expected Results:**
- ✅ Graceful degradation to fallback analysis
- ✅ User-friendly error messages
- ✅ Workflow continues with mock responses
- ✅ No crashes or unhandled exceptions
- ✅ Timeout handling for long operations

### 8. Real-time Communication

**Test Steps:**
1. Monitor browser Developer Tools console
2. Monitor VSCode Output panel
3. Observe message passing during workflow
4. Test concurrent operations

**Expected Results:**
- ✅ Messages flow correctly between webview and extension
- ✅ No message loss or duplication
- ✅ Progress updates in real-time
- ✅ Proper cleanup of subscriptions

### 9. Performance Testing

**Test Steps:**
1. Test with large repository (1000+ files)
2. Test with many affected projects (10+)
3. Test with complex test failures
4. Monitor memory usage during workflows

**Expected Results:**
- ✅ Workflow completes within reasonable time (< 5 minutes)
- ✅ UI remains responsive
- ✅ Memory usage stays reasonable
- ✅ Timeouts prevent hanging

### 10. Integration with VSCode Features

**Test Steps:**
1. Test with VSCode themes (dark/light)
2. Test with different VSCode language settings
3. Test extension settings configuration
4. Test with other extensions active

**Expected Results:**
- ✅ UI adapts to VSCode themes
- ✅ Settings changes take effect
- ✅ No conflicts with other extensions
- ✅ Proper integration with VSCode APIs

## Detailed Test Cases

### Test Case 1: Complete Success Workflow

**Setup:**
- NX workspace with Angular projects
- Some uncommitted changes with passing tests
- GitHub Copilot active

**Steps:**
1. Open AI Debug Context
2. Select "Uncommitted Changes" 
3. Select "Affected Tests"
4. Click "Run AI Test Debug"
5. Wait for completion

**Verification Points:**
- [ ] File changes collected (check git diff length > 0)
- [ ] Affected projects detected (check count > 0)
- [ ] Tests execute (check test results array)
- [ ] Copilot analysis completes (check response structure)
- [ ] UI updates with results (check DOM elements)

### Test Case 2: Failure Analysis Workflow

**Setup:**
- Create a failing test: `expect(true).toBe(false)`
- Commit the change and test

**Steps:**
1. Configure to use the failing test commit
2. Run AI Test Debug workflow
3. Analyze Copilot response

**Expected Copilot Analysis:**
```json
{
  "rootCause": "Assertion error in test expectations",
  "specificFixes": [
    {
      "file": "src/app/test.spec.ts",
      "lineNumber": 10,
      "oldCode": "expect(true).toBe(false)",
      "newCode": "expect(false).toBe(false)",
      "explanation": "Fix incorrect boolean assertion"
    }
  ],
  "preventionStrategies": [
    "Use better test descriptions",
    "Add setup validation"
  ],
  "additionalTests": [
    "Test edge cases",
    "Add integration tests"
  ]
}
```

### Test Case 3: Fallback Behavior

**Setup:**
- Disable GitHub Copilot extension
- Configure normal workflow

**Steps:**
1. Run AI Test Debug with Copilot disabled
2. Verify fallback responses

**Expected Fallback:**
- Root cause: "Copilot integration not available - using fallback analysis"
- Suggestions: Basic recommendations to enable Copilot
- No crashes or errors

## Automated Test Validation

### Unit Test Verification
```bash
# Run all Copilot integration tests
npm test -- --testNamePattern="CopilotIntegration"

# Verify specific scenarios
npm test -- --testNamePattern="(fallback|error|timeout)"
```

### Integration Test Commands
```bash
# Check TypeScript compilation
npx tsc --noEmit

# Build complete extension
npm run compile

# Test in development mode
npm run watch
```

## Performance Benchmarks

### Response Time Targets
- File selection: < 1 second
- Test configuration: < 2 seconds  
- Test execution: < 30 seconds (small projects)
- AI analysis: < 60 seconds (typical case)
- Complete workflow: < 2 minutes

### Memory Usage Targets
- Extension startup: < 50MB
- During workflow: < 100MB
- After completion: < 75MB
- No memory leaks after multiple workflows

## Sign-off Criteria

### Functional Requirements
- [ ] All test scenarios pass
- [ ] Copilot integration works with real GitHub Copilot
- [ ] Fallback behavior functions correctly
- [ ] Error handling prevents crashes
- [ ] Performance meets targets

### Code Quality
- [ ] Unit test coverage > 90%
- [ ] No TypeScript compilation errors
- [ ] No console errors in normal operation
- [ ] Proper error logging implemented

### User Experience
- [ ] UI is responsive and intuitive
- [ ] Progress indicators work correctly
- [ ] Error messages are helpful
- [ ] Documentation is complete

## Known Limitations

### Current Constraints
1. **VSCode Language Model API Dependency**: Requires VSCode 1.85+ and GitHub Copilot extension
2. **NX Workspace Requirement**: Some features only work in NX workspaces
3. **Git Repository Requirement**: File selection requires a git repository
4. **Network Dependency**: AI analysis requires internet connectivity

### Future Enhancements
1. Support for non-NX workspaces
2. Offline analysis capabilities
3. Custom AI model integration
4. Enhanced performance for large repositories

## Troubleshooting Guide

### Common Issues
1. **"Copilot not available"**: Check GitHub Copilot extension and subscription
2. **"No affected projects"**: Ensure git repository has changes
3. **"Test execution failed"**: Verify NX workspace and test scripts
4. **"Timeout errors"**: Check network connectivity and repository size

### Debug Information
- Enable VSCode Developer Tools for webview debugging
- Check VSCode Output panel for extension logs
- Monitor network requests in Developer Tools
- Use `console.log` statements for detailed debugging

This comprehensive test plan ensures the Copilot integration is robust, reliable, and provides real value to developers using the AI Debug Context extension.
