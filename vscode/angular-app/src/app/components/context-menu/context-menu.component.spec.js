"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@angular/core/testing");
const context_menu_component_1 = require("./context-menu.component");
describe('ContextMenuComponent', () => {
    let component;
    let fixture;
    beforeEach(async () => {
        await testing_1.TestBed.configureTestingModule({
            imports: [context_menu_component_1.ContextMenuComponent]
        }).compileComponents();
        fixture = testing_1.TestBed.createComponent(context_menu_component_1.ContextMenuComponent);
        component = fixture.componentInstance;
    });
    it('should create', () => {
        expect(component).toBeTruthy();
    });
    it('should display menu items', () => {
        const testItems = [
            { id: 'test1', label: 'Test Item 1' },
            { id: 'test2', label: 'Test Item 2' }
        ];
        component.items.set(testItems);
        component.isVisible.set(true);
        fixture.detectChanges();
        const menuItems = fixture.nativeElement.querySelectorAll('.context-menu-item');
        expect(menuItems.length).toBe(2);
        expect(menuItems[0].textContent).toContain('Test Item 1');
        expect(menuItems[1].textContent).toContain('Test Item 2');
    });
    it('should handle item clicks', () => {
        const mockAction = jest.fn();
        const testItems = [
            { id: 'test1', label: 'Test Item 1', action: mockAction }
        ];
        component.items.set(testItems);
        component.isVisible.set(true);
        fixture.detectChanges();
        const menuItem = fixture.nativeElement.querySelector('.context-menu-item');
        menuItem.click();
        expect(mockAction).toHaveBeenCalled();
    });
    it('should emit itemSelected on item click', () => {
        const testItems = [
            { id: 'test1', label: 'Test Item 1' }
        ];
        component.items.set(testItems);
        component.isVisible.set(true);
        fixture.detectChanges();
        jest.spyOn(component.itemSelected, 'emit');
        const menuItem = fixture.nativeElement.querySelector('.context-menu-item');
        menuItem.click();
        expect(component.itemSelected.emit).toHaveBeenCalledWith(testItems[0]);
    });
    it('should handle keyboard navigation', () => {
        const testItems = [
            { id: 'test1', label: 'Test Item 1' },
            { id: 'test2', label: 'Test Item 2' }
        ];
        component.items.set(testItems);
        component.isVisible.set(true);
        fixture.detectChanges();
        const menuContainer = fixture.nativeElement.querySelector('.context-menu');
        // Test Arrow Down
        const arrowDownEvent = new KeyboardEvent('keydown', { key: 'ArrowDown' });
        menuContainer.dispatchEvent(arrowDownEvent);
        // Test Arrow Up
        const arrowUpEvent = new KeyboardEvent('keydown', { key: 'ArrowUp' });
        menuContainer.dispatchEvent(arrowUpEvent);
        // Test Enter
        const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
        menuContainer.dispatchEvent(enterEvent);
        expect(component).toBeTruthy(); // Basic test that events don't crash
    });
    it('should handle escape key to close menu', () => {
        component.isVisible.set(true);
        fixture.detectChanges();
        jest.spyOn(component.menuClosed, 'emit');
        const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
        document.dispatchEvent(escapeEvent);
        expect(component.menuClosed.emit).toHaveBeenCalled();
    });
    it('should display separators', () => {
        const testItems = [
            { id: 'test1', label: 'Test Item 1' },
            { id: 'sep1', separator: true },
            { id: 'test2', label: 'Test Item 2' }
        ];
        component.items.set(testItems);
        component.isVisible.set(true);
        fixture.detectChanges();
        const separator = fixture.nativeElement.querySelector('.context-menu-separator');
        expect(separator).toBeTruthy();
    });
    it('should display shortcuts', () => {
        const testItems = [
            { id: 'test1', label: 'Test Item 1', shortcut: 'Ctrl+T' }
        ];
        component.items.set(testItems);
        component.isVisible.set(true);
        fixture.detectChanges();
        const shortcut = fixture.nativeElement.querySelector('.context-menu-shortcut');
        expect(shortcut.textContent).toContain('Ctrl+T');
    });
    it('should handle disabled items', () => {
        const testItems = [
            { id: 'test1', label: 'Test Item 1', disabled: true }
        ];
        component.items.set(testItems);
        component.isVisible.set(true);
        fixture.detectChanges();
        const menuItem = fixture.nativeElement.querySelector('.context-menu-item');
        expect(menuItem.classList.contains('disabled')).toBe(true);
    });
    it('should handle submenus', () => {
        const testItems = [
            {
                id: 'test1',
                label: 'Test Item 1',
                submenu: [
                    { id: 'sub1', label: 'Sub Item 1' }
                ]
            }
        ];
        component.items.set(testItems);
        component.isVisible.set(true);
        fixture.detectChanges();
        const menuItem = fixture.nativeElement.querySelector('.context-menu-item');
        expect(menuItem.classList.contains('has-submenu')).toBe(true);
    });
    it('should position menu correctly', () => {
        const position = { x: 100, y: 200 };
        component.position.set(position);
        component.isVisible.set(true);
        fixture.detectChanges();
        const menu = fixture.nativeElement.querySelector('.context-menu');
        expect(menu.style.left).toBe('100px');
        expect(menu.style.top).toBe('200px');
    });
    it('should adjust position if menu goes off-screen', () => {
        // Mock window dimensions
        Object.defineProperty(window, 'innerWidth', { value: 800 });
        Object.defineProperty(window, 'innerHeight', { value: 600 });
        const position = { x: 750, y: 550 };
        component.position.set(position);
        component.isVisible.set(true);
        fixture.detectChanges();
        // showAt method should adjust position
        const testItems = [
            { id: 'test1', label: 'Test Item 1' }
        ];
        component.showAt(position.x, position.y, testItems);
        expect(component.position().x).toBeLessThan(750);
        expect(component.position().y).toBeLessThan(550);
    });
    it('should handle outside clicks', () => {
        component.isVisible.set(true);
        fixture.detectChanges();
        jest.spyOn(component.menuClosed, 'emit');
        // Click outside the menu
        const outsideElement = document.createElement('div');
        document.body.appendChild(outsideElement);
        outsideElement.click();
        expect(component.menuClosed.emit).toHaveBeenCalled();
        document.body.removeChild(outsideElement);
    });
    it('should clean up event listeners on destroy', () => {
        component.isVisible.set(true);
        fixture.detectChanges();
        jest.spyOn(document, 'removeEventListener');
        component.ngOnDestroy();
        expect(document.removeEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
        expect(document.removeEventListener).toHaveBeenCalledWith('click', expect.any(Function));
    });
});
//# sourceMappingURL=context-menu.component.spec.js.map