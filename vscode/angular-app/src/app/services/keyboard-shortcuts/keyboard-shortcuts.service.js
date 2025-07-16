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
exports.KeyboardShortcutsService = void 0;
const core_1 = require("@angular/core");
let KeyboardShortcutsService = (() => {
    let _classDecorators = [(0, core_1.Injectable)({
            providedIn: 'root'
        })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var KeyboardShortcutsService = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            KeyboardShortcutsService = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        ngZone;
        shortcuts = (0, core_1.signal)([]);
        enabled = (0, core_1.signal)(true);
        activeContext = (0, core_1.signal)('global');
        pressedKeys = (0, core_1.signal)(new Set());
        // Computed properties for organized shortcuts
        shortcutCategories = (0, core_1.computed)(() => {
            const categories = new Map();
            this.shortcuts().forEach(shortcut => {
                if (!categories.has(shortcut.category)) {
                    categories.set(shortcut.category, []);
                }
                categories.get(shortcut.category).push(shortcut);
            });
            return Array.from(categories.entries()).map(([id, shortcuts]) => ({
                id,
                name: this.getCategoryDisplayName(id),
                shortcuts: shortcuts.sort((a, b) => a.description.localeCompare(b.description))
            }));
        });
        enabledShortcuts = (0, core_1.computed)(() => this.shortcuts().filter(s => s.enabled !== false));
        constructor(ngZone) {
            this.ngZone = ngZone;
            this.setupEventListeners();
            this.registerDefaultShortcuts();
        }
        setupEventListeners() {
            this.ngZone.runOutsideAngular(() => {
                document.addEventListener('keydown', (event) => {
                    if (this.enabled()) {
                        this.handleKeyDown(event);
                    }
                });
                document.addEventListener('keyup', (event) => {
                    this.handleKeyUp(event);
                });
                // Track focus changes to update context
                document.addEventListener('focusin', (event) => {
                    this.updateContext(event.target);
                });
            });
        }
        handleKeyDown(event) {
            const key = event.key.toLowerCase();
            const pressedKeys = new Set(this.pressedKeys());
            pressedKeys.add(key);
            this.pressedKeys.set(pressedKeys);
            // Find matching shortcuts
            const matchingShortcuts = this.findMatchingShortcuts(event);
            if (matchingShortcuts.length > 0) {
                // Take the first matching shortcut (most specific)
                const shortcut = matchingShortcuts[0];
                // Prevent default browser behavior
                event.preventDefault();
                event.stopPropagation();
                // Execute the action in Angular zone
                this.ngZone.run(() => {
                    shortcut.action();
                });
            }
        }
        handleKeyUp(event) {
            const key = event.key.toLowerCase();
            const pressedKeys = new Set(this.pressedKeys());
            pressedKeys.delete(key);
            this.pressedKeys.set(pressedKeys);
        }
        findMatchingShortcuts(event) {
            const key = event.key.toLowerCase();
            const context = this.activeContext();
            return this.enabledShortcuts().filter(shortcut => {
                // Check if shortcut matches the current context
                if (!shortcut.global && context !== 'global') {
                    // Context-specific shortcuts need to match the current context
                    // This can be extended to support multiple contexts per shortcut
                }
                // Check key match
                if (shortcut.key.toLowerCase() !== key) {
                    return false;
                }
                // Check modifier keys
                if (!!shortcut.ctrlKey !== event.ctrlKey)
                    return false;
                if (!!shortcut.altKey !== event.altKey)
                    return false;
                if (!!shortcut.shiftKey !== event.shiftKey)
                    return false;
                if (!!shortcut.metaKey !== event.metaKey)
                    return false;
                return true;
            });
        }
        updateContext(element) {
            // Determine context based on focused element
            const context = this.determineContext(element);
            this.activeContext.set(context);
        }
        determineContext(element) {
            // Check for specific component contexts
            if (element.closest('.results-viewer'))
                return 'results';
            if (element.closest('.project-selector'))
                return 'projects';
            if (element.closest('.progress-indicator'))
                return 'progress';
            if (element.closest('.action-buttons'))
                return 'actions';
            if (element.closest('input, textarea'))
                return 'input';
            return 'global';
        }
        getCategoryDisplayName(categoryId) {
            const categoryNames = {
                'general': 'General',
                'navigation': 'Navigation',
                'commands': 'Commands',
                'projects': 'Projects',
                'files': 'Files',
                'debug': 'Debug',
                'view': 'View',
                'edit': 'Edit'
            };
            return categoryNames[categoryId] || categoryId;
        }
        /**
         * Register a new keyboard shortcut
         */
        registerShortcut(shortcut) {
            const shortcuts = this.shortcuts();
            const existingIndex = shortcuts.findIndex(s => s.id === shortcut.id);
            if (existingIndex >= 0) {
                // Update existing shortcut
                shortcuts[existingIndex] = { ...shortcut };
            }
            else {
                // Add new shortcut
                shortcuts.push({ ...shortcut });
            }
            this.shortcuts.set([...shortcuts]);
        }
        /**
         * Register multiple shortcuts at once
         */
        registerShortcuts(shortcuts) {
            shortcuts.forEach(shortcut => this.registerShortcut(shortcut));
        }
        /**
         * Remove a keyboard shortcut
         */
        unregisterShortcut(id) {
            const shortcuts = this.shortcuts().filter(s => s.id !== id);
            this.shortcuts.set(shortcuts);
        }
        /**
         * Enable or disable a specific shortcut
         */
        toggleShortcut(id, enabled) {
            const shortcuts = this.shortcuts();
            const shortcut = shortcuts.find(s => s.id === id);
            if (shortcut) {
                shortcut.enabled = enabled;
                this.shortcuts.set([...shortcuts]);
            }
        }
        /**
         * Enable or disable all shortcuts
         */
        toggleAllShortcuts(enabled) {
            this.enabled.set(enabled);
        }
        /**
         * Get shortcut by ID
         */
        getShortcut(id) {
            return this.shortcuts().find(s => s.id === id);
        }
        /**
         * Get shortcuts by category
         */
        getShortcutsByCategory(category) {
            return this.shortcuts().filter(s => s.category === category);
        }
        /**
         * Format shortcut for display
         */
        formatShortcut(shortcut) {
            const parts = [];
            if (shortcut.ctrlKey)
                parts.push('Ctrl');
            if (shortcut.altKey)
                parts.push('Alt');
            if (shortcut.shiftKey)
                parts.push('Shift');
            if (shortcut.metaKey)
                parts.push('Cmd');
            // Format the key
            const key = shortcut.key.charAt(0).toUpperCase() + shortcut.key.slice(1);
            parts.push(key);
            return parts.join(' + ');
        }
        /**
         * Register default application shortcuts
         */
        registerDefaultShortcuts() {
            const defaultShortcuts = [
                // General shortcuts
                {
                    id: 'toggle-command-palette',
                    key: 'p',
                    ctrlKey: true,
                    shiftKey: true,
                    description: 'Toggle Command Palette',
                    category: 'general',
                    action: () => this.showCommandPalette(),
                    global: true
                },
                {
                    id: 'refresh-all',
                    key: 'f5',
                    description: 'Refresh All',
                    category: 'general',
                    action: () => this.refreshAll(),
                    global: true
                },
                {
                    id: 'toggle-sidebar',
                    key: 'b',
                    ctrlKey: true,
                    description: 'Toggle Sidebar',
                    category: 'view',
                    action: () => this.toggleSidebar(),
                    global: true
                },
                // Command shortcuts
                {
                    id: 'execute-command',
                    key: 'enter',
                    ctrlKey: true,
                    description: 'Execute Current Command',
                    category: 'commands',
                    action: () => this.executeCurrentCommand(),
                    global: true
                },
                {
                    id: 'cancel-command',
                    key: 'c',
                    ctrlKey: true,
                    description: 'Cancel Current Command',
                    category: 'commands',
                    action: () => this.cancelCurrentCommand(),
                    global: true
                },
                {
                    id: 'clear-output',
                    key: 'k',
                    ctrlKey: true,
                    description: 'Clear Output',
                    category: 'commands',
                    action: () => this.clearOutput(),
                    global: true
                },
                {
                    id: 'restart-command',
                    key: 'r',
                    ctrlKey: true,
                    description: 'Restart Command',
                    category: 'commands',
                    action: () => this.restartCommand(),
                    global: true
                },
                // Navigation shortcuts
                {
                    id: 'next-tab',
                    key: 'tab',
                    ctrlKey: true,
                    description: 'Next Tab',
                    category: 'navigation',
                    action: () => this.nextTab(),
                    global: true
                },
                {
                    id: 'previous-tab',
                    key: 'tab',
                    ctrlKey: true,
                    shiftKey: true,
                    description: 'Previous Tab',
                    category: 'navigation',
                    action: () => this.previousTab(),
                    global: true
                },
                {
                    id: 'focus-search',
                    key: 'f',
                    ctrlKey: true,
                    description: 'Focus Search',
                    category: 'navigation',
                    action: () => this.focusSearch(),
                    global: true
                },
                // Project shortcuts
                {
                    id: 'select-project',
                    key: 'o',
                    ctrlKey: true,
                    description: 'Select Project',
                    category: 'projects',
                    action: () => this.selectProject(),
                    global: true
                },
                {
                    id: 'refresh-projects',
                    key: 'f5',
                    ctrlKey: true,
                    description: 'Refresh Projects',
                    category: 'projects',
                    action: () => this.refreshProjects(),
                    global: true
                },
                // File shortcuts
                {
                    id: 'open-file',
                    key: 'o',
                    ctrlKey: true,
                    shiftKey: true,
                    description: 'Open File',
                    category: 'files',
                    action: () => this.openFile(),
                    global: true
                },
                {
                    id: 'save-file',
                    key: 's',
                    ctrlKey: true,
                    description: 'Save File',
                    category: 'files',
                    action: () => this.saveFile(),
                    global: true
                },
                {
                    id: 'close-file',
                    key: 'w',
                    ctrlKey: true,
                    description: 'Close File',
                    category: 'files',
                    action: () => this.closeFile(),
                    global: true
                },
                // Debug shortcuts
                {
                    id: 'toggle-debug-mode',
                    key: 'd',
                    ctrlKey: true,
                    shiftKey: true,
                    description: 'Toggle Debug Mode',
                    category: 'debug',
                    action: () => this.toggleDebugMode(),
                    global: true
                },
                {
                    id: 'debug-current-file',
                    key: 'f9',
                    description: 'Debug Current File',
                    category: 'debug',
                    action: () => this.debugCurrentFile(),
                    global: true
                },
                // View shortcuts
                {
                    id: 'toggle-fullscreen',
                    key: 'f11',
                    description: 'Toggle Fullscreen',
                    category: 'view',
                    action: () => this.toggleFullscreen(),
                    global: true
                },
                {
                    id: 'zoom-in',
                    key: '=',
                    ctrlKey: true,
                    description: 'Zoom In',
                    category: 'view',
                    action: () => this.zoomIn(),
                    global: true
                },
                {
                    id: 'zoom-out',
                    key: '-',
                    ctrlKey: true,
                    description: 'Zoom Out',
                    category: 'view',
                    action: () => this.zoomOut(),
                    global: true
                },
                {
                    id: 'reset-zoom',
                    key: '0',
                    ctrlKey: true,
                    description: 'Reset Zoom',
                    category: 'view',
                    action: () => this.resetZoom(),
                    global: true
                }
            ];
            this.registerShortcuts(defaultShortcuts);
        }
        // Default action implementations (these would be injected or overridden)
        showCommandPalette() {
            console.log('Command Palette triggered');
            // This would be implemented by the consuming component
        }
        refreshAll() {
            console.log('Refresh All triggered');
            // This would be implemented by the consuming component
        }
        toggleSidebar() {
            console.log('Toggle Sidebar triggered');
            // This would be implemented by the consuming component
        }
        executeCurrentCommand() {
            console.log('Execute Current Command triggered');
            // This would be implemented by the consuming component
        }
        cancelCurrentCommand() {
            console.log('Cancel Current Command triggered');
            // This would be implemented by the consuming component
        }
        clearOutput() {
            console.log('Clear Output triggered');
            // This would be implemented by the consuming component
        }
        restartCommand() {
            console.log('Restart Command triggered');
            // This would be implemented by the consuming component
        }
        nextTab() {
            console.log('Next Tab triggered');
            // This would be implemented by the consuming component
        }
        previousTab() {
            console.log('Previous Tab triggered');
            // This would be implemented by the consuming component
        }
        focusSearch() {
            console.log('Focus Search triggered');
            // This would be implemented by the consuming component
        }
        selectProject() {
            console.log('Select Project triggered');
            // This would be implemented by the consuming component
        }
        refreshProjects() {
            console.log('Refresh Projects triggered');
            // This would be implemented by the consuming component
        }
        openFile() {
            console.log('Open File triggered');
            // This would be implemented by the consuming component
        }
        saveFile() {
            console.log('Save File triggered');
            // This would be implemented by the consuming component
        }
        closeFile() {
            console.log('Close File triggered');
            // This would be implemented by the consuming component
        }
        toggleDebugMode() {
            console.log('Toggle Debug Mode triggered');
            // This would be implemented by the consuming component
        }
        debugCurrentFile() {
            console.log('Debug Current File triggered');
            // This would be implemented by the consuming component
        }
        toggleFullscreen() {
            console.log('Toggle Fullscreen triggered');
            // This would be implemented by the consuming component
        }
        zoomIn() {
            console.log('Zoom In triggered');
            // This would be implemented by the consuming component
        }
        zoomOut() {
            console.log('Zoom Out triggered');
            // This would be implemented by the consuming component
        }
        resetZoom() {
            console.log('Reset Zoom triggered');
            // This would be implemented by the consuming component
        }
        /**
         * Set custom action handlers
         */
        setActionHandler(shortcutId, handler) {
            const shortcut = this.getShortcut(shortcutId);
            if (shortcut) {
                shortcut.action = handler;
                this.shortcuts.set([...this.shortcuts()]);
            }
        }
        /**
         * Get current context
         */
        getCurrentContext() {
            return this.activeContext();
        }
        /**
         * Get currently pressed keys
         */
        getPressedKeys() {
            return this.pressedKeys();
        }
        /**
         * Check if shortcuts are enabled
         */
        isEnabled() {
            return this.enabled();
        }
    };
    return KeyboardShortcutsService = _classThis;
})();
exports.KeyboardShortcutsService = KeyboardShortcutsService;
//# sourceMappingURL=keyboard-shortcuts.service.js.map