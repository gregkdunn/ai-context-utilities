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
}

export interface WebviewMessage {
    command: 'runCommand' | 'getStatus' | 'openFile' | 'getProjects' | 'setProject';
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
