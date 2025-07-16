"use strict";
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppComponent = void 0;
const core_1 = require("@angular/core");
let AppComponent = (() => {
    let _classDecorators = [(0, core_1.Component)({
            selector: 'app-root',
            templateUrl: './app.component.html',
            styleUrls: ['./app.component.css']
        })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var AppComponent = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            AppComponent = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        commandStore;
        projectStore;
        toastService;
        title = 'ai-debug-assistant';
        showAnalytics = (0, core_1.signal)(false);
        constructor(commandStore, projectStore, toastService) {
            this.commandStore = commandStore;
            this.projectStore = projectStore;
            this.toastService = toastService;
        }
        ngOnInit() {
            // Initialize component
        }
        // Utility methods
        refreshData() {
            // Refresh data implementation
        }
        selectAll() {
            // Select all implementation
        }
        showProjectSelector() {
            // Focus on project selector
            const projectElement = document.querySelector('app-project-selector');
            if (projectElement) {
                projectElement.focus();
            }
        }
        refreshProjectData() {
            this.refreshData();
        }
        showProjectAnalytics() {
            this.showAnalytics.set(true);
        }
        copyActionConfiguration() {
            this.toastService.showInfo('Copied', 'Action configuration copied');
        }
        selectAllActions() {
            this.toastService.showInfo('Selected', 'All actions selected');
        }
        copyProgressInfo() {
            this.toastService.showInfo('Copied', 'Progress information copied');
        }
        findInProgress() {
            this.toastService.showInfo('Find', 'Search in progress information');
        }
        copyResults() {
            this.toastService.showInfo('Copied', 'Results copied to clipboard');
        }
        downloadResults() {
            this.toastService.showInfo('Downloaded', 'Results downloaded');
        }
        copyAnalytics() {
            this.toastService.showInfo('Copied', 'Analytics data copied');
        }
        downloadAnalytics() {
            this.toastService.showInfo('Downloaded', 'Analytics data downloaded');
        }
        copySystemInfo() {
            const info = `Workspace: ${this.getWorkspaceInfo()}\nVersion: ${this.getVersionInfo()}`;
            navigator.clipboard.writeText(info);
            this.toastService.showInfo('Copied', 'System information copied');
        }
        selectAllText() {
            this.selectAll();
        }
        // Status helpers
        getStatusClass() {
            const status = this.commandStore.currentStatus();
            return `status-${status}`;
        }
        getStatusIcon() {
            const status = this.commandStore.currentStatus();
            switch (status) {
                case 'idle': return '⚪';
                case 'running': return '🔄';
                case 'queued': return '⏳';
                default: return '⚪';
            }
        }
        getStatusTitle() {
            const status = this.commandStore.currentStatus();
            const activeCount = this.commandStore.activeCommandCount();
            const queueLength = this.commandStore.queueLength();
            switch (status) {
                case 'idle': return 'Ready - No commands running';
                case 'running': return `Running ${activeCount} command${activeCount > 1 ? 's' : ''}`;
                case 'queued': return `${queueLength} command${queueLength > 1 ? 's' : ''} queued`;
                default: return 'Unknown status';
            }
        }
        hasActiveCommands() {
            return this.commandStore.activeCommandCount() > 0;
        }
        getWorkspaceInfo() {
            const workspaceInfo = this.projectStore.workspaceInfo();
            return workspaceInfo ? workspaceInfo.name : 'Unknown workspace';
        }
        getVersionInfo() {
            // This would typically come from package.json or build info
            return '3.4.0';
        }
        getShortcutTitle(description, shortcut) {
            return `${description} (${shortcut})`;
        }
        // Accessibility
        getAppAriaLabel() {
            const projectCount = this.projectStore.projectCount();
            const activeCommands = this.commandStore.activeCommandCount();
            return `AI Debug Assistant. ${projectCount} projects available. ${activeCommands} commands running.`;
        }
    };
    return AppComponent = _classThis;
})();
exports.AppComponent = AppComponent;
//# sourceMappingURL=app.component.js.map