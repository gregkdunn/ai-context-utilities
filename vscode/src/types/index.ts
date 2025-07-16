// Enhanced types for real-time streaming functionality

export interface NxProject {
    name: string;
    root: string;
    projectType: 'application' | 'library';
    targets?: Record<string, any>;
}

export interface CommandOptions {
    project?: string;
    quick?: boolean;
    fullContext?: boolean;
    noDiff?: boolean;
    focus?: 'tests' | 'types' | 'performance';
    useExpected?: boolean;
    fullOutput?: boolean;
}

export interface CommandResult {
    success: boolean;
    exitCode: number;
    output: string;
    error?: string;
    outputFiles?: string[];
    duration: number;
}

export interface ActionButton {
    id: 'aiDebug' | 'nxTest' | 'gitDiff' | 'prepareToPush';
    label: string;
    icon: string;
    status: 'idle' | 'running' | 'success' | 'error';
    lastRun?: Date;
    enabled: boolean;
    progress?: number; // 0-100 for progress indication
}

// New streaming-related types
export interface StreamingMessage {
    type: 'output' | 'error' | 'progress' | 'status' | 'complete';
    data: {
        text?: string;
        progress?: number;
        status?: string;
        result?: CommandResult;
        actionId?: string;
    };
    timestamp: Date;
}

export interface WebviewMessage {
    command: 'runCommand' | 'getStatus' | 'openFile' | 'getProjects' | 'setProject' | 'cancelCommand' | 'clearOutput';
    data: {
        action?: 'aiDebug' | 'nxTest' | 'gitDiff' | 'prepareToPush';
        project?: string;
        options?: CommandOptions;
        filePath?: string;
    };
}

export interface WebviewState {
    currentProject?: string;
    projects: NxProject[];
    actions: Record<string, ActionButton>;
    outputFiles: Record<string, string>;
    lastRun?: {
        action: string;
        timestamp: Date;
        success: boolean;
    };
    // New streaming state
    isStreaming: boolean;
    currentOutput: string;
    currentAction?: string;
}

export type OutputType = 'ai-debug-context' | 'jest-output' | 'diff' | 'pr-description';

export interface DebugContext {
    testStatus: 'passing' | 'failing' | 'unknown';
    hasFailures: boolean;
    changedFiles: string[];
    lintStatus: 'passed' | 'failed' | 'unknown';
    formatStatus: 'passed' | 'failed' | 'unknown';
}

export interface PRContext {
    testsPassing: boolean;
    lintPassing: boolean;
    formatApplied: boolean;
    changedFiles: string[];
    projectName: string;
}

// Event emitter interface for streaming
export interface StreamingEventEmitter {
    on(event: 'output', listener: (data: string) => void): void;
    on(event: 'error', listener: (data: string) => void): void;
    on(event: 'progress', listener: (progress: number) => void): void;
    on(event: 'status', listener: (status: string) => void): void;
    on(event: 'complete', listener: (result: CommandResult) => void): void;
    emit(event: string, ...args: any[]): boolean;
    removeAllListeners(): void;
}