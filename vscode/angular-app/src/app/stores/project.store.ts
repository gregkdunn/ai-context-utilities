import { computed } from '@angular/core';
import { signalStore, withState, withMethods, withComputed } from '@ngrx/signals';
import { 
  ProjectState, 
  NxProject, 
  ProjectConfig, 
  WorkspaceInfo 
} from '../models';

const initialProjectState: ProjectState = {
  availableProjects: [],
  projectConfigurations: {},
  workspaceInfo: null,
  isLoading: false,
  lastUpdated: null
};

export const ProjectStore = signalStore(
  { providedIn: 'root' },
  withState(initialProjectState),
  withComputed(({ availableProjects, projectConfigurations, workspaceInfo, lastUpdated }) => ({
    // Project organization
    projectNames: computed(() => availableProjects().map(p => p.name)),
    
    configuredProjects: computed(() => 
      availableProjects().filter(p => projectConfigurations()[p.name])
    ),
    
    unconfiguredProjects: computed(() => 
      availableProjects().filter(p => !projectConfigurations()[p.name])
    ),
    
    // Project categorization
    projectsByType: computed(() => {
      const projects = availableProjects();
      return projects.reduce((acc, project) => {
        const type = project.projectType || 'unknown';
        if (!acc[type]) acc[type] = [];
        acc[type].push(project);
        return acc;
      }, {} as Record<string, NxProject[]>);
    }),
    
    // Applications and libraries
    applications: computed(() => 
      availableProjects().filter(p => p.projectType === 'application')
    ),
    
    libraries: computed(() => 
      availableProjects().filter(p => p.projectType === 'library')
    ),
    
    // Project statistics
    projectCount: computed(() => availableProjects().length),
    applicationCount: computed(() => 
      availableProjects().filter(p => p.projectType === 'application').length
    ),
    libraryCount: computed(() => 
      availableProjects().filter(p => p.projectType === 'library').length
    ),
    
    // Data freshness
    hasProjects: computed(() => availableProjects().length > 0),
    
    isStale: computed(() => {
      const updated = lastUpdated();
      if (!updated) return true;
      return Date.now() - updated.getTime() > 300000; // 5 minutes
    }),
    
    // Workspace analysis
    workspaceName: computed(() => workspaceInfo()?.name || 'Unknown'),
    workspaceVersion: computed(() => workspaceInfo()?.version || ''),
    
    // Project configuration analysis
    configurationCoverage: computed(() => {
      const total = availableProjects().length;
      const configured = Object.keys(projectConfigurations()).length;
      return total > 0 ? (configured / total) * 100 : 0;
    }),
    
    // Projects with specific capabilities
    projectsWithTests: computed(() => 
      availableProjects().filter(p => p.targets?.test)
    ),
    
    projectsWithBuild: computed(() => 
      availableProjects().filter(p => p.targets?.build)
    ),
    
    projectsWithLint: computed(() => 
      availableProjects().filter(p => p.targets?.lint)
    ),
    
    projectsWithServe: computed(() => 
      availableProjects().filter(p => p.targets?.serve)
    ),
    
    // Default project detection
    defaultProject: computed(() => {
      const workspace = workspaceInfo();
      if (workspace?.defaultProject) {
        return availableProjects().find(p => p.name === workspace.defaultProject);
      }
      
      // Fallback to first application
      const apps = availableProjects().filter(p => p.projectType === 'application');
      return apps.length > 0 ? apps[0] : null;
    }),
    
    // Project search and filtering
    projectsByPattern: computed(() => (pattern: string) => {
      const lower = pattern.toLowerCase();
      return availableProjects().filter(p => 
        p.name.toLowerCase().includes(lower) ||
        p.projectType.toLowerCase().includes(lower) ||
        p.sourceRoot.toLowerCase().includes(lower)
      );
    })
  })),
  withMethods((store) => ({
    // Project loading
    loadProjects(projects: NxProject[], workspaceInfo: WorkspaceInfo) {
      store.update({
        availableProjects: projects,
        workspaceInfo,
        isLoading: false,
        lastUpdated: new Date()
      });
    },
    
    // Loading state management
    setLoading(isLoading: boolean) {
      store.update({ isLoading });
    },
    
    // Project configuration
    updateProjectConfig(projectName: string, config: ProjectConfig) {
      store.update(state => ({
        projectConfigurations: {
          ...state.projectConfigurations,
          [projectName]: config
        }
      }));
    },
    
    // Batch configuration updates
    updateMultipleConfigs(configs: Record<string, ProjectConfig>) {
      store.update(state => ({
        projectConfigurations: {
          ...state.projectConfigurations,
          ...configs
        }
      }));
    },
    
    // Configuration removal
    removeProjectConfig(projectName: string) {
      store.update(state => {
        const { [projectName]: removed, ...remaining } = state.projectConfigurations;
        return {
          projectConfigurations: remaining
        };
      });
    },
    
    // Project refresh
    refreshProjects() {
      store.update({ isLoading: true });
      // Service will handle the actual refresh
    },
    
    // Project addition (for dynamic workspaces)
    addProject(project: NxProject) {
      store.update(state => {
        const exists = state.availableProjects.some(p => p.name === project.name);
        if (exists) return state;
        
        return {
          availableProjects: [...state.availableProjects, project].sort((a, b) => 
            a.name.localeCompare(b.name)
          ),
          lastUpdated: new Date()
        };
      });
    },
    
    // Project removal
    removeProject(projectName: string) {
      store.update(state => {
        const { [projectName]: removedConfig, ...remainingConfigs } = state.projectConfigurations;
        
        return {
          availableProjects: state.availableProjects.filter(p => p.name !== projectName),
          projectConfigurations: remainingConfigs,
          lastUpdated: new Date()
        };
      });
    },
    
    // Project updates
    updateProject(projectName: string, updates: Partial<NxProject>) {
      store.update(state => ({
        availableProjects: state.availableProjects.map(p => 
          p.name === projectName ? { ...p, ...updates } : p
        ),
        lastUpdated: new Date()
      }));
    },
    
    // Workspace info updates
    updateWorkspaceInfo(workspaceInfo: WorkspaceInfo) {
      store.update({ workspaceInfo });
    },
    
    // Utility methods
    getProjectByName(name: string): NxProject | undefined {
      return store.availableProjects().find(p => p.name === name);
    },
    
    getProjectConfig(name: string): ProjectConfig | undefined {
      return store.projectConfigurations()[name];
    },
    
    hasProjectConfig(name: string): boolean {
      return !!store.projectConfigurations()[name];
    },
    
    // Project capability checks
    canRunTests(projectName: string): boolean {
      const project = store.availableProjects().find(p => p.name === projectName);
      return !!project?.targets?.test;
    },
    
    canBuild(projectName: string): boolean {
      const project = store.availableProjects().find(p => p.name === projectName);
      return !!project?.targets?.build;
    },
    
    canLint(projectName: string): boolean {
      const project = store.availableProjects().find(p => p.name === projectName);
      return !!project?.targets?.lint;
    },
    
    canServe(projectName: string): boolean {
      const project = store.availableProjects().find(p => p.name === projectName);
      return !!project?.targets?.serve;
    },
    
    // Default configuration creator
    createDefaultConfig(projectName: string): ProjectConfig {
      const project = store.availableProjects().find(p => p.name === projectName);
      if (!project) {
        throw new Error(`Project ${projectName} not found`);
      }
      
      return {
        name: projectName,
        testCommand: project.targets?.test ? 'test' : undefined,
        buildCommand: project.targets?.build ? 'build' : undefined,
        lintCommand: project.targets?.lint ? 'lint' : undefined,
        preferences: {
          autoDebug: false,
          quickTest: false,
          notifications: true
        }
      };
    },
    
    // Bulk operations
    initializeAllConfigs() {
      store.update(state => {
        const newConfigs: Record<string, ProjectConfig> = {};
        
        state.availableProjects.forEach(project => {
          if (!state.projectConfigurations[project.name]) {
            newConfigs[project.name] = {
              name: project.name,
              testCommand: project.targets?.test ? 'test' : undefined,
              buildCommand: project.targets?.build ? 'build' : undefined,
              lintCommand: project.targets?.lint ? 'lint' : undefined,
              preferences: {
                autoDebug: false,
                quickTest: false,
                notifications: true
              }
            };
          }
        });
        
        return {
          projectConfigurations: {
            ...state.projectConfigurations,
            ...newConfigs
          }
        };
      });
    },
    
    // Reset operations
    resetProjects() {
      store.update({
        availableProjects: [],
        projectConfigurations: {},
        workspaceInfo: null,
        isLoading: false,
        lastUpdated: null
      });
    },
    
    // Additional methods for app component
    setProjects(projects: NxProject[]) {
      store.update(state => ({
        ...state,
        availableProjects: projects,
        lastUpdated: new Date()
      }));
    },
    
    setWorkspaceInfo(workspaceInfo: WorkspaceInfo) {
      store.update(state => ({
        ...state,
        workspaceInfo
      }));
    },
    
    // Configuration validation
    validateConfiguration(projectName: string): boolean {
      const project = store.availableProjects().find(p => p.name === projectName);
      const config = store.projectConfigurations()[projectName];
      
      if (!project || !config) return false;
      
      // Check if configured commands actually exist
      if (config.testCommand && !project.targets?.[config.testCommand]) return false;
      if (config.buildCommand && !project.targets?.[config.buildCommand]) return false;
      if (config.lintCommand && !project.targets?.[config.lintCommand]) return false;
      
      return true;
    }
  }))
);
