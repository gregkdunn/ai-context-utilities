import { Injectable, signal, computed, NgZone } from '@angular/core';

export interface BreakpointConfig {
  name: string;
  minWidth: number;
  maxWidth?: number;
}

export interface ResponsiveState {
  breakpoint: string;
  width: number;
  height: number;
  isDesktop: boolean;
  isTablet: boolean;
  isMobile: boolean;
  isLandscape: boolean;
  isPortrait: boolean;
  devicePixelRatio: number;
  isHighDPI: boolean;
  prefersReducedMotion: boolean;
  prefersColorScheme: 'light' | 'dark' | 'auto';
  isVSCodePanel: boolean;
  panelSize: 'small' | 'medium' | 'large';
}

export interface ResponsiveConfig {
  gridColumns: number;
  cardSize: 'small' | 'medium' | 'large';
  showSidebar: boolean;
  compactMode: boolean;
  fontSize: 'small' | 'medium' | 'large';
  spacing: 'tight' | 'normal' | 'loose';
}

@Injectable({
  providedIn: 'root'
})
export class ResponsiveService {
  private windowWidth = signal(window.innerWidth);
  private windowHeight = signal(window.innerHeight);
  private resizeObserver?: ResizeObserver;
  private mediaQueryLists: Map<string, MediaQueryList> = new Map();

  // Default breakpoints
  private breakpoints: BreakpointConfig[] = [
    { name: 'mobile', minWidth: 0, maxWidth: 767 },
    { name: 'tablet', minWidth: 768, maxWidth: 1023 },
    { name: 'desktop', minWidth: 1024, maxWidth: 1439 },
    { name: 'wide', minWidth: 1440 }
  ];

  // VSCode panel breakpoints
  private panelBreakpoints: BreakpointConfig[] = [
    { name: 'small', minWidth: 0, maxWidth: 399 },
    { name: 'medium', minWidth: 400, maxWidth: 799 },
    { name: 'large', minWidth: 800 }
  ];

  // Computed responsive state
  readonly responsiveState = computed<ResponsiveState>(() => {
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
  readonly responsiveConfig = computed<ResponsiveConfig>(() => {
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
  readonly isMobile = computed(() => this.responsiveState().isMobile);
  readonly isTablet = computed(() => this.responsiveState().isTablet);
  readonly isDesktop = computed(() => this.responsiveState().isDesktop);
  readonly isLandscape = computed(() => this.responsiveState().isLandscape);
  readonly isPortrait = computed(() => this.responsiveState().isPortrait);
  readonly prefersReducedMotion = computed(() => this.responsiveState().prefersReducedMotion);
  readonly isVSCodePanel = computed(() => this.responsiveState().isVSCodePanel);
  readonly panelSize = computed(() => this.responsiveState().panelSize);

  constructor(private ngZone: NgZone) {
    this.initializeMediaQueries();
    this.setupResizeObserver();
    this.setupEventListeners();
  }

  private initializeMediaQueries() {
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

  private setupResizeObserver() {
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

  private setupEventListeners() {
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

  private getCurrentBreakpoint(width: number): string {
    for (const bp of this.breakpoints) {
      if (width >= bp.minWidth && (!bp.maxWidth || width <= bp.maxWidth)) {
        return bp.name;
      }
    }
    return 'desktop'; // Default fallback
  }

  private getPanelSize(width: number): 'small' | 'medium' | 'large' {
    for (const bp of this.panelBreakpoints) {
      if (width >= bp.minWidth && (!bp.maxWidth || width <= bp.maxWidth)) {
        return bp.name as 'small' | 'medium' | 'large';
      }
    }
    return 'large';
  }

  private getPrefersReducedMotion(): boolean {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  private getPrefersColorScheme(): 'light' | 'dark' | 'auto' {
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    if (window.matchMedia('(prefers-color-scheme: light)').matches) {
      return 'light';
    }
    return 'auto';
  }

  private isRunningInVSCodePanel(): boolean {
    // Check if we're running inside VSCode webview
    return !!(window as any).acquireVsCodeApi;
  }

  private getGridColumns(state: ResponsiveState): number {
    if (state.isMobile) return 1;
    if (state.isTablet) return 2;
    if (state.isVSCodePanel) {
      switch (state.panelSize) {
        case 'small': return 1;
        case 'medium': return 2;
        case 'large': return 3;
      }
    }
    return state.width > 1440 ? 4 : 3;
  }

  private getCardSize(state: ResponsiveState): 'small' | 'medium' | 'large' {
    if (state.isMobile) return 'small';
    if (state.isTablet) return 'medium';
    if (state.isVSCodePanel && state.panelSize === 'small') return 'small';
    return 'large';
  }

  private shouldShowSidebar(state: ResponsiveState): boolean {
    if (state.isMobile) return false;
    if (state.isVSCodePanel && state.panelSize === 'small') return false;
    return true;
  }

  private shouldUseCompactMode(state: ResponsiveState): boolean {
    if (state.isMobile) return true;
    if (state.isVSCodePanel && state.panelSize === 'small') return true;
    return false;
  }

  private getFontSize(state: ResponsiveState): 'small' | 'medium' | 'large' {
    if (state.isMobile) return 'small';
    if (state.isTablet) return 'medium';
    return 'large';
  }

  private getSpacing(state: ResponsiveState): 'tight' | 'normal' | 'loose' {
    if (state.isMobile) return 'tight';
    if (state.isTablet) return 'normal';
    return 'loose';
  }

  /**
   * Check if current screen matches a specific breakpoint
   */
  matchesBreakpoint(breakpoint: string): boolean {
    return this.responsiveState().breakpoint === breakpoint;
  }

  /**
   * Check if current screen is at least a specific breakpoint
   */
  isAtLeast(breakpoint: string): boolean {
    const current = this.responsiveState().breakpoint;
    const breakpointOrder = ['mobile', 'tablet', 'desktop', 'wide'];
    
    const currentIndex = breakpointOrder.indexOf(current);
    const targetIndex = breakpointOrder.indexOf(breakpoint);
    
    return currentIndex >= targetIndex;
  }

  /**
   * Check if current screen is at most a specific breakpoint
   */
  isAtMost(breakpoint: string): boolean {
    const current = this.responsiveState().breakpoint;
    const breakpointOrder = ['mobile', 'tablet', 'desktop', 'wide'];
    
    const currentIndex = breakpointOrder.indexOf(current);
    const targetIndex = breakpointOrder.indexOf(breakpoint);
    
    return currentIndex <= targetIndex;
  }

  /**
   * Get CSS classes for responsive behavior
   */
  getCSSClasses(): string[] {
    const state = this.responsiveState();
    const config = this.responsiveConfig();
    
    const classes = [
      `breakpoint-${state.breakpoint}`,
      `grid-cols-${config.gridColumns}`,
      `card-${config.cardSize}`,
      `font-${config.fontSize}`,
      `spacing-${config.spacing}`
    ];

    if (state.isMobile) classes.push('is-mobile');
    if (state.isTablet) classes.push('is-tablet');
    if (state.isDesktop) classes.push('is-desktop');
    if (state.isLandscape) classes.push('is-landscape');
    if (state.isPortrait) classes.push('is-portrait');
    if (state.isHighDPI) classes.push('is-high-dpi');
    if (state.prefersReducedMotion) classes.push('prefers-reduced-motion');
    if (state.isVSCodePanel) classes.push('is-vscode-panel');
    if (state.panelSize) classes.push(`panel-${state.panelSize}`);
    if (config.compactMode) classes.push('compact-mode');
    if (!config.showSidebar) classes.push('hide-sidebar');

    return classes;
  }

  /**
   * Get Tailwind CSS classes for responsive grids
   */
  getGridClasses(): string {
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
  getSpacingClasses(): string {
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
  getTextSizeClasses(): string {
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
  getButtonSizeClasses(): string {
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
  getInputSizeClasses(): string {
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
  getModalSizeClasses(): string {
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
  getVisualizationClasses(): string {
    const state = this.responsiveState();
    const config = this.responsiveConfig();
    
    const classes = ['w-full'];
    
    if (state.isMobile) {
      classes.push('h-48');
    } else if (state.isTablet) {
      classes.push('h-64');
    } else {
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
  getNavigationClasses(): string {
    const state = this.responsiveState();
    const config = this.responsiveConfig();
    
    const classes = ['flex'];
    
    if (state.isMobile) {
      classes.push('flex-col space-y-2');
    } else {
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
  getTableClasses(): string {
    const state = this.responsiveState();
    
    if (state.isMobile) {
      return 'block overflow-x-auto whitespace-nowrap';
    }
    
    return 'table-auto w-full';
  }

  /**
   * Check if touch device
   */
  isTouchDevice(): boolean {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }

  /**
   * Get optimal image sizes for responsive loading
   */
  getImageSizes(): string {
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
  getAnimationDuration(): number {
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
}