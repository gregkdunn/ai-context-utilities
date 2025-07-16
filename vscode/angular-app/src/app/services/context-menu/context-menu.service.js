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
exports.ContextMenuService = void 0;
const core_1 = require("@angular/core");
const context_menu_component_1 = require("../../components/context-menu/context-menu.component");
let ContextMenuService = (() => {
    let _classDecorators = [(0, core_1.Injectable)({
            providedIn: 'root'
        })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var ContextMenuService = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            ContextMenuService = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        activeMenu = (0, core_1.signal)(null);
        viewContainerRef = null;
        environmentInjector = null;
        // Track if any menu is currently open
        isMenuOpen = (0, core_1.computed)(() => this.activeMenu() !== null);
        constructor() {
            // Global click listener to close menus
            document.addEventListener('click', (event) => {
                if (this.activeMenu()) {
                    this.closeMenu();
                }
            });
            // Global key listener for escape key
            document.addEventListener('keydown', (event) => {
                if (event.key === 'Escape' && this.activeMenu()) {
                    this.closeMenu();
                }
            });
        }
        /**
         * Initialize the service with the application's ViewContainerRef and EnvironmentInjector
         * This should be called from the root component
         */
        initialize(viewContainerRef, environmentInjector) {
            this.viewContainerRef = viewContainerRef;
            this.environmentInjector = environmentInjector;
        }
        /**
         * Show a context menu at the specified position with given items
         */
        showMenu(config) {
            if (!this.viewContainerRef || !this.environmentInjector) {
                console.error('ContextMenuService not initialized. Call initialize() from root component.');
                return;
            }
            // Close any existing menu
            this.closeMenu();
            // Create new menu component
            const menuComponentRef = (0, core_1.createComponent)(context_menu_component_1.ContextMenuComponent, {
                environmentInjector: this.environmentInjector,
                hostElement: document.body
            });
            // Configure the menu
            menuComponentRef.instance.items.set(config.items);
            menuComponentRef.instance.position.set(config.position);
            menuComponentRef.instance.isVisible.set(true);
            // Set up event listeners
            menuComponentRef.instance.itemSelected.subscribe((item) => {
                config.onItemSelected?.(item);
                this.closeMenu();
            });
            menuComponentRef.instance.menuClosed.subscribe(() => {
                config.onMenuClosed?.();
                this.closeMenu();
            });
            // Attach to DOM
            this.viewContainerRef.insert(menuComponentRef.hostView);
            this.activeMenu.set(menuComponentRef);
            // Show the menu
            menuComponentRef.instance.showAt(config.position.x, config.position.y, config.items);
        }
        /**
         * Show menu on right-click event
         */
        showMenuOnRightClick(event, items, onItemSelected, onMenuClosed) {
            event.preventDefault();
            event.stopPropagation();
            this.showMenu({
                items,
                position: { x: event.clientX, y: event.clientY },
                target: event.target,
                onItemSelected,
                onMenuClosed
            });
        }
        /**
         * Close the currently active menu
         */
        closeMenu() {
            const menu = this.activeMenu();
            if (menu) {
                menu.instance.hide();
                menu.destroy();
                this.activeMenu.set(null);
            }
        }
        /**
         * Create common context menu items for commands
         */
        createCommandContextMenu(command, actions) {
            const items = [];
            if (command.status === 'queued' || command.status === 'running') {
                if (actions.execute) {
                    items.push({
                        id: 'execute',
                        label: 'Execute Now',
                        icon: 'codicon codicon-play',
                        shortcut: 'Ctrl+Enter',
                        action: actions.execute
                    });
                }
                if (actions.cancel) {
                    items.push({
                        id: 'cancel',
                        label: 'Cancel',
                        icon: 'codicon codicon-stop',
                        shortcut: 'Ctrl+X',
                        action: actions.cancel
                    });
                }
            }
            if (command.status === 'completed' || command.status === 'error') {
                if (actions.restart) {
                    items.push({
                        id: 'restart',
                        label: 'Restart',
                        icon: 'codicon codicon-refresh',
                        shortcut: 'Ctrl+R',
                        action: actions.restart
                    });
                }
                if (actions.copyOutput) {
                    items.push({
                        id: 'copy-output',
                        label: 'Copy Output',
                        icon: 'codicon codicon-copy',
                        shortcut: 'Ctrl+C',
                        action: actions.copyOutput
                    });
                }
                if (actions.downloadLogs) {
                    items.push({
                        id: 'download-logs',
                        label: 'Download Logs',
                        icon: 'codicon codicon-download',
                        action: actions.downloadLogs
                    });
                }
            }
            if (actions.viewDetails) {
                items.push({
                    id: 'view-details',
                    label: 'View Details',
                    icon: 'codicon codicon-info',
                    shortcut: 'Ctrl+I',
                    action: actions.viewDetails
                });
            }
            if (items.length > 0) {
                items.push({ id: 'separator-1', separator: true });
            }
            if (actions.remove) {
                items.push({
                    id: 'remove',
                    label: 'Remove',
                    icon: 'codicon codicon-trash',
                    shortcut: 'Delete',
                    action: actions.remove
                });
            }
            return items;
        }
        /**
         * Create common context menu items for projects
         */
        createProjectContextMenu(project, actions) {
            const items = [];
            if (actions.selectProject) {
                items.push({
                    id: 'select-project',
                    label: 'Select Project',
                    icon: 'codicon codicon-folder-active',
                    action: actions.selectProject
                });
            }
            if (actions.refreshProject) {
                items.push({
                    id: 'refresh-project',
                    label: 'Refresh',
                    icon: 'codicon codicon-refresh',
                    shortcut: 'F5',
                    action: actions.refreshProject
                });
            }
            items.push({ id: 'separator-1', separator: true });
            if (actions.openFolder) {
                items.push({
                    id: 'open-folder',
                    label: 'Open Folder',
                    icon: 'codicon codicon-folder-opened',
                    action: actions.openFolder
                });
            }
            if (actions.showInExplorer) {
                items.push({
                    id: 'show-in-explorer',
                    label: 'Show in Explorer',
                    icon: 'codicon codicon-file-directory',
                    action: actions.showInExplorer
                });
            }
            if (actions.copyPath) {
                items.push({
                    id: 'copy-path',
                    label: 'Copy Path',
                    icon: 'codicon codicon-copy',
                    action: actions.copyPath
                });
            }
            items.push({ id: 'separator-2', separator: true });
            if (actions.runDebugCommands) {
                items.push({
                    id: 'run-debug-commands',
                    label: 'Run Debug Commands',
                    icon: 'codicon codicon-debug',
                    submenu: [
                        {
                            id: 'run-all-commands',
                            label: 'Run All Commands',
                            icon: 'codicon codicon-run-all',
                            action: actions.runDebugCommands
                        },
                        {
                            id: 'run-selective-commands',
                            label: 'Run Selective Commands',
                            icon: 'codicon codicon-run',
                            action: actions.runDebugCommands
                        }
                    ]
                });
            }
            if (actions.viewAnalytics) {
                items.push({
                    id: 'view-analytics',
                    label: 'View Analytics',
                    icon: 'codicon codicon-graph',
                    action: actions.viewAnalytics
                });
            }
            if (actions.removeProject) {
                items.push({ id: 'separator-3', separator: true });
                items.push({
                    id: 'remove-project',
                    label: 'Remove Project',
                    icon: 'codicon codicon-trash',
                    action: actions.removeProject
                });
            }
            return items;
        }
        /**
         * Create context menu for file operations
         */
        createFileContextMenu(file, actions) {
            const items = [];
            if (actions.openFile) {
                items.push({
                    id: 'open-file',
                    label: 'Open File',
                    icon: 'codicon codicon-file',
                    action: actions.openFile
                });
            }
            if (actions.openWith) {
                items.push({
                    id: 'open-with',
                    label: 'Open With...',
                    icon: 'codicon codicon-open-preview',
                    submenu: [
                        {
                            id: 'open-with-default',
                            label: 'Default Editor',
                            icon: 'codicon codicon-edit',
                            action: actions.openWith
                        },
                        {
                            id: 'open-with-external',
                            label: 'External Editor',
                            icon: 'codicon codicon-link-external',
                            action: actions.openWith
                        }
                    ]
                });
            }
            items.push({ id: 'separator-1', separator: true });
            if (actions.showInExplorer) {
                items.push({
                    id: 'show-in-explorer',
                    label: 'Show in Explorer',
                    icon: 'codicon codicon-file-directory',
                    action: actions.showInExplorer
                });
            }
            if (actions.copyPath) {
                items.push({
                    id: 'copy-path',
                    label: 'Copy Path',
                    icon: 'codicon codicon-copy',
                    action: actions.copyPath
                });
            }
            if (actions.copyContent) {
                items.push({
                    id: 'copy-content',
                    label: 'Copy Content',
                    icon: 'codicon codicon-copy',
                    action: actions.copyContent
                });
            }
            if (actions.download) {
                items.push({
                    id: 'download',
                    label: 'Download',
                    icon: 'codicon codicon-download',
                    action: actions.download
                });
            }
            if (actions.delete) {
                items.push({ id: 'separator-2', separator: true });
                items.push({
                    id: 'delete',
                    label: 'Delete',
                    icon: 'codicon codicon-trash',
                    action: actions.delete
                });
            }
            return items;
        }
        /**
         * Create context menu for general actions
         */
        createGeneralContextMenu(actions) {
            const items = [];
            if (actions.cut) {
                items.push({
                    id: 'cut',
                    label: 'Cut',
                    icon: 'codicon codicon-scissors',
                    shortcut: 'Ctrl+X',
                    action: actions.cut
                });
            }
            if (actions.copy) {
                items.push({
                    id: 'copy',
                    label: 'Copy',
                    icon: 'codicon codicon-copy',
                    shortcut: 'Ctrl+C',
                    action: actions.copy
                });
            }
            if (actions.paste) {
                items.push({
                    id: 'paste',
                    label: 'Paste',
                    icon: 'codicon codicon-clippy',
                    shortcut: 'Ctrl+V',
                    action: actions.paste
                });
            }
            if (actions.selectAll) {
                items.push({
                    id: 'select-all',
                    label: 'Select All',
                    icon: 'codicon codicon-selection',
                    shortcut: 'Ctrl+A',
                    action: actions.selectAll
                });
            }
            if (items.length > 0) {
                items.push({ id: 'separator-1', separator: true });
            }
            if (actions.undo) {
                items.push({
                    id: 'undo',
                    label: 'Undo',
                    icon: 'codicon codicon-discard',
                    shortcut: 'Ctrl+Z',
                    action: actions.undo
                });
            }
            if (actions.redo) {
                items.push({
                    id: 'redo',
                    label: 'Redo',
                    icon: 'codicon codicon-redo',
                    shortcut: 'Ctrl+Y',
                    action: actions.redo
                });
            }
            if (actions.find) {
                items.push({
                    id: 'find',
                    label: 'Find',
                    icon: 'codicon codicon-search',
                    shortcut: 'Ctrl+F',
                    action: actions.find
                });
            }
            if (actions.replace) {
                items.push({
                    id: 'replace',
                    label: 'Replace',
                    icon: 'codicon codicon-replace',
                    shortcut: 'Ctrl+H',
                    action: actions.replace
                });
            }
            return items;
        }
    };
    return ContextMenuService = _classThis;
})();
exports.ContextMenuService = ContextMenuService;
//# sourceMappingURL=context-menu.service.js.map