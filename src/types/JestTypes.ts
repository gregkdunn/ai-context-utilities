/**
 * TypeScript interfaces for Jest output parsing
 * 
 * Provides proper type safety for Jest JSON output parsing,
 * replacing dangerous 'any' types with structured interfaces.
 * 
 * @version 3.0.0
 */

/**
 * Jest test assertion result
 */
export interface JestAssertionResult {
    ancestorTitles: string[];
    duration?: number;
    failureMessages: string[];
    fullName: string;
    location?: {
        column: number;
        line: number;
    };
    status: 'passed' | 'failed' | 'skipped' | 'pending' | 'todo' | 'disabled';
    title: string;
}

/**
 * Jest test file result
 */
export interface JestTestResult {
    assertionResults: JestAssertionResult[];
    coverage?: any; // Coverage can vary significantly
    displayName?: {
        name: string;
        color?: string;
    };
    endTime: number;
    leaks: boolean;
    message: string;
    name: string;
    numFailingTests: number;
    numPassingTests: number;
    numPendingTests?: number;
    numTodoTests: number;
    openHandles: any[];
    perfStats: {
        end: number;
        runtime: number;
        slow: boolean;
        start: number;
    };
    skipped: boolean;
    snapshot: {
        added: number;
        fileDeleted: boolean;
        matched: number;
        total: number;
        unchecked: number;
        unmatched: number;
        updated: number;
    };
    sourceMaps: any;
    startTime: number;
    status: 'passed' | 'failed';
    testFilePath: string;
    testResults: JestAssertionResult[];
}

/**
 * Complete Jest test run result
 */
export interface JestTestRunResult {
    coverageMap?: any;
    numFailedTestSuites?: number;
    numFailedTests: number;
    numPassedTestSuites?: number;
    numPassedTests: number;
    numPendingTestSuites?: number;
    numPendingTests?: number;
    numRuntimeErrorTestSuites?: number;
    numTodoTests?: number;
    numTotalTestSuites?: number;
    numTotalTests: number;
    openHandles?: any[];
    runExecError?: {
        message: string;
        stack: string;
    };
    snapshot?: {
        added: number;
        didUpdate: boolean;
        failure: boolean;
        filesAdded: number;
        filesRemoved: number;
        filesRemovedList: string[];
        filesUnmatched: number;
        filesUpdated: number;
        matched: number;
        total: number;
        unchecked: number;
        uncheckedKeysByFile: any[];
        unmatched: number;
        updated: number;
    };
    startTime?: number;
    success?: boolean;
    testResults: JestTestResult[];
    wasInterrupted?: boolean;
    endTime?: number;
}

/**
 * Type guard to validate Jest test run result structure
 */
export function isValidJestTestRunResult(obj: any): obj is JestTestRunResult {
    if (!obj || typeof obj !== 'object') {
        return false;
    }

    // Check essential fields
    if (typeof obj.numTotalTests !== 'number' ||
        typeof obj.numPassedTests !== 'number' ||
        typeof obj.numFailedTests !== 'number') {
        return false;
    }

    // numPendingTests is optional, default to 0 if missing
    if ('numPendingTests' in obj && typeof obj.numPendingTests !== 'number') {
        return false;
    }

    // Check that testResults is an array
    if (!Array.isArray(obj.testResults)) {
        return false;
    }

    return true;
}

/**
 * Type guard to validate individual test result
 */
export function isValidJestTestResult(obj: any): obj is JestTestResult {
    if (!obj || typeof obj !== 'object') {
        return false;
    }

    // Check required fields
    const requiredFields = ['name', 'status', 'assertionResults'];
    
    for (const field of requiredFields) {
        if (!(field in obj)) {
            return false;
        }
    }

    // Check that assertionResults is an array
    if (!Array.isArray(obj.assertionResults)) {
        return false;
    }

    return true;
}

/**
 * Type guard to validate assertion result
 */
export function isValidJestAssertionResult(obj: any): obj is JestAssertionResult {
    if (!obj || typeof obj !== 'object') {
        return false;
    }

    // Check required fields
    const requiredFields = ['title', 'status', 'failureMessages'];
    
    for (const field of requiredFields) {
        if (!(field in obj)) {
            return false;
        }
    }

    // Check that failureMessages is an array
    if (!Array.isArray(obj.failureMessages)) {
        return false;
    }

    return true;
}

/**
 * Safe parser for Jest JSON output with validation
 */
export function parseJestOutput(jsonString: string): JestTestRunResult {
    let parsed: any;
    
    try {
        parsed = JSON.parse(jsonString);
    } catch (error) {
        throw new Error(`Invalid JSON in Jest output: ${error}`);
    }

    if (!isValidJestTestRunResult(parsed)) {
        throw new Error('Jest output does not match expected structure');
    }

    return parsed;
}