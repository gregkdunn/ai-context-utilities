// Example test file for testing affected test detection
import { add, multiply } from './example';

describe('example functions', () => {
    describe('add', () => {
        it('should add two numbers correctly', () => {
            expect(add(2, 3)).toBe(5);
        });

        it('should handle negative numbers', () => {
            expect(add(-1, 1)).toBe(0);
        });
    });

    describe('multiply', () => {
        it('should multiply two numbers correctly', () => {
            expect(multiply(3, 4)).toBe(12);
        });

        it('should handle zero', () => {
            expect(multiply(5, 0)).toBe(0);
        });
    });
});