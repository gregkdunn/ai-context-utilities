---
applyTo:
  - "**/*.ts"
  - "**/*.tsx"
  - "**/*.js"
  - "**/*.jsx"
category: "Code Quality"
dependencies:
  - "@typescript-eslint/no-explicit-any"
  - "@typescript-eslint/consistent-type-imports"
  - "@typescript-eslint/naming-convention"
  - "@typescript-eslint/no-floating-promises"
  - "@typescript-eslint/prefer-nullish-coalescing"
  - "@typescript-eslint/prefer-optional-chain"
  - "@typescript-eslint/strict-boolean-expressions"
  - "@typescript-eslint/no-non-null-assertion"
  - "@typescript-eslint/no-unused-vars"
  - "prefer-const"
  - "no-var"
  - "eqeqeq"
  - "no-console"
description: "ESLint rules translated to natural language instructions"
fileTypes:
  - typescript
  - javascript
lastModified: "2025-01-31T20:15:42.123Z"
priority: 30
tags:
  - eslint
  - code-quality
  - automated-generation
---

# TypeScript Development Guidelines

*Generated from ESLint configuration*

## Type Safety

- Always use specific types instead of 'any'. When the type is truly unknown, use 'unknown' and add type guards.
- Always use explicit boolean expressions in if statements, avoid truthy/falsy checks on non-boolean values.
- Prefer to avoid non-null assertion operator (!). Use type guards or optional chaining instead.

## Import Organization

- Prefer to use 'import type' for type-only imports to improve bundling and compilation performance.

## Naming Conventions

- Interfaces should start with 'I' prefix and use PascalCase naming.
- Variables should use camelCase or UPPER_CASE naming.
- Functions should use camelCase naming.
- Classes should use PascalCase naming.
- Enums should use PascalCase naming.

## Asynchronous Code

- Always handle all Promises with await, .then(), or .catch(). Unhandled promises can cause silent failures.

## Modern JavaScript

- Always use 'const' for variables that are never reassigned.
- Always use 'let' or 'const' instead of 'var' for block-scoped variable declarations.
- Prefer to use nullish coalescing (??) instead of logical OR (||) when checking for null/undefined values.
- Prefer to use optional chaining (?.) instead of logical AND (&&) for accessing nested properties.

## General Code Quality

- Always use strict equality (===) and inequality (!==) operators.
- Prefer to remove unused variables and imports. Parameters matching '^_' are allowed. Variables matching '^_' are allowed.
- Prefer to limit console usage to warnings and errors only.

## Angular Best Practices

- Always ensure components have proper class suffix.
- Always use 'app' prefix with kebab-case style for component selectors.
- Always use 'app' prefix with camelCase style for directive selectors.
- Always avoid renaming inputs and outputs.
- Always implement lifecycle interfaces when using lifecycle hooks.

## Template Guidelines

- Always avoid negated async expressions in templates.
- Always use trackBy functions with *ngFor directives.

## Testing Overrides

*For test files (*.spec.ts), the following relaxed rules apply:*
- Explicit 'any' type is allowed in test files for mocking and test setup.
- Non-null assertions are allowed in test files for test data preparation.