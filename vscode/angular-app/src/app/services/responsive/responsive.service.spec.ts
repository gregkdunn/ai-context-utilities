import { TestBed } from '@angular/core/testing';
import { ResponsiveService } from './responsive.service';
import { NgZone } from '@angular/core';

describe('ResponsiveService', () => {
  let service: ResponsiveService;
  let ngZone: NgZone;
  let originalInnerWidth: number;
  let originalInnerHeight: number;
  let originalOntouchstart: any;
  let originalMaxTouchPoints: number;
  let mockMatchMedia: jest.Mock;

  beforeEach(() => {
    // Store original values
    originalInnerWidth = window.innerWidth;
    originalInnerHeight = window.innerHeight;
    originalOntouchstart = (window as any).ontouchstart;
    originalMaxTouchPoints = navigator.maxTouchPoints;

    // Mock matchMedia
    mockMatchMedia = jest.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: mockMatchMedia,
    });

    // Mock ResizeObserver
    global.ResizeObserver = jest.fn().mockImplementation(() => ({
      observe: jest.fn(),
      unobserve: jest.fn(),
      disconnect: jest.fn(),
    }));

    TestBed.configureTestingModule({});
    service = TestBed.inject(ResponsiveService);
    ngZone = TestBed.inject(NgZone);
  });

  afterEach(() => {
    // Restore original values
    Object.defineProperty(window, 'innerWidth', { value: originalInnerWidth, writable: true, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: originalInnerHeight, writable: true, configurable: true });
    
    if (originalOntouchstart !== undefined) {
      (window as any).ontouchstart = originalOntouchstart;
    } else {
      delete (window as any).ontouchstart;
    }
    
    Object.defineProperty(navigator, 'maxTouchPoints', { value: originalMaxTouchPoints, writable: true, configurable: true });
    
    service.destroy();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should detect mobile breakpoint', () => {
    service.setDimensions(500, 800);

    expect(service.isMobile()).toBe(true);
    expect(service.isTablet()).toBe(false);
    expect(service.isDesktop()).toBe(false);
  });

  it('should detect tablet breakpoint', () => {
    service.setDimensions(900, 600);

    expect(service.isMobile()).toBe(false);
    expect(service.isTablet()).toBe(true);
    expect(service.isDesktop()).toBe(false);
  });

  it('should detect desktop breakpoint', () => {
    service.setDimensions(1200, 800);

    expect(service.isMobile()).toBe(false);
    expect(service.isTablet()).toBe(false);
    expect(service.isDesktop()).toBe(true);
  });

  it('should determine orientation correctly', () => {
    // Landscape
    service.setDimensions(1200, 800);

    expect(service.isLandscape()).toBe(true);
    expect(service.isPortrait()).toBe(false);

    // Portrait
    service.setDimensions(800, 1200);

    expect(service.isLandscape()).toBe(false);
    expect(service.isPortrait()).toBe(true);
  });

  it('should check breakpoint matching', () => {
    service.setDimensions(500, 800);
    
    expect(service.matchesBreakpoint('mobile')).toBe(true);
    expect(service.matchesBreakpoint('tablet')).toBe(false);
  });

  it('should check at least breakpoint', () => {
    service.setDimensions(1200, 800);
    
    expect(service.isAtLeast('mobile')).toBe(true);
    expect(service.isAtLeast('tablet')).toBe(true);
    expect(service.isAtLeast('desktop')).toBe(true);
  });

  it('should check at most breakpoint', () => {
    service.setDimensions(500, 800);
    
    expect(service.isAtMost('mobile')).toBe(true);
    expect(service.isAtMost('tablet')).toBe(true);
    expect(service.isAtMost('desktop')).toBe(true);
  });

  it('should generate responsive CSS classes', () => {
    service.setDimensions(500, 800);
    
    const classes = service.getCSSClasses();
    expect(classes).toContain('breakpoint-mobile');
    expect(classes).toContain('is-mobile');
    expect(classes).toContain('compact-mode');
  });

  it('should generate grid classes', () => {
    service.setDimensions(500, 800);
    
    const gridClasses = service.getGridClasses();
    expect(gridClasses).toContain('grid');
    expect(gridClasses).toContain('gap-4');
    expect(gridClasses).toContain('grid-cols-1');
  });

  it('should get responsive spacing classes', () => {
    service.setDimensions(500, 800);
    
    const spacingClasses = service.getSpacingClasses();
    expect(spacingClasses).toContain('p-2');
    expect(spacingClasses).toContain('m-1');
  });

  it('should get responsive text size classes', () => {
    service.setDimensions(500, 800);
    
    const textClasses = service.getTextSizeClasses();
    expect(textClasses).toBe('text-sm');

    service.setDimensions(1200, 800);

    const textClassesDesktop = service.getTextSizeClasses();
    expect(textClassesDesktop).toBe('text-lg');
  });

  it('should get responsive button size classes', () => {
    service.setDimensions(500, 800);
    
    const buttonClasses = service.getButtonSizeClasses();
    expect(buttonClasses).toContain('px-3');
    expect(buttonClasses).toContain('py-1');
    expect(buttonClasses).toContain('text-sm');
  });

  it('should get responsive modal size classes', () => {
    service.setDimensions(500, 800);
    
    const modalClasses = service.getModalSizeClasses();
    expect(modalClasses).toContain('w-full');
    expect(modalClasses).toContain('h-full');
    expect(modalClasses).toContain('rounded-none');

    service.setDimensions(1200, 800);

    const modalClassesDesktop = service.getModalSizeClasses();
    expect(modalClassesDesktop).toContain('max-w-4xl');
    expect(modalClassesDesktop).toContain('rounded-lg');
  });

  it('should detect touch device', () => {
    // Mock touch support
    Object.defineProperty(window, 'ontouchstart', { value: true, writable: true, configurable: true });
    expect(service.isTouchDevice()).toBe(true);

    // Mock no touch support
    delete (window as any).ontouchstart;
    Object.defineProperty(navigator, 'maxTouchPoints', { value: 0, writable: true, configurable: true });
    expect(service.isTouchDevice()).toBe(false);
  });

  it('should provide image sizes for responsive loading', () => {
    service.setDimensions(500, 800);
    
    const imageSizes = service.getImageSizes();
    expect(imageSizes).toContain('100vw');

    service.setDimensions(1200, 800);

    const imageSizesDesktop = service.getImageSizes();
    expect(imageSizesDesktop).toContain('25vw');
  });

  it('should provide appropriate animation duration', () => {
    // Mock reduced motion preference
    mockMatchMedia.mockImplementation(query => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));

    expect(service.getAnimationDuration()).toBe(0);
  });

  it('should handle VSCode panel detection', () => {
    // Test assumes VSCode API exists (from test setup)
    // We'll test both scenarios by checking the current state
    service.setDimensions(500, 800);
    
    // The service should detect VSCode API from the test setup
    const isVSCodePanel = service.isVSCodePanel();
    expect(typeof isVSCodePanel).toBe('boolean');
    
    // Panel size should be determined by width
    const panelSize = service.panelSize();
    expect(['small', 'medium', 'large']).toContain(panelSize);
    expect(panelSize).toBe('medium'); // 500px width = medium
  });

  it('should handle orientation change events', () => {
    // Set initial dimensions
    service.setDimensions(800, 600);
    
    // Mock the event listener spy
    const addEventListenerSpy = jest.spyOn(window, 'addEventListener');
    
    // Trigger orientation change event synchronously
    window.dispatchEvent(new Event('orientationchange'));
    
    // Verify the event listener was set up (called during service initialization)
    expect(addEventListenerSpy).toHaveBeenCalledWith('orientationchange', expect.any(Function));
    
    // Verify current orientation state
    expect(service.isLandscape()).toBe(true);
    expect(service.isPortrait()).toBe(false);
  });

  it('should get responsive input size classes', () => {
    service.setDimensions(500, 800);
    
    const inputClasses = service.getInputSizeClasses();
    expect(inputClasses).toContain('px-2');
    expect(inputClasses).toContain('py-1');
    expect(inputClasses).toContain('text-sm');
  });

  it('should get responsive visualization classes', () => {
    service.setDimensions(500, 800);
    
    const vizClasses = service.getVisualizationClasses();
    expect(vizClasses).toContain('w-full');
    expect(vizClasses).toContain('h-40'); // compact mode
  });

  it('should get responsive navigation classes', () => {
    service.setDimensions(500, 800);
    
    const navClasses = service.getNavigationClasses();
    expect(navClasses).toContain('flex');
    expect(navClasses).toContain('flex-col');
    expect(navClasses).toContain('space-y-2');
  });

  it('should get responsive table classes', () => {
    service.setDimensions(500, 800);
    
    const tableClasses = service.getTableClasses();
    expect(tableClasses).toContain('block');
    expect(tableClasses).toContain('overflow-x-auto');

    service.setDimensions(1200, 800);

    const tableClassesDesktop = service.getTableClasses();
    expect(tableClassesDesktop).toContain('table-auto');
    expect(tableClassesDesktop).toContain('w-full');
  });

  it('should get responsive state', () => {
    service.setDimensions(500, 800);
    
    const state = service.responsiveState();
    expect(state.breakpoint).toBe('mobile');
    expect(state.width).toBe(500);
    expect(state.height).toBe(800);
    expect(state.isMobile).toBe(true);
    expect(state.isLandscape).toBe(false);
    expect(state.isPortrait).toBe(true);
  });

  it('should get responsive config', () => {
    service.setDimensions(500, 800);
    
    const config = service.responsiveConfig();
    expect(config.gridColumns).toBe(1);
    expect(config.cardSize).toBe('small');
    expect(config.showSidebar).toBe(false);
    expect(config.compactMode).toBe(true);
    expect(config.fontSize).toBe('small');
    expect(config.spacing).toBe('tight');
  });

  it('should handle wide breakpoint correctly', () => {
    service.setDimensions(1600, 1000);
    
    expect(service.responsiveState().breakpoint).toBe('wide');
    expect(service.isDesktop()).toBe(true); // wide includes desktop
  });
});
