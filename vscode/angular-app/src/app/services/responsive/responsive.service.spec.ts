import { TestBed } from '@angular/core/testing';
import { ResponsiveService } from './responsive.service';
import { NgZone } from '@angular/core';

describe('ResponsiveService', () => {
  let service: ResponsiveService;
  let ngZone: NgZone;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ResponsiveService);
    ngZone = TestBed.inject(NgZone);
  });

  afterEach(() => {
    service.destroy();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should detect mobile breakpoint', () => {
    // Mock window width for mobile
    Object.defineProperty(window, 'innerWidth', { value: 500, writable: true });
    Object.defineProperty(window, 'innerHeight', { value: 800, writable: true });

    // Trigger resize to update state
    window.dispatchEvent(new Event('resize'));

    // Wait for ngZone to process
    ngZone.run(() => {
      expect(service.isMobile()).toBe(true);
      expect(service.isTablet()).toBe(false);
      expect(service.isDesktop()).toBe(false);
    });
  });

  it('should detect tablet breakpoint', () => {
    // Mock window width for tablet
    Object.defineProperty(window, 'innerWidth', { value: 900, writable: true });
    Object.defineProperty(window, 'innerHeight', { value: 600, writable: true });

    window.dispatchEvent(new Event('resize'));

    ngZone.run(() => {
      expect(service.isMobile()).toBe(false);
      expect(service.isTablet()).toBe(true);
      expect(service.isDesktop()).toBe(false);
    });
  });

  it('should detect desktop breakpoint', () => {
    // Mock window width for desktop
    Object.defineProperty(window, 'innerWidth', { value: 1200, writable: true });
    Object.defineProperty(window, 'innerHeight', { value: 800, writable: true });

    window.dispatchEvent(new Event('resize'));

    ngZone.run(() => {
      expect(service.isMobile()).toBe(false);
      expect(service.isTablet()).toBe(false);
      expect(service.isDesktop()).toBe(true);
    });
  });

  it('should determine orientation correctly', () => {
    // Landscape
    Object.defineProperty(window, 'innerWidth', { value: 1200, writable: true });
    Object.defineProperty(window, 'innerHeight', { value: 800, writable: true });

    window.dispatchEvent(new Event('resize'));

    ngZone.run(() => {
      expect(service.isLandscape()).toBe(true);
      expect(service.isPortrait()).toBe(false);
    });

    // Portrait
    Object.defineProperty(window, 'innerWidth', { value: 800, writable: true });
    Object.defineProperty(window, 'innerHeight', { value: 1200, writable: true });

    window.dispatchEvent(new Event('resize'));

    ngZone.run(() => {
      expect(service.isLandscape()).toBe(false);
      expect(service.isPortrait()).toBe(true);
    });
  });

  it('should check breakpoint matching', () => {
    Object.defineProperty(window, 'innerWidth', { value: 500, writable: true });
    window.dispatchEvent(new Event('resize'));

    ngZone.run(() => {
      expect(service.matchesBreakpoint('mobile')).toBe(true);
      expect(service.matchesBreakpoint('tablet')).toBe(false);
    });
  });

  it('should check at least breakpoint', () => {
    Object.defineProperty(window, 'innerWidth', { value: 1200, writable: true });
    window.dispatchEvent(new Event('resize'));

    ngZone.run(() => {
      expect(service.isAtLeast('mobile')).toBe(true);
      expect(service.isAtLeast('tablet')).toBe(true);
      expect(service.isAtLeast('desktop')).toBe(true);
    });
  });

  it('should check at most breakpoint', () => {
    Object.defineProperty(window, 'innerWidth', { value: 500, writable: true });
    window.dispatchEvent(new Event('resize'));

    ngZone.run(() => {
      expect(service.isAtMost('mobile')).toBe(true);
      expect(service.isAtMost('tablet')).toBe(false);
      expect(service.isAtMost('desktop')).toBe(false);
    });
  });

  it('should generate responsive CSS classes', () => {
    Object.defineProperty(window, 'innerWidth', { value: 500, writable: true });
    window.dispatchEvent(new Event('resize'));

    ngZone.run(() => {
      const classes = service.getCSSClasses();
      expect(classes).toContain('breakpoint-mobile');
      expect(classes).toContain('is-mobile');
      expect(classes).toContain('compact-mode');
    });
  });

  it('should generate grid classes', () => {
    Object.defineProperty(window, 'innerWidth', { value: 500, writable: true });
    window.dispatchEvent(new Event('resize'));

    ngZone.run(() => {
      const gridClasses = service.getGridClasses();
      expect(gridClasses).toContain('grid');
      expect(gridClasses).toContain('gap-4');
      expect(gridClasses).toContain('grid-cols-1');
    });
  });

  it('should get responsive spacing classes', () => {
    Object.defineProperty(window, 'innerWidth', { value: 500, writable: true });
    window.dispatchEvent(new Event('resize'));

    ngZone.run(() => {
      const spacingClasses = service.getSpacingClasses();
      expect(spacingClasses).toContain('p-2');
      expect(spacingClasses).toContain('m-1');
    });
  });

  it('should get responsive text size classes', () => {
    Object.defineProperty(window, 'innerWidth', { value: 500, writable: true });
    window.dispatchEvent(new Event('resize'));

    ngZone.run(() => {
      const textClasses = service.getTextSizeClasses();
      expect(textClasses).toBe('text-sm');
    });

    Object.defineProperty(window, 'innerWidth', { value: 1200, writable: true });
    window.dispatchEvent(new Event('resize'));

    ngZone.run(() => {
      const textClasses = service.getTextSizeClasses();
      expect(textClasses).toBe('text-lg');
    });
  });

  it('should get responsive button size classes', () => {
    Object.defineProperty(window, 'innerWidth', { value: 500, writable: true });
    window.dispatchEvent(new Event('resize'));

    ngZone.run(() => {
      const buttonClasses = service.getButtonSizeClasses();
      expect(buttonClasses).toContain('px-3');
      expect(buttonClasses).toContain('py-1');
      expect(buttonClasses).toContain('text-sm');
    });
  });

  it('should get responsive modal size classes', () => {
    Object.defineProperty(window, 'innerWidth', { value: 500, writable: true });
    window.dispatchEvent(new Event('resize'));

    ngZone.run(() => {
      const modalClasses = service.getModalSizeClasses();
      expect(modalClasses).toContain('w-full');
      expect(modalClasses).toContain('h-full');
      expect(modalClasses).toContain('rounded-none');
    });

    Object.defineProperty(window, 'innerWidth', { value: 1200, writable: true });
    window.dispatchEvent(new Event('resize'));

    ngZone.run(() => {
      const modalClasses = service.getModalSizeClasses();
      expect(modalClasses).toContain('max-w-4xl');
      expect(modalClasses).toContain('rounded-lg');
    });
  });

  it('should detect touch device', () => {
    // Mock touch support
    Object.defineProperty(window, 'ontouchstart', { value: true, writable: true });
    expect(service.isTouchDevice()).toBe(true);

    // Mock no touch support
    delete (window as any).ontouchstart;
    Object.defineProperty(navigator, 'maxTouchPoints', { value: 0, writable: true });
    expect(service.isTouchDevice()).toBe(false);
  });

  it('should provide image sizes for responsive loading', () => {
    Object.defineProperty(window, 'innerWidth', { value: 500, writable: true });
    window.dispatchEvent(new Event('resize'));

    ngZone.run(() => {
      const imageSizes = service.getImageSizes();
      expect(imageSizes).toContain('100vw');
    });

    Object.defineProperty(window, 'innerWidth', { value: 1200, writable: true });
    window.dispatchEvent(new Event('resize'));

    ngZone.run(() => {
      const imageSizes = service.getImageSizes();
      expect(imageSizes).toContain('25vw');
    });
  });

  it('should provide appropriate animation duration', () => {
    // Mock reduced motion preference
    Object.defineProperty(window, 'matchMedia', {
      value: jest.fn().mockImplementation(query => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
      writable: true
    });

    expect(service.getAnimationDuration()).toBe(0);
  });

  it('should handle VSCode panel detection', () => {
    // Mock VSCode API
    (window as any).acquireVsCodeApi = () => ({});
    
    Object.defineProperty(window, 'innerWidth', { value: 500, writable: true });
    window.dispatchEvent(new Event('resize'));

    ngZone.run(() => {
      expect(service.isVSCodePanel()).toBe(true);
      expect(service.panelSize()).toBe('medium');
    });

    // Clean up
    delete (window as any).acquireVsCodeApi;
  });

  it('should handle orientation change events', (done) => {
    Object.defineProperty(window, 'innerWidth', { value: 800, writable: true });
    Object.defineProperty(window, 'innerHeight', { value: 600, writable: true });

    // Listen for changes
    let changeDetected = false;
    service.responsiveState.effect(() => {
      if (service.isLandscape()) {
        changeDetected = true;
      }
    });

    // Simulate orientation change
    window.dispatchEvent(new Event('orientationchange'));

    // Check after timeout (orientation change has a delay)
    setTimeout(() => {
      expect(changeDetected).toBe(true);
      done();
    }, 200);
  });
});