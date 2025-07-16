import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, ElementRef, ViewChild, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface ContextMenuItem {
  id: string;
  label: string;
  icon?: string;
  disabled?: boolean;
  separator?: boolean;
  shortcut?: string;
  submenu?: ContextMenuItem[];
  action?: () => void;
}

export interface ContextMenuPosition {
  x: number;
  y: number;
}

@Component({
  selector: 'app-context-menu',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div 
      #menuContainer
      class="context-menu"
      [class.visible]="isVisible()"
      [style.left.px]="position().x"
      [style.top.px]="position().y"
      (click)="$event.stopPropagation()"
      role="menu"
      [attr.aria-hidden]="!isVisible()"
      tabindex="-1">
      
      <div class="context-menu-items">
        @for (item of items(); track item.id) {
          @if (item.separator) {
            <div class="context-menu-separator" role="separator"></div>
          } @else {
            <div 
              class="context-menu-item"
              [class.disabled]="item.disabled"
              [class.has-submenu]="item.submenu && item.submenu.length > 0"
              (click)="handleItemClick(item)"
              (mouseenter)="handleItemHover(item)"
              role="menuitem"
              [attr.aria-disabled]="item.disabled"
              tabindex="0">
              
              <div class="context-menu-item-content">
                @if (item.icon) {
                  <i class="context-menu-icon {{ item.icon }}"></i>
                }
                <span class="context-menu-label">{{ item.label }}</span>
                @if (item.shortcut) {
                  <span class="context-menu-shortcut">{{ item.shortcut }}</span>
                }
                @if (item.submenu && item.submenu.length > 0) {
                  <i class="context-menu-arrow codicon codicon-chevron-right"></i>
                }
              </div>
              
              @if (item.submenu && item.submenu.length > 0 && hoveredItem() === item) {
                <app-context-menu
                  class="context-submenu"
                  [items]="item.submenu"
                  [isVisible]="true"
                  [position]="submenuPosition()"
                  (itemSelected)="onItemSelected.emit($event)"
                  (menuClosed)="onMenuClosed.emit()">
                </app-context-menu>
              }
            </div>
          }
        }
      </div>
    </div>
  `,
  styles: [`
    .context-menu {
      position: fixed;
      z-index: 1000;
      background: var(--vscode-menu-background);
      border: 1px solid var(--vscode-menu-border);
      border-radius: 4px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
      opacity: 0;
      visibility: hidden;
      transform: scale(0.95);
      transition: all 0.15s ease-out;
      min-width: 200px;
      max-width: 300px;
      padding: 4px 0;
      font-size: 13px;
      font-family: var(--vscode-font-family);
    }

    .context-menu.visible {
      opacity: 1;
      visibility: visible;
      transform: scale(1);
    }

    .context-menu-items {
      display: flex;
      flex-direction: column;
    }

    .context-menu-item {
      display: flex;
      align-items: center;
      padding: 8px 16px;
      cursor: pointer;
      user-select: none;
      transition: background-color 0.1s ease;
      position: relative;
    }

    .context-menu-item:hover:not(.disabled) {
      background: var(--vscode-menu-selectionBackground);
      color: var(--vscode-menu-selectionForeground);
    }

    .context-menu-item.disabled {
      opacity: 0.5;
      cursor: default;
    }

    .context-menu-item-content {
      display: flex;
      align-items: center;
      width: 100%;
      gap: 8px;
    }

    .context-menu-icon {
      width: 16px;
      height: 16px;
      flex-shrink: 0;
    }

    .context-menu-label {
      flex: 1;
      color: var(--vscode-menu-foreground);
    }

    .context-menu-shortcut {
      color: var(--vscode-menu-selectionForeground);
      opacity: 0.7;
      font-size: 11px;
      margin-left: auto;
    }

    .context-menu-arrow {
      margin-left: auto;
      width: 16px;
      height: 16px;
      opacity: 0.7;
    }

    .context-menu-separator {
      height: 1px;
      background: var(--vscode-menu-separatorBackground);
      margin: 4px 0;
    }

    .context-submenu {
      position: absolute;
      left: 100%;
      top: 0;
      margin-left: 4px;
    }

    .context-menu-item.has-submenu::after {
      content: '';
      position: absolute;
      right: 8px;
      top: 50%;
      transform: translateY(-50%);
      width: 0;
      height: 0;
      border-left: 4px solid var(--vscode-menu-foreground);
      border-top: 4px solid transparent;
      border-bottom: 4px solid transparent;
      opacity: 0.7;
    }

    /* Keyboard navigation */
    .context-menu-item:focus {
      outline: none;
      background: var(--vscode-menu-selectionBackground);
      color: var(--vscode-menu-selectionForeground);
    }

    /* Dark theme adjustments */
    .context-menu {
      --menu-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
    }

    /* High contrast support */
    @media (prefers-contrast: high) {
      .context-menu {
        border: 2px solid var(--vscode-contrastBorder);
      }
      
      .context-menu-item:hover:not(.disabled) {
        border: 1px solid var(--vscode-contrastActiveBorder);
      }
    }

    /* Responsive adjustments */
    @media (max-width: 768px) {
      .context-menu {
        min-width: 180px;
        font-size: 14px;
      }
      
      .context-menu-item {
        padding: 12px 16px;
      }
    }
  `]
})
export class ContextMenuComponent implements OnInit, OnDestroy {
  @Input() items = signal<ContextMenuItem[]>([]);
  @Input() isVisible = signal(false);
  @Input() position = signal<ContextMenuPosition>({ x: 0, y: 0 });
  @Input() target: HTMLElement | null = null;

  @Output() itemSelected = new EventEmitter<ContextMenuItem>();
  @Output() menuClosed = new EventEmitter<void>();

  @ViewChild('menuContainer', { static: true }) menuContainer!: ElementRef<HTMLDivElement>;

  private hoveredItem = signal<ContextMenuItem | null>(null);
  private focusedIndex = signal(-1);
  private keydownListener?: (event: KeyboardEvent) => void;
  private clickListener?: (event: MouseEvent) => void;

  ngOnInit() {
    this.setupEventListeners();
  }

  ngOnDestroy() {
    this.removeEventListeners();
  }

  private setupEventListeners() {
    this.keydownListener = (event: KeyboardEvent) => this.handleKeyDown(event);
    this.clickListener = (event: MouseEvent) => this.handleOutsideClick(event);

    document.addEventListener('keydown', this.keydownListener);
    document.addEventListener('click', this.clickListener);
  }

  private removeEventListeners() {
    if (this.keydownListener) {
      document.removeEventListener('keydown', this.keydownListener);
    }
    if (this.clickListener) {
      document.removeEventListener('click', this.clickListener);
    }
  }

  private handleKeyDown(event: KeyboardEvent) {
    if (!this.isVisible()) return;

    const items = this.items().filter(item => !item.separator && !item.disabled);
    
    switch (event.key) {
      case 'Escape':
        event.preventDefault();
        this.closeMenu();
        break;
      
      case 'ArrowDown':
        event.preventDefault();
        this.moveFocus(1, items);
        break;
      
      case 'ArrowUp':
        event.preventDefault();
        this.moveFocus(-1, items);
        break;
      
      case 'Enter':
      case ' ':
        event.preventDefault();
        this.activateCurrentItem(items);
        break;
      
      case 'ArrowRight':
        event.preventDefault();
        this.openSubmenu(items);
        break;
      
      case 'ArrowLeft':
        event.preventDefault();
        this.closeSubmenu();
        break;
    }
  }

  private moveFocus(direction: number, items: ContextMenuItem[]) {
    const currentIndex = this.focusedIndex();
    const newIndex = Math.max(0, Math.min(items.length - 1, currentIndex + direction));
    this.focusedIndex.set(newIndex);
    
    const menuItems = this.menuContainer.nativeElement.querySelectorAll('.context-menu-item:not(.disabled)');
    (menuItems[newIndex] as HTMLElement)?.focus();
  }

  private activateCurrentItem(items: ContextMenuItem[]) {
    const currentIndex = this.focusedIndex();
    if (currentIndex >= 0 && currentIndex < items.length) {
      this.handleItemClick(items[currentIndex]);
    }
  }

  private openSubmenu(items: ContextMenuItem[]) {
    const currentIndex = this.focusedIndex();
    if (currentIndex >= 0 && currentIndex < items.length) {
      const item = items[currentIndex];
      if (item.submenu && item.submenu.length > 0) {
        this.hoveredItem.set(item);
      }
    }
  }

  private closeSubmenu() {
    this.hoveredItem.set(null);
  }

  private handleOutsideClick(event: MouseEvent) {
    if (!this.isVisible()) return;
    
    const target = event.target as HTMLElement;
    if (!this.menuContainer.nativeElement.contains(target)) {
      this.closeMenu();
    }
  }

  handleItemClick(item: ContextMenuItem) {
    if (item.disabled) return;
    
    if (item.submenu && item.submenu.length > 0) {
      this.hoveredItem.set(this.hoveredItem() === item ? null : item);
      return;
    }

    this.itemSelected.emit(item);
    
    if (item.action) {
      item.action();
    }
    
    this.closeMenu();
  }

  handleItemHover(item: ContextMenuItem) {
    if (item.disabled) return;
    
    this.hoveredItem.set(item);
  }

  private closeMenu() {
    this.hoveredItem.set(null);
    this.focusedIndex.set(-1);
    this.menuClosed.emit();
  }

  submenuPosition = computed(() => {
    const rect = this.menuContainer.nativeElement?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    
    return {
      x: rect.right,
      y: rect.top
    };
  });

  // Public method to show menu at specific position
  showAt(x: number, y: number, items: ContextMenuItem[]) {
    this.position.set({ x, y });
    this.items.set(items);
    this.isVisible.set(true);
    
    // Focus the menu for keyboard navigation
    setTimeout(() => {
      this.menuContainer.nativeElement.focus();
    }, 0);
    
    // Adjust position if menu would go off-screen
    this.adjustPositionIfNeeded();
  }

  private adjustPositionIfNeeded() {
    const menu = this.menuContainer.nativeElement;
    const rect = menu.getBoundingClientRect();
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight
    };

    let { x, y } = this.position();

    // Adjust horizontal position
    if (x + rect.width > viewport.width) {
      x = viewport.width - rect.width - 8;
    }

    // Adjust vertical position
    if (y + rect.height > viewport.height) {
      y = viewport.height - rect.height - 8;
    }

    // Ensure menu doesn't go off the left or top of screen
    x = Math.max(8, x);
    y = Math.max(8, y);

    this.position.set({ x, y });
  }

  // Public method to hide menu
  hide() {
    this.isVisible.set(false);
    this.hoveredItem.set(null);
    this.focusedIndex.set(-1);
  }
}