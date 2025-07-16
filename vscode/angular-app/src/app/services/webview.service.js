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
exports.WebviewService = void 0;
const core_1 = require("@angular/core");
const rxjs_1 = require("rxjs");
let WebviewService = (() => {
    let _classDecorators = [(0, core_1.Injectable)({
            providedIn: 'root'
        })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var WebviewService = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            WebviewService = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        vscode;
        messageSubject = new rxjs_1.Subject();
        streamingSubject = new rxjs_1.Subject();
        constructor() {
            this.vscode = acquireVsCodeApi();
            this.setupMessageListener();
        }
        setupMessageListener() {
            window.addEventListener('message', (event) => {
                const message = event.data;
                switch (message.command) {
                    case 'updateState':
                        this.messageSubject.next(message);
                        break;
                    case 'streamingUpdate':
                        this.streamingSubject.next(message.message);
                        break;
                    default:
                        this.messageSubject.next(message);
                }
            });
        }
        // Message sending
        sendMessage(command, data) {
            this.vscode.postMessage({
                command,
                data
            });
        }
        // State management
        setState(state) {
            this.vscode.setState(state);
        }
        getState() {
            return this.vscode.getState();
        }
        // Message observables
        onMessage() {
            return this.messageSubject.asObservable();
        }
        onStreamingMessage() {
            return this.streamingSubject.asObservable();
        }
        // Specific message types
        onStateUpdate() {
            return this.messageSubject.asObservable().pipe((0, rxjs_1.filter)(msg => msg.command === 'updateState'), (0, rxjs_1.map)(msg => msg.state));
        }
        // Command execution
        runCommand(action, project, options) {
            this.sendMessage('runCommand', {
                action,
                project,
                options
            });
        }
        cancelCommand(action) {
            this.sendMessage('cancelCommand', { action });
        }
        // Project operations
        getProjects() {
            this.sendMessage('getProjects');
        }
        setProject(project) {
            this.sendMessage('setProject', { project });
        }
        // File operations
        openFile(filePath) {
            this.sendMessage('openFile', { filePath });
        }
        // Status operations
        getStatus() {
            this.sendMessage('getStatus');
        }
        clearOutput() {
            this.sendMessage('clearOutput');
        }
        // Utility methods
        copyToClipboard(text) {
            this.sendMessage('copyToClipboard', { text });
        }
        showNotification(message, type = 'info') {
            this.sendMessage('showNotification', { message, type });
        }
        // Configuration
        getConfiguration(key) {
            this.sendMessage('getConfiguration', { key });
        }
        setConfiguration(key, value) {
            this.sendMessage('setConfiguration', { key, value });
        }
        // Workspace operations
        getWorkspaceInfo() {
            this.sendMessage('getWorkspaceInfo');
        }
        // Debug operations
        enableDebugMode() {
            this.sendMessage('enableDebugMode');
        }
        disableDebugMode() {
            this.sendMessage('disableDebugMode');
        }
        getDebugLogs() {
            this.sendMessage('getDebugLogs');
        }
        // Theme operations
        getCurrentTheme() {
            this.sendMessage('getCurrentTheme');
        }
        onThemeChange() {
            return this.messageSubject.asObservable().pipe((0, rxjs_1.filter)(msg => msg.command === 'themeChanged'), (0, rxjs_1.map)(msg => msg.theme));
        }
        // Extension lifecycle
        onExtensionReady() {
            return this.messageSubject.asObservable().pipe((0, rxjs_1.filter)(msg => msg.command === 'extensionReady'), (0, rxjs_1.map)(() => void 0));
        }
        // Error handling
        reportError(error) {
            this.sendMessage('reportError', {
                error: error.message || error.toString(),
                stack: error.stack,
                timestamp: new Date().toISOString()
            });
        }
        // Performance monitoring
        reportPerformance(metric, value) {
            this.sendMessage('reportPerformance', {
                metric,
                value,
                timestamp: new Date().toISOString()
            });
        }
        // Feature flags
        getFeatureFlags() {
            this.sendMessage('getFeatureFlags');
        }
        onFeatureFlagsUpdate() {
            return this.messageSubject.asObservable().pipe((0, rxjs_1.filter)(msg => msg.command === 'featureFlagsUpdate'), (0, rxjs_1.map)(msg => msg.flags));
        }
        // Telemetry
        trackEvent(event, properties) {
            this.sendMessage('trackEvent', {
                event,
                properties,
                timestamp: new Date().toISOString()
            });
        }
        // Cleanup
        dispose() {
            this.messageSubject.complete();
            this.streamingSubject.complete();
        }
    };
    return WebviewService = _classThis;
})();
exports.WebviewService = WebviewService;
//# sourceMappingURL=webview.service.js.map