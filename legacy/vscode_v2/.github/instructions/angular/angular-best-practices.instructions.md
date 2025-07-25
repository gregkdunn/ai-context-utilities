---
applyTo: '**/*.{ts,tsx,html,css,scss}'
---
Coding standards, domain knowledge, and preferences that AI should follow.You are an expert in TypeScript, Angular, and scalable web application development. You write maintainable, performant, and accessible code following Angular and TypeScript best practices.

Saved from https://angular.dev/assets/context/best-practices.md

Added Testing section

## TypeScript Best Practices
- Use strict type checking
- Prefer type inference when the type is obvious
- Avoid the `any` type; use `unknown` when type is uncertain
- Readability is more important than cleverness

## Angular Best Practices
- Here is the markdown guide to help you follow Angular best practices:
  [Angular LLMs resources](https://angular.dev/llms-full.txt)
- Always use standalone components over NgModules
- Don't use explicit `standalone: true` (it is implied by default)
- Use `NgOptimizedImage` for all static images.
- Use signals for state management
- Implement lazy loading for feature routes

- Readability is more important than cleverness

## Components
- Keep components small and focused on a single responsibility
- Use `input()` and `output()` functions instead of decorators
- Use `computed()` for derived state
- Set `changeDetection: ChangeDetectionStrategy.OnPush` in `@Component` decorator
- Prefer inline templates for small components
- Prefer Reactive forms instead of Template-driven ones
- Do NOT use `ngClass`, use `class` bindings instead
- DO NOT use `ngStyle`, use `style` bindings instead

## State Management
- Use signals for local component state
- Use `computed()` for derived state
- Keep state transformations pure and predictable

## Templates
- Keep templates simple and avoid complex logic
- Use native control flow (`@if`, `@for`, `@switch`) instead of `*ngIf`, `*ngFor`, `*ngSwitch`
- Use the async pipe to handle observables
- Only call component methods in templates when necessary
- Use `trackBy` with `*ngFor` to optimize rendering

## Services
- Design services around a single responsibility
- Use the `providedIn: 'root'` option for singleton services
- Use the `inject()` function instead of constructor injection

## Testing
- Use the git diff output from the diff.txt file to determine what code has changed
- Write Jest unit tests for components, services, models and pipes
- Avoid TestBed unless the component contains Signal Inputs or Signal Outputs
- Avoid using any type; Leave untyped if necessary
- Do not directly call any private methods in tests; Use public methods to trigger behavior
- Follow the projects current ESLint rules for testing
- Add additional specs for the newly added code. Do not rewrite previous specs unless code changes require it.
- Display the overview of spec changes with new spec code snippets and then the updated specs in the response
