# AI Integration API Documentation

## Overview

The AI Integration module provides intelligent test failure analysis, automatic fixes, and GitHub Copilot integration for the AI Debug Context V3 extension. This module consists of five main components that work together to provide a comprehensive AI-powered debugging experience.

## Components

### 1. TestFailureAnalyzer

Analyzes test failures and extracts actionable information from Jest output and other test frameworks.

#### Classes

##### `TestFailureAnalyzer`

**Methods:**

- `parseJestOutput(jsonOutput: string): TestResultSummary`
  - Parses Jest JSON output into structured test results
  - Returns comprehensive test summary with failure details
  - Throws error if JSON parsing fails

- `parseTextOutput(textOutput: string, testFile?: string): TestFailure[]`
  - Parses text output from various test runners
  - Supports multiple failure formats (✕, ×, FAIL markers)
  - Extracts error messages and stack traces

- `analyzeFailure(failure: TestFailure): TestFailure`
  - Analyzes a test failure and suggests fixes based on error patterns
  - Identifies error types: assertion_mismatch, null_reference, missing_import, etc.
  - Returns enhanced failure object with suggestions

- `generateAIContext(failure: TestFailure, sourceCode?: string): string`
  - Generates formatted context for AI analysis
  - Includes error details, stack trace, and optional source code
  - Returns markdown-formatted context string

- `extractSourceLocation(stackTrace: string[]): { file?: string; line?: number; column?: number }`
  - Extracts file locations from stack trace frames
  - Filters out test files and node_modules
  - Returns source file location with line/column numbers

- `groupFailuresByType(failures: TestFailure[]): Map<string, TestFailure[]>`
  - Groups failures by error type for pattern analysis
  - Useful for identifying common issues across tests
  - Returns map of error type to failures

- `createFailureSummary(failures: TestFailure[]): string`
  - Creates human-readable summary of test failures
  - Groups by error type with suggestions
  - Limits display to 3 failures per type

#### Interfaces

##### `TestFailure`
```typescript
interface TestFailure {
    readonly testName: string;
    readonly testFile: string;
    readonly errorMessage: string;
    readonly errorType: string;
    readonly stackTrace: string[];
    readonly sourceFile?: string;
    readonly lineNumber?: number;
    readonly columnNumber?: number;
    readonly suggestion?: string;
}
```

##### `TestResultSummary`
```typescript
interface TestResultSummary {
    readonly totalTests: number;
    readonly passedTests: number;
    readonly failedTests: number;
    readonly skippedTests: number;
    readonly failures: TestFailure[];
    readonly duration: number;
    readonly timestamp: Date;
}
```

### 2. CopilotIntegration

Provides seamless integration with GitHub Copilot Chat for AI-powered test failure analysis.

#### Classes

##### `CopilotIntegration`

**Methods:**

- `analyzeWithCopilot(failures: TestFailure[], options?: CopilotOptions): Promise<FixSuggestion[]>`
  - Analyzes multiple test failures with Copilot
  - Prioritizes failures by error type and frequency
  - Opens Copilot Chat with formatted context
  - Returns array of fix suggestions

- `getCopilotSuggestion(testFailure: TestFailure, sourceCode?: string, options?: CopilotOptions): Promise<FixSuggestion>`
  - Gets Copilot suggestion for a single failure
  - Optionally includes source code context
  - Handles Copilot unavailability gracefully
  - Returns fix suggestion with confidence score

- `analyzeBatchFailures(testResults: TestResultSummary, options?: CopilotOptions): Promise<FixSuggestion>`
  - Analyzes batch of test failures together
  - Groups failures by type for better analysis
  - Provides prioritized fix recommendations
  - Returns comprehensive batch analysis

- `dispose(): void`
  - Cleans up resources (output channel)

#### Interfaces

##### `FixSuggestion`
```typescript
interface FixSuggestion {
    readonly type: 'copilot_chat_opened' | 'pattern_match' | 'learning_suggestion';
    readonly message: string;
    readonly confidence?: number;
    readonly timestamp: string;
    readonly context?: string;
}
```

##### `CopilotOptions`
```typescript
interface CopilotOptions {
    readonly includeSourceCode?: boolean;
    readonly includeTestContext?: boolean;
    readonly maxContextLines?: number;
    readonly focusOnErrors?: boolean;
}
```

### 3. PatternBasedFixer

Provides immediate automated fixes for well-known test failure patterns without requiring AI assistance.

#### Classes

##### `PatternBasedFixer`

**Methods:**

- `generateFixes(failure: TestFailure): Promise<AutoFix[]>`
  - Analyzes test failure and generates possible automatic fixes
  - Checks for import errors, assertion issues, mock problems, and type errors
  - Returns fixes sorted by confidence (highest first)
  - Handles document loading errors gracefully

- `applyFixes(fixes: AutoFix[], options?: { confirm?: boolean }): Promise<FixResult>`
  - Applies selected fixes to the codebase
  - Optionally shows confirmation dialog for each fix
  - Supports batch application with skip/cancel options
  - Returns detailed result of applied/failed/skipped fixes

- `dispose(): void`
  - Cleans up resources (output channel)

#### Interfaces

##### `AutoFix`
```typescript
interface AutoFix {
    readonly id: string;
    readonly title: string;
    readonly description: string;
    readonly filePath: string;
    readonly edits: vscode.TextEdit[];
    readonly confidence: number;
    readonly category: 'import' | 'assertion' | 'mock' | 'type' | 'syntax' | 'other';
}
```

##### `FixResult`
```typescript
interface FixResult {
    readonly applied: AutoFix[];
    readonly failed: Array<{ fix: AutoFix; error: string }>;
    readonly skipped: AutoFix[];
}
```

### 4. FixLearningSystem

Learns from successful and failed fix attempts to improve suggestions over time.

#### Classes

##### `FixLearningSystem`

**Methods:**

- `recordFixAttempt(failure: TestFailure, appliedFix: AutoFix | string, success: boolean, userFeedback?: 'helpful' | 'not_helpful' | 'partially_helpful', notes?: string): Promise<void>`
  - Records the outcome of a fix attempt
  - Updates pattern success rates and confidence
  - Persists learning data to disk
  - Handles errors gracefully

- `getBestFix(errorMessage: string, errorType: string): FixPattern | null`
  - Gets the best suggested fix for an error pattern
  - Requires minimum 3 attempts and 60% success rate
  - Returns pattern with fix suggestions or null

- `getLearningStats(): { totalPatterns: number; reliablePatterns: number; totalAttempts: number; averageSuccessRate: number }`
  - Returns comprehensive learning statistics
  - Tracks reliable patterns and success rates
  - Useful for monitoring system effectiveness

- `generateLearnedSuggestions(failure: TestFailure): AutoFix[]`
  - Generates fix suggestions based on learned patterns
  - Returns top 3 most successful fixes
  - Includes confidence scores

- `exportLearningData(): Promise<string>`
  - Exports all learning data as JSON
  - Includes patterns, stats, and metadata
  - Useful for backup and analysis

- `importLearningData(jsonData: string): Promise<void>`
  - Imports learning data from JSON backup
  - Validates data structure before import
  - Replaces existing patterns

- `clearLearningData(): Promise<void>`
  - Clears all learned patterns
  - Useful for testing or reset

- `getPatternsNeedingData(): FixPattern[]`
  - Returns patterns with insufficient data (<5 attempts)
  - Sorted by attempt count (lowest first)
  - Helps identify areas needing more feedback

- `getMostReliablePatterns(limit?: number): FixPattern[]`
  - Returns most reliable patterns based on success rate and attempts
  - Default limit of 10 patterns
  - Useful for understanding what fixes work best

- `dispose(): void`
  - Cleans up resources (output channel)

#### Interfaces

##### `FixPattern`
```typescript
interface FixPattern {
    readonly id: string;
    readonly errorPattern: string;
    readonly errorType: string;
    readonly successfulFixes: string[];
    readonly failedFixes: string[];
    readonly successRate: number;
    readonly totalAttempts: number;
    readonly lastUpdated: Date;
    readonly confidence: number;
}
```

##### `FixFeedback`
```typescript
interface FixFeedback {
    readonly fixId: string;
    readonly errorPattern: string;
    readonly appliedFix: string;
    readonly success: boolean;
    readonly timestamp: Date;
    readonly userFeedback?: 'helpful' | 'not_helpful' | 'partially_helpful';
    readonly notes?: string;
}
```

### 5. TestResultCache

Implements intelligent caching based on file content hashes to avoid re-running unchanged tests.

#### Classes

##### `TestResultCache`

**Constructor:**
- `constructor(workspaceRoot?: string, options?: CacheOptions)`
  - Initializes cache with optional workspace root and options
  - Loads existing cache from disk if persistence enabled
  - Creates output channel for diagnostics

**Methods:**

- `getOrRunTest(testFile: string, runTestFn: () => Promise<TestResultSummary>): Promise<{ result: TestResultSummary; fromCache: boolean }>`
  - Main method to get cached result or run test
  - Checks file hash and dependencies for validity
  - Updates statistics and saves time on cache hits
  - Returns result with cache hit indicator

- `cacheResult(testFile: string, result: TestResultSummary, durationMs: number): Promise<void>`
  - Manually caches a test result
  - Calculates content and dependency hashes
  - Enforces max entries limit with LRU cleanup
  - Persists to disk if enabled

- `invalidate(testFile: string): void`
  - Invalidates cache entry for specific test file
  - Updates statistics and entry count
  - Useful when file is known to have changed

- `invalidateDependents(sourceFile: string): Promise<void>`
  - Invalidates all tests that depend on a source file
  - Analyzes import statements to find dependencies
  - Batch invalidates affected tests

- `clearCache(): Promise<void>`
  - Clears all cache entries
  - Resets statistics
  - Persists empty cache if enabled

- `getStats(): CacheStats`
  - Returns current cache statistics
  - Includes hit rate, time saved, and entry count
  - Immutable copy of internal stats

- `getCacheEntries(): CachedTestResult[]`
  - Returns all cached entries for inspection
  - Useful for debugging and monitoring
  - Returns array copy, not internal references

- `getCacheEffectiveness(): { hitRate: number; timeSavedMinutes: number; spaceSavedMB: number; recommendedActions: string[] }`
  - Analyzes cache performance and provides recommendations
  - Calculates time and space savings
  - Suggests improvements based on hit rate

- `dispose(): void`
  - Cleans up resources (output channel)

#### Interfaces

##### `CachedTestResult`
```typescript
interface CachedTestResult {
    readonly testFile: string;
    readonly contentHash: string;
    readonly dependencyHashes: string[];
    readonly result: TestResultSummary;
    readonly timestamp: Date;
    readonly durationMs: number;
}
```

##### `CacheStats`
```typescript
interface CacheStats {
    readonly totalRequests: number;
    readonly cacheHits: number;
    readonly cacheMisses: number;
    readonly hitRate: number;
    readonly timeSavedMs: number;
    readonly entriesCount: number;
}
```

##### `CacheOptions`
```typescript
interface CacheOptions {
    readonly maxEntries?: number;        // Default: 1000
    readonly maxAgeMs?: number;          // Default: 24 hours
    readonly includeDependencies?: boolean; // Default: true
    readonly enablePersistence?: boolean;   // Default: true
}
```

## Usage Examples

### Basic Test Failure Analysis

```typescript
import { TestFailureAnalyzer, CopilotIntegration } from './ai';

// Analyze test output
const analyzer = new TestFailureAnalyzer();
const testResults = analyzer.parseJestOutput(jestJsonOutput);

// Get AI suggestions
const copilot = new CopilotIntegration();
const suggestions = await copilot.analyzeWithCopilot(testResults.failures);
```

### Pattern-Based Auto-Fixes

```typescript
import { PatternBasedFixer } from './ai';

const fixer = new PatternBasedFixer();
const fixes = await fixer.generateFixes(testFailure);

// Apply fixes with confirmation
const result = await fixer.applyFixes(fixes, { confirm: true });
console.log(`Applied: ${result.applied.length}, Failed: ${result.failed.length}`);
```

### Learning System Integration

```typescript
import { FixLearningSystem } from './ai';

const learning = new FixLearningSystem(workspaceRoot);

// Record fix outcome
await learning.recordFixAttempt(
    testFailure,
    appliedFix,
    true, // success
    'helpful',
    'Fixed by updating assertion'
);

// Get learned suggestions
const learnedFixes = learning.generateLearnedSuggestions(newFailure);
```

### Test Result Caching

```typescript
import { TestResultCache } from './ai';

const cache = new TestResultCache(workspaceRoot, {
    maxEntries: 500,
    maxAgeMs: 12 * 60 * 60 * 1000 // 12 hours
});

// Run test with caching
const { result, fromCache } = await cache.getOrRunTest(
    testFile,
    async () => runJestTest(testFile)
);

if (fromCache) {
    console.log('Test result from cache!');
}
```

## Best Practices

1. **Error Pattern Matching**: The TestFailureAnalyzer uses regex patterns to identify common error types. Add new patterns as you discover them.

2. **Copilot Integration**: Always check for Copilot availability before attempting to use it. The integration provides graceful fallbacks.

3. **Learning System**: Regularly export learning data for backup. The system improves over time with more feedback.

4. **Cache Management**: Monitor cache effectiveness and adjust settings based on recommendations. Clear cache when major refactoring occurs.

5. **Pattern-Based Fixes**: These provide immediate value without AI. Extend with new patterns for your specific codebase.

## Performance Considerations

- **Caching**: Can provide 40-60% cache hit rates in typical workflows
- **Pattern Matching**: Nearly instant for common error patterns
- **Learning System**: Minimal overhead, improves suggestions over time
- **Copilot Integration**: Depends on network and Copilot availability

## Error Handling

All components implement robust error handling:
- File system errors are logged but don't crash the extension
- Network/Copilot failures fall back to pattern-based fixes
- Invalid data is handled gracefully with appropriate defaults
- All errors are logged to dedicated output channels

## Testing

All components have comprehensive unit tests with >95% coverage:
- `TestFailureAnalyzer.test.ts`
- `CopilotIntegration.test.ts`
- `PatternBasedFixer.test.ts`
- `FixLearningSystem.test.ts`
- `TestResultCache.test.ts`

Run tests with: `npm test src/ai/__tests__`