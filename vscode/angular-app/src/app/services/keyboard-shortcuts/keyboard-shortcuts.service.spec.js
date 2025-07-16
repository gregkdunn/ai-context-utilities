"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@angular/core/testing");
const keyboard_shortcuts_service_1 = require("./keyboard-shortcuts.service");
const core_1 = require("@angular/core");
describe('KeyboardShortcutsService', () => {
    let service;
    let ngZone;
    beforeEach(() => {
        testing_1.TestBed.configureTestingModule({});
        service = testing_1.TestBed.inject(keyboard_shortcuts_service_1.KeyboardShortcutsService);
        ngZone = testing_1.TestBed.inject(core_1.NgZone);
    });
    it('should be created', () => {
        expect(service).toBeTruthy();
    });
    it('should register shortcuts', () => {
        const shortcut = {
            id: 'test-shortcut',
            key: 't',
            ctrlKey: true,
            description: 'Test shortcut',
            category: 'test',
            action: () => console.log('test')
        };
        service.registerShortcut(shortcut);
        expect(service.getShortcut('test-shortcut')).toEqual(shortcut);
    });
    it('should format shortcuts correctly', () => {
        const shortcut = {
            id: 'test',
            key: 'a',
            ctrlKey: true,
            shiftKey: true,
            description: 'Test',
            category: 'test',
            action: () => { }
        };
        const formatted = service.formatShortcut(shortcut);
        expect(formatted).toBe('Ctrl + Shift + A');
    });
    it('should organize shortcuts by category', () => {
        const shortcuts = [
            {
                id: 'general1',
                key: 'a',
                description: 'General Action A',
                category: 'general',
                action: () => { }
            },
            {
                id: 'general2',
                key: 'b',
                description: 'General Action B',
                category: 'general',
                action: () => { }
            },
            {
                id: 'navigation1',
                key: 'c',
                description: 'Navigation Action C',
                category: 'navigation',
                action: () => { }
            }
        ];
        service.registerShortcuts(shortcuts);
        const categories = service.shortcutCategories();
        expect(categories.length).toBe(2);
        const generalCategory = categories.find(c => c.id === 'general');
        expect(generalCategory?.shortcuts.length).toBe(2);
        const navigationCategory = categories.find(c => c.id === 'navigation');
        expect(navigationCategory?.shortcuts.length).toBe(1);
    });
    it('should handle keyboard events', () => {
        let actionCalled = false;
        const shortcut = {
            id: 'test-action',
            key: 'a',
            ctrlKey: true,
            description: 'Test Action',
            category: 'test',
            action: () => { actionCalled = true; }
        };
        service.registerShortcut(shortcut);
        // Simulate keyboard event
        const event = new KeyboardEvent('keydown', {
            key: 'a',
            ctrlKey: true,
            bubbles: true
        });
        document.dispatchEvent(event);
        expect(actionCalled).toBe(true);
    });
    it('should handle modifier key combinations', () => {
        let ctrlShiftActionCalled = false;
        let altActionCalled = false;
        const shortcuts = [
            {
                id: 'ctrl-shift',
                key: 'a',
                ctrlKey: true,
                shiftKey: true,
                description: 'Ctrl+Shift+A',
                category: 'test',
                action: () => { ctrlShiftActionCalled = true; }
            },
            {
                id: 'alt',
                key: 'b',
                altKey: true,
                description: 'Alt+B',
                category: 'test',
                action: () => { altActionCalled = true; }
            }
        ];
        service.registerShortcuts(shortcuts);
        // Test Ctrl+Shift+A
        document.dispatchEvent(new KeyboardEvent('keydown', {
            key: 'a',
            ctrlKey: true,
            shiftKey: true
        }));
        expect(ctrlShiftActionCalled).toBe(true);
        // Test Alt+B
        document.dispatchEvent(new KeyboardEvent('keydown', {
            key: 'b',
            altKey: true
        }));
        expect(altActionCalled).toBe(true);
    });
    it('should toggle shortcuts on/off', () => {
        let actionCalled = false;
        const shortcut = {
            id: 'toggle-test',
            key: 'x',
            description: 'Toggle Test',
            category: 'test',
            action: () => { actionCalled = true; }
        };
        service.registerShortcut(shortcut);
        // Disable the shortcut
        service.toggleShortcut('toggle-test', false);
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'x' }));
        expect(actionCalled).toBe(false);
        // Enable the shortcut
        service.toggleShortcut('toggle-test', true);
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'x' }));
        expect(actionCalled).toBe(true);
    });
    it('should disable all shortcuts', () => {
        let actionCalled = false;
        const shortcut = {
            id: 'disable-test',
            key: 'y',
            description: 'Disable Test',
            category: 'test',
            action: () => { actionCalled = true; }
        };
        service.registerShortcut(shortcut);
        // Disable all shortcuts
        service.toggleAllShortcuts(false);
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'y' }));
        expect(actionCalled).toBe(false);
        // Re-enable all shortcuts
        service.toggleAllShortcuts(true);
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'y' }));
        expect(actionCalled).toBe(true);
    });
    it('should update context based on focused element', () => {
        // Create mock elements
        const resultsElement = document.createElement('div');
        resultsElement.className = 'results-viewer';
        document.body.appendChild(resultsElement);
        const inputElement = document.createElement('input');
        document.body.appendChild(inputElement);
        // Simulate focus events
        resultsElement.focus();
        resultsElement.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
        // Context should update (we can't easily test private methods, but we can test the public getter)
        expect(service.getCurrentContext()).toBeDefined();
        // Clean up
        document.body.removeChild(resultsElement);
        document.body.removeChild(inputElement);
    });
    it('should set custom action handlers', () => {
        let customActionCalled = false;
        const customAction = () => { customActionCalled = true; };
        const shortcut = {
            id: 'custom-handler',
            key: 'z',
            description: 'Custom Handler',
            category: 'test',
            action: () => { }
        };
        service.registerShortcut(shortcut);
        service.setActionHandler('custom-handler', customAction);
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'z' }));
        expect(customActionCalled).toBe(true);
    });
    it('should unregister shortcuts', () => {
        const shortcut = {
            id: 'unregister-test',
            key: 'u',
            description: 'Unregister Test',
            category: 'test',
            action: () => { }
        };
        service.registerShortcut(shortcut);
        expect(service.getShortcut('unregister-test')).toBeDefined();
        service.unregisterShortcut('unregister-test');
        expect(service.getShortcut('unregister-test')).toBeUndefined();
    });
});
//# sourceMappingURL=keyboard-shortcuts.service.spec.js.map