/**
 * User-friendly error messages that provide actionable guidance
 * Part of Phase 1.7 immediate wins
 */

export class UserFriendlyErrors {
    /**
     * Git-related error messages
     */
    static gitNotFound(): string {
        return "Git repository not found. Initialize with 'git init' or open a git project.";
    }

    static noGitChanges(): string {
        return "No git changes found. Make a change to a file and try again.";
    }

    static gitCommandFailed(command: string): string {
        return `Git command failed: ${command}. Check if you're in a git repository and have necessary permissions.`;
    }

    /**
     * Project-related error messages
     */
    static projectNotFound(name: string, available: string[]): string {
        const suggestions = available.length > 0 
            ? ` Available projects: ${available.slice(0, 5).join(', ')}${available.length > 5 ? '...' : ''}`
            : ' Run project discovery to find available projects.';
        return `Project '${name}' not found.${suggestions}`;
    }

    static noProjectsFound(): string {
        return "No projects found in workspace. Make sure you're in an Nx workspace or have project.json files.";
    }

    static projectDiscoveryFailed(): string {
        return "Failed to discover projects. Check workspace structure and try running setup.";
    }

    /**
     * Test execution error messages
     */
    static testsFailed(project: string, failedCount: number, totalCount?: number): string {
        const countText = totalCount ? ` (${failedCount} of ${totalCount})` : ` (${failedCount})`;
        return `${project}: ${failedCount} test${failedCount > 1 ? 's' : ''} failed${countText}. Click for details and options.`;
    }

    static testsTimedOut(project: string, timeoutSeconds: number): string {
        return `${project}: Tests timed out after ${timeoutSeconds}s. Try running a smaller subset or increase timeout.`;
    }

    static nxCommandNotFound(): string {
        return "Nx command not found. Install Nx globally with 'npm install -g nx' or make sure it's in your project dependencies.";
    }

    static testCommandFailed(project: string, command: string): string {
        return `Test command failed for ${project}. Command: ${command}. Check project configuration and dependencies.`;
    }

    /**
     * Workspace and configuration errors
     */
    static workspaceNotFound(): string {
        return "Workspace not found. Open a folder containing a package.json or nx.json file.";
    }

    static nxWorkspaceNotDetected(): string {
        return "Nx workspace not detected. Make sure nx.json exists or run 'npx create-nx-workspace' to create one.";
    }

    static missingDependencies(missing: string[]): string {
        return `Missing dependencies: ${missing.join(', ')}. Run 'npm install' to install them.`;
    }

    /**
     * File system errors
     */
    static fileNotFound(filePath: string): string {
        return `File not found: ${filePath}. Check the path and file permissions.`;
    }

    static directoryNotFound(dirPath: string): string {
        return `Directory not found: ${dirPath}. Check the path and permissions.`;
    }

    static permissionDenied(path: string): string {
        return `Permission denied accessing: ${path}. Check file/directory permissions.`;
    }

    /**
     * Auto-detection specific errors
     */
    static autoDetectionFailed(reason?: string): string {
        const baseMessage = "Auto-detection failed to find projects from changed files.";
        const suggestion = " Try manual project selection or check if your changes are in tracked files.";
        return reason ? `${baseMessage} ${reason}.${suggestion}` : `${baseMessage}${suggestion}`;
    }

    static noChangedFiles(): string {
        return "No changed files detected. Make some changes and save files to run affected tests.";
    }

    /**
     * Command execution errors
     */
    static commandTimeout(command: string, timeoutSeconds: number): string {
        return `Command timed out after ${timeoutSeconds}s: ${command}. Try a more specific command or increase timeout.`;
    }

    static commandNotFound(command: string): string {
        return `Command not found: ${command}. Make sure it's installed and available in PATH.`;
    }

    /**
     * Shell script specific errors (for legacy compatibility)
     */
    static shellScriptNotFound(scriptName: string): string {
        return `Script not found: ${scriptName}. Extension may need reinstalling or updating.`;
    }

    static shellScriptPermissionDenied(scriptName: string): string {
        return `Permission denied for script: ${scriptName}. Check file permissions or try running as administrator.`;
    }

    /**
     * Cache and state errors
     */
    static cacheCorrupted(): string {
        return "Project cache is corrupted. Clear cache and try again.";
    }

    static stateResetRequired(): string {
        return "Extension state needs reset. Clear cache and restart VS Code.";
    }

    /**
     * Helper to extract actionable message from generic error
     */
    static makeActionable(genericError: string, context?: string): string {
        const error = genericError.toLowerCase();
        
        if (error.includes('enoent') || error.includes('no such file')) {
            return context 
                ? `File or directory not found: ${context}. Check the path and try again.`
                : "File or directory not found. Check paths and try again.";
        }
        
        if (error.includes('eacces') || error.includes('permission denied')) {
            return "Permission denied. Check file/directory permissions or run as administrator.";
        }
        
        if (error.includes('eaddrinuse') || error.includes('port') || error.includes('address already in use')) {
            return "Port already in use. Close other applications using the same port or try a different port.";
        }
        
        if (error.includes('timeout') || error.includes('timed out')) {
            return "Operation timed out. Try a smaller scope or increase timeout settings.";
        }
        
        if (error.includes('network') || error.includes('connection')) {
            return "Network connection failed. Check internet connection and proxy settings.";
        }
        
        if (error.includes('cannot find module') || error.includes('not found')) {
            return "Module or command not found. Install missing dependencies and try again.";
        }
        
        // Default fallback with context
        return context 
            ? `${context}: ${genericError}. Check configuration and try again.`
            : `${genericError}. Check configuration and try again.`;
    }
}