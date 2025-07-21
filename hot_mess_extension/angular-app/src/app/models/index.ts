export interface CommandExecution {
  id: string;
  action: CommandAction;
  project: string;
  status: 'queued' | 'running' | 'success' | 'error' | 'cancelled';
  startTime: Date;
  endTime?: Date;
  progress: number;
  output: string[];
  error?: string;
  priority: 'low' | 'normal' | 'high';
}

export interface CommandResult {
  id: string;
  action: CommandAction;
  project: string;
  status: 'success' | 'error' | 'cancelled';
  startTime: Date;
  endTime: Date;
  duration: number;
  success: boolean;
  error?: string;
  output: string[];
}

export interface QueuedCommand {
  id: string;
  action: CommandAction;
  project: string;
  priority: 'low' | 'normal' | 'high';
  options: CommandOptions;
  timestamp: Date;
}

export interface CommandOptions {
  quick?: boolean;
  focus?: string;
  noDiff?: boolean;
  priority?: 'low' | 'normal' | 'high';
  timeout?: number;
}

export type CommandAction = 'aiDebug' | 'nxTest' | 'gitDiff' | 'prepareToPush';

export interface CommandState {
  activeCommands: Record<string, CommandExecution>;
  commandHistory: CommandResult[];
  executionQueue: QueuedCommand[];
}

export interface ProjectConfig {
  name: string;
  testCommand?: string;
  buildCommand?: string;
  lintCommand?: string;
  preferences: {
    autoDebug: boolean;
    quickTest: boolean;
    notifications: boolean;
  };
}

export interface NxProject {
  name: string;
  projectType: 'application' | 'library';
  sourceRoot: string;
  root: string;
  targets: Record<string, any>;
}

export interface WorkspaceInfo {
  name: string;
  version: string;
  projects: Record<string, any>;
  defaultProject?: string;
}

export interface ProjectState {
  availableProjects: NxProject[];
  projectConfigurations: Record<string, ProjectConfig>;
  workspaceInfo: WorkspaceInfo | null;
  isLoading: boolean;
  lastUpdated: Date | null;
}

export interface StreamingMessage {
  type: 'output' | 'error' | 'progress' | 'status' | 'complete';
  data: {
    text?: string;
    progress?: number;
    status?: string;
    actionId?: string;
    result?: CommandResult;
  };
  timestamp: Date;
}

export interface WebviewMessage {
  command: string;
  data?: any;
}

export interface ActionButton {
  id: string;
  label: string;
  icon: string;
  enabled: boolean;
  status: 'idle' | 'running' | 'success' | 'error';
  progress?: number;
  lastRun?: Date;
  description?: string;
}

export interface WebviewState {
  projects: NxProject[];
  currentProject?: string;
  actions: Record<string, ActionButton>;
  outputFiles: Record<string, string>;
  isStreaming: boolean;
  currentAction?: string;
  currentOutput: string;
  lastRun?: {
    action: string;
    timestamp: Date;
    success: boolean;
  };
}

export interface ToastMessage {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  duration?: number;
  actions?: ToastAction[];
}

export interface ToastAction {
  label: string;
  action: () => void;
}

export interface ProgressInfo {
  current: number;
  total: number;
  status: string;
  eta?: number;
}
