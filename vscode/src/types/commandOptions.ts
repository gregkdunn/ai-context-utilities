export interface CommandOptions {
    project?: string;
    quick?: boolean;
    fullContext?: boolean;
    noDiff?: boolean;
    focus?: 'tests' | 'types' | 'performance';
    useExpected?: boolean;
    fullOutput?: boolean;
    // Shell runner specific options
    cwd?: string;
    env?: Record<string, string>;
    timeout?: number;
    shell?: boolean;
}