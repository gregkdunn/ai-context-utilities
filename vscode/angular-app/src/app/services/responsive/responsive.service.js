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
exports.ResponsiveService = void 0;
const core_1 = require("@angular/core");
let ResponsiveService = (() => {
    let _classDecorators = [(0, core_1.Injectable)({
            providedIn: 'root'
        })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var ResponsiveService = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            ResponsiveService = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        ngZone;
        windowWidth = (0, core_1.signal)(window.innerWidth);
        windowHeight = (0, core_1.signal)(window.innerHeight);
        resizeObserver;
        mediaQueryLists = new Map();
        // Default breakpoints
        breakpoints = [
            { name: 'mobile', minWidth: 0, maxWidth: 767 },
            { name: 'tablet', minWidth: 768, maxWidth: 1023 },
            { name: 'desktop', minWidth: 1024, maxWidth: 1439 },
            { name: 'wide', minWidth: 1440 }
        ];
        // VSCode panel breakpoints
        panelBreakpoints = [
            { name: 'small', minWidth: 0, maxWidth: 399 },
            { name: 'medium', minWidth: 400, maxWidth: 799 },
            { name: 'large', minWidth: 800 }
        ];
        // Computed responsive state
        responsiveState = (0, core_1.computed)(() => {
            const width = this.windowWidth();
            const height = this.windowHeight();
            const breakpoint = this.getCurrentBreakpoint(width);
            return {
                breakpoint,
                width,
                height,
                isDesktop: breakpoint === 'desktop' || breakpoint === 'wide',
                isTablet: breakpoint === 'tablet',
                isMobile: breakpoint === 'mobile',
                isLandscape: width > height,
                isPortrait: width <= height,
                devicePixelRatio: window.devicePixelRatio || 1,
                isHighDPI: (window.devicePixelRatio || 1) > 1,
                prefersReducedMotion: this.getPrefersReducedMotion(),
                prefersColorScheme: this.getPrefersColorScheme(),
                isVSCodePanel: this.isRunningInVSCodePanel(),
                panelSize: this.getPanelSize(width)
            };
        });
        // Computed responsive configuration
        responsiveConfig = (0, core_1.computed)(() => {
            const state = this.responsiveState();
            return {
                gridColumns: this.getGridColumns(state),
                cardSize: this.getCardSize(state),
                showSidebar: this.shouldShowSidebar(state),
                compactMode: this.shouldUseCompactMode(state),
                fontSize: this.getFontSize(state),
                spacing: this.getSpacing(state)
            };
        });
        // Breakpoint-specific computed properties
        isMobile = (0, core_1.computed)(() => this.responsiveState().isMobile);
        isTablet = (0, core_1.computed)(() => this.responsiveState().isTablet);
        isDesktop = (0, core_1.computed)(() => this.responsiveState().isDesktop);
        isLandscape = (0, core_1.computed)(() => this.responsiveState().isLandscape);
        isPortrait = (0, core_1.computed)(() => this.responsiveState().isPortrait);
        prefersReducedMotion = (0, core_1.computed)(() => this.responsiveState().prefersReducedMotion);
        isVSCodePanel = (0, core_1.computed)(() => this.responsiveState().isVSCodePanel);
        panelSize = (0, core_1.computed)(() => this.responsiveState().panelSize);
        constructor(ngZone) {
            this.ngZone = ngZone;
            this.initializeMediaQueries();
            this.setupResizeObserver();
            this.setupEventListeners();
        }
        initializeMediaQueries() {
            // Set up media query listeners for breakpoints
            this.breakpoints.forEach(bp => {
                const query = bp.maxWidth
                    ? `(min-width: ${bp.minWidth}px) and (max-width: ${bp.maxWidth}px)`
                    : `(min-width: ${bp.minWidth}px)`;
                const mql = window.matchMedia(query);
                this.mediaQueryLists.set(bp.name, mql);
            });
            // Set up media query listeners for system preferences
            const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
            const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)');
            const prefersHighContrast = window.matchMedia('(prefers-contrast: high)');
            this.mediaQueryLists.set('reduced-motion', prefersReducedMotion);
            this.mediaQueryLists.set('dark-mode', prefersDarkMode);
            this.mediaQueryLists.set('high-contrast', prefersHighContrast);
        }
        setupResizeObserver() {
            if (typeof ResizeObserver !== 'undefined') {
                this.resizeObserver = new ResizeObserver(entries => {
                    this.ngZone.run(() => {
                        const entry = entries[0];
                        if (entry) {
                            this.windowWidth.set(entry.contentRect.width);
                            this.windowHeight.set(entry.contentRect.height);
                        }
                    });
                });
                this.resizeObserver.observe(document.body);
            }
        }
        setupEventListeners() {
            // Fallback for browsers without ResizeObserver
            if (!this.resizeObserver) {
                window.addEventListener('resize', () => {
                    this.ngZone.run(() => {
                        this.windowWidth.set(window.innerWidth);
                        this.windowHeight.set(window.innerHeight);
                    });
                });
            }
            // Listen for orientation changes
            window.addEventListener('orientationchange', () => {
                setTimeout(() => {
                    this.ngZone.run(() => {
                        this.windowWidth.set(window.innerWidth);
                        this.windowHeight.set(window.innerHeight);
                    });
                }, 100);
            });
        }
        getCurrentBreakpoint(width) {
            for (const bp of this.breakpoints) {
                if (width >= bp.minWidth && (!bp.maxWidth || width <= bp.maxWidth)) {
                    return bp.name;
                }
            }
            return 'desktop'; // Default fallback
        }
        getPanelSize(width) {
            for (const bp of this.panelBreakpoints) {
                if (width >= bp.minWidth && (!bp.maxWidth || width <= bp.maxWidth)) {
                    return bp.name;
                }
            }
            return 'large';
        }
        getPrefersReducedMotion() {
            return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        }
        getPrefersColorScheme() {
            if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
                return 'dark';
            }
            if (window.matchMedia('(prefers-color-scheme: light)').matches) {
                return 'light';
            }
            return 'auto';
        }
        isRunningInVSCodePanel() {
            // Check if we're running inside VSCode webview
            return !!window.acquireVsCodeApi;
        }
        getGridColumns(state) {
            if (state.isMobile)
                return 1;
            if (state.isTablet)
                return 2;
            if (state.isVSCodePanel) {
                switch (state.panelSize) {
                    case 'small': return 1;
                    case 'medium': return 2;
                    case 'large': return 3;
                }
            }
            return state.width > 1440 ? 4 : 3;
        }
        getCardSize(state) {
            if (state.isMobile)
                return 'small';
            if (state.isTablet)
                return 'medium';
            if (state.isVSCodePanel && state.panelSize === 'small')
                return 'small';
            return 'large';
        }
        shouldShowSidebar(state) {
            if (state.isMobile)
                return false;
            if (state.isVSCodePanel && state.panelSize === 'small')
                return false;
            return true;
        }
        shouldUseCompactMode(state) {
            if (state.isMobile)
                return true;
            if (state.isVSCodePanel && state.panelSize === 'small')
                return true;
            return false;
        }
        getFontSize(state) {
            if (state.isMobile)
                return 'small';
            if (state.isTablet)
                return 'medium';
            return 'large';
        }
        getSpacing(state) {
            if (state.isMobile)
                return 'tight';
            if (state.isTablet)
                return 'normal';
            return 'loose';
        }
        /**
         * Check if current screen matches a specific breakpoint
         */
        matchesBreakpoint(breakpoint) {
            return this.responsiveState().breakpoint === breakpoint;
        }
        /**
         * Check if current screen is at least a specific breakpoint
         */
        isAtLeast(breakpoint) {
            const current = this.responsiveState().breakpoint;
            const breakpointOrder = ['mobile', 'tablet', 'desktop', 'wide'];
            const currentIndex = breakpointOrder.indexOf(current);
            const targetIndex = breakpointOrder.indexOf(breakpoint);
            return currentIndex >= targetIndex;
        }
        /**
         * Check if current screen is at most a specific breakpoint
         */
        isAtMost(breakpoint) {
            const current = this.responsiveState().breakpoint;
            const breakpointOrder = ['mobile', 'tablet', 'desktop', 'wide'];
            const currentIndex = breakpointOrder.indexOf(current);
            const targetIndex = breakpointOrder.indexOf(breakpoint);
            return currentIndex <= targetIndex;
        }
        /**
         * Get CSS classes for responsive behavior
         */
        getCSSClasses() {
            const state = this.responsiveState();
            const config = this.responsiveConfig();
            const classes = [
                `breakpoint-${state.breakpoint}`,
                `grid-cols-${config.gridColumns}`,
                `card-${config.cardSize}`,
                `font-${config.fontSize}`,
                `spacing-${config.spacing}`
            ];
            if (state.isMobile)
                classes.push('is-mobile');
            if (state.isTablet)
                classes.push('is-tablet');
            if (state.isDesktop)
                classes.push('is-desktop');
            if (state.isLandscape)
                classes.push('is-landscape');
            if (state.isPortrait)
                classes.push('is-portrait');
            if (state.isHighDPI)
                classes.push('is-high-dpi');
            if (state.prefersReducedMotion)
                classes.push('prefers-reduced-motion');
            if (state.isVSCodePanel)
                classes.push('is-vscode-panel');
            if (state.panelSize)
                classes.push(`panel-${state.panelSize}`);
            if (config.compactMode)
                classes.push('compact-mode');
            if (!config.showSidebar)
                classes.push('hide-sidebar');
            return classes;
        }
        /**
         * Get Tailwind CSS classes for responsive grids
         */
        getGridClasses() {
            const config = this.responsiveConfig();
            const state = this.responsiveState();
            const baseClasses = [
                'grid',
                'gap-4',
                `grid-cols-1`,
                `sm:grid-cols-${Math.min(2, config.gridColumns)}`,
                `md:grid-cols-${Math.min(3, config.gridColumns)}`,
                `lg:grid-cols-${config.gridColumns}`
            ];
            if (state.isVSCodePanel) {
                switch (state.panelSize) {
                    case 'small':
                        baseClasses.push('grid-cols-1');
                        break;
                    case 'medium':
                        baseClasses.push('grid-cols-1 sm:grid-cols-2');
                        break;
                    case 'large':
                        baseClasses.push('grid-cols-1 sm:grid-cols-2 md:grid-cols-3');
                        break;
                }
            }
            return baseClasses.join(' ');
        }
        /**
         * Get responsive padding/margin classes
         */
        getSpacingClasses() {
            const config = this.responsiveConfig();
            switch (config.spacing) {
                case 'tight':
                    return 'p-2 m-1';
                case 'normal':
                    return 'p-4 m-2';
                case 'loose':
                    return 'p-6 m-4';
                default:
                    return 'p-4 m-2';
            }
        }
        /**
         * Get responsive text size classes
         */
        getTextSizeClasses() {
            const config = this.responsiveConfig();
            switch (config.fontSize) {
                case 'small':
                    return 'text-sm';
                case 'medium':
                    return 'text-base';
                case 'large':
                    return 'text-lg';
                default:
                    return 'text-base';
            }
        }
        /**
         * Get responsive button size classes
         */
        getButtonSizeClasses() {
            const config = this.responsiveConfig();
            if (config.compactMode) {
                return 'px-3 py-1 text-sm';
            }
            switch (config.cardSize) {
                case 'small':
                    return 'px-3 py-1 text-sm';
                case 'medium':
                    return 'px-4 py-2 text-base';
                case 'large':
                    return 'px-6 py-3 text-lg';
                default:
                    return 'px-4 py-2 text-base';
            }
        }
        /**
         * Get responsive form input classes
         */
        getInputSizeClasses() {
            const config = this.responsiveConfig();
            if (config.compactMode) {
                return 'px-2 py-1 text-sm';
            }
            switch (config.cardSize) {
                case 'small':
                    return 'px-2 py-1 text-sm';
                case 'medium':
                    return 'px-3 py-2 text-base';
                case 'large':
                    return 'px-4 py-2 text-base';
                default:
                    return 'px-3 py-2 text-base';
            }
        }
        /**
         * Get responsive modal/dialog classes
         */
        getModalSizeClasses() {
            const state = this.responsiveState();
            if (state.isMobile) {
                return 'w-full h-full max-w-none max-h-none rounded-none';
            }
            if (state.isTablet) {
                return 'w-11/12 max-w-2xl max-h-5/6 rounded-lg';
            }
            return 'w-full max-w-4xl max-h-4/5 rounded-lg';
        }
        /**
         * Get responsive chart/visualization classes
         */
        getVisualizationClasses() {
            const state = this.responsiveState();
            const config = this.responsiveConfig();
            const classes = ['w-full'];
            if (state.isMobile) {
                classes.push('h-48');
            }
            else if (state.isTablet) {
                classes.push('h-64');
            }
            else {
                classes.push('h-80');
            }
            if (config.compactMode) {
                classes.push('h-40');
            }
            return classes.join(' ');
        }
        /**
         * Get responsive navigation classes
         */
        getNavigationClasses() {
            const state = this.responsiveState();
            const config = this.responsiveConfig();
            const classes = ['flex'];
            if (state.isMobile) {
                classes.push('flex-col space-y-2');
            }
            else {
                classes.push('flex-row space-x-4');
            }
            if (config.compactMode) {
                classes.push('text-sm');
            }
            return classes.join(' ');
        }
        /**
         * Get responsive table classes
         */
        getTableClasses() {
            const state = this.responsiveState();
            if (state.isMobile) {
                return 'block overflow-x-auto whitespace-nowrap';
            }
            return 'table-auto w-full';
        }
        /**
         * Check if touch device
         */
        isTouchDevice() {
            return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        }
        /**
         * Get optimal image sizes for responsive loading
         */
        getImageSizes() {
            const state = this.responsiveState();
            if (state.isMobile) {
                return '(max-width: 767px) 100vw, 50vw';
            }
            if (state.isTablet) {
                return '(max-width: 1023px) 50vw, 33vw';
            }
            return '(max-width: 1439px) 33vw, 25vw';
        }
        /**
         * Get responsive animation duration
         */
        getAnimationDuration() {
            const state = this.responsiveState();
            if (state.prefersReducedMotion) {
                return 0;
            }
            if (state.isMobile) {
                return 200; // Faster on mobile
            }
            return 300; // Standard duration
        }
        /**
         * Cleanup resources
         */
        destroy() {
            if (this.resizeObserver) {
                this.resizeObserver.disconnect();
            }
            this.mediaQueryLists.clear();
        }
    };
    return ResponsiveService = _classThis;
})();
exports.ResponsiveService = ResponsiveService;
//# sourceMappingURL=responsive.service.js.map