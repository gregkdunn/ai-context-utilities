---
applyTo: "**/*"
category: "Code Formatting"
dependencies:
  - prettier
description: "Prettier configuration translated to formatting guidelines"
lastModified: "2025-01-31T20:15:42.456Z"
priority: 20
tags:
  - prettier
  - formatting
  - automated-generation
---

# Code Formatting Guidelines

*Generated from Prettier configuration*

## Formatting Rules

- Omit semicolons at the end of statements
- Use single quotes for strings instead of double quotes
- Use single quotes in JSX attributes
- Add trailing commas where valid in ES5 (objects, arrays, etc)
- Add spaces inside object literal braces: { foo: bar }
- Put the closing > of JSX multi-line elements on a new line
- Omit parentheses around single arrow function parameters: x => x
- Keep lines under 100 characters
- Use 2 spaces for indentation
- Use LF (\\n) line endings
- Automatically format embedded languages when possible
- Respect CSS whitespace sensitivity in HTML
- Preserve existing line breaks in prose

## File-Specific Overrides

### Markdown Files (*.md)
- Keep lines under 80 characters
- Always wrap prose to print width

### JSON Files (*.json)
- Keep lines under 120 characters
- Use 2 spaces for indentation

### HTML Files (*.html)
- Keep lines under 120 characters
- Ignore whitespace sensitivity for better formatting

## Configuration Details

The following Prettier options are configured for this project:

```json
{
  "semi": false,
  "singleQuote": true,
  "quoteProps": "as-needed",
  "jsxSingleQuote": true,
  "trailingComma": "es5",
  "bracketSpacing": true,
  "bracketSameLine": false,
  "arrowParens": "avoid",
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "endOfLine": "lf",
  "embeddedLanguageFormatting": "auto",
  "htmlWhitespaceSensitivity": "css",
  "proseWrap": "preserve",
  "vueIndentScriptAndStyle": false
}
```