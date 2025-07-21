import { Injectable, signal, computed, ComponentRef, ViewContainerRef, createComponent, EnvironmentInjector } from '@angular/core';
import { ContextMenuComponent, ContextMenuItem, ContextMenuPosition } from '../../components/context-menu/context-menu.component';

export interface ContextMenuConfig {
  items: ContextMenuItem[];
  position: ContextMenuPosition;
  target?: HTMLElement;
  onItemSelected?: (item: ContextMenuItem) => void;
  onMenuClosed?: () => void;
}

@Injectable({
  providedIn: 'root'
})
export class ContextMenuService {
  private activeMenu = signal<ComponentRef<ContextMenuComponent> | null>(null);
  private viewContainerRef: ViewContainerRef | null = null;
  private environmentInjector: EnvironmentInjector | null = null;

  // Track if any menu is currently open
  readonly isMenuOpen = computed(() => this.activeMenu() !== null);

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
  initialize(viewContainerRef: ViewContainerRef, environmentInjector: EnvironmentInjector) {
    this.viewContainerRef = viewContainerRef;
    this.environmentInjector = environmentInjector;
  }

  /**
   * Show a context menu at the specified position with given items
   */
  showMenu(config: ContextMenuConfig): void {
    if (!this.viewContainerRef || !this.environmentInjector) {
      console.error('ContextMenuService not initialized. Call initialize() from root component.');
      return;
    }

    // Close any existing menu
    this.closeMenu();

    // Create new menu component
    const menuComponentRef = createComponent(ContextMenuComponent, {
      environmentInjector: this.environmentInjector,
      hostElement: document.body
    });

    // Configure the menu
    menuComponentRef.instance.items.set(config.items);
    menuComponentRef.instance.position.set(config.position);
    menuComponentRef.instance.isVisible.set(true);

    // Set up event listeners
    menuComponentRef.instance.itemSelected.subscribe((item: ContextMenuItem) => {
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
  showMenuOnRightClick(event: MouseEvent, items: ContextMenuItem[], 
                       onItemSelected?: (item: ContextMenuItem) => void,
                       onMenuClosed?: () => void): void {
    event.preventDefault();
    event.stopPropagation();

    this.showMenu({
      items,
      position: { x: event.clientX, y: event.clientY },
      target: event.target as HTMLElement,
      onItemSelected,
      onMenuClosed
    });
  }

  /**
   * Close the currently active menu
   */
  closeMenu(): void {
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
  createCommandContextMenu(command: any, actions: {
    execute?: () => void;
    cancel?: () => void;
    viewDetails?: () => void;
    copyOutput?: () => void;
    downloadLogs?: () => void;
    restart?: () => void;
    remove?: () => void;
  }): ContextMenuItem[] {
    const items: ContextMenuItem[] = [];

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
  createProjectContextMenu(project: any, actions: {
    selectProject?: () => void;
    refreshProject?: () => void;
    openFolder?: () => void;
    showInExplorer?: () => void;
    copyPath?: () => void;
    runDebugCommands?: () => void;
    viewAnalytics?: () => void;
    removeProject?: () => void;
  }): ContextMenuItem[] {
    const items: ContextMenuItem[] = [];

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
  createFileContextMenu(file: any, actions: {
    openFile?: () => void;
    openWith?: () => void;
    showInExplorer?: () => void;
    copyPath?: () => void;
    copyContent?: () => void;
    download?: () => void;
    delete?: () => void;
  }): ContextMenuItem[] {
    const items: ContextMenuItem[] = [];

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
  createGeneralContextMenu(actions: {
    cut?: () => void;
    copy?: () => void;
    paste?: () => void;
    selectAll?: () => void;
    undo?: () => void;
    redo?: () => void;
    find?: () => void;
    replace?: () => void;
  }): ContextMenuItem[] {
    const items: ContextMenuItem[] = [];

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
}