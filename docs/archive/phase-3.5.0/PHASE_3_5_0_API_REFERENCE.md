# Phase 3.5.0 API Reference

## Overview

Phase 3.5.0 introduces sophisticated Copilot instruction generation capabilities with ESLint rule translation, Prettier configuration parsing, user override systems, and intelligent file prioritization.

## Core Modules

### ESLintConfigParser

Parses ESLint configurations and translates rules to natural language instructions.

#### Constructor

```typescript
new ESLintConfigParser()
```

#### Methods

##### `parseConfiguration(projectPath: string): Promise<ESLintConfigResult | null>`

Parses ESLint configuration from a project directory.

**Parameters:**
- `projectPath`: Absolute path to the project root

**Returns:**
- `ESLintConfigResult` object containing parsed rules and metadata
- `null` if no configuration found or parsing fails

**Example:**
```typescript
const parser = new ESLintConfigParser();
const result = await parser.parseConfiguration('/path/to/project');

if (result) {
  console.log(`Found ${result.rules.length} ESLint rules`);
  console.log(`Parser: ${result.parser}`);
  console.log(`Type-aware: ${result.typeAware}`);
}
```

#### Types

##### `ESLintConfigResult`

```typescript
interface ESLintConfigResult {
  rules: ParsedRule[];           // Translated rules
  parser: string | null;         // ESLint parser (e.g., '@typescript-eslint/parser')
  plugins: string[];             // Enabled plugins
  typeAware: boolean;            // Whether type checking is enabled
  configPath: string | null;     // Path to config file
}
```

##### `ParsedRule`

```typescript
interface ParsedRule {
  name: string;                  // Rule name (e.g., '@typescript-eslint/no-explicit-any')
  severity: 'error' | 'warn' | 'off';
  options: any[];                // Rule configuration options
  translation: string;           // Human-readable instruction
  category: string;              // Rule category (e.g., 'Type Safety')
}
```

#### Supported Configuration Formats

- **Flat Config** (ESLint 9+): `eslint.config.js`, `eslint.config.mjs`, `eslint.config.ts`
- **Legacy Config**: `.eslintrc.json`, `.eslintrc.js`, `.eslintrc.yaml`, etc.
- **Package.json**: `eslintConfig` property

#### Rule Categories

- **Type Safety**: Rules ensuring TypeScript type correctness
- **Import Organization**: Import/export related rules
- **Naming Conventions**: Variable, function, class naming rules
- **Asynchronous Code**: Promise and async/await rules
- **Modern JavaScript**: ES6+ feature usage rules
- **React Best Practices**: React-specific rules
- **Angular Best Practices**: Angular-specific rules
- **General Code Quality**: Miscellaneous quality rules

---

### PrettierConfigParser

Parses Prettier configurations and generates formatting instructions.

#### Constructor

```typescript
new PrettierConfigParser()
```

#### Methods

##### `parseConfiguration(filePath: string): Promise<PrettierConfigResult | null>`

Parses Prettier configuration for a specific file.

**Parameters:**
- `filePath`: Absolute path to a file in the project

**Returns:**
- `PrettierConfigResult` object with configuration and instructions
- `null` if parsing fails

##### `findPrettierConfig(projectPath: string): Promise<string | null>`

Locates Prettier configuration file in project.

**Parameters:**
- `projectPath`: Absolute path to project root

**Returns:**
- Path to configuration file or `null` if not found

##### `validateConfiguration(configPath: string): Promise<{valid: boolean; error?: string}>`

Validates Prettier configuration.

**Parameters:**
- `configPath`: Path to configuration file

**Returns:**
- Validation result with error details if invalid

##### `generateFormattingSection(options: prettier.Options): string`

Generates formatted instruction section from Prettier options.

**Parameters:**
- `options`: Prettier configuration options

**Returns:**
- Markdown-formatted instruction text

#### Types

##### `PrettierConfigResult`

```typescript
interface PrettierConfigResult {
  options: prettier.Options;     // Prettier configuration options
  configPath: string | null;     // Path to config file
  ignored: boolean;              // Whether file is ignored
  inferredParser: string | null; // Detected parser
  instructions: string[];        // Generated instructions
}
```

#### Supported Configuration Files

- `.prettierrc`, `.prettierrc.json`, `.prettierrc.yaml`, `.prettierrc.yml`
- `.prettierrc.js`, `.prettierrc.mjs`, `.prettierrc.cjs`
- `prettier.config.js`, `prettier.config.mjs`, `prettier.config.cjs`
- `package.json` (`prettier` property)

---

### UserOverrideManager

Manages user-customizable instruction overrides with highest priority.

#### Constructor

```typescript
new UserOverrideManager(workspaceRoot: string)
```

**Parameters:**
- `workspaceRoot`: Absolute path to workspace root

#### Methods

##### `ensureOverrideFileExists(): Promise<void>`

Creates user override file if it doesn't exist and shows welcome message.

##### `openOverrideFile(): Promise<void>`

Opens the user override file in VS Code editor.

##### `loadUserOverrides(): Promise<string | null>`

Loads content of user override file.

**Returns:**
- File content as string or `null` if file doesn't exist

##### `addOverrideEntry(type: string, context: OverrideContext): Promise<void>`

Adds new override entry to user file.

**Parameters:**
- `type`: Override type ('🎯 Specific Rule Override', '📝 Style Preference', etc.)
- `context`: Override context with details

#### Types

##### `OverrideContext`

```typescript
interface OverrideContext {
  overrideFilePath: string;      // Path to override file
  suggestion?: string;           // AI suggestion to override
  userPreference?: string;       // User's preferred approach
  reason?: string;               // Reason for override
  whenToApply?: string;          // When to apply this override
  justification?: string;        // Detailed justification
}
```

#### Override Types

1. **Specific Rule Override**: Override specific AI recommendations
2. **Style Preference**: Document coding style preferences
3. **Architecture Decision**: Record architectural choices
4. **Custom Pattern**: Define project-specific patterns

#### File Structure

The user override file uses this structure:

```markdown
---
applyTo: "**/*"
priority: 1000
userOverride: true
lastModified: "2025-01-15T10:30:00Z"
description: "User-customizable instructions"
---

# User Override Instructions

## Quick Override Examples
<!-- User's overrides here -->
```

---

### YAMLFrontmatterGenerator

Generates YAML frontmatter for instruction files with metadata and targeting.

#### Constructor

```typescript
new YAMLFrontmatterGenerator()
```

#### Methods

##### `generateFrontmatter(options: FrontmatterOptions): string`

Generates YAML frontmatter block.

**Parameters:**
- `options`: Frontmatter configuration options

**Returns:**
- YAML frontmatter block wrapped in `---`

##### `generateForFramework(framework: string, metadata: InstructionMetadata): string`

Generates framework-specific frontmatter.

**Parameters:**
- `framework`: Framework name ('angular', 'react', 'vue', etc.)
- `metadata`: Framework detection metadata

**Returns:**
- Framework-optimized frontmatter

##### `parseExistingFrontmatter(content: string): {frontmatter: FrontmatterOptions | null; body: string}`

Parses existing frontmatter from instruction file.

**Parameters:**
- `content`: Full file content

**Returns:**
- Object with parsed frontmatter and body content

##### `updateFrontmatter(content: string, updates: Partial<FrontmatterOptions>): string`

Updates existing frontmatter with new values.

**Parameters:**
- `content`: Original file content
- `updates`: Partial updates to apply

**Returns:**
- Updated file content with modified frontmatter

##### `validateFrontmatter(frontmatter: FrontmatterOptions): {valid: boolean; errors: string[]}`

Validates frontmatter options.

**Parameters:**
- `frontmatter`: Frontmatter to validate

**Returns:**
- Validation result with error details

#### Predefined Generators

##### `generateUserOverrideFrontmatter(): string`

Generates frontmatter for user override file (priority 1000).

##### `generateProjectSpecificFrontmatter(projectName?: string): string`

Generates frontmatter for project-specific instructions (priority 200).

##### `generateESLintRulesFrontmatter(eslintRules: string[]): string`

Generates frontmatter for ESLint rules file (priority 30).

##### `generatePrettierConfigFrontmatter(): string`

Generates frontmatter for Prettier configuration file (priority 20).

#### Types

##### `FrontmatterOptions`

```typescript
interface FrontmatterOptions {
  applyTo?: string | string[];   // File patterns to target
  priority?: number;             // Priority (0-1000)
  framework?: string;            // Framework name
  category?: string;             // Instruction category
  description?: string;          // Human-readable description
  userOverride?: boolean;        // Whether this is user-editable
  lastModified?: string;         // ISO timestamp
  version?: string;              // Framework version
  tags?: string[];               // Categorization tags
  fileTypes?: string[];          // File types (typescript, javascript, etc.)
  excludePatterns?: string[];    // Patterns to exclude
  author?: string;               // Author information
  dependencies?: string[];       // Required dependencies
  requiredPlugins?: string[];    // Required ESLint plugins
}
```

##### `InstructionMetadata`

```typescript
interface InstructionMetadata {
  framework: string;             // Framework name
  version: string;               // Framework version
  confidence: number;            // Detection confidence (0-1)
  detectedFeatures: string[];    // Detected framework features
  dependencies?: string[];       // Framework dependencies
  eslintRules?: string[];        // Related ESLint rules
  prettierConfig?: boolean;      // Whether Prettier is configured
  testingFramework?: string;     // Testing framework used
  buildTool?: string;            // Build tool used
}
```

#### Priority System

The priority system determines instruction precedence:

- **1000**: User overrides (highest)
- **200**: Project-specific instructions
- **100**: Angular framework instructions
- **95**: React framework instructions
- **90**: Vue framework instructions  
- **50**: TypeScript language instructions
- **40**: Testing framework instructions
- **30**: ESLint rules instructions
- **20**: Prettier configuration instructions
- **10**: General Copilot instructions (lowest)

---

### InstructionPriorityManager

Manages loading, validation, and merging of instruction files by priority.

#### Constructor

```typescript
new InstructionPriorityManager(workspaceRoot: string)
```

**Parameters:**
- `workspaceRoot`: Absolute path to workspace root

#### Methods

##### `loadAllInstructions(): Promise<PrioritizedInstruction[]>`

Loads all instruction files and sorts by priority.

**Returns:**
- Array of instructions sorted by priority (highest first)

##### `validateInstructionHierarchy(): Promise<{valid: boolean; issues: string[]}>`

Validates instruction file hierarchy for conflicts.

**Returns:**
- Validation result with identified issues

##### `generateMergedInstructions(): Promise<string>`

Generates single merged instruction file from all sources.

**Returns:**
- Markdown content with all instructions merged by priority

##### `exportInstructionSummary(): Promise<{summary: string; stats: any}>`

Exports summary of all instruction files with statistics.

**Returns:**
- Object with formatted summary and statistics

#### Types

##### `PrioritizedInstruction`

```typescript
interface PrioritizedInstruction extends ParsedInstruction {
  filePath: string;              // Path to instruction file
  priority: number;              // Calculated priority
  category: string;              // Instruction category
}
```

##### `ParsedInstruction`

```typescript
interface ParsedInstruction {
  content: string;               // Instruction content (without frontmatter)
  frontmatter: {                 // Parsed YAML frontmatter
    applyTo?: string;
    priority?: number;
    userOverride?: boolean;
    lastModified?: string;
    description?: string;
    framework?: string;
    category?: string;
  };
}
```

---

### CopilotInstructionsGenerator

Main orchestrator that coordinates all Phase 3.5.0 features.

#### Constructor

```typescript
new CopilotInstructionsGenerator(
  services: ServiceContainer,
  outputChannel: vscode.OutputChannel,
  backupManager: InstructionBackupManager
)
```

#### Methods

##### `run(progress: vscode.Progress<{message?: string; increment?: number}>, token: vscode.CancellationToken): Promise<void>`

Main entry point for instruction generation workflow.

**Parameters:**
- `progress`: VS Code progress reporter
- `token`: Cancellation token

#### Generation Workflow

1. **Setup**: Ensure user override file exists
2. **Configuration**: Get user setup preferences (quick/custom/browse)
3. **Analysis**: Analyze workspace for frameworks and dependencies
4. **Parsing**: Parse ESLint and Prettier configurations
5. **Detection**: Detect frameworks and their features
6. **Generation**: Generate instruction files with frontmatter
7. **Preview**: Show user preview of generated instructions
8. **Writing**: Write instruction files to disk
9. **Success**: Show completion notification

#### Generated Files

The generator creates these files:

- `.github/copilot-instructions.md`: Main instruction file
- `.github/instructions/user-overrides.instructions.md`: User overrides (priority 1000)
- `.github/instructions/eslint-rules.instructions.md`: ESLint rule translations
- `.github/instructions/prettier-formatting.instructions.md`: Prettier guidelines
- `.github/instructions/{framework}.instructions.md`: Framework-specific instructions

---

## Integration Examples

### Complete Workflow Example

```typescript
import { CopilotInstructionsGenerator } from './CopilotInstructionsGenerator';
import { ServiceContainer } from '../../../core/ServiceContainer';
import { InstructionBackupManager } from './InstructionBackupManager';

// Initialize services
const services = new ServiceContainer(workspaceRoot);
const outputChannel = vscode.window.createOutputChannel('AI Debug Context');
const backupManager = new InstructionBackupManager(workspaceRoot, outputChannel);

// Create generator
const generator = new CopilotInstructionsGenerator(services, outputChannel, backupManager);

// Run generation with progress
await vscode.window.withProgress({
  location: vscode.ProgressLocation.Notification,
  title: 'Generating Copilot Instructions',
  cancellable: true
}, async (progress, token) => {
  await generator.run(progress, token);
});
```

### Custom ESLint Rule Translation

```typescript
import { ESLintConfigParser } from './parsing/ESLintConfigParser';

const parser = new ESLintConfigParser();
const result = await parser.parseConfiguration('/path/to/project');

if (result) {
  result.rules.forEach(rule => {
    console.log(`${rule.name} (${rule.severity}): ${rule.translation}`);
  });
}
```

### User Override Management

```typescript
import { UserOverrideManager } from './override/UserOverrideManager';

const manager = new UserOverrideManager('/workspace/root');

// Ensure override file exists
await manager.ensureOverrideFileExists();

// Add custom override
await manager.addOverrideEntry('🎯 Specific Rule Override', {
  overrideFilePath: '/workspace/.github/instructions/user-overrides.instructions.md',
  suggestion: 'Use signals for all state',
  userPreference: 'Use observables for complex state',
  reason: 'Team expertise with RxJS'
});
```

### YAML Frontmatter Generation

```typescript
import { YAMLFrontmatterGenerator } from './frontmatter/YAMLFrontmatterGenerator';

const generator = new YAMLFrontmatterGenerator();

// Generate Angular-specific frontmatter
const frontmatter = generator.generateForFramework('angular', {
  framework: 'Angular',
  version: '17.0.0',
  confidence: 0.9,
  detectedFeatures: ['control-flow', 'signals']
});

// Create complete instruction file
const content = '# Angular Guidelines\n\n- Use control flow syntax\n- Prefer signals for simple state';
const completeFile = generator.generateCompleteInstructionFile({
  applyTo: ['**/*.component.ts', '**/*.service.ts'],
  priority: 100,
  framework: 'angular'
}, content);
```

---

## Error Handling

All APIs include comprehensive error handling:

### ESLint Parser Errors
- Invalid configuration files are gracefully skipped
- Parsing errors return `null` rather than throwing
- Malformed rules are filtered out automatically

### Prettier Parser Errors
- Missing configurations return empty options
- Invalid formatting options are validated
- File access errors are caught and logged

### User Override Errors
- File creation failures are reported to user
- Template generation errors fall back to basic templates
- File access issues are handled gracefully

### Frontmatter Validation
- Invalid priorities are caught and reported
- Unknown frameworks generate warnings
- Malformed YAML is detected and fixed

---

## Performance Considerations

### Caching
- ESLint configurations are cached per workspace
- Prettier configurations are cached with TTL
- Framework detection results are cached
- Template generation is memoized

### Async Operations
- All file operations are asynchronous
- Progress reporting for long operations
- Cancellation support for user interruption
- Parallel processing where possible

### Memory Management
- Large configuration files are streamed
- Template results are garbage collected
- File handles are properly closed
- Event listeners are disposed

---

## Extension Points

### Custom Rule Translators
```typescript
class CustomRuleTranslator implements RuleTranslator {
  translateRule(ruleName: string, ruleConfig: any): string {
    // Custom translation logic
  }
}
```

### Framework Detectors
```typescript
class CustomFrameworkDetector {
  async detectFramework(workspacePath: string): Promise<FrameworkInfo> {
    // Custom detection logic
  }
}
```

### Template Engines
```typescript
class CustomTemplateEngine {
  generateInstructions(framework: string, metadata: any): string {
    // Custom template generation
  }
}
```

This API reference provides complete documentation for all Phase 3.5.0 features, enabling developers to effectively use and extend the Copilot instruction generation capabilities.