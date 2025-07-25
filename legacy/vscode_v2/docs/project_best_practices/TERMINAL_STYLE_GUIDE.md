# Terminal Style Guide - AI Debug Context Extension

This document provides a comprehensive style guide for creating terminal-themed UI components in the AI Debug Context VSCode extension.

Use Tailwind for all layout and styling, ensuring a consistent terminal aesthetic across the extension.

## Color Palette & Tailwind Integration

Based on `icon/colors.png`, use these exact hex colors with Tailwind styling:

### Core Terminal Colors
```css
/* Terminal Color Palette - Use with Tailwind style attribute */
--terminal-pink: #FF4B6D;    /* Errors, failures, missing requirements */
--terminal-orange: #FF8C42;  /* Warnings, attention items, restart commands */
--terminal-yellow: #FFD93D;  /* Highlights, status indicators, file links */
--terminal-green: #6BCF7F;   /* Success, completion, available services */
--terminal-cyan: #4ECDC4;    /* Information, data, commands */
--terminal-purple: #A8A8FF;  /* Special actions, analysis, prompts */
--terminal-bg: #1a1a1a;      /* Dark terminal background */
--terminal-border: #333;     /* Border color */
--terminal-muted: #666;      /* Muted text, separators */
--terminal-white: #e5e5e5;   /* Primary text (softer white) */
```

### Tailwind + Style Attribute Pattern
**Always combine Tailwind classes with inline styles for colors:**
```html
<!-- Good: Tailwind layout + inline colors -->
<div class="flex items-center gap-3 py-1" style="color: #6BCF7F;">

<!-- Bad: Pure CSS only -->
<div style="display: flex; align-items: center; gap: 12px; padding: 4px 0; color: #6BCF7F;">
```

## Core Styling Principles

### 1. Container Structure (Pure Tailwind + Colors)
- Make this the height of the extension view.

```html
<div class="bg-gray-900 rounded-lg border border-gray-700 font-mono text-sm h-full p-3" 
     style="background: #1a1a1a; border-color: #333;">
  <!-- Terminal content here -->
</div>
```

**Tailwind Classes Used:**
- `bg-gray-900`: Base background (overridden by inline style)
- `rounded-lg`: Rounded corners
- `border border-gray-700`: Border with base color (overridden by inline style)
- `font-mono`: Monospace font for terminal authenticity
- `text-sm`: Small text size
- `h-full`: Takes full height of available space
- `p-3`: Minimal padding (4px) for tight layout

**Color Overrides:** Always use inline `style` for terminal-specific colors

### 2. Typography (Tailwind Classes)
- **Primary Font**: `font-mono` (monospace for terminal feel)
- **Text Sizes**: `text-sm` (base), `text-xs` (metadata), `text-xl` (emphasis)
- **Font Weight**: `font-bold` (important elements), `font-medium` (headers)

### 3. Vertical Spacing System (Tailwind Classes)
**Enhanced spacing using Tailwind's space utilities:**

#### Section Spacing (Margin Bottom)
- **Major sections**: `pb-8` (32px between major sections)
- **Sub-sections**: `pb-6` (24px between sub-sections)
- **Content blocks**: `pb-4` (16px) or `pb-5` (20px between content)

#### Line Spacing (Space Between)
- **Terminal line groups**: `space-y-6` (24px between terminal line groups for blank line effect)
- **List items**: `space-y-4` (16px between list items)  
- **Pipeline status lines**: `space-y-5` (20px between pipeline items)
- **Analysis sections**: `space-y-6` (24px between analysis blocks for clear separation)

#### Individual Line Spacing (Padding)
- **Terminal command lines**: `py-2` (4px top/bottom padding per line)
- **Status indicators**: `py-2` (4px top/bottom padding)
- **File listings**: `py-2` (4px top/bottom padding per file)

#### Indentation (Padding Left)
- **Primary indent**: `pl-6` (24px left padding for terminal content)
- **Secondary indent**: `pl-8` (32px left padding for nested content)
- **Error messages**: `pl-8` (32px left padding for error details)

```html
<!-- Example: Terminal command section with proper spacing -->
<div class="mb-8">
  <div class="mb-4 py-1 flex items-center gap-3">
    <span style="color: #A8A8FF;">></span>
    <span style="color: #4ECDC4;">Section title</span>
  </div>
  <div class="space-y-6 pl-6">
    <div class="flex items-center gap-3 py-1">
      <span style="color: #6BCF7F;">[✓]</span>
      <span style="color: #e5e5e5;">Terminal line with enhanced spacing</span>
    </div>
  </div>
</div>
```

### 4. Terminal Icons & Symbols
**Use Unicode symbols and simple text icons for terminal authenticity:**

#### Terminal Prompts (Tailwind + Colors)
```html
<!-- Command prompt -->
<span class="font-bold" style="color: #A8A8FF;">$</span>
<span class="font-bold" style="color: #4ECDC4;">command_name</span>

<!-- Status prompt -->
<span class="font-bold" style="color: #A8A8FF;">></span>
<span style="color: #4ECDC4;">Status message</span>
```

#### Status Icons (Unicode Symbols)
```html
<!-- Success -->
<span class="text-sm" style="color: #6BCF7F;">[✓]</span>
<span class="text-sm" style="color: #6BCF7F;">✓</span>

<!-- Error -->
<span class="text-sm" style="color: #FF4B6D;">[✗]</span>
<span class="text-sm" style="color: #FF4B6D;">✗</span>

<!-- Warning -->
<span class="text-sm" style="color: #FFD93D;">[!]</span>
<span class="text-sm" style="color: #FFD93D;">⚠</span>

<!-- Active/Running -->
<span class="text-sm" style="color: #FFD93D;">[▶]</span>
<span class="text-sm" style="color: #FFD93D;">▶</span>

<!-- Pending -->
<span class="text-sm" style="color: #666;">[·]</span>
<span class="text-sm" style="color: #666;">·</span>

<!-- Loading -->
<span class="text-sm animate-spin" style="color: #FFD93D;">⟳</span>

<!-- File -->
<span class="text-sm" style="color: #4ECDC4;">📄</span>

<!-- Folder -->
<span class="text-sm" style="color: #FFD93D;">📁</span>

<!-- Copy -->
<span class="text-xs" style="color: #4ECDC4;">📋</span>

<!-- AI/Robot -->
<span class="text-sm" style="color: #A8A8FF;">🤖</span>
```

#### Action Icons (Terminal Style)
```html
<!-- Restart -->
<span class="text-sm" style="color: #FF8C42;">⟲</span>
<span class="text-sm" style="color: #FF8C42;">🔄</span>

<!-- Settings/Config -->
<span class="text-sm" style="color: #A8A8FF;">⚙</span>

<!-- Search -->
<span class="text-sm" style="color: #4ECDC4;">🔍</span>

<!-- Analysis -->
<span class="text-sm" style="color: #A8A8FF;">🔬</span>

<!-- Test -->
<span class="text-sm" style="color: #6BCF7F;">🧪</span>

<!-- Terminal -->
<span class="text-sm" style="color: #e5e5e5;">💻</span>
```

## UI Elements (Tailwind + Terminal Colors)

### Status Indicators (With Tailwind)
```html
<!-- Success -->
<span class="text-sm font-medium" style="color: #6BCF7F;">[✓]</span>

<!-- Error -->
<span class="text-sm font-medium" style="color: #FF4B6D;">[✗]</span>

<!-- Warning -->
<span class="text-sm font-medium" style="color: #FFD93D;">[!]</span>

<!-- Active/Running -->
<span class="text-sm font-medium animate-pulse" style="color: #FFD93D;">[▶]</span>

<!-- Pending -->
<span class="text-sm opacity-60" style="color: #666;">[·]</span>

<!-- Loading with animation -->
<span class="text-sm animate-spin" style="color: #FFD93D;">⟳</span>
```

### File Type Labels (With Icons)
```html
<!-- Main output file -->
<span class="text-sm font-bold px-2 py-1 rounded" style="color: #6BCF7F; background: #1a2a1a;">
  📄 [MAIN]
</span>

<!-- AI analysis file -->
<span class="text-sm font-bold px-2 py-1 rounded" style="color: #A8A8FF; background: #2a1a2a;">
  🤖 [AI]
</span>

<!-- Diff file -->
<span class="text-sm font-bold px-2 py-1 rounded" style="color: #4ECDC4; background: #1a2a2a;">
  📋 [DIFF]
</span>

<!-- Test file -->
<span class="text-sm font-bold px-2 py-1 rounded" style="color: #FF8C42; background: #2a2a1a;">
  🧪 [TEST]
</span>

<!-- Generic file -->
<span class="text-sm font-bold px-2 py-1 rounded" style="color: #6BCF7F; background: #1a2a1a;">
  📁 [FILE]
</span>

<!-- Simple version (no background) -->
<span class="text-sm font-bold" style="color: #6BCF7F;">📄 [MAIN]</span>
<span class="text-sm font-bold" style="color: #A8A8FF;">🤖 [AI]</span>
<span class="text-sm font-bold" style="color: #4ECDC4;">📋 [DIFF]</span>
<span class="text-sm font-bold" style="color: #FF8C42;">🧪 [TEST]</span>
```

### Progress Bars
```html
<div class="flex items-center gap-2">
  <span style="color: #666;">[</span>
  @for (i of getProgressBars().filled; track $index) {
    <span style="color: #6BCF7F;">█</span>
  }
  @for (i of getProgressBars().empty; track $index) {
    <span style="color: #333;">█</span>
  }
  <span style="color: #666;">]</span>
</div>
```

### Buttons (Tailwind + Terminal Styling)

#### Primary Action Button (Execute)
```html
<button 
  class="px-6 py-3 rounded font-mono font-bold border-2 hover:opacity-90 transition-opacity"
  style="background: #6BCF7F; color: #000; border-color: #6BCF7F;">
  <span class="flex items-center gap-3">
    <span>▶</span>
    <span>EXECUTE command --flags</span>
  </span>
</button>

<!-- With icon -->
<button 
  class="px-6 py-3 rounded font-mono font-bold border-2 hover:opacity-90 transition-opacity"
  style="background: #6BCF7F; color: #000; border-color: #6BCF7F;">
  <span class="flex items-center gap-3">
    <span class="text-lg">🚀</span>
    <span>EXECUTE ai-debug --full-workflow</span>
  </span>
</button>
```

#### Secondary Button (Restart/Reset)
```html
<button 
  class="px-4 py-2 font-mono font-bold rounded border-2 hover:opacity-90 transition-opacity"
  style="background: #333; color: #FF8C42; border-color: #666;">
  <span class="flex items-center gap-2">
    <span>⟲</span>
    <span>RESTART --new-session</span>
  </span>
</button>

<!-- With emoji icon -->
<button 
  class="px-4 py-2 font-mono font-bold rounded border-2 hover:opacity-90 transition-opacity"
  style="background: #333; color: #FF8C42; border-color: #666;">
  <span class="flex items-center gap-2">
    <span>🔄</span>
    <span>RESTART --new-session</span>
  </span>
</button>
```

#### Small Action Buttons (Copy, Diagnose)
```html
<button 
  class="px-2 py-1 text-xs rounded border hover:opacity-80 transition-opacity"
  style="background: #333; color: #4ECDC4; border-color: #666;">
  📋 copy_path
</button>

<!-- Minimal version -->
<button 
  class="px-2 py-1 text-xs rounded border hover:opacity-80 transition-opacity font-mono"
  style="background: #333; color: #4ECDC4; border-color: #666;"
  title="Copy file path">
  cp
</button>
```

#### File Link Buttons (With Icons)
```html
<button 
  class="font-mono hover:opacity-80 transition-opacity underline"
  style="color: #FFD93D;">
  <span class="flex items-center gap-2">
    <span>📄</span>
    <span>filename.txt</span>
  </span>
</button>

<!-- Simple version -->
<button 
  class="font-mono hover:opacity-80 transition-opacity underline"
  style="color: #FFD93D;">
  📄 filename.txt
</button>
```

### Disabled States (Tailwind)
```html
<!-- Disabled button with Tailwind -->
<button 
  class="px-6 py-3 rounded font-mono font-bold border-2 opacity-50 cursor-not-allowed"
  style="background: #333; color: #666; border-color: #555;"
  disabled>
  <span class="flex items-center gap-3">
    <span>▶</span>
    <span>EXECUTE command --flags</span>
  </span>
</button>

<!-- Using Tailwind disabled: modifiers -->
<button 
  class="px-6 py-3 rounded font-mono font-bold border-2 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
  style="background: #6BCF7F; color: #000; border-color: #6BCF7F;"
  [disabled]="!canStartWorkflow()">
  <span class="flex items-center gap-3">
    <span>🚀</span>
    <span>EXECUTE ai-debug --full-workflow</span>
  </span>
</button>
```

## Layout Patterns

### Section Headers
```html
<div class="border-b border-gray-700 pb-4 mb-6">
  <div class="flex items-center gap-2 mb-2">
    <span style="color: #A8A8FF;">$</span>
    <span style="color: #4ECDC4;">section_name</span>
    <span style="color: #FFD93D;">--parameter</span>
    <span style="color: #6BCF7F;">value</span>
  </div>
  <div style="color: #666;" class="text-xs">
    Section description or status
  </div>
</div>
```

### Prerequisites Checklist
```html
<div class="space-y-6 pl-6">
  <div class="flex items-center gap-3 py-1">
    <span [ngStyle]="{'color': condition ? '#6BCF7F' : '#FF4B6D'}">
      {{ condition ? '[✓]' : '[✗]' }}
    </span>
    <span style="color: #e5e5e5;">requirement_name</span>
    @if (condition) {
      <span style="color: #666;">→</span>
      <span style="color: #FFD93D;">{{ parameter }}</span>
      <span style="color: #4ECDC4;">{{ value }}</span>
    } @else {
      <span style="color: #FF8C42;">REQUIRED</span>
    }
  </div>
</div>
```

### File Listing
```html
<div class="space-y-5">
  <div class="flex items-center gap-3 py-1">
    <span style="color: #6BCF7F;">[MAIN]</span>
    <button style="color: #FFD93D; text-decoration: underline;">
      main_output.txt
    </button>
    <button 
      class="px-2 py-1 rounded text-xs hover:opacity-80"
      style="background: #333; color: #4ECDC4; border: 1px solid #666;"
      title="Copy path">
      cp
    </button>
  </div>
</div>
```

### Pipeline Status
```html
<div class="pl-6 space-y-5">
  @for (phase of workflowPhases; track phase.key) {
    <div class="flex items-center gap-3 py-1" [ngStyle]="getTerminalPhaseStyle(phase.key)">
      <span>{{ getTerminalPhaseStatus(phase.key) }}</span>
      <span>{{ phase.label }}_pipeline</span>
      <span style="color: #666;">→</span>
      <span>{{ getTerminalPhaseLabel(phase.key) }}</span>
    </div>
  }
</div>
```

## Helper Methods

### Progress Bar Helper
```typescript
getProgressBars(): { filled: number[]; empty: number[] } {
  const progress = this.workflowState().progress;
  const filledBars = Math.floor(progress / 5);
  const emptyBars = 20 - filledBars;
  
  return {
    filled: Array.from({ length: filledBars }, (_, i) => i),
    empty: Array.from({ length: emptyBars }, (_, i) => i)
  };
}
```

### Phase Status Helper
```typescript
getTerminalPhaseStatus(phaseKey: string): string {
  const currentPhase = this.workflowState().phase;
  const phases = ['phase1', 'phase2', 'phase3'];
  const currentIndex = phases.indexOf(currentPhase);
  const phaseIndex = phases.indexOf(phaseKey);

  if (phaseIndex < currentIndex) {
    return '[✓]';
  } else if (phaseIndex === currentIndex) {
    return '[▶]';
  } else {
    return '[·]';
  }
}
```

### Phase Style Helper
```typescript
getTerminalPhaseStyle(phaseKey: string): any {
  const currentPhase = this.workflowState().phase;
  const phases = ['phase1', 'phase2', 'phase3'];
  const currentIndex = phases.indexOf(currentPhase);
  const phaseIndex = phases.indexOf(phaseKey);

  if (phaseIndex < currentIndex) {
    return { color: '#6BCF7F' }; // Green for completed
  } else if (phaseIndex === currentIndex) {
    return { color: '#FFD93D' }; // Yellow for current
  } else {
    return { color: '#666' }; // Gray for pending
  }
}
```

## Animation and Interaction

### Hover Effects
```css
/* Standard hover opacity */
.hover\\:opacity-80:hover { opacity: 0.8; }
.hover\\:opacity-90:hover { opacity: 0.9; }

/* Transition for smooth interactions */
.transition-all { transition: all 0.2s ease; }
```

### Loading States
```html
<!-- Animated progress indicator -->
@if (isLoading) {
  <span style="color: #FFD93D;">⟳</span>
  <span style="color: #4ECDC4;">Processing...</span>
}
```

## Accessibility

### Screen Reader Support
- Use semantic HTML elements when possible
- Add `title` attributes to icon buttons
- Use `aria-label` for complex interactive elements

### Keyboard Navigation
- Ensure all buttons are focusable
- Use consistent tab order
- Provide keyboard shortcuts where appropriate

## Usage Examples

### Complete Terminal Section Template
```html
<div class="mb-6">
  <!-- Section Header -->
  <div class="mb-3 flex items-center gap-2">
    <span style="color: #A8A8FF;">></span>
    <span style="color: #4ECDC4;">Section title</span>
  </div>
  
  <!-- Content with proper indentation -->
  <div class="pl-4">
    <!-- Your terminal-styled content here -->
  </div>
</div>
```

### Error State
```html
<div class="mb-6">
  <div class="flex items-center gap-2 mb-2">
    <span style="color: #FF4B6D;">[✗]</span>
    <span style="color: #FF4B6D;">ERROR</span>
    <span style="color: #666;">|</span>
    <span style="color: #FFD93D;">exit_code=1</span>
  </div>
  <div class="pl-4" style="color: #FF8C42;">
    Error message details
  </div>
</div>
```

### Success State
```html
<div class="mb-6">
  <div class="flex items-center gap-2 mb-2">
    <span style="color: #6BCF7F;">[✓]</span>
    <span style="color: #6BCF7F;">SUCCESS</span>
    <span style="color: #666;">|</span>
    <span style="color: #FFD93D;">exit_code=0</span>
  </div>
  <div class="pl-4" style="color: #4ECDC4;">
    Success message details
  </div>
</div>
```

## Implementation Notes

1. **Consistency**: Always use the exact hex colors specified in the palette
2. **Spacing**: Use consistent `gap-2` or `gap-3` for element spacing
3. **Indentation**: Use `pl-4` for terminal-style indentation
4. **Font**: Always include `font-mono` for terminal aesthetics
5. **Borders**: Use `border-gray-700` with `#333` override for consistency
6. **Background**: Always use `#1a1a1a` for terminal background

## Tailwind Best Practices

### 1. Layout with Tailwind, Colors with Inline Styles
**Always use this pattern:**
```html
<!-- ✅ Good: Tailwind for layout, inline for terminal colors -->
<div class="flex items-center gap-3 py-1" style="color: #6BCF7F;">

<!-- ❌ Bad: Pure CSS -->
<div style="display: flex; align-items: center; gap: 12px; padding: 4px 0; color: #6BCF7F;">

<!-- ❌ Bad: Tailwind for everything (can't match exact terminal colors) -->
<div class="flex items-center gap-3 py-1 text-green-400">
```

### 2. Animation & Transitions
```html
<!-- Loading states -->
<span class="animate-spin" style="color: #FFD93D;">⟳</span>
<span class="animate-pulse" style="color: #FFD93D;">[▶]</span>

<!-- Smooth transitions -->
<button class="hover:opacity-80 transition-opacity duration-200">

<!-- Disabled states -->
<button class="disabled:opacity-50 disabled:cursor-not-allowed">
```

### 3. Icon Guidelines
- **Use Unicode symbols** for terminal authenticity: ✓ ✗ ▶ ⟲ 
- **Use emoji icons** sparingly for visual interest: 🚀 🤖 📄 🧪
- **Consistent sizing**: `text-sm` for status icons, `text-lg` for emphasis
- **Color coordination**: Match icon colors to terminal palette

### 4. Accessibility with Tailwind
```html
<!-- Focus states -->
<button class="focus:outline-none focus:ring-2 focus:ring-blue-500">

<!-- Screen reader text -->
<span class="sr-only">Loading...</span>
```

---

This style guide ensures consistent terminal aesthetics with Tailwind CSS across all components in the AI Debug Context extension while maintaining accessibility and usability standards.