"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectStore = void 0;
const core_1 = require("@angular/core");
const signals_1 = require("@ngrx/signals");
const initialProjectState = {
    availableProjects: [],
    projectConfigurations: {},
    workspaceInfo: null,
    isLoading: false,
    lastUpdated: null
};
exports.ProjectStore = (0, signals_1.signalStore)({ providedIn: 'root' }, (0, signals_1.withState)(initialProjectState), (0, signals_1.withComputed)(({ availableProjects, projectConfigurations, workspaceInfo, lastUpdated }) => ({
    // Project organization
    projectNames: (0, core_1.computed)(() => availableProjects().map(p => p.name)),
    configuredProjects: (0, core_1.computed)(() => availableProjects().filter(p => projectConfigurations()[p.name])),
    unconfiguredProjects: (0, core_1.computed)(() => availableProjects().filter(p => !projectConfigurations()[p.name])),
    // Project categorization
    projectsByType: (0, core_1.computed)(() => {
        const projects = availableProjects();
        return projects.reduce((acc, project) => {
            const type = project.projectType || 'unknown';
            if (!acc[type])
                acc[type] = [];
            acc[type].push(project);
            return acc;
        }, {});
    }),
    // Applications and libraries
    applications: (0, core_1.computed)(() => availableProjects().filter(p => p.projectType === 'application')),
    libraries: (0, core_1.computed)(() => availableProjects().filter(p => p.projectType === 'library')),
    // Project statistics
    projectCount: (0, core_1.computed)(() => availableProjects().length),
    applicationCount: (0, core_1.computed)(() => availableProjects().filter(p => p.projectType === 'application').length),
    libraryCount: (0, core_1.computed)(() => availableProjects().filter(p => p.projectType === 'library').length),
    // Data freshness
    hasProjects: (0, core_1.computed)(() => availableProjects().length > 0),
    isStale: (0, core_1.computed)(() => {
        const updated = lastUpdated();
        if (!updated)
            return true;
        return Date.now() - updated.getTime() > 300000; // 5 minutes
    }),
    // Workspace analysis
    workspaceName: (0, core_1.computed)(() => workspaceInfo()?.name || 'Unknown'),
    workspaceVersion: (0, core_1.computed)(() => workspaceInfo()?.version || ''),
    // Project configuration analysis
    configurationCoverage: (0, core_1.computed)(() => {
        const total = availableProjects().length;
        const configured = Object.keys(projectConfigurations()).length;
        return total > 0 ? (configured / total) * 100 : 0;
    }),
    // Projects with specific capabilities
    projectsWithTests: (0, core_1.computed)(() => availableProjects().filter(p => p.targets?.test)),
    projectsWithBuild: (0, core_1.computed)(() => availableProjects().filter(p => p.targets?.build)),
    projectsWithLint: (0, core_1.computed)(() => availableProjects().filter(p => p.targets?.lint)),
    projectsWithServe: (0, core_1.computed)(() => availableProjects().filter(p => p.targets?.serve)),
    // Default project detection
    defaultProject: (0, core_1.computed)(() => {
        const workspace = workspaceInfo();
        if (workspace?.defaultProject) {
            return availableProjects().find(p => p.name === workspace.defaultProject);
        }
        // Fallback to first application
        const apps = availableProjects().filter(p => p.projectType === 'application');
        return apps.length > 0 ? apps[0] : null;
    }),
    // Project search and filtering
    projectsByPattern: (0, core_1.computed)(() => (pattern) => {
        const lower = pattern.toLowerCase();
        return availableProjects().filter(p => p.name.toLowerCase().includes(lower) ||
            p.projectType.toLowerCase().includes(lower) ||
            p.sourceRoot.toLowerCase().includes(lower));
    })
})), (0, signals_1.withMethods)((store) => ({
    // Project loading
    loadProjects(projects, workspaceInfo) {
        store.update({
            availableProjects: projects,
            workspaceInfo,
            isLoading: false,
            lastUpdated: new Date()
        });
    },
    // Loading state management
    setLoading(isLoading) {
        store.update({ isLoading });
    },
    // Project configuration
    updateProjectConfig(projectName, config) {
        store.update(state => ({
            projectConfigurations: {
                ...state.projectConfigurations,
                [projectName]: config
            }
        }));
    },
    // Batch configuration updates
    updateMultipleConfigs(configs) {
        store.update(state => ({
            projectConfigurations: {
                ...state.projectConfigurations,
                ...configs
            }
        }));
    },
    // Configuration removal
    removeProjectConfig(projectName) {
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
    addProject(project) {
        store.update(state => {
            const exists = state.availableProjects.some(p => p.name === project.name);
            if (exists)
                return state;
            return {
                availableProjects: [...state.availableProjects, project].sort((a, b) => a.name.localeCompare(b.name)),
                lastUpdated: new Date()
            };
        });
    },
    // Project removal
    removeProject(projectName) {
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
    updateProject(projectName, updates) {
        store.update(state => ({
            availableProjects: state.availableProjects.map(p => p.name === projectName ? { ...p, ...updates } : p),
            lastUpdated: new Date()
        }));
    },
    // Workspace info updates
    updateWorkspaceInfo(workspaceInfo) {
        store.update({ workspaceInfo });
    },
    // Utility methods
    getProjectByName(name) {
        return store.availableProjects().find(p => p.name === name);
    },
    getProjectConfig(name) {
        return store.projectConfigurations()[name];
    },
    hasProjectConfig(name) {
        return !!store.projectConfigurations()[name];
    },
    // Project capability checks
    canRunTests(projectName) {
        const project = store.availableProjects().find(p => p.name === projectName);
        return !!project?.targets?.test;
    },
    canBuild(projectName) {
        const project = store.availableProjects().find(p => p.name === projectName);
        return !!project?.targets?.build;
    },
    canLint(projectName) {
        const project = store.availableProjects().find(p => p.name === projectName);
        return !!project?.targets?.lint;
    },
    canServe(projectName) {
        const project = store.availableProjects().find(p => p.name === projectName);
        return !!project?.targets?.serve;
    },
    // Default configuration creator
    createDefaultConfig(projectName) {
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
            const newConfigs = {};
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
    // Configuration validation
    validateConfiguration(projectName) {
        const project = store.availableProjects().find(p => p.name === projectName);
        const config = store.projectConfigurations()[projectName];
        if (!project || !config)
            return false;
        // Check if configured commands actually exist
        if (config.testCommand && !project.targets?.[config.testCommand])
            return false;
        if (config.buildCommand && !project.targets?.[config.buildCommand])
            return false;
        if (config.lintCommand && !project.targets?.[config.lintCommand])
            return false;
        return true;
    }
})));
//# sourceMappingURL=project.store.js.map