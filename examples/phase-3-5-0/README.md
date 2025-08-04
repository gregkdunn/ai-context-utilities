# Phase 3.5.0 Examples

This directory contains example configurations and generated outputs demonstrating the Phase 3.5.0 Copilot Instructions feature.

## Example Files

### Input Configurations

#### `example-eslint-config.json`
A comprehensive ESLint configuration for an Angular TypeScript project, including:
- TypeScript-specific rules with type checking
- Angular-specific linting rules
- Naming conventions and code quality rules
- Test file overrides
- Template linting configuration

**Key Rules Demonstrated:**
- `@typescript-eslint/no-explicit-any`: Prevents use of `any` type
- `@typescript-eslint/consistent-type-imports`: Enforces type-only imports
- `@typescript-eslint/naming-convention`: Enforces naming patterns
- Angular component and directive selector rules
- Template best practices

#### `example-prettier-config.json`
A complete Prettier configuration showing:
- Code formatting preferences (semicolons, quotes, spacing)
- File-specific overrides for Markdown, JSON, and HTML
- Print width and indentation settings
- JSX formatting preferences

**Key Settings:**
- No semicolons (`"semi": false`)
- Single quotes (`"singleQuote": true`)
- 100 character line width
- ES5 trailing commas
- File-specific overrides

### Generated Outputs

#### `generated-eslint-instructions.md`
Shows how Phase 3.5.0 transforms ESLint rules into natural language instructions:

- **YAML Frontmatter**: Includes targeting, priority, and metadata
- **Categorized Rules**: Groups rules by purpose (Type Safety, Import Organization, etc.)
- **Natural Language**: Converts technical rules to readable instructions
- **Context-Aware**: Includes Angular-specific and testing overrides

**Example Translation:**
```
ESLint Rule: "@typescript-eslint/no-explicit-any": "error"
Generated Instruction: "Always use specific types instead of 'any'. When the type is truly unknown, use 'unknown' and add type guards."
```

#### `generated-prettier-instructions.md`
Demonstrates Prettier configuration translation:

- **Formatting Guidelines**: Clear instructions for code formatting
- **File-Specific Rules**: Overrides for different file types
- **Configuration Reference**: Includes actual Prettier config for reference

#### `generated-angular-instructions.md`
Shows framework-specific instruction generation:

- **Angular 17+ Features**: Control flow syntax, signals, standalone components
- **Modern Patterns**: Current best practices and migration guidance
- **Code Examples**: Practical implementation examples
- **Performance Tips**: Angular-specific optimization guidance

#### `user-overrides-example.md`
Example of a complete user customization file:

- **Team Decisions**: Documented architectural choices
- **Style Preferences**: Project-specific coding patterns
- **Override Examples**: How to override AI suggestions
- **Workflow Guidelines**: Team processes and conventions

## Usage Examples

### 1. Basic ESLint Rule Translation

**Input Configuration:**
```json
{
  "rules": {
    "@typescript-eslint/no-explicit-any": "error",
    "prefer-const": "warn"
  }
}
```

**Generated Instructions:**
```markdown
## Type Safety
- Always use specific types instead of 'any'. When the type is truly unknown, use 'unknown' and add type guards.

## Modern JavaScript
- Prefer to use 'const' for variables that are never reassigned.
```

### 2. Framework-Specific Generation

**Detected Framework:** Angular 17.0.0 with signals and control flow

**Generated Content:**
- New control flow syntax examples (`@if`, `@for`, `@switch`)
- Signal-based state management patterns
- Standalone component architecture
- Modern input/output decorators

### 3. User Override Integration

**Scenario:** Team prefers RxJS observables over signals for complex state

**Override File Entry:**
```markdown
### Override: State Management

```typescript
// ❌ AI might suggest: Use signals for all state
// ✅ My preference: Use observables for complex state
// Reason: Team expertise and existing patterns
```
```

### 4. Priority System in Action

**File Hierarchy:**
1. `user-overrides.instructions.md` (Priority: 1000) - Team decisions override everything
2. `angular.instructions.md` (Priority: 100) - Framework-specific guidelines
3. `eslint-rules.instructions.md` (Priority: 30) - Code quality rules
4. `prettier-formatting.instructions.md` (Priority: 20) - Formatting preferences

## Testing the Examples

### Using the Example ESLint Config

1. Copy `example-eslint-config.json` to your project as `.eslintrc.json`
2. Run Phase 3.5.0 generation
3. Compare output with `generated-eslint-instructions.md`

### Testing Prettier Integration

1. Copy `example-prettier-config.json` to your project as `.prettierrc`
2. Run Phase 3.5.0 generation  
3. Verify formatting instructions match `generated-prettier-instructions.md`

### Creating Custom Overrides

1. Use `user-overrides-example.md` as a template
2. Customize for your team's specific needs
3. Test that higher priority rules override generated content

## Real-World Scenarios

### Enterprise Angular Project

**Configuration:**
- 50+ ESLint rules with type checking
- Strict Prettier formatting
- Angular 17+ with modern features
- Custom team architectural decisions

**Generated Files:**
- Main instructions with project overview
- ESLint rules translated to 8 categories
- Prettier formatting with file-specific overrides
- Angular 17+ patterns and migration guidance
- Team override file with architectural decisions

### React/Next.js Startup

**Configuration:**
- TypeScript strict mode
- React 18+ with Server Components
- Modern testing setup (Vitest)
- Minimal but focused ESLint rules

**Generated Files:**
- React 18+ patterns and best practices
- TypeScript strict mode guidelines
- Testing patterns for modern React
- Prettier formatting for JSX/TSX

### Vue 3 Composition API Project

**Configuration:**
- Vue 3 with Composition API
- TypeScript integration
- Vite build tool
- Component-focused architecture

**Generated Files:**
- Vue 3 Composition API patterns
- TypeScript integration guidelines
- Component architecture best practices
- Build tool specific optimizations

## Integration Testing

### Command Line Testing

```bash
# Install dependencies
npm install

# Run Phase 3.5.0 generation
# (Use VS Code Command Palette: "Add Copilot Instruction Contexts")

# Verify generated files
ls .github/instructions/
cat .github/instructions/eslint-rules.instructions.md
```

### Programmatic Testing

```typescript
import { ESLintConfigParser } from '../src/modules/copilotInstructions/parsing/ESLintConfigParser';

// Test ESLint parsing
const parser = new ESLintConfigParser();
const result = await parser.parseConfiguration('./examples/phase-3-5-0');

console.log(`Parsed ${result.rules.length} ESLint rules`);
console.log(`Type-aware: ${result.typeAware}`);
```

## Best Practices Demonstrated

### 1. Configuration Completeness
- Examples show comprehensive configurations rather than minimal setups
- Include edge cases and complex scenarios
- Demonstrate real-world usage patterns

### 2. Natural Language Quality
- Generated instructions are actionable and specific
- Technical jargon is translated to understandable terms
- Context is provided for rule rationale

### 3. Hierarchy and Priority
- Clear priority system prevents conflicts
- User overrides always take precedence
- Framework-specific rules are appropriately scoped

### 4. Maintainability
- Generated files include metadata for tracking
- User override files are designed for easy editing
- Configuration changes trigger appropriate regeneration

These examples provide a comprehensive overview of Phase 3.5.0 capabilities and demonstrate how the system transforms technical configurations into clear, actionable Copilot instructions.