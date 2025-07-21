export interface FlipperBroadPattern {
    type: 'import' | 'method_call' | 'observable' | 'predefined_observable' | 'configuration' | 'flag_literal' | 'conditional' | 'template' | 'injection';
    pattern: RegExp;
    description: string;
    extractFlag: boolean;
    flagIndex?: number;
    flagMapping?: { [key: string]: string };
}

export interface FlipperDetection {
    type: string;
    pattern: string;
    line: number;
    column: number;
    match: string;
    flagName?: string;
    context: string;
}

export interface FlipperFileResult {
    path: string;
    detections: FlipperDetection[];
    changeType: 'added' | 'modified' | 'deleted' | 'renamed';
}

export interface FlipperGitDiffResult {
    files: FlipperFileResult[];
    detectedFlags: string[];
    summary: string;
    qaSection: string;
    detailsSection: string;
}

export interface GitFileChange {
    path: string;
    status: 'added' | 'modified' | 'deleted' | 'renamed';
    content?: string;
}

export interface ParsedGitDiff {
    files: GitFileChange[];
    summary: string;
}

export interface FlipperDetectionResult {
    detections: FlipperDetection[];
    summary: string;
}
