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
exports.ContextMenuComponent = void 0;
const core_1 = require("@angular/core");
const common_1 = require("@angular/common");
let ContextMenuComponent = (() => {
    let _classDecorators = [(0, core_1.Component)({
            selector: 'app-context-menu',
            standalone: true,
            imports: [common_1.CommonModule],
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
        })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _items_decorators;
    let _items_initializers = [];
    let _items_extraInitializers = [];
    let _isVisible_decorators;
    let _isVisible_initializers = [];
    let _isVisible_extraInitializers = [];
    let _position_decorators;
    let _position_initializers = [];
    let _position_extraInitializers = [];
    let _target_decorators;
    let _target_initializers = [];
    let _target_extraInitializers = [];
    let _itemSelected_decorators;
    let _itemSelected_initializers = [];
    let _itemSelected_extraInitializers = [];
    let _menuClosed_decorators;
    let _menuClosed_initializers = [];
    let _menuClosed_extraInitializers = [];
    let _menuContainer_decorators;
    let _menuContainer_initializers = [];
    let _menuContainer_extraInitializers = [];
    var ContextMenuComponent = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _items_decorators = [(0, core_1.Input)()];
            _isVisible_decorators = [(0, core_1.Input)()];
            _position_decorators = [(0, core_1.Input)()];
            _target_decorators = [(0, core_1.Input)()];
            _itemSelected_decorators = [(0, core_1.Output)()];
            _menuClosed_decorators = [(0, core_1.Output)()];
            _menuContainer_decorators = [(0, core_1.ViewChild)('menuContainer', { static: true })];
            __esDecorate(null, null, _items_decorators, { kind: "field", name: "items", static: false, private: false, access: { has: obj => "items" in obj, get: obj => obj.items, set: (obj, value) => { obj.items = value; } }, metadata: _metadata }, _items_initializers, _items_extraInitializers);
            __esDecorate(null, null, _isVisible_decorators, { kind: "field", name: "isVisible", static: false, private: false, access: { has: obj => "isVisible" in obj, get: obj => obj.isVisible, set: (obj, value) => { obj.isVisible = value; } }, metadata: _metadata }, _isVisible_initializers, _isVisible_extraInitializers);
            __esDecorate(null, null, _position_decorators, { kind: "field", name: "position", static: false, private: false, access: { has: obj => "position" in obj, get: obj => obj.position, set: (obj, value) => { obj.position = value; } }, metadata: _metadata }, _position_initializers, _position_extraInitializers);
            __esDecorate(null, null, _target_decorators, { kind: "field", name: "target", static: false, private: false, access: { has: obj => "target" in obj, get: obj => obj.target, set: (obj, value) => { obj.target = value; } }, metadata: _metadata }, _target_initializers, _target_extraInitializers);
            __esDecorate(null, null, _itemSelected_decorators, { kind: "field", name: "itemSelected", static: false, private: false, access: { has: obj => "itemSelected" in obj, get: obj => obj.itemSelected, set: (obj, value) => { obj.itemSelected = value; } }, metadata: _metadata }, _itemSelected_initializers, _itemSelected_extraInitializers);
            __esDecorate(null, null, _menuClosed_decorators, { kind: "field", name: "menuClosed", static: false, private: false, access: { has: obj => "menuClosed" in obj, get: obj => obj.menuClosed, set: (obj, value) => { obj.menuClosed = value; } }, metadata: _metadata }, _menuClosed_initializers, _menuClosed_extraInitializers);
            __esDecorate(null, null, _menuContainer_decorators, { kind: "field", name: "menuContainer", static: false, private: false, access: { has: obj => "menuContainer" in obj, get: obj => obj.menuContainer, set: (obj, value) => { obj.menuContainer = value; } }, metadata: _metadata }, _menuContainer_initializers, _menuContainer_extraInitializers);
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            ContextMenuComponent = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        items = __runInitializers(this, _items_initializers, (0, core_1.signal)([]));
        isVisible = (__runInitializers(this, _items_extraInitializers), __runInitializers(this, _isVisible_initializers, (0, core_1.signal)(false)));
        position = (__runInitializers(this, _isVisible_extraInitializers), __runInitializers(this, _position_initializers, (0, core_1.signal)({ x: 0, y: 0 })));
        target = (__runInitializers(this, _position_extraInitializers), __runInitializers(this, _target_initializers, null));
        itemSelected = (__runInitializers(this, _target_extraInitializers), __runInitializers(this, _itemSelected_initializers, new core_1.EventEmitter()));
        menuClosed = (__runInitializers(this, _itemSelected_extraInitializers), __runInitializers(this, _menuClosed_initializers, new core_1.EventEmitter()));
        menuContainer = (__runInitializers(this, _menuClosed_extraInitializers), __runInitializers(this, _menuContainer_initializers, void 0));
        hoveredItem = (__runInitializers(this, _menuContainer_extraInitializers), (0, core_1.signal)(null));
        focusedIndex = (0, core_1.signal)(-1);
        keydownListener;
        clickListener;
        ngOnInit() {
            this.setupEventListeners();
        }
        ngOnDestroy() {
            this.removeEventListeners();
        }
        setupEventListeners() {
            this.keydownListener = (event) => this.handleKeyDown(event);
            this.clickListener = (event) => this.handleOutsideClick(event);
            document.addEventListener('keydown', this.keydownListener);
            document.addEventListener('click', this.clickListener);
        }
        removeEventListeners() {
            if (this.keydownListener) {
                document.removeEventListener('keydown', this.keydownListener);
            }
            if (this.clickListener) {
                document.removeEventListener('click', this.clickListener);
            }
        }
        handleKeyDown(event) {
            if (!this.isVisible())
                return;
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
        moveFocus(direction, items) {
            const currentIndex = this.focusedIndex();
            const newIndex = Math.max(0, Math.min(items.length - 1, currentIndex + direction));
            this.focusedIndex.set(newIndex);
            const menuItems = this.menuContainer.nativeElement.querySelectorAll('.context-menu-item:not(.disabled)');
            menuItems[newIndex]?.focus();
        }
        activateCurrentItem(items) {
            const currentIndex = this.focusedIndex();
            if (currentIndex >= 0 && currentIndex < items.length) {
                this.handleItemClick(items[currentIndex]);
            }
        }
        openSubmenu(items) {
            const currentIndex = this.focusedIndex();
            if (currentIndex >= 0 && currentIndex < items.length) {
                const item = items[currentIndex];
                if (item.submenu && item.submenu.length > 0) {
                    this.hoveredItem.set(item);
                }
            }
        }
        closeSubmenu() {
            this.hoveredItem.set(null);
        }
        handleOutsideClick(event) {
            if (!this.isVisible())
                return;
            const target = event.target;
            if (!this.menuContainer.nativeElement.contains(target)) {
                this.closeMenu();
            }
        }
        handleItemClick(item) {
            if (item.disabled)
                return;
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
        handleItemHover(item) {
            if (item.disabled)
                return;
            this.hoveredItem.set(item);
        }
        closeMenu() {
            this.hoveredItem.set(null);
            this.focusedIndex.set(-1);
            this.menuClosed.emit();
        }
        submenuPosition = (0, core_1.computed)(() => {
            const rect = this.menuContainer.nativeElement?.getBoundingClientRect();
            if (!rect)
                return { x: 0, y: 0 };
            return {
                x: rect.right,
                y: rect.top
            };
        });
        // Public method to show menu at specific position
        showAt(x, y, items) {
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
        adjustPositionIfNeeded() {
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
    };
    return ContextMenuComponent = _classThis;
})();
exports.ContextMenuComponent = ContextMenuComponent;
//# sourceMappingURL=context-menu.component.js.map