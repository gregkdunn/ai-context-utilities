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
exports.CommandService = void 0;
const core_1 = require("@angular/core");
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const webview_service_1 = require("./webview.service");
const command_store_1 = require("../stores/command.store");
const project_store_1 = require("../stores/project.store");
let CommandService = (() => {
    let _classDecorators = [(0, core_1.Injectable)({
            providedIn: 'root'
        })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var CommandService = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            CommandService = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        webviewService = (0, core_1.inject)(webview_service_1.WebviewService);
        commandStore = (0, core_1.inject)(command_store_1.CommandStore);
        projectStore = (0, core_1.inject)(project_store_1.ProjectStore);
        destroy$ = new rxjs_1.Subject();
        maxConcurrentCommands = 3;
        commandTimeout = 300000; // 5 minutes
        constructor() {
            this.setupStreamingHandlers();
            this.setupCommandQueue();
            this.setupErrorHandling();
        }
        // Command execution
        async executeCommand(action, project, options = {}) {
            try {
                // Validate project
                if (!this.projectStore.getProjectByName(project)) {
                    throw new Error(`Project '${project}' not found`);
                }
                // Create command execution
                const commandId = this.generateCommandId();
                const queuedCommand = {
                    id: commandId,
                    action,
                    project,
                    priority: options.priority || 'normal',
                    options,
                    timestamp: new Date()
                };
                // Check if we can execute immediately or need to queue
                if (this.commandStore.activeCommandCount() < this.maxConcurrentCommands) {
                    await this.startCommandExecution(queuedCommand);
                }
                else {
                    this.commandStore.queueCommand(queuedCommand);
                    this.notifyCommandQueued(queuedCommand);
                }
            }
            catch (error) {
                console.error('Error executing command:', error);
                this.webviewService.reportError(error);
                throw error;
            }
        }
        // Command cancellation
        cancelCommand(commandId) {
            // Check if command is active
            const activeCommand = this.commandStore.getCommandById(commandId);
            if (activeCommand) {
                this.commandStore.cancelCommand(commandId);
                this.webviewService.cancelCommand(activeCommand.action);
                return;
            }
            // Check if command is queued
            this.commandStore.removeFromQueue(commandId);
        }
        // Cancel all commands
        cancelAllCommands() {
            this.commandStore.cancelAllCommands();
            this.webviewService.cancelCommand();
        }
        // Retry failed command
        retryCommand(commandId) {
            const failedCommand = this.commandStore.getCommandFromHistory(commandId);
            if (!failedCommand || failedCommand.status === 'success') {
                return;
            }
            this.executeCommand(failedCommand.action, failedCommand.project, { priority: 'normal' });
        }
        // Command queue management
        setupCommandQueue() {
            // Process queue when commands complete
            (0, rxjs_1.combineLatest)([
                this.commandStore.activeCommandCount,
                this.commandStore.queueLength
            ]).pipe((0, operators_1.filter)(([activeCount, queueLength]) => activeCount < this.maxConcurrentCommands && queueLength > 0), (0, operators_1.debounceTime)(100), (0, operators_1.takeUntil)(this.destroy$)).subscribe(async () => {
                await this.processCommandQueue();
            });
        }
        async processCommandQueue() {
            const queueByPriority = this.commandStore.queueByPriority();
            const availableSlots = this.maxConcurrentCommands - this.commandStore.activeCommandCount();
            if (availableSlots <= 0)
                return;
            // Process high priority commands first
            const commandsToExecute = [
                ...queueByPriority.high,
                ...queueByPriority.normal,
                ...queueByPriority.low
            ].slice(0, availableSlots);
            for (const queuedCommand of commandsToExecute) {
                await this.startCommandExecution(queuedCommand);
            }
        }
        // Command execution lifecycle
        async startCommandExecution(queuedCommand) {
            const execution = {
                id: queuedCommand.id,
                action: queuedCommand.action,
                project: queuedCommand.project,
                status: 'running',
                startTime: new Date(),
                progress: 0,
                output: [],
                priority: queuedCommand.priority
            };
            // Add to active commands
            this.commandStore.startCommand(execution);
            // Set up timeout
            const timeoutTimer = (0, rxjs_1.timer)(this.commandTimeout).subscribe(() => {
                this.handleCommandTimeout(execution.id);
            });
            try {
                // Execute command via webview
                this.webviewService.runCommand(execution.action, execution.project, queuedCommand.options);
                // Track execution performance
                this.webviewService.trackEvent('command_started', {
                    action: execution.action,
                    project: execution.project,
                    priority: execution.priority
                });
            }
            catch (error) {
                timeoutTimer.unsubscribe();
                this.handleCommandError(execution.id, error);
            }
        }
        // Streaming message handling
        setupStreamingHandlers() {
            this.webviewService.onStreamingMessage().pipe((0, operators_1.takeUntil)(this.destroy$)).subscribe((message) => {
                this.handleStreamingMessage(message);
            });
        }
        handleStreamingMessage(message) {
            const { type, data } = message;
            switch (type) {
                case 'output':
                    if (data.actionId) {
                        this.commandStore.updateProgress(data.actionId, this.commandStore.getCommandById(data.actionId)?.progress || 0, data.text);
                    }
                    break;
                case 'progress':
                    if (data.actionId && typeof data.progress === 'number') {
                        this.commandStore.updateProgress(data.actionId, data.progress);
                    }
                    break;
                case 'error':
                    if (data.actionId) {
                        this.handleCommandError(data.actionId, new Error(data.text));
                    }
                    break;
                case 'complete':
                    if (data.actionId && data.result) {
                        this.handleCommandComplete(data.actionId, data.result);
                    }
                    break;
                case 'status':
                    // Handle status updates
                    break;
            }
        }
        // Command completion handling
        handleCommandComplete(commandId, result) {
            this.commandStore.completeCommand(commandId, result);
            // Track completion
            this.webviewService.trackEvent('command_completed', {
                action: result.action,
                project: result.project,
                success: result.success,
                duration: result.duration
            });
            // Show notification if enabled
            this.showCommandNotification(result);
        }
        // Error handling
        setupErrorHandling() {
            // Handle webview errors
            this.webviewService.onMessage().pipe((0, operators_1.filter)(msg => msg.command === 'error'), (0, operators_1.takeUntil)(this.destroy$)).subscribe((errorMsg) => {
                this.handleGlobalError(errorMsg.error);
            });
        }
        handleCommandError(commandId, error) {
            const command = this.commandStore.getCommandById(commandId);
            if (!command)
                return;
            const result = {
                ...command,
                status: 'error',
                endTime: new Date(),
                duration: Date.now() - command.startTime.getTime(),
                success: false,
                error: error.message || error.toString()
            };
            this.commandStore.completeCommand(commandId, result);
            // Track error
            this.webviewService.trackEvent('command_error', {
                action: command.action,
                project: command.project,
                error: result.error,
                duration: result.duration
            });
            this.webviewService.reportError(error);
        }
        handleCommandTimeout(commandId) {
            const command = this.commandStore.getCommandById(commandId);
            if (!command)
                return;
            const result = {
                ...command,
                status: 'error',
                endTime: new Date(),
                duration: this.commandTimeout,
                success: false,
                error: 'Command timed out'
            };
            this.commandStore.completeCommand(commandId, result);
            // Track timeout
            this.webviewService.trackEvent('command_timeout', {
                action: command.action,
                project: command.project,
                duration: this.commandTimeout
            });
            this.webviewService.showNotification(`Command "${command.action}" timed out after ${this.commandTimeout / 1000}s`, 'warning');
        }
        handleGlobalError(error) {
            console.error('Global error:', error);
            this.webviewService.reportError(error);
        }
        // Notifications
        showCommandNotification(result) {
            const { action, project, success, duration } = result;
            const durationStr = `${Math.round(duration / 1000)}s`;
            if (success) {
                this.webviewService.showNotification(`✅ ${action} completed successfully for ${project} (${durationStr})`, 'info');
            }
            else {
                this.webviewService.showNotification(`❌ ${action} failed for ${project} (${durationStr})`, 'error');
            }
        }
        notifyCommandQueued(command) {
            this.webviewService.showNotification(`⏳ Command "${command.action}" queued for ${command.project}`, 'info');
        }
        // Utility methods
        generateCommandId() {
            return `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        }
        // Public query methods
        getCommandHistory() {
            return this.commandStore.commandHistory;
        }
        getActiveCommands() {
            return this.commandStore.activeCommands;
        }
        getExecutionQueue() {
            return this.commandStore.executionQueue;
        }
        getCommandStats() {
            return (0, rxjs_1.combineLatest)([
                this.commandStore.successRate,
                this.commandStore.averageExecutionTime,
                this.commandStore.commandHistory,
                this.commandStore.activeCommandCount,
                this.commandStore.queueLength
            ]).pipe((0, operators_1.map)(([successRate, averageTime, history, activeCount, queueLength]) => ({
                successRate,
                averageTime,
                totalExecuted: history.length,
                activeCount,
                queueLength
            })));
        }
        // Project-specific command methods
        getProjectCommands(projectName) {
            return this.commandStore.commandsByProject.pipe((0, operators_1.map)(byProject => byProject[projectName] || []));
        }
        getProjectSuccessRate(projectName) {
            return this.getProjectCommands(projectName).pipe((0, operators_1.map)(commands => {
                if (commands.length === 0)
                    return 0;
                const successful = commands.filter(cmd => cmd.status === 'success').length;
                return (successful / commands.length) * 100;
            }));
        }
        // Action-specific methods
        getActionStats(action) {
            return this.commandStore.commandsByAction.pipe((0, operators_1.map)(byAction => {
                const actionCommands = byAction[action] || [];
                const totalRuns = actionCommands.length;
                if (totalRuns === 0) {
                    return { successRate: 0, averageTime: 0, totalRuns: 0 };
                }
                const successful = actionCommands.filter(cmd => cmd.status === 'success').length;
                const successRate = (successful / totalRuns) * 100;
                const completedCommands = actionCommands.filter(cmd => cmd.endTime);
                const averageTime = completedCommands.length > 0
                    ? completedCommands.reduce((sum, cmd) => sum + cmd.duration, 0) / completedCommands.length
                    : 0;
                return { successRate, averageTime, totalRuns };
            }));
        }
        // Cleanup
        dispose() {
            this.destroy$.next();
            this.destroy$.complete();
        }
    };
    return CommandService = _classThis;
})();
exports.CommandService = CommandService;
//# sourceMappingURL=command.service.js.map