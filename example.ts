// Example TypeScript file for testing
export function add(a: number, b: number): number {
    return a + b;
}

export function multiply(a: number, b: number): number {
    return a * b;
}

// New function to test affected detection
export function subtract(a: number, b: number): number {
    return a - b;
}

// Testing change detection
export function divide(a: number, b: number): number {
    if (b === 0) throw new Error('Division by zero');
    return a / b;
}// Testing uncommitted change detection
