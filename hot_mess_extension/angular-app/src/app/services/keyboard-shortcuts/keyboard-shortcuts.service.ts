import { Injectable, signal, computed, NgZone } from '@angular/core';

export interface KeyboardShortcut {
  id: string;
  key: string;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  metaKey?: boolean;
  description: string;
  category: string;
  action: () => void;
  enabled?: boolean;
  global?: boolean; // Whether this shortcut works globally or only in specific contexts
}

export interface ShortcutCategory {
  id: string;
  name: string;
  shortcuts: KeyboardShortcut[];
}

@Injectable({
  providedIn: 'root'
})
export class KeyboardShortcutsService {
  private shortcuts = signal<KeyboardShortcut[]>([]);
  private enabled = signal(true);
  private activeContext = signal<string>('global');
  private pressedKeys = signal<Set<string>>(new Set());

  // Computed properties for organized shortcuts
  readonly shortcutCategories = computed(() => {
    const categories = new Map<string, KeyboardShortcut[]>();
    
    this.shortcuts().forEach(shortcut => {
      if (!categories.has(shortcut.category)) {
        categories.set(shortcut.category, []);
      }
      categories.get(shortcut.category)!.push(shortcut);
    });

    return Array.from(categories.entries()).map(([id, shortcuts]) => ({
      id,
      name: this.getCategoryDisplayName(id),
      shortcuts: shortcuts.sort((a, b) => a.description.localeCompare(b.description))
    }));
  });

  readonly enabledShortcuts = computed(() => 
    this.shortcuts().filter(s => s.enabled !== false)
  );

  constructor(private ngZone: NgZone) {
    this.setupEventListeners();
    this.registerDefaultShortcuts();
  }

  private setupEventListeners() {
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
        this.updateContext(event.target as HTMLElement);
      });
    });
  }

  private handleKeyDown(event: KeyboardEvent) {
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

  private handleKeyUp(event: KeyboardEvent) {
    const key = event.key.toLowerCase();
    const pressedKeys = new Set(this.pressedKeys());
    pressedKeys.delete(key);
    this.pressedKeys.set(pressedKeys);
  }

  private findMatchingShortcuts(event: KeyboardEvent): KeyboardShortcut[] {
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
      if (!!shortcut.ctrlKey !== event.ctrlKey) return false;
      if (!!shortcut.altKey !== event.altKey) return false;
      if (!!shortcut.shiftKey !== event.shiftKey) return false;
      if (!!shortcut.metaKey !== event.metaKey) return false;

      return true;
    });
  }

  private updateContext(element: HTMLElement) {
    // Determine context based on focused element
    const context = this.determineContext(element);
    this.activeContext.set(context);
  }

  private determineContext(element: HTMLElement): string {
    // Check for specific component contexts
    if (element.closest('.results-viewer')) return 'results';
    if (element.closest('.project-selector')) return 'projects';
    if (element.closest('.progress-indicator')) return 'progress';
    if (element.closest('.action-buttons')) return 'actions';
    if (element.closest('input, textarea')) return 'input';
    
    return 'global';
  }

  private getCategoryDisplayName(categoryId: string): string {
    const categoryNames: Record<string, string> = {
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
  registerShortcut(shortcut: KeyboardShortcut) {
    const shortcuts = this.shortcuts();
    const existingIndex = shortcuts.findIndex(s => s.id === shortcut.id);
    
    if (existingIndex >= 0) {
      // Update existing shortcut
      shortcuts[existingIndex] = { ...shortcut };
    } else {
      // Add new shortcut
      shortcuts.push({ ...shortcut });
    }
    
    this.shortcuts.set([...shortcuts]);
  }

  /**
   * Register multiple shortcuts at once
   */
  registerShortcuts(shortcuts: KeyboardShortcut[]) {
    shortcuts.forEach(shortcut => this.registerShortcut(shortcut));
  }

  /**
   * Remove a keyboard shortcut
   */
  unregisterShortcut(id: string) {
    const shortcuts = this.shortcuts().filter(s => s.id !== id);
    this.shortcuts.set(shortcuts);
  }

  /**
   * Enable or disable a specific shortcut
   */
  toggleShortcut(id: string, enabled: boolean) {
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
  toggleAllShortcuts(enabled: boolean) {
    this.enabled.set(enabled);
  }

  /**
   * Get shortcut by ID
   */
  getShortcut(id: string): KeyboardShortcut | undefined {
    return this.shortcuts().find(s => s.id === id);
  }

  /**
   * Get shortcuts by category
   */
  getShortcutsByCategory(category: string): KeyboardShortcut[] {
    return this.shortcuts().filter(s => s.category === category);
  }

  /**
   * Format shortcut for display
   */
  formatShortcut(shortcut: KeyboardShortcut): string {
    const parts: string[] = [];
    
    if (shortcut.ctrlKey) parts.push('Ctrl');
    if (shortcut.altKey) parts.push('Alt');
    if (shortcut.shiftKey) parts.push('Shift');
    if (shortcut.metaKey) parts.push('Cmd');
    
    // Format the key
    const key = shortcut.key.charAt(0).toUpperCase() + shortcut.key.slice(1);
    parts.push(key);
    
    return parts.join(' + ');
  }

  /**
   * Register default application shortcuts
   */
  private registerDefaultShortcuts() {
    const defaultShortcuts: KeyboardShortcut[] = [
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
  private showCommandPalette() {
    console.log('Command Palette triggered');
    // This would be implemented by the consuming component
  }

  private refreshAll() {
    console.log('Refresh All triggered');
    // This would be implemented by the consuming component
  }

  private toggleSidebar() {
    console.log('Toggle Sidebar triggered');
    // This would be implemented by the consuming component
  }

  private executeCurrentCommand() {
    console.log('Execute Current Command triggered');
    // This would be implemented by the consuming component
  }

  private cancelCurrentCommand() {
    console.log('Cancel Current Command triggered');
    // This would be implemented by the consuming component
  }

  private clearOutput() {
    console.log('Clear Output triggered');
    // This would be implemented by the consuming component
  }

  private restartCommand() {
    console.log('Restart Command triggered');
    // This would be implemented by the consuming component
  }

  private nextTab() {
    console.log('Next Tab triggered');
    // This would be implemented by the consuming component
  }

  private previousTab() {
    console.log('Previous Tab triggered');
    // This would be implemented by the consuming component
  }

  private focusSearch() {
    console.log('Focus Search triggered');
    // This would be implemented by the consuming component
  }

  private selectProject() {
    console.log('Select Project triggered');
    // This would be implemented by the consuming component
  }

  private refreshProjects() {
    console.log('Refresh Projects triggered');
    // This would be implemented by the consuming component
  }

  private openFile() {
    console.log('Open File triggered');
    // This would be implemented by the consuming component
  }

  private saveFile() {
    console.log('Save File triggered');
    // This would be implemented by the consuming component
  }

  private closeFile() {
    console.log('Close File triggered');
    // This would be implemented by the consuming component
  }

  private toggleDebugMode() {
    console.log('Toggle Debug Mode triggered');
    // This would be implemented by the consuming component
  }

  private debugCurrentFile() {
    console.log('Debug Current File triggered');
    // This would be implemented by the consuming component
  }

  private toggleFullscreen() {
    console.log('Toggle Fullscreen triggered');
    // This would be implemented by the consuming component
  }

  private zoomIn() {
    console.log('Zoom In triggered');
    // This would be implemented by the consuming component
  }

  private zoomOut() {
    console.log('Zoom Out triggered');
    // This would be implemented by the consuming component
  }

  private resetZoom() {
    console.log('Reset Zoom triggered');
    // This would be implemented by the consuming component
  }

  /**
   * Set custom action handlers
   */
  setActionHandler(shortcutId: string, handler: () => void) {
    const shortcut = this.getShortcut(shortcutId);
    if (shortcut) {
      shortcut.action = handler;
      this.shortcuts.set([...this.shortcuts()]);
    }
  }

  /**
   * Get current context
   */
  getCurrentContext(): string {
    return this.activeContext();
  }

  /**
   * Get currently pressed keys
   */
  getPressedKeys(): Set<string> {
    return this.pressedKeys();
  }

  /**
   * Check if shortcuts are enabled
   */
  isEnabled(): boolean {
    return this.enabled();
  }
}