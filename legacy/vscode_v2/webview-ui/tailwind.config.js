/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        // VSCode theme colors - these will be dynamically replaced
        'vscode-foreground': 'var(--vscode-foreground)',
        'vscode-background': 'var(--vscode-editor-background)',
        'vscode-button-background': 'var(--vscode-button-background)',
        'vscode-button-foreground': 'var(--vscode-button-foreground)',
        'vscode-button-hoverBackground': 'var(--vscode-button-hoverBackground)',
        'vscode-button-secondaryBackground': 'var(--vscode-button-secondaryBackground)',
        'vscode-button-secondaryForeground': 'var(--vscode-button-secondaryForeground)',
        'vscode-button-secondaryHoverBackground': 'var(--vscode-button-secondaryHoverBackground)',
        'vscode-input-background': 'var(--vscode-input-background)',
        'vscode-input-foreground': 'var(--vscode-input-foreground)',
        'vscode-input-border': 'var(--vscode-input-border)',
        'vscode-inputOption-activeBorder': 'var(--vscode-inputOption-activeBorder)',
        'vscode-dropdown-background': 'var(--vscode-dropdown-background)',
        'vscode-dropdown-foreground': 'var(--vscode-dropdown-foreground)',
        'vscode-dropdown-border': 'var(--vscode-dropdown-border)',
        'vscode-checkbox-background': 'var(--vscode-checkbox-background)',
        'vscode-checkbox-border': 'var(--vscode-checkbox-border)',
        'vscode-list-hoverBackground': 'var(--vscode-list-hoverBackground)',
        'vscode-list-activeSelectionBackground': 'var(--vscode-list-activeSelectionBackground)',
        'vscode-panel-border': 'var(--vscode-panel-border)',
        'vscode-textBlockQuote-background': 'var(--vscode-textBlockQuote-background)',
        'vscode-textBlockQuote-foreground': 'var(--vscode-textBlockQuote-foreground)',
        'vscode-textCodeBlock-background': 'var(--vscode-textCodeBlock-background)',
        'vscode-textPreformat-background': 'var(--vscode-textPreformat-background)',
        'vscode-textPreformat-foreground': 'var(--vscode-textPreformat-foreground)',
        'vscode-badge-background': 'var(--vscode-badge-background)',
        'vscode-badge-foreground': 'var(--vscode-badge-foreground)',
        'vscode-descriptionForeground': 'var(--vscode-descriptionForeground)',
        'vscode-gitDecoration-addedResourceForeground': 'var(--vscode-gitDecoration-addedResourceForeground)',
        'vscode-gitDecoration-modifiedResourceForeground': 'var(--vscode-gitDecoration-modifiedResourceForeground)',
        'vscode-gitDecoration-deletedResourceForeground': 'var(--vscode-gitDecoration-deletedResourceForeground)',
        'vscode-editor-background': 'var(--vscode-editor-background)',
        'vscode-editor-foreground': 'var(--vscode-editor-foreground)'
      }
    },
  },
  plugins: [],
  corePlugins: {
    preflight: false, // Disable Tailwind's preflight to avoid conflicts with VSCode styles
  }
}
